# Phase 1 Charter — Backend Production Convergence

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.1
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Supersedes: Open-ended backend expansion as default operating mode

---

## 0. Document Identity and Authority

This document is the **constitutional charter** of Phase 1 of the Coinet Backend v1 Completion Program. It is the highest authority document inside Phase 1. All later Phase 1 subplans — beginning with Plan 1.2 and continuing through the remainder of Phase 1 — inherit from this charter and may not contradict it.

This charter:

- does not fix the build,
- does not refactor any service,
- does not implement any backend feature,
- does not specify code,
- does not approve any provider integration.

It performs one job and one job only:

> It formally declares that Coinet's backend has exited open-ended architectural expansion and has entered a finite production-convergence phase whose only goal is to finish the backend that will ship Coinet v1.

Where this document and any later subplan conflict, this document prevails. Any later subplan that attempts to expand backend scope without going through the change-control note in Section 13 of this charter is automatically out of bounds for Phase 1.

---

## 1. Section 1.1.1 — Constitutional Purpose

### 1.1.1.1 Purpose Statement

The constitutional purpose of Phase 1 is the following sentence, which is the **root authority of the entire backend completion program**:

> **Phase 1 exists to stop backend expansion, freeze the production target for Coinet v1, and force all engineering attention onto the finite work required to make the active backend truthful, testable, stable, and launchable.**

This sentence governs the meaning of every later phrase in this charter and the meaning of every later Phase 1 subplan. If a later document loses sight of this sentence, the later document is wrong, not this one.

### 1.1.1.2 Why This Purpose Is Necessary Now

This purpose is not abstract. It is grounded directly in the backend code-inspection reality of the Coinet repository. The following facts are not aspirational; they are observable in the current state of the codebase and the current state of the certification program:

- Coinet now has a **large certified architecture surface** spanning constitutional layers L5 through L14, comprising thousands of TypeScript files, dozens of master and sublayer certification scripts, full invariant programs (INV-13.x, INV-14.x), and an ARCHITECTURE_COMPLETE ratification artifact (`l14.fp.architecture.2009825d`).
- This certified architecture is mostly **dormant from the user's point of view**. Only L5 and a wrapper of L10 are touched by the active product runtime. L6, L7, L9, L11, L12, the full L13 runtime, and the full L14 runtime are certified-in-isolation but not yet wired into the user-facing path.
- The **actual live user-facing runtime** is a separate active pipeline composed of `/api/chat` → `api/chat/service.ts` → `buildSignalSnapshot()` → `produceJudgment()` → `formatJudgmentForAI()` → `aiService.analyze()` (`services/ai-service.ts`). This pipeline is the one users depend on. It is synthetic-tested via AJP.1 (`ajp1.fp.f61b2c30`, 80/80), but it is **not yet production-hardened** to the level required for a launchable v1 backend.
- The repository contains **significant duplication and parallel families**: multiple scoring paths (`services/omniscore_v3/` running alongside certified L11), multiple derivatives/news/social implementations, and oversized monolithic service files that need consolidation before launch.
- The current backend **build and test foundation is not yet production trustworthy**. CI cannot yet be relied on to expose breakage before it reaches users.
- The immediate engineering objective is **not to invent more architecture**. It is to finish the backend that will power Coinet v1, in a way that is honest, testable, and shippable.

Plan 1.1 must explicitly acknowledge each of these realities. They are the empirical basis for the freeze that this charter declares.

### 1.1.1.3 What Plan 1.1 Changes

Plan 1.1 changes the operating mode of the backend program.

**Before Plan 1.1:**

```text
Open architectural expansion
New layer work continuously admissible
New experiments admissible by default
New versioned service variants accumulating
Backend scope still porous
Side quests competing with launch work
```

**After Plan 1.1:**

```text
Finite backend v1 production program
Expansion frozen by default
Scope bounded and written
Side quests formally deferred
Every backend task must justify launch relevance
Production-convergence is the single allowed direction
```

This is a categorical shift, not a minor adjustment. From the effective date forward, the backend is no longer in growth mode; it is in convergence mode.

---

## 2. Section 1.1.2 — Ground-Truth Problem Statement

