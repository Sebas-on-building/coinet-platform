# Plan 2.0 — Phase 2 General Plan: Make the Live Judgment / Chat / AI Path Trustworthy

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 2 — Live-Path Trust Hardening
Plan: 2.0 (Phase 2 master execution constitution)
Effective: 2026-05-23
Authority: Backend v1 Completion Program; inherits Phase 1 governance (Plans 1.1–1.12)
Authorized by: P1TG-002 (P2-READY, 2026-05-23)
Supersedes: Nothing — this is the first Phase 2 document

---

## 0. Identity and Authority

This document is the **Phase 2 master execution constitution** of the Coinet Backend v1 program. Plan 2.0 is to Phase 2 what Plan 1.1 (Phase 1 Charter) + Plan 1.12 (Phase 1 Done Definition) combined were to Phase 1: it declares the mission, in-scope surfaces, out-of-scope boundaries, target architecture, BTAR sequence, and done definition for the entire phase.

Plan 2.0 is **not** a BTAR. It is a Phase-level governance document. Individual implementation work in Phase 2 happens through admitted BTARs (BTAR-003..008+), each going through the Plan 1.6 admission process.

This document:

- does not admit any specific BTAR,
- does not implement any code,
- does not amend Plans 1.1–1.12 (they remain ACTIVE and govern Phase 2 just as they governed Phase 1),
- does not unlock Phase 3 (still gated behind Phase 2 completion),
- does not open NB-001..NB-010 deferred areas (Plan 1.3 still governs).

It performs one job:

> **It defines the Phase 2 mission (live-path trustworthiness), the first principle (no faking structured judgment when judgment is unavailable), the in-scope and out-of-scope surfaces, the target runtime architecture, judgment availability states, the typed prompt package, the AI output safety gate, bounded chat-service decomposition, failure-path test discipline, runtime trust evidence, the BTAR execution sequence (BTAR-003..008), the done definition, and the P2→P3 transition gate (P2TG-001).**

### 0.1 Inheritance From Phase 1

Plan 2.0 inherits from every Phase 1 plan unchanged:

- Plan 1.1 — Phase 1 Charter (production-convergence mission) → applies to Phase 2 verbatim
- Plan 1.2 — V1-S01..V1-S06 positive scope → unchanged
- Plan 1.3 — NB-001..NB-010 deferred → still deferred
- Plan 1.4 — Architecture freeze (FRZ-001..008, AFV-A..H) → still locked
- Plan 1.5 — Sprawl prohibition (PSC-001..010, VSV-A..J, FRP/BSCP/VSE) → still locked
- Plan 1.6 — Task admissibility (TAD-A..E, BTAR, eight-question gate) → applies to every Phase 2 BTAR
- Plan 1.7 — Source-of-truth system → Phase 2 registries follow the same naming + indexing rules
- Plan 1.8 — Existing backend inventory → V1_CORE classification still authoritative; Phase 2 modifies some V1_CORE files but only under admitted BTARs
- Plan 1.9 — Daily scope enforcement → applies to every Phase 2 PR
- Plan 1.10 — Exception governance (EQS, anti-precedent, sunset, anti-loophole, DI-01..12) → applies to every Phase 2 exception
- Plan 1.11 — P1RR verification → completed; P2-equivalent will be P2RR if needed
- Plan 1.12 — Phase 1 done definition + transition gate → completed via P1TG-002

**Phase 2 BTARs must obey every Phase 1 governance rule.** The freeze does not loosen because Phase 1 closed. The freeze applies to Phase 2 work just as strictly.

---

## 1. Mission and First Principle

### 1.1 Canonical Mission

> **Phase 2 exists to make the active Coinet judgment/chat/AI runtime trustworthy.**

Concretely: the live `/api/chat → produceJudgment → ai-service` path must stop being able to produce user-facing answers that silently detach from structured judgment, hide degradation, fake confidence, or continue past failures as if nothing broke.

### 1.2 The Active Path Today

```text
POST /api/chat/message
  → api/chat/routes.ts (auth + rate-limit middleware)
    → api/chat/controller.ts (Zod validation)
      → api/chat/service.ts (ChatService.sendMessage)
        → buildSignalSnapshot()           (services/judgment/signal-snapshot.ts)
        → produceJudgment()                (services/judgment/index.ts)
        → formatJudgmentForAI()            (services/judgment/debug-view.ts; ASCII stuffing)
        → aiService.analyze()              (services/ai-service.ts; OpenAI client)
      → ChatMessageResponse                (returned to user)
```

### 1.3 The Current Failure Mode (Evidence from BTAR-002 §21.8)

BTAR-002's smoke test revealed concrete failure modes in the active path:

```text
F-1  Chat service reads intentClassification.processingTimeMs
     — but the field is not declared on IntentClassification interface.
     The service consumes undocumented fields from its dependencies.

F-2  Chat service required 27 module mocks to suppress external HTTP
     calls during a service-level test. Coupling is too deep for
     safe future hardening BTARs.

F-3  Silent-continue / silent-fallback pattern:
     chat service logs "❌ CRITICAL: Failed to fetch live context for AI"
     and CONTINUES past the failure, eventually throwing several lines
     later when accessing a property of the failed context.
     The error is not surfaced at the moment of failure.

F-4  Every chat message triggers per-message external API fan-out
     (CoinGecko, alternative.me, RSS aggregators, social services, etc.)
     with no caching, no short-circuit, no fan-out control.
```

These four findings define what Phase 2 must fix.

### 1.4 First Principle of Phase 2

> **A user-facing Coinet AI answer must never pretend structured judgment is available when the structured judgment path is failed, degraded, incomplete, stale, or unavailable.**

This sentence is the core law of Phase 2. Every BTAR-003..008+ traces back to this principle.

