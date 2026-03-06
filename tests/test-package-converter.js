/**
 * test-package-converter.js — PackageConverter 단위 테스트
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { toImperial, toMetric, isMetric, isImperial, formatPackageDisplay } = require('../apps-script/PackageConverter');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) { failedTest = testName; targetFn = testName.split('_')[0]; }
  }
}

// ── toImperial ──
assert('toImperial_1005', toImperial('1005'), '0402');
assert('toImperial_1608', toImperial('1608'), '0603');
assert('toImperial_2012', toImperial('2012'), '0805');
assert('toImperial_3216', toImperial('3216'), '1206');
assert('toImperial_unknown', toImperial('9999'), null);

// ── toMetric ──
assert('toMetric_0402', toMetric('0402'), '1005');
assert('toMetric_0603', toMetric('0603'), '1608');
assert('toMetric_0805', toMetric('0805'), '2012');
assert('toMetric_1206', toMetric('1206'), '3216');

// ── isMetric ──
assert('isMetric_1005', isMetric('1005'), true);
assert('isMetric_1608', isMetric('1608'), true);
assert('isMetric_0805', isMetric('0805'), false);  // 0805 is imperial-only
assert('isMetric_0402', isMetric('0402'), true);    // 모호 → 기본 metric

// ── isImperial ──
assert('isImperial_0805', isImperial('0805'), true);
assert('isImperial_1005', isImperial('1005'), false);

// ── formatPackageDisplay ──
assert('display_1005', formatPackageDisplay('1005'), '0402 (1005)');
assert('display_0805', formatPackageDisplay('0805'), '0805 (2012)');

// ── 결과 출력 ──
console.log(`  PackageConverter: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
