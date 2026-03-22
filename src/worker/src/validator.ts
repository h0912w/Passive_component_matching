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

// ⚠️ ProductAttributes는 저항 스펙을 포함하지 않는다 — Description에서 파싱한다.
// 참조: /docs/mouser_db_guide.md §2

interface MouserPartDetailResponse {
  SearchResults?: {
    Parts?: Array<{
      MouserPartNumber?: string;
      ManufacturerPartNumber?: string;
      Manufacturer?: string;
      Description?: string;
      LifecycleStatus?: string;
      Availability?: string;
      DataSheetUrl?: string;
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

  const desc = raw.Description ?? '';
  const mpn  = raw.ManufacturerPartNumber ?? '';

  return {
    mouser_part_number: raw.MouserPartNumber,
    manufacturer: raw.Manufacturer ?? '',
    manufacturer_part_number: mpn,
    description: desc,
    availability: parseInt((raw.Availability ?? '0').replace(/[^0-9]/g, '')) || 0,
    lifecycle: raw.LifecycleStatus ?? 'Active',
    resistance_ohm: parseResistanceFromDesc(desc),
    package: parsePackageFromDesc(desc, mpn),
    tolerance_percent: parseToleranceFromDesc(desc),
    power_watt: parsePowerFromDesc(desc),
    datasheet_url: raw.DataSheetUrl ?? '',
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

// ── Description 필드 파서 ─────────────────────────────────
// ⚠️ ProductAttributes 대신 Description regex 파싱 사용
// 참조: /docs/mouser_db_guide.md §3.2

function parseResistanceFromDesc(desc: string): number | null {
  const iec3 = desc.match(/\b(\d+)([RKM])(\d+)\b/i);
  if (iec3) {
    const val = parseFloat(`${iec3[1]}.${iec3[3]}`);
    const u = iec3[2].toUpperCase();
    return val * (u === 'K' ? 1000 : u === 'M' ? 1e6 : 1);
  }
  const ohm = desc.match(/\b(\d+\.?\d*)\s*ohms?\b/i);
  if (ohm) return parseFloat(ohm[1]);
  const km = desc.match(/\b(\d+\.?\d*)\s*(K|M|R)\b/);
  if (km) {
    const val = parseFloat(km[1]);
    const u = km[2].toUpperCase();
    return val * (u === 'K' ? 1000 : u === 'M' ? 1e6 : 1);
  }
  return null;
}

function parsePackageFromDesc(desc: string, mpn: string): string | null {
  const m = (desc + ' ' + mpn).match(/\b(0402|0603|0805|1206|1210|2010|2512|01005|0201|1608|2012|3216|3225|5025|6332)\b/);
  return m ? m[1] : null;
}

function parseToleranceFromDesc(desc: string): number | null {
  const m = desc.match(/[±]?\s*(\d+\.?\d*)\s*%/);
  return m ? parseFloat(m[1]) : null;
}

function parsePowerFromDesc(desc: string): number | null {
  const frac = desc.match(/\b(\d+)\/(\d+)\s*W\b/i);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  const mw = desc.match(/\b(\d+\.?\d*)\s*mW\b/i);
  if (mw) return parseFloat(mw[1]) / 1000;
  const w = desc.match(/\b(\d+\.?\d*)\s*W\b/i);
  if (w) return parseFloat(w[1]);
  return null;
}
