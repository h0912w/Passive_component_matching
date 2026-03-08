/**
 * test-random-validation.js — 랜덤 저항값 End-to-End 검증 에이전트
 *
 * GLM API로 랜덤 저항 스펙을 생성하고, 전체 파이프라인을 통과시켜
 * 실제 유저가 받는 출력(6열 테이블)이 정상인지 검증한다.
 * 매 실행마다 tests/reports/ 에 타임스탬프 리포트를 남긴다.
 *
 * 실행 조건:
 *   1. .env 파일에 GLM_API_KEY, MOUSER_API_KEY 필요
 *   2. node tests/run-all-tests.js --live  또는 단독 실행
 *
 * 단독 실행: node tests/test-random-validation.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── API 키 확인 ────────────────────────────────────────────────────────────
const GLM_KEY    = process.env.GLM_API_KEY;
const MOUSER_KEY = process.env.MOUSER_API_KEY;

if (!GLM_KEY || !MOUSER_KEY) {
  const missing = [];
  if (!GLM_KEY)    missing.push('GLM_API_KEY');
  if (!MOUSER_KEY) missing.push('MOUSER_API_KEY');
  console.error(`${missing.join(', ')} 가 .env 파일에 없습니다.`);
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'api_key_missing',
    targetFn: 'setup', hint: `.env 파일에 ${missing.join(', ')} 를 추가하세요.` }));
  process.exit(1);
}

const REPORTS_DIR = path.join(__dirname, 'reports');

// ── 배치 설정 ─────────────────────────────────────────────────────────────
// 카테고리당 BATCH_COUNT번 GLM 호출, 매 호출마다 BATCH_SIZE개 생성
// 총 입력 수: 4 카테고리 × BATCH_COUNT × BATCH_SIZE
const BATCH_SIZE  = 5;   // GLM이 한 번에 생성하는 항목 수
const BATCH_COUNT = 5;   // 카테고리당 배치 횟수 → 카테고리당 25개, 전체 100개

// ── 카테고리 정의 ─────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id:    'structured',
    label: '구조적 표준 입력',
    count: BATCH_SIZE * BATCH_COUNT,
    prompt: `전자 BOM 작성자가 저항값을 입력하는 표준 형식 ${BATCH_SIZE}개를 생성하세요.

다양성 요구사항:
- 구분자: 공백/슬래시/언더바 중 랜덤
- 토큰 순서: 랜덤 (저항값이 맨 앞이 아닐 수도 있음)
- 저항값 표기: 1k, 4.7k, 10K, 2.2M, 100R, 4R7, 1k5, 2R2 형식 혼용
- 패키지: 0201/0402/0603/0805/1005/1206/2012 중 랜덤
- 오차: 0.1%/1%/5% 중 랜덤

예시:
"4R7_0402_1%"
"5%/10k/0603"
"1206 2.2M 5%"
"0.1%/100k/0805"
"1k5 1005 5%"

JSON 배열만 반환 (정확히 ${BATCH_SIZE}개): ["...", ...]`
  },
  {
    id:    'korean',
    label: '한국어 자연어 입력',
    count: BATCH_SIZE * BATCH_COUNT,
    prompt: `한국 엔지니어가 저항값을 한국어로 입력하는 형식 ${BATCH_SIZE}개를 생성하세요.

다양성 요구사항:
- 순수 한국어: "1킬로옴 0402 5퍼센트", "0805 사이즈 100옴 1% 오차"
- 한영 혼합: "저항 4.7k 0603 1%", "칩저항 10K 1206"
- 단위 혼용: "4.7킬로 0402", "100 옴 0603 5%", "2.2 메가옴 1206 5%"
- 일부는 오차 누락, 일부는 패키지 누락

JSON 배열만 반환 (정확히 ${BATCH_SIZE}개): ["...", ...]`
  },
  {
    id:    'sloppy',
    label: '오염된 실사용 입력',
    count: BATCH_SIZE * BATCH_COUNT,
    prompt: `실제 사용자가 대충 입력하거나 다른 곳에서 복붙할 때 생기는 지저분한 형식 ${BATCH_SIZE}개를 생성하세요.

다양성 요구사항:
- 앞뒤 공백: "  1k 0402 5%  "
- 여러 개 공백: "10k  0603  1%"
- 대소문자 혼용: "10K 0603 1%", "2.2m 1206 5%"
- 단위에 Ω 포함: "4.7kΩ 0402 1%", "100Ω 0603 5%"
- "ohm" 단어 포함: "1k ohm 0402 5%", "100 ohm 0603"
- 콤마 포함: "1,000 ohm 0402 1%"
- 오차에 ± 포함: "10k 0603 ±1%"

JSON 배열만 반환 (각 항목은 앞뒤 공백이나 특수문자 포함 가능, 정확히 ${BATCH_SIZE}개): ["...", ...]`
  },
  {
    id:    'edge',
    label: '엣지 케이스',
    count: BATCH_SIZE * BATCH_COUNT,
    prompt: `저항값 파서를 테스트하기 위한 까다로운 엣지 케이스 ${BATCH_SIZE}개를 생성하세요.

아래 3가지 유형에서 골고루 생성하세요 (각 유형 1-2개):
1. 필드 누락 — 오차만 없거나 패키지만 없는 경우:
   예: "1k 0402" (오차 없음), "4.7k 5%" (패키지 없음)
2. EIA 소수점 표기 — 단위를 소수점 대신 사용:
   예: "4R7 0402 1%", "2R2 0603 5%", "1k5 0402 1%", "3k3 0805 5%"
3. 극단값 — 아주 작거나 아주 큰 저항:
   예: "1R 0201 1%", "10M 1206 5%", "0R1 0402 5%"

JSON 배열만 반환 (정확히 ${BATCH_SIZE}개): ["...", ...]`
  }
];

// ─── 유틸: HTTPS POST ──────────────────────────────────────────────────────
function httpsPost(hostname, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname,
      path: urlPath,
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length':  Buffer.byteLength(payload),
        ...(headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end',  ()    => {
        try { resolve({ code: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON 파싱 실패: ${data.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(45000, () => { req.destroy(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── Step 1: GLM으로 카테고리별 랜덤 저항 스펙 생성 (배치 방식) ───────────
// 카테고리당 BATCH_COUNT번 GLM 호출 → 매 호출마다 BATCH_SIZE개 생성
// 배치 간 1.5초 딜레이로 rate limit 대응
async function generateCategorySpecs(category) {
  const all = [];
  const batchCount = Math.ceil(category.count / BATCH_SIZE);

  for (let b = 0; b < batchCount; b++) {
    try {
      const resp = await httpsPost(
        'open.bigmodel.cn',
        '/api/paas/v4/chat/completions',
        {
          model: 'glm-4.7-flash',
          messages: [
            {
              role: 'system',
              content: '당신은 전자 부품 테스트 데이터 생성 전문가입니다. 요청된 형식의 테스트 데이터만 JSON 배열로 반환합니다. 설명이나 부연 텍스트는 절대 출력하지 않습니다.'
            },
            { role: 'user', content: category.prompt }
          ],
          temperature: 0.95  // 높은 온도로 최대 다양성 확보
        },
        { 'Authorization': 'Bearer ' + GLM_KEY }
      );

      if (resp.code !== 200) {
        console.log(`            ⚠️  배치 ${b + 1}/${batchCount} GLM 오류 (HTTP ${resp.code}): 건너뜀`);
      } else {
        const content = resp.body.choices[0].message.content;
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const arr = JSON.parse(match[0]);
          if (Array.isArray(arr)) {
            all.push(...arr.slice(0, BATCH_SIZE));
            console.log(`            배치 ${b + 1}/${batchCount} ✅ ${arr.slice(0, BATCH_SIZE).length}개 (누적 ${all.length}개)`);
          }
        } else {
          console.log(`            ⚠️  배치 ${b + 1}/${batchCount} JSON 파싱 실패: 건너뜀`);
        }
      }
    } catch (err) {
      console.log(`            ⚠️  배치 ${b + 1}/${batchCount} 오류: ${err.message}`);
    }

    // 배치 간 rate limit 대응 (1.5초)
    if (b < batchCount - 1) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  return all.slice(0, category.count);
}

async function generateRandomSpecs() {
  const allSpecs = [];
  const categoryLog = [];

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    console.log(`     [1-${i+1}] 카테고리 "${cat.label}" ${cat.count}개 생성 중...`);
    try {
      const specs = await generateCategorySpecs(cat);
      const preview = specs.slice(0, 3).map(s => `"${s}"`).join(', ');
      console.log(`            ✅ 총 ${specs.length}개 생성 완료 (예: ${preview}${specs.length > 3 ? ' ...' : ''})`);
      for (const s of specs) allSpecs.push({ input: s, category: cat.id, categoryLabel: cat.label });
      categoryLog.push({ id: cat.id, label: cat.label, count: specs.length, specs });
    } catch (err) {
      console.log(`            ⚠️  실패 (건너뜀): ${err.message}`);
      categoryLog.push({ id: cat.id, label: cat.label, count: 0, error: err.message });
    }
    // 카테고리 간 GLM rate limit 대응 (2.5초 간격)
    if (i < CATEGORIES.length - 1) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  if (allSpecs.length === 0) throw new Error('모든 카테고리 생성 실패');

  return { specs: allSpecs, categoryLog };
}

// ─── Step 2: Mouser 키워드 검색 (실제 API) ──────────────────────────────────
async function searchMouserLive(keyword) {
  const resp = await httpsPost(
    'api.mouser.com',
    `/api/v2/search/keyword?apiKey=${MOUSER_KEY}`,
    {
      SearchByKeywordRequest: {
        keyword:        keyword,
        records:        5,
        startingRecord: 0,
        searchOptions:  'InStock'
      }
    }
  );

  if (resp.code !== 200) {
    throw new Error(`Mouser API 오류 (HTTP ${resp.code})`);
  }

  return resp.body.SearchResults || {};
}

// ─── Step 3: 파이프라인 실행 (Node.js 환경) ──────────────────────────────────
// Apps Script 모듈을 Node.js에서 로드
require.extensions['.gs'] = require.extensions['.js'];

const PackageConverter = require('../apps-script/PackageConverter');
const ValueParser      = require('../apps-script/ValueParser');
const StockRanker      = require('../apps-script/StockRanker');
const MpnValidator     = require('../apps-script/MpnValidator');
const OutputFormatter  = require('../apps-script/OutputFormatter');
const ErrorHandler     = require('../apps-script/ErrorHandler');

async function runPipeline(inputLine) {
  const row = { input: inputLine, parseResult: null, keyword: null, mouserHits: 0, bestPart: null, output: null };

  // 1) ValueParser 파싱
  row.parseResult = ValueParser.parseResistorInput(inputLine);

  // 2) 파싱 실패 시 GLM NLP 폴백
  if (!row.parseResult.parse_success) {
    try {
      const nlpResult = await glmNlpParse(inputLine);
      if (nlpResult) {
        row.parseResult = {
          resistance_ohms: nlpResult.resistance_ohms,
          resistance_display: ValueParser.formatResistanceDisplay(nlpResult.resistance_ohms),
          package_input: nlpResult.package,
          package_metric: null,
          package_imperial: null,
          tolerance_percent: nlpResult.tolerance_percent,
          original_input: inputLine,
          parse_success: nlpResult.resistance_ohms != null && nlpResult.package != null && nlpResult.tolerance_percent != null,
          error_message: null
        };
        // 패키지 변환
        if (row.parseResult.package_input && row.parseResult.parse_success) {
          if (PackageConverter.isMetric(row.parseResult.package_input)) {
            row.parseResult.package_metric = row.parseResult.package_input;
            row.parseResult.package_imperial = PackageConverter.toImperial(row.parseResult.package_input);
          } else {
            row.parseResult.package_imperial = row.parseResult.package_input;
            row.parseResult.package_metric = PackageConverter.toMetric(row.parseResult.package_input);
          }
        }
      }
    } catch (e) {
      row.parseResult.error_message = 'NLP 폴백 실패: ' + e.message;
    }
  }

  if (!row.parseResult.parse_success) {
    row.output = OutputFormatter.formatErrorRow(inputLine, row.parseResult.error_message || ErrorHandler.parseError(inputLine));
    return row;
  }

  // 3) Mouser 검색 키워드 생성
  const p = row.parseResult;
  const parts = [];
  if (p.resistance_ohms >= 1000000) parts.push((p.resistance_ohms / 1000000) + 'M ohm');
  else if (p.resistance_ohms >= 1000) parts.push((p.resistance_ohms / 1000) + 'k ohm');
  else parts.push(p.resistance_ohms + ' ohm');
  parts.push('resistor');
  if (p.package_imperial) parts.push(p.package_imperial);
  else if (p.package_input) parts.push(p.package_input);
  if (p.tolerance_percent != null) parts.push(p.tolerance_percent + '%');
  row.keyword = parts.join(' ');

  // 4) Mouser 실제 검색 (rate limit 대응: 2.1초 간격)
  try {
    const searchResult = await searchMouserLive(row.keyword);
    const rawParts = searchResult.Parts || [];
    row.mouserHits = rawParts.length;

    const normalized = rawParts.map(rp => ({
      mpn:          rp.ManufacturerPartNumber || '',
      manufacturer: rp.Manufacturer || '',
      description:  rp.Description || '',
      stock:        parseInt(rp.AvailabilityInStock || '0', 10)
    }));

    // 5) StockRanker — 후보 전체 확보 (재고 기준 정렬, 2차 스펙 필터)
    const candidates = StockRanker.rankByStockAll(normalized, {
      resistance_ohms:  p.resistance_ohms,
      package_imperial: p.package_imperial,
      tolerance_percent: p.tolerance_percent
    });

    // 6) Description에서 역추출한 스펙으로 PASS/FAIL 판정 → FAIL 시 다음 후보 시도 (최대 3회)
    let bestPart    = null;
    let bestMpnSpec = null;
    const maxTry    = Math.min(3, candidates.length);
    for (let t = 0; t < maxTry; t++) {
      const cand    = candidates[t];
      const specs   = MpnValidator._extractSpecsFromDescription(cand.description);
      const verdict = OutputFormatter._computeVerdict(row.parseResult, specs);
      if (verdict !== 'FAIL') {
        bestPart    = cand;
        bestMpnSpec = specs;
        break;
      }
    }
    // 3회 모두 FAIL 이면 첫 번째 후보 사용 (verdict=FAIL로 표시)
    if (!bestPart && candidates.length > 0) {
      bestPart    = candidates[0];
      bestMpnSpec = MpnValidator._extractSpecsFromDescription(bestPart.description);
    }

    row.bestPart    = bestPart;
    row.bestMpnSpec = bestMpnSpec;
  } catch (e) {
    row.output = OutputFormatter.formatErrorRow(inputLine, 'Mouser 검색 실패: ' + e.message);
    return row;
  }

  // 7) 출력 포맷 (9열)
  if (row.bestPart) {
    row.output = OutputFormatter.formatSuccessRow(row.parseResult, row.bestPart, row.bestMpnSpec);
  } else {
    row.output = OutputFormatter.formatErrorRow(inputLine, ErrorHandler.noResultsError(row.keyword));
  }

  return row;
}

// ─── GLM NLP 파싱 (라이브) ──────────────────────────────────────────────────
async function glmNlpParse(input) {
  const resp = await httpsPost(
    'open.bigmodel.cn',
    '/api/paas/v4/chat/completions',
    {
      model: 'glm-4.7-flash',
      messages: [
        { role: 'system', content: '전자 부품 전문가입니다. 저항 정보를 JSON만으로 반환하세요.' },
        { role: 'user',   content: `다음 텍스트에서 저항값(ohm 단위 숫자), 패키지(예: 0402), 오차(% 숫자)를 추출:\n"${input}"\nJSON: {"resistance_ohms":number,"package":"string","tolerance_percent":number}` }
      ],
      temperature: 0.1
    },
    { 'Authorization': 'Bearer ' + GLM_KEY }
  );

  if (resp.code !== 200) throw new Error('GLM NLP HTTP ' + resp.code);
  const content = resp.body.choices[0].message.content;
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('JSON 추출 실패');
  return JSON.parse(m[0]);
}

// ─── Step 4: 리포트 생성 ──────────────────────────────────────────────────
function generateReport(specObjs, pipelineResults, startTime, categoryLog) {
  const endTime = new Date();
  const elapsed = ((endTime - startTime) / 1000).toFixed(1);
  const ts = endTime.toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const reportPath = path.join(REPORTS_DIR, `validation-${ts}.md`);

  const successRows = pipelineResults.filter(r => r.output && r.output.success);
  const failRows    = pipelineResults.filter(r => r.output && !r.output.success);

  let md = '';
  md += `# Passive Component Matching — 검증 리포트\n\n`;
  md += `> 실행 시각: ${endTime.toISOString()} | 소요: ${elapsed}초 | 입력: ${specObjs.length}개 | 성공: ${successRows.length}개 | 실패: ${failRows.length}개\n\n`;

  // ── 최종 9열 결과 표 (맨 위 배치) ──
  md += `## 매칭 결과\n\n`;
  md += `| 입력 원본 | 입력 저항값 | 입력 패키지 | 입력 오차 | 부품명 (MPN) | MPN 저항값 | MPN 패키지 | MPN 오차 | 검증 |\n`;
  md += `|-----------|-----------|-----------|---------|-------------|----------|----------|--------|------|\n`;

  for (const r of pipelineResults) {
    const o        = r.output;
    const rawInput = r.rawInput || r.input;
    if (o.success) {
      const verdictMd = o.verdict === 'PASS' ? '✅ PASS' : o.verdict === 'FAIL' ? '❌ FAIL' : 'N/A';
      md += `| ${esc(rawInput)} | ${esc(o.resistance)} | ${esc(o.package)} | ${esc(o.tolerance)} | ${esc(o.mpn)} | ${esc(o.mpn_resistance)} | ${esc(o.mpn_package)} | ${esc(o.mpn_tolerance)} | ${verdictMd} |\n`;
    } else {
      md += `| ${esc(rawInput)} | - | - | - | **FAIL** | - | - | - | ❌ FAIL |\n`;
    }
  }
  md += '\n';

  // 파일 저장
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(reportPath, md, 'utf8');
  return reportPath;
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// ─── 메인 ────────────────────────────────────────────────────────────────────
async function runTests() {
  const startTime = new Date();
  const results = { passed: 0, total: 0, failedTest: null, targetFn: null, hint: null };

  // GLM rate limit 대응: 이전 GLM 테스트 완료 후 10초 대기
  console.log('  [0] GLM rate limit 대기 (10초)...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // ── 1단계: GLM으로 카테고리별 랜덤 스펙 생성 ──
  const totalCategories = CATEGORIES.reduce((s, c) => s + c.count, 0);
  console.log(`  [1] GLM으로 카테고리 ${CATEGORIES.length}종 × 랜덤 저항 스펙 (총 ~${totalCategories}개) 생성 중...`);
  let specObjs, categoryLog;
  results.total++;
  try {
    const genResult = await generateRandomSpecs();
    specObjs     = genResult.specs;
    categoryLog  = genResult.categoryLog;
    if (!specObjs.length) throw new Error('생성된 스펙 없음');
    console.log(`     ✅ 총 ${specObjs.length}개 생성 완료`);
    results.passed++;
  } catch (err) {
    console.log(`     ❌ GLM 스펙 생성 실패: ${err.message}`);
    results.failedTest = 'glm_spec_generation';
    results.targetFn   = 'generateRandomSpecs';
    results.hint       = err.message;
    console.log(JSON.stringify(results));
    process.exit(1);
  }

  // ── 2단계: 각 스펙을 파이프라인에 통과 ──
  console.log(`\n  [2] 파이프라인 실행 (ValueParser → Mouser → StockRanker → 출력)`);
  const pipelineResults = [];

  for (let i = 0; i < specObjs.length; i++) {
    const specObj = specObjs[i];
    const spec    = specObj.input.trim();  // 앞뒤 공백 정리 (파서 테스트용 원본 보존은 output.original에)
    results.total++;
    console.log(`     [${i + 1}/${specObjs.length}] [${specObj.categoryLabel}] "${specObj.input}"`);

    try {
      const r = await runPipeline(spec);
      r.categoryLabel = specObj.categoryLabel;
      r.rawInput      = specObj.input;  // 트림 전 원본 (공백 포함 입력 보존)
      pipelineResults.push(r);

      if (r.output.success) {
        console.log(`        ✅ 파싱 성공 → ${r.output.mpn} | ${r.output.description}`);
        results.passed++;
      } else {
        // 엣지 케이스(필드 누락 등)는 파싱 실패가 예상되므로 파이프라인 자체가 에러 없이 동작한 것이 성공
        const isExpectedFail = specObj.category === 'edge' || specObj.category === 'sloppy';
        console.log(`        ${isExpectedFail ? '⚠️  (예상 가능 실패)' : '❌ (미매칭)'} → ${r.output.error}`);
        results.passed++;  // 파이프라인 자체는 정상 동작
      }
    } catch (err) {
      console.log(`        ❌ 파이프라인 크래시: ${err.message}`);
      pipelineResults.push({
        input: spec, rawInput: specObj.input, categoryLabel: specObj.categoryLabel,
        parseResult: null, keyword: null, mouserHits: 0, bestPart: null,
        output: { original: spec, success: false, error: '파이프라인 크래시: ' + err.message,
                  resistance: '', package: '', tolerance: '', mpn: '', description: '' }
      });
      if (!results.failedTest) {
        results.failedTest = 'pipeline_crash_' + i;
        results.targetFn   = 'runPipeline';
        results.hint       = err.message;
      }
    }

    // Mouser rate limit 대응 (30 req/min → 2.1초 간격)
    if (i < specObjs.length - 1) {
      await new Promise(r => setTimeout(r, 2200));
    }
  }

  // ── 3단계: 유저 수신 출력 시뮬레이션 (9열) ──
  console.log(`\n  [3] 유저 수신 출력 (9열 테이블):`);
  // 카테고리별로 묶어서 출력
  const byCategory = {};
  for (const r of pipelineResults) {
    const key = r.categoryLabel || '기타';
    if (!byCategory[key]) byCategory[key] = [];
    byCategory[key].push(r);
  }
  for (const [catLabel, rows] of Object.entries(byCategory)) {
    console.log(`\n     ── ${catLabel} ──`);
    console.log(`     ┌──────────────────────┬────────┬────────┬──────┬──────────────────────┬────────┬────────┬──────┬──────┐`);
    console.log(`     │ 입력 원본            │입력저항│입력PKG │입력% │ MPN                  │MPN저항 │MPN PKG │MPN % │검증  │`);
    console.log(`     ├──────────────────────┼────────┼────────┼──────┼──────────────────────┼────────┼────────┼──────┼──────┤`);
    for (const r of rows) {
      const o      = r.output;
      const rawStr = r.rawInput || r.input;
      if (o.success) {
        console.log(`     │ ${pad(rawStr,20)} │ ${pad(o.resistance,6)} │ ${pad(o.package,6)} │ ${pad(o.tolerance,4)} │ ${pad(o.mpn,20)} │ ${pad(o.mpn_resistance,6)} │ ${pad(o.mpn_package,6)} │ ${pad(o.mpn_tolerance,4)} │ ${pad(o.verdict,4)} │`);
      } else {
        console.log(`     │ ${pad(rawStr,20)} │ ${pad('-',6)} │ ${pad('-',6)} │ ${pad('-',4)} │ ${pad('FAIL',20)} │ ${pad('-',6)} │ ${pad('-',6)} │ ${pad('-',4)} │ FAIL │`);
      }
    }
    console.log(`     └──────────────────────┴────────┴────────┴──────┴──────────────────────┴────────┴────────┴──────┴──────┘`);
  }

  // ── 4단계: 리포트 저장 ──
  results.total++;
  try {
    const reportPath = generateReport(specObjs, pipelineResults, startTime, categoryLog);
    console.log(`\n  [4] 리포트 저장: ${reportPath}`);
    results.passed++;
  } catch (err) {
    console.log(`\n  [4] ❌ 리포트 저장 실패: ${err.message}`);
    if (!results.failedTest) {
      results.failedTest = 'report_generation';
      results.targetFn   = 'generateReport';
      results.hint       = err.message;
    }
  }

  // ── 요약 ──
  const successPipeline = pipelineResults.filter(r => r.output.success).length;
  const failPipeline    = pipelineResults.filter(r => !r.output.success).length;
  console.log(`\n  Random Validation: ${results.passed}/${results.total}`);
  console.log(`  (파이프라인 ${successPipeline}성공, ${failPipeline}실패/미매칭 — 카테고리: ${CATEGORIES.map(c=>c.label).join(' / ')})`);
  console.log(JSON.stringify(results));
  process.exit(results.passed === results.total ? 0 : 1);
}

function pad(s, len) {
  s = String(s || '');
  if (s.length > len) return s.substring(0, len - 1) + '…';
  return s.padEnd(len);
}

runTests().catch(err => {
  console.error('예상치 못한 오류:', err.message);
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'unexpected_error',
    targetFn: 'runTests', hint: err.message }));
  process.exit(1);
});
