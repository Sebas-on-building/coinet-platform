# Backend v1 Architecture Expansion Freeze Law

Status: ACTIVE
Program: Coinet Backend v1
Phase: Phase 1
Plan: 1.4
Effective: 2026-05-19
Authority: Backend v1 Completion Program
Inherits From:
  - Plan 1.1 — Phase 1 Charter (`phase-1-charter.md`)
  - Plan 1.2 — Backend v1 Product Boundary (`backend-v1-product-boundary.md`)
  - Plan 1.3 — Backend v1 Non-Blocker and Non-Scope Registry (`backend-v1-non-blocker-and-non-scope-registry.md`)
Supersedes: All implicit assumptions that new backend architecture remains a default-admissible activity

---

## 0. Document Identity and Authority

This document is the **freeze-enforcement authority** of the Coinet Backend v1 program. It is the fourth plan inside Phase 1.

Plans 1.1, 1.2, and 1.3 together produced a scope structure:

- Plan 1.1 declared the production-convergence mission,
- Plan 1.2 defined what backend v1 actively is (V1-S01..V1-S06),
- Plan 1.3 defined what must not delay backend v1 (NB-001..NB-010).

Plan 1.4 adds the **freeze enforcement law**: the explicit backend rule that prevents new architecture expansion from re-entering the active roadmap through new names, new layers, new "just one more framework" ideas, or speculative backend world-building.

This document:

- does not implement any code,
- does not delete any code,
- does not refactor any module,
- does not reclassify any v1 surface from Plan 1.2,
- does not reclassify any non-blocker from Plan 1.3,
- does not begin Plan 1.5 enforcement work,
- does not approve any provider/API integration.

It performs one job and one job only:

> **It defines the freeze law that makes architecture expansion presumptively inadmissible during Phase 1, classifies violations, registers categories of frozen work, defines what remains legal, establishes an admissibility test and an exception procedure, and binds daily development to it.**

Where this document and any later subplan conflict on the question of whether new architecture work is admissible, this document prevails until amended through the Plan 1.1 §13 change-control procedure.

### 0.1 Pre-execution Dependency Check (Performed)

Before this document was finalized, the executing system confirmed:

1. `phase-1-charter.md` exists and is `ACTIVE`. ✅
2. `backend-v1-product-boundary.md` exists and is `ACTIVE`. ✅
3. `backend-v1-non-blocker-and-non-scope-registry.md` exists and is `ACTIVE`. ✅
4. The truth-clean active-runtime reference is recorded in Plans 1.1 and 1.2 as:
   ```text
   /api/chat
     → api/chat/service.ts
       → buildSignalSnapshot()
       → produceJudgment()
       → formatJudgmentForAI()
       → aiService.analyze()
         → services/ai-service.ts
   ```
   The false `services/explanations/` reference has been removed from all upstream plans. ✅

Plan 1.4 therefore inherits from truth-clean upstream documents.

---

## 1. Section 1.4.1 — Constitutional Purpose of the Architecture Expansion Freeze Law

### 1.4.1.1 Canonical Purpose Statement

The constitutional purpose of Plan 1.4 is:

> **The Architecture Expansion Freeze Law exists to prevent Coinet backend v1 from being delayed, diluted, or destabilized by new architectural sublayers, new constitutional programs, new dormant runtime systems, or speculative "world-building" that does not directly improve the production readiness of the live backend path.**

This sentence is the root authority for every prohibition, every admissibility decision, and every exception ruling under Plan 1.4. If a later document loses sight of this sentence, the later document is wrong, not this one.

### 1.4.1.2 Why This Law Is Necessary

The backend audit and the entire preceding architectural program established that:

- Coinet already has an unusually large certified architectural surface (L5–L14).
- The ratified architecture is meaningful, but much of it is **not yet load-bearing** in the active product runtime. Only L5 and a wrapper of L10 are touched by the live path.
- The current backend mission is not to invent more systems, but to:
  1. stabilize the backend foundation,
  2. harden the live chat/judgment/AI path,
  3. prove synthetic judgment correctness before real APIs arrive.
- Continuing to add new architecture before completing those three goals would widen the distance between **what Coinet has designed** and **what Coinet can actually ship**.

