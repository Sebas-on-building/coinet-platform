# Backend v1 Phase Transition Gate Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 1.12)
**Source Plan:** `phase-1/backend-v1-phase-1-done-definition-and-transition-gate.md` (Plan 1.12)
**Last Updated:** 2026-05-19

> Tracks every Phase Transition Gate (P1TG) decision across the program's lifetime. Each P1TG record file under `records/decisions/P1TG-NNN-*.md` has a row in this registry. Append-only.

---

## 1. Transition Gate Concept

The Phase 1 → Phase 2 transition is gated by two layers (Plan 1.12 §5):

- **Gate A — Governance Completion** (11 GOV checks; passes iff P1RR is PASS).
- **Gate B — Stabilization Completion** (5 sub-checks B1..B5).

A `P1TG-NNN` record represents one evaluation of both gates and the resulting decision.

---

## 2. Decision Outcomes Legend

```text
P2-READY                                       Both gates PASS; transition authorized.
P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION   Both gates PASS except for cosmetic
                                                drift that does not affect scope,
                                                build, CI, or smoke truth.
P2-BLOCKED_BUILD_TRUTH                         B1 FAIL.
P2-BLOCKED_CI_TRUTH                            B2 FAIL.
P2-BLOCKED_SMOKE_TEST                          B3 FAIL.
P2-BLOCKED_SCOPE_DRIFT                         B5 FAIL or §9.3 side-quest detected.
P2-BLOCKED_UNCLOSED_TASKS                      Active Phase 1 BTARs not yet COMPLETED.
P2-BLOCKED_UNSYNCED_RECORDS                    B4 FAIL.
```

Only `P2-READY` and `P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION` authorize Phase 2 transition.

---

## 3. Re-evaluation Triggers

A fresh `P1TG-NNN` is filed:

- When any Phase 1 stabilization BTAR (BTAR-001, BTAR-002, CI-truth BTAR) reaches `COMPLETED`.
- When Gate A degrades (e.g., a registry falls out of sync with a source plan).
- When the active task registry changes in a way that affects §9.3 or B5.
- On explicit request by the backend program owner.
- At every Quarterly Anti-Staleness Sweep (Plan 1.10 §19).

Each fresh evaluation produces a new P1TG-NNN record. Past records are never overwritten.

---

## 4. Transition Decision Index

| Decision ID | Date       | Trigger                                | Gate A | Gate B    | Decision                        | Owner                  | Record Path                                                  |
| ----------- | ---------- | -------------------------------------- | ------ | --------- | ------------------------------- | ---------------------- | ------------------------------------------------------------ |
| P1TG-001    | 2026-05-19 | Plan 1.12 establishment (initial eval) | PASS   | PENDING   | **P2-BLOCKED_UNCLOSED_TASKS**   | Backend program owner  | `records/decisions/P1TG-001-phase-1-transition-gate.md`      |
| P1TG-002    | 2026-05-23 | All four Phase 1 stabilization BTARs COMPLETED (BTAR-001, BTAR-CI-001, BTAR-TC-001, BTAR-002) | PASS   | PASS      | **P2-READY** ✅                  | Backend program owner  | `records/decisions/P1TG-002-phase-1-transition-gate.md`      |

---

## 5. Required Fields (per row)

| Field        | Meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| Decision ID  | `P1TG-NNN` zero-padded sequential                                        |
| Date         | YYYY-MM-DD when evaluation was signed                                    |
| Trigger      | What caused this evaluation                                              |
| Gate A       | PASS / REMEDIATION_REQUIRED                                              |
| Gate B       | PASS (STABILIZATION_CERTIFIED) / PENDING / REMEDIATION_REQUIRED          |
| Decision     | One of the eight decision outcomes                                       |
| Owner        | Approving authority                                                       |
| Record Path  | Relative path to the full P1TG record file                                |

---

## 6. Indexing Rule

Every P1TG record file in `records/decisions/` must have a matching row here **and** a matching row in `backend-v1-record-index.registry.md`. The decision-log registry also receives an entry for every transition decision (whether READY or BLOCKED).

---

## 7. Drift Detection

If a P1TG decision in this registry conflicts with the on-disk state (for example, the registry says `P2-READY` but a required stabilization BTAR is missing or PR-merged code violates B5), this is itself a sweep-triggering event per Plan 1.10 §19. File an ADR and conduct a fresh P1TG evaluation.

---

## 8. Append-Only

Past rows are never removed. A `P2-BLOCKED_*` decision remains visible alongside the subsequent `P2-READY` decision so the audit trail is complete.

---

## 9. Synchronization

When a P1TG record is filed:

1. Create the record file at `records/decisions/P1TG-NNN-phase-1-transition-gate.md`.
2. Add a row to this registry.
3. Add a row to `backend-v1-record-index.registry.md`.
4. Append to `backend-v1-decision-log.registry.md` regardless of outcome (the audit trail records blocked transitions as well as ready transitions).
5. If decision is `P2-READY` or `P2-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION`, also update Phase 2 readiness signaling in any downstream registry (none yet defined, but reserved for Phase 2 governance).

All updates happen in the same work session.

---

## 10. Current Phase Status

```text
Phase 1 governance:          CERTIFIED        (P1RR-001 PASS)
Phase 1 stabilization:       CERTIFIED        (B1 + B2 + B2.5 + B3 + B4 + B5 all PASS)
Phase 1 overall:             COMPLETE         (per P1TG-002, 2026-05-23)
Phase 2 unlock:              UNLOCKED         (per P1TG-002 decision: P2-READY)
Phase 2 mission:             Make the live judgment/chat/AI path trustworthy
Next governance event:       Admit first Phase 2 BTAR via Plan 1.6 process
                              (likely BTAR-003: silent fallback removal,
                               addressing F-3 from BTAR-002)
Phase 2 candidate BTARs:     BTAR-003, BTAR-004, BTAR-005, BTAR-006, BTAR-007
                              (per Plan 1.12 §14.2; admission required individually)
Phase 3 (synthetic truth):   Still gated behind Phase 2 completion
```

---

*This registry is Level 4. Plan 1.12 is authoritative for the gate definition; individual P1TG records (Level 5) are authoritative for specific evaluations.*
