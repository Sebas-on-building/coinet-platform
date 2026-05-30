# Backend v1 Non-Blocker and Non-Scope Registry

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.3
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From:
  - Plan 1.1 — Phase 1 Charter (`phase-1-charter.md`)
  - Plan 1.2 — Backend v1 Product Boundary (`backend-v1-product-boundary.md`)
Supersedes: All implicit, undocumented, or chat-only assumptions about which backend systems may be allowed to delay Coinet v1

---

## 0. Document Identity and Authority

This document is the **negative-scope authority** of the Coinet Backend v1 program. It is the third plan inside Phase 1 and the complement of Plan 1.2.

Where Plan 1.2 said:

> "These backend surfaces belong to Coinet v1 and deserve active engineering attention."

this document says:

> **"These backend areas, systems, and ambitions are explicitly not allowed to delay Coinet v1 backend completion."**

This document:

- does not implement any code,
- does not delete any code,
- does not refactor any module,
- does not reclassify any v1 surface from Plan 1.2,
- does not begin Plan 1.4 enforcement work,
- does not approve any provider/API integration.

It performs one job and one job only:

> **It identifies every major backend area outside the v1 product boundary, classifies it into one of six negative-scope classes, and declares what is prohibited now, what is allowed now, and when (if ever) the area may be reassessed.**

Where this document and any later subplan conflict on the question of what is or is not a v1 backend blocker, this document prevails until amended through the change-control procedure in Plan 1.1 §13.

### 0.1 Pre-execution Dependency Check (Performed)

Before this document was finalized, the executing system confirmed:

1. `apps/coinet-platform/docs/backend-v1/phase-1/phase-1-charter.md` exists and is in `ACTIVE` status. ✅
2. `apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-product-boundary.md` exists and is in `ACTIVE` status. ✅
3. The active-runtime reference correction has been applied to Plans 1.1 and 1.2. The authoritative active path is now recorded as:
   ```text
   /api/chat
     → api/chat/service.ts
       → buildSignalSnapshot()
       → produceJudgment()
       → formatJudgmentForAI()
       → aiService.analyze()
         → services/ai-service.ts
   ```
   The false `services/explanations/` reference has been removed from both prior plans. ✅

Plan 1.3 therefore inherits from truth-clean upstream documents.

---

## 1. Section 1.3.1 — Constitutional Purpose of the Negative Scope Registry

### 1.3.1.1 Canonical Purpose Statement

The constitutional purpose of Plan 1.3 is the following sentence, which is the **root authority of the negative backend scope**:

> **The Explicit Non-Blocker and Non-Scope Registry exists to protect Coinet backend v1 from being delayed by valuable but non-essential future systems, dormant architectural ambitions, experimental modules, or product expansions that do not directly determine whether the current v1 backend can become truthful, stable, tested, and launchable.**

This sentence governs every exclusion and deferral decision made under Plan 1.3. If a later document loses sight of this sentence, the later document is wrong, not this one.

### 1.3.1.2 Why Negative Scope Matters as Much as Positive Scope

A positive scope says:

```text
These things matter.
```

A negative scope says:

```text
These other things are not allowed to hijack the schedule.
```

Both are required. Without Plan 1.3, Plan 1.2 is incomplete, because even after defining what is in scope, the team could still treat everything else as "parallel work that also matters." Plan 1.3 eliminates that ambiguity by giving every non-core backend topic a formal classification and a formal current instruction.

### 1.3.1.3 What Plan 1.3 Protects

Plan 1.3 protects six things, in order:

1. **Engineering focus** — attention is not infinitely scalable.
2. **Timeline honesty** — "we will also do X" is not a substitute for finishing v1.
3. **Backend v1 readiness** — completion criteria do not slide when something else becomes interesting.
4. **Resource discipline** — engineering capacity is allocated, not assumed.
5. **The Phase 1 → Phase 2 → Phase 3 execution boundary** declared in Plan 1.1 §8.
6. **The decision not to start API-heavy work before the backend logic is synthetically proven**, also declared in Plan 1.1 §7.3 (`DEFERRED`).

### 1.3.1.4 Non-Blocker Does Not Mean Worthless

