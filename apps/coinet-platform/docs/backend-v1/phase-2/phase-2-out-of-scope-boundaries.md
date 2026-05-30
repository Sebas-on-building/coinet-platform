# Plan 2.3 — Out-of-Scope Boundaries

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 2 — Live Judgment / Chat / AI Trust
Document Type: Phase Boundary Authority
Created: 2026-05-23
Last Updated: 2026-05-23
Owner: Backend program owner
Depends On:
- P1TG-002 — Phase 2 Unlock (ACCEPTED, 2026-05-23)
- Plan 2.0 — Phase 2 General Plan (ACTIVE)
- Plan 2.1 — Mission and First Principle (ACTIVE)
- Plan 1.3 — Non-Scope Registry (ACTIVE; NB-001..NB-010)
- Plan 1.4 — Architecture Expansion Freeze (ACTIVE; FRZ-001..008, AFV-A..H)
- Plan 1.5 — Parallel-Service and Version-Sprawl Prohibition (ACTIVE; PSC-001..010, VSV-A..J, FRP/BSCP/VSE)
- Plan 1.9 — Daily Scope Enforcement (ACTIVE)
- Plan 1.10 — Exception and Scope-Change Procedure (ACTIVE; SCR/AFE/VSE/FRP/BSCP/UDF)

Authority level: **Every Phase 2 BTAR must pass this boundary before admission.**

---

## 0. Required Artifact and Companion Updates

### 0.1 Required Artifact

This document at:

```text
apps/coinet-platform/docs/backend-v1/phase-2/phase-2-out-of-scope-boundaries.md
```

### 0.2 Companion Registry

```text
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-out-of-scope.registry.md
```

### 0.3 Updates To Existing Registries

```text
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-record-index.registry.md
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-decision-log.registry.md
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md   (cross-phase indexing)
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md   (cross-phase indexing)
```

### 0.4 What This Plan Is Not

Plan 2.3 is **not** a BTAR. It admits no BTAR (BTAR-003 remains pre-admission). It changes zero source files under `apps/coinet-platform/src/**`. It opens no Plan 1.3 NB-* areas. It loosens no Plan 1.4 freeze. It loosens no Plan 1.5 sprawl prohibition. It is governance only.

---

## 1. Document Identity

### 1.1 Position In the Phase 2 Plan Hierarchy

```text
Phase 2 master execution constitution           → Plan 2.0
Phase 2 mission and first principle (positive)  → Plan 2.1
Phase 2 in-scope surfaces (positive scope)      → Plan 2.2 (placeholder, not yet written)
Phase 2 out-of-scope boundaries (negative scope)→ Plan 2.3   ← this document
Phase 2 procedural / verification plans         → Plan 2.4+ (future)
```

Plan 2.3 is the **negative scope** counterpart of Plan 2.0 §2 (in-scope surfaces) and Plan 2.1 §1 (mission decomposition). Where Plan 2.0 / Plan 2.1 declare what Phase 2 must do, Plan 2.3 declares what Phase 2 must **not** become.

### 1.2 Authority Level

Level 2 (Phase Plan) — same tier as Plan 2.1; subordinate to Plan 2.0.

If a future Phase 2 plan, BTAR, or PR appears to contradict Plan 2.3, Plan 2.3 **wins on negative-scope adjudication**. Plan 2.0 still wins on master execution scope; Plan 2.1 still wins on mission/first-principle interpretation; Plan 2.3 wins on what is forbidden.

### 1.3 Authority Sentence

This document carries the authority sentence stated in §2 below, restated here for the index:

> **Plan 2.3 exists to define the explicit out-of-scope boundaries of Phase 2 so that live judgment/chat/AI trust hardening does not expand into full architecture migration, new backend products, real API integration, broad cleanup, or parallel-service proliferation.**

### 1.4 Inheritance Audit (at Adoption)

| Upstream artifact | Required status | Status at 2026-05-23 |
| --- | --- | --- |
| Plan 1.1..Plan 1.10 | ACTIVE | ACTIVE |
| Plan 1.11 | COMPLETED | COMPLETED (P1RR-001) |
| Plan 1.12 | COMPLETED | COMPLETED (P1TG-002 P2-READY) |
| Plan 2.0 | ACTIVE | ACTIVE |
| Plan 2.1 | ACTIVE | ACTIVE |

All upstream statuses satisfied. Plan 2.3 is admissible.

---

## 2. Constitutional Purpose

### 2.1 Authority Sentence (Canonical)

> **Plan 2.3 exists to define the explicit out-of-scope boundaries of Phase 2 so that live judgment/chat/AI trust hardening does not expand into full architecture migration, new backend products, real API integration, broad cleanup, or parallel-service proliferation.**

### 2.2 Why This Plan Matters Right Now

Phase 2 is the first phase that is **allowed to touch V1_CORE** (per Plan 2.0 §2.1). The chat service, judgment service, AI service, and intent classifier are all in-scope for modification. That permission is precisely the moment at which scope drift becomes most dangerous: an engineer with a green light to change `services/judgment/index.ts` can convince themselves the green light extends to "while we're in here, let's also …."

Without Plan 2.3, Phase 2 will drift from:

```text
Fix silent fallback.
```

into:

```text
Rebuild the entire intelligence architecture.
```

