# Passive Component Matching Tool

## 프로젝트 개요
회로 설계 시 저항 Value값(예: `1k 1005 5%`)을 입력하면 Digikey/Mouser API를 통해 실제 구매 가능한 부품을 자동 매칭하는 도구.
사용자가 수십 개의 저항 값을 한 번에 붙여넣으면, 실시간 재고가 있는 정확한 부품명과 설명을 테이블로 출력한다.

---

## API 키 발급 방법

### Digikey API 키 발급 (OAuth 2.0)

1. **계정 생성**: https://www.digikey.com/MyDigiKey/Register 에서 MyDigiKey 계정 생성
2. **개발자 포털 접속**: https://developer.digikey.com 에 MyDigiKey 계정으로 로그인
3. **조직 생성**: 개발자 포털에서 "Organization" 생성
4. **앱 생성**: Organization 내에서 새 Application 생성
5. **API 활성화**: Application에서 "Product Information V4" API 활성화
6. **OAuth 설정**: Callback URL을 `https://localhost` 으로 설정
7. **키 확인**: Client ID와 Client Secret이 발급됨 → 안전하게 보관

**인증 흐름 (2-Legged OAuth - 서버용 권장)**:
```
POST https://api.digikey.com/v1/oauth2/token
Content-Type: application/x-www-form-urlencoded

client_id=YOUR_CLIENT_ID
&client_secret=YOUR_CLIENT_SECRET
&grant_type=client_credentials
```
- Access Token 유효시간: 30분
- 만료 시 동일 요청으로 재발급

**주요 엔드포인트**:
- `POST /products/v4/search/keyword` — 키워드로 부품 검색
- `GET /products/v4/search/{digiKeyPartNumber}/productdetails` — 부품 상세 정보

**Rate Limit**: Burst limit (초당) + Daily limit (일일) — 초과 시 HTTP 429

### Mouser API 키 발급 (API Key 방식)

1. **계정 생성**: https://www.mouser.com 에서 계정 생성/로그인
2. **API Hub 접속**: https://www.mouser.com/api-hub/ 방문
3. **Search API 신청**: "Search API" 항목에서 API 키 신청
4. **키 발급**: 신청 완료 후 Part API Key가 발급됨 → 안전하게 보관

**인증 방식**: URL 파라미터로 API Key 전달
```
POST https://api.mouser.com/api/v2/search/keyword?apiKey=YOUR_API_KEY
```

**주요 엔드포인트**:
- `POST /api/v2/search/keyword` — 키워드 검색
- `POST /api/v2/search/partnumber` — 부품번호 검색
- `POST /api/v2/search/keywordandmanufacturer` — 키워드 + 제조사 검색

**Rate Limit**: 30 요청/분, 1000 요청/일

---

## 아키텍처

```
[Blogger 프론트엔드 HTML/CSS/JS]
        │ fetch() / JSONP
        ▼
[Google Apps Script Web App]
        │ UrlFetchApp
        ├──→ Digikey API v4 (OAuth 2.0)
        └──→ Mouser API v2 (API Key)
```

### API를 활용함으로써 얻는 이점
1. **실시간 재고 확인** — 재고 있는 부품만 추천, 재고량 기준 최적 부품 선정
2. **정확한 부품번호** — API가 반환하는 실제 부품번호 사용 (명명규칙 추측 불필요)
3. **부품 Description 제공** — 스펙 요약을 사용자에게 보여줘 더블체크 가능
4. **가격 정보** — 수량별 단가 비교 가능
5. **제조사 다양성** — Yageo 외 모든 제조사의 부품을 검색 가능
6. **데이터 신뢰성** — 부품번호 명명규칙 추측 대신 API의 정확한 데이터 사용

---

## 파일 구조

