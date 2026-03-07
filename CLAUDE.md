# Passive Component Matching Tool

> **⚠️ 세션 시작 시 반드시 실행 (브랜치 혼동 방지)**:
> git fetch --all --prune && git branch -a
> 시스템이 자동 할당한 세션 브랜치와 실제 작업 브랜치가 다를 수 있음.
> 반드시 기존 작업 브랜치(claude/resistor-lookup-tool-2ewOv)를 확인하고 그 위에서 작업할 것.


> **새 채팅에서 이 프로젝트를 이어받는 경우**:
> `docs/session-context.md` 를 먼저 읽으세요. 지금까지의 결정 사항, 현재 진행 상태, 다음 할 일이 정리되어 있습니다.

> **⚠️ 푸시 전 필수 절차 (반드시 지킬 것)**:
> 1. `docs/session-context.md`를 현재 세션 내용으로 업데이트한다 (결정사항, 진행상태, 다음 할 일).
> 2. 작업 브랜치에 커밋한 뒤, **main에도 force push**하여 항상 최신 상태를 유지한다:
>    ```
>    git push -u origin <작업브랜치>
>    git push origin HEAD:main --force
>    ```
> 3. 대화 이력 없이 코드만 푸시하는 것은 금지. session-context.md 업데이트가 선행되어야 한다.

## 프로젝트 개요
회로 설계 시 저항 Value값(예: `1k 1005 5%`)을 입력하면 Mouser API를 통해 실제 구매 가능한 부품을 자동 매칭하는 도구.
사용자가 수십 개의 저항 값을 한 번에 붙여넣으면, 실시간 재고가 있는 정확한 부품명과 설명을 테이블로 출력한다.

---

## API 키 발급 방법

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

### ZhipuAI GLM API 키 발급

1. **계정 생성**: https://open.bigmodel.cn 에서 계정 생성/로그인
2. **API 키 발급**: 콘솔 > API Keys 에서 새 키 생성
3. **키 발급**: 생성된 API Key를 안전하게 보관

**인증 방식**: Bearer Token
```
POST https://open.bigmodel.cn/api/paas/v4/chat/completions
Headers:
  Authorization: Bearer YOUR_GLM_API_KEY
  Content-Type: application/json
```

**사용 모델**: `glm-4-flash` (빠른 응답, 비용 효율)

**용도**: 사용자 자연어 입력을 구조화된 저항값/패키지/오차로 변환 (NlpParser 에이전트)

---

## Apps Script 프로젝트 생성 및 배포 전체 절차

> Apps Script를 처음 설정할 때 한 번만 수행하면 됩니다.

### Step 1: Apps Script 프로젝트 생성

1. https://script.google.com 접속 (Google 계정 로그인)
2. 좌측 상단 **"새 프로젝트"** 클릭
3. 프로젝트 이름 변경: 상단 "제목 없는 프로젝트" 클릭 → `Passive Component Matching Tool` 입력

### Step 2: 소스 파일 추가

Apps Script 에디터에서 아래 파일들을 순서대로 생성한다.
파일 추가: 좌측 파일 목록 옆 **`+`** 버튼 → "스크립트"

생성할 파일 목록 (`apps-script/` 디렉토리의 `.gs` 파일들):
```
Config.gs
PackageListBuilder.gs
PackageConverter.gs
ValueParser.gs
NlpParser.gs
MouserClient.gs
GlmClient.gs
StockRanker.gs
OutputFormatter.gs
ErrorHandler.gs
CacheManager.gs
Code.gs
```

각 파일 생성 후 GitHub의 `apps-script/` 폴더에 있는 동일 파일 내용을 붙여넣기.

> **팁**: `clasp` CLI를 사용하면 push 명령으로 자동 업로드 가능 (아래 Step 6 참고)

### Step 3: API 키 등록 (스크립트 속성)

> **보안 핵심**: 키는 코드가 아닌 스크립트 속성에만 저장. Git에 절대 올라가지 않음.

1. Apps Script 에디터 좌측 **⚙️ 프로젝트 설정** 클릭
2. 스크롤 내려 **"스크립트 속성"** 섹션 찾기
3. **"속성 추가"** 버튼 클릭 후 아래 항목 등록:

