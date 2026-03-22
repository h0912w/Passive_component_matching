# Skill: mouser-search-client

> 역할: Mouser API 실시간 검색 절차. API 스펙 변경·에러 패턴 발견 시 갱신.

## 검색 엔드포인트
```
POST https://api.mouser.com/api/v1/search/keyword?apiKey={MOUSER_API_KEY}
POST https://api.mouser.com/api/v1/search/partnumber?apiKey={MOUSER_API_KEY}
```

## 검색 전략
1. 저항값(필수) + 인치 패키지 코드로 키워드 검색
2. 결과에서 패키지, 오차, 전력 속성으로 필터링
3. Active lifecycle + 재고 수량 순 정렬
4. 상위 3개 역검증

## 에러 처리
- HTTP 429: 1초 대기 후 재시도
- HTTP 500: 즉시 재시도 1회
- 0건 결과: `NO_CANDIDATES` 반환

## 참조
- `/src/worker/src/mouser.ts` — 구현 코드