### 1.1.2.1 Canonical Problem Statement

The problem statement is the following paragraph, which must be quoted verbatim wherever Phase 1 requires authoritative framing:

> **Coinet's backend has reached a point where additional architectural expansion now threatens production readiness more than it increases product value. The live judgment system exists and has been synthetic-tested, but it is not yet production-hardened to the level required for a launchable v1 backend. The immediate engineering priority is therefore not more breadth. It is convergence: fix the build truth, harden the live runtime, prove fake-data correctness, and prepare a finite backend surface that can later receive real APIs and connect cleanly to the frontend.**

This is the official Phase 1 framing of the situation. All later Phase 1 documents must align with it.

### 1.1.2.2 Specific Causes of the Freeze

The charter formally names the five specific causes that justify the scope freeze. These causes are not opinions; they are derived from the actual state of the codebase as of 2026-05-19.

**Cause A — Architecture has outrun runtime integration.**
There is more constitutional architecture (L5–L14, fully certified) than there is active product integration of that architecture. The certified architecture is real and valuable, but it is not yet load-bearing in the user-facing path.

**Cause B — Production runtime still needs trust hardening.**
The active chat/judgment/AI path is the load-bearing user path and still requires production-level enforcement: silent failure must be eliminated, AI outputs must be gated, contradictions must be preserved through to the user, and the critical path must be testable end-to-end.

**Cause C — Build and test honesty must be fixed.**
A backend cannot be called production-ready while type-check and build truth are inconsistent and while smoke coverage of the live path is insufficient. CI must be able to expose breakage before it reaches users.

**Cause D — Synthetic fake-data correctness must be proven before APIs arrive.**
The system must reason correctly in fully controlled synthetic cases before expensive real-world data is introduced. AJP.1 is a partial demonstration of this. A full Backend Judgment Truth Suite remains to be built.

**Cause E — Duplication creates cognitive and maintenance debt.**
Parallel service versions (notably `services/omniscore_v3/` alongside the certified L11 program) increase the risk of accidental divergence and engineering waste. Phase 1 does not yet resolve all duplication, but it stops new duplication.

### 1.1.2.3 What This Problem Statement Must Not Be Read As Saying

To prevent misinterpretation by any later subplan, the charter formally rejects each of the following readings:

- It does **not** imply that the 14-layer architecture was worthless. The architecture is a real strategic asset and remains the long-term direction.
- It does **not** imply that the active product path should be abandoned. The active path is the only path users currently rely on and must be hardened, not deleted.
- It does **not** imply that the backend is "almost done" without evidence. The backend has a long Phase 2 and Phase 3 ahead of it.
- It does **not** imply that the next step is API integration. APIs are deferred until after synthetic correctness is proven.
- It does **not** imply that the goal is perfectionism without shipping. The goal is **finite** production execution, not infinite refinement.

The problem statement is blunt about the freeze, but it is balanced about what the freeze means.

---

## 3. Section 1.1.3 — Phase 1 Mission Statement

### 1.1.3.1 Canonical Mission

The Phase 1 mission is the following sentence:

> **Phase 1's mission is to halt backend scope expansion and establish a non-negotiable production boundary for Coinet v1, so that every subsequent backend task directly advances one of three goals: technical honesty, live-path trustworthiness, or synthetic judgment correctness.**

This mission is the operative test for every Phase 1 task: does the task advance one of the three goals named here?

### 1.1.3.2 The Three Allowed Phase 1 Goals

Every Phase 1 task — without exception — must map cleanly to one of the following three goals. If a proposed task cannot be mapped, it is not Phase 1 work and must be deferred.

**Goal 1 — Technical Honesty.**
The build must fail truthfully. CI must expose breakage. Smoke tests must exist for the live path. Type-check truth must hold. Lint and format must not silently lie about the state of the codebase. Production behavior must match what tests claim.

Examples of work that advances Goal 1:

- making `pnpm typecheck` and `pnpm build` accurate signals,
- restoring or installing CI that runs on every PR,
- adding smoke tests that exercise `/api/chat` and `produceJudgment()` end-to-end,
- removing dead code paths that confuse the type-check.

