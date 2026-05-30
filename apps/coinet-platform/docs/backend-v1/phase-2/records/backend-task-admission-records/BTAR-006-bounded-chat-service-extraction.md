# BTAR-006 — Bounded Chat Service Extraction

Type: BTAR (Backend Task Admission Record)
Status: COMPLETED — TRUST_CRITICAL_CHAT_SEAMS_EXTRACTED
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Created: 2026-05-25
Last Updated: 2026-05-25
Owner: Backend program owner
Mission Trace: Plan 2.1 §1.2 (clause: "testable"); supports the first-principle enforcement built by BTAR-003/004/005 by making it mechanically provable

Depends On / Inherits From:
- Plans 1.1–1.10 ACTIVE
- Plan 1.11 / 1.12 COMPLETED
- Plan 2.0 long-form + roadmap ACTIVE
- Plan 2.1 / 2.2 / 2.3 ACTIVE
- **BTAR-003 COMPLETED** (JudgmentAvailabilityState)
- **BTAR-004 COMPLETED + FRP-001 COMPLETED** (CoinetJudgmentPromptPackage)
- **BTAR-005 COMPLETED** (AI Output Safety / Expression Gate)

Inheritance audit: Plans 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 2.0 (both), 2.1, 2.2, 2.3 — all ACTIVE/COMPLETED at admission.

---

## 1. One-Sentence Mission

> **BTAR-006 extracts only the smallest trust-critical seams from `api/chat/service.ts` so judgment availability, prompt package construction, and AI output safety finalization can be tested without importing the entire chat service or requiring the 27-mock cascade.**

### 1.1 Honesty Pin

BTAR-006 is **not** a rewrite. It is bounded extraction. The chat service still owns context fetching, intent handling, symbol detection, response assembly, and provider orchestration. Only two trust seams move: `ChatTrustContext` builder + `ChatAIResponseFinalizer`. F-2 (27-mock coupling) is **partially** resolved at the trust-seam level only.

---

## 2. Problem Statement

BTAR-003/004/005 wired three trust layers inline in `service.ts`:

```text
[BTAR-003] judgmentAvailability  — let + 3-branch if/else
[BTAR-004] buildCoinetJudgmentPromptPackage + renderCoinetJudgmentPromptPackageForAI — 3 call sites
[BTAR-005] applyAIOutputSafetyGate                                                   — 1 call site
```

Verifying these layers today requires either:
- 25/23/25 deterministic unit tests on the underlying helpers (already done), **or**
- importing `chat/service.ts` with the F-2 27-mock cascade (BTAR-002 finding).

There is no middle layer: a small, importable trust orchestrator that can be tested with 0 module mocks. BTAR-006 adds that layer.

---

## 3. Plan 2.1 Mission Trace

| Field | Value |
| --- | --- |
| Mission clause(s) advanced | "testable" (Plan 2.1 §1.2 — moving from "we added safeguards" to "we can prove the safeguards work without fighting the whole backend") |
| First principle obligation strengthened | Indirect: makes regression of TF-001/003/005/006/008 mechanically detectable without F-2 cascade |
| Truth class boundary strengthened | All three classes (§3.1/§3.2/§3.3) become testable in isolation |
| Trust failure(s) targeted | TF-007 (testability — primary); TF-008 (trust boundary hidden inside coupled service); TF-001/003 indirectly via regression-detection improvement |
| Availability law interaction | CONSUMES BTAR-003 `JudgmentAvailabilityResult`; CONSUMES BTAR-004 `CoinetJudgmentPromptPackage`; CONSUMES BTAR-005 safety gate; redesigns NONE |
| Non-replacement compliance | Confirmed: zero files under `src/l5..src/l14/` touched; chat runtime not rewritten |

---

## 4. Plan 2.2 Surface Boundary Mapping

```text
## Surface Boundary Mapping
```

