// ============================================================
// glm.ts — GLM API 보조 추출 / 더블체크
// 참조: /docs/glm_api_contract.md
// ============================================================

import type {
  Env,
  ParseResult,
  PackageField,
  ResistanceField,
  ToleranceField,
  PowerField,
  GlmAugmentResult,
  GlmDoubleCheckResult,
} from './types';

const GLM_ENDPOINT = 'https://api.z.ai/api/paas/v4/chat/completions';
const GLM_MODEL = 'glm-4.7';
const MAX_RETRIES = 2;

const SYSTEM_PROMPT = `You are a resistor specification parser assistant.
Your job is to extract structured resistor specifications from free-form text.
Always respond with valid JSON only. No explanation, no markdown, no preamble.
If a field cannot be determined, set it to null.`;

// ── GLM 호출 공통 ────────────────────────────────────────

async function callGlm(env: Env, userPrompt: string): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const resp = await fetch(GLM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: GLM_MODEL,
          temperature: 0,
          max_tokens: 512,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (resp.status === 429) {
        await sleep(1000);
        continue;
      }

      if (!resp.ok) {
        lastError = new Error(`GLM HTTP ${resp.status}`);
        continue;
      }

      const body = await resp.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body?.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty GLM response');

      // JSON 파싱
      const cleaned = content.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError ?? new Error('GLM call failed');
}

// ── 보조 추출 (augment) ──────────────────────────────────

export async function glmAugment(
  env: Env,
  rawInput: string,
  parsed: ParseResult,
  reason: string,
): Promise<GlmAugmentResult> {
  const confirmed: Record<string, unknown> = {};
  if (parsed.resistance) confirmed.resistance = parsed.resistance;
  if (parsed.package)    confirmed.package = parsed.package;
  if (parsed.tolerance)  confirmed.tolerance = parsed.tolerance;
  if (parsed.power)      confirmed.power = parsed.power;

  const missing: string[] = [];
  if (!parsed.resistance) missing.push('resistance');
  if (!parsed.package)    missing.push('package');
  if (!parsed.tolerance)  missing.push('tolerance');
  if (!parsed.power)      missing.push('power');

  const prompt = `Parse the following resistor specification string and extract missing fields.

Input string: "${rawInput}"

Parser already extracted (treat as confirmed, do not change):
${JSON.stringify(confirmed, null, 2)}

Extract only the missing fields: ${missing.join(', ')}

Respond with JSON only:
{
  "resistance": {"value_ohm": <number|null>, "text": "<string|null>", "confidence": <0.0-1.0>},
  "package": {"normalized": "<string|null>", "text": "<string|null>", "confidence": <0.0-1.0>},
  "tolerance": {"percent": <number|null>, "text": "<string|null>", "confidence": <0.0-1.0>},
  "power": {"watt": <number|null>, "text": "<string|null>", "confidence": <0.0-1.0>},
  "warnings": ["<string>"]
}`;

  let retryCount = 0;
  let success = false;
  let glmData: Record<string, unknown> = {};

  try {
    glmData = (await callGlm(env, prompt)) as Record<string, unknown>;
    success = true;
  } catch {
    retryCount = MAX_RETRIES;
  }

  // 패키지 필드 정규화 (GLM은 metric/inch 분리 안 할 수 있음)
  let pkgField: PackageField | null = null;
  if (glmData.package && typeof glmData.package === 'object') {
    const p = glmData.package as Record<string, unknown>;
    if (p.normalized && typeof p.normalized === 'string') {
      pkgField = {
        normalized: p.normalized as string,
        metric: (p.metric as string) ?? '',
        inch: (p.inch as string) ?? '',
        text: (p.text as string) ?? '',
        confidence: (p.confidence as number) ?? 0.7,
      };
    }
  }

  return {
    used: true,
    mode: 'augment',
    reason,
    resistance: (glmData.resistance as ResistanceField | null) ?? null,
    package: pkgField,
    tolerance: (glmData.tolerance as ToleranceField | null) ?? null,
    power: (glmData.power as PowerField | null) ?? null,
    warnings: (glmData.warnings as string[]) ?? [],
    retry_count: retryCount,
    success,
  };
}

// ── 더블체크 (double_check) ──────────────────────────────

export async function glmDoubleCheck(
  env: Env,
  rawInput: string,
  parsed: ParseResult,
  reason: string,
): Promise<GlmDoubleCheckResult> {
  const prompt = `Verify the following resistor spec extraction result.

Input string: "${rawInput}"
Parser result: ${JSON.stringify(parsed, null, 2)}

Check if the parser result is correct. Flag any issues.

Respond with JSON only:
{
  "verified": <true|false>,
  "issues": [{"field": "<string>", "problem": "<string>", "suggested": <value|null>}],
  "warnings": ["<string>"]
}`;

  let retryCount = 0;
  let success = false;
  let glmData: Record<string, unknown> = {};

  try {
    glmData = (await callGlm(env, prompt)) as Record<string, unknown>;
    success = true;
  } catch {
    retryCount = MAX_RETRIES;
  }

  return {
    used: true,
    mode: 'double_check',
    reason,
    verified: (glmData.verified as boolean) ?? true,
    issues: (glmData.issues as GlmDoubleCheckResult['issues']) ?? [],
    warnings: (glmData.warnings as string[]) ?? [],
    retry_count: retryCount,
    success,
  };
}

// ── 유틸 ─────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── GLM 결과를 ParseResult에 병합 ───────────────────────

export function mergeGlmAugment(
  ruleParsed: ParseResult,
  glmResult: GlmAugmentResult,
): ParseResult {
  return {
    resistance: ruleParsed.resistance ?? glmResult.resistance,
    package:    ruleParsed.package    ?? glmResult.package,
    tolerance:  ruleParsed.tolerance  ?? glmResult.tolerance,
    power:      ruleParsed.power      ?? glmResult.power,
    unmatched_tokens: ruleParsed.unmatched_tokens,
  };
}

export function applyGlmDoubleCheck(
  parsed: ParseResult,
  check: GlmDoubleCheckResult,
): ParseResult {
  if (check.verified || !check.success) return parsed;

  const updated = { ...parsed };
  for (const issue of check.issues) {
    if (issue.suggested === null) continue;
    // GLM이 이슈를 발견하고 제안값을 준 경우만 적용 (코드 결과 우선이지만 suggested가 명확할 때)
    switch (issue.field) {
      case 'resistance':
        if (!updated.resistance && issue.suggested) {
          updated.resistance = issue.suggested as ResistanceField;
        }
        break;
      case 'package':
        if (!updated.package && issue.suggested) {
          updated.package = issue.suggested as PackageField;
        }
        break;
    }
  }
  return updated;
}