This document formally declares: **classifying something as a non-blocker for v1 does not classify it as worthless, abandoned, or wrong.** Many of the entries below represent real, valuable, even strategically central future work. The classification here governs only one question:

> Is this required to ship Coinet v1 backend?

For every non-blocker, the answer is no. That is all the classification means. It says nothing about long-term value.

---

## 2. Section 1.3.2 — Inheritance From Plan 1.1 and Plan 1.2

### 1.3.2.1 Inheritance Statement

> **Plan 1.3 does not redefine Coinet v1's positive backend boundary. It complements Plan 1.2 by defining the explicit backend areas that are deferred, excluded, or conditionally non-blocking so that the v1 backend completion path remains finite.**

Specifically inherited:

**From Plan 1.1 (Phase 1 Charter):**

- backend expansion is frozen,
- the current pre-API execution boundary is Phase 1 → Phase 2 → Phase 3 → STOP AND REASSESS,
- the three allowed Phase 1 goals (technical honesty, live-path trustworthiness, synthetic judgment correctness),
- the three outcome categories (`LOCKED`, `DEFERRED`, `NOT YET DECIDED`),
- the change-control note in Plan 1.1 §13.

**From Plan 1.2 (Backend v1 Product Boundary):**

- the six-surface positive registry (V1-S01..V1-S06),
- the reasoning spine (Asset Judgment + AI Chat),
- the cross-surface dependency law,
- the first principle of v1 inclusion (Plan 1.2 §3.1).

Nothing in Plan 1.3 weakens these inherited rules.

### 1.3.2.2 Required Dependency Check Before Execution

The executing system confirmed the three preconditions stated in §0.1 above before producing this document. Those preconditions remain binding: if any of the upstream documents are later modified to contradict the inheritance above, this document must be re-validated through the Plan 1.1 §13 change-control note.

---

## 3. Section 1.3.3 — First Principle of Plan 1.3

### 1.3.3.1 Canonical First Principle

The governing exclusion doctrine of Plan 1.3 is:

> **A backend capability may be valuable, strategically important, or partially built and still be a non-blocker for Coinet v1 if the backend can become production-ready without completing it.**

This sentence is the antidote to the false logic `important later = required now`. The two are not the same.

### 1.3.3.2 Operational Translation

Every backend area that lies outside the Plan 1.2 product boundary must be assigned exactly one of the following classifications:

```text
DEFERRED_NOT_BLOCKING
CONDITIONAL_ONLY
ARCHITECTURALLY_VALID_BUT_NOT_ACTIVE
FUTURE_PRODUCT_SCOPE
REQUIRES_REASSESSMENT_AFTER_PHASE_3
```

These conceptual outcomes map onto the formal NS-A..NS-F taxonomy defined in §4. **No non-core backend initiative may remain ambiguously "kind of active."**

### 1.3.3.3 The Test for Whether Something Is a Non-Blocker

A backend area is a **non-blocker** if all five of the following are true:

1. Coinet v1 can deliver its core backend value without it.
2. It is not required to complete Phases 1–3.
3. It does not directly fix a production-critical failure in the active chat/judgment path.
4. It is not required for synthetic truth evaluation.
5. Deferring it does not make the backend dishonest or unsafe.

If all five are true, the area is a non-blocker and must not delay backend v1.

---

## 4. Section 1.3.4 — Negative Scope Classification System

Plan 1.3 defines six negative-scope classes. Every non-blocker registry entry in §5 is assigned at least one of these classes (some entries carry two when their character is hybrid).

### 1.3.4.1 The Six Classes

```text
NS-A — EXPLICITLY_DEFERRED
NS-B — NON_BLOCKING_EXISTING_SURFACE
NS-C — CONDITIONAL_ONLY_IF_ALREADY_SUPPORTABLE
NS-D — ARCHITECTURALLY_VALID_BUT_NOT_REQUIRED_FOR_V1
NS-E — FUTURE_PRODUCT_PROGRAM
NS-F — REASSESS_ONLY_AFTER_PHASE_3
```

### 1.3.4.2 Definitions

**`NS-A — EXPLICITLY_DEFERRED`**
The area is not active backend work now. It must not consume v1 completion time. No expansion. No partial completion. No "while we're here" extensions.

