# QA 리포트 — 저항 스펙 → Mouser Part Number 변환 웹서비스

**일시**: 2026-03-22
**검토자**: qa-fullstack-guardian
**대상 버전**: main 브랜치 (fdff8a0)
**Worker 엔드포인트**: https://resistor-part-finder.h0912w.workers.dev

---

## 1. 검토 범위

- 프런트엔드: `src/frontend/index.html` (단일 HTML, CSS/JS 인라인)
- 백엔드: Cloudflare Worker (배포 완료)
  - `src/worker/src/index.ts` — 파이프라인 오케스트레이터
  - `src/worker/src/parser.ts` — 규칙 기반 저항 스펙 파서
  - `src/worker/src/mouser.ts` — Mouser API 검색 + 필터링
  - `src/worker/src/validator.ts` — 역검증 + 결과 행 생성
  - `src/worker/src/glm.ts` — GLM API 보조 추출
- 기대 기능: 자유형 저항 스펙 문자열 → Mouser Part Number 변환, 11열 결과 테이블

---

## 2. 코드 리뷰 요약

### parser.ts

- 전처리(preprocessInput): 탭, 슬러시/언더바/콤마/세미콜론 구분자 정규화, 분수 전력 보존(DIV 치환), 괄호 제거, 구분자 없는 연결 분리(`splitConcatenated`) 구현 — 정상
- FC-001 (± 기호): `parseTolerance`에서 `\u00B1` → `+` 정규화 후 퍼센트 패턴 매칭 — 구현 확인
- FC-002 (슬러시 구분자): 3단계에서 `/` → 공백, 분수 전력 패턴은 DIV 치환으로 보호 — 구현 확인
- **Minor**: `parsePower`가 단위 없는 분수 토큰(`1/4`)도 파싱함. `fracMatch`의 3번째 그룹(단위)이 optional이라 `1/4`, `3/8` 등이 전력으로 처리될 수 있음. 실용적 영향은 제한적이나 잘못된 파싱 경로가 열려 있음.
- `IEC_TOLERANCE` 테이블: B/C/D/F/G/J/K/M 포함, 단독 F/J는 confidence 0.90, 나머지 IEC 코드는 confidence 0.70으로 분리 처리 — 적절

### index.ts

- **Minor (논리 결함)**: line 112 조건 `!ruleParsed.resistance && !confidence.glm_required`가 inverted 의미로 작동함. `glm_required=true`이면 (신뢰도 낮음) 즉시 실패 대신 GLM으로 넘김 — 의도된 흐름이나 `0603 5%` 같이 저항 토큰 자체가 없는 명확한 실패 케이스도 GLM을 불필요하게 호출함. 기능 오류는 아니지만 GLM API 비용 낭비 및 응답 지연 발생.
- 파이프라인 15단계 중 step03/step04/step05/step06/step07/step08만 debug 모드에서 저장됨. step01/step02 이외의 중간 단계가 일부 누락됨 — CLAUDE.md §8.1 기준 개발 모드는 모든 단계 저장이어야 함.
- 역검증 최대 3회 재시도 구현 — 정상

### mouser.ts

- FC-003 (Description 파싱 우선순위): IEC RKM → Kohms/Mohms → ohms → K/M/R 4단계 — 구현 확인
- FC-004 (sub-kΩ 검색 키워드): `formatResistanceForSearch`에서 < 1000Ω일 때 `"X ohm"` 형식 사용 — 구현 확인
- FC-005 (tolerance 기반 저항 필터): `toleranceFraction = max(tol_pct/100, 0.01)`, `resistanceWindow = min(toleranceFraction, 0.05)` — 1% 오차 지정 시 ±1%로 필터 작동 확인
- 패키지 필터: `package_inch` OR `package_metric` 양방향 — 구현 확인
- **Suggestion**: `buildKeyword`에서 패키지 metric alias가 검색 키워드에 포함되지 않음 (`package_inch`만 추가). OR 조건 검색 의도지만 Mouser 키워드 검색에서 단일 토큰만 전달됨. 실제 OR 조건은 아님.

### validator.ts

- **Major (설계 명세 불일치)**: `verifyPart`에서 `status = 'VERIFICATION_FAILED'`를 트리거하는 조건이 저항값 불일치뿐임. 패키지, 오차, 전력 불일치는 `mismatch_details`에만 기록되고 status는 `PASS` 유지. 사용자가 0.5W를 지정했는데 0.125W(1/8W) 부품이 PASS로 반환되는 실증 케이스 확인.
  - 실증: `10R 2012 5% 0.5W` → PN power = 1/8W(0.125W), 4배 차이, `validation: PASS`
  - CLAUDE.md §12 "역검증 불일치 시 다음 후보로 자동 재시도"가 저항값에만 적용됨 — 전력/패키지 불일치 재시도 여부가 설계 명세에 미명시

