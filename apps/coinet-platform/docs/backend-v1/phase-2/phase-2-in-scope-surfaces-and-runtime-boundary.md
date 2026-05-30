# Plan 2.2 — In-Scope Phase 2 Surfaces and Runtime Boundary

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Document Type: Phase Surface Boundary Authority
Created: 2026-05-23
Last Updated: 2026-05-23
Owner: Backend program owner

Depends On:
- P1TG-002 — Phase 2 Unlock (ACCEPTED, 2026-05-23)
- Plan 2.0 — Phase 2 General Plan (ACTIVE)
- Plan 2.1 — Mission and First Principle (ACTIVE)
- Plan 2.3 — Out-of-Scope Boundaries (ACTIVE)
- Plan 1.6 — Task Admissibility Framework (ACTIVE)
- Plan 1.8 — Existing Backend Surface Inventory (ACTIVE; V1_CORE / V1_SUPPORTING classification)
- Plan 1.9 — Daily Scope Enforcement (ACTIVE)
- Plan 1.10 — Exception and Scope-Change Procedure (ACTIVE)

Authority level: **Every Phase 2 BTAR must map every touched file to this boundary.**

---

## 0. Required Artifact and Companion Updates

### 0.1 Required Artifact

This document at:

```text
apps/coinet-platform/docs/backend-v1/phase-2/phase-2-in-scope-surfaces-and-runtime-boundary.md
```

### 0.2 Companion Registry

```text
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-surface-boundary.registry.md
```

### 0.3 Updates To Existing Registries

```text
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-record-index.registry.md
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-decision-log.registry.md
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md   (cross-phase indexing)
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md   (cross-phase indexing)
```

### 0.4 What This Plan Is Not

Plan 2.2 is **not** a BTAR. It admits no BTAR (BTAR-003 remains pre-admission). It changes zero source files under `apps/coinet-platform/src/**`. It opens no Plan 1.3 NB-* area. It does not loosen Plan 1.4 / 1.5 / 1.9 / 1.10 / 2.3. It is governance only.

---

## 1. Document Identity

### 1.1 Position In the Phase 2 Plan Hierarchy

```text
Phase 2 master execution constitution           → Plan 2.0
Phase 2 mission and first principle (positive)  → Plan 2.1
Phase 2 in-scope surfaces and runtime boundary  → Plan 2.2   ← this document
Phase 2 out-of-scope boundaries (negative)      → Plan 2.3
Phase 2 procedural / verification plans         → Plan 2.4+ (future)
```

### 1.2 Why Plan 2.2 Was Filed After Plan 2.3

Plan 2.3 was filed earlier on 2026-05-23 to lock the negative scope first. Plan 2.2 is filed second on the same day to lock the **positive** counterpart. Conceptually they are siblings: Plan 2.2 declares **where** Phase 2 may operate, Plan 2.3 declares **what** Phase 2 must not become. Together they close the scope envelope.

The numerical ordering (2.1 → 2.3 → 2.2) reflects filing chronology, not authority. In the Phase 2 hierarchy both are Level-2 governance documents and neither overrides the other. Where they intersect on a specific surface, Plan 2.3 wins on negative-scope adjudication (already established at Plan 2.3 §1.2) and Plan 2.2 wins on positive-touch adjudication.

### 1.3 Authority Level

Level 2 (Phase Plan) — same tier as Plans 2.1 and 2.3; subordinate to Plan 2.0.

### 1.4 Authority Sentence

> **Every Phase 2 BTAR must map every touched file to this boundary.**

A BTAR whose Surface Boundary Mapping section (§11) is absent, incomplete, or contradicted by its actual diff is **inadmissible** under Plan 1.6 and **non-mergeable** under Plan 1.9.

### 1.5 Inheritance Audit (at Adoption)

| Upstream artifact | Required status | Status at 2026-05-23 |
| --- | --- | --- |
| Plans 1.1..1.10 | ACTIVE | ACTIVE |
| Plan 1.11 | COMPLETED | COMPLETED (P1RR-001) |
| Plan 1.12 | COMPLETED | COMPLETED (P1TG-002 P2-READY) |
| Plan 2.0 | ACTIVE | ACTIVE |
| Plan 2.1 | ACTIVE | ACTIVE |
| Plan 2.3 | ACTIVE | ACTIVE |

All upstream statuses satisfied. Plan 2.2 is admissible.

---

## 2. Constitutional Purpose

### 2.1 Authority Sentence (Canonical)

> **Plan 2.2 exists to define the exact backend surfaces Phase 2 may touch while hardening the live judgment/chat/AI path, so implementation can improve production trust without expanding into unrelated systems, dormant architecture, broad refactors, or new parallel runtimes.**

### 2.2 Why This Plan Matters Right Now

Plan 2.0 § 2.1 declared that V1_CORE is now in-scope for modification. That is a sharp departure from Phase 1, which forbade V1_CORE touches. The day Phase 2 unlocks is the day a BTAR can legitimately edit `services/judgment/index.ts`, `services/ai-service.ts`, or `api/chat/service.ts`. Without Plan 2.2, the green light has no granularity: every V1_CORE file looks equally touchable, and there is no canonical map from a touch to a permission class.

Without this document, the task "remove silent fallback" can expand into:

```text
Rewrite chat service.
Create new AI runtime.
Migrate to L13/L14.
Refactor provider layer.
Clean up every duplicate service.
```

Plan 2.2 prevents that by:

- naming the live path canonically (§4),
- assigning a permission class to every relevant surface (§§5–7),
- enumerating the allowed capabilities (§§8–9),
- requiring every BTAR to map its touched files to a surface ID and permission class (§11),
- pinning V1_CORE touch discipline (§12),
- defining the borrow-don't-activate rule for L13/L14 (§13),
- pinning the test, telemetry, response-shape, and provider boundaries (§§14–17),
- defining the admission checklist that the eight-question gate consumes (§18).