**`NS-B — NON_BLOCKING_EXISTING_SURFACE`**
The area may exist in code, but completion, polish, or expansion of it is not required for v1 backend readiness. Existing code is left alone unless it actively blocks v1 work.

**`NS-C — CONDITIONAL_ONLY_IF_ALREADY_SUPPORTABLE`**
The area may remain if already truthful and low-cost. It must not become a major workstream. The default action is to leave it alone; the burden of proof is on inclusion, not exclusion.

**`NS-D — ARCHITECTURALLY_VALID_BUT_NOT_REQUIRED_FOR_V1`**
The area represents valid long-term architecture (often already certified) but is not required to ship the v1 backend. Certification does not imply operationalization.

**`NS-E — FUTURE_PRODUCT_PROGRAM`**
The area belongs to a future product phase and must be treated as a separate program after the backend core is stable. It is not a "later in Phase 1" item; it is a different program entirely.

**`NS-F — REASSESS_ONLY_AFTER_PHASE_3`**
The area must not be decided in detail until backend stabilization (Phase 1), live-path trust hardening (Phase 2), and synthetic truth correctness (Phase 3) are all complete. Until then, it is parked.

---

## 5. Section 1.3.5 — Canonical Non-Blocker Registry

The following is the canonical registry. Every backend area outside the Plan 1.2 product boundary that has plausibly competed for engineering attention is named here. If an area surfaces later that is not in this registry, it must be either (a) admitted to Plan 1.2 via the Plan 1.1 §13 procedure or (b) added to this registry as an amendment.

### 5.1 Registry Table

| ID       | Area                                                             | Classification | Backend v1 launch blocker?                       | Current instruction                   |
| -------- | ---------------------------------------------------------------- | -------------- | ------------------------------------------------ | ------------------------------------- |
| `NB-001` | Strategy Lab backend                                             | `NS-E`         | **No**                                           | Defer                                 |
| `NB-002` | Chart Canvas backend                                             | `NS-E`         | **No**                                           | Defer                                 |
| `NB-003` | Plugin systems                                                   | `NS-E`         | **No**                                           | Defer                                 |
| `NB-004` | Experimental agent builders                                      | `NS-A`         | **No**                                           | Freeze / no expansion                 |
| `NB-005` | Full calibration proposal ecosystem                              | `NS-D`         | **No**                                           | Do not operationalize now             |
| `NB-006` | Full CIP.1 unified architecture                                  | `NS-F`         | **No, not before v1 backend logic correctness**  | Defer                                 |
| `NB-007` | Dormant L14 systems unless immediately necessary                 | `NS-D / NS-C`  | **No**                                           | Keep dormant unless directly required |
| `NB-008` | Deep real API/provider integration before purchase               | `NS-F`         | **No**                                           | Defer until APIs bought               |
| `NB-009` | Advanced alert delivery ecosystem beyond truthful minimal alerts | `NS-C / NS-E`  | **No**                                           | Conditional only                      |
| `NB-010` | Broad backend cleanup not directly needed for Phases 1–3         | `NS-B / NS-F`  | **No**                                           | Defer unless production risk          |

Detailed entries follow in §6 through §15.

---

## 6. Section 1.3.6 — NB-001 Strategy Lab Backend

### 6.1 Registry Entry

```text
NB-001 — STRATEGY_LAB_BACKEND
Classification: NS-E — FUTURE_PRODUCT_PROGRAM
Backend v1 launch blocker: No
```

### 6.2 Why It Is Explicitly Non-Blocking

Strategy Lab is strategically important for Coinet's future. It may eventually become one of the major differentiators of the broader product. But it does not determine whether the **v1 backend judgment system** is production-ready.

The backend v1 can be truthful, safe, judgment-capable, chat-capable, asset-aware, and radar-capable without shipping Strategy Lab backend.

### 6.3 What Is Prohibited Now

Do not begin or expand:

- strategy compiler backend,
- indicator graph backend,
- user-authored strategy execution engine,
- backtesting backend beyond any unavoidable existing infrastructure,
- marketplace-related Strategy Lab systems,
- collaborative strategy backend.

### 6.4 What Is Allowed

Allowed only if needed for code hygiene:

- documenting that existing Strategy Lab scaffolds are deferred,
- ensuring any current unfinished code does not break the backend build,
- isolating related unfinished modules if they interfere with production work.

### 6.5 Reassessment Trigger

Reassess only after:

```text
Backend v1 core is stable
+
Frontend/backend connection has begun or private beta is near
```

Not before.

---

## 7. Section 1.3.7 — NB-002 Chart Canvas Backend

### 7.1 Registry Entry

```text
NB-002 — CHART_CANVAS_BACKEND
Classification: NS-E — FUTURE_PRODUCT_PROGRAM
Backend v1 launch blocker: No
```

### 7.2 Why It Is Explicitly Non-Blocking

Chart Canvas is a future workbench capability. It may become important for later Coinet versions when users need to construct views around Coinet intelligence. But the current production objective is to finish the backend judgment system. Chart Canvas backend is not required for chat, asset judgment, market terminal, radar, or essential persistence.

### 7.3 What Is Prohibited Now

Do not start or deepen:

- chart editing backend,
- canvas state synchronization,
- custom layer persistence,
- multi-user chart collaboration,
- programmable visual strategy backends,
- Chart Canvas-specific API contracts.

### 7.4 What Is Allowed

If the current frontend references Chart Canvas placeholders, the backend may:

- return explicit "not active in v1 backend" states if needed for frontend stability during integration,
- provide no-op or unavailable state only if necessary.

No substantive backend work belongs here now.

### 7.5 Reassessment Trigger

Reassess only after Phase 3 completes and frontend integration begins.

---

## 8. Section 1.3.8 — NB-003 Plugin Systems

### 8.1 Registry Entry

```text
NB-003 — PLUGIN_SYSTEMS
Classification: NS-E — FUTURE_PRODUCT_PROGRAM
Backend v1 launch blocker: No
```

### 8.2 Why It Is Explicitly Non-Blocking

Plugins introduce extension safety, permissioning, marketplace governance, version compatibility, sandboxing, monetization, and user-installed logic. None of that is required to prove that Coinet v1 backend itself works.

### 8.3 What Is Prohibited Now

Do not deepen:

- plugin runtime,
- plugin registry,
- plugin execution sandboxes,
- plugin billing,
- plugin moderation,
- plugin review pipelines.

Even if models or schema tables for plugins exist in the repository, they are **not part of the v1 backend completion path**.

### 8.4 What Is Allowed

Allowed:

- keeping existing schema/code dormant if not harmful,
- marking plugin models as non-v1 in later inventory/classification,
- fixing compilation issues only if they block the backend build.

Not allowed: expanding functionality, adding new plugin surfaces, or operationalizing the plugin runtime.

### 8.5 Reassessment Trigger

Reassess only after the backend v1 ships and a deliberate post-v1 program is authorized.

---

## 9. Section 1.3.9 — NB-004 Experimental Agent Builders

### 9.1 Registry Entry

```text
NB-004 — EXPERIMENTAL_AGENT_BUILDERS
Classification: NS-A — EXPLICITLY_DEFERRED
Backend v1 launch blocker: No
```

### 9.2 Why It Is Explicitly Deferred

The active backend already has a difficult mission: produce trusted judgment, communicate it safely, prove synthetic correctness, prepare for real data. Agent builders introduce a completely different product problem — agent state, tool orchestration, agent permissions, autonomous runs, agent debugging, user-created behavior. This is a future domain, not a Phase 1 domain.

### 9.3 What Is Prohibited Now

No active backend work on:

- agent creation,
- agent rule engines,
- autonomous workflows,
- agent visual logic interpreters,
- agent strategy dispatch,
- agent evaluation surfaces.

### 9.4 What Is Allowed

If frontend scaffolding exists, the backend remains uninvolved. At most:

- document them as non-v1,
- ensure they do not falsely imply backend readiness.

### 9.5 Reassessment Trigger

Not before backend v1 ships. Agent functionality is a distinct future program.

---

## 10. Section 1.3.10 — NB-005 Full Calibration Proposal Ecosystem

### 10.1 Registry Entry

```text
NB-005 — FULL_CALIBRATION_PROPOSAL_ECOSYSTEM
Classification: NS-D — ARCHITECTURALLY_VALID_BUT_NOT_REQUIRED_FOR_V1
Backend v1 launch blocker: No
```

