/**
 * test-config.js — Config 테스트 (mock PropertiesService)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { mockPropertiesService } = require('./mocks/apps-script-mocks');
const { getMouserApiKey, getGlmApiKey, APP_CONFIG } = require('../apps-script/Config');

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

// ── API 키 조회 (mock) ──
assert('mouser_key', getMouserApiKey(mockPropertiesService), 'test-mouser-key-000000000000000000000000');
assert('glm_key', getGlmApiKey(mockPropertiesService), 'test-glm-key-000000000000000000000000');

// ── 키 없을 때 에러 ──
total++;
const emptyProps = { getScriptProperties: () => ({ getProperty: () => null }) };
try {
  getMouserApiKey(emptyProps);
  console.log('  ❌ missing_key: should have thrown');
  if (!failedTest) { failedTest = 'missing_key'; targetFn = 'getMouserApiKey'; }
} catch (e) {
  if (e.message.includes('MOUSER_API_KEY')) {
    passed++;
  } else {
    console.log(`  ❌ missing_key: wrong error message: ${e.message}`);
    if (!failedTest) { failedTest = 'missing_key'; targetFn = 'getMouserApiKey'; }
  }
}

// ── APP_CONFIG ──
assert('config_ttl', APP_CONFIG.CACHE_TTL_SECONDS, 3600);
assert('config_model', APP_CONFIG.GLM_MODEL, 'glm-4.7-flash');

console.log(`  Config: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