Plan 1.4 exists to stop that widening.

### 1.4.1.3 What Plan 1.4 Changes Operationally

**Before Plan 1.4.**
A new backend architecture idea could still be framed as:

- "future-proofing,"
- "part of the moat,"
- "aligned with the system,"
- "only one more certification sublayer,"
- "useful before APIs arrive."

These framings worked because there was no enforceable rule against them.

**After Plan 1.4.**
A new architecture expansion is presumed **inadmissible** unless it passes the strict admissibility test in §8 and the exception procedure in §11. The default shifts from:

```text
Maybe we should add it.
```

to:

```text
It is frozen unless proven necessary.
```

This is a categorical inversion of the burden of proof.

---

## 2. Section 1.4.2 — Inheritance From Plans 1.1, 1.2, and 1.3

### 2.1 Inheritance Statement

> **This freeze law inherits from the Phase 1 Charter, the Backend v1 Product Boundary, and the Explicit Non-Blocker and Non-Scope Registry. It does not reopen the v1 scope. It enforces it.**

Specifically:

**From Plan 1.1:**

- backend expansion is the default-frozen state,
- the Phase 1 → Phase 2 → Phase 3 → STOP AND REASSESS execution boundary,
- the three Phase 1 goals (technical honesty, live-path trustworthiness, synthetic judgment correctness),
- the Plan 1.1 §13 change-control procedure as the only legal path to amend any Phase 1 document.

**From Plan 1.2:**

- the six-surface positive scope (V1-S01..V1-S06),
- the reasoning spine (Asset Judgment + AI Chat),
- the cross-surface dependency law.

**From Plan 1.3:**

- the six-class negative-scope taxonomy (NS-A..NS-F),
- the ten registered non-blockers (NB-001..NB-010),
- the borderline case decision law.

Plan 1.4 does not weaken any of these inherited rules.

### 2.2 Relationship Table

| Plan         | Function                                                                |
| ------------ | ----------------------------------------------------------------------- |
| Plan 1.1     | Declares production-convergence mission                                 |
| Plan 1.2     | Defines what backend v1 is                                              |
| Plan 1.3     | Defines what must not delay backend v1                                  |
| **Plan 1.4** | Prevents new architecture expansion from re-entering the active roadmap |

### 2.3 Inheritance from Truth-Clean Upstream

Per §0.1, Plan 1.4 inherits from truth-clean upstream documents. If any upstream document is later modified to contradict this inheritance, this document must be re-validated through Plan 1.1 §13.

---

## 3. Section 1.4.3 — First Principle of the Freeze Law

### 3.1 Canonical First Principle

The governing doctrine of Plan 1.4 is:

> **Coinet's backend does not need more architectural territory before v1; it needs the existing production path to become truthful, stable, testable, and launchable.**

This is the central doctrine. Every prohibition in §4, every violation class in §5, every freeze entry in §6, every admissibility decision in §8, and every exception ruling in §11 traces back to this sentence.

### 3.2 Operational Interpretation

From the effective date forward:

- new architecture work is not inherently valuable,
- new architectural vocabulary is not progress,
- new dormant backend layers are not progress,
- new certified systems that do not directly improve the live backend are not progress,
- progress means **backend stabilization, runtime trustworthiness, synthetic truth correctness, and production readiness**.

### 3.3 Freeze Law Mindset

The backend program must now prefer:

```text
execution over expansion
integration over invention
hardening over world-building
correctness over conceptual completeness
```

These four preferences are binding heuristics under Plan 1.4. They are quoted, not interpreted.

---

## 4. Section 1.4.4 — Canonical Architecture Expansion Freeze Law

### 4.1 Freeze Law Statement

The freeze law of Plan 1.4 is the following sentence, which is reproduced verbatim wherever any subordinate document requires authoritative framing:

> **Until the backend v1 program has completed Phase 1 stabilization, Phase 2 live-path trust hardening, and Phase 3 synthetic judgment truth validation, Coinet backend work may not introduce new architectural sublayers, new constitutional architecture expansions, new dormant runtime programs, or new speculative backend systems that do not directly improve the current production backend.**

### 4.2 Immediate Prohibitions

