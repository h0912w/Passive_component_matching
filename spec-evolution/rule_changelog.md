# 파서 규칙 변경 이력 (Rule Changelog)

> 파서 규칙 변경 시마다 이 파일에 기록한다.
> 연계 파일: `/spec-evolution/failure_cases.jsonl`, `/rules/spec_extraction_rules.md`

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 원인 | 관련 failure_case |
|---|---|---|---|---|
| v1.0 | 2026-03-22 | 초기 파서 구현 | 설계 지침서 v3 기반 | - |
| v1.1 | 2026-03-22 | `parseTolerance`: ±(U+00B1) 정규화 추가 | `±5%` 입력에서 tolerance 미 추출 — regex 직전 `\u00B1 → +` 치환 | FC-001 |
| v1.2 | 2026-03-22 | `preprocessInput` 분수 보존: W/mW 단위를 필수로 변경 | `4.7k/0603/5%/0.25W` 슬러시 구분자 입력에서 `"0603/5"`가 전력 분수로 오 매칭 → 패키지·오차 누락 | FC-002 |
| v1.3 | 2026-03-22 | `parseResistanceFromDesc`: Kohms 패턴(2순위) 추가 | Mouser Description이 `"4.7Kohms"`, `"14.7Kohms"` 형식 사용 — 기존 패턴으로 미 파싱 → resistance_ohm = null | FC-003 |
| v1.4 | 2026-03-22 | `formatResistanceForSearch`: sub-kΩ에 `"ohm"` 단위 추가 | `"chip resistor 4.7"` 검색 시 4.75kΩ 등 kΩ 부품이 상위 노출 → 잘못된 PN 반환 | FC-004 |
| v1.5 | 2026-03-22 | `filterCandidates`: 사용자 지정 오차를 저항값 필터 윈도우로 적용 | `10k 1%` 입력에서 10.2kΩ(2% 오차) 부품이 선택됨 — 고정 ±5% 필터가 사용자 요구보다 넓었음 | FC-005 |

---

## 변경 절차

1. `/spec-evolution/failure_cases.jsonl` 에 실패 케이스 추가
2. `spec-notation-miner` 스킬 호출 → 패턴 분석
3. `/rules/spec_extraction_rules.md` 갱신
4. 파서 코드(`/src/worker/src/parser.ts`) 수정
5. 이 파일에 변경 이력 기록
6. `qa-fullstack-guardian` 호출 → QA 재실행
