/**
 * GlmClient.gs — 에이전트6: ZhipuAI GLM API 클라이언트
 *
 * Bearer Token 인증, POST /api/paas/v4/chat/completions 호출.
 * DI 패턴: UrlFetchApp을 파라미터로 주입.
 */

'use strict';

/**
 * GLM chat completions 호출 (Apps Script 래퍼).
 * @param {Array} messages - [{role, content}, ...]
 * @param {Object} [options] - { temperature, model }
 * @returns {Object} { content: string, usage: object }
 */
function callGlm(messages, options) {
  return _callGlm(messages, options, UrlFetchApp, getGlmApiKey());
}

/**
 * GLM chat completions 호출 (테스트 가능한 내부 함수).
 * @param {Array} messages - [{role, content}, ...]
 * @param {Object} [options] - { temperature, model }
 * @param {Object} fetchSvc - UrlFetchApp (DI)
 * @param {string} apiKey
 * @returns {Object} { content: string, usage: object }
 */
function _callGlm(messages, options, fetchSvc, apiKey) {
  options = options || {};
  var model = options.model || APP_CONFIG.GLM_MODEL || 'glm-4.7-flash';
  var temperature = options.temperature !== undefined ? options.temperature : 0.1;
  var url = APP_CONFIG.GLM_API_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  var payload = {
    model: model,
    messages: messages,
    temperature: temperature
  };

  var fetchOptions = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + apiKey
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  var response = fetchSvc.fetch(url, fetchOptions);
  var code = response.getResponseCode();

  if (code !== 200) {
    var errMsg = 'GLM API 오류 (HTTP ' + code + ')';
    if (code === 401) errMsg += ': API 키가 유효하지 않습니다.';
    else if (code === 429) errMsg += ': 요청 한도 초과. 잠시 후 재시도하세요.';
    else errMsg += ': ' + response.getContentText();
    throw new Error(errMsg);
  }

  var data = JSON.parse(response.getContentText());
  var choices = data.choices || [];

  if (choices.length === 0) {
    throw new Error('GLM API 응답에 choices가 비어 있습니다.');
  }

  return {
    content: choices[0].message.content,
    usage: data.usage || {}
  };
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _callGlm: _callGlm
  };
}
