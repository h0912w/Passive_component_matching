/**
 * Config.gs - API 키 및 설정 관리
 *
 * API 키는 절대 이 파일에 직접 작성하지 않습니다.
 * Apps Script 에디터 > 프로젝트 설정 > 스크립트 속성에서 설정하세요.
 *
 * 필요한 스크립트 속성:
 *   MOUSER_API_KEY        - Mouser Search API 키
 *   DIGIKEY_CLIENT_ID     - Digikey OAuth Client ID
 *   DIGIKEY_CLIENT_SECRET - Digikey OAuth Client Secret
 */

/**
 * Mouser API 키를 가져옵니다.
 * @param {Object} [propsService] - PropertiesService (테스트용 DI)
 * @returns {string|null} API 키
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
 * Digikey API 인증 정보를 가져옵니다.
 * @param {Object} [propsService] - PropertiesService (테스트용 DI)
 * @returns {{ clientId: string, clientSecret: string }}
 */
function getDigikeyCredentials(propsService) {
  propsService = propsService || PropertiesService;
  var props = propsService.getScriptProperties();
  var clientId = props.getProperty('DIGIKEY_CLIENT_ID');
  var clientSecret = props.getProperty('DIGIKEY_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('Digikey 인증 정보가 설정되지 않았습니다. Apps Script 프로젝트 설정 > 스크립트 속성에서 DIGIKEY_CLIENT_ID, DIGIKEY_CLIENT_SECRET을 추가하세요.');
  }
  return { clientId: clientId, clientSecret: clientSecret };
}

/** 앱 설정 상수 */
var APP_CONFIG = {
  CACHE_TTL_SECONDS: 3600,          // API 응답 캐시 유효시간 (1시간)
  DIGIKEY_TOKEN_CACHE_TTL: 1500,    // Digikey 토큰 캐시 (25분, 토큰 유효 30분)
  MOUSER_REQUEST_INTERVAL_MS: 2100, // Mouser 요청 간격 (30 req/min 대응)
  MAX_RESULTS_PER_SEARCH: 10,       // API 검색 당 최대 결과 수
  DIGIKEY_CATEGORY_CHIP_RESISTOR: 52 // Digikey 카테고리 ID: Chip Resistor - Surface Mount
};

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getMouserApiKey: getMouserApiKey, getDigikeyCredentials: getDigikeyCredentials, APP_CONFIG: APP_CONFIG };
}
