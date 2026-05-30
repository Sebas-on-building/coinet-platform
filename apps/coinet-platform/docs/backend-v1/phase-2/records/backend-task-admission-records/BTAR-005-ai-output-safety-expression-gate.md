# BTAR-005 — AI Output Safety / Expression Gate

Type: BTAR (Backend Task Admission Record)
Status: COMPLETED — AI_OUTPUT_SAFETY_GATE_ACTIVE
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Created: 2026-05-25
Last Updated: 2026-05-25
Owner: Backend program owner
Mission Trace: Plan 2.1 §1.2 (clauses: "AI expression … explicit", "user-facing response behavior … explicit", "impossible to silently fake")

Depends On / Inherits From:
- Plans 1.1–1.10 ACTIVE
- Plan 1.11 COMPLETED (P1RR-001)
- Plan 1.12 COMPLETED (P1TG-002 P2-READY)
- Plan 2.0 long-form ACTIVE; Plan 2.0 roadmap ACTIVE
- Plan 2.1 / 2.2 / 2.3 ACTIVE
- **BTAR-003 COMPLETED** (JudgmentAvailabilityState active)
- **BTAR-004 COMPLETED + FRP-001 COMPLETED** (CoinetJudgmentPromptPackage is the authoritative chat bridge)

Inheritance audit: Plans 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.0 (both), 2.1, 2.2, 2.3 — all ACTIVE/COMPLETED at admission; no inheritance bypass.

---

## 1. One-Sentence Mission

> **BTAR-005 introduces a bounded AI output safety and expression gate that reviews the final LLM-generated answer before user delivery, preventing unsafe recommendation language, fake certainty, unsupported claims, missing degradation disclosure, and unavailable-judgment misrepresentation from passing silently.**

---

## 2. Problem Statement

Even after BTAR-004 hands the AI a typed `CoinetJudgmentPromptPackage` (with `forbidden_claims` + `required_disclosures`), the LLM can still drift in its output:

- `"You should buy SOL now."` — direct financial advice
- `"This will pump."` — guaranteed outcome
- `"Coinet's thesis is bullish"` — governed-judgment claim when `judgment_status = UNAVAILABLE`
- `"High confidence"` — confidence inflation under DEGRADED
- Missing degradation / unavailable disclosure
- Invented evidence ("on-chain data confirms ...") with no package source refs

Today, the chat service simply assembles `assistantContent` from `aiResponse.data.{thesis|summary|recommendation}` at `service.ts:1514` and writes it to the user. There is **no final-answer guardrail**.

BTAR-005 adds that guardrail.

---

## 3. Target Live Path After BTAR-005

```text
buildSignalSnapshot()
  → produceJudgment()
    → classify judgment availability             [BTAR-003]
      → build CoinetJudgmentPromptPackage         [BTAR-004]
        → aiService.analyze()
          → applyAIOutputSafetyGate(...)          [BTAR-005 — this BTAR]
            → final user-facing response
```

The gate **does not** replace `aiService.analyze()`. It does not create a new AI service. It is a deterministic post-LLM evaluator + safe-rewriter.

---

## 4. Plan 2.1 Mission Trace

| Field | Value |
| --- | --- |
| Mission clause(s) advanced | "AI expression … explicit"; "user-facing response behavior … explicit"; "impossible to silently fake" (Plan 2.1 §1.2) |
| First principle obligation strengthened | "AI answers presenting a confident thesis while produceJudgment() actually threw"; "AI answers that include recommendation-style language regardless of judgment state"; "AI answers that fabricate evidence or numbers not present in the prompt package" (Plan 2.1 §2.4 bullets 1, 3, 4) |
| Truth class boundary strengthened | §3 — gate enforces the truth class at the **output** layer (the package enforced it at the **input** layer in BTAR-004) |
| Trust failure(s) targeted | TF-003 (confidence inflation), TF-005 (fabricated evidence), TF-006 (recommendation creep — **primary closure**), TF-001 partial (any output that promotes truth-state silently) |
| Availability law interaction | CONSUMES BTAR-004 `CoinetJudgmentPromptPackage`; enforces `expression_rules` at AI output time |
| Non-replacement compliance | Confirmed: zero files under `src/l5..src/l14/` touched |

---

## 5. Plan 2.2 Surface Boundary Mapping

```text
## Surface Boundary Mapping
```

