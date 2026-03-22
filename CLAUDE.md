# CLAUDE.md — 저항 스펙 → 구매 가능 Part Number 변환 웹서비스

> **이 파일은 Claude Code가 이 프로젝트 작업 시 항상 참조하는 최우선 지침서다.**
> 이 파일에 명시된 규칙은 사용자의 임시 지시보다 우선한다. 규칙을 변경하려면 이 파일을 직접 수정해야 한다.

---

## 0. 즉시 읽어야 할 절대 금지사항 (HARD RULES)

| # | 절대 금지 |
|---|---|
| 🚫 1 | **프런트엔드 코드(HTML/JS)에 API 키를 하드코딩하는 것** |
| 🚫 2 | **규칙 기반 파서 없이 처음부터 LLM에 전부 의존하는 추출 로직을 구현하는 것** |
| 🚫 3 | **LLM(GLM API) 결과를 검증 코드 없이 최종값으로 바로 사용하는 것** |
| 🚫 4 | **Blogger 제약을 무시하고 다중 파일 구조(CSS 분리, JS 분리)로 먼저 만드는 것** |
| 🚫 5 | **코드 수정 후 QA(`qa-fullstack-guardian`) 호출을 생략하는 것** |
| 🚫 6 | **규칙 문서(`/rules/`)를 갱신하지 않고 프롬프트만 계속 덧대는 방식으로 유지보수하는 것** |
| 🚫 7 | **서비스 런타임 경로에서 Claude Code 또는 Claude Code 내장 LLM을 호출하는 것** |
| 🚫 8 | **멀티 유통사 통합 검색 또는 저항 외 부품군으로 범위를 확장하는 것** |

---

## 1. 프로젝트 개요

### 1.1 목적
회로도에 기입된 자유형 저항 스펙 문자열을 실제 구매 가능한 **Mouser Part Number**로 변환하는 검증형 웹서비스를 구현한다.

### 1.2 핵심 전제 (절대 불변)
- **Claude Code는 개발/구현/검토 도구**다. 런타임에는 관여하지 않는다.
- **서비스 런타임 LLM = GLM API (`glm-4.7`)만 허용**한다.
- **추출 주체 = 규칙 기반 파서 우선, GLM API는 보조/더블체크 역할만**이다.
- **Mouser 부품 스펙 DB = 프로젝트 최초 1회만 일괄 수집 허용** (이후 정적 유지, 재수집 금지)

### 1.3 기술 스택
| 구분 | 기술 | 비고 |
|---|---|---|
| 프런트엔드 | 단일 `index.html` (CSS/JS 인라인) | Blogger 본문 HTML 직접 삽입 |
| 백엔드 | Cloudflare Workers (TypeScript) | `wrangler` 기본 TS 템플릿 |
| 런타임 LLM | GLM API (`glm-4.7`) | 보조 추출, 더블체크만 사용 |
| GLM API 엔드포인트 | `https://api.z.ai/api/paas/v4` | 코딩 전용 엔드포인트는 런타임 사용 금지 |
| 부품 검색 | Mouser API + 로컬 스펙 DB | 실시간 조회 + 1회 수집 DB 병행 |
| API 키 관리 | Cloudflare Workers Secret | 프런트엔드 노출 절대 금지 |

> ⚠️ **GLM 모델명 확인 필요**: `glm-4.7`은 추정(~85%)임. z.ai 대시보드 → 모델 목록에서 실제 model string 확인 후 20절 항목 F 수정 필요.

---

## 2. 참조 문서 목록

> CLAUDE.md는 규칙의 **위치와 요약**만 기록한다. 상세 내용은 아래 문서를 참조한다.
> 각 문서는 운영 중 발견되는 새 지식을 반영하며 지속적으로 성장한다.