Plan 2.3 is the structural prevention of that drift.

### 2.3 What Plan 2.3 Protects

- **Phase 2 mission focus** (Plan 2.1 §1.1) — only live-path trust hardening.
- **Phase 1 deferred areas** (Plan 1.3 NB-001..NB-010) — still deferred.
- **Phase 1 architecture freeze** (Plan 1.4 FRZ-001..008) — still locked.
- **Phase 1 sprawl prohibition** (Plan 1.5 PSC-001..010) — still locked.
- **The reconciliation backlog** (the four pending decisions in MEMORY.md: L9 / L11 / L12 / L13) — must not be silently committed during Phase 2.
- **The forthcoming API budget** — must not be burned on integration work before runtime can honestly handle controlled failures.

---

## 3. First Principle of Plan 2.3

### 3.1 First Principle Statement (Canonical)

> **A task is not Phase 2 work merely because it touches the backend. A task is Phase 2 work only if it directly makes the live judgment/chat/AI path more truthful under failure, degradation, uncertainty, or unsafe expression risk.**

### 3.2 Five-Question Acceptance Filter

A candidate task is Phase 2 work only if at least one of the following is `YES`:

```text
Q1. Does this make the current live path more honest?
Q2. Does this prevent silent fallback?
Q3. Does this preserve judgment availability discipline (AVAILABLE/DEGRADED/UNAVAILABLE)?
Q4. Does this prevent unsafe AI output?
Q5. Does this make failure observable at the moment of failure?
```

### 3.3 Five Rejected Justifications (Canonical Anti-Patterns)

A candidate task is **not** Phase 2 work if the only justification is one of:

```text
R1. "This will be useful later."
R2. "This will make the architecture cleaner."
R3. "This will help future product surfaces."
R4. "This is related to Coinet intelligence in general."
R5. "This would be good before APIs arrive."
```

These five anti-patterns are the **canonical scope-drift justifications** that Plan 2.3 explicitly forbids. A BTAR admission record whose mission trace reduces to one of R1..R5 is inadmissible.

### 3.4 The Plan-2.3 Filter Invariant

```text
Plan-2.3-INV-01:
  Every admitted Phase 2 BTAR answers YES to at least one of Q1..Q5
  and does NOT reduce to any of R1..R5 as its primary justification.
```

This invariant is checked at the eight-question gate (Plan 1.6) and at the daily enforcement gate (Plan 1.9).

---

## 4. Canonical Out-of-Scope List

### 4.1 The 18 OOS Items

```text
OOS-001 — Full CIP.1
OOS-002 — Full L13/L14 production migration
OOS-003 — Strategy Lab backend
OOS-004 — Chart Canvas backend
OOS-005 — Plugin systems
OOS-006 — Agent builders
OOS-007 — Deep real API integration before purchase
OOS-008 — Full calibration proposal ecosystem
OOS-009 — Advanced alert platform
OOS-010 — Broad duplicate cleanup
OOS-011 — Full chat service rewrite
OOS-012 — New ai-service-v2.ts
OOS-013 — New judgment-engine-final.ts
OOS-014 — New chat-service-v2.ts or parallel chat runtime
OOS-015 — New L*.X sublayers or constitutional expansion
OOS-016 — Real provider-dependent test suite
OOS-017 — Full frontend/backend product integration
OOS-018 — Performance optimization unrelated to live-path trust
```

### 4.2 Required Fields per OOS Item

Each item carries (§§5..22 and registry):

- **description** — what the item names,
- **why out of scope** — the structural reason,
- **what is allowed instead** — bounded substitute(s) that achieve Phase 2 mission without crossing the boundary,
- **reassessment trigger** — the event after which the item could be reconsidered,
- **exception path** — the Plan 1.10 procedure required if a Phase 2 BTAR truly must cross the boundary.

### 4.3 Closed List for Phase 2

The 18 items are the canonical Phase 2 out-of-scope list. New OOS-NNN items may be **appended** during Phase 2 if a new boundary class is discovered (OOS-019, OOS-020, …) but the existing 18 are non-removable for the duration of Phase 2. The list is closed to relaxation; it is open to expansion.

---

## 5. OOS-001 — Full CIP.1

### 5.1 Boundary

Full CIP.1 (unified L1 → L2 → L3 → L4 → L5 → L6 → L7 → L8 → L9 → L10 → L11 → L12 → L13 → L14 production runtime) is out of scope for Phase 2.

### 5.2 Why Out of Scope

The bridge-certification work (AJP.1 + CIP.0.5 + bridge comparison ledger) already established that the active product path and the certified architecture path are two separate organisms today. The reconciliation matrix is not built. The four reconciliation decisions (L9 / L11 / L12 / L13) are not made. CIP.1 is a multi-session, ~3,700-LOC adapter program, not a Phase 2 deliverable.

### 5.3 Allowed Instead

```text
borrow bounded concepts from certified layers (per Plan 1.4 Legal Work Class D)
reuse safety wording patterns from L13.9 vocabulary
reuse availability/degradation terminology from L14 read surfaces
reuse policy language from L13/L14 contracts
```

### 5.4 Forbidden

```text
claim a unified CIP.1 in any Phase 2 artifact
wire L5..L14 as the production path
replace produceJudgment with the full certified architecture
add new orchestration layers to bridge active product into L13/L14 runtime
```

