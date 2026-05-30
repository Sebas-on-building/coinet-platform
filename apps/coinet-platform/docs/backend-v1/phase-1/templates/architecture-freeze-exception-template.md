# Architecture Freeze Exception (AFE) — Template

> **Authority:** Plan 1.4 — Architecture Expansion Freeze Law (`backend-v1-architecture-expansion-freeze-law.md`).
> **Default outcome:** DEFER. Approval is rare and must directly prevent meaningful production-readiness failure.
> **Storage:** `phase-1/records/exceptions/AFE-NNN-short-slug.md`. Must be indexed in `backend-v1-exception.registry.md` and `backend-v1-record-index.registry.md`.

---

## How to Use

1. Copy this template into a new file at `phase-1/records/exceptions/AFE-NNN-short-slug.md` (NNN = next sequential AFE ID).
2. Fill every field. Use `N/A` if not applicable; never leave blank.
3. Submit for approval per Plan 1.4 §11. The default outcome is DEFER.
4. On decision, update this record, the exception registry, and the record index in the same work session.

---

## AFE Template

```text
# AFE-NNN — <Title>

State: DRAFT

## 1. exception_id
AFE-NNN

## 2. proposed_task
<What architectural work is being proposed?>

## 3. why_appears_to_violate_freeze
<Which FRZ-001..FRZ-008 entry and which AFV-A..H violation class
does this trigger?>

## 4. backend_v1_surface_protected
<Which V1-S01..V1-S06 surface does this directly protect?
If NONE, the exception is almost certainly invalid.>

## 5. phase_1_to_3_objective_advanced
<Which Phase 1 / 2 / 3 objective does this directly advance?
If none, the exception is invalid.>

## 6. deferral_harm_if_not_approved
<What real production-readiness harm occurs if this is deferred?
Must be concrete and falsifiable.>

## 7. creates_new_dormant_code
<Yes/No. If Yes, the exception is almost certainly invalid.>

## 8. adds_new_LX_architecture
<Yes/No. If Yes, the exception is almost certainly invalid.>

## 9. estimated_time_cost
<Concrete estimate of engineering time.>

## 10. opportunity_cost
<What admitted Phase 1–3 work does this delay?>

## 11. decision
<APPROVE / REJECT / DEFER>

## 12. approval_authority
<Name / role of decision-maker.>

## 13. decision_date
<YYYY-MM-DD>

## 14. expiry_or_reassessment_trigger
<When this exception expires or must be re-reviewed.>
```

---

## Approval Standard (Plan 1.4 §11.3)

An AFE is approvable only if:

- it directly prevents a meaningful production-readiness failure,
- it cannot reasonably wait until after Phase 3,
- it does not restart open-ended architecture expansion,
- it is bounded in scope,
- it has a clear done definition.

Default outcome: **DEFER**.

---

*This template implements Plan 1.4 §11. Plan 1.4 is authoritative.*
