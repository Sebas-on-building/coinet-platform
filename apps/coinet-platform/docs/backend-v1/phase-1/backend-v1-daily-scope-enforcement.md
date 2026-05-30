# Backend v1 Daily Scope Enforcement

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.9
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From: Plans 1.1–1.8
Supersedes: Informal task acceptance, ad-hoc PR review, opportunistic refactoring during admitted tasks

---

## 1. Identity and Authority

This document is the **daily operating procedure** of the Coinet Backend v1 program. It is the ninth scope-control plan inside Phase 1 and the first plan that governs *how engineers actually work*, not just what is in or out of scope.

Plans 1.1–1.8 produced:

- the production-convergence mission (1.1),
- the positive scope V1-S01..V1-S06 (1.2),
- the negative scope NB-001..NB-010 (1.3),
- the architecture freeze FRZ-001..FRZ-008 (1.4),
- the version-sprawl prohibition PSC-001..PSC-010 + FRP/BSCP/VSE (1.5),
- the task admissibility framework TAD-A..E + BTAR (1.6),
- the repo-resident source-of-truth system (1.7),
- the existing backend surface inventory + classification (1.8).

Plan 1.9 turns all of that into something that survives daily implementation pressure.

This document:

- does not admit any specific BTARs,
- does not implement code,
- does not reclassify any surface,
- does not amend any prior plan,
- does not start Phase 2 or Phase 3 work,
- does not begin Plan 1.10 content.

It performs one job:

> **It defines the task start protocol, new-file creation protocol, PR scope compliance law, V1_CORE protection law, duplicate-engine touch protocol, deferred-scope protection law, documentation synchronization law, scope-change procedure, developer/reviewer/AI checklists, and rejection language — so the freeze survives daily implementation work.**

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

---

## 2. Constitutional Purpose

### 2.1 Canonical Purpose Statement

> **The Scope Enforcement in Daily Development plan exists to convert Coinet's backend v1 scope freeze into a daily engineering operating procedure, ensuring that every backend task, file, pull request, refactor, exception, duplicate-engine touch, and scope change remains aligned with the production-ready Coinet v1 backend program.**

### 2.2 Why This Matters

A scope system is only valuable if it changes how work happens every day. Without Plan 1.9, "small" tasks can still reintroduce scope drift, duplicate paths, architecture expansion, deferred-system activation, and broad cleanup rabbit holes — each one individually defensible, collectively fatal to convergence.

### 2.3 What Plan 1.9 Changes Operationally

**Before Plan 1.9.** A task could begin because it seemed reasonable. PRs were judged on code quality. Refactor scope was elastic. New files appeared if useful.

**After Plan 1.9.** A task begins only if it cites its V1 surface, phase, touched surface classifications, and admission record. PRs are judged on scope compliance *and* code quality. Refactor scope is bounded by the BTAR. New files appear only with a declaration block.

---

## 3. Inheritance From Plans 1.1–1.8

### 3.1 Inheritance Statement

> **This plan inherits from the Phase 1 Charter, Product Boundary, Non-Scope Registry, Architecture Freeze Law, Version-Sprawl Prohibition, Task Admissibility Framework, Source-of-Truth System, and Existing Backend Surface Inventory. It does not redefine scope. It enforces scope during day-to-day implementation.**

### 3.2 Relationship Table

| Plan         | Role                                               |
| ------------ | -------------------------------------------------- |
| Plan 1.1     | Declares convergence mission                       |
| Plan 1.2     | Defines in-scope backend surfaces                  |
| Plan 1.3     | Defines non-scope / non-blockers                   |
| Plan 1.4     | Freezes architecture expansion                     |
| Plan 1.5     | Freezes version and service sprawl                 |
| Plan 1.6     | Defines task admissibility                         |
| Plan 1.7     | Defines source-of-truth system                     |
| Plan 1.8     | Classifies current backend surfaces                |
| **Plan 1.9** | Enforces all of the above during daily development |

---

## 4. First Principle

### 4.1 Canonical First Principle

