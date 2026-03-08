/**
 * test-stock-ranker.js — StockRanker 단위 테스트
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { rankByStock, rankByStockAll, _applyFilter, _extractResistanceFromDesc } = require('../apps-script/StockRanker');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected, fn) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) { failedTest = testName; targetFn = fn || 'rankByStock'; }
  }
}

// ── 기본 재고 정렬 ──
const parts1 = [
  { mpn: 'A', description: 'RES 1K OHM 5% 0402', stock: 100 },
  { mpn: 'B', description: 'RES 1K OHM 5% 0402', stock: 5000 },
  { mpn: 'C', description: 'RES 1K OHM 5% 0402', stock: 50 }
];
assert('max_stock', rankByStock(parts1).mpn, 'B');

// ── 재고 0 제외 ──
const parts2 = [
  { mpn: 'A', description: 'RES 1K OHM 5% 0402', stock: 0 },
  { mpn: 'B', description: 'RES 1K OHM 5% 0402', stock: 100 }
];
assert('exclude_zero', rankByStock(parts2).mpn, 'B');

// ── 빈 배열 ──
assert('empty_array', rankByStock([]), null);

// ── 필터링 (패키지 + 오차) ──
const parts3 = [
  { mpn: 'X', description: 'RES 10K OHM 5% 0805', stock: 9000 },
  { mpn: 'Y', description: 'RES 1K OHM 5% 0402',  stock: 3000 },
  { mpn: 'Z', description: 'RES 1K OHM 1% 0402',  stock: 8000 }
];
const filtered = rankByStock(parts3, { package_imperial: '0402', tolerance_percent: 5 });
assert('filter_match', filtered.mpn, 'Y');

// ── _extractResistanceFromDesc ──
assert('extract_1k',    _extractResistanceFromDesc('RES 1K OHM 5% 0402'),        1000,    '_extractResistanceFromDesc');
assert('extract_4k7',   _extractResistanceFromDesc('RES 4.7K OHM 1% 0402'),      4700,    '_extractResistanceFromDesc');
assert('extract_100r',  _extractResistanceFromDesc('RES 100 OHM 5% 0402'),       100,     '_extractResistanceFromDesc');
assert('extract_2m2',   _extractResistanceFromDesc('RES 2.2M OHM 5% 0402'),      2200000, '_extractResistanceFromDesc');
assert('extract_none',  _extractResistanceFromDesc('CAPACITOR 10UF 0402'),        null,    '_extractResistanceFromDesc');
assert('extract_kohm',  _extractResistanceFromDesc('THICK FILM 10KOHM 1%'),       10000,   '_extractResistanceFromDesc');

// ── 저항값 필터 (resistance_ohms) ──
const parts4 = [
  { mpn: 'W', description: 'RES 10K OHM 5% 0402', stock: 9000 },
  { mpn: 'X', description: 'RES 1K OHM 5% 0402',  stock: 5000 },
  { mpn: 'Y', description: 'RES 1K OHM 5% 0402',  stock: 3000 }
];
const rFiltered = rankByStock(parts4, { resistance_ohms: 1000, package_imperial: '0402', tolerance_percent: 5 });
assert('resistance_filter', rFiltered.mpn, 'X', '_applyFilter');

// ── rankByStockAll (배열 반환) ──
const all = rankByStockAll(parts1);
assert('rankByStockAll_length', all.length, 3, 'rankByStockAll');
assert('rankByStockAll_order',  all[0].mpn, 'B', 'rankByStockAll');

// ── rankByStockAll 빈 배열 ──
assert('rankByStockAll_empty', rankByStockAll([]), [], 'rankByStockAll');

// ── 랜덤 E24 값 테스트 (매 실행마다 다른 값) ──
const E24 = [1.0,1.1,1.2,1.3,1.5,1.6,1.8,2.0,2.2,2.4,2.7,3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1];
const multipliers = [1, 10, 100, 1000, 10000, 100000, 1000000];
const seed = Math.floor(Math.random() * E24.length);
const mSeed = Math.floor(Math.random() * multipliers.length);
const randOhms = Math.round(E24[seed] * multipliers[mSeed]);
const descStr = (randOhms >= 1000000 ? (randOhms/1000000)+'M' : randOhms >= 1000 ? (randOhms/1000)+'K' : randOhms) + ' OHM 5% 0402';
const randExtracted = _extractResistanceFromDesc(descStr.toUpperCase());
const randRatio = randOhms === 0 ? 0 : Math.abs(randExtracted - randOhms) / randOhms;
assert(`random_e24_${randOhms}ohm`, randRatio < 0.01, true, '_extractResistanceFromDesc');

// ── 결과 출력 ──
console.log(`  StockRanker: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