| Surface | Permission | Use in BTAR-006 |
| --- | --- | --- |
| `src/api/chat/service.ts` (P2-S01) | P2-TOUCH_WITH_BOUNDS | Replace inline trust orchestration (3 judgment-block branches + 1 final-output region) with `buildChatTrustContext(...)` + `finalizeChatAIResponse(...)` calls. Behavior unchanged. |
| `src/api/chat/chat-trust-context.ts` (P2-S12 new) | P2-OPEN | New trust-context builder around availability + prompt package + rendered context |
| `src/api/chat/chat-ai-response-finalizer.ts` (P2-S12 new) | P2-OPEN | New final-output wrapper around AI output safety gate |
| `src/api/chat/__tests__/chat-trust-context.test.ts` (P2-S08 new) | P2-OPEN | Isolated trust-context tests (target: 0 module mocks) |
| `src/api/chat/__tests__/chat-ai-response-finalizer.test.ts` (P2-S08 new) | P2-OPEN | Isolated finalizer tests (target: 0 module mocks) |
| `src/api/chat/__tests__/chat-judgment-failure-path.test.ts` (P2-S08 existing) | P2-OPEN | May update to rely on extracted helpers OR document honest residual coupling |
| `src/api/chat/judgment-availability*` (P2-S10 existing) | P2-OPEN | Imported, not redesigned |
| `src/api/chat/judgment-prompt-package*` (P2-S09 existing) | P2-OPEN | Imported, not redesigned |
| `src/api/chat/ai-output-safety-gate*` (P2-S11 existing) | P2-OPEN | Imported, not redesigned |

**Touched surfaces declared.** Diff scope: 2 new modules + 2 new test files + 1 bounded `service.ts` edit (judgment-block 3 branches + final-output region).

**Forbidden surfaces confirmed absent.** P2-F01..F03 not touched. `src/l13/` and `src/l14/` not touched. `services/ai-service.ts` not touched. `services/judgment/*` not touched. No frontend, no schema, no CI.

**Required caution language** (Plan 2.2 §12.3 + spec §6):

```text
This is a bounded live-path trust extraction, not a chat service rewrite.
These modules extract trust-critical seams only; they do not create a new chat runtime, new AI service, or new judgment engine.
```

**Plan 2.3 OOS check (Q1..Q5):**

| Q | Answer |
| --- | --- |
| Q1. Touches any OOS item? | **No.** All surfaces in-scope (P2-S01 / P2-S08 / P2-S09..S12). |
| Q2. If yes, which OOS-NNN? | n/a |
| Q3. Allowed / forbidden / exception-required? | ALLOWED (Plan 2.2 §§6.1 / 7.5 / 7.1) |
| Q4. Required caution language? | **Yes** (§4 above) |
| Q5. Creates new architecture / service variant / provider dependency? | **No.** Bounded extraction of existing logic into named helpers under `src/api/chat/`. |

---

## 5. Plan 2.3 OOS Confirmation

Zero OOS-001..018 crossings. No CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration, no calibration ecosystem, no alert platform, no broad cleanup, **no full chat-service rewrite (OOS-011)**, no `*-v2.ts` / `*-final.ts` / `*-rewritten.ts`, no parallel chat runtime (OOS-014), no new L*.X, no real-provider tests, no frontend integration, no unrelated performance work. No full observability platform, no full external fan-out redesign (F-4 remains BTAR-008 territory), no mass refactor.

---

## 6. Files Plan

### 6.1 New Files

```text
apps/coinet-platform/src/api/chat/chat-trust-context.ts                                ~120 LOC
apps/coinet-platform/src/api/chat/chat-ai-response-finalizer.ts                         ~80 LOC
apps/coinet-platform/src/api/chat/__tests__/chat-trust-context.test.ts                  13–18 tests, 0 module mocks
apps/coinet-platform/src/api/chat/__tests__/chat-ai-response-finalizer.test.ts          10–14 tests, 0 module mocks
```

### 6.2 Modified Files

```text
apps/coinet-platform/src/api/chat/service.ts
  - Add import block for buildChatTrustContext + finalizeChatAIResponse
  - Replace the BTAR-003/004 inline orchestration in all 3 judgment-block branches with
    `const ctx = buildChatTrustContext(...); chatJudgmentPackage = ctx.promptPackage;
     contextParts.push(ctx.renderedAIContext);`
  - Replace the BTAR-005 final-output region with
    `const finalized = finalizeChatAIResponse({ rawOutput, judgmentPackage });
     const assistantContent = finalized.finalOutput;`
  - Behavior unchanged. Target diff: ~30 LOC net (additions + replacements).
```

### 6.3 Conditionally Modified