### 10.2 Why This Entry Is Different

Unlike Strategy Lab or Plugins, the calibration proposal ecosystem is **not frivolous**. It is architecturally aligned with Coinet's long-term moat. The L14 work proved delivery feedback, outcome evaluation, calibration evidence, and governed proposal generation. Those are important.

But they are not required **before** the backend can become v1 production-ready.

### 10.3 What Is Prohibited Now

Do not start:

- live calibration proposal automation,
- proposal queues in production,
- analyst review consoles for proposal governance,
- full lower-layer recertification flows,
- calibration-driven backend self-improvement operations.

### 10.4 What Is Allowed

Allowed:

- preserve certified code,
- reference it later in design discussions,
- potentially add minimal logging hooks in later phases if they directly help post-launch evaluation.

**Full operationalization is not a backend v1 blocker.**

### 10.5 Reassessment Trigger

Reassess only after Phase 3 completes and the active runtime is stable enough that proposal feedback would have something honest to feed on.

---

## 11. Section 1.3.11 — NB-006 Full CIP.1 Unified Architecture

### 11.1 Registry Entry

```text
NB-006 — FULL_CIP1_UNIFIED_ARCHITECTURE
Classification: NS-F — REASSESS_ONLY_AFTER_PHASE_3
Backend v1 launch blocker: No, not now
```

### 11.2 Why This Must Be Explicitly Protected

CIP.1 is valuable. Eventually, a unified end-to-end architecture matters. But right now, it would distract from the immediate backend truth:

- fix build integrity,
- harden the active runtime,
- prove synthetic correctness.

Attempting full CIP.1 before those are done would invert priorities.

### 11.3 What Is Prohibited Now

Do not start:

- full active/certified runtime unification,
- L1→L14 exhaustive integration certification,
- broad reconciliation implementation,
- multi-month canonicalization of every dormant layer,
- replacing the live product path wholesale before the active backend is hardened.

### 11.4 What Is Allowed

Allowed:

- preserve the Reconciliation Matrix scaffolding,
- use it later when reconciliation work begins,
- borrow critical ideas from certified architecture when they directly harden v1 (e.g., a single L13.2 validator invocation in the live path counts as hardening, not as CIP.1),
- continue to track future unification blockers without acting on all of them now.

### 11.5 Reassessment Trigger

CIP.1 may be reconsidered only after:

```text
Phase 1 complete
Phase 2 complete
Phase 3 complete
Backend synthetic truth suite green
Major active runtime flaws fixed
```

At that point, the project may decide whether any CIP.1-adjacent move becomes launch-relevant or remains post-v1.

---

## 12. Section 1.3.12 — NB-007 Dormant L14 Systems Unless Immediately Necessary

### 12.1 Registry Entry

```text
NB-007 — DORMANT_L14_SYSTEMS
Classification: NS-D / NS-C
Backend v1 launch blocker: No
```

### 12.2 Why This Needs Nuance

L14 contains valuable, certified downstream systems:

- delivery,
- feedback,
- outcome evaluation,
- calibration evidence,
- proposal governance,
- persistence/replay/repair,
- rollout/experimentation.

These systems are real and meaningful. But they are **not automatically required** for the backend to reach v1 production readiness.

### 12.3 Conditional Rule

Dormant L14 code may become relevant **only if** it directly supports one of the current v1 surfaces defined in Plan 1.2 without introducing a large new workstream. Examples:

- minimal truthful alert persistence if V1-S06 alerts stay in scope,
- minimal interaction logging if needed later for v1 feedback,
- **not** full compounding loops.

### 12.4 What Is Prohibited Now

Do not start:

- full L14 runtime product wiring,
- full calibration compounding loop activation,
- analyst console operations,
- rollout experimentation infrastructure,
- current/future registry refresh systems unless directly needed.

### 12.5 What Is Allowed

Allowed:

- referencing certified L14 contracts when narrow integration is justified by a Plan 1.2 surface,
- preserving the L14 architecture as-is.

### 12.6 Reassessment Trigger

Each dormant L14 surface is reassessed on a per-surface basis, only when an active Plan 1.2 surface concretely demands it. There is no general L14 reassessment date.

