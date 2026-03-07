# 프로젝트 세션 컨텍스트 (대화 이력)

> 새 채팅창을 열었을 때 이 파일을 먼저 읽으면 이전 대화 내용을 모두 파악할 수 있습니다.
> 작업이 진행될 때마다 이 파일을 업데이트하세요.

---

## 현재 프로젝트 상태 (2026-03-05 기준)

**단계**: Phase 1 완료 (계획 문서), Phase 2 미착수 (코드 구현 전)

**완료된 것**:
- [x] 전체 아키텍처 설계
- [x] CLAUDE.md (프로젝트 가이드 메인 문서)
- [x] Skills 문서 4개 (.claude/skills/)
- [x] Config.gs (API 키 읽기 함수 — Mouser + GLM)
- [x] run-all-tests.js (TestRunner, mock 모드 + --live 모드)
- [x] tests/mocks/apps-script-mocks.js (PropertiesService/CacheService/UrlFetchApp mock)
- [x] tests/test-mouser-live.js (실제 Mouser API 호출 테스트)
- [x] .gitignore, .env.example, package.json
- [x] Digikey 제거 → Mouser API 단일 사용으로 전환
- [x] PackageListBuilder 에이전트 추가 (Mouser API로 패키지 리스트 동적 추출)
- [x] ZhipuAI GLM API 통합 — NlpParser + GlmClient 에이전트 추가

**아직 없는 것 (다음에 할 일)**:
- [ ] PackageConverter.gs + 테스트
- [ ] ValueParser.gs + 테스트
- [ ] NlpParser.gs + 테스트 (GLM 기반 자연어 파싱)
- [ ] MouserClient.gs + 테스트
- [ ] GlmClient.gs + 테스트 (ZhipuAI GLM API 클라이언트)
- [ ] PackageListBuilder.gs + 테스트
- [ ] StockRanker.gs + 테스트
- [ ] OutputFormatter.gs + 테스트
- [ ] ErrorHandler.gs + 테스트
- [ ] CacheManager.gs + 테스트
- [ ] Code.gs (엔트리포인트)
- [ ] appsscript.json
- [ ] blogger/resistor-tool.html (프론트엔드)

---

## 주요 결정 사항 (Why를 포함)

### 1. 프로젝트 목적
회로 설계 시 `1k 1005 5%` 같은 저항 Value 표기를 마우저 부품번호로 자동 매핑.
수십 개를 붙여넣으면 재고 있는 부품명 + Description을 6열 테이블로 출력.
부품번호만 복사해서 마우저 BOM Tool에 바로 붙여넣기 가능.

### 2. 기술 스택
- **프론트엔드**: Google Blogger 글에 직접 삽입하는 HTML/CSS/JS
- **백엔드**: Google Apps Script (doGet → JSON API)
  - 이유: Blogger와 같은 Google 생태계, 별도 서버 불필요, 무료
- **외부 API**: Mouser API v2 (현재 키 보유) + ZhipuAI GLM API (자연어 파싱용)

### 3. API 전환 이력
- 초기: Digikey + Mouser 이중 API 사용 계획
- 변경: **Mouser API만 단일 사용**으로 전환
  - 이유: 구현 복잡도 감소, OAuth 불필요, Mouser 키만으로 충분한 커버리지

### 4. 패키지 리스트 동적 추출 (PackageListBuilder)
- 기존: 하드코딩된 Metric/Imperial 패키지 목록
- 변경: **Mouser API를 통해 실제 판매 중인 패키지 사이즈를 동적 추출**
  - PackageListBuilder 에이전트가 Mouser API 검색 → 패키지 추출 → 정리 → 캐싱
  - 캐시 TTL 24시간, 폴백으로 기본 하드코딩 테이블 유지
  - ValueParser가 이 동적 리스트를 사용하여 패키지 매칭

### 5. API 키 보안
- Apps Script PropertiesService에 저장 (코드/Git에 절대 없음)
- 로컬 테스트용: `.env` 파일 (`.gitignore`로 차단)
- `.env.example`에 키 이름만 기재 (실제 값 없음)

### 6. 저항 범위
- **저항(Resistor)만** 지원 (사용자 결정)
- 커패시터, 인덕터는 향후 확장 가능하게 설계

### 7. 출력 형식 (6열 테이블)
| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명(MPN) | Description |
|-----------|------------|------------|----------|------------|-------------|
- 사용자가 SW 추출 결과를 눈으로 더블체크할 수 있도록 설계