### 2.3 Interaction With Plans 2.1 and 2.3

- **Plan 2.1 + Plan 2.2** = where + why. Plan 2.1 explains why the live path must be hardened; Plan 2.2 names which files comprise it.
- **Plan 2.3 + Plan 2.2** = forbidden + allowed. Plan 2.3 enumerates 18 OOS items; Plan 2.2 enumerates 12 in-scope surfaces plus the four permission classes.
- A BTAR satisfying all three is admissible (subject to Plan 1.6); failing any one of them is not.

---

## 3. First Principle of Plan 2.2

### 3.1 First Principle Statement (Canonical)

> **A file is in scope for Phase 2 only if touching it directly improves the trustworthiness of the active judgment/chat/AI path under failure, degradation, uncertainty, unsafe expression, or testability risk.**

### 3.2 Five-Question Touch Filter

A candidate touch is Phase 2 work only if at least one of the following is `YES`:

```text
T1. Does this touch make the live path more honest?
T2. Does this touch prevent silent fallback?
T3. Does this touch preserve judgment availability truth?
T4. Does this touch improve safety of AI expression?
T5. Does this touch make failure visible or testable?
```

If all five are `NO`, the touch is **not** Phase 2 work, regardless of how appealing the change looks.

### 3.3 Relationship to Plan 2.3 Q1..Q5 and R1..R5

Plan 2.3 §3.2 introduced the BTAR-level filter Q1..Q5 (the task must answer YES to one). Plan 2.2 §3.2 introduces the **per-touch** filter T1..T5. They are coordinated: a BTAR may pass Q1..Q5 at the mission level but still contain individual touches that fail T1..T5. Those touches must be removed from the diff before merge.

### 3.4 The Plan-2.2 Touch Invariant

```text
Plan-2.2-INV-01:
  Every file touched by every Phase 2 PR has a mapped surface ID (P2-S0N or new) and
  a declared permission class, and answers YES to ≥1 of T1..T5.
  PRs whose diffs contain touches not satisfying both conditions are rejected at the
  daily enforcement gate (Plan 1.9 §9.2 reviewer duties).
```

---

## 4. Canonical Live Path Under Plan 2.2

### 4.1 Active Runtime Path (Authoritative)

Plan 2.2 governs this active runtime path:

```text
POST /api/chat/message
  → api/chat/routes.ts               (auth + rate-limit middleware)
    → api/chat/controller.ts         (Zod validation)
      → api/chat/service.ts          (ChatService.sendMessage)
        → buildSignalSnapshot()      (services/judgment/signal-snapshot.ts)
        → produceJudgment()          (services/judgment/index.ts)
        → formatJudgmentForAI()      (services/judgment/debug-view.ts; ASCII stuffing)
        → aiService.analyze()        (services/ai-service.ts; OpenAI client)
      → ChatMessageResponse          (returned to user)
```

This path matches Plan 2.0 §1.2 and Plan 2.1 §1.2 and is the **only** runtime path Plan 2.2 governs.

### 4.2 What Plan 2.2 Does Not Govern

- The dormant full L13 runtime (`apps/coinet-platform/src/l13/`).
- The dormant full L14 runtime (`apps/coinet-platform/src/l14/`).
- L5–L12 certified architecture beyond `coordinateWrite()` and the production wrappers already enumerated in MEMORY.md.
- Microservices auxiliary repos (`services/market-prices`, `services/alchemy-whales`, `services/ai-data-feeder`).
- The active frontend (`apps/client-web`).
- The abandoned `apps/web-client`.

These are out of Plan 2.2's surface map.

### 4.3 Borrow-Don't-Activate Rule (Pointer to §13)

Phase 2 may borrow bounded concepts from L13/L14 only if a BTAR proves direct live-path trust value and does not migrate the full runtime. Full rule in §13.

---

## 5. Permission Classes

Plan 2.2 defines four permission classes. Every surface listed in §§6–7 is assigned exactly one class.

### 5.1 P2-OPEN

Files / folders that Phase 2 may **create or modify freely within mission scope**.

Examples:

```text
src/api/chat/__tests__/               (new failure-path tests)
small trust-helper modules per Plan 2.0 §2.2
```

Still requires BTAR admission. P2-OPEN means "no further per-touch permission needed beyond the BTAR's standard admission," not "anything goes." T1..T5 still apply per touch.

### 5.2 P2-TOUCH_WITH_BOUNDS

Sensitive live-path files that may be touched **only with strict limits**.

Examples:

```text
api/chat/service.ts                   (V1_CORE; CRITICAL risk-if-modified)
services/judgment/                    (V1_CORE)
services/ai-service.ts                (V1_CORE)
```

The BTAR must:

- name the **exact function or region** being modified,
- demonstrate the touch is the **smallest possible diff** that achieves the mission clause,
- avoid **broad refactor**, "while we're in here" cleanup, or response-shape change,
- include tests covering the new behavior,
- carry the §12 V1_CORE touch caution language.

### 5.3 P2-READ_ONLY

Files may be **inspected or referenced**, but not modified unless a BTAR explicitly escalates with justification (typically an AFE under Plan 1.4 / Plan 1.10).

Examples:

```text
src/l13/
src/l14/
certification scripts (src/scripts/test-l1*)
dormant architecture contracts
```

Reading is unconditionally allowed (no BTAR required to read). Importing from these paths into the live path requires BTAR approval per §13.

### 5.4 P2-FORBIDDEN

Files or naming patterns that **cannot be created or modified** during Phase 2 (mirrors Plan 2.3 OOS-011..018 in surface form).

Examples:

```text
chat-service-v2.ts                    (Plan 2.3 OOS-014)
ai-service-v2.ts                      (Plan 2.3 OOS-012)
judgment-engine-final.ts              (Plan 2.3 OOS-013)
new L*.X architecture                 (Plan 2.3 OOS-015)
Strategy Lab backend                  (Plan 2.3 OOS-003)
Chart Canvas backend                  (Plan 2.3 OOS-004)
```