> **No backend implementation work may proceed unless it can identify the v1 surface it serves, the current phase it advances, the existing backend surface it touches, and the governance record that authorizes it.**

### 4.2 Practical Translation

Every meaningful backend task must answer:

```text
What v1 surface does this serve?
Which Phase 1–3 objective does this advance?
Which existing surface does this touch?
Is this task admitted, deferred, blocked, or escalated?
Does it create a new file, new path, new architecture, or duplicate implementation?
Which registry or record proves this is allowed?
```

If the answer is unclear, the work does not begin.

---

## 5. Daily Development Enforcement Model

### 5.1 Required Workflow

```text
1.  Task idea appears
2.  Check Plan 1.2 product boundary
3.  Check Plan 1.3 non-scope registry
4.  Check Plan 1.4 architecture freeze
5.  Check Plan 1.5 version-sprawl prohibition
6.  Check Plan 1.8 surface inventory
7.  Create or reference BTAR
8.  Assign TAD outcome
9.  If admitted, add to active task registry
10. Implement only the admitted scope
11. During PR, verify scope compliance
12. Update registries/docs if any status changes
13. Close task with completion proof
```

### 5.2 The Active-Status Rule

> **A task is not active because someone is working on it. A task is active only if the source-of-truth system says it is active.**

`backend-v1-active-task.registry.md` is authoritative. Working off-registry is silent scope expansion.

---

## 6. Backend Task Start Protocol

### 6.1 Pre-start Checklist (Five Required Answers)

Before any meaningful backend task begins, the engineer must answer five questions in writing (in the BTAR):

#### 6.1.1 Product boundary

```text
V1-S01 AI_CHAT
V1-S02 ASSET_JUDGMENT
V1-S03 MARKET_TERMINAL_INTELLIGENCE
V1-S04 RADAR_RANKING_INTELLIGENCE
V1-S05 AUTH_SESSION_CONVERSATION_PERSISTENCE
V1-S06 TRUTHFUL_ALERTS_CONDITIONAL
SCOPE_CONTROL    (governance / scope docs)
NONE             (probably defer or block)
```

#### 6.1.2 Phase alignment

```text
PHASE_1_STABILIZATION
PHASE_2_LIVE_PATH_TRUST
PHASE_3_SYNTHETIC_TRUTH
POST_PHASE_3
UNKNOWN           (must be resolved before admission)
```

#### 6.1.3 Existing surface classification (per Plan 1.8)

```text
V1_CORE
V1_SUPPORTING
DEFERRED
DORMANT_ARCHITECTURE
LEGACY_OR_DUPLICATIVE
UNKNOWN_REQUIRES_TRIAGE
```

#### 6.1.4 Admission status

```text
TAD-A   ADMIT_ACTIVE_NOW
TAD-B   ADMIT_BUT_QUEUE_FOR_LATER_PHASE_WITHIN_CURRENT_PROGRAM
TAD-C   DEFER_POST_PHASE_3
TAD-D   BLOCK_AS_SCOPE_OR_FREEZE_VIOLATION
TAD-E   ESCALATE_FOR_EXCEPTION_OR_ARCHITECTURAL_DECISION
```

#### 6.1.5 Record basis

```text
BTAR-NNN          (regular task)
UDF-NNN           (urgent defect, Plan 1.6 §17)
AFE-NNN / VSE-NNN / FRP-NNN / BSCP-NNN / SCR-NNN  (exception/governance)
```

### 6.2 Task Start Rule

A task may begin immediately only if **all** of these are true:

- TAD outcome is `TAD-A`,
- `backend-v1-active-task.registry.md` has an entry pointing to the BTAR/UDF,
- No Plan 1.3 / 1.4 / 1.5 conflict on touched surfaces,
- Touched surfaces are classified in Plan 1.8, or are explicitly marked `UNKNOWN_REQUIRES_TRIAGE` with a triage entry.

### 6.3 If the Surface Is Not Classified

If the target file or surface is not in the Plan 1.8 inventory:

```text
Do not edit it directly.
First add it to UNKNOWN_REQUIRES_TRIAGE or classify it properly,
then re-evaluate admission.
```

Untracked surfaces must not be modified casually.

---

## 7. New File Creation Protocol

### 7.1 New File Rule

> **No new backend file may be created unless its purpose, owner, v1 surface mapping, phase relevance, and relationship to existing canonical paths are declared before creation.**

### 7.2 Required Declaration Block

Every new backend file must declare (inside the BTAR or PR description):

```text
file_path:
purpose:
task_id:                     (BTAR-NNN / UDF-NNN)
v1_surface_mapping:          (V1-S01..S06 or SCOPE_CONTROL)
target_phase:                (PHASE_1 / 2 / 3)
existing_surface_touched:    (path or NONE)
classification_of_new_file:  (V1_CORE / V1_SUPPORTING / V1_CORE_HELPER)
is_new_capability:           (yes/no)
is_extraction:               (yes/no)
is_replacement:              (yes/no — requires FRP)
is_shadow_candidate:         (yes/no — requires BSCP)
version_sprawl_check:        (none / VSV-X violation)
architecture_freeze_check:   (none / AFV-X violation)
```

### 7.3 Allowed New File Types

#### A. Helper extraction (CSP-B)

Allowed if it extracts from an existing active path without changing product semantics.

```text
Example:  src/api/chat/context-builders/judgment-context.ts
```

#### B. Test file

Allowed if it tests an admitted backend surface.

```text
Example:  src/api/chat/__tests__/chat-path.smoke.test.ts
```

#### C. Policy / safety gate file

Allowed if admitted under Phase 2 and does not create a competing AI service.

```text
Example:  src/api/chat/output-safety/live-output-safety-gate.ts
```

#### D. Synthetic fixture file

Allowed under Phase 3.

```text
Example:  src/services/judgment/__tests__/fixtures/synthetic-truth-episodes.ts
```

### 7.4 Prohibited New File Names

The following are prohibited without an approved FRP / BSCP / VSE / AFE record:

```text
ai-service-v2.ts
judgment-engine-final.ts
news-intelligence-complete.ts
l14_11-new-delivery-layer.ts
strategy-lab-backend.ts
chart-canvas-runtime.ts
omniscore-v4.ts
derivatives-intelligence-ultimate.ts
*-comprehensive.ts
*-rebuilt.ts
*-master.ts
```

See Plan 1.5 §11.1 for the full prohibited-pattern registry.

---

## 8. PR Scope Compliance Law

### 8.1 Required PR Scope Block

Every backend PR must include this block in its description:

```text
## Backend v1 Scope Compliance

Backend v1 scope category:    (V1-S01..S06 / SCOPE_CONTROL / NONE)
Target phase:                 (PHASE_1 / 2 / 3 / POST_PHASE_3)
BTAR / UDF / exception:       (BTAR-NNN / UDF-NNN / AFE-NNN / ...)
Touched surfaces:             (paths)
Plan 1.8 classifications:     (V1_CORE / V1_SUPPORTING / ...)
New files created:            (paths, or NONE)
Architecture freeze check:    (none / AFV-X with exception ref)
Version-sprawl check:         (none / VSV-X with FRP/BSCP/VSE ref)
Deferred-scope check:         (none / NB-NNN with SCR ref)
Tests or proof:               (test paths / smoke output / artifact ref)
Docs/registries updated:      (paths)
```

A PR without this block is not merge-eligible.

### 8.2 PR Rejection Rules

A backend PR **must** be rejected if it:

- lacks a v1 scope category,
- touches `V1_CORE` files without a BTAR / UDF,
- creates a new backend service file with no purpose declaration,
- creates `-v2`, `-final`, `-complete`, or equivalent implementation naming without FRP / BSCP / VSE,
- starts deferred scope (NB-001..NB-010) without SCR,
- touches dormant L14 / L13 / L* systems without legal basis (Plan 1.4 Legal Work Class D bounded reuse, or AFE),
- modifies duplicate-engine families without FRP / BSCP or an admitted task,
- changes scope but does not update the registries.

