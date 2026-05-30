# Backend v1 Task Admissibility Framework

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.6
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From:
  - Plan 1.1 — Phase 1 Charter (`phase-1-charter.md`)
  - Plan 1.2 — Backend v1 Product Boundary (`backend-v1-product-boundary.md`)
  - Plan 1.3 — Backend v1 Non-Blocker and Non-Scope Registry (`backend-v1-non-blocker-and-non-scope-registry.md`)
  - Plan 1.4 — Backend v1 Architecture Expansion Freeze Law (`backend-v1-architecture-expansion-freeze-law.md`)
  - Plan 1.5 — Backend v1 Parallel-Service and Version-Sprawl Prohibition (`backend-v1-parallel-service-and-version-sprawl-prohibition.md`)
Supersedes: Informal task admission, "vibes-based" backlog entry, and ad-hoc exceptions

---

## 1. Identity and Authority

This document is the **task-level execution authority** of the Coinet Backend v1 program. It is the sixth and final scope-control plan inside Phase 1.

Plans 1.1–1.5 produced a complete program-level scope structure:

- Plan 1.1 declared the production-convergence mission,
- Plan 1.2 defined what backend v1 actively is (V1-S01..V1-S06),
- Plan 1.3 defined what must not delay backend v1 (NB-001..NB-010),
- Plan 1.4 prohibited new architecture expansion (FRZ-001..FRZ-008),
- Plan 1.5 prohibited new parallel-service / version-sprawl growth (PSC-001..PSC-010, CSP-A..E, FRP/BSCP/VSE).

Plan 1.6 closes the loop. It turns the four-sided scope-control square into a **task-level admission filter** that every meaningful backend task must pass through before entering active execution.

This document:

- does not implement any code,
- does not actually admit any specific tasks yet,
- does not reclassify any prior plan,
- does not redefine the v1 surfaces, non-blockers, freeze entries, or sprawl prohibitions,
- does not begin Plan 1.7 work.

It performs one job:

> **It defines the task-level admission filter (TAD-A..E), the eight-question admissibility gate, the allowed/deferred/blocked/edge-case classes, the formal Backend Task Admission Record (BTAR), the precedence hierarchy, the backlog bucket law, the cleanup/refactor law, and the urgent-defect law — so that every meaningful backend task during the Phase 1–3 program is explicitly admitted, queued, deferred, blocked, or escalated against an inspectable filter.**

### 1.1 Pre-execution Dependency Check (Performed)

Before this document was finalized, the executing system confirmed:

1. `phase-1-charter.md` exists and is `ACTIVE`. ✅
2. `backend-v1-product-boundary.md` exists and is `ACTIVE`. ✅
3. `backend-v1-non-blocker-and-non-scope-registry.md` exists and is `ACTIVE`. ✅
4. `backend-v1-architecture-expansion-freeze-law.md` exists and is `ACTIVE`. ✅
5. `backend-v1-parallel-service-and-version-sprawl-prohibition.md` exists and is `ACTIVE`. ✅
6. The truth-clean active-runtime reference is recorded in Plans 1.1 and 1.2:
   ```text
   /api/chat
     → api/chat/service.ts
       → buildSignalSnapshot()
       → produceJudgment()
       → formatJudgmentForAI()
       → aiService.analyze()
         → services/ai-service.ts
   ```
   ✅

Plan 1.6 therefore inherits from a truth-clean and structurally complete upstream stack.

---

## 2. Constitutional Purpose

### 2.1 Canonical Purpose Statement

> **The Backend Task Admissibility Framework exists to ensure that every backend task proposed during the Coinet v1 production-convergence program is explicitly admitted, deferred, blocked, or escalated based on whether it directly advances production-ready Coinet v1 while remaining compliant with the previously frozen scope, non-scope, architecture-freeze, and version-sprawl laws.**

This sentence is the root authority of Plan 1.6.

### 2.2 Why This Plan Is Necessary

A program can still drift even after defining its boundaries if:

- tasks are accepted informally,
- "small exceptions" accumulate,
- deferred items sneak back in as side work,
- refactors balloon into rewrites,
- future-scope tasks get justified as "quick wins,"
- engineers do not know whether a task is admissible or merely attractive.

Plan 1.6 prevents that.

> **No backend task enters active work by vibes. Every task passes a production-readiness filter.**

### 2.3 What Plan 1.6 Changes Operationally

**Before Plan 1.6.** A task could enter active backend work if it seemed useful, aligned loosely with Coinet, fixed something nearby, or someone felt it should "probably be done now."

**After Plan 1.6.** A task enters active backend work only if it survives a formal admission filter that checks:

