# 테스트 결과 리포트

## Tier 2 Live API 테스트 결과 (실제 Mouser API 매칭)

**결과**: ❌ FAILED

> 랜덤 검증 리포트 없음 (API 키 누락 또는 테스트 실패)

### Tier 2 전체 출력 로그 (마지막 80줄)

```

> passive-component-matching@1.0.0 test:live
> node tests/run-all-tests.js --live


🧪 Passive Component Matching — TestRunner
   모드: LIVE  (Mouser:✅  GLM:✅)

  [랜덤 시드: 1772950847809]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 300R 0805 5%         │ 300Ω           │ ✅ PASS                 │
  │ 2  │ 620k 0402 1%         │ 620000Ω        │ ✅ PASS                 │
  │ 3  │ 6.8M 0805 5%         │ 6800000Ω       │ ✅ PASS                 │
  │ 4  │ 240R 0201 1%         │ 240Ω           │ ✅ PASS                 │
  │ 5  │ 20k 0603 5%          │ 20000Ω         │ ✅ PASS                 │
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
  [랜덤 시드: 1772950848147]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 10k 0603 5%                                 │
  │  [2] 1k 0402 1%                                  │
  │  [3] 47k 0805 5%                                 │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"10k 0603 5%","resistance":"10kΩ","package":"0201 (0603)","tolerance":"5%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"1k 0402 1%","resistance":"1kΩ","package":"01005 (0402)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"47k 0805 5%","resistance":"47kΩ","package":"0805 (2012)","tolerance":"5%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          2/2    ✅
  [GLM-Live]             0/2    ❌
    ↳ FAIL: glm_nlp_parse
       Input:    null
       Expected: null
       Actual:   null
  [Random-Validation]    0/1    ❌
    ↳ FAIL: glm_spec_generation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 125/128 passed  (2 suite(s) failed)

⚠️  피드백 → /home/runner/work/Passive_component_matching/Passive_component_matching/tests/feedback/last-failure.json
   Fix: apps-script/GlmClient.gs :: _parseWithNlp
   Hint: HTTP 429: {"error":{"code":"1302","message":"您的账户已达到速率限制，请您控制请求频率"}}
   Retry: 1/3


```

---

## Tier 1 Mock Test 결과

## Tier 2 Live API 테스트 결과 (실제 Mouser API 매칭)

**결과**: ✅ PASSED

## 2. 유저 수신 출력 (실제 프론트엔드 테이블과 동일)

| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |
|-----------|-----------|-----------|---------|-------------|-------------|
| 100R_5%_1005 | 100Ω | 1005 (1005) | 5% | RC0100JR-07100RL | Thick Film Resistors - SMD 100 Ohms 30 mW 1005 5% |
| 0.1% 1206 1k | 1kΩ | 1206 (1206) | 0.1% | RP1206BRD071KL | Thin Film Resistors - SMD 1/4 Watt 1K Ohm 0.1% 1206 AEC-Q200 |
| 0201/4.7k/1% | 4.7kΩ | 0201 (0201) | 1% | WR02X4701FAL | Thick Film Resistors - SMD 0201 4K70 1%     Lead Free |
| 5%/10K/0805 | 10kΩ | 0805 (0805) | 5% | NTCS0805E3103JMT | NTC Thermistors 10K OHM 5% |
| 1k5 0603 0.1% | 1.5kΩ | 0603 (0603) | 0.1% | PCF0603PR-1K5BT1 | Thin Film Resistors - SMD .063W 1.5K ohm 0.1% 25ppm |
| 10k/0603/1% | 10kΩ | 0603 (0603) | 1% | CR0603-FX-1002ELF | Thick Film Resistors - SMD 10K 1% 1/10W |
| 1206_2R2_5% | 2.2Ω | 1206 (1206) | 5% | CRCW12062R20JNEAHP | Thick Film Resistors - SMD 3/4watt 2.2ohms 5% High Power AEC-Q200 |
| 5% 4R7 0402 | 4.7Ω | 0402 (0402) | 5% | CR0402-J/-4R7GLF | Thick Film Resistors - SMD 4.7OHM 1/16WATT 5% |
| 100k/0805/1% | 100kΩ | 0805 (0805) | 1% | RT0805FRE13100KL | Thin Film Resistors - SMD 100K ohm 1% 50 ppm Thin Film |
| 2012_1k5_5% | 1.5kΩ | 2012 (2012) | 5% | HS15 4R7 J | Wirewound Resistors - Chassis Mount 15W 4.7 Ohms 5% |
| 4R7_0402_1% | 4.7Ω | 0402 (0402) | 1% | CRCW04024R70FKEDHP | Thick Film Resistors - SMD 0.2W 4.7ohms 1% High Power AEC-Q200 |
| 5% 10k 0603 | 10kΩ | 0603 (0603) | 5% | WR06X103 JTR | Thick Film Resistors - SMD 10K ohm +/-5% 0603 Chip Resistor |
| 2R2/0805/5% | 2.2Ω | 0805 (0805) | 5% | CR0805-J/-2R2ELF | Thick Film Resistors - SMD 2.2OHM 1/8WATT 5% |
| 1k5 1206 1% | 1.5kΩ | 1206 (1206) | 1% | CRCW12061K50FHEAP | Thick Film Resistors - SMD D25/CRCW1206-P 50 1K5 1% ET1 e3 |
| 0.1%/100R_0201 | 100Ω | 0201 (0201) | 0.1% | ERA-1AEB101C | Thin Film Resistors - SMD 0201 100ohm 0.1% 25ppm |
| 10K 0805 5% | 10kΩ | 0805 (0805) | 5% | NTCS0805E3103JMT | NTC Thermistors 10K OHM 5% |
| 1%/0402/100R | 100Ω | 0402 (0402) | 1% | RC0402FR-7D100RL | Thick Film Resistors - SMD General Purpose Chip Resistor 0402, 100Ohms, 1%, 1/16W |
| 0603_4R7_1% | 4.7Ω | 0603 (0603) | 1% | RC0603FR-134R7L | Thick Film Resistors - SMD General Purpose Chip Resistor 0603, 4.7Ohms, 1%, 1/10W |
| 1005 2R2 5% | 2.2Ω | 1005 (1005) | 5% | VR68000001005JAC00 | Metal Film Resistors - Through Hole 1watt 10Mohms 5% |
| 5%_1k5_2012 | 1.5kΩ | 2012 (2012) | 5% | HS15 4R7 J | Wirewound Resistors - Chassis Mount 15W 4.7 Ohms 5% |
| 1k | - | - | - | **FAIL** | NLP 폴백 실패: Request timeout |
| 0R1 0402 5% | 0.1Ω | 0402 (0402) | 5% | UCR01MVPJLR10 | Current Sense Resistors - SMD 0402 0.1ohm 5% CS-Thk Film AEC-Q200 |
| 4R7 0402 1% | 4.7Ω | 0402 (0402) | 1% | CRCW04024R70FKEDHP | Thick Film Resistors - SMD 0.2W 4.7ohms 1% High Power AEC-Q200 |
| 10M 1206 5% | 10MΩ | 1206 (1206) | 5% | CR1206-JW-106ELF | Thick Film Resistors - SMD 10M 5% |
| 1k5 0402 1% | 1.5kΩ | 0402 (0402) | 1% | CR0402-FX-1501GLF | Thick Film Resistors - SMD 1.5K OHM 1% |
| 10k 0603 | - | - | - | **FAIL** | NLP 폴백 실패: GLM NLP HTTP 429 |
| 4R7 1206 1% | 4.7Ω | 1206 (1206) | 1% | CRCW12064R70FKEAHP | Thick Film Resistors - SMD 3/4watt 4.7ohms 1% High Power AEC-Q200 |
| 0R01 0201 5% | 0.01Ω | 0201 (0201) | 5% | PR03000201002JAC00 | Metal Film Resistors - Through Hole 3watts 10Kohms 5% |
| 100M 0805 5% | 100MΩ | 0805 (0805) | 5% | ERJ-U6SJR10V | Thick Film Resistors - SMD 0805 0.25W 5% .10ohms AEC-Q200 |
| 2M | - | - | - | **FAIL** | NLP 폴백 실패: GLM NLP HTTP 429 |
| 1k 0402 | - | - | - | **FAIL** | NLP 폴백 실패: GLM NLP HTTP 429 |
| 1k5 0603 1% | 1.5kΩ | 0603 (0603) | 1% | CRCW06031K50FKEC | Thick Film Resistors - SMD 1.5K   OHM   1% |
| 100M 1206 5% | 100MΩ | 1206 (1206) | 5% | ERJ-8BSJR10V | Current Sense Resistors - SMD 1206 0.1ohm 5% Curr Sense AEC-Q200 |
| 2R2 0805 1% | 2.2Ω | 0805 (0805) | 1% | CRCW08052R20FKEAHP | Thick Film Resistors - SMD 1/2watt 2.2ohms 1% High Power AEC-Q200 |
| 10M 5% | - | - | - | **FAIL** | NLP 폴백 실패: GLM NLP HTTP 429 |

