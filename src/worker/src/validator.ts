// ============================================================
// validator.ts — 최종 PN 역검증
// 참조: CLAUDE.md §9, /.claude/skills/reverse-validator/
// ============================================================

import type {
  Env,
  ParseResult,
  MouserPart,
  VerificationResult,
  ValidationStatus,
  ResultRow,
} from './types';
import { formatResistance, formatPower } from './parser';

// ── Mouser PN 재조회 ──────────────────────────────────────

interface MouserPartDetailResponse {
  SearchResults?: {
    Parts?: Array<{
      MouserPartNumber?: string;
      ProductAttributes?: Array<{ AttributeName: string; AttributeValue: string }>;
      LifecycleStatus?: string;
      Availability?: string;
      ProductDetailUrl?: string;
    }>;
  };
}

export async function fetchPartByPN(env: Env, pn: string): Promise<MouserPart | null> {
  const body = {
    SearchByPartNumberRequest: {
      mouserPartNumber: pn,
      partSearchOptions: 'Exact',
    },
  };

  const resp = await fetch(
    `https://api.mouser.com/api/v1/search/partnumber?apiKey=${env.MOUSER_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) return null;

  const data = await resp.json() as MouserPartDetailResponse;
  const raw = data.SearchResults?.Parts?.[0];
  if (!raw?.MouserPartNumber) return null;

  const attrs = raw.ProductAttributes ?? [];
  const getAttr = (name: string) =>
    attrs.find(a => a.AttributeName.toLowerCase().includes(name.toLowerCase()))?.AttributeValue;

  return {
    mouser_part_number: raw.MouserPartNumber,
    manufacturer: '',
    manufacturer_part_number: '',
    description: '',
    availability: parseInt((raw.Availability ?? '0').replace(/[^0-9]/g, '')) || 0,
    lifecycle: raw.LifecycleStatus ?? 'Active',
    resistance_ohm: parseResistanceAttr(getAttr('resistance') ?? getAttr('ohm')),
    package: getAttr('package') ?? getAttr('case') ?? null,
    tolerance_percent: parseToleranceAttr(getAttr('tolerance')),
    power_watt: parsePowerAttr(getAttr('power')),
    datasheet_url: '',
    mouser_url: raw.ProductDetailUrl ?? '',
  };
}

// ── 역검증 ────────────────────────────────────────────────

export function verifyPart(
  part: MouserPart,
  extracted: ParseResult,
): VerificationResult {
  const mismatches: string[] = [];
  let status: ValidationStatus = 'PASS';

  // 저항값 일치 확인 (필수, ±1% 허용)
  let resistanceMatch = false;
  if (extracted.resistance && part.resistance_ohm !== null) {
    const ratio = Math.abs(part.resistance_ohm - extracted.resistance.value_ohm) /
      Math.max(extracted.resistance.value_ohm, 1);
    resistanceMatch = ratio <= 0.01;
    if (!resistanceMatch) {
      mismatches.push(`Resistance mismatch: expected ${extracted.resistance.value_ohm}Ω, got ${part.resistance_ohm}Ω`);
      status = 'VERIFICATION_FAILED';
    }
  } else if (extracted.resistance) {
    resistanceMatch = part.resistance_ohm === null; // DB에 정보 없으면 일단 통과
  }

  // 패키지 일치 확인 (선택)
  let packageMatch: boolean | null = null;
  if (extracted.package && part.package) {
    const extractedPkg = extracted.package;
    const partPkg = part.package.toUpperCase().replace(/[\s\-]/g, '');
    packageMatch = (
      partPkg.includes(extractedPkg.metric.replace('M', '')) ||
      partPkg.includes(extractedPkg.inch)
    );
    if (!packageMatch) {
      mismatches.push(`Package mismatch: expected ${extractedPkg.normalized}, got ${part.package}`);
    }
  }

  // 오차 일치 확인 (선택)
  let toleranceMatch: boolean | null = null;
  if (extracted.tolerance && part.tolerance_percent !== null) {
    toleranceMatch = Math.abs(part.tolerance_percent - extracted.tolerance.percent) <= 0.5;
    if (!toleranceMatch) {
      mismatches.push(`Tolerance mismatch: expected ${extracted.tolerance.percent}%, got ${part.tolerance_percent}%`);
    }
  }

  // 전력 일치 확인 (선택)
  let powerMatch: boolean | null = null;
  if (extracted.power && part.power_watt !== null) {
    powerMatch = Math.abs(part.power_watt - extracted.power.watt) / extracted.power.watt <= 0.05;
    if (!powerMatch) {
      mismatches.push(`Power mismatch: expected ${extracted.power.watt}W, got ${part.power_watt}W`);
    }
  }

  return {
    status,
    part,
    resistance_match: resistanceMatch,
    package_match: packageMatch,
    tolerance_match: toleranceMatch,
    power_match: powerMatch,
    mismatch_details: mismatches,
  };
}

// ── 결과 테이블 행 생성 (11열) ───────────────────────────

export function buildResultRow(
  rawInput: string,
  extracted: ParseResult,
  verification: VerificationResult,
): ResultRow {
  const part = verification.part;

  return {
    input: rawInput,
    mouser_pn: part?.mouser_part_number ?? null,
    input_resistance: extracted.resistance
      ? formatResistance(extracted.resistance.value_ohm)
      : null,
    pn_resistance: part?.resistance_ohm !== null && part?.resistance_ohm !== undefined
      ? formatResistance(part.resistance_ohm)
      : null,
    input_package: extracted.package?.normalized ?? null,
    pn_package: part?.package ?? null,
    input_tolerance: extracted.tolerance ? `±${extracted.tolerance.percent}%` : null,
    pn_tolerance: part?.tolerance_percent !== null && part?.tolerance_percent !== undefined
      ? `±${part.tolerance_percent}%`
      : null,
    input_power: extracted.power ? formatPower(extracted.power.watt) : null,
    pn_power: part?.power_watt !== null && part?.power_watt !== undefined
      ? formatPower(part.power_watt)
      : null,
    validation: verification.status,
    mouser_url: part?.mouser_url ?? null,
  };
}

// ── 내부 파서 유틸 ────────────────────────────────────────

function parseResistanceAttr(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*(k|K|M|Ω|ohm)?/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = m[2]?.toLowerCase() ?? '';
  if (unit === 'k') return val * 1000;
  if (unit === 'm') return val * 1_000_000;
  return val;
}

function parseToleranceAttr(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

function parsePowerAttr(s?: string): number | null {
  if (!s) return null;
  const fracM = s.match(/(\d+)\/(\d+)\s*W/i);
  if (fracM) return parseInt(fracM[1]) / parseInt(fracM[2]);
  const decM = s.match(/([\d.]+)\s*(m)?W/i);
  if (decM) {
    const v = parseFloat(decM[1]);
    return decM[2] ? v / 1000 : v;
  }
  return null;
}
