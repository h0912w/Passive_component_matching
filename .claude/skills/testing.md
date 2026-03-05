# Skill: TestRunner 에이전트 — 자동 테스트 & 피드백 루프

## 역할
코드 작성 후 자동으로 테스트를 실행하고, 실패 시 담당 에이전트에게 구조화된 피드백을 제공하여 수정하게 만드는 품질 보증 에이전트.

---

## 테스트 가능성 판단 기준

### Apps Script .gs 파일이 Node.js에서 테스트되려면

**필수 조건 1 — DI 패턴**: Apps Script 전용 API를 직접 호출하지 않고 파라미터로 받을 것
```javascript
// ❌ 테스트 불가
function searchMouser(keyword) {
  var cache = CacheService.getScriptCache(); // 전역 직접 사용
  var resp = UrlFetchApp.fetch(url);         // 전역 직접 사용
}

// ✅ 테스트 가능 (DI 패턴)
function searchMouser(keyword) {
  return _searchMouser(keyword, UrlFetchApp, CacheService); // Apps Script용 래퍼
}
function _searchMouser(keyword, fetchSvc, cacheSvc) {       // 실제 로직 (주입받음)
  var cache = cacheSvc.getScriptCache();
  var resp = fetchSvc.fetch(url);
}
```

**필수 조건 2 — 조건부 export**: 파일 하단에 반드시 포함
```javascript
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { _searchMouser, parseValue };
}
```

**필수 조건 3 — mock 파일**: `tests/mocks/apps-script-mocks.js`에 모든 Apps Script API mock 정의

---

## Mock 파일 구조 (`tests/mocks/apps-script-mocks.js`)

테스트에서 `require('./mocks/apps-script-mocks')` 로 가져다 쓰는 공통 mock:

```javascript
// PropertiesService mock
const mockPropertiesService = {
  getScriptProperties: () => ({
    getProperty: (key) => ({
      MOUSER_API_KEY: 'test-mouser-key-12345',
      DIGIKEY_CLIENT_ID: 'test-digikey-id',
      DIGIKEY_CLIENT_SECRET: 'test-digikey-secret'
    })[key] || null,
    setProperty: () => {}
  })
};

// CacheService mock
const mockCacheService = {
  getScriptCache: () => ({
    get: (key) => null,          // 기본: 캐시 미스 (실제 로직 실행)
    put: (key, val, ttl) => {},
    remove: (key) => {}
  })
};

// UrlFetchApp mock — 응답을 주입할 수 있도록 팩토리 함수로
function makeMockFetch(responseMap) {
  // responseMap: { [url_pattern]: { code, body } }
  return {
    fetch: (url, options) => {
      var match = Object.keys(responseMap).find(k => url.includes(k));
      var resp = match ? responseMap[match] : { code: 404, body: '{}' };
      return {
        getResponseCode: () => resp.code,
        getContentText: () => JSON.stringify(resp.body)
      };
    }
  };
}

module.exports = { mockPropertiesService, mockCacheService, makeMockFetch };
```

---

## 테스트 파일별 케이스

### test-value-parser.js (✅ 완전 자동, mock 불필요)
```
입력 → 기대 출력 (resistance_ohms, package_input, tolerance_percent)

"1k 1005 5%"      → {1000,    "1005", 5}
"10k/0603/1%"     → {10000,   "0603", 1}
"4.7k_1005_5%"    → {4700,    "1005", 5}
"100R 0402 1%"    → {100,     "0402", 1}
"2.2M 1206 5%"    → {2200000, "1206", 5}
"4R7 0402 1%"     → {4.7,     "0402", 1}
"1k5 0603 5%"     → {1500,    "0603", 5}
"10K 0805 5%"     → {10000,   "0805", 5}
"0805 2.2M 5%"    → {2200000, "0805", 5}   ← 순서 다름
"5% 1k 1005"      → {1000,    "1005", 5}   ← 순서 다름
"abc xyz"         → { parse_success: false }
"1k 5%"           → { package_input: null, parse_success: false }
```

### test-package-converter.js (✅ 완전 자동)
```
toImperial("1005") → "0402"
toImperial("1608") → "0603"
toImperial("2012") → "0805"
toMetric("0402")   → "1005"
toMetric("0603")   → "1608"
toMetric("0805")   → "2012"
isMetric("1005")   → true
isMetric("0402")   → false (모호 케이스: 기본 imperial로 판단)
toImperial("9999") → null  ← 알 수 없는 패키지
```

### test-stock-ranker.js (✅ 완전 자동)
```
입력: [{mpn:"A", stock:100}, {mpn:"B", stock:5000}, {mpn:"C", stock:50}]
기대: "B" 선정 (최다 재고)

입력: [{mpn:"A", stock:0}, {mpn:"B", stock:100}]
기대: "B" 선정 (재고 0 제외)

입력: []
기대: null

입력: 저항값 불일치 부품 포함 시 필터링 후 선정
```

