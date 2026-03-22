// Mouser 스펙 DB 1회 수집 스크립트
// 실행: node collect.js
// 환경변수 MOUSER_API_KEY 필요

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.MOUSER_API_KEY;
if (!API_KEY) {
  console.error('❌ 환경변수 MOUSER_API_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const KEYWORDS = [
  'chip resistor 0402',
  'chip resistor 0603',
  'chip resistor 0805',
  'chip resistor 1206',
  'chip resistor 2512',
];
const RECORDS_PER_PAGE = 50;

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(url, options, (res) => {
      let raw = '';
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('JSON parse error: ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getAttr(attrs, name) {
  if (!attrs) return null;
  const found = attrs.find(a =>
    a.AttributeName && a.AttributeName.toLowerCase().includes(name.toLowerCase())
  );
  return found ? found.AttributeValue : null;
}

function parseResistance(s) {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*(k|K|M|m|Ω|ohm)?/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k') return val * 1000;
  if (unit === 'm' && !unit.includes('m')) return val * 1e6;
  return val;
}

function parseTolerance(s) {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

function parsePower(s) {
  if (!s) return null;
  const frac = s.match(/(\d+)\/(\d+)\s*W/i);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const dec = s.match(/([\d.]+)\s*(m)?W/i);
  if (dec) return dec[2] ? parseFloat(dec[1]) / 1000 : parseFloat(dec[1]);
  return null;
}

async function collectKeyword(keyword) {
  const url = `https://api.mouser.com/api/v1/search/keyword?apiKey=${API_KEY}`;
  const parts = [];

  for (let start = 0; start < 200; start += RECORDS_PER_PAGE) {
    const body = {
      SearchByKeywordRequest: {
        keyword,
        records: RECORDS_PER_PAGE,
        startingRecord: start,
        searchOptions: 'None',
        searchWithSYMlink: 'False',
      },
    };

    let data;
    try {
      data = await postJson(url, body);
    } catch (e) {
      console.warn(`  ⚠️  요청 실패 (start=${start}): ${e.message}`);
      break;
    }

    if (data.Errors && data.Errors.length > 0) {
      console.warn(`  ⚠️  API 오류: ${data.Errors[0].Message}`);
      break;
    }

    const results = data.SearchResults?.Parts ?? [];
    if (results.length === 0) break;

    for (const p of results) {
      const attrs = p.ProductAttributes ?? [];
      const resistance = parseResistance(getAttr(attrs, 'resistance') ?? getAttr(attrs, 'ohm'));
      const pkg = getAttr(attrs, 'package') ?? getAttr(attrs, 'case');
      const tolerance = parseTolerance(getAttr(attrs, 'tolerance'));
      const power = parsePower(getAttr(attrs, 'power'));

      if (resistance !== null) {
        parts.push({ resistance, package: pkg, tolerance, power });
      }
    }

    process.stdout.write(`  ${keyword}: ${start + results.length}건 수집...\r`);
    await sleep(300); // rate limit 방지
  }

  console.log(`  ✅ ${keyword}: 총 ${parts.length}건`);
  return parts;
}

async function main() {
  console.log('🚀 Mouser 스펙 DB 수집 시작\n');

  const allParts = [];
  for (const kw of KEYWORDS) {
    console.log(`\n📦 "${kw}" 검색 중...`);
    const parts = await collectKeyword(kw);
    allParts.push(...parts);
    await sleep(500);
  }

  // 중복 제거 및 집계
  const resistanceSet = new Set();
  const packageSet = new Set();
  const toleranceSet = new Set();
  const powerSet = new Set();

  for (const p of allParts) {
    if (p.resistance !== null) resistanceSet.add(p.resistance);
    if (p.package)    packageSet.add(p.package.trim());
    if (p.tolerance !== null) toleranceSet.add(p.tolerance);
    if (p.power !== null) powerSet.add(p.power);
  }

  const output = {
    metadata: {
      collected_at: new Date().toISOString(),
      source: 'Mouser API',
      total_count: allParts.length,
      version: '1.0',
      keywords_used: KEYWORDS,
    },
    specs: {
      resistance_values_ohm: [...resistanceSet].sort((a, b) => a - b),
      packages: [...packageSet].sort(),
      tolerances_percent: [...toleranceSet].sort((a, b) => a - b),
      power_ratings_watt: [...powerSet].sort((a, b) => a - b),
    },
  };

  const outPath = path.join(__dirname, 'mouser_resistor_specs.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  const metaPath = path.join(__dirname, 'collection_metadata.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  meta.collections.push({
    collected_at: output.metadata.collected_at,
    total_count: allParts.length,
    unique_resistance_values: output.specs.resistance_values_ohm.length,
    unique_packages: output.specs.packages.length,
  });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

  console.log('\n\n✅ 수집 완료!');
  console.log(`   저항값: ${output.specs.resistance_values_ohm.length}종`);
  console.log(`   패키지: ${output.specs.packages.length}종`);
  console.log(`   오차:   ${output.specs.tolerances_percent.length}종`);
  console.log(`   전력:   ${output.specs.power_ratings_watt.length}종`);
  console.log(`   저장위치: ${outPath}`);
}

main().catch(e => {
  console.error('❌ 오류:', e.message);
  process.exit(1);
});