| 문서 | 경로 | 역할 |
|---|---|---|
| 스펙 추출 규칙 | `/rules/spec_extraction_rules.md` | 저항 표기 패턴, 파서 우선순위, 신뢰도 계산 상세 |
| GLM API 계약 | `/docs/glm_api_contract.md` | GLM API 입출력 스키마, 프롬프트 패턴, 시행착오 기록 |
| Mouser 스펙 DB (집계) | `/db/mouser_resistor_specs.json` | 최초 1회 수집한 저항 스펙 집계 값 목록 |
| Mouser 원본 부품 DB | `/db/mouser_parts_raw.json` | 최초 1회 수집한 개별 부품 레코드 745건 |
| Mouser DB 수집 가이드 | `/docs/mouser_db_guide.md` | 1회 수집 절차, API 동작 특성, 시행착오 기록 |
| Mouser DB 현황 | `/db/db_status.md` | 수집 현황, 품질 분석, 활용 현황 (수집 후 갱신 필수) |
| Blogger HTML 규칙 | `/rules/blogger_html_rules.md` | 배포 후 에러 발생 시마다 갱신하는 성장형 규칙 |
| SEO 문구 | `/docs/seo_content.md` | 포스트 제목, 메타, 소개문구, FAQ, JSON-LD |
| 저항 표기 가이드 | `/rules/resistor_notation_guide.md` | 사람이 읽는 표기 규칙 레퍼런스 |
| 규칙 변경 이력 | `/spec-evolution/rule_changelog.md` | 파서 규칙 변경 이력 추적 |

---

## 3. 폴더 구조

```text
/project-root
├── CLAUDE.md
├── /.claude
│   ├── /skills
│   │   ├── /resistor-spec-normalizer   ← 단위/기호/패키지 정규화 절차
│   │   ├── /spec-notation-miner        ← 표기 규칙 수집·문서화·자기개선
│   │   ├── /glm-spec-checker           ← GLM 호출 절차, 프롬프트 관리
│   │   ├── /mouser-db-builder          ← Mouser 스펙 DB 1회 수집 절차
│   │   ├── /mouser-search-client       ← Mouser API 실시간 검색
│   │   ├── /reverse-validator          ← 최종 PN 역검증
│   │   └── /blogger-ui-packager        ← 단일 HTML 산출물 생성 (SEO 포함)
│   └── /skills
│       └── (스킬 파일만 위치, 에이전트 없음)
├── /src
│   ├── /frontend                       ← index.html 원본
│   ├── /worker                         ← Cloudflare Worker TypeScript 코드
│   ├── /shared                         ← 공통 타입/유틸
│   └── /tests                          ← 테스트 케이스
├── /rules
│   ├── resistor_notation_guide.md
│   ├── spec_extraction_rules.md        ← 파서 상세 규칙 (CLAUDE.md에서 참조)
│   ├── resistor_value_patterns.json
│   ├── package_alias_map.json
│   ├── tolerance_alias_map.json
│   ├── power_alias_map.json
│   └── blogger_html_rules.md
├── /db
│   ├── mouser_resistor_specs.json      ← 최초 1회 수집 저항 스펙 집계 DB
│   ├── mouser_parts_raw.json           ← 최초 1회 수집 원본 부품 레코드 DB (745건)
│   ├── collection_metadata.json        ← 수집 일시, 범위, 버전 정보
│   └── db_status.md                    ← DB 현황, 품질 분석, 수집 이력 (수집 후 갱신 필수)
├── /docs
│   ├── glm_api_contract.md             ← GLM API 계약 (성장형 문서)
│   ├── mouser_db_guide.md              ← Mouser DB 수집 절차
│   └── seo_content.md                  ← SEO 문구 모음
├── /output
│   ├── /build                          ← 최종 HTML 산출물
│   ├── /steps                          ← 각 단계별 처리 결과물 (디버깅용)
│   │   ├── step01_raw_input.json
│   │   ├── step02_normalized.json
│   │   ├── step03_rule_loaded.json
│   │   ├── step04_rule_parsed.json
│   │   ├── step05_confidence.json
│   │   ├── step06_glm_result.json
│   │   ├── step07_merged.json
│   │   ├── step08_schema_validated.json
│   │   ├── step09_candidates.json
│   │   ├── step10_filtered.json
│   │   ├── step11_ranked.json
│   │   ├── step12_selected.json
│   │   ├── step13_verified.json
│   │   ├── step14_result_table.json
│   │   └── step15_rendered.html
│   ├── /qa                             ← QA 리포트 (타임스탬프 포함)
│   └── /logs
└── /spec-evolution
    ├── failure_cases.jsonl
    └── rule_changelog.md
```

