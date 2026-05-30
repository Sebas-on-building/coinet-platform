# Version-Sprawl Exception (VSE) — Template

> **Authority:** Plan 1.5 §15 — Parallel-Service and Version-Sprawl Prohibition.
> **Default outcome:** REJECT or DEFER. Approval requires positive justification against §15.2 / §15.3 and explicit human authority.
> **Storage:** `phase-1/records/exceptions/VSE-NNN-short-slug.md`. Must be indexed in `backend-v1-exception.registry.md` and `backend-v1-record-index.registry.md`.

---

## How to Use

1. Before filing a VSE, confirm that FRP (formal replacement) and BSCP (bounded shadow) do not cleanly apply. VSE is the rare last-resort path.
2. Copy this template into `phase-1/records/exceptions/VSE-NNN-short-slug.md`.
3. Fill every field. `N/A` allowed; blanks rejected.
4. Submit for approval per Plan 1.5 §15. Default outcome is REJECT/DEFER.
5. On decision, update this record, the exception registry, and the record index in the same work session.

---

## VSE Template

```text
# VSE-NNN — <Title>

State: DRAFT

## 1. exception_id
VSE-NNN

## 2. proposed_filename_or_module
<New backend file or module path being proposed.>

## 3. existing_related_service_path
<The existing canonical path this new module relates to.>

## 4. why_in_place_update_insufficient
<Why CSP-A (in-place improvement) cannot solve this.>

## 5. why_proposed_name_necessary
<Why this exact filename / naming pattern is required.>

## 6. why_FRP_or_BSCP_do_not_apply
<Explain why this is not a formal replacement (FRP) and not a
bounded shadow comparison (BSCP).>

## 7. product_surface_affected
<V1-S01..V1-S06>

## 8. phase_1_to_3_justification
<Which Phase 1 / 2 / 3 objective does this advance?>

## 9. deletion_or_expiration_plan
<How and when this new module retires or is removed. There must be
a plan; permanent parallelism is rejected.>

## 10. risk_if_deferred
<What concrete production-readiness risk emerges if this is deferred?>

## 11. decision
<APPROVE / REJECT / DEFER>

## 12. approval_authority
<Name / role of decision-maker. Default: backend program owner.>

## 13. decision_date
<YYYY-MM-DD>

## 14. expiry_or_reassessment_trigger
<When this exception expires or must be re-reviewed.>
```

---

## Decision Standard (Plan 1.5 §15.3)

Default: **REJECT or DEFER**.

Approval requires:

- positive justification against every field above,
- explicit human authority (not convenience approval),
- a concrete expiration / retirement plan.

---

*This template implements Plan 1.5 §15. Plan 1.5 is authoritative.*
