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