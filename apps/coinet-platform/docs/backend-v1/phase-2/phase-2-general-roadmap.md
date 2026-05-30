# Plan 2.0 — Phase 2 General Roadmap

Status: ACTIVE
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Purpose: Master roadmap and anti-sprawl control document
Created: 2026-05-25
Last Updated: 2026-05-25
Owner: Backend program owner

Relationship to existing files:
- This roadmap is the **master navigation document** of Phase 2.
- The pre-existing `phase-2-general-plan-live-judgment-chat-ai-trust.md` remains the **detailed execution constitution** (Plan 2.0, original form). It is not superseded; it is the long-form companion to this roadmap. Where the two overlap (mission, first principle, BTAR sequence), the roadmap is the canonical entry point and the long-form companion provides the underlying detail.
- Plans 2.1, 2.2, 2.3 remain the Level-2 governance documents (mission/first principle, in-scope surfaces, out-of-scope boundaries).
- Implementation records (BTAR-003 completed; BTAR-004..008 remaining) populate the BTAR registry.

---

## 0. Document Identity

> **This document is the master map for Phase 2. It does not create new work beyond the already defined Phase 2 mission. It organizes the already accepted Phase 2 boundaries and the remaining BTAR sequence.**

What this document is:
- A 12-section map of Phase 2.
- A status board for what is done, what remains, and what is forbidden.
- An anti-sprawl control to prevent unnecessary Plan 2.4 / 2.5 / 2.6 governance documents.

What this document is **not**:
- Not a new BTAR.
- Not a new architecture.
- Not a new constitutional layer.
- Not an admission of any pending BTAR.
- Not a modification of any source file.

---

## 1. Phase 2 Mission

> **Phase 2 exists to make Coinet's active judgment/chat/AI runtime trustworthy enough that user-facing AI responses can no longer silently detach from structured judgment, fake confidence, hide degradation, or continue as if nothing broke.**

### 1.1 The Active Runtime Path Phase 2 Governs

```text
/api/chat
  → api/chat/service.ts
    → buildSignalSnapshot()
    → produceJudgment()
    → formatJudgmentForAI()         (to be replaced by BTAR-004)
    → aiService.analyze()
  → user-facing response
```

### 1.2 Constitutional Posture

```text
Phase 2 hardens this path.
Phase 2 does not replace this path with full L13/L14.
```

L13 (FROZEN_LIVE) and L14 (ARCHITECTURE_COMPLETE) remain frozen and authoritative for what they are. Phase 2 builds bounded trust seams around the live path; it does not migrate the live product onto certified L13/L14 runtime (NB-007 remains deferred).

---

## 2. Phase 2 First Principle

> **The user-facing AI response must never pretend structured judgment exists when the structured judgment path failed, degraded, timed out, or became unavailable.**

### 2.1 The Three User-Facing Truth Classes

```text
1. What Coinet KNOWS from successfully-computed structured judgment.
2. What Coinet can INFER WITH LIMITATIONS under degraded evidence.
3. What Coinet CANNOT SAFELY CLAIM right now (judgment failed or is unreliable).
```

Every chat turn must internally resolve to exactly one of these three classes. The class drives the AI prompt context, the safety gate decision, and the user-visible disclosure shape.

---

## 3. Phase 2 Scope Envelope

The Phase 2 scope envelope is **closed**:

| Plan | Role | Status |
| --- | --- | --- |
| Plan 2.1 | Mission / why | ACTIVE |
| Plan 2.2 | In-scope surfaces / where | ACTIVE |
| Plan 2.3 | Out-of-scope boundaries / forbidden | ACTIVE |

> **Further Plan 2.x documents are not expected unless a major missing cross-cutting rule is discovered.** See §13 (Anti-Sprawl Rule).

---

## 4. The 12-Section Phase 2 Map

