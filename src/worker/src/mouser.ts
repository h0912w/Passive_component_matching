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

function normalizePart(raw: MouserApiPart): MouserPart | null {
  if (!raw.MouserPartNumber) return null;

  const attrs = raw.ProductAttributes ?? [];
  const getAttr = (name: string) =>
    attrs.find(a => a.AttributeName.toLowerCase().includes(name.toLowerCase()))?.AttributeValue;

  const resistanceText = getAttr('resistance') ?? getAttr('ohm');
  const packageText    = getAttr('package') ?? getAttr('case');
  const toleranceText  = getAttr('tolerance');
  const powerText      = getAttr('power');

  return {
    mouser_part_number: raw.MouserPartNumber,
    manufacturer: raw.Manufacturer ?? '',
    manufacturer_part_number: raw.ManufacturerPartNumber ?? '',
    description: raw.Description ?? '',
    availability: parseAvailability(raw.Availability),
    lifecycle: raw.LifecycleStatus ?? 'Active',
    resistance_ohm: parseResistanceAttr(resistanceText),
    package: packageText ?? null,
    tolerance_percent: parseToleranceAttr(toleranceText),
    power_watt: parsePowerAttr(powerText),
    datasheet_url: raw.DataSheetUrl ?? '',
    mouser_url: raw.ProductDetailUrl ?? '',
  };
}

function parseAvailability(s?: string): number {
  if (!s) return 0;
  const n = parseInt(s.replace(/[^0-9]/g, ''));
  return isNaN(n) ? 0 : n;
}

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
