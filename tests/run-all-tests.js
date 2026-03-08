/**
 * run-all-tests.js — TestRunner 에이전트
 *
 * 실행 방법:
 *   node tests/run-all-tests.js           # 모의(mock) 테스트만 실행
 *   node tests/run-all-tests.js --live    # mock + 실제 API 호출 테스트 실행
 *
 * --live 플래그를 쓰려면 .env 파일에 API 키가 있어야 합니다.
 *   MOUSER_API_KEY=실제키
 *   GLM_API_KEY=실제키
 */

'use strict';

// .env 파일 자동 로드 (dotenv가 설치된 경우)
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (_) { /* dotenv 미설치 시 무시 */ }

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const LIVE_MODE     = process.argv.includes('--live');
const FEEDBACK_PATH = path.join(__dirname, 'feedback', 'last-failure.json');
const MAX_RETRIES   = 3;
const RANDOM_VALID_TABLE_PATH = path.join(__dirname, '..', 'docs', 'random-validation-table.md');

// ─── 테스트 스위트 목록 ───────────────────────────────────────────────────────
// live: true → --live 플래그가 있고 API 키가 있을 때만 실행
const SUITES = [
  // ── 순수 로직 (항상 실행, API 키 불필요) ──
  { name: 'ValueParser',      file: 'test-value-parser.js',      targetFile: 'apps-script/ValueParser.gs',      live: false },
  { name: 'PackageConverter', file: 'test-package-converter.js', targetFile: 'apps-script/PackageConverter.gs', live: false },
  { name: 'StockRanker',      file: 'test-stock-ranker.js',      targetFile: 'apps-script/StockRanker.gs',      live: false },
  { name: 'OutputFormatter',  file: 'test-output-formatter.js',  targetFile: 'apps-script/OutputFormatter.gs',  live: false },
  { name: 'ErrorHandler',     file: 'test-error-handler.js',     targetFile: 'apps-script/ErrorHandler.gs',     live: false },

  // ── DI + mock (항상 실행, Apps Script API를 mock으로 대체) ──
  { name: 'Config',           file: 'test-config.js',            targetFile: 'apps-script/Config.gs',           live: false },
  { name: 'CacheManager',     file: 'test-cache-manager.js',     targetFile: 'apps-script/CacheManager.gs',     live: false },
  { name: 'MouserClient',       file: 'test-mouser-client.js',       targetFile: 'apps-script/MouserClient.gs',       live: false },
  { name: 'GlmClient',          file: 'test-glm-client.js',          targetFile: 'apps-script/GlmClient.gs',          live: false },
  { name: 'NlpParser',          file: 'test-nlp-parser.js',          targetFile: 'apps-script/NlpParser.gs',          live: false },
  { name: 'PackageListBuilder', file: 'test-package-list-builder.js', targetFile: 'apps-script/PackageListBuilder.gs', live: false },
  { name: 'MpnValidator',       file: 'test-mpn-validator.js',        targetFile: 'apps-script/MpnValidator.gs',       live: false },

  // ── 통합 테스트 (mock API, 항상 실행) ──
  { name: 'Integration',      file: 'test-integration.js',       targetFile: 'apps-script/',                    live: false },

  // ── 실제 API 호출 (--live 플래그 + API 키 필요) ──
  { name: 'Mouser-Live',      file: 'test-mouser-live.js',       targetFile: 'apps-script/MouserClient.gs',     live: true  },
  { name: 'GLM-Live',         file: 'test-glm-live.js',          targetFile: 'apps-script/GlmClient.gs',        live: true  },

  // ── 랜덤 검증 (GLM + Mouser 실제 API, 리포트 생성) ──
  { name: 'Random-Validation', file: 'test-random-validation.js', targetFile: 'apps-script/',                   live: true  },
];

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function pad(str, len) { return String(str).padEnd(len); }