1. v1 scope fit,
2. phase fit,
3. non-scope exclusion,
4. architecture freeze compliance,
5. version-sprawl compliance,
6. direct production-readiness value,
7. urgency,
8. dependency timing.

The asymmetry shifts: rejection is default; admission requires positive justification.

---

## 3. Inheritance From Plans 1.1–1.5

### 3.1 Inheritance Statement

> **This framework inherits from the Phase 1 Charter, the Backend v1 Product Boundary, the Non-Blocker and Non-Scope Registry, the Architecture Expansion Freeze Law, and the Parallel-Service and Version-Sprawl Prohibition. It does not redefine those documents. It operationalizes them at task level.**

Specifically inherited:

- **From Plan 1.1:** the production-convergence mission, the Phase 1 → Phase 2 → Phase 3 → STOP AND REASSESS boundary, the three Phase 1 goals.
- **From Plan 1.2:** the six v1 surfaces V1-S01..V1-S06 and the reasoning spine (Asset Judgment + AI Chat).
- **From Plan 1.3:** the ten non-blockers NB-001..NB-010 and the NS-A..F classification.
- **From Plan 1.4:** the eight freeze violation classes AFV-A..H, the eight frozen registry entries FRZ-001..FRZ-008, the five legal work classes A..E, and the AFE exception path.
- **From Plan 1.5:** the ten protected capabilities PSC-001..PSC-010, the five canonical-service-path classes CSP-A..E, the ten violation classes VSV-A..J, the prohibited naming patterns, and the FRP/BSCP/VSE procedures.

### 3.2 Relationship Table

| Plan         | Function                                                        |
| ------------ | --------------------------------------------------------------- |
| Plan 1.1     | Establishes production-convergence mission                      |
| Plan 1.2     | Defines positive backend v1 scope                               |
| Plan 1.3     | Defines negative backend v1 scope                               |
| Plan 1.4     | Blocks new architecture expansion                               |
| Plan 1.5     | Blocks new parallel-service/version sprawl                      |
| **Plan 1.6** | Decides whether each individual task may enter active execution |

---

## 4. First Principle

### 4.1 Canonical First Principle

> **A backend task is admissible only if it directly increases the probability that Coinet v1 becomes production-ready, while remaining compliant with the active backend scope, the current Phase 1–3 execution boundary, and all previously frozen anti-sprawl laws.**

### 4.2 The Simple Verbal Test

Every task must answer:

```text
Does this directly help production-ready Coinet v1?
```

If the answer is not clearly **yes**, the task is deferred, blocked, or escalated for explicit exception review.

### 4.3 The Three Kinds of "Yes"

A task counts as directly helping production-ready Coinet v1 only if it falls into one of three current active categories:

**A. Phase 1 — Backend stabilization.**
Truthful build/typecheck, CI basics, smoke tests, scope-control documentation.

**B. Phase 2 — Live path trustworthiness.**
Remove silent judgment fallback, judgment availability states, typed prompt package, AI output safety gate, testable chat service.

**C. Phase 3 — Synthetic judgment truth.**
Truth suite episodes, semantic correctness assertions, fixing false confidence, fixing contradiction erasure, fixing scenario misclassification under fake data.

Anything else must prove itself exceptionally — through AFE, FRP, BSCP, VSE, or escalation.

---

## 5. Task Admissibility Problem Statement

### 5.1 Canonical Problem Statement

> **Coinet's backend now has a defined v1 scope and explicit anti-expansion laws, but production convergence will still fail if individual backend tasks are admitted inconsistently. A project with broad architecture, dormant systems, duplicate capabilities, and many plausible future directions needs a task-level admission framework that separates work that genuinely advances backend readiness from work that merely feels relevant. Plan 1.6 creates that filter.**

### 5.2 What Problem It Solves

Plan 1.6 directly addresses:

- accidental side quests,
- false urgency,
- broad cleanup rabbit holes,
- scope drift through small task admissions,
- re-entry of deferred areas through "minor" work,
- premature API/provider work,
- disguised architecture expansion,
- hidden parallel-service creation.

---

## 6. Canonical Task Decision Outcomes (TAD Taxonomy)

### 6.1 The Five Decision Outcomes

```text
TAD-A — ADMIT_ACTIVE_NOW
TAD-B — ADMIT_BUT_QUEUE_FOR_LATER_PHASE_WITHIN_CURRENT_PROGRAM
TAD-C — DEFER_POST_PHASE_3
TAD-D — BLOCK_AS_SCOPE_OR_FREEZE_VIOLATION
TAD-E — ESCALATE_FOR_EXCEPTION_OR_ARCHITECTURAL_DECISION
```

