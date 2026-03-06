/**
 * PackageListBuilder.gs — 에이전트3: 패키지 리스트 동적 추출
 *
 * Mouser API를 통해 실제 판매 중인 SMD 저항의 패키지 사이즈 목록을 추출.
 * DI 패턴: UrlFetchApp, CacheService를 파라미터로 주입.
 */

'use strict';

var PACKAGE_CACHE_KEY = 'packagelist_smd_resistor';
var PACKAGE_REGEX = /\b(0201|0402|0603|0805|1206|1210|1806|1812|2010|2512|01005)\b/g;
var MPN_PACKAGE_REGEX = /RC(\d{4})/;

/**
 * 패키지 리스트 조회 (Apps Script 래퍼).
 * @returns {Object} { packages: [...], metricToImperial: {...}, imperialToMetric: {...} }
 */
function getPackageList() {
  return _getPackageList(UrlFetchApp, CacheService, getMouserApiKey());
}

/**
 * 패키지 리스트 조회 (테스트 가능한 내부 함수).
 * @param {Object} fetchSvc - UrlFetchApp (DI)
 * @param {Object} cacheSvc - CacheService (DI)
 * @param {string} apiKey
 * @returns {Object}
 */
function _getPackageList(fetchSvc, cacheSvc, apiKey) {
  // 캐시 확인
  var cached = cacheGet(PACKAGE_CACHE_KEY, cacheSvc);
  if (cached) return cached;

  // Mouser API로 대표 검색
  var keywords = ['SMD chip resistor thick film', 'SMD resistor thin film'];
  var packageSet = {};

  for (var k = 0; k < keywords.length; k++) {
    try {
      var result = _searchMouser(keywords[k], 50, fetchSvc, apiKey);
      var parts = result.parts || [];
      for (var i = 0; i < parts.length; i++) {
        _extractPackages(parts[i], packageSet);
      }
    } catch (e) {
      // 검색 실패 시 무시하고 다음 키워드 시도
    }
  }

  var packages = Object.keys(packageSet).sort();

  // 패키지가 하나도 없으면 기본 목록 사용 (폴백)
  if (packages.length === 0) {
    packages = ['0201', '0402', '0603', '0805', '1206', '1210', '1812', '2010', '2512'];
  }

  // Metric/Imperial 매핑 (PackageConverter의 기본 테이블 활용)
  var metricToImperial = {};
  var imperialToMetric = {};
  try {
    if (typeof DEFAULT_METRIC_TO_IMPERIAL !== 'undefined') {
      metricToImperial = DEFAULT_METRIC_TO_IMPERIAL;
      imperialToMetric = DEFAULT_IMPERIAL_TO_METRIC;
    }
  } catch (e) { /* 무시 */ }

  var result = {
    packages: packages,
    metricToImperial: metricToImperial,
    imperialToMetric: imperialToMetric
  };

  // 캐시 저장 (24시간)
  cachePut(PACKAGE_CACHE_KEY, result, 86400, cacheSvc);

  return result;
}

/**
 * 부품 정보에서 패키지 사이즈를 추출하여 set에 추가.
 * @param {Object} part - Mouser 부품 객체
 * @param {Object} packageSet - 패키지 코드 세트 (key = 코드, value = true)
 */
function _extractPackages(part, packageSet) {
  // Description에서 추출
  if (part.description) {
    var descMatches = part.description.match(PACKAGE_REGEX);
    if (descMatches) {
      for (var i = 0; i < descMatches.length; i++) {
        packageSet[descMatches[i]] = true;
      }
    }
  }

  // MPN에서 추출 (예: RC0402JR-071KL → 0402)
  if (part.mpn) {
    var mpnMatch = part.mpn.match(MPN_PACKAGE_REGEX);
    if (mpnMatch) {
      packageSet[mpnMatch[1]] = true;
    }
  }
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _getPackageList: _getPackageList,
    _extractPackages: _extractPackages,
    PACKAGE_CACHE_KEY: PACKAGE_CACHE_KEY
  };
}
