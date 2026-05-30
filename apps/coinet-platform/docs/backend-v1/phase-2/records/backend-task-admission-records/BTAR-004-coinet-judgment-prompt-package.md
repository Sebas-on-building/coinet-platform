# BTAR-004 — CoinetJudgmentPromptPackage

Type: BTAR (Backend Task Admission Record)
Status: COMPLETED — TYPED_JUDGMENT_PROMPT_PACKAGE_ACTIVE
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Created: 2026-05-25
Last Updated: 2026-05-25
Owner: Backend program owner
Mission Trace: Plan 2.1 §1.2 (clauses: "structured judgment availability explicit", "user-facing response behavior … explicit", "impossible to silently fake")
Required Companion Record: **FRP-001** — `formatJudgmentForAI to CoinetJudgmentPromptPackage`

Depends On / Inherits From:
- Plans 1.1–1.10 ACTIVE
- Plan 1.11 COMPLETED (P1RR-001)
- Plan 1.12 COMPLETED (P1TG-002 P2-READY)
- Plan 2.0 long-form ACTIVE; Plan 2.0 roadmap ACTIVE
- Plan 2.1 / 2.2 / 2.3 ACTIVE
- **BTAR-003 COMPLETED** (`JudgmentAvailabilityState` active in production)

Inheritance audit: Plans 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.0, 2.1, 2.2, 2.3 — all ACTIVE/COMPLETED at admission; no inheritance bypass.

---

## 1. One-Sentence Mission

> **BTAR-004 replaces the fragile judgment-to-AI bridge with a typed `CoinetJudgmentPromptPackage` so the AI receives structured judgment availability, thesis, contradiction, confidence, scenario, degradation, and expression rules through a deterministic package-derived context instead of raw ad-hoc prompt stuffing.**

### 1.1 Honesty Pin (Per Spec §0)

The LLM still ultimately receives text, because LLM prompts are text. The replacement is from **ad-hoc judgment text formatting** to a **typed package + deterministic renderer**. The LLM does not receive a TypeScript object; it receives deterministic text rendered from the typed package. FRP-001 carries the same pin.

---

## 2. Problem Statement

### 2.1 Current Bridge (Post-BTAR-003)

`apps/coinet-platform/src/api/chat/service.ts:1142-1180` (AVAILABLE branch):

