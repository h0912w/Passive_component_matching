# Mouser 스펙 DB 수집 가이드

> **역할**: Mouser 칩저항 스펙 DB를 최초 1회 수집하는 절차 문서.
> 운영 중 발견된 API 동작 특성 및 시행착오를 포함한다.

---

## §1. 수집 목적

Mouser에서 실제 유통되는 저항 스펙 값(저항값, 패키지, 오차, 전력)을 로컬 DB에 보관한다.
파서가 추출한 값이 실제 유통 값인지 교차 확인하는 데 사용한다.

---

## §2. Mouser API 실제 동작 특성 (⚠️ 중요)

### 2.1 ProductAttributes는 저항 스펙을 포함하지 않는다

설계 초기에는 `ProductAttributes` 배열에서 저항 스펙을 추출하려 했으나,
**실제 Mouser API 응답에서 `ProductAttributes`는 포장 방식과 상업 정보만 포함한다.**

```json
"ProductAttributes": [
  {"AttributeName": "Packaging",         "AttributeValue": "Reel"},
  {"AttributeName": "Packaging",         "AttributeValue": "Cut Tape"},
  {"AttributeName": "Standard Pack Qty", "AttributeValue": "1000"}
]
```

저항값, 패키지, 오차, 전력 정보는 **`Description` 필드 자유 텍스트**에 포함된다.

### 2.2 Description 필드 형식 예시

```
"Thin Film Resistors - SMD 1/10W 91ohms .1% 5ppm"
"Thick Film Resistors - SMD 0603 10K 1% 1/10W"
"Thick Film Resistors - SMD MCT 0603-25 0.1% P1 51R1"
"Thin Film Resistors - SMD MCT 0603-25 0.1% P5 82K"
```

패키지 정보는 `Description` 또는 `ManufacturerPartNumber`(MPN) 필드에서 추출한다.

### 2.3 검색 키워드 전략

단일 키워드 `"chip resistor"` 대신 **패키지별 분리 키워드**를 사용한다.

```
'chip resistor 0402'  → 0402 패키지 집중 수집
'chip resistor 0603'  → 0603 패키지 집중 수집
'chip resistor 0805'  → 0805 패키지 집중 수집
'chip resistor 1206'  → 1206 패키지 집중 수집
'chip resistor 2512'  → 2512 패키지 집중 수집
```

이유: 단일 키워드는 패키지 분포가 불균형하고 원하지 않는 타입(through-hole 등)이 섞임.

---

## §3. 수집 방법: Worker 임시 엔드포인트 방식

MOUSER_API_KEY는 Cloudflare Secret에만 저장되므로 로컬 직접 실행이 불가능하다.
Worker에 임시 수집 엔드포인트를 추가해서 호출하는 방식을 사용한다.

### 3.1 수집 흐름

```
1. src/worker/src/index.ts 에 GET /collect-db 엔드포인트 추가
2. npx wrangler deploy
3. curl https://<worker-url>/collect-db > db/mouser_resistor_specs.json
4. 결과 확인 (total_count > 0)
5. /collect-db 엔드포인트 제거 후 npx wrangler deploy
```

### 3.2 Worker 내 스펙 추출 로직

> ⚠️ **Mouser Description 실제 형식** (2026-03-22 라이브 API 확인):
> - 저항값: `"4.7Kohms"`, `"14.7Kohms"`, `"2.2Mohms"` (K/M+ohms 복합 형식이 다수)
> - `"91ohms"`, `"1 Ohms"` (순수 ohms 형식)
> - `"1K"`, `"100K"` (K 단독 형식)
> - `"4R7"`, `"2K2"` (IEC RKM 형식)
>
> 단순 `K` 단독 패턴만으로는 `"4.7Kohms"` 미 파싱 → **Kohms 전용 패턴을 2순위에 배치 필수**.