| Surface | Permission | Use in BTAR-005 |
| --- | --- | --- |
| `src/api/chat/service.ts` (P2-S01) | P2-TOUCH_WITH_BOUNDS | Insert `applyAIOutputSafetyGate(...)` call after `assistantContent` is resolved (region around line 1514); hoist `chatJudgmentPackage` from the judgment block to the outer scope so the gate has access |
| `src/api/chat/ai-output-safety-gate.types.ts` (P2-S11 new) | P2-OPEN | New gate type contract |
| `src/api/chat/ai-output-safety-gate.ts` (P2-S11 new) | P2-OPEN | Deterministic gate evaluator + safe-rewriter + detectors |
| `src/api/chat/__tests__/ai-output-safety-gate.test.ts` (P2-S08 new) | P2-OPEN | Unit tests |
| `src/api/chat/__tests__/chat-ai-output-safety.integration.test.ts` (P2-S08 new) | P2-OPEN | Integration test |
| `src/api/chat/judgment-prompt-package.types.ts` (P2-S09 existing, BTAR-004) | P2-OPEN | Import package shape + expression rules |
| `src/api/chat/judgment-availability.types.ts` (P2-S10 existing, BTAR-003) | P2-OPEN | Import availability state |

**Touched surfaces declared.** Diff scope: one final-output region in `service.ts` + the judgment-block local variable hoist for the package reference + four new files in `src/api/chat/`.

**Forbidden surfaces confirmed absent.** P2-F01..F03 not touched. `src/l13/` and `src/l14/` not touched. `services/ai-service.ts` not touched (preferred boundary). No frontend, no schema, no CI.

**Required caution language** (Plan 2.2 §12.3 + spec §6):

```text
This is a bounded live-path trust modification, not a chat service rewrite.
This is a final AI expression gate, not a new AI service, not a compliance platform, and not a replacement for the judgment engine.
```

**Plan 2.3 OOS check (Q1..Q5):**

| Q | Answer |
| --- | --- |
| Q1. Touches any OOS item? | **No.** All surfaces in-scope (P2-S01 / P2-S08 / P2-S11). |
| Q2. If yes, which OOS-NNN? | n/a |
| Q3. Allowed / forbidden / exception-required? | ALLOWED (Plan 2.2 §§6.1 / 7.4 / 7.1) |
| Q4. Required caution language? | **Yes** (§5 above) |
| Q5. Creates new architecture / service variant / provider dependency? | **No.** New helper files under `src/api/chat/`; no new service, no new provider call. |

---

## 6. Plan 2.3 OOS Confirmation

Zero OOS-001..018 crossings. No CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration, no calibration ecosystem, no alert platform, no broad cleanup, no full chat-service rewrite, no `*-v2.ts` / `*-final.ts`, no parallel chat runtime, no new L*.X, no real-provider tests, no frontend integration, no unrelated performance work. **No full compliance platform / no legal-policy engine / no trading-recommendation system** (per spec §7 additional disclaimers).

---

## 7. Files Plan

### 7.1 New Files

```text
apps/coinet-platform/src/api/chat/ai-output-safety-gate.types.ts                       ~70 LOC
apps/coinet-platform/src/api/chat/ai-output-safety-gate.ts                            ~350 LOC
apps/coinet-platform/src/api/chat/__tests__/ai-output-safety-gate.test.ts              16–25 tests
apps/coinet-platform/src/api/chat/__tests__/chat-ai-output-safety.integration.test.ts  1–2 tests
```

### 7.2 Modified Files

```text
apps/coinet-platform/src/api/chat/service.ts
  - Add import block for applyAIOutputSafetyGate (P2-S11)
  - Hoist `let chatJudgmentPackage: CoinetJudgmentPromptPackage | undefined = undefined;` to the
    outer scope of sendMessage (replaces the per-branch let in the judgment block)
  - Assign the package to chatJudgmentPackage on all three branches inside the judgment block
  - Insert gate call after `assistantContent` is resolved (region around line 1514):
      const gateResult = applyAIOutputSafetyGate({ output: assistantContent, judgmentPackage })
      if (gateResult.gate.safe_output) assistantContent = gateResult.output
  - Total service.ts diff target: ≤80 LOC net
```

### 7.3 NOT Touched

```text
apps/coinet-platform/src/services/ai-service.ts                — not touched (preferred boundary)
apps/coinet-platform/src/services/judgment/debug-view.ts       — not touched
apps/coinet-platform/src/api/chat/types.ts                     — only if optional internal metadata is added (preferred = not touched)
```

