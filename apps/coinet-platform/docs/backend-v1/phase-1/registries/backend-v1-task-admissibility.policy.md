# Backend v1 Task Admissibility Policy (Quick Reference)

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — quick reference of Plan 1.6)
**Source Plan:** `phase-1/backend-v1-task-admissibility-framework.md` (Plan 1.6)
**Last Updated:** 2026-05-19

> Operational quick-reference for the Backend Task Admissibility Framework. If this policy and Plan 1.6 disagree, **Plan 1.6 wins** and this file is corrected.

---

## 1. Decision Outcomes (TAD-A..E)

```text
TAD-A — ADMIT_ACTIVE_NOW
TAD-B — ADMIT_BUT_QUEUE_FOR_LATER_PHASE_WITHIN_CURRENT_PROGRAM
TAD-C — DEFER_POST_PHASE_3
TAD-D — BLOCK_AS_SCOPE_OR_FREEZE_VIOLATION
TAD-E — ESCALATE_FOR_EXCEPTION_OR_ARCHITECTURAL_DECISION
```

| Outcome | Backlog bucket | Meaning                                                            |
| ------- | -------------- | ------------------------------------------------------------------ |
| TAD-A   | BACKLOG-A      | Active now                                                         |
| TAD-B   | BACKLOG-B      | Queued for later phase within Phase 1–3 program                    |
| TAD-C   | BACKLOG-C      | Deferred post-Phase-3 (valuable but not now)                       |
| TAD-D   | BACKLOG-D      | Blocked (not in current form; reshape required)                    |
| TAD-E   | BACKLOG-E      | Escalated to AFE / FRP / BSCP / VSE / SCR                          |

---

## 2. The Eight-Question Admissibility Gate

For every functional backend task, answer all eight:

1. **Q1 — Product boundary fit.** Which V1-S0x surface does this serve? (`NONE` → defer/block.)
2. **Q2 — Phase alignment.** Phase 1 / 2 / 3? (`NONE` → defer/block.)
3. **Q3 — Non-scope conflict.** Any NB-NNN entry? (Yes → `TAD-C` or `TAD-D`.)
4. **Q4 — Architecture freeze conflict.** Any AFV-A..H violation? (Yes → `TAD-D` unless AFE.)
5. **Q5 — Version-sprawl conflict.** Any VSV-A..J violation? (Yes → `TAD-D` unless FRP/BSCP/VSE.)
6. **Q6 — Direct production-readiness value.** What specific risk does this reduce? (Must be specific, not vague.)
7. **Q7 — Timing necessity.** Must this happen before Phase 3 completes? (Can wait → defer.)
8. **Q8 — Opportunity cost.** What active Phase 1–3 work does this delay? (Substantial cost → defer.)

**Asymmetry:** Any one disqualifying answer can produce defer/block. All enabling answers required for `TAD-A`.

---

## 3. Decision Mapping

| Admission Outcome | Conditions                                               |
| ----------------- | -------------------------------------------------------- |
| `TAD-A`           | Strong yes on Q1, Q2, Q6, Q7; no Q3/Q4/Q5 conflicts      |
| `TAD-B`           | Strong yes on Q1/Q2 but not this execution moment        |
| `TAD-C`           | Valuable but legitimately post-Phase-3                   |
| `TAD-D`           | Violates Q3, Q4, or Q5                                   |
| `TAD-E`           | Cannot be safely classified automatically                |

---

## 4. Precedence Hierarchy (Plan 1.6 §13.1)

```text
1. Safety / production integrity
2. Plan 1.1 Phase 1 mission
3. Plan 1.2 positive scope
4. Plan 1.3 negative scope
5. Plan 1.4 architecture freeze
6. Plan 1.5 version-sprawl prohibition
7. Plan 1.6 task-specific admission judgment
```

A task that passes one plan but violates a higher one is blocked. Restrictions compound.

---

## 5. Required Procedure Per Conflict

| Conflict           | Procedure         |
| ------------------ | ----------------- |
| Architecture freeze | AFE (Plan 1.4)    |
| Version sprawl     | FRP / BSCP / VSE  |
| Scope addition     | SCR (Plan 1.7)    |
| Urgent defect      | UDF (Plan 1.6 §17) |

---

## 6. Workflow

```text
1. Task proposed
2. Fill BTAR (use templates/backend-task-admission-record-template.md)
3. Run eight-question gate
4. Check against Plans 1.2–1.5
5. Assign TAD outcome
6. Route to appropriate backlog
7. Index BTAR in backend-v1-record-index.registry.md
8. If TAD-A → also add to backend-v1-active-task.registry.md
```

---

## 7. Cleanup / Refactor Law (Plan 1.6 §16)

> Cleanup work is admissible only when it directly enables build truth, live-path trustworthiness, synthetic truth validation, or the safe execution of an already-admitted task.

Decompose ambiguous cleanup into: **minimal now-version** (admissible) + **deferred later-version** (`TAD-C`).

---

## 8. Urgent Defect Fix (UDF) Path (Plan 1.6 §17)

A defect qualifies as UDF when it:

1. Breaks build truth.
2. Prevents core backend boot.
3. Blocks an admitted Phase 1–3 task.
4. Causes user-visible falsehood in the active judgment/chat path.
5. Invalidates synthetic truth evaluation.

UDF admission: directly `TAD-A` with abbreviated BTAR (fields 1–9, 17, 18, 21 minimum). UDF must **not** create new architecture sprawl, version sprawl, or scope re-entry.

---

## 9. Trivial Changes (Plan 1.6 §14.2)

BTAR may be omitted for **truly trivial** non-functional changes:

- typo fixes,
- import ordering,
- formatting-only edits.

Any functional change requires a BTAR.

---

## 10. Practical Reference Answers

| Question                                   | Answer                                              |
| ------------------------------------------ | --------------------------------------------------- |
| Fix the lying build script?                | Yes — `TAD-A`                                       |
| Deep API-provider logic before purchase?   | No — `TAD-C` or `TAD-D` (NB-008)                    |
| Split chat service for testability?        | Yes if bounded — `TAD-A`/`TAD-B`                    |
| Create `judgment-engine-v2.ts`?            | No — `TAD-D` unless FRP/BSCP/VSE                    |
| Start Strategy Lab backend?                | No — `TAD-C` (NB-001)                               |
| Adapt L13.9 safety ideas for AI gating?    | Yes — `TAD-A` if bounded (Plan 1.4 Legal Class D)   |
| Begin full CIP.1?                          | No — `TAD-C` (NB-006)                               |

---

*This policy is Level 4. Plan 1.6 is authoritative.*
