# Phase 3 Transition Gate Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 3.0 §14 done definition + §15 transition to Phase 4)
**Source Plan:** `phase-3/phase-3-backend-judgment-truth-suite-roadmap.md` (Plan 3.0)
**Phase:** Phase 3 — Backend Judgment Truth Suite
**Last Updated:** 2026-05-26 (P3TG-001 ACCEPTED — P4-READY_FOR_PROVIDER_INTEGRATION)

> Tracks every Phase 3 Transition Gate (P3TG-NNN) decision. Mirrors the structure of `phase-2/registries/phase-2-transition-gate.registry.md` for P2TG records. Append-only.

---

## 1. Transition Gate Concept

The Phase 3 → Phase 4 transition is gated by Plan 3.0 §14 (done definition) + §15 (transition to Phase 4):

- All required Phase 3 BTARs (P3-BTAR-001..005) completed
- Conditional P3-BTAR-006A (active synthetic adapter bridge) completed if Path B chosen
- Conditional P3-BTAR-006 (serious judgment flaw remediation) completed if any CRITICAL_FAIL surfaces
- `pnpm check:backend` exits 0
- Full Phase 3 truth-suite tests pass
- Phase 2 chat regression remains green (no Phase 2 regression)
- 0 CRITICAL_FAIL on the active synthetic suite (when ACTIVE_SYNTHETIC_ADAPTER mode is used)
- All dangerous semantic inversions resolved (per Plan 3.0 §11 flaw-severity ladder)
- LAW-01 / LAW-02 / LAW-03 / LAW-04 / INV-01 mechanically preserved
- No architecture freeze violations (zero `src/l*/` diff; zero `services/judgment/` diff if remediation is adapter-only)
- No real-API dependency required for Phase 3 tests

A `P3TG-NNN` record represents one evaluation of these criteria and the resulting decision.

---

## 2. Decision Outcomes Legend

```text
P4-READY_FOR_PROVIDER_INTEGRATION              All Phase 3 done criteria met; Phase 4 unlocks.
P4-READY_WITH_NON_BLOCKING_RESIDUAL            Done criteria met; non-blocking residual finding(s) documented honestly (e.g. P3-F-003 partial).
P4-BLOCKED_INCOMPLETE_PHASE_3_RECORD_SET       One or more required P3-BTAR records not COMPLETED.
P4-BLOCKED_VALIDATION_FAILURE                  pnpm check:backend or test suites regressed.
P4-BLOCKED_DANGEROUS_INVERSION_REMAINS         Any of the 5 dangerous semantic inversions still CRITICAL_FAIL.
P4-BLOCKED_DANGEROUS_FINDING_OPEN              P3-F-002 (5 dangerous semantic inversions) remains OPEN.
P4-BLOCKED_FAKE_PASS_RISK                      LAW-02 violation (oracle-echo cheat / corpus or threshold mod / test loosening).
P4-BLOCKED_SCOPE_DRIFT                         Real-API integration, frontend changes, L13/L14 migration, judgment-engine-v2/final, etc. introduced.
P4-CONDITIONAL_READY                           Avoid; only for minor registry-sync residual when all technical gates pass.
```

Only `P4-READY_FOR_PROVIDER_INTEGRATION` and `P4-READY_WITH_NON_BLOCKING_RESIDUAL` authorize Phase 4 transition.

---

## 3. Re-evaluation Triggers

A fresh `P3TG-NNN` is filed:

- When all required Phase 3 BTARs (P3-BTAR-001..005) reach `COMPLETED`.
- When conditional P3-BTAR-006A and (if triggered) P3-BTAR-006 reach `COMPLETED`.
- When Gate A degrades (a Phase 3 registry falls out of sync with a Plan 3.0 source).
- On explicit request by the backend program owner.
- At every Quarterly Anti-Staleness Sweep (Plan 1.10 §19).

Each fresh evaluation produces a new P3TG-NNN record. Past records are never overwritten.

---

## 4. Transition Decision Index

| Decision ID | Date       | Trigger                                                                                  | P3-BTAR-001..005 | P3-BTAR-006A | P3-BTAR-006 | Active CRITICAL_FAIL | Decision                          | Owner                 | Record Path                                                                |
| ----------- | ---------- | ---------------------------------------------------------------------------------------- | ---------------- | ------------ | ----------- | -------------------: | --------------------------------- | --------------------- | -------------------------------------------------------------------------- |
| P3TG-001    | 2026-05-26 | All Phase 3 implementation BTARs (incl. P3-BTAR-006A bridge + P3-BTAR-006 remediation) reached COMPLETED; backend program owner requested formal phase transition evaluation | COMPLETED        | COMPLETED    | COMPLETED   |                    0 | **P4-READY_FOR_PROVIDER_INTEGRATION** | Backend program owner | `records/decisions/P3TG-001-phase-3-transition-gate.md` |