```ts
} else {
  judgmentAvailability = createAvailableJudgmentState();
  const judgmentContext = formatJudgmentForAI(judgment);
  contextParts.push(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║  STRUCTURED MARKET JUDGMENT — ${resolvedSymbol}...
╚═══════════════════════════════════════════════════════════════════════════════╝

STRUCTURED COINET JUDGMENT: AVAILABLE

${judgmentContext}

═══════════════════════════════════════════════════════════════════════════════
IMPORTANT: ...
═══════════════════════════════════════════════════════════════════════════════
`);
  ...
}
```

The AVAILABLE branch hands the AI a decorative ASCII block as the authoritative bridge. The UNAVAILABLE branches (BTAR-003) use a structured helper but inconsistent formatting. There is no enforced contract on what fields the AI sees, what disclosures are required, or what the AI is forbidden from claiming.

### 2.2 What BTAR-004 Adds

A typed `CoinetJudgmentPromptPackage` containing:

- `package_id`
- `policy_version` = `'coinet-judgment-prompt-package.v1'`
- `judgment_status` = AVAILABLE | DEGRADED | UNAVAILABLE
- `scope` = MARKET | ASSET | UNKNOWN
- optional `judgment` fields (state / cause / thesis / contradiction summary / timing phase / scenario summary / confidence band)
- `degradation` (reasons, failed components, degraded components, disclosure_required)
- `expression_rules` (allowed_claims, forbidden_claims, required_disclosures)
- `source_refs`

Plus a deterministic renderer that emits the structured AI context block.

---

## 3. Plan 2.1 Mission Trace

| Field | Value |
| --- | --- |
| Mission clause(s) advanced | "structured judgment availability explicit"; "user-facing response behavior … explicit"; "impossible to silently fake" (Plan 2.1 §1.2) |
| First principle obligation strengthened | "AI answers that fabricate evidence or numbers not present in the prompt package" (§2.4 bullet 4); "AI answers presenting a confident thesis while produceJudgment() actually threw" (bullet 1); recommendation-creep protection groundwork |
| Truth class boundary strengthened | §3.1 / §3.2 / §3.3 — package status encodes the truth class explicitly |
| Trust failure(s) targeted | TF-002 (hidden degradation), TF-003 (confidence inflation), TF-006 (recommendation creep — prepared via forbidden_claims), TF-008 partial via consistent contract |
| Availability law interaction | CONSUMES BTAR-003 `JudgmentAvailabilityResult`; enforces it through `expression_rules` |
| Non-replacement compliance | Confirmed: zero files under `src/l5..src/l14/` touched |

---

## 4. Plan 2.2 Surface Boundary Mapping

```text
## Surface Boundary Mapping
```

| Surface | Permission | Use in BTAR-004 |
| --- | --- | --- |
| `src/api/chat/service.ts` (P2-S01) | P2-TOUCH_WITH_BOUNDS | Replace prompt bridge call site with package-derived context (one block at lines 1142–1180); UNAVAILABLE branches also routed through package for consistency |
| `src/api/chat/judgment-prompt-package.types.ts` (P2-S09 new) | P2-OPEN | New typed package contract |
| `src/api/chat/judgment-prompt-package.ts` (P2-S09 new) | P2-OPEN | New package builder + renderer + invariant assertion |
| `src/api/chat/__tests__/judgment-prompt-package.test.ts` (P2-S08 new) | P2-OPEN | Unit tests |
| `src/api/chat/__tests__/chat-prompt-package-integration.test.ts` (P2-S08 new) | P2-OPEN | Chat bridge integration test |
| `src/api/chat/judgment-availability.types.ts` (P2-S10 existing, BTAR-003) | P2-OPEN | Import availability state |
| `src/api/chat/judgment-availability.ts` (P2-S10 existing, BTAR-003) | P2-OPEN | Reuse availability classifiers if needed |

**Touched surfaces declared.** Diff scope: one bridge region in `service.ts` + four new files in `src/api/chat/`.

**Forbidden surfaces confirmed absent.** P2-F01..F03 not touched. `src/l13/` and `src/l14/` not touched. `services/ai-service.ts` not touched (preferred boundary). `prisma/schema.prisma`, `apps/client-web/`, `.github/workflows/`, root `package.json`, `tsconfig.json` not touched.

**Required caution language** (Plan 2.2 §12.3 + spec §6):

```text
This is a bounded live-path trust modification, not a chat service rewrite.
This is a prompt bridge replacement, not a new judgment engine and not a new AI service.
```

These lines appear in the import-comment block above the new helpers and in the modified region of `service.ts`.

**Plan 2.3 OOS check (Q1..Q5):**

| Q | Answer |
| --- | --- |
| Q1. Does this BTAR touch any OOS item? | **No.** All surfaces are in-scope (P2-S01 / P2-S08 / P2-S09 / P2-S10). |
| Q2. If yes, which OOS-NNN? | n/a |
| Q3. Allowed / forbidden / exception-required? | ALLOWED (per Plan 2.2 §§6.1 / 7.2 / 7.1) |
| Q4. Required caution language? | **Yes** (§4 above) |
| Q5. Creates new architecture / service variant / provider dependency? | **No.** New files are bounded helpers under `src/api/chat/`. |

---

## 5. Plan 2.3 OOS Confirmation

| OOS | Crossed? |
| --- | --- |
| OOS-001..018 (all 18) | **No** (zero crossings) |

Full table check: no CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no deep real API integration, no calibration ecosystem, no advanced alert platform, no broad duplicate cleanup, no full chat-service rewrite, no `ai-service-v2.ts`, no `judgment-engine-final.ts`, no parallel chat runtime, no new L*.X sublayers, no real-provider tests, no frontend integration, no unrelated performance work.

---

## 6. FRP-001 Requirement

This BTAR replaces an existing production surface (`formatJudgmentForAI` as the authoritative chat bridge). It therefore requires a Formal Replacement Procedure under Plan 1.5 §8.

**FRP-001 path:**

```text
apps/coinet-platform/docs/backend-v1/phase-2/records/formal-replacements/FRP-001-formatJudgmentForAI-to-CoinetJudgmentPromptPackage.md
```

FRP-001 documents: old path, new path, replacement scope, what is NOT replaced, fallback behavior, success proof, rollback path. FRP-001 carries the same honesty pin (§1.1).

---

## 7. Files Plan

### 7.1 New Files

```text
apps/coinet-platform/src/api/chat/judgment-prompt-package.types.ts                    (~70 LOC)
apps/coinet-platform/src/api/chat/judgment-prompt-package.ts                          (~250 LOC)
apps/coinet-platform/src/api/chat/__tests__/judgment-prompt-package.test.ts            (~14–20 tests)
apps/coinet-platform/src/api/chat/__tests__/chat-prompt-package-integration.test.ts    (1 test)
```

### 7.2 Modified Files

```text
apps/coinet-platform/src/api/chat/service.ts
  Region: AVAILABLE branch (lines 1153–1170) and import block (lines 17–25)
  Change: replace ASCII decoration with package-builder + package-renderer call;
          extend the UNAVAILABLE branches to use the package renderer too so the
          AI context shape is consistent across AVAILABLE / DEGRADED / UNAVAILABLE.
