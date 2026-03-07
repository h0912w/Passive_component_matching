# 사용자 설정 가이드 (User Setup Guide)

> 이 문서는 **사람이 직접 수행해야 하는** 초기 설정 절차를 모아둔 가이드입니다.
> Claude가 자동화할 수 없는 작업들(계정 생성, 웹 UI 클릭, API 키 발급 등)이 포함됩니다.
> 프로젝트를 처음 시작할 때 이 문서의 절차를 순서대로 따르세요.

---

## 목차

1. [Mouser API 키 발급](#1-mouser-api-키-발급)
2. [ZhipuAI GLM API 키 발급](#2-zhipuai-glm-api-키-발급)
3. [GitHub Actions 초기 설정](#3-github-actions-초기-설정)
4. [Apps Script 프로젝트 생성 및 배포](#4-apps-script-프로젝트-생성-및-배포)
5. [로컬 개발 환경 설정](#5-로컬-개발-환경-설정)

---

## 1. Mouser API 키 발급

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

**Rate Limit**: 30 요청/분, 1000 요청/일

---

## 2. ZhipuAI GLM API 키 발급

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

**사용 모델**: `glm-4.7-flash` (2026-01 출시, 빠른 응답, 비용 효율. 구 `glm-4-flash`는 deprecated)

**용도**: 사용자 자연어 입력을 구조화된 저항값/패키지/오차로 변환 (NlpParser 에이전트)

---

## 3. GitHub Actions 초기 설정

### 3-1. Workflow permissions 변경 (필수 — 1회만)

> ⚠️ 이 설정을 하지 않으면 sync-to-main 잡이 403 Permission Denied로 실패합니다.
> 상세 원인은 `docs/issue-log.md` #001 참조.

1. GitHub 리포지토리 → **Settings** → **Actions** → **General**
2. 스크롤 맨 아래 **"Workflow permissions"** 섹션
3. **"Read and write permissions"** 선택 (기본값은 Read-only)
4. **Save** 클릭

**확인 방법**: push 후 Actions 탭 → "Sync to main" 잡이 ✅인지 확인.

### 3-2. Repository Secrets 등록 (Tier 2 live 테스트용)

1. GitHub 리포지토리 → **Settings** → **Secrets and variables** → **Actions**
2. **"New repository secret"** 클릭 후 아래 항목 등록:

| Secret 이름 | 값 |
|-------------|-----|
| `MOUSER_API_KEY` | 발급받은 Mouser API 키 |
| `GLM_API_KEY` | 발급받은 ZhipuAI GLM API 키 |

**동작 흐름**:
```
git push → Tier 1 (mock 테스트) → 통과 → Tier 2 (live API 테스트, Secrets 키 사용)
                                 → 실패 → Tier 2 스킵 + main 동기화 중단
```

- Secrets는 암호화 저장되며 로그에 `***`로 마스킹됨
- 실패 시 `tests/feedback/last-failure.json`이 Artifact로 업로드됨

---

## 4. Apps Script 프로젝트 생성 및 배포

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

각 파일 생성 후 GitHub `main` 브랜치의 `apps-script/` 폴더에 있는 동일 파일 내용을 붙여넣기.

> **팁**: `clasp` CLI를 사용하면 push 명령으로 자동 업로드 가능 (아래 Step 5 참고)

### Step 3: API 키 등록 (스크립트 속성)

> **보안 핵심**: 키는 코드가 아닌 스크립트 속성에만 저장. Git에 절대 올라가지 않음.

1. Apps Script 에디터 좌측 **⚙️ 프로젝트 설정** 클릭
2. 스크롤 내려 **"스크립트 속성"** 섹션 찾기
3. **"속성 추가"** 버튼 클릭 후 아래 항목 등록:

| 속성 이름 | 값 |
|-----------|-----|
| `MOUSER_API_KEY` | 발급받은 Mouser API 키 |
| `GLM_API_KEY` | 발급받은 ZhipuAI GLM API 키 |

4. **"스크립트 속성 저장"** 클릭

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

### Step 5 (선택사항): clasp CLI로 자동 업로드

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

### Step 6: 배포 업데이트 (코드 수정 시)

소스코드를 수정할 때마다:
1. **"배포"** → **"배포 관리"** 클릭
2. 기존 배포 옆 ✏️ 편집 아이콘 클릭
3. 버전: **"새 버전"** 선택
4. **"배포"** 클릭

---

## 5. 로컬 개발 환경 설정

### .env 파일 생성 (Tier 2 live 테스트용)

```bash
# .env.example을 복사해서 .env 생성 (Git에 커밋하지 말 것)
cp .env.example .env

# .env 파일에 실제 키 입력
MOUSER_API_KEY=실제키입력
GLM_API_KEY=실제키입력
```

### API 키 저장 위치 요약

| 환경 | 저장 방법 | Git 포함 여부 |
|------|----------|--------------|
| **Apps Script (배포)** | 에디터 > 프로젝트 설정 > 스크립트 속성 | ❌ 포함 안 됨 |
| **로컬 Node.js 테스트** | `.env` 파일 | ❌ `.gitignore`로 차단 |
| **GitHub Actions (CI)** | Repository Secrets | ❌ 암호화 저장, 로그에 마스킹 |
| **GitHub 소스코드** | 키 없음 — 읽기 함수만 존재 | ✅ 안전 |

> **절대 규칙**: API 키를 소스코드나 Git에 절대 커밋하지 않는다.
