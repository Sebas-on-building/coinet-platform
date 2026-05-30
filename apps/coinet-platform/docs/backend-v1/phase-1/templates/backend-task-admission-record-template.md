# Backend Task Admission Record (BTAR) — Template

> **Authority:** Backend v1 Task Admissibility Framework (`backend-v1-task-admissibility-framework.md`, Plan 1.6).
> **Purpose:** This is the mandatory template for every Backend Task Admission Record (BTAR). Copy this file, fill in every field, and save as `BTAR-NNN-short-slug.md` inside `apps/coinet-platform/docs/backend-v1/phase-1/backend-task-admission-records/`.
> **When to use:** Required for every functional backend task. Trivial non-functional changes (typos, formatting, import ordering) are exempt per §14.2.
> **Incomplete records:** Rejected without further review (§12.2).
> **Storage path:** Per Plan 1.7 §6.3, BTARs are stored under `apps/coinet-platform/docs/backend-v1/phase-1/records/backend-task-admission-records/` (Plan 1.7 canonical directory structure).

---

## How to Use This Template

1. Copy the entire block below into a new file at `apps/coinet-platform/docs/backend-v1/phase-1/records/backend-task-admission-records/BTAR-NNN-short-slug.md`.
2. Replace `NNN` with the next sequential ID (zero-padded, e.g., `BTAR-001`, `BTAR-014`, `BTAR-127`).
3. Replace `short-slug` with a kebab-case description (e.g., `remove-silent-judgment-fallback`).
4. Fill in every field. Use `N/A` if a field is not applicable to this task, but **never leave a field blank**.
5. Run the eight-question admissibility gate (Plan 1.6 §7.1) and record the outcome in field 18.
6. Submit for approval. Approved BTARs become authoritative; rejected BTARs may be reshaped and resubmitted with a new ID.

---

## BTAR Template

