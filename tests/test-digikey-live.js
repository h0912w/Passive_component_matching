/**
 * test-digikey-live.js — 실제 Digikey API 호출 테스트
 *
 * 실행 조건:
 *   DIGIKEY_CLIENT_ID, DIGIKEY_CLIENT_SECRET 가 .env 에 있어야 함
 *   node tests/run-all-tests.js --live  (또는 단독 실행)
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const CLIENT_ID     = process.env.DIGIKEY_CLIENT_ID;
const CLIENT_SECRET = process.env.DIGIKEY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log('  ⏭  SKIP: DIGIKEY_CLIENT_ID / DIGIKEY_CLIENT_SECRET 없음');
  console.log(JSON.stringify({ passed: 0, total: 0, skipped: true }));
  process.exit(0); // SKIP은 실패 아님
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end',  ()    => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (_) { parsed = data; }
        resolve({ code: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─── Digikey OAuth 토큰 발급 ──────────────────────────────────────────────────
async function getDigikeyToken() {
  const body = `client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}&grant_type=client_credentials`;
  const resp = await httpsRequest({
    hostname: 'api.digikey.com',
    path:     '/v1/oauth2/token',
    method:   'POST',
    headers:  {
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);

  if (resp.code !== 200 || !resp.body.access_token) {
    throw new Error(`토큰 발급 실패 HTTP ${resp.code}: ${JSON.stringify(resp.body)}`);
  }
  return resp.body.access_token;
}

// ─── 테스트 케이스 ────────────────────────────────────────────────────────────
async function runTests() {
  const results = { passed: 0, total: 0, failedTest: null, targetFn: null,
                    input: null, expected: null, actual: null, hint: null };

  // ── 테스트 1: OAuth 토큰 발급 ────────────────────────────────────────────────
  results.total++;
  console.log('  [1] Digikey OAuth 2.0 토큰 발급');
  let token = null;
  try {
    token = await getDigikeyToken();
    console.log(`     ✅ 토큰 발급 성공 (${token.substring(0, 20)}...)`);
    results.passed++;
  } catch (err) {
    console.log(`     ❌ ${err.message}`);
    results.failedTest = 'digikey_oauth_token';
    results.targetFn   = 'DigikeyClient.getToken';
    results.hint       = 'Client ID / Secret 확인. developer.digikey.com 에서 앱 설정 확인.';
    console.log(JSON.stringify(results));
    process.exit(1);
  }

  // ── 테스트 2: 키워드 검색 ────────────────────────────────────────────────────
  results.total++;
  console.log('  [2] Digikey 키워드 검색: "1k resistor 0402"');
  try {
    const resp = await httpsRequest({
      hostname: 'api.digikey.com',
      path:     '/products/v4/search/keyword',
      method:   'POST',
      headers:  {
        'Authorization':      `Bearer ${token}`,
        'X-DIGIKEY-Client-Id': CLIENT_ID,
        'Content-Type':       'application/json'
      }
    }, {
      Keywords:            '1k resistor 0402',
      RecordCount:         5,
      RecordStartPosition: 0,
      Filters:             { CategoryIds: [52] }   // 52 = Chip Resistor - Surface Mount
    });

    if (resp.code !== 200) throw new Error(`HTTP ${resp.code}: ${JSON.stringify(resp.body).substring(0, 200)}`);
    const products = resp.body?.Products || [];
    if (products.length === 0) throw new Error('Products 배열 비어 있음');

    const first = products[0];
    if (!first.ManufacturerPartNumber) throw new Error('ManufacturerPartNumber 없음');
    if (!first.ProductDescription)     throw new Error('ProductDescription 없음');
    if (first.QuantityAvailable === undefined) throw new Error('QuantityAvailable 없음');

    console.log(`     ✅ 결과 ${products.length}개  첫번째: ${first.ManufacturerPartNumber}`);
    console.log(`        Description: ${first.ProductDescription}`);
    console.log(`        재고: ${first.QuantityAvailable}`);
    results.passed++;
  } catch (err) {
    console.log(`     ❌ ${err.message}`);
    if (!results.failedTest) {
      results.failedTest = 'digikey_keyword_search';
      results.targetFn   = 'DigikeyClient._searchDigikey';
      results.input      = '1k resistor 0402';
      results.expected   = '{ ManufacturerPartNumber, ProductDescription, QuantityAvailable }';
      results.actual     = err.message;
      results.hint       = 'Digikey API 응답 구조 확인. CategoryId 52 = Chip Resistor SMT.';
    }
  }

  console.log(`\n  Digikey Live: ${results.passed}/${results.total}`);
  console.log(JSON.stringify(results));
  process.exit(results.passed === results.total ? 0 : 1);
}

runTests().catch(err => {
  console.error('예상치 못한 오류:', err.message);
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'unexpected_error', hint: err.message }));
  process.exit(1);
});