**Goal 2 — Live-Path Trustworthiness.**
The chat/judgment/AI path must not silently fail. User-facing LLM output must be gated against the certified safety and grounding contracts where the gate is available. The critical path must be observable and testable in production conditions.

Examples of work that advances Goal 2:

- wrapping `produceJudgment()` and `aiService.analyze()` (`services/ai-service.ts`) calls in trustworthy error envelopes,
- ensuring AI output passes through at least a minimum safety/grounding gate before user delivery,
- adding structured telemetry to the live path so production failure is visible,
- locking the contract between `/api/chat` and the judgment service.

**Goal 3 — Synthetic Judgment Correctness.**
Fake data must produce logically correct Coinet interpretations. Contradictions must matter. Uncertainty must not be erased. The system must demonstrate that, given controlled inputs, it produces the right kind of judgment with the right kind of caveats.

Examples of work that advances Goal 3:

- extending the AJP.1 corpus into a full Backend Judgment Truth Suite,
- adding synthetic regression cases for each judgment family,
- proving that contradictions in synthetic input are surfaced in judgment output,
- proving that ambiguous inputs (e.g., the MOCKUSD episode family) produce honestly ambiguous output rather than false confidence.

### 1.1.3.3 Mission Boundary

The mission boundary is explicit:

> **Phase 1 is not meant to finish every future backend ambition. It is meant to establish the finite discipline that allows Coinet v1 backend completion to happen at all.**

Phase 1 does not promise a feature-complete backend. It promises a backend program that has become finite, focused, and capable of being finished.

---

## 4. Section 1.1.4 — First Principle of Phase 1

### 1.1.4.1 Canonical First Principle

The governing doctrine of Phase 1 is the following sentence:

> **No backend work is valuable right now unless it directly increases the probability that Coinet v1 becomes production-ready.**

This is the filter through which every proposed backend task must pass. It is intentionally strict.

### 1.1.4.2 Operational Translation of the First Principle

For every proposed backend task, the executing agent or engineer must be able to answer affirmatively to at least one of the following five questions. If the answer to all five is no, the task is deferred.

1. Does this help the backend ship?
2. Does this reduce a known production risk?
3. Does this improve the correctness of the active backend?
4. Does this unblock Phase 2 or Phase 3?
5. Can this wait until APIs are purchased or until after backend v1 is stable? (If yes to this question, the task is deferred by default.)

These questions are not bureaucratic. They are the operational form of the first principle.

### 1.1.4.3 What the First Principle Forbids

The first principle explicitly forbids, by default, the following categories of work during Phase 1:

- adding new architecture work because it is intellectually attractive,
- adding backend feature breadth because "we may need it later,"
- creating new service variants instead of selecting canonical ones from the existing duplicates,
- beginning API-specific deep integration before the backend synthetic truth phase (Phase 3) is complete,
- treating documentation activity as a substitute for backend hardening,
- starting any new L*.X constitutional layer program,
- starting any new dormant certification suite that does not connect to the live runtime,
- broad refactors that are not anchored to one of the three Phase 1 goals.

### 1.1.4.4 What the First Principle Allows

The first principle explicitly allows the following categories of work during Phase 1:

- hardening the current live paths,
- reducing ambiguity in the live runtime contract,
- removing silent failure modes,
- clarifying and narrowing backend scope,
- deleting or freezing unnecessary side quests,
- writing the minimum governance documents necessary to keep Phase 1 finite,
- writing tests that exercise either the live path or the synthetic judgment correctness suite,
- removing duplication where the duplicate is unambiguously dead.

If a piece of work fits neither the "forbidden" nor "allowed" list above, it is presumed forbidden until Plan 1.2 (Backend v1 Product Boundary) explicitly admits it.

---

## 5. Section 1.1.5 — What Phase 1 Is

This section positively defines Phase 1's identity. All five definitions are simultaneously true. Phase 1 is all of these at once.

### 1.1.5.1 Phase 1 Is a Production-Convergence Phase

Its job is to turn a sprawling backend program into a launch-oriented backend program. "Convergence" means everything currently in motion is either pulled toward the v1 production target or formally deferred. There is no middle category of "interesting but unaffiliated."

