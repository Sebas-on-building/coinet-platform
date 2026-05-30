# Backend v1 Exception and Scope-Change Procedure

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.10
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From: Plans 1.1–1.9
Supersedes: Informal exception practice, ad-hoc deferred-item promotion, undocumented scope changes, precedent-based bypassing

---

## 1. Identity and Authority

This document is the **exception governance authority** of the Coinet Backend v1 program. It is the tenth scope-control plan inside Phase 1 and the document that prevents the freeze established by Plans 1.1–1.9 from being silently dissolved through accumulated "small exceptions."

Plans 1.1–1.9 produced:

- the production-convergence mission (1.1),
- the positive scope V1-S01..V1-S06 (1.2),
- the negative scope NB-001..NB-010 (1.3),
- the architecture freeze FRZ-001..FRZ-008 + AFV-A..H (1.4),
- the version-sprawl prohibition PSC-001..PSC-010 + FRP/BSCP/VSE (1.5),
- the task admissibility framework TAD-A..E + BTAR + UDF (1.6),
- the repo-resident source-of-truth system (1.7),
- the existing-backend inventory + classification + duplicate registry (1.8),
- the daily scope enforcement policy (1.9).

The six exception types (AFE, VSE, FRP, BSCP, SCR, UDF) exist in templates already. **Plan 1.10 is the governance layer over those types** — it defines when each is allowable, what justification is required, who approves, how exceptions are scored quantitatively, how they expire, how they are audited, and how deferred items become active.

This document:

- does not approve any specific exception,
- does not promote any deferred item into active scope,
- does not implement any code,
- does not reclassify any surface,
- does not amend Plans 1.1–1.9 (except by formal SCR through this procedure),
- does not begin Plan 1.11 work.

It performs one job:

> **It defines the Exception Qualification Score (EQS), the Approval Authority Matrix, the Burden-of-Proof asymmetry, the Anti-Precedent Rule, the Sunset Law, the Per-Phase Exception Budget, the Anti-Loophole Pattern Library, the Decision-Impossibility List, the five-trigger Deferred→Active Promotion Gate, the Exception Lifecycle State Machine, the Audit and Anti-Staleness Sweep, the Reversibility Law, and the Documentation Requirements — so the freeze remains strict without becoming stupid.**

### 1.1 Pre-execution Dependency Check (Performed)

Confirmed ACTIVE upstream artifacts:

1. `backend-v1-scope.md` ✅
2. `phase-1/backend-v1-source-of-truth-system.md` ✅
3. `phase-1/backend-v1-product-boundary.md` ✅
4. `phase-1/backend-v1-non-blocker-and-non-scope-registry.md` ✅
5. `phase-1/backend-v1-architecture-expansion-freeze-law.md` ✅
6. `phase-1/backend-v1-parallel-service-and-version-sprawl-prohibition.md` ✅
7. `phase-1/backend-v1-task-admissibility-framework.md` ✅
8. `phase-1/backend-v1-existing-backend-surface-inventory.md` ✅
9. `phase-1/backend-v1-daily-scope-enforcement.md` ✅

Confirmed exception templates exist (Plan 1.7):

- `templates/architecture-freeze-exception-template.md` (AFE)
- `templates/version-sprawl-exception-template.md` (VSE)
- `templates/formal-replacement-procedure-template.md` (FRP)
- `templates/bounded-shadow-comparison-template.md` (BSCP)
- `templates/scope-change-request-template.md` (SCR)
- `templates/urgent-defect-record-template.md` (UDF)

Confirmed exception index registry exists:

- `registries/backend-v1-exception.registry.md` ✅

---

## 2. Constitutional Purpose

### 2.1 Canonical Purpose Statement

> **The Exception and Scope-Change Procedure exists to govern every approved deviation from the Coinet backend v1 scope freeze with a quantified justification score, a precise approval-authority matrix, an anti-precedent rule, a sunset-and-audit law, and a five-trigger promotion gate, so that necessary exceptions remain rare, surgical, time-bounded, and reversible, and so that no accumulation of small exceptions can dissolve the freeze without an explicit, recorded, multi-axis decision.**

This sentence is the root authority of Plan 1.10. Every law, score, gate, and registry below derives from it.

### 2.2 Why This Plan Is Necessary

A freeze with no exception policy fails in one of two ways:

- **Failure A — Brittle Freeze.** No exception path exists. Every legitimate edge case becomes a policy violation. Engineers either freeze entirely or quietly bypass.
- **Failure B — Porous Freeze.** Exceptions are allowed informally. Each one is "just this once." Six months later the freeze is gone and nobody can identify when it died.

Plan 1.10 prevents both. It makes exceptions:

- **possible** (so the freeze is not stupid),
- **rare** (so the freeze is real),
- **scored** (so approval is auditable),
- **expiring** (so exceptions don't accumulate),
- **non-precedential** (so one exception doesn't open ten),
- **reversible** (so mistakes can be undone),
- **budgeted** (so cumulative exception pressure is visible).

### 2.3 The Dual Mandate (Strict + Not Stupid)

> **Strict** = every exception is documented, scored, approved by named authority, time-boxed, indexed, audited, and reversible.
>
> **Not stupid** = legitimate production-readiness needs can be met within the procedure; UDFs can flow fast; FRPs for active duplicates are encouraged where they advance convergence; promotion of deferred items is possible when their reassessment trigger fires.

The dual mandate is the design philosophy of Plan 1.10. Every rule below is constructed to satisfy both.

### 2.4 What Plan 1.10 Changes Operationally

**Before Plan 1.10.** Exceptions existed as templates (AFE, VSE, FRP, BSCP, SCR, UDF) but had no unified governance. Approval authority was implied. Justification was qualitative. Expiry was inconsistent. Accumulation was untracked.

**After Plan 1.10.** Every exception passes through a five-axis quantified gate (§9), is signed by named authority at the correct quorum level (§8), carries a mandatory expiry (§11), consumes from a per-phase budget (§12), passes through the anti-loophole filter (§13), avoids the decision-impossibility list (§14), and is audited quarterly (§19).

---

## 3. Inheritance From Plans 1.1–1.9

### 3.1 Inheritance Statement

> **This procedure inherits from the Phase 1 Charter, Product Boundary, Non-Scope Registry, Architecture Freeze Law, Version-Sprawl Prohibition, Task Admissibility Framework, Source-of-Truth System, Existing Backend Surface Inventory, and Daily Scope Enforcement. It does not redefine scope. It governs every legitimate deviation from scope.**

### 3.2 Relationship Table

| Plan          | Role                                                          |
| ------------- | ------------------------------------------------------------- |
| Plan 1.1      | Declares production-convergence mission                       |
| Plan 1.2      | Defines positive v1 backend scope (V1-S01..S06)               |
| Plan 1.3      | Defines negative scope (NB-001..NB-010)                       |
| Plan 1.4      | Freezes architecture expansion (FRZ-001..008, AFE)            |
| Plan 1.5      | Freezes implementation sprawl (PSC-001..010, FRP/BSCP/VSE)    |
| Plan 1.6      | Defines task admissibility (TAD-A..E, BTAR, UDF)              |
| Plan 1.7      | Defines source-of-truth system (SCR template, exception registry) |
| Plan 1.8      | Classifies existing backend surfaces                          |
| Plan 1.9      | Enforces all of the above daily                               |
| **Plan 1.10** | **Governs every deviation from all of the above**             |

### 3.3 What Plan 1.10 Adds That Did Not Exist Before

Plan 1.10 introduces, for the first time in the program:

- **EQS** — Exception Qualification Score (quantified five-axis evaluation),
- **Approval Authority Matrix** — exact quorum requirements per exception type,
- **Anti-Precedent Rule** — exceptions do not create case law,
- **Sunset Law** — every exception carries a mandatory expiry,
- **Per-Phase Exception Budget** — cumulative-pressure visibility,
- **Anti-Loophole Pattern Library** — known bypass patterns automatically rejected,
- **Decision-Impossibility List** — actions that cannot be exempted,
- **Deferred→Active Promotion Gate** — five concurrent triggers required,
- **Exception Lifecycle State Machine** — explicit state transitions with allowable paths,
- **Quarterly Anti-Staleness Sweep** — automatic re-review of accepted exceptions,
- **Reversibility Law** — every exception ships with a rollback plan.

---

## 4. First Principle

### 4.1 Canonical First Principle

> **An exception to the Coinet backend v1 freeze is admissible only if it scores ≥18/25 on the Exception Qualification Score, is approved by the correct authority quorum, carries a mandatory expiry, fits within the current phase's exception budget, survives the anti-loophole filter, does not touch the Decision-Impossibility List, and ships with a concrete rollback plan; default outcome is DENY.**

This is the operational expression of "strict + not stupid."

### 4.2 Burden of Proof (Asymmetry)

The burden of proof is on the **requester**, not the reviewer.

- The default is **DENY**.
- A requester who cannot demonstrate ≥18/25 EQS does not get a "borderline approve"; they get a denial with the missing-axis feedback.
- A reviewer is not obligated to find a way to approve. A reviewer is obligated to apply Plan 1.10 honestly.

This asymmetry is what makes the freeze real. Symmetric burden ("convince me to deny") is how freezes die.

### 4.3 What the First Principle Forbids

- "Just this once" approvals without EQS scoring,
- precedent-based reasoning ("we approved a similar one last month"),
- approvals without sunset,
- approvals that exhaust the phase budget without documented escalation,
- approvals that touch the Decision-Impossibility List,
- approvals without a rollback plan.

### 4.4 What the First Principle Allows

- High-EQS exceptions that genuinely advance Phase 1–3 production readiness,
- UDFs that qualify under Plan 1.6 §17.2,
- FRPs that canonicalize concurrently-active duplicate families,
- BSCPs that retire honest uncertainty,
- SCRs that promote items whose reassessment trigger has fired,
- AFEs for bounded reuse of certified architecture into the active product path.

---

## 5. The Six Exception Types (Consolidated)

Plan 1.10 governs all six exception types defined across earlier plans. They are consolidated here so the system has a single reference.

### 5.1 Type Registry

```text
AFE   Architecture Freeze Exception          Plan 1.4
VSE   Version-Sprawl Exception               Plan 1.5 §15
FRP   Formal Replacement Procedure           Plan 1.5 §8
BSCP  Bounded Shadow Comparison Procedure    Plan 1.5 §9
SCR   Scope Change Request                   Plan 1.7 §13.5
UDF   Urgent Defect Fix Override             Plan 1.6 §17
```

### 5.2 Use-When Quick Reference

| Type | Use when                                                                                  | Default Outcome | EQS Threshold |
| ---- | ----------------------------------------------------------------------------------------- | --------------- | ------------- |
| AFE  | Proposed work would create new L*.X / dormant runtime / constitutional expansion          | DENY            | ≥20/25        |
| VSE  | Last-resort sprawl exception when FRP and BSCP don't apply                                | DENY            | ≥20/25        |
| FRP  | Decided replacement: named old path, named new path, named retirement trigger              | EVALUATE        | ≥18/25        |
| BSCP | Honest uncertainty: comparison needed before replacement decision; `NOT_USER_FACING` pinned | EVALUATE        | ≥18/25        |
| SCR  | Amending Plans 1.1–1.7 or promoting NB-NNN into active scope                              | DENY            | ≥20/25        |
| UDF  | Defect qualifies under Plan 1.6 §17.2 (build truth, boot, admitted-task blocker, etc.)    | EVALUATE        | ≥15/25        |

UDFs have a lower EQS threshold because their §17.2 qualification criteria are themselves the production-readiness justification. UDFs still must obey §17.4 constraints (no architecture sprawl, no version sprawl, no scope re-entry).

### 5.3 Type Selection Decision Tree

```text
Is this a defect that qualifies under Plan 1.6 §17.2?
  YES → UDF
  NO  → continue

Would this work create a new architecture layer / dormant runtime / constitutional expansion?
  YES → AFE (default DENY; ≥20/25)
  NO  → continue

Is this a version-named / parallel implementation of an existing capability?
  YES → Is the replacement decision already made?
          YES → FRP
          NO  → Is a shadow comparison needed first?
                  YES → BSCP
                  NO  → VSE (last resort; default DENY; ≥20/25)
  NO  → continue

Is this an amendment of a Plan 1.x document or a deferred-item promotion?
  YES → SCR (default DENY; ≥20/25)
  NO  → This is probably a regular BTAR, not an exception.
```

---

## 6. Exception Qualification Score (EQS) — The Five Axes

### 6.1 The Five Axes

Every exception is scored on five axes, each 0–5 (integer), for a total of 0–25. Approval requires ≥18/25 for FRP/BSCP/UDF and ≥20/25 for AFE/VSE/SCR. Each axis must score ≥3 individually. **A failing axis cannot be compensated by high scores on other axes.**

#### Axis A — Production-Readiness Necessity (PRN)

> How directly does this exception advance Phase 1 stabilization, Phase 2 live-path trustworthiness, or Phase 3 synthetic judgment correctness?

| Score | Meaning                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------ |
| 5     | Directly fixes a production-readiness blocker; without it Phase 1–3 cannot complete              |
| 4     | Strongly contributes to a Phase 1–3 objective; alternative paths exist but cost more             |
| 3     | Indirectly contributes; defensible production-readiness link                                     |
| 2     | Tangential — interesting but not Phase 1–3 critical                                              |
| 1     | Speculative — "could be useful later"                                                            |
| 0     | No production-readiness link (auto-deny axis)                                                    |

#### Axis B — Irreversibility-of-Deferral (IOD)

> What is the concrete cost of waiting (deferring) until after Phase 3?

| Score | Meaning                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------ |
| 5     | Deferral causes a permanent or compounding loss (lost data, irreversible state, deadline miss)   |
| 4     | Deferral causes a large but recoverable loss (significant rework, severe user trust harm)        |
| 3     | Deferral causes meaningful inefficiency or higher Phase-2/3 risk                                 |
| 2     | Deferral is inconvenient but not damaging                                                        |
| 1     | Deferral has no concrete cost                                                                    |
| 0     | "I just want to do it now" (auto-deny axis)                                                      |

#### Axis C — Bounded Scope (BS)

> Is the scope of this exception precisely bounded with no expansion potential?

| Score | Meaning                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------ |
| 5     | Single file, single function, single behavior; expansion is structurally impossible              |
| 4     | Small, well-defined scope; expansion would require a new exception                               |
| 3     | Defined scope with some judgment in execution but clear stop conditions                          |
| 2     | Scope has soft edges; "we'll know it when we get there"                                          |
| 1     | Scope is large, vague, or expansion-prone                                                        |
| 0     | "Refactor as needed" / "while we're in there" (auto-deny axis)                                   |

#### Axis D — Time-Boxedness (TB)

> Does the exception have a precise, falsifiable expiry condition (date, run count, metric threshold, or trigger event)?

| Score | Meaning                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------ |
| 5     | Sharp expiry within current phase + automatic-revert plan                                        |
| 4     | Sharp expiry at next phase boundary                                                              |
| 3     | Expiry at named trigger event with reasonable likelihood of firing                               |
| 2     | "When we get to it" with target quarter                                                          |
| 1     | "Eventually" or "until further notice"                                                           |
| 0     | No expiry stated (auto-deny axis)                                                                |

#### Axis E — Non-Precedent (NP)

> Does this exception structurally avoid creating a precedent that other future requests will use as case law?

| Score | Meaning                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------ |
| 5     | Genuinely unique situation; structural reason no similar request will arise (one-time event)     |
| 4     | Narrow circumstances; future similar requests would still need independent EQS scoring           |
| 3     | Future similar requests are likely but the request explicitly disclaims precedent                |
| 2     | Future requests will cite this as "we did it before"                                             |
| 1     | This is the start of a pattern                                                                   |
| 0     | "If we approve this, we should approve the others too" (auto-deny axis)                          |

### 6.2 EQS Worksheet (Required in Every Exception Record)

Every exception record must contain a filled EQS worksheet:

```text
EQS Worksheet

  A — Production-Readiness Necessity (PRN):   _/5
       Justification: ____________________________________________
  B — Irreversibility-of-Deferral (IOD):       _/5
       Justification: ____________________________________________
  C — Bounded Scope (BS):                       _/5
       Justification: ____________________________________________
  D — Time-Boxedness (TB):                      _/5
       Justification: ____________________________________________
  E — Non-Precedent (NP):                       _/5
       Justification: ____________________________________________

  Total: __/25
  Per-axis minimum (≥3 on each): PASS / FAIL
  Type-threshold check (≥18 or ≥20): PASS / FAIL
  Final EQS gate: PASS / FAIL
```

A failing axis is fatal: no aggregate-score compensation is allowed. This prevents the common failure mode where a strong PRN justification masks a vague BS or absent TB.

### 6.3 EQS Approval Gate

```text
Decision = APPROVE
  iff   total >= type_threshold (18 or 20)
   AND  every axis score >= 3
   AND  no axis is 0
   AND  budget available (§12)
   AND  anti-loophole filter passed (§13)
   AND  not in Decision-Impossibility List (§14)
   AND  correct authority quorum approved (§8)
   AND  rollback plan provided (§15)

Otherwise: DENY (or DEFER with feedback).
```

---

## 7. Burden of Proof Asymmetry

### 7.1 Default = DENY

The default outcome of any exception request is DENY. Approval requires positive justification meeting all gates in §6.3.

### 7.2 The Asymmetry Made Explicit

| Scenario                                                          | Outcome   |
| ----------------------------------------------------------------- | --------- |
| Requester provides ≥18/25 EQS with all gates met                  | APPROVE   |
| Requester provides 17/25 EQS                                      | DENY      |
| Requester provides 24/25 EQS but Axis D (TB) = 0                  | DENY      |
| Requester provides 22/25 EQS but axis-D = 2 (≥3 required)         | DENY      |
| Reviewer feels "it's probably fine"                               | DENY      |
| Reviewer cannot find a strong reason to deny                      | DENY (the asymmetry holds) |
| Requester invokes precedent without independent EQS scoring        | DENY (Anti-Precedent Rule, §10) |

### 7.3 No Compromise Approvals

A "compromise approval" — partial scope, half budget, "let's try it for a week" — is itself a new exception request and must be scored. Reviewers may not improvise compromises that bypass EQS.

---

## 8. Approval Authority Matrix

### 8.1 Authority Quorum Per Exception Type

| Type | Required Approvers                                                            | Quorum                  |
| ---- | ----------------------------------------------------------------------------- | ----------------------- |
| UDF  | Backend program owner                                                         | 1 (single-approver)     |
| FRP  | Backend program owner + canonical-path owner                                  | 2 (dual-approver)       |
| BSCP | Backend program owner + canonical-path owner                                  | 2 (dual-approver)       |
| AFE  | Backend program owner + architecture owner                                    | 2 (dual-approver)       |
| VSE  | Backend program owner + canonical-path owner + sovereign authority             | 3 (triple-approver; rare) |
| SCR  | Backend program owner + plan-amendment authority + sovereign authority         | 3 (triple-approver)     |

### 8.2 Role Definitions

- **Backend program owner** — the named operator of the Backend v1 program. For Coinet, this is the founder unless explicitly delegated in writing and recorded in `backend-v1-decision-log.registry.md`.
- **Canonical-path owner** — for FRP/BSCP/VSE, the person who can speak authoritatively about the existing canonical path in the affected PSC family. If unnamed, the backend program owner inherits this role.
- **Architecture owner** — for AFE, the person responsible for the L5–L14 architecture. Inherited by the backend program owner if unnamed.
- **Plan-amendment authority** — for SCR, the entity authorized by Plan 1.1 §13 to amend source plans. Currently the backend program owner.
- **Sovereign authority** — the founder. Required for VSE and SCR because both can structurally alter the freeze.

### 8.3 Quorum Failure

If the required quorum is not present:

- Single-approver missing → request is **PENDING** until the approver acts.
- One of two missing → request is **PENDING** until the second approves or denies.
- Triple quorum incomplete → request is **PENDING**; no fallback "majority" rule exists for SCR/VSE.

A quorum is never satisfied by the same person filling two roles, except where §8.2 explicitly states inheritance (e.g., when architecture owner = backend program owner). Inheritance must be recorded in the exception record's `approval_authority` field.

### 8.4 Approver Conflicts of Interest

If the requester is also the approver:

- For UDF: single-approver self-approval is allowed only if the UDF is purely build-truth restoration (no logic change). Otherwise, request another approver.
- For FRP/BSCP/AFE/VSE/SCR: self-approval is **prohibited**. A separate approver must sign. If no separate approver exists, the request is deferred until an approver is available.

---

## 9. EQS Mandatory Worksheet (Restated for Authority Reference)

This is the same worksheet from §6.2, recorded here as part of the approval authority section because authorities sign against it.

```text
Exception ID:  ____________
Type:          AFE / VSE / FRP / BSCP / SCR / UDF
Submitted by:  ____________________________
Submitted on:  YYYY-MM-DD

EQS:
  A (PRN):  _/5    [justification]
  B (IOD):  _/5    [justification]
  C (BS):   _/5    [justification]
  D (TB):   _/5    [justification]
  E (NP):   _/5    [justification]
  Total:    __/25
  Min axis: __/5
  Threshold: ≥18 (FRP/BSCP/UDF) or ≥20 (AFE/VSE/SCR)
  Gate:     PASS / FAIL

Decision:    APPROVE / DENY / DEFER
Decided by:  Authority 1: _____________ (signed YYYY-MM-DD)
             Authority 2: _____________ (signed YYYY-MM-DD)
             Authority 3: _____________ (signed YYYY-MM-DD if required)

Expiry:       YYYY-MM-DD or named trigger
Budget consumed: 1 unit from BACKLOG-A budget of Phase __
Rollback plan: ____________________________________________
Anti-loophole filter: PASS  (§13 patterns checked)
Decision-Impossibility check: PASS  (§14 list checked)
```

A request without a complete worksheet is **PENDING**, not denied. It cannot be approved until the worksheet is complete.

---

## 10. Anti-Precedent Rule

### 10.1 The Rule

> **No exception, once approved, may be cited as case law for the approval of any future exception. Every exception request is scored independently against EQS, fresh, with no inherited justification from past approvals.**

### 10.2 Prohibited Reasoning Patterns

The following reasoning patterns are automatically rejected:

- "We approved a similar AFE last month."
- "FRP-003 was approved for a comparable file family."
- "The previous BSCP for this PSC ran for 4 weeks; this one should also."
- "The pattern is the same as SCR-001."
- "Class precedent established by UDF-007."

### 10.3 Why

Case-law reasoning is how every strict policy in history has been hollowed out. The first exception is small. The fifth exception cites the first four. The tenth exception cites "established practice." The freeze dies through citation, not through any single approval.

Plan 1.10 makes citation structurally unavailable for approval reasoning.

### 10.4 What Is Allowed

- **Citing precedent for procedural questions** is allowed: "We use the FRP-001 lifecycle pattern to track migration." This is template reuse, not substantive case law.
- **Citing precedent for risk assessment** is allowed: "We saw what happened in FRP-002; let's add monitoring." This is learning, not approval reasoning.
- **Citing precedent as a substitute for EQS justification** is forbidden.

### 10.5 Reviewer Test

If approval reasoning is presented in the form:

```text
"Because <prior exception> was approved, this one should be too."
```

it is rejected without further consideration. Resubmission with independent EQS justification is allowed.

---

## 11. Sunset Law (Mandatory Expiry)

### 11.1 The Rule

> **Every approved exception carries a mandatory expiry. There is no such thing as a permanent exception. Expiry must be precise (a date, a run count, a metric threshold, or a named trigger event).**

### 11.2 Default Expiry by Type

| Type | Default Expiry                                              | Maximum Expiry                                                 |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------- |
| UDF  | Completion of the defect fix (typically days)               | 30 days from approval                                           |
| FRP  | Old path retirement trigger fires                           | End of current phase + 4 weeks                                  |
| BSCP | Shadow expiry condition (time window or run count)          | 8 weeks or 200 runs, whichever first                            |
| AFE  | End of current phase                                        | End of current phase                                            |
| VSE  | End of current phase                                        | End of current phase                                            |
| SCR  | Date when the scope change is fully integrated into plans   | 90 days from approval to full plan amendment + registry sync   |

### 11.3 Automatic Revert Behavior

On expiry, the exception's status transitions to `EXPIRED`. The system behavior is:

- **UDF expired** → if defect remains unfixed, file follow-up BTAR; do not silently extend.
- **FRP expired** → if old path is not yet retired, the migration is incomplete; file follow-up FRP with fresh EQS, do not auto-extend.
- **BSCP expired** → shadow is removed from the codebase (Plan 1.5 §9.3); to retain, file FRP with promotion justification.
- **AFE expired** → if borrowed code remains in active path, it must either be removed or re-justified via a fresh AFE.
- **VSE expired** → parallel module must be removed; re-justification requires fresh VSE.
- **SCR expired** → if plan amendment is incomplete, the scope change is reverted; the original plan wording stands until a new SCR completes.

### 11.4 Extension Procedure

An expired exception is not auto-renewed by request. A fresh exception with new EQS scoring is required. This prevents the "permanent extension by serial 30-day renewals" pattern.

### 11.5 Sunset Surcharge

Each extension of an exception family beyond its first approval consumes **1.5x** budget (§12) compared to a fresh exception. This makes repeated extension visibly expensive and discourages the silent permanence pattern.

---

## 12. Per-Phase Exception Budget

### 12.1 The Concept

Cumulative exception pressure is invisible if each exception is reviewed in isolation. Plan 1.10 introduces a per-phase budget so the program can see, at a glance, how many deviations from freeze have been approved.

### 12.2 Budget Allocation

| Phase                                  | AFE+VSE+SCR Budget | FRP Budget          | BSCP Budget         | UDF Budget         |
| -------------------------------------- | ------------------ | ------------------- | ------------------- | ------------------ |
| Phase 1 (Stabilization)                | 2 combined         | 4 (sprawl reduction)| 2                   | Unlimited if §17.2 qualifying |
| Phase 2 (Live-path Trustworthiness)    | 3 combined         | 6 (canonicalization)| 3                   | Unlimited if §17.2 qualifying |
| Phase 3 (Synthetic Truth)              | 1 combined         | 4 (truth-suite-driven) | 2                | Unlimited if §17.2 qualifying |

**Rationale.** AFE/VSE/SCR are the freeze-altering exceptions; their budget is tight. FRP and BSCP advance convergence (retire duplicates); their budget is generous because that work is *desired*. UDFs respond to defects whose qualification criteria are themselves the production-readiness justification; capping UDFs would harm the freeze, not help it.

### 12.3 Budget Tracking

The auxiliary registry `backend-v1-exception-budget.registry.md` (created alongside this plan) tracks per-phase consumption with one row per approved exception. Each approval decrements the relevant counter; each expiry / withdrawal returns the unit (for AFE/VSE/SCR/UDF) or remains consumed (for FRP/BSCP since they had real implementation effort).

### 12.4 Budget Exhaustion

When a phase's budget for a type is exhausted:

- Further requests of that type are **DEFERRED** (not denied) and queued.
- The backend program owner is notified.
- An ADR (Authoritative Decision Record) is filed documenting the exhaustion; this is itself a signal that scope discipline is under pressure.

### 12.5 Budget Replenishment

Budget does **not** replenish within a phase. It replenishes at phase transition (Phase 1 → Phase 2, Phase 2 → Phase 3). This means a phase that burns through its budget early must wait or escalate.

### 12.6 Sunset Surcharge Effect on Budget

Per §11.5, extensions consume 1.5× budget. Practical effect: in Phase 2, the AFE+VSE+SCR budget of 3 supports 3 fresh approvals **or** 2 fresh + 1 extension (which costs 1.5).

---

## 13. Anti-Loophole Pattern Library

### 13.1 Purpose

Every freeze in history has been defeated by the same patterns. Plan 1.10 names them so they can be detected at review time.

### 13.2 Pattern A — Salami-Slicing

**Pattern.** Many small individually-defensible exceptions that collectively reverse a freeze entry.

**Example.** Five separate AFEs to "borrow a small piece of L13" that together activate full L13 runtime.

**Detection.** Review whether the exception, combined with previously-approved exceptions in the same area, exceeds the scope of what a single freeze-altering SCR would require. If yes, the request should be reframed as an SCR.

**Reviewer language.** *"This appears to be salami-slicing under the AFE channel. The cumulative effect requires SCR. Resubmit accordingly."*

### 13.3 Pattern B — Trojan-Horse Cleanup

**Pattern.** Scope expansion hidden inside a "cleanup" or "refactor" BTAR.

**Example.** A BTAR titled "Clean up chat service" that actually introduces a new parallel scoring path.

**Detection.** Per Plan 1.9 §16.3, any change discovered during a task that is outside the BTAR scope must be filed as follow-up, not bundled. Review the diff against the BTAR scope.

**Reviewer language.** *"Diff exceeds BTAR scope. Either refile the cleanup as separate BTAR or remove the out-of-scope changes."*

### 13.4 Pattern C — Architecture-by-Naming

**Pattern.** Creating a new architectural surface but avoiding the `L*.X` naming so AFE is not triggered.

**Example.** A new folder `src/services/judgment-framework/` that effectively becomes a new sublayer.

**Detection.** Review whether the new code introduces:

- a new layered structure (contracts / runtime / validation / certification),
- a new governance vocabulary,
- a new long-horizon program that would normally live under `src/l*/`.

If yes, AFE is required even though the folder is not named `lX.Y`.

**Reviewer language.** *"This is architecture-by-naming. The same content under `src/l15/` would require AFE; relocation does not exempt it. File AFE."*

### 13.5 Pattern D — Borrowed-Time Framing

**Pattern.** "Just for now" exceptions without sharp expiry.

**Example.** "Let's allow `news-intelligence-v3.ts` while we figure out canonicalization."

**Detection.** Check Axis D (Time-Boxedness). Axis D = 1 ("Eventually") or 2 ("When we get to it") fails the EQS gate.

**Reviewer language.** *"Time-Boxedness axis fails (score < 3). Provide a precise expiry trigger or this request is denied."*

### 13.6 Pattern E — Cross-Plan Smuggling

**Pattern.** An SCR that claims to amend a small piece of one plan but actually activates a cluster of deferred items.

**Example.** SCR titled "Update NB-008 wording to allow lightweight API discovery" that effectively unblocks all of NB-008 deep-provider work.

**Detection.** Read the SCR's `affected_plans`, `affected_registries`, and `resulting_amendments` fields. If the actual scope of the amendment exceeds the title, the SCR is reframed.

**Reviewer language.** *"SCR title understates affected scope. Resubmit with full impact disclosure or reduce the scope to match the title."*

### 13.7 Pattern F — Authority Inheritance Abuse

**Pattern.** Treating the backend program owner's inheritance of unfilled approver roles (§8.2) as a shortcut to single-person approval of triple-quorum exceptions.

**Detection.** For VSE and SCR, the sovereign authority must be a distinct human. Inheritance cannot collapse a triple-quorum to one signature.

**Reviewer language.** *"VSE/SCR requires three distinct approvers. Inheritance does not collapse the quorum."*

### 13.8 Pattern G — Pre-Decided Approval

**Pattern.** EQS worksheet filled in after the work has already started, used to legitimize completed action.

**Detection.** Check the `submitted_on` date vs. the touched-file git history. If the work predates the exception submission, the exception is denied; the work must be reverted and re-proposed properly.

**Reviewer language.** *"Exception submission date postdates the work. The work is rejected. Revert and resubmit with proper sequencing."*

### 13.9 Pattern H — Class-Wide Bundling

**Pattern.** A single exception request that covers an entire PSC family or NB cluster rather than a single bounded change.

**Detection.** A single AFE proposing "borrow L13 safety + L13.4 grounding + L13.5 uncertainty" is three AFEs disguised as one. Each must be scored separately.

**Reviewer language.** *"Bundle exceeds single-exception scope. Split into N separate exceptions and score each independently."*

### 13.10 Pattern I — Implicit Promotion

**Pattern.** A BTAR that touches a `DEFERRED` surface in a way that implicitly promotes it without an SCR.

**Example.** A BTAR for "fix typecheck error in Strategy Lab placeholder" that adds three new features while fixing the error.

**Detection.** Per Plan 1.9 §11.3 Example B — fix the build-blocking issue, do not expand functionality. Expansion requires SCR.

**Reviewer language.** *"Implicit promotion detected. UDF fix is allowed; feature expansion requires SCR."*

### 13.11 Pattern J — Pattern Stacking

**Pattern.** Combining multiple patterns above so each is small enough to escape individual detection.

**Detection.** If a request triggers two or more pattern checks, it is automatically reframed as a single larger request requiring SCR.

**Reviewer language.** *"Multiple loophole patterns detected (P-A and P-D). Reframe as SCR with full disclosure."*

### 13.12 The Anti-Loophole Filter

The Anti-Loophole Filter is an explicit reviewer-side checklist that runs **before** EQS scoring:

```text
[ ] Pattern A — Salami-Slicing absent?
[ ] Pattern B — Trojan-Horse Cleanup absent?
[ ] Pattern C — Architecture-by-Naming absent?
[ ] Pattern D — Borrowed-Time Framing absent?
[ ] Pattern E — Cross-Plan Smuggling absent?
[ ] Pattern F — Authority Inheritance Abuse absent?
[ ] Pattern G — Pre-Decided Approval absent?
[ ] Pattern H — Class-Wide Bundling absent?
[ ] Pattern I — Implicit Promotion absent?
[ ] Pattern J — Pattern Stacking absent?
```

Any failed check returns the request to the requester for reframing. EQS scoring proceeds only after all ten checks pass.

---

## 14. Decision-Impossibility List

### 14.1 Purpose

Some actions cannot be exempted no matter how high the EQS. They are structural commitments of Coinet's product integrity. Approval of any of these is treated as null and void on its face.

### 14.2 The Twelve Impossibilities

```text
DI-01  Removing or weakening the user-facing AI output safety gate
       once deployed under V1-S01.

DI-02  Re-introducing silent fallback in /api/chat such that an AI
       response is emitted while produceJudgment() has failed.

DI-03  Hiding judgment failures from users in any V1-S0x surface
       (failures must be observable as degraded state, not as a
       falsely-confident answer).

DI-04  Restoring or introducing a "lying" build script (e.g.,
       `tsc || true`) that silently masks typecheck failures.

DI-05  Auto-mutation of historical truth records (judgment outputs,
       feedback records, calibration evidence). Repair flows obey
       Plan 1.4 / Plan 1.5; auto-mutation is prohibited.

DI-06  Bypassing explicit user preferences (alert mutes, channel
       opt-outs, quiet hours) in any path that delivers to a user.

DI-07  Promoting engagement metrics (clicks, opens) into truth
       signals about judgment correctness.

DI-08  Removing the contradiction surface from any user-facing
       answer when contradictions are present in the underlying
       judgment.

DI-09  Removing the uncertainty disclosure from any user-facing
       answer when judgment confidence is below the published
       threshold.

DI-10  Recommendation-style language ("buy", "sell", "you should")
       in any user-facing answer for any V1 surface.

DI-11  Re-classifying a judgment failure as a successful answer
       via output rewriting.

DI-12  Modifying the audit trail of any approved exception
       retroactively (records may be amended in-place with new
       state entries; prior states are never deleted).
```

### 14.3 Effect

Any exception request whose effect (intended or observed) falls in DI-01..DI-12 is denied at the Anti-Loophole stage (§13.12) before EQS scoring. The request cannot be saved by reframing — the impossibility is structural, not procedural.

### 14.4 Discovery

If an approved exception is later discovered to have an effect in DI-01..DI-12, the exception is **immediately revoked** without further procedure. The discovery is logged in `backend-v1-decision-log.registry.md` as an ADR. The work that proceeded under the revoked exception is rolled back.

### 14.5 Amendment of the Impossibility List

DI-01..DI-12 can be amended only by an SCR that itself does not violate any of the existing twelve impossibilities. In practice, this means the impossibility list functions as a near-immutable floor.

---

## 15. Reversibility Law

### 15.1 The Rule

> **Every approved exception must include a concrete rollback plan. "Cannot be rolled back" results in automatic denial.**

### 15.2 What a Rollback Plan Must Specify

```text
Trigger      — what observable condition triggers rollback?
Procedure    — exact steps to undo the exception's effect
Time bound   — maximum time from trigger to completed rollback
Verification — how is successful rollback confirmed?
Owner        — named person responsible for executing rollback
```

### 15.3 Rollback Plan Quality

Rollback plans are scored as part of Axis C (Bounded Scope):

- A precise rollback plan with named owner and verification → BS axis can score 5.
- A vague rollback plan → BS axis cannot exceed 3.
- "We'd just deal with it" → BS axis = 0 (auto-deny).

### 15.4 Rollback Plan Per Exception Type

- **UDF** — git revert + verify build truth restored.
- **FRP** — re-enable old canonical path + revert callers + remove new path (or leave new path inactive).
- **BSCP** — remove shadow code path + restore canonical path's exclusive runtime.
- **AFE** — remove borrowed code + restore prior behavior.
- **VSE** — remove parallel module + restore canonical-only behavior.
- **SCR** — revert plan amendments + restore prior plan wording + revert registry syncs.

### 15.5 The Reversibility Principle

If an exception cannot be reversed, it is not an exception — it is a permanent change. Permanent changes require SCR (which has its own reversibility plan: revert plan amendment, restore prior wording). This is why SCR is the only path to durable scope alteration.

---

## 16. Deferred → Active Promotion Gate (Five Triggers)

### 16.1 Purpose

Plan 1.3 lists deferred items NB-001..NB-010, each with a reassessment trigger. Plan 1.10 defines exactly when and how a deferred item moves from `DEFERRED` to active scope.

### 16.2 The Five-Trigger Gate

A deferred item is promotable only when **all five** triggers are simultaneously true:

```text
G1  Reassessment trigger fired
    The Plan 1.3 reassessment condition for the NB-NNN entry has
    actually occurred (e.g., APIs purchased, Phase 3 complete).

G2  Production-readiness need confirmed (evidence)
    The promotion is needed for a Phase 1–3 objective OR for a
    Coinet v1 launchability requirement, with repo-visible evidence.

G3  Upstream phase complete
    The promotion does not displace incomplete Phase 1, 2, or 3
    work. Promotions that would interrupt active phase work
    are deferred until the active phase completes.

G4  Capacity available (budget)
    The current phase's AFE+VSE+SCR budget has at least 1 unit
    available (1.5 if extension surcharge applies).

G5  Sponsor approval (named owner)
    A named person commits to owning the promoted scope through
    its full execution to a defined done state. Anonymous
    promotion is not allowed.
```

### 16.3 Gate Application

The promotion is filed as an SCR. The SCR's EQS worksheet must explicitly score against each of G1..G5 in the Justification fields:

- Axis A (PRN): cite G2 (production-readiness evidence).
- Axis B (IOD): cite G1 (reassessment trigger fired; cost of further deferral).
- Axis C (BS): cite G5 (sponsor scope commitment).
- Axis D (TB): cite the promotion's completion target.
- Axis E (NP): explain why this promotion does not open the door to other NB-NNN items.

### 16.4 Default Outcome on Promotion Requests

Default = **DEFER**. The five-trigger gate is structurally hard to satisfy by design. The default outcome ensures that "the time feels right" is not a substitute for actual trigger satisfaction.

### 16.5 Worked Examples

**Example A — Promote NB-008 (Deep API integration) after APIs purchased.**

- G1 ✅ (APIs purchased — reassessment trigger fired).
- G2 ✅ (Phase 3+ requires real signal data).
- G3 ✅ (Phase 3 complete).
- G4 — check budget.
- G5 — name the sponsor.

If G4 and G5 hold, SCR proceeds to EQS scoring. Likely outcome: APPROVE if EQS ≥20/25.

**Example B — Promote NB-001 (Strategy Lab backend) because "private beta is coming."**

- G1 ✅ if private beta has actually started.
- G2 — must demonstrate Strategy Lab is needed for v1 (Plan 1.3 NB-001 says "post-backend-v1"). Likely G2 ✗.
- Outcome: DEFER. Strategy Lab is post-v1 by Plan 1.3 reassessment language.

**Example C — Promote NB-006 (Full CIP.1) early because "the architecture is ready."**

- G1 ✗ unless Phase 3 is fully complete.
- Outcome: DEFER. The trigger has not fired.

---

## 17. Exception Lifecycle State Machine

### 17.1 States

```text
DRAFT          Requester is filling fields
SUBMITTED      All fields filled; awaiting review
ANTI_LOOPHOLE_PENDING   Anti-loophole filter (§13.12) running
EQS_PENDING    Anti-loophole passed; EQS scoring in progress
AUTHORITY_PENDING       EQS passed; awaiting required quorum
APPROVED       Quorum signed; exception is live
ACTIVE         Same as APPROVED but emphasizes work in progress
EXTENDED       Approved exception has been re-justified before expiry
EXPIRED        Expiry condition reached; automatic-revert applies
REVOKED        Discovered to violate Decision-Impossibility (§14.4) or anti-loophole post-approval
COMPLETED      Exception's purpose achieved; no longer needed
WITHDRAWN      Requester retracted before approval
DENIED         Approval declined; resubmission with new justification allowed
ROLLED_BACK    Reversibility plan executed
```

### 17.2 Allowable Transitions

```text
DRAFT → SUBMITTED → ANTI_LOOPHOLE_PENDING → EQS_PENDING → AUTHORITY_PENDING
        → APPROVED → ACTIVE → COMPLETED
                            → EXPIRED
                            → REVOKED → ROLLED_BACK
                            → EXTENDED → ACTIVE (loop, with surcharge)

Any state → WITHDRAWN  (before APPROVED only)
Any state → DENIED      (during pre-APPROVED stages)
```

### 17.3 Prohibited Transitions

```text
EXPIRED → ACTIVE        (no auto-renewal; file fresh exception)
REVOKED → ANY ACTIVE STATE  (revocation is terminal for this exception)
APPROVED → DRAFT        (no quiet editing post-approval; file ADR for amendments)
COMPLETED → ANY OTHER   (terminal)
```

### 17.4 State Recording

The exception record's front-matter contains a single `State:` line with one of the above values. State transitions append to a `## State Log` section inside the record:

```text
## State Log

  2026-05-19 DRAFT       (created by ____)
  2026-05-20 SUBMITTED   (submitted by ____)
  2026-05-20 ANTI_LOOPHOLE_PENDING  (filter started by ____)
  2026-05-20 EQS_PENDING (anti-loophole PASS; scoring started by ____)
  2026-05-21 AUTHORITY_PENDING (EQS 19/25 PASS; awaiting Authority 2)
  2026-05-21 APPROVED    (Authority 1, Authority 2 signed)
  2026-05-21 ACTIVE      (work begins)
  2026-06-15 COMPLETED   (rollback plan retained; surface verified)
```

The state log is append-only. Prior entries are never deleted.

---

## 18. Documentation Requirements

### 18.1 Required Fields in Every Exception Record

Beyond the type-specific fields (defined in each template from Plan 1.7), every exception record must contain:

```text
1.  exception_id
2.  type (AFE / VSE / FRP / BSCP / SCR / UDF)
3.  current State (per §17.1)
4.  EQS Worksheet (per §6.2)
5.  Anti-Loophole Filter checklist (per §13.12, all ten checked)
6.  Decision-Impossibility check (DI-01..DI-12, all PASS)
7.  Approval Authority block (signatures per §8.1 quorum)
8.  Expiry (precise per §11)
9.  Budget consumption (1 unit or 1.5 if extension; from which phase budget)
10. Rollback plan (per §15.2)
11. State Log (append-only, per §17.4)
12. Related BTAR/UDF refs (if any)
13. Affected V1-S0x surfaces
14. Affected Plan 1.x sections (especially for SCR)
15. Linked records (other exceptions this depends on or supersedes)
```

### 18.2 Storage Locations

```text
AFE-NNN-slug.md   →  phase-1/records/exceptions/
VSE-NNN-slug.md   →  phase-1/records/exceptions/
FRP-NNN-slug.md   →  phase-1/records/formal-replacements/
BSCP-NNN-slug.md  →  phase-1/records/shadow-comparisons/
SCR-NNN-slug.md   →  phase-1/records/scope-changes/
UDF-NNN-slug.md   →  phase-1/records/urgent-defects/
ADR-NNN-slug.md   →  phase-1/records/decisions/
```

### 18.3 Index Updates Per Approval

When an exception is APPROVED:

1. Record file `State:` set to `APPROVED` then `ACTIVE`.
2. `backend-v1-exception.registry.md` — add row.
3. `backend-v1-record-index.registry.md` — add row.
4. `backend-v1-exception-budget.registry.md` — increment phase counter.
5. If SCR with plan amendment, also: amend source plan, sync affected registries, append `backend-v1-decision-log.registry.md`.

All five updates happen in the same work session.

### 18.4 Index Updates Per Expiry / Revocation

When an exception expires or is revoked:

1. Record `State:` updated; State Log appended.
2. `backend-v1-exception.registry.md` — row status updated.
3. `backend-v1-record-index.registry.md` — Last Updated.
4. `backend-v1-exception-budget.registry.md` — replenish if applicable (§12.3).
5. If revocation, append ADR to `backend-v1-decision-log.registry.md` explaining cause.

### 18.5 Documentation Quality Standard

> **An exception record that cannot be understood by a reviewer who was not present at its creation is incomplete.**

Practical implications:

- Justifications must reference concrete files, not vague concepts.
- "Production-readiness" claims must cite the specific V1-S0x surface and Phase 1–3 objective.
- "Cannot wait" claims must cite the concrete harm (lines from `chat/service.ts`, failing tests, observable user impact).
- Anti-loophole checks must say *how* the pattern was confirmed absent, not just check the box.

---

## 19. Quarterly Anti-Staleness Sweep

### 19.1 Purpose

Approved exceptions can become stale: the original justification expires, the production-readiness need disappears, or the work that motivated the exception was abandoned. Stale exceptions silently consume budget and accumulate technical debt.

### 19.2 Sweep Procedure

On a quarterly cadence (or at every phase transition, whichever is sooner), perform the following sweep on every exception with `State: ACTIVE` or `State: EXTENDED`:

```text
For each active exception:

  S1.  Has the expiry condition fired? If yes, transition to EXPIRED.
  S2.  Is the rollback plan still valid (paths still exist, owner still
       in role)? If no, file ADR and request fresh EQS.
  S3.  Has the original production-readiness need (PRN axis evidence)
       remained valid? If no, transition to COMPLETED or EXPIRED.
  S4.  Has the Bounded-Scope claim (BS axis) held in practice? If
       observed scope exceeds approved scope, REVOKE.
  S5.  Has any DI-01..DI-12 effect surfaced (intended or accidental)?
       If yes, REVOKE per §14.4.
  S6.  Does the exception still match the description in the
       exception registry row? If drift, update registry.
```

### 19.3 Sweep Outcomes

Each sweep produces a brief report appended to `backend-v1-decision-log.registry.md`:

```text
## Quarterly Anti-Staleness Sweep — YYYY-Q#

Exceptions reviewed: N
Transitioned to EXPIRED: list
Transitioned to COMPLETED: list
Revoked: list
Registry drift corrected: list
Outstanding follow-ups: list
```

### 19.4 Sweep Authority

The sweep is performed by the backend program owner or a delegated reviewer. The sweep itself does not require quorum because it does not approve or alter exceptions — it audits them against the rules already approved.

### 19.5 Sweep-Triggered Revocations

A revocation discovered during sweep follows §14.4: the work proceeds to ROLLED_BACK; an ADR records the cause; the budget unit is replenished (for AFE/VSE/SCR/UDF) or retained (for FRP/BSCP).

---

## 20. Required Governance Artifacts

### 20.1 Mandatory Primary Artifact

This document, at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-exception-and-scope-change-procedure.md
```

### 20.2 Mandatory Auxiliary Artifact (New)

The per-phase budget tracker:

```text
apps/coinet-platform/docs/backend-v1/phase-1/registries/backend-v1-exception-budget.registry.md
```

Plan 1.10 creates this file (initialized empty per §12.2 allocation).

### 20.3 Existing Templates Used by Plan 1.10

All six exception templates from Plan 1.7 are referenced and remain unchanged:

```text
templates/architecture-freeze-exception-template.md
templates/version-sprawl-exception-template.md
templates/formal-replacement-procedure-template.md
templates/bounded-shadow-comparison-template.md
templates/scope-change-request-template.md
templates/urgent-defect-record-template.md
```

Plan 1.10 does **not** rewrite these templates. The EQS worksheet (§6.2), Anti-Loophole Filter checklist (§13.12), and DI-01..DI-12 check are added to each exception record at filing time, with reference back to this Plan 1.10 document for the canonical wording.

### 20.4 No Other New Files

Plan 1.10 deliberately creates only one new file (the budget registry). The existing registries from Plan 1.7 absorb the rest of the indexing responsibility:

- `backend-v1-exception.registry.md` — per-exception index (Plan 1.7 §8).
- `backend-v1-record-index.registry.md` — master record index.
- `backend-v1-decision-log.registry.md` — major decisions including quarterly sweep results.

This restraint is intentional: the anti-sprawl spirit of Plan 1.5 applies to governance documents too.

---

## 21. Verification and Certification Criteria

Plan 1.10 is complete only when all of the following are simultaneously true.

### 21.1 EQS Is Defined and Operative

Five axes, scoring 0–5 each, per-axis minimum of 3, type-threshold of 18 or 20. ✅ (§6)

### 21.2 Burden of Proof Asymmetry Is Explicit

Default outcome is DENY; compromise approvals are themselves new requests. ✅ (§7)

### 21.3 Approval Authority Matrix Is Specified

Per-type quorum (1/2/3), role definitions, conflict-of-interest rules. ✅ (§8)

### 21.4 Anti-Precedent Rule Is Specified

Citation as approval reasoning is prohibited; procedural and risk-learning citation is allowed. ✅ (§10)

### 21.5 Sunset Law Is Specified

Mandatory expiry per type; automatic-revert behavior; 1.5× surcharge on extension. ✅ (§11)

### 21.6 Exception Budget Is Specified

Per-phase allocation; consumption rules; non-replenishment within phase; exhaustion behavior. ✅ (§12)

### 21.7 Anti-Loophole Pattern Library Is Specified

Ten named patterns (A–J), detection methods, reviewer language, mandatory filter. ✅ (§13)

### 21.8 Decision-Impossibility List Is Specified

Twelve never-exempt actions (DI-01..DI-12), revocation behavior, amendment-by-SCR-only. ✅ (§14)

### 21.9 Reversibility Law Is Specified

Rollback plan required; quality scored into BS axis; type-specific rollback procedures. ✅ (§15)

### 21.10 Five-Trigger Promotion Gate Is Specified

G1..G5; SCR routing; default-DEFER; worked examples. ✅ (§16)

### 21.11 Lifecycle State Machine Is Specified

12 states; allowable transitions; prohibited transitions; state-log append-only. ✅ (§17)

### 21.12 Quarterly Sweep Is Specified

Procedure S1..S6; outcomes report; authority; sweep-triggered revocation. ✅ (§19)

### 21.13 Required Artifacts Exist

This document + `backend-v1-exception-budget.registry.md` ✅ (§20)

### 21.14 Practical-Use Answers Must Be Possible

A reviewer can answer from this document alone:

1. *Default exception outcome?* → DENY (§4.1, §7.1).
2. *Minimum EQS for AFE?* → ≥20/25 with each axis ≥3 (§5.2, §6.3).
3. *Minimum EQS for UDF?* → ≥15/25 with each axis ≥3 (§5.2).
4. *Can I cite a prior AFE as reason to approve a new one?* → No (§10.2).
5. *Do exceptions expire?* → Yes, all of them (§11).
6. *How many AFE+VSE+SCR are allowed in Phase 2?* → 3 combined (§12.2).
7. *Can the freeze be permanently bypassed by serial 30-day UDFs?* → No (§11.4 fresh EQS required; §11.5 surcharge).
8. *Can the user-facing safety gate be removed via AFE?* → No, DI-01 (§14.2).
9. *Can a single SCR promote both NB-006 and NB-008?* → No, class-wide bundling (§13.9).
10. *Can a sweep revoke an active exception?* → Yes, on observed DI-violation or scope drift (§19.5).

If any of those cannot be answered from this document alone, Plan 1.10 is not complete.

---

## 22. Done Definition

Plan 1.10 is complete only when:

> **Coinet backend v1 has a repo-resident exception and scope-change procedure that defines the Exception Qualification Score (EQS), the approval authority matrix per type, the burden-of-proof asymmetry, the anti-precedent rule, the sunset law, the per-phase exception budget, the anti-loophole pattern library, the decision-impossibility list, the five-trigger deferred-to-active promotion gate, the exception lifecycle state machine, the quarterly anti-staleness sweep, the reversibility law, and the documentation requirements; introduces only one new auxiliary artifact (the exception budget registry); and makes it operationally impossible for the freeze to be silently dissolved through accumulated small exceptions or precedent-based bypassing.**

This document and `backend-v1-exception-budget.registry.md` satisfy that definition once accepted via §24.

---

## 23. Transition to Plan 1.11

The next required step is:

> **Plan 1.11 — Phase 1 Done Definition and Transition Gate to Phase 2**

Plan 1.11 will formalize:

- exactly what Phase 1 completion means,
- what evidence proves Phase 1 is done,
- how the program transitions from "scope governance" to "live-path implementation,"
- what is permitted to begin in Phase 2 the moment Phase 1 closes,
- what is *not* yet permitted even after Phase 1 closes.

### 23.1 Closed Phase 1 Stack Through Plan 1.10

```text
Plan 1.1  = Why                                              [ACTIVE]
Plan 1.2  = What is in                                       [ACTIVE]
Plan 1.3  = What is out                                      [ACTIVE]
Plan 1.4  = No new architecture                              [ACTIVE]
Plan 1.5  = No new implementation sprawl                     [ACTIVE]
Plan 1.6  = Task-by-task admission law                       [ACTIVE]
Plan 1.7  = Repo-resident source-of-truth system             [ACTIVE]
Plan 1.8  = Existing backend surface inventory               [ACTIVE]
Plan 1.9  = Daily scope enforcement                          [ACTIVE]
Plan 1.10 = Exception and scope-change procedure             [ACTIVE]   ← this document
Plan 1.11 = Phase 1 done definition and transition gate      [NEXT]
```

---

## 24. Acceptance Block

```text
Backend v1 Exception and Scope-Change Procedure — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the EQS five-axis scoring (§6), including per-axis
      minimum of 3 and type thresholds of 18 (FRP/BSCP/UDF) or 20
      (AFE/VSE/SCR).
  [ ] I accept that the default outcome of every exception request
      is DENY (§4.1, §7.1).
  [ ] I accept the approval authority quorum per type (§8.1):
      UDF=1, FRP=2, BSCP=2, AFE=2, VSE=3, SCR=3.
  [ ] I accept the Anti-Precedent Rule (§10): no exception cites
      prior approvals as approval reasoning.
  [ ] I accept the Sunset Law (§11): every exception expires;
      extension consumes 1.5× budget; no permanent exceptions.
  [ ] I accept the per-phase exception budget (§12) and that
      exhaustion triggers escalation, not bypass.
  [ ] I accept the Anti-Loophole Pattern Library (§13) and will
      run the ten-check filter (§13.12) before EQS scoring.
  [ ] I accept the Decision-Impossibility List DI-01..DI-12 (§14)
      as non-exemptible.
  [ ] I accept the five-trigger Deferred→Active Promotion Gate
      (§16): G1..G5 all required.
  [ ] I accept the exception lifecycle state machine (§17),
      including prohibited transitions and append-only state log.
  [ ] I accept the quarterly anti-staleness sweep (§19) and
      that sweep-discovered DI-violations cause immediate
      revocation per §14.4.
  [ ] I accept the Reversibility Law (§15): every exception
      ships with a concrete rollback plan; "cannot be rolled
      back" = automatic denial.
  [ ] I accept the documentation requirements (§18): all 15
      record fields, same-session registry updates, append-only
      state log.
  [ ] I understand that approval of any exception is a signed
      action against the EQS worksheet, the anti-loophole
      filter, the DI list, and the budget — not a procedural
      formality.
```

Once accepted, the `Status` field is authoritative. Until accepted, treat this document as DRAFT.

---

## 25. Glossary (Document-Local)

- **EQS** — Exception Qualification Score. Five-axis 0–25 score; per-axis minimum 3; type thresholds 18 or 20.
- **PRN** — Production-Readiness Necessity (Axis A).
- **IOD** — Irreversibility-of-Deferral (Axis B).
- **BS** — Bounded Scope (Axis C).
- **TB** — Time-Boxedness (Axis D).
- **NP** — Non-Precedent (Axis E).
- **Anti-Loophole Filter** — the ten-pattern A–J reviewer checklist that runs before EQS scoring.
- **Decision-Impossibility List** — DI-01..DI-12, twelve actions that cannot be exempted by any exception type.
- **Five-Trigger Promotion Gate** — G1..G5, all required for deferred-item promotion.
- **Sunset Surcharge** — 1.5× budget cost on extension to discourage permanent exceptions by serial renewal.
- **Anti-Staleness Sweep** — quarterly audit of all ACTIVE / EXTENDED exceptions against rules already approved.
- **Authority Inheritance Abuse** — Anti-Loophole Pattern F; using §8.2 inheritance to collapse triple-quorum to one signature.
- **Dual Mandate** — strict (every exception governed) + not stupid (legitimate needs flow through procedure).

Definitions are document-local. Where another document conflicts, this document prevails for exception-governance purposes.

---

*End of Backend v1 Exception and Scope-Change Procedure — Plan 1.10.*