### 1.5 The Three Honest States Coinet Must Carry

Coinet must always be able to internally distinguish:

```text
1. What the system KNOWS from successfully-computed structured judgment.
2. What the system PARTIALLY KNOWS under degraded evidence (some sources failed).
3. What the system CANNOT safely claim (judgment failed entirely or is unreliable).
```

This is what separates Coinet from a generic AI crypto chatbot. Generic chatbots emit plausible text regardless of underlying truth state. Coinet must emit answers whose confidence is grounded in observable judgment-system state.

### 1.6 What the First Principle Forbids

- AI answers that present a `confident thesis` while `produceJudgment()` actually threw an error
- AI answers that omit degradation disclosure when external context fetch failed
- AI answers that include recommendation-style language ("you should buy/sell") regardless of judgment state
- AI answers that fabricate evidence or numbers not present in the prompt package
- AI answers that survive silent fallback from structured judgment to "generic AI knowledge"

### 1.7 What the First Principle Allows

- AI answers based on AVAILABLE judgment that explain the structured judgment in natural language
- AI answers based on DEGRADED judgment that explicitly disclose the degradation
- AI answers based on UNAVAILABLE judgment that honestly say "I cannot produce a structured Coinet judgment for this right now"
- AI answers that explain general context as general context, not as structured judgment

---

## 2. In-Scope Phase 2 Surfaces

Phase 2 **may** modify the live judgment/chat/AI trust path. This is a deliberate scope expansion from Phase 1, which forbade V1_CORE modifications.

### 2.1 Primary In-Scope V1_CORE Surfaces

```text
apps/coinet-platform/src/api/chat/service.ts             (V1_CORE SURF-001; CRITICAL)
apps/coinet-platform/src/api/chat/controller.ts          (V1_CORE SURF-003)
apps/coinet-platform/src/api/chat/routes.ts              (V1_CORE SURF-002)
apps/coinet-platform/src/api/chat/types.ts               (V1_CORE SURF-008)
apps/coinet-platform/src/services/judgment/              (V1_CORE SURF-009..019)
apps/coinet-platform/src/services/ai-service.ts          (V1_CORE SURF-020)
apps/coinet-platform/src/services/ai-hallucination-guard.ts  (V1_CORE SURF-021)
apps/coinet-platform/src/services/intent-classifier.ts   (V1_CORE)
apps/coinet-platform/src/services/intent-handlers.ts     (V1_CORE)
apps/coinet-platform/src/services/symbol-detector.ts     (V1_CORE)
apps/coinet-platform/src/services/market-data.ts         (V1_CORE)
apps/coinet-platform/src/api/chat/__tests__/             (V1_SUPPORTING test infra)
```

Every modification to a V1_CORE surface in Phase 2 must:

- Be admitted through a BTAR (Plan 1.6).
- Cite the Plan 1.8 classification of the touched surface in the BTAR.
- Carry CRITICAL risk-if-modified in the BTAR per Plan 1.9 §8.3.
- Include test/proof evidence in the completion proof.
- Be focused (no bundled unrelated cleanup).

### 2.2 Supporting In-Scope Additions (Bounded New Files)

Phase 2 may add new files **only** under approved BTARs, **only** under existing V1_CORE folders, and **only** with names that do not trigger Plan 1.5 sprawl prohibitions:

```text
apps/coinet-platform/src/api/chat/judgment-availability.ts          (NEW helper; BTAR-003)
apps/coinet-platform/src/api/chat/judgment-prompt-package.ts        (NEW helper; BTAR-004)
apps/coinet-platform/src/api/chat/ai-output-safety-gate.ts          (NEW helper; BTAR-005)
apps/coinet-platform/src/api/chat/chat-failure-classifier.ts        (NEW helper; BTAR-006)
apps/coinet-platform/src/api/chat/__tests__/failure-paths.test.ts   (NEW tests; BTAR-007)
```

These names are **conceptual targets**, not pre-approved files. Each must be admitted via its BTAR. Each must follow Plan 1.5 naming rules (no `-v2` / `-final` / `-complete`).

### 2.3 In-Scope Capabilities

The following capabilities are admissible during Phase 2 (each via its own BTAR):

- Judgment availability states (AVAILABLE / DEGRADED / UNAVAILABLE)
- Explicit degraded / unavailable handling in the chat path
- Typed `CoinetJudgmentPromptPackage` replacing ASCII prompt stuffing
- AI output safety / expression gate
- Small chat-service trust seams (bounded extraction, not rewrite)
- Failure-path regression tests
- Minimal internal runtime evidence (trust telemetry, not full L14 calibration)
- External fan-out review and caching where directly required

---

## 3. Out-of-Scope Boundaries

Phase 2 is **not** allowed to become a new architecture wave or a Phase 3 pre-launch. The following remain deferred / blocked:

### 3.1 Plan 1.3 Deferred Areas (Still Deferred)

- NB-001 Strategy Lab backend
- NB-002 Chart Canvas backend
- NB-003 Plugin systems
- NB-004 Experimental agent builders
- NB-005 Full calibration proposal ecosystem
- NB-006 Full CIP.1 unified architecture
- NB-007 Full L13/L14 production migration (bounded reuse remains allowed per Plan 1.4 Legal Work Class D)
- NB-008 Deep paid API integration before purchase
- NB-009 Advanced alert delivery ecosystem
- NB-010 Broad backend cleanup not required for Phase 2

### 3.2 Plan 1.4 Architecture Freeze Still Active

No new L*.X sublayers. No new dormant runtime programs. No new constitutional frameworks. Plan 1.4 FRZ-001..008 unchanged.

### 3.3 Plan 1.5 Sprawl Prohibition Still Active

No new `-v2` / `-final` / `-complete` / `-comprehensive` files. No new parallel scoring / social / news / derivatives engines. The list of prohibited new filenames in Phase 2:

```text
ai-service-v2.ts                  ❌
chat-service-v2.ts                ❌
judgment-engine-final.ts          ❌
chat-service-rewritten.ts         ❌
ai-output-gate-comprehensive.ts   ❌
prompt-package-final.ts           ❌
intent-classifier-v3.ts           ❌
... and so on
```

### 3.4 Real Provider Integration Boundary

Phase 2 does **not** depend on the upcoming paid API purchase. Real APIs will matter later. The execution order is:

```text
1. Trustworthy runtime with controlled/mocked/fake data       (Phase 2 — this phase)
2. Trustworthy runtime with real APIs                          (post-API-purchase, after Phase 3)
3. Advanced production intelligence                            (later phases)
```

**Not the reverse.** Building "real API integration" before Phase 2 closes would invert priorities and re-create the silent-fallback pattern at provider level.

### 3.5 Full Chat-Service Rewrite Prohibited

The chat service (`api/chat/service.ts`, 2124 lines) will be touched in Phase 2 — but **never rewritten wholesale**. Per BTAR-006 §11.3 design law: bounded extraction only, no parallel service file, no replacement implementation. Plan 1.5 CSP-A (in-place improvement) and CSP-B (internal refactor/extraction) are the only allowed patterns. CSP-C (formal replacement) for the entire service would require FRP and is not authorized within Phase 2 mission scope.

### 3.6 Prompt-Package Replacement Is Allowed (but Requires FRP)

The existing `formatJudgmentForAI()` ASCII prompt stuffer IS a candidate for replacement by the typed `CoinetJudgmentPromptPackage`. This requires a Plan 1.5 §8 Formal Replacement Procedure (FRP) — not silent supersession. The FRP must name the old path, name the new path, and define the retirement trigger.

---

## 4. Live Path Target Architecture

### 4.1 Current Weak Shape

```text
buildSignalSnapshot()
  → produceJudgment()
    → formatJudgmentForAI()              [ASCII string stuffing into prompt]
      → aiService.analyze()              [LLM call with weakly-structured prompt]
        → raw AI response returned        [no safety gate; no shape validation]
```

**Problems:**
- Judgment failure can be silently swallowed (F-3 evidence)
- Partial context can be hidden (F-3 + F-4 evidence)
- AI can overstate (no safety gate)
- AI can ignore structure (no enforced contract on AI return shape)
- AI can answer as if structured judgment existed when it did not

### 4.2 Target Phase 2 Shape

```text
buildSignalSnapshot()
  → produceJudgment()
    → resolveJudgmentAvailability()       [classify AVAILABLE / DEGRADED / UNAVAILABLE]
      → buildCoinetJudgmentPromptPackage() [typed, status-carrying, disclosure-bearing]
        → aiService.analyze()              [LLM with structured rules + status pinning]
          → applyAIOutputSafetyGate()      [ALLOW / ALLOW_WITH_WARNINGS / REWRITE / BLOCK]
            → ChatMessageResponse + ChatTrustEvidence [internal trust state preserved]
```

### 4.3 Required Internal State per Response

Every chat response, internally (not necessarily user-visible), must carry:

```ts
interface ChatTrustEvidence {
  judgment_status: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  judgment_duration_ms?: number;
  judgment_failure_reason?: string;
  degraded_components: string[];
  ai_provider_used?: string;
  ai_output_gate_decision?: AIOutputGateDecision;
  fallback_used: boolean;
  degradation_disclosed: boolean;
  policy_version: string;
}
```

This evidence supports later observability, audit, and the Phase 3 synthetic truth suite. Internal first; user-visible projections later.

---

## 5. Judgment Availability States (Required First Phase 2 Feature)

This is the most important Phase 2 capability. Without it, every other Phase 2 piece is built on sand.

### 5.1 Required Type

```ts
type JudgmentAvailabilityState =
  | 'AVAILABLE'
  | 'DEGRADED'
  | 'UNAVAILABLE';
```

### 5.2 State Definitions

**`AVAILABLE`** — Structured judgment completed successfully. All required inputs computed without error. Confidence band trustworthy.

*Allowed user-facing posture:*
> "Coinet's current read is..."
> "The thesis is..."
> "The strongest evidence is..."
> "The main contradiction is..."

**`DEGRADED`** — Structured judgment or supporting context partially failed, timed out, or had missing evidence. Some components succeeded; some did not.

*Allowed user-facing posture:*
> "The available evidence suggests..."
> "This read is degraded because [specific reason]..."
> "Confidence should be treated cautiously because..."

*Required:* explicit degradation disclosure. Cannot be presented as AVAILABLE.

**`UNAVAILABLE`** — Structured judgment failed completely or cannot be trusted (e.g., `produceJudgment()` threw, critical signals missing, judgment output malformed).

*Allowed user-facing posture:*
> "I cannot produce a structured Coinet judgment for this request right now."
> "I can give general context, but I should not present it as Coinet's structured judgment."

*Required:* explicit unavailability disclosure. **Cannot be promoted to DEGRADED or AVAILABLE.**

### 5.3 Required Minimum Fields

```ts
interface JudgmentAvailabilityResult {
  state: JudgmentAvailabilityState;
  reasons: string[];                  // human-readable causes
  failed_components: string[];         // e.g., ["produceJudgment", "market-data"]
  degraded_components: string[];       // e.g., ["news-service", "sentiment-service"]
  can_use_structured_judgment: boolean;
  user_disclosure_required: boolean;
  policy_version: string;
}
```

### 5.4 Non-Negotiable Laws