Crossing P2-FORBIDDEN requires the appropriate Plan 1.10 exception (FRP / AFE / SCR) per Plan 2.3 §26. Default decision: **DENY**.

### 5.5 Class-to-OOS Mapping

```text
P2-OPEN            ↔ aligns with Plan 2.3 allowed-instead bullets in §§15.3 / 16.3 / 17.3 / 18.3
P2-TOUCH_WITH_BOUNDS ↔ V1_CORE in-scope surfaces per Plan 2.0 §2.1
P2-READ_ONLY       ↔ Plan 2.1 §5 non-replacement law (L13/L14) + Plan 2.3 OOS-015
P2-FORBIDDEN       ↔ Plan 2.3 OOS-011..016 plus broader Plan 1.5 sprawl prohibition
```

---

## 6. Primary In-Scope Surfaces (P2-S01..P2-S07)

These are the main live-path surfaces Phase 2 may touch if a BTAR admits the work. All carry `P2-TOUCH_WITH_BOUNDS`.

### 6.1 P2-S01 — Chat Service

| Field | Value |
| --- | --- |
| Path | `apps/coinet-platform/src/api/chat/service.ts` |
| Permission | `P2-TOUCH_WITH_BOUNDS` |
| V1 class | V1_CORE (SURF-001, CRITICAL) |
| Risk-if-modified | CRITICAL |

**Why in scope.** This is the central live chat runtime. Silent fallback (F-3), context fan-out (F-4), prompt assembly, AI response handling, and intent classification (F-1) all flow through it.

**Allowed touches.**

```text
add judgment availability handling
route structured judgment failure into explicit status
call small extracted trust helpers
preserve response shape where possible
add internal trust metadata if backward-compatible
```

**Forbidden touches.**

```text
full rewrite
new chat runtime
new chat-service-v2.ts
large unrelated cleanup
provider refactor
duplicate-engine canonicalization
```

**Required BTAR caution language** (§12.3):

```text
This is a bounded live-path trust modification, not a chat service rewrite.
```

### 6.2 P2-S02 — Chat Controller, Routes, Types

| Field | Value |
| --- | --- |
| Paths | `apps/coinet-platform/src/api/chat/controller.ts` · `routes.ts` · `types.ts` |
| Permission | `P2-TOUCH_WITH_BOUNDS` |
| V1 class | V1_CORE (SURF-002, SURF-003, SURF-008) |

**Why in scope.** These define request/response boundaries for chat. Phase 2 may need to expose or preserve trust-state-safe response shape.

**Allowed touches.**

```text
minimal type additions
backward-compatible response metadata
validation of new trust-state fields if needed
```

**Forbidden touches.**

```text
route redesign
auth redesign
new endpoint family
frontend-driven response expansion unrelated to trust
```

### 6.3 P2-S03 — Judgment Service Path

| Field | Value |
| --- | --- |
| Path | `apps/coinet-platform/src/services/judgment/` |
| Permission | `P2-TOUCH_WITH_BOUNDS` |
| V1 class | V1_CORE (SURF-009..019) |

**Why in scope.** `produceJudgment()` is the structured-judgment source. Phase 2 must detect when it is available, degraded, or unavailable.

**Allowed touches.**

```text
wrap produceJudgment result
classify failure
classify partial / degraded output
fix narrow type-truth issue if directly tied to availability state
```

**Forbidden touches.**

```text
new judgment engine
new produceJudgment replacement
scoring rewrite
hypothesis engine redesign
scenario engine redesign
```

**Required BTAR caution language** (§12.3):

```text
This is judgment availability/failure classification, not a new judgment engine.
```

### 6.4 P2-S04 — AI Service Boundary

| Field | Value |
| --- | --- |
| Path | `apps/coinet-platform/src/services/ai-service.ts` |
| Permission | `P2-TOUCH_WITH_BOUNDS` |
| V1 class | V1_CORE (SURF-020) |

**Why in scope.** This is the final AI generation boundary before the user response.

**Allowed touches.**

```text
pass structured prompt package
add output safety gate call
validate AI result shape
prevent unsafe output from shipping
```

**Forbidden touches.**

```text
new ai-service-v2.ts
provider orchestration rewrite
new model routing platform
real provider integration work
```

**Required BTAR caution language** (§12.3):

```text
This is an AI output trust boundary modification, not a new AI service implementation.
```

### 6.5 P2-S05 — Intent Classification and Handlers

| Field | Value |
| --- | --- |
| Paths | `apps/coinet-platform/src/services/intent-classifier.ts` · `intent-handlers.ts` |
| Permission | `P2-TOUCH_WITH_BOUNDS` |
| V1 class | V1_CORE |

**Why in scope.** BTAR-002 §21.8 found F-1: `intentClassification.processingTimeMs` type mismatch. Intent classification also affects how chat requests enter the judgment path.

**Allowed touches.**

```text
fix direct type drift (F-1)
ensure intent metadata does not break chat path
ensure failure is explicit if intent classification fails
```

**Forbidden touches.**

```text
new intent system
full classifier redesign
new agentic routing
```

### 6.6 P2-S06 — Symbol Detection

| Field | Value |
| --- | --- |
| Path | `apps/coinet-platform/src/services/symbol-detector.ts` |
| Permission | `P2-TOUCH_WITH_BOUNDS` |
| V1 class | V1_CORE |

**Why in scope.** Symbol/entity detection determines whether the chat path can build structured judgment for an asset.

**Allowed touches.**

```text
failure classification
explicit no-symbol / ambiguous-symbol path
degraded/unavailable handling if symbol detection fails
```

**Forbidden touches.**

```text
full L3 identity resolution migration
new token identity platform
broad canonicalization rewrite
```

### 6.7 P2-S07 — Market Data and Context Fetch Surfaces

