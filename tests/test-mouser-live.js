/**
 * test-mouser-live.js — 실제 Mouser API 호출 테스트
 *
 * 실행 조건:
 *   1. .env 파일에 MOUSER_API_KEY 가 설정되어 있어야 함
 *   2. node tests/run-all-tests.js --live  (또는 단독 실행)
 *
 * 단독 실행: node tests/test-mouser-live.js
 *
 * Node.js에서 실제 HTTP를 보내므로 UrlFetchApp 대신 https 모듈 사용.
 * 이 테스트는 .gs 파일의 로직이 아닌, Mouser API 자체의 응답 형태를 검증한다.
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const API_KEY = process.env.MOUSER_API_KEY;

// ─── API 키 확인 ──────────────────────────────────────────────────────────────
if (!API_KEY) {
  console.error('MOUSER_API_KEY가 .env 파일에 없습니다.');
  console.error('cp .env.example .env 후 실제 키를 입력하세요.');
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'api_key_missing',
    targetFn: 'setup', hint: '.env 파일에 MOUSER_API_KEY 를 추가하세요.' }));
  process.exit(1);
}

// ─── 유틸: HTTPS POST ─────────────────────────────────────────────────────────
function httpsPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname,
      path,
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end',  ()    => resolve({ code: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── 테스트 케이스 ────────────────────────────────────────────────────────────
async function runTests() {
  const results = { passed: 0, total: 0, failedTest: null, targetFn: null,
                    input: null, expected: null, actual: null, hint: null };

  // ── 테스트 1: 키워드 검색으로 1kΩ 0402 5% 저항 검색 ────────────────────────
  results.total++;
  console.log('  [1] Mouser 키워드 검색: "RC0402 1k 5%"');
  try {
    const resp = await httpsPost(
      'api.mouser.com',
      `/api/v2/search/keyword?apiKey=${API_KEY}`,
      { SearchByKeywordRequest: {
          keyword:        'RC0402 1k 5%',
          records:        5,
          startingRecord: 0,
          searchOptions:  'InStock'
      }}
    );

    if (resp.code !== 200) {
      throw new Error(`HTTP ${resp.code}: ${JSON.stringify(resp.body)}`);
    }
    const parts = resp.body?.SearchResults?.Parts;
    if (!parts || parts.length === 0) {
      throw new Error('Parts 배열이 비어 있음 — 검색 결과 없음');
    }

    // 응답 구조 확인 (MPN, Description, 재고 필드 존재 여부)
    const first = parts[0];
    if (!first.ManufacturerPartNumber) throw new Error('ManufacturerPartNumber 필드 없음');
    if (!first.Description)            throw new Error('Description 필드 없음');
    if (first.AvailabilityInStock === undefined) throw new Error('AvailabilityInStock 필드 없음');

    console.log(`     ✅ 결과 ${parts.length}개  첫번째: ${first.ManufacturerPartNumber}`);
    console.log(`        Description: ${first.Description}`);
    console.log(`        재고: ${first.AvailabilityInStock}`);
    results.passed++;
  } catch (err) {
    console.log(`     ❌ ${err.message}`);
    results.failedTest = 'mouser_keyword_search';
    results.targetFn   = 'MouserClient._searchMouser';
    results.input      = 'RC0402 1k 5%';
    results.expected   = '{ ManufacturerPartNumber, Description, AvailabilityInStock }';
    results.actual     = err.message;
    results.hint       = 'Mouser API 응답 구조가 예상과 다릅니다. api-integration.md 응답 필드를 확인하세요.';
  }

  // ── 테스트 2: 재고 있는 부품만 필터링 (searchOptions: InStock) ───────────────
  results.total++;
  console.log('  [2] Mouser InStock 필터: 재고 0인 부품 제외 확인');
  try {
    const resp = await httpsPost(
      'api.mouser.com',
      `/api/v2/search/keyword?apiKey=${API_KEY}`,
      { SearchByKeywordRequest: {
          keyword:        'resistor 0402',
          records:        5,
          startingRecord: 0,
          searchOptions:  'InStock'
      }}
    );
    const parts = resp.body?.SearchResults?.Parts || [];
    const zeroStock = parts.filter(p => parseInt(p.AvailabilityInStock || '0') === 0);
    if (zeroStock.length > 0) {
      throw new Error(`InStock 필터인데 재고 0 부품 포함됨: ${zeroStock[0].ManufacturerPartNumber}`);
    }
    console.log(`     ✅ 재고 있는 부품 ${parts.length}개 반환, 재고 0 부품 없음`);
    results.passed++;
  } catch (err) {
    console.log(`     ❌ ${err.message}`);
    if (!results.failedTest) {
      results.failedTest = 'mouser_instock_filter';
      results.targetFn   = 'MouserClient._searchMouser (searchOptions)';
      results.hint       = err.message;
    }
  }

  // ── 결과 출력 ────────────────────────────────────────────────────────────────
  console.log(`\n  Mouser Live: ${results.passed}/${results.total}`);
  // TestRunner가 파싱할 JSON을 마지막 줄에 출력
  console.log(JSON.stringify(results));
  process.exit(results.passed === results.total ? 0 : 1);
}

runTests().catch(err => {
  console.error('예상치 못한 오류:', err.message);
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'unexpected_error',
    targetFn: 'runTests', hint: err.message }));
  process.exit(1);
});