The freeze law explicitly prohibits the following five categories.

**A. No new `L*.X` architectural sublayers.**
Examples (illustrative, not exhaustive):

```text
L13.13
L14.11
L12.9
L15.1
```

Not allowed before Phase 3 completion and reassessment.

**B. No new constitutional architecture expansion.**
No new:

- constitutional layers,
- certification empires,
- ratification systems,
- freeze hierarchies,
- mega-governance programs,

unless directly required to fix the active backend itself.

**C. No new dormant layer programs.**
No new large code surfaces that are certified and internally elegant but not actually used by the active product path. This prohibition is especially important because Coinet already has a large dormant constitutional runtime surface (L6, L7, L9, L11, L12, full L13 runtime, full L14 runtime).

**D. No new speculative "world-building."**
No backend efforts whose primary purpose is:

- future extensibility,
- theoretical completeness,
- eventual platform expansion,
- abstract system elegance,
- or "this may matter later."

World-building is frozen.

**E. No new "just one more system before real APIs."**
The period before API purchase is not a blank canvas for more architecture. It is reserved for Phase 1, Phase 2, and Phase 3 only.

---

## 5. Section 1.4.5 — Architecture Freeze Violation Taxonomy

Plan 1.4 defines eight formal violation classes so that violations are judged by a written taxonomy, not by vague feeling.

### 5.1 The Eight Violation Classes

```text
AFV-A — NEW_LAYER_OR_SUBLAYER_CREATION
AFV-B — NEW_DORMANT_RUNTIME_PROGRAM
AFV-C — NEW_CONSTITUTIONAL_EXPANSION
AFV-D — NEW_SPECULATIVE_BACKEND_FRAMEWORK
AFV-E — NEW_PARALLEL_FUTURE_SYSTEM
AFV-F — WORLD_BUILDING_DISGUISED_AS_PRODUCTION_WORK
AFV-G — ARCHITECTURE_WORK_WITH_NO_PHASE_1_TO_3_JUSTIFICATION
AFV-H — PREMATURE_UNIFICATION_OR_CIP1_EXPANSION
```

### 5.2 Definitions

**`AFV-A — NEW_LAYER_OR_SUBLAYER_CREATION`.**
Creating a new `L*.X` plan, code program, or certification surface. Includes new sublayers (e.g., L13.13, L14.11) and entirely new layers (e.g., L15).

**`AFV-B — NEW_DORMANT_RUNTIME_PROGRAM`.**
Creating a major backend subsystem not used by the active v1 path. The certified-but-dormant problem we already have must not be reproduced.

**`AFV-C — NEW_CONSTITUTIONAL_EXPANSION`.**
Adding new governance, certification, or ratification frameworks beyond what already exists. Existing frameworks may be preserved; new ones may not be added.

**`AFV-D — NEW_SPECULATIVE_BACKEND_FRAMEWORK`.**
Building a framework mainly for future possibilities, not current backend production needs.

**`AFV-E — NEW_PARALLEL_FUTURE_SYSTEM`.**
Creating another version, branch, or alternative runtime that does not replace an existing production component immediately. (Plan 1.5 will provide the full implementation-sprawl rule; this class catches the architectural-shape version.)

**`AFV-F — WORLD_BUILDING_DISGUISED_AS_PRODUCTION_WORK`.**
Work framed as "system quality" but whose real effect is creating additional abstract architecture. The disguise does not change the classification.

**`AFV-G — ARCHITECTURE_WORK_WITH_NO_PHASE_1_TO_3_JUSTIFICATION`.**
Any architectural work that cannot map directly to backend stabilization, live-path trustworthiness, or synthetic truth correctness.

**`AFV-H — PREMATURE_UNIFICATION_OR_CIP1_EXPANSION`.**
Attempting full reconciliation or CIP.1 execution before the Phase 1–3 boundary is complete. NB-006 already defers CIP.1; AFV-H is the violation class triggered when work attempts it anyway.

---

## 6. Section 1.4.6 — Explicit Frozen Work Registry

Plan 1.4 names the eight categories of work that are frozen by default. Each entry includes a default status and whether an exception is conceivable.

### 6.1 Frozen Work Registry