| Field | Value |
| --- | --- |
| Paths | `apps/coinet-platform/src/services/market-data.ts` · related context-fetch services used directly by chat service |
| Permission | `P2-TOUCH_WITH_BOUNDS` |
| V1 class | V1_CORE |

**Why in scope.** External context failures must become DEGRADED, not silent (F-4).

**Allowed touches.**

```text
timeout classification
failure classification
context availability summary
mockable context boundary
```

**Forbidden touches.**

```text
new provider integration
paid API adapter buildout
full caching architecture
provider normalization platform
```

Cross-reference: §17 reaffirms that even an in-scope file's allowance does not extend to real-API expansion within it.

---

## 7. Supporting In-Scope Surfaces (P2-S08..P2-S12)

These surfaces are allowed because they support trust **without changing the product runtime directly**. All carry `P2-OPEN if admitted by BTAR`.

### 7.1 P2-S08 — Chat Tests

| Field | Value |
| --- | --- |
| Path | `apps/coinet-platform/src/api/chat/__tests__/` |
| Permission | `P2-OPEN` |
| V1 class | V1_SUPPORTING |

**Allowed.**

```text
failure-path tests
silent fallback regression tests
availability-state tests
prompt-package tests
AI output safety tests
smoke test maintenance (e.g., chat-path.smoke.test.ts)
```

**Forbidden.**

```text
real provider calls
tests requiring paid API keys
tests that depend on external network
```

### 7.2 P2-S09 — Typed Prompt / Context Package Files

| Field | Value |
| --- | --- |
| Allowed new files | `apps/coinet-platform/src/api/chat/judgment-prompt-package.ts` · `judgment-prompt-package.types.ts` |
| Permission | `P2-OPEN if admitted by BTAR` |
| Expected admitting BTAR | BTAR-004 |

**Allowed.**

```text
define CoinetJudgmentPromptPackage
build package from existing judgment result
preserve status, degradation, confidence, contradiction, source refs
```

**Forbidden.**

```text
new L13 runtime
full prompt architecture migration
new provider routing
```

Replacement of the existing `formatJudgmentForAI()` ASCII stuffer requires an FRP under Plan 1.5 §8 (per Plan 2.0 §3.6).

### 7.3 P2-S10 — Judgment Availability Files

| Field | Value |
| --- | --- |
| Allowed new files | `apps/coinet-platform/src/api/chat/judgment-availability.ts` · `judgment-availability.types.ts` |
| Permission | `P2-OPEN if admitted by BTAR` |
| Expected admitting BTAR | BTAR-003 |

**Allowed.**

```text
define AVAILABLE / DEGRADED / UNAVAILABLE
classify judgment success / failure
map failures to user-safe state
```

**Forbidden.**

```text
replace produceJudgment
create new judgment engine
activate L13/L14
```

### 7.4 P2-S11 — AI Output Safety Gate Files

| Field | Value |
| --- | --- |
| Allowed new files | `apps/coinet-platform/src/api/chat/ai-output-safety-gate.ts` · `ai-output-safety-gate.types.ts` |
| Permission | `P2-OPEN if admitted by BTAR` |
| Expected admitting BTAR | BTAR-005 |

**Allowed.**

```text
detect unsafe recommendation language
detect unsupported certainty
detect missing degradation disclosure
return allow / rewrite / block decision
```

**Forbidden.**

```text
new AI service implementation
new model provider system
full compliance platform
```

### 7.5 P2-S12 — Failure Classifier Files

| Field | Value |
| --- | --- |
| Allowed new files | `apps/coinet-platform/src/api/chat/chat-failure-classifier.ts` · `context-fetch-boundary.ts` |
| Permission | `P2-OPEN if admitted by BTAR` |
| Expected admitting BTAR | BTAR-006 |

**Allowed.**

```text
classify context failures
aggregate external context status
support degraded / unavailable behavior
reduce 27-mock coupling through bounded seams (F-2)
```

**Forbidden.**

```text
generic orchestration framework
full service extraction
new runtime
```

---

## 8. Explicit In-Scope Capabilities

Plan 2.2 enumerates the ten in-scope capabilities Phase 2 may build. Every capability traces back to Plan 2.1's first principle.

```text
CAP-001 — Judgment availability states
CAP-002 — Explicit degradation handling
CAP-003 — Typed judgment prompt package
CAP-004 — AI output safety and expression gate
CAP-005 — Failure-path test coverage
CAP-006 — Silent fallback regression tests
CAP-007 — Bounded chat service extraction
CAP-008 — Minimal runtime trust telemetry
CAP-009 — External context failure classification
CAP-010 — Provider-mocked controlled failure fixtures
```

### 8.1 Capability-to-First-Principle Trace

| CAP | Plan 2.1 §2.4 obligation removed | Primary surface |
| --- | --- | --- |
| CAP-001 | Faked structured judgment under failure (§2.4 bullet 1) | P2-S03, P2-S10 |
| CAP-002 | Hidden degradation (§2.4 bullet 2) | P2-S03, P2-S07, P2-S10 |
| CAP-003 | Generic / recommendation language (§2.4 bullet 3) | P2-S09 |
| CAP-004 | Fabricated evidence (§2.4 bullet 4); silent fallback to generic AI (§2.4 bullet 5) | P2-S11 |
| CAP-005 | Test oracle for §2.6 | P2-S08 |
| CAP-006 | Silent fallback regression (TF-003) | P2-S08 |
| CAP-007 | F-2 over-coupling (27-mock surface) | P2-S01, P2-S12 |
| CAP-008 | Internal trust evidence per Plan 2.0 §4.3 | P2-S01 |
| CAP-009 | TF-002 undisclosed degradation | P2-S07, P2-S12 |
| CAP-010 | OOS-016 / OOS-007 enforcement | P2-S08 |

---

## 9. Capability Details