```
Passive_component_matching/
├── CLAUDE.md                          # 이 파일
├── .claude/
│   └── skills/
│       ├── resistor-parsing.md        # 저항값 파싱 스킬
│       ├── api-integration.md         # Digikey/Mouser API 연동 스킬
│       ├── blogger-frontend.md        # Blogger 프론트엔드 스킬
│       └── testing.md                 # 테스트 스킬
├── apps-script/
│   ├── Code.gs                        # 메인 엔트리포인트 (doGet/doPost)
│   ├── ValueParser.gs                 # 에이전트1: 저항값 파서
│   ├── PackageConverter.gs            # 에이전트2: 패키지 변환 (metric↔imperial)
│   ├── DigikeyClient.gs              # 에이전트3: Digikey API 클라이언트
│   ├── MouserClient.gs               # 에이전트4: Mouser API 클라이언트
│   ├── StockRanker.gs                # 에이전트5: 재고 기반 최적 부품 선정
│   ├── OutputFormatter.gs             # 에이전트6: 6열 테이블 출력 포맷팅
│   ├── CacheManager.gs               # 에이전트7: API 응답 캐싱
│   ├── ErrorHandler.gs               # 에이전트8: 에러 핸들링 & 로깅
│   ├── Config.gs                      # API 키 설정
│   └── appsscript.json               # Apps Script 매니페스트
├── blogger/
│   └── resistor-tool.html             # Blogger 삽입용 HTML/CSS/JS
├── tests/
│   ├── test-value-parser.js           # ValueParser 테스트
│   ├── test-package-converter.js      # PackageConverter 테스트
│   ├── test-stock-ranker.js           # StockRanker 테스트
│   ├── test-output-formatter.js       # OutputFormatter 테스트
│   ├── test-integration.js            # 통합 테스트
│   ├── mock-api-responses.json        # Digikey/Mouser mock 응답
│   └── run-all-tests.js              # 전체 테스트 실행기
└── docs/
    └── package-size-table.md          # 패키지 크기 변환표
```

---

## 서브에이전트 설계

### 에이전트 1: ValueParser — 저항값 파서
**파일**: `apps-script/ValueParser.gs`

입력 문자열에서 저항값, 패키지, 오차를 추출.

**파싱 전략**:
- **구분자 분리**: 공백 ` `, 슬래시 `/`, 언더바 `_`, 탭으로 토큰 분리
- **저항값 감지**: `R`, `k`, `K`, `M` 단위가 포함된 토큰
  - `1k` → 1000Ω, `4.7k` → 4700Ω, `100R` → 100Ω, `2.2M` → 2200000Ω
  - `4R7` → 4.7Ω (단위가 소수점 역할), `1k5` → 1500Ω
- **패키지 감지**: 사전 정의된 패키지 목록과 매칭
- **오차 감지**: `%` 포함 토큰 → `1%`, `5%`, `0.1%` 등
- **순서 무관**: 3개 토큰의 타입을 자동 감지하므로 입력 순서 불문

**사전 정의 패키지 목록** (모든 SMD 저항 패키지):
```
Metric:  0402, 0603, 1005, 1608, 2012, 2512, 3216, 3225, 4516, 4532, 5025, 6332
Imperial: 01005, 0201, 0402, 0603, 0805, 1206, 1210, 1806, 1812, 2010, 2512
```

### 에이전트 2: PackageConverter — 패키지 변환
**파일**: `apps-script/PackageConverter.gs`

Metric ↔ Imperial 양방향 변환. API 검색 시 Imperial 사이즈가 필요한 경우 자동 변환.

### 에이전트 3: DigikeyClient — Digikey API 클라이언트
**파일**: `apps-script/DigikeyClient.gs`

- OAuth 2.0 토큰 관리 (발급/갱신)
- `POST /products/v4/search/keyword` 호출
- 응답에서 부품번호, description, 재고량 추출
- Rate limit 대응 (429 시 자동 재시도)

### 에이전트 4: MouserClient — Mouser API 클라이언트
**파일**: `apps-script/MouserClient.gs`