### 6.2 Definitions

**`TAD-A — ADMIT_ACTIVE_NOW`.**
The task directly supports current active work, fits the current phase, violates no freeze law, and should be executed now.

**`TAD-B — ADMIT_BUT_QUEUE_FOR_LATER_PHASE_WITHIN_CURRENT_PROGRAM`.**
The task is valid under the pre-API backend roadmap but belongs to Phase 2 or Phase 3 rather than the current sub-workstream. Example: synthetic truth suite fixture scaffolding is valid but queued until Phase 3 execution.

**`TAD-C — DEFER_POST_PHASE_3`.**
The task may be valuable, even strategically important, but should not be acted on before completing the Phase 1–3 boundary. Examples: full CIP.1, deep API provider work before purchase, Strategy Lab backend.

**`TAD-D — BLOCK_AS_SCOPE_OR_FREEZE_VIOLATION`.**
The task violates Plan 1.3, 1.4, or 1.5, attempts prohibited architecture or version sprawl, or creates unauthorized parallel work. Should not proceed in current form.

**`TAD-E — ESCALATE_FOR_EXCEPTION_OR_ARCHITECTURAL_DECISION`.**
The task may be necessary, but the framework cannot admit it automatically. It must go through formal AFE / FRP / BSCP / VSE procedure or owner decision.

### 6.3 Difference Between Defer (C) and Block (D)

- **Deferred (C)** means: *not now.* The task may return after Phase 3.
- **Blocked (D)** means: *not in this form.* The task must be reshaped before re-proposal.

---

## 7. The Backend Task Admissibility Gate (Eight-Question Test)

This is the operational heart of Plan 1.6. Every proposed backend task passes through this gate.

### 7.1 The Eight Questions

#### Q1 — Product Boundary Fit

> **Which Plan 1.2 backend v1 surface does this task directly serve?**

Allowed answers:

- `V1-S01 AI_CHAT`
- `V1-S02 ASSET_JUDGMENT`
- `V1-S03 MARKET_TERMINAL_INTELLIGENCE`
- `V1-S04 RADAR_RANKING_INTELLIGENCE`
- `V1-S05 ESSENTIAL_AUTH_SESSION_CONVERSATION_PERSISTENCE`
- `V1-S06 TRUTHFUL_ALERTS_CONDITIONAL`

If `NONE`: likely defer or block.

#### Q2 — Phase Alignment

> **Which current backend phase does this task advance?**

Allowed: Phase 1 stabilization, Phase 2 live-path trustworthiness, Phase 3 synthetic truth correctness.

If `NONE`: defer or block.

#### Q3 — Non-Scope Conflict

> **Does this task fall under any Plan 1.3 non-blocker/non-scope entry?**

Examples: Strategy Lab, Chart Canvas, plugins, agents, full CIP.1, deep API integration before purchase.

If yes: default `TAD-C DEFER_POST_PHASE_3`, or `TAD-D BLOCK` if attempting to act now without exception.

#### Q4 — Architecture Freeze Conflict

> **Does this task create a new architecture layer, dormant runtime, speculative framework, or world-building path?**

If yes: default `TAD-D BLOCK`, unless an approved `AFE` exception exists.

#### Q5 — Version-Sprawl Conflict

> **Does this task create a new versioned/parallel implementation of an existing capability?**

If yes: default `TAD-D BLOCK`, unless processed through FRP, BSCP, or VSE.

#### Q6 — Direct Production-Readiness Value

> **What exact production risk does this task reduce or what exact production capability does it unlock?**

This must be specific.

- **Bad answer:** "It will improve architecture."
- **Good answer:** "It prevents `/api/chat` from silently emitting an AI response when `produceJudgment()` fails."

#### Q7 — Timing Necessity

> **Must this task happen before Phase 3 completes, or can Coinet backend v1 progress correctly without it for now?**

If it can wait: defer.

#### Q8 — Opportunity Cost

> **What active Phase 1–3 work would this task delay?**

If the cost is substantial and the task is not central: defer.

### 7.2 Decision Mapping

| Admission outcome | Conditions                                               |
| ----------------- | -------------------------------------------------------- |
| `TAD-A`           | Strong yes on Q1, Q2, Q6, Q7; no freeze conflict         |
| `TAD-B`           | Strong yes on Q1/Q2, but not this exact execution moment |
| `TAD-C`           | Valuable but legitimately post-Phase-3                   |
| `TAD-D`           | Violates scope/freeze/sprawl rules (Q3/Q4/Q5)            |
| `TAD-E`           | Cannot be safely classified automatically                |