### 7.4 Forbidden

```text
src/l13/**, src/l14/**, src/index.ts, prisma/schema.prisma, apps/client-web/**, .github/workflows/**, root package.json, tsconfig.json
ai-service-v2.ts, chat-service-v2.ts, judgment-engine-final.ts, compliance-engine-final.ts, financial-advice-engine.ts, l13-safety-adapter.ts, l14-delivery-adapter.ts, cip1-safety-runtime.ts
```

---

## 8. Type Contract (Authoritative)

`apps/coinet-platform/src/api/chat/ai-output-safety-gate.types.ts`:

```ts
import type { CoinetJudgmentPromptPackage } from './judgment-prompt-package.types';

export type AIOutputGateDecision =
  | 'ALLOW'
  | 'ALLOW_WITH_WARNINGS'
  | 'REWRITE_REQUIRED'
  | 'BLOCK_OR_CLARIFY';

export type AIOutputSafetyViolation =
  | 'DIRECT_FINANCIAL_ADVICE'
  | 'GUARANTEED_OUTCOME_LANGUAGE'
  | 'UNSUPPORTED_CERTAINTY'
  | 'MISSING_DEGRADATION_DISCLOSURE'
  | 'MISSING_UNAVAILABLE_DISCLOSURE'
  | 'GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE'
  | 'CONFIDENCE_INFLATION'
  | 'INVENTED_EVIDENCE_LANGUAGE'
  | 'PACKAGE_CONTRADICTION'
  | 'UNKNOWN_SAFETY_RISK';

export type AIOutputSafetyGatePolicyVersion = 'ai-output-safety-gate.v1';

export interface AIOutputSafetyGateInput {
  output: string;
  judgmentPackage: CoinetJudgmentPromptPackage;
}

export interface AIOutputSafetyGateResult {
  decision: AIOutputGateDecision;
  reasons: string[];
  violations: AIOutputSafetyViolation[];
  required_edits: string[];
  safe_output?: string;
  policy_version: AIOutputSafetyGatePolicyVersion;
}
```

---

## 9. Helper Module Exports

`apps/coinet-platform/src/api/chat/ai-output-safety-gate.ts`:

```ts
export function evaluateAIOutputSafety(input: AIOutputSafetyGateInput): AIOutputSafetyGateResult;
export function applyAIOutputSafetyGate(input: AIOutputSafetyGateInput): {
  output: string;
  gate: AIOutputSafetyGateResult;
};
export function buildSafeOutputFromGateResult(
  input: AIOutputSafetyGateInput,
  gate: AIOutputSafetyGateResult,
): string | undefined;

// Detector helpers (testable in isolation)
export function detectDirectFinancialAdvice(output: string): boolean;
export function detectGuaranteedOutcomeLanguage(output: string): boolean;
export function detectUnsupportedCertainty(output: string): boolean;
export function detectMissingRequiredDisclosure(output: string, pkg: CoinetJudgmentPromptPackage): boolean;
export function detectUnavailableJudgmentMisrepresentation(output: string, pkg: CoinetJudgmentPromptPackage): boolean;
```

All functions are pure / deterministic. No I/O, no time, no randomness, no second LLM call.

---

## 10. Four Gate Decisions

```text
ALLOW                — safe output; pass through unchanged
ALLOW_WITH_WARNINGS  — mostly safe; minor softness recorded but pass through
REWRITE_REQUIRED     — unsafe but rewritable; gate emits safe_output and substitutes
BLOCK_OR_CLARIFY     — too unsafe to rewrite confidently; gate emits clarification text
```

For BTAR-005, `ALLOW_WITH_WARNINGS` operationally behaves like `ALLOW` but the warnings are recorded in `violations[]`.

---

## 11. Detection Rules (Spec §13.1–§13.9 condensed)

