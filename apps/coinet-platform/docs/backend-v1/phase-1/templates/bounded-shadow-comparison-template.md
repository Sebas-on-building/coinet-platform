# Bounded Shadow Comparison Procedure (BSCP) — Template

> **Authority:** Plan 1.5 §9 — Parallel-Service and Version-Sprawl Prohibition.
> **Use when:** A temporary comparison path is needed before deciding whether to replace the canonical path. For decided replacements, use FRP instead.
> **Storage:** `phase-1/records/shadow-comparisons/BSCP-NNN-short-slug.md`. Must be indexed in `backend-v1-exception.registry.md` and `backend-v1-record-index.registry.md`.

---

## How to Use

1. Copy this template into `phase-1/records/shadow-comparisons/BSCP-NNN-short-slug.md`.
2. Fill all 14 fields. Incomplete BSCPs are rejected without review.
3. Field 14 (`user_facing_emission_status`) **must** be `NOT_USER_FACING`. This is a hard pin.
4. The shadow must have an expiry condition and explicit promotion / rejection criteria. Shadows without expiry are automatically rejected (§9.3).
5. On decision (promotion, rejection, expiry), update this record, the exception registry, the record index, and any relevant other registries in the same work session.

---

## BSCP Template

```text
# BSCP-NNN — <Title>

State: DRAFT

## 1. shadow_id
BSCP-NNN

## 2. capability_being_compared
<Which PSC-001..PSC-010 family is being shadowed?>

## 3. canonical_active_path
<Exact path of the existing canonical implementation.>

## 4. shadow_candidate_path
<Exact path of the shadow implementation.>

## 5. why_shadowing_is_necessary
<Why comparison is needed before making a replacement decision.>

## 6. why_direct_replacement_not_yet_made
<Why FRP cannot be used today.>

## 7. inputs_shared_between_canonical_and_shadow
<Exact input contract both implementations consume.>

## 8. outputs_compared
<Which outputs are compared between canonical and shadow.>

## 9. metrics_or_criteria_of_evaluation
<Concrete metrics or pass/fail criteria.>

## 10. maximum_time_or_window_of_shadow_existence
<Hard expiry: a date, a run count, or a metric threshold.
Shadows without expiry are rejected (§9.3).>

## 11. promotion_criteria
<Concrete conditions that promote the shadow to canonical.
Promotion is explicit, never implicit.>

## 12. rejection_criteria
<Concrete conditions that reject the shadow and remove it.>

## 13. deletion_or_archival_rule_after_decision
<What happens to the shadow path file after promotion or rejection.>

## 14. user_facing_emission_status
NOT_USER_FACING

(This field is a hard pin per Plan 1.5 §9.2 / §9.3. Any other value
rejects the BSCP automatically.)
```

---

## Shadow Law (Plan 1.5 §9.3)

A shadow path is valid only if:

- it is not user-facing by default (`NOT_USER_FACING`),
- it does not silently become canonical (promotion is explicit),
- it has an expiry condition,
- it has promotion/rejection criteria,
- it exists to reach a decision, not to preserve ambiguity.

---

## Worked Example (Plan 1.5 §9.4)

```text
Run a shadow L13-governed explanation path against the current AI prompt path,
capture differences across the AJP.1 corpus,
do not emit shadow outputs to users,
expire shadow after 4 weeks or 200 corpus runs (whichever first),
promote only after explicit evaluation against named metrics.
```

---

## FRP vs. BSCP Quick Reference

| Question                       | FRP                                  | BSCP                                       |
| ------------------------------ | ------------------------------------ | ------------------------------------------ |
| Decision already made?         | Yes — to replace                     | No — comparison needed first               |
| Old path                       | Scheduled for retirement             | Remains canonical during shadow            |
| New path                       | Becomes canonical on completion      | May be promoted or rejected                |
| User-facing during procedure?  | Old until cutover                    | Old only; shadow `NOT_USER_FACING`         |
| Expiry                         | Cutover + retirement                 | Time window + metric                       |
| Default outcome if no decision | New path takes over per plan         | Shadow is rejected and removed             |

---

*This template implements Plan 1.5 §9. Plan 1.5 is authoritative.*
