/**
 * run-all-tests.js — TestRunner 에이전트
 *
 * 실행: node tests/run-all-tests.js
 *
 * 모든 단위/통합 테스트를 순서대로 실행하고,
 * 실패 시 담당 에이전트에게 전달할 구조화된 피드백을 생성한다.
 */

'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ─── 테스트 스위트 목록 ───────────────────────────────────────────────────────
// targetFile: 실패 시 수정해야 할 .gs 파일
const SUITES = [
  { name: 'ValueParser',      file: 'test-value-parser.js',      targetFile: 'apps-script/ValueParser.gs' },
  { name: 'PackageConverter', file: 'test-package-converter.js',  targetFile: 'apps-script/PackageConverter.gs' },
  { name: 'StockRanker',      file: 'test-stock-ranker.js',       targetFile: 'apps-script/StockRanker.gs' },
  { name: 'OutputFormatter',  file: 'test-output-formatter.js',   targetFile: 'apps-script/OutputFormatter.gs' },
  { name: 'ErrorHandler',     file: 'test-error-handler.js',      targetFile: 'apps-script/ErrorHandler.gs' },
  { name: 'Config',           file: 'test-config.js',             targetFile: 'apps-script/Config.gs' },
  { name: 'CacheManager',     file: 'test-cache-manager.js',      targetFile: 'apps-script/CacheManager.gs' },
  { name: 'MouserClient',     file: 'test-mouser-client.js',      targetFile: 'apps-script/MouserClient.gs' },
  { name: 'DigikeyClient',    file: 'test-digikey-client.js',     targetFile: 'apps-script/DigikeyClient.gs' },
  { name: 'Integration',      file: 'test-integration.js',        targetFile: 'apps-script/' },
];

const FEEDBACK_PATH = path.join(__dirname, 'feedback', 'last-failure.json');
const MAX_RETRIES   = 3;

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function pad(str, len) {
  return String(str).padEnd(len);
}

function runSuite(suite) {
  const filePath = path.join(__dirname, suite.file);

  // 파일이 아직 없으면 SKIP (구현 전 단계)
  if (!fs.existsSync(filePath)) {
    return { name: suite.name, status: 'SKIP', passed: 0, total: 0, output: '' };
  }

  try {
    const output = execSync(`node "${filePath}"`, {
      encoding: 'utf8',
      timeout: 30000,
      cwd: path.join(__dirname, '..')
    });
    // 테스트 파일이 JSON 결과를 마지막 줄에 출력하는 약속
    const lines  = output.trim().split('\n');
    const last   = lines[lines.length - 1];
    let result;
    try {
      result = JSON.parse(last);
    } catch (_) {
      // JSON 없으면 성공으로 간주 (간단한 파일)
      return { name: suite.name, status: 'PASS', passed: 1, total: 1, output };
    }
    return { name: suite.name, status: 'PASS', ...result, output };
  } catch (err) {
    // 프로세스 에러 = 테스트 실패
    const output = (err.stdout || '') + (err.stderr || '');
    const lines  = output.trim().split('\n');
    const last   = lines[lines.length - 1];
    let failInfo = {};
    try { failInfo = JSON.parse(last); } catch (_) {}

    return {
      name:         suite.name,
      status:       'FAIL',
      targetFile:   suite.targetFile,
      passed:       failInfo.passed  || 0,
      total:        failInfo.total   || '?',
      failedTest:   failInfo.failedTest   || 'unknown',
      targetFn:     failInfo.targetFn     || 'unknown',
      input:        failInfo.input,
      expected:     failInfo.expected,
      actual:       failInfo.actual,
      hint:         failInfo.hint || '테스트 출력을 확인하세요.',
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
    maxRetries:     MAX_RETRIES
  };
  fs.mkdirSync(path.dirname(FEEDBACK_PATH), { recursive: true });
  fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(feedback, null, 2));
  return feedback;
}

function printFeedback(feedback) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`⚠️  피드백 생성 → ${FEEDBACK_PATH}`);
  console.log(`   Suite:    ${feedback.suite}`);
  console.log(`   Test:     ${feedback.failedTest}`);
  console.log(`   Fix file: ${feedback.targetFile}`);
  console.log(`   Fn:       ${feedback.targetFunction}`);
  if (feedback.input    !== undefined) console.log(`   Input:    ${JSON.stringify(feedback.input)}`);
  if (feedback.expected !== undefined) console.log(`   Expected: ${JSON.stringify(feedback.expected)}`);
  if (feedback.actual   !== undefined) console.log(`   Actual:   ${JSON.stringify(feedback.actual)}`);
  console.log(`   Hint:     ${feedback.hint}`);
  console.log(`   Retry:    ${feedback.retryCount}/${feedback.maxRetries}`);
  console.log(`${'─'.repeat(60)}\n`);
}

// ─── 메인 실행 ────────────────────────────────────────────────────────────────
function main() {
  console.log('\n🧪 Passive Component Matching — TestRunner\n');

  let totalPassed = 0;
  let totalTests  = 0;
  let failures    = [];
  let skips       = 0;

  for (const suite of SUITES) {
    const result = runSuite(suite);

    if (result.status === 'SKIP') {
      console.log(`  ${pad('[' + suite.name + ']', 20)} ⏭  SKIP (파일 없음 — 구현 전)`);
      skips++;
      continue;
    }

    const icon = result.status === 'PASS' ? '✅' : '❌';
    const score = `${result.passed}/${result.total}`;
    console.log(`  ${pad('[' + suite.name + ']', 20)} ${pad(score, 7)} ${icon}`);

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

  console.log(`\n${'━'.repeat(40)}`);

  if (failures.length === 0) {
    console.log(`Total: ${totalPassed}/${totalTests} passed ✅  All systems go.\n`);
    if (fs.existsSync(FEEDBACK_PATH)) fs.unlinkSync(FEEDBACK_PATH); // 성공 시 피드백 파일 삭제
    process.exit(0);
  } else {
    console.log(`Total: ${totalPassed}/${totalTests} passed  (${failures.length} suite(s) failed)\n`);

    // 첫 번째 실패에 대해 피드백 파일 생성
    const firstFail = failures[0];

    // 기존 피드백에서 retryCount 읽기
    let retryCount = 1;
    if (fs.existsSync(FEEDBACK_PATH)) {
      try {
        const prev = JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf8'));
        if (prev.suite === firstFail.name && prev.failedTest === firstFail.failedTest) {
          retryCount = (prev.retryCount || 0) + 1;
        }
      } catch (_) {}
    }

    if (retryCount > MAX_RETRIES) {
      console.error(`❌ [${firstFail.name}] ${firstFail.failedTest} — ${MAX_RETRIES}회 수정 후에도 실패`);
      console.error(`   사람의 개입이 필요합니다. ${FEEDBACK_PATH} 참조.\n`);
      process.exit(2); // 에스컬레이션 코드
    }

    const feedback = writeFeedback(firstFail, retryCount);
    printFeedback(feedback);
    process.exit(1); // 일반 실패 코드 → CodingAgent가 피드백 파일 읽고 수정
  }
}

main();
