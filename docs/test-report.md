# 테스트 결과 리포트

> **테스트 일시**: 2026년 3월 8일 일요일 PM 11시 31분 19초 GMT+9 (2026-03-08T14:31:19.585Z)
> **모드**: MOCK
> **결과**: 전체 통과 ✅
> **통과**: 172/172 (100.0%)

---

## 최종 출력물 (사용자가 실제로 받아보는 결과)

| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description | MPN 저항값 | MPN 패키지 | MPN 오차 | 일치 확인 |
|-----------|------------|------------|----------|-------------|-------------|------------|-----------|---------|---------|
| (예시) 1k 0402 5% | 1kΩ | 0402 (0402) | 5% | RCA04021K00JNED | RES SMD 1K OHM 5% 1/16W 0402 | 1kΩ | 0402 | 5% | ✅ |

> **참고**: 실제 데이터는 Tier 2 Live 테스트(npm run test:live) 실행 후 docs/random-validation-table.md를 참고하세요.


---

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
| [Mouser-Live] | -        ⏭️ (--live 플래그 없음) |
| [GLM-Live] | -        ⏭️ (--live 플래그 없음) |
| [Random-Validation] | -        ⏭️ (--live 플래그 없음) |
