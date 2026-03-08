/**
 * test-random-validation.js — 랜덤 저항값 End-to-End 검증 에이전트
 *
 * tests/test-cases.json 파일에서 미리 생성된 테스트 케이스를 읽어서
 * 전체 파이프라인을 통과시켜 실제 유저가 받는 출력(9열 테이블)이 정상인지 검증한다.
 *
 * 매 실행마다 tests/reports/ 에 타임스탬프 리포트를 남긴다.
 *
 * 실행 조건:
 *   1. .env 파일에 MOUSER_API_KEY 필요
 *   2. tests/test-cases.json 파일 필요 (미리 생성되어야 함)
 *   3. node tests/run-all-tests.js --live  또는 단독 실행
 *
 * 단독 실행: node tests/test-random-validation.js
 *
 * 참고: 테스트 케이스는 /test-cases-generator 스킬로 미리 생성해야 합니다.
 *         /test-cases-generator 스킬은 GLM API를 사용하여 테스트 케이스를 생성합니다.
 *         본 테스트는 GLM API를 호출하지 않습니다.
 */
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const https = require('https');
const fs    = require('fs');
const path = require('path');

// ─── API 키 확인 ────────────────────────────────────────────────────────────
const MOUSER_KEY = process.env.MOUSER_API_KEY;

if (!MOUSER_KEY) {
  console.error('MOUSER_API_KEY 가 .env 파일에 없습니다.');
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'api_key_missing',
    targetFn: 'setup', hint: '.env 파일에 MOUSER_API_KEY 를 추가하세요.' }));
  process.exit(1);
}

const REPORTS_DIR = path.join(__dirname, 'reports');
const TEST_CASES_PATH = path.join(__dirname, 'test-cases.json');

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
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

// ─── 테스트 케이스 로드 ─────────────────────────────────────────────────────
function loadTestCases() {
  try {
    const content = fs.readFileSync(TEST_CASES_PATH, 'utf8');
    const data = JSON.parse(content);
    console.log(`✅ 테스트 케이스 로드 완료`);
    console.log(`   파일: ${TEST_CASES_PATH}`);
    console.log(`   생성 시각: ${data.timestamp}`);
    console.log(`   시드: ${data.seed}`);
    console.log(`   카테고리: ${data.categories.length}개`);
    console.log(`   총 케이스: ${data.categories.reduce((sum, c) => sum + c.cases.length, 0)}개`);

    // 카테고리별로 분리
    const allSpecs = [];
    for (const category of data.categories) {
      for (const testCase of category.cases) {
        allSpecs.push({
          input: testCase.input,
          category: category.id,
          categoryLabel: category.label
        });
      }
    }
    return allSpecs;
  } catch (err) {
    console.error(`❌ 테스트 케이스 로드 실패: ${err.message}`);
    console.error(`   ${TEST_CASES_PATH} 파일이 없거나 JSON 형식이 올바르지 않습니다.`);
    console.error(`   /test-cases-generator 스킬로 먼저 테스트 케이스를 생성하세요.`);
    console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'test_cases_load_failed',
      targetFn: 'loadTestCases', hint: '테스트 케이스를 먼저 생성하세요.' }));
    process.exit(1);
  }
}

