// ============================================================
// mouser.ts — Mouser API 실시간 검색 + 후보 필터링/정렬
// 참조: CLAUDE.md §12, /docs/mouser_db_guide.md
// ============================================================

import type { Env, MouserSearchParams, MouserPart } from './types';

const MOUSER_API_BASE = 'https://api.mouser.com/api/v1';

// ── Mouser API 검색 ──────────────────────────────────────

interface MouserApiResponse {
  SearchResults?: {
    NumberOfResult?: number;
    Parts?: MouserApiPart[];
  };
  Errors?: Array<{ Id: number; Code: string; Message: string; ResourceKey: string; ResourceFormatString: string; ResourceFormatString2: string; PropertyName: string }>;
}

interface MouserApiPart {
  MouserPartNumber?: string;
  ManufacturerPartNumber?: string;
  Manufacturer?: string;
  Description?: string;
  Availability?: string;
  LifecycleStatus?: string;
  DataSheetUrl?: string;
  ProductDetailUrl?: string;
  PriceBreaks?: unknown[];
  // Attributes vary by product
  ProductAttributes?: Array<{ AttributeName: string; AttributeValue: string }>;
}

export async function searchMouserParts(
  env: Env,
  params: MouserSearchParams,
): Promise<MouserPart[]> {
  // 검색 키워드 구성 — 저항값은 필수, 나머지는 선택
  const keyword = buildKeyword(params);

  const body = {
    SearchByKeywordRequest: {
      keyword,
      records: 20,
      startingRecord: 0,
      searchOptions: 'None',
      searchWithSYMlink: 'False',
    },
  };

  const resp = await fetch(
    `${MOUSER_API_BASE}/search/keyword?apiKey=${env.MOUSER_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    throw new Error(`Mouser API HTTP ${resp.status}`);
  }

  const data = await resp.json() as MouserApiResponse;

  if (data.Errors && data.Errors.length > 0) {
    throw new Error(`Mouser API error: ${data.Errors[0].Message}`);
  }

  const parts = data.SearchResults?.Parts ?? [];
  return parts.map(normalizePart).filter(p => p !== null) as MouserPart[];
}

// ── 검색 키워드 구성 ─────────────────────────────────────

function buildKeyword(params: MouserSearchParams): string {
  const parts: string[] = ['chip resistor'];

  // 저항값 (필수)
  parts.push(formatResistanceForSearch(params.resistance_ohm));

  // 패키지 (양쪽 alias OR 조건)
  if (params.package_inch) parts.push(params.package_inch);

  return parts.join(' ');
}

function formatResistanceForSearch(ohm: number): string {
  if (ohm === 0) return '0 ohm';
  if (ohm >= 1_000_000) return `${(ohm / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (ohm >= 1_000)     return `${(ohm / 1_000).toFixed(2).replace(/\.?0+$/, '')}k`;
  return `${ohm}`;
}

// ── Mouser API 응답 정규화 ───────────────────────────────
// ⚠️ ProductAttributes는 포장 방식(Reel/Cut Tape)만 포함하며 저항 스펙은 Description에서 추출한다.
// 참조: /docs/mouser_db_guide.md §2

function normalizePart(raw: MouserApiPart): MouserPart | null {
  if (!raw.MouserPartNumber) return null;

  const desc  = raw.Description ?? '';
  const mpn   = raw.ManufacturerPartNumber ?? '';

  return {
    mouser_part_number: raw.MouserPartNumber,
    manufacturer: raw.Manufacturer ?? '',
    manufacturer_part_number: mpn,
    description: desc,
    availability: parseAvailability(raw.Availability),
    lifecycle: raw.LifecycleStatus ?? 'Active',
    resistance_ohm: parseResistanceFromDesc(desc),
    package: parsePackageFromDesc(desc, mpn),
    tolerance_percent: parseToleranceFromDesc(desc),
    power_watt: parsePowerFromDesc(desc),
    datasheet_url: raw.DataSheetUrl ?? '',
    mouser_url: raw.ProductDetailUrl ?? '',
  };
}

function parseAvailability(s?: string): number {
  if (!s) return 0;
  const n = parseInt(s.replace(/[^0-9]/g, ''));
  return isNaN(n) ? 0 : n;
}

// ── Description 필드 파서 (ProductAttributes 대체) ─────────────────────────
// 참조: /docs/mouser_db_guide.md §3.2

function parseResistanceFromDesc(desc: string): number | null {
  // 1순위: IEC RKM 3파트 (4R7, 2K2, 1M5)
  const iec3 = desc.match(/\b(\d+)([RKM])(\d+)\b/i);
  if (iec3) {
    const val = parseFloat(`${iec3[1]}.${iec3[3]}`);
    const u = iec3[2].toUpperCase();
    return val * (u === 'K' ? 1000 : u === 'M' ? 1e6 : 1);
  }
  // 2순위: 숫자 + ohms
  const ohm = desc.match(/\b(\d+\.?\d*)\s*ohms?\b/i);
  if (ohm) return parseFloat(ohm[1]);
  // 3순위: 숫자 + K/M/R 단독
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

// ── 후보 필터링 ──────────────────────────────────────────

export function filterCandidates(
  parts: MouserPart[],
  params: MouserSearchParams,
): MouserPart[] {
  return parts.filter(p => {
    // 저항값 필터 (필수, ±5% 허용)
    if (p.resistance_ohm !== null) {
      const ratio = Math.abs(p.resistance_ohm - params.resistance_ohm) / params.resistance_ohm;
      if (ratio > 0.05) return false;
    }

    // 패키지 필터 (있을 때만)
    if (params.package_inch && p.package) {
      const pkg = p.package.toUpperCase();
      if (!pkg.includes(params.package_inch.toUpperCase()) &&
          (params.package_metric && !pkg.includes(params.package_metric.toUpperCase()))) {
        return false;
      }
    }

    // 오차 필터 (있을 때만, ±0.5% 허용)
    if (params.tolerance_percent !== undefined && p.tolerance_percent !== null) {
      if (Math.abs(p.tolerance_percent - params.tolerance_percent) > 0.5) return false;
    }

    return true;
  });
}

// ── 후보 정렬 ────────────────────────────────────────────

export function rankCandidates(parts: MouserPart[]): MouserPart[] {
  return [...parts].sort((a, b) => {
    // 1순위: Active lifecycle 우선
    const aActive = a.lifecycle.toLowerCase() === 'active' ? 1 : 0;
    const bActive = b.lifecycle.toLowerCase() === 'active' ? 1 : 0;
    if (bActive !== aActive) return bActive - aActive;

    // 2순위: 재고 수량 내림차순
    return b.availability - a.availability;
  });
}
