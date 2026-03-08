/**
 * Tier 2 Live API 테스트 결과를 docs/test-report.md에 반영하는 스크립트.
 * Tier 2 결과를 맨 앞에, Tier 1 결과를 그 뒤에 배치하여 최종 리포트를 작성한다.
 *
 * 필요 환경변수:
 *   CI_LIVE_OUTPUT_FILE  — live test 전체 콘솔 출력 파일 (기본: /tmp/live-output.txt)
 *   CI_LIVE_RESULT       — "passed" | "failed"
 *   CI_LIVE_REPORTS_DIR  — 랜덤 검증 리포트 디렉토리 (기본: /tmp/live-reports)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const liveOutputFile = process.env.CI_LIVE_OUTPUT_FILE  || '/tmp/live-output.txt';
const liveResult     = process.env.CI_LIVE_RESULT       || 'unknown';
const liveTmpReports = process.env.CI_LIVE_REPORTS_DIR  || '/tmp/live-reports';

const testReportPath = path.join(__dirname, '..', 'docs', 'test-report.md');

// ── Tier 1 리포트 읽기 (generate-ci-report.js가 미리 작성한 내용) ────────
const tier1Full = fs.existsSync(testReportPath)
  ? fs.readFileSync(testReportPath, 'utf8')
  : '';

// H1 헤더 제거 (최종 리포트에서 한 번만 출력)
const tier1Body = tier1Full.replace(/^# 테스트 결과 리포트\n+/, '');

// ── live test 콘솔 출력 읽기 ───────────────────────────────────────────────────
let liveConsoleOutput = 'No live output captured';
if (fs.existsSync(liveOutputFile)) {
  const raw = fs.readFileSync(liveOutputFile, 'utf8');
  liveConsoleOutput = raw;
}

// ── Random-Validation 테이블 추출 (live 콘솔 출력에서) ───────────────
let randomValidationTable = '';
function extractRandomValidationTable(output) {
  // 실제 live 콘솔 출력에서 테이블 추출
  const lines = output.split('\n');

  // [Random-Validation]    22/22  ✅ 패턴으로부터 검색
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/\[Random-Validation\]\s+\d+\/\d+\s+✅/)) {
      startIndex = i + 1; // Random-Validation] 라인 바로 다음 줄부터 시작
      break;
    }
  }

  if (startIndex === -1) return '';

  // 테이블 시작 줄(┌────) 찾기
  let tableStartIndex = -1;
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].includes('┌────') || lines[i].includes('┌──')) {
      tableStartIndex = i;
      break;
    }
  }

  if (tableStartIndex === -1) return '';

  // 테이블 끝 줄(└────) 찾기
  let tableEndIndex = -1;
  for (let i = tableStartIndex; i < lines.length; i++) {
    if (lines[i].includes('└────') || lines[i].includes('└──')) {
      tableEndIndex = i;
      break;
    }
  }

  if (tableEndIndex === -1) return '';

  // 테이블 전체 추출
  const extractedLines = lines.slice(startIndex, tableEndIndex + 1);
  return extractedLines.join('\n');
}

randomValidationTable = extractRandomValidationTable(liveConsoleOutput);

// ── live 콘솔 출력 (마지막 80줄) ────────────────────────────────────────
let liveConsoleTail = 'No live output captured';
if (liveConsoleOutput !== 'No live output captured') {
  liveConsoleTail = liveConsoleOutput.split('\n').slice(-80).join('\n');
}

// ── 최종 리포트: Tier 2 먼저, Tier 1 뒤 ─────────────────────────────────
const badge = liveResult === 'passed' ? '✅ PASSED' : '❌ FAILED';

const finalReport = [
  '# 테스트 결과 리포트',
  '',
  '## Tier 2 Live API 테스트 결과 (실제 Mouser API 매칭)',
  '',
  `**결과**: ${badge}`,
  '',
  '### 랜덤 검증 결과 (실제 Mouser API 매칭)',
  '',
  randomValidationTable
    ? '```\n' + randomValidationTable + '\n```'
    : '> 랜덤 검증 결과 없음 (테스트 실패)',
  '',
  '### Tier 2 전체 출력 로그 (마지막 80줄)',
  '',
  '```',
  liveConsoleTail,
  '```',
  '',
  '---',
  '',
  '## Tier 1 Mock Test 결과',
  '',
  tier1Body || '*(Tier 1 리포트 없음)*',
].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(testReportPath, finalReport);
console.log('docs/test-report.md rewritten: Tier2 first, then Tier1');
console.log('Random-Validation table extracted:', randomValidationTable ? 'Yes (' + randomValidationTable.split('\n').length + ' lines)' : 'No');