```text
LAW 1: UNAVAILABLE must never be formatted as AVAILABLE.
LAW 2: DEGRADED must never be silently promoted to AVAILABLE.
LAW 3: AVAILABLE requires positive evidence — absence of failure logs is not sufficient.
LAW 4: state and reasons MUST flow from resolver → prompt package → safety gate → trust evidence.
```

These laws map directly to Plan 1.10 §14.2 DI-01..DI-03 (no removing user-facing safety, no silent fallback, no hiding judgment failures). Phase 2 implementation that violates any of these laws is not admissible.

---

## 6. Prompt / Context Package Replacement

### 6.1 Current Problem

The current bridge from judgment to LLM is too soft:

```text
judgment object → formatJudgmentForAI() → ASCII string → embedded in prompt → LLM interprets freely
```

The LLM is given prose. There is no contract enforcing that the LLM:
- preserve `judgment_status`
- disclose degradation
- avoid recommendations
- avoid fabricated evidence

### 6.2 Target: `CoinetJudgmentPromptPackage`

```ts
interface CoinetJudgmentPromptPackage {
  package_id: string;
  judgment_status: JudgmentAvailabilityState;

  asset_ref?: string;
  user_query: string;

  // Populated only when judgment_status === 'AVAILABLE' or 'DEGRADED'
  state?: string;
  cause?: string;
  thesis?: string;
  contradictions?: string[];
  timing_phase?: string;
  scenario_summary?: string;
  confidence_band?: string;

  // Populated when judgment_status === 'DEGRADED' or 'UNAVAILABLE'
  degradation_reasons: string[];
  required_disclosures: string[];

  // Always populated — defines what the AI may NOT do regardless of state
  forbidden_claims: string[];

  source_refs: string[];
  policy_version: string;
}
```

### 6.3 Required AI Instruction Rules (Embedded in Prompt)

The AI receives, in addition to the package, a fixed instruction block:

```text
You are operating on a CoinetJudgmentPromptPackage. You must:

  1. Explain the package, do not invent beyond it.
  2. Preserve judgment_status — never present an UNAVAILABLE state as AVAILABLE.
  3. Disclose all required_disclosures when judgment_status is DEGRADED or UNAVAILABLE.
  4. Honor every forbidden_claim — these are policy-level, not stylistic.
  5. Do not give financial advice or recommendations ("buy", "sell", "should").
  6. Do not convert confidence_band into certainty.
  7. Do not fabricate sources, prices, percentages, or evidence not in source_refs.
```

### 6.4 Replacement Discipline (Plan 1.5 §8 FRP Required)

Introducing `CoinetJudgmentPromptPackage` and adopting it in `chat/service.ts` replaces the existing `formatJudgmentForAI()` ASCII path. This is a **formal replacement** and requires Plan 1.5 §8 FRP:

```text
Existing canonical path:  services/judgment/debug-view.ts::formatJudgmentForAI()
Proposed replacement:     api/chat/judgment-prompt-package.ts::buildCoinetJudgmentPromptPackage()
Retirement trigger:        After BTAR-005 (output safety gate) lands AND failure-path
                            tests pass AND no chat-path regression observed for one
                            sprint of internal use.
```

The old formatter is **not deleted** during BTAR-004 implementation. It is deprecated and scheduled for removal at the retirement trigger. This obeys Plan 1.5 §8.3 replacement law (named old + named new + named retirement trigger).

---

## 7. AI Output Safety and Expression Gate

### 7.1 Required Behavior

Every AI answer must pass through an output gate **before** user delivery. The gate detects and intervenes on:

```text
Financial recommendation language       ("you should buy/sell", "I recommend")
Guaranteed outcome language              ("will pump", "guaranteed gains")
Unsupported certainty                    ("definitely", "100%", "without question")
Invented evidence                         (numbers/sources not in source_refs)
Contradiction against judgment_status     (asserting AVAILABLE when UNAVAILABLE)
Missing degradation disclosure            (DEGRADED state with no "...because..." clause)
Overconfident phrasing                    (low confidence_band but high-certainty language)
Claims outside the prompt package         (off-topic financial assertions)
```

### 7.2 Required Decision Types

```ts
type AIOutputGateDecision =
  | 'ALLOW'                     // output passes unchanged
  | 'ALLOW_WITH_WARNINGS'        // output passes but warnings logged for review
  | 'REWRITE_REQUIRED'           // output replaced with safe rewrite
  | 'BLOCK_OR_CLARIFY';          // output blocked; user shown a fallback explanation

interface AIOutputSafetyGateResult {
  decision: AIOutputGateDecision;
  violations: string[];           // which rules fired
  rewritten_output?: string;      // populated for REWRITE_REQUIRED
  user_safe_output: string;        // what the user actually sees
  policy_version: string;
}
```

### 7.3 Required Minimum Block / Rewrite Set

The Phase 2 minimum (more rules may be added later, but these are required):

```text
✗ Direct buy/sell instructions             → BLOCK_OR_CLARIFY
✗ Guaranteed profit/loss language          → BLOCK_OR_CLARIFY
✗ Unsupported absolute certainty           → REWRITE_REQUIRED (downgrade to hedge)
✗ Missing UNAVAILABLE disclosure           → REWRITE_REQUIRED (inject disclosure)
✗ Missing DEGRADED disclosure              → REWRITE_REQUIRED (inject disclosure)
✗ Asserting AVAILABLE when UNAVAILABLE     → BLOCK_OR_CLARIFY
```

### 7.4 Examples

**Bad (must be blocked or rewritten):**
> "You should buy SOL now. This will pump."

**Allowed direction (Coinet voice):**
> "Coinet's current read is constructive, but the thesis depends on continued spot demand and no deterioration in liquidity. This is not a recommendation."

**Bad under DEGRADED state:**
> "The thesis is bullish based on strong signals."

**Allowed direction under DEGRADED state:**
> "The available evidence suggests a constructive read, though this assessment is degraded because the social-intelligence signal is missing for this window."

