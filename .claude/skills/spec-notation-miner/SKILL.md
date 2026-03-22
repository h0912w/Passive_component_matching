# Skill: spec-notation-miner

> 역할: 파서 실패 사례를 분석하고 규칙 문서를 개선하는 자기개선 절차.

## 실행 트리거
- `/spec-evolution/failure_cases.jsonl` 에 새 케이스 추가 시
- 주기적인 파서 품질 검토 시

## 절차

1. `/spec-evolution/failure_cases.jsonl` 읽기
2. 실패 패턴 분류 (저항값/패키지/오차/전력/구분자)
3. `/rules/spec_extraction_rules.md §7` 에 엣지케이스 추가
4. 필요 시 `/rules/` alias map JSON 갱신
5. `/src/worker/src/parser.ts` 수정
6. `/spec-evolution/rule_changelog.md` 갱신
7. `qa-fullstack-guardian` 호출

## failure_cases.jsonl 형식

```jsonl
{"id":"002","date":"2026-03-22","input":"4k7ohm","problem":"단위 붙은 표기 미인식","expected":{"resistance":4700},"actual":null,"fixed":false}
```