| Freeze ID | Frozen category                                    | Default status | Exception possible?                                |
| --------- | -------------------------------------------------- | -------------- | -------------------------------------------------- |
| `FRZ-001` | New L*.X sublayers                                 | Frozen         | Only by explicit post-Phase-3 reassessment         |
| `FRZ-002` | New constitutional architecture programs           | Frozen         | Extremely rare                                     |
| `FRZ-003` | New dormant runtimes                               | Frozen         | No, unless replacing active runtime immediately    |
| `FRZ-004` | New speculative backend frameworks                 | Frozen         | No                                                 |
| `FRZ-005` | New long-horizon certification stacks              | Frozen         | No                                                 |
| `FRZ-006` | New "future-proofing" service families             | Frozen         | No                                                 |
| `FRZ-007` | New full CIP.1-related implementation work         | Frozen         | Reassess after Phase 3                             |
| `FRZ-008` | New architecture-first work not tied to backend v1 | Frozen         | No                                                 |

### 6.2 Interpretation Rules

- **"Frozen"** means: presumed inadmissible. Work in this category may not begin without going through §11 exception procedure.
- **"Exception possible: No"** means: there is no admissible reason during Phase 1 to start this work. Even an exception request will be denied. These entries are effectively hard prohibitions until the post-Phase-3 reassessment.
- **"Extremely rare"** (FRZ-002) and **"Only by explicit post-Phase-3 reassessment"** (FRZ-001, FRZ-007) signal that exception requests will be reviewed but the default response remains DENY.

### 6.3 Relationship to Plan 1.3

Each FRZ entry coexists with the relevant Plan 1.3 NB entry. NB entries declare non-blocker status; FRZ entries declare new-work prohibition. The two together close the loop: NB-006 says "don't operationalize CIP.1 now," and FRZ-007 says "don't start any new CIP.1 implementation work either."

---

## 7. Section 1.4.7 — What Work Is Still Allowed Under the Freeze

A freeze must not paralyze the backend. Plan 1.4 defines five legal work classes that remain admissible.

### 7.1 Legal Work Class A — Phase 1 Stabilization Work

Allowed:

- build truth fixes,
- typecheck honesty,
- CI basics,
- smoke tests,
- explicit scope documents (such as Plans 1.x themselves),
- dependency cleanup required to make the build truthful.

### 7.2 Legal Work Class B — Phase 2 Live-Path Trust Work

Allowed:

- judgment availability states,
- removal of silent fallback,
- typed `CoinetJudgmentPromptPackage` for the live path,
- AI output safety gate,
- splitting `chat/service.ts` where needed for reliability or testability,
- tests for the live chat/judgment/AI path.

### 7.3 Legal Work Class C — Phase 3 Synthetic Truth Work

Allowed:

- Backend Judgment Truth Suite,
- synthetic scenario fixtures,
- semantic assertion harnesses,
- fixing reasoning flaws exposed by the suite,
- confidence/contradiction/scenario corrections necessary to pass truthful synthetic tests.

### 7.4 Legal Work Class D — Minimal Borrow-From-Architecture Hardening

Allowed only when it directly improves the active backend v1 path:

- borrow safety principles from L13.9 to harden the live AI output gate,
- borrow no-invention logic from L13.4,
- borrow uncertainty logic from L13.5,
- borrow truthful degradation ideas where they directly harden the live runtime.

**Not allowed under Class D:**

- full architecture migration,
- full dormant runtime activation,
- new constitutional sublayers,
- importing an entire L13 or L14 subsystem when a single principle would suffice.

The rule is **bounded borrowing**, not activation.

### 7.5 Legal Work Class E — Bug Fixes That Block Phases 1–3

Allowed if they:

- unblock truthful build,
- unblock live-path testing,
- unblock synthetic truth suite execution,
- prevent false pass/failure in the core backend.

### 7.6 What These Classes Have in Common

Every legal work class above is justified by direct, immediate contribution to one of the three Phase 1 goals or to one of the six Plan 1.2 surfaces. No legal work class is justified by future possibility, conceptual completeness, or architectural beauty.

---

## 8. Section 1.4.8 — Architecture Work Admissibility Test

Any task that even resembles "architecture" must pass this test before being considered active.