| 속성 이름 | 값 | 비고 |
|-----------|-----|------|
| `MOUSER_API_KEY` | `발급받은 Mouser API 키` | 현재 보유 중 |
| `GLM_API_KEY` | `발급받은 ZhipuAI GLM API 키` | NlpParser용 |

4. **"스크립트 속성 저장"** 클릭

코드에서는 `Config.gs`가 자동으로 읽어옴:
```javascript
// 직접 키를 쓰지 않음 — PropertiesService로 안전하게 조회
PropertiesService.getScriptProperties().getProperty('MOUSER_API_KEY')
```

### Step 4: 웹 앱으로 배포

1. 에디터 우측 상단 **"배포"** → **"새 배포"** 클릭
2. 유형 선택: **"웹 앱"**
3. 설정:
   - 설명: `v1`
   - 다음 사용자로 실행: **나** (본인 Google 계정)
   - 액세스 권한: **모든 사용자** (Blogger에서 누구나 호출 가능하게)
4. **"배포"** 클릭
5. Google 계정 권한 승인 화면 → 승인
6. **웹 앱 URL** 복사 → `blogger/resistor-tool.html`의 `APPS_SCRIPT_URL` 변수에 붙여넣기

웹 앱 URL 형식:
```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

### Step 5: 배포 업데이트 (코드 수정 시)

소스코드를 수정할 때마다:
1. **"배포"** → **"배포 관리"** 클릭
2. 기존 배포 옆 ✏️ 편집 아이콘 클릭
3. 버전: **"새 버전"** 선택
4. **"배포"** 클릭

### Step 6: clasp CLI로 자동 업로드 (선택사항)

코드를 에디터에 일일이 붙여넣는 대신 CLI로 자동 업로드:

```bash
# clasp 설치
npm install -g @google/clasp

# Google 계정 로그인
clasp login

# 기존 Apps Script 프로젝트에 연결 (Script ID는 에디터 URL에서 확인)
cd apps-script/
clasp clone {SCRIPT_ID}

# 코드 업로드
clasp push

# 배포
clasp deploy --description "v2"
```

Script ID 확인: Apps Script 에디터 URL
```
https://script.google.com/home/projects/{SCRIPT_ID}/edit
```

---

## API 키 보안 관리

> **절대 규칙**: API 키를 소스코드나 Git에 절대 커밋하지 않는다.

### 키 저장 위치 요약

| 환경 | 저장 방법 | Git 포함 여부 |
|------|----------|--------------|
| **Apps Script (배포)** | 에디터 > 프로젝트 설정 > 스크립트 속성 | ❌ 포함 안 됨 |
| **로컬 Node.js 테스트** | `.env` 파일 | ❌ `.gitignore`로 차단 |
| **GitHub Actions (CI)** | Repository Secrets | ❌ 암호화 저장, 로그에 마스킹 |
| **GitHub 소스코드** | 키 없음 — 읽기 함수만 존재 | ✅ 안전 |

### 로컬 테스트용 .env 설정

```bash
# .env.example을 복사해서 .env 생성 (Git에 커밋하지 말 것)
cp .env.example .env

# .env 파일에 실제 키 입력
MOUSER_API_KEY=실제키입력
GLM_API_KEY=실제키입력
```

### GitHub Actions Secrets 설정 (CI 자동 테스트용)

> push할 때마다 GitHub Actions가 mock + live 테스트를 자동 실행한다.

1. GitHub 리포지토리 → **Settings** → **Secrets and variables** → **Actions**
2. **"New repository secret"** 클릭 후 아래 항목 등록:

| Secret 이름 | 값 |
|-------------|-----|
| `MOUSER_API_KEY` | 발급받은 Mouser API 키 |
| `GLM_API_KEY` | 발급받은 ZhipuAI GLM API 키 |

워크플로우 흐름:
```
git push → Tier 1 (mock 테스트) → 통과 → Tier 2 (live API 테스트, Secrets 키 사용)
                                → 실패 → Tier 2 스킵
