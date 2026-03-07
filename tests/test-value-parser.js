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

// ── 랜덤 E24 값 테스트 (매 실행마다 다른 값) ──
const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
             3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
// 형식: { label, ohmsMultiplier, strFn }
// strFn(e24val) → 입력 문자열의 저항 부분
const SCALES = [
  { label: '1kΩ 대역',   ohmsMultiplier: 1000,    strFn: v => `${v}k`            },
  { label: '10kΩ 대역',  ohmsMultiplier: 10000,   strFn: v => `${v*10}k`         },
  { label: '100kΩ 대역', ohmsMultiplier: 100000,  strFn: v => `${Math.round(v*100)}k` },
  { label: '1MΩ 대역',   ohmsMultiplier: 1000000, strFn: v => `${v}M`            },
  { label: '100Ω 대역',  ohmsMultiplier: 100,     strFn: v => `${Math.round(v*100)}R` },
];
const PKGS = ['0402', '0603', '0805', '1206', '0201'];
const TOLS = ['1%', '5%'];

// LCG 시드 기반 의사난수 (재현 가능)
const SEED = Date.now();
let _rng = SEED;
function rng() {
  _rng = (Math.imul(1664525, _rng) + 1013904223) >>> 0;
  return _rng / 0x100000000;
}
function pick(arr) { return arr[Math.floor(rng() * arr.length)]; }

console.log(`  [랜덤 시드: ${SEED}]`);
console.log('  ┌─────────────────────────────────────────────────────────────────────┐');
console.log('  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │');
console.log('  ├────┬──────────────────────┬────────────────┬────────────────────────┤');
console.log('  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │');
console.log('  ├────┼──────────────────────┼────────────────┼────────────────────────┤');

for (let i = 0; i < 5; i++) {
  const e24  = pick(E24);
  const scale = pick(SCALES);
  const pkg  = pick(PKGS);
  const tol  = pick(TOLS);

  const resistStr = scale.strFn(e24);
  const inputStr  = `${resistStr} ${pkg} ${tol}`;
  const expectedOhms = Math.round(e24 * scale.ohmsMultiplier * 1000) / 1000;

  const result = parseResistorInput(inputStr);
  total++;
  const gotOhms = result.resistance_ohms;
  const ok = result.parse_success && Math.abs(gotOhms - expectedOhms) < 0.01;

  const statusStr = ok ? '✅ PASS' : `❌ FAIL (got ${gotOhms})`;
  const inputPad  = inputStr.padEnd(20);
  const ohmsPad   = `${expectedOhms}Ω`.padEnd(14);
  console.log(`  │ ${String(i+1).padEnd(2)} │ ${inputPad} │ ${ohmsPad} │ ${statusStr.padEnd(22)} │`);

  if (ok) {
    passed++;
  } else {
    if (!failedTest) {
      failedTest = `random_e24_${i+1}`;
      targetFn   = 'parseResistorInput';
      failInput  = inputStr;
      failExpected = expectedOhms;
      failActual   = gotOhms;
      failHint   = `E24 랜덤 저항값 파싱 실패 (시드: ${SEED}, 스케일: ${scale.label})`;
    }
  }
}
console.log('  └────┴──────────────────────┴────────────────┴────────────────────────┘');

// ── 결과 출력 ──
console.log(`  ValueParser: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn, input: failInput, expected: failExpected, actual: failActual, hint: failHint }));
process.exit(passed === total ? 0 : 1);
