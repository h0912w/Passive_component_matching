# Blogger HTML 배포 규칙 (Blogger HTML Rules)

> **역할**: Blogger 포스트 본문에 HTML을 삽입할 때 발생하는 에러 패턴과 해결책을 누적하는 성장형 문서.
> 배포 후 에러가 발생할 때마다 이 파일에 추가한다.

---

## §1. 필수 구조

```html
<!-- 모든 Blogger 삽입 HTML의 필수 래퍼 -->
<div id="resistor-tool-root">
  <style>
    /* 모든 CSS는 여기에 인라인 */
    #resistor-tool-root { ... }
    #resistor-tool-root .btn { ... }
  </style>

  <!-- HTML 마크업 -->
  <div class="...">...</div>

  <script>
    (function() {
      // 모든 JS는 IIFE로 감싸기
      'use strict';
      // ... 코드
    })();
  </script>
</div>
```

### 필수 조건
1. **최외각 래퍼**: `<div id="resistor-tool-root">` 필수
2. **IIFE 패턴**: `(function() { 'use strict'; ... })();`
3. **CSS 스코핑**: 모든 CSS 선택자에 `#resistor-tool-root` 접두사
4. **전역 변수 없음**: 모든 변수는 IIFE 내부에 선언
5. **외부 파일 없음**: CSS, JS 모두 인라인 (외부 파일 로드 불가)

---

## §2. Blogger 파싱 주의사항

### 2.1 HTML 이스케이프 문제
Blogger 에디터가 자동 변환하는 문자들:
```
<  →  &lt;   (JavaScript 비교 연산자 주의)
>  →  &gt;   (화살표 함수 반환값 주의)
&  →  &amp;  (URL, 정규식 주의)
"  →  &quot; (속성값 주의)
```

**해결책**: 가능하면 HTML 엔티티로 미리 처리하거나 CDATA로 감싸기

### 2.2 `<script>` 태그 처리
Blogger는 `<script>` 태그 내용을 수정할 수 있음:
- `<` `>` 연산자는 `<!-- ... -->` 주석으로 감싸거나 피하기
- `type="text/javascript"` 속성 추가 권장

### 2.3 인라인 이벤트 핸들러
- `onclick=""` 등 인라인 핸들러 사용 금지 (Blogger 보안 정책)
- `addEventListener` 사용

---

## §3. 알려진 에러 패턴

> 배포 후 에러 발생 시 아래에 추가한다.

| # | 발생일 | 증상 | 원인 | 해결책 |
|---|---|---|---|---|
| 001 | (초기) | - | - | - |

---

## §4. 테스트 체크리스트

배포 전 확인:
- [ ] HTML 에디터 모드에서 붙여넣기 가능한가
- [ ] `resistor-tool-root` 래퍼 존재하는가
- [ ] 모든 CSS에 `#resistor-tool-root` 스코핑 되어 있는가
- [ ] IIFE로 JS 감싸져 있는가
- [ ] 외부 리소스 의존성 없는가
- [ ] 브라우저 콘솔 오류 없는가
- [ ] 모바일 반응형 동작하는가

---

*최초 작성: v3.0 설계서 기반 | 운영 배포 후 에러 발생 시 갱신*
