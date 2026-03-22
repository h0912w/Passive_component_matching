# Skill: mouser-db-builder

> 역할: Mouser 스펙 DB를 **최초 1회** 수집하는 절차.
> 이 스킬은 프로젝트 셋업 시 단 1회만 사용한다.
> 상세 수집 가이드: `/docs/mouser_db_guide.md`

---

## ⚠️ 핵심 주의사항 (운영 중 발견된 사실)

### ProductAttributes는 저항 스펙을 포함하지 않는다

**문제**: 최초 설계 시 `ProductAttributes` 배열에서 `resistance`, `package`, `tolerance`, `power` 속성을 추출하려 했으나 **실제로는 포장 방식(Reel, Cut Tape)과 상업 정보만** 들어있음.

```json
"ProductAttributes": [
  {"AttributeName": "Packaging", "AttributeValue": "Reel"},
  {"AttributeName": "Standard Pack Qty", "AttributeValue": "1000"}
]
```

**해결책**: `Description`과 `ManufacturerPartNumber` 필드를 regex로 파싱해야 함.

```
Description 예시:
  "Thin Film Resistors - SMD 1/10W 91ohms .1% 5ppm"
  "Thick Film Resistors - SMD 0603 10K 1% 1/10W"
  "MCT 0603-25 0.1% P1 51R1"
```

---

## 수집 방법: Cloudflare Worker 임시 엔드포인트 방식 (권장)

Mouser API Key는 Cloudflare Secret에만 저장되므로 로컬 직접 실행 불가.
대신 Worker에 임시 엔드포인트를 추가 → 호출 → 결과 저장 → 엔드포인트 제거.

### 절차

1. `src/worker/src/index.ts` 에 `/collect-db` GET 엔드포인트 추가
2. `npx wrangler deploy` 로 배포
3. `curl https://<worker-url>/collect-db > db/mouser_resistor_specs.json`
4. 결과 확인 (`total_count > 0`)
5. `/collect-db` 엔드포인트 제거 후 재배포

### 수집 키워드 (패키지별 분리 검색)
```
'chip resistor 0402'
'chip resistor 0603'
'chip resistor 0805'
'chip resistor 1206'
'chip resistor 2512'
```
> 단일 키워드 "chip resistor"로 검색하면 결과가 너무 광범위하고 패키지 분포가 불균형하다.
> 패키지별로 분리해서 검색하면 더 고른 결과를 얻을 수 있다.

---

## Description 파싱 Regex 패턴

> ⚠️ **2026-03-22 라이브 API 확인**: Mouser Description은 `"4.7Kohms"`, `"14.7Kohms"` 형식을 자주 사용한다.
> K 단독 패턴(`\b4.7K\b`)만으로는 파싱 실패 → **Kohms 패턴을 2순위로 반드시 추가**.

```typescript
// 저항값 (우선순위 순서로 적용)

// 1순위: IEC RKM 3파트 (4R7, 2K2, 1M5)
const iec3 = desc.match(/\b(\d+)([RKM])(\d+)\b/i);

// 2순위: Kohms/Mohms 형식 (Mouser 실제 형식: "4.7Kohms", "14.7Kohms", "2.2Mohms")
const kohm = desc.match(/\b(\d+\.?\d*)\s*(K|M)(ohm|Ohm|OHM)s?\b/i);
if (kohm) {
  const val = parseFloat(kohm[1]);
  const u = kohm[2].toUpperCase();
  return val * (u === 'K' ? 1000 : 1e6);
}

// 3순위: 숫자 + ohms (단위 ohm: "91ohms", "1 Ohms")
const ohm = desc.match(/\b(\d+\.?\d*)\s*ohms?\b/i);

// 4순위: 숫자 + K/M/R 단독 ("10K", "100K", "1M")
const km = desc.match(/\b(\d+\.?\d*)\s*(K|M|R)\b/);

// 패키지 (Description 또는 MPN에서 — MPN도 반드시 포함)
const pkg = (desc + ' ' + mpn).match(/\b(0402|0603|0805|1206|1210|2010|2512|01005|0201|1608|2012|3216|3225|5025|6332)\b/);

// 오차
const tol = desc.match(/[±]?\s*(\d+\.?\d*)\s*%/);

// 전력 — ⚠️ W/mW 단위를 필수로 요구 (단위 없으면 숫자/숫자가 오 매칭됨)
const fracW = desc.match(/\b(\d+)\/(\d+)\s*(W|mW)\b/i);  // 단위 필수
const mw    = desc.match(/\b(\d+\.?\d*)\s*mW\b/i);
const w     = desc.match(/\b(\d+\.?\d*)\s*W\b/i);
```

---

## 사전 조건
- MOUSER_API_KEY가 Cloudflare Worker Secret으로 등록되어 있을 것
- Worker가 배포되어 있을 것
- `/docs/mouser_db_guide.md` 숙지

## 완료 확인
- [ ] `mouser_resistor_specs.json` 의 `total_count` > 0
- [ ] `specs.resistance_values_ohm` 배열이 비어있지 않음
- [ ] `collection_metadata.json` 에 수집 일시 기록됨
- [ ] `/db/db_status.md` 갱신 완료

---

## 알려진 시행착오

| # | 날짜 | 문제 | 원인 | 해결 |
|---|---|---|---|---|
| 001 | 2026-03-22 | total_count = 0 수집 | ProductAttributes에 저항 스펙 없음 | Description + MPN regex 파싱으로 전환 |
| 002 | 2026-03-22 | wrangler.toml routes 오류 | workers.dev는 routes 설정 불필요 | [[routes]] 섹션 전체 제거 |
| 003 | 2026-03-22 | 다수 부품 resistance_ohm = null | Mouser가 `"4.7Kohms"` 형식 사용 — K 단독 패턴으로 미 매칭 | Kohms 전용 패턴 2순위 추가 (§regex 참조) |