- API Key 기반 인증
- `POST /api/v2/search/keyword` 호출
- 응답에서 부품번호, description, 재고량 추출
- Rate limit 대응 (30 req/min)

### 에이전트 5: StockRanker — 재고 기반 최적 부품 선정
**파일**: `apps-script/StockRanker.gs`

- Digikey + Mouser 검색 결과 병합
- 스펙 일치 여부 필터링 (저항값, 패키지, 오차)
- 재고량 기준 내림차순 정렬
- 재고가 가장 많은 부품 1개 선정
- 재고 0인 부품 제외

### 에이전트 6: OutputFormatter — 6열 테이블 출력
**파일**: `apps-script/OutputFormatter.gs`

**출력 형식 (6열)**:
| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |
|-----------|------------|------------|----------|-------------|-------------|
| 1k 1005 5% | 1kΩ | 0402 (1005) | 5% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |
| 10k/0603/1% | 10kΩ | 0603 (1608) | 1% | RC0603FR-0710KL | RES SMD 10K OHM 1% 1/10W 0603 |

- 부품번호만 엔터 구분으로 복사할 수 있는 버튼도 제공
- 파싱 실패 항목은 에러 메시지와 함께 빨간색으로 표시

### 에이전트 7: CacheManager — API 응답 캐싱
**파일**: `apps-script/CacheManager.gs`

- `CacheService.getScriptCache()` 활용
- 키: `digikey_{resistance}_{package}_{tolerance}` 또는 `mouser_...`
- TTL: 1시간 (재고 신선도 유지)
- API rate limit 보호 효과

### 에이전트 8: ErrorHandler — 에러 핸들링
**파일**: `apps-script/ErrorHandler.gs`

- 파싱 실패: "입력 형식을 확인하세요: {원본 입력}"
- API 에러: HTTP 상태코드별 메시지 (401=키 만료, 429=요청 과다, 500=서버 에러)
- 타임아웃: Apps Script 61초 제한 대응
- 부분 실패: 성공한 항목은 정상 출력, 실패 항목만 에러 표시

---

## 구현 순서

### Phase 1: 기반 (현재 — 계획 문서)
- [x] CLAUDE.md 생성
- [x] Skills 문서 생성
- [ ] README.md 삭제

### Phase 2: 핵심 파싱
- [ ] PackageConverter.gs
- [ ] ValueParser.gs
- [ ] 테스트 작성 및 통과

### Phase 3: API 클라이언트
- [ ] Config.gs (API 키 템플릿)
- [ ] DigikeyClient.gs
- [ ] MouserClient.gs
- [ ] CacheManager.gs
- [ ] 테스트 작성 및 통과

### Phase 4: 비즈니스 로직
- [ ] StockRanker.gs
- [ ] OutputFormatter.gs (6열 포맷)
- [ ] ErrorHandler.gs
- [ ] Code.gs (엔트리포인트)
- [ ] 통합 테스트

### Phase 5: 프론트엔드
- [ ] blogger/resistor-tool.html
- [ ] appsscript.json

---

## 테스트 방법

```bash
# 전체 테스트 실행
node tests/run-all-tests.js

# 개별 테스트
node tests/test-value-parser.js
node tests/test-package-converter.js
```

- 모든 코드는 Node.js에서 직접 실행 가능한 순수 JavaScript
- Apps Script 전용 API(`UrlFetchApp`, `CacheService`)는 tests/ 내 mock으로 대체
- `blogger/resistor-tool.html`은 브라우저에서 직접 열어 확인

---

## 개발 규칙

- Apps Script(.gs) 코드는 Node.js에서도 테스트 가능하도록 순수 함수로 작성
- 외부 의존성(UrlFetchApp 등)은 함수 파라미터로 주입 (DI 패턴)
- 모든 변경 후 `node tests/run-all-tests.js` 실행하여 테스트 통과 확인
- 커밋 전 테스트 통과 필수