### 8. 파싱 전략 (2단계: 정규식 + 자연어)
- **1단계 ValueParser (정규식)**: 구조화된 입력 (`1k 0402 5%`) 처리
  - **저항값**: `R`, `k`, `K`, `M` 단위 포함 토큰 감지
  - **패키지**: PackageListBuilder가 Mouser API에서 추출한 패키지 목록과 매칭
  - **오차**: `%` 포함 토큰 감지
  - **순서 무관**: 어떤 순서로 입력해도 타입 자동 감지
  - **구분자**: 공백, `/`, `_`, 탭 모두 지원
- **2단계 NlpParser (GLM 폴백)**: ValueParser 실패 시 자연어 입력을 GLM으로 처리
  - 예: `"1킬로옴 0402 5퍼센트"` → GLM이 구조화 JSON으로 변환
  - ZhipuAI GLM-4-Flash 모델 사용 (빠른 응답, 비용 효율)

### 9. 테스트 전략 (2-Tier)
- **Tier 1** (`npm test`): Mock 테스트, API 키 불필요, 항상 실행
- **Tier 2** (`npm run test:live`): 실제 Mouser + GLM API 호출, `.env`의 키 필요
  - Apps Script ≠ Node.js 환경 차이 때문에 2단계 필요
  - UrlFetchApp이 Node.js에 없으므로 live 테스트는 Node.js `https` 모듈 직접 사용

### 10. Apps Script 배포 경험
- 사용자가 Apps Script 배포 경험 있음 → 배포 절차 가이드만 문서화

---

## 현재 보유한 API 키

| 서비스 | 상태 | 저장 위치 |
|--------|------|---------|
| Mouser API Key | ✅ 보유 | Apps Script 스크립트 속성 + 로컬 .env (Git 제외) |
| ZhipuAI GLM API Key | ❌ 미보유 | Apps Script 스크립트 속성 + 로컬 .env (Git 제외) |

---

## 서브에이전트 구성 (12개)

| # | 이름 | 파일 | 역할 | 구현 상태 |
|---|------|------|------|---------|
| 1 | ValueParser | ValueParser.gs | 정규식 기반: R/k/M 단위로 저항값, 패키지, 오차 추출 | ❌ |
| 2 | NlpParser | NlpParser.gs | GLM 기반: 자연어 입력을 구조화 데이터로 변환 (ValueParser 폴백) | ❌ |
| 3 | PackageListBuilder | PackageListBuilder.gs | Mouser API로 패키지 리스트 동적 추출 & 정리 | ❌ |
| 4 | PackageConverter | PackageConverter.gs | Metric ↔ Imperial 변환 | ❌ |
| 5 | MouserClient | MouserClient.gs | Mouser API Key + 키워드 검색 | ❌ |
| 6 | GlmClient | GlmClient.gs | ZhipuAI GLM API Bearer Token + chat completions | ❌ |
| 7 | StockRanker | StockRanker.gs | 재고 최다 부품 선정, 재고 0 제외 | ❌ |
| 8 | OutputFormatter | OutputFormatter.gs | 6열 테이블 + MPN 복사용 목록 | ❌ |
| 9 | CacheManager | CacheManager.gs | API 응답 캐싱 (TTL 1h) + 패키지 리스트 (24h) + NLP 응답 캐싱 | ❌ |
| 10 | ErrorHandler | ErrorHandler.gs | 파싱 실패/API 에러 메시지 생성 | ❌ |
| 11 | PackageListCache | Code.gs에서 트리거 | 초기 호출 시 PackageListBuilder 자동 실행 | ❌ |
| 12 | TestRunner | tests/run-all-tests.js | 자동 테스트 + 실패 시 피드백 루프 | ✅ 완료 |

---

## 다음 세션에서 시작할 작업

**추천 시작점**: Phase 2 — 핵심 파싱 로직부터 구현

```
1. apps-script/PackageConverter.gs 구현
2. tests/test-package-converter.js 작성
3. node tests/test-package-converter.js → 통과 확인
4. apps-script/ValueParser.gs 구현
5. tests/test-value-parser.js 작성
6. node tests/test-value-parser.js → 통과 확인
7. npm test → 전체 통과 확인
```

다음 단계 이후: MouserClient.gs → GlmClient.gs → NlpParser.gs → PackageListBuilder.gs → StockRanker.gs

---

## 프로젝트 파일 구조 (현재 상태)