> **규칙**: 새 파일은 반드시 위 구조 안에 위치시킨다. 구조 변경 시 이 파일 먼저 수정.

---

## 4. Skills 폴더 설명

> **Skills는 "Claude Code가 특정 작업 전에 읽는 전문 지식 문서"다.**
> 작업 중 발견되는 새 지식, 실패 패턴, 최적 절차를 `SKILL.md`에 축적하면
> 다음 실행 시 Claude Code가 그 경험을 그대로 이어받아 같은 실수를 반복하지 않는다.

| 스킬 | 역할 | 성장 트리거 |
|---|---|---|
| `resistor-spec-normalizer` | 단위·기호·패키지 정규화 절차 | 새 표기 변형 발견 시 |
| `spec-notation-miner` | 표기 규칙 수집·분류·문서화 + 실패 사례 분석 | 파서 실패 사례 누적 시 |
| `glm-spec-checker` | GLM API 호출 절차, 프롬프트 템플릿, 응답 파싱 | GLM 응답 패턴 변화·오류 발견 시 |
| `mouser-db-builder` | Mouser 스펙 DB 최초 1회 수집 절차 | 최초 실행 1회만 사용 |
| `mouser-search-client` | Mouser API 실시간 검색 절차, 응답 정리 | API 스펙 변경·에러 패턴 발견 시 |
| `reverse-validator` | 최종 PN 재조회 및 항목별 일치 판정 절차 | 역검증 엣지케이스 발견 시 |
| `blogger-ui-packager` | 단일 HTML 산출물 생성 절차 (SEO 포함) | Blogger 배포 에러 발견 시 |

---

## 5. Mouser 스펙 DB (최초 1회 수집)

### 5.1 목적
Mouser 칩저항 카테고리 전체에서 실제 유통되는 스펙 값 목록(저항값, 패키지, 오차, 전력)을 추출해 로컬에 저장한다.
이 DB를 파서 및 역검증의 기준 값 집합으로 활용해 추출 정확도를 높인다.

### 5.2 수집 대상
```
URL: https://www.mouser.kr/c/passive-components/resistors/
추출 대상 필드: 저항값, 패키지/케이스, 오차, 전력 정격
```

### 5.3 수집 정책
- **최초 프로젝트 셋업 시 1회만 수행**한다.
- 이후 재수집은 운영자가 명시적으로 요청할 때만 허용한다.
- 수집 결과는 `/db/mouser_resistor_specs.json`에 저장한다.
- 수집 일시·범위·건수는 `/db/collection_metadata.json`에 기록한다.
- 상세 수집 절차는 `/.claude/skills/mouser-db-builder/SKILL.md` 및 `/docs/mouser_db_guide.md`를 참조한다.

### 5.4 DB 활용 방법
- 파서 신뢰도 계산 시: 추출된 값이 DB에 실제 존재하는 값인지 교차 확인
- 역검증 시: PN 스펙이 DB의 정규 값 집합에 속하는지 확인
- 표기 규칙 보강 시: DB에서 발견된 새 표기 패턴을 `spec-notation-miner`에 입력

---

## 6. 개발 단계 순서

> **반드시 이 순서를 따른다. 단계 0 완료 전에 코드 구현을 시작하지 않는다.**

```
[단계 0-A] Mouser 스펙 DB 1회 수집     ← mouser-db-builder 스킬
[단계 0-B] 스펙 추출 규칙 문서화        ← spec-notation-miner 스킬
           ↓ (두 단계 병행 가능)
[단계 1]   규칙 기반 파서 구현           ← general-purpose
           ↓
[단계 2]   GLM API 보조 추출 구현        ← general-purpose
           ↓
[단계 3]   Mouser API 연동 구현          ← general-purpose
           ↓
[단계 4]   역검증 + 결과표 구현          ← general-purpose
           ↓
[단계 5]   Blogger HTML 패키징           ← blogger-ui-packager 스킬
           ↓
[단계 6]   전체 QA                       ← qa-fullstack-guardian
```

### 단계 0-B: 스펙 추출 규칙 문서화 완료 조건
- [ ] `/rules/spec_extraction_rules.md` 초안 완성
- [ ] 4개 alias map JSON 파일 초안 완성
- [ ] 구분자 변형 패턴 전수 조사 완료 (6절 참조)
- [ ] 최소 30개 이상 테스트 케이스 정의