function runSuite(suite) {
  const filePath = path.join(__dirname, suite.file);

  if (!fs.existsSync(filePath)) {
    return { name: suite.name, status: 'SKIP', reason: '파일 없음 — 구현 전', passed: 0, total: 0 };
  }

  // live 스위트는 --live 플래그가 없으면 SKIP
  if (suite.live && !LIVE_MODE) {
    return { name: suite.name, status: 'SKIP', reason: '--live 플래그 없음', passed: 0, total: 0 };
  }

  // live 스위트는 API 키가 없으면 SKIP
  if (suite.live && !process.env.MOUSER_API_KEY) {
    return { name: suite.name, status: 'SKIP', reason: 'MOUSER_API_KEY 없음 (.env 확인)', passed: 0, total: 0 };
  }

  try {
    const output = execSync(`node "${filePath}"`, {
      encoding: 'utf8',
      timeout:  suite.live ? 600000 : 30000,  // live: 100입력 × 2.2s + GLM배치 ≈ 5분 → 10분으로 여유
      cwd:      path.join(__dirname, '..')
    });
    const lines  = output.trim().split('\n');
    const last   = lines[lines.length - 1];
    let result   = {};
    try { result = JSON.parse(last); } catch (_) {}
    return { name: suite.name, status: 'PASS', passed: result.passed || 1, total: result.total || 1, output };
  } catch (err) {
    const output = (err.stdout || '') + (err.stderr || '');
    const lines  = output.trim().split('\n');
    let failInfo = {};
    try { failInfo = JSON.parse(lines[lines.length - 1]); } catch (_) {}
    return {
      name:       suite.name,
      status:     'FAIL',
      targetFile: suite.targetFile,
      passed:     failInfo.passed    || 0,
      total:      failInfo.total     || '?',
      failedTest: failInfo.failedTest || 'unknown',
      targetFn:   failInfo.targetFn  || 'unknown',
      input:      failInfo.input,
      expected:   failInfo.expected,
      actual:     failInfo.actual,
      hint:       failInfo.hint || '테스트 출력을 확인하세요.',
      output
    };
  }
}

function writeFeedback(result, retryCount) {
  const feedback = {
    timestamp:      new Date().toISOString(),
    suite:          result.name,
    failedTest:     result.failedTest,
    targetFile:     result.targetFile,
    targetFunction: result.targetFn,
    input:          result.input,
    expected:       result.expected,
    actual:         result.actual,
    hint:           result.hint,
    retryCount,
    maxRetries: MAX_RETRIES
  };
  fs.mkdirSync(path.dirname(FEEDBACK_PATH), { recursive: true });
  fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(feedback, null, 2));
  return feedback;
}