```

### 7.3 NOT Touched

```text
apps/coinet-platform/src/services/ai-service.ts                — preferred boundary; not touched
apps/coinet-platform/src/services/judgment/debug-view.ts       — formatJudgmentForAI remains exported and callable but is no longer the authoritative bridge
apps/coinet-platform/src/api/chat/types.ts                     — only touched if optional response metadata becomes necessary (currently NOT necessary)
```

### 7.4 Forbidden

```text
apps/coinet-platform/src/l13/**
apps/coinet-platform/src/l14/**
chat-service-v2.ts / ai-service-v2.ts / judgment-engine-final.ts / *-rewritten.ts
apps/client-web/** / .github/workflows/** / root package.json / tsconfig.json
```

---

## 8. Type Contract (Authoritative)

`apps/coinet-platform/src/api/chat/judgment-prompt-package.types.ts`:

```ts
import type { JudgmentAvailabilityState } from './judgment-availability.types';

export type CoinetJudgmentPromptPackagePolicyVersion =
  'coinet-judgment-prompt-package.v1';

export type CoinetJudgmentScopeKind = 'MARKET' | 'ASSET' | 'UNKNOWN';

export interface CoinetJudgmentPromptPackageScope {
  kind: CoinetJudgmentScopeKind;
  asset_symbol?: string;
  asset_name?: string;
  market_context_ref?: string;
}

export interface CoinetJudgmentPromptPackageJudgment {
  state?: string;
  thesis?: string;
  cause?: string;
  contradiction_summary?: string;
  timing_phase?: string;
  scenario_summary?: string;
  confidence_band?: string;
}

export interface CoinetJudgmentPromptPackageDegradation {
  reasons: string[];
  failed_components: string[];
  degraded_components: string[];
  disclosure_required: boolean;
}

export interface CoinetJudgmentPromptPackageExpressionRules {
  allowed_claims: string[];
  forbidden_claims: string[];
  required_disclosures: string[];
}

export interface CoinetJudgmentPromptPackage {
  package_id: string;
  policy_version: CoinetJudgmentPromptPackagePolicyVersion;
  judgment_status: JudgmentAvailabilityState;
  scope: CoinetJudgmentPromptPackageScope;
  judgment?: CoinetJudgmentPromptPackageJudgment;
  degradation: CoinetJudgmentPromptPackageDegradation;
  expression_rules: CoinetJudgmentPromptPackageExpressionRules;
  source_refs: string[];
}
```

---

## 9. Helper Module (Authoritative)

`apps/coinet-platform/src/api/chat/judgment-prompt-package.ts` exports:

```ts
export function buildCoinetJudgmentPromptPackage(
  input: BuildCoinetJudgmentPromptPackageInput
): CoinetJudgmentPromptPackage;

export function renderCoinetJudgmentPromptPackageForAI(
  pkg: CoinetJudgmentPromptPackage
): string;

export function assertCoinetJudgmentPromptPackageInvariants(
  pkg: CoinetJudgmentPromptPackage
): void;

export function buildAvailableExpressionRules(): CoinetJudgmentPromptPackageExpressionRules;
export function buildDegradedExpressionRules(reasons: string[]): CoinetJudgmentPromptPackageExpressionRules;
export function buildUnavailableExpressionRules(): CoinetJudgmentPromptPackageExpressionRules;
```

All functions are pure / deterministic. No I/O, no time, no randomness. Deterministic `package_id` from stable scope + status (e.g., `pkg_chat_available_asset_btc_v1`).

---

## 10. Five Package Invariants

1. **Policy version always present** (`'coinet-judgment-prompt-package.v1'`).
2. **UNAVAILABLE cannot contain fake judgment** — `judgment` must be undefined or empty; `forbidden_claims` must restrict governed thesis/confidence/scenario; `required_disclosures` must include the unavailable disclosure.
3. **DEGRADED must disclose limitations** — `degradation.disclosure_required = true`; `required_disclosures` non-empty; `forbidden_claims` must include overconfidence restrictions.
4. **AVAILABLE may contain structured judgment** — `judgment` may include thesis/state/cause/contradiction/timing/scenario/confidence; `degradation.disclosure_required = false` unless availability disagrees.
5. **Deterministic output** — same input → semantically identical output.

`assertCoinetJudgmentPromptPackageInvariants(pkg)` enforces all five at runtime (test-checked).

---

## 11. Expression Rules (Per Status)

Full text per spec §13:

- **AVAILABLE** — allowed: explain judgment fields; forbidden: financial advice / guarantees / invented evidence / certainty beyond confidence band; disclosures: none by default.
- **DEGRADED** — allowed: explain available judgment cautiously, describe limitations; forbidden: present as complete, overstate confidence, hide degraded components, invent missing evidence; disclosures: degraded + reason.
- **UNAVAILABLE** — allowed: explain that governed judgment is unavailable, optionally provide general context if clearly separated; forbidden: claim governed thesis/confidence/contradiction/scenario; disclosures: structured Coinet judgment is unavailable.

---

## 12. Renderer Rules

`renderCoinetJudgmentPromptPackageForAI(pkg)` emits deterministic plain text with required sections:

```text
STRUCTURED COINET JUDGMENT PACKAGE
Policy Version: <policy_version>
Judgment Status: <AVAILABLE | DEGRADED | UNAVAILABLE>
Scope: <kind> / <symbol>
Judgment:
  <fields if available>
Degradation:
  <reasons + components if present>
Allowed Claims:
  <bullet list>
Forbidden Claims:
  <bullet list>
Required Disclosures:
  <bullet list>
Source References:
  <bullet list>
```

No decorative ASCII boxes. Plain section headings.

---

## 13. Service Integration Target (Per Spec §15)

Replace the AVAILABLE branch decoration with:

```ts
const pkg = buildCoinetJudgmentPromptPackage({
  availability: judgmentAvailability,
  judgment,
  scope: { kind: 'ASSET', asset_symbol: resolvedSymbol, asset_name: primaryCoin.symbol },
  source_refs: ['produceJudgment', 'buildSignalSnapshot'],
});
contextParts.push(renderCoinetJudgmentPromptPackageForAI(pkg));
```

UNAVAILABLE (falsy) branch:

```ts
const pkg = buildCoinetJudgmentPromptPackage({
  availability: judgmentAvailability,
  judgment: undefined,
  scope: { kind: 'ASSET', asset_symbol: resolvedSymbol, asset_name: primaryCoin.symbol },
  source_refs: [],
});
contextParts.push(renderCoinetJudgmentPromptPackageForAI(pkg));
```

UNAVAILABLE (throw) branch: same pattern with `judgment: undefined`.

`formatJudgmentForAI()` remains exported from `services/judgment/debug-view` but is no longer the authoritative chat bridge (FRP-001 documents this). It may continue to be used inside the package builder as an internal fallback if useful, but the package object is the authority.

---

## 14. Test Plan

### 14.1 Unit Tests (`judgment-prompt-package.test.ts`) — Target 14–20

1. AVAILABLE package has policy_version `'coinet-judgment-prompt-package.v1'`.
2. AVAILABLE package may contain judgment fields (when provided).
3. AVAILABLE package forbidden_claims includes financial-advice restriction.
4. AVAILABLE package forbidden_claims includes invented-evidence restriction.
5. DEGRADED package has `degradation.disclosure_required = true`.
6. DEGRADED package required_disclosures is non-empty.
7. DEGRADED package forbidden_claims includes overconfidence restriction.
8. UNAVAILABLE package has `judgment` undefined or empty.
9. UNAVAILABLE package forbidden_claims forbids governed thesis/confidence/contradiction/scenario.
10. UNAVAILABLE package required_disclosures includes the unavailable disclosure.
11. Renderer includes `STRUCTURED COINET JUDGMENT PACKAGE`.
12. Renderer includes `Policy Version: coinet-judgment-prompt-package.v1`.
13. Renderer includes `Judgment Status: <status>`.
14. Renderer includes `Forbidden Claims:` section.
15. Renderer UNAVAILABLE explicitly says structured judgment is unavailable.
16. `assertCoinetJudgmentPromptPackageInvariants` rejects UNAVAILABLE with fake judgment.
17. `assertCoinetJudgmentPromptPackageInvariants` rejects DEGRADED with disclosure_required=false.
18. Builder output is deterministic for stable input (package_id stable).
19. AVAILABLE → DEGRADED status transitions package shape correctly.
20. Builder reads JudgmentOutput safely (no throw on missing optional fields).

### 14.2 Integration Test (`chat-prompt-package-integration.test.ts`) — 1 Test

Required assertions:
- `produceJudgment` mocked to return usable judgment shape.
- `aiService.analyze` mocked.
- No real provider calls (structural via `vi.mock` layout).
- Captured AI input contains `STRUCTURED COINET JUDGMENT PACKAGE`.
- Captured AI input contains `Policy Version: coinet-judgment-prompt-package.v1`.
- Captured AI input contains `Judgment Status:` line.
- Captured AI input contains `Forbidden Claims:` section.

If the F-5 mock cascade blocks reaching produceJudgment, the test honestly conditional-skips the AI-input assertions and records the gap (per F-5 discipline).

### 14.3 Regression Tests Must Still Pass

```text
src/api/chat/__tests__/judgment-availability.test.ts       (25/25 — BTAR-003)
src/api/chat/__tests__/chat-judgment-failure-path.test.ts  (1/1 — BTAR-003)
src/api/chat/__tests__/chat-path.smoke.test.ts             (2/2 — BTAR-002)
```

---

## 15. Validation Commands

```bash
pnpm check:backend
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/judgment-prompt-package.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/chat-prompt-package-integration.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/judgment-availability.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/chat-judgment-failure-path.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/chat-path.smoke.test.ts
```

Expected: all exit 0.

---

## 16. Rollback Path

Single PR revert. The previous BTAR-003 service.ts shape is restored. The four new files under `src/api/chat/` are removed. `formatJudgmentForAI()` remains untouched as the (now once again authoritative) chat bridge.

---

## 17. Done Definition

```text
CoinetJudgmentPromptPackage type contract exists.
Package builder + renderer + invariant assertion exist.
AVAILABLE / DEGRADED / UNAVAILABLE behavior represented.
UNAVAILABLE package cannot carry fake governed thesis/confidence/scenario.
Chat service uses package-derived AI context (all three branches).
formatJudgmentForAI() is no longer the authoritative bridge (FRP-001 records this).
FRP-001 exists and is ACCEPTED.
Unit tests pass (≥14).
Integration test passes (or records F-5-continuation honestly).
BTAR-003 regression tests pass.
chat-path.smoke.test pass.
pnpm check:backend exits 0.
No response shape break.
No new service or runtime variant.
No L*.X diff.
No real-provider test dependency.
```

---

## 18. Completion Section

### 18.1 Completion Claim

```text
BTAR-004 COMPLETED — TYPED_JUDGMENT_PROMPT_PACKAGE_ACTIVE
FRP-001 COMPLETED — formatJudgmentForAI retired from authoritative chat-bridge role
```

### 18.2 Files Changed

**New (4 files):**

```text
apps/coinet-platform/src/api/chat/judgment-prompt-package.types.ts                    ~95 LOC
apps/coinet-platform/src/api/chat/judgment-prompt-package.ts                          ~340 LOC
apps/coinet-platform/src/api/chat/__tests__/judgment-prompt-package.test.ts            23 tests
apps/coinet-platform/src/api/chat/__tests__/chat-prompt-package-integration.test.ts    1 test
```

**Modified (2 files):**

```text
apps/coinet-platform/src/api/chat/service.ts
  - Added 10-line import block for buildCoinetJudgmentPromptPackage / renderCoinetJudgmentPromptPackageForAI
  - Replaced the AVAILABLE branch decoration (was lines 1153–1170) with package builder + renderer call
  - Extended UNAVAILABLE (falsy) and UNAVAILABLE (throw) branches to also emit package-derived context;
    BTAR-003 marker block retained alongside as a compatibility signal
  - Total service.ts diff: ~70 lines net, bounded entirely to the one judgment try/catch region

apps/coinet-platform/src/api/chat/__tests__/chat-judgment-failure-path.test.ts
  - Added `project-investigation-service` mock to plug a previously-undetected real-CoinGecko
    call path (Plan 2.2 §14.3 hardening discovered during BTAR-004 validation)
```

**Conditionally modified (NOT touched):**

```text
apps/coinet-platform/src/api/chat/types.ts             — not touched
apps/coinet-platform/src/services/ai-service.ts        — not touched (preferred boundary)
apps/coinet-platform/src/services/judgment/debug-view.ts — not touched (formatJudgmentForAI remains exported per FRP-001 §5)
```

### 18.3 FRP-001 Status

```text
FRP-001 — APPROVED → COMPLETED (this BTAR satisfies §6 success proof)
```

Old path (`formatJudgmentForAI` as the authoritative chat bridge) → New path (`CoinetJudgmentPromptPackage` + `renderCoinetJudgmentPromptPackageForAI`). The old `formatJudgmentForAI()` export remains callable in the codebase but is no longer invoked by the chat service for AI context construction. Rollback path: revert the service.ts import + bridge region.

### 18.4 Test Results

```text
pnpm check:backend                                                          → exits 0 (typecheck clean)
src/api/chat/__tests__/judgment-prompt-package.test.ts                      → 23/23 pass (186ms)
src/api/chat/__tests__/chat-prompt-package-integration.test.ts              →  1/1 pass (940ms; conditional-skip oracle under F-5)
src/api/chat/__tests__/judgment-availability.test.ts (BTAR-003 regression)  → 25/25 pass
src/api/chat/__tests__/chat-judgment-failure-path.test.ts (BTAR-003 regr.)  →  1/1 pass
src/api/chat/__tests__/chat-path.smoke.test.ts (BTAR-002 regression)        →  2/2 pass
Combined: 52/52 tests pass across 5 files (607ms after investigation-service mock)
```

### 18.5 Provider-Call Note

```text
No real provider calls occurred.
```

A previously-undetected live-CoinGecko call path through `services/project-investigation-service` was discovered during BTAR-004 validation when the integration test took the OmniScore catastrophic-error fallback branch. **Resolved within BTAR-004**: added `project-investigation-service` mock to both the BTAR-004 integration test and the BTAR-003 failure-path test (defensive harden). After fix, re-validation confirmed no real CoinGecko/OpenAI/Grok/etc. calls in any of the 5 chat test files.

This counts as a tightening of Plan 2.2 §14.3 enforcement; recorded as **F-6** (new finding) in §18.10.

### 18.6 Response-Shape Note

`ChatMessageResponse` shape unchanged. No fields added / removed / renamed. The chat service emits the package-derived text into `contextParts[]` which is server-side prompt-assembly state, not response state. Plan 2.2 §16 preferred rule satisfied; §16.4 four-item satisfaction not required.

### 18.7 Plan 2.1 First-Principle Proof

> "The user-facing AI response must never pretend structured judgment exists when the structured judgment path failed, degraded, timed out, or became unavailable."

Evidence:

- The 23 deterministic unit tests prove the package contract enforces the three truth classes: AVAILABLE may carry structured judgment; DEGRADED requires disclosure + forbids overconfidence; UNAVAILABLE forbids governed thesis/confidence/contradiction/scenario claims and requires the unavailable disclosure.
- The runtime invariant assertion `assertCoinetJudgmentPromptPackageInvariants` blocks any UNAVAILABLE package with fake judgment fields, any DEGRADED package with `disclosure_required=false`, and any package with wrong policy_version — all unit-test-proven.
- Chat service now builds + renders a typed package on all three branches (AVAILABLE / UNAVAILABLE-falsy / UNAVAILABLE-throw). The AI prompt for structured judgment is package-derived, not ASCII-stuffing-derived.

### 18.8 Plan 2.2 Surface Mapping Proof

Touched only: P2-S01 (`service.ts` bridge region) + P2-S09 (new package files) + P2-S08 (new tests + investigation-mock harden of existing test). P2-S04 (`ai-service.ts`) NOT touched. P2-R01/P2-R02 (L13/L14) NOT touched. P2-F01..F03 NOT touched. Required Plan 2.2 §12.3 caution language present in service.ts import block (lines 26–32 region: "bounded live-path trust modification, not a chat service rewrite"; "prompt bridge replacement, not a new judgment engine and not a new AI service"). Plan-2.2-INV-01 satisfied: every touched file is mapped + passes ≥1 of T1..T5.

### 18.9 Plan 2.3 OOS Proof

Zero OOS-001..018 crossings. No CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration, no calibration ecosystem, no alert platform, no broad cleanup, no full chat-service rewrite, no `*-v2.ts`, no `*-final.ts`, no parallel chat runtime, no new L*.X, no real-provider tests, no frontend integration, no unrelated performance work. Plan-2.1-INV-02 satisfied (zero `src/l*/` diff). Plan-2.3-INV-01 satisfied (mission trace + T1..T5 + Q1..Q5 all answer-positive in BTAR-004 §§3–5).

### 18.10 Residual Findings

| Finding | Status After BTAR-004 | Notes |
| --- | --- | --- |
| F-1 (`intentClassification.processingTimeMs` type mismatch) | **STILL_OPEN** | Production code unchanged. Both BTAR-003 and BTAR-004 work around via test-mock. Future intent-classifier touch or BTAR-006 should fix. |
| F-2 (27-mock chat-service coupling) | **STILL_OPEN** | BTAR-006 target. Cascade observed again in BTAR-004 integration test (chat path took OmniScore catastrophic-fallback branch instead of judgment branch under mocks). |
| F-3 (silent-continue / fallback pattern) | **RESOLVED** at the judgment site (BTAR-003); the BTAR-003 closure unchanged by BTAR-004 |
| F-4 (per-message external fan-out) | **STILL_OPEN** | BTAR-008 target. |
| F-5 (integration-level failure-path oracle limited by F-2 cascade) | **STILL_OPEN** | Same condition observed in BTAR-004 integration test; the 23 deterministic unit tests remain the definitive contract proof. |
| **F-6 (NEW)** — Undetected live-CoinGecko path through `services/project-investigation-service` | **RESOLVED in BTAR-004** | Mock added to BTAR-004 integration test + defensive harden of BTAR-003 failure-path test. Tightens Plan 2.2 §14.3 enforcement. Production code unchanged; only test mocks. |

### 18.11 Done Definition Check (per §17)

| Criterion | Status |
| --- | --- |
| CoinetJudgmentPromptPackage type contract exists | ✅ (`judgment-prompt-package.types.ts`) |
| Package builder + renderer + invariant assertion exist | ✅ (`judgment-prompt-package.ts`) |
| AVAILABLE / DEGRADED / UNAVAILABLE behavior represented | ✅ (23/23 unit tests cover all three) |
| UNAVAILABLE package cannot carry fake governed thesis/confidence/scenario | ✅ (invariant 2 enforced at build time + tested) |
| Chat service uses package-derived AI context (all three branches) | ✅ (service.ts AVAILABLE, falsy, throw branches all emit package) |
| `formatJudgmentForAI()` no longer authoritative bridge | ✅ (export retained per FRP-001 §5; chat service no longer calls it) |
| FRP-001 exists and is ACCEPTED | ✅ (created 2026-05-25; moves to COMPLETED with this BTAR) |
| Unit tests pass (≥14) | ✅ (23/23) |
| Integration test passes (or records F-5-continuation honestly) | ✅ (1/1; F-5 conditional-skip honestly documented in test header) |
| BTAR-003 regression tests pass | ✅ (25/25 + 1/1) |
| chat-path.smoke.test pass | ✅ (2/2) |
| pnpm check:backend exits 0 | ✅ |
| No response shape break | ✅ |
| No new service or runtime variant | ✅ |
| No L*.X diff | ✅ |
| No real-provider test dependency | ✅ (F-6 closed via investigation-service mock) |

**All criteria satisfied.**

### 18.12 Next Phase 2 BTAR

Per Plan 2.0 roadmap §7 / §9, the next admissible Phase 2 task is:

```text
BTAR-005 — AI Output Safety / Expression Gate
```

BTAR-005 enforces the `expression_rules` defined by the package at AI output time (ALLOW / ALLOW_WITH_WARNINGS / REWRITE_REQUIRED / BLOCK_OR_CLARIFY). BTAR-005 is **not** admitted by BTAR-004's completion; it requires its own admission record + Plan 1.6 eight-question gate.

---

## 19. Acceptance Block (Admission)

```text
BTAR: 004 — CoinetJudgmentPromptPackage
Status: APPROVED — NOT_STARTED
Created: 2026-05-25
Authority: Plan 2.0 §11.2 / Plan 2.0 roadmap §8; Plan 2.1 / 2.2 / 2.3
Eight-question gate: TAD-A (ADMIT)
Companion FRP: FRP-001 (required; created in same session)
Plan 2.2 §11 Surface Boundary Mapping: COMPLETE (§4)
Plan 2.3 §25 Q1..Q5 OOS check: PASS (§4)
Plan 2.1 §6.2 mission trace: COMPLETE (§3)
Required caution language: PRESENT (§4)
Forbidden surfaces confirmed absent: P2-F01..F03 + src/l13/ + src/l14/ + prohibited names
Honesty pin: LLM still receives text; the text is package-derived (§1.1; FRP-001 echoes this)
Next operational step: Step 5 (create type contract)
```
