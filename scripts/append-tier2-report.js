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

// ── 랜덤 검증 리포트에서 실제 결과 표 추출 ──────────────────────────────
let tier2OutputTable = '';
if (fs.existsSync(liveTmpReports)) {
  const reports = fs.readdirSync(liveTmpReports)
    .filter(f => f.startsWith('validation-') && f.endsWith('.md'))
    .sort()
    .reverse();  // 최신 파일 우선

  if (reports.length > 0) {
    const latestContent = fs.readFileSync(
      path.join(liveTmpReports, reports[0]), 'utf8'
    );
    // "## 2. 유저 수신 출력" 섹션만 추출 (다음 ## 이전까지)
    const match = latestContent.match(/(## 2\. 유저 수신 출력[\s\S]*?)(?=\n## |\n# |$)/);
    if (match) {
      tier2OutputTable = match[1].trim();
    }
  }
}

// ── live test 콘솔 출력 (마지막 80줄) ────────────────────────────────────
let liveConsoleOutput = 'No live output captured';
if (fs.existsSync(liveOutputFile)) {
  const raw = fs.readFileSync(liveOutputFile, 'utf8');
  liveConsoleOutput = raw.split('\n').slice(-80).join('\n');
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
  tier2OutputTable
    ? tier2OutputTable
    : '> 랜덤 검증 리포트 없음 (API 키 누락 또는 테스트 실패)',
  '',
  '### Tier 2 전체 출력 로그 (마지막 80줄)',
  '',
  '```',
  liveConsoleOutput,
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