### Tier 2 전체 출력 로그 (마지막 80줄)

```
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 150R 0201 5%         │ 150Ω           │ ✅ PASS                 │
  │ 2  │ 3M 1206 5%           │ 3000000Ω       │ ✅ PASS                 │
  │ 3  │ 270R 0201 5%         │ 270Ω           │ ✅ PASS                 │
  │ 4  │ 160R 0201 1%         │ 160Ω           │ ✅ PASS                 │
  │ 5  │ 1.8M 0805 1%         │ 1800000Ω       │ ✅ PASS                 │
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
  [랜덤 시드: 1772950442243]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 3.3k 0603 1%                                │
  │  [2] 100k 1206 1%                                │
  │  [3] 1.5k 0805 1%                                │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"3.3k 0603 1%","resistance":"3.3kΩ","package":"0201 (0603)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"100k 1206 1%","resistance":"100kΩ","package":"1206 (3216)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"1.5k 0805 1%","resistance":"1.5kΩ","package":"0805 (2012)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          2/2    ✅
  [GLM-Live]             2/2    ✅
     ┌──────────────────────┬──────────┬──────────────┬──────┬─────────────────────┬──────────────────────────────┐
     │ 입력 원본            │ 저항값   │ 패키지       │ 오차 │ MPN                 │ Description                  │
     ├──────────────────────┼──────────┼──────────────┼──────┼─────────────────────┼──────────────────────────────┤
     │ 100R_5%_1005         │ 100Ω     │ 1005 (1005)  │ 5%   │ RC0100JR-07100RL    │ Thick Film Resistors - SMD … │
     │ 0.1% 1206 1k         │ 1kΩ      │ 1206 (1206)  │ 0.1% │ RP1206BRD071KL      │ Thin Film Resistors - SMD 1… │
     │ 0201/4.7k/1%         │ 4.7kΩ    │ 0201 (0201)  │ 1%   │ WR02X4701FAL        │ Thick Film Resistors - SMD … │
     │ 5%/10K/0805          │ 10kΩ     │ 0805 (0805)  │ 5%   │ NTCS0805E3103JMT    │ NTC Thermistors 10K OHM 5%   │
     │ 1k5 0603 0.1%        │ 1.5kΩ    │ 0603 (0603)  │ 0.1% │ PCF0603PR-1K5BT1    │ Thin Film Resistors - SMD .… │
     │ 10k/0603/1%          │ 10kΩ     │ 0603 (0603)  │ 1%   │ CR0603-FX-1002ELF   │ Thick Film Resistors - SMD … │
     │ 1206_2R2_5%          │ 2.2Ω     │ 1206 (1206)  │ 5%   │ CRCW12062R20JNEAHP  │ Thick Film Resistors - SMD … │
     │ 5% 4R7 0402          │ 4.7Ω     │ 0402 (0402)  │ 5%   │ CR0402-J/-4R7GLF    │ Thick Film Resistors - SMD … │
     │ 100k/0805/1%         │ 100kΩ    │ 0805 (0805)  │ 1%   │ RT0805FRE13100KL    │ Thin Film Resistors - SMD 1… │
     │ 2012_1k5_5%          │ 1.5kΩ    │ 2012 (2012)  │ 5%   │ HS15 4R7 J          │ Wirewound Resistors - Chass… │
     │ 4R7_0402_1%          │ 4.7Ω     │ 0402 (0402)  │ 1%   │ CRCW04024R70FKEDHP  │ Thick Film Resistors - SMD … │
     │ 5% 10k 0603          │ 10kΩ     │ 0603 (0603)  │ 5%   │ WR06X103 JTR        │ Thick Film Resistors - SMD … │
     │ 2R2/0805/5%          │ 2.2Ω     │ 0805 (0805)  │ 5%   │ CR0805-J/-2R2ELF    │ Thick Film Resistors - SMD … │
     │ 1k5 1206 1%          │ 1.5kΩ    │ 1206 (1206)  │ 1%   │ CRCW12061K50FHEAP   │ Thick Film Resistors - SMD … │
     │ 0.1%/100R_0201       │ 100Ω     │ 0201 (0201)  │ 0.1% │ ERA-1AEB101C        │ Thin Film Resistors - SMD 0… │
     │ 10K 0805 5%          │ 10kΩ     │ 0805 (0805)  │ 5%   │ NTCS0805E3103JMT    │ NTC Thermistors 10K OHM 5%   │
     │ 1%/0402/100R         │ 100Ω     │ 0402 (0402)  │ 1%   │ RC0402FR-7D100RL    │ Thick Film Resistors - SMD … │
     │ 0603_4R7_1%          │ 4.7Ω     │ 0603 (0603)  │ 1%   │ RC0603FR-134R7L     │ Thick Film Resistors - SMD … │
     │ 1005 2R2 5%          │ 2.2Ω     │ 1005 (1005)  │ 5%   │ VR68000001005JAC00  │ Metal Film Resistors - Thro… │
     │ 5%_1k5_2012          │ 1.5kΩ    │ 2012 (2012)  │ 5%   │ HS15 4R7 J          │ Wirewound Resistors - Chass… │
     └──────────────────────┴──────────┴──────────────┴──────┴─────────────────────┴──────────────────────────────┘
     ┌──────────────────────┬──────────┬──────────────┬──────┬─────────────────────┬──────────────────────────────┐
     │ 입력 원본            │ 저항값   │ 패키지       │ 오차 │ MPN                 │ Description                  │
     ├──────────────────────┼──────────┼──────────────┼──────┼─────────────────────┼──────────────────────────────┤
     │ 1k                   │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: Request timeout   │
     │ 0R1 0402 5%          │ 0.1Ω     │ 0402 (0402)  │ 5%   │ UCR01MVPJLR10       │ Current Sense Resistors - S… │
     │ 4R7 0402 1%          │ 4.7Ω     │ 0402 (0402)  │ 1%   │ CRCW04024R70FKEDHP  │ Thick Film Resistors - SMD … │
     │ 10M 1206 5%          │ 10MΩ     │ 1206 (1206)  │ 5%   │ CR1206-JW-106ELF    │ Thick Film Resistors - SMD … │
     │ 1k5 0402 1%          │ 1.5kΩ    │ 0402 (0402)  │ 1%   │ CR0402-FX-1501GLF   │ Thick Film Resistors - SMD … │
     │ 10k 0603             │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: GLM NLP HTTP 429  │
     │ 4R7 1206 1%          │ 4.7Ω     │ 1206 (1206)  │ 1%   │ CRCW12064R70FKEAHP  │ Thick Film Resistors - SMD … │
     │ 0R01 0201 5%         │ 0.01Ω    │ 0201 (0201)  │ 5%   │ PR03000201002JAC00  │ Metal Film Resistors - Thro… │
     │ 100M 0805 5%         │ 100MΩ    │ 0805 (0805)  │ 5%   │ ERJ-U6SJR10V        │ Thick Film Resistors - SMD … │
     │ 2M                   │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: GLM NLP HTTP 429  │
     │ 1k 0402              │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: GLM NLP HTTP 429  │
     │ 1k5 0603 1%          │ 1.5kΩ    │ 0603 (0603)  │ 1%   │ CRCW06031K50FKEC    │ Thick Film Resistors - SMD … │
     │ 100M 1206 5%         │ 100MΩ    │ 1206 (1206)  │ 5%   │ ERJ-8BSJR10V        │ Current Sense Resistors - S… │
     │ 2R2 0805 1%          │ 2.2Ω     │ 0805 (0805)  │ 1%   │ CRCW08052R20FKEAHP  │ Thick Film Resistors - SMD … │
     │ 10M 5%               │ -        │ -            │ -    │ FAIL                │ NLP 폴백 실패: GLM NLP HTTP 429  │
     └──────────────────────┴──────────┴──────────────┴──────┴─────────────────────┴──────────────────────────────┘
  [Random-Validation]    37/37  ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 164/164 passed ✅  All systems go.


```

