/**
 * test-stock-ranker.js — StockRanker 단위 테스트
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { rankByStock } = require('../apps-script/StockRanker');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) { failedTest = testName; targetFn = 'rankByStock'; }
  }
}

// ── 기본 재고 정렬 ──
const parts1 = [
  { mpn: 'A', description: 'RES 1K 5% 0402', stock: 100 },
  { mpn: 'B', description: 'RES 1K 5% 0402', stock: 5000 },
  { mpn: 'C', description: 'RES 1K 5% 0402', stock: 50 }
];
assert('max_stock', rankByStock(parts1).mpn, 'B');

// ── 재고 0 제외 ──
const parts2 = [
  { mpn: 'A', description: 'RES 1K 5% 0402', stock: 0 },
  { mpn: 'B', description: 'RES 1K 5% 0402', stock: 100 }
];
assert('exclude_zero', rankByStock(parts2).mpn, 'B');

// ── 빈 배열 ──
assert('empty_array', rankByStock([]), null);

// ── 필터링 (패키지 + 오차) ──
const parts3 = [
  { mpn: 'X', description: 'RES 10K 5% 0805', stock: 9000 },
  { mpn: 'Y', description: 'RES 1K 5% 0402', stock: 3000 },
  { mpn: 'Z', description: 'RES 1K 1% 0402', stock: 8000 }
];
const filtered = rankByStock(parts3, { package_imperial: '0402', tolerance_percent: 5 });
assert('filter_match', filtered.mpn, 'Y');

// ── 결과 출력 ──
console.log(`  StockRanker: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
