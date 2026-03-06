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
 * Description 기반 필터링.
 * @param {Array} parts
 * @param {Object} filter
 * @returns {Array}
 */
function _applyFilter(parts, filter) {
  return parts.filter(function(p) {
    var desc = (p.description || '').toUpperCase();

    // 패키지 필터
    if (filter.package_imperial) {
      if (desc.indexOf(filter.package_imperial) === -1) {
        // MPN에서도 확인
        var mpn = (p.mpn || '').toUpperCase();
        if (mpn.indexOf(filter.package_imperial) === -1) {
          return false;
        }
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

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    rankByStock: rankByStock,
    _applyFilter: _applyFilter
  };
}
