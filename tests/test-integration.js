/**
 * test-integration.js — 전체 파이프라인 통합 테스트 (mock API)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
// ── 전역 의존성 설정 ──
global.APP_CONFIG = require('../apps-script/Config').APP_CONFIG;

const PackageConverter = require('../apps-script/PackageConverter');
global.isMetric = PackageConverter.isMetric;
global.toImperial = PackageConverter.toImperial;
global.toMetric = PackageConverter.toMetric;

const ValueParser = require('../apps-script/ValueParser');
global.parseResistorInput = ValueParser.parseResistorInput;
global.formatResistanceDisplay = ValueParser.formatResistanceDisplay;

const CacheManager = require('../apps-script/CacheManager');
global.cacheGet = CacheManager.cacheGet;
global.cachePut = CacheManager.cachePut;
global.mouserCacheKey = CacheManager.mouserCacheKey;
global.nlpCacheKey = CacheManager.nlpCacheKey;

const MouserClient = require('../apps-script/MouserClient');
global._searchMouser = MouserClient._searchMouser;
global.buildSearchKeyword = MouserClient.buildSearchKeyword;

const { _callGlm } = require('../apps-script/GlmClient');
global._callGlm = _callGlm;

const NlpParser = require('../apps-script/NlpParser');
global._parseWithNlp = NlpParser._parseWithNlp;

const StockRanker = require('../apps-script/StockRanker');
global.rankByStock = StockRanker.rankByStock;

const OutputFormatter = require('../apps-script/OutputFormatter');
global.formatSuccessRow = OutputFormatter.formatSuccessRow;
global.formatErrorRow = OutputFormatter.formatErrorRow;
global.formatOutput = OutputFormatter.formatOutput;

const ErrorHandler = require('../apps-script/ErrorHandler');
global.parseError = ErrorHandler.parseError;
global.noResultsError = ErrorHandler.noResultsError;

const Config = require('../apps-script/Config');
global.getMouserApiKey = () => 'test-mouser-key';
global.getGlmApiKey = () => 'test-glm-key';

const { makeMockFetch, mockCacheService } = require('./mocks/apps-script-mocks');
const { _processInputs } = require('../apps-script/Code');

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

// ── Mock Mouser 응답 (여러 저항값에 대응) ──
const mouserResp = {
  SearchResults: {
    NumberOfResult: 2,
    Parts: [
      {
        ManufacturerPartNumber: 'RC0402JR-071KL',
        Manufacturer: 'Yageo',
        Description: 'RES SMD 1K OHM 5% 1/16W 0402',
        AvailabilityInStock: '5000000',
        PriceBreaks: [{ Quantity: 1, Price: '$0.10' }]
      },
      {
        ManufacturerPartNumber: 'RC0402JR-071K2L',
        Manufacturer: 'Yageo',
        Description: 'RES SMD 1K OHM 5% 0402',
        AvailabilityInStock: '1000',
        PriceBreaks: []
      }
    ]
  }
};

const glmResp = {
  choices: [{
    message: { content: '{"resistance_ohms": null, "package": null, "tolerance_percent": null}' },
    finish_reason: 'stop'
  }],
  usage: {}
};

const mockFetch = makeMockFetch({
  'api.mouser.com': { code: 200, body: mouserResp },
  'open.bigmodel.cn': { code: 200, body: glmResp }
});

// ── 테스트 1: 정상 입력 ──
const result1 = _processInputs('1k 1005 5%', mockFetch, mockCacheService);
assert('integration_success', result1.successCount, 1);
assert('integration_rows', result1.rows.length, 1);
assert('integration_mpn', result1.rows[0].mpn, 'RC0402JR-071KL');
assert('integration_resistance', result1.rows[0].resistance, '1kΩ');

// ── 테스트 2: 여러 줄 입력 (정상 + 실패) ──
const result2 = _processInputs('1k 1005 5%\ninvalid!!!', mockFetch, mockCacheService);
assert('multi_total', result2.totalCount, 2);
assert('multi_success', result2.successCount, 1);
assert('multi_error', result2.errorCount, 1);
assert('multi_error_flag', result2.rows[1].success, false);

// ── 테스트 3: 빈 입력 에러 ──
total++;
try {
  _processInputs('', mockFetch, mockCacheService);
  console.log('  ❌ empty_input: should have thrown');
  if (!failedTest) { failedTest = 'empty_input'; targetFn = '_processInputs'; }
} catch (e) {
  if (e.message.includes('비어')) { passed++; }
  else { console.log(`  ❌ empty_error: ${e.message}`); if (!failedTest) { failedTest = 'empty_error'; targetFn = '_processInputs'; } }
}

// ── 테스트 4: 랜덤 E24 입력 3개 동시 파이프라인 통과 검증 ──
const E24_INT = [1.0, 1.5, 2.2, 3.3, 4.7, 6.8, 10, 22, 47, 100];
const PKGS_INT = ['0402', '0603', '0805', '1206'];
const TOLS_INT = ['1%', '5%'];
const SEED_INT = Date.now();
let _r = SEED_INT;
function rng2() { _r = (Math.imul(1664525, _r) + 1013904223) >>> 0; return _r / 0x100000000; }
function pick2(a) { return a[Math.floor(rng2() * a.length)]; }

const randomInputs = [];
for (let i = 0; i < 3; i++) {
  const v   = pick2(E24_INT);
  const pkg = pick2(PKGS_INT);
  const tol = pick2(TOLS_INT);
  const str = v >= 1000 ? `${v/1000}M` : v >= 1 ? `${v}k` : `${v}R`;
  randomInputs.push(`${str} ${pkg} ${tol}`);
}
const randomInputStr = randomInputs.join('\n');

console.log(`  [랜덤 시드: ${SEED_INT}]`);
console.log(`  ┌─────────────────────────────────────────────────┐`);
console.log(`  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │`);
randomInputs.forEach((s, i) => {
  console.log(`  │  [${i+1}] ${s.padEnd(43)} │`);
});
console.log(`  └─────────────────────────────────────────────────┘`);

const result4 = _processInputs(randomInputStr, mockFetch, mockCacheService);
// 3개 입력 → 3개 결과 (mock Mouser 응답으로 모두 성공)
assert('random_pipeline_total',   result4.totalCount,   3);
assert('random_pipeline_success', result4.successCount, 3);
// 각 row에 mpn, resistance, package, tolerance 필드가 있는지 확인
result4.rows.forEach((row, i) => {
  assert(`random_row${i+1}_has_mpn`, typeof row.mpn, 'string');
  assert(`random_row${i+1}_has_resistance`, typeof row.resistance, 'string');
});

console.log(`  Integration: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