```text
apps/coinet-platform/src/api/chat/__tests__/chat-judgment-failure-path.test.ts
  - May be updated to rely on extracted helpers (lighter mocks) ONLY if safely possible.
  - Otherwise left unchanged with an explicit comment that F-5 remains partially open
    because the full-service path still requires the 27-mock cascade.
```

### 6.4 NOT Touched

```text
apps/coinet-platform/src/services/ai-service.ts
apps/coinet-platform/src/services/judgment/*
apps/coinet-platform/src/services/judgment/debug-view.ts (formatJudgmentForAI export still callable per FRP-001 §5)
apps/coinet-platform/src/api/chat/types.ts (unless absolutely necessary)
```

### 6.5 Forbidden

```text
src/l13/**, src/l14/**, src/index.ts, prisma/schema.prisma, apps/client-web/**, .github/workflows/**, root package.json, tsconfig.json
chat-service-v2.ts, chat-runtime.ts, chat-orchestrator-v2.ts, ai-service-v2.ts, judgment-engine-final.ts, l13-chat-runtime-adapter.ts, l14-chat-delivery-adapter.ts, cip1-chat-runtime.ts
```

---

## 7. Module 1 — `chat-trust-context.ts`

```ts
import type { JudgmentAvailabilityResult } from './judgment-availability.types';
import {
  buildCoinetJudgmentPromptPackage,
  renderCoinetJudgmentPromptPackageForAI,
} from './judgment-prompt-package';
import type {
  CoinetJudgmentPromptPackage,
  CoinetJudgmentPromptPackageScope,
} from './judgment-prompt-package.types';

export interface BuildChatTrustContextInput {
  availability: JudgmentAvailabilityResult;
  judgment?: unknown;
  scope?: Partial<CoinetJudgmentPromptPackageScope>;
  source_refs?: string[];
}

export interface ChatTrustContext {
  judgment_status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  judgment_available: boolean;
  disclosure_required: boolean;
  promptPackage: CoinetJudgmentPromptPackage;
  renderedAIContext: string;
  failed_components: string[];
  degraded_components: string[];
  reasons: string[];
  policy_versions: {
    availability: 'judgment-availability.v1';
    prompt_package: 'coinet-judgment-prompt-package.v1';
  };
}

export function buildChatTrustContext(input: BuildChatTrustContextInput): ChatTrustContext;
```

Pure / deterministic. No I/O. Reuses BTAR-003 + BTAR-004 helpers.

---

## 8. Module 2 — `chat-ai-response-finalizer.ts`

```ts
import type { CoinetJudgmentPromptPackage } from './judgment-prompt-package.types';
import { applyAIOutputSafetyGate } from './ai-output-safety-gate';
import type { AIOutputSafetyGateResult } from './ai-output-safety-gate.types';

export interface FinalizeChatAIResponseInput {
  rawOutput: string;
  judgmentPackage: CoinetJudgmentPromptPackage;
}

export interface FinalizeChatAIResponseResult {
  finalOutput: string;
  originalOutput: string;
  changed: boolean;
  gate: AIOutputSafetyGateResult;
}

export function finalizeChatAIResponse(input: FinalizeChatAIResponseInput): FinalizeChatAIResponseResult;
```

Pure / deterministic. No I/O. Reuses BTAR-005 gate.

---

## 9. Mock-Count Discipline (Spec §16)

```text
chat-trust-context.test.ts          → target 0 module mocks (forbidden import: chat/service.ts)
chat-ai-response-finalizer.test.ts  → target 0 module mocks (forbidden import: chat/service.ts)
chat-judgment-failure-path.test.ts  → target < 10 mocks ONLY if safe; otherwise document honestly
chat-prompt-package-integration     → unchanged (BTAR-004 baseline)
chat-ai-output-safety.integration   → unchanged (BTAR-005 baseline)
chat-path.smoke.test.ts             → unchanged (BTAR-002 baseline)
```

Honest claim: BTAR-006 resolves F-2 **at the trust-seam level**. Full-service-test coupling outside trust seams remains for future work (intent handling, fan-out, etc.).

---

## 10. Test Plan

### 10.1 `chat-trust-context.test.ts` — 13–18 tests, 0 module mocks

Required cases:

1. Builds AVAILABLE trust context (no service import).
2. AVAILABLE context contains promptPackage with `judgment_status: 'AVAILABLE'`.
3. AVAILABLE context contains renderedAIContext with `STRUCTURED COINET JUDGMENT PACKAGE`.
4. AVAILABLE context has `judgment_available: true`.
5. AVAILABLE context has `disclosure_required: false`.
6. Builds DEGRADED trust context.
7. DEGRADED context has `disclosure_required: true`.
8. DEGRADED context preserves degraded_components.
9. Builds UNAVAILABLE trust context.
10. UNAVAILABLE context has `judgment_available: false`.
11. UNAVAILABLE prompt package contains no judgment fields.
12. UNAVAILABLE renderedAIContext forbids governed thesis/confidence/scenario claims.
13. Trust context exposes policy versions (`judgment-availability.v1` + `coinet-judgment-prompt-package.v1`).
14. Test file imports `chat-trust-context` only; does NOT import `chat/service.ts`.

### 10.2 `chat-ai-response-finalizer.test.ts` — 10–14 tests, 0 module mocks

Required cases:

1. ALLOW keeps output unchanged + `changed=false`.
2. REWRITE_REQUIRED produces safe_output + `changed=true`.
3. BLOCK_OR_CLARIFY produces safe_output + `changed=true`.
4. Direct buy/sell language is removed from final output.
5. Guaranteed outcome language is removed from final output.
6. UNAVAILABLE misrepresentation is replaced with unavailable disclosure.
7. Finalizer returns `originalOutput` unchanged.
8. Finalizer returns the gate result.
9. Finalizer is deterministic (same input → same output).
10. Test file imports `chat-ai-response-finalizer` only; does NOT import `chat/service.ts`.

### 10.3 Regression Tests Must Still Pass

```text
ai-output-safety-gate.test.ts                 (25/25 — BTAR-005)
chat-ai-output-safety.integration.test.ts     ( 1/1 — BTAR-005)
judgment-prompt-package.test.ts               (23/23 — BTAR-004)
chat-prompt-package-integration.test.ts       ( 1/1 — BTAR-004)
judgment-availability.test.ts                 (25/25 — BTAR-003)
chat-judgment-failure-path.test.ts            ( 1/1 — BTAR-003)
chat-path.smoke.test.ts                       ( 2/2 — BTAR-002)
```

---

## 11. Validation Commands

```bash
pnpm check:backend
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/
```

Expected: all green. No real provider calls (trust-seam tests structurally make none).

---

## 12. Rollback Path

Single PR revert. Inline trust orchestration in `service.ts` is restored. The four new files under `src/api/chat/` are removed. BTAR-003/004/005 helpers remain unchanged. No schema/CI/external-state changes.

---

## 13. Done Definition (Spec §27 condensed)

```text
chat-trust-context.ts + chat-ai-response-finalizer.ts exist.
service.ts uses extracted helpers; behavior unchanged.
chat-trust-context.test.ts: 0 module mocks, no chat/service.ts import; ≥13 tests pass.
chat-ai-response-finalizer.test.ts: 0 module mocks, no chat/service.ts import; ≥10 tests pass.
All BTAR-002/003/004/005 regression tests pass.
pnpm check:backend exits 0.
No response shape break.
No new service variant, no new runtime, no L*.X diff.
No real provider calls.
F-2 / F-5 updated HONESTLY (PARTIALLY_RESOLVED at trust-seam level; full-service coupling residual).
```

---

## 14. Completion Section

### 14.1 Completion Claim

```text
BTAR-006 COMPLETED — TRUST_CRITICAL_CHAT_SEAMS_EXTRACTED
```

### 14.2 Files Changed

**New (4 files):**

```text
apps/coinet-platform/src/api/chat/chat-trust-context.ts                              ~90 LOC
apps/coinet-platform/src/api/chat/chat-ai-response-finalizer.ts                      ~55 LOC
apps/coinet-platform/src/api/chat/__tests__/chat-trust-context.test.ts                14 tests, 0 module mocks
apps/coinet-platform/src/api/chat/__tests__/chat-ai-response-finalizer.test.ts        10 tests, 0 module mocks
```

**Modified (1 file):**

