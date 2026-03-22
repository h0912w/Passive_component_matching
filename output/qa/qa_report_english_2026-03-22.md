# QA Report: English Text Conversion + GLM Label Removal
**Date:** 2026-03-22
**Target Change:** (1) All user-facing text converted from Korean to English; (2) "GLM" replaced with "AI" in user-facing content
**Files Inspected:**
- `src/frontend/index.html`
- `src/worker/src/index.ts`
- `src/worker/src/glm.ts`
- `src/worker/src/validator.ts`
- `src/worker/src/types.ts`
- `docs/seo_content.md`
- `src/tests/test-cases.json`
**Live API Tested:** `https://resistor-part-finder.h0912w.workers.dev`

---

## 1. Review Scope

### Target Changes
- Change 1: All user-visible text in `index.html` converted from Korean to English.
- Change 2: The string "GLM" removed from any user-visible context and replaced with "AI".

### Key Risks
- Residual Korean text remains in any part of the HTML file (including CSS comments and JS comments).
- "GLM" still appears in strings that could be user-visible (API response fields, mismatch_details, SEO content).
- Functional regression in search, batch search, copy operations.
- The user-facing text conversion omits edge-case strings (tooltip, toast, badge).

---

## 2. Code Review Summary

### A. User-Facing Text (index.html)

All items on the change checklist were verified by direct file inspection:

| UI Element | Status |
|---|---|
| h1 title | "Resistor Spec to Mouser Part Number Finder" — English |
| subtitle | "Enter a resistor spec from your circuit diagram..." — English |
| Search button | "Search" — English |
| Clear button | "Clear" — English |
| placeholder | "e.g. 4R7 1608 5% 0.25W" — English |
| hint text | "Supported formats: IEC (4R7, 2K2)..." — English |
| Examples label | "Examples:" — English |
| Batch toggle button | "Batch Search" — English |
| Batch description | "Enter one spec per line." — English |
| Batch search button | "Search All" — English |
| Result section header | "Results" — English |
| Copy All button | "Copy All (TSV)" — English |
| Copy PN Column button | "Copy PN Column" — English |
| JS: empty input message | `'Please enter a resistor spec.'` — English |
| JS: loading message | `'Searching...'` — English |
| JS: success message | `'Search complete.'` — English |
| JS: error prefix | `'Error: '` — English |
| JS: batch progress | `'Processing X / Y...'` — English |
| JS: batch completion | `'N item(s) complete.'` — English |
| JS: result title | `'Results (N item(s))'` — English |
| Copy icon button | `title="Copy"` and label "Copy" — English |
| PASS* tooltip | "Verification not possible (Description parse failed)..." — English |
| Toast: single PN | `'Copied PN: ' + pn` — English |
| Toast: PN column | `'PN column copied (N item(s))'` — English |
| Toast: TSV | `'TSV copied (N row(s))'` — English |
| Table header columns | All 12 columns in English |
| JSON-LD structured data | Entirely in English |
| SEO content sections | Entirely in English |
| FAQ section | Entirely in English |

No Korean text was found in any user-visible element.

### B. GLM Label Removal (user-facing scope)

| Location | Finding |
|---|---|
| `index.html` body, CSS, JS, JSON-LD | No "GLM" string found — confirmed by grep |
| `src/worker/src/index.ts` line 157 `mismatch_details` | `'resistance field could not be extracted even with AI assistance'` — GLM replaced with "AI" |
| All other `mismatch_details` strings | No GLM mention |
| `docs/seo_content.md` line 49 | **"GLM AI natural language processing"** — GLM still present |
| `src/tests/test-cases.json` lines 96, 98 | "GLM" in internal developer comments only (not user-facing) |

The `mismatch_details` field inside the Worker response is part of `VerificationResult` (internal struct) and is NOT included in the `ResultRow` sent to the user via the API response. Confirmed by tracing the type chain:
`VerificationResult.mismatch_details` -> used only internally in `buildResultRow()` -> output is `ResultRow` which does not include `mismatch_details`. Therefore the worker-side "AI assistance" wording in `index.ts` line 157 is not user-facing, but the change is still correct.

### C. Remaining Korean in Comments (CSS + JS)

Korean characters were detected in **CSS section-divider comments** and **JS section-divider comments** throughout the file. These are code comments only — invisible to users in the rendered HTML. They do not affect function or user experience.

Full list of affected comment locations:
- CSS: `/* ── 입력 영역 ── */`, `/* ── 상태 메시지 ── */`, `/* ── 결과 테이블 ── */`, `/* ── 복사 토스트 ── */`, `/* ── 배치 입력 ── */`
- HTML comment: `<!-- ── SEO Content Sections (seo_content.md 기반) ── -->`
- JS comments: `// ── 설정 ──`, `// WORKER_URL: 배포 후 실제 Cloudflare Worker URL로 교체`, `// ── 예시 입력 ──`, `// ── 배치 토글 ──`, `// ── 단건 검색 ──`, `// ── 일괄 검색 ──`, `// ── Worker API 호출 ──`, `// ── 초기화 ──`, `// ── 테이블 렌더링 ──`, `// ── 복사 기능 ──`, `// ── UI 헬퍼 ──`, `// ── Enter 키 지원 ──`

These comments are entirely invisible to end users in a browser and pose no functional or user-experience issue.

---

## 3. Test Review Summary