```
Passive_component_matching/
├── CLAUDE.md                          ← 메인 가이드 (항상 먼저 읽을 것)
├── .claude/skills/
│   ├── resistor-parsing.md            ← 파싱 규칙 상세
│   ├── api-integration.md             ← Mouser + GLM API 엔드포인트
│   ├── blogger-frontend.md            ← Blogger 삽입 방법
│   └── testing.md                     ← TestRunner 상세, mock 패턴
├── apps-script/
│   └── Config.gs                      ← PropertiesService 키 읽기 (Mouser + GLM)
├── tests/
│   ├── run-all-tests.js               ← TestRunner (구현됨, 동작 확인됨)
│   ├── test-mouser-live.js            ← Mouser 실제 API 테스트
│   ├── mocks/
│   │   └── apps-script-mocks.js       ← PropertiesService/CacheService/UrlFetchApp mock
│   └── feedback/                      ← 실패 시 피드백 JSON 저장 위치
├── docs/
│   ├── package-size-table.md          ← Metric↔Imperial 변환표
│   └── session-context.md             ← 이 파일 (대화 이력)
├── .env.example                       ← API 키 템플릿 (Mouser + GLM, 실제 키 없음)
├── .gitignore                         ← .env, node_modules 등 차단
└── package.json                       ← npm test / npm run test:live
```

---

## 중요 기술 제약 사항

1. **Apps Script 61초 타임아웃**: 많은 저항값 처리 시 배치로 나눠야 할 수 있음
2. **Mouser Rate Limit**: 30 req/min, 1000 req/day → CacheManager 필수
3. **CORS**: Apps Script 웹앱은 CORS 미지원 → JSONP 또는 iframe 방식
4. **DI 패턴 필수**: 모든 .gs 파일은 Apps Script API를 파라미터로 주입받아야 Node.js 테스트 가능
5. **조건부 export 필수**: 각 .gs 파일 하단에 `if (typeof module !== 'undefined' && module.exports)` 블록

---

## 테스트 실행 방법

```bash
npm install                        # 최초 1회
npm test                           # mock 테스트 (API 키 불필요)
npm run test:live                  # 실제 Mouser + GLM API 호출 (.env에 키 필요)
node tests/test-mouser-live.js     # Mouser만 단독 실행
node tests/test-glm-live.js        # GLM만 단독 실행
```

---

## 세션 이력 요약

