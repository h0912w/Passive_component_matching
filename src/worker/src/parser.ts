// ============================================================
// parser.ts — 규칙 기반 저항 스펙 파서
// 참조: /rules/spec_extraction_rules.md
// ============================================================

import type {
  ParseResult,
  ResistanceField,
  PackageField,
  ToleranceField,
  PowerField,
  ConfidenceResult,
} from './types';

// ── 패키지 alias 테이블 ─────────────────────────────────────

interface PackageAlias {
  metric: string;
  inch: string;
  size_mm: string;
}

const PACKAGE_ALIAS: Record<string, PackageAlias> = {
  // 메트릭 입력
  '0402M': { metric: '0402M', inch: '01005', size_mm: '0.4x0.2' },
  '0603M': { metric: '0603M', inch: '0201',  size_mm: '0.6x0.3' },
  '1005M': { metric: '1005M', inch: '0402',  size_mm: '1.0x0.5' },
  '1608M': { metric: '1608M', inch: '0603',  size_mm: '1.6x0.8' },
  '2012M': { metric: '2012M', inch: '0805',  size_mm: '2.0x1.2' },
  '3216M': { metric: '3216M', inch: '1206',  size_mm: '3.2x1.6' },
  '3225M': { metric: '3225M', inch: '1210',  size_mm: '3.2x2.5' },
  '5025M': { metric: '5025M', inch: '2010',  size_mm: '5.0x2.5' },
  '6332M': { metric: '6332M', inch: '2512',  size_mm: '6.3x3.2' },
  // 숫자만 — 메트릭으로 해석
  '0402': { metric: '1005M', inch: '0402',  size_mm: '1.0x0.5' }, // 현장 관행: 인치 0402 = 메트릭 1005
  '0201': { metric: '0603M', inch: '0201',  size_mm: '0.6x0.3' },
  '01005':{ metric: '0402M', inch: '01005', size_mm: '0.4x0.2' },
  '1005': { metric: '1005M', inch: '0402',  size_mm: '1.0x0.5' },
  '1608': { metric: '1608M', inch: '0603',  size_mm: '1.6x0.8' },
  '2012': { metric: '2012M', inch: '0805',  size_mm: '2.0x1.2' },
  '3216': { metric: '3216M', inch: '1206',  size_mm: '3.2x1.6' },
  '3225': { metric: '3225M', inch: '1210',  size_mm: '3.2x2.5' },
  '5025': { metric: '5025M', inch: '2010',  size_mm: '5.0x2.5' },
  '6332': { metric: '6332M', inch: '2512',  size_mm: '6.3x3.2' },
  // 인치 입력
  '0603': { metric: '1608M', inch: '0603',  size_mm: '1.6x0.8' }, // 인치 0603
  '0805': { metric: '2012M', inch: '0805',  size_mm: '2.0x1.2' },
  '1206': { metric: '3216M', inch: '1206',  size_mm: '3.2x1.6' },
  '1210': { metric: '3225M', inch: '1210',  size_mm: '3.2x2.5' },
  '2010': { metric: '5025M', inch: '2010',  size_mm: '5.0x2.5' },
  '2512': { metric: '6332M', inch: '2512',  size_mm: '6.3x3.2' },
};

// 인치 패키지 표기 목록 (4자리 숫자 중 인치로 우선 해석)
const INCH_PACKAGES = new Set(['0402', '0603', '0805', '1206', '1210', '2010', '2512']);

// ── 전력 분수 테이블 ───────────────────────────────────────

const POWER_FRACTION_MAP: Record<string, number> = {
  '1/20': 0.05, '1/16': 0.0625, '1/10': 0.1, '1/8': 0.125,
  '1/6': 0.1667, '1/5': 0.2, '1/4': 0.25, '1/3': 0.3333,
  '1/2': 0.5, '1': 1.0, '2': 2.0, '3': 3.0, '5': 5.0,
};

// ── 오차 IEC 코드 테이블 ───────────────────────────────────

const IEC_TOLERANCE: Record<string, number> = {
  B: 0.1, C: 0.25, D: 0.5, F: 1, G: 2, J: 5, K: 10, M: 20,
};

// ============================================================
// §5: 입력 전처리 (구분자 정규화 + 토큰화)
// ============================================================

