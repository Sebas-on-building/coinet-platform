# Phase 3 Decision Records

This folder holds Phase 3 decision records: ADRs, P3RR-NNN (Phase 3 Reconciliation Records), and P3TG-NNN (Phase 3 Transition Gates).

## Expected Decisions

```text
P3TG-001 — Phase 3 Transition Gate                  (final decision: P4-READY_FOR_PROVIDER_INTEGRATION or P4-BLOCKED)
ADR-NNN  — Architecture Decision Records             (if needed; filed via Plan 1.6 / 1.10 process)
P3RR-NNN — Phase 3 Reconciliation Records            (if needed; mirrors P1RR / P2RR convention)
```

## Naming Convention

```text
P3TG-NNN-<kebab-case-title>.md
ADR-NNN-<kebab-case-title>.md
P3RR-NNN-<kebab-case-title>.md
```

## Indexing

Every record in this folder MUST appear in:

1. `phase-3/registries/phase-3-record-index.registry.md` (Phase 3 master index).
2. `phase-1/registries/backend-v1-record-index.registry.md` (cross-phase master index).
3. `phase-3/registries/phase-3-decision-log.registry.md` (Phase 3 decision log).
4. `phase-1/registries/backend-v1-decision-log.registry.md` (cross-phase decision log).

## Authority

Plan 3.0 §14 (done definition) and §15 (transition to Phase 4) are authoritative for what P3TG-001 must verify.