| § | Section | Meaning | Current Status |
| --- | --- | --- | --- |
| 1 | Mission and first principle | Why Phase 2 exists | Covered by **Plan 2.1** |
| 2 | In-scope surfaces | Where Phase 2 may operate | Covered by **Plan 2.2** |
| 3 | Out-of-scope boundaries | What Phase 2 must not become | Covered by **Plan 2.3** |
| 4 | Live path target architecture | Target shape for trusted runtime | Defined in this roadmap (§5) |
| 5 | Judgment availability states | AVAILABLE / DEGRADED / UNAVAILABLE | Implemented by **BTAR-003** (COMPLETED) |
| 6 | Prompt / context package replacement | Typed judgment package | Remaining: **BTAR-004** |
| 7 | AI output safety gate | Final answer safety/expression check | Remaining: **BTAR-005** |
| 8 | Chat service decomposition | Bounded trust-critical extraction | Remaining: **BTAR-006** |
| 9 | Failure-path regression tests | Durable test coverage | Remaining: **BTAR-007** |
| 10 | Runtime evidence / fan-out review | Minimal trust evidence + API fan-out review | Remaining: **BTAR-008** |
| 11 | BTAR sequence | Execution order | Locked in this roadmap (§7) |
| 12 | Done definition / transition | Phase 2 close criteria | **P2TG-001** later (§14, §15) |

**This table is the canonical Phase 2 status board.**

---

## 5. Live Path Target Architecture

### 5.1 Current Weak Shape

```text
produceJudgment()
  → formatJudgmentForAI()       [text/ASCII prompt stuffing]
    → aiService.analyze()        [LLM call with weakly-structured prompt]
      → user-facing response     [no safety gate; no enforced output contract]
```

Weaknesses (addressed in BTAR-003 only at the judgment-failure site; remaining sites listed in §7):
- Failure can be silently swallowed (was F-3; resolved at the judgment site by BTAR-003).
- Partial context can be hidden (F-3 + F-4).
- AI can overstate (no safety gate — BTAR-005).
- AI can ignore structure (no enforced contract on AI return shape — BTAR-005).
- AI can answer as if structured judgment existed when it did not (F-3 silent fallback — closed at judgment site by BTAR-003).

### 5.2 Target Phase 2 Shape

```text
buildSignalSnapshot()
  → produceJudgment()
    → classify judgment availability             [BTAR-003 — DONE]
      → build CoinetJudgmentPromptPackage         [BTAR-004 — REMAINING]
        → aiService.analyze()                      [bounded by typed package]
          → apply AI output safety/expression gate [BTAR-005 — REMAINING]
            → response with explicit trust state
```

### 5.3 Required Internal Trust Facts

```text
judgment_status:           AVAILABLE | DEGRADED | UNAVAILABLE
judgment_source:           structured | partial | unavailable
degradation_reason:        optional
allowed_expression_level:  full | cautious | limited | refusal/clarification
```

> This does not mean every field must be exposed to the frontend. It means the backend must know the truth internally.

The seven-field internal `ChatTrustEvidence` cap defined in Plan 2.2 §15 still governs telemetry surface.

---

## 6. Completed Work

### 6.1 BTAR-003 — Silent Fallback Removal + JudgmentAvailabilityState — COMPLETED (2026-05-24)

What it achieved:

```text
JudgmentAvailabilityState created.
AVAILABLE / DEGRADED / UNAVAILABLE contract exists.
produceJudgment failure now creates UNAVAILABLE context.
Silent fallback at the judgment-engine site resolved.
pnpm check:backend passes.
availability tests pass (25/25).
chat smoke test still passes (2/2).
```

### 6.2 Open Findings After BTAR-003

```text
F-1   STILL_OPEN  (intentClassification.processingTimeMs type mismatch in production code; mocked in tests only)
F-2   STILL_OPEN  (27-mock chat-service coupling; BTAR-006 target)
F-3   RESOLVED    (at the judgment-engine site; other silent-continue sites in service.ts remain)
F-4   STILL_OPEN  (per-message external fan-out; BTAR-008 target)
F-5   OPEN        (integration-level failure-path oracle limited by F-2 27-mock cascade; helper unit tests are definitive)
```

---

## 7. Remaining BTAR Sequence

Locked execution order:

```text
BTAR-004 — CoinetJudgmentPromptPackage
BTAR-005 — AI Output Safety / Expression Gate
BTAR-006 — Bounded Chat Service Extraction
BTAR-007 — Failure-Path Regression Suite
BTAR-008 — Runtime Trust Evidence + External Fan-Out Review
P2TG-001 — Phase 2 Transition Gate
```

> **These are implementation tasks, not new Plan 2.x governance documents.**

Each BTAR must pass the Plan 1.6 eight-question gate, satisfy the Plan 2.2 §11 Surface Boundary Mapping, satisfy the Plan 2.3 §25 Q1..Q5 OOS check, and carry the mandatory Plan 2.1 §6.2 mission-trace fields before becoming ACTIVE. No BTAR below is admitted by this roadmap.