### 1.1.5.2 Phase 1 Is a Freeze Phase

It stops:

- architecture expansion,
- new broad backend areas,
- uncontrolled experimentation,
- scope ambiguity,
- new parallel service families,
- new dormant certification programs.

The freeze is not symbolic. It is the default state of the backend program from the effective date forward.

### 1.1.5.3 Phase 1 Is a Prioritization Phase

It establishes that the only backend priorities admissible before API purchase are, in order:

1. backend stabilization (Phase 1 itself, including this charter and the later 1.x subplans),
2. live-path trustworthiness (Phase 2),
3. synthetic judgment truth correctness (Phase 3).

Nothing else competes for backend engineering attention until those three are complete.

### 1.1.5.4 Phase 1 Is a Decision-Discipline Phase

It prevents the team from saying "yes" to technically interesting work that does not help v1 readiness. This is the most important function of Phase 1 in practice, because most backend drift historically came not from one bad decision but from many small "yes"es that individually seemed reasonable.

### 1.1.5.5 Phase 1 Is Not Primarily a Coding Feature Phase

Some implementation work happens later in Phase 1 subplans (for instance, build/CI repair, smoke tests, and the boundary registry). But **Plan 1.1 itself is a governance charter, not a coding plan.** Plan 1.1 establishes the rules that the coding work in later subplans must obey.

---

## 6. Section 1.1.6 — What Phase 1 Is Not

This is the anti-scope section. It is at least as important as Section 1.1.5. Each of the following is formally excluded from Phase 1.

### 1.1.6.1 Phase 1 Is Not Another Architecture Expansion Cycle

Explicitly out of scope:

- L15 or any subsequent layer,
- L14.11 or any new L14 sublayer,
- new certified dormant programs,
- new theoretical runtime branches,
- new constitutional invariant families,
- new ratification artifacts beyond those already emitted.

Future architecture work, if justified, must be planned separately and must not be smuggled into Phase 1.

### 1.1.6.2 Phase 1 Is Not Real API Integration

The user has not yet purchased the production data APIs. Therefore Phase 1 must not drift into:

- deep provider integration,
- provider-specific transport details,
- real endpoint smoke testing against paid providers,
- production provider failover work,
- provider-specific authentication, rate-limit, or quota engineering.

**Single allowed exception:** if Phase 3 (Backend Judgment Truth Suite) finishes early, an optional lightweight normalized internal signal schema may be drafted in preparation for later API ingestion. This is the only pre-API integration concession Phase 1 permits, and it is permitted only as preparation, not as integration.

### 1.1.6.3 Phase 1 Is Not Frontend Work

Frontend development (`apps/client-web`) may continue separately under its own program, but Phase 1 does not govern it. Frontend work that depends on backend behavior must wait on the relevant Phase 1, 2, or 3 deliverable; it is not accelerated by Phase 1.

### 1.1.6.4 Phase 1 Is Not Full Backend Cleanup In Disguise

Phase 1 must not expand into:

- a total database redesign,
- a full monolith rewrite,
- the deletion of every duplicate system immediately without evidence,
- a complete migration of the active product onto the certified architecture,
- a top-to-bottom refactor of `services/`.

Those activities may happen later, in justified scoped programs, but **Plan 1.1 itself is about freeze and production-target declaration, not about cleanup execution.**

### 1.1.6.5 Phase 1 Is Not a Public Launch Declaration

Completing Phase 1 does not mean the backend is production-ready. It means the backend program has finally become finite and correctly focused. Public launch readiness is a downstream consequence of Phases 1, 2, and 3 succeeding, not of Phase 1 alone.

---

## 7. Section 1.1.7 — Non-Negotiable Outcome Contract

This section defines what must be undeniably true once Plan 1.1 is complete. These are not aspirations; they are exit criteria.

### 7.1 Required Final State

After Plan 1.1 is complete, all five of the following statements must be true:

1. **There is a written Phase 1 charter.** A canonical document exists in the repository at the path specified in Section 9.
2. **The backend production program is formally frozen against expansion.** No new broad backend direction may begin casually. The freeze is the default state.
3. **The next three backend priorities are explicitly locked:**
   - Phase 1 — backend stabilization,
   - Phase 2 — live-path trustworthiness,
   - Phase 3 — synthetic judgment truth correctness.