```typescript
// 저항값 파싱 (Description에서) — 우선순위 순서
function parseResistanceFromDesc(desc: string): number | null {
  // 1순위: IEC RKM 3파트 (4R7, 2K2, 1M5)
  const iec3 = desc.match(/\b(\d+)([RKM])(\d+)\b/i);
  if (iec3) { ... }
  // 2순위: 숫자 + K/Mohms (Mouser 실제 형식: "4.7Kohms", "14.7Kohms")
  const kohm = desc.match(/\b(\d+\.?\d*)\s*(K|M)(ohm|Ohm|OHM)s?\b/i);
  if (kohm) { ... }
  // 3순위: 숫자 + ohms (단위 ohm: "91ohms", "4.7 ohms")
  const ohm = desc.match(/\b(\d+\.?\d*)\s*ohms?\b/i);
  // 4순위: 숫자 + K/M/R 단독 (e.g. "10K", "100K", "1M")
  const km = desc.match(/\b(\d+\.?\d*)\s*(K|M|R)\b/);
}

// 패키지 파싱 (Description 또는 MPN에서)
const pkg = (desc + ' ' + mpn).match(/\b(0402|0603|0805|1206|1210|2010|2512|01005|0201|1608|2012|3216|3225|5025|6332)\b/);

// 오차 파싱
const tol = desc.match(/[±]?\s*(\d+\.?\d*)\s*%/);

// 전력 파싱 (분수 우선, ⚠️ W/mW 단위 필수 — 단위 없는 숫자/숫자는 오 매칭 위험)
const fracW = desc.match(/\b(\d+)\/(\d+)\s*(W|mW)\b/i);  // W/mW 필수
const mw    = desc.match(/\b(\d+\.?\d*)\s*mW\b/i);
const w     = desc.match(/\b(\d+\.?\d*)\s*W\b/i);
```

### 3.3 페이지네이션

```
records: 50, startingRecord: 0 → 50 → 100 → 150 (키워드당 최대 150건)
키워드 5개 × 최대 150건 = 최대 750건 시도
rate limit 방지: 요청 간 300ms sleep
```

---

## §4. 저장 형식

### `/db/mouser_resistor_specs.json`
```json
{
  "metadata": {
    "collected_at": "2026-03-22T05:48:26Z",
    "source": "Mouser API",
    "total_count": 492,
    "version": "1.0"
  },
  "specs": {
    "resistance_values_ohm": [0, 1, 4.7, 10, ...],
    "packages": ["0402", "0603", "0805", "1206", "2512"],
    "tolerances_percent": [0.05, 0.1, 0.5, 1, 2, 5],
    "power_ratings_watt": [0.0625, 0.1, 0.125, 0.25, 0.5, 1.0]
  }
}
```

### `/db/collection_metadata.json`
수집 이력을 배열로 누적한다.

### `/db/db_status.md`
수집 현황, 품질 분석, 활용 현황을 기록한다. (→ §6 참조)

---

## §5. 수집 정책

- **최초 프로젝트 셋업 시 1회만 수행**
- 이후 재수집은 운영자가 명시적으로 요청할 때만
- 재수집 시 `/db/db_status.md` 반드시 갱신

---

## §6. DB 활용 방법

1. **파서 신뢰도 계산 시**: 추출된 값이 DB에 존재하면 +5pt 보너스
2. **역검증 시**: PN 스펙이 정규 값 집합에 속하는지 확인
3. **표기 규칙 보강 시**: DB에서 발견된 새 표기 패턴을 `spec-notation-miner`에 입력

---

## §7. 시행착오 기록

| # | 날짜 | 문제 | 원인 | 해결 |
|---|---|---|---|---|
| 001 | 2026-03-22 | total_count = 0 | ProductAttributes에 저항 스펙 없음. 포장 정보만 있음 | Description + MPN regex 파싱으로 전환 |
| 002 | 2026-03-22 | wrangler deploy 실패 (code: 10083) | workers.dev는 zone이 없어 `[[routes]]` 설정 불필요 | wrangler.toml에서 `[[routes]]` 섹션 전체 제거 |
| 003 | 2026-03-22 | 다수 부품에서 resistance_ohm = null | Mouser Description이 `"4.7Kohms"` 형식 사용 — K 단독 패턴으로는 미 매칭 | `parseResistanceFromDesc`에 `(\d+\.?\d*)(K\|M)(ohm\|Ohm\|OHM)s?` 패턴 2순위로 추가 |
| 004 | 2026-03-22 | sub-kΩ 입력 시 엉뚱한 kΩ PN 반환 | 검색 키워드 `"chip resistor 4.7"` — 단위 없어서 `4.75kΩ` 등 상위 매칭 | `formatResistanceForSearch()`: 1kΩ 미만은 `"X ohm"` 형식으로 검색 |
| 005 | 2026-03-22 | `4.7k/0603/5%/0.25W` 에서 패키지/오차 누락 | 분수 보존 regex가 `(\d+)\/(\d+)(W)?`로 W 선택적 → `"0603/5"`를 전력으로 오인 | 분수 보존 regex에서 W/mW 단위를 필수로 변경 |