---

## Tier 1 Mock Test 결과

## Tier 1 실제 테스트 결과 (mock API)

> 아래 표는 이번 CI 실행에서 **실제로 입력된 랜덤 저항값**에 대한 파이프라인 출력입니다.
> MPN과 Description은 mock Mouser API 응답 (고정값). 저항값/패키지/오차 추출은 실제 파싱 결과.
> 실제 Mouser API 결과는 아래 Tier 2 섹션을 확인하세요.

| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |
|-----------|------------|------------|----------|-------------|-------------|
| `4.7k 0805 1%` | 4.7kΩ | 0805 (2012) | 1% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |
| `3.3k 0805 5%` | 3.3kΩ | 0805 (2012) | 5% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |
| `1.5k 0402 5%` | 1.5kΩ | 01005 (0402) | 5% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |

---

- **Date**: 2026-03-08T06:20:24Z
- **Branch**: claude/review-project-status-kJ0I4
- **Commit**: [d7d9e67b7a3f95f77b4f1152c625cc0a55f72fbb](https://github.com/h0912w/Passive_component_matching/commit/d7d9e67b7a3f95f77b4f1152c625cc0a55f72fbb)
- **Result**: ✅ PASSED

## Tier 1 Mock Test 전체 출력 (마지막 40줄)

```
  [랜덤 시드: 1772950847326]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 2k 1206 5%           │ 2000Ω          │ ✅ PASS                 │
  │ 2  │ 75k 0201 5%          │ 75000Ω         │ ✅ PASS                 │
  │ 3  │ 130R 0603 5%         │ 130Ω           │ ✅ PASS                 │
  │ 4  │ 36k 1206 1%          │ 36000Ω         │ ✅ PASS                 │
  │ 5  │ 2.2k 0402 1%         │ 2200Ω          │ ✅ PASS                 │
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
  [랜덤 시드: 1772950847642]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 4.7k 0805 1%                                │
  │  [2] 3.3k 0805 5%                                │
  │  [3] 1.5k 0402 5%                                │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"4.7k 0805 1%","resistance":"4.7kΩ","package":"0805 (2012)","tolerance":"1%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"3.3k 0805 5%","resistance":"3.3kΩ","package":"0805 (2012)","tolerance":"5%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true},{"input":"1.5k 0402 5%","resistance":"1.5kΩ","package":"01005 (0402)","tolerance":"5%","mpn":"RC0402JR-071KL","description":"RES SMD 1K OHM 5% 1/16W 0402","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          ⏭  SKIP  --live 플래그 없음
  [GLM-Live]             ⏭  SKIP  --live 플래그 없음
  [Random-Validation]    ⏭  SKIP  --live 플래그 없음

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 123/123 passed ✅  All systems go.


```