### 7.3 Gate Asymmetry

The eight questions are written so that *any* one disqualifying answer can produce defer/block. *All* enabling answers are required for `TAD-A`. The asymmetry is intentional: admission requires unanimous positive evidence; rejection requires only one disqualifying signal.

---

## 8. Allowed Task Classes

### 8.1 Allowed Class A — Build Truth and CI Stabilization

Examples:

- remove `|| true` from TypeScript build,
- add truthful typecheck command,
- add smoke test command,
- add CI gate.

Likely outcome: `TAD-A`.

### 8.2 Allowed Class B — Live Chat/Judgment/AI Reliability

Examples:

- judgment availability state,
- fail-closed or degraded chat behavior,
- typed prompt package (`CoinetJudgmentPromptPackage`),
- output safety gate,
- provider failure handling inside the live path,
- modularizing `api/chat/service.ts` enough to test it.

Likely outcome: `TAD-A` or `TAD-B`.

### 8.3 Allowed Class C — Synthetic Judgment Correctness

Examples:

- synthetic episode fixtures,
- semantic expected-output tables,
- assertions about confidence/contradiction/scenario correctness,
- bug fixes revealed by those synthetic tests.

Likely outcome: `TAD-A` or `TAD-B` depending on execution order.

### 8.4 Allowed Class D — Directly Necessary Scope-Control Artifacts

Examples:

- Phase 1 scope documents (this document and its peers),
- task-admission framework,
- minimal records needed to enforce the production program.

Likely outcome: `TAD-A`.

### 8.5 Allowed Class E — Small Enabling Fixes

Allowed only if they directly unblock an admitted task.

Examples:

- fix a test harness import path,
- repair a type that blocks truth suite execution,
- extract a helper to make live path testable.

Likely outcome: `TAD-A`.

---

## 9. Deferred Task Classes

### 9.1 Deferred Class A — Future Product Modules

Strategy Lab backend, Chart Canvas backend, plugin systems, agent builders.

Outcome: `TAD-C`.

### 9.2 Deferred Class B — Post-Phase-3 Backend Initiatives

Full CIP.1, real API integration architecture before purchase, full L14 operationalization, full calibration proposal activation.

Outcome: `TAD-C`.

### 9.3 Deferred Class C — Broad Cleanup That Does Not Unblock Current Phases

Total database schema reclassification, full duplicate-family deletion pass, complete reorganization of every monolithic file, general repo beautification.

Outcome: `TAD-C` unless a narrow piece directly supports an admitted task (see §13, Cleanup Law).

### 9.4 Deferred Class D — Nice-to-Have Hardening Outside Current Risks

Advanced dashboards, additional admin tooling, analytics breadth unrelated to core backend reliability.

Outcome: `TAD-C`.

---

## 10. Blocked Task Classes

Blocked tasks are stronger than deferred. Deferred means *not now*; blocked means *not in this form*.

### 10.1 Blocked Class A — Scope Violations

Examples:

- "Start Strategy Lab backend now."
- "Add plugin registry operations now."
- "Build full push alert orchestration now."

Outcome: `TAD-D`.

### 10.2 Blocked Class B — Architecture Freeze Violations

Examples:

- "Create L14.11."
- "Create new constitutional layer around backend readiness."
- "Build another dormant judgment governance stack."

Outcome: `TAD-D`.

### 10.3 Blocked Class C — Version-Sprawl Violations

Examples:

- `ai-service-v2.ts`
- `judgment-engine-final.ts`
- `news-intelligence-complete.ts`

Outcome: `TAD-D` unless processed through FRP/BSCP/VSE.

### 10.4 Blocked Class D — Premature Provider Work

Examples:

- build complex fallback orchestration for APIs not yet purchased,
- implement full provider health dashboards now,
- deeply optimize external API backoff behavior before the APIs exist.

Outcome: `TAD-D` or `TAD-C` depending on exact task.

---

## 11. Edge Case Classification Law

The hardest tasks are not obviously allowed or blocked. Plan 1.6 must handle the gray zone explicitly.

### 11.1 Edge Case Categories

```text
EDGE-A — BROAD CLEANUP WITH POSSIBLE CURRENT BENEFIT
EDGE-B — ARCHITECTURE BORROWING THAT MAY LOOK LIKE EXPANSION
EDGE-C — PROVIDER-PREPARATION TASK THAT MAY BE LIGHT OR PREMATURE
EDGE-D — FRONTEND-REQUESTED BACKEND WORK THAT MAY NOT BE V1-RELEVANT
EDGE-E — DUPLICATION FIX THAT MAY EXPAND INTO LARGE REWRITE
EDGE-F — ALERT-RELATED WORK UNDER CONDITIONAL ADMISSIBILITY
```