```text
apps/coinet-platform/src/api/chat/service.ts
  - Import block: added buildChatTrustContext + finalizeChatAIResponse imports;
    `renderCoinetJudgmentPromptPackageForAI` removed from named import (no longer called directly);
    `applyAIOutputSafetyGate` import removed (no longer called directly — finalizer wraps it).
  - All three judgment-block branches (AVAILABLE / falsy / throw) replaced inline
    `buildCoinetJudgmentPromptPackage(...)` + `renderCoinetJudgmentPromptPackageForAI(pkg)` pair
    with `const trustContext = buildChatTrustContext({...}); chatJudgmentPackage = trustContext.promptPackage; contextParts.push(trustContext.renderedAIContext);`
  - Final-output region replaced `applyAIOutputSafetyGate(...)` + manual log-on-non-ALLOW with
    `const finalized = finalizeChatAIResponse({...}); const assistantContent = finalized.finalOutput; if (finalized.gate.decision !== 'ALLOW') logger.warn(...)`.
  - Total service.ts diff: ~25 LOC net, bounded entirely to import block + 3 judgment branches + 1 final-output region.
  - Behavior unchanged. `buildCoinetJudgmentPromptPackage` retained for the no-judgment-block fallback package only.
```

**NOT Touched:**

```text
apps/coinet-platform/src/services/ai-service.ts                — not touched
apps/coinet-platform/src/services/judgment/*                   — not touched
apps/coinet-platform/src/services/judgment/debug-view.ts       — not touched (formatJudgmentForAI export still present, FRP-001 §5)
apps/coinet-platform/src/api/chat/types.ts                     — not touched
apps/coinet-platform/src/api/chat/__tests__/chat-judgment-failure-path.test.ts — not touched (residual coupling honestly documented in §14.7)
```

### 14.3 Test Results

```text
pnpm check:backend                                                          → exits 0 (typecheck clean)
src/api/chat/__tests__/chat-trust-context.test.ts                            → 14/14 pass (176ms), 0 module mocks
src/api/chat/__tests__/chat-ai-response-finalizer.test.ts                    → 10/10 pass (190ms), 0 module mocks
src/api/chat/__tests__/ai-output-safety-gate.test.ts (BTAR-005 regr.)        → 25/25 pass
src/api/chat/__tests__/chat-ai-output-safety.integration.test.ts (BTAR-005)  →  1/1 pass
src/api/chat/__tests__/judgment-prompt-package.test.ts (BTAR-004 regr.)      → 23/23 pass
src/api/chat/__tests__/chat-prompt-package-integration.test.ts (BTAR-004)    →  1/1 pass
src/api/chat/__tests__/judgment-availability.test.ts (BTAR-003 regr.)        → 25/25 pass
src/api/chat/__tests__/chat-judgment-failure-path.test.ts (BTAR-003)         →  1/1 pass
src/api/chat/__tests__/chat-path.smoke.test.ts (BTAR-002 regr.)              →  2/2 pass
Combined: 102/102 tests pass across 9 chat test files (720ms total)
```

### 14.4 Mock-Count Evidence (Plan 2.2 §14 / BTAR-006 §9)

| Test file | Module mocks | Imports `chat/service.ts`? | Notes |
| --- | ---: | --- | --- |
| `chat-trust-context.test.ts` (new) | **0** | **No** | Pure trust-context oracle. F-2/F-5 partial-resolution proof at seam level. |
| `chat-ai-response-finalizer.test.ts` (new) | **0** | **No** | Pure output-finalization oracle. F-2/F-5 partial-resolution proof at seam level. |
| `ai-output-safety-gate.test.ts` (BTAR-005) | 0 | No | Pre-existing detector-level unit tests. |
| `judgment-prompt-package.test.ts` (BTAR-004) | 0 | No | Pre-existing package-level unit tests. |
| `judgment-availability.test.ts` (BTAR-003) | 0 | No | Pre-existing helper-level unit tests. |
| `chat-prompt-package-integration.test.ts` (BTAR-004) | 27 | Yes (chatService.sendMessage) | Unchanged from BTAR-004 baseline. |
| `chat-ai-output-safety.integration.test.ts` (BTAR-005) | 27 | Yes (chatService.sendMessage) | Unchanged from BTAR-005 baseline. |
| `chat-judgment-failure-path.test.ts` (BTAR-003) | 28 | Yes (chatService.sendMessage) | Unchanged. See §14.7. |
| `chat-path.smoke.test.ts` (BTAR-002) | 27 | Yes (chatService.sendMessage) | Unchanged. |