---

## 7. 구분자 변형 패턴 (전수 조사 필요)

> 사용자마다 스펙 토큰 사이에 다른 구분자를 사용한다.
> 파서는 아래 모든 패턴을 동일하게 처리해야 한다.

| 구분자 유형 | 예시 |
|---|---|
| 공백 (기본) | `1k 0603 5% 0.25W` |
| 슬러시 | `1k/0603/5%/0.25W` |
| 언더바 | `1k_0603_5%_0.25W` |
| 대시 | `1k-0603-5%-0.25W` |
| 콤마 | `1k,0603,5%,0.25W` |
| 세미콜론 | `1k;0603;5%;0.25W` |
| 탭 | `1k\t0603\t5%\t0.25W` |
| 혼합 | `1k/0603 5%_0.25W` |
| 구분자 없음 | `1k0603` (토큰 경계 추론 필요) |
| 괄호 포함 | `1k (0603) 5% 0.25W` |
| 대괄호 포함 | `1k [0603] [5%]` |

> 상세 패턴 및 파서 처리 로직은 `/rules/spec_extraction_rules.md` 참조.
> 새 구분자 패턴 발견 시 해당 문서를 먼저 갱신한 후 파서 코드에 반영한다.

---

## 8. 런타임 워크플로우 및 단계별 결과물 저장

> 각 단계는 처리 완료 후 결과를 `/output/steps/` 에 저장한다.
> 문제 발생 시 어느 단계부터 이상이 생겼는지 즉시 확인 가능하다.

```
[사용자 입력]
      ↓
① 입력 수집          → 프런트엔드  →  step01_raw_input.json
② 입력 전처리        → 프런트엔드  →  step02_normalized.json
③ 표기 규칙 로딩     → Worker     →  step03_rule_loaded.json
④ 규칙 기반 파싱     → Worker     →  step04_rule_parsed.json
⑤ 신뢰도 판정        → Worker     →  step05_confidence.json
      ↓
   [신뢰도 충분?]
   YES → ⑦로 이동
   NO  → ⑥ GLM API 보조   → step06_glm_result.json
      ↓
⑦ 추출 결과 병합     → Worker     →  step07_merged.json
⑧ 스키마 검증        → Worker     →  step08_schema_validated.json
⑨ Mouser 후보 검색   → Worker     →  step09_candidates.json
⑩ 후보 필터링        → Worker     →  step10_filtered.json
⑪ 후보 정렬          → Worker     →  step11_ranked.json
⑫ 최종 PN 선정       → Worker     →  step12_selected.json
⑬ 역검증             → Worker     →  step13_verified.json
⑭ 결과표 생성        → Worker     →  step14_result_table.json
⑮ UI 표시            → 프런트엔드  →  step15_rendered.html
      ↓
[QA] → qa-fullstack-guardian
```

### 8.1 단계별 결과물 저장 규칙
- 개발/디버깅 모드에서는 **모든 단계 결과를 저장**한다.
- 프로덕션 모드에서는 step04, step07, step13만 저장한다 (최소 디버그 포인트).
- 실패 발생 단계의 결과물에는 `"error": true, "error_code": "..."` 필드를 추가한다.
- 각 결과물에는 `"step"`, `"timestamp"`, `"input_from_prev_step"` 필드를 포함한다.

### 8.2 상태 코드 (State Machine)
```
RECEIVED → NORMALIZED → RULE_PARSED → PARSE_ASSESSED
→ (GLM_AUGMENTED) → EXTRACT_VALIDATED → SEARCHED
→ FILTERED → RANKED → SELECTED → VERIFIED → RENDERED
→ QA_PASSED | FAILED
```

---

## 9. 판단 주체 규칙

### ✅ Worker 코드
- 저항값/패키지/오차/전력 1차 추출 (규칙 기반 파서)
- 파서 신뢰도 점수 계산
- Mouser 스펙 DB 교차 확인
- 추출 결과 병합 및 최종 구조화
- 후보 필터링, 비교, 정렬
- 역검증 (최종 PN 재조회 + 항목별 비교)
- 결과표 11열 생성