### 5.5 Reassessment Trigger

CIP.1 may be reconsidered only after **both**:

- Phase 2 completion (P2TG-001 returns P3-READY), and
- Phase 3 synthetic truth suite completion.

### 5.6 Exception Path

A Phase 2 task that genuinely needs full CIP.1 work must file an **SCR** under Plan 1.10 escalating to a new Plan 3.x. Default outcome: **DEFER**.

---

## 6. OOS-002 — Full L13/L14 Production Migration

### 6.1 Boundary

Phase 2 may not migrate the live product path wholesale onto certified L13/L14 runtime. NB-007 remains deferred (Plan 1.3).

### 6.2 Why Out of Scope

Such a migration would convert Phase 2 from live-path trust hardening into architecture migration. Per Plan 2.1 §5 (non-replacement law), L13 (FROZEN_LIVE) and L14 (ARCHITECTURE_COMPLETE) remain frozen and authoritative; Phase 2 hardens around them, not into them.

### 6.3 Allowed Instead

```text
bounded L13.9-style safety pattern reuse
bounded expression-governance concept reuse
bounded grounding/disclosure language reuse
bounded audit vocabulary reuse
```

These are **inspirational reuses**, not runtime invocations.

### 6.4 Forbidden

```text
full L13 runtime invocation in the live chat path
full L14 delivery/calibration runtime activation
L14 proposal ecosystem activation
L14 persistence/read surface activation
any modification under apps/coinet-platform/src/l13/
any modification under apps/coinet-platform/src/l14/
```

### 6.5 Rule of Thumb

> Use L13/L14 as inspiration where directly useful. Do not activate L13/L14 as the production runtime.

### 6.6 Reassessment Trigger

After Phase 2 completion, Phase 3 completion, and the four reconciliation decisions (L9 / L11 / L12 / L13) are made via ADR records.

### 6.7 Exception Path

SCR under Plan 1.10, escalating to a future Plan 3.x or later. Default outcome: **DEFER**.

---

## 7. OOS-003 — Strategy Lab Backend

### 7.1 Boundary

Strategy Lab backend is out of scope. NB-001 (Plan 1.3) remains deferred.

### 7.2 Why Out of Scope

Phase 2 is about making AI chat and judgment trustworthy. Strategy Lab is a future creation/workbench surface for users to build their own strategies. It is not required for live chat trust and shares zero load-bearing code with the live path.

### 7.3 Allowed Instead

Nothing — unless a current chat-trust BTAR proves a direct functional dependency on a Strategy-Lab-named surface (which is not anticipated and would itself be suspect).

### 7.4 Forbidden

```text
strategy runtime
strategy builder API
indicator creation backend
backtesting backend
marketplace preparation
```

### 7.5 Reassessment Trigger

After Phase 3 or after v1 live path is production trustworthy.

### 7.6 Exception Path

SCR. Default: **DEFER**.

---

## 8. OOS-004 — Chart Canvas Backend

### 8.1 Boundary

Chart Canvas backend is out of scope. NB-002 (Plan 1.3) remains deferred.

### 8.2 Why Out of Scope

Chart Canvas is a spatial/visual product feature. It is not needed to remove silent fallback, add judgment availability states, or gate AI output.

### 8.3 Allowed Instead

Only minimal type references **if** an existing chat-path BTAR proves it requires them, and only with BTAR approval that names the exact import and exact reason.

### 8.4 Forbidden

```text
chart scenario backend
drawing / object storage
canvas collaboration
visual strategy execution
chart overlay generation
```

### 8.5 Reassessment Trigger

After Phase 3 or after v1 live path is production trustworthy.

### 8.6 Exception Path

SCR. Default: **DEFER**.

---

## 9. OOS-005 — Plugin Systems

### 9.1 Boundary

Plugin systems remain out of scope. NB-003 (Plan 1.3) remains deferred.

### 9.2 Why Out of Scope

Plugins expand surface area and security risk. Phase 2 must reduce attack and failure surface, not add extension complexity. Plugins also imply a new permission model and a new versioning regime, both of which are explicitly out of phase.

### 9.3 Forbidden

```text
plugin runtime
plugin registry
plugin marketplace
plugin API execution
third-party plugin hooks
```

### 9.4 Allowed Instead

Nothing.

### 9.5 Reassessment Trigger

Post-v1, or after core trust path is stable and a security review is performed.

### 9.6 Exception Path

SCR. Default: **DEFER**.

---

## 10. OOS-006 — Agent Builders

### 10.1 Boundary

Experimental agent builders are out of scope. NB-004 (Plan 1.3) remains deferred.

### 10.2 Why Out of Scope

Agent systems create additional autonomous behavior and orchestration complexity. Phase 2 is about **controlling** the existing AI path, not **spawning** new AI actors. Adding new agents during a phase whose mission is "make the one AI call we already make truthful" would invert the mission.

### 10.3 Forbidden

```text
agent builder backend
agent runtime
agent graph execution
autonomous trading/research agents
multi-agent orchestration
```

### 10.4 Allowed Instead

A Phase 2 BTAR may add **deterministic safety checks** around the existing `aiService.analyze()` response. That is not an agent. A deterministic gate has no autonomy and no internal state across calls.