---

## 13. Section 1.3.13 — NB-008 Deep Real API / Provider Integration Before Purchase

### 13.1 Registry Entry

```text
NB-008 — DEEP_REAL_API_PROVIDER_INTEGRATION_BEFORE_PURCHASE
Classification: NS-F — REASSESS_ONLY_AFTER_PHASE_3 / API_PURCHASE
Backend v1 launch blocker: No right now
```

### 13.2 Why This Must Be Explicit

The Phase 1 Charter establishes that the pre-API execution boundary is Phases 1–3 only. Therefore:

- no deep provider integration,
- no real endpoint smoke suite,
- no API retry/fallback implementation program,
- no quota/performance tuning,
- no provider-specific authentication or transport hardening.

### 13.3 What Is Allowed

A single concession: an optional later **Phase 3.5** lightweight normalized internal signal schema may be drafted, but only if Phase 3 finishes early and the team explicitly authorizes preparation. This is preparation, not integration.

```text
Define normalized internal signal schema that real APIs will later populate.
```

### 13.4 Reassessment Trigger

When the APIs are purchased and Phases 1–3 are complete. Until both conditions hold, deep provider integration remains deferred.

---

## 14. Section 1.3.14 — NB-009 Advanced Alert Delivery Ecosystem

### 14.1 Registry Entry

```text
NB-009 — ADVANCED_ALERT_DELIVERY_ECOSYSTEM
Classification: NS-C / NS-E
Backend v1 launch blocker: No
```

### 14.2 Why This Follows From Plan 1.2

Plan 1.2 declared:

```text
V1-S06 Truthful Alerts = CONDITIONAL ADMISSIBLE
```

That means minimal alerts may survive if supportable, but full alert infrastructure must not delay backend v1.

### 14.3 What Is Prohibited Now

Do not start:

- multi-channel routing ecosystem,
- advanced Telegram control planes,
- push notification infrastructure,
- digest cadences,
- frequency policy systems,
- operational alert experiments,
- engagement-driven prioritization of any kind (constitutionally prohibited by L14 and reaffirmed here).

These belong later unless absolutely required by a truthful existing alert surface, and even then only via the conditional rule in Plan 1.2 §10.3.

### 14.4 What Is Allowed

Allowed:

- the minimal truthful-alerts surface admitted by Plan 1.2 §10, if and only if the six conditions of Plan 1.2 §10.3 hold,
- minimal persistence sufficient to trace what was sent.

### 14.5 Reassessment Trigger

Reassess only after backend v1 ships and a deliberate post-v1 alert program is authorized.

---

## 15. Section 1.3.15 — NB-010 Broad Backend Cleanup Not Required for Phases 1–3

### 15.1 Registry Entry

```text
NB-010 — BROAD_BACKEND_CLEANUP_NOT_REQUIRED_FOR_PHASES_1_TO_3
Classification: NS-B / NS-F
Backend v1 launch blocker: No by default
```

### 15.2 Why This Entry Exists

The codebase audit identified real duplication and monolith problems (e.g., multiple derivatives implementations, oversized `services/` files, `services/omniscore_v3/` parallel to certified L11). Those matter.

But Plan 1.3 must prevent a different kind of derailment:

> "We discovered tech debt, so let's spend weeks refactoring everything before proving the runtime is trustworthy."

That would also be scope drift, just dressed as hygiene.

### 15.3 Correct Rule

Cleanup is active **only if** it directly supports one of:

- build truth,
- live runtime trustworthiness,
- testability,
- synthetic truth suite execution.

**Examples that may be active:**

- splitting just enough of `api/chat/service.ts` to make the critical path testable,
- removing a duplicate that actively confuses the live runtime.

**Examples that are deferred:**

- total database taxonomy cleanup,
- full repo-wide duplicate-deletion program,
- total `index.ts` rewrite if not needed before Phase 2/3,
- speculative reconciliation of `services/omniscore_v3/` with L11 (that is Reconciliation Matrix work, not Phase 1 work).

### 15.4 Reassessment Trigger

Cleanup that is not directly Phases-1-to-3-relevant is reassessed only after Phase 3 completes.

---

## 16. Section 1.3.16 — Borderline Case Decision Law

