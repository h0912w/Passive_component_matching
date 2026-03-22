# Skill: blogger-ui-packager

> 역할: Blogger 배포용 단일 HTML 산출물 생성 절차.
> Blogger 배포 에러 발견 시 갱신.

## 생성 절차

1. `/docs/seo_content.md` 읽기 (SEO 문구 확인 필수)
2. `/src/frontend/index.html` 기반으로 Blogger 제약 적용:
   - 최외각 `<div id="resistor-tool-root">` 래퍼
   - 모든 CSS에 `#resistor-tool-root` 스코핑
   - 전역 변수 없는 IIFE 패턴으로 JS 감싸기
   - 외부 파일 의존성 제거
3. `/rules/blogger_html_rules.md` 의 금지 패턴 체크
4. `/output/build/index.html` 저장

## Blogger 제약 체크리스트
- [ ] `<div id="resistor-tool-root">` 래퍼 존재
- [ ] IIFE 패턴: `(function(){ 'use strict'; ... })()`
- [ ] 모든 CSS 선택자에 `#resistor-tool-root` 접두사
- [ ] 외부 스크립트/스타일 없음
- [ ] 인라인 이벤트핸들러(onclick="") 없음 — addEventListener 사용

## 참조
- `/rules/blogger_html_rules.md` — Blogger 에러 패턴
- `/docs/seo_content.md` — SEO 문구
- `/output/build/index.html` — 산출물
