// ============================================================
// index.ts — Cloudflare Worker 메인 엔트리
// 참조: CLAUDE.md §8 (워크플로우), §14 (실패 처리)
// ============================================================

import type { Env, ParseRequest, ParseResponse, ParseResult, StepOutput } from './types';
import { parseSpec, calcConfidence } from './parser';
import { glmAugment, glmDoubleCheck, mergeGlmAugment, applyGlmDoubleCheck } from './glm';
import { searchMouserParts, filterCandidates, rankCandidates } from './mouser';
import { fetchPartByPN, verifyPart, buildResultRow } from './validator';

// ── CORS 헤더 ────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── 라우터 ────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/parse' && request.method === 'POST') {
      return handleParse(request, env);
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

// ── /parse 핸들러 ─────────────────────────────────────────

async function handleParse(request: Request, env: Env): Promise<Response> {
  let req: ParseRequest;

  try {
    req = await request.json() as ParseRequest;
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body', error_code: 'EXTRACTION_INVALID' }, 400);
  }

  const rawInput = (req.input ?? '').trim();
  if (!rawInput) {
    return jsonResponse({ success: false, error: 'Input is required', error_code: 'EXTRACTION_INVALID' }, 400);
  }

  const debug = req.debug ?? false;
  const steps: Record<string, unknown> = {};

  try {
    const result = await processInput(rawInput, env, debug, steps);
    const response: ParseResponse = { success: true, result };
    if (debug) response.steps = steps;
    return jsonResponse(response, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ success: false, error: msg, error_code: 'EXTRACTION_INVALID' }, 500);
  }
}

// ── 메인 처리 파이프라인 ─────────────────────────────────

