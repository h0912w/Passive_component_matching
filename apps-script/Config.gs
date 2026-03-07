/**
 * Config.gs - API 키 및 설정 관리
 *
 * API 키는 절대 이 파일에 직접 작성하지 않습니다.
 * Apps Script 에디터 > 프로젝트 설정 > 스크립트 속성에서 설정하세요.
 *
 * 필요한 스크립트 속성:
 *   MOUSER_API_KEY  - Mouser Search API 키
 *   GLM_API_KEY     - ZhipuAI GLM API 키
 */

/**
 * Mouser API 키를 가져옵니다.
 * @param {Object} [propsService] - PropertiesService (테스트용 DI)
 * @returns {string} API 키
 */
function getMouserApiKey(propsService) {
  propsService = propsService || PropertiesService;
  var key = propsService.getScriptProperties().getProperty('MOUSER_API_KEY');
  if (!key) {
    throw new Error('MOUSER_API_KEY가 설정되지 않았습니다. Apps Script 프로젝트 설정 > 스크립트 속성에서 추가하세요.');
  }
  return key;
}

/**
 * ZhipuAI GLM API 키를 가져옵니다.
 * @param {Object} [propsService] - PropertiesService (테스트용 DI)
 * @returns {string} API 키
 */
function getGlmApiKey(propsService) {
  propsService = propsService || PropertiesService;
  var key = propsService.getScriptProperties().getProperty('GLM_API_KEY');
  if (!key) {
    throw new Error('GLM_API_KEY가 설정되지 않았습니다. Apps Script 프로젝트 설정 > 스크립트 속성에서 추가하세요.');
  }
  return key;
}

/** 앱 설정 상수 */
var APP_CONFIG = {
  CACHE_TTL_SECONDS: 3600,              // API 응답 캐시 유효시간 (1시간)
  PACKAGE_LIST_CACHE_TTL: 86400,        // 패키지 리스트 캐시 유효시간 (24시간)
  MOUSER_REQUEST_INTERVAL_MS: 2100,     // Mouser 요청 간격 (30 req/min 대응)
  MAX_RESULTS_PER_SEARCH: 10,           // API 검색 당 최대 결과 수
  GLM_API_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  GLM_MODEL: 'glm-4.7-flash'           // 사용할 GLM 모델 (2026-01 이후 최신 Flash 모델)
};

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getMouserApiKey: getMouserApiKey, getGlmApiKey: getGlmApiKey, APP_CONFIG: APP_CONFIG };
}
