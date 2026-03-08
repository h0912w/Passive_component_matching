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

  [랜덤 시드: 1772954469402]
  ┌─────────────────────────────────────────────────────────────────────┐
  │ 랜덤 E24 테스트 입력값 (매 실행마다 다름)                          │
  ├────┬──────────────────────┬────────────────┬────────────────────────┤
  │ #  │ 입력 문자열          │ 예상 저항값    │ 결과                   │
  ├────┼──────────────────────┼────────────────┼────────────────────────┤
  │ 1  │ 100R 0402 5%         │ 100Ω           │ ✅ PASS                 │
  │ 2  │ 220R 0201 1%         │ 220Ω           │ ✅ PASS                 │
  │ 3  │ 1M 0402 5%           │ 1000000Ω       │ ✅ PASS                 │
  │ 4  │ 1.6k 0603 5%         │ 1600Ω          │ ✅ PASS                 │
  │ 5  │ 3.6M 0201 1%         │ 3600000Ω       │ ✅ PASS                 │
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
  [랜덤 시드: 1772954469745]
  ┌─────────────────────────────────────────────────┐
  │ 랜덤 통합 테스트 입력 (매 실행마다 다름)       │
  │  [1] 1.5k 0402 1%                                │
  │  [2] 4.7k 1206 1%                                │
  │  [3] 10k 0603 5%                                 │
  └─────────────────────────────────────────────────┘
TIER1_SAMPLE:[{"input":"1.5k 0402 1%","resistance":"1.5kΩ","package":"01005 (0402)","tolerance":"1%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true},{"input":"4.7k 1206 1%","resistance":"4.7kΩ","package":"1206 (3216)","tolerance":"1%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true},{"input":"10k 0603 5%","resistance":"10kΩ","package":"0201 (0603)","tolerance":"5%","mpn":"RC0402JR-071KL","mpn_resistance":"","mpn_package":"","mpn_tolerance":"","verdict":"N/A","description":"Thick Film Resistors - SMD","success":true}]
  [Integration]          17/17  ✅
  [Mouser-Live]          2/2    ✅
  [GLM-Live]             1/2    ❌
    ↳ FAIL: glm_response_structure
       Input:    null
       Expected: null
       Actual:   null
  [Random-Validation]    0/?    ❌
    ↳ FAIL: unknown

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 174/177 passed  (2 suite(s) failed)

⚠️  피드백 → /home/runner/work/Passive_component_matching/Passive_component_matching/tests/feedback/last-failure.json
   Fix: apps-script/GlmClient.gs :: _callGlm
   Hint: HTTP 500: {"error":{"code":"500","message":"操作失败"}}
   Retry: 1/3


```

---

## Tier 1 Mock Test 결과

> **✅ PASSED** | 2026-03-08T07:20:49Z | Branch: `claude/review-project-status-kJ0I4` | Commit: [c3b72b93](https://github.com/h0912w/Passive_component_matching/commit/c3b72b933e7f7e440b01adb217f90e79e0f41f97)

## 매칭 결과 (Tier 1 Mock)

| 입력 원본 | 입력 저항값 | 입력 패키지 | 입력 오차 | 부품명 (MPN) | MPN 저항값 | MPN 패키지 | MPN 오차 | 검증 |
|-----------|-----------|-----------|---------|-------------|----------|----------|--------|------|
| `3.3k 0402 1%` | 3.3kΩ | 01005 (0402) | 1% | RC0402JR-071KL |  |  |  | N/A |
| `10k 0402 1%` | 10kΩ | 01005 (0402) | 1% | RC0402JR-071KL |  |  |  | N/A |
| `22k 0603 5%` | 22kΩ | 0201 (0603) | 5% | RC0402JR-071KL |  |  |  | N/A |