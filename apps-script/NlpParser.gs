/**
 * NlpParser.gs — 에이전트2: 자연어 파서 (GLM API 기반)
 *
 * ValueParser 실패 시 폴백으로 동작.
 * ZhipuAI GLM API를 통해 자연어를 구조화된 데이터로 변환.
 */

'use strict';

var NLP_SYSTEM_PROMPT = '당신은 전자 부품 전문가입니다. 사용자가 입력한 텍스트에서 저항 부품 정보를 추출하여 JSON만 반환하세요. 다른 설명은 절대 포함하지 마세요.';

var NLP_USER_TEMPLATE = '다음 텍스트에서 저항값(ohm 단위 숫자), 패키지 사이즈(예: 0402, 0603, 0805), 오차(% 숫자)를 추출하세요:\n"{INPUT}"\n\nJSON 형식으로만 응답: {"resistance_ohms": number, "package": "string", "tolerance_percent": number}\n누락된 정보는 null로 표시하세요.';

/**
 * 자연어 입력을 구조화된 저항 정보로 변환 (Apps Script 래퍼).
 * @param {string} input - 사용자 자연어 입력
 * @returns {Object} parseResistorInput과 동일한 형식
 */
function parseWithNlp(input) {
  return _parseWithNlp(input, UrlFetchApp, getGlmApiKey(), CacheService);
}

/**
 * 자연어 입력을 구조화된 저항 정보로 변환 (테스트 가능).
 * @param {string} input
 * @param {Object} fetchSvc - UrlFetchApp (DI)
 * @param {string} apiKey - GLM API 키
 * @param {Object} [cacheSvc] - CacheService (DI)
 * @returns {Object}
 */
function _parseWithNlp(input, fetchSvc, apiKey, cacheSvc) {
  // 캐시 확인
  if (cacheSvc) {
    var cacheKey = typeof nlpCacheKey === 'function' ? nlpCacheKey(input) : 'nlp_' + input.length;
    var cached = typeof cacheGet === 'function' ? cacheGet(cacheKey, cacheSvc) : null;
    if (cached) return cached;
  }

  var messages = [
    { role: 'system', content: NLP_SYSTEM_PROMPT },
    { role: 'user', content: NLP_USER_TEMPLATE.replace('{INPUT}', input) }
  ];

  var glmResult;
  try {
    glmResult = _callGlm(messages, { temperature: 0.1 }, fetchSvc, apiKey);
  } catch (e) {
    return {
      resistance_ohms: null,
      resistance_display: null,
      package_input: null,
      package_metric: null,
      package_imperial: null,
      tolerance_percent: null,
      original_input: input,
      parse_success: false,
      error_message: 'NLP 파싱 실패: ' + e.message
    };
  }
  var content = glmResult.content;

  // JSON 추출 (markdown 코드블록 처리)
  var jsonStr = content;
  var jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  } else {
    // 중괄호로 시작하는 JSON 찾기
    var braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      jsonStr = braceMatch[0];
    }
  }

  var parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    return {
      resistance_ohms: null,
      resistance_display: null,
      package_input: null,
      package_metric: null,
      package_imperial: null,
      tolerance_percent: null,
      original_input: input,
      parse_success: false,
      error_message: 'NLP 파싱 실패: GLM 응답을 JSON으로 변환할 수 없습니다.'
    };
  }

  var result = {
    resistance_ohms: parsed.resistance_ohms || null,
    resistance_display: null,
    package_input: parsed.package || null,
    package_metric: null,
    package_imperial: null,
    tolerance_percent: parsed.tolerance_percent || null,
    original_input: input,
    parse_success: false,
    error_message: null
  };

  // resistance_display 생성
  if (result.resistance_ohms !== null && typeof formatResistanceDisplay === 'function') {
    result.resistance_display = formatResistanceDisplay(result.resistance_ohms);
  }

  // 패키지 변환
  if (result.package_input) {
    try {
      if (typeof isMetric === 'function') {
        if (isMetric(result.package_input)) {
          result.package_metric = result.package_input;
          result.package_imperial = typeof toImperial === 'function' ? toImperial(result.package_input) : null;
        } else {
          result.package_imperial = result.package_input;
          result.package_metric = typeof toMetric === 'function' ? toMetric(result.package_input) : null;
        }
      }
    } catch (e) { /* 무시 */ }
  }

  result.parse_success = (result.resistance_ohms !== null && result.package_input !== null && result.tolerance_percent !== null);

  if (!result.parse_success) {
    var missing = [];
    if (result.resistance_ohms === null) missing.push('저항값');
    if (result.package_input === null) missing.push('패키지');
    if (result.tolerance_percent === null) missing.push('오차');
    result.error_message = 'NLP 파싱 불완전: ' + missing.join(', ') + ' 추출 실패';
  }

  // 캐시 저장
  if (cacheSvc && result.parse_success) {
    var ck = typeof nlpCacheKey === 'function' ? nlpCacheKey(input) : 'nlp_' + input.length;
    if (typeof cachePut === 'function') {
      cachePut(ck, result, 3600, cacheSvc);
    }
  }

  return result;
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _parseWithNlp: _parseWithNlp,
    NLP_SYSTEM_PROMPT: NLP_SYSTEM_PROMPT,
    NLP_USER_TEMPLATE: NLP_USER_TEMPLATE
  };
}
