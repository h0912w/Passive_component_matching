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
- [x] Config.gs (API 키 읽기 함수 — 실제 키는 없음)
- [x] run-all-tests.js (TestRunner, mock 모드 + --live 모드)
- [x] tests/mocks/apps-script-mocks.js (PropertiesService/CacheService/UrlFetchApp mock)
- [x] tests/test-mouser-live.js (실제 Mouser API 호출 테스트)
- [x] tests/test-digikey-live.js (실제 Digikey API 호출 테스트)
- [x] .gitignore, .env.example, package.json

**아직 없는 것 (다음에 할 일)**:
- [ ] PackageConverter.gs + 테스트
- [ ] ValueParser.gs + 테스트
- [ ] DigikeyClient.gs + 테스트
- [ ] MouserClient.gs + 테스트
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
회로 설계 시 `1k 1005 5%` 같은 저항 Value 표기를 디지키/마우저 부품번호로 자동 매핑.
수십 개를 붙여넣으면 재고 있는 부품명 + Description을 6열 테이블로 출력.
부품번호만 복사해서 디지키/마우저 BOM Tool에 바로 붙여넣기 가능.

### 2. 기술 스택
- **프론트엔드**: Google Blogger 글에 직접 삽입하는 HTML/CSS/JS
- **백엔드**: Google Apps Script (doGet → JSON API)
  - 이유: Blogger와 같은 Google 생태계, 별도 서버 불필요, 무료
- **외부 API**: Mouser API v2 (현재 키 보유) + Digikey API v4 (추후)

### 3. API 키 방식 선택 (URL 생성 방식 거부)
- URL 생성 방식 먼저 제안했으나 사용자가 API 키 방식으로 변경 요청
- 이유: 실시간 재고 확인, 정확한 부품번호, Description 제공 가능

### 4. API 키 보안
- Apps Script PropertiesService에 저장 (코드/Git에 절대 없음)
- 로컬 테스트용: `.env` 파일 (`.gitignore`로 차단)
- `.env.example`에 키 이름만 기재 (실제 값 없음)

### 5. 저항 범위
- **저항(Resistor)만** 지원 (사용자 결정)
- 커패시터, 인덕터는 향후 확장 가능하게 설계

### 6. 출력 형식 (6열 테이블)
| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명(MPN) | Description |
|-----------|------------|------------|----------|------------|-------------|
- 사용자가 SW 추출 결과를 눈으로 더블체크할 수 있도록 설계

### 7. 파싱 전략
- **저항값**: `R`, `k`, `K`, `M` 단위 포함 토큰 감지
- **패키지**: 사전 정의된 모든 SMD 저항 패키지 목록과 매칭
- **오차**: `%` 포함 토큰 감지
- **순서 무관**: 어떤 순서로 입력해도 타입 자동 감지
- **구분자**: 공백, `/`, `_`, 탭 모두 지원

### 8. 테스트 전략 (2-Tier)
- **Tier 1** (`npm test`): Mock 테스트, API 키 불필요, 항상 실행
- **Tier 2** (`npm run test:live`): 실제 API 호출, `.env`의 키 필요
  - 이유: Apps Script ≠ Node.js 환경 차이 때문에 2단계 필요
  - UrlFetchApp이 Node.js에 없으므로 live 테스트는 Node.js `https` 모듈 직접 사용

### 9. Apps Script 배포 경험
- 사용자가 Apps Script 배포 경험 있음 → 배포 절차 가이드만 문서화

---

## 현재 보유한 API 키

| 서비스 | 상태 | 저장 위치 |
|--------|------|---------|
| Mouser API Key | ✅ 보유 | Apps Script 스크립트 속성 + 로컬 .env (Git 제외) |
| Digikey Client ID | ❌ 미보유 | — |
| Digikey Client Secret | ❌ 미보유 | — |

---

## 서브에이전트 구성 (9개)

| # | 이름 | 파일 | 역할 | 구현 상태 |
|---|------|------|------|---------|
| 1 | ValueParser | ValueParser.gs | R/k/M 단위로 저항값, 패키지목록으로 패키지, %로 오차 추출 | ❌ |
| 2 | PackageConverter | PackageConverter.gs | Metric ↔ Imperial 변환 | ❌ |
| 3 | DigikeyClient | DigikeyClient.gs | Digikey OAuth 2.0 + 키워드 검색 | ❌ |
| 4 | MouserClient | MouserClient.gs | Mouser API Key + 키워드 검색 | ❌ |
| 5 | StockRanker | StockRanker.gs | 재고 최다 부품 선정, 재고 0 제외 | ❌ |
| 6 | OutputFormatter | OutputFormatter.gs | 6열 테이블 + MPN 복사용 목록 | ❌ |
| 7 | CacheManager | CacheManager.gs | CacheService로 API 응답 캐싱 (TTL 1h) | ❌ |
| 8 | ErrorHandler | ErrorHandler.gs | 파싱 실패/API 에러 메시지 생성 | ❌ |
| 9 | TestRunner | tests/run-all-tests.js | 자동 테스트 + 실패 시 피드백 루프 | ✅ 완료 |

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

다음 단계 이후: DigikeyClient.gs / MouserClient.gs (API 클라이언트)

---

## 프로젝트 파일 구조 (현재 상태)

```
Passive_component_matching/
├── CLAUDE.md                          ← 메인 가이드 (항상 먼저 읽을 것)
├── .claude/skills/
│   ├── resistor-parsing.md            ← 파싱 규칙 상세
│   ├── api-integration.md             ← Digikey/Mouser API 엔드포인트
│   ├── blogger-frontend.md            ← Blogger 삽입 방법
│   └── testing.md                     ← TestRunner 상세, mock 패턴
├── apps-script/
│   └── Config.gs                      ← PropertiesService 키 읽기 (구현됨)
├── tests/
│   ├── run-all-tests.js               ← TestRunner (구현됨, 동작 확인됨)
│   ├── test-mouser-live.js            ← Mouser 실제 API 테스트
│   ├── test-digikey-live.js           ← Digikey 실제 API 테스트
│   ├── mocks/
│   │   └── apps-script-mocks.js       ← PropertiesService/CacheService/UrlFetchApp mock
│   └── feedback/                      ← 실패 시 피드백 JSON 저장 위치
├── docs/
│   ├── package-size-table.md          ← Metric↔Imperial 변환표
│   └── session-context.md             ← 이 파일 (대화 이력)
├── .env.example                       ← API 키 템플릿 (실제 키 없음)
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
npm run test:live                  # 실제 API 호출 (.env에 키 필요)
node tests/test-mouser-live.js     # Mouser만 단독 실행
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
| 2026-03-05 | CLAUDE.md + session-context.md 최종 업데이트: README checkbox 수정, 테스트 가능성 분석 2-tier 반영, 파일 구조에 live test 파일/package.json 추가, 테스트 명령어 완성, 수동 확인 항목 수정 |
| 2026-03-05 | GitHub claude/resistor-lookup-tool-2ewOv 브랜치에 push 완료 |
| 2026-03-05 | GitHub Actions 워크플로우 추가: push 시 Tier1(mock) → Tier2(live, Secrets 키 주입) 자동 실행 |
