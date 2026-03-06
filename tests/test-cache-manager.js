/**
 * test-cache-manager.js — CacheManager 테스트 (mock CacheService)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { mockCacheService } = require('./mocks/apps-script-mocks');
const { cacheGet, cachePut, cacheRemove, mouserCacheKey, nlpCacheKey } = require('../apps-script/CacheManager');

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

// ── put + get ──
cachePut('test_key', { value: 42 }, 600, mockCacheService);
assert('cache_hit', cacheGet('test_key', mockCacheService), { value: 42 });

// ── cache miss ──
assert('cache_miss', cacheGet('nonexistent', mockCacheService), null);

// ── remove ──
cachePut('del_key', { x: 1 }, 600, mockCacheService);
cacheRemove('del_key', mockCacheService);
assert('cache_removed', cacheGet('del_key', mockCacheService), null);

// ── mouserCacheKey ──
const mk = mouserCacheKey(1000, '0402', 5);
assert('mouser_key_format', mk, 'mouser_1000_0402_5');

// ── nlpCacheKey ──
const nk = nlpCacheKey('1킬로옴 0402');
assert('nlp_key_type', typeof nk, 'string');
total++;
if (nk.startsWith('nlp_')) { passed++; } else {
  console.log(`  ❌ nlp_key_prefix: got ${nk}`);
  if (!failedTest) { failedTest = 'nlp_key_prefix'; targetFn = 'nlpCacheKey'; }
}

console.log(`  CacheManager: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
