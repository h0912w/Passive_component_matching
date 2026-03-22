// ============================================================
// types.ts — 공통 타입 정의
// ============================================================

export interface Env {
  GLM_API_KEY: string;
  MOUSER_API_KEY: string;
  WORKER_ENV: string;
}

// ── 추출 결과 필드 ────────────────────────────────────────

export interface ResistanceField {
  value_ohm: number;
  text: string;
  confidence: number;
}

export interface PackageField {
  normalized: string;   // e.g. "1608M/0603I"
  metric: string;       // e.g. "1608M"
  inch: string;         // e.g. "0603I"
  text: string;         // 원본 입력 토큰
  confidence: number;
}

export interface ToleranceField {
  percent: number;
  text: string;
  confidence: number;
}

export interface PowerField {
  watt: number;
  text: string;
  confidence: number;
}

// ── 파서 결과 ────────────────────────────────────────────

export interface ParseResult {
  resistance: ResistanceField | null;
  package: PackageField | null;
  tolerance: ToleranceField | null;
  power: PowerField | null;
  unmatched_tokens: string[];
}

export interface ConfidenceResult {
  total: number;           // 0.0 ~ 1.0
  field_completeness: number;
  token_match_rate: number;
  db_bonus: number;
  glm_required: boolean;
  glm_double_check: boolean;
}

// ── GLM API ──────────────────────────────────────────────

export type GlmMode = 'augment' | 'double_check';

export interface GlmAugmentResult {
  used: boolean;
  mode: GlmMode;
  reason: string;
  resistance: ResistanceField | null;
  package: PackageField | null;
  tolerance: ToleranceField | null;
  power: PowerField | null;
  warnings: string[];
  retry_count: number;
  success: boolean;
}

export interface GlmDoubleCheckResult {
  used: boolean;
  mode: GlmMode;
  reason: string;
  verified: boolean;
  issues: Array<{ field: string; problem: string; suggested: unknown }>;
  warnings: string[];
  retry_count: number;
  success: boolean;
}

// ── Mouser API ───────────────────────────────────────────

export interface MouserSearchParams {
  resistance_ohm: number;
  package_metric?: string;
  package_inch?: string;
  tolerance_percent?: number;
  power_watt?: number;
}

export interface MouserPart {
  mouser_part_number: string;
  manufacturer: string;
  manufacturer_part_number: string;
  description: string;
  availability: number;
  lifecycle: string;
  resistance_ohm: number | null;
  package: string | null;
  tolerance_percent: number | null;
  power_watt: number | null;
  datasheet_url: string;
  mouser_url: string;
}

// ── 검증 결과 ────────────────────────────────────────────

export type ValidationStatus = 'PASS' | 'PASS_UNVERIFIED' | 'RESISTANCE_NOT_FOUND' | 'EXTRACTION_INVALID' | 'AMBIGUOUS_INPUT' | 'NO_CANDIDATES' | 'VERIFICATION_FAILED';

export interface VerificationResult {
  status: ValidationStatus;
  part: MouserPart | null;
  resistance_match: boolean;
  package_match: boolean | null;
  tolerance_match: boolean | null;
  power_match: boolean | null;
  mismatch_details: string[];
}

// ── 결과 테이블 행 (11열) ─────────────────────────────────

export interface ResultRow {
  input: string;
  mouser_pn: string | null;
  input_resistance: string | null;
  pn_resistance: string | null;
  input_package: string | null;
  pn_package: string | null;
  input_tolerance: string | null;
  pn_tolerance: string | null;
  input_power: string | null;
  pn_power: string | null;
  validation: ValidationStatus;
  mouser_url: string | null;
}

// ── Step 결과물 (디버그) ─────────────────────────────────

export interface StepOutput<T> {
  step: number;
  step_name: string;
  timestamp: string;
  input_from_prev_step: unknown;
  data: T;
  error?: boolean;
  error_code?: string;
  error_message?: string;
}

// ── API 요청/응답 ────────────────────────────────────────

export interface ParseRequest {
  input: string;
  debug?: boolean;
}

export interface ParseResponse {
  success: boolean;
  result?: ResultRow;
  steps?: Record<string, unknown>;
  error?: string;
  error_code?: ValidationStatus;
}