function preprocessInput(raw: string): string[] {
  let s = raw.trim();

  // 1단계: 탭 → 공백
  s = s.replace(/\t/g, ' ');

  // 2단계: 분수 전력 패턴 보존 (1/8W, 1/4W 등)
  // 슬러시를 공백으로 치환하기 전에 분수 패턴을 임시 토큰으로 대체
  s = s.replace(/(\d+)\/(\d+)(w|W|watt|Watt|WATT|mW|mw)?/g, (_, n, d, u) => {
    const unit = u || 'W';
    return `${n}DIV${d}${unit}`;
  });

  // 3단계: 구분자 → 공백 (슬러시, 언더바, 콤마, 세미콜론)
  s = s.replace(/[/_,;]/g, ' ');

  // 4단계: 대시 → 공백 (숫자-숫자 패턴이 아닐 때)
  s = s.replace(/(?<![0-9])-|-(?![0-9])/g, ' ');

  // 5단계: 괄호 제거
  s = s.replace(/[()[\]]/g, ' ');

  // 6단계: 분수 토큰 복원
  s = s.replace(/(\d+)DIV(\d+)(w|W|watt|Watt|WATT|mW|mw)?/g, (_, n, d, u) => {
    const unit = u || 'W';
    return `${n}/${d}${unit}`;
  });

  // 7단계: 연속 공백 → 단일 공백
  s = s.replace(/\s+/g, ' ').trim();

  // 8단계: "구분자 없는 연결" 분리 시도
  // e.g. "1k0603" → "1k 0603", "0R0805" → "0R 0805"
  s = splitConcatenated(s);

  return s.split(' ').filter(t => t.length > 0);
}

/**
 * 구분자 없이 연결된 토큰을 분리 시도
 * e.g. "1k0603" → "1k 0603"
 */
function splitConcatenated(s: string): string {
  // IEC RKM + 패키지 숫자 패턴
  s = s.replace(/(\d+[RKMrkm]\d*)(\d{4})/g, '$1 $2');
  // 저항값 + 패키지 패턴 (4.7k0603)
  s = s.replace(/(\d+\.?\d*[kKmMrRωΩ])(\d{4})/g, '$1 $2');
  return s;
}

// ============================================================
// §1: 저항값 파서
// ============================================================

function parseResistance(token: string): ResistanceField | null {
  // 0R (0옴 특수 케이스)
  if (/^0[Rr]$/i.test(token)) {
    return { value_ohm: 0, text: token, confidence: 1.0 };
  }

  // IEC RKM 3파트: 4R7, 2K2, 1M5
  const iec3 = token.match(/^(\d+)([RKMrkm])(\d+)$/);
  if (iec3) {
    const [, a, unit, b] = iec3;
    const val = parseFloat(`${a}.${b}`);
    const multiplier = getMultiplier(unit);
    if (multiplier !== null) {
      return { value_ohm: val * multiplier, text: token, confidence: 0.98 };
    }
  }

  // IEC RKM 2파트: 10R, 1K, 1M
  const iec2 = token.match(/^(\d+\.?\d*)([RKMrkm])$/);
  if (iec2) {
    const [, num, unit] = iec2;
    const multiplier = getMultiplier(unit);
    if (multiplier !== null) {
      return { value_ohm: parseFloat(num) * multiplier, text: token, confidence: 0.97 };
    }
  }

  // 소수점 + 단위 변형: 4.7ohm, 4.7Ω, 4.7k, 4.7K, 4.7M
  const decUnit = token.match(/^(\d+\.?\d*)(ohm|Ohm|OHM|[Ωω]|[kK](?:Ω|ohm|Ohm|OHM)?|[mM](?:Ω|ohm|Ohm|OHM|egaohm)?)$/i);
  if (decUnit) {
    const [, num, unit] = decUnit;
    const uLower = unit.toLowerCase();
    let multiplier = 1;
    if (uLower.startsWith('k')) multiplier = 1000;
    else if (uLower.startsWith('m') && !uLower.includes('milli')) multiplier = 1000000;
    return { value_ohm: parseFloat(num) * multiplier, text: token, confidence: 0.95 };
  }

  return null;
}

function getMultiplier(unit: string): number | null {
  switch (unit.toUpperCase()) {
    case 'R': return 1;
    case 'K': return 1000;
    case 'M': return 1000000;
    default: return null;
  }
}

// ============================================================
// §2: 패키지 파서
// ============================================================

function parsePackage(token: string): PackageField | null {
  // 대소문자 무시하고 alias 테이블에서 조회
  const upper = token.toUpperCase().replace(/[MI]$/, match => match); // 접미사 유지
  const alias = PACKAGE_ALIAS[token] || PACKAGE_ALIAS[upper];
  if (alias) {
    return {
      normalized: `${alias.metric}/${alias.inch}`,
      metric: alias.metric,
      inch: alias.inch,
      text: token,
      confidence: 0.95,
    };
  }

  // "0603 Inch", "0603inch", "1608 Metric", "1608/0603" 등 변형
  const withSuffix = token.match(/^(\d{4})\s*(inch|metric|M|I)?$/i);
  if (withSuffix) {
    const [, code] = withSuffix;
    const a = PACKAGE_ALIAS[code];
    if (a) {
      return {
        normalized: `${a.metric}/${a.inch}`,
        metric: a.metric,
        inch: a.inch,
        text: token,
        confidence: 0.90,
      };
    }
  }

  return null;
}

// ============================================================
// §3: 오차 파서
// ============================================================

