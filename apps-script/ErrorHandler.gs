/**
 * ErrorHandler.gs — 에이전트10: 에러 핸들링 & 로깅
 *
 * 에러 유형별 메시지 생성. 순수 함수 — Apps Script API 미사용.
 */

'use strict';

/**
 * 파싱 실패 에러 메시지.
 * @param {string} originalInput
 * @returns {string}
 */
function parseError(originalInput) {
  return '입력 형식을 확인하세요: ' + originalInput;
}

/**
 * API 에러 메시지 (HTTP 코드 기반).
 * @param {string} service - 서비스명 (Mouser, GLM)
 * @param {number} httpCode
 * @returns {string}
 */
function apiError(service, httpCode) {
  var messages = {
    400: service + ' API 요청이 잘못되었습니다.',
    401: service + ' API 키가 만료되었거나 유효하지 않습니다.',
    403: service + ' API 접근 권한이 없습니다.',
    429: service + ' API 요청 한도를 초과했습니다. 잠시 후 다시 시도하세요.',
    500: service + ' API 서버 오류가 발생했습니다.',
    503: service + ' API 서버가 일시적으로 이용 불가합니다.'
  };
  return messages[httpCode] || service + ' API 오류 (HTTP ' + httpCode + ')';
}

/**
 * 타임아웃 에러 메시지.
 * @returns {string}
 */
function timeoutError() {
  return '요청 시간이 초과되었습니다. 입력 항목 수를 줄이거나 잠시 후 다시 시도하세요.';
}

/**
 * 부분 실패 요약 메시지.
 * @param {number} total - 전체 항목 수
 * @param {number} success - 성공 항목 수
 * @param {number} fail - 실패 항목 수
 * @returns {string}
 */
function partialFailureSummary(total, success, fail) {
  if (fail === 0) return '전체 ' + total + '개 항목 처리 완료.';
  if (success === 0) return '전체 ' + total + '개 항목 처리 실패.';
  return total + '개 중 ' + success + '개 성공, ' + fail + '개 실패.';
}

/**
 * 검색 결과 없음 메시지.
 * @param {string} keyword
 * @returns {string}
 */
function noResultsError(keyword) {
  return '검색 결과 없음: "' + keyword + '" — 검색 조건을 확인하세요.';
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseError: parseError,
    apiError: apiError,
    timeoutError: timeoutError,
    partialFailureSummary: partialFailureSummary,
    noResultsError: noResultsError
  };
}