### 8.1 Five-Question Admissibility Test

For a proposed task, ask:

1. **Does it directly improve one of the active backend v1 surfaces defined in Plan 1.2?**
2. **Does it directly advance Phase 1, Phase 2, or Phase 3?**
3. **Can the backend become production-ready without this task?**
4. **Would this task create a new dormant program or new parallel system?**
5. **Would postponing it until after Phase 3 create a real production-readiness problem?**

### 8.2 Decision Rule

| Condition  | Outcome                                                  |
| ---------- | -------------------------------------------------------- |
| Q1 = No    | Reject / defer                                           |
| Q2 = No    | Reject / defer                                           |
| Q3 = Yes   | Defer unless direct production risk per Q5               |
| Q4 = Yes   | Freeze violation — reject under the relevant AFV class   |
| Q5 = No    | Defer                                                    |

If a task survives all five questions cleanly (Q1=Yes, Q2=Yes, Q3=No, Q4=No, Q5=Yes), it is admissible under one of the legal work classes in §7.

### 8.3 Worked Examples

**Example A — "Create L13.13 for conversational meta-calibration."**

- Q1 directly improves v1? No.
- Q2 needed for Phase 1–3? No.
- Q4 creates new sublayer? Yes.

→ **Rejected under FRZ-001 / AFV-A.**

**Example B — "Add a minimal safety scanner before user-facing LLM output."**

- Q1 directly improves AI Chat (V1-S01)? Yes.
- Q2 needed for Phase 2? Yes.
- Q4 creates dormant architecture? No.

→ **Allowed under Legal Work Class B.**

**Example C — "Begin CIP.1 full pipeline merge before synthetic truth suite."**

- Q1 directly needed for current pre-API boundary? No.
- Deferred by Plan 1.3 NB-006? Yes.

→ **Rejected under FRZ-007 / AFV-H until post-Phase-3 reassessment.**

**Example D — "Add a small adapter that lets the live `produceJudgment()` consume the L13.2 validator."**

- Q1 directly improves V1-S02 Asset Judgment? Yes (validation of input package).
- Q2 advances Phase 2 trust hardening? Yes.
- Q4 creates a new dormant program? No — it is a bounded borrowing under Class D.

→ **Allowed under Legal Work Class D, bounded.** Activating the rest of certified L13 runtime is not permitted by this approval.

### 8.4 Test Authority

The five-question admissibility test is the **only** admissible test for new architecture-shaped work under Phase 1. Other heuristics (e.g., "this would be quick," "this is elegant," "this lets us learn") do not override it.

---

## 9. Section 1.4.9 — New File, Folder, and Plan Creation Law

Architecture sprawl often appears first through filenames and folder creation. Plan 1.4 governs creation patterns explicitly.

### 9.1 Prohibited File and Folder Naming Patterns During Freeze

No new folders or files that indicate new layer/sublayer creation, new future-runtime families, or new speculative architecture. Examples of suspicious patterns that must trigger manual review:

```text
l15-*
l14_11-*
l13_13-*
*-constitutional-framework.ts
*-future-runtime.ts
*-meta-orchestrator.ts
*-master-expansion.ts
*-v2-architecture-*
```

A file matching these patterns is presumed to be a freeze violation until proven otherwise via the admissibility test in §8 or the exception procedure in §11.

### 9.2 Allowed Document Creation

Allowed documents must directly support:

- Plan 1.x execution (e.g., this document),
- Phase 2 live runtime hardening,
- Phase 3 synthetic truth suite,
- backend production readiness.

Examples of allowed document names:

```text
backend-v1-build-truth.md
chat-path-trust-hardening.md
backend-judgment-truth-suite.md
backend-v1-ai-output-safety-gate.md
backend-v1-judgment-availability-states.md
```

### 9.3 New Code Module Creation Rule

A new backend code module is legal only if it:

- replaces or extracts logic from an active runtime (replacement, not addition),
- supports a current Plan 1–3 task,
- reduces production risk,
- increases testability,
- or is strictly necessary to enforce a v1 trust boundary.

A new module that does not satisfy at least one of these conditions is a freeze violation, typically AFV-B, AFV-D, or AFV-G.