- **Major (provisional PASS)**: `part.resistance_ohm === null`인 경우(Description 파싱 불가) 역검증 없이 PASS 처리. 테스트한 13개 케이스 중 `1k 1608 5% 0.25W`, `1k 0603` 등 다수에서 `pn_resistance: null`, `pn_package: null`, `pn_power: null` 반환 — 저항값 역검증 없이 PASS 배지 표시. 사용자는 실제 검증 없이 신뢰할 위험 있음.

- Description 파서(`parseResistanceFromDesc`) 중복 구현: `mouser.ts`와 `validator.ts` 양쪽에 동일 로직이 복제됨. 현재 내용은 일치하지만 향후 유지보수 중 불일치 위험 — Minor

### glm.ts

- GLM API 키 환경변수(`env.GLM_API_KEY`)로만 접근 — HARD RULE 1 준수
- 재시도 최대 2회, 429 rate limit 시 sleep(1000) — 구현 확인
- `mergeGlmAugment`: 규칙 파서 결과 우선(null일 때만 GLM 보충) — 코드 우선 원칙 준수
- `applyGlmDoubleCheck`: GLM verified=false + suggested 있을 때만 적용, resistance/package만 — 보수적 적용
- **Minor**: GLM 패키지 필드 정규화 시 `metric`, `inch` 필드를 `p.metric ?? ''`로 처리하는데, TypeScript에서 `??` 연산자 우선순위로 인해 의도한 바는 `(p.metric as string) ?? ''`이지만 p.metric이 undefined이면 빈 문자열이 됨 — 기능 오류는 아니나 타입 단언과 nullish coalescing 혼용이 불명확

### index.html

- **Minor (XSS 잠재 위험)**: `buildPnCell` 함수에서 `onclick="copySinglePn('" + esc(pn) + "')"` 형태로 PN 값이 onclick 속성에 직접 삽입됨. `esc()` 함수가 싱글쿼트(`'`)를 이스케이프하지 않아 이론적으로 onclick 탈출 가능. 실제 Mouser PN은 영숫자+대시 형식이라 현재 공격 벡터는 없으나, 미래 확장 시 위험.
- API 키 하드코딩 없음 — HARD RULE 1 준수
- WORKER_URL이 실제 배포 URL로 올바르게 설정됨 — 확인
- **Minor**: `copyPnColumn()`, `copyTsv()` 함수가 `results.length === 0`일 때 즉시 return하고 사용자에게 아무 피드백(토스트) 없음. 사용자가 빈 결과에서 복사 버튼 클릭 시 무반응.
- Enter 키 지원 구현 — 확인
- 배치 검색 진행 중 진척도 표시 (`N/M 처리 중`) — 구현 확인
- 모바일 반응형 미디어 쿼리 (`max-width: 600px`) — 구현 확인

---

## 3. 테스트 리뷰 요약

- `/src/tests/test-cases.json` 존재: 고정 케이스(normal 6개, partial 5개, failure 5개, variants 13개, edge_cases 5개), 랜덤 생성 규칙 포함
- 자동화된 단위 테스트(jest/vitest 등) 파일 없음: `parser.ts`, `mouser.ts`, `validator.ts`에 대한 단위 테스트 부재
- **Suggestion**: 주요 파서 엣지 케이스(IEC 코드, 단위 없는 분수, 구분자 조합)에 대한 단위 테스트 추가 필요
- **Suggestion**: `filterCandidates`, `rankCandidates`, `verifyPart`에 대한 단위 테스트 추가 필요 — 특히 전력 불일치 PASS 동작을 의도적으로 문서화/테스트해야 함
- 현재 QA는 배포된 Worker에 직접 curl로 통합 테스트 수행

---

## 4. 브라우저 / 런타임 검증

### 브라우저 직접 검증

브라우저를 열어 UI를 직접 클릭하는 방식의 검증을 수행하지 못했다.

사유: `playwright`, `puppeteer` 모두 환경에 설치되어 있지 않음. `cmd.exe /c start` 명령으로 브라우저 실행을 시도했으나 UI 상호작용 자동화 도구가 없어 버튼 클릭, 폼 입력, 렌더링 확인이 불가능함.

코드 리뷰 및 Worker API 직접 호출로 대체 검증을 수행했다.

### Worker API 직접 호출 (실제 배포 서버 검증)

