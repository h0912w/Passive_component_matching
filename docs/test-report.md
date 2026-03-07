# 테스트 결과 리포트

> 최종 업데이트: 2026-03-07
> 환경: Node.js 20, Ubuntu (로컬 샌드박스 + GitHub Actions CI)

---

## Tier 1: Mock 테스트 (API 키 불필요)

`npm test` 실행 결과. 모든 외부 API는 mock으로 대체.

```
🧪 Passive Component Matching — TestRunner
   모드: MOCK  (실제 API 호출 없음)
```

| 모듈 | 통과 | 상태 | 비고 |
|------|------|------|------|
| ValueParser | 24/24 | ✅ | 순수 파싱 로직 |
| PackageConverter | 17/17 | ✅ | Metric↔Imperial 변환 |
| StockRanker | 4/4 | ✅ | 재고 기반 정렬/필터 |
| OutputFormatter | 14/14 | ✅ | 6열 테이블 포맷팅 |
| ErrorHandler | 10/10 | ✅ | 에러 메시지 생성 |
| Config | 5/5 | ✅ | mock PropertiesService |
| CacheManager | 6/6 | ✅ | mock CacheService |
| MouserClient | 7/7 | ✅ | mock HTTP 응답 |
| GlmClient | 3/3 | ✅ | mock HTTP 응답 |
| NlpParser | 6/6 | ✅ | mock GLM 응답 |
| PackageListBuilder | 5/5 | ✅ | mock HTTP 응답 |
| Integration | 9/9 | ✅ | mock API end-to-end |
| **합계** | **110/110** | **✅** | **All systems go** |

**결론**: 모든 비즈니스 로직, DI 패턴, mock 기반 API 클라이언트가 정상 동작.

---

## Tier 2: Live API 테스트 (API 키 필요)

`npm run test:live` 실행 결과.

```
🧪 Passive Component Matching — TestRunner
   모드: LIVE  (Mouser:✅  GLM:✅)
```

### API 키 로딩 결과

| API | 키 로딩 | 상태 |
|-----|---------|------|
| Mouser API Key | `.env`에서 정상 로딩 | ✅ `Mouser:✅` 표시 |
| GLM API Key | `.env`에서 정상 로딩 | ✅ `GLM:✅` 표시 |

> 키가 누락되면 `Mouser:❌` / `GLM:❌`로 표시되고 live 테스트가 SKIP됩니다.
> 두 키 모두 ✅로 인식되어 **키 설정은 정상**임을 확인했습니다.

### Live 테스트 실행 결과

| 테스트 파일 | 통과 | 상태 | 실패 원인 |
|------------|------|------|----------|
| `test-mouser-live.js` | 0/2 | ❌ | `getaddrinfo EAI_AGAIN api.mouser.com` |
| `test-glm-live.js` | 0/2 | ❌ | 네트워크 차단 (동일) |
| `test-random-validation.js` | 0/1 | ❌ | 네트워크 차단 (동일) |

### 실패 원인 분석

```
Error: getaddrinfo EAI_AGAIN api.mouser.com
```

- **원인**: 이 테스트를 실행한 환경(Claude Code 샌드박스)에서 **외부 네트워크 접속이 차단**됨
- **DNS 해석 실패** (`EAI_AGAIN`) → `api.mouser.com`, `open.bigmodel.cn` 모두 접근 불가
- **API 키 자체의 문제가 아님** — 키는 정상 로딩되었으나 HTTP 요청이 네트워크 레벨에서 차단됨

### API 키 동작 확인 체크리스트

| 항목 | 확인 방법 | 상태 | 비고 |
|------|----------|------|------|
| Mouser API Key 로딩 | TestRunner 헤더 `Mouser:✅` | ✅ 확인 | 키 형식 정상 |
| GLM API Key 로딩 | TestRunner 헤더 `GLM:✅` | ✅ 확인 | 키 형식 정상 |
| Mouser API 실제 호출 | `test-mouser-live.js` | ⏳ | 샌드박스 네트워크 제한 → **GitHub Actions CI에서 검증 필요** |
| GLM API 실제 호출 | `test-glm-live.js` | ⏳ | 샌드박스 네트워크 제한 → **GitHub Actions CI에서 검증 필요** |
| E2E 파이프라인 | `test-random-validation.js` | ⏳ | 샌드박스 네트워크 제한 → **GitHub Actions CI에서 검증 필요** |

### 결론

- **Tier 1 (mock)**: 110/110 전체 통과 ✅ — 모든 비즈니스 로직 정상
- **Tier 2 (live) 키 로딩**: Mouser ✅, GLM ✅ — 키 설정 정상
- **Tier 2 (live) API 호출**: 샌드박스 네트워크 제한으로 외부 API 호출 불가
- **실제 API 유효성 검증**: GitHub Actions CI에서 Repository Secrets로 자동 검증됨 (push 시 트리거)

---

## GitHub Actions CI에서 Tier 2 실행하기

이 샌드박스에서 외부 API 호출이 불가하므로, 실제 API 키 유효성은 GitHub Actions에서 검증합니다.

### 자동 트리거
```
git push → Tier 1 통과 → Tier 2 자동 실행 (Secrets 키 사용)
```

### CI 워크플로우 구조
```
git push
  └─→ Tier 1: Mock Tests (항상 실행)
        ├── 통과 → Tier 2: Live API Tests (Secrets 키 사용)
        │            ├── test-mouser-live.js  ← 실제 Mouser API 호출
        │            ├── test-glm-live.js     ← 실제 GLM API 호출
        │            └── test-random-validation.js ← E2E 검증
        │            └── Artifacts 업로드 (reports/, feedback/)
        └── 실패 → Tier 2 스킵
```

### CI 결과 확인 방법
1. GitHub 리포지토리 → **Actions 탭** → 최신 워크플로우 클릭
2. `Tier 2 - Live API Tests` Job 결과 확인
3. Artifacts에서 `validation-reports` 다운로드 (상세 리포트)

---

## 실패 시 디버깅

1. **GitHub Actions 탭** → 실패한 Job 클릭 → 로그 확인
2. **Artifacts 다운로드**: `test-failure-feedback` → `last-failure.json`
3. **로컬 재현**: `.env`에 키 입력 후 `npm run test:live` (외부 네트워크 접근 가능한 환경에서)

---

## 파일 위치

| 파일 | 경로 | 설명 |
|------|------|------|
| 이 리포트 | `docs/test-report.md` | 테스트 결과 종합 리포트 (Tier 1/2) |
| CI 워크플로우 | `.github/workflows/test.yml` | GitHub Actions 설정 |
| 랜덤 검증 리포트 | `tests/reports/validation-*.md` | 타임스탬프별 자동 생성 |
| 실패 피드백 | `tests/feedback/last-failure.json` | 마지막 실패 정보 |
