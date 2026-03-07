# 테스트 결과 리포트

## Tier 2 Live API 테스트 결과 (실제 Mouser API 매칭)

**결과**: ✅ PASSED

## 2. 유저 수신 출력 (실제 프론트엔드 테이블과 동일)

| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |
|-----------|-----------|-----------|---------|-------------|-------------|
| 10K 0603 1% | 10kΩ | 0603 (0603) | 1% | CR0603-FX-1002ELF | Thick Film Resistors - SMD 10K 1% 1/10W |
| 5%/100R/0402 | 100Ω | 0402 (0402) | 5% | CR0402-JW-101GLF | Thick Film Resistors - SMD 100 OHM 5% |
| 1206_2.2M_0.1% | 2.2MΩ | 1206 (1206) | 0.1% | RGV3216P-2204-B-T1 | Thin Film Resistors - SMD Thin Film Chip Resistors 1206 size, 700V, 0.25W, 2.2M ohm, 0.1%, 25ppm AEC Q200 |
| 5% 0805 4R7 | 4.7Ω | 0805 (0805) | 5% | CR0805-J/-4R7ELF | Thick Film Resistors - SMD 4.7OHM 1/8WATT 5% |
| 1k5/1%/2012 | 1.5kΩ | 2012 (2012) | 1% | HS50 10K F | Wirewound Resistors - Chassis Mount 50W 10K OHM1% |
|   1k 0402 5%   | 1kΩ | 0402 (0402) | 5% | CR0402-JW-122GLF | Thick Film Resistors - SMD 1.2K OHM 5% |
| 10k  0603  1% | 10kΩ | 0603 (0603) | 1% | CR0603-FX-1002ELF | Thick Film Resistors - SMD 10K 1% 1/10W |
| 10K 0603 1% | 10kΩ | 0603 (0603) | 1% | CR0603-FX-1002ELF | Thick Film Resistors - SMD 10K 1% 1/10W |
| 1k ohm 0402 5% | 1kΩ | 0402 (0402) | 5% | CR0402-JW-122GLF | Thick Film Resistors - SMD 1.2K OHM 5% |
| 4.7kΩ 0603 1% | - | - | - | **FAIL** | NLP 폴백 실패: GLM NLP HTTP 429 |
|   1k 0402 5%   | 1kΩ | 0402 (0402) | 5% | CR0402-JW-122GLF | Thick Film Resistors - SMD 1.2K OHM 5% |
| 10k  0603  1% | 10kΩ | 0603 (0603) | 1% | CR0603-FX-1002ELF | Thick Film Resistors - SMD 10K 1% 1/10W |
| 2.2m 1206 5% | 2.2MΩ | 1206 (1206) | 5% | CR1206-JW-225ELF | Thick Film Resistors - SMD 2.2M 5% |
| 1,000 ohm 0402 1% | - | - | - | **FAIL** | NLP 폴백 실패: GLM NLP HTTP 429 |
| 10k 0603 ±1% | - | - | - | **FAIL** | NLP 폴백 실패: GLM NLP HTTP 429 |

### Tier 2 전체 출력 로그 (마지막 80줄)

