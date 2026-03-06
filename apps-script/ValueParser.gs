/**
 * ValueParser.gs — 에이전트1: 저항값 파서 (정규식 기반)
 *
 * 입력 문자열에서 저항값, 패키지, 오차를 추출.
 * 순서 무관: 토큰 타입을 자동 감지.
 */

'use strict';

// ─── 저항값 파싱 ────────────────────────────────────────────────────────────

/**
 * 저항값 토큰을 Ω 단위 숫자로 변환.
 * @param {string} token
 * @returns {number|null}
 */
function parseResistanceValue(token) {
  // "4R7" → 4.7, "1k5" → 1500, "2.2M" → 2200000
  var match = token.match(/^(\d+\.?\d*)(R|r|k|K|M|m)(\d*)$/);
  if (!match) return null;

  var prefix = parseFloat(match[1]);
  var unit   = match[2].toUpperCase();
  var suffix = match[3];

  var multiplier;
  if (unit === 'R') multiplier = 1;
  else if (unit === 'K') multiplier = 1000;
  else if (unit === 'M') multiplier = 1000000;
  else return null;

  if (suffix) {
    // "4R7" → 4 + 0.7 = 4.7, "1k5" → 1 + 0.5 = 1.5k = 1500
    var decimal = parseFloat('0.' + suffix);
    return (prefix + decimal) * multiplier;
  }
  return prefix * multiplier;
}

/**
 * 저항값을 사람이 읽기 쉬운 형태로 표시.
 * @param {number} ohms
 * @returns {string}
 */
function formatResistanceDisplay(ohms) {
  if (ohms >= 1000000) {
    var m = ohms / 1000000;
    return (m % 1 === 0 ? m.toFixed(0) : m.toString()) + 'MΩ';
  }
  if (ohms >= 1000) {
    var k = ohms / 1000;
    return (k % 1 === 0 ? k.toFixed(0) : k.toString()) + 'kΩ';
  }
  return (ohms % 1 === 0 ? ohms.toFixed(0) : ohms.toString()) + 'Ω';
}

// ─── 오차 파싱 ──────────────────────────────────────────────────────────────

/**
 * 오차 토큰을 숫자로 변환.
 * @param {string} token
 * @returns {number|null}
 */
function parseToleranceValue(token) {
  var match = token.match(/^(\d+\.?\d*)%$/);
  if (!match) return null;
  return parseFloat(match[1]);
}

// ─── 패키지 감지 ────────────────────────────────────────────────────────────

/**
 * 토큰이 패키지 코드인지 판별.
 * @param {string} token
 * @param {string[]} packageList - 알려진 패키지 코드 목록
 * @returns {boolean}
 */
function isPackageToken(token, packageList) {
  return packageList.indexOf(token) >= 0;
}

// ─── 메인 파서 ──────────────────────────────────────────────────────────────

/**
 * 입력 문자열을 파싱하여 구조화된 저항 정보를 반환.
 *
 * @param {string} input - 사용자 입력 (예: "1k 1005 5%")
 * @param {string[]} [packageList] - 알려진 패키지 코드 목록 (기본: 내장 목록)
 * @returns {Object} 파싱 결과
 */
function parseResistorInput(input, packageList) {
  // 기본 패키지 목록 (PackageConverter의 getAllKnownPackages 대체)
  if (!packageList) {
    packageList = [
      '0402', '0603', '1005', '1608', '2012', '2512', '3216', '3225',
      '4516', '4532', '5025', '6332',
      '01005', '0201', '0805', '1008', '1206', '1210', '1806', '1812', '2010'
    ];
  }

  var result = {
    resistance_ohms: null,
    resistance_display: null,
    package_input: null,
    package_metric: null,
    package_imperial: null,
    tolerance_percent: null,
    original_input: input,
    parse_success: false,
    error_message: null
  };

  if (!input || typeof input !== 'string') {
    result.error_message = '입력이 비어 있습니다.';
    return result;
  }

  // 토큰 분리: 공백, /, _, 탭
  var tokens = input.trim().split(/[\s\/\_\t]+/);

  var resistance = null;
  var pkg = null;
  var tolerance = null;
  var unrecognized = [];

  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (!t) continue;

    // 오차 감지 (% 포함)
    var tolVal = parseToleranceValue(t);
    if (tolVal !== null && tolerance === null) {
      tolerance = tolVal;
      continue;
    }

    // 저항값 감지 (R/k/K/M 단위)
    var resVal = parseResistanceValue(t);
    if (resVal !== null && resistance === null) {
      resistance = resVal;
      continue;
    }

    // 패키지 감지
    if (isPackageToken(t, packageList) && pkg === null) {
      pkg = t;
      continue;
    }

    // 순수 숫자 → 패키지 목록에 없으면 저항값으로 추정
    if (/^\d+\.?\d*$/.test(t)) {
      if (resistance === null) {
        resistance = parseFloat(t);
        continue;
      }
    }

    unrecognized.push(t);
  }

  result.resistance_ohms = resistance;
  result.tolerance_percent = tolerance;
  result.package_input = pkg;

  if (resistance !== null) {
    result.resistance_display = formatResistanceDisplay(resistance);
  }

  // 패키지 metric/imperial 변환 (PackageConverter 함수 사용 시도)
  if (pkg) {
    try {
      if (typeof isMetric === 'function') {
        if (isMetric(pkg)) {
          result.package_metric = pkg;
          result.package_imperial = typeof toImperial === 'function' ? toImperial(pkg) : null;
        } else {
          result.package_imperial = pkg;
          result.package_metric = typeof toMetric === 'function' ? toMetric(pkg) : null;
        }
      } else {
        result.package_metric = pkg;
        result.package_imperial = pkg;
      }
    } catch (e) {
      result.package_metric = pkg;
      result.package_imperial = pkg;
    }
  }

  // 성공 판정: 저항값 + 패키지 + 오차 모두 있어야 성공
  result.parse_success = (resistance !== null && pkg !== null && tolerance !== null);

  if (!result.parse_success) {
    var missing = [];
    if (resistance === null) missing.push('저항값');
    if (pkg === null) missing.push('패키지');
    if (tolerance === null) missing.push('오차');
    result.error_message = '누락된 항목: ' + missing.join(', ') + ' — 원본: ' + input;
  }

  if (unrecognized.length > 0) {
    var msg = '인식 불가 토큰: ' + unrecognized.join(', ');
    result.error_message = result.error_message ? result.error_message + '; ' + msg : msg;
  }

  return result;
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseResistanceValue: parseResistanceValue,
    formatResistanceDisplay: formatResistanceDisplay,
    parseToleranceValue: parseToleranceValue,
    isPackageToken: isPackageToken,
    parseResistorInput: parseResistorInput
  };
}
