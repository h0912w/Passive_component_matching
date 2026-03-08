# 테스트 결과 리포트

## Tier 2 Live API 테스트 결과 (실제 Mouser API 매칭)

**결과**: ✅ PASSED

> 랜덤 검증 리포트 없음 (API 키 누락 또는 테스트 실패)

### Tier 2 전체 출력 로그 (마지막 80줄)

```

> passive-component-matching@1.0.0 test:live
> node tests/run-all-tests.js --live


🧪 Passive Component Matching — TestRunner
   모드: LIVE  (Mouser:✅  GLM:✅)

  [랜덤 시드: 1772958408219]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 330k 1206 1%         │ 330000Ω        │ ✅ PASS                 │
  │ 2  │ 91k 0201 1%          │ 91000Ω         │ ✅ PASS                 │
  │ 3  │ 620R 0805 1%         │ 620Ω           │ ✅ PASS                 │
  │ 4  │ 680k 0603 1%         │ 680000Ω        │ ✅ PASS                 │
  │ 5  │ 820R 0805 1%         │ 820Ω           │ ✅ PASS                 │
  └────┴──────────────────────┴────────────────┴────────────────────────┘
  [ValueParser]          29/29  ✅
  [PackageConverter]     17/17  ✅
  [StockRanker]          15/15  ✅
  [OutputFormatter]      32/32  ✅
  [ErrorHandler]         10/10  ✅
  [Config]               5/5    ✅
  [CacheManager]         6/6    ✅
  [MouserClient]         7/7    ✅
  [GlmClient]            3/3    ✅
  [NlpParser]            6/6    ✅
  [PackageListBuilder]   5/5    ✅
  [MpnValidator]         20/20  ✅
  [랜덤 시드: 1772958408570]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 10k 0603 1%                                 │
  │  [2] 4.7k 1206 5%                                │
  │  [3] 1.5k 0805 1%                                │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"10k 0603 1%","resistance":"10kΩ","package":"0201 (0603)","tolerance":"1%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true},{"input":"4.7k 1206 5%","resistance":"4.7kΩ","package":"1206 (3216)","tolerance":"5%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true},{"input":"1.5k 0805 1%","resistance":"1.5kΩ","package":"0805 (2012)","tolerance":"1%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          2/2    ✅
  [GLM-Live]             2/2    ✅
     ┌──────────────────────┬────────┬────────┬──────┬──────────────────────┬────────┬────────┬──────┬──────┐
     │ 입력 원본            │입력저항│입력PKG │입력% │ MPN                  │MPN저항 │MPN PKG │MPN % │검증  │
     ├──────────────────────┼────────┼────────┼──────┼──────────────────────┼────────┼────────┼──────┼──────┤
     │ 5%/100R/0603         │ 100Ω   │ 0603 … │ 5%   │ 0603SAJ0101T5E       │        │ 0603   │ 5%   │ PASS │
     │ 2.2M_0402_1%         │ 2.2MΩ  │ 0402 … │ 1%   │ WR04W2204FTL         │        │ 0402   │ 1%   │ PASS │
     │ 1k 0805 0.1%         │ 1kΩ    │ 0805 … │ 0.1% │ CPF0805B12R7E1       │        │ 0805   │ 0.1% │ PASS │
     │ 4.7k_1206_5%         │ 4.7kΩ  │ 1206 … │ 5%   │ CR1206-JW-472ELF     │        │        │ 5%   │ PASS │
     │ 2R2/0201/1%          │ 2.2Ω   │ 0201 … │ 1%   │ RC0201FR-072R2L      │ 2.2Ω   │ 0201   │ 1%   │ PASS │
     │ 2.2k 0603 5%         │ 2.2kΩ  │ 0603 … │ 5%   │ ERJ-H3GJ222V         │ 2.2kΩ  │ 0603   │ 5%   │ PASS │
     │ 5%/2.2k/0603         │ 2.2kΩ  │ 0603 … │ 5%   │ ERJ-H3GJ222V         │ 2.2kΩ  │ 0603   │ 5%   │ PASS │
     │ 0402_10k_1%          │ 10kΩ   │ 0402 … │ 1%   │ NTCG103JF103FT1      │ 10kΩ   │ 0402   │ 1%   │ PASS │
     │ 100R 1206 0.1%       │ 100Ω   │ 1206 … │ 0.1% │ ERA-8AEB101V         │ 100Ω   │ 1206   │ 0.1% │ PASS │
     │ 1%_4R7_0805          │ 4.7Ω   │ 0805 … │ 1%   │ CRCW08054R70FKEAHP   │ 4.7Ω   │        │ 1%   │ PASS │
     │ 1k5 0603 5%          │ 1.5kΩ  │ 0603 … │ 5%   │ ERJ-UP3J152V         │        │ 0603   │      │ PASS │
     │ 1%/2R2/0402          │ 2.2Ω   │ 0402 … │ 1%   │ RC0402FR-132R2L      │ 2.2Ω   │ 0402   │ 1%   │ PASS │
     │ 0805_10K_0.1%        │ 10kΩ   │ 0805 … │ 0.1% │ MCU0805MD1002BP500   │        │ 0805   │ 0.1% │ PASS │
     │ 4.7k 5% 2012         │ 4.7kΩ  │ 2012 … │ 5%   │ HS15 4R7 J           │ 4.7Ω   │        │ 5%   │ FAIL │
     │ 1%/1206/100R         │ 100Ω   │ 1206 … │ 1%   │ RT1206FRE13100RL     │ 100Ω   │        │ 1%   │ PASS │
     │ 4R7_0603_1%          │ 4.7Ω   │ 0603 … │ 1%   │ RC0603FR-134R7L      │ 4.7Ω   │ 0603   │ 1%   │ PASS │
     │ 0805/2.2M/5%         │ 2.2MΩ  │ 0805 … │ 5%   │ HS15 4R7 J           │ 4.7Ω   │        │ 5%   │ FAIL │
     │ 0.1% 1206 1k5        │ 1.5kΩ  │ 1206 … │ 0.1% │ RG3216P-1501-B-T1    │ 1.5kΩ  │ 1206   │ 0.1% │ PASS │
     │ 10K_1%_0402          │ 10kΩ   │ 0402 … │ 1%   │ NTCG103JF103FT1      │ 10kΩ   │ 0402   │ 1%   │ PASS │
     │ 2R2/2012/5%          │ 2.2Ω   │ 2012 … │ 5%   │ PR02000201200JN300   │        │        │ 5%   │ PASS │
     └──────────────────────┴────────┴────────┴──────┴──────────────────────┴────────┴────────┴──────┴──────┘
  [Random-Validation]    22/22  ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 198/198 passed ✅  All systems go.


```