4. **Everyone working on the backend knows what Phase 1 is trying to accomplish.** There is no ambiguity that this is a production-convergence phase, not an architecture phase.
5. **The team has formally agreed that more architecture is not the current objective.** Future architecture work must be justified separately and approved through the change-control note in Section 13.

### 7.2 Non-Negotiable Formulation

The following sentence is the operative rule of the outcome contract and must be reproduced in the charter:

> **If a backend task cannot be mapped to immediate v1 production readiness, Phase 2 trust hardening, Phase 3 synthetic truth correctness, or a later explicitly approved scoped subplan, it is not active backend work.**

This sentence is enforceable. Any task that cannot answer it falls outside Phase 1 by definition.

### 7.3 Outcome Categories

Plan 1.1 declares three outcome categories for the entire backend program. Every backend topic, in or out of Phase 1, falls into exactly one of these three categories as of the effective date.

**`LOCKED` — decided now, in effect immediately:**

- backend expansion freeze,
- no new L*.X constitutional architecture work,
- no new parallel service families,
- Phase 1 → Phase 2 → Phase 3 as the binding backend execution boundary before API work,
- this charter document as the authoritative governing artifact for Phase 1.

**`DEFERRED` — acknowledged as future work but explicitly delayed until after Phase 3 completes:**

- real API provider integration,
- CIP.1 (true L5→L14 unified certification),
- operationalization of dormant L14 surfaces (delivery routing, calibration spine, experiment system),
- Strategy Lab backend work,
- Chart Canvas backend work,
- any new constitutional layer or sublayer.

**`NOT YET DECIDED` — may be resolved later in Phase 1 subplans or in post-Phase-3 planning, but is not decided by this charter:**

- the exact future fate of each duplicate scoring module (`omniscore_v3/` vs L11),
- the final API provider mix and contract shapes,
- the exact full architecture reconciliation order (governed by the Reconciliation Matrix, not by this charter),
- the eventual home of `services/ai-service.ts` (the active AI analysis path invoked by `aiService.analyze()` after `formatJudgmentForAI()`) vs the certified L13 runtime — this is a reconciliation question, not a Phase 1 question.

This three-bucket discipline prevents Plan 1.1 from over-deciding future work and prevents it from leaving future work falsely open-ended.

---

## 8. Section 1.1.8 — Relationship to the Full Backend Completion Program

Plan 1.1 must situate itself precisely inside the backend roadmap. It is the first sub-plan of the first phase of that roadmap, and it must not pretend to be more.

### 8.1 The Current Backend Execution Boundary

The active pre-API backend program — the only program that is admissible until APIs are purchased — is the following sequence:

```text
Phase 1 — Immediate backend stabilization
Phase 2 — Make the live judgment/chat/AI path trustworthy
Phase 3 — Build and complete the Backend Judgment Truth Suite
STOP AND REASSESS
```

The "STOP AND REASSESS" line is binding. The backend program does not silently continue past Phase 3 into API integration. After Phase 3 completes, the team reassesses, and a new authorized scoped program begins (which may include API integration, CIP.1, or other work).

### 8.2 Where Plan 1.1 Sits

Plan 1.1 is the first sub-plan of Phase 1. It defines:

- why Phase 1 exists,
- what Phase 1 is allowed to do,
- what Phase 1 is forbidden from becoming,
- what the non-negotiable outcome of Phase 1 is.

It does not itself perform Phase 1's later work. That work is performed by the later Phase 1 subplans.

### 8.3 What Plan 1.1 Enables

This charter enables, and is required by, the following anticipated Phase 1 subplans:

- **Plan 1.2** — Backend v1 Product Boundary (defines the finite scope of v1),
- **Plan 1.3** — Explicit Non-Blocker Registry (formally lists deferred work),
- **Plan 1.4** — Architecture Expansion Freeze Law (the enforcement teeth of the freeze),
- **Plan 1.5** — Version-Sprawl Prohibition (rules against new parallel service families),
- and further Phase 1 subplans as required.

