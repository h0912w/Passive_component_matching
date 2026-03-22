# QA Report — Final (Post-Fix Verification)
**Date**: 2026-03-22
**QA Scope**: Re-QA after M-1, M-2, M-3 bug fixes
**Worker URL**: https://resistor-part-finder.h0912w.workers.dev
**Tester**: qa-fullstack-guardian

---

## 1. Review Scope

### What was tested
- Full end-to-end API: `/health`, `/parse` (POST), CORS preflight (OPTIONS)
- M-1 fix: Fraction preservation in slash-delimited input (e.g., `2K2/1%/1/8W`)
- M-3 fix: Sub-kΩ search keyword uses `X ohm` format (not bare `X`)
- Kohms format fix: `parseResistanceFromDesc` handles `4.7Kohms`-style Mouser descriptions
- Blogger build (`output/build/index.html`) structural integrity
- Full fixed test suite: normal, partial, failure, slash delimiter, other delimiter, edge cases
- 10 randomly-generated test cases

### What was NOT tested
- Browser UI (no browser automation available in this environment)
- Copy functions (TSV copy, PN column copy, single PN copy)
- Batch input mode
- Loading spinner behavior
- Mobile responsiveness at 560px breakpoint
- Actual Blogger post insertion and rendering
- Duplicate-click / race condition behavior
- Back/forward navigation state
- GLM API fallback path (all test cases resolved at parser level)

---

## 2. Code Review Summary

### parser.ts
- Preprocessing correctly protects fraction power tokens (`1/8W`, `1/4W`) by requiring explicit W/mW suffix before substituting slashes — M-1 fix confirmed in code and runtime.
- IEC RKM, decimal+unit, and special patterns all correctly implemented.
- `splitConcatenated` handles no-separator input (`1k0603` → `1k 0603`).
- IEC tolerance code `K` (±10%) has confidence 0.70 (lower than F/J at 0.90) — minor confidence asymmetry but acceptable.
- `parsePower` accepts `1/8W` without requiring the W/mW suffix — this appears intentional for standalone power tokens but does NOT conflict with the preprocessor's fraction preservation rule because the preprocessor runs first.

### mouser.ts / validator.ts
- `formatResistanceForSearch`: Sub-kΩ values use `X ohm` format (M-3 fix confirmed). Zero uses `0 ohm`. kΩ and MΩ use bare `Xk`/`XM`.
- `filterCandidates`: Resistance filter uses ±5% window regardless of user's requested tolerance. This means a 10.2kΩ part can be selected for a 10kΩ ±1% spec. Design decision, documented as Minor issue below.
- `verifyPart`: Resistance verification also uses ±5% matching window. Parts where `resistance_ohm === null` (description unparseable) receive provisional PASS — documented behavior.
- `parseResistanceFromDesc` in both mouser.ts and validator.ts: Handles `4.7Kohms` format (kohms fix confirmed). IEC3 pattern runs first, then Kohms, then raw ohms, then bare K/M/R.

### index.ts
- Pipeline follows specified CLAUDE.md §8 workflow.
- GLM augment path is invoked when `confidence.total < 0.70`.
- All failure codes (`RESISTANCE_NOT_FOUND`, `EXTRACTION_INVALID`, `NO_CANDIDATES`, `VERIFICATION_FAILED`) are correctly mapped and returned.
- `jsonResponse` adds CORS headers to all responses including errors — confirmed.

### Blogger build (output/build/index.html)
- Line 1: `<div id="resistor-tool-root">` — PASS
- No `<html>` or `<body>` tags — PASS
- All CSS rules prefixed with `#resistor-tool-root` — PASS (54 occurrences)
- `@keyframes rtspin` is NOT scoped inside `#resistor-tool-root` — this is a global animation name that could collide with other `rtspin` animations on the Blogger page, but is low-risk due to unique name.
- `@media(max-width:560px)` contains scoped selectors inside — PASS
- WORKER_URL set to `https://resistor-part-finder.h0912w.workers.dev` — PASS
- JS wrapped in IIFE `(function(){ ... })();` — PASS
- No API keys in frontend — PASS
- Closes correctly: `})(); </script> </div>` — PASS

---

## 3. Test Review Summary

### Coverage Assessment
- Fixed test cases: All categories covered (normal, partial, failure, delimiter variants, edge)
- Random cases: 10 generated per `random_generation_rules`
- Fix-specific regression tests: Ran all 3 fix scenarios with field-level assertions
- Total test cases executed: 45 (25 main + 10 random + 10 extras)

