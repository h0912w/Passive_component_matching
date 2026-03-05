# Skill: Blogger 프론트엔드 개발

## 개요
Google Blogger 글에 삽입하여 동작하는 저항 부품 매칭 UI를 개발하는 스킬.

## Blogger HTML 삽입 방식

### 방법 1: 직접 HTML 삽입 (권장)
Blogger 글 작성 → HTML 편집 모드 → `<div id="resistor-tool">...</div>` 블록 전체 붙여넣기

장점: 별도 배포 불필요, Blogger 글과 자연스럽게 통합
단점: 코드가 길어지면 관리 어려움

### 방법 2: iframe 삽입
Apps Script 웹앱 URL을 iframe으로 삽입:
```html
<iframe src="https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec"
        width="100%" height="800px" frameborder="0"></iframe>
```

장점: 코드 분리, Apps Script에서 전체 관리
단점: iframe 높이 조정 필요, Blogger 테마와 스타일 불일치 가능

## UI 구성 요소

### 1. 입력 영역
```html
<textarea id="input-values" rows="10" placeholder="저항값을 한 줄에 하나씩 입력하세요&#10;예: 1k 1005 5%&#10;    10k/0603/1%&#10;    4.7k_1005_5%"></textarea>
```

### 2. 옵션 선택
```html
<div class="options">
  <label><input type="radio" name="source" value="digikey" checked> Digikey</label>
  <label><input type="radio" name="source" value="mouser"> Mouser</label>
  <label><input type="radio" name="source" value="both"> 둘 다</label>
</div>
```

### 3. 검색 버튼
```html
<button id="search-btn" onclick="searchParts()">부품 검색</button>
```

### 4. 결과 테이블 (6열)
```html
<table id="result-table">
  <thead>
    <tr>
      <th>입력 원본</th>
      <th>추출 저항값</th>
      <th>추출 패키지</th>
      <th>추출 오차</th>
      <th>부품명 (MPN)</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody id="result-body"></tbody>
</table>
```

### 5. 복사 버튼
```html
<button onclick="copyPartNumbers()">부품번호만 복사 (엔터 구분)</button>
```

클립보드에 부품번호만 엔터(`\n`)로 구분하여 복사 → Digikey/Mouser BOM Tool에 바로 붙여넣기 가능

### 6. 에러 표시
파싱 실패 행은 `class="error-row"` 적용 → 빨간 배경 + 에러 메시지

## Apps Script 백엔드 통신

### CORS 해결
Apps Script 웹앱은 CORS를 지원하지 않으므로, 두 가지 방법 중 하나 사용:

**방법 A: doGet + JSONP** (직접 HTML 삽입 시)
```javascript
// 프론트엔드
function searchParts() {
  var script = document.createElement('script');
  script.src = APPS_SCRIPT_URL + '?callback=handleResults&input=' + encodeURIComponent(inputText);
  document.body.appendChild(script);
}

function handleResults(data) {
  renderTable(data);
}

// Apps Script (Code.gs)
function doGet(e) {
  var result = processInput(e.parameter.input);
  var callback = e.parameter.callback;
  return ContentService.createTextOutput(callback + '(' + JSON.stringify(result) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

**방법 B: doPost + fetch** (iframe 삽입 시, 동일 출처)
```javascript
// Apps Script 웹앱 내 HTML에서 직접 호출
google.script.run.withSuccessHandler(handleResults).processInput(inputText);
```

## 스타일링
- Blogger 기본 테마와 충돌하지 않도록 모든 CSS에 `#resistor-tool` 접두사 사용
- 반응형 디자인: 모바일에서도 테이블이 가로 스크롤 가능하게
- 결과 테이블: 짝수/홀수 행 배경색 구분, 호버 효과
- 로딩 스피너: API 호출 중 표시

## 진행 상태 표시
여러 저항값을 처리할 때 진행 상태를 실시간으로 표시:
```
처리 중... 3/15 (1k 1005 5%)
[████████░░░░░░░░░░] 20%
```