모든 테스트 케이스를 `curl`로 `https://resistor-part-finder.h0912w.workers.dev/parse`에 직접 POST하여 응답을 확인했다.

| 케이스 | 입력 | 응답 validation | PN | 비고 |
|---|---|---|---|---|
| 정상 1 | `1k 1608 5% 0.25W` | PASS | 652-CRT0603PW1001ELF | pn_resistance/package/power null |
| 정상 2 | `10k 0603 1% 1/10W` | PASS | 71-CRCW060310K0FKEI | pn_package/power null |
| 정상 3 | `4R7 1608 5%` | PASS | 603-RC0603JR-134R7L | 전항목 검증 |
| 부분 1 | `1k` | PASS | 594-MCA12060C1001FP5 | 정상 |
| 부분 2 | `1k 0603` | PASS | 652-CRT0603PW1001ELF | pn_resistance/package/power null |
| 실패 1 | `abcdef` | RESISTANCE_NOT_FOUND | null | 정상 |
| 실패 2 | `0603 5%` | RESISTANCE_NOT_FOUND | null | 정상 (GLM 거쳐 실패) |
| 실패 3 | `1k ????` | PASS | 594-MCA12060C1001FP5 | ???? 미매칭 토큰으로 처리 |
| FC-001 | `4.7kohm 0603 ±5% 1/4W` | PASS | 71-CRCW0603J-4.7K-E3 | ± 정규화 정상 |
| FC-002 | `4.7k/0603/5%/0.25W` | PASS | 71-CRCW0603J-4.7K-E3 | 슬러시 정상 |
| FC-005 | `10k 0603 1% 1/10W` | PASS | 71-CRCW060310K0FKEI | 1% 필터 확인 |
| 랜덤 1 | `100R 0402 5% 1/16W` | PASS | 603-RC0402JR-7D100RL | 전항목 검증 |
| 랜덤 2 | `47k 0805 1% 0.125W` | PASS | 603-RC0805FR-0747KL | 전항목 검증 |
| 랜덤 3 | `220R 1206 5% 0.25W` | PASS | 603-RC1206JR-10220RL | 전항목 검증 |
| 랜덤 4 | `2M2 3216 J 1W` | PASS | 71-CRCW1206J-2.2M-E3 | IEC J(5%) 정상 |
| 랜덤 5 | `4R7 0402 1% 1/16W` | PASS | 71-CRCW04024R70FKEDH | pn_power=1/5W |
| 엣지 1 | `0R` | PASS | 603-RC0402JR-130RL | 0옴 점퍼 정상 |
| 엣지 2 | `1k0603` | PASS | 652-CRT0603PW1001ELF | 연결 분리 정상 |
| 전력 불일치 | `10R 2012 5% 0.5W` | **PASS** | 603-RC0805JR-1010RL | **pn_power=1/8W (4배 차이)** |
| 구분자 | `4k7_0603_J_125mW` | PASS | 71-CRCW0603J-4.7K-E3 | 언더바 정상 |

**Health check**: `{"status":"ok"}` 확인

---

## 5. 발견 사항

### Critical
해당 없음

### Major

**M-1. 전력 불일치 시에도 PASS 반환**

- 재현: `10R 2012 5% 0.5W` 입력
- 기대: 사용자가 0.5W를 지정했으므로 0.125W 부품은 VERIFICATION_FAILED 또는 다음 후보 재시도
- 실제: `validation: PASS`, `input_power: 1/2W`, `pn_power: 1/8W` (4배 차이)
- 원인: `validator.ts` verifyPart에서 저항값만 `status = 'VERIFICATION_FAILED'` 트리거, 전력/패키지/오차 불일치는 `mismatch_details`에만 기록
- 영향: 사용자가 고전력 저항이 필요한 설계에서 전력 부족 부품을 구매할 위험
- 확신: 직접 확인 (curl 응답)
- 파일: `src/worker/src/validator.ts` line 86-147

**M-2. pn_resistance null인 부품의 provisional PASS**

- 재현: `1k 1608 5% 0.25W`, `1k 0603` 등 다수 케이스
- 기대: Description 파싱 불가 시 역검증 불가 상태를 결과 테이블에 명시 (예: `PASS (unverified)`)
- 실제: `pn_resistance: null`, `pn_package: null`, `pn_power: null`이지만 `validation: PASS`
- 원인: `validator.ts` line 101-103: `resistance_ohm === null`이면 `resistanceMatch = true` 처리
- 영향: 사용자가 PASS 배지를 보고 부품 스펙이 검증됐다고 오인. 실제로는 검색 키워드로만 1차 필터된 결과
- 확신: 직접 확인 (curl 응답)
- 파일: `src/worker/src/validator.ts` line 100-104