### Missing Test Coverage
- GLM augmentation path not triggered (all inputs parse successfully at rule level)
- `NO_CANDIDATES` path: Not tested (no deliberately obscure resistance value tested)
- `VERIFICATION_FAILED` path: Not tested (no scenario designed to fail all 3 candidates)
- Concurrent/parallel request behavior not tested
- Error 500 (upstream API failure) response format not tested

---

## 4. API / Runtime Verification

All tests executed via live HTTPS calls to the deployed Worker.

| Endpoint | Expected | Actual | Status |
|---|---|---|---|
| GET /health | 200 `{"status":"ok"}` | 200 `{"status":"ok"}` | PASS |
| OPTIONS /parse | 204 with CORS headers | 204 `Access-Control-Allow-Origin: *` | PASS |
| POST /parse (valid input) | 200 with CORS | 200 `Access-Control-Allow-Origin: *` | PASS |
| POST /parse `{}` empty body | 400 EXTRACTION_INVALID | 400 `{"error_code":"EXTRACTION_INVALID"}` | PASS |
| POST /parse no body | 400 | 400 `{"error_code":"EXTRACTION_INVALID"}` | PASS |

---

## 5. Test Results Summary

### 5.1 Main Fixed Test Suite (25 cases)

| # | Input | Category | Expected | Actual | PN | Status |
|---|---|---|---|---|---|---|
| 1 | `1k 1608 5% 0.25W` | normal | PASS | PASS | 652-CRT0603PW1001ELF | PASS |
| 2 | `10k 0603 1% 1/10W` | normal | PASS | PASS | 71-TNPW060310K2BEEA | PASS |
| 3 | `0R 2012` | normal | PASS | PASS | 603-RC0805JR-070RL | PASS |
| 4 | `4R7 1608 5%` | normal | PASS | PASS | 603-RC0603JR-134R7L | PASS |
| 5 | `100k 3216 1% 1/4W` | normal | PASS | PASS | 71-CRCW1206-100K-E3 | PASS |
| 6 | `10R 2012 5% 0.5W` | normal | PASS | PASS | 603-RC0805JR-1010RL | PASS |
| 7 | `1k` | partial | PASS | PASS | 594-MCA12060C1001FP5 | PASS |
| 8 | `1k 0603` | partial | PASS | PASS | 652-CRT0603PW1001ELF | PASS |
| 9 | `4R7 1608` | partial | PASS | PASS | 603-RC0603FR-074R7L | PASS |
| 10 | `abcdef` | failure | RESISTANCE_NOT_FOUND | RESISTANCE_NOT_FOUND | — | PASS |
| 11 | `0603 5%` | failure | RESISTANCE_NOT_FOUND | RESISTANCE_NOT_FOUND | — | PASS |
| 12 | `(empty)` | failure | HTTP_400 | HTTP_400 | — | PASS |
| 13 | `4.7k/0603/5%/0.25W` | slash | PASS | PASS | 71-CRCW0603J-4.7K-E3 | PASS |
| 14 | `2K2/1%/1/8W` | slash | PASS | PASS | 71-CRCW0603-2.2K-E3 | PASS |
| 15 | `1k/0603/5%/0.25W` | slash | PASS | PASS | 652-CRT0603PW1001ELF | PASS |
| 16 | `4k7_0603_J_125mW` | delim | PASS | PASS | 71-CRCW0603J-4.7K-E3 | PASS |
| 17 | `10k,0603,1%,0.1W` | delim | PASS | PASS | 71-TNPW060310K2BEEA | PASS |
| 18 | `1k;0603;5%;0.25W` | delim | PASS | PASS | 652-CRT0603PW1001ELF | PASS |
| 19 | `4.7kohm 0603 5% 1/4W` | delim | PASS | PASS | 71-CRCW0603J-4.7K-E3 | PASS |
| 20 | `0R` | edge | PASS | PASS | 603-RC0402JR-130RL | PASS |
| 21 | `0R0` | edge | PASS | PASS | 603-RC0402JR-130RL | PASS |
| 22 | `2M2 3216 J 1W` | edge | PASS | PASS | 71-CRCW1206J-2.2M-E3 | PASS |
| 23 | `1R0` | edge | PASS | PASS | 603-AC0805FR-071RL | PASS |
| 24 | `4.7ohm` | edge | PASS | PASS | 755-SFR01MZPJ4R7 | PASS |
| 25 | `4R7 1608 K` | edge | PASS | PASS | 603-RT0603BRE074R7L | PASS |

