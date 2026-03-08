/**
 * GitHub Actions CI에서 test-report.md를 생성하는 스크립트.
 * 환경변수로 동적 데이터를 주입받아 최종 보고서를 작성.
 *
 * 사용법:
 *   CI_DATE="..." CI_BRANCH="..." CI_SHA="..." CI_REPO="..." \
 *   CI_RESULT="passed|failed" CI_TEST_OUTPUT_FILE="/tmp/test-output.txt" \
 *   node scripts/generate-ci-report.js
 */

const fs = require('fs');

const date    = process.env.CI_DATE   || new Date().toUTCString();
const branch  = process.env.CI_BRANCH || 'unknown';
const sha     = process.env.CI_SHA    || 'unknown';
const repo    = process.env.CI_REPO   || 'unknown';
const result  = process.env.CI_RESULT || 'unknown';
const outFile = process.env.CI_TEST_OUTPUT_FILE || '/tmp/test-output.txt';

const badge = result === 'passed' ? '✅ PASSED' : '❌ FAILED';

const rawOutput = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';

// ── TIER1_SAMPLE 파싱 ───────────────────────────────────────────────────────
let sampleRows = [];
const sampleLine = rawOutput.split('\n').find(l => l.startsWith('TIER1_SAMPLE:'));
if (sampleLine) {
  try { sampleRows = JSON.parse(sampleLine.slice('TIER1_SAMPLE:'.length)); } catch (_) {}
}

// ── 9열 결과 표 생성 ──────────────────────────────────────────────────────
function buildResultTable(rows) {
  const lines = [
    '| 입력 원본 | 입력 저항값 | 입력 패키지 | 입력 오차 | 부품명 (MPN) | MPN 저항값 | MPN 패키지 | MPN 오차 | 검증 |',
    '|-----------|-----------|-----------|---------|-------------|----------|----------|--------|------|',
  ];
  if (rows.length === 0) {
    lines.push('| *(샘플 데이터 없음 — 다음 실행 시 표시)* | | | | | | | | |');
    return lines.join('\n');
  }
  for (const r of rows) {
    if (r.success) {
      const verdict = r.verdict === 'PASS' ? '✅ PASS' : r.verdict === 'FAIL' ? '❌ FAIL' : 'N/A';
      lines.push(`| \`${r.input}\` | ${r.resistance} | ${r.package} | ${r.tolerance} | ${r.mpn} | ${r.mpn_resistance || ''} | ${r.mpn_package || ''} | ${r.mpn_tolerance || ''} | ${verdict} |`);
    } else {
      lines.push(`| \`${r.input}\` | - | - | - | FAIL | - | - | - | ❌ FAIL |`);
    }
  }
  return lines.join('\n');
}

// ── 리포트 조립 ────────────────────────────────────────────────────────────
const report = [
  '# 테스트 결과 리포트',
  '',
  `> **${badge}** | ${date} | Branch: \`${branch}\` | Commit: [${sha.slice(0, 8)}](https://github.com/${repo}/commit/${sha})`,
  '',
  '## 매칭 결과 (Tier 1 Mock)',
  '',
  buildResultTable(sampleRows),
].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/test-report.md', report);
console.log('docs/test-report.md generated');