### 7.5 Plan 1.10 DI-01 Hard Pin

Per Plan 1.10 §14.2 DI-01: *"Removing or weakening the user-facing AI output safety gate once deployed under V1-S01."* Once BTAR-005 lands, the gate cannot be weakened or removed by any subsequent BTAR — only enhanced. This is a non-exemptible commitment.

---

## 8. Chat Service Decomposition

### 8.1 The Problem (BTAR-002 Finding F-2)

BTAR-002 smoke test required **27 module mocks** to suppress external HTTP calls during service-level testing. This proves `ChatService.sendMessage` is over-coupled for any future hardening work.

### 8.2 Correct Strategy: Bounded Extraction

Phase 2 reduces coupling through **bounded extraction**, not rewrite.

**Allowed (CSP-A in-place improvement / CSP-B internal refactor):**

```text
✅ Extract judgment availability resolver  → api/chat/judgment-availability.ts
✅ Extract prompt package builder           → api/chat/judgment-prompt-package.ts
✅ Extract output safety gate               → api/chat/ai-output-safety-gate.ts
✅ Extract failure classifier               → api/chat/chat-failure-classifier.ts
✅ Extract external context boundary wrapper (single interface; no per-service mocks needed in tests)
```

**Forbidden (Plan 1.5 sprawl prohibition + Plan 1.10 §14):**

```text
✗ Rewrite chat service                      (full rewrite is CSP-C requiring FRP for entire service)
✗ Create chat-service-v2.ts                 (VSV-A prohibited filename)
✗ Create new orchestration framework        (AFV-D speculative framework)
✗ Delete duplicate systems                  (Plan 1.5 §12 grandfather rule; future canonicalization is separate)
✗ Activate L13/L14 production runtime       (Plan 1.3 NB-007 deferred)
```

### 8.3 Goal: Reduce Test-Burden from 27 → ~3 Mocks

After BTAR-006 bounded extraction lands, the service-level chat smoke test should require only:

```text
1. prisma (DB boundary)
2. ai-service (LLM boundary)
3. external context boundary wrapper (single mock instead of 25 service mocks)
```

This is the testability seam Finding F-2 demanded. Implementation must not change product behavior — only reduce coupling.

### 8.4 Behavior-Preservation Discipline

Every extraction BTAR must include before/after smoke test runs proving the extracted code produces identical observable behavior. If behavior changes, the BTAR is scope-violating (the BTAR was supposed to be extraction, not feature change).

---

## 9. Failure-Path and Regression Tests

### 9.1 Why Phase 2 Needs More Tests Than Phase 1

Phase 1's BTAR-002 added a single happy-path-or-error smoke test. Phase 2 changes V1_CORE behavior — silent fallback removal, judgment availability states, prompt package, output safety gate. Each change can break the active path in subtle ways. Without failure-path coverage, regressions land silently.

### 9.2 Required Test Classes

**A — Judgment failure → UNAVAILABLE**

Simulate `produceJudgment()` throwing or returning malformed output.

Expected:
- `judgment_status === 'UNAVAILABLE'`
- AI response does not pretend structured judgment exists
- `degradation_disclosed === true` OR the response explicitly states inability to produce structured judgment

**B — Partial context failure → DEGRADED**

Simulate one or more external context services failing (news, sentiment, social).

Expected:
- `judgment_status === 'DEGRADED'`
- `degraded_components` contains the failed service names
- Response includes the degradation disclosure

**C — Unsafe AI output → gate blocks/rewrites**

Simulate AI returning text containing "you should buy SOL now".

Expected:
- `ai_output_gate_decision === 'BLOCK_OR_CLARIFY'` or `'REWRITE_REQUIRED'`
- User-facing output does not contain the buy recommendation
- Violation recorded in evidence

**D — Prompt package integrity**

Assert that `CoinetJudgmentPromptPackage` always contains:
- `judgment_status` (one of the three states)
- `forbidden_claims` (always populated)
- `policy_version` (always populated)
- `source_refs` (populated when judgment is AVAILABLE/DEGRADED)
- `required_disclosures` (populated when DEGRADED/UNAVAILABLE)

**E — Silent fallback regression**

Most important. Verify that old silent-fallback behavior cannot return. Specifically:

- When judgment fails, the test verifies the chat service does NOT continue past the failure into "generic AI prose" mode.
- When external context partially fails, the test verifies the chat service does NOT mark the response AVAILABLE.
- A regression that re-introduces silent fallback must fail this test loudly.

### 9.3 Test File Location

```text
apps/coinet-platform/src/api/chat/__tests__/failure-paths.test.ts
```

Follows BTAR-002 precedent and vitest config conventions (`src/**/*.test.ts`).

---

## 10. Observability and Runtime Trust Evidence

### 10.1 What Phase 2 Adds

A minimal `ChatTrustEvidence` object per chat response (defined in §4.3). This is **not** full L14 calibration. It is the minimum runtime evidence needed to answer four questions:

```text
1. Was structured judgment used?      (judgment_status field)
2. Did anything degrade?              (degraded_components / failure_reason)
3. Was degradation disclosed?         (degradation_disclosed boolean)
4. Did the output gate intervene?     (ai_output_gate_decision)
```

### 10.2 Where the Evidence Lives

For Phase 2, evidence is captured per-request and:

- Logged structured (existing logger infrastructure).
- Optionally persisted (small extension to existing chat-audit, NOT full L14 persistence).
- NOT yet projected into a user-visible UI panel (Phase 2 surface is internal-first).

### 10.3 What Observability Is **Not** in Phase 2