### 11.2 Edge Case Decision Law

For edge cases, the task must be decomposed into:

1. **The minimal now-version** — the smallest piece that directly unblocks current Phase 1–3 work.
2. **The later deferred version** — the broader scope that may be revisited post-Phase-3.

The minimal now-version is evaluated against the eight-question gate. The deferred version moves to `BACKLOG-C`.

### 11.3 Worked Examples

**Example 1 — Broad monolith cleanup.**

- Task: "Refactor all of `index.ts`."
- Decision: `TAD-C` unless a smaller subset directly blocks Phase 1/2 work.
- Minimal now-version: "Extract X function from `index.ts` because it is required by an admitted Phase 2 task." → `TAD-A`.

**Example 2 — Borrow L13 safety logic.**

- Task: "Reuse or adapt L13.9 safety patterns to gate live AI output."
- Decision: `TAD-A`. Direct Phase 2 production-readiness improvement.
- Caveat (per Plan 1.4 Legal Work Class D): bounded reuse, not full architecture migration.

**Example 3 — Real API schema mapping before purchase.**

- Task: "Implement full CoinGlass provider adapter now."
- Decision: `TAD-C`. Defer until APIs are purchased (Plan 1.3 NB-008).
- Minimal allowed alternative: define normalized internal signal expectations later under optional Phase 3.5.

**Example 4 — Alerts.**

- Task A: "Build full multi-channel alert platform." → `TAD-D` (violates Plan 1.3 NB-009).
- Task B: "Ensure existing truthful alert output does not break build if present." → Potentially `TAD-A` if it blocks current backend readiness.

**Example 5 — Cleanup of chat service.**

- Ambiguous task: "Clean up chat service."
- Minimal now-version: "Extract judgment-context construction and error handling from `api/chat/service.ts` so live path failure modes can be tested." → `TAD-A`.
- Deferred later-version: "Completely rewrite the chat service architecture." → `TAD-C`.

---

## 12. Backend Task Admission Record (BTAR)

The framework must not live only in prose. Every substantial backend task must be expressible through a formal admission record.

### 12.1 Record Name

```text
BTAR — Backend Task Admission Record
```

### 12.2 Required BTAR Fields (All 22)

Every task admission record must include all twenty-two fields:

1. `task_id`
2. `task_title`
3. `task_summary`
4. `request_origin`
5. `date_created`
6. `proposed_by`
7. `target_backend_surface` — V1-S01..V1-S06 or `NONE`
8. `target_phase` — Phase 1 / Phase 2 / Phase 3 / Post-Phase-3 / Unknown
9. `production_readiness_problem_solved`
10. `why_now`
11. `what_happens_if_deferred`
12. `non_scope_conflict_check`
13. `architecture_freeze_check`
14. `version_sprawl_check`
15. `provider_timing_check`
16. `edge_case_classification` (if relevant)
17. `required_procedure` — None / AFE / FRP / BSCP / VSE
18. `admission_outcome` — TAD-A..TAD-E
19. `decision_rationale`
20. `approved_by`
21. `next_action`
22. `review_or_reassessment_trigger`

Incomplete BTAR records are rejected without further review.

### 12.3 Example BTAR — Remove Silent Judgment Fallback

```text
task_id: BTAR-001
task_title: Remove silent judgment-engine fallback in /api/chat
task_summary: Prevent /api/chat from continuing to LLM generation when
              produceJudgment() throws or returns malformed output.
request_origin: Phase 2 hardening backlog
date_created: 2026-05-19
proposed_by: backend program owner
target_backend_surface: V1-S01 AI_CHAT, V1-S02 ASSET_JUDGMENT
target_phase: Phase 2
production_readiness_problem_solved:
  Prevents user-visible AI answers from appearing Coinet-grounded
  when structured judgment generation has failed.
why_now:
  Live path is load-bearing; silent fallback is the highest-severity
  trust failure mode discovered in the active runtime audit.
what_happens_if_deferred:
  Coinet may emit AI outputs that look authoritative while the
  judgment engine has actually failed. Users cannot distinguish
  this from a real Coinet judgment.
non_scope_conflict_check: none
architecture_freeze_check: none
version_sprawl_check: none
provider_timing_check: none
edge_case_classification: n/a
required_procedure: None
admission_outcome: TAD-B until Phase 2 starts; then TAD-A
decision_rationale:
  Strong Q1, Q2, Q6 alignment. No Q3/Q4/Q5 conflicts. Q7 positive
  (must happen before launch). Q8 minimal cost.
approved_by: backend program owner
next_action: Queue under BACKLOG-B; promote to BACKLOG-A on Phase 2 entry.
review_or_reassessment_trigger:
  Phase 2 entry; reassess if `produceJudgment()` contract changes.
```