### 9.1 CAP-001 — Judgment Availability States

Allowed:

```text
AVAILABLE
DEGRADED
UNAVAILABLE
```

Purpose:

```text
Prevent user-facing AI from pretending judgment exists when judgment failed.
```

Expected first BTAR: **BTAR-003**.

Reference: Plan 2.1 §4 (availability law); Plan 2.0 §5.

### 9.2 CAP-002 — Explicit Degradation Handling

Allowed fields:

```text
degradation_reasons
failed_components
degraded_components
user_disclosure_required
```

Purpose: ensure partial failure becomes visible internally and, where needed, user-facing.

Reference: Plan 2.1 §3.2 (PARTIALLY_KNOWS truth class); TF-002.

### 9.3 CAP-003 — Typed Judgment Prompt Package

Allowed:

```text
CoinetJudgmentPromptPackage
```

Purpose: replace fragile text/ASCII stuffing with structured context.

Likely requires: FRP under Plan 1.5 §8 (per Plan 2.0 §3.6) because it replaces existing `formatJudgmentForAI()` behavior.

### 9.4 CAP-004 — AI Output Safety Gate

Allowed decisions:

```text
ALLOW
ALLOW_WITH_WARNINGS
REWRITE_REQUIRED
BLOCK_OR_CLARIFY
```

Purpose: prevent unsafe recommendation, certainty inflation, invented evidence, or missing degradation disclosure.

Reference: Plan 2.1 §7 TF-005 (fabricated evidence) and TF-006 (recommendation creep).

### 9.5 CAP-005 — Failure-Path Test Coverage

Allowed tests:

```text
judgment failure
partial context failure
AI unsafe output
prompt package integrity
silent fallback regression
```

Reference: Plan 2.1 §7.5 (TF as test oracle).

### 9.6 CAP-006 — Silent Fallback Regression Tests

Purpose: prove the old silent fallback behavior (F-3 / TF-003) cannot return unnoticed generic AI output.

### 9.7 CAP-007 — Bounded Chat Service Extraction

Allowed extractions:

```text
availability resolver
prompt package builder
output safety gate
failure classifier
context boundary wrapper
```

Forbidden:

```text
full chat service rewrite (Plan 2.3 OOS-011)
```

### 9.8 CAP-008 — Minimal Runtime Trust Telemetry

Allowed internal facts:

```text
judgment_status
judgment_failure_reason
degraded_components
fallback_used
degradation_disclosed
safety_gate_result
policy_version
```

Forbidden:

```text
full L14 telemetry/calibration ecosystem (Plan 2.3 OOS-008)
```

### 9.9 CAP-009 — External Context Failure Classification

Purpose: turn failed context fetches into DEGRADED or UNAVAILABLE state instead of hidden continuation (F-3 / TF-008).

### 9.10 CAP-010 — Provider-Mocked Controlled Failure Fixtures

Purpose: test controlled failures without real provider calls.

Forbidden: real provider-dependent test suite (Plan 2.3 OOS-016).

---

## 10. Surface Boundary Registry

### 10.1 Registry File

```text
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-surface-boundary.registry.md
```

### 10.2 Row Schema

```text
surface_id
surface_name
path
permission_class
why_in_scope
allowed_touch
forbidden_touch
required_btar_mapping
risk_level
```

### 10.3 Initial Rows (Authoritative At Adoption)

```text
P2-S01  api/chat/service.ts                    P2-TOUCH_WITH_BOUNDS   CRITICAL
P2-S02  api/chat/controller.ts/routes.ts/types.ts P2-TOUCH_WITH_BOUNDS HIGH
P2-S03  services/judgment/                     P2-TOUCH_WITH_BOUNDS   CRITICAL
P2-S04  services/ai-service.ts                 P2-TOUCH_WITH_BOUNDS   CRITICAL
P2-S05  intent-classifier.ts / intent-handlers.ts P2-TOUCH_WITH_BOUNDS HIGH
P2-S06  services/symbol-detector.ts            P2-TOUCH_WITH_BOUNDS   MEDIUM
P2-S07  services/market-data.ts + context fetchers P2-TOUCH_WITH_BOUNDS HIGH
P2-S08  src/api/chat/__tests__/                P2-OPEN                LOW
P2-S09  src/api/chat/judgment-prompt-package.ts (+ .types.ts) P2-OPEN MEDIUM
P2-S10  src/api/chat/judgment-availability.ts  (+ .types.ts) P2-OPEN  MEDIUM
P2-S11  src/api/chat/ai-output-safety-gate.ts  (+ .types.ts) P2-OPEN  MEDIUM
P2-S12  src/api/chat/chat-failure-classifier.ts + context-fetch-boundary.ts P2-OPEN MEDIUM
P2-R01  src/l13/                               P2-READ_ONLY           N/A (read)
P2-R02  src/l14/                               P2-READ_ONLY           N/A (read)
P2-F01  new chat-service-v2.ts                 P2-FORBIDDEN           BLOCKED
P2-F02  new ai-service-v2.ts                   P2-FORBIDDEN           BLOCKED
P2-F03  new judgment-engine-final.ts           P2-FORBIDDEN           BLOCKED
```

The companion registry file mirrors these rows in full tabular form with the §10.2 schema.

### 10.4 Append-Only Discipline

P2-S01..P2-S12 are non-removable for the duration of Phase 2. P2-R01..P2-R02 and P2-F01..P2-F03 are also non-removable. New surface IDs may be appended (P2-S13, P2-R03, P2-F04, …) if a new boundary class is discovered during Phase 2; appended rows inherit the registry's lifecycle rules.

---

## 11. BTAR Surface Mapping Requirement

### 11.1 Mandatory Section

Every Phase 2 BTAR admission record (per Plan 1.6 §12) must include the section:

```text
## Surface Boundary Mapping
```

### 11.2 Required Fields

