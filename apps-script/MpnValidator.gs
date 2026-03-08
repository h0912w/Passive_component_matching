/**
 * MpnValidator.gs — 에이전트13: MPN 역검증 (더블체크)
 *
 * StockRanker가 선정한 MPN을 Mouser SearchByPartNumber API로 단건 조회하여
 * Description에서 value/패키지/오차를 역추출, 입력값과 대조해 일치 여부를 검증.
 *
 * BACKLOG-002 구현.
 * DI 패턴: UrlFetchApp를 파라미터로 주입.
 */

'use strict';

var MOUSER_PART_SEARCH_URL = 'https://api.mouser.com/api/v2/search/partnumber';

// 저항값: "1K OHM", "4.7KOHM", "100 OHM", "2.2M OHM"
var VALIDATOR_RESISTANCE_REGEX = /(\d+(?:\.\d+)?)\s*(K|M|)\s*OHM/i;
// 패키지: SMD 표준 사이즈
var VALIDATOR_PACKAGE_REGEX = /\b(01005|0201|0402|0603|0805|1206|1210|1806|1812|2010|2512)\b/;
// 오차: "5%", "1%", "0.1%"
var VALIDATOR_TOLERANCE_REGEX = /(\d+(?:\.\d+)?)\s*%/;

/**
 * MPN 역검증 (Apps Script 래퍼).
 * @param {string} mpn
 * @param {Object} expectedSpecs - { resistance_ohms, package_imperial, tolerance_percent }
 * @returns {Object} { valid: bool, reason: string, actual: Object }
 */
function validateMpn(mpn, expectedSpecs) {
  return _validateMpn(mpn, expectedSpecs, UrlFetchApp, getMouserApiKey());
}

/**
 * MPN 역검증 (테스트 가능한 내부 함수).
 * @param {string} mpn
 * @param {Object} expectedSpecs
 * @param {Object} fetchSvc - UrlFetchApp (DI)
 * @param {string} apiKey
 * @returns {Object} { valid: bool, reason: string, actual: Object }
 */
function _validateMpn(mpn, expectedSpecs, fetchSvc, apiKey) {
  try {
    var part = _lookupByMpn(mpn, fetchSvc, apiKey);
    if (!part) {
      return { valid: false, reason: 'MPN 조회 실패: ' + mpn, actual: null };
    }

    var actual = _extractSpecsFromDescription(part.description);

    // 저항값 비교 (1% 허용 — 부동소수점 오차 대비)
    if (expectedSpecs.resistance_ohms !== null && expectedSpecs.resistance_ohms !== undefined
        && actual.resistance_ohms !== null) {
      var expected = expectedSpecs.resistance_ohms;
      var ratio = expected === 0
        ? (actual.resistance_ohms === 0 ? 0 : 1)
        : Math.abs(actual.resistance_ohms - expected) / expected;
      if (ratio > 0.01) {
        return { valid: false, reason: '저항값 불일치 (기대: ' + expected + 'Ω, 실제: ' + actual.resistance_ohms + 'Ω)', actual: actual };
      }
    }

    // 패키지 비교
    if (expectedSpecs.package_imperial && actual.package) {
      if (actual.package !== expectedSpecs.package_imperial) {
        return { valid: false, reason: '패키지 불일치 (기대: ' + expectedSpecs.package_imperial + ', 실제: ' + actual.package + ')', actual: actual };
      }
    }

    // 오차 비교
    if (expectedSpecs.tolerance_percent !== null && expectedSpecs.tolerance_percent !== undefined
        && actual.tolerance_percent !== null) {
      if (Math.abs(actual.tolerance_percent - expectedSpecs.tolerance_percent) > 0.001) {
        return { valid: false, reason: '오차 불일치 (기대: ' + expectedSpecs.tolerance_percent + '%, 실제: ' + actual.tolerance_percent + '%)', actual: actual };
      }
    }

    return { valid: true, reason: 'OK', actual: actual };

  } catch (e) {
    return { valid: false, reason: '검증 중 오류: ' + e.message, actual: null };
  }
}

/**
 * Mouser SearchByPartNumber API로 MPN 단건 조회.
 * @param {string} mpn
 * @param {Object} fetchSvc - UrlFetchApp (DI)
 * @param {string} apiKey
 * @returns {Object|null} { mpn, description, stock } 또는 null
 */
function _lookupByMpn(mpn, fetchSvc, apiKey) {
  var url = MOUSER_PART_SEARCH_URL + '?apiKey=' + apiKey;
  var payload = {
    SearchByPartNumberRequest: {
      mouserPartNumber: mpn,
      partSearchOptions: ''
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = fetchSvc.fetch(url, options);
  if (response.getResponseCode() !== 200) return null;

  var data = JSON.parse(response.getContentText());
  var parts = (data.SearchResults || {}).Parts || [];
  if (parts.length === 0) return null;

  var p = parts[0];
  return {
    mpn: p.ManufacturerPartNumber || '',
    description: p.Description || '',
    stock: parseInt(p.AvailabilityInStock || '0', 10)
  };
}

/**
 * Description 문자열에서 저항값/패키지/오차를 역추출.
 * 예: "Thick Film Resistors - SMD 1/16W 1K OHM 5% 0402"
 *     → { resistance_ohms: 1000, package: '0402', tolerance_percent: 5 }
 *
 * @param {string} description
 * @returns {Object} { resistance_ohms, package, tolerance_percent }
 */
function _extractSpecsFromDescription(description) {
  var desc = description || '';
  var result = { resistance_ohms: null, package: null, tolerance_percent: null };

  // 저항값
  var rMatch = desc.match(VALIDATOR_RESISTANCE_REGEX);
  if (rMatch) {
    var val = parseFloat(rMatch[1]);
    var unit = (rMatch[2] || '').toUpperCase();
    if (unit === 'K') val *= 1000;
    else if (unit === 'M') val *= 1000000;
    result.resistance_ohms = val;
  }

  // 패키지
  var pMatch = desc.match(VALIDATOR_PACKAGE_REGEX);
  if (pMatch) result.package = pMatch[1];

  // 오차
  var tMatch = desc.match(VALIDATOR_TOLERANCE_REGEX);
  if (tMatch) result.tolerance_percent = parseFloat(tMatch[1]);

  return result;
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _validateMpn: _validateMpn,
    _lookupByMpn: _lookupByMpn,
    _extractSpecsFromDescription: _extractSpecsFromDescription,
    MOUSER_PART_SEARCH_URL: MOUSER_PART_SEARCH_URL
  };
}