| 날짜 | 주요 작업 |
|------|---------|
| 2026-03-05 | 프로젝트 시작. 아키텍처 설계, CLAUDE.md + Skills 문서 작성 |
| 2026-03-05 | URL 생성 방식 → API 키 방식으로 전환. 서브에이전트 8개 설계 |
| 2026-03-05 | Apps Script 프로젝트 생성 절차 + API 키 보안 방법 문서화 |
| 2026-03-05 | TestRunner(에이전트9) + 피드백 루프 설계. 테스트 가능성 분석 |
| 2026-03-05 | 2-Tier 테스트 구조: mock(Tier1) + --live 실제 API(Tier2) 구현 |
| 2026-03-05 | 세션 컨텍스트 문서(이 파일) 생성 |
| 2026-03-05 | CLAUDE.md + session-context.md 최종 업데이트 |
| 2026-03-05 | GitHub claude/resistor-lookup-tool-2ewOv 브랜치에 push 완료 |
| 2026-03-05 | GitHub Actions 워크플로우 추가 |
| 2026-03-05 | **Digikey 제거 → Mouser API 단일 사용으로 전환** |
| 2026-03-05 | **PackageListBuilder 에이전트 추가** (Mouser API로 패키지 리스트 동적 추출) |
| 2026-03-05 | 서브에이전트 9개 → 10개 재편성 (DigikeyClient 삭제, PackageListBuilder/PackageListCache 추가) |
| 2026-03-05 | **ZhipuAI GLM API 통합** — NlpParser(자연어 파싱) + GlmClient(API 클라이언트) 에이전트 추가 |
| 2026-03-05 | 서브에이전트 10개 → 12개 재편성, 2단계 파싱 전략 (정규식 → GLM 폴백) |
| 2026-03-07 | **GitHub Actions sync-to-main 잡 추가** — Tier 1 mock 테스트 통과 시 작업 브랜치를 main에 자동 force push |
| 2026-03-07 | CLAUDE.md 푸시 전 필수 절차 수정 — 수동 main force push 규칙을 "GitHub Actions가 자동 처리"로 정정 |
| 2026-03-07 | **규칙 확립**: 커밋 시 반드시 session-context.md에 대화 내용(결정사항+Why) 함께 업데이트 |
| 2026-03-07 | 브랜치 혼동 발생 (review-project-status-kJ0I4 ↔ resistor-lookup-tool-2ewOv) → resistor-lookup-tool-2ewOv 기준으로 reset |
| 2026-03-07 | **Tier 1 mock 테스트 전체 실행** — 110/110 통과 ✅ (ValueParser 24, PackageConverter 17, StockRanker 4, OutputFormatter 14, ErrorHandler 10, Config 5, CacheManager 6, MouserClient 7, GlmClient 3, NlpParser 6, PackageListBuilder 5, Integration 9) |
| 2026-03-07 | docs/test-report.md 최종 업데이트 날짜 갱신 후 push |
| 2026-03-07 | **[실패] sync-to-main 잡이 main에 반영되지 않음** — 원인: GITHUB_TOKEN 기본 권한이 Read-only. YAML에 `permissions: contents: write` 선언만으로는 부족. 리포지토리 설정(Settings → Actions → General → Workflow permissions)에서 "Read and write permissions"으로 변경 필요 |
| 2026-03-07 | **[교훈] CI/CD 설정은 "실제 동작 확인" 전까지 완료로 판단 금지** — 확인 없이 "추가 작업 없다"고 단언해서 사용자에게 거짓 안내. CLAUDE.md에 Workflow permissions 설정 필수 절차 + 교훈 추가 |
| 2026-03-07 | **[대책]** CLAUDE.md에 sync-to-main 동작 전제조건(Workflow permissions 변경) 명시. push 후 Actions 탭에서 녹색 체크 확인하는 절차 추가. "추가 작업 없다"는 발언은 실제 확인 후에만 하도록 규칙화 |
| 2026-03-07 | **[사용자 조치]** Settings → Actions → General → Workflow permissions → "Read and write permissions" 변경 완료 |
| 2026-03-07 | **[검증 푸시]** sync-to-main 동작 여부 확인을 위해 session-context.md 업데이트 후 재푸시 — Actions 탭에서 "Sync to main" 잡 녹색 체크 확인 예정 |
| 2026-03-07 | **[2차 실패 원인]** GitHub Actions가 전혀 실행 안 됨 — `branches: ['*']`에서 `*`는 슬래시(`/`) 포함 브랜치명(`claude/xxx-yyy`)에 매칭 안 됨. `branches: ['**']`로 수정 (`**`은 슬래시 포함 전체 매칭). test.yml 수정 후 재푸시. |
| 2026-03-07 | **[3차 확인]** GitHub Actions 실행 확인 ✅ — Tier1 ✅, Sync to main ✅, Tier2 ❌. Tier2 실패 원인 분석 중 — API 키는 정상 등록됨(GLM_API_KEY, MOUSER_API_KEY). 상세 로그 확인 필요. |
| 2026-03-07 | **[Tier2 실패 원인]** GLM 모델명 deprecated — `glm-4-flash` → HTTP 400 "模型不存在". ZhipuAI가 2026-01에 `glm-4.7-flash` 출시하며 구 모델 폐기. Config.gs, GlmClient.gs, test-glm-live.js, test-random-validation.js, test-config.js, CLAUDE.md, api-integration.md 전체 모델명 수정 완료. |
| 2026-03-07 | **[Tier2 잔여 실패]** GLM-Live 1/2 — glm_response_structure 테스트 HTTP 500. 원인: 연속 GLM API 호출 시 Rate Limit. 테스트 메시지 단순화 + 3초 딜레이 + JSON.parse 오류 방지로 해결. |
| 2026-03-07 | **[Tier2 최종 해결]** Random-Validation 타임아웃. 원인: GLM-Live(2회) 직후 rate limit 초과. test-random-validation.js 시작 시 10초 대기 + timeout 45초로 증가. **전체 CI/CD 녹색 완료. Status: Success.** |
| 2026-03-07 | **[Actions main 전용 커밋 설계]** sync-to-main 잡 개선 — 테스트 결과를 캡처해 docs/test-report.md를 생성 후 main에만 커밋. 작업 브랜치는 절대 건드리지 않으므로 다음 push 시 git pull 불필요. 흐름: (1) 테스트 실행 + 결과 파일 저장 → (2) 작업 브랜치 → main force push → (3) main checkout → report 커밋 → push main. |
| 2026-03-07 | **[Tier 1 재확인]** claude/review-project-status-kJ0I4 브랜치에서 npm test 재실행 — 110/110 통과 ✅ (ValueParser 24, PackageConverter 17, StockRanker 4, OutputFormatter 14, ErrorHandler 10, Config 5, CacheManager 6, MouserClient 7, GlmClient 3, NlpParser 6, PackageListBuilder 5, Integration 9). 모든 서브에이전트 mock 테스트 정상 동작 확인. |