async function processInput(
  rawInput: string,
  env: Env,
  debug: boolean,
  steps: Record<string, unknown>,
): Promise<ReturnType<typeof buildResultRow>> {
  const now = () => new Date().toISOString();

  // ① Step 1: raw input 수집
  const step1: StepOutput<{ raw: string }> = {
    step: 1, step_name: 'raw_input', timestamp: now(),
    input_from_prev_step: null,
    data: { raw: rawInput },
  };
  if (debug) steps.step01_raw_input = step1;

  // ② Step 2: 규칙 기반 파싱
  const ruleParsed = parseSpec(rawInput);
  const step2: StepOutput<ParseResult> = {
    step: 2, step_name: 'rule_parsed', timestamp: now(),
    input_from_prev_step: step1.data,
    data: ruleParsed,
  };
  if (debug) steps.step02_rule_parsed = step2;

  // ③ Step 3: 신뢰도 계산
  const confidence = calcConfidence(ruleParsed, rawInput);
  const step3: StepOutput<typeof confidence> = {
    step: 3, step_name: 'confidence', timestamp: now(),
    input_from_prev_step: step2.data,
    data: confidence,
  };
  if (debug) steps.step03_confidence = step3;

  // resistance 없으면 즉시 실패
  if (!ruleParsed.resistance && !confidence.glm_required) {
    const failStep: StepOutput<{ error: string }> = {
      step: 3, step_name: 'confidence', timestamp: now(),
      input_from_prev_step: step2.data,
      data: { error: 'RESISTANCE_NOT_FOUND' },
      error: true, error_code: 'RESISTANCE_NOT_FOUND',
    };
    if (debug) steps.step03_confidence = failStep;

    return buildResultRow(rawInput, ruleParsed, {
      status: 'RESISTANCE_NOT_FOUND',
      part: null,
      resistance_match: false,
      package_match: null,
      tolerance_match: null,
      power_match: null,
      mismatch_details: ['resistance field could not be extracted'],
    });
  }

  // ④ Step 4: GLM 보조/더블체크 (조건부)
  let mergedParsed: ParseResult = ruleParsed;

  if (confidence.glm_required) {
    // GLM 보조 추출
    const reason = !ruleParsed.resistance ? 'resistance_not_found' : 'low_confidence';
    const glmResult = await glmAugment(env, rawInput, ruleParsed, reason);
    mergedParsed = mergeGlmAugment(ruleParsed, glmResult);

    const step4: StepOutput<typeof glmResult> = {
      step: 4, step_name: 'glm_augment', timestamp: now(),
      input_from_prev_step: step3.data,
      data: glmResult,
    };
    if (debug) steps.step04_glm_augment = step4;

    // GLM 보조 후에도 resistance 없으면 실패
    if (!mergedParsed.resistance) {
      return buildResultRow(rawInput, mergedParsed, {
        status: 'RESISTANCE_NOT_FOUND',
        part: null,
        resistance_match: false,
        package_match: null,
        tolerance_match: null,
        power_match: null,
        mismatch_details: ['resistance field could not be extracted even with AI assistance'],
      });
    }
  } else if (confidence.glm_double_check) {
    // GLM 더블체크
    const checkResult = await glmDoubleCheck(env, rawInput, ruleParsed, 'borderline_confidence');
    mergedParsed = applyGlmDoubleCheck(ruleParsed, checkResult);

    const step4: StepOutput<typeof checkResult> = {
      step: 4, step_name: 'glm_double_check', timestamp: now(),
      input_from_prev_step: step3.data,
      data: checkResult,
    };
    if (debug) steps.step04_glm_double_check = step4;
  }

  // ⑤ Step 5: 스키마 검증 (resistance 필수)
  if (!mergedParsed.resistance) {
    return buildResultRow(rawInput, mergedParsed, {
      status: 'EXTRACTION_INVALID',
      part: null,
      resistance_match: false,
      package_match: null,
      tolerance_match: null,
      power_match: null,
      mismatch_details: ['resistance extraction failed schema validation'],
    });
  }

  const step5: StepOutput<ParseResult> = {
    step: 5, step_name: 'merged', timestamp: now(),
    input_from_prev_step: null,
    data: mergedParsed,
  };
  if (debug) steps.step05_merged = step5;

  // ⑥ Step 6: Mouser 검색
  const searchParams = {
    resistance_ohm: mergedParsed.resistance.value_ohm,
    package_metric: mergedParsed.package?.metric,
    package_inch: mergedParsed.package?.inch,
    tolerance_percent: mergedParsed.tolerance?.percent,
    power_watt: mergedParsed.power?.watt,
  };

  let candidates = await searchMouserParts(env, searchParams);
  const step6: StepOutput<{ count: number; parts: typeof candidates }> = {
    step: 6, step_name: 'candidates', timestamp: now(),
    input_from_prev_step: step5.data,
    data: { count: candidates.length, parts: candidates },
  };
  if (debug) steps.step06_candidates = step6;

  if (candidates.length === 0) {
    return buildResultRow(rawInput, mergedParsed, {
      status: 'NO_CANDIDATES',
      part: null,
      resistance_match: false,
      package_match: null,
      tolerance_match: null,
      power_match: null,
      mismatch_details: ['No Mouser parts found for the given specification'],
    });
  }

  // ⑦ Step 7: 필터링 + 정렬
  const filtered = filterCandidates(candidates, searchParams);
  const ranked = rankCandidates(filtered.length > 0 ? filtered : candidates);

  const step7: StepOutput<{ count: number; parts: typeof ranked }> = {
    step: 7, step_name: 'ranked', timestamp: now(),
    input_from_prev_step: step6.data,
    data: { count: ranked.length, parts: ranked },
  };
  if (debug) steps.step07_ranked = step7;

  // ⑧ Step 8: 역검증 (상위 3개 시도)
  const maxVerify = Math.min(3, ranked.length);
  for (let i = 0; i < maxVerify; i++) {
    const candidate = ranked[i];

    // PN으로 재조회
    const refetched = await fetchPartByPN(env, candidate.mouser_part_number);
    const partToVerify = refetched ?? candidate;

    const verification = verifyPart(partToVerify, mergedParsed);

    const step8: StepOutput<typeof verification> = {
      step: 8, step_name: `verified_candidate_${i + 1}`, timestamp: now(),
      input_from_prev_step: step7.data,
      data: verification,
    };
    if (debug) steps[`step08_verified_${i + 1}`] = step8;

    if (verification.status === 'PASS' || verification.status === 'PASS_UNVERIFIED') {
      return buildResultRow(rawInput, mergedParsed, verification);
    }
  }

  // 모든 후보 역검증 실패
  return buildResultRow(rawInput, mergedParsed, {
    status: 'VERIFICATION_FAILED',
    part: ranked[0] ?? null,
    resistance_match: false,
    package_match: null,
    tolerance_match: null,
    power_match: null,
    mismatch_details: ['All candidate parts failed reverse verification'],
  });
}

// ── 유틸 ─────────────────────────────────────────────────

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