Without Plan 1.1, those later plans become disconnected procedural rules. With Plan 1.1, they become parts of one coherent backend-convergence doctrine that all trace back to a single mission, a single first principle, and a single non-negotiable outcome.

---

## 9. Section 1.1.9 — Required Governance Artifacts of Plan 1.1

### 9.1 Mandatory Primary Artifact

The mandatory primary artifact of Plan 1.1 is **this document**, located at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/phase-1-charter.md
```

This file is the central document of Phase 1. All later Phase 1 subplans must cite it.

### 9.2 Required Contents of the Charter

The charter must contain, at a minimum, the following structural sections (this document satisfies all of them):

1. Title and version (Section 0 and front matter),
2. Status, effective date, and authority (front matter),
3. Constitutional purpose (Section 1),
4. Ground-truth problem statement (Section 2),
5. Phase 1 mission (Section 3),
6. First principle (Section 4),
7. What Phase 1 is (Section 5),
8. What Phase 1 is not (Section 6),
9. Non-negotiable outcome contract (Section 7),
10. Relationship to Phases 2 and 3 (Section 8),
11. Explicit freeze declaration (Section 9.4),
12. Change-control note (Section 13),
13. Acceptance block / sign-off (Section 14).

### 9.3 Document Front Matter Standard

The required front matter form is:

```md
# Phase 1 Charter — Backend Production Convergence

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.1
Effective: YYYY-MM-DD
Authority: Backend v1 Completion Program
Supersedes: Open-ended backend expansion as default operating mode
```

This document satisfies the front matter standard.

### 9.4 Required Freeze Declaration

The following declaration is the binding freeze statement of Phase 1. It is reproduced here in its operative form:

> **As of this charter, Coinet backend work enters a production-convergence mode. No new broad backend architecture program, no new dormant layer expansion, and no new parallel service family may be started unless it is explicitly justified against the backend v1 completion program and approved through the scope-change procedure defined in Section 13 of this charter.**

The freeze is effective on the date in the front matter and remains in effect until Phase 3 completes and the team formally reassesses.

### 9.5 Optional Secondary Artifact

If a concise reference is desired for inclusion in onboarding materials or for quick reference, an optional secondary artifact may be created at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/phase-1-charter-summary.md
```

This secondary artifact is optional. It must not contradict the primary charter. If the two ever diverge, the primary charter prevails.

---

## 10. Section 1.1.10 — Done Definition and Certification Criteria

Plan 1.1 is complete only when all of the following are simultaneously true.

### 10.1 Document Completion Criteria

The file:

```text
apps/coinet-platform/docs/backend-v1/phase-1/phase-1-charter.md
```

exists and contains all required structural sections enumerated in Section 9.2.

### 10.2 Content Quality Criteria

The charter must:

- be explicit, not vague,
- cite the real production problem grounded in the current codebase reality,
- make the Phase 1 mission unmistakable,
- define the first principle,
- state the non-negotiable outcome,
- name what Phase 1 is and is not,
- avoid overreaching into Phase 2 or Phase 3 content,
- be usable as an execution authority document by both human engineers and AI executing agents.

### 10.3 Governance Criteria

The document must formally establish:

- backend expansion is frozen by default,
- Phase 1 → Phase 2 → Phase 3 is the binding backend execution boundary,
- API integration is deferred until after Phase 3,
- broad new side quests are not admissible by default,
- changes to this charter follow the procedure in Section 13.

### 10.4 Review Criteria

At least one reviewer or decision-maker must be able to answer all of the following questions using **only** this document:

1. Why are we freezing backend expansion?
2. What are we building toward?
3. What must not happen now?
4. What are the next backend phases?
5. What must be true before moving on?

If the document cannot answer those five questions on its own, it is not complete.

### 10.5 Certification Summary

When Plan 1.1 is complete, the executing system records the following completion report:

```text
PLAN 1.1 — PHASE 1 CHARTER
Status: COMPLETE
Primary Artifact: apps/coinet-platform/docs/backend-v1/phase-1/phase-1-charter.md
Mission declared: yes
First principle declared: yes
Non-negotiable outcome declared: yes
Phase relation declared: yes
Expansion freeze declared: yes
Ready for Plan 1.2: yes
```

