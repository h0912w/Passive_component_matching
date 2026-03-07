# Skill: Mouser + GLM API 연동

## 개요
Mouser API v2를 사용하여 저항 부품을 검색하고, ZhipuAI GLM API를 사용하여 자연어 입력을 구조화된 데이터로 변환하는 스킬.
PackageListBuilder가 패키지 리스트를 동적으로 추출하는 데에도 Mouser API를 활용한다.

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
- `Description` → Description (패키지 사이즈 추출에도 사용)
- `AvailabilityInStock` → 재고량 (문자열 → 숫자 변환 필요)

---

## 검색 키워드 생성 전략

사용자 입력 `1k 1005 5%`에서 API 검색 키워드를 생성하는 방법:

```javascript
function buildSearchKeyword(parsed) {
  // 저항값을 API 친화적 형태로 변환
  var resistance = formatResistanceForSearch(parsed.resistance_ohms);
  // 패키지는 imperial 사용 (Mouser 기본)
  var pkg = parsed.package_imperial;
  var tolerance = parsed.tolerance_percent + '%';

  return resistance + ' ohm resistor ' + pkg + ' ' + tolerance;
}
// 예: "1k ohm resistor 0402 5%"
```

## PackageListBuilder의 Mouser API 활용

PackageListBuilder는 Mouser API를 통해 실제 판매 중인 SMD 저항의 패키지 사이즈를 동적으로 추출:

```javascript
// 대표 저항 검색으로 패키지 정보 수집
function extractPackagesFromMouser(apiKey, fetchService) {
  // 다양한 패키지의 저항을 검색
  var keywords = ['SMD resistor chip', 'thick film resistor SMD'];
  // 검색 결과의 Description에서 패키지 사이즈 추출
  // 예: "1/16watt 1Kohms 5%" → Description의 0402 패턴 감지
  // MPN에서도 추출: RC0402JR-071KL → 0402
}
```

---

## ZhipuAI GLM API (자연어 파싱용)

### 인증 (Bearer Token)
```
POST https://open.bigmodel.cn/api/paas/v4/chat/completions
Headers:
  Authorization: Bearer {glm_api_key}
  Content-Type: application/json
```

### NlpParser용 요청
```json
{
  "model": "glm-4.7-flash",
  "messages": [
    {
      "role": "system",
      "content": "당신은 전자 부품 전문가입니다. 사용자가 입력한 텍스트에서 저항 부품 정보를 추출하여 JSON으로 반환하세요."
    },
    {
      "role": "user",
      "content": "다음 텍스트에서 저항값(ohm 단위), 패키지 사이즈, 오차(%)를 추출하세요:\n\"1킬로옴 0402 사이즈 5퍼센트 오차\"\n\nJSON 형식: {\"resistance_ohms\": number, \"package\": string, \"tolerance_percent\": number}"
    }
  ],
  "temperature": 0.1
}
```

### 응답에서 추출할 필드
```json
{
  "choices": [
    {
      "message": {
        "content": "{\"resistance_ohms\": 1000, \"package\": \"0402\", \"tolerance_percent\": 5}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": { "total_tokens": 150 }
}
```

핵심:
- `choices[0].message.content` → JSON 문자열 파싱하여 구조화 데이터 추출
- `temperature: 0.1` → 결정적 응답 유도 (파싱 정확도 최대화)
- `glm-4.7-flash` 모델 → 빠른 응답 속도, 비용 효율 (2026-01 출시, 구 glm-4-flash deprecated)

### NlpParser 동작 흐름
```
사용자 입력 → ValueParser 시도 (정규식)
  ├── 성공 → 바로 결과 사용
  └── 실패 → NlpParser(GlmClient) 호출
                ├── GLM에 프롬프트 전송
                ├── JSON 응답 파싱
                ├── 결과 캐싱 (CacheManager, TTL 1h)
                └── 구조화된 결과 반환
```

---

## Rate Limit 대응

### Mouser
- 30 req/min 제한 → 요청 간 2초 간격 유지
- 배치 처리 시 `Utilities.sleep(2000)` 삽입
- CacheManager로 중복 요청 방지
- PackageListBuilder 캐시 TTL: 24시간 (빈번한 호출 방지)

### GLM
- CacheManager로 동일 입력 중복 호출 방지
- 배치 처리 시 순차 호출 (과도한 동시 요청 방지)

## 에러 처리
| HTTP 코드 | 서비스 | 원인 | 대응 |
|-----------|--------|------|------|
| 400 | Mouser/GLM | 잘못된 요청 | 검색 키워드/프롬프트 확인 |
| 401 | Mouser/GLM | 인증 실패 | API 키 확인 |
| 403 | Mouser | 권한 없음 | API 제품 활성화 확인 |
| 429 | Mouser/GLM | Rate limit | 대기 후 재시도 |
| 500+ | Mouser/GLM | 서버 에러 | 3초 후 1회 재시도 |