Some work will sit near the boundary and tempt reclassification. Plan 1.3 establishes a formal test so borderline cases are decided consistently, not by mood.

### 16.1 The Five-Question Borderline Test

For any proposed backend task that touches a non-blocker area, ask:

1. Does this directly unblock a Plan 1.2 surface?
2. Does this directly prevent a production failure in the active backend?
3. Does this directly improve synthetic truth correctness?
4. Can backend v1 still ship without it?
5. Would doing it now meaningfully delay Phases 1–3?

### 16.2 Decision Outcomes

If answers 1–3 are mostly **No**, and answer 4 is **Yes**, and answer 5 is **Yes**, then:

```text
Defer.
```

If answers 1–3 contain at least one clear **Yes** anchored to a specific Plan 1.2 surface, the work may proceed under the relevant phase's normal authority — but it must still be the minimum work required to advance that surface.

### 16.3 Worked Examples

**Example A — "Should we operationalize the L14 proposal queue now?"**

- Does chat/judgment backend need it? No.
- Does it prevent a current production failure? No.
- Does it improve synthetic truth correctness? No.
- Can v1 ship without it? Yes.
- Would doing it now delay Phases 1–3? Yes.

→ **Defer.** (NB-005 confirms.)

**Example B — "Should we add one minimal judgment persistence record because the truth suite needs replayability?"**

- Does it support backend correctness? Possibly.
- Does it directly improve synthetic truth correctness? Yes (if the truth suite genuinely needs replayability).
- Can it be done minimally without delaying Phases 1–3? Yes.

→ **Allow at minimum scope.** Not automatically deferred.

**Example C — "Should we refactor `services/omniscore_v3/` to merge with L11 right now?"**

- Does it directly unblock a Plan 1.2 surface? No (V1-S04 Radar can ship with one of them).
- Production failure in the live path? No.
- Synthetic truth correctness? No.
- Can v1 ship without the merge? Yes.

→ **Defer** to the Reconciliation Matrix program. (NB-010 confirms.)

### 16.4 Borderline Test Authority

The five-question test is the **only** admissible test for borderline cases under Phase 1. Other heuristics (e.g., "this would be quick," "we're already in the file") do not override it.

---

## 17. Section 1.3.17 — Required Governance Artifacts

### 17.1 Mandatory Primary Artifact

The mandatory primary artifact of Plan 1.3 is **this document**, located at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-non-blocker-and-non-scope-registry.md
```

### 17.2 Required Sections (Satisfied by This Document)

1. Document identity and status (Section 0 and front matter),
2. Purpose (Section 1),
3. Inheritance from Plans 1.1 and 1.2 (Section 2),
4. First principle (Section 3),
5. Negative-scope classification taxonomy (Section 4),
6. Canonical non-blocker registry table (Section 5),
7. Detailed entries NB-001 through NB-010 (Sections 6–15),
8. Borderline case decision law (Section 16),
9. Relationship to future reassessment after Phase 3 (per-entry reassessment triggers + Section 19.2),
10. Explicit statement that non-blocker ≠ worthless (Section 1.4),
11. Done definition (Section 19.1),
12. Acceptance block (Section 21).

### 17.3 Optional Concise Summary Artifact

An optional table-only summary may be created at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-non-scope-registry-summary.md
```

If created, it must not contradict this document. Where they ever diverge, this document prevails.

---

## 18. Section 1.3.18 — Verification and Certification Criteria

Plan 1.3 is complete only when all of the following are simultaneously true.

### 18.1 Registry Completeness Criteria

The document covers all required non-blocker entries:

- Strategy Lab backend (NB-001) ✅
- Chart Canvas backend (NB-002) ✅
- Plugin systems (NB-003) ✅
- Experimental agent builders (NB-004) ✅
- Full calibration proposal ecosystem (NB-005) ✅
- Full CIP.1 (NB-006) ✅
- Dormant L14 systems unless immediately necessary (NB-007) ✅

And, to preserve the remembered execution boundary:

- Deep real API work before purchase (NB-008) ✅
- Advanced alert ecosystem (NB-009) ✅
- Broad non-essential cleanup (NB-010) ✅

### 18.2 Classification Criteria

Each non-blocker entry includes:

