# 테스트 결과 리포트

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