| Violation | Triggers | Example bad input |
| --- | --- | --- |
| `DIRECT_FINANCIAL_ADVICE` | "you should buy/sell", "buy/sell now", "go long/short", "ape in", etc. (excluding negation contexts like "this is not a recommendation to buy or sell") | "You should buy SOL now." |
| `GUARANTEED_OUTCOME_LANGUAGE` | "will pump", "guaranteed", "certainly", "definitely going to", "no doubt", "inevitable", "risk-free" | "SOL will definitely pump." |
| `UNSUPPORTED_CERTAINTY` | "Coinet is certain", "high conviction", "extremely confident", "this is confirmed" — when package confidence is missing/low/degraded/unavailable | DEGRADED package + "high conviction" |
| `MISSING_DEGRADATION_DISCLOSURE` | `judgment_status = DEGRADED` AND output lacks any of: degraded, partial, limited, confidence capped, not a complete read, some context is unavailable | DEGRADED package + plain optimistic answer |
| `MISSING_UNAVAILABLE_DISCLOSURE` | `judgment_status = UNAVAILABLE` AND output lacks any of: "structured Coinet judgment is unavailable", "governed judgment is unavailable", "I cannot produce a structured Coinet judgment", "not a governed Coinet read" | UNAVAILABLE package + any thesis |
| `GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE` | `judgment_status = UNAVAILABLE` AND output makes governed claims ("Coinet's current thesis is", "the structured judgment shows", etc.) | UNAVAILABLE package + "Coinet's thesis is bullish" |
| `CONFIDENCE_INFLATION` | DEGRADED/UNAVAILABLE/low/missing confidence AND output claims "high confidence", "strong conviction", "fully supported" | DEGRADED + "strong conviction" |
| `INVENTED_EVIDENCE_LANGUAGE` | "data shows", "on-chain confirms", "whales are accumulating", "funding confirms", "ETF flows confirm", etc. — when package judgment fields and source_refs lack support | AVAILABLE with no source_refs + "on-chain confirms" |
| `PACKAGE_CONTRADICTION` | Output violates a package `forbidden_claims` rule directly | UNAVAILABLE forbidden_claims violated |

False-positive prevention: detectors must respect negation context (e.g., "this is **not** a recommendation to buy or sell" must NOT trigger `DIRECT_FINANCIAL_ADVICE`).

---

## 12. Service Integration Target (Spec §15)

Insert at `service.ts:1514` region:

```ts
// existing:
const assistantContent = aiResponse.data.thesis ||
                         aiResponse.data.summary ||
                         (aiResponse.data as any).recommendation ||
                         'I apologize, but I couldn\'t generate a response.';

// BTAR-005 — final AI output safety gate
const gated = applyAIOutputSafetyGate({
  output: assistantContent,
  judgmentPackage: chatJudgmentPackage ?? buildDefaultUnavailablePackage(),
});
const finalAssistantContent = gated.output;
// use finalAssistantContent in place of assistantContent below
```

Where `chatJudgmentPackage` is a hoisted variable assigned by the BTAR-004 judgment block. Where `buildDefaultUnavailablePackage()` is a tiny helper (in `ai-output-safety-gate.ts`) that builds a `CoinetJudgmentPromptPackage` with `judgment_status: 'UNAVAILABLE'` + `scope: { kind: 'UNKNOWN' }` for chat turns where no judgment block ran (e.g., no detected coins).

Streaming: `/api/chat` route currently returns assembled JSON (not streamed tokens at the model layer; chart/response payload assembled before return). Gate operates on final assembled `assistantContent` only. If a future streaming refactor exists, that is BTAR-006 / later.

---

## 13. Test Plan

### 13.1 Unit Tests (`ai-output-safety-gate.test.ts`) — 16–25

1. Allows careful AVAILABLE thesis language with disclaimer.
2. Blocks "you should buy SOL now."
3. Blocks "sell now."
4. Flags "will pump" / "guaranteed."
5. Flags "Coinet is certain" under DEGRADED.
6. DEGRADED package + plain answer → `MISSING_DEGRADATION_DISCLOSURE`.
7. DEGRADED package + cautious answer with disclosure → allow.
8. UNAVAILABLE package + plain thesis → `MISSING_UNAVAILABLE_DISCLOSURE` + `GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE`.
9. UNAVAILABLE package + "Coinet cannot provide a structured judgment" → allow.
10. UNAVAILABLE package forbids governed thesis claims.
11. UNAVAILABLE package forbids governed confidence/scenario claims.
12. DEGRADED + "high conviction" → `CONFIDENCE_INFLATION`.
13. AVAILABLE with empty source_refs + "on-chain confirms" → `INVENTED_EVIDENCE_LANGUAGE`.
14. Deterministic safe_output for direct financial advice rewrite.
15. Deterministic safe_output for unavailable misrepresentation rewrite.
16. Deterministic safe_output for degraded missing-disclosure rewrite.
17. Returns `policy_version: 'ai-output-safety-gate.v1'`.
18. Returns structured `violations[]` array.
19. Negation context: "this is not a recommendation to buy or sell" → NOT flagged as DIRECT_FINANCIAL_ADVICE.
20. `BLOCK_OR_CLARIFY` for extreme outputs ("I guarantee SOL will 10x").