### 10.5 Reassessment Trigger

Post-Phase 3.

### 10.6 Exception Path

SCR. Default: **DEFER**.

---

## 11. OOS-007 — Deep Real API Integration Before Purchase

### 11.1 Boundary

Phase 2 must not depend on real paid API integration. This includes:

```text
new provider purchase integration
provider-key rollout
large provider adapter buildout
real data dependency in tests
production-grade provider reconciliation
```

### 11.2 Why Out of Scope

The runtime must be **safe before the data goes live**. Real APIs increase volume, latency, and cost. They do not fix runtime trust.

The canonical reasoning:

```text
Bad runtime + real APIs        = expensive noise
Good runtime + fake data       = trustworthy foundation
Good runtime + real APIs       = production-grade intelligence
```

The only legitimate sequencing is `Good runtime → Real APIs`, not the reverse.

### 11.3 Allowed Instead

```text
mocked provider responses
synthetic SignalSnapshot fixtures
fake degraded provider states (for DEGRADED state tests)
fake timeout states (for UNAVAILABLE state tests)
provider-boundary interfaces only if needed to test degradation
```

### 11.4 Forbidden

```text
new paid API client integration
new external provider adapter beyond existing surfaces
real API calls in tests
provider billing/key setup as Phase 2 work
provider fan-out expansion (F-4 is to be **contained**, not expanded)
```

### 11.5 Reassessment Trigger

After Phase 2 done definition is met and runtime trust is demonstrated under controlled inputs.

### 11.6 Exception Path

If a real API integration is required to prevent an **existing production failure** (not a future improvement), it must go through Plan 1.10 with strict proof:

- production necessity (current user-visible failure linked to a specific provider),
- minimality (no broader provider rollout in the same PR),
- time bound (sunset date defined),
- rollback path (feature flag / kill switch named),
- no safer alternative (mock cannot reproduce the bug class).

Default outcome: **DEFER**.

---

## 12. OOS-008 — Full Calibration Proposal Ecosystem

### 12.1 Boundary

The full L14.6 evidence engine + L14.7 proposal queue + L14.9 live operations governance is out of scope. NB-005 (Plan 1.3) remains deferred.

### 12.2 Why Out of Scope

Phase 2 is live-path trust. Calibration proposal governance is **later-stage compounding behavior**: it makes sense only after a meaningful live signal exists and after the live path is already trustworthy enough to be calibrated against.

### 12.3 Allowed Instead

Minimal internal runtime evidence for chat trust:

```text
judgment_status
degradation_reason
safety_gate_result
fallback_used
```

These four fields are sufficient for Phase 2's chat-trust evidence model. They are **not** a calibration proposal queue.

### 12.4 Forbidden

```text
full L14.6 evidence engine activation
full L14.7 proposal queue activation
calibration review dashboard
automatic lower-layer calibration loop
```

### 12.5 Reassessment Trigger

After Phase 2 + Phase 3 completion and after a live signal corpus exists.

### 12.6 Exception Path

SCR. Default: **DEFER**.

---

## 13. OOS-009 — Advanced Alert Platform

### 13.1 Boundary

Advanced alerts are out of scope. NB-009 (Plan 1.3) remains deferred.

### 13.2 Why Out of Scope

Phase 2 focuses on chat/judgment/AI response trust, not delivery infrastructure. Telegram delivery, push notifications, alert routing, and frequency caps are L14.2/L14.3/L14.9 concerns that are not load-bearing in the live chat path.

### 13.3 Forbidden

```text
Telegram expansion
push notifications
alert routing upgrades
alert frequency caps
advanced alert delivery DAG
alert calibration ecosystem
```

### 13.4 Allowed Instead

Only if a chat response references alert state, a BTAR may ensure it **does not invent** alert availability (i.e., the AI safety gate may forbid "I've already sent you an alert" claims that are not grounded).

### 13.5 Reassessment Trigger

Post-Phase 2.

### 13.6 Exception Path

SCR. Default: **DEFER**.

---

## 14. OOS-010 — Broad Duplicate Cleanup

### 14.1 Boundary

Broad duplicate cleanup remains out of scope. NB-010 (Plan 1.3) remains deferred.

### 14.2 Why Out of Scope

Plan 1.8 inventory documented duplicate families (OmniScore variants, derivatives engines, news engines, social/sentiment variants, monitoring stacks, data fetchers — Plan 1.5 §4). Cleaning them up broadly would consume Phase 2 budget on work that does not directly improve live-path trust.

### 14.3 Forbidden

```text
canonicalize all derivatives engines
canonicalize all news engines
delete social/sentiment variants
remove old OmniScore versions
rewrite the data fetcher family
generic "while we're in here" refactors
```

### 14.4 Allowed Instead

A Phase 2 BTAR may touch a duplicate family only if:

```text
it is directly in the live chat trust path
the touch is minimal (one file, one function, one boundary)
the BTAR names the exact file/function/symbol being touched
the BTAR does not claim full canonicalization
```

### 14.5 Required Caution Language

When a Phase 2 BTAR touches any duplicate-family file, the BTAR record must contain the verbatim line:

```text
This task does not canonicalize the duplicate family.
```

This line is checked at the daily enforcement gate (Plan 1.9). Its absence is a TF-class-adjacent scope-drift signal and blocks the PR.

