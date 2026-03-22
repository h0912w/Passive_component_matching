# 파서 규칙 변경 이력 (Rule Changelog)

> 파서 규칙 변경 시마다 이 파일에 기록한다.
> 연계 파일: `/spec-evolution/failure_cases.jsonl`, `/rules/spec_extraction_rules.md`

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 원인 | 관련 failure_case |
|---|---|---|---|---|
| v1.0 | 2026-03-22 | 초기 파서 구현 | 설계 지침서 v3 기반 | - |

---

## 변경 절차

1. `/spec-evolution/failure_cases.jsonl` 에 실패 케이스 추가
2. `spec-notation-miner` 스킬 호출 → 패턴 분석
3. `/rules/spec_extraction_rules.md` 갱신
4. 파서 코드(`/src/worker/src/parser.ts`) 수정
5. 이 파일에 변경 이력 기록
6. `qa-fullstack-guardian` 호출 → QA 재실행
