# Skill: glm-spec-checker

> 역할: GLM API 호출 절차, 프롬프트 관리, 응답 파싱 노하우 문서.
> GLM 응답 패턴 변화·오류 발견 시 갱신한다.

## 호출 조건
- `total_confidence < 0.70` → augment 모드
- `0.70 ≤ confidence < 0.85` + 특이 패턴 → double_check 모드

## 체크리스트 (GLM 호출 전)
- [ ] GLM_API_KEY가 Worker Secret에 설정되어 있는가
- [ ] 엔드포인트가 `https://api.z.ai/api/paas/v4/chat/completions` 인가
- [ ] temperature = 0 인가
- [ ] 프롬프트에 `used: true, reason` 로깅 로직이 있는가

## 참조
- `/docs/glm_api_contract.md` — 상세 스키마 및 시행착오
- `/src/worker/src/glm.ts` — 구현 코드
