# Formal Replacement Procedure (FRP) — Template

> **Authority:** Plan 1.5 §8 — Parallel-Service and Version-Sprawl Prohibition.
> **Use when:** A new implementation is genuinely needed and the decision to replace the old path has already been made. For honest uncertainty (decision not yet made), use BSCP instead.
> **Storage:** `phase-1/records/formal-replacements/FRP-NNN-short-slug.md`. Must be indexed in `backend-v1-exception.registry.md` and `backend-v1-record-index.registry.md`.

---

## How to Use

1. Copy this template into `phase-1/records/formal-replacements/FRP-NNN-short-slug.md`.
2. Fill all 14 fields. Incomplete FRPs are rejected without review (Plan 1.5 §8.2).
3. Submit for approval. The replacement is valid only if §8.3 conditions hold.
4. On decision, update this record, the exception registry, the record index, and (if approved) the active task registry in the same work session.

---

## FRP Template

```text
# FRP-NNN — <Title>

State: DRAFT

## 1. replacement_id
FRP-NNN

## 2. capability_being_replaced
<Which PSC-001..PSC-010 family is affected?>

## 3. existing_canonical_path
<Exact file path of the existing implementation being retired.>

## 4. proposed_replacement_path
<Exact file path of the new implementation.>

## 5. why_in_place_improvement_insufficient
<Why CSP-A (in-place) cannot achieve the same result.>

## 6. production_risk_if_not_replaced
<Concrete risk that motivates the replacement.>

## 7. v1_surface_affected
<V1-S01..V1-S06>

## 8. phase_1_to_3_objective_advanced
<Phase 1 / 2 / 3 objective.>

## 9. migration_sequence
<Stepwise migration plan: introduce new path, migrate callers,
verify equivalence, retire old path.>

## 10. deprecation_trigger_for_old_path
<Exact event or condition that triggers deprecation of the old path
(e.g., "after all internal callers migrated", "after AJP.1 corpus
passes end-to-end on new path with zero regression").>

## 11. removal_or_deactivation_condition
<Exact condition that removes / deactivates the old path entirely.>

## 12. testing_or_certification_needed
<Which tests, certs, or harnesses validate the replacement.>

## 13. rollback_plan
<What happens if the replacement fails in production.>

## 14. decision_status
<APPROVED / REJECTED / DEFERRED>
```

---

## Replacement Law (Plan 1.5 §8.3)

A formal replacement is valid only if:

- the new path has an explicit purpose,
- the old path is explicitly named,
- both are not intended to remain indefinitely active,
- the replacement directly improves backend production readiness,
- the replacement has a completion and retirement rule.

---

## Worked Example (Plan 1.5 §8.4)

```text
Replace the current untyped judgment-to-AI context formatter
with a typed CoinetJudgmentPromptPackage formatter,
while deprecating the existing ASCII prompt stuffing path
and removing it once the typed formatter has passed AJP.1 corpus
end-to-end with no regression.
```

Old path named. New path named. Expiry condition stated. Regression bar declared. This is controlled replacement, not sprawl.

---

*This template implements Plan 1.5 §8. Plan 1.5 is authoritative.*