```

- Secrets는 암호화 저장되며 로그에 `***`로 마스킹됨
- PR에서는 외부 기여자의 Secrets 접근을 방지하기 위해 live 테스트를 스킵
- 실패 시 `tests/feedback/last-failure.json`이 Artifact로 업로드됨

---

## 아키텍처

```
[Blogger 프론트엔드 HTML/CSS/JS]
        │ fetch() / JSONP
        ▼
[Google Apps Script Web App]
        │ UrlFetchApp
        ├──→ Mouser API v2 (API Key)
        └──→ ZhipuAI GLM API (Bearer Token) — 자연어 파싱
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
├── .github/
│   └── workflows/
│       └── test.yml                   # GitHub Actions CI (mock + live 자동 테스트)
├── .claude/
│   └── skills/
│       ├── resistor-parsing.md        # 저항값 파싱 스킬
│       ├── api-integration.md         # Mouser API 연동 스킬
│       ├── blogger-frontend.md        # Blogger 프론트엔드 스킬
│       └── testing.md                 # 테스트 스킬
├── apps-script/
│   ├── Code.gs                        # 메인 엔트리포인트 (doGet/doPost)
│   ├── ValueParser.gs                 # 에이전트1: 저항값 파서 (정규식 기반)
│   ├── NlpParser.gs                   # 에이전트2: 자연어 파서 (GLM API 기반)
│   ├── PackageListBuilder.gs          # 에이전트3: Mouser API로 패키지 리스트 추출/정리
│   ├── PackageConverter.gs            # 에이전트4: 패키지 변환 (metric↔imperial)
│   ├── MouserClient.gs               # 에이전트5: Mouser API 클라이언트
│   ├── GlmClient.gs                   # 에이전트6: ZhipuAI GLM API 클라이언트
│   ├── StockRanker.gs                # 에이전트7: 재고 기반 최적 부품 선정
│   ├── OutputFormatter.gs             # 에이전트8: 6열 테이블 출력 포맷팅
│   ├── CacheManager.gs               # 에이전트9: API 응답 캐싱
│   ├── ErrorHandler.gs               # 에이전트10: 에러 핸들링 & 로깅
│   ├── Config.gs                      # API 키 설정
│   └── appsscript.json               # Apps Script 매니페스트
├── blogger/
│   └── resistor-tool.html             # Blogger 삽입용 HTML/CSS/JS
├── tests/
│   ├── run-all-tests.js              # 에이전트12: 전체 테스트 실행 + 피드백 생성
│   ├── test-value-parser.js           # ValueParser 단위 테스트 (✅ 완전 자동)
│   ├── test-package-converter.js      # PackageConverter 단위 테스트 (✅ 완전 자동)
│   ├── test-stock-ranker.js           # StockRanker 단위 테스트 (✅ 완전 자동)
│   ├── test-output-formatter.js       # OutputFormatter 단위 테스트 (✅ 완전 자동)
│   ├── test-error-handler.js          # ErrorHandler 단위 테스트 (✅ 완전 자동)
│   ├── test-config.js                 # Config 테스트 (⚠️ mock PropertiesService)
│   ├── test-cache-manager.js          # CacheManager 테스트 (⚠️ mock CacheService)
│   ├── test-mouser-client.js          # MouserClient 테스트 (⚠️ mock HTTP)
│   ├── test-glm-client.js             # GlmClient 테스트 (⚠️ mock HTTP)
│   ├── test-nlp-parser.js             # NlpParser 테스트 (⚠️ mock GLM)
│   ├── test-package-list-builder.js   # PackageListBuilder 테스트 (⚠️ mock HTTP)
│   ├── test-integration.js            # 전체 파이프라인 통합 테스트 (mock API)
│   ├── test-mouser-live.js            # Mouser 실제 API 호출 테스트 (--live 전용)
│   ├── test-glm-live.js               # GLM 실제 API 호출 테스트 (--live 전용)
│   ├── test-random-validation.js      # GLM 랜덤 저항값 E2E 검증 + 리포트 생성 (--live 전용)
│   ├── mocks/
│   │   ├── apps-script-mocks.js       # PropertiesService, CacheService, UrlFetchApp mock
│   │   └── api-responses.json         # Mouser mock 응답 데이터
│   ├── reports/                       # 랜덤 검증 리포트 (타임스탬프별 자동 생성)
│   │   └── validation-YYYY-MM-DDTHH-MM-SS.md
│   └── feedback/
│       └── last-failure.json          # 마지막 실패 정보 (피드백 루프용)
├── docs/
│   ├── package-size-table.md          # 패키지 크기 변환표
│   ├── session-context.md             # 세션 이력 & 현재 상태 (새 채팅창 필독)
│   └── test-report.md                 # 테스트 결과 종합 리포트 (Tier 1/2)
├── .env.example                       # API 키 템플릿 (실제 값 없음, Git 포함)
├── .gitignore                         # .env, node_modules 차단
└── package.json                       # npm test / npm run test:live
```

---

## 테스트 가능성 분석 (TestRunner 에이전트 설계 전제)

> 서브에이전트를 추가하기 전에, **현재 구조에서 테스트가 실제로 가능한지** 파일별로 분석한다.

### 핵심 전제: Apps Script ≠ Node.js

`.gs` 파일은 Google V8 샌드박스에서 실행되며, `UrlFetchApp`, `CacheService`, `PropertiesService` 같은 Apps Script 전용 전역 객체를 사용한다. Node.js에는 이 객체들이 존재하지 않는다.

따라서 **모든 `.gs` 파일은 다음 2가지 패턴을 반드시 준수해야만 Node.js에서 테스트 가능하다**:

**패턴 A — 외부 의존성 없는 순수 함수 (가장 이상적)**
```javascript
// Apps Script API를 전혀 쓰지 않음 → 바로 테스트 가능
function parseValue(input) { /* 순수 JS만 사용 */ }
```

**패턴 B — DI(의존성 주입) 패턴**
```javascript
// Apps Script 환경: 인자 없이 호출 → 전역 객체 사용
function searchMouser(keyword) {
  return _searchMouser(keyword, UrlFetchApp, CacheService);
}
// 실제 로직: 인자로 주입받은 객체 사용 → Node.js 테스트 가능
function _searchMouser(keyword, fetchService, cacheService) { ... }
```

**패턴 C — 파일 하단 조건부 export**
```javascript
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseValue, _searchMouser };
}
```

### 파일별 테스트 가능성

| 파일 | 테스트 레벨 | 이유 | Node.js 실행 |
|------|------------|------|-------------|
| `ValueParser.gs` | ✅ **완전 테스트 가능** | Apps Script API 미사용, 순수 파싱 로직 | 바로 가능 |
| `PackageConverter.gs` | ✅ **완전 테스트 가능** | 변환 테이블 룩업, 순수 함수 | 바로 가능 |
| `OutputFormatter.gs` | ✅ **완전 테스트 가능** | 데이터 변환 로직만, 외부 의존 없음 | 바로 가능 |
| `StockRanker.gs` | ✅ **완전 테스트 가능** | 정렬/필터 로직만, 외부 의존 없음 | 바로 가능 |
| `ErrorHandler.gs` | ✅ **완전 테스트 가능** | 에러 메시지 생성 로직만 | 바로 가능 |
| `Config.gs` | ⚠️ **DI 필요** | `PropertiesService` 사용 → mock 주입으로 테스트 | mock 필요 |
| `CacheManager.gs` | ⚠️ **DI 필요** | `CacheService` 사용 → mock 주입으로 테스트 | mock 필요 |
| `MouserClient.gs` | ⚠️ **DI + Mock 필요** | `UrlFetchApp` 사용 → mock 응답으로 로직 테스트 | mock HTTP 필요 |
| `GlmClient.gs` | ⚠️ **DI + Mock 필요** | `UrlFetchApp` 사용 → mock 응답으로 로직 테스트 | mock HTTP 필요 |
| `NlpParser.gs` | ⚠️ **DI + Mock 필요** | `GlmClient` 사용 → mock GLM 응답으로 파싱 로직 테스트 | mock 필요 |
| `PackageListBuilder.gs` | ⚠️ **DI + Mock 필요** | `MouserClient` + `CacheService` 사용 → mock으로 테스트 | mock HTTP 필요 |
| `Code.gs` | ⚠️ **간접 테스트** | `ContentService` 사용, 엔트리포인트 → 하위 함수를 통합 테스트 | 통합 테스트 |

### 테스트 불가 영역 (설계적 한계)

- **Apps Script 배포 후 동작**: `doGet()`, `ContentService` 등 배포 환경 전용 동작은 실제 Apps Script 에디터의 "실행" 버튼으로만 확인 가능.
- **Blogger iframe 연동**: 브라우저에서 직접 확인 필요.

### 결론: TestRunner 에이전트의 실제 테스트 범위

```
Node.js 자동 검증 — Tier 1 (mock)  │  Node.js 자동 검증 — Tier 2 (live)  │  수동 확인 필요
────────────────────────────────────┼──────────────────────────────────────┼──────────────────
ValueParser 파싱 정확도             │  실제 Mouser API 응답 구조           │  Apps Script doGet() 동작
NlpParser 자연어 파싱 (mock GLM)   │  실제 Mouser 키워드 검색 응답        │  Blogger iframe 연동
PackageConverter 변환 정확도        │  실제 GLM API 자연어 파싱            │
PackageListBuilder 패키지 추출      │  (npm run test:live, .env 키 필요)   │
StockRanker 재고 선정 로직          │                                      │
OutputFormatter 6열 포맷            │                                      │
ErrorHandler 메시지 생성            │                                      │
Config/Cache/Client DI 로직 (mock)  │                                      │
전체 파이프라인 통합 테스트 (mock)  │                                      │
```

> **Tier 2 구현 방법**: live 테스트 파일(`test-mouser-live.js`, `test-glm-live.js`)은 Apps Script의 `UrlFetchApp` 대신 Node.js 내장 `https` 모듈을 직접 사용하여 실제 API 서버에 HTTP 요청을 보낸다. `.env` 파일의 키를 `dotenv`로 로딩해 인증한다.

---

## 서브에이전트 설계

### 에이전트 1: ValueParser — 저항값 파서 (정규식 기반)
**파일**: `apps-script/ValueParser.gs`

입력 문자열에서 정규식 기반으로 저항값, 패키지, 오차를 추출. 구조화된 입력(`1k 1005 5%`)에 최적화.

**파싱 전략**:
- **구분자 분리**: 공백 ` `, 슬래시 `/`, 언더바 `_`, 탭으로 토큰 분리
- **저항값 감지**: `R`, `k`, `K`, `M` 단위가 포함된 토큰
  - `1k` → 1000Ω, `4.7k` → 4700Ω, `100R` → 100Ω, `2.2M` → 2200000Ω
  - `4R7` → 4.7Ω (단위가 소수점 역할), `1k5` → 1500Ω
- **패키지 감지**: PackageListBuilder가 제공하는 패키지 목록과 매칭
- **오차 감지**: `%` 포함 토큰 → `1%`, `5%`, `0.1%` 등
- **순서 무관**: 3개 토큰의 타입을 자동 감지하므로 입력 순서 불문

**패키지 목록 소스**: PackageListBuilder 에이전트가 Mouser API를 통해 동적으로 추출한 패키지 리스트를 사용.

### 에이전트 2: NlpParser — 자연어 파서 (GLM API 기반)
**파일**: `apps-script/NlpParser.gs`

ValueParser가 파싱에 실패하거나 자유 형식 입력일 때, ZhipuAI GLM API를 통해 자연어를 구조화된 데이터로 변환하는 에이전트.

**역할**:
- ValueParser 실패 시 폴백으로 동작
- 자유 형식 텍스트를 구조화된 JSON으로 변환
- GLM에게 프롬프트를 보내 저항값/패키지/오차 추출

**동작 흐름**:
```
사용자 입력 → ValueParser 시도
  ├── 성공 → 정규식 파싱 결과 사용
  └── 실패 → NlpParser 호출
                ├── GlmClient로 GLM API 호출
                ├── 프롬프트: "다음 텍스트에서 저항값, 패키지, 오차를 추출하세요"
                ├── GLM 응답 JSON 파싱
                └── 구조화된 결과 반환