### ✅ GLM API (`glm-4.7`) 보조 — 조건부 사용
> 상세 사용 조건 및 입출력 계약: `/docs/glm_api_contract.md` 참조

| 사용 조건 | 역할 |
|---|---|
| `resistance` 확정 실패 | 누락 필드 보완 |
| 토큰 충돌·다중 해석 가능성 | 더블체크 |
| 후보 정렬 tie-break 애매 | 보조 평가 의견 (코드가 최종 확정) |

### ❌ GLM API 금지 행위
- 최종 PN 직접 선택 / 역검증 최종 판정 / 코드 결과 무시 후 새 답 확정

### ✅ Claude Code (`general-purpose`)
- 모든 코드 구현, 리팩터링, 테스트 작성
- 규칙 문서 갱신, GLM 프롬프트 설계, HTML 패키징
- **런타임 경로에서는 절대 호출되지 않음**

---

## 10. 스펙 추출 규칙 (외부 문서 참조)

> 상세 추출 규칙은 **`/rules/spec_extraction_rules.md`** 를 참조한다.
> 이 파일에는 요약만 기재한다.

| 추출 대상 | 처리 주체 | 참조 |
|---|---|---|
| 저항값 표기 (`4R7`, `1K`, `330R` 등) | 규칙 기반 파서 | `/rules/spec_extraction_rules.md` §1 |
| 패키지 표기 (`1608`, `0603` 등) | 규칙 기반 파서 + alias map | `/rules/spec_extraction_rules.md` §2 |
| 오차 표기 (`1%`, `F`, `J` 등) | 규칙 기반 파서 | `/rules/spec_extraction_rules.md` §3 |
| 전력 표기 (`1/8W`, `0.125W` 등) | 규칙 기반 파서 | `/rules/spec_extraction_rules.md` §4 |
| 구분자 변형 처리 | 규칙 기반 파서 (전처리 단계) | `/rules/spec_extraction_rules.md` §5 |
| 신뢰도 점수 계산 | Worker 코드 | `/rules/spec_extraction_rules.md` §6 |

> **규칙 갱신 절차**: 새 패턴 발견 → `/spec-evolution/failure_cases.jsonl` 기록 → `spec-notation-miner` 호출 → `/rules/spec_extraction_rules.md` 갱신 → 파서 코드 수정 → QA 재실행

---

## 11. GLM API 계약 (외부 문서 참조)

> 상세 입출력 스키마 및 프롬프트 템플릿은 **`/docs/glm_api_contract.md`** 를 참조한다.
> 이 파일에는 요약만 기재한다.

- 모델: `glm-4.7` | 엔드포인트: `https://api.z.ai/api/paas/v4`
- temperature: `0` (결정론적 응답 우선)
- 재시도: 최대 2회, 이후에도 실패하면 코드 결과 우선
- 응답은 반드시 JSON 파싱 후 스키마 검증을 거쳐야 한다
- 호출 시마다 `used: true, reason: "<사유>"` 로깅 필수

> **계약 문서 갱신 트리거**: 새 응답 패턴 발견, 오류 케이스 확인, 프롬프트 개선 시마다 `/docs/glm_api_contract.md` 에 시행착오를 기록한다.

---

## 12. Mouser API 검색 규칙

- `resistance` 값은 반드시 검색 조건에 포함
- `package`, `tolerance`, `power`는 입력에서 추출된 경우에만 포함
- 패키지는 양쪽 alias를 **OR 조건**으로 검색
- 후보 정렬: 재고 수량 내림차순 → lifecycle `Active` 우선 → tie-break
- 역검증: 정규화된 값 기준 비교, 불일치 시 다음 후보 재시도
- **sub-kΩ 검색 키워드**: `"X ohm"` 형식으로 단위 명시 필수 — 단위 없이 `"X"`만 보내면 kΩ급 부품이 상위에 노출됨 (FC-004)
- **저항값 필터 윈도우**: 사용자 지정 오차가 있으면 `min(user_tol%, 5%)` 를 저항값 허용 범위로 적용 — 고정 ±5% 필터는 사용자 정밀도 요구를 무시함 (FC-005)
- **Description 파싱 우선순위**: IEC RKM 3파트 → Kohms/Mohms 형식 → ohms 형식 → K/M/R 단독 — `ProductAttributes`에는 저항 스펙 없음, Description만 사용 (FC-003)

