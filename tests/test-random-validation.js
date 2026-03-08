/**
 * test-random-validation.js — 랜덤 저항값 End-to-End 검증 에이전트
 *
 * GLM API로 랜덤 저항 스펙을 생성하고, 전체 파이프라인을 통과시켜
 * 실제 유저가 받는 출력(6열 테이블)이 정상인지 검증한다.
 *
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
const path = require('path');

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
// 총 입력 수: 1 카테고리 × BATCH_COUNT × BATCH_SIZE
const BATCH_SIZE = 1;   // GLM이 한 번에 생성하는 항목 수
const BATCH_COUNT = 5;   // 카테고리당 배치 횟수 → 카테고리당 1개, 전체 5개

// ── 카테고리 정의 ─────────────────────────────────────────────────────────────
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
    - 패키지: 0201, 0402, 0603, 0805, 1206
    - 오차: 0.1%, 1%, 5%
  },
  {
    id:    'korean',
    label: '한국어 자연어 입력',
    count: BATCH_SIZE * BATCH_COUNT,
    prompt: `한국 엔지니어가 저항값을 한국어로 입력하는 형식 ${BATCH_SIZE}개를 생성하세요.
    다양성 요구사항:
    - 순수 한국어: "1킬로옴", "2메가옴", "10메가옴", "100옴", "2.2메가옴"
    - 단위 혼용: "4.7킬로옴", "10메가옴", "2.2메가옴"
    - 패키지: "0201", "0402", "0603", "0805", "1206"
    - 오차: "0.1퍼센트", "1퍼센트", "5퍼센트"
  },
  {
    id:    'sloppy',
    label: '오염된 실사용 입력',
    count: BATCH_SIZE * BATCH_COUNT,
    prompt: `실제 사용자가 대충 입력하거나 다른 곳에서 복붙할 때 생기는 지저분한 형식 ${BATCH_SIZE}개를 생성하세요.
    다양성 요구사항:
    - 공백/콤마/언더바 혼용
    - 소수점 혼용: 4.7k0, 10k0, 2.2M0 등
    - 단위 혼용: "10k0옴", "2.2M0옴"
    - 패키지 혼용: "0603", "1k", "100R", "4.7k"
    - 오차 혼용: "+/-1%", "+/-5%", "0.1%" 등
  },
  {
    id:    'edge',
    label: '엣지 케이스',
    count: BATCH_SIZE * BATCH_COUNT,
    prompt: `저항값 파서를 테스트하기 위한 까다로운 엣지 케이스 ${BATCH_SIZE}개를 생성하세요.
    다양성 요구사항:
    - 극단값: 1옴, 10M옴, 0.1옴
    - 옵셋 패키지: 01005, 0201
    - 옵셋 오차: ±0.1%, ±0.25%
    - 일부 단위 혼용: "4R7", "0R47", "0R22", "0R33"
  }
];

// ─── 유틸: HTTPS POST ──────────────────────────────────────────────────────
function httpsPost(hostname, urlPath, body, headers) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...(headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ code: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON 파싱 실패: ${data.substring(0, 200)}`)); }
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
              content: '당신은 전자 부품 테스트 데이터 생성 전문가입니다. 요청된 형식의 테스트 데이터만 JSON 배열로 반환하세요. 설명이나 부연 텍스트는 절대 출력하지 않습니다.'
            },
            { role: 'user', content: category.prompt }
          ],
          temperature: 0.95
        },
        { 'Authorization': 'Bearer ' + GLM_KEY }
      );

      if (resp.code !== 200) {
        console.log(`            ⚠️  배치 ${b + 1}/${batchCount} GLM 오류 (HTTP ${resp.code})`);
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
  }
  // 배치 간 rate limit 대응 (1.5초 딜레이)
  if (b < batchCount - 1) {
    await new Promise(r => setTimeout(r, 1500));
  }
  return all.slice(0, category.count);
}

// ─── Step 2: GLM으로 랜덤 저항 스펙을 생성하고, 전체 파이프라인을 통과시켜
// 4 카테고리 × 5개 = 20개 입력만 생성
async function generateRandomSpecs() {
  const allSpecs = [];
  const categoryLog = [];

  for (let i = 0; i < CATEGORIES.length; i++) {
    const cat = CATEGORIES[i];
    console.log(`     [${i + 1}] 카테고리 "${cat.label}" ${cat.count}개 생성 중...`);
    try {
      const specs = await generateCategorySpecs(cat);
      const preview = specs.slice(0, 3).map(s => `"${s}"`).join(', ');
      console.log(`            ✅ 총 ${specs.length}개 생성 완료 (예: ${preview}${specs.length > 3 ? ' ...' : ''})`);
      for (const s of specs) allSpecs.push({ input: s, category: cat.id, categoryLabel: cat.label });
    } catch (err) {
      console.log(`            ⚠️  실패 (건너뜀): ${err.message}`);
      categoryLog.push({ id: cat.id, label: cat.label, count: 0, error: err.message });
    }
  }

  if (allSpecs.length === 0) throw new Error('모든 카테고리 생성 실패');
  return { specs: allSpecs, categoryLog };
}

// ─── Step 3: Mouser 키워드 검색 (실제 API) ──────────────────────────────────
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

// ─── Step 4: 파이프라인 실행 (Node.js 환경) ─────────────────────────────────────────
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

  // 3) Mouser 키워드 검색
  const p = row.parseResult;
  const parts = [];
  if (p.resistance_ohms >= 1000000) parts.push((p.resistance_ohms / 1000000) + 'M ohm');
  else if (p.resistance_ohms >= 1000) parts.push((p.resistance_ohms / 1000) + 'k ohm');
  else parts.push(p.resistance_ohms + ' ohm');
  if (p.package_imperial) parts.push(p.package_imperial);
  else if (p.package_input) parts.push(p.package_input);
  if (p.tolerance_percent != null) parts.push(p.tolerance_percent + '%');
  row.keyword = parts.join(' ');

  try {
    const searchResult = await searchMouserLive(row.keyword);
    const rawParts = searchResult.Parts || [];
    row.mouserHits = rawParts.length;

    const normalized = rawParts.map(rp => ({
      mpn:          rp.ManufacturerPartNumber || '',
      manufacturer:  rp.Manufacturer || '',
      description:  rp.Description || '',
      stock:        parseInt(rp.AvailabilityInStock || '0', 10)
    }));

    // 4) StockRanker — 전체 확보 (재고 기준 정렬, 2차 스펙 필터)
    const candidates = StockRanker.rankByStockAll(normalized, {
      resistance_ohms:  p.resistance_ohms,
      package_imperial: p.package_imperial,
      tolerance_percent: p.tolerance_percent
    });

    // 5) Description에서 역추출한 스펙으로 PASS/FAIL 판정 → FAIL 시 다음 후보 시도 (최대 3회)
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

    row.bestPart    = bestPart;
    row.bestMpnSpec = bestMpnSpec;
  } catch (e) {
    row.output = OutputFormatter.formatErrorRow(inputLine, 'Mouser 검색 실패: ' + e.message);
    return row;
  }

  if (row.bestPart) {
    row.output = OutputFormatter.formatSuccessRow(row.parseResult, row.bestPart, row.bestMpnSpec);
  } else {
    row.output = OutputFormatter.formatErrorRow(inputLine, ErrorHandler.noResultsError(row.keyword));
  }

  return row;
}

// ─── GLM NLP 파싱 (라이브) ─────────────────────────────────────────────────────
async function glmNlpParse(input) {
  const resp = await httpsPost(
    'open.bigmodel.cn',
    '/api/paas/v4/chat/completions',
    {
      model: 'glm-4.7-flash',
      messages: [
        {
              role: 'system',
              content: '당신은 전자 부품 테스트 데이터 생성 전문가입니다. 요청된 형식의 테스트 데이터만 JSON 배열로 반환하세요. 설명이나 부연 텍스트는 절대 출력하지 않습니다.'
            },
            { role: 'user',   content: `다음 텍스트에서 저항값(ohm 단위 숫자), 패키지(예: 0402), 오차(예: 1%)를 추출:\n"${input}"\nJSON: {"resistance_ohms":number,"package":"string","tolerance_percent":number}` }
          ],
          temperature: 0.1
        },
        { 'Authorization': 'Bearer ' + GLM_KEY }
      );

  if (resp.code !== 200) throw new Error('GLM NLP HTTP ' + resp.code);
  const content = resp.body.choices[0].message.content;
  const m = content.match(/\{[\s\S]*\]/);
  if (!m) throw new Error('JSON 추출 실패');
  return JSON.parse(m[0]);
}

// ─── Step 4: 리포트 생성 ──────────────────────────────────────────────────────────
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
  md += '## 매칭 결과\n\n';
  md += `| 입력 원본 | 입력 저항값 | 입력 패키지 | 입력 오차 | 부품명 (MPN) | MPN 저항값 | MPN 패키지 | MPN 오차 | 검증 |\n`;
  md += `|-----------|-----------|-----------|---------|-------------|----------|--------|------|\n`;

  for (const r of pipelineResults) {
    const o = r.output;
    const rawInput = r.rawInput || r.input;

    if (o.success) {
      const verdictMd = o.verdict === 'PASS' ? '✅ PASS' : o.verdict === 'FAIL' ? '❌ FAIL' : 'N/A';
      md += `| ${esc(rawInput)} | ${esc(o.resistance)} | ${esc(o.package)} | ${esc(o.tolerance)} | ${esc(o.mpn)} | ${esc(o.mpn_resistance)} | ${esc(o.mpn_package)} | ${esc(o.mpn_tolerance)} | ${verdictMd} |\n`;
    } else {
      md += `| ${esc(rawInput)} | - | - | - | - | - | - | ❌ FAIL |\n`;
    }
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(reportPath, md, 'utf8');
  return reportPath;
}

// ─── 메인 ───────────────────────────────────────────────────────────────────────────
async function runTests() {
  const startTime = new Date();
  const results = { passed: 0, total: 0, failedTest: null, targetFn: null, hint: null };

  // GLM rate limit 대응: 이전 GLM 테스트 완료 후 10초 대기
  console.log(' [0] GLM rate limit 대기 (10초)...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  const totalCategories = CATEGORIES.reduce((s, c) => s + c.count, 0);
  console.log(` [1] GLM으로 카테고리 ${CATEGORIES.length}종 × 랜덤 저항 스펙 (총 ~${totalCategories}개) 생성 중...`);

  let specObjs, categoryLog;
  const genResult = await generateRandomSpecs();

  specObjs     = genResult.specs;
  categoryLog  = genResult.categoryLog;

  if (!specObjs.length) throw new Error('모든 카테고리 생성 실패');

  results.total++;
  console.log(` [2] 총 ${specObjs.length}개 생성 완료`);
  results.passed++;

  // 파이프라인 실행
  const pipelineResults = [];
  for (let i = 0; i < specObjs.length; i++) {
    const specObj = specObjs[i];
    const spec    = specObj.input.trim(); // 앞뒤 공백 정리 (파서 테스트용 원본 보존은 output.original에)
    results.total++;

    console.log(` [3-${i + 1}] [${specObj.categoryLabel}] "${spec}"`);
    const r = await runPipeline(spec);
    pipelineResults.push(r);

    if (!r.output.success) {
      results.failedTest = 'pipeline_crash_' + i;
      results.targetFn   = 'runPipeline';
      results.hint       = r.output.error;
    }
  }

  const successPipeline = pipelineResults.filter(r => r.output.success).length;
  console.log(` [4] 파이프라인 실행 완료: ${successPipeline}/${specObjs.length} 성공`);
  console.log(JSON.stringify(results));
  process.exit(results.passed === specObjs.length ? 0 : 1);
}

runTests().catch(err => {
  console.error('예상치 못한 오류:', err.message);
  process.exit(1);
});
