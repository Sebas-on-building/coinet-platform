# Phase 3 Record Index Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 3.0)
**Source Plan:** `phase-3/phase-3-backend-judgment-truth-suite-roadmap.md` (Plan 3.0)
**Phase:** Phase 3 — Backend Judgment Truth Suite
**Last Updated:** 2026-05-26 (P3TG-001 ACCEPTED — P4-READY_FOR_PROVIDER_INTEGRATION)

> Per-phase record index for Phase 3. Mirrors the structure of `phase-2/registries/phase-2-record-index.registry.md`. The Phase 1 cross-phase master index (`phase-1/registries/backend-v1-record-index.registry.md`) continues to be the authoritative cross-phase index.

---

## 1. Indexing Rule

Every Phase 3 record (Plan 3.0, P3-BTAR-NNN, P3TG-NNN, FRP-NNN, ADR-NNN, etc.) must appear:

1. In this Phase 3 index.
2. In the Phase 1 cross-phase master index (`phase-1/registries/backend-v1-record-index.registry.md`).
3. (On completion / acceptance) In `phase-1/registries/backend-v1-decision-log.registry.md`.

---

## 2. Phase 3 Plans

| Plan ID  | Title                                            | Status | Path                                                                                | Created    | Last Updated |
| -------- | ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------- | ---------- | ------------ |
| Plan 3.0 | Backend Judgment Truth Suite Roadmap             | ACTIVE | `phase-3-backend-judgment-truth-suite-roadmap.md`                                   | 2026-05-26 | 2026-05-26   |

---

## 3. Phase 3 BTARs

| Task ID | Title | Status | Path | Created | Last Updated |
| ------- | ----- | ------ | ---- | ------- | ------------ |
| P3-BTAR-001 | Synthetic Episode Contract and Fixture System | COMPLETED — SYNTHETIC_EPISODE_CONTRACT_ACTIVE | `records/backend-task-admission-records/P3-BTAR-001-synthetic-episode-contract-and-fixtures.md` | 2026-05-26 | 2026-05-26 |
| P3-BTAR-002 | Judgment Truth Runner | COMPLETED — JUDGMENT_TRUTH_RUNNER_ACTIVE | `records/backend-task-admission-records/P3-BTAR-002-judgment-truth-runner.md` | 2026-05-26 | 2026-05-26 |
| P3-BTAR-003 | Synthetic Episode Corpus | COMPLETED — SYNTHETIC_EPISODE_CORPUS_ACTIVE | `records/backend-task-admission-records/P3-BTAR-003-synthetic-episode-corpus.md` | 2026-05-26 | 2026-05-26 |
| P3-BTAR-004 | Semantic Assertion Engine | COMPLETED — SEMANTIC_ASSERTION_ENGINE_ACTIVE | `records/backend-task-admission-records/P3-BTAR-004-semantic-assertion-engine.md` | 2026-05-26 | 2026-05-26 |
| P3-BTAR-005 | Full Truth Suite Execution and Report | COMPLETED — FULL_TRUTH_SUITE_EXECUTION_REPORT_ACTIVE | `records/backend-task-admission-records/P3-BTAR-005-full-truth-suite-execution-and-report.md` | 2026-05-26 | 2026-05-26 |
| P3-BTAR-006A | Active Synthetic Judgment Adapter | COMPLETED — ACTIVE_SYNTHETIC_ADAPTER_FAILURES_REVEALED | `records/backend-task-admission-records/P3-BTAR-006A-active-synthetic-judgment-adapter.md` | 2026-05-26 | 2026-05-26 |
| P3-BTAR-006 | Serious Judgment Flaw Remediation | COMPLETED — PARTIAL_REMEDIATION_RESIDUALS_DOCUMENTED | `records/backend-task-admission-records/P3-BTAR-006-serious-judgment-flaw-remediation.md` | 2026-05-26 | 2026-05-26 |

> P3-BTAR-006A is the bridge BTAR that connected the active product `produceJudgment()` engine to the Phase 3 synthetic truth-suite under the no-provider / no-AI / no-DB / no-env rule. It honestly surfaced **18 / 18 CRITICAL_FAIL** against the corpus and filed 3 OPEN findings (P3-F-001 / P3-F-002 / P3-F-003). **P3-BTAR-006 remediation COMPLETED** — adapter-only fixes (projection enrichment + risk-override rules using synthetic input + active output, NEVER oracle) reduced outcome to **0 / 18 CRITICAL_FAIL**, resolved all 5 dangerous inversions (SYN-003 / SYN-007 / SYN-009 / SYN-012 / SYN-016), avg score 1 → 81; P3-F-001 / P3-F-002 RESOLVED; P3-F-003 PARTIALLY_RESOLVED_NON_BLOCKING (5 non-dangerous coverage residuals). Active engine source UNCHANGED (zero `src/services/judgment/` diff). **P3TG-001 UNBLOCKED**. The next governance event is **P3TG-001 — Phase 3 Transition Gate**.

---

## 4. Phase 3 Decisions (ADR / P3TG / P3RR)

| Record ID | Type | Title | Status | Path | Created | Last Updated |
| --------- | ---- | ----- | ------ | ---- | ------- | ------------ |
| P3TG-001 | P3TG | Phase 3 Transition Gate | ACCEPTED — P4-READY_FOR_PROVIDER_INTEGRATION | `records/decisions/P3TG-001-phase-3-transition-gate.md` | 2026-05-26 | 2026-05-26 |

> The terminal Phase 3 decision will be **P3TG-001 — Phase 3 Transition Gate**, filed after P3-BTAR-001..005 (and P3-BTAR-006 if needed) reach COMPLETED.

---

## 5. Phase 3 Formal Replacements (FRP)

| FRP ID | Title | Status | Path | Created | Last Updated |
| ------ | ----- | ------ | ---- | ------- | ------------ |
| _none yet_ |  |  |  |  |  |

---

## 6. Cross-Phase Status Snapshot

```text
Phase 1 Status:               COMPLETE (P1TG-002 2026-05-23)
Phase 2 Status:               COMPLETE (P2TG-001 2026-05-25 — P3-READY)
Phase 3 Status:               COMPLETE (P3TG-001 2026-05-26 — P4-READY_FOR_PROVIDER_INTEGRATION)
Phase 4 Status:               UNLOCKED_FOR_PROVIDER_INTEGRATION (admit Plan 4.0 next)
```

---

*This registry is Level 4. Plan 3.0 is authoritative for what each Phase 3 record must contain. Append-only.*
