# 테스트 결과 리포트

> 생성일: 2026-03-06
> 환경: Node.js 20, Ubuntu (로컬 + GitHub Actions CI)

---

## Tier 1: Mock 테스트 (API 키 불필요)

로컬에서 `npm test` 실행 결과. 모든 외부 API는 mock으로 대체.

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

---

## Tier 2: Live API 테스트 (API 키 필요)

GitHub Actions에서 `npm run test:live` 실행. Repository Secrets에 등록된 실제 키 사용.

### 실행 방법
- **자동**: `git push` → GitHub Actions 워크플로우 자동 트리거
- **수동**: `.env` 파일에 키 입력 후 `npm run test:live`

### Live 테스트 항목

| 테스트 파일 | 검증 내용 | API |
|------------|----------|-----|
| `test-mouser-live.js` | Mouser API 연결, 키워드 검색 응답 구조, 재고 데이터 반환 | Mouser Search API v2 |
| `test-glm-live.js` | GLM API 연결, 자연어→JSON 변환 정확도 | ZhipuAI GLM-4-flash |
| `test-random-validation.js` | GLM 랜덤 입력 생성 → Mouser 실제 검색 → E2E 파이프라인 | Mouser + GLM |

### API 키 동작 확인 체크리스트

| 항목 | 확인 방법 | 상태 |
|------|----------|------|
| Mouser API Key 유효성 | `test-mouser-live.js` — 200 응답 + 검색 결과 반환 | ⏳ CI 실행 대기 |
| Mouser Rate Limit | 30 req/min 이내 정상 동작 | ⏳ CI 실행 대기 |
| GLM API Key 유효성 | `test-glm-live.js` — 200 응답 + JSON 파싱 성공 | ⏳ CI 실행 대기 |
| GLM 자연어 파싱 정확도 | 한국어/영어 입력 → 구조화 JSON | ⏳ CI 실행 대기 |
| E2E 파이프라인 | 랜덤 입력 → 파싱 → API 검색 → 결과 반환 | ⏳ CI 실행 대기 |

> **참고**: CI 실행 후 GitHub Actions 탭에서 `Tier 2 - Live API Tests` 결과를 확인하세요.
> 상세 리포트는 Artifacts의 `validation-reports`에서 다운로드 가능합니다.

---

## CI 워크플로우 구조

```
git push
  └─→ Tier 1: Mock Tests (항상 실행)
        ├── 통과 → Tier 2: Live API Tests (Secrets 키 사용)
        │            ├── test-mouser-live.js
        │            ├── test-glm-live.js
        │            └── test-random-validation.js
        │            └── Artifacts 업로드 (reports/, feedback/)
        └── 실패 → Tier 2 스킵
```

---

## 실패 시 확인 방법

1. **GitHub Actions 탭** → 실패한 Job 클릭 → 로그 확인
2. **Artifacts 다운로드**: `test-failure-feedback` → `last-failure.json`
3. **로컬 재현**: `.env`에 키 입력 후 `npm run test:live`

---

## 파일 위치

| 파일 | 경로 | 설명 |
|------|------|------|
| 이 리포트 | `docs/test-report.md` | 테스트 결과 종합 리포트 |
| CI 워크플로우 | `.github/workflows/test.yml` | GitHub Actions 설정 |
| 랜덤 검증 리포트 | `tests/reports/validation-*.md` | 타임스탬프별 자동 생성 |
| 실패 피드백 | `tests/feedback/last-failure.json` | 마지막 실패 정보 |
