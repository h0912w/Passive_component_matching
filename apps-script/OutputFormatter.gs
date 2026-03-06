/**
 * OutputFormatter.gs — 에이전트8: 6열 테이블 출력 포맷팅
 *
 * 파싱 결과 + Mouser 매칭 결과를 6열 데이터로 변환.
 * 순수 함수 — Apps Script API 미사용.
 */

'use strict';

/**
 * 단일 행 데이터 생성 (성공).
 * @param {Object} parsed - parseResistorInput 결과
 * @param {Object} bestPart - rankByStock 결과
 * @returns {Object} 6열 행 데이터
 */
function formatSuccessRow(parsed, bestPart) {
  var pkgDisplay = '';
  if (parsed.package_imperial && parsed.package_metric) {
    pkgDisplay = parsed.package_imperial + ' (' + parsed.package_metric + ')';
  } else if (parsed.package_input) {
    pkgDisplay = parsed.package_input;
  }

  return {
    original: parsed.original_input,
    resistance: parsed.resistance_display || '',
    package: pkgDisplay,
    tolerance: parsed.tolerance_percent !== null ? parsed.tolerance_percent + '%' : '',
    mpn: bestPart ? bestPart.mpn : '',
    description: bestPart ? bestPart.description : '',
    success: true,
    error: null
  };
}

/**
 * 단일 행 데이터 생성 (실패).
 * @param {string} originalInput
 * @param {string} errorMessage
 * @returns {Object} 6열 행 데이터
 */
function formatErrorRow(originalInput, errorMessage) {
  return {
    original: originalInput,
    resistance: '',
    package: '',
    tolerance: '',
    mpn: '',
    description: '',
    success: false,
    error: errorMessage
  };
}

/**
 * 전체 결과 배열을 출력용 데이터로 변환.
 * @param {Array} rows - formatSuccessRow / formatErrorRow 결과 배열
 * @returns {Object} { headers: [...], rows: [...], mpnList: string }
 */
function formatOutput(rows) {
  var headers = ['입력 원본', '추출 저항값', '추출 패키지', '추출 오차', '부품명 (MPN)', 'Description'];

  // MPN만 추출한 목록 (복사용)
  var mpnList = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].success && rows[i].mpn) {
      mpnList.push(rows[i].mpn);
    }
  }

  return {
    headers: headers,
    rows: rows,
    mpnList: mpnList.join('\n'),
    totalCount: rows.length,
    successCount: rows.filter(function(r) { return r.success; }).length,
    errorCount: rows.filter(function(r) { return !r.success; }).length
  };
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatSuccessRow: formatSuccessRow,
    formatErrorRow: formatErrorRow,
    formatOutput: formatOutput
  };
}