---

## 13. 결과 테이블 스펙 (11열 고정)

| 열 | 이름 | 열 | 이름 |
|---|---|---|---|
| 1 | Input | 7 | Input Tolerance |
| 2 | Mouser PN | 8 | PN Tolerance |
| 3 | Input Resistance | 9 | Input Power |
| 4 | PN Resistance | 10 | PN Power |
| 5 | Input Package | 11 | Validation (`PASS` / 실패코드) |
| 6 | PN Package | | |

**실패 코드**: `RESISTANCE_NOT_FOUND` / `EXTRACTION_INVALID` / `AMBIGUOUS_INPUT` / `NO_CANDIDATES` / `VERIFICATION_FAILED`

---

## 14. 실패 처리 정책

| 실패 유형 | 처리 방식 |
|---|---|
| 규칙 문서 로딩 실패 | **즉시 실패 반환** |
| 규칙 기반 파서 partial 추출 | GLM API 보조 단계로 전달 |
| `resistance` 추출 실패 (GLM 포함) | 즉시 `RESISTANCE_NOT_FOUND` 반환 |
| Mouser 검색 0건 | `NO_CANDIDATES` + 사용자 메시지 |
| 역검증 불일치 | 다음 후보로 자동 재시도 |
| GLM 응답 모호/충돌 | 재시도 2회 → 코드 우선 원칙 |
| 파서 실패 | `/spec-evolution/failure_cases.jsonl` 자동 기록 |

---

## 15. 에이전트 구조

```
[Claude Code 오케스트레이터]
         ↓
[mouser-db-builder]      ← 단계 0-A, 최초 1회만
[spec-notation-miner]    ← 단계 0-B + 실패 사례 입력 시 규칙 개선
         ↓
[general-purpose]        ← 단계 1~5 코드 구현 전담
         ↓
[qa-fullstack-guardian]  ← 단계 6: 구현/수정 후 QA
                            (글로벌 에이전트: ~/.claude/agents/qa-fullstack-guardian.md)
```

---

## 16. QA 테스트 전략

### 16.0 브라우저 직접 검증 (필수 — 절대 생략 불가)

> ⚠️ **이 항목은 QA의 전제조건이다. AI(Claude Code)가 직접 수행해야 한다.**

```
QA 실행 시 AI는 반드시 아래 절차를 직접 수행해야 한다:

1. src/frontend/index.html 을 웹브라우저로 직접 열기
   (mcp__ide__executeCode 또는 Bash로 브라우저 실행)
2. 주요 입력 케이스를 폼에 직접 입력하고 버튼 클릭
3. 결과 테이블이 정상 렌더링되는지 눈으로 확인
4. 브라우저 콘솔 에러 확인
5. 스크린샷 또는 실행 결과 증거 첨부
```

**브라우저 검증 없이 QA 리포트를 "Ready" 또는 "Ready with caution"으로 판정하는 것은 금지된다.**
브라우저 검증을 수행하지 못한 경우 반드시 "Not ready — 브라우저 미검증" 으로 기록해야 한다.
(단, 코드 리뷰만 요청한 경우는 예외)

### 16.1 랜덤 케이스 생성 (매 QA 실행 시)
> QA는 **고정 케이스 + 랜덤 케이스(10개 정도)**를 함께 사용한다.
> 랜덤 케이스는 실제 저항값·패키지·오차·전력을 조합해 생성한다.
> (생성 로직: `/src/tests/test-cases.json` 참조 — 랜덤 케이스는 QA 실행 시 생성)

### 16.2 고정 케이스
```json
{
  "normal":   ["1k 1608 5% 0.25W", "10k 0603 1% 1/10W", "0R 2012", "4R7 1608 5%"],
  "partial":  ["1k", "1k 0603", "1k 5%"],
  "failure":  ["abcdef", "0603 5%", "1k ????"],
  "variants": ["4K7", "1R0", "1K0", "2M2", "1/16W", "±5%", "4.7ohm", "1608 1k 5%"]
}
```