```text
touched_surfaces                    (list of surface IDs from §10.3)
permission_class_per_surface        (P2-OPEN | P2-TOUCH_WITH_BOUNDS | P2-READ_ONLY | P2-FORBIDDEN)
why_each_surface_is_needed          (one sentence per surface, mapped to T1..T5)
smallest_possible_touch             (the minimal function/region named)
forbidden_surfaces_confirmed_absent (statement: "P2-F01..P2-F03 not touched")
Plan 2.3 OOS check result           (Q1..Q5 answers from Plan 2.3 §25)
```

### 11.3 Outcome Mapping

```text
All fields present + diff matches the mapping                              → admission may proceed
Section missing                                                            → TAD-D (BLOCK)
Field missing                                                              → TAD-D (BLOCK)
Diff touches a surface not declared                                        → PR rejected at Plan 1.9 gate
Diff touches P2-FORBIDDEN without Plan 1.10 exception                      → TAD-D (BLOCK)
Diff imports from P2-READ_ONLY without BTAR escalation per §13             → TAD-D (BLOCK)
Uncertain                                                                  → TAD-E (ESCALATE)
```

### 11.4 Reviewer Duties (Coordinated With Plan 1.9)

The Plan 1.9 reviewer must:

1. Read the BTAR's `## Surface Boundary Mapping` section.
2. Diff every changed file in the PR against `touched_surfaces`.
3. Reject the PR if any changed file is not mapped, mapped to the wrong class, or violates the surface's `forbidden_touch` list.
4. Verify the §12 caution language is present when P2-S01 / P2-S03 / P2-S04 is touched.

---

## 12. V1_CORE Touch Discipline

### 12.1 Conditions on Every V1_CORE Touch

A V1_CORE touch must prove:

```text
direct Phase 2 trust mission
specific function/region named
smallest possible diff
test coverage included
no unrelated cleanup
no response-shape break unless explicitly admitted
rollback path documented
```

### 12.2 Anti-Drift Pattern

If a V1_CORE touch grows during implementation to include unrelated improvements, the discoverer **does not bundle**; per Plan 1.10 §13.3 Pattern B (Trojan-Horse Cleanup), the discoverer files a new finding (F-N) and continues with the admitted scope. Bundling is a PR rejection at the Plan 1.9 gate.

### 12.3 Required Caution Language (Per Sensitive Surface)

When a Phase 2 BTAR touches certain primary surfaces, the BTAR record must contain the corresponding verbatim line:

| Surface | Required caution line |
| --- | --- |
| P2-S01 (`api/chat/service.ts`) | `This is a bounded live-path trust modification, not a chat service rewrite.` |
| P2-S04 (`services/ai-service.ts`) | `This is an AI output trust boundary modification, not a new AI service implementation.` |
| P2-S03 (`services/judgment/`) | `This is judgment availability/failure classification, not a new judgment engine.` |

These lines are checked at the daily enforcement gate. Their absence is a Plan-2.2-INV-01 violation and blocks the PR.

### 12.4 Cross-Reference

Plan 2.0 §2.1 declares V1_CORE in-scope for Phase 2. Plan 1.9 §8.3 carries the CRITICAL risk-if-modified flag for V1_CORE files. Plan 2.2 §12 is where those two upstream rules become operational at the per-touch level.

---

## 13. Read-Only Architecture Borrowing Rule

### 13.1 Allowed

```text
read existing L13/L14 safety terminology
copy bounded policy concepts into a live-path helper
reuse conceptual wording with explicit attribution in the BTAR record
```

### 13.2 Forbidden

```text
import src/l13/* into the live path without BTAR approval
import src/l14/* into the live path without BTAR approval
activate certified runtime (e.g., calling validateL13AIInputPackage() from live chat path)
modify L13/L14 source files
create L13.13 / L14.11 or any new L*.X sublayer (Plan 1.4 FRZ-001; Plan 2.3 OOS-015)
```

### 13.3 Reason

> **Phase 2 hardens the live path; it does not migrate architecture.**

This restates Plan 2.1 §5 (non-replacement law) and Plan 2.3 §6 (OOS-002) at the per-import level.

### 13.4 Borrowing Discipline In a BTAR

If a BTAR borrows an L13/L14 concept:

- The BTAR must cite the originating file and section.
- The borrowing must be **conceptual**, not a direct import of L13/L14 runtime code into the live path.
- The borrowed concept lives in a Phase 2 helper file (P2-S09..S12), not under `src/l13/` or `src/l14/`.

---

## 14. Test Boundary Rules

### 14.1 Allowed

```text
mock AI provider
mock market/context services
simulate judgment failure
simulate context timeout
simulate unsafe AI output
assert availability state
assert no real provider calls
```

### 14.2 Forbidden

```text
call real OpenAI / Grok / CoinGecko / etc.
require real API keys
depend on live network
sleep/wait on provider behavior
become integration tests for paid providers
```

This mirrors Plan 2.3 OOS-016 at the per-test level.

### 14.3 Required Assertion for External-Boundary Tests

```text
No real provider calls occurred.
```

This assertion is added to every test that exercises a surface containing an external-API boundary (e.g., chat service, market-data, ai-service). Absence of this assertion is a Plan-2.2-INV-01 violation.

---

## 15. Runtime Telemetry Boundary

### 15.1 Allowed Internal Trust Fields

```text
judgment_status
judgment_failure_reason
degraded_components
fallback_used
degradation_disclosed
ai_output_gate_decision
policy_version
```

These are the seven fields Phase 2 may capture internally. They feed the `ChatTrustEvidence` shape declared in Plan 2.0 §4.3.

### 15.2 Forbidden

```text
full L14 audit/event system
full calibration evidence engine
proposal queue
dashboard analytics platform
alert performance facts
```

These belong to L14.5–L14.9 ecosystems and are out of phase per Plan 2.3 OOS-008.

### 15.3 Purpose