**Main suite result: 25/25 PASS**

### 5.2 Additional Variants (10 cases)

| # | Input | Expected | Actual | PN | Status |
|---|---|---|---|---|---|
| 26 | `4K7` | PASS | PASS | 71-CRCW0603-4.7K-E3 | PASS |
| 27 | `1K0` | PASS | PASS | 594-MCA12060C1001FP5 | PASS |
| 28 | `2M2` | PASS | PASS | 71-CRCW0603J-2.2M-E3 | PASS |
| 29 | `1/16W` | RESISTANCE_NOT_FOUND | RESISTANCE_NOT_FOUND | — | PASS |
| 30 | `±5%` | RESISTANCE_NOT_FOUND | RESISTANCE_NOT_FOUND | — | PASS |
| 31 | `4.7kohm 0603 ±5% 1/4W` | PASS | PASS | 71-CRCW0603J-4.7K-E3 | PASS |
| 32 | `1608 1k 5%` | PASS | PASS | 652-CRT0603PW1001ELF | PASS |
| 33 | `4R7 1608 B` | PASS | PASS | 603-RT0603BRE074R7L | PASS |
| 34 | `1k0603` | PASS | PASS | 652-CRT0603PW1001ELF | PASS |
| 35 | `xyz 0603` | RESISTANCE_NOT_FOUND | RESISTANCE_NOT_FOUND | — | PASS |

**Variant suite result: 10/10 PASS**

### 5.3 Random Cases (10 generated cases)

| # | Input | Actual | PN | Status |
|---|---|---|---|---|
| R1 | `220R/0603/0.25W` | PASS | 603-RC0603FR-07220RL | PASS |
| R2 | `470R 1608` | PASS | 603-RC0603FR-07470RL | PASS |
| R3 | `470R 5% 1/8W` | PASS | 603-RC0402JR-10470RL | PASS |
| R4 | `1K_3216_5%_0.1W` | PASS | 71-CRCW12061K00JNECH | PASS |
| R5 | `47R/2012/J/0.25W` | PASS | 603-RC0805JR-1347RL | PASS |
| R6 | `2K2,1206,125mW` | PASS | 603-RC1206JR-072K2L | PASS |
| R7 | `10R,0603,1%,1/8W` | PASS | 603-RC0603FR-0710RL | PASS |
| R8 | `1R,0.1%,1/10W` | PASS | 71-CRCW06031R00DKEAH | PASS |
| R9 | `47R,±1%,0.1W` | PASS | 594-MCT06030C4709FP5 | PASS |
| R10 | `2K2_0805_0.1%_1/10W` | PASS | 667-ERA-6AED222V | PASS |

**Random suite result: 10/10 PASS**

### 5.4 Fix Verification Cases (Field-level checks)

#### M-1 Fix: Fraction preservation in slash-delimited input

| Input | Check | Expected | Actual | Status |
|---|---|---|---|---|
| `4.7k/0603/5%/0.25W` | input_package | contains 1608 or 0603 | `1608M/0603` | PASS |
| `4.7k/0603/5%/0.25W` | input_tolerance | ±5% | `±5%` | PASS |
| `4.7k/0603/5%/0.25W` | input_power | 1/4W or 0.25W | `1/4W` | PASS |
| `4.7k/0603/5%/0.25W` | validation | PASS | PASS | PASS |
| `2K2/1%/1/8W` | input_resistance | 2.2kΩ | `2.2kΩ` | PASS |
| `2K2/1%/1/8W` | input_tolerance | ±1% | `±1%` | PASS |
| `2K2/1%/1/8W` | input_power | 1/8W | `1/8W` | PASS |
| `2K2/1%/1/8W` | validation | PASS | PASS | PASS |
| `1k 1608 5% 0.25W` | regression | still works | PASS | PASS |

#### M-3 Fix: Sub-kΩ search uses `X ohm` keyword

| Input | input_resistance | pn_resistance | PN in kΩ range? | Status |
|---|---|---|---|---|
| `4R7 1608 5%` | 4.7Ω | 4.7Ω | NO | PASS |
| `10R 2012` | 10Ω | 10Ω | NO | PASS |
| `1R0` | 1Ω | 1Ω | NO | PASS |