> **Note:** P3TG-001 was filed and accepted in the same session that completed P3-BTAR-006. All Plan 3.0 §14 done-definition criteria are PASS; fresh validation (pnpm check:backend exit 0; 204/204 Phase 3 truth-suite + 154/154 Phase 2 chat = 358/358 across 18 files) is captured in the record itself. P4-READY authorizes only Phase 4 planning + Plan 4.0 admission + first Phase 4 BTAR admission — it does NOT authorize unbounded provider purchase, frontend redesign, L13/L14 migration, trading execution, or any Plan 1.3 deferred-area activation.

---

## 5. Required Fields (per row)

| Field                | Meaning                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| Decision ID          | `P3TG-NNN` zero-padded sequential                                        |
| Date                 | YYYY-MM-DD when evaluation was signed                                    |
| Trigger              | What caused this evaluation                                              |
| P3-BTAR-001..005     | Status across required BTARs: COMPLETED / IN_PROGRESS / NOT_STARTED      |
| P3-BTAR-006A         | Status of bridge BTAR (COMPLETED if Path B chosen; N/A otherwise)         |
| P3-BTAR-006          | Status of remediation BTAR (COMPLETED if triggered; NOT_TRIGGERED otherwise) |
| Active CRITICAL_FAIL | Count of CRITICAL_FAIL on active synthetic suite at gate-time              |
| Decision             | One of the decision outcomes from §2                                      |
| Owner                | Approving authority (backend program owner)                               |
| Record Path          | Relative path to the full P3TG record file                                |

---

## 6. Required P3TG Record Sections (per Plan 3.0 §14 + §15)

Each P3TG-NNN record should mirror the P2TG-001 structure:

```text
0.  Document identity
1.  Purpose
2.  Phase 3 mission recap
3.  Authority and scope
4.  Required artifact inventory
5.  Required BTAR completion check
6.  Fresh validation evidence
7.  Phase 3 capability checks
8.  Harness truth-suite review
9.  Active synthetic adapter review
10. Serious flaw remediation review
11. Before/after result matrix
12. Dangerous inversion review
13. Findings review
14. LAW-02 / no-cheating verification
15. Out-of-scope / anti-sprawl check
16. Phase 4 readiness assessment
17. Decision
18. What this decision authorizes
19. What this decision does not authorize
20. Registry synchronization
21. Final acceptance block
```

---

## 7. Indexing Rule

Every P3TG record file in `phase-3/records/decisions/` must have:

- A row in this registry.
- A row in `phase-3/registries/phase-3-record-index.registry.md` (per-phase index).
- A row in `phase-1/registries/backend-v1-record-index.registry.md` (cross-phase master index).
- An entry in `phase-1/registries/backend-v1-decision-log.registry.md` (regardless of outcome).

---

## 8. Drift Detection

If a P3TG decision in this registry conflicts with the on-disk state (e.g. the registry says `P4-READY_FOR_PROVIDER_INTEGRATION` but a required BTAR is missing or `pnpm check:backend` actually fails), this is itself a sweep-triggering event per Plan 1.10 §19. File an ADR and conduct a fresh P3TG evaluation.

---

## 9. Append-Only

Past rows are never removed. A `P4-BLOCKED_*` decision remains visible alongside any subsequent `P4-READY_*` decision so the audit trail is complete (mirrors the P1TG-001 → P1TG-002 pattern).

---

## 10. Current Phase 3 Status

```text
Phase 3 governance:               Plan 3.0 ACTIVE (created 2026-05-26)
Phase 3 BTAR admissions:          5 of 5 required (P3-BTAR-001..005) + 1 bridge (P3-BTAR-006A) + 1 conditional (P3-BTAR-006)
Phase 3 BTAR completions:         5 of 5 required + 1 bridge + 1 conditional — ALL COMPLETED
Phase 3 findings:                  P3-F-001 RESOLVED; P3-F-002 RESOLVED; P3-F-003 PARTIALLY_RESOLVED_NON_BLOCKING (5 non-dangerous coverage residuals)
Phase 3 unlock authority:         P2TG-001 (2026-05-25) — P3-READY
Latest governance event:          P3TG-001 ACCEPTED — P4-READY_FOR_PROVIDER_INTEGRATION (2026-05-26)
Phase 3 Status:                   COMPLETE
Phase 4 Status:                   UNLOCKED_FOR_PROVIDER_INTEGRATION
Next governance event:            Admit Plan 4.0 (Provider Integration and Normalized Signal Schema Roadmap) + first Phase 4 BTAR via Plan 1.6 process
```

---

*This registry is Level 4. Plan 3.0 §14 (done definition) and §15 (transition to Phase 4) are authoritative for what each P3TG evaluation must verify. Individual P3TG records (Level 5) are authoritative for specific transition decisions.*