### 8.3 PR Caution for Critical Files

Any PR touching the following surfaces must be treated as **high-risk**:

```text
src/api/chat/service.ts          (V1_CORE, 2124 lines, CRITICAL)
src/services/judgment/index.ts   (produceJudgment, CRITICAL)
src/services/ai-service.ts       (CRITICAL)
src/index.ts                     (6080-line monolith, CRITICAL mixed)
src/services/omniscore_v3/       (active scoring pipeline)
src/services/hypotheses/         (active L10 wrapper)
src/services/judgment/regime-engine.ts  (active L8 wrapper)
src/services/judgment/timing-engine.ts  (in-service, bypasses L9)
src/services/judgment/state-engine.ts
src/services/judgment/contradiction-engine.ts
src/services/judgment/confidence-engine.ts
src/services/judgment/signal-snapshot.ts
src/services/judgment/debug-view.ts        (formatJudgmentForAI)
src/services/ai-hallucination-guard.ts
src/services/calibration-spine/snapshot-writer.ts  (partial L14 wiring)
```

High-risk PRs require:

- an explicit BTAR (no shortcuts),
- tests or smoke proof,
- a focused diff (no bundled unrelated cleanup),
- a stated rollback plan or small enough size that rollback is trivial.

---

## 9. V1 Core Surface Protection Law

### 9.1 Protected Surfaces

At minimum, these surfaces are protected (full list in Plan 1.8 classification registry §A):

```text
src/api/chat/                            (full folder, especially service.ts)
src/services/judgment/                   (full folder)
src/services/ai-service.ts
src/services/ai-hallucination-guard.ts
src/services/hypotheses/
src/services/omniscore_v3/
src/services/canonicalization/           (active subset)
src/services/canonical/
src/services/knowledge-graph/
src/services/reasoning-context/
src/services/chat-audit/
src/services/calibration-spine/snapshot-writer.ts
src/index.ts                             (mixed monolith)
```

### 9.2 Protection Rule

A protected core surface may be modified only if:

1. the task is admitted (`TAD-A` BTAR or qualifying UDF),
2. the change is focused on the BTAR scope,
3. the risk is documented in the BTAR (`risk_if_modified` field),
4. the relevant smoke / unit test is run or planned,
5. no unrelated cleanup is bundled into the PR,
6. rollback is straightforward, or the change is small enough that rollback is trivial.

### 9.3 Why This Matters

These files are simultaneously the most important and the most dangerous in the codebase. They are the only surfaces through which Coinet's judgment reaches users. Casual refactor is the single highest-severity backend production risk.

---

## 10. Duplicate-Engine Touch Protocol

### 10.1 Families Requiring Caution

Per Plan 1.8 legacy/duplicative registry, the following families have concurrent active duplicates:

```text
Derivatives intelligence       (3 active variants)
Social / sentiment             (5+ active variants)
News intelligence              (2+ active variants)
OmniScore                      (v2.5, v3, project-omniscore ×2, helpers)
OmniScore data fetcher         (base, v22, v23)
Anomaly latency monitor        (base, v2)
Liquidation                    (service, heatmap-v2)
```

### 10.2 Duplicate-Engine Rule

> **No duplicate-engine family may be expanded, renamed, replaced, or partially canonicalized without a BTAR and, where relevant, FRP or BSCP.**

### 10.3 Allowed Touches Without FRP

Touches are allowed only when:

- fixing build / test breakage in an admitted task,
- preventing live-path failure,
- making imports explicit / removing ambiguity (read-only-style cleanup),
- documenting active usage in registries,
- narrowing a bug within an admitted-task scope.

### 10.4 Prohibited Touches

Not allowed:

- adding another derivative engine variant,
- creating a new social-intelligence variant,
- rewriting OmniScore in a new file,
- silently removing one duplicate from the chat prompt context without evidence,
- choosing canonical winners without a formal FRP-governed canonicalization task,
- partial migrations that leave the family in an inconsistent intermediate state with no expiry.