---

## Tier 1 Mock Test 결과

## Tier 2 Live API 테스트 결과 (실제 Mouser API 매칭)

**결과**: ❌ FAILED

> 랜덤 검증 리포트 없음 (API 키 누락 또는 테스트 실패)

### Tier 2 전체 출력 로그 (마지막 80줄)

```

> passive-component-matching@1.0.0 test:live
> node tests/run-all-tests.js --live


🧪 Passive Component Matching — TestRunner
   모드: LIVE  (Mouser:✅  GLM:✅)

  [랜덤 시드: 1772955502796]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 3.3M 0805 1%         │ 3300000Ω       │ ✅ PASS                 │
  │ 2  │ 360R 0201 1%         │ 360Ω           │ ✅ PASS                 │
  │ 3  │ 1.5M 0805 1%         │ 1500000Ω       │ ✅ PASS                 │
  │ 4  │ 5.6M 1206 5%         │ 5600000Ω       │ ✅ PASS                 │
  │ 5  │ 1.5M 0201 1%         │ 1500000Ω       │ ✅ PASS                 │
  └────┴──────────────────────┴────────────────┴────────────────────────┘
  [ValueParser]          29/29  ✅
  [PackageConverter]     17/17  ✅
  [StockRanker]          15/15  ✅
  [OutputFormatter]      32/32  ✅
  [ErrorHandler]         10/10  ✅
  [Config]               5/5    ✅
  [CacheManager]         6/6    ✅
  [MouserClient]         7/7    ✅
  [GlmClient]            3/3    ✅
  [NlpParser]            6/6    ✅
  [PackageListBuilder]   5/5    ✅
  [MpnValidator]         20/20  ✅
  [랜덤 시드: 1772955503146]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 10k 0603 1%                                 │
  │  [2] 1.5k 1206 5%                                │
  │  [3] 22k 1206 1%                                 │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"10k 0603 1%","resistance":"10kΩ","package":"0201 (0603)","tolerance":"1%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true},{"input":"1.5k 1206 5%","resistance":"1.5kΩ","package":"1206 (3216)","tolerance":"5%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true},{"input":"22k 1206 1%","resistance":"22kΩ","package":"1206 (3216)","tolerance":"1%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          2/2    ✅
  [GLM-Live]             2/2    ✅
  [Random-Validation]    0/?    ❌
    ↳ FAIL: unknown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 176/177 passed  (1 suite(s) failed)

⚠️  피드백 → /home/runner/work/Passive_component_matching/Passive_component_matching/tests/feedback/last-failure.json
   Fix: apps-script/ :: unknown
   Hint: 테스트 출력을 확인하세요.
   Retry: 1/3


```

---

## Tier 1 Mock Test 결과

> **✅ PASSED** | 2026-03-08T07:37:53Z | Branch: `claude/review-project-status-kJ0I4` | Commit: [69faa9b9](https://github.com/h0912w/Passive_component_matching/commit/69faa9b99801da2be51ce110b89461ab9bab7655)

## 매칭 결과 (Tier 1 Mock)

| 입력 원본 | 입력 저항값 | 입력 패키지 | 입력 오차 | 부품명 (MPN) | MPN 저항값 | MPN 패키지 | MPN 오차 | 검증 |
|-----------|-----------|-----------|---------|-------------|----------|----------|--------|------|
| `22k 0402 5%` | 22kΩ | 01005 (0402) | 5% | RC0402JR-071KL |  |  |  | N/A |
| `10k 0402 5%` | 10kΩ | 01005 (0402) | 5% | RC0402JR-071KL |  |  |  | N/A |
| `1k 0805 5%` | 1kΩ | 0805 (2012) | 5% | RC0402JR-071KL |  |  |  | N/A |