### 12.4 BTAR Storage

Approved BTAR records are stored in:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-task-admission-records/
```

The directory is created lazily — only when the first BTAR is filed. Each record is a separate file named `BTAR-NNN-short-slug.md`.

---

## 13. Task Admission Hierarchy and Precedence Law

Sometimes a task may appear admissible under one plan but prohibited under another. Plan 1.6 defines precedence.

### 13.1 Governing Precedence Hierarchy

```text
1. Safety / production integrity
2. Plan 1.1 Phase 1 mission
3. Plan 1.2 positive scope
4. Plan 1.3 negative scope
5. Plan 1.4 architecture freeze
6. Plan 1.5 version-sprawl prohibition
7. Plan 1.6 task-specific admission judgment
```

Higher-numbered rules cannot override lower-numbered ones.

### 13.2 Precedence Rule

If a task passes Plan 1.2 (positive scope fit) but violates Plan 1.4 or Plan 1.5, it is **not admitted** unless the relevant exception procedure (AFE / FRP / BSCP / VSE) approves it.

**Example:**

```text
Task: Add typed prompt formatting (helps V1-S01 AI Chat)
But: creates ai-service-v2.ts (violates Plan 1.5)
Result: Block under TAD-D unless FRP/BSCP/VSE.
```

The fact that the task helps a v1 surface does not override the version-sprawl prohibition. Reshape via FRP, then reapply for admission.

### 13.3 Safety Override

Safety / production integrity sits above all scope rules. A genuine production-integrity defect may proceed as a UDF (see §15) even if it nominally touches a deferred area, *provided* the fix itself does not create new sprawl, expansion, or scope re-entry.

---

## 14. Task Review Workflow

### 14.1 Standard Review Workflow

```text
1. Task proposed
2. Fill BTAR
3. Run eight-question admissibility test (§7)
4. Check against Plans 1.2–1.5
5. Assign TAD outcome (§6.1)
6. If TAD-A → enter active work (BACKLOG-A)
7. If TAD-B → queue in future current-phase backlog (BACKLOG-B)
8. If TAD-C → move to deferred register (BACKLOG-C)
9. If TAD-D → reject in current form (BACKLOG-D)
10. If TAD-E → escalate to correct exception/decision path (BACKLOG-E)
```

### 14.2 Review Rule for "Small Tasks"

No substantial backend task is exempt just because it appears small. A one-file "small" task can still:

- create new sprawl,
- reopen non-scope,
- consume execution focus.

For **truly trivial changes** — typo fixes, import ordering, formatting-only — a BTAR may be omitted.

For **any functional backend change**, a BTAR is required.

### 14.3 Review Frequency for Deferred Items

`BACKLOG-C` items are not re-evaluated routinely. They are revisited only at the Phase 3 STOP AND REASSESS gate or upon explicit escalation through `TAD-E`.

`BACKLOG-D` items are not automatically re-evaluated. They must be reshaped and re-proposed.

---

## 15. Backlog Classification Law

Plan 1.6 governs not just admission, but backlog hygiene.

### 15.1 Required Backlog Buckets

```text
BACKLOG-A — ACTIVE_NOW
BACKLOG-B — NEXT_WITHIN_PHASE_1_TO_3
BACKLOG-C — DEFERRED_POST_PHASE_3
BACKLOG-D — BLOCKED_OR_REJECTED
BACKLOG-E — ESCALATED_DECISION_REQUIRED
```

### 15.2 Relationship to TAD Outcomes

| TAD   | Backlog bucket |
| ----- | -------------- |
| TAD-A | BACKLOG-A      |
| TAD-B | BACKLOG-B      |
| TAD-C | BACKLOG-C      |
| TAD-D | BACKLOG-D      |
| TAD-E | BACKLOG-E      |

### 15.3 Why This Matters

A task not admitted today should not float in a vague mental backlog. It must land somewhere visible. This prevents deferred work from repeatedly resurfacing as if undecided.

### 15.4 Backlog Discipline

- An item moves *up* (e.g., C → B → A) only through explicit re-evaluation.
- An item moves *down* (e.g., A → B or A → C) if circumstances change (priorities shift, prerequisite blocks emerge).
- An item moves *out* (deletion) only after explicit closure — either completed or formally retired.

---

## 16. Special Law for Cleanup, Refactor, and Tech Debt Tasks

Tech debt work is both essential and scope-destroying. It needs its own law.

### 16.1 Cleanup Admissibility Law

> **Cleanup work is admissible only when it directly enables build truth, live-path trustworthiness, synthetic truth validation, or the safe execution of a task already admitted under Plans 1.1–1.6.**

### 16.2 Allowed Cleanup Examples

- Split just enough of `api/chat/service.ts` to test judgment failure behavior.
- Remove a dead import that breaks typecheck.
- Normalize an error shape that blocks output safety gate implementation.

These are minimal-scope cleanup actions that unblock admitted tasks. They are `TAD-A`.

### 16.3 Deferred Cleanup Examples

- Refactor every Prisma model.
- Reorganize the full `services/` directory.
- Fully rewrite `index.ts` just for cleanliness.
- Delete all duplicate service families before the truth suite.

These may be important later, but not automatically now. They are `TAD-C`. See also Plan 1.3 NB-010.

### 16.4 Cleanup Decomposition Rule

When a cleanup task appears partially valid and partially deferred:

1. Identify the minimal piece directly required by an admitted task.
2. Admit that piece (TAD-A).
3. Defer the broader cleanup (TAD-C).
4. Record both in BTAR.

---

## 17. Special Law for Urgent Bugs and Blocking Defects

The framework must not prevent necessary rescue work.

### 17.1 Urgent Defect Class

```text
UDF — URGENT DEFECT FIX
```

### 17.2 When UDF Applies

A defect qualifies as UDF when it:

1. breaks the build truth,
2. prevents core backend boot,
3. blocks an admitted Phase 1–3 task,
4. causes user-visible falsehood in the active judgment/chat path,
5. or invalidates synthetic truth evaluation.

### 17.3 UDF Admission

A UDF may go directly to `TAD-A` if documented briefly via abbreviated BTAR (fields 1–9, 17, 18, 21 minimum).

### 17.4 UDF Constraints

A UDF must not:

- create new architecture sprawl (Plan 1.4),
- create new version-sprawl (Plan 1.5),
- reopen deferred scope (Plan 1.3).

If the only correct fix would violate one of those, the UDF is escalated to `TAD-E` for AFE/FRP/BSCP/VSE processing.

---

## 18. Required Governance Artifacts

### 18.1 Mandatory Primary Artifact

This document, located at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-task-admissibility-framework.md
```

