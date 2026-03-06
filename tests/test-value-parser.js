/**
 * test-value-parser.js — ValueParser 단위 테스트
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { parseResistorInput, parseResistanceValue, formatResistanceDisplay } = require('../apps-script/ValueParser');

let passed = 0, total = 0, failedTest = null, targetFn = null;
let failInput, failExpected, failActual, failHint;

function assert(testName, input, field, expected) {
  total++;
  const result = typeof input === 'string' ? parseResistorInput(input) : input;
  const actual = result[field];
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (match) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: ${field} = ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) {
      failedTest = testName;
      targetFn = 'parseResistorInput';
      failInput = typeof input === 'string' ? input : JSON.stringify(input);
      failExpected = expected;
      failActual = actual;
      failHint = `${field} 값이 불일치`;
    }
  }
}

// ── 기본 파싱 ──
assert('basic_1k', '1k 1005 5%', 'resistance_ohms', 1000);
assert('basic_1k_pkg', '1k 1005 5%', 'package_input', '1005');
assert('basic_1k_tol', '1k 1005 5%', 'tolerance_percent', 5);
assert('basic_1k_success', '1k 1005 5%', 'parse_success', true);

// ── 구분자 변형 ──
assert('slash_sep', '10k/0603/1%', 'resistance_ohms', 10000);
assert('slash_sep_pkg', '10k/0603/1%', 'package_input', '0603');
assert('slash_sep_tol', '10k/0603/1%', 'tolerance_percent', 1);

assert('underscore_sep', '4.7k_1005_5%', 'resistance_ohms', 4700);
assert('underscore_sep_pkg', '4.7k_1005_5%', 'package_input', '1005');

// ── 단위 변형 ──
assert('100R', '100R 0402 1%', 'resistance_ohms', 100);
assert('2.2M', '2.2M 1206 5%', 'resistance_ohms', 2200000);
assert('4R7', '4R7 0402 1%', 'resistance_ohms', 4.7);
assert('1k5', '1k5 0603 5%', 'resistance_ohms', 1500);
assert('10K_upper', '10K 0805 5%', 'resistance_ohms', 10000);

// ── 순서 무관 ──
assert('order_pkg_first', '0805 2.2M 5%', 'resistance_ohms', 2200000);
assert('order_pkg_first_pkg', '0805 2.2M 5%', 'package_input', '0805');
assert('order_tol_first', '5% 1k 1005', 'resistance_ohms', 1000);
assert('order_tol_first_pkg', '5% 1k 1005', 'package_input', '1005');
assert('order_tol_first_tol', '5% 1k 1005', 'tolerance_percent', 5);

// ── 실패 케이스 ──
assert('invalid_input', 'abc xyz', 'parse_success', false);
assert('missing_pkg', '1k 5%', 'parse_success', false);

// ── formatResistanceDisplay ──
total++;
if (formatResistanceDisplay(1000) === '1kΩ') { passed++; }
else { console.log(`  ❌ display_1k: got ${formatResistanceDisplay(1000)}`); if (!failedTest) { failedTest = 'display_1k'; targetFn = 'formatResistanceDisplay'; } }

total++;
if (formatResistanceDisplay(2200000) === '2.2MΩ') { passed++; }
else { console.log(`  ❌ display_2.2M: got ${formatResistanceDisplay(2200000)}`); if (!failedTest) { failedTest = 'display_2.2M'; targetFn = 'formatResistanceDisplay'; } }

total++;
if (formatResistanceDisplay(47) === '47Ω') { passed++; }
else { console.log(`  ❌ display_47: got ${formatResistanceDisplay(47)}`); if (!failedTest) { failedTest = 'display_47'; targetFn = 'formatResistanceDisplay'; } }

// ── 결과 출력 ──
console.log(`  ValueParser: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn, input: failInput, expected: failExpected, actual: failActual, hint: failHint }));
process.exit(passed === total ? 0 : 1);