function parseTolerance(token: string): ToleranceField | null {
  // % 표기: 1%, ±1%, +/-1%, ±0.5%
  const percentMatch = token.match(/^[±+\-]?\/?-?(\d+\.?\d*)%$/);
  if (percentMatch) {
    return { percent: parseFloat(percentMatch[1]), text: token, confidence: 0.99 };
  }

  // IEC 코드: F, J (parser_direct=true만 직접 처리)
  if (token === 'F' || token === 'J') {
    const pct = IEC_TOLERANCE[token];
    return { percent: pct, text: token, confidence: 0.90 };
  }

  // 기타 IEC 코드 (B, C, D, G, K, M) — 컨텍스트 없이 단독 출현 시
  const iecCode = IEC_TOLERANCE[token];
  if (iecCode !== undefined && /^[BCDGKM]$/.test(token)) {
    return { percent: iecCode, text: token, confidence: 0.70 };
  }

  return null;
}

// ============================================================
// §4: 전력 파서
// ============================================================

function parsePower(token: string): PowerField | null {
  // 분수: 1/8W, 1/4W
  const fracMatch = token.match(/^(\d+)\/(\d+)(W|w|Watt|watt|mW|mw)?$/);
  if (fracMatch) {
    const [, n, d, unit] = fracMatch;
    let watt = parseInt(n) / parseInt(d);
    if (unit && unit.toLowerCase().startsWith('m')) watt /= 1000;
    return { watt, text: token, confidence: 0.99 };
  }

  // 소수점: 0.25W, 1W
  const decMatch = token.match(/^(\d+\.?\d*)(W|w|Watt|watt)$/);
  if (decMatch) {
    return { watt: parseFloat(decMatch[1]), text: token, confidence: 0.99 };
  }

  // mW: 125mW
  const mwMatch = token.match(/^(\d+\.?\d*)(mW|mw|milliwatt)$/i);
  if (mwMatch) {
    return { watt: parseFloat(mwMatch[1]) / 1000, text: token, confidence: 0.99 };
  }

  return null;
}

// ============================================================
// 메인 파서
// ============================================================

export function parseSpec(raw: string): ParseResult {
  const tokens = preprocessInput(raw);
  const result: ParseResult = {
    resistance: null,
    package: null,
    tolerance: null,
    power: null,
    unmatched_tokens: [],
  };

  for (const token of tokens) {
    if (!token) continue;

    if (!result.resistance) {
      const r = parseResistance(token);
      if (r) { result.resistance = r; continue; }
    }

    if (!result.package) {
      const p = parsePackage(token);
      if (p) { result.package = p; continue; }
    }

    if (!result.tolerance) {
      const t = parseTolerance(token);
      if (t) { result.tolerance = t; continue; }
    }

    if (!result.power) {
      const pw = parsePower(token);
      if (pw) { result.power = pw; continue; }
    }

    // 어떤 패턴에도 매칭되지 않은 토큰
    result.unmatched_tokens.push(token);
  }

  return result;
}

// ============================================================
// §6: 신뢰도 계산
// ============================================================

export function calcConfidence(
  parsed: ParseResult,
  raw: string,
  dbHit: boolean = false,
): ConfidenceResult {
  // 필드 완성도 (60% 가중치)
  let fieldScore = 0;
  if (parsed.resistance) fieldScore += 40;
  if (parsed.package)    fieldScore += 20;
  if (parsed.tolerance)  fieldScore += 20;
  if (parsed.power)      fieldScore += 20;
  const fieldCompleteness = fieldScore / 100;

  // 토큰 매칭률 (40% 가중치)
  const tokens = preprocessInput(raw).filter(t => t.length > 0);
  const matched = tokens.length - parsed.unmatched_tokens.length;
  const tokenMatchRate = tokens.length > 0 ? matched / tokens.length : 0;

  // DB 보너스
  const dbBonus = dbHit ? 0.05 : 0;

  const total = Math.min(1.0, fieldCompleteness * 0.6 + tokenMatchRate * 0.4 + dbBonus);

  // 특이 패턴 감지 (구분자 없는 연결, 순서 비정상 등)
  const hasSpecialPattern = parsed.unmatched_tokens.length > 0;

  return {
    total,
    field_completeness: fieldCompleteness,
    token_match_rate: tokenMatchRate,
    db_bonus: dbBonus,
    glm_required: total < 0.70,
    glm_double_check: total >= 0.70 && total < 0.85 && hasSpecialPattern,
  };
}

// ============================================================
// 포맷 헬퍼
// ============================================================

export function formatResistance(ohm: number): string {
  if (ohm === 0) return '0Ω';
  if (ohm >= 1_000_000) return `${(ohm / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}MΩ`;
  if (ohm >= 1_000)     return `${(ohm / 1_000).toFixed(2).replace(/\.?0+$/, '')}kΩ`;
  return `${ohm}Ω`;
}

export function formatPower(watt: number): string {
  if (watt < 1) {
    const fractions: [number, string][] = [
      [0.05, '1/20W'], [0.0625, '1/16W'], [0.1, '1/10W'], [0.125, '1/8W'],
      [0.1667, '1/6W'], [0.2, '1/5W'], [0.25, '1/4W'], [0.3333, '1/3W'], [0.5, '1/2W'],
    ];
    for (const [val, label] of fractions) {
      if (Math.abs(watt - val) < 0.001) return label;
    }
  }
  return `${watt}W`;
}