### 9.4 Default Posture

The default posture for any new file, folder, or document is **scrutiny, not assumption**. The burden of proof is on creation, not on preservation.

---

## 10. Section 1.4.10 — Relationship to Existing Certified Architecture

Plan 1.4 must avoid a wrong interpretation:

> Freeze does not mean "the architecture was a mistake" or "ignore it."

It means:

> The architecture is now a source of guidance and reusable governed ideas, not a justification for further expansion before backend v1 is hardened.

### 10.1 Correct Relationship

The existing L5–L14 architecture may be:

- consulted,
- referenced,
- partially borrowed from (under Legal Work Class D, bounded),
- used as a source of implementation discipline,
- preserved intact.

The architecture remains a strategic asset. It is not being abandoned. It is being held in place while the active backend is hardened.

### 10.2 Prohibited Misuse of Architecture

Not allowed:

```text
"Because L14 exists, let's operationalize all of it now."
"Because L13 is strong, let's build yet another explanatory layer."
"Because CIP.1 matters, let's pause Phase 3 and start full unification."
```

These are misuses of architecture as a justification engine for expansion.

### 10.3 Allowed Use of Architecture

Allowed:

```text
"L13.9 already contains safety logic; we may borrow its principles
 to harden the live AI output path in Phase 2."
```

This is bounded borrowing in service of a Plan 1.2 surface. It is allowed.

### 10.4 The Distinction in One Sentence

> **Existing architecture may inform Phase 1–3 work. It may not justify Phase 1–3 expansion.**

---

## 11. Section 1.4.11 — Exception Procedure for Breaking the Freeze

A freeze that has no exception procedure will either be ignored or become absurd. Plan 1.4 defines a strict but possible exception path.

### 11.1 Exception Class

```text
AFE — ARCHITECTURE_FREEZE_EXCEPTION
```

Every exception is logged under this class.

### 11.2 Required Exception Request Fields

Any exception request must include all twelve fields:

1. `exception_id` — unique identifier (e.g., `AFE-001`),
2. proposed task,
3. why it appears to violate the freeze,
4. which backend v1 surface it directly protects (cite Plan 1.2 V1-S0x),
5. which Phase 1–3 objective it advances,
6. why deferring it would create real production harm,
7. whether it creates new dormant code,
8. whether it adds new L*.X architecture,
9. estimated time cost,
10. opportunity cost (what active Phase 1–3 work it would displace),
11. decision: approve / reject / defer,
12. approval authority (which named role decided).

Incomplete exception requests are rejected without further review.

### 11.3 Approval Standard

An exception may be approved only if **all** of the following are simultaneously true:

- it directly prevents a meaningful production-readiness failure,
- it cannot reasonably wait until after Phase 3,
- it does not restart open-ended architecture expansion,
- it is bounded in scope (small, named, finite, with a written done definition),
- it has a clear done definition.

If any of these is not true, the exception is denied.

### 11.4 Default Exception Outcome

The default outcome of any exception request is:

```text
DEFER
```

Not approve. The reviewer must justify approval against the §11.3 criteria; reviewers do not need to justify denials beyond citing the relevant criterion that failed.

### 11.5 Where Exception Records Live

