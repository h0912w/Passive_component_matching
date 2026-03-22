# Skill: mouser-db-builder

> 역할: Mouser 스펙 DB를 **최초 1회** 수집하는 절차.
> 이 스킬은 프로젝트 셋업 시 단 1회만 사용한다.

## 사전 조건
- MOUSER_API_KEY 보유
- `/docs/mouser_db_guide.md` 숙지

## 수집 절차

1. Mouser API `/search/keyword` 엔드포인트로 칩저항 검색
2. 페이지네이션으로 전체 수집 (records=50, startingRecord 증가)
3. 각 부품에서 저항값, 패키지, 오차, 전력 추출
4. `/db/mouser_resistor_specs.json` 에 저장
5. `/db/collection_metadata.json` 에 수집 메타데이터 기록

## 완료 확인
- [ ] `mouser_resistor_specs.json` 의 `total_count` > 0
- [ ] `specs.resistance_values_ohm` 배열이 비어있지 않음
- [ ] `collection_metadata.json` 에 수집 일시 기록됨