### 18.2 Mandatory Supporting Artifact

The BTAR template, located at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/templates/backend-task-admission-record-template.md
```

Given the importance of task-level discipline, the template is **mandatory**, not optional. Every BTAR created must originate from this template.

### 18.3 Lazy-Created Artifacts

- `backend-task-admission-records/` directory — created on first BTAR submission.
- Approved AFE / FRP / BSCP / VSE decision logs continue to be appended to `backend-v1-version-sprawl-decisions.md` (Plan 1.5 §8.5) or equivalent Plan 1.4 decision file.

---

## 19. Verification and Certification Criteria

Plan 1.6 is complete only when all of the following are simultaneously true.

### 19.1 Admission Outcomes Are Explicit

The document defines admit-now, admit-later-in-current-program, defer-post-Phase-3, block, and escalate. ✅ (§6.1)

### 19.2 The Gate Is Operational

The document includes the eight-question test and a decision map. ✅ (§7)

### 19.3 Previous Plans Are Enforced

A task is rejected/deferred if it violates positive scope, negative scope, architecture freeze, or version-sprawl freeze. ✅ (§7.1 Q3/Q4/Q5; §13.2)

### 19.4 Edge Cases Are Classifiable

The document handles cleanup, architecture borrowing, provider preparation, alert work, refactor tasks, and frontend-triggered backend requests. ✅ (§11)

### 19.5 BTAR Template Exists

The reusable task-admission template exists with all 22 fields. ✅ (§12; template file in §18.2)

### 19.6 Practical-Use Answers Must Be Possible

A reviewer can answer from this document alone:

1. Can we fix the lying build script?
   → **Yes — `TAD-A`.** (§8.1)
2. Can we build deep API-provider logic before buying APIs?
   → **No — `TAD-C` or `TAD-D`** depending on form. (§9.2, §10.4, Plan 1.3 NB-008)
3. Can we split chat service for testability?
   → **Yes, if bounded — `TAD-A`/`TAD-B`.** (§8.2, §16.2)
4. Can we create `judgment-engine-v2.ts`?
   → **No — `TAD-D`** unless FRP/BSCP/VSE governs it. (§10.3, Plan 1.5)
5. Can we start Strategy Lab backend?
   → **No — `TAD-C`.** (§9.1, Plan 1.3 NB-001)
6. Can we adapt L13.9 safety ideas into live output gating?
   → **Yes — `TAD-A`** if directly serving Phase 2. (§11.3 Example 2, Plan 1.4 Legal Work Class D)
7. Can we begin full CIP.1?
   → **No — `TAD-C`** under Plan 1.3 NB-006. (§9.2)

If any of those answers are unclear from this document alone, Plan 1.6 is not complete.

---

## 20. Done Definition and Transition to Plan 1.7

### 20.1 Done Definition

Plan 1.6 is complete only when:

> **Coinet backend v1 has a repo-resident Backend Task Admissibility Framework that operationalizes Plans 1.1–1.5 at task level, defines exact task decision outcomes, provides a formal eight-question admission gate, distinguishes allowed/deferred/blocked/escalated tasks, classifies edge cases, requires task-level admission records for meaningful backend work, governs backlog placement, limits cleanup/refactor sprawl, permits urgent defect fixes without reopening scope, and makes it practically difficult for non-v1 work to enter active execution by accident.**

This document and the accompanying BTAR template satisfy that definition once accepted via §22.

### 20.2 Transition to Plan 1.7

Once Plan 1.6 is accepted, the next required step is:

> **Plan 1.7 — Required Scope Artifacts and Source-of-Truth Documents**

Plan 1.7 answers:

> What exact documents, registries, references, and execution records must now exist in the repo so the backend v1 production-convergence program is not just a philosophy, but an inspectable source of truth?

### 20.3 The Closed Phase 1 Scope-Control Stack

```text
Plan 1.1 = Why                                    [ACTIVE]
Plan 1.2 = What is in                             [ACTIVE]
Plan 1.3 = What is out                            [ACTIVE]
Plan 1.4 = No new architecture                    [ACTIVE]
Plan 1.5 = No new parallel implementations        [ACTIVE]
Plan 1.6 = Task-by-task admission law             [ACTIVE]   ← this document
Plan 1.7 = Required repo-resident scope artifacts [NEXT]
```

---

## 21. Glossary (Document-Local Definitions)

- **TAD** — Task Admission Decision. The five outcomes A..E defined in §6.1.
- **BTAR** — Backend Task Admission Record. A formal task-level admission filing (§12).
- **BACKLOG-A..E** — The five backlog buckets (§15.1), each corresponding to one TAD outcome.
- **UDF** — Urgent Defect Fix. The expedited admission path for production-integrity defects (§17).
- **EDGE-A..F** — The six edge-case categories (§11.1).
- **Minimal now-version / Deferred later-version** — The §11.2 decomposition pattern for edge cases.
- **Admission gate** — The eight-question test in §7.1.
- **Precedence hierarchy** — The seven-rule precedence order in §13.1.

These definitions are document-local. Where another document conflicts, this document prevails for Phase 1 task-admission purposes.

---

## 22. Acceptance Block

This framework is accepted when the following block is filled in. Until accepted, the document is treated as DRAFT regardless of the `Status` field in the front matter.

```text
Backend v1 Task Admissibility Framework — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the five Task Admission Decision outcomes (TAD-A..E) in §6.1.
  [ ] I accept the eight-question admissibility gate in §7.1.
  [ ] I accept the five allowed task classes in §8.
  [ ] I accept the four deferred task classes in §9.
  [ ] I accept the four blocked task classes in §10.
  [ ] I accept the six edge case categories (EDGE-A..F) in §11.1
      and the decomposition law in §11.2.
  [ ] I accept the BTAR record format and its 22 required fields (§12).
  [ ] I accept the precedence hierarchy in §13.1.
  [ ] I accept the standard review workflow in §14.1.
  [ ] I accept the five backlog buckets (BACKLOG-A..E) in §15.1.
  [ ] I accept the cleanup admissibility law in §16.1.
  [ ] I accept the urgent defect fix (UDF) law in §17.
  [ ] I will route every functional backend task through a BTAR before
      adding it to active execution.
  [ ] I understand that trivial non-functional changes (typos, formatting)
      do not require a BTAR.
  [ ] I will not approve TAD-E escalations that fail their downstream
      exception procedure (AFE / FRP / BSCP / VSE).
```

Once accepted, the `Status` field is authoritative. Until accepted, treat this document as DRAFT in all operational decisions.

---

*End of Backend v1 Task Admissibility Framework — Plan 1.6.*
