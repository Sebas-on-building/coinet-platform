# Scope Change Request (SCR) — Template

> **Authority:** Plan 1.7 §13.5 — Source-of-Truth System. SCR is the formal channel for amending Plans 1.1–1.7 or for promoting deferred items into active scope.
> **Default outcome:** DEFER. Approval requires Plan 1.1 §13 change-control authority.
> **Storage:** `phase-1/records/scope-changes/SCR-NNN-short-slug.md`. Must be indexed in `backend-v1-exception.registry.md` and `backend-v1-record-index.registry.md`.

---

## How to Use

1. Copy this template into `phase-1/records/scope-changes/SCR-NNN-short-slug.md`.
2. Fill every field. `N/A` allowed; blanks rejected.
3. Submit per Plan 1.1 §13 change-control procedure.
4. If approved, the source plan is amended **first**, then the affected registries are updated to match (Plan 1.7 §5.4 / §11.3).
5. Index in the exception registry, record index, and decision log in the same work session.

---

## SCR Template

```text
# SCR-NNN — <Title>

State: DRAFT

## 1. scr_id
SCR-NNN

## 2. proposed_scope_change
<Concrete statement of the change. Examples:
  - "Promote NB-007 dormant L14 systems from DEFERRED to V1-S0X in scope."
  - "Demote V1-S06 from CONDITIONAL_ADMISSIBLE to DEFERRED."
  - "Add a new in-scope surface V1-S07 — <name>."
  - "Amend Plan 1.4 FRZ-007 to allow bounded CIP.1 preparation work
     under explicit conditions.">

## 3. affected_plans
<List of Plan 1.x documents that would change. State the exact sections.>

## 4. affected_registries
<List of registries that would change. Examples:
  - backend-v1-in-scope.registry.md
  - backend-v1-deferred.registry.md
  - backend-v1-blocked.registry.md>

## 5. motivating_evidence
<Concrete evidence motivating the change. Examples:
  - A Phase 3 STOP AND REASSESS outcome.
  - Discovery of a production-readiness gap.
  - APIs being purchased.
  - A reassessment trigger from Plan 1.3 has fired.
This must be falsifiable and grounded in repo-visible evidence.>

## 6. impact_on_phase_1_to_3_program
<How does this change affect the current Phase 1–3 execution?
Does it accelerate, neutralize, or delay any current admitted task?>

## 7. impact_on_blocked_registry
<Does this change unblock anything currently in backend-v1-blocked.registry.md?
If so, which entries?>

## 8. dependencies_on_other_decisions
<Other SCRs, AFEs, VSEs, FRPs, or BSCPs that must be resolved first.>

## 9. proposed_effective_date
<YYYY-MM-DD or trigger condition.>

## 10. rollback_plan
<What happens if this scope change proves wrong after taking effect.
Must be concrete; "we'll figure it out" is rejected.>

## 11. decision
<APPROVE / REJECT / DEFER>

## 12. approval_authority
<Per Plan 1.1 §13 change-control.>

## 13. decision_date
<YYYY-MM-DD>

## 14. resulting_amendments
<After approval: list the exact source-plan edits made and the
exact registry updates synchronized. This field is filled in after
the decision, before closing the record.>
```

---

## Approval Standard

Default: **DEFER**.

Approval requires:

- evidence from the repo (not from chat memory),
- alignment with the Phase 1 first principle (production-convergence),
- compliance with Plan 1.7 §5.4 (registry never amends plans — plans amend first, registries sync),
- a concrete rollback plan,
- change-control authority per Plan 1.1 §13.

---

## Common SCR Patterns

- **Promotion** — Move an NB-NNN deferred item into active scope (requires reassessment trigger to have fired).
- **Demotion** — Move a V1-S0x surface to conditional or deferred (rare; requires strong motivating evidence).
- **Addition** — Add a new V1-S07+ surface (requires demonstration that the existing six surfaces cannot absorb the capability).
- **Amendment** — Modify the wording or scope of an existing freeze / prohibition / admission rule (requires concrete production-readiness motivation).

---

*This template implements Plan 1.7 §13.5. Plan 1.7 and the Plan 1.1 change-control procedure are authoritative.*
