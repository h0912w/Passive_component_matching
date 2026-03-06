/**
 * PackageConverter.gs — 에이전트4: 패키지 변환 (Metric ↔ Imperial)
 *
 * 하드코딩 기본 테이블 + PackageListBuilder 동적 테이블 폴백 구조.
 * 기본값: metric으로 간주 (한국/아시아 회로도 기준).
 */

'use strict';

// ─── 기본 변환 테이블 (PackageListBuilder 캐시 미스 시 폴백) ─────────────────
var DEFAULT_METRIC_TO_IMPERIAL = {
  '0402': '01005',
  '0603': '0201',
  '1005': '0402',
  '1608': '0603',
  '2012': '0805',
  '2512': '1008',
  '3216': '1206',
  '3225': '1210',
  '4516': '1806',
  '4532': '1812',
  '5025': '2010',
  '6332': '2512'
};

var DEFAULT_IMPERIAL_TO_METRIC = {
  '01005': '0402',
  '0201':  '0603',
  '0402':  '1005',
  '0603':  '1608',
  '0805':  '2012',
  '1008':  '2512',
  '1206':  '3216',
  '1210':  '3225',
  '1806':  '4516',
  '1812':  '4532',
  '2010':  '5025',
  '2512':  '6332'
};

// Metric 전용 코드 (Imperial에 없는 코드)
var METRIC_ONLY = ['1005', '1608', '2012', '3216', '3225', '4516', '4532', '5025', '6332'];
// Imperial 전용 코드 (Metric에 없는 코드)
var IMPERIAL_ONLY = ['01005', '0201', '0805', '1008', '1206', '1210', '1806', '1812', '2010'];

/**
 * 패키지 코드가 Metric인지 판별.
 * 모호한 코드(0402, 0603, 2512)는 기본 metric으로 간주.
 * @param {string} code
 * @returns {boolean}
 */
function isMetric(code) {
  if (METRIC_ONLY.indexOf(code) >= 0) return true;
  if (IMPERIAL_ONLY.indexOf(code) >= 0) return false;
  // 모호한 코드 (0402, 0603, 2512) → 기본 metric
  return true;
}

/**
 * 패키지 코드가 Imperial인지 판별.
 * @param {string} code
 * @returns {boolean}
 */
function isImperial(code) {
  return !isMetric(code);
}

/**
 * Metric → Imperial 변환.
 * @param {string} metricCode
 * @returns {string|null}
 */
function toImperial(metricCode) {
  return DEFAULT_METRIC_TO_IMPERIAL[metricCode] || null;
}

/**
 * Imperial → Metric 변환.
 * @param {string} imperialCode
 * @returns {string|null}
 */
function toMetric(imperialCode) {
  return DEFAULT_IMPERIAL_TO_METRIC[imperialCode] || null;
}

/**
 * 어떤 코드든 Imperial로 변환 (이미 Imperial이면 그대로).
 * @param {string} code
 * @returns {string|null}
 */
function ensureImperial(code) {
  if (IMPERIAL_ONLY.indexOf(code) >= 0) return code;
  var converted = toImperial(code);
  if (converted) return converted;
  // 모호한 코드인데 Imperial 테이블에 없으면 metric으로 시도
  return DEFAULT_METRIC_TO_IMPERIAL[code] || null;
}

/**
 * 어떤 코드든 Metric으로 변환 (이미 Metric이면 그대로).
 * @param {string} code
 * @returns {string|null}
 */
function ensureMetric(code) {
  if (METRIC_ONLY.indexOf(code) >= 0) return code;
  var converted = toMetric(code);
  if (converted) return converted;
  return DEFAULT_IMPERIAL_TO_METRIC[code] || null;
}

/**
 * 모든 알려진 패키지 코드 목록 반환 (Metric + Imperial 합집합).
 * @returns {string[]}
 */
function getAllKnownPackages() {
  var all = {};
  var keys, i;
  keys = Object.keys(DEFAULT_METRIC_TO_IMPERIAL);
  for (i = 0; i < keys.length; i++) {
    all[keys[i]] = true;
    all[DEFAULT_METRIC_TO_IMPERIAL[keys[i]]] = true;
  }
  return Object.keys(all);
}

/**
 * 패키지 표시 문자열 생성: "imperial (metric)" 형식.
 * @param {string} code
 * @returns {string}
 */
function formatPackageDisplay(code) {
  if (isMetric(code)) {
    var imp = toImperial(code);
    return imp ? imp + ' (' + code + ')' : code;
  } else {
    var met = toMetric(code);
    return met ? code + ' (' + met + ')' : code;
  }
}

// Node.js 테스트 환경에서의 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isMetric: isMetric,
    isImperial: isImperial,
    toImperial: toImperial,
    toMetric: toMetric,
    ensureImperial: ensureImperial,
    ensureMetric: ensureMetric,
    getAllKnownPackages: getAllKnownPackages,
    formatPackageDisplay: formatPackageDisplay
  };
}