// ─── 테스트 레포트 생성 ──────────────────────────────────────────────────────
function generateTestReport(results, totalPassed, totalTests, failures, mode) {
  const now = new Date();
  const dateStr = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'full', timeStyle: 'long' });
  const isoStr = now.toISOString();

  // 랜덤 검증 테이블 로드
  let randomValidationTable = '';
  if (fs.existsSync(RANDOM_VALID_TABLE_PATH)) {
    randomValidationTable = fs.readFileSync(RANDOM_VALID_TABLE_PATH, 'utf8');
  }

  // 개별 테스트 결과
  const testResults = results.map(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'SKIP' ? '⏭️' : '❌';
    const score = r.total > 0 ? `${r.passed}/${r.total}` : '-';
    const reason = r.status === 'SKIP' ? `(${r.reason})` : '';
    return `| [${r.name}] | ${String(score).padEnd(8)} ${icon} ${reason} |`;
  }).join('\n');

  const report = [
    `# 테스트 결과 리포트`,
    '',
    `> **테스트 일시**: ${dateStr} (${isoStr})`,
    `> **모드**: ${mode === 'live' ? 'LIVE (실제 API 호출)' : 'MOCK (의의 테스트)'}`,
    `> **결과**: ${failures.length === 0 ? '✅ PASSED' : '❌ FAILED'}`,
    `> **통과**: ${totalPassed}/${totalTests}`,
    '',
  ].join('\n');

  // 랜덤 검증 테이블이 있으면 추가
  if (randomValidationTable) {
    return report + randomValidationTable + '\n\n---\n\n' + [
      '## 테스트 결과',
      '',
      '| 테스트 스위트 | 통과/전체 |',
      '|---------------|-----------|',
      testResults,
      '',
    ].join('\n');
  }

  return report + [
    '## 테스트 결과',
    '',
    '| 테스트 스위트 | 통과/전체 |',
    '|---------------|-----------|',
    testResults,
    '',
  ].join('\n');

  const reportPath = path.join(__dirname, '..', 'docs', 'test-report.md');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 테스트 레포트 생성: docs/test-report.md`);
  return reportPath;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('\n🧪 Passive Component Matching — TestRunner');
  if (LIVE_MODE) {
    const hasMouser = !!process.env.MOUSER_API_KEY;
    const hasGlm    = !!process.env.GLM_API_KEY;
    console.log(`   모드: LIVE  (Mouser:${hasMouser ? '✅' : '❌'}  GLM:${hasGlm ? '✅' : '❌'})`);
  } else {
    console.log('   모드: MOCK  (실제 API 호출 없음)');
    console.log('   실제 API 테스트: node tests/run-all-tests.js --live');
  }
  console.log('');

  let totalPassed = 0, totalTests = 0, failures = [];
  let results = []; // 결과 저장용

  for (const suite of SUITES) {
    const result = runSuite(suite);
    results.push(result); // 결과 저장 (모든 결과 포함)

    if (result.status === 'SKIP') {
      console.log(`  ${pad('[' + suite.name + ']', 22)} ⏭  SKIP  ${result.reason}`);
      continue;
    }

    // 랜덤 테스트 테이블 출력 (시드, ┌│└ 라인, TIER1_SAMPLE)
    if (result.output) {
      const randomLines = result.output.split('\n').filter(l =>
        /랜덤\s*(시드|E24|통합)/.test(l) || /[┌├┤└│]/.test(l) ||
        l.startsWith('TIER1_SAMPLE:')
      );
      if (randomLines.length) {
        randomLines.forEach(l => console.log(l));
      }
    }

    const icon  = result.status === 'PASS' ? '✅' : '❌';
    const score = `${result.passed}/${result.total}`;
    console.log(`  ${pad('[' + suite.name + ']', 22)} ${pad(score, 6)} ${icon}`);

    if (result.status === 'PASS') {
      totalPassed += Number(result.passed) || 0;
      totalTests  += Number(result.total)  || 0;
    } else {
      totalTests  += Number(result.total)  || 1;
      console.log(`    ↳ FAIL: ${result.failedTest}`);
      if (result.input    !== undefined) console.log(`       Input:    ${JSON.stringify(result.input)}`);
      if (result.expected !== undefined) console.log(`       Expected: ${JSON.stringify(result.expected)}`);
      if (result.actual   !== undefined) console.log(`       Actual:   ${JSON.stringify(result.actual)}`);
      failures.push(result);
    }
  }

  console.log(`\n${'━'.repeat(44)}`);

  // 테스트 레포트 생성
  generateTestReport(results, totalPassed, totalTests, failures, LIVE_MODE ? 'live' : 'mock');

  if (failures.length === 0) {
    console.log(`Total: ${totalPassed}/${totalTests} passed ✅  All systems go.\n`);
    if (fs.existsSync(FEEDBACK_PATH)) fs.unlinkSync(FEEDBACK_PATH);
    process.exit(0);
  }

  console.log(`Total: ${totalPassed}/${totalTests} passed  (${failures.length} suite(s) failed)\n`);

  const first      = failures[0];
  let retryCount   = 1;
  if (fs.existsSync(FEEDBACK_PATH)) {
    try {
      const prev = JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf8'));
      if (prev.suite === first.name && prev.failedTest === first.failedTest) {
        retryCount = (prev.retryCount || 0) + 1;
      }
    } catch (_) {}
  }

  if (retryCount > MAX_RETRIES) {
    console.error(`❌ [${first.name}] ${first.failedTest} — ${MAX_RETRIES}회 수정 후에도 실패`);
    console.error(`   사람의 개입이 필요합니다. ${FEEDBACK_PATH} 참조.\n`);
    process.exit(2);
  }

  const fb = writeFeedback(first, retryCount);
  console.log(`⚠️  피드백 → ${FEEDBACK_PATH}`);
  console.log(`   Fix: ${fb.targetFile} :: ${fb.targetFunction}`);
  if (fb.hint) console.log(`   Hint: ${fb.hint}`);
  console.log(`   Retry: ${fb.retryCount}/${fb.maxRetries}\n`);
  process.exit(1);
}

main();