```

**GLM 프롬프트 예시**:
```
다음 텍스트에서 저항 부품 정보를 추출하여 JSON으로 반환하세요.
- resistance_ohms: 저항값 (숫자, 단위: ohm)
- package: 패키지 사이즈 (예: 0402, 0603, 0805)
- tolerance_percent: 오차 (숫자)

입력: "1킬로옴 0402 사이즈 5퍼센트 오차"
출력: {"resistance_ohms": 1000, "package": "0402", "tolerance_percent": 5}
```

**처리 가능한 자연어 입력 예시**:
- `"1킬로옴 0402 5퍼센트"` → 정규식 파싱 불가 → GLM이 처리
- `"0805 사이즈 10k 저항 1% 오차"` → 혼합 형식 → GLM이 처리
- `"칩저항 100옴 0603"` → GLM이 처리

**캐싱**: 동일 입력에 대한 GLM 응답을 CacheManager로 캐싱 (API 비용 절감)

### 에이전트 3: PackageListBuilder — 패키지 리스트 동적 추출
**파일**: `apps-script/PackageListBuilder.gs`

Mouser API를 호출하여 실제 판매 중인 SMD 저항의 패키지 사이즈 목록을 추출하고 정리하는 에이전트.

**역할**:
1. Mouser API로 SMD Chip Resistor 카테고리 검색
2. 검색 결과에서 패키지 사이즈 정보 추출 (Description, 부품번호 패턴 등에서)
3. Metric ↔ Imperial 매핑 테이블 구축
4. 추출된 패키지 리스트를 CacheManager를 통해 캐싱 (TTL 24시간)
5. ValueParser에게 패키지 매칭용 리스트 제공

**동작 흐름**:
```
PackageListBuilder.getPackageList()
  ├── CacheManager에서 캐시 확인
  ├── 캐시 없으면 → Mouser API 호출 (대표 저항 검색)
  ├── 응답에서 패키지 사이즈 추출 & 정규화
  ├── Metric/Imperial 양방향 매핑 생성
  ├── CacheManager에 저장 (TTL 24h)
  └── 정리된 패키지 리스트 반환
