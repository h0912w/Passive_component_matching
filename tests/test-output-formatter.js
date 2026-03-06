/**
 * test-output-formatter.js — OutputFormatter 단위 테스트
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { formatSuccessRow, formatErrorRow, formatOutput } = require('../apps-script/OutputFormatter');

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

// ── formatSuccessRow ──
const parsed = {
  original_input: '1k 1005 5%',
  resistance_display: '1kΩ',
  package_imperial: '0402',
  package_metric: '1005',
  tolerance_percent: 5
};
const part = { mpn: 'RC0402JR-071KL', description: 'RES SMD 1K OHM 5% 0402' };
const row = formatSuccessRow(parsed, part);
assert('success_original', row.original, '1k 1005 5%');
assert('success_resistance', row.resistance, '1kΩ');
assert('success_package', row.package, '0402 (1005)');
assert('success_tolerance', row.tolerance, '5%');
assert('success_mpn', row.mpn, 'RC0402JR-071KL');
assert('success_flag', row.success, true);

// ── formatErrorRow ──
const errRow = formatErrorRow('abc', '입력 형식을 확인하세요: abc');
assert('error_original', errRow.original, 'abc');
assert('error_success', errRow.success, false);
assert('error_msg', errRow.error, '입력 형식을 확인하세요: abc');

// ── formatOutput ──
const output = formatOutput([row, errRow]);
assert('output_headers_len', output.headers.length, 6);
assert('output_total', output.totalCount, 2);
assert('output_success_count', output.successCount, 1);
assert('output_error_count', output.errorCount, 1);
assert('output_mpnList', output.mpnList, 'RC0402JR-071KL');

// ── 결과 출력 ──
console.log(`  OutputFormatter: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