Result:
- **Trust-critical seam tests achieve the 0-mock target** (BTAR-006 §9 strict).
- **Full-service integration tests preserve their existing baselines.** F-2 is not fully resolved; the chat service still owns context-fetch / intent / symbol-detection orchestration that requires the cascade.

### 14.5 Provider-Call Note

```text
No real provider calls occurred.
```

Seam tests structurally make no provider calls (no provider import; nothing to mock). Full-service tests continue to mock all 27+ providers including the F-6 `project-investigation-service` mock.

### 14.6 Response-Shape Note

`ChatMessageResponse` shape unchanged. No fields added / removed / renamed. Behavior preservation rule (BTAR-006 §15) satisfied: same route, same response shape, same successful chat behavior, same unavailable/degraded package behavior, same safety-gate decisions, smoke test unchanged. Plan 2.2 §16 preferred rule satisfied.

### 14.7 Honest F-5 Residual Statement (Spec §19 "Acceptable outcome")

The existing `chat-judgment-failure-path.test.ts` was **not** updated to reduce its mock count. Reducing it further would require touching upstream context-fetch / intent / symbol-detection logic in `chat/service.ts` — which is **out of BTAR-006 scope** (Plan 2.3 OOS-011 full-chat-rewrite boundary; BTAR-006 §15 behavior-preservation rule).

**Resolution status:**
- **F-2 (27-mock coupling)** → **PARTIALLY_RESOLVED_TRUST_SEAMS**. Trust-critical behavior is now testable in isolation with 0 mocks (the 24 new tests in `chat-trust-context.test.ts` + `chat-ai-response-finalizer.test.ts`). Full-service tests still require the cascade.
- **F-5 (integration oracle limited by F-2 cascade)** → **PARTIALLY_RESOLVED_TRUST_ORACLE**. The trust-oracle is no longer dependent on full-service integration: trust-context construction (AVAILABLE / DEGRADED / UNAVAILABLE) and AI output finalization (ALLOW / REWRITE / BLOCK) are mechanically provable in seam tests. Full-service integration tests still rely on F-2 cascade for end-to-end behavior verification.

### 14.8 Plan 2.1 First-Principle Proof

> "The user-facing AI response must never pretend structured judgment exists when the structured judgment path failed, degraded, timed out, or became unavailable."

Evidence:
- **Mechanical regression-detection for the first principle is now possible without F-2 cascade.** The 14 trust-context unit tests prove UNAVAILABLE package contains no fake judgment fields, UNAVAILABLE rendered context forbids governed thesis/confidence/scenario claims, and AVAILABLE/DEGRADED contexts carry the correct disclosure shape. The 10 finalizer tests prove unsafe phrasing ("you should buy", "Coinet's thesis is bullish" under UNAVAILABLE) is replaced before reaching the user.
- Live behavior unchanged: all 9 chat test files (102/102 tests) pass; BTAR-005 live gate-intervention log discipline still works at runtime (chat service now logs `finalized.changed` in addition to decision/violations).

### 14.9 Plan 2.2 Surface Mapping Proof

Touched only: P2-S01 (`service.ts` trust regions: 3 judgment branches + 1 final-output region) + P2-S12 (new `chat-trust-context.ts` + `chat-ai-response-finalizer.ts`) + P2-S08 (new `chat-trust-context.test.ts` + `chat-ai-response-finalizer.test.ts`). P2-S04 (`ai-service.ts`) NOT touched. `services/judgment/*` NOT touched. P2-R01/P2-R02 (L13/L14) NOT touched. P2-F01..F03 NOT touched. Required Plan 2.2 §12.3 caution language present in `service.ts` import block ("bounded live-path trust extraction, not a chat service rewrite"; "trust-critical seams only; do not create a new chat runtime, new AI service, or new judgment engine") and in each new module's docblock. Plan-2.2-INV-01 satisfied: every touched file mapped + passes ≥1 of T1..T5.

### 14.10 Plan 2.3 OOS Proof