Tests in `src/tests/test-cases.json` contain Korean text in developer-only comment fields (e.g., `"RESISTANCE_NOT_FOUND": "저항값 추출 완전 실패 시 — GLM 보조 후에도 resistance null"`). These are internal documentation strings, not user-visible. No test was added specifically to assert English-only output, which would strengthen regression protection for this change.

---

## 4. Browser / Runtime Verification

The local `index.html` was opened in the default browser via shell command. The file renders correctly in the browser. Given that all user-facing strings were verified through direct code inspection above, and confirmed to be English, the browser opening was used as a sanity check.

### API Tests (curl against deployed Worker)

Five test cases were executed against the live deployed Worker endpoint.

| Input | Expected | Actual Validation | Pass? |
|---|---|---|---|
| `1k 0603 5% 0.25W` | PASS or PASS_UNVERIFIED | `PASS_UNVERIFIED` | PASS |
| `10k 0603 1% 1/10W` | PASS | `PASS` | PASS |
| `4.7kohm 0603 +-5%` | PASS | `PASS` | PASS |
| `abcdef` | RESISTANCE_NOT_FOUND | `RESISTANCE_NOT_FOUND` | PASS |
| `4.7k/0603/5%/0.25W` | PASS | `PASS` | PASS |

All five functional regression tests passed. The Worker is responding correctly.

---

## 5. Findings

### Critical
None.

### Major
None.

### Minor

**M-1: "GLM" remains in `docs/seo_content.md` line 49**
- Location: `/docs/seo_content.md`, line 49
- Content: `**A:** Yes, GLM AI natural language processing is applied...`
- Reproduction: Open `docs/seo_content.md`, search for "GLM".
- Expected: "GLM" replaced with "AI" or removed.
- Actual: "GLM AI natural language processing" — the word "GLM" is present before "AI".
- Impact: This file is the source-of-truth for SEO FAQ content (referenced by `blogger-ui-packager`). The current `index.html` does NOT reflect this exact phrasing (the HTML already uses "AI natural language processing" without "GLM"), so users are NOT currently exposed to the word "GLM". However, the next time the HTML is regenerated from `seo_content.md` via `blogger-ui-packager`, "GLM" would reappear unless the source file is corrected.
- Confidence: Verified (grep confirmed).

### Suggestions

**S-1: Korean text in CSS/JS code comments**
- All Korean text found in the HTML file is confined to internal CSS section-divider comments (`/* ── 한국어 ── */`) and JS block comments (`// ── 한국어 ──`). These are not user-visible. If the project goal is to make the full file English for code maintainability reasons (e.g., international contributors), these comments should be translated. If the goal was only user-visible text, this is out of scope and acceptable.

**S-2: Add regression test asserting no Korean in user-visible output**
- No automated test exists to verify that API responses and rendered text are English-only. A test that inspects the rendered HTML or API response for Korean unicode would prevent future regressions.

**S-3: `test-cases.json` comment fields contain "GLM" and Korean text**
- Lines 96 and 98 of `src/tests/test-cases.json` contain Korean text and "GLM" in description comment fields. These are developer-only notes, but for consistency with the project's English-language goal, they could be updated.

---

## 6. Unverified or Partially Verified Items

| Item | Status | Reason |
|---|---|---|
| Copy All TSV button — actual clipboard content | Not verified | Browser opened but interactive clipboard testing not automated |
| Copy PN Column button — actual clipboard content | Not verified | Same as above |
| Single-row Copy button — actual clipboard content | Not verified | Same as above |
| Toast message display timing | Not verified | No automated browser interaction |
| Batch search with multi-line input | Not verified | Only single-search API calls were made via curl |
| Mobile responsive layout | Not verified | No mobile viewport testing available |
| Blogger-embedded version | Not verified | No Blogger deployment tested |

---

## 7. Additional Recommended Tests

1. Manual: Open `index.html` in browser, perform a single search, verify all status messages appear in English.
2. Manual: Perform batch search with 3 specs, verify "Processing X / Y..." and "N items complete." appear in English.
3. Manual: Click "Copy All (TSV)", paste into a text editor, verify headers are in English.
4. Manual: Click "Copy PN Column", verify toast says "PN column copied (1 item)".
5. Manual: Submit empty input, verify "Please enter a resistor spec." appears in English.
6. Fix and re-verify: Update `docs/seo_content.md` line 49 to remove "GLM", then confirm `blogger-ui-packager` regenerates HTML without "GLM".

---

## 8. Deployment Recommendation

**Ready with caution**

### Rationale
All user-facing text in `index.html` has been confirmed to be in English. No "GLM" string appears anywhere in the user-visible layer (HTML render, API response to frontend). The five core functional test cases all pass against the deployed Worker. No Critical or Major issues were found.

One Minor issue exists: `docs/seo_content.md` line 49 still contains "GLM AI natural language processing". The current deployed `index.html` does not expose this to users because the HTML was manually updated correctly. However, the source document for future regeneration is inconsistent. This must be corrected before the next Blogger HTML regeneration cycle.

### Before next HTML regeneration via `blogger-ui-packager`
- Fix `docs/seo_content.md` line 49: remove "GLM" from "GLM AI natural language processing".

### Not blocking current deployment
- Korean text in CSS/JS code comments — not user-visible.
- Korean text in `test-cases.json` developer comment fields — not user-facing.