```text
✗ Full L14 outcome evaluation (NB-005 deferred)
✗ Full calibration proposal generation (NB-005 deferred)
✗ Real-time monitoring dashboards (Phase 3+ or post-API)
✗ User-facing trust badges (later UI work)
✗ Telegram/email alert delivery infrastructure (NB-009 deferred)
```

Phase 2's evidence is the foundation. Compounding loops come later under their own governance.

---

## 11. Phase 2 BTAR Execution Sequence

Phase 2 executes through a sequence of bounded BTARs. Each requires individual Plan 1.6 admission. Plan 2.0 names the expected sequence but **does not admit any BTAR**.

### 11.1 BTAR-003 — Silent Fallback Removal + Judgment Availability States

**Targets:**
- Finding F-1 (`intentClassification.processingTimeMs` type drift)
- Finding F-3 (silent-continue/fallback pattern)
- Introduce `JudgmentAvailabilityState` (AVAILABLE / DEGRADED / UNAVAILABLE)
- Introduce `resolveJudgmentAvailability()` helper

**Expected outcome:**
- Judgment failure becomes explicit in the response path
- Chat service knows whether judgment is AVAILABLE/DEGRADED/UNAVAILABLE
- Silent-continue pattern eliminated

**Files touched (estimated):**
- `src/api/chat/judgment-availability.ts` (NEW)
- `src/api/chat/service.ts` (V1_CORE modification; remove silent-continue at the documented failure point; add state resolution)
- `src/services/intent-classifier.ts` OR test mocks (F-1 fix — preferred: update consumer side or producer type)

**Plan 1.10 considerations:**
- No exception needed (regular BTAR)
- Plan 1.10 §14.2 DI-02 anchored: "Re-introducing silent fallback ... such that an AI response is emitted while produceJudgment() has failed" — BTAR-003 *eliminates* this; cannot regress it

### 11.2 BTAR-004 — CoinetJudgmentPromptPackage

**Targets:**
- Replace `formatJudgmentForAI()` ASCII stuffing with typed package
- Preserve `judgment_status`, `confidence_band`, `contradictions`, `degradation_reasons`, `forbidden_claims`

**Files touched:**
- `src/api/chat/judgment-prompt-package.ts` (NEW)
- `src/api/chat/service.ts` (V1_CORE modification; switch to new package builder)
- `src/services/judgment/debug-view.ts` (V1_CORE; deprecated, scheduled for removal)

**Plan 1.5 §8 FRP required:**
- Old canonical: `formatJudgmentForAI()`
- New canonical: `buildCoinetJudgmentPromptPackage()`
- Retirement trigger: after BTAR-005 lands + failure tests pass + one sprint of clean internal use

### 11.3 BTAR-005 — AI Output Safety and Expression Gate

**Targets:**
- Add output safety gate that intervenes on unsafe AI output
- Block financial advice language
- Force degradation disclosure
- Prevent unsupported certainty

**Files touched:**
- `src/api/chat/ai-output-safety-gate.ts` (NEW)
- `src/api/chat/service.ts` (V1_CORE; wire gate into response path)

**Plan 1.4 Legal Work Class D:** Bounded reuse of L13.9 safety patterns is allowed. May NOT activate full L13.9 runtime; only borrow the rule patterns into the new helper.

**Plan 1.10 DI-01 hard pin:** Once this gate lands, it cannot be weakened or removed by any subsequent BTAR.

### 11.4 BTAR-006 — Bounded Chat Service Extraction

**Targets:**
- Reduce 27-mock test surface (Finding F-2)
- Extract trust-critical seams introduced by BTAR-003..005
- Add a single "external context boundary" wrapper to consolidate the 25 intelligence-service mocks

**Files touched:**
- `src/api/chat/chat-failure-classifier.ts` (NEW)
- New "external context boundary" wrapper file (name TBD by implementer; bounded)
- `src/api/chat/service.ts` (V1_CORE; refactor to use extracted seams; no behavior change)

**Behavior-preservation discipline (§8.4):** Before/after smoke tests must show identical observable behavior. Any behavior change is a scope violation.

### 11.5 BTAR-007 — Failure-Path Test Suite

**Targets:**
- Implement test classes A–E (§9.2)
- Establish regression coverage for Phase 2 V1_CORE changes

**Files touched:**
- `src/api/chat/__tests__/failure-paths.test.ts` (NEW)
- Possibly `src/api/chat/__tests__/fixtures/` (NEW; bounded)

**Plan 1.6 §16.2 cleanup admissibility:** any extracted test helpers must directly enable admitted test classes; no broad test framework redesign.

### 11.6 BTAR-008 — External Fan-Out Reliability Review

**Targets:**
- Finding F-4: map per-message external API fan-out
- Identify which calls can be cached
- Identify which failures should trigger DEGRADED state
- Identify which calls should be made optional (skip on slow/failure)

**Files touched (estimated):**
- `src/services/market-data.ts`, `src/services/sentiment-service.ts`, `src/services/news-service.ts`, etc. (V1_CORE; add caching / failure-degradation hooks where indicated)
- New caching helper if needed (single bounded file)

**Boundary:** BTAR-008 may map and patch obvious fan-out wins. It may **not** become a full caching framework or queue infrastructure. Scope must remain bounded; broader fan-out engineering belongs in a post-Phase-2 capacity-planning effort.

**Plan 1.3 NB-008 still active:** No real provider integration (no provider adapter wiring); only caching/short-circuit/skip logic for existing call sites.

### 11.7 BTAR-008 May Be Deferred

Per §12 done definition, BTAR-008 (external fan-out review) is the only BTAR in the sequence that may legitimately be **deferred** to a post-Phase-2 effort, provided:

- Findings F-1, F-2, F-3 are fully resolved by BTAR-003..006
- BTAR-007 failure-path tests pass
- Phase 2 transition gate (P2TG-001) explicitly notes BTAR-008 as deferred with a reassessment trigger

