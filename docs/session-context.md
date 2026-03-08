# 세션 컨텍스트 (대화 이력)

> 새 채팅창을 열었을 때 이 파일을 먼저 읽으세요. 지금까지의 결정 사항, 현재 상태, 다음 할 일이 정리되어 있습니다.

---

## 현재 프로젝트 상태 (2026-03-08 기준)

**단계**: Phase 2~5 완료. 현재는 로컬 테스트 환경 단순화 중.

**최근 완료된 작업**:
- [x] 블로거 HTML 개선 (GLM → AI, 요소 재배치)
- [x] GitHub Actions workflow 수정 (충돌 방지)
- [x] SSH 인증 설정 완료
- [x] Random-Validation 추출 로직 개선
- [x] test-random-validation.js 수정 (BATCH_SIZE 5→1)
- [x] **GitHub Actions 자동화 제거** — 로컬 테스트 환경으로 단순화

---

## GitHub Actions 자동화 제거 (2026-03-08)

### 배경
- Tier1 테스트는 클로드 코드가 수행 (client-side mock 테스트, 로컬 `npm test` 실행)
- Tier2 테스트는 깃허브 액션이 수행 (실제 API 호출)
- 사용자는 GitHub Actions 자동화가 불필요하다고 판단하여 삭제 요청

### 삭제된 파일 및 코드
- `.env` — API 키 플레이스홀더 파일
- `secrets/api_key_local.txt` — 로컬 API 키 템플릿
- `secrets/apps_script_key.txt` — Apps Script 키 템플릿
- `.github/workflows/test.yml` — GitHub Actions 워크플로우
- `.github/` 폴더 전체 삭제

### 복원된 설정
- `.gitignore` — 원래 형태로 복원 (.env 등 차단 규칙 활성화)

### 현재 테스트 방법
1. **Tier1 Mock 테스트**: 로컬에서 `npm test` 실행
   - 클라이언트 사이드 테스트 (Node.js 환경)
   - API 키 불필요
   - 모든 에이전트의 로직 검증 가능

2. **Apps Script 수동 테스트**: 사용자가 직접 수행
   - Apps Script 에디터에서 실행
   - 실제 Mouser/GLM API 호출
   - 테스트 후 결과 확인

### 커밋 기록
- `ce9b993`: "chore: remove GitHub Actions automation and restore local testing"

---

## 개선 과제 (Backlog)

### [BACKLOG-001] Mouser API MPN 추출 정확도 개선
**완료**: Tier 2 Live API 테스트 (실제 Mouser API 매칭) — 198/198 passed ✅

### [BACKLOG-002] Random-Validation 테이블 추출 로직 개선
**완료**: live 콘솔 출력에서 랜덤 검증 테이블 추출 — 정규식 패턴 대신 라인 기반 추출 로직으로 변경

### [BACKLOG-003] Git identity 문제
**현상**: GitHub Actions에서 Git author identity 문제 발생
```
fatal: empty ident name (for <runner@...>) not allowed
```
**상태**: 해결책 제안됨
**조치 필요**: workflow에 `git config user.name "github-actions[bot]"` 추가

### [BACKLOG-004] Node.js Buffer deprecated 경고
**현상**: Node.js 20 버전에서 `Buffer()` 사용 시 DEP0005 경고 발생
**상태**: 해결책 제안됨 (workflow에 `NODE_OPTIONS: --no-warnings` 추가)
**조치 필요**: deprecated 메서지 해결

---

## 주요 결정 사항

### 1. 프로젝트 목적
회로 설계 시 `1k 1005 5%` 같은 저항값을 입력하면, Mouser API를 통해 실제 구매 가능한 부품번호로 자동 매칭.
실시간 재고 확인, 실시간 재고 가용.

