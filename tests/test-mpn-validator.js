/**
 * test-mpn-validator.js — MpnValidator 단위 테스트 (mock HTTP)
 *
 * BACKLOG-002: MPN 역검증 로직 검증
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const path = require('path');
const mockResponses = require('./mocks/api-responses.json');

// MpnValidator는 getMouserApiKey를 전역으로 참조하므로 mock 등록
global.getMouserApiKey = () => 'MOCK_KEY';
global.UrlFetchApp = {};  // 실제로는 DI로 주입

const { _validateMpn, _lookupByMpn, _extractSpecsFromDescription } = require('../apps-script/MpnValidator');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected, fn) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) { failedTest = testName; targetFn = fn || '_extractSpecsFromDescription'; }
  }
}

// ─── _extractSpecsFromDescription 테스트 (순수 함수) ─────────────────────────

const s1 = _extractSpecsFromDescription('Thick Film Resistors - SMD 1/16W 1K OHM 5% 0402');
assert('extract_1k_0402_5pct_resistance',  s1.resistance_ohms,  1000,  '_extractSpecsFromDescription');
assert('extract_1k_0402_5pct_package',     s1.package,          '0402', '_extractSpecsFromDescription');
assert('extract_1k_0402_5pct_tolerance',   s1.tolerance_percent, 5,    '_extractSpecsFromDescription');

const s2 = _extractSpecsFromDescription('Thick Film Resistors - SMD 1/10W 10K OHM 1% 0603');
assert('extract_10k_0603_1pct_resistance', s2.resistance_ohms,  10000, '_extractSpecsFromDescription');
assert('extract_10k_0603_1pct_package',    s2.package,          '0603', '_extractSpecsFromDescription');
assert('extract_10k_0603_1pct_tolerance',  s2.tolerance_percent, 1,    '_extractSpecsFromDescription');

const s3 = _extractSpecsFromDescription('Thick Film Resistors - SMD 2.2M OHM 5% 1206');
assert('extract_2m2_1206_resistance',      s3.resistance_ohms,  2200000, '_extractSpecsFromDescription');
assert('extract_2m2_1206_package',         s3.package,          '1206',  '_extractSpecsFromDescription');

const s4 = _extractSpecsFromDescription('Thick Film Resistors - SMD 100 OHM 5% 0805');
assert('extract_100r_0805_resistance',     s4.resistance_ohms,  100,   '_extractSpecsFromDescription');
assert('extract_100r_0805_package',        s4.package,          '0805', '_extractSpecsFromDescription');

// 설명이 없는 경우
const s5 = _extractSpecsFromDescription('');
assert('extract_empty',                    s5.resistance_ohms,  null,  '_extractSpecsFromDescription');

// ─── mock fetchSvc 구성 ───────────────────────────────────────────────────────

function makeMockFetch(responseKey) {
  return {
    fetch: function(url, options) {
      const body = JSON.parse(options.payload);
      const mpn = (body.SearchByPartNumberRequest || {}).mouserPartNumber || responseKey;
      const key = 'mouser_partnumber_' + mpn;
      const data = mockResponses[key] || { SearchResults: { NumberOfResult: 0, Parts: [] } };
      return {
        getResponseCode: () => 200,
        getContentText:  () => JSON.stringify(data)
      };
    }
  };
}

function makeMockFetchFail() {
  return {
    fetch: function() {
      return { getResponseCode: () => 500, getContentText: () => '' };
    }
  };
}

// ─── _lookupByMpn 테스트 ──────────────────────────────────────────────────────

const looked = _lookupByMpn('RC0402JR-071KL', makeMockFetch('RC0402JR-071KL'), 'MOCK_KEY');
assert('lookup_found_mpn',   looked.mpn,         'RC0402JR-071KL',                           '_lookupByMpn');
assert('lookup_found_desc',  looked.description.indexOf('1K OHM') !== -1, true,              '_lookupByMpn');
assert('lookup_not_found',   _lookupByMpn('WRONG_MPN', makeMockFetch('WRONG_MPN'), 'MOCK_KEY'), null, '_lookupByMpn');
assert('lookup_http_fail',   _lookupByMpn('X', makeMockFetchFail(), 'MOCK_KEY'),             null,  '_lookupByMpn');

// ─── _validateMpn 테스트 ─────────────────────────────────────────────────────

// 정상: 1k 0402 5%
const v1 = _validateMpn('RC0402JR-071KL',
  { resistance_ohms: 1000, package_imperial: '0402', tolerance_percent: 5 },
  makeMockFetch('RC0402JR-071KL'), 'MOCK_KEY');
assert('validate_valid',      v1.valid,  true,  '_validateMpn');

// 저항값 불일치 (10k vs 1k)
const v2 = _validateMpn('RC0402JR-071KL',
  { resistance_ohms: 10000, package_imperial: '0402', tolerance_percent: 5 },
  makeMockFetch('RC0402JR-071KL'), 'MOCK_KEY');
assert('validate_resistance_mismatch', v2.valid, false, '_validateMpn');

// 패키지 불일치 (0603 vs 0402)
const v3 = _validateMpn('RC0402JR-071KL',
  { resistance_ohms: 1000, package_imperial: '0603', tolerance_percent: 5 },
  makeMockFetch('RC0402JR-071KL'), 'MOCK_KEY');
assert('validate_package_mismatch',   v3.valid, false, '_validateMpn');

// 오차 불일치 (1% vs 5%)
const v4 = _validateMpn('RC0402JR-071KL',
  { resistance_ohms: 1000, package_imperial: '0402', tolerance_percent: 1 },
  makeMockFetch('RC0402JR-071KL'), 'MOCK_KEY');
assert('validate_tolerance_mismatch', v4.valid, false, '_validateMpn');

// MPN 조회 실패 → invalid
const v5 = _validateMpn('WRONG_MPN',
  { resistance_ohms: 1000, package_imperial: '0402', tolerance_percent: 5 },
  makeMockFetch('WRONG_MPN'), 'MOCK_KEY');
assert('validate_not_found',          v5.valid, false, '_validateMpn');

// ─── 결과 출력 ────────────────────────────────────────────────────────────────
console.log(`  MpnValidator: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
