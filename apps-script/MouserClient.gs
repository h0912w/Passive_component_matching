/**
 * MouserClient.gs — 에이전트5: Mouser API 클라이언트
 *
 * API Key 인증, POST /api/v2/search/keyword 호출.
 * DI 패턴: UrlFetchApp, CacheService를 파라미터로 주입.
 */

'use strict';

var MOUSER_API_URL = 'https://api.mouser.com/api/v2/search/keyword';

/**
 * Mouser 키워드 검색 (Apps Script 래퍼).
 * @param {string} keyword
 * @param {number} [maxResults]
 * @returns {Object} { parts: [...], totalResults: n }
 */
function searchMouser(keyword, maxResults) {
  return _searchMouser(keyword, maxResults, UrlFetchApp, getMouserApiKey());
}

/**
 * Mouser 키워드 검색 (테스트 가능한 내부 함수).
 * @param {string} keyword
 * @param {number} [maxResults]
 * @param {Object} fetchSvc - UrlFetchApp (DI)
 * @param {string} apiKey
 * @returns {Object} { parts: [...], totalResults: n }
 */
function _searchMouser(keyword, maxResults, fetchSvc, apiKey) {
  maxResults = maxResults || 10;

  var url = MOUSER_API_URL + '?apiKey=' + apiKey;
  var payload = {
    SearchByKeywordRequest: {
      keyword: keyword,
      records: maxResults,
      startingRecord: 0,
      searchOptions: 'InStock',
      searchWithYourSignUpLanguage: 'false'
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = fetchSvc.fetch(url, options);
  var code = response.getResponseCode();

  if (code !== 200) {
    throw new Error('Mouser API 오류 (HTTP ' + code + '): ' + response.getContentText());
  }

  var data = JSON.parse(response.getContentText());
  var searchResults = data.SearchResults || {};
  var parts = searchResults.Parts || [];

  return {
    parts: parts.map(function(p) {
      return {
        mpn: p.ManufacturerPartNumber || '',
        mouserPn: p.MouserPartNumber || '',
        manufacturer: p.Manufacturer || '',
        description: p.Description || '',
        stock: parseInt(p.AvailabilityInStock || '0', 10),
        priceBreaks: (p.PriceBreaks || []).map(function(pb) {
          return { quantity: pb.Quantity, price: pb.Price };
        }),
        datasheet: p.DataSheetUrl || ''
      };
    }),
    totalResults: searchResults.NumberOfResult || 0
  };
}

/**
 * 저항값 + 패키지 + 오차로 검색 키워드 생성.
 * @param {Object} parsed - parseResistorInput 결과
 * @returns {string}
 */
function buildSearchKeyword(parsed) {
  var parts = [];

  // 저항값 (읽기 쉬운 형태)
  if (parsed.resistance_ohms !== null) {
    var ohms = parsed.resistance_ohms;
    if (ohms >= 1000000) parts.push((ohms / 1000000) + 'M ohm');
    else if (ohms >= 1000) parts.push((ohms / 1000) + 'k ohm');
    else parts.push(ohms + ' ohm');
  }

  parts.push('resistor');

  // 패키지 (imperial)
  if (parsed.package_imperial) {
    parts.push(parsed.package_imperial);
  } else if (parsed.package_input) {
    parts.push(parsed.package_input);
  }

  // 오차
  if (parsed.tolerance_percent !== null) {
    parts.push(parsed.tolerance_percent + '%');
  }

  return parts.join(' ');
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _searchMouser: _searchMouser,
    buildSearchKeyword: buildSearchKeyword,
    MOUSER_API_URL: MOUSER_API_URL
  };
}