### 14.6 Reassessment Trigger

Post-Phase 2, when a dedicated canonicalization phase can be planned.

### 14.7 Exception Path

FRP under Plan 1.5 §8 for any genuine replacement; otherwise SCR. Default: **DEFER**.

---

## 15. OOS-011 — Full Chat Service Rewrite

### 15.1 Boundary

A full rewrite of `apps/coinet-platform/src/api/chat/service.ts` (2124 lines) is out of scope.

### 15.2 Why Out of Scope

BTAR-002 §21.8 (F-2) showed the service is highly coupled (27 mocks for a single test). A wholesale rewrite would be **higher risk than the bugs it would fix**: it would touch every chat surface at once, invalidate all empirical knowledge about current behavior, and create a 2,000+ line diff that no reviewer can meaningfully audit.

### 15.3 Allowed Instead — Bounded Extractions Only

```text
judgment availability resolver (BTAR-003)
prompt package builder (BTAR-004)
AI output safety gate (BTAR-005)
failure classifier (BTAR-006)
context boundary wrapper (BTAR-006)
```

These are extractions of cohesive concerns out of `service.ts` into named small files (Plan 2.0 §2.2), not parallel implementations of the chat service.

### 15.4 Forbidden

```text
chat-service-v2.ts
chat-service-rewritten.ts
chat-service-final.ts
new chat runtime
full service class replacement
generic orchestration framework
major behavior rewrite in a single BTAR
```

### 15.5 Rule

> Extract seams only when a specific BTAR requires them. Never extract speculatively. Never extract more than the BTAR's mission trace justifies.

### 15.6 Exception Path

FRP under Plan 1.5 §8. Default: **DEFER**.

---

## 16. OOS-012 — New `ai-service-v2.ts`

### 16.1 Boundary

Creating a new AI service implementation is forbidden. Per Plan 1.5 §6 (PSC-001..010) and Plan 1.5 §11 (prohibited naming patterns), a parallel `ai-service-v2.ts` would itself be a sprawl violation.

### 16.2 Why Out of Scope

Phase 2 must harden the existing `services/ai-service.ts` boundary, not create a parallel AI path. A parallel AI service multiplies the surface that must be tested and creates exactly the kind of "two pipelines" condition the program is trying to retire (per MEMORY.md "CRITICAL TRUTH" section).

### 16.3 Allowed Instead

```text
output safety gate before/after aiService.analyze()
typed wrapper around the existing call
narrow result validation
deterministic post-processing
```

### 16.4 Forbidden

```text
ai-service-v2.ts
ai-service-final.ts
ai-service-safe.ts as a parallel replacement
new provider orchestration service
provider-switching meta-runtime
```

### 16.5 If Replacement Becomes Necessary

FRP under Plan 1.5 §8, naming the old path, the new path, and the retirement trigger. Default within Phase 2 scope: **DENY**.

---

## 17. OOS-013 — New `judgment-engine-final.ts`

### 17.1 Boundary

Creating a new judgment engine path is forbidden.

### 17.2 Why Out of Scope

Phase 2 must work **with** `produceJudgment()`, not bypass it. Bypassing it would either (a) re-introduce the parallel-pipeline problem at the judgment layer, or (b) silently constitute the L9/L11/L12/L13 reconciliation decisions that are explicitly deferred.

### 17.3 Allowed Instead

```text
JudgmentAvailabilityState wrapper around produceJudgment()
failure classifier for judgment output
typed adapter around the existing result
deterministic timing/timeout discipline around the call
```

### 17.4 Forbidden

```text
judgment-engine-v2.ts
judgment-engine-final.ts
new produceJudgment replacement
parallel hypothesis/scenario engine
new active judgment orchestrator
```

### 17.5 Exception Path

FRP. Default within Phase 2 scope: **DENY**.

---

## 18. OOS-014 — New Parallel Chat Runtime

### 18.1 Boundary

No new chat runtime.

### 18.2 Forbidden

```text
chat-service-v2.ts
chat-runtime.ts replacing service.ts
new orchestration runtime
new conversational agent engine
new chat router service
new chat dispatcher
```

### 18.3 Allowed

```text
small helper files imported by current chat service
test-only mocks
failure-path test files under apps/coinet-platform/src/api/chat/__tests__/
named helpers per Plan 2.0 §2.2 (judgment-availability.ts, judgment-prompt-package.ts, ai-output-safety-gate.ts, chat-failure-classifier.ts)
```

### 18.4 Exception Path

FRP. Default: **DENY**.

---

## 19. OOS-015 — New L*.X Sublayers

### 19.1 Boundary

No new layer subprograms. Plan 1.4 FRZ-001 remains active.

### 19.2 Forbidden

```text
L14.11
L13.13
L15
new architecture layer docs
new constitutional runtime modules
new dormant programs
```

### 19.3 Allowed

```text
bounded borrowing of existing concepts (Plan 1.4 Class D)
documentation references
policy terminology reuse
type-shape inspiration for Phase 2 helpers
```

### 19.4 Exception Path

AFE under Plan 1.4 / Plan 1.10. Default: **DENY**.

---

## 20. OOS-016 — Real Provider-Dependent Test Suite

### 20.1 Boundary

