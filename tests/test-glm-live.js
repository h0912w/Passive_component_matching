/**
 * test-glm-live.js — 실제 GLM API 호출 테스트
 *
 * 실행 조건:
 *   1. .env 파일에 GLM_API_KEY 가 설정되어 있어야 함
 *   2. node tests/run-all-tests.js --live  (또는 단독 실행)
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const https = require('https');

const API_KEY = process.env.GLM_API_KEY;

if (!API_KEY) {
  console.error('GLM_API_KEY가 .env 파일에 없습니다.');
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'api_key_missing',
    targetFn: 'setup', hint: '.env 파일에 GLM_API_KEY 를 추가하세요.' }));
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
      res.on('end', () => resolve({ code: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  const results = { passed: 0, total: 0, failedTest: null, targetFn: null,
                    input: null, expected: null, actual: null, hint: null };

  // ── 테스트 1: 자연어 저항 파싱 ──
  results.total++;
  console.log('  [1] GLM 자연어 파싱: "1킬로옴 0402 5퍼센트"');
  try {
    const resp = await httpsPost(
      'open.bigmodel.cn',
      '/api/paas/v4/chat/completions',
      {
        model: 'glm-4.7-flash',
        messages: [
          { role: 'system', content: '전자 부품 전문가입니다. 저항 정보를 JSON만으로 반환하세요.' },
          { role: 'user', content: '다음에서 저항값(ohm), 패키지, 오차를 추출: "1킬로옴 0402 5퍼센트"\nJSON: {"resistance_ohms":number,"package":"string","tolerance_percent":number}' }
        ],
        temperature: 0.1
      },
      { 'Authorization': 'Bearer ' + API_KEY }
    );

    if (resp.code !== 200) throw new Error(`HTTP ${resp.code}: ${JSON.stringify(resp.body)}`);
    const content = resp.body?.choices?.[0]?.message?.content;
    if (!content) throw new Error('응답에 content 없음');

    // JSON 추출
    let jsonStr = content;
    const match = content.match(/\{[\s\S]*\}/);
    if (match) jsonStr = match[0];
    const parsed = JSON.parse(jsonStr);

    if (parsed.resistance_ohms !== 1000) throw new Error(`resistance_ohms = ${parsed.resistance_ohms}, expected 1000`);
    console.log(`     ✅ 파싱 성공: ${JSON.stringify(parsed)}`);
    results.passed++;
  } catch (err) {
    console.log(`     ❌ ${err.message}`);
    results.failedTest = 'glm_nlp_parse';
    results.targetFn = '_parseWithNlp';
    results.hint = err.message;
  }

  // ── 테스트 2: 응답 구조 확인 ──
  results.total++;
  console.log('  [2] GLM 응답 구조 확인 (choices, usage)');
  try {
    const resp = await httpsPost(
      'open.bigmodel.cn',
      '/api/paas/v4/chat/completions',
      {
        model: 'glm-4.7-flash',
        messages: [{ role: 'user', content: 'Say "hello" in JSON: {"greeting":"hello"}' }],
        temperature: 0.1
      },
      { 'Authorization': 'Bearer ' + API_KEY }
    );
    if (resp.code !== 200) throw new Error(`HTTP ${resp.code}`);
    if (!resp.body.choices || resp.body.choices.length === 0) throw new Error('choices 비어있음');
    if (!resp.body.usage) throw new Error('usage 필드 없음');
    console.log(`     ✅ 구조 정상: choices=${resp.body.choices.length}, tokens=${resp.body.usage.total_tokens}`);
    results.passed++;
  } catch (err) {
    console.log(`     ❌ ${err.message}`);
    if (!results.failedTest) { results.failedTest = 'glm_response_structure'; results.targetFn = '_callGlm'; results.hint = err.message; }
  }

  console.log(`\n  GLM Live: ${results.passed}/${results.total}`);
  console.log(JSON.stringify(results));
  process.exit(results.passed === results.total ? 0 : 1);
}

runTests().catch(err => {
  console.error('예상치 못한 오류:', err.message);
  console.log(JSON.stringify({ passed: 0, total: 1, failedTest: 'unexpected_error', targetFn: 'runTests', hint: err.message }));
  process.exit(1);
});