- registry ID,
- title,
- classification (NS-A..NS-F),
- backend v1 blocker status,
- reason it is non-blocking,
- what is prohibited now,
- what is allowed now,
- reassessment trigger where relevant.

### 18.3 Boundary Criteria

The document makes it impossible to accidentally conclude that:

- Strategy Lab backend is a v1 requirement,
- full Chart Canvas backend is a v1 requirement,
- plugins are a v1 requirement,
- autonomous agent builders are a v1 requirement,
- full L14 calibration proposal activation is a v1 requirement,
- CIP.1 must be completed before backend v1 is ready,
- deep API work should begin before the APIs are purchased.

### 18.4 Review Criteria

A reviewer must be able to answer from this document alone:

1. What is not allowed to delay backend v1?
2. Why is each excluded item non-blocking?
3. What is fully deferred?
4. What is only conditional?
5. What is valuable later but not necessary now?
6. When can each area be reconsidered?
7. How are borderline cases decided?

If the document cannot answer those questions, Plan 1.3 is not complete.

---

## 19. Section 1.3.19 — Done Definition and Transition to Plan 1.4

### 19.1 Done Definition

Plan 1.3 is complete only when:

> **Coinet backend v1 has a repo-resident negative-scope registry that explicitly identifies which backend systems, product ambitions, architectural programs, and future workstreams are not allowed to delay the v1 backend completion path; classifies each item by deferral type; states what is forbidden now and what is allowed; preserves the Phase 1–3 execution boundary; and establishes a decision law for borderline cases.**

This document satisfies that definition once accepted via Section 21.

### 19.2 Transition to Plan 1.4

Once Plan 1.3 is accepted, the next required step is:

> **Plan 1.4 — Architecture Expansion Freeze Law**

Plan 1.4 moves from:

```text
These things are out of scope.
```

to:

```text
Here is the explicit backend rule that prevents new architecture expansion
from re-entering the active roadmap.
```

The three plans together form a closed scope-control triangle:

```text
Plan 1.2 = Positive scope (what is in)
Plan 1.3 = Negative scope (what is not in)
Plan 1.4 = Freeze enforcement (what prevents re-expansion)
```

Until Plan 1.4 lands, the freeze is declared but not yet enforced beyond the change-control note in Plan 1.1 §13.

---

## 20. Glossary (Document-Local Definitions)

- **Non-blocker** — a backend area whose absence does not block Coinet v1 launch under the five-question test in §3.3.
- **Negative scope** — the set of backend areas explicitly excluded from active engineering attention for Phase 1.
- **Operationalize** — wire into the live product runtime such that user-facing behavior depends on it. Certified ≠ operationalized.
- **Dormant** — present in the repository (often certified) but not invoked by the live product path; the default state for L11, L12, full L13 runtime, and full L14 runtime as of 2026-05-19.
- **Reassessment trigger** — the explicit condition that must hold before a non-blocker entry may be reconsidered. Triggers are entry-specific and listed per registry entry.
- **Borderline case** — a proposed task that touches a non-blocker area but plausibly contributes to a Plan 1.2 surface; resolved by §16.1.

These definitions are document-local. Where another document in the repository uses these terms in a conflicting way, this document prevails for Phase 1 negative-scope purposes.

---

## 21. Acceptance Block

This registry is accepted when the following block is filled in. Until accepted, the document is treated as DRAFT regardless of the `Status` field in the front matter.

```text
Backend v1 Non-Blocker and Non-Scope Registry — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the negative-scope taxonomy in Section 4 as authoritative.
  [ ] I accept the ten registry entries NB-001..NB-010 as the canonical
      list of currently named non-blockers.
  [ ] I will not authorize backend work on any NB entry without invoking
      either the five-question borderline test in §16 or the change-control
      procedure in Plan 1.1 §13.
  [ ] I understand that non-blocker classification does not imply that an
      area is worthless — only that it must not delay v1.
  [ ] I understand Plan 1.4 will provide the enforcement law that makes
      this registry binding against re-expansion.
```

Once accepted, the `Status` field in the front matter is the authoritative state. Until accepted, treat this document as DRAFT in all operational decisions.

---

*End of Backend v1 Non-Blocker and Non-Scope Registry — Plan 1.3.*