```text
# BTAR-NNN — <Task Title>

## 1. task_id
BTAR-NNN

## 2. task_title
<Short, declarative title — e.g., "Remove silent judgment-engine fallback in /api/chat">

## 3. task_summary
<2–4 sentences describing what the task does, in concrete terms. State the
change in observable system behavior, not in vague architectural terms.>

## 4. request_origin
<Where did this task come from? Examples:
  - Phase 2 hardening backlog
  - Backend engineering audit
  - Synthetic truth suite failure
  - User-reported defect
  - Phase 1 scope review
  - Frontend integration discussion
  - Code review observation>

## 5. date_created
<YYYY-MM-DD>

## 6. proposed_by
<Name / role of the person proposing the task.>

## 7. target_backend_surface
<One or more of:
  - V1-S01 AI_CHAT
  - V1-S02 ASSET_JUDGMENT
  - V1-S03 MARKET_TERMINAL_INTELLIGENCE
  - V1-S04 RADAR_RANKING_INTELLIGENCE
  - V1-S05 ESSENTIAL_AUTH_SESSION_CONVERSATION_PERSISTENCE
  - V1-S06 TRUTHFUL_ALERTS_CONDITIONAL
  - NONE
If NONE, the task is likely TAD-C or TAD-D — explain in field 19.>

## 8. target_phase
<Exactly one of:
  - Phase 1 (stabilization)
  - Phase 2 (live-path trustworthiness)
  - Phase 3 (synthetic judgment truth)
  - Post-Phase-3
  - Unknown>

## 9. production_readiness_problem_solved
<Specific, observable production-readiness problem this task addresses.
This must NOT be vague ("improves architecture", "cleans up code"). It must
be concrete and falsifiable.

  Bad: "Improves the codebase."
  Good: "Prevents /api/chat from emitting an AI response that appears
         Coinet-grounded when produceJudgment() has actually failed."

If you cannot write a concrete sentence here, the task is not ready for
admission — reshape it first.>

## 10. why_now
<Why this task must happen now (or in its currently assigned phase) rather
than being deferred. Tie this to a specific Phase 1–3 dependency, an
admitted upstream task, or a production-integrity risk that cannot wait.>

## 11. what_happens_if_deferred
<What is the concrete consequence of NOT doing this task now? If the answer
is "nothing meaningful," the task is likely TAD-C.

  Examples:
    - "Coinet may emit user-visible falsehoods during the launch window."
    - "Synthetic truth suite cannot be executed because the test harness
       cannot import the live path."
    - "Build silently passes despite typecheck failures, so future
       regressions land undetected.">

## 12. non_scope_conflict_check
<Does this task touch any Plan 1.3 non-blocker entry (NB-001..NB-010)?
List the specific NB-NNN entries if any, and explain why this task is
either compliant or requires escalation.

  - none
  - NB-001 (Strategy Lab) — task is full Strategy Lab work → conflict
  - NB-006 (CIP.1) — task borrows one bounded principle, not full work →
    compliant under Plan 1.4 Legal Work Class D
  - NB-008 (deep API work before purchase) — task is provider-specific →
    conflict>

## 13. architecture_freeze_check
<Does this task violate any Plan 1.4 freeze entry (FRZ-001..FRZ-008) or
trigger any AFV-A..H violation class?

  - none
  - AFV-A — creates new L*.X sublayer → conflict
  - AFV-G — architecture work with no Phase 1–3 justification → conflict
  - Bounded reuse of existing L13 logic under Plan 1.4 Legal Work Class D
    → compliant>

## 14. version_sprawl_check
<Does this task violate any Plan 1.5 prohibition (VSV-A..VSV-J) or touch
any PSC-001..PSC-010 protected capability?

  - none
  - VSV-A — proposes new -v2 file → conflict
  - PSC-001 SCORING — touches existing canonical path under CSP-A
    (in-place improvement) → compliant
  - VSV-C — proposes new parallel service without canonical owner →
    requires FRP/BSCP/VSE>

## 15. provider_timing_check
<Does this task involve real API/provider integration that is currently
deferred under Plan 1.3 NB-008?

  - none — task is provider-agnostic
  - light synthetic-schema-only work — compliant under optional Phase 3.5
  - deep provider integration — conflict (deferred until APIs purchased)>

## 16. edge_case_classification
<If this task is an edge case, classify it under Plan 1.6 §11.1:

  - EDGE-A BROAD_CLEANUP_WITH_POSSIBLE_CURRENT_BENEFIT
  - EDGE-B ARCHITECTURE_BORROWING_THAT_MAY_LOOK_LIKE_EXPANSION
  - EDGE-C PROVIDER-PREPARATION_TASK_THAT_MAY_BE_LIGHT_OR_PREMATURE
  - EDGE-D FRONTEND-REQUESTED_BACKEND_WORK_THAT_MAY_NOT_BE_V1-RELEVANT
  - EDGE-E DUPLICATION_FIX_THAT_MAY_EXPAND_INTO_LARGE_REWRITE
  - EDGE-F ALERT-RELATED_WORK_UNDER_CONDITIONAL_ADMISSIBILITY
  - N/A (not an edge case)

If edge-cased, also state the minimal now-version and the deferred
later-version per §11.2.>

## 17. required_procedure
<Exactly one of:
  - None
  - AFE (Architecture Freeze Exception, Plan 1.4)
  - FRP (Formal Replacement Procedure, Plan 1.5 §8)
  - BSCP (Bounded Shadow Comparison Procedure, Plan 1.5 §9)
  - VSE (Version-Sprawl Exception, Plan 1.5 §15)

If anything other than None is selected, this BTAR must be accompanied
by the corresponding procedure record before approval.>

## 18. admission_outcome
<Exactly one of:
  - TAD-A — ADMIT_ACTIVE_NOW
  - TAD-B — ADMIT_BUT_QUEUE_FOR_LATER_PHASE_WITHIN_CURRENT_PROGRAM
  - TAD-C — DEFER_POST_PHASE_3
  - TAD-D — BLOCK_AS_SCOPE_OR_FREEZE_VIOLATION
  - TAD-E — ESCALATE_FOR_EXCEPTION_OR_ARCHITECTURAL_DECISION>

## 19. decision_rationale
<Concise explanation of why the eight-question gate produced the outcome
in field 18. Reference specific Q1..Q8 answers and any precedence-hierarchy
considerations from §13.1.

  Example:
    "Strong Q1 (V1-S01, V1-S02) and Q2 (Phase 2) alignment. Q6 specific
     (silent fallback is highest-severity active trust failure). Q3/Q4/Q5
     clean. Q7 positive (must happen before launch). Q8 minimal cost.
     Result: TAD-B until Phase 2 begins, then TAD-A.">

## 20. approved_by
<Name / role of the person approving this admission. If the outcome is
TAD-D (blocked) or TAD-E (escalated), this field records the reviewer who
made that determination.>

## 21. next_action
<Concrete next step. Examples:
  - "Move to BACKLOG-A; begin implementation."
  - "Queue under BACKLOG-B; promote to BACKLOG-A on Phase 2 entry."
  - "File in BACKLOG-C; reassess at Phase 3 STOP AND REASSESS gate."
  - "Reshape via FRP and resubmit as BTAR-NNN+1."
  - "Escalate to architecture owner for AFE review.">

## 22. review_or_reassessment_trigger
<Under what condition is this BTAR revisited?

  Examples:
    - "Phase 2 entry; reassess if produceJudgment() contract changes."
    - "Phase 3 STOP AND REASSESS gate."
    - "Once APIs are purchased."
    - "If synthetic truth suite reveals related failures."
    - "Never — completed and closed.">
```

---

## Storage Convention

- File location: `apps/coinet-platform/docs/backend-v1/phase-1/records/backend-task-admission-records/` (per Plan 1.7 §6.3)
- Filename: `BTAR-NNN-short-slug.md`
- IDs are zero-padded, sequential, and never reused. A blocked BTAR keeps its ID; a reshaped resubmission gets a new ID with a back-reference in field 4 (`request_origin`).

## Lifecycle States

| State          | Meaning                                                   |
| -------------- | --------------------------------------------------------- |
| `DRAFT`        | Author is filling fields; not yet submitted               |
| `SUBMITTED`    | Awaiting reviewer decision                                |
| `APPROVED`     | Field 20 signed; placed in BACKLOG-A or BACKLOG-B         |
| `DEFERRED`     | TAD-C; lives in BACKLOG-C until reassessment trigger      |
| `BLOCKED`      | TAD-D; lives in BACKLOG-D; reshape and resubmit if needed |
| `ESCALATED`    | TAD-E; awaiting AFE/FRP/BSCP/VSE outcome                  |
| `IN_PROGRESS`  | Implementation underway                                   |
| `COMPLETED`    | Task delivered; closed                                    |
| `WITHDRAWN`    | Author retracted before approval                          |

State is recorded at the top of the BTAR file in a single line:

```text
State: APPROVED (since 2026-05-19)
```

---

## Example: Filled BTAR (Reference Only)

The canonical filled example is in Plan 1.6 §12.3 (`BTAR-001` — Remove silent judgment-engine fallback). Use it as a model for tone, specificity, and field completeness.

---

*End of Backend Task Admission Record (BTAR) Template — Plan 1.6 §18.2.*