Exception records, when created, are appended to:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-architecture-freeze-exceptions.md
```

The file does not need to exist until the first exception is recorded. If approved exceptions exist, this file is the canonical record.

### 11.6 Exception Reviewer

Exceptions are approved only by the backend program owner. AI executing agents may **propose** an exception; they may not enact one. Approval must occur in the chat interface (per Plan 1.1 §13.4) and be reflected in the exception record.

---

## 12. Section 1.4.12 — Freeze Enforcement in Daily Development

Plan 1.4 specifies how the freeze influences actual implementation workflow.

### 12.1 Every Backend Task Must Be Classifiable

Each new backend task must map to one of:

```text
P1 — Phase 1 stabilization
P2 — Phase 2 live-path trust
P3 — Phase 3 synthetic truth
D  — Deferred (per Plan 1.3 or under §11)
```

No task may remain uncategorized. An uncategorized task is presumed deferred.

### 12.2 Architecture-Shaped Tasks Must Reference a Legal Basis

Every task that touches code, files, or design that resembles architecture must cite at least one of:

```text
Plan 1.2 V1-S0x (specify surface)
Plan 1.3 NB-00x (specify non-blocker)
Plan 1.4 Legal Work Class A | B | C | D | E
Approved AFE-xxx exception
```

If it cannot cite a legal basis, it is not active. This is a hard rule.

### 12.3 Task Review Questions

Before accepting a task into active backend work, a reviewer asks:

1. Which Plan 1–3 goal does it serve?
2. Which v1 surface (Plan 1.2 V1-S0x) does it protect?
3. Is it creating a new system or hardening an existing one?
4. Is there a simpler way to achieve the same production result?
5. Would a user feel this improvement before backend v1 connects to real APIs?

A task that cannot answer Q1 and Q2 affirmatively is rejected by default.

### 12.4 Enforcement Tone

Enforcement is not adversarial. It is consistent. The freeze is the default; admission is the exception. Daily development obeys this asymmetry because the asymmetry is what makes finite execution possible.

---

## 13. Section 1.4.13 — Required Governance Artifact

### 13.1 Mandatory Primary Artifact

The mandatory primary artifact of Plan 1.4 is **this document**, located at:

```text
apps/coinet-platform/docs/backend-v1/phase-1/backend-v1-architecture-expansion-freeze-law.md
```

### 13.2 Required Sections (Satisfied by This Document)

1. Document identity and authority (Section 0),
2. Purpose (Section 1),
3. Inheritance from Plans 1.1–1.3 (Section 2),
4. First principle (Section 3),
5. Canonical freeze law (Section 4),
6. Freeze violation taxonomy `AFV-A..H` (Section 5),
7. Frozen work registry `FRZ-001..FRZ-008` (Section 6),
8. Legal work classes still allowed (Section 7),
9. Architecture work admissibility test (Section 8),
10. New file/folder/plan creation law (Section 9),
11. Relationship to existing certified architecture (Section 10),
12. Freeze exception procedure `AFE` (Section 11),
13. Daily development enforcement (Section 12),
14. Verification and certification criteria (Section 14),
15. Done definition (Section 15.1),
16. Acceptance block (Section 17).

### 13.3 Auxiliary Artifact

`backend-v1-architecture-freeze-exceptions.md` is created lazily — only when the first AFE exception is approved.

---

## 14. Section 1.4.14 — Verification and Certification Criteria

Plan 1.4 is complete only when all of the following are simultaneously true.

### 14.1 Freeze Law Clarity

The document unmistakably prohibits:

- new L*.X sublayers ✅
- new constitutional architecture programs ✅
- new dormant runtime programs ✅
- new speculative backend frameworks ✅
- new architecture-first work not tied to Phases 1–3 ✅

### 14.2 Allowed-Work Clarity

The document unmistakably allows:

- backend stabilization (§7.1) ✅
- live-path trust hardening (§7.2) ✅
- synthetic truth suite work (§7.3) ✅
- bounded reuse of existing architectural ideas (§7.4) ✅
- bug fixes that block Phases 1–3 (§7.5) ✅

### 14.3 Exception Clarity

The document defines:

- when a freeze exception is possible (§11.3) ✅
- when it is not (§11.4, §6.1 "Exception possible: No" entries) ✅
- the twelve required fields (§11.2) ✅
- the default deny/defer posture (§11.4) ✅

### 14.4 Practical-Use Clarity

A reviewer can answer from this document alone:

1. Can we create a new L14.11 sublayer?
   → **No.** (FRZ-001, AFV-A.)
2. Can we build an AI output safety gate for the live chat path?
   → **Yes.** (Legal Work Class B; V1-S01 surface.)
3. Can we begin full CIP.1 merge now?
   → **No.** (FRZ-007, AFV-H, NB-006.)
4. Can we borrow safety rules from existing L13 code to harden Phase 2?
   → **Yes, if bounded and directly relevant.** (Legal Work Class D.)
5. Can we create another future-proof framework because it might help after launch?
   → **No.** (FRZ-004, AFV-D.)

If any of those answers are unclear from the document alone, Plan 1.4 is not complete.

---

## 15. Section 1.4.15 — Done Definition and Transition to Plan 1.5

### 15.1 Done Definition

Plan 1.4 is complete only when:

> **Coinet backend v1 has a repo-resident Architecture Expansion Freeze Law that formally prohibits new sublayers, new constitutional expansions, new dormant layer programs, and speculative world-building outside the Phase 1–3 backend production path; defines what remains legal; provides a strict architecture-work admissibility test; establishes a bounded exception procedure; and makes it operationally difficult for architecture sprawl to re-enter the active backend roadmap.**

This document satisfies that definition once accepted via Section 17.

### 15.2 Transition to Plan 1.5

Once Plan 1.4 is accepted, the next required step is:

> **Plan 1.5 — Parallel-Service and Version-Sprawl Prohibition**

Plan 1.5 addresses a different but related backend pathology:

```text
No new -v2
No new -final
No new -complete
No new parallel scoring/social/news/derivatives systems
```

Where Plan 1.4 stops new architectural surface area, Plan 1.5 will stop new implementation duplication at the service level. Together:

```text
Plan 1.4 = Stop new architecture expansion
Plan 1.5 = Stop new parallel implementation sprawl
```

Both are required to make backend convergence real.

### 15.3 Combined Scope-Control Square (After Plan 1.5)

Once Plan 1.5 lands, the scope-control structure is:

```text
Plan 1.1 = Production-convergence mission (why)
Plan 1.2 = Positive scope (what is in)
Plan 1.3 = Negative scope (what is not in)
Plan 1.4 = Architecture freeze (no new world-building)
Plan 1.5 = Implementation freeze (no new parallel families)
```

Plan 1.4 is the third side of this enforcement structure.

---

## 16. Glossary (Document-Local Definitions)

- **Architecture** — backend work that creates new layers, sublayers, constitutional programs, dormant runtimes, or speculative frameworks; distinct from implementation work that hardens an existing active surface.
- **World-building** — backend effort whose primary justification is future possibility, theoretical completeness, or system elegance rather than current production need.
- **Dormant** — code that exists (often certified) but is not invoked by the live product runtime; the freeze prevents new dormant code while preserving existing dormant code.
- **Bounded borrowing** — Legal Work Class D activity: importing a *principle* or a *narrow contract* from existing certified architecture into the live path, without activating the rest of that architecture.
- **Admissibility test** — the five-question test in §8.1 that gates any architecture-shaped task.
- **AFE** — Architecture Freeze Exception; a named, logged, scrutinized request to admit specific work that would otherwise be frozen.
- **Default posture** — the operating stance under Plan 1.4 in which architecture expansion is presumed inadmissible; the burden of proof is on admission.

These definitions are document-local. Where another document in the repository uses these terms in a conflicting way, this document prevails for Phase 1 freeze-enforcement purposes.

---

## 17. Acceptance Block

This freeze law is accepted when the following block is filled in. Until accepted, the document is treated as DRAFT regardless of the `Status` field in the front matter.

```text
Backend v1 Architecture Expansion Freeze Law — Acceptance

Accepted by: ____________________________
Role:        ____________________________
Date:        ____________________________

I confirm that:
  [ ] I have read this document in full.
  [ ] I accept the canonical freeze law in §4.1 as authoritative.
  [ ] I accept the eight violation classes (AFV-A..H) in §5.
  [ ] I accept the eight frozen work entries (FRZ-001..FRZ-008) in §6.
  [ ] I accept the five legal work classes (A..E) in §7 as the only
      admissible categories during Phase 1.
  [ ] I will apply the five-question admissibility test in §8 to every
      architecture-shaped task before approving it.
  [ ] I will route any proposed exception through the AFE procedure
      in §11 and will not approve exceptions that fail §11.3.
  [ ] I understand that the freeze does not abandon the certified
      L5–L14 architecture; it preserves it while production converges.
  [ ] I understand Plan 1.5 will add the parallel-implementation
      prohibition that completes the scope-control structure.
```

Once accepted, the `Status` field in the front matter is the authoritative state. Until accepted, treat this document as DRAFT in all operational decisions.

---

*End of Backend v1 Architecture Expansion Freeze Law — Plan 1.4.*