### 10.5 Required Caution Language in BTAR

A BTAR touching duplicate families must contain exactly one of:

```text
This task does not canonicalize the family unless an FRP explicitly says so.

  -- or --

This task is the formal canonicalization task under FRP-NNN.
```

No ambiguity. No middle ground.

---

## 11. Deferred Scope Protection Law

### 11.1 Deferred Areas (Plan 1.3)

```text
NB-001  Strategy Lab backend
NB-002  Chart Canvas backend
NB-003  Plugin systems
NB-004  Experimental agent builders
NB-005  Full calibration proposal ecosystem
NB-006  Full CIP.1 unified architecture
NB-007  Dormant L14 systems (full operationalization)
NB-008  Deep real API/provider integration before purchase
NB-009  Advanced alert delivery ecosystem
NB-010  Broad cleanup not directly required for Phases 1–3
```

### 11.2 Deferred-Scope Rule

A task touching a deferred area defaults to:

```text
TAD-C DEFER_POST_PHASE_3
```

unless it is:

- necessary to fix build truth (UDF candidate),
- necessary to keep existing production code from breaking (UDF candidate),
- explicitly approved through an SCR (Plan 1.7 §13.5).

### 11.3 Worked Example

**Task:** "Add backend support for Chart Canvas scenario overlays."
→ Reject / defer. Chart Canvas backend is NB-002. Not active before backend v1 core is stable.

**Task:** "Fix a TypeScript error in an unused Chart Canvas backend placeholder that breaks the build."
→ May be admitted as UDF if build truth is blocked. The fix must not expand functionality of the placeholder. Minimum change to restore build truth.

---

## 12. Documentation Synchronization Law

### 12.1 Sync-Triggering Events

The following changes require **same-session** documentation updates:

1. task admitted,
2. task completed,
3. task deferred,
4. task blocked,
5. exception approved / rejected,
6. file / surface reclassified,
7. scope boundary changed,
8. duplicate-family canonicalization started,
9. new record created (any record type),
10. urgent defect closed.

### 12.2 Sync Targets Table

| Change                              | Must update                                                              |
| ----------------------------------- | ------------------------------------------------------------------------ |
| New active task                     | BTAR + `active-task.registry.md` + `record-index.registry.md`            |
| Deferred task                       | BTAR + `deferred.registry.md` (if new class) + `record-index.registry.md` |
| Blocked task                        | BTAR + `blocked.registry.md` (if new pattern) + `record-index.registry.md` |
| Exception                           | `exception.registry.md` + `record-index.registry.md`                     |
| FRP                                 | FRP record + `exception.registry.md` + `record-index.registry.md`        |
| BSCP                                | BSCP record + `exception.registry.md` + `record-index.registry.md`       |
| Surface classification change       | `existing-backend-surface-classification.registry.md` + inventory master |
| Unknown resolved → known            | `unknown-surface-triage.registry.md` + classification registry           |
| Major decision                      | `decision-log.registry.md` + ADR record                                  |
| Scope change                        | source plan + relevant registries + `decision-log.registry.md`           |

### 12.3 Sync Violation Rule

> **A task is not complete if the code changed but the governance records are stale.**

Completion requires three states to match:

```text
code state                      ✔
test / proof state              ✔
registry / record state         ✔
```

A PR that updates code but does not update the required registries is rejected.

---

## 13. Scope Change Procedure During Daily Work

### 13.1 What Counts as a Scope Change

- adding a new v1 surface (V1-S07+),
- moving a deferred item (NB-NNN) into active scope,
- removing a blocked pattern from the blocked registry,
- activating a dormant L14 / L13 / L* system in production,
- beginning deep API / provider work before the remembered Phase 1–3 boundary,
- making Truthful Alerts (V1-S06) non-conditional.

### 13.2 Required Scope-Change Path