Tests must not require paid or live provider calls.

### 20.2 Why Out of Scope

Phase 2 test truth must be deterministic, cheap, and controllable. A test that fails when CoinGecko, OpenAI, or any other external provider is down is not a test of the system — it is a test of the provider's uptime.

### 20.3 Forbidden

```text
tests that call CoinGecko live
tests that call OpenAI/Grok live
tests that require provider keys
tests that fail when an external API is down
```

### 20.4 Allowed Instead

```text
mocked provider failure (for UNAVAILABLE state tests)
mocked provider timeout (for timeout-class UNAVAILABLE tests)
mocked degraded data (for DEGRADED state tests)
synthetic SignalSnapshot (for AVAILABLE state tests)
deterministic AI client mocks
```

### 20.5 Exception Path

UDF under Plan 1.10 only for a one-shot diagnostic, sunset within the same PR. Default: **DENY**.

---

## 21. OOS-017 — Full Frontend/Backend Product Integration

### 21.1 Boundary

Phase 2 is backend live-path trust. It does not connect the frontend (`apps/client-web`) to all backend surfaces.

### 21.2 Allowed

```text
preserve existing response shape (ChatMessageResponse)
add internal metadata to ChatTrustEvidence carefully, in backward-compatible form
document future frontend needs in a Phase 2 BTAR's "downstream impact" section
```

### 21.3 Forbidden

```text
large frontend integration as a Phase 2 BTAR scope
new dashboard endpoints
new report UI backend
portfolio frontend wiring
new public API surface for frontend consumption
```

### 21.4 Exception Path

SCR. Default: **DEFER**.

---

## 22. OOS-018 — Performance Optimization Unrelated to Trust

### 22.1 Boundary

Performance work is out of scope **unless** it directly affects live-path trust.

### 22.2 Allowed

```text
prevent per-message external fan-out (F-4) from causing silent degradation
add timeout classification (for UNAVAILABLE state)
add degradation state recognition for slow dependencies
short-circuit fan-out when the result will be DEGRADED anyway
```

### 22.3 Forbidden

```text
generic speed optimization
database indexing sweep
cache architecture as a standalone project
large performance platform
Redis introduction
queue/worker architecture
```

### 22.4 Exception Path

SCR. Default: **DEFER**.

---

## 23. API Boundary Doctrine

### 23.1 Canonical Rule

> **Phase 2 must make the current live path trustworthy under controlled inputs before real paid API integration becomes load-bearing.**

### 23.2 Reasoning

Real APIs increase signal volume, latency, cost, and failure modes. If the runtime cannot honestly handle:

```text
mock failure
synthetic timeout
partial context
unavailable judgment
unsafe AI output
```

then real APIs will make the product **louder, not smarter**. A noisy untrustworthy runtime is worse with real data than with fake data, because the noise becomes harder to distinguish from signal.

### 23.3 Operating Order (Canonical)

```text
1. Controlled fake data                  (Phase 2 — now)
2. Controlled degraded states            (Phase 2 — now)
3. Controlled failure paths              (Phase 2 — now)
4. Trustworthy response behavior         (Phase 2 done definition)
5. Real API integration                  (post-Phase-3, separately planned)
```

### 23.4 Forbidden Inversion

```text
Buy APIs
→ wire them everywhere
→ hope the AI behaves correctly
```

This order is not allowed. It re-creates the silent-fallback pattern at the provider layer.

### 23.5 Interaction With OOS-007

The API Boundary Doctrine is the **rationale** behind OOS-007. OOS-007 is the **rule**. §23 explains the rule; §11 enforces it.

---

## 24. Out-of-Scope Registry Structure

### 24.1 Registry File

The companion registry at `apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-out-of-scope.registry.md` mirrors §§5..22 in tabular form. Each row carries:

```text
oos_id
name
status
why_out_of_scope
allowed_instead
exception_path
reassessment_trigger
```

### 24.2 Example Rows

| OOS ID  | Name                          | Status   | Allowed Instead                  |
| ------- | ----------------------------- | -------- | -------------------------------- |
| OOS-001 | Full CIP.1                    | DEFERRED | Bounded concept reuse            |
| OOS-002 | L13/L14 production migration  | DEFERRED | Bounded safety-pattern reuse     |
| OOS-007 | Deep real API integration     | DEFERRED | Mocked/synthetic provider states |
| OOS-011 | Full chat service rewrite     | BLOCKED  | Bounded extraction               |

### 24.3 Status Vocabulary

```text
DEFERRED      — out of scope for Phase 2; reassessment trigger named.
BLOCKED       — out of scope for Phase 2 and an active anti-pattern (sprawl/duplicate-runtime class).
EXCEPTION_OPEN — a Plan 1.10 exception is currently active for a bounded crossing.
RESOLVED       — Phase 2 finished without crossing; archived for posterity.
```

### 24.4 Append-Only Discipline

The registry is append-only at the row level for the duration of Phase 2. Status fields are mutable; descriptions and `why_out_of_scope` are not. New OOS-NNN items may be appended; existing OOS-NNN items may not be deleted.

---

## 25. BTAR Admission Check

### 25.1 Mandatory Five Questions

Every Phase 2 BTAR admission record (per Plan 1.6 §12) must answer:

```text
Q1. Does this BTAR touch any OOS item?
Q2. If yes, which OOS-NNN?
Q3. Is the touch ALLOWED, FORBIDDEN, or EXCEPTION_REQUIRED?
Q4. Does the BTAR include any required caution language (e.g., §14.5)?
Q5. Does the BTAR create new architecture, a new service variant, or a new provider dependency?
```

### 25.2 Outcome Mapping

```text
All ALLOWED                                       → admission may proceed (eight-question gate continues)
Any FORBIDDEN                                     → TAD-D (BLOCK)
Any EXCEPTION_REQUIRED and exception NOT filed    → TAD-D (BLOCK) until SCR/AFE/VSE/FRP/UDF is filed
Q4 answer absent when required                    → TAD-D (BLOCK)
Q5 answer YES                                     → TAD-D unless explicit allowance under §§15.3 / 16.3 / 17.3 / 18.3
Uncertain                                         → TAD-E (ESCALATE) — owner adjudicates with Plan 2.3 in hand
```

### 25.3 Reviewer Duties

The Plan 1.9 reviewer must:

1. Read the BTAR's Q1..Q5 answers and verify them against the actual diff.
2. Verify that any "ALLOWED" answer cites the specific allowance subsection (e.g., §15.3 bullet).
3. Verify any exception record (SCR/AFE/VSE/FRP/UDF) exists and is ACTIVE before merging.
4. Reject the PR if the diff touches an OOS item not declared in the BTAR's Q2 answer.

### 25.4 Single-Source-of-Truth Note

The BTAR admission record is the single source of truth for Q1..Q5 answers. PR descriptions may summarize them but must not contradict them. If a PR diverges from the BTAR's Q1..Q5 answers, the PR is rejected and the BTAR must be amended (or a new BTAR filed) before re-submission.

---

## 26. Exception Pathway

### 26.1 No New Exception System

Plan 2.3 does **not** create a new exception system. It inherits Plan 1.10 verbatim.

### 26.2 Available Exception Procedures

| Procedure | Source plan | When to use |
| --- | --- | --- |
| **SCR** | Plan 1.7 / Plan 1.10 | Cross a positive/negative scope boundary (any OOS-NNN crossing that is not architecture-class or duplicate-class) |
| **AFE** | Plan 1.4 / Plan 1.10 | Cross OOS-015 (new L*.X) or other architecture-freeze items |
| **VSE** | Plan 1.5 §15 / Plan 1.10 | Cross OOS-010 / OOS-012 / OOS-013 / OOS-014 (sprawl-class) |
| **FRP** | Plan 1.5 §8 | Genuine replacement (OOS-011 / OOS-012 / OOS-013 / OOS-014 if the goal is honest retirement) |
| **BSCP** | Plan 1.5 §9 | Bounded shadow comparison (limited diagnostic only) |
| **UDF** | Plan 1.6 §17 / Plan 1.10 | One-shot urgent defect with sunset in the same PR |

### 26.3 Default Decision

> **DENY / DEFER**

Any out-of-scope crossing carries a default decision of DENY or DEFER. The burden of proof is on the proposer.

### 26.4 Required Proof For Exception Approval

Per Plan 1.10 §§EQS / Anti-Loophole, the exception record must prove:

```text
production necessity        — name the existing user-visible failure / risk
minimality                  — diff scoped to the minimum that addresses the necessity
time bound                  — sunset date defined; no open-ended exceptions
rollback path               — feature flag / kill switch / revert plan named
no safer alternative        — alternatives considered and rejected with reasons
no architecture expansion   — no new layers, no new dormant programs, no new constitutional surfaces
```

### 26.5 Exception Record Lifecycle

Exception records follow Plan 1.10's twelve-state lifecycle. Plan 2.3 adds no new states.

---

## 27. Verification Criteria

Plan 2.3 is **complete** only if a future engineer who has never seen the conversation can answer the following from the repo-resident document alone:

```text
V1. What is out of scope in Phase 2?
V2. Why is full CIP.1 out?
V3. Why is L13/L14 migration out?
V4. Why are Strategy Lab and Chart Canvas out?
V5. Why are real APIs deferred?
V6. What can be done instead of full API integration?
V7. Why is broad cleanup out?
V8. What is the boundary around chat service refactor?
V9. Can a BTAR touch an OOS item?
V10. What exception path applies?
```

Self-check (answered from this document):

| Question | Answer location |
| --- | --- |
| V1 | §4.1 (the 18 OOS items) |
| V2 | §5.2 |
| V3 | §6.2 + §6.6 |
| V4 | §7.2, §8.2 |
| V5 | §11.2 + §23 |
| V6 | §11.3 + §23.3 |
| V7 | §14.2 |
| V8 | §15.2 + §15.3 + §15.5 |
| V9 | §25 (yes, under the ALLOWED/EXCEPTION conditions of §§5..22) |
| V10 | §26.2 (Plan 1.10 procedures, inherited) |

All ten verification questions are answerable from this document. **V-check PASS.**

---

## 28. Done Definition

Plan 2.3 is **done** when:

> **Phase 2 has a repo-resident out-of-scope boundary document and registry that explicitly prevents live-path trust hardening from expanding into full CIP.1, L13/L14 production migration, Strategy Lab, Chart Canvas, plugin systems, agent builders, deep real API integration, full calibration ecosystems, advanced alerts, broad duplicate cleanup, full chat service rewrite, new AI/judgment service variants, new L\*.X architecture, real provider-dependent tests, frontend integration, or unrelated performance work. It also defines what bounded substitutes are allowed, how each Phase 2 BTAR must check out-of-scope contact, and which exception path is required when a boundary must be crossed.**

Satisfaction check at adoption (2026-05-23):

- 18 OOS items defined with description / why / allowed-instead / reassessment / exception path: **YES** (§§4, 5..22).
- API boundary doctrine stated: **YES** (§23).
- BTAR admission check (Q1..Q5) defined: **YES** (§25).
- Exception pathway inherited from Plan 1.10: **YES** (§26).
- Verification questions V1..V10 answerable from document: **YES** (§27).
- Companion registry exists: **YES** (`phase-2-out-of-scope.registry.md`).
- Cross-phase indexing updated: **YES** (both Phase 1 and Phase 2 record-index + decision-log).

Done definition: **MET.**

---

## 29. Required Updates

After this document is written, the following registries are updated in the same work session:

```text
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-out-of-scope.registry.md
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-record-index.registry.md
apps/coinet-platform/docs/backend-v1/phase-2/registries/phase-2-decision-log.registry.md
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md   (cross-phase indexing per Plan 1.7 §10.3)
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md   (cross-phase indexing per Plan 1.7 §10.3)
```

No source files are touched. BTAR-003 remains pre-admission.

---

## 30. Acceptance Block

```text
Plan: 2.3 — Out-of-Scope Boundaries
Status: ACTIVE
Effective: 2026-05-23
Authority: Plan 2.0 (Phase 2 General Plan, ACTIVE); Plan 2.1 (Mission and First Principle, ACTIVE)
Inheritance audit:
  Plan 1.1  ACTIVE
  Plan 1.2  ACTIVE
  Plan 1.3  ACTIVE   (NB-001..010 still deferred; OOS-001..010 reaffirm them within Phase 2)
  Plan 1.4  ACTIVE   (FRZ-001..008 reinforced by OOS-015)
  Plan 1.5  ACTIVE   (PSC-001..010 reinforced by OOS-011..014)
  Plan 1.6  ACTIVE   (admission gate extended by §25 Q1..Q5)
  Plan 1.7  ACTIVE
  Plan 1.8  ACTIVE
  Plan 1.9  ACTIVE   (daily enforcement extended by §25.3 reviewer duties)
  Plan 1.10 ACTIVE   (exception procedures inherited by §26)
  Plan 1.11 COMPLETED
  Plan 1.12 COMPLETED
  Plan 2.0  ACTIVE
  Plan 2.1  ACTIVE
Dependent records: F-1..F-4 (chat trust findings); BTAR-002 §21.8; bridge ledger fingerprint bridge.ledger.fa2d884e
Authorizes: nothing implementational; negative-scope governance only
Does not authorize: any BTAR; any code change; any new file under src/**; any L*.X modification; any NB-001..NB-010 opening; any OOS-001..018 crossing without a Plan 1.10 exception record
Default decision on any OOS crossing: DENY / DEFER
Next admissible step (unchanged from Plan 2.1): BTAR-003 admission plan under Plan 2.0 §11.1 — must answer §25 Q1..Q5
```

---

## 31. Glossary

| Term | Definition |
| --- | --- |
| **OOS-NNN** | An out-of-scope item, one of OOS-001..OOS-018 (Phase 2 closed list at adoption) |
| **Bounded substitute** | The allowed alternative named in each OOS item's "allowed instead" subsection |
| **Reassessment trigger** | The event after which an OOS item could be reconsidered for inclusion in a future phase |
| **Exception path** | The Plan 1.10 procedure (SCR / AFE / VSE / FRP / BSCP / UDF) required for a Phase 2 task to cross an OOS boundary |
| **Scope drift** | A task that expands beyond its admitted scope; canonical justifications listed in §3.3 R1..R5 |
| **API Boundary Doctrine** | The §23 canonical rule that controlled inputs must be trustworthy before real APIs become load-bearing |
| **DENY / DEFER** | The default decision on any OOS crossing absent a fully-proven exception record |
| **Plan-2.3-INV-01** | The §3.4 invariant that every Phase 2 BTAR answers YES to at least one Q1..Q5 filter question and reduces to none of R1..R5 |

---

## 32. Final Production Formulation

> **Plan 2.3 establishes the negative scope boundary of Coinet backend Phase 2. Its purpose is to keep live judgment/chat/AI trust hardening focused and prevent it from expanding into full CIP.1, L13/L14 production migration, Strategy Lab, Chart Canvas, plugin systems, agent builders, deep real API integration, full calibration ecosystems, advanced alerts, broad duplicate cleanup, full chat service rewrite, new AI or judgment service variants, new architecture layers, real provider-dependent tests, frontend integration, or unrelated performance work. Its central doctrine is that Phase 2 must make the current live path trustworthy under controlled inputs before real APIs and broader systems become load-bearing. Every Phase 2 BTAR must check itself against this boundary, name any out-of-scope contact, and either remain within allowed bounded substitutes or go through the formal exception path.**

Plan 2.3 ends here.