### Minor

**m-1. parsePower가 단위 없는 분수 토큰을 파싱**

- 재현: `parsePower('1/4')` → `watt: 0.25`
- 기대: W/mW 단위가 없으면 전력 토큰으로 인식하지 않아야 함
- 실제: 단위 optional이라 `1/4`, `3/8` 등이 전력으로 파싱
- 영향: `10k 0603 1% 1/4` 같은 입력에서 `1/4`가 전력(0.25W)으로 잘못 파싱
- 파일: `src/worker/src/parser.ts` line 249

**m-2. 결과 없을 때 복사 버튼 무반응**

- 재현: 결과 표시 전 또는 초기화 후 "TSV 전체 복사" / "PN 열 복사" 클릭
- 기대: "결과 없음" 토스트 메시지
- 실제: 아무 반응 없음
- 파일: `src/frontend/index.html` copyPnColumn, copyTsv 함수

**m-3. buildPnCell onclick에서 싱글쿼트 미이스케이프**

- 재현: PN 값에 싱글쿼트가 포함된 경우
- 실제: `esc()` 함수가 `'`를 이스케이프하지 않아 이론적 onclick 탈출 가능
- 영향: 현재 Mouser PN 형식에서는 발생하지 않음. 잠재적 위험
- 파일: `src/frontend/index.html` buildPnCell 함수 line ~412

**m-4. 0603 5% 등 저항 없는 입력에서 불필요한 GLM 호출**

- 재현: `0603 5%` 입력 (저항 토큰 없음)
- 기대: 즉시 RESISTANCE_NOT_FOUND 반환
- 실제: 신뢰도 0.64로 glm_required=true 판정 → GLM 호출 → GLM이 null 반환 → RESISTANCE_NOT_FOUND
- 영향: 불필요한 GLM API 비용 + 응답 지연
- 파일: `src/worker/src/index.ts` line 112

**m-5. Description 파서 코드 중복**

- `mouser.ts`와 `validator.ts`에 동일한 `parseResistanceFromDesc`, `parsePackageFromDesc`, `parseToleranceFromDesc`, `parsePowerFromDesc` 함수가 중복 정의됨
- 현재 내용은 일치하나 향후 유지보수 불일치 위험
- 파일: `src/worker/src/mouser.ts` line 131-177, `src/worker/src/validator.ts` line 187-230

**m-6. debug 모드에서 step04가 선택적으로 저장됨**

- GLM 보조 또는 더블체크 시에만 `step04_glm_augment` / `step04_glm_double_check` 저장
- CLAUDE.md §8.1: 개발 모드에서 모든 단계 저장 요구
- 파일: `src/worker/src/index.ts` line 132-171

### Suggestions

**S-1. verifyPart의 전력/패키지 불일치 시 재시도 정책 명시화**

CLAUDE.md §12에 "역검증 불일치 시 다음 후보로 자동 재시도"가 있으나 어떤 필드 불일치가 재시도를 트리거하는지 명시되지 않음. `/rules/spec_extraction_rules.md` 또는 `CLAUDE.md §12`에 명시 후 구현 정렬 필요.

**S-2. parser.ts, mouser.ts, validator.ts 단위 테스트 추가**

특히: 분수 전력 단위 없음 케이스, FC-001~005 회귀, provisional PASS 시나리오, 전력 불일치 재시도 동작.

**S-3. Description 파서 공유 모듈 추출**

`mouser.ts`와 `validator.ts`의 중복 Description 파서를 `shared/desc-parser.ts`로 추출.

**S-4. provisional PASS 상태 명시**

`buildResultRow`에서 `pn_resistance === null`인 경우 Validation 열에 `PASS (unverified)` 또는 별도 badge(`badge-warn`)로 표시하여 사용자에게 역검증 미수행 사실을 알림.

---

## 6. 미검증 또는 불완전 검증 항목

| 항목 | 미검증 사유 |
|---|---|
| 브라우저 UI 직접 조작 (버튼 클릭, 폼 입력, 테이블 렌더링 확인) | playwright/puppeteer 미설치로 자동화 불가 |
| 복사 기능 3종 실제 클립보드 동작 | 브라우저 환경 미확인 |
| 모바일 반응형 레이아웃 실제 렌더링 | 브라우저 미검증 |
| 브라우저 콘솔 에러 없음 확인 | 브라우저 미검증 |
| Blogger 삽입 버전 동작 | 미수행 |
| 새로고침 후 상태 유지 | 브라우저 미검증 (현재 상태 비저장 설계라 불필요할 수 있음) |
| GLM API 실제 호출 경로 (낮은 신뢰도 입력) | glm_required=true 케이스가 응답 반환했으나 GLM 실제 호출 여부 debug 출력으로 미확인 |
| 배치 검색 실제 UI 진행 표시 | 브라우저 미검증 |
| CORS 에러 여부 (브라우저에서 직접 확인) | curl 호출로 대체 (CORS 헤더 코드 확인은 완료) |

