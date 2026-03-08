/**
 * test-glm-rate-limit.js — GLM API Rate Limit 경험적 조사
 *
 * 다양한 딜레이 간격으로 GLM API를 연속 호출하여
 * 실제 rate limit을 경험적으로 파악합니다.
 *
 * 실행: node tests/test-glm-rate-limit.js
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const API_KEY = process.env.GLM_API_KEY;

if (!API_KEY) {
  console.error('GLM_API_KEY가 .env 파일에 없습니다.');
  process.exit(1);
}

function httpsPost(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let body = {};
        try { body = JSON.parse(data); } catch (e) { body = { _raw: data }; }
        resolve({ code: res.statusCode, body });
      });
    });
    req.on('error', reject);
    req.setTimeout(45000, () => { req.destroy(new Error('Request timeout')); });
    req.write(payload);
    req.end();
  });
}

async function callGlm(index, delayMs) {
  const startTime = Date.now();
  try {
    const resp = await httpsPost(
      'open.bigmodel.cn',
      '/api/paas/v4/chat/completions',
      {
        model: 'glm-4.7-flash',
        messages: [{ role: 'user', content: `Say "${index}" only.` }],
        temperature: 0.1
      },
      { 'Authorization': 'Bearer ' + API_KEY }
    );

    const elapsed = Date.now() - startTime;
    const status = resp.code === 200 ? '✅' : (resp.code === 429 ? '⚠️ 429' : '❌');
    console.log(`  [${index}] ${status} HTTP ${resp.code} (${elapsed}ms) ${resp.code === 429 ? '- RATE LIMIT' : ''}`);

    return { index, code: resp.code, elapsed, success: resp.code === 200 };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.log(`  [${index}] ❌ ERROR: ${err.message} (${elapsed}ms)`);
    return { index, code: 0, elapsed, success: false, error: err.message };
  }
}

// 테스트 시나리오
const TEST_SCENARIOS = [
  { name: '테스트 1: 연속 호출 (딜레이 없음)', delays: [0, 0, 0, 0, 0] },
  { name: '테스트 2: 1초 간격', delays: [1000, 1000, 1000, 1000, 1000] },
  { name: '테스트 3: 3초 간격 (test-glm-live.js와 동일)', delays: [3000, 3000, 3000, 3000, 3000] },
  { name: '테스트 4: 5초 간격', delays: [5000, 5000, 5000, 5000, 5000] },
];

async function runScenario(scenarioIndex) {
  const scenario = TEST_SCENARIOS[scenarioIndex];
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${scenario.name}`);
  console.log('='.repeat(60));

  const results = [];

  for (let i = 0; i < scenario.delays.length; i++) {
    const result = await callGlm(i + 1, scenario.delays[i]);
    results.push(result);

    // 마지막 호출이 아니면 딜레이
    if (i < scenario.delays.length - 1) {
      const delay = scenario.delays[i];
      if (delay > 0) {
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  // 결과 요약
  const success = results.filter(r => r.success).length;
  const rate429 = results.filter(r => r.code === 429).length;
  const errors = results.filter(r => !r.success && r.code !== 429).length;

  console.log(`\n결과: ${success}/${results.length} 성공, ${rate429}건 429, ${errors}건 오류`);

  return { scenario, results, success, rate429, errors };
}

async function main() {
  console.log('GLM API Rate Limit 경험적 조사');
  console.log(`API Key: ${API_KEY.substring(0, 12)}...`);

  // 테스트 사이에 충분한 대기 시간
  const SCENARIO_DELAY = 30000; // 30초

  const allResults = [];
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    const result = await runScenario(i);
    allResults.push(result);

    // 마지막 시나리오가 아니면 대기
    if (i < TEST_SCENARIOS.length - 1) {
      console.log(`\n다음 테스트까지 ${SCENARIO_DELAY/1000}초 대기...`);
      await new Promise(r => setTimeout(r, SCENARIO_DELAY));
    }
  }

  // 최종 요약
  console.log(`\n${'='.repeat(60)}`);
  console.log('최종 요약');
  console.log('='.repeat(60));

  for (const result of allResults) {
    console.log(`\n${result.scenario.name}:`);
    console.log(`  성공: ${result.success}/${result.scenario.delays.length}`);
    console.log(`  429:   ${result.rate429}`);
    console.log(`  오류:  ${result.errors}`);
  }

  // 추천 딜레이 찾기
  console.log(`\n${'='.repeat(60)}`);
  console.log('추천 사항');
  console.log('='.repeat(60));

  const no429Scenarios = allResults.filter(r => r.rate429 === 0);
  if (no429Scenarios.length > 0) {
    const bestScenario = no429Scenarios[0];
    const avgDelay = bestScenario.scenario.delays.reduce((a, b) => a + b, 0) / bestScenario.scenario.delays.length;
    console.log(`추천 딜레이: ${avgDelay}ms (${bestScenario.scenario.name.split(':')[1]?.trim() || '해당 시나리오'})`);
  } else {
    console.log('429 에러가 발생하지 않는 시나리오가 없습니다. 딜레이를 더 늘려야 할 수 있습니다.');
  }
}

main().catch(err => {
  console.error('예상치 못한 오류:', err);
  process.exit(1);
});
