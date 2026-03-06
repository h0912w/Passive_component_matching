/**
 * test-error-handler.js — ErrorHandler 단위 테스트
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
const { parseError, apiError, timeoutError, partialFailureSummary, noResultsError } = require('../apps-script/ErrorHandler');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected) {
  total++;
  if (actual === expected) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got "${actual}", expected "${expected}"`);
    if (!failedTest) { failedTest = testName; targetFn = testName; }
  }
}

assert('parseError', parseError('xyz'), '입력 형식을 확인하세요: xyz');
assert('apiError_401', apiError('Mouser', 401), 'Mouser API 키가 만료되었거나 유효하지 않습니다.');
assert('apiError_429', apiError('GLM', 429), 'GLM API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.');
assert('apiError_500', apiError('Mouser', 500), 'Mouser API 서버 오류가 발생했습니다.');
assert('apiError_unknown', apiError('Mouser', 418), 'Mouser API 오류 (HTTP 418)');
assert('timeoutError', timeoutError(), '요청 시간이 초과되었습니다. 입력 항목 수를 줄이거나 잠시 후 다시 시도하세요.');
assert('partial_all_ok', partialFailureSummary(5, 5, 0), '전체 5개 항목 처리 완료.');
assert('partial_all_fail', partialFailureSummary(3, 0, 3), '전체 3개 항목 처리 실패.');
assert('partial_mixed', partialFailureSummary(10, 7, 3), '10개 중 7개 성공, 3개 실패.');
assert('noResults', noResultsError('1k 0402'), '검색 결과 없음: "1k 0402" — 검색 조건을 확인하세요.');

console.log(`  ErrorHandler: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