### 13.2 Integration Test (`chat-ai-output-safety.integration.test.ts`) — 1–2

**Test A:** aiService mocked to return unsafe `"You should buy SOL now."`; produceJudgment returns AVAILABLE judgment. Final returned content does NOT contain "You should buy" / "buy now". No real provider calls. Existing response shape preserved.

**Test B (if feasible):** aiService mocked to return "Coinet's thesis is bullish on SOL."; produceJudgment throws (UNAVAILABLE). Final returned content contains unavailable disclosure marker and does NOT contain "Coinet's thesis is".

F-5 discipline: if mock cascade prevents the path from reaching judgment block, the integration test conditional-skips deep oracle and the 20 unit tests remain the definitive proof.

### 13.3 Regression Tests Must Still Pass

```text
src/api/chat/__tests__/judgment-prompt-package.test.ts                   (23/23 — BTAR-004)
src/api/chat/__tests__/chat-prompt-package-integration.test.ts           ( 1/1 — BTAR-004)
src/api/chat/__tests__/judgment-availability.test.ts                     (25/25 — BTAR-003)
src/api/chat/__tests__/chat-judgment-failure-path.test.ts                ( 1/1 — BTAR-003)
src/api/chat/__tests__/chat-path.smoke.test.ts                           ( 2/2 — BTAR-002)
```

---

## 14. Validation Commands

```bash
pnpm check:backend
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/ai-output-safety-gate.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/chat-ai-output-safety.integration.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/
```

Expected: all exit 0.

---

## 15. Rollback Path

Single PR revert. The BTAR-004 (post-FRP-001) bridge state is restored. The four new files under `src/api/chat/` are removed. `aiResponse.data.{thesis|summary|recommendation}` resolution proceeds directly without the gate.

No schema/CI/external-state changes.

---

## 16. Done Definition

```text
AI output safety gate type contract exists.
Gate evaluator + safe rewriter + invariant detectors exist.
Detectors handle: direct financial advice, guaranteed outcome, unsupported certainty,
  missing degradation/unavailable disclosure, governed judgment claim when unavailable,
  confidence inflation, invented evidence, package contradiction.
Chat service applies gate before user delivery (post-aiService.analyze, pre-prisma.message.create).
Unsafe recommendation-like AI output cannot pass silently.
Unavailable/degraded package states are respected at output time.
Unit tests pass (≥16).
Integration test passes (or records honest F-5 limitation).
BTAR-003 + BTAR-004 + BTAR-002 regression tests pass.
pnpm check:backend exits 0.
No response shape break.
No new AI service.
No L*.X diff.
No real provider calls in tests.
```

---

## 17. Completion Section

### 17.1 Completion Claim

```text
BTAR-005 COMPLETED — AI_OUTPUT_SAFETY_GATE_ACTIVE
```

### 17.2 Files Changed

**New (4 files):**

```text
apps/coinet-platform/src/api/chat/ai-output-safety-gate.types.ts                          ~65 LOC
apps/coinet-platform/src/api/chat/ai-output-safety-gate.ts                               ~430 LOC
apps/coinet-platform/src/api/chat/__tests__/ai-output-safety-gate.test.ts                 25 tests
apps/coinet-platform/src/api/chat/__tests__/chat-ai-output-safety.integration.test.ts      1 test
```

**Modified (1 file):**

```text
apps/coinet-platform/src/api/chat/service.ts
  - Added 6-line import block for applyAIOutputSafetyGate + CoinetJudgmentPromptPackage type
  - Hoisted `let chatJudgmentPackage` to sendMessage function entry
  - Added `chatJudgmentPackage = pkg;` assignment in all three judgment-block branches
  - Inserted gate call at the final-output region (post-aiResponse, pre-prisma.message.create):
      const judgmentPackageForGate = chatJudgmentPackage ?? <default UNAVAILABLE/UNKNOWN package>;
      const gateResult = applyAIOutputSafetyGate({ output: rawAssistantContent, judgmentPackage: judgmentPackageForGate });
      const assistantContent = gateResult.output;
  - Added logger.warn when gate decision is non-ALLOW
  - Total service.ts diff: ~50 LOC net, bounded entirely to import block + judgment-block hoist + final-output gate insertion
```

