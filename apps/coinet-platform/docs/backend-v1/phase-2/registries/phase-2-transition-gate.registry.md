# Phase 2 Transition Gate Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 2.0 §13)
**Source Plan:** `phase-2/phase-2-general-plan-live-judgment-chat-ai-trust.md` (Plan 2.0)
**Phase:** Phase 2 — Live-Path Trust Hardening
**Last Updated:** 2026-05-25 (P2TG-001 ACCEPTED — P3-READY)

> Tracks every Phase 2 Transition Gate (P2TG-NNN) decision. Mirrors the structure of `phase-1/registries/backend-v1-phase-transition-gate.registry.md` for P1TG records. Append-only.

---

## 1. Transition Gate Concept

The Phase 2 → Phase 3 transition is gated by Plan 2.0 §12 done definition + §13 P2TG-001 criteria:

- All required Phase 2 BTARs (BTAR-003..007) completed
- BTAR-008 completed or explicitly deferred with reassessment trigger
- `pnpm check:backend` exits 0
- BTAR-002 chat smoke test still passes
- All BTAR-007 failure-path test classes A–E pass
- No architecture sprawl, no version sprawl, no Plan 1.3 deferred areas activated
- All Plan 1.10 DI-01..DI-12 preserved

A `P2TG-NNN` record represents one evaluation of these criteria and the resulting decision.

---

## 2. Decision Outcomes Legend

```text
P3-READY                                       All Phase 2 done criteria met; Phase 3 unlocks.
P3-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION   Done criteria met except cosmetic items;
                                                cleanup filed as ADR follow-up.
P3-BLOCKED_BTAR_INCOMPLETE                     One or more required BTAR-003..007 not COMPLETED.
P3-BLOCKED_REGRESSION                          Chat smoke test or check:backend regressed.
P3-BLOCKED_FAILURE_TESTS                       BTAR-007 failure-path tests not passing.
P3-BLOCKED_SCOPE_DRIFT                         New sprawl or deferred-area activation detected.
P3-BLOCKED_DI_VIOLATION                        Plan 1.10 §14.2 DI-01..DI-12 violation observed.
P3-BLOCKED_UNSYNCED_RECORDS                    Registry drift between BTARs and indexes.
```

Only `P3-READY` and `P3-READY_WITH_MINOR_NON_BLOCKING_REMEDIATION` authorize Phase 3 transition.

---

## 3. Re-evaluation Triggers

A fresh `P2TG-NNN` is filed:

- When any required Phase 2 BTAR (BTAR-003..007) reaches `COMPLETED`.
- When BTAR-008 reaches `COMPLETED` or is explicitly DEFERRED with reassessment trigger.
- When Gate A degrades (a registry falls out of sync with a Plan 1.x source).
- On explicit request by the backend program owner.
- At every Quarterly Anti-Staleness Sweep (Plan 1.10 §19).

Each fresh evaluation produces a new P2TG-NNN record. Past records are never overwritten.

---

## 4. Transition Decision Index

| Decision ID | Date | Trigger | BTAR-003 | BTAR-004 | BTAR-005 | BTAR-006 | BTAR-007 | BTAR-008 | Decision | Owner | Record Path |
| ----------- | ---- | ------- | -------- | -------- | -------- | -------- | -------- | -------- | -------- | ----- | ----------- |
| P2TG-001    | 2026-05-25 | All Phase 2 required-set BTARs + optional BTAR-008 reached COMPLETED; backend program owner requested formal phase transition evaluation | COMPLETED | COMPLETED | COMPLETED | COMPLETED | COMPLETED | COMPLETED | **P3-READY** | Backend program owner | `records/decisions/P2TG-001-phase-2-transition-gate.md` |

> **Note:** P2TG-001 was filed and accepted in the same session that completed BTAR-008. All criteria in §1 and §6 are PASS; fresh validation (pnpm check:backend exit 0; 154/154 chat tests across 11 files) is captured in the record itself. P3-READY authorizes only Phase 3 synthetic truth-suite planning + Plan 3.0 admission — it does NOT authorize real API integration, frontend/backend expansion, full L13/L14 migration, or any Plan 1.3 deferred area activation.