```text
1. Create SCR record (templates/scope-change-request-template.md)
2. Reference impacted source plans (Plan 1.x sections)
3. Explain why current scope is insufficient (evidence-based)
4. Identify production risk if not changed
5. Identify opportunity cost
6. Submit per Plan 1.1 §13 change-control authority
7. If approved:
     a. Amend source plan first
     b. Update affected registries
     c. Add entry to decision log
     d. Index SCR in exception + record index registries
```

### 13.3 Default Outcome

```text
DEFER
```

The current program is intentionally narrow. SCR approval requires positive justification and explicit change-control authority.

---

## 14. Developer Operating Checklist

### 14.1 Before Coding

Ask:

```text
[ ] Is there a BTAR or UDF for this work?
[ ] Is this task TAD-A in the active-task registry?
[ ] Which V1 surface does it serve?
[ ] Which phase does it advance?
[ ] Which files are touched?
[ ] What are their Plan 1.8 classifications?
[ ] Will I create new files?
[ ] Does Plan 1.5 allow those files / names?
[ ] Are docs / registries impacted by this change?
```

If any answer is unclear, stop and resolve before coding.

### 14.2 While Coding

Rules:

- keep diff narrow to the BTAR,
- do not opportunistically refactor unrelated code,
- do not add new variants of any existing capability,
- do not expand deferred areas,
- do not touch dormant architecture unless admitted (Plan 1.4 Legal Work Class D bounded reuse only),
- preserve existing product behavior unless the task explicitly changes it.

### 14.3 Before PR

Check:

```text
[ ] Task still matches BTAR scope (no silent expansion).
[ ] No unauthorized files added.
[ ] No prohibited naming patterns introduced.
[ ] Tests / smoke proof included.
[ ] Active / deferred / blocked registries updated if needed.
[ ] Record index updated.
[ ] Surface classification updated if any Plan 1.8 entry changed.
[ ] No accidental scope expansion.
[ ] PR Scope Compliance block (§8.1) filled in completely.
```

### 14.4 After Merge

Update:

```text
[ ] BTAR state → COMPLETED (Plan 1.6 §15.4)
[ ] active-task.registry.md → status Done + completion proof
[ ] record-index.registry.md → Last Updated
[ ] decision-log.registry.md if the change is program-level
[ ] Follow-up BTARs filed if discoveries surfaced during work
```

---

## 15. Reviewer Checklist

### 15.1 Reviewer Must Check

```text
1.  Does the PR cite a BTAR / UDF / exception?
2.  Does the touched surface match Plan 1.8 classification?
3.  Is the change limited to admitted scope?
4.  Are new files legal under Plan 1.5 (naming, declaration, classification)?
5.  Does the PR touch deferred scope (NB-NNN) without SCR?
6.  Does it create a new architecture / sublayer / dormant program?
7.  Does it expand duplicate-engine families?
8.  Are required docs / registries updated?
9.  Are tests / proofs included?
10. Is the change shippable without hidden side effects?
```

### 15.2 Standard Reviewer Rejection Language

For consistency, reviewers should use these standard rejection phrases when the corresponding violation is detected:

```text
Rejected: no BTAR or UDF record cited.
Rejected: task does not map to a V1-S0x surface.
Rejected: creates version-sprawl (VSV-X) without FRP / BSCP / VSE.
Rejected: touches deferred scope NB-NNN under Plan 1.3 without SCR.
Rejected: touches V1_CORE surface without test / proof.
Rejected: bundles unrelated cleanup with admitted scope.
Rejected: scope change requires SCR first; amend source plan and resubmit.
Rejected: PR Scope Compliance block missing or incomplete.
Rejected: prohibited file name pattern (-v2 / -final / -complete / etc.).
Rejected: new architecture (AFV-X) without AFE record.
```

### 15.3 Reviewer Tone

Enforcement is consistent, not adversarial. The reviewer's job is to keep the freeze intact while the engineer's job is to ship admitted work. Rejection is procedural; approval is the default for compliant PRs.

---

## 16. AI / Execution-System Guardrails

Since meaningful backend work may be executed by AI coding systems, Plan 1.9 includes explicit guardrails for them.

