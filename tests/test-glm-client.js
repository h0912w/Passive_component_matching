/**
 * test-glm-client.js — GlmClient 테스트 (mock HTTP)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
// GlmClient에서 APP_CONFIG를 참조하므로 먼저 로드
global.APP_CONFIG = require('../apps-script/Config').APP_CONFIG;
const { makeMockFetch, glmSuccessResponse } = require('./mocks/apps-script-mocks');
const { _callGlm } = require('../apps-script/GlmClient');

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

// ── 기본 호출 ──
const mockFetch = makeMockFetch({
  'open.bigmodel.cn': { code: 200, body: glmSuccessResponse }
});

const messages = [{ role: 'user', content: 'test' }];
const result = _callGlm(messages, {}, mockFetch, 'test-glm-key');
assert('content_type', typeof result.content, 'string');

total++;
const parsed = JSON.parse(result.content);
if (parsed.resistance_ohms === 1000) { passed++; }
else { console.log(`  ❌ content_parsed: got ${parsed.resistance_ohms}`); if (!failedTest) { failedTest = 'content_parsed'; targetFn = '_callGlm'; } }

// ── API 에러 ──
total++;
const errorFetch = makeMockFetch({
  'open.bigmodel.cn': { code: 401, body: { error: 'unauthorized' } }
});
try {
  _callGlm(messages, {}, errorFetch, 'bad-key');
  console.log('  ❌ api_error: should have thrown');
  if (!failedTest) { failedTest = 'api_error'; targetFn = '_callGlm'; }
} catch (e) {
  if (e.message.includes('401')) { passed++; }
  else { console.log(`  ❌ api_error: wrong msg: ${e.message}`); if (!failedTest) { failedTest = 'api_error'; targetFn = '_callGlm'; } }
}

console.log(`  GlmClient: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
