# Skill: resistor-spec-normalizer

> 역할: 단위·기호·패키지 표기를 정규화하는 절차 문서.
> 새 표기 변형 발견 시 이 파일을 먼저 갱신한다.

## 정규화 절차

1. 입력 문자열 전처리 (`/rules/spec_extraction_rules.md §5` 참조)
2. 저항값 단위 정규화 → Ω (ohm) 기준 실수값
3. 패키지 정규화 → `<metric>M/<inch>I` 형식 (e.g. `1608M/0603I`)
4. 오차 정규화 → `±X%` 형식
5. 전력 정규화 → W 실수값

## 참조 파일
- `/rules/package_alias_map.json`
- `/rules/tolerance_alias_map.json`
- `/rules/power_alias_map.json`
- `/rules/resistor_value_patterns.json`
