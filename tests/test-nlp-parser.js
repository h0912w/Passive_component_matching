/**
 * test-nlp-parser.js — NlpParser 테스트 (mock GLM)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
// 전역 의존성 설정
global.APP_CONFIG = require('../apps-script/Config').APP_CONFIG;
const PackageConverter = require('../apps-script/PackageConverter');
global.isMetric = PackageConverter.isMetric;
global.toImperial = PackageConverter.toImperial;
global.toMetric = PackageConverter.toMetric;
const ValueParser = require('../apps-script/ValueParser');
global.formatResistanceDisplay = ValueParser.formatResistanceDisplay;
const CacheManager = require('../apps-script/CacheManager');
global.nlpCacheKey = CacheManager.nlpCacheKey;
global.cacheGet = CacheManager.cacheGet;
global.cachePut = CacheManager.cachePut;

// GlmClient의 _callGlm을 global에 등록
const { _callGlm } = require('../apps-script/GlmClient');
global._callGlm = _callGlm;

const { makeMockFetch, mockCacheService } = require('./mocks/apps-script-mocks');
const { _parseWithNlp } = require('../apps-script/NlpParser');

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

// ── 기본 NLP 파싱 ──
const glmResponse = {
  choices: [{
    message: { content: '{"resistance_ohms": 1000, "package": "0402", "tolerance_percent": 5}' },
    finish_reason: 'stop'
  }],
  usage: { total_tokens: 100 }
};
const mockFetch = makeMockFetch({
  'open.bigmodel.cn': { code: 200, body: glmResponse }
});

const result = _parseWithNlp('1킬로옴 0402 5퍼센트', mockFetch, 'test-key', mockCacheService);
assert('nlp_resistance', result.resistance_ohms, 1000);
assert('nlp_package', result.package_input, '0402');
assert('nlp_tolerance', result.tolerance_percent, 5);
assert('nlp_success', result.parse_success, true);

// ── GLM이 markdown 코드블록으로 응답 ──
const mdResponse = {
  choices: [{
    message: { content: '```json\n{"resistance_ohms": 4700, "package": "0603", "tolerance_percent": 1}\n```' },
    finish_reason: 'stop'
  }],
  usage: {}
};
const mdFetch = makeMockFetch({
  'open.bigmodel.cn': { code: 200, body: mdResponse }
});
const mdResult = _parseWithNlp('4.7k 0603 1%', mdFetch, 'test-key', mockCacheService);
assert('md_resistance', mdResult.resistance_ohms, 4700);

// ── GLM 실패 시 ──
const errorFetch = makeMockFetch({
  'open.bigmodel.cn': { code: 500, body: { error: 'server error' } }
});
const errResult = _parseWithNlp('test error', errorFetch, 'test-key', mockCacheService);
assert('error_success', errResult.parse_success, false);

console.log(`  NlpParser: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
