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
const path = require('path');

const date    = process.env.CI_DATE   || new Date().toUTCString();
const branch  = process.env.CI_BRANCH || 'unknown';
const sha     = process.env.CI_SHA    || 'unknown';
const repo    = process.env.CI_REPO   || 'unknown';
const result  = process.env.CI_RESULT || 'unknown';
const outFile = process.env.CI_TEST_OUTPUT_FILE || '/tmp/test-output.txt';

const badge = result === 'passed' ? '✅ PASSED' : '❌ FAILED';

const rawOutput = fs.existsSync(outFile)
  ? fs.readFileSync(outFile, 'utf8')
  : '';

// ── TIER1_SAMPLE 파싱 ───────────────────────────────────────────────────────
// test-integration.js가 출력한 실제 테스트 입력/결과 데이터
let sampleRows = [];
const sampleLine = rawOutput.split('\n').find(l => l.startsWith('TIER1_SAMPLE:'));
if (sampleLine) {
  try {
    sampleRows = JSON.parse(sampleLine.slice('TIER1_SAMPLE:'.length));
  } catch (_) {}
}

// ── Tier 1 실제 테스트 결과 표 생성 ───────────────────────────────────────
function buildTier1Table(rows) {
  const header = [
    '| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |',
    '|-----------|------------|------------|----------|-------------|-------------|',
  ];
  if (rows.length === 0) {
    // 샘플 데이터 없으면 기본 예시 표시
    return [
      ...header,
      '| `1k 1005 5%` | 1kΩ | 0402 (1005) | 5% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |',
      '| *(테스트 출력 미캡처 — 다음 실행 시 실제 데이터 표시)* | | | | | |',
    ].join('\n');
  }
  const dataRows = rows.map(r => {
    if (r.success) {
      return `| \`${r.input}\` | ${r.resistance} | ${r.package} | ${r.tolerance} | ${r.mpn} | ${r.description} |`;
    } else {
      return `| \`${r.input}\` | - | - | - | FAIL | 파싱 실패 |`;
    }
  });
  return [...header, ...dataRows].join('\n');
}

// ── 전체 출력 마지막 40줄 (요약용) ────────────────────────────────────────
const testOutput = rawOutput
  ? rawOutput.split('\n').slice(-40).join('\n')
  : 'No output captured';

// ── 리포트 조립 ────────────────────────────────────────────────────────────
const report = [
  '# 테스트 결과 리포트',
  '',
  '## Tier 1 실제 테스트 결과 (mock API)',
  '',
  '> 아래 표는 이번 CI 실행에서 **실제로 입력된 랜덤 저항값**에 대한 파이프라인 출력입니다.',
  '> MPN과 Description은 mock Mouser API 응답 (고정값). 저항값/패키지/오차 추출은 실제 파싱 결과.',
  '> 실제 Mouser API 결과는 아래 Tier 2 섹션을 확인하세요.',
  '',
  buildTier1Table(sampleRows),
  '',
  '---',
  '',
  `- **Date**: ${date}`,
  `- **Branch**: ${branch}`,
  `- **Commit**: [${sha}](https://github.com/${repo}/commit/${sha})`,
  `- **Result**: ${badge}`,
  '',
  '## Tier 1 Mock Test 전체 출력 (마지막 40줄)',
  '',
  '```',
  testOutput,
  '```',
].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/test-report.md', report);
console.log('docs/test-report.md generated');