This completion report is the certification trace of Plan 1.1. It is recorded once and not modified retroactively.

---

## 11. Glossary (Charter-Local Definitions)

The following terms have charter-local meanings that bind every Phase 1 subplan:

- **Active backend / active product pipeline** — the user-facing runtime composed of `/api/chat` → `api/chat/service.ts` → `buildSignalSnapshot()` → `produceJudgment()` → `formatJudgmentForAI()` → `aiService.analyze()` (`services/ai-service.ts`).
- **Certified architecture** — the constitutional layer system L5 through L14, including all currently green sublayer certifications and the ARCHITECTURE_COMPLETE ratification artifact `l14.fp.architecture.2009825d`.
- **Production-convergence** — the operating mode in which every backend task is justified against shipping Coinet v1, not against expanding scope.
- **Expansion** — the addition of new broad backend areas, new constitutional layers, new dormant certification programs, or new parallel service families.
- **Side quest** — any backend topic that is interesting, technically valid, but does not advance one of the three Phase 1 goals.
- **Backend v1** — the finite backend product target whose precise scope is enumerated by Plan 1.2.
- **The freeze** — the default state declared by Section 9.4 of this charter, in which expansion is not admissible without scope-change approval.

These definitions are charter-local. Where another document in the repository uses these terms in a conflicting way, this charter prevails for Phase 1 purposes.

---

## 12. Authority Restatement (Operative Summary)

The following six sentences are the operative summary of this charter. They may be quoted in any subordinate Phase 1 document.

1. Phase 1 exists to stop backend expansion, freeze the v1 target, and converge backend engineering attention.
2. The mission is to advance only technical honesty, live-path trustworthiness, or synthetic judgment correctness.
3. The first principle is that no backend work is valuable unless it directly increases the probability of v1 production readiness.
4. The non-negotiable outcome is a written, agreed, repository-resident freeze with explicit deferred and decided categories.
5. The backend execution boundary before API work is Phase 1 → Phase 2 → Phase 3 → STOP AND REASSESS.
6. Where any later document conflicts with this charter, this charter prevails.

---

## 13. Change-Control Note

This charter is not immutable, but it is intentionally hard to change. Changes are governed by the following procedure.

### 13.1 Permitted Changes Without Reratification

- typographical and clarity edits that do not alter meaning,
- additions to the Glossary (Section 11) that do not contradict existing definitions,
- minor reformatting,
- additions to the certification trace (Section 10.5) when Plan 1.1 is certified complete.

### 13.2 Changes That Require Scope-Change Approval

The following changes require a written, dated scope-change record and explicit human approval. They may not be made silently.

- altering the mission (Section 3),
- altering the first principle (Section 4),
- altering the non-negotiable outcome (Section 7),
- moving an item between `LOCKED`, `DEFERRED`, and `NOT YET DECIDED` (Section 7.3),
- altering the freeze declaration (Section 9.4),
- altering the backend execution boundary (Section 8.1),
- ending Phase 1 or declaring Phase 1 complete.

### 13.3 Where Scope-Change Records Live

Scope-change records, when they exist, are appended to:

```text
apps/coinet-platform/docs/backend-v1/phase-1/phase-1-scope-changes.md
```

(The file does not need to exist until the first scope-change record is written.)

### 13.4 Who May Approve a Scope Change

Scope changes require explicit approval from the backend program owner. AI executing agents may **propose** a scope change but may not enact one.

---

## 14. Acceptance Block

This charter is accepted when the following block is filled in. Until accepted, the charter is treated as DRAFT regardless of the `Status` field in the front matter.

```text
Phase 1 Charter — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this charter in full.
  [ ] I understand the freeze declared in Section 9.4.
  [ ] I understand the non-negotiable outcome in Section 7.
  [ ] I will not authorize backend work that violates the first principle.
  [ ] I will route any proposed scope change through Section 13.
```

Once accepted, the `Status` field in the front matter is the authoritative state. Until accepted, treat this document as DRAFT in all operational decisions.

---

*End of Phase 1 Charter — Plan 1.1.*