The §15.1 fields are sufficient for Phase 2's chat-trust evidence model and for the Phase 3 synthetic truth suite that will follow. They are **not** a calibration proposal queue. Useful telemetry without becoming an L14 implementation.

---

## 16. Response-Shape Boundary

### 16.1 Preferred Rule

> **Do not break existing response shape.**

### 16.2 Allowed

```text
add optional metadata field if backward-compatible
keep internal trust evidence server-side if response shape risk is high
```

### 16.3 Forbidden

```text
remove existing response fields
rename existing response fields
change route contract without explicit BTAR and tests
```

### 16.4 If Response Shape Must Change

The BTAR must include:

```text
explicit response-shape change approval in the admission record
controller/type tests covering old + new shape
backward-compatibility note (versioning or feature flag if needed)
frontend impact note (apps/client-web consumers)
```

A response-shape change without these four items is rejected at the daily enforcement gate.

---

## 17. External API Boundary Inside In-Scope Surfaces

### 17.1 Principle

**Even if a file is in scope, real-API expansion within it is not.**

Example:

```text
market-data.ts is in scope for failure classification.
market-data.ts is not in scope for new provider integration.
```

### 17.2 Allowed Within In-Scope External-API Surfaces

```text
classify failure
mock timeout
avoid silent continuation
derive DEGRADED state
```

### 17.3 Forbidden Within In-Scope External-API Surfaces

```text
add new provider
buy / integrate new API
expand fan-out
add provider scoring
```

### 17.4 Cross-Reference

This rule operationalizes Plan 2.3 §11 (OOS-007 deep real API integration before purchase) and Plan 2.3 §23 (API Boundary Doctrine). Plan 2.2 §17 is where the doctrine applies per surface.

---

## 18. Plan 2.2 Admission Checklist

Before any Phase 2 BTAR is admitted, the BTAR record must answer:

```text
 1. Which Plan 2.2 surface IDs are touched?
 2. What permission class applies to each?
 3. Does each touch directly support Plan 2.1 first principle (answer ≥1 of T1..T5)?
 4. Does any touch contact Plan 2.3 OOS-NNN (and is the contact allowed / exception-covered)?
 5. Is the touch the smallest possible diff?
 6. Are tests included (per §14)?
 7. Is any response shape affected (and §16.4 satisfied if so)?
 8. Are real provider calls avoided (per §14.3 assertion)?
 9. Is the V1_CORE touch justified (and §12.3 caution language present where required)?
10. Is rollback possible (feature flag / revert plan)?
```

If any answer is missing, the BTAR is incomplete and inadmissible (TAD-D BLOCK or TAD-E ESCALATE per Plan 1.6).

---

## 19. Verification Criteria

Plan 2.2 is complete only if a future engineer who has never seen the conversation can answer these from the repo-resident document alone:

```text
V1.  Which files may Phase 2 touch?
V2.  Which files are protected but touchable?
V3.  Which files are read-only?
V4.  Which files are forbidden?
V5.  What new helper modules are allowed?
V6.  What capabilities are in scope?
V7.  What tests are allowed?
V8.  What telemetry is allowed?
V9.  Can Phase 2 touch real APIs?
V10. Can Phase 2 change response shape?
V11. How must BTARs map surfaces?
```

Self-check (answered from this document):

| Question | Answer location |
| --- | --- |
| V1 | §§6, 7 (P2-S01..P2-S12) |
| V2 | §5.2 (P2-TOUCH_WITH_BOUNDS) + §§6.1..6.7 |
| V3 | §5.3 (P2-READ_ONLY) + §10.3 (P2-R01..R02) |
| V4 | §5.4 (P2-FORBIDDEN) + §10.3 (P2-F01..F03) |
| V5 | §§7.2..7.5 (P2-S09..S12) |
| V6 | §8 (CAP-001..CAP-010) + §9 details |
| V7 | §14 (test boundary) + §7.1 (P2-S08) |
| V8 | §15 (telemetry boundary) |
| V9 | §17 (no — real-API expansion is out even within in-scope surfaces) |
| V10 | §16 (only with §16.4 satisfaction) |
| V11 | §11 (Surface Boundary Mapping section) |

All eleven verification questions are answerable from this document. **V-check PASS.**

---

## 20. Done Definition

Plan 2.2 is **done** when:

> **Phase 2 has a repo-resident in-scope surface and runtime-boundary document, plus a surface registry, defining every primary live-path file Phase 2 may touch, every supporting file class Phase 2 may add, all permission classes, all in-scope capabilities, the V1_CORE touch discipline, the read-only architecture borrowing rule, the test boundary, the runtime telemetry boundary, the response-shape boundary, and the required surface-mapping section every Phase 2 BTAR must include before admission.**

Satisfaction check at adoption (2026-05-23):

- Live path declared canonically: **YES** (§4.1).
- Permission classes defined: **YES** (§5; four classes P2-OPEN / P2-TOUCH_WITH_BOUNDS / P2-READ_ONLY / P2-FORBIDDEN).
- Primary surfaces P2-S01..P2-S07 enumerated with allowed/forbidden touches: **YES** (§6).
- Supporting surfaces P2-S08..P2-S12 enumerated: **YES** (§7).
- In-scope capabilities CAP-001..CAP-010 defined with first-principle trace: **YES** (§§8–9).
- V1_CORE touch discipline + caution language: **YES** (§12).
- L13/L14 borrowing rule: **YES** (§13).
- Test, telemetry, response-shape, external-API boundaries: **YES** (§§14–17).
- BTAR Surface Boundary Mapping section schema: **YES** (§11).
- Admission checklist: **YES** (§18).
- Verification V1..V11 answerable from document: **YES** (§19).
- Companion registry exists: **YES** (`phase-2-surface-boundary.registry.md`).
- Cross-phase indexing updated: **YES** (both Phase 1 and Phase 2 record-index + decision-log).

Done definition: **MET.**

---

## 21. Required Updates

