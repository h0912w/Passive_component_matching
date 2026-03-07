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

const date   = process.env.CI_DATE   || new Date().toUTCString();
const branch = process.env.CI_BRANCH || 'unknown';
const sha    = process.env.CI_SHA    || 'unknown';
const repo   = process.env.CI_REPO   || 'unknown';
const result = process.env.CI_RESULT || 'unknown';
const outFile = process.env.CI_TEST_OUTPUT_FILE || '/tmp/test-output.txt';

const badge = result === 'passed' ? '✅ PASSED' : '❌ FAILED';
const testOutput = fs.existsSync(outFile)
  ? fs.readFileSync(outFile, 'utf8').split('\n').slice(-30).join('\n')
  : 'No output captured';

const report = [
  '# 테스트 결과 리포트',
  '',
  '## 최종 출력물 (사용자가 실제로 받아보는 결과)',
  '',
  '> 이 표는 도구의 최종 출력 형태를 보여줍니다.',
  '> 사용자가 저항 값 목록을 붙여넣으면 아래와 같은 6열 테이블이 출력됩니다.',
  '',
  '| 입력 원본 | 추출 저항값 | 추출 패키지 | 추출 오차 | 부품명 (MPN) | Description |',
  '|-----------|------------|------------|----------|-------------|-------------|',
  '| `1k 1005 5%` | 1kΩ | 0402 (1005) | 5% | RC0402JR-071KL | RES SMD 1K OHM 5% 1/16W 0402 |',
  '| `10k/0603/1%` | 10kΩ | 0603 (1608) | 1% | RC0603FR-0710KL | RES SMD 10K OHM 1% 1/10W 0603 |',
  '| `100R 0805 5%` | 100Ω | 0805 (2012) | 5% | CRCW0805100RJNEA | RES SMD 100 OHM 5% 1/8W 0805 |',
  '| `4.7k_0402_1%` | 4.7kΩ | 0402 (1005) | 1% | RC0402FR-074K7L | RES SMD 4.7K OHM 1% 1/16W 0402 |',
  '| `2.2M 1206 5%` | 2.2MΩ | 1206 (3216) | 5% | RC1206JR-072M2L | RES SMD 2.2M OHM 5% 1/4W 1206 |',
  '| `칩저항 33옴 0603` | 33Ω | 0603 (1608) | — | RC0603JR-0733RL | RES SMD 33 OHM 5% 1/10W 0603 |',
  '',
  '> **부품명만 복사** 버튼을 누르면 MPN 목록만 클립보드에 복사됩니다.',
  '',
  '---',
  '',
  `- **Date**: ${date}`,
  `- **Branch**: ${branch}`,
  `- **Commit**: [${sha}](https://github.com/${repo}/commit/${sha})`,
  `- **Result**: ${badge}`,
  '',
  '## Tier 1 Mock Test Output',
  '',
  '```',
  testOutput,
  '```',
].join('\n');

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/test-report.md', report);
console.log('docs/test-report.md generated');