```

**반환 형식**:
```javascript
{
  packages: ['0201', '0402', '0603', '0805', '1206', ...],  // Imperial 기준
  metricToImperial: { '0603': '0201', '1005': '0402', ... },
  imperialToMetric: { '0201': '0603', '0402': '1005', ... }
}
```

**이점**:
- 하드코딩 대신 Mouser 실제 데이터 기반 → 새 패키지 자동 반영
- 캐싱으로 API 호출 최소화 (24시간 유효)
- PackageConverter와 연동하여 변환 테이블 동적 갱신

### 에이전트 4: PackageConverter — 패키지 변환
**파일**: `apps-script/PackageConverter.gs`

Metric ↔ Imperial 양방향 변환. PackageListBuilder가 제공하는 매핑 테이블 활용.
API 검색 시 Imperial 사이즈가 필요한 경우 자동 변환.
PackageListBuilder 캐시 미스 시에는 기본 하드코딩 테이블을 폴백으로 사용.

### 에이전트 5: MouserClient — Mouser API 클라이언트
**파일**: `apps-script/MouserClient.gs`

- API Key 기반 인증
- `POST /api/v2/search/keyword` 호출
- 응답에서 부품번호, description, 재고량 추출
- Rate limit 대응 (30 req/min)
- PackageListBuilder와 StockRanker 모두에서 사용

### 에이전트 6: GlmClient — ZhipuAI GLM API 클라이언트
**파일**: `apps-script/GlmClient.gs`

- Bearer Token 인증 (GLM_API_KEY)
- `POST /api/paas/v4/chat/completions` 호출
- NlpParser가 사용하는 저수준 API 클라이언트
- 요청/응답 JSON 처리
- 에러 핸들링 (인증 실패, 타임아웃, rate limit)

### 에이전트 7: StockRanker — 재고 기반 최적 부품 선정
**파일**: `apps-script/StockRanker.gs`

- Mouser 검색 결과에서 스펙 일치 여부 필터링 (저항값, 패키지, 오차)
- 재고량 기준 내림차순 정렬
- 재고가 가장 많은 부품 1개 선정
- 재고 0인 부품 제외

### 에이전트 8: OutputFormatter — 6열 테이블 출력
**파일**: `apps-script/OutputFormatter.gs`

**출력 형식 (6열)**:
| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |
|-----------|------------|------------|----------|-------------|-------------|
| 1k 1005 5% | 1kΩ | 0402 (1005) | 5% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |
| 10k/0603/1% | 10kΩ | 0603 (1608) | 1% | RC0603FR-0710KL | RES SMD 10K OHM 1% 1/10W 0603 |

- 부품번호만 엔터 구분으로 복사할 수 있는 버튼도 제공
- 파싱 실패 항목은 에러 메시지와 함께 빨간색으로 표시

### 에이전트 9: CacheManager — API 응답 캐싱
**파일**: `apps-script/CacheManager.gs`

- `CacheService.getScriptCache()` 활용
- 키: `mouser_{resistance}_{package}_{tolerance}`, `packagelist_...`, `nlp_{input_hash}`
- TTL: 1시간 (재고 신선도 유지)
- API rate limit 보호 효과

### 에이전트 10: ErrorHandler — 에러 핸들링 & 로깅
**파일**: `apps-script/ErrorHandler.gs`

- 파싱 실패: "입력 형식을 확인하세요: {원본 입력}"
- API 에러: HTTP 상태코드별 메시지 (401=키 만료, 429=요청 과다, 500=서버 에러)
- 타임아웃: Apps Script 61초 제한 대응
- 부분 실패: 성공한 항목은 정상 출력, 실패 항목만 에러 표시

### 에이전트 11: PackageListBuilder 캐시 갱신 (Code.gs에서 트리거)

Code.gs의 `doGet()` 최초 호출 시 또는 캐시 만료 시 PackageListBuilder를 자동 실행하여 패키지 리스트를 갱신. 이후 요청에서는 캐시된 리스트를 사용.

### 에이전트 12: TestRunner — 자동 테스트 & 피드백 루프
**파일**: `tests/run-all-tests.js` (실행기) + `tests/test-*.js` (각 테스트)

코드 작성 후 모든 테스트를 자동 실행하고, 실패 시 담당 에이전트에게 구조화된 피드백을 전달하여 수정하게 만드는 품질 보증 에이전트.

**역할**:
1. `node tests/run-all-tests.js` 실행
2. 실패한 테스트 감지
3. 실패 정보를 구조화된 형태로 캡처
4. 담당 에이전트(코딩한 에이전트)에게 피드백 전달
5. 수정 후 해당 테스트만 재실행
6. 전체 통과 확인 후 완료

**피드백 메시지 형식** (TestRunner → 담당 에이전트):
```
[FAIL] ValueParser.gs 수정 요청