### 16.1 AI Execution Hard Rules

An AI execution system **must not**:

- create new backend service variants,
- create new architecture layers,
- touch deferred areas (NB-001..NB-010),
- start API / provider integration work,
- refactor broad areas beyond the admitted BTAR scope,
- modify critical files (§9.1) without an admitted BTAR / UDF,
- choose canonical winners among duplicate families,
- delete legacy duplicates,

unless explicitly instructed by an admitted record (BTAR / UDF / FRP / BSCP / AFE / VSE / SCR).

### 16.2 AI Must Do Before Editing

The AI must, in order:

1. identify the target task record (BTAR / UDF / exception),
2. identify the touched files,
3. check Plan 1.8 classification for each touched file,
4. check Plan 1.5 naming law for any new file,
5. limit the diff to the task,
6. report any discovered scope risk back to the operator **instead of** silently expanding scope.

### 16.3 AI Discovery Rule

If the AI discovers a problem outside the admitted task:

```text
Document it as a follow-up BTAR or UDF candidate.
Do not fix it opportunistically.
```

The only exception is a defect that qualifies as UDF under Plan 1.6 §17.2 *and* directly blocks the current admitted task. In that case, file a brief UDF and continue. Even then, the UDF fix must not create new sprawl, expansion, or scope re-entry (Plan 1.6 §17.4).

### 16.4 AI Output Discipline

When the AI proposes code, it must also propose the corresponding registry / record updates required by §12. Code changes without governance updates are incomplete.

---

## 17. Implementation Priority Discipline

### 17.1 Current Implementation Order

Daily work prioritizes:

```text
1. Phase 1 — Backend stabilization (build truth, CI, smoke tests, scope docs)
2. Phase 2 — Live-path trustworthiness (judgment availability, output safety gate, testable chat)
3. Phase 3 — Synthetic judgment truth (Backend Judgment Truth Suite)
4. STOP AND REASSESS
```

No work belonging to a later phase displaces work in an earlier phase except by explicit prioritization decision recorded in the decision log.

### 17.2 Likely First Admitted Tasks (Not Yet Admitted)

Per Plan 1.8 §15.2 and the user-locked Phase 1 plan, the first real BTARs are *expected* to be:

```text
BTAR-001 — Fix lying build/typecheck behavior (UDF candidate)
BTAR-002 — Add minimal chat-path smoke test
BTAR-003 — Remove silent judgment fallback in /api/chat
BTAR-004 — Introduce CoinetJudgmentPromptPackage (FRP for ASCII formatter)
BTAR-005 — Add live AI output safety gate (borrowed L13.9 ideas under Plan 1.4 Legal Class D)
BTAR-006 — Backend Judgment Truth Suite scaffold
```

**These are not admitted by Plan 1.9.** They are mentioned only as the likely first candidates so that subsequent planning sessions know where to start. Each must still go through the BTAR template, the eight-question gate, and the active-task registry before any code is touched.

---

## 18. Verification and Certification Criteria

Plan 1.9 is complete only when the artifact makes all of the following enforceable.

### 18.1 Daily Task Enforcement Is Explicit

The document states that every meaningful backend task needs v1 surface mapping, phase mapping, surface classification, admission status, and governance record. ✅ (§6)

### 18.2 New File Control Is Explicit

The document specifies when new files are legal, what declarations are required, and what names / patterns are forbidden. ✅ (§7)

### 18.3 PR Enforcement Is Explicit

The document specifies the required PR scope block, the rejection rules, and the critical-file caution list. ✅ (§8)

### 18.4 Duplicate-Engine Enforcement Is Explicit

The document specifies that duplicate families require caution, that no expansion / canonicalization is allowed without FRP / BSCP / BTAR, and that no new variants may be created. ✅ (§10)

### 18.5 Documentation Sync Is Explicit

The document specifies what changes require registry updates, which registries / records update, and that code is not complete if governance is stale. ✅ (§12)

### 18.6 Practical-Use Answers Must Be Possible