#### Kohms format fix: `parseResistanceFromDesc` handles `4.7Kohms`

| Input | input_resistance | validation | Status |
|---|---|---|---|
| `4.7k 0603 5% 0.25W` | 4.7kΩ | PASS | PASS |

**All 3 fixes verified: M-1 PASS, M-3 PASS, Kohms fix PASS**

---

## 6. Findings

### Critical
None.

### Major

**M-NEW-1: Resistance candidate selection ignores user's tolerance band**

- Severity: Major
- Description: When a user requests `10k 0603 1%`, the system correctly searches for 10kΩ parts. However, the `filterCandidates` function uses a ±5% resistance window, which allows a 10.2kΩ nominal part to be selected. A 10.2kΩ ±1% part has nominal value 2% away from the requested 10kΩ, which is outside the user's requested ±1% tolerance band. The selected part (71-TNPW060310K2BEEA) is physically a 10.2kΩ part, not 10kΩ.
- Repro steps:
  1. POST /parse with `{"input": "10k 0603 1% 1/10W"}`
  2. Observe `mouser_pn` = `71-TNPW060310K2BEEA` and `pn_resistance` = `10.2kΩ`
  3. Validation = PASS despite 10.2kΩ ≠ 10kΩ
- Expected: A 10kΩ (E96: 10.0kΩ) part should be selected. TNPW060310K2BEEA (10.2kΩ) should fail the filter because it is outside the user's ±1% tolerance range around 10kΩ.
- Actual: 10.2kΩ part is selected and validated as PASS.
- Root cause: `filterCandidates` uses hardcoded ±5% resistance match regardless of user-requested tolerance. `verifyPart` similarly uses ±5% for resistance comparison.
- Impact: For high-precision (1% or tighter) specifications, the system may select a part whose nominal value is outside the user's specified tolerance window. The user may purchase the wrong part.
- Confidence: High (confirmed via debug pipeline output showing 10.2kΩ as ranked #1 due to availability).
- Note: `71-CRCW060310K0FKEI` (exact 10kΩ, ±1%) was available as ranked #2. The system would have selected it had the filter used tolerance-aware matching.

### Minor

**Min-1: Several pn_ fields return null when Mouser description is generic**

- Severity: Minor
- Description: For some parts (e.g., CRT0603-PW-1001ELF with description "Thin Film Resistors - SMD CHIP RESISTOR Precision"), all PN-side fields (`pn_resistance`, `pn_package`, `pn_tolerance`, `pn_power`) are null. The validation passes provisionally. The 11-column result table shows blanks for all PN columns.
- Impact: Users see an incomplete result row with no PN-side specs to compare against.
- Affected cases: `1k 1608 5% 0.25W`, `2K2/1%/1/8W`, `1k/0603/5%/0.25W`, `1k;0603;5%;0.25W`
- Confidence: High (directly observed in API responses).
- Note: This is a known limitation of the description-parsing approach. The design documents acknowledge this (validator.ts line 102 comment). Not a regression.

**Min-2: `@keyframes rtspin` is declared globally in Blogger build**

- Severity: Minor
- Description: In `output/build/index.html`, the `@keyframes rtspin` animation is declared at the top level of the `<style>` block, not scoped inside `#resistor-tool-root`. On a Blogger page, if another widget or post also defines `@keyframes rtspin`, there could be a CSS animation name collision.
- Impact: Low — the name `rtspin` is unique enough. Blogger's own CSS is unlikely to use it. However, this is a deviation from full CSS scoping.
- Note: CSS scoping via `#resistor-tool-root` does not apply to `@keyframes` declarations in CSS.

**Min-3: `0603 5%` returns HTTP 200 (not 400)**

- Severity: Minor
- Description: The input `0603 5%` (package and tolerance but no resistance) returns HTTP 200 with `validation: "RESISTANCE_NOT_FOUND"` inside the result body, rather than HTTP 400. This is consistent behavior (the system processed the request but found no resistance), and the error code is correct. However, callers expecting HTTP 4xx for invalid specs would need to check the response body.
- Impact: None for the current frontend (it checks `validation` field). Potential confusion for API consumers.

### Suggestions

**S-1: Tighten resistance filter when user provides explicit tolerance**

When `params.tolerance_percent` is provided (e.g., ±1%), the resistance filter window should be narrowed to `params.tolerance_percent / 100` instead of hardcoded 5%. This would ensure `10k ±1%` only matches parts in the 9.9kΩ–10.1kΩ range.

**S-2: Add coverage for NO_CANDIDATES and VERIFICATION_FAILED paths**

The test suite does not cover the case where Mouser returns 0 results or all 3 candidates fail verification. These are code paths that exist and are important to validate.

**S-3: Scope `@keyframes rtspin` inside `#resistor-tool-root` wrapper**

Although `@keyframes` cannot be directly scoped with CSS selectors, the animation name `rtspin` could be prefixed further (e.g., `rt-spin-anim`) to reduce the collision risk.

---

## 7. Unverified / Partially Verified Items

| Item | Status | Reason |
|---|---|---|
| Browser UI — button clicks | NOT VERIFIED | No browser automation available |
| Browser UI — copy functions (3 types) | NOT VERIFIED | No browser automation available |
| Browser UI — batch input mode | NOT VERIFIED | No browser automation available |
| Browser UI — loading spinner | NOT VERIFIED | No browser automation available |
| Mobile responsiveness (560px) | NOT VERIFIED | No browser available |
| Actual Blogger insertion and rendering | NOT VERIFIED | No Blogger access |
| Blogger CSS collision with live page | NOT VERIFIED | No Blogger access |
| GLM augmentation path (confidence < 0.70) | NOT VERIFIED | No input triggered it in testing |
| NO_CANDIDATES code path | NOT VERIFIED | No test case designed for 0 results |
| VERIFICATION_FAILED path (all 3 fail) | NOT VERIFIED | No test case designed for this |
| Concurrent request handling | NOT VERIFIED | Single-request sequential testing only |
| Worker behavior under Mouser API 5xx | NOT VERIFIED | Not tested |

---

## 8. Additional Recommended Tests

1. **Tolerance-aware resistance filtering** — Verify that a deliberate 10kΩ ±0.1% input does NOT select a 10.2kΩ part (regression for M-NEW-1).
2. **GLM path trigger** — Send an ambiguous input like `J 0603` (no clear resistance) with `debug:true` to verify GLM augment is called and returns correctly.
3. **NO_CANDIDATES path** — Send an unlikely-to-exist combination like `123.456k 0603 0.001%` and verify the response is `NO_CANDIDATES`.
4. **Browser UI smoke test** — Open `src/frontend/index.html` directly in a browser and manually:
   - Click all 3 example chips
   - Run a search
   - Click PN link
   - Use TSV copy and PN copy buttons
   - Toggle batch input
5. **Blogger insertion test** — Paste `output/build/index.html` into Blogger HTML editor and verify rendering on the live page.

---

## 9. Deployment Recommendation

**Verdict: READY WITH CAUTION**

### Justification

**What passed:**
- All 45 test cases (25 main + 10 extra + 10 random) returned correct validation status and valid Mouser PNs.
- All 3 previously identified bugs (M-1, M-2, M-3) are confirmed fixed at the API level with field-level assertions.
- API contract: `/health` 200, OPTIONS preflight 204, CORS headers present on all responses, empty body correctly returns 400.
- Blogger build: structural requirements fully met (first-line root div, no html/body tags, all CSS scoped, IIFE, correct WORKER_URL, no API keys).

**What prevents READY_TO_SHIP:**
1. **M-NEW-1 (Major)**: For tight-tolerance specs (e.g., `10k 0603 1%`), the system may select a part whose nominal value (10.2kΩ) is outside the user's stated tolerance band (±1% of 10kΩ = 9.9kΩ–10.1kΩ). This is a functional correctness issue that affects precision resistor selection use cases. The correct 10kΩ part (CRCW060310K0FKEI) is available in the candidate pool but ranked lower due to availability.
2. **Browser and Blogger verification not performed**: The UI and copy functions have not been manually verified in a browser. Per QA rules, a "READY" verdict requires browser verification for web apps.

**Recommended action before final ship:**
1. Fix M-NEW-1: When `tolerance_percent` is specified, narrow the resistance filter window to `tolerance_percent / 100` (or at minimum use ±5% as current floor but prefer exact-nominal parts in ranking).
2. Perform a manual browser test of the frontend UI.
3. Perform a Blogger insertion test on the actual blog post.

---

*QA Report generated by qa-fullstack-guardian | 2026-03-22*