실패한 테스트: test_mega_ohm
담당 파일: apps-script/ValueParser.gs
담당 함수: parseResistanceValue()

입력값:    "2.2M 1206 5%"
기대 출력: { resistance_ohms: 2200000, package_input: "1206", tolerance_percent: 5 }
실제 출력: { resistance_ohms: 2200, package_input: "1206", tolerance_percent: 5 }

분석: M 승수 처리 시 ×1000 대신 ×1을 적용한 것으로 보임.
parseResistanceValue() 내 'M' 케이스의 승수 값을 확인하세요.
```

**피드백 루프 흐름**:
```
CodingAgent → 코드 작성
     ↓
TestRunner → node tests/run-all-tests.js 실행
     ↓ 실패 감지
TestRunner → 실패 정보 구조화 (파일, 함수, 입력, 기대값, 실제값)
     ↓
CodingAgent → 피드백 기반으로 해당 파일 수정
     ↓
TestRunner → 해당 테스트만 재실행 (빠른 피드백 루프)
     ↓ 통과
TestRunner → 전체 테스트 재실행으로 회귀 확인
     ↓ 전체 통과
완료
```

**최대 피드백 횟수**: 3회. 3회 이후에도 실패 시 → 사람에게 에스컬레이션.

---

## 구현 순서

### Phase 1: 기반 (현재 — 계획 문서)
- [x] CLAUDE.md 생성
- [x] Skills 문서 생성
- [x] README.md 삭제

### Phase 2: 핵심 파싱
- [ ] PackageConverter.gs
- [ ] ValueParser.gs
- [ ] 테스트 작성 및 통과

### Phase 3: API 클라이언트 + 패키지 리스트
- [ ] Config.gs (API 키 템플릿 — Mouser + GLM)
- [ ] MouserClient.gs
- [ ] GlmClient.gs (ZhipuAI GLM API 클라이언트)
- [ ] CacheManager.gs
- [ ] PackageListBuilder.gs (Mouser API로 패키지 리스트 동적 추출)
- [ ] 테스트 작성 및 통과

### Phase 3.5: 자연어 파서
- [ ] NlpParser.gs (GLM 기반 자연어 → 구조화 데이터 변환)
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
# 최초 1회: 의존성 설치
npm install

# Tier 1: mock 테스트 전체 실행 (API 키 불필요)
npm test
# 또는: node tests/run-all-tests.js

# Tier 2: 실제 API 호출 포함 (.env에 키 필요)
npm run test:live
# 또는: node tests/run-all-tests.js --live

# 개별 파일 테스트
node tests/test-value-parser.js
node tests/test-package-converter.js
node tests/test-stock-ranker.js
node tests/test-output-formatter.js
node tests/test-integration.js

# 실제 API만 단독 실행
node tests/test-mouser-live.js
node tests/test-glm-live.js

# 랜덤 검증 (GLM으로 랜덤 입력 생성 → Mouser 실제 검색 → 리포트 저장)
node tests/test-random-validation.js

# 실패 시 피드백 파일 확인
cat tests/feedback/last-failure.json

# 검증 리포트 확인
ls tests/reports/
```