---

## 5. Required Fields (per row)

| Field        | Meaning                                                                  |
| ------------ | ------------------------------------------------------------------------ |
| Decision ID  | `P2TG-NNN` zero-padded sequential                                        |
| Date         | YYYY-MM-DD when evaluation was signed                                    |
| Trigger      | What caused this evaluation                                              |
| BTAR-003..008 | Status: COMPLETED / IN_PROGRESS / NOT_STARTED / DEFERRED (BTAR-008 only) |
| Decision     | One of the eight decision outcomes from §2                               |
| Owner        | Approving authority (backend program owner)                              |
| Record Path  | Relative path to the full P2TG record file                                |

---

## 6. Required P2TG Record Sections (per Plan 2.0 §13)

Each P2TG-NNN record should mirror the P1TG-002 structure:

```text
0.  Record identity
1.  Review purpose
2.  Relationship to prior gate
3.  Evidence sources (BTAR records, registries, plans)
4.  Phase 2 BTAR completion verification
5.  Fresh validation proof (pnpm check:backend, smoke test, failure-path tests)
6.  Registry synchronization verification
7.  Scope-drift verification
8.  V1_CORE modification audit (BTARs that touched V1_CORE; each authorized by its BTAR)
9.  Phase 2 findings status verification (F-1..F-4 + any new findings)
10. Plan 1.10 DI-01..DI-12 preservation check
11. Phase 3 unlock conditions
12. Decision matrix
13. Final transition decision
14. Required registry updates
15. Acceptance block
```

---

## 7. Indexing Rule

Every P2TG record file in `phase-2/records/decisions/` must have:

- A row in this registry.
- A row in `phase-1/registries/backend-v1-record-index.registry.md` (cross-phase master index).
- An entry in `phase-1/registries/backend-v1-decision-log.registry.md` (regardless of outcome).

---

## 8. Drift Detection

If a P2TG decision in this registry conflicts with the on-disk state (e.g., the registry says `P3-READY` but a required BTAR is missing or `pnpm check:backend` actually fails), this is itself a sweep-triggering event per Plan 1.10 §19. File an ADR and conduct a fresh P2TG evaluation.

---

## 9. Append-Only

Past rows are never removed. A `P3-BLOCKED_*` decision remains visible alongside the subsequent `P3-READY` decision so the audit trail is complete (mirrors the P1TG-001 → P1TG-002 pattern).

---

## 10. Current Phase 2 Status

```text
Phase 2 governance:               Plan 2.0 long-form + roadmap ACTIVE; Plans 2.1/2.2/2.3 ACTIVE
Phase 2 BTAR admissions:          6 of 6 (BTAR-003..008) ADMITTED
Phase 2 BTAR completions:         6 of 5 required (BTAR-003..007) + 1 of 1 optional (BTAR-008) COMPLETED
Phase 2 findings:                  F-3/F-5/F-6 RESOLVED; F-4 MAPPED_FOR_FUTURE_PROVIDER_HARDENING; F-2 PARTIALLY_RESOLVED_TRUST_SEAMS; F-1 STILL_OPEN (non-blocking)
Phase 2 unlock authority:         P1TG-002 (2026-05-23) — P2-READY
Latest governance event:          P2TG-001 ACCEPTED — P3-READY (2026-05-25)
Phase 2 Status:                   COMPLETE
Phase 3 Status:                   UNLOCKED_FOR_SYNTHETIC_TRUTH_SUITE
Next governance event:            Admit Plan 3.0 (Backend Judgment Truth Suite Roadmap) and first Phase 3 BTAR via Plan 1.6 process
```

---

*This registry is Level 4. Plan 2.0 §12 (done definition) and §13 (P2TG-001 criteria) are authoritative for what each P2TG evaluation must verify. Individual P2TG records (Level 5) are authoritative for specific transition decisions.*
