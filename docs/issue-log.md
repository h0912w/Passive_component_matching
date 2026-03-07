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

*마지막 업데이트: 2026-03-07*