// ─── Step 1: 테스트 케이스 로드 ─────────────────────────────────────────
async function loadTestSpecs() {
  const allSpecs = loadTestCases();
  const categoryLog = [];

  console.log(` [1] 테스트 케이스 로드 완료`);

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

// ─── Step 3: 파이프라인 실행 (Node.js 환경) ─────────────────────────────────────────
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

  if (!row.parseResult.parse_success) {
    row.output = OutputFormatter.formatErrorRow(inputLine, row.parseResult.error_message || ErrorHandler.parseError(inputLine));
    return row;
  }

  // 2) Mouser 키워드 검색
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

    // 3) StockRanker — 전체 확보 (재고 기준 정렬, 2차 스펙 필터)
    const candidates = StockRanker.rankByStockAll(normalized, {
      resistance_ohms:  p.resistance_ohms,
      package_imperial: p.package_imperial,
      tolerance_percent: p.tolerance_percent
    });

    // 4) Description에서 역추출한 스펙으로 PASS/FAIL 판정 → FAIL 시 다음 후보 시도 (최대 3회)
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

// ─── Markdown 이스케이프 함수 ──────────────────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[|\\`*_{}[\]()#+\-.!]/g, '\\$&');
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
  md += `| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description | MPN 저항값 | MPN 패키지 | MPN 오차 | 일치 확인 |\n`;
  md += `|-----------|------------|------------|----------|-------------|-------------|----------|--------|------|\n`;

  for (const r of pipelineResults) {
    const o = r.output;
    const rawInput = r.input || r.rawInput;

    if (o.success) {
      const verdictMd = o.verdict === 'PASS' ? '✅ PASS' : o.verdict === 'FAIL' ? '❌ FAIL' : 'N/A';
      md += `| ${esc(rawInput)} | ${esc(o.resistance)} | ${esc(o.package)} | ${esc(o.tolerance)} | ${esc(o.mpn)} | ${esc(o.description || '')} | ${esc(o.mpn_resistance)} | ${esc(o.mpn_package)} | ${esc(o.mpn_tolerance)} | ${verdictMd} |\n`;
    } else {
      md += `| ${esc(rawInput)} | - | - | - | - | - | - | - | - | ❌ FAIL |\n`;
    }
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(reportPath, md, 'utf8');

  // 랜덤 검증 테이블을 별도 파일에 저장 (test-report.md에서 로드용)
  const tableMd = md.split('## 매칭 결과')[1] || '';
  const randomTablePath = path.join(__dirname, '..', 'docs', 'random-validation-table.md');
  fs.mkdirSync(path.dirname(randomTablePath), { recursive: true });
  fs.writeFileSync(randomTablePath, tableMd, 'utf8');
  console.log(`📄 랜덤 검증 테이블 저장: docs/random-validation-table.md`);

  return reportPath;
}

// ─── 메인 ───────────────────────────────────────────────────────────────────────────
async function runTests() {
  const startTime = new Date();
  const results = { passed: 0, total: 0, failedTest: null, targetFn: null, hint: null };

  console.log(` [1] 테스트 케이스 로드 중...`);

  const loadResult = await loadTestSpecs();
  const specObjs = loadResult.specs;

  console.log(` [2] 총 ${specObjs.length}개 테스트 케이스 준비 완료`);

  // 파이프라인 실행
  const pipelineResults = [];
  for (let i = 0; i < specObjs.length; i++) {
    const specObj = specObjs[i];

    if (!specObj.input || typeof specObj.input !== 'string') {
      console.error(`    ❌ specObj.input이 유효하지 않음: ${JSON.stringify(specObj)}`);
      continue;
    }

    const spec = specObj.input.trim();
    results.total++;

    console.log(` [3-${i + 1}] [${specObj.categoryLabel}] "${spec}"`);
    const r = await runPipeline(spec);
    pipelineResults.push(r);

    if (r.output.success) {
      results.passed++;
    } else {
      results.failedTest = 'pipeline_crash_' + i;
      results.targetFn   = 'runPipeline';
      results.hint       = r.output.error;
    }
  }

  const successPipeline = pipelineResults.filter(r => r.output.success).length;
  console.log(` [4] 파이프라인 실행 완료: ${successPipeline}/${specObjs.length} 성공`);

  // 검증 리포트 생성
  if (pipelineResults.length > 0) {
    const reportPath = generateReport(specObjs, pipelineResults, startTime, []);
    console.log(`📄 검증 리포트 저장: ${reportPath}`);
  }

  console.log(JSON.stringify(results));
  process.exit(0); // 부분 성공도 exit code 0으로 처리
}

runTests().catch(err => {
  console.error('예상치 못한 오류:', err.message);
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'unexpected_error', targetFn: 'runTests', hint: err.message }));
  process.exit(1);
});
