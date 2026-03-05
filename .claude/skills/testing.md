# Skill: 테스트 전략 및 실행

## 개요
Apps Script 코드를 Node.js 환경에서 테스트할 수 있도록 구조화하고, 단위 테스트 및 통합 테스트를 실행하는 스킬.

## 테스트 원칙

### Apps Script → Node.js 호환 전략
Apps Script(.gs 파일)의 함수들은 순수 함수로 작성하여 Node.js에서도 실행 가능하게 한다.

**의존성 주입 (DI) 패턴**:
```javascript
// Apps Script에서 실행될 때
function searchDigikey(keyword) {
  return _searchDigikey(keyword, UrlFetchApp, CacheService);
}

// 실제 로직 (테스트 가능)
function _searchDigikey(keyword, fetchService, cacheService) {
  // fetchService.fetch(...) 사용
  // cacheService.getScriptCache() 사용
}
```

테스트에서는 mock 객체를 주입:
```javascript
const mockFetch = { fetch: (url, options) => mockResponse };
const mockCache = { getScriptCache: () => ({ get: () => null, put: () => {} }) };
_searchDigikey('1k resistor', mockFetch, mockCache);
```

## 테스트 파일 구조

### test-value-parser.js
```javascript
// 테스트 케이스:
// 1. 기본 파싱: "1k 1005 5%" → {1000, "1005", 5}
// 2. 슬래시 구분: "10k/0603/1%" → {10000, "0603", 1}
// 3. 언더바 구분: "4.7k_1005_5%" → {4700, "1005", 5}
// 4. 순서 변경: "0805 2.2M 5%" → {2200000, "0805", 5}
// 5. R 소수점: "4R7 0402 1%" → {4.7, "0402", 1}
// 6. k 소수점: "1k5 0603 5%" → {1500, "0603", 5}
// 7. 대문자: "10K 0805 5%" → {10000, "0805", 5}
// 8. 메가옴: "2.2M 1206 5%" → {2200000, "1206", 5}
// 9. 에러 케이스: "abc xyz" → parse_success=false
// 10. 부분 파싱: "1k 5%" → 패키지 null
```

### test-package-converter.js
```javascript
// 테스트 케이스:
// 1. Metric → Imperial: "1005" → "0402"
// 2. Imperial → Metric: "0402" → "1005"
// 3. 양방향 일관성: toImperial(toMetric(x)) === x
// 4. 모호한 값: "0402" → metric 기본 → imperial "01005"
// 5. 알 수 없는 값: "9999" → null
```

### test-stock-ranker.js
```javascript
// 테스트 케이스:
// 1. 재고 최다 선택: [{stock:100}, {stock:5000}, {stock:50}] → stock:5000 선택
// 2. 재고 0 제외: [{stock:0}, {stock:100}] → stock:100 선택
// 3. 빈 목록: [] → null
// 4. 스펙 불일치 필터링: 저항값 다른 부품 제외
```

### test-output-formatter.js
```javascript
// 테스트 케이스:
// 1. 6열 포맷: 입력원본 | 저항값 | 패키지 | 오차 | MPN | Description
// 2. 부품번호 목록: MPN만 엔터 구분으로 출력
// 3. 에러 행: parse_success=false인 항목은 에러 메시지 포함
// 4. 빈 입력: [] → 빈 테이블
```

### test-integration.js
```javascript
// 전체 파이프라인 테스트 (mock API 응답 사용):
// 입력: ["1k 1005 5%", "10k/0603/1%", "invalid_input"]
// 1. ValueParser로 파싱
// 2. DigikeyClient/MouserClient로 검색 (mock)
// 3. StockRanker로 최적 부품 선정
// 4. OutputFormatter로 6열 테이블 생성
// 5. 결과 검증: 정상 2행 + 에러 1행
```

### mock-api-responses.json
```json
{
  "digikey_1k_0402_5pct": {
    "Products": [{
      "ManufacturerPartNumber": "RC0402JR-071KL",
      "ProductDescription": "RES SMD 1K OHM 5% 1/16W 0402",
      "QuantityAvailable": 4500000
    }]
  },
  "mouser_1k_0402_5pct": {
    "SearchResults": {
      "Parts": [{
        "ManufacturerPartNumber": "RC0402JR-071KL",
        "Description": "Thick Film Resistors - SMD 1/16watt 1Kohms 5%",
        "AvailabilityInStock": "12000000"
      }]
    }
  }
}
```

## 테스트 실행

```bash
# 전체 테스트
node tests/run-all-tests.js

# 개별 테스트
node tests/test-value-parser.js
node tests/test-package-converter.js
node tests/test-stock-ranker.js
node tests/test-output-formatter.js
node tests/test-integration.js
```

## 테스트 결과 출력 형식
```
[ValueParser] 10/10 tests passed ✓
[PackageConverter] 5/5 tests passed ✓
[StockRanker] 4/4 tests passed ✓
[OutputFormatter] 4/4 tests passed ✓
[Integration] 3/3 tests passed ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 26/26 tests passed ✓
```

실패 시:
```
[ValueParser] FAIL: test_mega_ohm
  Expected: 2200000
  Actual: 2200
  Input: "2.2M 1206 5%"
```
