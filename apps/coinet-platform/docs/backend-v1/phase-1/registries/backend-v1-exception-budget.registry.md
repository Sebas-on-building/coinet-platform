# Backend v1 Exception Budget Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 1.10 §12)
**Source Plan:** `phase-1/backend-v1-exception-and-scope-change-procedure.md` (Plan 1.10)
**Last Updated:** 2026-05-19

> Tracks per-phase exception budget consumption. If this registry and Plan 1.10 disagree, **Plan 1.10 wins** and this registry is corrected.

---

## 1. Budget Allocation (Plan 1.10 §12.2)

| Phase                                     | AFE+VSE+SCR (combined) | FRP        | BSCP | UDF (qualifying)        |
| ----------------------------------------- | ---------------------- | ---------- | ---- | ----------------------- |
| Phase 1 — Stabilization                   | 2                      | 4          | 2    | Unlimited if §17.2-qualifying |
| Phase 2 — Live-path Trustworthiness       | 3                      | 6          | 3    | Unlimited if §17.2-qualifying |
| Phase 3 — Synthetic Truth                 | 1                      | 4          | 2    | Unlimited if §17.2-qualifying |

**Consumption rules (Plan 1.10 §12.3):**
- Each fresh approval decrements the relevant counter by 1.
- Each extension consumes 1.5× (per §11.5 Sunset Surcharge).
- AFE/VSE/SCR/UDF: budget is **replenished** on expiry, withdrawal, or revocation.
- FRP/BSCP: budget is **retained** on expiry / withdrawal / revocation (real implementation effort was consumed).
- Budget does **not** replenish within a phase. Replenishment occurs at phase boundaries.

---

## 2. Phase 1 — Stabilization Consumption

```
Allocated:                AFE+VSE+SCR=2   FRP=4   BSCP=2   UDF=∞
Consumed:                 AFE+VSE+SCR=0   FRP=0   BSCP=0   UDF=0
Remaining:                AFE+VSE+SCR=2   FRP=4   BSCP=2   UDF=∞
Status:                   FULL BUDGET AVAILABLE
```

### 2.1 Phase 1 Approval Log

| Date | Exception ID | Type | Title | EQS | Consumed | Remaining After |
| ---- | ------------ | ---- | ----- | --- | -------- | --------------- |
| _none yet_ |  |  |  |  |  |  |

---

## 3. Phase 2 — Live-path Trustworthiness Consumption

```
Allocated:                AFE+VSE+SCR=3   FRP=6   BSCP=3   UDF=∞
Consumed:                 AFE+VSE+SCR=0   FRP=0   BSCP=0   UDF=0
Remaining:                AFE+VSE+SCR=3   FRP=6   BSCP=3   UDF=∞
Status:                   PHASE NOT YET ACTIVE
```

### 3.1 Phase 2 Approval Log

| Date | Exception ID | Type | Title | EQS | Consumed | Remaining After |
| ---- | ------------ | ---- | ----- | --- | -------- | --------------- |
| _none yet_ |  |  |  |  |  |  |

---

## 4. Phase 3 — Synthetic Truth Consumption

```
Allocated:                AFE+VSE+SCR=1   FRP=4   BSCP=2   UDF=∞
Consumed:                 AFE+VSE+SCR=0   FRP=0   BSCP=0   UDF=0
Remaining:                AFE+VSE+SCR=1   FRP=4   BSCP=2   UDF=∞
Status:                   PHASE NOT YET ACTIVE
```

### 4.1 Phase 3 Approval Log

| Date | Exception ID | Type | Title | EQS | Consumed | Remaining After |
| ---- | ------------ | ---- | ----- | --- | -------- | --------------- |
| _none yet_ |  |  |  |  |  |  |

---

## 5. Cross-Phase Total (Visibility Only)

```
Total approved exceptions all-phases:     0
Total expired / completed / revoked:       0
Currently ACTIVE / EXTENDED:               0
Pending review:                            0
```

This summary is recomputed at every approval / expiry / revocation event and at every quarterly Anti-Staleness Sweep (Plan 1.10 §19).

---

## 6. Budget Exhaustion Procedure (Plan 1.10 §12.4)

When a phase's budget for a type is exhausted:

1. Further requests of that type are **DEFERRED** (not denied) and queued.
2. The backend program owner is notified.
3. An ADR (`records/decisions/ADR-NNN-budget-exhaustion-<phase>-<type>.md`) is filed documenting the exhaustion. This is itself a signal that scope discipline is under pressure.
4. The ADR is appended to `backend-v1-decision-log.registry.md`.

Budget exhaustion does **not** automatically escalate to budget expansion. Expansion requires an SCR amending Plan 1.10 §12.2.

---

## 7. Sunset Surcharge Worked Example

Phase 2 budget for AFE+VSE+SCR is 3.

- **Approve AFE-001 (fresh):** consume 1 → remaining = 2.
- **Approve SCR-001 (fresh):** consume 1 → remaining = 1.
- **Extend AFE-001 (sunset surcharge):** consume 1.5 → remaining = -0.5 → **DEFER pending budget escalation**.

Practical effect: a phase can sustain 3 fresh approvals **or** 2 fresh + 1 extension. Repeated extensions are visibly expensive.

---

## 8. Per-Type Replenishment Rule

| Type | On Expiry | On Withdrawal | On Revocation | On Completion |
| ---- | --------- | ------------- | ------------- | ------------- |
| UDF  | +1 to phase budget | +1 | +1 | +1 |
| AFE  | +1                | +1 | +1 | +1 |
| VSE  | +1                | +1 | +1 | +1 |
| SCR  | +1                | +1 | +1 | +1 |
| FRP  | retained (no refund) | +1 (work not started) | retained | retained |
| BSCP | retained (no refund) | +1 (work not started) | retained | retained |

Rationale: FRP and BSCP involve actual implementation work that consumed engineering effort; retaining the budget unit reflects that real cost. UDF/AFE/VSE/SCR are governance-only exceptions; their budget unit is refunded when the exception ends.

---

## 9. Synchronization

When this registry is updated, also update:

- `backend-v1-exception.registry.md` (per-record index).
- `backend-v1-record-index.registry.md` (master index).
- `backend-v1-decision-log.registry.md` (if exhaustion ADR is filed).

All updates happen in the same work session.

---

## 10. Audit Trail

Append-only. Past entries are never deleted. When a phase closes and the program moves to the next phase:

1. Final consumption snapshot is recorded under the closing phase.
2. Next phase's `Status:` is updated from `PHASE NOT YET ACTIVE` to `FULL BUDGET AVAILABLE`.
3. The transition is logged in `backend-v1-decision-log.registry.md` as an ADR.

Budget from a closed phase does **not** carry over to the next phase. Each phase starts fresh per §12.5.

---

*This registry is Level 4. Plan 1.10 §12 is authoritative for budget allocation, consumption, and replenishment rules.*
