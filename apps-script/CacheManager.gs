/**
 * CacheManager.gs — 에이전트9: API 응답 캐싱
 *
 * CacheService.getScriptCache() 를 DI로 주입받아 Node.js에서도 테스트 가능.
 * 키 형식: mouser_{hash}, packagelist, nlp_{hash}
 */

'use strict';

/**
 * 캐시에서 값 조회.
 * @param {string} key
 * @param {Object} [cacheSvc] - CacheService (DI)
 * @returns {Object|null} 파싱된 JSON 또는 null
 */
function cacheGet(key, cacheSvc) {
  cacheSvc = cacheSvc || CacheService;
  try {
    var raw = cacheSvc.getScriptCache().get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * 캐시에 값 저장.
 * @param {string} key
 * @param {Object} value - JSON 직렬화 가능한 객체
 * @param {number} [ttl] - TTL (초), 기본 3600 (1시간)
 * @param {Object} [cacheSvc] - CacheService (DI)
 */
function cachePut(key, value, ttl, cacheSvc) {
  cacheSvc = cacheSvc || CacheService;
  if (ttl === undefined || ttl === null) ttl = 3600;
  try {
    var raw = JSON.stringify(value);
    // Apps Script CacheService 제한: 값당 100KB
    if (raw.length > 100000) return;
    cacheSvc.getScriptCache().put(key, raw, ttl);
  } catch (e) {
    // 캐시 실패는 무시 (서비스 장애 대비)
  }
}

/**
 * 캐시에서 값 삭제.
 * @param {string} key
 * @param {Object} [cacheSvc] - CacheService (DI)
 */
function cacheRemove(key, cacheSvc) {
  cacheSvc = cacheSvc || CacheService;
  try {
    cacheSvc.getScriptCache().remove(key);
  } catch (e) {
    // 무시
  }
}

/**
 * Mouser 검색 결과용 캐시 키 생성.
 * @param {number} resistance - 저항값 (Ω)
 * @param {string} pkg - 패키지
 * @param {number} tolerance - 오차 (%)
 * @returns {string}
 */
function mouserCacheKey(resistance, pkg, tolerance) {
  return 'mouser_' + resistance + '_' + pkg + '_' + tolerance;
}

/**
 * NLP 파싱 결과용 캐시 키 생성.
 * @param {string} input - 원본 입력
 * @returns {string}
 */
function nlpCacheKey(input) {
  // 간단한 해시: 입력 문자열의 charCode 합
  var hash = 0;
  for (var i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return 'nlp_' + Math.abs(hash);
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    cacheGet: cacheGet,
    cachePut: cachePut,
    cacheRemove: cacheRemove,
    mouserCacheKey: mouserCacheKey,
    nlpCacheKey: nlpCacheKey
  };
}