A developer can answer from this document alone:

1. Can I start a task without a BTAR?
   → **No**, unless trivial non-functional change (Plan 1.6 §14.2) or qualifying UDF (Plan 1.6 §17.2).
2. Can I create a new backend file?
   → **Only** with declared purpose, legal classification, and naming that obeys Plan 1.5. (§7)
3. Can I create `news-service-v2.ts`?
   → **No.** VSV-A violation. Plan 1.5 / blocked registry.
4. Can I touch `api/chat/service.ts`?
   → **Only** with admitted task, focused diff, and test / proof plan. (§9)
5. Can I fix a build-breaking deferred module?
   → **Yes**, as a UDF, without expanding the module. (§11.3 Example B)
6. Can I update scope because the frontend wants a new backend feature?
   → **Only** through an SCR (Plan 1.7 §13.5). (§13)
7. Can AI fix unrelated issues it discovers?
   → **No.** Document as follow-up BTAR / UDF. Do not fix opportunistically. (§16.3)

---

## 19. Done Definition

Plan 1.9 is complete only when:

> **Coinet backend v1 has a repo-resident daily scope enforcement policy that defines how every backend task starts, how new files are justified, how PRs prove scope compliance, how V1_CORE surfaces are protected, how duplicate-engine families are handled, how deferred areas are kept out of active work, how documentation and registries stay synchronized, how scope changes are requested, how developers and reviewers enforce the rules, and how AI execution systems avoid accidental expansion while implementing production-critical backend work.**

This document satisfies that definition once accepted via §21.

---

## 20. Transition to Plan 1.10

The next required step is:

> **Plan 1.10 — Exception and Scope-Change Procedure**

Plan 1.10 will formalize:

- when exceptions are allowed,
- who can approve them,
- what record must exist,
- how deferred items become active,
- how scope changes update Plans 1.1–1.9,
- how to prevent exceptions from becoming the new loophole.

### 20.1 Closed Stack Through Plan 1.9

```text
Plan 1.1 = Why                                              [ACTIVE]
Plan 1.2 = What is in                                       [ACTIVE]
Plan 1.3 = What is out                                      [ACTIVE]
Plan 1.4 = No new architecture                              [ACTIVE]
Plan 1.5 = No new implementation sprawl                     [ACTIVE]
Plan 1.6 = Task-by-task admission law                       [ACTIVE]
Plan 1.7 = Repo-resident source-of-truth system             [ACTIVE]
Plan 1.8 = Existing backend surface inventory               [ACTIVE]
Plan 1.9 = Daily scope enforcement                          [ACTIVE]   ← this document
Plan 1.10 = Exception and scope-change procedure            [NEXT]
```

---

## 21. Acceptance Block

```text
Backend v1 Daily Scope Enforcement — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the first principle (§4.1) and the workflow in §5.1.
  [ ] I will run the task start protocol (§6) before any meaningful
      backend task.
  [ ] I will obey the new file creation protocol (§7), including the
      declaration block in §7.2 and the prohibited names in §7.4.
  [ ] I will include the PR Scope Compliance block (§8.1) in every
      backend PR.
  [ ] I accept the V1_CORE protection rule (§9.2) and the critical-file
      list (§8.3 / §9.1).
  [ ] I accept the duplicate-engine touch protocol (§10), including
      the §10.5 required caution language.
  [ ] I accept the deferred-scope protection rule (§11.2) and will
      route scope changes through SCR (§13).
  [ ] I accept the documentation synchronization law (§12) and that
      "code complete + docs stale = task incomplete".
  [ ] I accept the AI execution-system guardrails (§16), including
      the AI discovery rule (§16.3): document, do not fix opportunistically.
  [ ] I understand that BTAR-001..006 (§17.2) are likely first
      candidates but not yet admitted; admission requires going
      through the full Plan 1.6 process.
```

Once accepted, the `Status` field is authoritative. Until accepted, treat this document as DRAFT.

---

*End of Backend v1 Daily Scope Enforcement — Plan 1.9.*