### 16.3 QA 체크리스트
- [ ] **브라우저 직접 실행 — AI가 직접 수행 (§16.0 참조, 생략 불가)**
- [ ] 랜덤 케이스 10개 정도 + 고정 케이스 전체
- [ ] 복사 기능 3종 (PN 열 / TSV 전체 / 단건)
- [ ] 오류 상황 표시
- [ ] 브라우저 콘솔 에러 없음
- [ ] **Blogger 삽입 버전 동작** ← 실패 시 `/rules/blogger_html_rules.md` 갱신 필수
- [ ] 모바일/데스크톱 반응형
- [ ] CORS 오류 없음
- [ ] `/output/steps/` 각 단계 결과물 정상 생성 확인

---

## 17. Blogger 배포 제약

- 최종 산출물: `/output/build/index.html` 단일 파일
- 배포 방법: 사용자가 `/output/build/index.html` 파일 내용을 전체 복사하여 Blogger 포스트 편집기 → HTML 모드에 붙여넣기
- 필수 구조: `<div id="resistor-tool-root">` 래퍼, IIFE 패턴
- 상세 HTML 규칙: `/rules/blogger_html_rules.md` 참조 (배포 후 에러 발생 시 갱신)

---

## 18. SEO 규칙

- 상세 문구: `/docs/seo_content.md` 참조
- `blogger-ui-packager` 는 HTML 생성 전 반드시 이 파일을 읽는다
- 파일에 없는 SEO 문구 임의 추가 금지

---

## 19. 구현 시 Claude Code 행동 원칙

### 작업 시작 전 체크리스트
- [ ] 0절 절대 금지사항 확인
- [ ] 단계 0 (DB 수집 + 규칙 문서화) 완료 여부 확인 — 미완료 시 코드 작성 금지
- [ ] `/rules/` 최신 상태 확인
- [ ] HTML 생성 작업 시 `/docs/seo_content.md` 존재 확인

### 코드 작성 원칙
1. 스펙 추출은 규칙 기반 파서 먼저, GLM API는 별도 분기
2. 각 단계 완료 시 `/output/steps/stepXX_*.json` 저장
3. GLM API 호출 시 `used: true, reason` 로깅 필수
4. `resistance` 없으면 즉시 반환
5. 모든 API 키는 Worker Secret에서만 읽기
6. HTML 생성 전 `/docs/seo_content.md` 먼저 읽기

### 수정 후 의무 절차
```
수정 발생
  → /rules/ 관련 문서 갱신 여부 확인
  → 테스트 케이스 추가/갱신
  → qa-fullstack-guardian 호출 (글로벌 에이전트, /src/tests/test-cases.json 참조)
  → /output/qa/qa_report_<timestamp>.md 확인
  → Blogger 에러 시 /rules/blogger_html_rules.md 갱신
  → GLM 계약 변경 시 /docs/glm_api_contract.md 갱신
```

---

## 20. 정책 결정 기록

| # | 항목 | 결정값 |
|---|---|---|
| A | Workers 코드 언어 | **TypeScript** |
| B | 오차 문자코드 | **F=±1%, J=±5% 포함** |
| C | Blogger 삽입 위치 | **본문 HTML 직접 삽입** |
| D | 패키지 alias | **양방향 (1608↔0603 등)** |
| E | 파서 신뢰도 | **필드 완성도(60%) + 토큰 매칭률(40%) 조합** |
| F | GLM 모델명 | **`glm-4.7` (추정 ~85%) — 확인 후 수정 필요** |
| G | Mouser 스펙 DB | **최초 1회 일괄 수집, 이후 정적 유지** |

> 항목 D, E 상세: v1.2 참조 (폴더 내 이전 버전 보관)

---

*문서 버전: v3.0 | 기반 설계서: `claude_code_resistor_service_design_guideline_v3.md`*

| 버전 | 수정 내용 |
|---|---|
| v1.x | 초안 ~ 정책 결정 완료 |
| v2.0 | glm-4.7 반영, 개발단계 0 추가, 자기개선 루프, QA 랜덤 전략, Blogger/SEO 문서 신설 |
| v3.0 | Mouser 스펙 DB 1회 수집 허용, 구분자 변형 패턴 추가, 단계별 결과물 저장 체계, 스펙 추출 규칙·GLM 계약을 외부 문서로 분리, Skills 폴더 역할 설명 추가 |
