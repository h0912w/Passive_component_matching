/**
 * StockRanker.gs — 에이전트7: 재고 기반 최적 부품 선정
 *
 * Mouser 검색 결과에서 스펙 일치 필터링 + 재고량 기준 정렬.
 * 순수 함수 — Apps Script API 미사용.
 */

'use strict';

/**
 * 부품 목록에서 최적 부품 1개 선정.
 * 재고 0 제외, 재고량 내림차순 정렬 후 최상위 반환.
 *
 * @param {Array} parts - Mouser 검색 결과 배열
 *   각 요소: { mpn, description, stock, manufacturer, ... }
 * @param {Object} [filter] - 필터 조건 (선택)
 *   { resistance_ohms, package_imperial, tolerance_percent }
 * @returns {Object|null} 최적 부품 또는 null
 */
function rankByStock(parts, filter) {
  if (!parts || parts.length === 0) return null;

  // 재고 0 제외
  var available = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].stock > 0) {
      available.push(parts[i]);
    }
  }

  if (available.length === 0) return null;

  // 필터 적용 (선택)
  if (filter) {
    var filtered = _applyFilter(available, filter);
    if (filtered.length > 0) {
      available = filtered;
    }
    // 필터 결과가 없으면 전체 재고 있는 부품 중 선택
  }

  // 재고량 내림차순 정렬
  available.sort(function(a, b) {
    return b.stock - a.stock;
  });

  return available[0];
}

/**
 * 재고 있는 부품을 필터링 후 재고 내림차순으로 전체 반환.
 * rankByStock과 달리 단일 부품이 아닌 배열을 반환해 MPN 역검증 재시도에 활용.
 *
 * @param {Array} parts - Mouser 검색 결과 배열
 * @param {Object} [filter] - 필터 조건
 * @returns {Array} 정렬된 부품 배열 (빈 배열 가능)
 */
function rankByStockAll(parts, filter) {
  if (!parts || parts.length === 0) return [];

  var available = [];
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].stock > 0) available.push(parts[i]);
  }
  if (available.length === 0) return [];

  if (filter) {
    var filtered = _applyFilter(available, filter);
    if (filtered.length > 0) available = filtered;
  }

  available.sort(function(a, b) { return b.stock - a.stock; });
  return available;
}

/**
 * Description 기반 필터링 (저항값 + 패키지 + 오차).
 * @param {Array} parts
 * @param {Object} filter
 * @returns {Array}
 */
function _applyFilter(parts, filter) {
  return parts.filter(function(p) {
    var desc = (p.description || '').toUpperCase();

    // 저항값 필터 — Description에서 역추출 후 비교
    if (filter.resistance_ohms !== null && filter.resistance_ohms !== undefined) {
      var descOhms = _extractResistanceFromDesc(desc);
      if (descOhms !== null) {
        var expected = filter.resistance_ohms;
        // 0Ω 예외 처리
        var ratio = expected === 0
          ? (descOhms === 0 ? 0 : 1)
          : Math.abs(descOhms - expected) / expected;
        if (ratio > 0.01) return false; // 1% 허용 (부동소수점 오차 대비)
      }
    }

    // 패키지 필터
    if (filter.package_imperial) {
      if (desc.indexOf(filter.package_imperial) === -1) {
        var mpn = (p.mpn || '').toUpperCase();
        if (mpn.indexOf(filter.package_imperial) === -1) return false;
      }
    }

    // 오차 필터
    if (filter.tolerance_percent !== null && filter.tolerance_percent !== undefined) {
      var tolStr = filter.tolerance_percent + '%';
      if (desc.indexOf(tolStr) === -1) return false;
    }

    return true;
  });
}

/**
 * Description 문자열(대문자)에서 저항값(Ω)을 추출.
 * 지원 형식: "1K OHM", "4.7KOHM", "100 OHM", "2.2M OHM", "4.7 K OHM"
 *
 * @param {string} descUpper - toUpperCase() 처리된 Description
 * @returns {number|null} 저항값(Ω) 또는 null
 */
function _extractResistanceFromDesc(descUpper) {
  var match = descUpper.match(/(\d+(?:\.\d+)?)\s*(K|M|)\s*OHM/);
  if (!match) return null;
  var val = parseFloat(match[1]);
  var unit = match[2] || '';
  if (unit === 'K') val *= 1000;
  else if (unit === 'M') val *= 1000000;
  return val;
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rankByStock: rankByStock,
    rankByStockAll: rankByStockAll,
    _applyFilter: _applyFilter,
    _extractResistanceFromDesc: _extractResistanceFromDesc
  };
}