**NOT Touched (preferred):**

```text
apps/coinet-platform/src/services/ai-service.ts                — not touched
apps/coinet-platform/src/api/chat/types.ts                     — not touched
apps/coinet-platform/src/services/judgment/debug-view.ts       — not touched
```

### 17.3 Test Results

```text
pnpm check:backend                                                          → exits 0 (typecheck clean)
src/api/chat/__tests__/ai-output-safety-gate.test.ts                        → 25/25 pass (26ms)
src/api/chat/__tests__/chat-ai-output-safety.integration.test.ts            →  1/1 pass
src/api/chat/__tests__/judgment-prompt-package.test.ts (BTAR-004 regr.)     → 23/23 pass
src/api/chat/__tests__/chat-prompt-package-integration.test.ts (BTAR-004)   →  1/1 pass
src/api/chat/__tests__/judgment-availability.test.ts (BTAR-003 regr.)       → 25/25 pass
src/api/chat/__tests__/chat-judgment-failure-path.test.ts (BTAR-003)        →  1/1 pass
src/api/chat/__tests__/chat-path.smoke.test.ts (BTAR-002 regr.)             →  2/2 pass
Combined: 78/78 tests pass across 7 chat test files (628ms total)
```

### 17.4 Provider-Call Note

```text
No real provider calls occurred.
```

Structurally satisfied via vi.mock layout (reusing the BTAR-004 hardened layout including the F-6 `project-investigation-service` mock). The gate itself makes no I/O calls (no second LLM, no HTTP, no time, no randomness).

### 17.5 Response-Shape Note

`ChatMessageResponse` shape unchanged. No fields added / removed / renamed. The gate operates server-side, transforming `rawAssistantContent` → `assistantContent` before `prisma.message.create`. Plan 2.2 §16 preferred rule satisfied; §16.4 four-item satisfaction not required.

Internal observability: the chat service logs `"AI output safety gate intervened"` with decision + violations + policy_version when the gate is non-ALLOW. Logs visible at validation time confirmed the gate is live (e.g., `decision:"REWRITE_REQUIRED" violations:["MISSING_UNAVAILABLE_DISCLOSURE"] judgment_status:"UNAVAILABLE"` during integration test).

### 17.6 Plan 2.1 First-Principle Proof

> "The user-facing AI response must never pretend structured judgment exists when the structured judgment path failed, degraded, timed out, or became unavailable."

Evidence:

- 25 deterministic unit tests prove the gate enforces TF-003 (confidence inflation), TF-005 (fabricated evidence), TF-006 (recommendation creep — primary closure), and TF-001 partial (silent state promotion at output layer).
- The gate's invariants: UNAVAILABLE package + governed-claim language → `GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE` + `MISSING_UNAVAILABLE_DISCLOSURE` → `REWRITE_REQUIRED`; deterministic safe_output substitutes the canonical "structured Coinet judgment is unavailable" answer. Tested.
- Integration test confirms unsafe AI output (`"You should buy SOL now. ... guaranteed to pump."`) is NOT in the final response payload (asserted via `expect(resultText).not.toMatch(/you should buy sol now/)` and `/guaranteed to pump/`).
- Live integration logs show gate intervention on the UNAVAILABLE branch during the BTAR-003 failure-path test as well — the gate also caught a missing-unavailable-disclosure in a downstream test, demonstrating cross-branch enforcement.

### 17.7 Plan 2.2 Surface Mapping Proof

Touched only: P2-S01 (`service.ts` final-output region) + P2-S11 (new gate files) + P2-S08 (new unit + integration tests). P2-S04 (`ai-service.ts`) NOT touched. P2-R01/P2-R02 (L13/L14) NOT touched. P2-F01..F03 NOT touched. Required Plan 2.2 §12.3 caution language present in `service.ts` import block ("bounded live-path trust modification, not a chat service rewrite"; "final AI expression gate, not a new AI service, not a compliance platform, and not a replacement for the judgment engine"). Plan-2.2-INV-01 satisfied.

### 17.8 Plan 2.3 OOS Proof