If BTAR-008 is deferred, F-4 carries forward into a post-Phase-2 backlog. This is the only acceptable scope reduction within Phase 2.

---

## 12. Phase 2 Done Definition

### 12.1 Canonical Done Definition

Phase 2 is complete only when the live chat/judgment/AI path can prove:

```text
✅ Judgment failures are never silent.
✅ Every response has an internal judgment availability state.
✅ Partial evidence produces DEGRADED behavior with disclosure.
✅ Unavailable judgment produces UNAVAILABLE behavior with disclosure.
✅ The AI prompt receives a typed CoinetJudgmentPromptPackage.
✅ The AI output is safety/expression gated.
✅ Unsafe recommendations are blocked or rewritten.
✅ Failure paths are tested (classes A–E from §9.2).
✅ The BTAR-002 chat-path smoke test remains green.
✅ pnpm check:backend remains green.
✅ No new service sprawl introduced (no -v2 / -final / -complete files).
✅ No deferred Phase 3 / API / CIP scope started.
✅ Chat service mock burden reduced from 27 → ~3 (or documented why deferred).
```

### 12.2 Required Completed BTARs

For Phase 2 to be considered done:

| BTAR     | Required for done? | Findings addressed |
| -------- | ------------------ | --- |
| BTAR-003 | **Required**        | F-1, F-3, judgment availability states |
| BTAR-004 | **Required**        | typed prompt package (with FRP) |
| BTAR-005 | **Required**        | AI output safety gate |
| BTAR-006 | **Required**        | F-2 testability seam |
| BTAR-007 | **Required**        | failure-path test suite |
| BTAR-008 | Optional/deferable  | F-4 external fan-out |

A Phase 2 done state with BTAR-008 deferred is acceptable provided F-4 is honestly carried forward (per §11.7).

### 12.3 Required Validation Commands at P2TG-001

```text
$ pnpm check:backend                                                          → exit 0
$ pnpm --dir apps/coinet-platform vitest run src/api/chat/__tests__/         → all tests pass
$ pnpm --dir apps/coinet-platform vitest run src/api/chat/__tests__/failure-paths.test.ts  → all test classes A–E pass
```

---

## 13. Phase 2 Transition Gate (P2TG-001)

At the end of Phase 2, create:

```text
apps/coinet-platform/docs/backend-v1/phase-2/records/decisions/P2TG-001-phase-2-transition-gate.md
```

### 13.1 Expected P2TG-001 Checks

```text
[ ] BTAR-003 COMPLETED (silent fallback removal + judgment availability)
[ ] BTAR-004 COMPLETED (prompt package + FRP for ASCII formatter)
[ ] BTAR-005 COMPLETED (AI output safety gate; DI-01 anchored)
[ ] BTAR-006 COMPLETED (bounded chat-service extraction; mock burden reduced)
[ ] BTAR-007 COMPLETED (failure-path test classes A–E)
[ ] BTAR-008 COMPLETED or explicitly deferred with reassessment trigger
[ ] pnpm check:backend exits 0
[ ] BTAR-002 chat smoke test still passes
[ ] All BTAR-007 failure-path tests pass
[ ] No architecture sprawl introduced (Plan 1.4)
[ ] No version sprawl introduced (Plan 1.5)
[ ] No deferred Plan 1.3 areas activated (NB-001..NB-010 still deferred)
[ ] Registries synchronized
[ ] Exception budget healthy (Phase 2 consumption within Plan 1.10 §12.2 allocation)
[ ] All Plan 1.10 DI-01..DI-12 still preserved
```

### 13.2 Expected Decision

```text
P3-READY  (Phase 3 — Backend Judgment Truth Suite — unlocks)
```

### 13.3 What Phase 3 Will Be

Phase 3 builds the synthetic judgment truth suite (BTAR-Phase-3 series): a controlled-input test harness that asserts Coinet's judgment engine produces semantically correct outputs across known synthetic scenarios. Phase 3 is the final pre-API stabilization. After Phase 3, the deep-API integration boundary (NB-008) becomes reassessable for the first time.

Phase 3 is **not** in scope for this plan. Plan 2.0 only points to it.

---

## 14. Cross-Plan Compliance Summary

| Plan | Phase 2 compliance |
| --- | --- |
| 1.1 | Production-convergence mission still applies; Phase 2 advances it. |
| 1.2 | V1-S01 (AI Chat) and V1-S02 (Asset Judgment) are the primary Phase 2 surfaces; all six v1 surfaces remain in scope. |
| 1.3 | NB-001..NB-010 deferred areas remain deferred; carve-outs (NB-007 bounded reuse) follow Plan 1.4 Legal Work Class D. |
| 1.4 | Architecture freeze active; no new L*.X; bounded L13.9 reuse for BTAR-005 is the only Legal Class D invocation. |
| 1.5 | Sprawl prohibition active; prompt-package replacement requires FRP; chat-service extraction is CSP-B (internal refactor), not CSP-C (full replacement). |
| 1.6 | Every Phase 2 BTAR goes through eight-question gate + BTAR template. |
| 1.7 | Phase 2 registries follow Plan 1.7 §6.3 directory pattern under `phase-2/`. Indexing rule applies. |
| 1.8 | Plan 1.8 inventory still authoritative; Phase 2 V1_CORE modifications are admitted under specific BTARs. |
| 1.9 | Daily enforcement applies to every Phase 2 PR (scope compliance block, V1_CORE caution, anti-Trojan-Horse discipline). |
| 1.10 | Exception governance applies (EQS scoring; DI-01..12 preserved; anti-loophole filter active). |
| 1.11 | P1RR-001 PASS preserved; if Phase 2 governance is materially altered, a P2RR may be filed. |
| 1.12 | P1TG-002 P2-READY decision authorized Phase 2 start; P2TG-001 will close Phase 2. |

