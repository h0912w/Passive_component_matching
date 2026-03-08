/**
 * test-output-formatter.js — OutputFormatter 단위 테스트 (9열 포맷)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { formatSuccessRow, formatErrorRow, formatOutput, _formatOhmsDisplay, _computeVerdict } = require('../apps-script/OutputFormatter');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected, fn) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) { failedTest = testName; targetFn = fn || testName.split('_')[0]; }
  }
}

// ── _formatOhmsDisplay ──
assert('fmt_1k',    _formatOhmsDisplay(1000),    '1kΩ',   '_formatOhmsDisplay');
assert('fmt_4k7',   _formatOhmsDisplay(4700),    '4.7kΩ', '_formatOhmsDisplay');
assert('fmt_100',   _formatOhmsDisplay(100),     '100Ω',  '_formatOhmsDisplay');
assert('fmt_2m2',   _formatOhmsDisplay(2200000), '2.2MΩ', '_formatOhmsDisplay');
assert('fmt_null',  _formatOhmsDisplay(null),    '',      '_formatOhmsDisplay');

// ── _computeVerdict ──
const p1 = { resistance_ohms: 1000, package_imperial: '0402', tolerance_percent: 5 };
assert('verdict_pass',     _computeVerdict(p1, { resistance_ohms: 1000,  package: '0402', tolerance_percent: 5 }), 'PASS', '_computeVerdict');
assert('verdict_res_fail', _computeVerdict(p1, { resistance_ohms: 10000, package: '0402', tolerance_percent: 5 }), 'FAIL', '_computeVerdict');
assert('verdict_pkg_fail', _computeVerdict(p1, { resistance_ohms: 1000,  package: '0603', tolerance_percent: 5 }), 'FAIL', '_computeVerdict');
assert('verdict_tol_fail', _computeVerdict(p1, { resistance_ohms: 1000,  package: '0402', tolerance_percent: 1 }), 'FAIL', '_computeVerdict');
assert('verdict_null_specs',  _computeVerdict(p1, null), 'N/A', '_computeVerdict');
assert('verdict_all_null',    _computeVerdict(p1, { resistance_ohms: null, package: null, tolerance_percent: null }), 'N/A', '_computeVerdict');

// ── formatSuccessRow (mpnSpecs 있음) ──
const parsed = {
  original_input:     '1k 1005 5%',
  resistance_display: '1kΩ',
  resistance_ohms:    1000,
  package_imperial:   '0402',
  package_metric:     '1005',
  tolerance_percent:  5
};
const part     = { mpn: 'RC0402JR-071KL', description: 'RES SMD 1K OHM 5% 0402' };
const mpnSpecs = { resistance_ohms: 1000, package: '0402', tolerance_percent: 5 };
const row = formatSuccessRow(parsed, part, mpnSpecs);
assert('success_original',       row.original,       '1k 1005 5%');
assert('success_resistance',     row.resistance,     '1kΩ');
assert('success_package',        row.package,        '0402 (1005)');
assert('success_tolerance',      row.tolerance,      '5%');
assert('success_mpn',            row.mpn,            'RC0402JR-071KL');
assert('success_mpn_resistance', row.mpn_resistance, '1kΩ');
assert('success_mpn_package',    row.mpn_package,    '0402');
assert('success_mpn_tolerance',  row.mpn_tolerance,  '5%');
assert('success_verdict',        row.verdict,        'PASS');
assert('success_flag',           row.success,        true);

// ── formatSuccessRow (mpnSpecs 없음 → N/A) ──
const rowNoSpecs = formatSuccessRow(parsed, part);
assert('no_specs_verdict',        rowNoSpecs.verdict,        'N/A');
assert('no_specs_mpn_resistance', rowNoSpecs.mpn_resistance, '');

// ── formatErrorRow ──
const errRow = formatErrorRow('abc', '입력 형식을 확인하세요: abc');
assert('error_original', errRow.original, 'abc');
assert('error_success',  errRow.success,  false);
assert('error_msg',      errRow.error,    '입력 형식을 확인하세요: abc');
assert('error_verdict',  errRow.verdict,  'FAIL');

// ── formatOutput ──
const output = formatOutput([row, errRow]);
assert('output_headers_len',   output.headers.length, 9);
assert('output_total',         output.totalCount,     2);
assert('output_success_count', output.successCount,   1);
assert('output_error_count',   output.errorCount,     1);
assert('output_mpnList',       output.mpnList,        'RC0402JR-071KL');

// ── 결과 출력 ──
console.log(`  OutputFormatter: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