Zero OOS-001..018 crossings. No CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration, no calibration ecosystem, no alert platform, no broad cleanup, no full chat-service rewrite, no `*-v2.ts` / `*-final.ts`, no parallel chat runtime, no new L*.X, no real-provider tests, no frontend integration, no unrelated performance work. No full compliance platform, no legal-policy engine, no trading-recommendation system (BTAR-005-specific OOS additions). Plan-2.1-INV-02 satisfied (zero `src/l*/` diff).

### 17.9 Residual Findings

| Finding | Status After BTAR-005 | Notes |
| --- | --- | --- |
| F-1 (`intentClassification.processingTimeMs` mismatch) | **STILL_OPEN** | Production code unchanged. BTAR-003/004/005 work around at the mock layer. |
| F-2 (27-mock chat-service coupling) | **STILL_OPEN** | BTAR-006 target. |
| F-3 (silent-continue / fallback pattern) | **RESOLVED** at the judgment site (BTAR-003); unchanged |
| F-4 (per-message external fan-out) | **STILL_OPEN** | BTAR-008 target. |
| F-5 (integration oracle limited by F-2 cascade) | **STILL_OPEN** | Same condition re-confirmed by BTAR-005 integration test; the 25/25 unit tests + the live gate-intervention logs are the definitive proof. |
| F-6 (undetected live-CoinGecko path through `project-investigation-service`) | **RESOLVED** by BTAR-004; mock retained in all integration tests |

No new findings filed by BTAR-005.

### 17.10 Done Definition Check (per §16)

| Criterion | Status |
| --- | --- |
| AI output safety gate type contract exists | ✅ (`ai-output-safety-gate.types.ts`) |
| Gate evaluator + safe rewriter + detectors exist | ✅ (`ai-output-safety-gate.ts`) |
| Detectors handle 9 violation classes | ✅ (DIRECT_FINANCIAL_ADVICE / GUARANTEED_OUTCOME_LANGUAGE / UNSUPPORTED_CERTAINTY / MISSING_DEGRADATION_DISCLOSURE / MISSING_UNAVAILABLE_DISCLOSURE / GOVERNED_JUDGMENT_CLAIM_WHEN_UNAVAILABLE / CONFIDENCE_INFLATION / INVENTED_EVIDENCE_LANGUAGE / PACKAGE_CONTRADICTION) |
| Chat service applies gate before user delivery | ✅ (post-aiService.analyze, pre-prisma.message.create at service.ts ~line 1525) |
| Unsafe recommendation-like AI output cannot pass silently | ✅ (integration test asserts unsafe phrasing absent from final response) |
| Unavailable/degraded package states respected at output time | ✅ (live gate-intervention logs confirmed) |
| Unit tests pass (≥16) | ✅ (25/25) |
| Integration test passes (or records honest F-5 limitation) | ✅ (1/1, with F-5 conditional-skip honestly documented in test header) |
| BTAR-003 + BTAR-004 + BTAR-002 regression tests pass | ✅ (all green; 78/78 across 7 files) |
| pnpm check:backend exits 0 | ✅ |
| No response shape break | ✅ |
| No new AI service | ✅ |
| No L*.X diff | ✅ |
| No real provider calls in tests | ✅ |

**All criteria satisfied.**

### 17.11 Next Phase 2 BTAR

Per Plan 2.0 roadmap §10:

```text
BTAR-006 — Bounded Chat Service Extraction
```

BTAR-006 addresses F-2 (27-mock coupling) + F-5 (integration oracle gap) through bounded trust-critical extraction of the helpers BTAR-003/004/005 already wired (availability resolver, package builder, output safety gate, failure classifier, context boundary). BTAR-006 is **not** admitted by BTAR-005's completion.

---

## 18. Acceptance Block (Admission)

```text
BTAR: 005 — AI Output Safety / Expression Gate
Status: APPROVED — NOT_STARTED
Created: 2026-05-25
Authority: Plan 2.0 roadmap §9; Plan 2.1 / 2.2 / 2.3
Eight-question gate: TAD-A (ADMIT)
Plan 2.2 §11 Surface Boundary Mapping: COMPLETE (§5)
Plan 2.3 §25 Q1..Q5 OOS check: PASS (§5)
Plan 2.1 §6.2 mission trace: COMPLETE (§4)
Required caution language: PRESENT (§5)
Forbidden surfaces confirmed absent: P2-F01..F03 + src/l13/ + src/l14/ + compliance/policy/legal/trading engines
Next operational step: Step 4 (create type contract)
```