Zero OOS-001..018 crossings. No full chat-service rewrite, no `chat-service-v2.ts`, no `chat-runtime.ts`, no new chat runtime; only extraction. No `ai-service-v2.ts`, no `judgment-engine-final.ts`, no parallel runtime. No CIP.1, no L13/L14 migration, no Strategy Lab, no Chart Canvas, no plugin systems, no agent builder, no real-API integration, no calibration ecosystem, no alert platform, no broad cleanup, no new L*.X, no real-provider tests, no frontend integration, no unrelated performance work. No full observability platform, no full external fan-out redesign, no mass refactor. Plan-2.1-INV-02 satisfied (zero `src/l*/` diff).

### 14.11 Residual Findings

| Finding | Status After BTAR-006 | Notes |
| --- | --- | --- |
| F-1 (`intentClassification.processingTimeMs` mismatch) | **STILL_OPEN** | Production code unchanged. |
| F-2 (27-mock chat-service coupling) | **PARTIALLY_RESOLVED_TRUST_SEAMS** | Trust-critical behavior testable in isolation with 0 mocks; full-service coupling outside trust seams remains (intent / context-fetch / symbol-detection / response assembly). Future BTAR may address remaining seams; not BTAR-006 scope. |
| F-3 (silent-continue / fallback pattern) | **RESOLVED** at the judgment site (BTAR-003); unchanged |
| F-4 (per-message external fan-out) | **STILL_OPEN** | BTAR-008 target. |
| F-5 (integration oracle limited by F-2 cascade) | **PARTIALLY_RESOLVED_TRUST_ORACLE** | Trust-oracle no longer depends on full-service integration; seam-level oracle is now definitive. Full-service integration oracle still limited by F-2 cascade for end-to-end behavior. |
| F-6 (undetected live-CoinGecko path through `project-investigation-service`) | **RESOLVED** by BTAR-004; mock retained in all integration tests |

No new findings filed by BTAR-006.

### 14.12 Done Definition Check (per §13)

| Criterion | Status |
| --- | --- |
| chat-trust-context.ts + chat-ai-response-finalizer.ts exist | ✅ |
| service.ts uses extracted helpers; behavior unchanged | ✅ (all 9 chat test files still pass) |
| chat-trust-context.test.ts: 0 module mocks, no chat/service.ts import; ≥13 tests pass | ✅ (14/14) |
| chat-ai-response-finalizer.test.ts: 0 module mocks, no chat/service.ts import; ≥10 tests pass | ✅ (10/10) |
| All BTAR-002/003/004/005 regression tests pass | ✅ (78/78 pre-BTAR-006 + 24 new = 102/102) |
| pnpm check:backend exits 0 | ✅ |
| No response shape break | ✅ |
| No new service variant, no new runtime, no L*.X diff | ✅ |
| No real provider calls | ✅ |
| F-2 / F-5 updated HONESTLY (PARTIALLY_RESOLVED at trust-seam level; full-service coupling residual) | ✅ (§14.7 + §14.11) |

**All criteria satisfied.**

### 14.13 Next Phase 2 BTAR

Per Plan 2.0 roadmap §11:

```text
BTAR-007 — Failure-Path Regression Suite
```

BTAR-007 builds the durable failure-path test suite (judgment failure, empty result, degraded context, unsafe AI output, prompt-package integrity, no real provider calls). BTAR-006 makes BTAR-007 substantially easier because BTAR-007 can target the extracted seams directly, avoiding the F-2 cascade for trust-critical regressions. BTAR-007 is **not** admitted by BTAR-006's completion.

---

## 15. Acceptance Block (Admission)

```text
BTAR: 006 — Bounded Chat Service Extraction
Status: APPROVED — NOT_STARTED
Created: 2026-05-25
Authority: Plan 2.0 roadmap §10; Plan 2.1 / 2.2 / 2.3
Eight-question gate: TAD-A (ADMIT)
Plan 2.2 §11 Surface Boundary Mapping: COMPLETE (§4)
Plan 2.3 §25 Q1..Q5 OOS check: PASS (§4)
Plan 2.1 §6.2 mission trace: COMPLETE (§3)
Required caution language: PRESENT (§4)
Forbidden surfaces confirmed absent: P2-F01..F03 + src/l13/ + src/l14/ + parallel/chat/AI/judgment variants
Honesty pin: bounded extraction, not rewrite; F-2 partially resolved at trust-seam level only
Next operational step: Step 4 (create chat-trust-context.ts)
```