### test-mouser-client.js (⚠️ mock HTTP 필요)
```javascript
const { makeMockFetch } = require('./mocks/apps-script-mocks');
const mouserMock = makeMockFetch({
  'api.mouser.com/api/v2/search/keyword': {
    code: 200,
    body: {
      SearchResults: {
        Parts: [{
          ManufacturerPartNumber: 'RC0402JR-071KL',
          Description: 'RES SMD 1K OHM 5% 0402',
          AvailabilityInStock: '5000000'
        }]
      }
    }
  }
});
// _searchMouser('1k 0402 5%', mouserMock, mockCacheService) 호출 후 결과 검증
```

### test-integration.js (⚠️ 전체 파이프라인, mock API)
```
입력 배열: ["1k 1005 5%", "10k/0603/1%", "invalid!!!"]

파이프라인:
1. ValueParser → 파싱
2. PackageConverter → metric/imperial 변환
3. MouserClient (mock) → 부품 후보 반환
4. StockRanker → 최다 재고 선정
5. OutputFormatter → 6열 데이터 생성

기대 출력:
행1: {원본:"1k 1005 5%",  저항:"1kΩ",  패키지:"0402(1005)", 오차:"5%", MPN:"RC0402JR-071KL",  desc:"RES SMD 1K..."}
행2: {원본:"10k/0603/1%", 저항:"10kΩ", 패키지:"0603(1608)", 오차:"1%", MPN:"RC0603FR-0710KL", desc:"RES SMD 10K..."}
행3: {원본:"invalid!!!",  parse_success:false, error:"입력 형식을 확인하세요: invalid!!!"}
```

---

## 피드백 루프 구현

### run-all-tests.js 내부 동작
```javascript
const results = [];
const suites = [
  { name: 'ValueParser',      file: './test-value-parser.js' },
  { name: 'PackageConverter', file: './test-package-converter.js' },
  { name: 'StockRanker',      file: './test-stock-ranker.js' },
  { name: 'OutputFormatter',  file: './test-output-formatter.js' },
  { name: 'MouserClient',     file: './test-mouser-client.js' },
  { name: 'DigikeyClient',    file: './test-digikey-client.js' },
  { name: 'Integration',      file: './test-integration.js' },
];

for (const suite of suites) {
  const result = runSuite(suite);
  results.push(result);
  if (!result.passed) {
    // 피드백 파일 생성
    writeFeedback({
      suite: suite.name,
      failedTest: result.failedTest,
      targetFile: result.targetFile,   // 수정해야 할 .gs 파일
      targetFunction: result.targetFn,
      input: result.input,
      expected: result.expected,
      actual: result.actual,
      hint: result.hint
    });
  }
}
```

### 피드백 파일 예시 (`tests/feedback/last-failure.json`)
```json
{
  "timestamp": "2026-03-05T15:30:00Z",
  "suite": "ValueParser",
  "failedTest": "test_mega_ohm",
  "targetFile": "apps-script/ValueParser.gs",
  "targetFunction": "parseResistanceValue",
  "input": "2.2M 1206 5%",
  "expected": { "resistance_ohms": 2200000 },
  "actual": { "resistance_ohms": 2200 },
  "hint": "M 승수 처리 오류. 'M' 케이스의 multiplier가 1000 대신 1로 설정된 것으로 보임.",
  "retryCount": 1,
  "maxRetries": 3
}
```

### 재시도 제한
- `retryCount >= maxRetries(3)` 이면 다음 메시지 출력 후 중단:
  ```
  ❌ [ValueParser] test_mega_ohm — 3회 수정 시도 후에도 실패
  사람의 개입이 필요합니다. tests/feedback/last-failure.json 참조.
  ```

---

## 테스트 결과 출력 형식

성공:
```
[ValueParser]       12/12 ✅
[PackageConverter]   9/9  ✅
[StockRanker]        4/4  ✅
[OutputFormatter]    4/4  ✅
[ErrorHandler]       3/3  ✅
[Config]             2/2  ✅
[CacheManager]       3/3  ✅
[MouserClient]       4/4  ✅
[DigikeyClient]      4/4  ✅
[Integration]        3/3  ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 48/48 passed ✅  All systems go.
```

실패:
```
[ValueParser]       11/12 ❌  FAIL: test_mega_ohm
  Input:    "2.2M 1206 5%"
  Expected: resistance_ohms = 2200000
  Actual:   resistance_ohms = 2200
  → Feedback written to tests/feedback/last-failure.json
  → Fix apps-script/ValueParser.gs :: parseResistanceValue()
```
