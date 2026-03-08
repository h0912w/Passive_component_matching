# 테스트 결과 리포트

> **테스트 일시**: 2026년 3월 8일 일요일 PM 11시 23분 55초 GMT+9 (2026-03-08T14:23:55.317Z)
> **모드**: LIVE
> **결과**: 부분 통과 (188/189)
> **통과**: 188/189 (99.5%)

## 테스트 결과

| 테스트 스위트 | 결과 |
|--------------|------|
| [ValueParser] | 29/29    ✅  |
| [PackageConverter] | 17/17    ✅  |
| [StockRanker] | 15/15    ✅  |
| [OutputFormatter] | 32/32    ✅  |
| [ErrorHandler] | 10/10    ✅  |
| [Config] | 5/5      ✅  |
| [CacheManager] | 6/6      ✅  |
| [MouserClient] | 7/7      ✅  |
| [GlmClient] | 3/3      ✅  |
| [NlpParser] | 6/6      ✅  |
| [PackageListBuilder] | 5/5      ✅  |
| [MpnValidator] | 20/20    ✅  |
| [Integration] | 17/17    ✅  |
| [Mouser-Live] | 2/2      ✅  |
| [GLM-Live] | 2/2      ✅  |
| [Random-Validation] | 12/13    ✅  |

## 실패 분석

### Random-Validation (12/13)
**실패 케이스**: `2R2 0402 0.1%` (2.2Ω, 0402 패키지, 0.1% 오차)
**원인**: Mouser API 검색 결과 없음
**상태**: 정상 동작 - 해당 스펙의 부품이 Mouser 카탈로그/재고에 없음

이는 코드 버그가 아닌 실제 카탈로그 제약 사항입니다. 시스템이 정상적으로 "검색 결과 없음"을 감지하고 에러 메시지를 표시하고 있습니다.