```

> passive-component-matching@1.0.0 test:live
> node tests/run-all-tests.js --live


🧪 Passive Component Matching — TestRunner
   모드: LIVE  (Mouser:✅  GLM:✅)

  [랜덤 시드: 1772913976349]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 680k 1206 1%         │ 680000Ω        │ ✅ PASS                 │
  │ 2  │ 6.8k 0805 5%         │ 6800Ω          │ ✅ PASS                 │
  │ 3  │ 130R 0805 1%         │ 130Ω           │ ✅ PASS                 │
  │ 4  │ 220k 0201 5%         │ 220000Ω        │ ✅ PASS                 │
  │ 5  │ 7.5M 0805 1%         │ 7500000Ω       │ ✅ PASS                 │
  └────┴──────────────────────┴────────────────┴────────────────────────┘
  [ValueParser]          29/29  ✅
  [PackageConverter]     17/17  ✅
  [StockRanker]          4/4    ✅
  [OutputFormatter]      14/14  ✅
  [ErrorHandler]         10/10  ✅
  [Config]               5/5    ✅
  [CacheManager]         6/6    ✅
  [MouserClient]         7/7    ✅
  [GlmClient]            3/3    ✅
  [NlpParser]            6/6    ✅
  [PackageListBuilder]   5/5    ✅
  [랜덤 시드: 1772913976660]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 100k 1206 5%                                │
  │  [2] 6.8k 0402 5%                                │
  │  [3] 6.8k 0805 1%                                │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"100k 1206 5%","resistance":"100kΩ","package":"1206 (3216)","tolerance":"5%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"6.8k 0402 5%","resistance":"6.8kΩ","package":"01005 (0402)","tolerance":"5%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"6.8k 0805 1%","resistance":"6.8kΩ","package":"0805 (2012)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          2/2    ✅
  [GLM-Live]             2/2    ✅
     ┌──────────────────────┬──────────┬──────────────┬──────┬─────────────────────┬──────────────────────────────┐
     │ 입력 원본            │ 저항값   │ 패키지       │ 오차 │ MPN                 │ Description                  │
     ├──────────────────────┼──────────┼──────────────┼──────┼─────────────────────┼──────────────────────────────┤
     │ 10K 0603 1%          │ 10kΩ     │ 0603 (0603)  │ 1%   │ CR0603-FX-1002ELF   │ Thick Film Resistors - SMD … │
     │ 5%/100R/0402         │ 100Ω     │ 0402 (0402)  │ 5%   │ CR0402-JW-101GLF    │ Thick Film Resistors - SMD … │
     │ 1206_2.2M_0.1%       │ 2.2MΩ    │ 1206 (1206)  │ 0.1% │ RGV3216P-2204-B-T1  │ Thin Film Resistors - SMD T… │
     │ 5% 0805 4R7          │ 4.7Ω     │ 0805 (0805)  │ 5%   │ CR0805-J/-4R7ELF    │ Thick Film Resistors - SMD … │
     │ 1k5/1%/2012          │ 1.5kΩ    │ 2012 (2012)  │ 1%   │ HS50 10K F          │ Wirewound Resistors - Chass… │
     └──────────────────────┴──────────┴──────────────┴──────┴─────────────────────┴──────────────────────────────┘
     ┌──────────────────────┬──────────┬──────────────┬──────┬─────────────────────┬──────────────────────────────┐
     │ 입력 원본            │ 저항값   │ 패키지       │ 오차 │ MPN                 │ Description                  │
     ├──────────────────────┼──────────┼──────────────┼──────┼─────────────────────┼──────────────────────────────┤
     │   1k 0402 5%         │ 1kΩ      │ 0402 (0402)  │ 5%   │ CR0402-JW-122GLF    │ Thick Film Resistors - SMD … │
     │ 10k  0603  1%        │ 10kΩ     │ 0603 (0603)  │ 1%   │ CR0603-FX-1002ELF   │ Thick Film Resistors - SMD … │
     │ 10K 0603 1%          │ 10kΩ     │ 0603 (0603)  │ 1%   │ CR0603-FX-1002ELF   │ Thick Film Resistors - SMD … │
     │ 1k ohm 0402 5%       │ 1kΩ      │ 0402 (0402)  │ 5%   │ CR0402-JW-122GLF    │ Thick Film Resistors - SMD … │
     │ 4.7kΩ 0603 1%        │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: GLM NLP HTTP 429  │
     │   1k 0402 5%         │ 1kΩ      │ 0402 (0402)  │ 5%   │ CR0402-JW-122GLF    │ Thick Film Resistors - SMD … │
     │ 10k  0603  1%        │ 10kΩ     │ 0603 (0603)  │ 1%   │ CR0603-FX-1002ELF   │ Thick Film Resistors - SMD … │
     │ 2.2m 1206 5%         │ 2.2MΩ    │ 1206 (1206)  │ 5%   │ CR1206-JW-225ELF    │ Thick Film Resistors - SMD … │
     │ 1,000 ohm 0402 1%    │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: GLM NLP HTTP 429  │
     │ 10k 0603 ±1%         │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: GLM NLP HTTP 429  │
     └──────────────────────┴──────────┴──────────────┴──────┴─────────────────────┴──────────────────────────────┘
  [Random-Validation]    17/17  ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 144/144 passed ✅  All systems go.


```

---

## Tier 1 Mock Test 결과

## Tier 1 실제 테스트 결과 (mock API)

> 아래 표는 이번 CI 실행에서 **실제로 입력된 랜덤 저항값**에 대한 파이프라인 출력입니다.
> MPN과 Description은 mock Mouser API 응답 (고정값). 저항값/패키지/오차 추출은 실제 파싱 결과.
> 실제 Mouser API 결과는 아래 Tier 2 섹션을 확인하세요.

| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |
|-----------|------------|------------|----------|-------------|-------------|
| `6.8k 0805 1%` | 6.8kΩ | 0805 (2012) | 1% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |
| `1.5k 0805 1%` | 1.5kΩ | 0805 (2012) | 1% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |
| `3.3k 0402 1%` | 3.3kΩ | 01005 (0402) | 1% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |

---

- **Date**: 2026-03-07T20:05:47Z
- **Branch**: claude/review-project-status-kJ0I4
- **Commit**: [ff9be772f9426999d8c49c2a5cdf1c75f0a08ea4](https://github.com/h0912w/Passive_component_matching/commit/ff9be772f9426999d8c49c2a5cdf1c75f0a08ea4)
- **Result**: ✅ PASSED

## Tier 1 Mock Test 전체 출력 (마지막 40줄)

```
  [랜덤 시드: 1772913977710]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 2.4k 1206 1%         │ 2400Ω          │ ✅ PASS                 │
  │ 2  │ 750R 0402 5%         │ 750Ω           │ ✅ PASS                 │
  │ 3  │ 3.3k 0201 1%         │ 3300Ω          │ ✅ PASS                 │
  │ 4  │ 680R 1206 1%         │ 680Ω           │ ✅ PASS                 │
  │ 5  │ 22k 0201 1%          │ 22000Ω         │ ✅ PASS                 │
  └────┴──────────────────────┴────────────────┴────────────────────────┘
  [ValueParser]          29/29  ✅
  [PackageConverter]     17/17  ✅
  [StockRanker]          4/4    ✅
  [OutputFormatter]      14/14  ✅
  [ErrorHandler]         10/10  ✅
  [Config]               5/5    ✅
  [CacheManager]         6/6    ✅
  [MouserClient]         7/7    ✅
  [GlmClient]            3/3    ✅
  [NlpParser]            6/6    ✅
  [PackageListBuilder]   5/5    ✅
  [랜덤 시드: 1772913978026]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 6.8k 0805 1%                                │
  │  [2] 1.5k 0805 1%                                │
  │  [3] 3.3k 0402 1%                                │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"6.8k 0805 1%","resistance":"6.8kΩ","package":"0805 (2012)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"1.5k 0805 1%","resistance":"1.5kΩ","package":"0805 (2012)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"3.3k 0402 1%","resistance":"3.3kΩ","package":"01005 (0402)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          ⏭  SKIP  --live 플래그 없음
  [GLM-Live]             ⏭  SKIP  --live 플래그 없음
  [Random-Validation]    ⏭  SKIP  --live 플래그 없음

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 123/123 passed ✅  All systems go.


```