After this document is written, the following registries are updated in the same work session:

```text
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-surface-boundary.registry.md
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-record-index.registry.md
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-decision-log.registry.md
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md   (cross-phase indexing per Plan 1.7 §10.3)
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md   (cross-phase indexing per Plan 1.7 §10.3)
```

No source files are touched. BTAR-003 remains pre-admission.

---

## 22. Acceptance Block

```text
Plan: 2.2 — In-Scope Phase 2 Surfaces and Runtime Boundary
Status: ACTIVE
Effective: 2026-05-23
Authority: Plan 2.0 (Phase 2 General Plan, ACTIVE); Plan 2.1 (Mission and First Principle, ACTIVE); Plan 2.3 (Out-of-Scope Boundaries, ACTIVE)
Inheritance audit:
  Plan 1.1  ACTIVE
  Plan 1.2  ACTIVE
  Plan 1.3  ACTIVE
  Plan 1.4  ACTIVE   (FRZ-001..008 enforced by P2-READ_ONLY + P2-FORBIDDEN)
  Plan 1.5  ACTIVE   (PSC-001..010 enforced by P2-FORBIDDEN naming patterns)
  Plan 1.6  ACTIVE   (admission gate extended by §11 Surface Boundary Mapping section)
  Plan 1.7  ACTIVE
  Plan 1.8  ACTIVE   (V1_CORE classification carried into permission-class assignment)
  Plan 1.9  ACTIVE   (daily enforcement extended by §11.4 reviewer duties)
  Plan 1.10 ACTIVE
  Plan 1.11 COMPLETED
  Plan 1.12 COMPLETED
  Plan 2.0  ACTIVE
  Plan 2.1  ACTIVE
  Plan 2.3  ACTIVE
Dependent records: F-1..F-4 (chat trust findings); BTAR-002 §21.8; Plan 1.8 SURF-001..SURF-021 inventory
Authorizes: nothing implementational; positive-scope governance only
Does not authorize: any BTAR; any code change; any new file under src/**; any L*.X modification; any P2-FORBIDDEN creation; any P2-READ_ONLY import into live path without BTAR approval
Default decision on any ambiguous touch: TAD-E (ESCALATE)
Next admissible step (unchanged): BTAR-003 admission plan under Plan 2.0 §11.1, now additionally subject to Plan 2.2 §§11, 12, 18 and Plan 2.3 §25
```

---

## 23. Glossary

| Term | Definition |
| --- | --- |
| **P2-S0N** | An in-scope Phase 2 surface, one of P2-S01..P2-S12 (12 entries at adoption) |
| **P2-R0N** | A read-only Phase 2 surface, one of P2-R01..P2-R02 (L13/L14 directories) |
| **P2-F0N** | A forbidden Phase 2 surface, one of P2-F01..P2-F03 (prohibited new files / naming patterns) |
| **Permission class** | One of P2-OPEN / P2-TOUCH_WITH_BOUNDS / P2-READ_ONLY / P2-FORBIDDEN |
| **CAP-NNN** | An in-scope Phase 2 capability, one of CAP-001..CAP-010 |
| **T1..T5** | The §3.2 per-touch filter questions (live-path honesty / silent-fallback prevention / availability truth / safe expression / failure visibility) |
| **Surface Boundary Mapping** | The mandatory BTAR section defined in §11; absence blocks admission |
| **Caution language** | The verbatim lines required in BTAR records for sensitive V1_CORE touches (§12.3) |
| **Borrowing rule** | The §13 rule that L13/L14 concepts may be read but not activated in the live path |
| **Live path** | The canonical runtime path defined in §4.1 |
| **Plan-2.2-INV-01** | The §3.4 invariant that every touched file has a mapped surface ID and answers ≥1 of T1..T5 |

---

## 24. Cross-Reference Index

| Topic | Location |
| --- | --- |
| Authority sentence | §2.1 |
| First principle | §3.1 |
| Five-question touch filter T1..T5 | §3.2 |
| Plan-2.2-INV-01 | §3.4 |
| Canonical live path | §4.1 |
| Four permission classes | §5 |
| Class-to-OOS mapping | §5.5 |
| Primary surfaces P2-S01..P2-S07 | §6 |
| Supporting surfaces P2-S08..P2-S12 | §7 |
| Capabilities CAP-001..CAP-010 | §§8–9 |
| Capability-to-first-principle trace | §8.1 |
| Surface boundary registry schema | §10.2 |
| Initial registry rows | §10.3 |
| BTAR Surface Boundary Mapping requirement | §11 |
| V1_CORE touch discipline | §12 |
| Required caution language | §12.3 |
| L13/L14 borrowing rule | §13 |
| Test boundary rules | §14 |
| Runtime telemetry boundary | §15 |
| Response-shape boundary | §16 |
| External API boundary inside in-scope surfaces | §17 |
| Admission checklist (10 questions) | §18 |
| Verification criteria V1..V11 | §19 |
| Done definition | §20 |
| Acceptance block | §22 |

---

## 25. Final Production Formulation

> **Plan 2.2 establishes the positive runtime boundary of Coinet backend Phase 2. It defines exactly which live judgment/chat/AI surfaces Phase 2 may touch, which supporting files may be added, which surfaces are protected but touchable, which architecture surfaces are read-only, and which new files or systems are forbidden. It introduces permission classes P2-OPEN, P2-TOUCH_WITH_BOUNDS, P2-READ_ONLY, and P2-FORBIDDEN; defines the in-scope capabilities such as judgment availability states, typed prompt packages, AI output safety gates, failure-path tests, bounded chat service extraction, explicit degradation handling, and minimal trust telemetry; and requires every Phase 2 BTAR to map its touched surfaces to this boundary before admission. Its purpose is to let Phase 2 harden the live product path without becoming a rewrite, architecture migration, provider integration wave, or broad cleanup project.**

Plan 2.2 ends here.
