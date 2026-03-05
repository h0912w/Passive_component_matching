# Skill: Digikey/Mouser API 연동

## 개요
Digikey API v4와 Mouser API v2를 사용하여 저항 부품을 검색하고, 재고 정보와 부품 상세를 가져오는 스킬.

---

## Digikey API v4

### 인증 (OAuth 2.0 — 2-Legged Flow)
```javascript
function getDigikeyToken(clientId, clientSecret) {
  var response = UrlFetchApp.fetch('https://api.digikey.com/v1/oauth2/token', {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    payload: {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    }
  });
  return JSON.parse(response.getContentText()).access_token;
}
```
- Access Token 유효시간: 30분
- 만료 시 동일 요청으로 재발급
- Token은 CacheManager에 캐싱 (TTL 25분)

### 키워드 검색
```
POST https://api.digikey.com/products/v4/search/keyword
Headers:
  Authorization: Bearer {access_token}
  X-DIGIKEY-Client-Id: {client_id}
  Content-Type: application/json

Body:
{
  "Keywords": "1k ohm resistor 0402 5%",
  "RecordCount": 10,
  "RecordStartPosition": 0,
  "Filters": {
    "CategoryIds": [52]   // 52 = Chip Resistor - Surface Mount
  },
  "SortOptions": {
    "Field": "QuantityAvailable",
    "SortOrder": "Descending"
  }
}
```

### 응답에서 추출할 필드
```json
{
  "Products": [
    {
      "DigiKeyPartNumber": "311-1.00KLRCT-ND",
      "ManufacturerPartNumber": "RC0402FR-071KL",
      "Manufacturer": { "Name": "Yageo" },
      "ProductDescription": "RES SMD 1K OHM 1% 1/16W 0402",
      "QuantityAvailable": 4500000,
      "UnitPrice": 0.01,
      "Parameters": [
        { "ParameterText": "Resistance", "ValueText": "1 kOhms" },
        { "ParameterText": "Tolerance", "ValueText": "±1%" },
        { "ParameterText": "Package / Case", "ValueText": "0402 (1005 Metric)" }
      ]
    }
  ]
}
```

핵심 필드:
- `ManufacturerPartNumber` → 부품명 (MPN)
- `ProductDescription` → Description
- `QuantityAvailable` → 재고량 (StockRanker용)
- `Parameters` → 스펙 확인용

---

## Mouser API v2

### 인증 (API Key)
URL 파라미터로 전달: `?apiKey=YOUR_API_KEY`

### 키워드 검색
```
POST https://api.mouser.com/api/v2/search/keyword?apiKey={api_key}
Content-Type: application/json

Body:
{
  "SearchByKeywordRequest": {
    "keyword": "1k ohm resistor 0402 5%",
    "records": 10,
    "startingRecord": 0,
    "searchOptions": "InStock",
    "searchWithYourSignUpLanguage": "false"
  }
}
```

### 응답에서 추출할 필드
```json
{
  "SearchResults": {
    "Parts": [
      {
        "MouserPartNumber": "603-RC0402JR-071KL",
        "ManufacturerPartNumber": "RC0402JR-071KL",
        "Manufacturer": "Yageo",
        "Description": "Thick Film Resistors - SMD 1/16watt 1Kohms 5%",
        "Availability": "In Stock",
        "AvailabilityInStock": "12000000",
        "PriceBreaks": [
          { "Quantity": 1, "Price": "$0.10" }
        ]
      }
    ]
  }
}
```

핵심 필드:
- `ManufacturerPartNumber` → 부품명 (MPN)
- `Description` → Description
- `AvailabilityInStock` → 재고량 (문자열 → 숫자 변환 필요)

---

## 검색 키워드 생성 전략

사용자 입력 `1k 1005 5%`에서 API 검색 키워드를 생성하는 방법:

```javascript
function buildSearchKeyword(parsed) {
  // 저항값을 API 친화적 형태로 변환
  var resistance = formatResistanceForSearch(parsed.resistance_ohms);
  // 패키지는 imperial 사용 (Digikey/Mouser 기본)
  var pkg = parsed.package_imperial;
  var tolerance = parsed.tolerance_percent + '%';

  return resistance + ' ohm resistor ' + pkg + ' ' + tolerance;
}
// 예: "1k ohm resistor 0402 5%"
```

## Rate Limit 대응

### Digikey
- HTTP 429 수신 시 `Retry-After` 헤더 값만큼 대기 후 재시도
- CacheManager로 중복 요청 방지

### Mouser
- 30 req/min 제한 → 요청 간 2초 간격 유지
- 배치 처리 시 `Utilities.sleep(2000)` 삽입
- CacheManager로 중복 요청 방지

## 에러 처리
| HTTP 코드 | 원인 | 대응 |
|-----------|------|------|
| 400 | 잘못된 요청 | 검색 키워드 확인 |
| 401 | 인증 실패 | 토큰 재발급 (Digikey) / API 키 확인 (Mouser) |
| 403 | 권한 없음 | API 제품 활성화 확인 |
| 429 | Rate limit | 대기 후 재시도 |
| 500+ | 서버 에러 | 3초 후 1회 재시도 |