---

## 7. 추가 권장 테스트

1. **전력 불일치 재시도 동작 확인**: `10R 0402 5% 1W` 처럼 고전력 요구 시 올바른 전력 등급 부품이 선택되는지 확인. 현재 코드로는 낮은 전력 부품이 PASS 가능성 있음.

2. **provisional PASS 비율 통계**: 20~30개 다양한 케이스에서 `pn_resistance: null`로 PASS 반환되는 빈도 측정. 높다면 Description 파서 강화 필요.

3. **GLM 보조 경로 직접 테스트**: 고의로 낮은 신뢰도 입력(부분 스펙, 비정형 표기)으로 GLM 실제 호출 여부 및 결과 병합 확인.

4. **브라우저에서 Clipboard API 동작**: `navigator.clipboard.writeText`가 `file://` 프로토콜에서 동작하는지 확인. 로컬 파일 열기 시 Clipboard API 권한 거부될 수 있음.

5. **Blogger 삽입 테스트**: `index.html` 내용을 Blogger HTML 편집기에 붙여넣기 후 동작 확인. `/rules/blogger_html_rules.md` 요구사항(`<div id="resistor-tool-root">` 래퍼, IIFE 패턴) 준수 여부 확인 필요 — 현재 index.html에 래퍼 div 없음.

6. **동시 다중 클릭 방지 확인**: 검색 버튼이 disabled 상태로 전환되는지 브라우저에서 확인. 코드상 `searchBtn.disabled = on`으로 구현되어 있으나 실제 동작 미확인.

7. **대용량 배치 입력 테스트**: 50개 이상 배치 입력 시 Cloudflare Worker 30초 타임아웃 내 완료 여부 확인.

---

## 8. 배포 권고

### 판정: **Ready with caution**

**근거:**

핵심 저항값 파싱, 구분자 처리(FC-001~FC-002), 검색 키워드(FC-003~FC-004), tolerance 필터(FC-005)는 모두 실제 배포 Worker에서 정상 동작 확인.

그러나 두 가지 Major 이슈가 존재한다:

1. **M-1 (전력 불일치 PASS)**: 사용자가 0.5W를 지정해도 0.125W 부품이 PASS로 반환되는 케이스 실증 확인. 안전이 중요한 전력 설계에서 오구매 위험. CLAUDE.md §12의 재시도 정책이 구현에 반영되지 않음.

2. **M-2 (provisional PASS)**: Description 파싱 실패 부품이 역검증 없이 PASS 처리. 브라우저에서 사용자가 PASS 배지를 신뢰하면 미검증 부품을 구매할 수 있음.

이 두 이슈는 기능 중단이 아니라 **결과 신뢰도 문제**이므로 배포 자체를 막지는 않는다. 단, 사용자에게 결과를 최종 확인 전에 반드시 Mouser 상세 페이지에서 스펙을 검증하도록 UI 안내를 추가하는 것을 조건으로 배포 허용.

브라우저 UI 직접 검증(클릭, 렌더링, 콘솔 에러, Blogger 삽입)이 수행되지 않았으므로 프런트엔드 렌더링 오류, 복사 기능 오작동 가능성은 배제할 수 없다.

**배포 전 권장 조치:**

- [ ] M-1: `verifyPart`에 전력 불일치 시 VERIFICATION_FAILED 또는 재시도 트리거 추가 (또는 설계 의도를 CLAUDE.md에 명시하고 UI에 경고 표시)
- [ ] M-2: provisional PASS 시 `PASS (unverified)` 배지 또는 경고 아이콘 표시
- [ ] 브라우저에서 index.html 직접 열어 주요 케이스 수동 확인

**배포 후 모니터링:**

- Cloudflare Worker 에러율 모니터링
- provisional PASS 케이스 비율 로깅
- GLM API 불필요 호출(저항 토큰 없는 입력) 빈도 확인

---

*리포트 생성: 2026-03-22 | QA 수행: qa-fullstack-guardian (Claude Sonnet 4.6)*
*Worker API 직접 검증: 완료 | 브라우저 UI 직접 검증: 미수행*