### 2. 기술 스택
- **프론트엔드**: Google Blogger HTML/CSS/JS (블로그 포스팅)
- **백엔드**: Google Apps Script (doGet/doPost API)
- **외부 API**: Mouser API v2, GLM API
- **CI/CD**: ❌ GitHub Actions 제거됨 — 로컬 테스트 환경만 사용
- **테스트**: Tier1 Mock 테스트 (로컬 `npm test` 실행), Apps Script 수동 테스트 (사용자 직접 수행)

---

## 현재 문제 상태

### 1. Random-Validation 테이블 추출 실패 — ✅ 해결 완료
**현상**: live 콘솔 출력에서 랜덤 검증 테이블을 찾지 못함 → "Random-Validation table extracted: No"
**원인**: 정규식 패턴이 실제 출력 형식과 불일치
**조치**: 라인 기반 추출 로직으로 변경 완료

### 2. GitHub Actions 충돌 — ✅ 해결 완료
**현상**: 두 잡(test-live, sync-to-main)이 동시에 main에 커밋을 시도 → Merge conflict 발생
**원인**: workflow에서 `if: github.ref != 'refs/heads/main'` 조건이 있어서 main 브랜치에서도 실행됨
**조치**: 조건 제거, `needs: [test-mock, test-live]`로 순서 지정

### 3. Git identity 문제 — ⚠️ 해결책 제안됨
**현상**: GitHub Actions에서 Git author identity가 비어있어서 `fatal: empty ident name` 오류 발생
**원인**: workflow에 `git config user.name "github-actions[bot]"` 설정만 있음, `--global` 플래그 사용 안함
**해결책 필요**:
1. workflow에 `git config --global user.email "github-actions[bot]@users.noreply.github.com"` 추가
2. 또는 `--no-verify` 플래그 추가하여 pre-commit hook 무시화

### 4. Node.js Buffer deprecated 경고 — ✅ 해결책 제안됨
**현상**: `Buffer()` 메서드 사용 시 DEP0005 경고 발생
**조치**: workflow에 `NODE_OPTIONS: --no-warnings` 환경변수 추가 완료

### 5. test-random-validation.js 수정 — ✅ 완료
**현상**: BATCH_SIZE=5, BATCH_COUNT=5로 100개 입력 → 5개 입력으로 변경
**조치**: test-random-validation.js의 `BATCH_SIZE = 5;`, `BATCH_COUNT = 5`로 수정 완료

### 6. Process exit code 128 — ⚠️ 미해결
**현상**: git 명령어가 실패하여 비정상 종료
**원인**: 알 수 없음
**조치**: GitHub Actions에서 실행 이력 확인 필요

---

## 다음 확인 단계

### 1. GitHub Actions 탭에서 workflow 실행 결과 확인
- https://github.com/h0912w/Passive_component_matching/actions
- 최신 `sync-to-main` 잡의 상태(성공/실패) 확인
- `test-live` 잡에서 Random-Validation 테이블이 정상적으로 추출되는지 확인

### 2. 로컬 테스트 실행 (선택사항)
```bash
# Tier 1: mock 테스트
npm test

# Tier 2: live 테스트 (.env에 API 키 필요)
npm run test:live
```

### 3. 문제 해결 시도
- Random-Validation 테이블 추출 로직: ✅ 완료
- GitHub Actions 충돌 방지: ✅ 완료
- BATCH_SIZE 수정: ✅ 완료

---

## 결론

GitHub Actions 자동화를 완전히 제거하고 로컬 테스트 환경으로 단순화했습니다.

**현재 테스트 방법**:
- Tier1: 로컬 `npm test` 실행 (클라이언트 사이드 mock 테스트)
- Apps Script: 사용자가 직접 에디터에서 수동 테스트

**삭제된 자동화**:
- GitHub Actions workflow (test-mock, test-live, sync-to-main 잡 모두 삭제)
- .env 및 secrets/ 폴더 (API 키 관련 파일)
- .github/ 폴더 전체

**이유**: 사용자는 복잡한 CI/CD 자동화 없이 로컬에서 테스트하는 방식을 선호함. Apps Script 동작 테스트는 사용자가 직접 수행하겠다고 명시함.

계속 작업하시겠습니까?
