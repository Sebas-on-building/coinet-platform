# Urgent Defect Record (UDF) — Template

> **Authority:** Plan 1.6 §17 — Backend Task Admissibility Framework.
> **Use when:** A defect qualifies as urgent under §17.2 and requires expedited admission without the full BTAR review cycle.
> **Storage:** `phase-1/records/urgent-defects/UDF-NNN-short-slug.md`. Must be indexed in `backend-v1-exception.registry.md`, `backend-v1-record-index.registry.md`, and `backend-v1-active-task.registry.md` (if admitted as `TAD-A`).

---

## How to Use

1. Confirm the defect meets the §17.2 qualification criteria. If not, file a regular BTAR instead.
2. Copy this template into `phase-1/records/urgent-defects/UDF-NNN-short-slug.md`.
3. Fill all 12 fields. Abbreviated BTAR fields (1–9, 17, 18, 21 from Plan 1.6 §12.2) are the minimum.
4. The fix must obey §17.4 constraints: no new architecture sprawl, no new version sprawl, no scope re-entry.
5. On admission, update this record, the exception registry, the record index, and (if `TAD-A`) the active task registry in the same work session.

---

## UDF Qualification Criteria (Plan 1.6 §17.2)

A defect qualifies as UDF only when it:

1. Breaks the build truth.
2. Prevents core backend boot.
3. Blocks an admitted Phase 1–3 task.
4. Causes user-visible falsehood in the active judgment/chat path.
5. Or invalidates synthetic truth evaluation.

If none of these apply, file a regular BTAR.

---

## UDF Constraints (Plan 1.6 §17.4)

A UDF fix must not:

- create new architecture sprawl (Plan 1.4 violation),
- create new version sprawl (Plan 1.5 violation),
- reopen deferred scope (Plan 1.3 violation).

If the only correct fix would violate one of those, the UDF is **escalated to `TAD-E`** for AFE/FRP/BSCP/VSE processing — it does not bypass the freeze laws.

---

## UDF Template

```text
# UDF-NNN — <Title>

State: DRAFT

## 1. udf_id
UDF-NNN

## 2. defect_title
<Short, declarative title of the defect.>

## 3. defect_summary
<2–4 sentences describing the defect in concrete observable terms.>

## 4. qualification_criterion_met
<Exactly one of:
  - 17.2.1 — breaks build truth
  - 17.2.2 — prevents core backend boot
  - 17.2.3 — blocks an admitted Phase 1–3 task
  - 17.2.4 — causes user-visible falsehood in active judgment/chat
  - 17.2.5 — invalidates synthetic truth evaluation
Cite the specific criterion and explain how it applies.>

## 5. date_discovered
<YYYY-MM-DD>

## 6. discovered_by
<Name / role / source (e.g., CI failure, user report, code review).>

## 7. target_backend_surface
<V1-S01..S06 or NONE. If NONE, this is likely not a UDF — verify
qualification.>

## 8. target_phase
<Phase 1 / 2 / 3. UDFs apply only within the current Phase 1–3 program.>

## 9. production_readiness_problem_solved
<Concrete production-readiness problem this fix resolves. Same
specificity standard as BTAR field 9.>

## 10. proposed_fix
<Brief description of the proposed fix. Confirm it obeys §17.4
constraints (no architecture sprawl, no version sprawl, no scope
re-entry).>

## 11. admission_outcome
<TAD-A (admit active now) — default for valid UDFs
OR
TAD-E (escalate) — if the only correct fix would violate §17.4>

## 12. approval_authority
<Backend program owner.>
```

---

## Lifecycle

```text
DRAFT → ADMITTED (TAD-A) → IN_PROGRESS → COMPLETED
                        → ESCALATED (TAD-E) → AFE/FRP/BSCP/VSE process
```

A UDF completes when the defect is resolved and the fix is merged. Update the record's `State:` field and the active task registry.

---

## Worked Example

```text
UDF-001 — Build script silently masks typecheck failures

State: ADMITTED

## 1. udf_id: UDF-001
## 2. defect_title: Build script silently masks typecheck failures
## 3. defect_summary:
  apps/coinet-platform/package.json "build" script uses
  `tsc || true`, causing typecheck failures to pass silently
  and emit a successful build artifact even when types are broken.
## 4. qualification_criterion_met: 17.2.1 — breaks build truth
## 5. date_discovered: 2026-05-19
## 6. discovered_by: backend engineering audit
## 7. target_backend_surface: SCOPE_CONTROL (Phase 1 stabilization)
## 8. target_phase: Phase 1
## 9. production_readiness_problem_solved:
  Restores build truth. CI and local builds will report typecheck
  failures honestly. Prevents future regressions from landing
  undetected.
## 10. proposed_fix:
  Remove `|| true`. Verify no other scripts mask failures. No new
  files; no architecture or version sprawl.
## 11. admission_outcome: TAD-A
## 12. approval_authority: backend program owner
```

---

*This template implements Plan 1.6 §17. Plan 1.6 is authoritative.*
