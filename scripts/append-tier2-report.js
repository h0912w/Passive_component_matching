/**
 * Tier 2 Live API 테스트 결과를 docs/test-report.md에 추가하는 스크립트.
 * test-live GitHub Actions 잡에서 live tests 완료 후 호출된다.
 *
 * 필요 환경변수:
 *   CI_LIVE_OUTPUT_FILE  — live test 전체 콘솔 출력 파일 경로 (기본: /tmp/live-output.txt)
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

// ── 현재 test-report.md (Tier 1 내용) 읽기 ──────────────────────────────
let current = fs.existsSync(testReportPath)
  ? fs.readFileSync(testReportPath, 'utf8')
  : '# 테스트 결과 리포트\n\n*(Tier 1 리포트 없음)*\n';

// 기존 Tier 2 섹션 제거 (재실행 시 중복 방지)
current = current.replace(/\n---\n\n## Tier 2 Live API 테스트 결과[\s\S]*$/, '');

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

// ── live test 콘솔 출력 (마지막 60줄) ───────────────────────────────────
let liveConsoleOutput = 'No live output captured';
if (fs.existsSync(liveOutputFile)) {
  const raw = fs.readFileSync(liveOutputFile, 'utf8');
  liveConsoleOutput = raw.split('\n').slice(-60).join('\n');
}

// ── Tier 2 섹션 조립 ────────────────────────────────────────────────────
const badge = liveResult === 'passed' ? '✅ PASSED' : '❌ FAILED';

const tier2Section = [
  '',
  '---',
  '',
  '## Tier 2 Live API 테스트 결과',
  '',
  `**결과**: ${badge}`,
  '',
  tier2OutputTable
    ? tier2OutputTable
    : '> 랜덤 검증 리포트가 없습니다. (API 키 누락 또는 테스트 실패)',
  '',
  '### Tier 2 전체 출력 로그 (마지막 60줄)',
  '',
  '```',
  liveConsoleOutput,
  '```',
].join('\n');

// ── 저장 ────────────────────────────────────────────────────────────────
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync(testReportPath, current + tier2Section);
console.log('Tier 2 section appended to docs/test-report.md');
