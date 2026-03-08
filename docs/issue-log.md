# 이슈 로그 (Issue Log)

> 이 문서는 프로젝트에서 발생한 모든 이슈의 **현상 / 원인 / 조치사항**을 기록합니다.
>
> **코드 수정 시 반드시 이 문서를 먼저 확인하세요.**
> 동일하거나 유사한 실수를 반복하지 않도록 하는 것이 목적입니다.

---

## 목차

| # | 날짜 | 제목 | 심각도 |
|---|------|------|--------|
| [#001](#001) | 2026-03-07 | GitHub Actions sync-to-main 403 Permission Denied | 🔴 High |
| [#002](#002) | 2026-03-07 | GitHub Actions가 claude/* 브랜치에서 트리거 안 됨 | 🔴 High |
| [#003](#003) | 2026-03-07 | GLM 모델명 deprecated — HTTP 400 "模型不存在" | 🔴 High |
| [#004](#004) | 2026-03-07 | GLM 연속 호출 Rate Limit — HTTP 500 | 🟡 Medium |
| [#005](#005) | 2026-03-07 | Random-Validation 타임아웃 | 🟡 Medium |
| [#006](#006) | 2026-03-07 | YAML heredoc `>` 특수문자 문법 오류 (test.yml L105) | 🔴 High |
| [#007](#007) | 2026-03-07 | test-report.md 상단 표 하드코딩 + Tier 2 결과 미포함 | 🟡 Medium |
| [#008](#008) | 2026-03-08 | clasp push "Skipping push." — 로컬 .gs 파일이 Apps Script에 반영 안 됨 | 🔴 High |
| [#009](#009) | 2026-03-08 | Git push 인증 오류 — SSH 환경에서 HTTPS 방식 사용 시 /dev/tty 장치 부재 | 🟡 Medium |
| [#010](#010) | 2026-03-08 | Tier 2 Live 테스트 실패 — GLM API Rate Limit + 코드 버그 | 🔴 High |

---

## #001

### GitHub Actions sync-to-main 403 Permission Denied

**날짜**: 2026-03-07

**현상**
- `sync-to-main` 잡이 `git push origin HEAD:main --force` 단계에서 실패
- 오류 메시지: `remote: Permission to ... denied` (HTTP 403)
- YAML에 `permissions: contents: write`를 선언했음에도 실패

**원인**
- GitHub 리포지토리의 기본 **Workflow permissions**가 `Read repository contents`(Read-only)로 설정되어 있음
- YAML 레벨에서 `permissions: contents: write`를 선언해도, **리포지토리 레벨 설정이 상위 권한**이므로 YAML 선언이 무시됨

**조치사항**
1. GitHub 리포지토리 → **Settings** → **Actions** → **General**
2. 하단 **"Workflow permissions"** 섹션
3. **"Read and write permissions"** 선택 → **Save**

**재발 방지 규칙**
- 새 리포지토리에 GitHub Actions를 처음 설정할 때는 Workflow permissions 설정을 **반드시** 확인할 것
- `git push`가 포함된 잡을 추가할 때는 배포 전에 이 설정을 먼저 변경할 것
- "추가 작업 없다"는 판단은 **Actions 탭에서 녹색 체크 확인 후**에만 내릴 것

---

## #002

### GitHub Actions가 claude/* 브랜치에서 트리거 안 됨

**날짜**: 2026-03-07

**현상**
- `claude/review-project-status-kJ0I4` 브랜치에 push해도 GitHub Actions가 전혀 실행되지 않음
- Actions 탭에 실행 이력 자체가 없음

**원인**
```yaml
# 문제 코드
on:
  push:
    branches: ['*']
```
- `*` 와일드카드는 **슬래시(`/`)를 포함하지 않는** 브랜치명만 매칭
- `claude/xxx-yyy` 형태의 브랜치명은 슬래시가 포함되어 있으므로 `*`에 매칭 안 됨

**조치사항**
```yaml
# 수정 코드
on:
  push:
    branches: ['**']
```
- `**` (double asterisk)는 슬래시 포함 모든 브랜치명을 매칭

**재발 방지 규칙**
- `claude/`, `feat/`, `fix/` 등 **슬래시가 포함된 브랜치명**을 대상으로 할 때는 항상 `**` 사용
- `*`는 `main`, `develop` 같은 단순 브랜치명에만 사용

---

## #003

### GLM 모델명 deprecated — HTTP 400 "模型不存在"

**날짜**: 2026-03-07

**현상**
- Tier 2 live 테스트에서 GLM API 호출 시 HTTP 400 오류
- 오류 메시지: `"模型不存在"` (모델이 존재하지 않음)

**원인**
- ZhipuAI가 2026년 1월에 `glm-4.7-flash` 모델을 출시하면서 **`glm-4-flash` 모델을 deprecated** 처리
- 코드 전체에서 `glm-4-flash`를 사용하고 있었음

**조치사항**
- 모델명을 `glm-4-flash` → `glm-4.7-flash`로 전면 교체
- 수정 파일 목록:
  - `apps-script/Config.gs`
  - `apps-script/GlmClient.gs`
  - `tests/test-glm-live.js`
  - `tests/test-random-validation.js`
  - `tests/test-config.js`
  - `CLAUDE.md`
  - `.claude/skills/api-integration.md`

**재발 방지 규칙**
- 외부 API 모델명/엔드포인트는 **deprecation 공지**를 주기적으로 확인할 것
- 모델명은 `Config.gs` 한 곳에만 정의하고 나머지는 Config를 참조하도록 설계할 것 (현재 분산되어 있음 → 향후 개선 대상)

---

## #004

### GLM 연속 호출 Rate Limit — HTTP 500

**날짜**: 2026-03-07

**현상**
- Tier 2 live 테스트에서 `glm_response_structure` 테스트가 HTTP 500으로 실패
- 직전 테스트에서 GLM API를 이미 한 번 호출한 상태

**원인**
- GLM API 연속 호출 시 Rate Limit 초과 → 서버가 HTTP 500으로 응답
- 테스트 메시지가 불필요하게 길어 처리 부하 증가

**조치사항**
1. 테스트 메시지를 단순화 (긴 문장 → 짧은 문장)
2. GLM 테스트 파일 내 연속 호출 사이에 **3초 딜레이** 추가
3. `JSON.parse` 실패 시 오류 대신 빈 결과 반환하도록 방어 코드 추가

**재발 방지 규칙**
- 외부 API를 연속 호출하는 테스트는 항상 **딜레이를 두고 순차 실행**할 것
- Rate Limit 관련 오류는 HTTP 429 외에 500으로도 나타날 수 있음

---

## #005

### Random-Validation 타임아웃

**날짜**: 2026-03-07

**현상**
- `test-random-validation.js` 실행 시 타임아웃 오류
- GLM-Live 테스트 바로 직후에 실행되어 Rate Limit 초과 상태에서 시작

**원인**
- Tier 2 테스트 실행 순서: GLM-Live → Random-Validation
- GLM-Live에서 연속 2회 API 호출 후, Random-Validation이 바로 GLM 호출 시도
- Rate Limit 누적으로 타임아웃 발생

**조치사항**
1. `test-random-validation.js` 시작 시 **10초 대기** 추가
2. HTTP 요청 timeout을 **45초**로 증가 (기본값에서 상향)

**재발 방지 규칙**
- 동일 API를 연속으로 호출하는 테스트 파일이 여러 개일 경우, 전체 테스트 순서를 고려해 **누적 Rate Limit**을 방지할 것
- Live 테스트는 가능하면 API 호출 횟수를 최소화할 것

---

## #006

### YAML heredoc `>` 특수문자 문법 오류 (test.yml L105)

**날짜**: 2026-03-07

**현상**
- GitHub Actions 실행 즉시 실패, 워크플로우 그래프 생성 안 됨
- 오류 메시지: `Invalid workflow file: .github/workflows/test.yml#L105`
  `You have an error in your yaml syntax on line 105`
- line 105는 마크다운 blockquote 기호 `>` 로 시작하는 줄

**원인**
```yaml
# 문제 코드 (test.yml)
      - name: Commit test-report.md to main only
        run: |
          cat > docs/test-report.md << 'REPORT_EOF'
# 테스트 결과 리포트
...
> 사용자가 저항 값 목록을 붙여넣으면...   ← L105: YAML이 이 줄을 직접 파싱
```
- `run: |` 리터럴 블록은 **들여쓰기 기준**으로 블록 범위를 결정함
- `run:` 내 쉘 명령은 10 space 들여쓰기
- heredoc 내용(마크다운)은 **0 indentation** (column 0)으로 시작
- YAML 파서가 들여쓰기 감소를 감지하고 `run:` 블록을 종료
- 이후 마크다운 내용을 YAML로 직접 파싱 시도 → `>` 를 folded block scalar 지시자로 해석 → 문법 오류

**조치사항**
- 마크다운 생성 로직을 별도 Node.js 스크립트 파일로 분리
  - 생성 파일: `scripts/generate-ci-report.js`
  - YAML 파일에는 특수문자가 포함된 텍스트 없음
- workflow에서는 `env:` 블록으로 동적 변수를 주입하고 스크립트를 호출:

```yaml
# 수정된 코드 (test.yml)
      - name: Commit test-report.md to main only
        env:
          CI_DATE: ${{ github.event.head_commit.timestamp }}
          CI_BRANCH: ${{ github.ref_name }}
          CI_SHA: ${{ github.sha }}
          CI_REPO: ${{ github.repository }}
          CI_RESULT: ${{ steps.test_output.outputs.RESULT }}
          CI_TEST_OUTPUT_FILE: /tmp/test-output.txt
        run: |
          git fetch origin main
          git checkout main
          node scripts/generate-ci-report.js
          git add docs/test-report.md
          git diff --cached --quiet || git commit -m "docs: update test-report [skip ci]"
          git push origin main
```

**재발 방지 규칙**
- GitHub Actions YAML `run:` 블록에 **마크다운, HTML, 다중 줄 텍스트를 직접 삽입하지 말 것**
- `>`, `|`, 백틱 등 YAML 특수문자가 포함된 텍스트는 항상 **별도 파일(스크립트)로 분리**할 것
- heredoc을 YAML `run:` 블록에서 사용할 경우, heredoc 내용의 들여쓰기가 `run:` 블록보다 낮아지면 YAML 파서가 오작동함을 인지할 것
- 대안: Python `-c`, Node.js 인라인 스크립트도 동일 문제 발생 가능 → **파일 분리**가 가장 안전한 패턴

---

## #007

### test-report.md 상단 표 하드코딩 + Tier 2 결과 미포함

**날짜**: 2026-03-07

**현상**
- `docs/test-report.md` 최상단 표가 항상 동일한 하드코딩 예시 데이터로 채워짐
- Tier 2 Live API 테스트 결과가 test-report.md에 전혀 포함되지 않음

**원인**
- `scripts/generate-ci-report.js`에 6열 표 예시가 정적 문자열로 하드코딩되어 있었음
- `sync-to-main` 잡이 `test-mock` 완료 후에만 test-report.md를 생성/커밋
- `test-live` 잡은 병렬 실행되지만 결과를 아티팩트로만 업로드 (test-report.md에 미포함)

**조치사항**
1. `tests/test-integration.js`: `TIER1_SAMPLE:JSON` 마커 출력 추가 (result4 실제 데이터)
2. `tests/run-all-tests.js`: `TIER1_SAMPLE:` 라인 통과 필터 추가
3. `scripts/generate-ci-report.js`: `TIER1_SAMPLE:` 파싱 → 실제 입력/파싱결과 표 생성
4. `scripts/append-tier2-report.js` 신규 생성: Tier 2 결과를 test-report.md에 추가
5. `.github/workflows/test.yml` `test-live` 잡: live 완료 후 main에 Tier 2 섹션 커밋

**재발 방지 규칙**
- 리포트에 "실제 테스트 결과"를 보여줄 때는 하드코딩 금지 — 테스트 출력 데이터를 파싱해 사용
- 여러 잡이 같은 파일을 수정할 경우 타이밍 설계 명확히: Tier 1 잡 먼저 커밋, Tier 2 잡이 이어서 추가 (`git pull --rebase` 후 push)
- main에 push하는 신규 잡은 반드시 `permissions: contents: write` 선언

---

## #008

### clasp push "Skipping push." + Apps Script API 미활성화 + 편집기 캐시 — 로컬 .gs 파일이 Apps Script에 반영 안 됨

**날짜**: 2026-03-08

**현상 (발생 순서)**
1. `clasp clone <script-id>` 실행 → `appsscript.json`과 `Code.js` **2개 파일만** 내려받힘
2. `clasp push` 실행 → **"Skipping push."** 출력, 아무것도 업로드되지 않음
3. `.clasp.json`의 `rootDir`을 `"apps-script"`로 수정 후 `clasp push --force` 실행 → **"User has not enabled the Apps Script API"** 오류
4. Apps Script API 활성화 후 `clasp push --force` 성공 → 그러나 Apps Script **편집기에는 파일이 여전히 안 보임**
5. 브라우저 새로고침(F5) 후 12개 파일 정상 표시 → **최종 해결**

**원인**
1. **`clasp clone`의 동작 방식**: Apps Script 프로젝트에 현재 저장된 파일만 내려받는다.
   원격 프로젝트에 `appsscript.json`과 `Code.js` 2개만 있었으므로 2개만 클론됨.
2. **"Skipping push." 원인**: 방금 클론한 파일 = 원격과 동일 상태 → 변경사항 없음으로 판단하여 스킵.
   + `.clasp.json`의 `rootDir`이 `""`(루트)로 설정되어 `apps-script/*.gs` 파일을 push 대상으로 인식 못 함.
3. **Apps Script API 미활성화**: Google 계정에서 Apps Script API가 기본적으로 비활성화되어 있음.
   `clasp`가 API를 통해 파일을 업로드하려면 이 설정을 수동으로 켜야 함.
4. **편집기 캐시**: push 성공 후에도 브라우저가 이전 상태를 캐시하고 있어 새 파일이 즉시 표시되지 않음.

**조치사항 (순서대로)**

**Step 1** — 로컬을 GitHub 최신 버전으로 동기화:
```bash
git pull origin main
```

**Step 2** — 프로젝트 루트의 `.clasp.json`에 `rootDir` 설정:
```json
{
  "scriptId": "<script-id>",
  "rootDir": "apps-script"
}
```

**Step 3** — Apps Script API 활성화 (최초 1회):
- 브라우저에서 `https://script.google.com/home/usersettings` 접속
- **"Google Apps Script API"** → **켜기(ON)**

**Step 4** — 강제 push:
```bash
clasp push --force
```

**Step 5** — Apps Script 편집기 브라우저 새로고침 (F5):
- 12개 `.gs` 파일이 파일 목록에 표시되면 성공

**재발 방지 규칙**
- `clasp clone`은 **항상 rootDir이 가리킬 폴더 기준으로** 실행할 것
- 프로젝트 루트에서 clasp 사용 시 `.clasp.json`에 `"rootDir": "apps-script"` 반드시 명시
- 새 Google 계정/환경에서 clasp 최초 사용 시 **Apps Script API 활성화** 선행 필수
- `clasp push` 성공 후 편집기에 반영이 안 되면 **브라우저 새로고침(F5)** 먼저 시도
- `Skipping push.` 메시지는 "변경 없음" 또는 "push 대상 파일 없음" 두 가지 모두 의미할 수 있음

---

## #009

### Git push 인증 오류 — SSH 환경에서 HTTPS 방식 사용 시 /dev/tty 장치 부재

**날짜**: 2026-03-08

**현상**
- `git push origin main` 실행 시 인증 오류 발생
- 오류 메시지:
  ```
  fatal: Unable to persist credentials with the 'wincredman' credential store.
  bash: line 1: /dev/tty: No such device or address
  error: failed to execute prompt script (exit code 1)
  fatal: could not read Username for 'https://github.com': No such file or directory
  ```
- 핸드폰에서 SSH로 원격 연결한 환경에서 발생

**원인**
- 원격 URL이 HTTPS 방식(`https://github.com/...`)으로 설정되어 있음
- SSH 세션에서는 터미널 장치(`/dev/tty`)가 없어 대화형 인증 불가
- `wincredman` credential store가 SSH 환경에서 정상 동작하지 않음

**조치사항 (해결책 1: SSH 방식으로 변경 - 권장)**

**완료된 작업**:
1. 원격 URL을 HTTPS → SSH 방식으로 변경
2. SSH 키 확인 (`id_ed25519` 존재)
3. GitHub SSH 인증 테스트 성공
4. `git push origin main` 완료

**명령어**:
```bash
# 1. 원격 URL을 SSH 방식으로 변경
git remote set-url origin git@github.com:h0912w/Passive_component_matching.git

# 2. SSH 키가 있는지 확인
cat ~/.ssh/id_ed25519.pub

# 3. SSH 키가 없으면 생성
ssh-keygen -t ed25519 -C "your_email@example.com"

# 4. GitHub에 SSH 키 등록 (Settings → SSH Keys에 공개키 내용 복사)

# 5. SSH 연결 테스트
ssh -T git@github.com
# "Hi h0912w! You've successfully authenticated..." 메시지가 뜨면 성공

# 6. Push
git push origin main
```

**완료된 SSH 설정 (2026-03-08)**:
```
원격 URL: git@github.com:h0912w/Passive_component_matching.git
SSH 키: id_ed25519 (기존 존재)
SSH 인증: 성공 (Hi h0912w! You've successfully authenticated...)
```

**재발 방지 규칙**
- SSH 환경에서 Git 작업을 할 때는 **SSH 방식 원격 URL**을 사용할 것
- SSH 키는 한 번 등록하면 별도 인증 없이 push 가능
- 프로젝트 루트의 `.git/config`에서 `[remote "origin"] url` 확인하여 SSH 방식인지 확인

---

## #010

### Tier 2 Live 테스트 실패 — GLM API Rate Limit + 코드 버그

**날짜**: 2026-03-08

**현상**
```
[GLM-Live]          0/2    ❌
  ↳ FAIL: glm_nlp_parse
     Input:    null
     Expected: null
     Actual:   null
예상치 못한 오류: specObj.input.trim is not a function

[Random-Validation]    0/?    ❌
  ↳ FAIL: unknown
```

**피드백 메시지**:
```
HTTP 429: {"error":{"code":"1302","message":"您的账户已达到速率限制，请您控制请求频率"}}
```
(번역: "귀하의 계정이 속도 제한에 도달했습니다, 요청 빈도를 제어하십시오")

**원인 1: GLM API Rate Limit (기본 원인)**
- GLM API 연속 호출 속도가 너무 빨라서 Rate Limit(초당 요청 횟수) 초과
- GLM-Live 테스트 2개 연속 호출 → Rate Limit → Random-Validation도 실패
- 여러 GLM 테스트가 연속 실행될 때는 누적 호출 횟수 초과 가능

**원인 2: 코드 버그 `specObj.input.trim is not a function`**
- `specObj.input`가 문자열이 아닌 다른 타입(객체/undefined/null)으로 넘어오고 있음
- `test-glm-live.js`의 테스트 스펙 구조 문제 가능성

**조치사항 1 (Rate Limit)**:
1. `tests/test-glm-live.js`에서 GLM API 호출 사이에 **최소 3~5초 딜레이** 추가
2. `tests/test-random-validation.js`에서 GLM 카테고리별 배치 호출 사이에 **2초 이상 딜레이** 확보
3. 여러 GLM 테스트가 연속 실행될 때는 테스트 순서 조정: `Mouser-Live` → `GLM-Live` → `Random-Validation` 사이에 딜레이

**조치사항 2 (코드 버그)**:
1. `tests/test-glm-live.js`에서 `specObj.input`의 타입을 확인하고 디버깅
2. `apps-script/GlmClient.gs`의 `_parseWithNlp` 함수에서 응답 파싱 로직 검증
3. `input`이 문자열이 아닐 경우 예외 처리 추가

**재발 방지 규칙**
- 외부 API를 연속 호출하는 테스트는 항상 **딜레이를 두고 순차 실행**할 것
- Rate Limit 관련 오류는 HTTP 429 외에 500으로도 나타날 수 있음 (이슈 #004 참조)
- 테스트 스펙 객체의 타입을 검증할 것 — `trim()` 같은 문자열 메서드 호출 전 타입 체크 필수

---

*마지막 업데이트: 2026-03-08*