기대 출력:
```
[ValueParser]         10/10 ✅
[PackageConverter]     5/5  ✅
[PackageListBuilder]   4/4  ✅  (mock HTTP)
[NlpParser]            4/4  ✅  (mock GLM)
[StockRanker]          4/4  ✅
[OutputFormatter]      4/4  ✅
[ErrorHandler]         3/3  ✅
[Config]               3/3  ✅  (mock PropertiesService)
[CacheManager]         3/3  ✅  (mock CacheService)
[MouserClient]         4/4  ✅  (mock HTTP)
[GlmClient]            3/3  ✅  (mock HTTP)
[Integration]          3/3  ✅  (mock API end-to-end)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 50/50 passed ✅
```

---

## 개발 규칙

### 코드 작성 규칙 (TestRunner가 테스트할 수 있도록 강제)
1. **순수 함수 우선**: Apps Script API를 사용하지 않는 로직은 반드시 독립 함수로 분리
2. **DI 패턴 필수**: `UrlFetchApp`, `CacheService`, `PropertiesService` 등은 파라미터로 주입
3. **조건부 export 필수**: 모든 `.gs` 파일 하단에 아래 블록 포함
   ```javascript
   if (typeof module !== 'undefined' && module.exports) {
     module.exports = { 함수명1, 함수명2 };
   }
   ```
4. **테스트 먼저 작성**: 코딩 에이전트가 파일 작성 → TestRunner가 즉시 테스트 실행

### 테스트 실패 시 피드백 루프
1. TestRunner가 실패 감지 → `tests/feedback/last-failure.json` 생성
2. 담당 CodingAgent에게 피드백 전달 (파일명, 함수명, 입력값, 기대값, 실제값)
3. CodingAgent가 수정 → TestRunner가 해당 테스트 재실행
4. 3회 실패 시 사람에게 에스컬레이션

### 수동 확인 필요 항목 (TestRunner 범위 외)
- Apps Script 배포 후 `doGet()` 동작 확인 → 웹 앱 URL 직접 접근
- Blogger iframe 연동 확인 → 브라우저에서 직접 확인

> **참고**: 실제 Mouser/GLM API HTTP 호출 검증은 `npm run test:live` 로 자동 가능 (수동 불필요)