---

## 8. BTAR-004 Summary

**Purpose.** Replace fragile text/ASCII judgment stuffing with a typed `CoinetJudgmentPromptPackage`.

**Required companion record.**

```text
FRP-001 — formatJudgmentForAI to CoinetJudgmentPromptPackage
```

FRP is required under Plan 1.5 §8 because this is a Formal Replacement of an existing production surface. Default exception outcome (per Plan 2.3 §26.3) is DENY/DEFER; the FRP must prove production necessity, minimality, time bound, rollback path, and no safer alternative.

**Must not:**

```text
create ai-service-v2
migrate L13/L14
rewrite chat service
change frontend
```

**Primary surfaces (per Plan 2.2):** P2-S09 (new prompt-package files), P2-S01 (bounded service.ts change at the prompt-assembly site), P2-S08 (new tests). FRP record path: `phase-2/records/formal-replacements/FRP-001-formatjudgmentforai-to-coinet-judgment-prompt-package.md`.

---

## 9. BTAR-005 Summary

**Purpose.** Check AI output before user delivery.

**Detected violations.**

```text
financial advice language
unsupported confidence
missing degradation disclosure
invented evidence
claiming governed judgment when judgment is unavailable
```

**Decisions.**

```text
ALLOW
ALLOW_WITH_WARNINGS
REWRITE_REQUIRED
BLOCK_OR_CLARIFY
```

**Primary surfaces (per Plan 2.2):** P2-S11 (new safety-gate files), P2-S04 (bounded ai-service.ts touch at the post-LLM site; preferred to avoid until safety gate is added), P2-S08 (new tests).

Closes Plan 2.1 §7 TF-005 (fabricated evidence) and TF-006 (recommendation creep).

---

## 10. BTAR-006 Summary

**Purpose.** Reduce the 27-mock problem (F-2 + F-5) through bounded trust-critical extraction.

**Allowed extractions.**

```text
judgment availability resolver        (carry from BTAR-003)
prompt package builder                 (carry from BTAR-004)
AI output finalizer                    (carry from BTAR-005)
failure classifier
context boundary wrapper
```

**Forbidden.**

```text
chat-service-v2.ts
full rewrite
new runtime
broad cleanup
```

**Primary surfaces (per Plan 2.2):** P2-S01 (bounded service.ts decomposition), P2-S12 (failure classifier + context boundary files), P2-S08 (new tests).

---

## 11. BTAR-007 Summary

**Purpose.** Create durable failure-path regression tests.

**Must cover.**

```text
judgment engine failure
empty judgment result
degraded context
unsafe AI output
prompt package integrity
no real provider calls
```

**Primary surface (per Plan 2.2):** P2-S08 only (test files). Production code untouched.

This is also the BTAR where the F-5 integration-level oracle gap is intended to close, because the F-2 27-mock cascade should be resolved (or substantially reduced) by BTAR-006 first.

---

## 12. BTAR-008 Summary

**Purpose.** Add minimal runtime trust evidence and review external API fan-out.

**Allowed trust facts** (capped per Plan 2.2 §15):

```text
judgment_status
judgment_duration_ms
judgment_failure_reason
ai_provider_used
safety_gate_result
fallback_used
degradation_disclosed
policy_versions
```

**Fan-out review must answer:**

```text
what is called per chat message
what is required
what is optional
what should degrade
what should be cached later
what should not block response
```

**Primary surfaces (per Plan 2.2):** P2-S07 (market-data + context fetchers, bounded), P2-S01 (bounded telemetry-capture in service.ts), P2-S08 (new tests).

Per Plan 2.0 §11.7, BTAR-008 is optional/deferable. If deferred, the deferral must be recorded with a reassessment trigger.

---

## 13. Anti-Sprawl Rule

> **No Plan 2.4, Plan 2.5, Plan 2.6, or further Phase 2 governance document may be created unless a future BTAR exposes a major missing rule that affects multiple remaining Phase 2 tasks and cannot be handled inside the BTAR itself.**

### 13.1 Decision Filter

```text
Normal implementation need              → BTAR
Major missing cross-cutting rule        → possible Plan 2.4 (rare)
```

### 13.2 Worked Examples

