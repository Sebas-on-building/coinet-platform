# Backend v1 Deferred Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 1.3)
**Source Plan:** `phase-1/backend-v1-non-blocker-and-non-scope-registry.md` (Plan 1.3)
**Last Updated:** 2026-05-19

> Compact operational view of the negative backend v1 scope (NB-001..NB-010). If this registry and Plan 1.3 disagree, **Plan 1.3 wins** and this registry is corrected.

---

## Deferred Entries

| ID     | Area                                                | Classification                         | Reassessment Trigger                 |
| ------ | --------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| NB-001 | Strategy Lab backend                                | NS-E Future Product Program            | Post-backend-v1 / private beta near  |
| NB-002 | Chart Canvas backend                                | NS-E Future Product Program            | Post-backend-v1                      |
| NB-003 | Plugin systems                                      | NS-E Future Product Program            | Post-backend-v1                      |
| NB-004 | Experimental agent builders                         | NS-A Explicitly Deferred               | Post-backend-v1                      |
| NB-005 | Full calibration proposal ecosystem                 | NS-D Architecturally Valid, Not Now    | Post-v1 / post-Phase-3               |
| NB-006 | Full CIP.1 unified architecture                     | NS-F Reassess After Phase 3            | After Phase 3 green                  |
| NB-007 | Dormant L14 systems (full operationalization)       | NS-D / NS-C Conditional / Not Required | Only if directly required by v1 path |
| NB-008 | Deep real API/provider integration before purchase  | NS-F Reassess After Purchase           | After APIs purchased + Phase 3       |
| NB-009 | Advanced alert delivery ecosystem                   | NS-C / NS-E Conditional / Future       | After core backend stable            |
| NB-010 | Broad backend cleanup not required for Phases 1–3   | NS-B / NS-F Reassess After Phase 3     | After Phase 3                        |

---

## Classification Class Definitions

- **NS-A — EXPLICITLY_DEFERRED** — Not active now; should not consume v1 completion time.
- **NS-B — NON-BLOCKING_EXISTING_SURFACE** — May exist in code, but completion/polish/expansion not required for v1.
- **NS-C — CONDITIONAL_ONLY_IF_ALREADY_SUPPORTABLE** — May remain if truthful and low-cost.
- **NS-D — ARCHITECTURALLY_VALID_BUT_NOT_REQUIRED_FOR_V1** — Valid long-term, not required for ship.
- **NS-E — FUTURE_PRODUCT_PROGRAM** — Belongs to a future product phase.
- **NS-F — REASSESS_ONLY_AFTER_PHASE_3** — Decision deferred until Phases 1–3 complete.

## Operational Rule

**Deferred ≠ rejected.** Deferred means *not now*. Items may be reassessed at their named trigger.

Promotion of any NB-NNN entry from deferred to active requires:

1. A BTAR documenting the request.
2. An SCR amending Plan 1.3 if the entry is being removed from non-scope.
3. Approval per Plan 1.1 §13 change-control.
4. Update to Plan 1.3 first.
5. Then this registry is updated.

## Borderline Cases

For ambiguous tasks that partially touch a deferred area, see Plan 1.6 §11 (edge case decomposition: minimal now-version + deferred later-version).

## Synchronization

When Plan 1.3 changes, this registry is updated in the same work session and indexed in `backend-v1-record-index.registry.md`.

---

*This registry is Level 4. Plan 1.3 is authoritative.*
