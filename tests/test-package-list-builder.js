/**
 * test-package-list-builder.js — PackageListBuilder 테스트 (mock HTTP)
 */
'use strict';

require.extensions['.gs'] = require.extensions['.js'];
// 전역 의존성 설정
const CacheManager = require('../apps-script/CacheManager');
global.cacheGet = CacheManager.cacheGet;
global.cachePut = CacheManager.cachePut;

const MouserClient = require('../apps-script/MouserClient');
global._searchMouser = MouserClient._searchMouser;

const PackageConverter = require('../apps-script/PackageConverter');
global.DEFAULT_METRIC_TO_IMPERIAL = {
  '0402': '01005', '0603': '0201', '1005': '0402', '1608': '0603',
  '2012': '0805', '2512': '1008', '3216': '1206', '3225': '1210',
  '4516': '1806', '4532': '1812', '5025': '2010', '6332': '2512'
};
global.DEFAULT_IMPERIAL_TO_METRIC = {
  '01005': '0402', '0201': '0603', '0402': '1005', '0603': '1608',
  '0805': '2012', '1008': '2512', '1206': '3216', '1210': '3225',
  '1806': '4516', '1812': '4532', '2010': '5025', '2512': '6332'
};

const { makeMockFetch, mockCacheService } = require('./mocks/apps-script-mocks');
const { _getPackageList, _extractPackages } = require('../apps-script/PackageListBuilder');

let passed = 0, total = 0, failedTest = null, targetFn = null;

function assert(testName, actual, expected) {
  total++;
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    console.log(`  ❌ ${testName}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
    if (!failedTest) { failedTest = testName; targetFn = testName; }
  }
}

// ── _extractPackages ──
const pkgSet = {};
_extractPackages({ description: 'RES SMD 1K OHM 5% 0402', mpn: 'RC0402JR-071KL' }, pkgSet);
assert('extract_0402', pkgSet['0402'], true);

// ── _getPackageList (mock API) ──
const mouserResp = {
  SearchResults: {
    NumberOfResult: 3,
    Parts: [
      { ManufacturerPartNumber: 'RC0402JR-071KL', Manufacturer: 'Yageo', Description: 'RES SMD 1K OHM 5% 0402', AvailabilityInStock: '5000000', PriceBreaks: [] },
      { ManufacturerPartNumber: 'RC0603FR-0710KL', Manufacturer: 'Yageo', Description: 'RES SMD 10K OHM 1% 0603', AvailabilityInStock: '3000000', PriceBreaks: [] },
      { ManufacturerPartNumber: 'CRCW08051K00FKEA', Manufacturer: 'Vishay', Description: 'RES SMD 1K OHM 1% 0805', AvailabilityInStock: '1000000', PriceBreaks: [] }
    ]
  }
};
const mockFetch = makeMockFetch({
  'api.mouser.com': { code: 200, body: mouserResp }
});
const pkgList = _getPackageList(mockFetch, mockCacheService, 'test-key');
assert('pkglist_type', Array.isArray(pkgList.packages), true);
total++;
if (pkgList.packages.indexOf('0402') >= 0) { passed++; }
else { console.log(`  ❌ pkglist_has_0402: ${pkgList.packages}`); if (!failedTest) { failedTest = 'pkglist_has_0402'; targetFn = '_getPackageList'; } }

total++;
if (pkgList.packages.indexOf('0603') >= 0) { passed++; }
else { console.log(`  ❌ pkglist_has_0603: ${pkgList.packages}`); if (!failedTest) { failedTest = 'pkglist_has_0603'; targetFn = '_getPackageList'; } }

// ── 빈 결과 시 폴백 ──
const emptyFetch = makeMockFetch({
  'api.mouser.com': { code: 200, body: { SearchResults: { Parts: [], NumberOfResult: 0 } } }
});
const fallback = _getPackageList(emptyFetch, mockCacheService, 'test-key');
assert('fallback_has_packages', fallback.packages.length > 0, true);

console.log(`  PackageListBuilder: ${passed}/${total}`);
console.log(JSON.stringify({ passed, total, failedTest, targetFn }));
process.exit(passed === total ? 0 : 1);
