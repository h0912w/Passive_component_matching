/**
 * OutputFormatter.gs — 에이전트8: 9열 테이블 출력 포맷팅
 *
 * 파싱 결과 + Mouser 매칭 결과를 9열 데이터로 변환.
 * 열 구성:
 *   1. 입력 원본  2. 입력 저항값  3. 입력 패키지  4. 입력 오차
 *   5. 부품명(MPN)  6. MPN 저항값  7. MPN 패키지  8. MPN 오차  9. 검증(PASS/FAIL)
 *
 * 순수 함수 — Apps Script API 미사용.
 */

'use strict';

/**
 * 저항값(Ω)을 사람이 읽기 쉬운 문자열로 변환.
 * @param {number|null} ohms
 * @returns {string}
 */
function _formatOhmsDisplay(ohms) {
  if (ohms === null || ohms === undefined) return '';
  if (ohms >= 1000000) return parseFloat((ohms / 1000000).toPrecision(3)) + 'MΩ';
  if (ohms >= 1000)    return parseFloat((ohms / 1000).toPrecision(3)) + 'kΩ';
  return ohms + 'Ω';
}

/**
 * 입력 스펙과 MPN에서 추출한 스펙을 비교하여 PASS/FAIL 판정.
 * @param {Object} parsed   - { resistance_ohms, package_imperial, tolerance_percent }
 * @param {Object} mpnSpecs - { resistance_ohms, package, tolerance_percent }
 * @returns {string} 'PASS' | 'FAIL' | 'N/A'
 */
function _computeVerdict(parsed, mpnSpecs) {
  if (!mpnSpecs) return 'N/A';
  // MPN 스펙이 모두 null이면 판정 불가
  if (mpnSpecs.resistance_ohms === null && mpnSpecs.package === null && mpnSpecs.tolerance_percent === null) {
    return 'N/A';
  }

  var ok = true;

  // 저항값 비교 (1% 허용 — 부동소수점 오차 대비)
  if (parsed.resistance_ohms !== null && mpnSpecs.resistance_ohms !== null) {
    var expected = parsed.resistance_ohms;
    var ratio = expected === 0
      ? (mpnSpecs.resistance_ohms === 0 ? 0 : 1)
      : Math.abs(mpnSpecs.resistance_ohms - expected) / expected;
    if (ratio > 0.01) ok = false;
  }

  // 패키지 비교 (imperial 코드 기준)
  if (parsed.package_imperial && mpnSpecs.package) {
    if (mpnSpecs.package !== parsed.package_imperial) ok = false;
  }

  // 오차 비교
  if (parsed.tolerance_percent !== null && mpnSpecs.tolerance_percent !== null) {
    if (Math.abs(mpnSpecs.tolerance_percent - parsed.tolerance_percent) > 0.001) ok = false;
  }

  return ok ? 'PASS' : 'FAIL';
}

/**
 * 단일 행 데이터 생성 (성공).
 * @param {Object} parsed    - parseResistorInput 결과
 * @param {Object} bestPart  - StockRanker 결과
 * @param {Object|null} [mpnSpecs] - MPN description에서 역추출한 스펙 (선택)
 *   { resistance_ohms: number|null, package: string|null, tolerance_percent: number|null }
 * @returns {Object} 9열 행 데이터
 */
function formatSuccessRow(parsed, bestPart, mpnSpecs) {
  var pkgDisplay = '';
  if (parsed.package_imperial && parsed.package_metric) {
    pkgDisplay = parsed.package_imperial + ' (' + parsed.package_metric + ')';
  } else if (parsed.package_input) {
    pkgDisplay = parsed.package_input;
  }

  var mpnResistance = '';
  var mpnPackage    = '';
  var mpnTolerance  = '';
  var verdict       = 'N/A';

  if (mpnSpecs) {
    if (mpnSpecs.resistance_ohms !== null) mpnResistance = _formatOhmsDisplay(mpnSpecs.resistance_ohms);
    if (mpnSpecs.package)                  mpnPackage    = mpnSpecs.package;
    if (mpnSpecs.tolerance_percent !== null) mpnTolerance = mpnSpecs.tolerance_percent + '%';
    verdict = _computeVerdict(parsed, mpnSpecs);
  }

  return {
    original:       parsed.original_input,
    resistance:     parsed.resistance_display || '',
    package:        pkgDisplay,
    tolerance:      parsed.tolerance_percent !== null ? parsed.tolerance_percent + '%' : '',
    mpn:            bestPart ? bestPart.mpn : '',
    mpn_resistance: mpnResistance,
    mpn_package:    mpnPackage,
    mpn_tolerance:  mpnTolerance,
    verdict:        verdict,
    description:    bestPart ? bestPart.description : '',
    success:        true,
    error:          null
  };
}

/**
 * 단일 행 데이터 생성 (실패).
 * @param {string} originalInput
 * @param {string} errorMessage
 * @returns {Object} 9열 행 데이터
 */
function formatErrorRow(originalInput, errorMessage) {
  return {
    original:       originalInput,
    resistance:     '',
    package:        '',
    tolerance:      '',
    mpn:            '',
    mpn_resistance: '',
    mpn_package:    '',
    mpn_tolerance:  '',
    verdict:        'FAIL',
    description:    '',
    success:        false,
    error:          errorMessage
  };
}

/**
 * 전체 결과 배열을 출력용 데이터로 변환.
 * @param {Array} rows - formatSuccessRow / formatErrorRow 결과 배열
 * @returns {Object} { headers, rows, mpnList, totalCount, successCount, errorCount }
 */
function formatOutput(rows) {
  var headers = [
    '입력 원본',
    '입력 저항값',
    '입력 패키지',
    '입력 오차',
    '부품명 (MPN)',
    'MPN 저항값',
    'MPN 패키지',
    'MPN 오차',
    '검증'
  ];

  var mpnList = [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].success && rows[i].mpn) {
      mpnList.push(rows[i].mpn);
    }
  }

  return {
    headers:      headers,
    rows:         rows,
    mpnList:      mpnList.join('\n'),
    totalCount:   rows.length,
    successCount: rows.filter(function(r) { return r.success; }).length,
    errorCount:   rows.filter(function(r) { return !r.success; }).length
  };
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatSuccessRow:   formatSuccessRow,
    formatErrorRow:     formatErrorRow,
    formatOutput:       formatOutput,
    _formatOhmsDisplay: _formatOhmsDisplay,
    _computeVerdict:    _computeVerdict
  };
}