| Discovered Need | Correct Vehicle |
| --- | --- |
| Need to build prompt package | **BTAR-004** (not Plan 2.4) |
| Need to build safety gate | **BTAR-005** (not Plan 2.5) |
| Need to fix a single silent-continue site elsewhere in service.ts | New BTAR (e.g., BTAR-009) — not a new plan |
| Need to clarify output-safety policy across multiple remaining tasks AND it cannot be expressed inside any single BTAR | **Possible Plan 2.4** (only if unavoidable; default decision is "fit it in a BTAR") |
| Need to fix F-1 in production | BTAR (bounded intent-classifier touch) — not a new plan |
| Need to fix F-4 fan-out | **BTAR-008** — not a new plan |

### 13.3 Burden of Proof

A proposer of any Plan 2.4+ must demonstrate:

1. The rule is cross-cutting across ≥2 remaining BTARs.
2. The rule cannot honestly fit inside any single BTAR's scope.
3. The rule is not duplicative of Plan 2.1 / 2.2 / 2.3 content.
4. The Plan 1.10 exception governance has been consulted.

Default outcome on a Plan 2.4 proposal: **DEFER and propose as BTAR instead**.

---

## 14. Phase 2 Done Definition

Phase 2 is complete only when **all** of the following hold:

```text
BTAR-003 completed                                      ✅ (2026-05-24)
BTAR-004 completed
BTAR-005 completed
BTAR-006 completed
BTAR-007 completed
BTAR-008 completed OR explicitly deferred with rationale
pnpm check:backend exits 0
chat smoke test exits 0
failure-path tests exit 0
judgment failures are never silent
every response path has judgment availability status
prompt package is typed
AI output is safety-gated
degraded/unavailable states are disclosed
minimal trust evidence exists
no new service sprawl occurred
no full L13/L14 migration occurred
no real API dependency is required for tests
```

When all are true, **P2TG-001** is filed under `phase-2/records/decisions/P2TG-001-phase-2-transition-gate.md` per Plan 2.0 §12.

---

## 15. Transition to Phase 3

```text
Phase 3 begins only after P2TG-001 returns P3-READY.
```

**Phase 3 meaning.**

```text
Backend Judgment Truth Suite
15–25 synthetic episodes
semantic correctness tests
controlled fake data
no real API dependency required
```

Phase 3 is **not** real-API integration. Real-API integration is a separate later phase. Per Plan 2.3 §23 (API Boundary Doctrine):

```text
1. Controlled fake data            (Phase 2 — current)
2. Controlled degraded states      (Phase 2 — current)
3. Controlled failure paths        (Phase 2 — current)
4. Trustworthy response behavior   (Phase 2 done)
5. Synthetic Truth Suite           (Phase 3)
6. Real API integration            (post-Phase 3, separately planned)
```

---

## 16. Acceptance

```text
Plan: 2.0 — Phase 2 General Roadmap
Status: ACTIVE
Effective: 2026-05-25
Authority: P1TG-002 (P2-READY); Plan 2.0 master constitution; Plans 2.1, 2.2, 2.3
Inheritance audit: Plans 1.1–1.12 ACTIVE/COMPLETED; Plans 2.0 (long-form), 2.1, 2.2, 2.3 ACTIVE; BTAR-003 COMPLETED
Authorizes: nothing implementational; documentation-clarity only
Does not authorize: BTAR-004; FRP-001; any code change; any new Plan 2.x document
Default decision on new Plan 2.x proposal: DEFER → propose as BTAR instead (§13)
Next admissible step: BTAR-004 admission plan (CoinetJudgmentPromptPackage; FRP-001 required)
```

---

## 17. Quick Navigation

| You want to know… | Read |
| --- | --- |
| Why does Phase 2 exist? | §1; Plan 2.1 |
| What is the first principle? | §2; Plan 2.1 §2.1 |
| What surfaces can Phase 2 touch? | Plan 2.2 §§5–7 |
| What is out of scope? | Plan 2.3 §§4–22 |
| What is the target runtime shape? | §5 |
| What's been done? | §6 |
| What's left? | §7 |
| Should I write a new Plan 2.4? | §13 (almost certainly no — propose a BTAR) |
| When is Phase 2 done? | §14 |
| What comes after Phase 2? | §15 |

---

*Plan 2.0 — Phase 2 General Roadmap ends here. The next real backend move is BTAR-004 — CoinetJudgmentPromptPackage.*
