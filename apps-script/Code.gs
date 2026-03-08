/**
 * Code.gs — 메인 엔트리포인트 (doGet/doPost)
 *
 * Google Apps Script 웹 앱으로 배포되는 메인 파일.
 * Blogger 프론트엔드 → 이 웹 앱 → Mouser/GLM API
 */

'use strict';

/**
 * GET 요청 핸들러 (JSONP 지원).
 * @param {Object} e - 이벤트 객체 { parameter: { callback, inputs } }
 * @returns {TextOutput}
 */
function doGet(e) {
  var params = e.parameter || {};
  var callback = params.callback || null;
  var inputsRaw = params.inputs || '';

  try {
    var result = processInputs(inputsRaw);
    var json = JSON.stringify(result);

    if (callback) {
      // JSONP 응답
      return ContentService
        .createTextOutput(callback + '(' + json + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    var errorResp = JSON.stringify({ success: false, error: err.message });
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + errorResp + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService
      .createTextOutput(errorResp)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * POST 요청 핸들러.
 * @param {Object} e - 이벤트 객체 { postData: { contents } }
 * @returns {TextOutput}
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var inputsRaw = body.inputs || '';
    var result = processInputs(inputsRaw);

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 입력 문자열을 처리하여 부품 매칭 결과를 반환.
 * @param {string} inputsRaw - 줄바꿈으로 구분된 입력
 * @returns {Object} formatOutput 결과
 */
function processInputs(inputsRaw) {
  return _processInputs(inputsRaw, UrlFetchApp, CacheService);
}

/**
 * 입력 처리 (테스트 가능한 내부 함수).
 * @param {string} inputsRaw
 * @param {Object} fetchSvc - UrlFetchApp (DI)
 * @param {Object} cacheSvc - CacheService (DI)
 * @returns {Object}
 */
function _processInputs(inputsRaw, fetchSvc, cacheSvc) {
  if (!inputsRaw || typeof inputsRaw !== 'string') {
    throw new Error('입력이 비어 있습니다.');
  }

  var lines = inputsRaw.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

  if (lines.length === 0) {
    throw new Error('입력이 비어 있습니다.');
  }

  var apiKey = getMouserApiKey();
  var glmKey = getGlmApiKey();
  var rows = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    try {
      var parsed = _processOneLine(line, fetchSvc, cacheSvc, apiKey, glmKey);
      rows.push(parsed);
    } catch (err) {
      rows.push(formatErrorRow(line, err.message));
    }
  }

  return formatOutput(rows);
}

/**
 * 한 줄 입력 처리.
 * @param {string} line
 * @param {Object} fetchSvc
 * @param {Object} cacheSvc
 * @param {string} mouserKey
 * @param {string} glmKey
 * @returns {Object} formatSuccessRow 또는 formatErrorRow 결과
 */
function _processOneLine(line, fetchSvc, cacheSvc, mouserKey, glmKey) {
  // 1) ValueParser로 파싱 시도
  var parsed = parseResistorInput(line);

  // 2) 파싱 실패 시 NlpParser로 폴백
  if (!parsed.parse_success) {
    try {
      parsed = _parseWithNlp(line, fetchSvc, glmKey, cacheSvc);
    } catch (nlpErr) {
      return formatErrorRow(line, parseError(line));
    }
  }

  // 여전히 실패
  if (!parsed.parse_success) {
    return formatErrorRow(line, parsed.error_message || parseError(line));
  }

  // 3) 캐시 확인
  var cacheKey = mouserCacheKey(parsed.resistance_ohms, parsed.package_input, parsed.tolerance_percent);
  var cached = cacheGet(cacheKey, cacheSvc);
  if (cached) {
    return formatSuccessRow(parsed, cached);
  }

  // 4) Mouser 검색 (후보를 충분히 확보하기 위해 20개 요청)
  var keyword = buildSearchKeyword(parsed);
  var searchResult = _searchMouser(keyword, 20, fetchSvc, mouserKey);

  if (searchResult.parts.length === 0) {
    return formatErrorRow(line, noResultsError(keyword));
  }

  // 5) StockRanker로 재고 기준 정렬된 후보 전체 확보 (2차 스펙 필터 포함)
  var candidates = rankByStockAll(searchResult.parts, {
    resistance_ohms: parsed.resistance_ohms,
    package_imperial: parsed.package_imperial,
    tolerance_percent: parsed.tolerance_percent
  });

  if (candidates.length === 0) {
    return formatErrorRow(line, noResultsError(keyword));
  }

  // 6) MPN 역검증 — 상위 후보를 최대 3회 순서대로 시도
  var best = null;
  var bestMpnSpecs = null;
  var maxAttempts = Math.min(3, candidates.length);
  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var candidate = candidates[attempt];
    var validation = _validateMpn(candidate.mpn, {
      resistance_ohms: parsed.resistance_ohms,
      package_imperial: parsed.package_imperial,
      tolerance_percent: parsed.tolerance_percent
    }, fetchSvc, mouserKey);

    if (validation.valid) {
      best = candidate;
      bestMpnSpecs = validation.actual;
      break;
    }
  }

  // 3회 모두 검증 실패 → 오류 표시
  if (!best) {
    return formatErrorRow(line, '스펙 검증 실패: 매칭 부품을 확인할 수 없습니다 (' + keyword + ')');
  }

  // 7) 결과 캐싱
  cachePut(cacheKey, best, 3600, cacheSvc);

  return formatSuccessRow(parsed, best, bestMpnSpecs);
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _processInputs: _processInputs,
    _processOneLine: _processOneLine
  };
}
