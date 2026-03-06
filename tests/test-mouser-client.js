/**
 * test-mouser-client.js — MouserClient 테스트 (mock HTTP)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { makeMockFetch, mouserSuccessResponse } = require('./mocks/apps-script-mocks');
const { _searchMouser, buildSearchKeyword } = require('../apps-script/MouserClient');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) { failedTest = testName; targetFn = testName; }
  }
}

// ── 기본 검색 ──
const mockFetch = makeMockFetch({
  'api.mouser.com': { code: 200, body: mouserSuccessResponse }
});

const result = _searchMouser('1k 0402 5%', 5, mockFetch, 'test-key');
assert('search_parts_len', result.parts.length, 1);
assert('search_mpn', result.parts[0].mpn, 'RC0402JR-071KL');
assert('search_stock', result.parts[0].stock, 5000000);
assert('search_total', result.totalResults, 1);

// ── API 에러 ──
total++;
const errorFetch = makeMockFetch({
  'api.mouser.com': { code: 401, body: { message: 'Unauthorized' } }
});
try {
  _searchMouser('1k', 5, errorFetch, 'bad-key');
  console.log('  ❌ api_error: should have thrown');
  if (!failedTest) { failedTest = 'api_error'; targetFn = '_searchMouser'; }
} catch (e) {
  if (e.message.includes('401')) { passed++; }
  else { console.log(`  ❌ api_error: wrong msg: ${e.message}`); if (!failedTest) { failedTest = 'api_error'; targetFn = '_searchMouser'; } }
}

// ── buildSearchKeyword ──
const kw = buildSearchKeyword({
  resistance_ohms: 1000,
  package_imperial: '0402',
  package_input: '1005',
  tolerance_percent: 5
});
total++;
if (kw.includes('1k') && kw.includes('0402') && kw.includes('5%')) { passed++; }
else { console.log(`  ❌ keyword: "${kw}"`); if (!failedTest) { failedTest = 'keyword'; targetFn = 'buildSearchKeyword'; } }

// ── 빈 결과 ──
const emptyFetch = makeMockFetch({
  'api.mouser.com': { code: 200, body: { SearchResults: { Parts: [], NumberOfResult: 0 } } }
});
const emptyResult = _searchMouser('nonexistent', 5, emptyFetch, 'test-key');
assert('empty_parts', emptyResult.parts.length, 0);

console.log(`  MouserClient: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