---

## 15. Phase 2 Governance Artifacts

### 15.1 Created by Plan 2.0 (This Document)

```text
docs/backend-v1/phase-2/phase-2-general-plan-live-judgment-chat-ai-trust.md   (this file)
docs/backend-v1/phase-2/registries/phase-2-btar.registry.md
docs/backend-v1/phase-2/registries/phase-2-findings.registry.md
docs/backend-v1/phase-2/registries/phase-2-risk.registry.md
docs/backend-v1/phase-2/registries/phase-2-transition-gate.registry.md
docs/backend-v1/phase-2/records/backend-task-admission-records/         (folder)
docs/backend-v1/phase-2/records/decisions/                              (folder)
```

### 15.2 Inherited from Phase 1 (Still Authoritative)

All Phase 1 registries continue to apply. New Phase 2 BTARs are recorded in:
- `phase-2/registries/phase-2-btar.registry.md` (Phase 2 BTAR-specific)
- `phase-1/registries/backend-v1-record-index.registry.md` (master index — append Phase 2 records here too)
- `phase-1/registries/backend-v1-decision-log.registry.md` (decision log — append Phase 2 decisions)

This dual-indexing keeps the master index complete while letting Phase 2 have its own focused registry.

### 15.3 Phase 2 Exception Budget (Plan 1.10 §12.2)

```text
AFE+VSE+SCR:    3 combined  (max combined exceptions across all freeze types)
FRP:            6           (canonicalization budget — BTAR-004 will use one)
BSCP:           3           (bounded shadow comparison)
UDF:            Unlimited if §17.2-qualifying
```

The first expected exception consumption: BTAR-004's FRP for `formatJudgmentForAI()` retirement.

---

## 16. Done Definition for Plan 2.0 Itself

Plan 2.0 (this document) is complete when:

> **Coinet Backend v1 has a repo-resident Phase 2 master execution constitution that defines the Phase 2 mission (live-path trustworthiness), first principle (no faking structured judgment), in-scope and out-of-scope surfaces, target runtime architecture, judgment availability states, typed prompt package, AI output safety gate, bounded chat-service decomposition, failure-path test discipline, runtime trust evidence, BTAR execution sequence (BTAR-003..008), done definition, and the P2TG-001 transition gate criteria; and has created the four Phase 2 registries (BTAR, findings, risk, transition gate) initialized with the four BTAR-002 findings (F-1..F-4).**

This file plus the four registries (created alongside it) satisfy that definition once accepted.

---

## 17. Final Production Formulation

**Plan 2.0 establishes Phase 2 as the live-path trust hardening phase of Coinet backend v1. Its mission is to make the active judgment/chat/AI runtime trustworthy enough that user-facing responses can no longer silently detach from structured judgment, hide degradation, fake confidence, or continue as if nothing broke. It defines the in-scope live path, out-of-scope boundaries, target runtime architecture, judgment availability states, typed prompt package, AI output safety gate, bounded chat-service decomposition, failure-path tests, runtime trust evidence, BTAR execution sequence (BTAR-003..008), and done definition. Phase 2 is not full CIP.1, not real API integration, not Strategy Lab, not Chart Canvas, and not broad cleanup. It is the phase where Coinet's live product path becomes honest under failure, explicit under degradation, and safe in user-facing expression. Phase 1's governance (Plans 1.1–1.12) governs Phase 2 unchanged: every BTAR must pass the eight-question gate, every freeze remains active, every Decision-Impossibility is preserved, every anti-loophole pattern is defended against. Phase 3 (Backend Judgment Truth Suite) remains gated behind Phase 2 completion via P2TG-001.**

---

## 18. Acceptance Block

```text
Plan 2.0 — Phase 2 General Plan: Live Judgment / Chat / AI Trust — Acceptance

Accepted by: ____________________________
Role:        Backend program owner
Date:        2026-05-23

I confirm:
  [ ] I have read this plan in full.
  [ ] I accept the §1.4 first principle (no faking structured judgment).
  [ ] I accept the §2 in-scope surfaces and §3 out-of-scope boundaries.
  [ ] I accept the §4 target runtime architecture.
  [ ] I accept the §5 judgment availability states (AVAILABLE/DEGRADED/UNAVAILABLE)
      and the four non-negotiable laws in §5.4.
  [ ] I accept the §6 CoinetJudgmentPromptPackage and the §6.4 FRP requirement
      for replacing the existing ASCII formatter.
  [ ] I accept the §7 AI output safety gate and the §7.5 DI-01 hard pin.
  [ ] I accept the §8 bounded chat-service decomposition (no rewrite, no v2 file).
  [ ] I accept the §9 failure-path test classes A–E.
  [ ] I accept the §10 runtime trust evidence scope (minimum-viable, not full L14).
  [ ] I accept the §11 BTAR execution sequence (BTAR-003..008) and that each
      requires its own Plan 1.6 admission.
  [ ] I accept the §12 done definition and §13 P2TG-001 transition gate criteria.
  [ ] I accept that Phase 2 governance is Phase 1 governance (Plans 1.1–1.12);
      no rule loosens because Phase 1 closed.
  [ ] I accept that Plan 2.0 does NOT admit any specific BTAR — admission is
      a separate Plan 1.6 process per BTAR.
```

Once accepted, the `Status` field is authoritative. Until accepted, treat this document as DRAFT.

---

*Plan 2.0 is the Phase 2 constitution. The first concrete Phase 2 governance action is the admission of BTAR-003 (silent fallback removal + judgment availability states) — the most important brick because every other Phase 2 capability builds on it.*

*Phase 1 closed by passing four BTARs without breaking any rule. Phase 2 begins under the same discipline.*
