# Mouser 스펙 DB 수집 가이드

> **역할**: Mouser 칩저항 스펙 DB를 최초 1회 수집하는 절차 문서.

---

## §1. 수집 목적

Mouser에서 실제 유통되는 저항 스펙 값(저항값, 패키지, 오차, 전력)을 로컬 DB에 보관한다.
파서가 추출한 값이 실제 유통 값인지 교차 확인하는 데 사용한다.

---

## §2. 수집 대상

```
URL: https://www.mouser.kr/c/passive-components/resistors/chip-resistor-surface-mount/
추출 대상 필드:
  - 저항값 (Resistance)
  - 패키지/케이스 (Package / Case)
  - 오차 (Tolerance)
  - 전력 정격 (Power Rating)
```

---

## §3. 수집 절차

### 3.1 Mouser API 사용 (권장)
```
Endpoint: https://api.mouser.com/api/v1/search/keyword
Method:   POST
API Key:  MOUSER_API_KEY (Worker Secret)

요청:
{
  "SearchByKeywordRequest": {
    "keyword": "chip resistor",
    "records": 50,
    "startingRecord": 0,
    "searchOptions": "None",
    "searchWithSYMlink": "False"
  }
}
```

### 3.2 수집 범위 (초기)
```
저항값 범위: 0Ω ~ 10MΩ (표준 E24/E96 계열)
패키지:      0402(인치), 0603(인치), 0805(인치), 1206(인치), 2512(인치)
오차:        1%, 5% 위주 (0.1%, 0.5% 포함)
전력:        1/16W ~ 2W
```

---

## §4. 저장 형식 (`/db/mouser_resistor_specs.json`)

```json
{
  "metadata": {
    "collected_at": "2026-03-22T00:00:00Z",
    "source": "Mouser API",
    "total_count": 0,
    "version": "1.0"
  },
  "specs": {
    "resistance_values_ohm": [0, 1, 1.5, 2.2, ...],
    "packages": ["0402", "0603", "0805", "1206", ...],
    "tolerances_percent": [0.1, 0.5, 1, 2, 5, 10],
    "power_ratings_watt": [0.0625, 0.1, 0.125, 0.25, 0.5, 1.0]
  }
}
```

---

## §5. 수집 정책

- **최초 프로젝트 셋업 시 1회만 수행**
- 이후 재수집은 운영자가 명시적으로 요청할 때만
- 수집 일시·범위·건수는 `/db/collection_metadata.json`에 별도 기록

---

## §6. DB 활용 방법

1. **파서 신뢰도 계산 시**: 추출된 값이 DB에 존재하면 +5pt 보너스
2. **역검증 시**: PN 스펙이 정규 값 집합에 속하는지 확인
3. **표기 규칙 보강 시**: DB에서 발견된 새 표기 패턴을 `spec-notation-miner`에 입력
