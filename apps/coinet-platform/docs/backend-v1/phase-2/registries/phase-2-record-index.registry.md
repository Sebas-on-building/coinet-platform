# Phase 2 Record Index Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — Phase-2-focused index of all Phase 2 records)
**Source:** All Phase 2 plan files and `phase-2/records/*`
**Last Updated:** 2026-05-25

> Phase-2-focused view of the program. This registry exists alongside (not in place of) the master record index at `phase-1/registries/backend-v1-record-index.registry.md`. Both registries must stay in sync; the master index is authoritative across phases, this index is authoritative within Phase 2.

---

## Record Type Glossary (Phase 2)

| Type | Name                                | Folder                                                        | Source Plan      |
| ---- | ----------------------------------- | ------------------------------------------------------------- | ---------------- |
| PLAN | Phase 2 Plan document               | `phase-2/`                                                    | Plan 2.0, 2.1, … |
| BTAR | Backend Task Admission Record       | `phase-2/records/backend-task-admission-records/`             | Plan 1.6 §12     |
| AFE  | Architecture Freeze Exception       | `phase-2/records/exceptions/`                                 | Plan 1.4         |
| VSE  | Version-Sprawl Exception            | `phase-2/records/exceptions/`                                 | Plan 1.5 §15     |
| FRP  | Formal Replacement Procedure        | `phase-2/records/formal-replacements/`                        | Plan 1.5 §8      |
| BSCP | Bounded Shadow Comparison           | `phase-2/records/shadow-comparisons/`                         | Plan 1.5 §9      |
| SCR  | Scope Change Request                | `phase-2/records/scope-changes/`                              | Plan 1.7         |
| ADR  | Architecture / Authoritative Decision Record | `phase-2/records/decisions/`                         | Plan 1.7         |
| UDF  | Urgent Defect Record                | `phase-2/records/urgent-defects/`                             | Plan 1.6 §17     |
| P2TG | Phase 2 Transition Gate             | `phase-2/records/decisions/`                                  | Plan 2.0 §12     |
| P2RR | Phase 2 Readiness Review (if filed) | `phase-2/records/decisions/`                                  | Plan 1.11-style  |

---

## Phase 2 Plans

| Record ID | Type | Title                                      | Status | Path                                                  | Created    | Last Updated | Authority           |
| --------- | ---- | ------------------------------------------ | ------ | ----------------------------------------------------- | ---------- | ------------ | ------------------- |
| Plan 2.0 (roadmap) | PLAN | Phase 2 General Roadmap (master navigation) | ACTIVE | `phase-2-general-roadmap.md`                          | 2026-05-25 | 2026-05-25   | P1TG-002 (P2-READY); supersedes nothing — companion to the long-form Plan 2.0 below |
| Plan 2.0 (long-form) | PLAN | Phase 2 General Plan — Live Judgment/Chat/AI Trust | ACTIVE | `phase-2-general-plan-live-judgment-chat-ai-trust.md` | 2026-05-23 | 2026-05-23   | P1TG-002 (P2-READY); detailed execution constitution companion to the roadmap |
| Plan 2.1  | PLAN | Phase 2 Mission and First Principle        | ACTIVE | `phase-2-mission-and-first-principle.md`              | 2026-05-23 | 2026-05-23   | Plan 2.0            |
| Plan 2.2  | PLAN | Phase 2 In-Scope Surfaces and Runtime Boundary | ACTIVE | `phase-2-in-scope-surfaces-and-runtime-boundary.md` | 2026-05-23 | 2026-05-23   | Plans 2.0 + 2.1 + 2.3 |
| Plan 2.3  | PLAN | Phase 2 Out-of-Scope Boundaries            | ACTIVE | `phase-2-out-of-scope-boundaries.md`                  | 2026-05-23 | 2026-05-23   | Plans 2.0 + 2.1     |

---

## Phase 2 BTARs

| Record ID | Type | Title | Status | Path | Created | Last Updated | Mission Trace |
| --------- | ---- | ----- | ------ | ---- | ------- | ------------ | ------------- |
| BTAR-003  | BTAR | Silent fallback removal + JudgmentAvailabilityState | COMPLETED — JUDGMENT_AVAILABILITY_STATE_ACTIVE | `records/backend-task-admission-records/BTAR-003-silent-fallback-judgment-availability.md` | 2026-05-24 | 2026-05-24 | Plan 2.1 §1.2 ("structured judgment availability explicit"; "failure … explicit"; "impossible to silently fake"); TF-001/003/004/008 closed; TF-002 partial; F-3 RESOLVED; F-5 OPEN (filed) |
| BTAR-004  | BTAR | CoinetJudgmentPromptPackage                          | COMPLETED — TYPED_JUDGMENT_PROMPT_PACKAGE_ACTIVE | `records/backend-task-admission-records/BTAR-004-coinet-judgment-prompt-package.md` | 2026-05-25 | 2026-05-25 | Plan 2.1 §1.2; TF-002/003/006/008 (partial) closures at bridge; F-6 filed+resolved; FRP-001 satisfied; 52/52 chat tests pass; zero `src/l*/` diff |
| FRP-001   | FRP  | formatJudgmentForAI → CoinetJudgmentPromptPackage    | COMPLETED | `records/formal-replacements/FRP-001-formatJudgmentForAI-to-CoinetJudgmentPromptPackage.md` | 2026-05-25 | 2026-05-25 | Plan 1.5 §8; Plan 2.0 §3.6 — ASCII formatter retired from authoritative chat bridge role; `formatJudgmentForAI` export retained (not deleted); rollback path documented |
| BTAR-005  | BTAR | AI Output Safety / Expression Gate                   | COMPLETED — AI_OUTPUT_SAFETY_GATE_ACTIVE | `records/backend-task-admission-records/BTAR-005-ai-output-safety-expression-gate.md` | 2026-05-25 | 2026-05-25 | Plan 2.1 §1.2; TF-003/005/006 closed at output layer + TF-001 partial; 7 chat test files, 78/78 tests pass; live gate-intervention logged; consumes BTAR-004 expression rules; zero `src/l*/` diff; no new findings |
| BTAR-006  | BTAR | Bounded Chat Service Extraction                      | COMPLETED — TRUST_CRITICAL_CHAT_SEAMS_EXTRACTED | `records/backend-task-admission-records/BTAR-006-bounded-chat-service-extraction.md` | 2026-05-25 | 2026-05-25 | Plan 2.1 §1.2 ("testable"); TF-007 closure (primary); F-2/F-5 PARTIALLY_RESOLVED at trust-seam level; 24 new 0-mock unit tests prove trust behavior in isolation; 102/102 chat tests pass; behavior preserved; zero `src/l*/` diff |
| BTAR-007  | BTAR | Failure-Path Regression Suite                        | COMPLETED — FAILURE_PATH_REGRESSION_SUITE_ACTIVE | `records/backend-task-admission-records/BTAR-007-failure-path-regression-suite.md` | 2026-05-25 | 2026-05-25 | Plan 2.1 §1.2 + §2.6 + §7.5; 24 regression tests across A–F; 0 module mocks; no `chat/service.ts` import; 10 chat test files, 126/126 tests pass; F-5 → RESOLVED_SEAM_REGRESSION_ORACLE; F-2 unchanged (PARTIALLY_RESOLVED_TRUST_SEAMS); no production source modifications; zero `src/l*/` diff |
| BTAR-008  | BTAR | Runtime Trust Evidence + External Fan-Out Review     | COMPLETED — RUNTIME_TRUST_EVIDENCE_ACTIVE_AND_FANOUT_REVIEWED | `records/backend-task-admission-records/BTAR-008-runtime-trust-evidence-and-external-fanout-review.md` | 2026-05-25 | 2026-05-25 | Plan 2.0 roadmap §12; A: minimal evidence builder + 28 tests (policy `chat-runtime-trust-evidence.v1`, `sensitive_fields_stored: false` literal pin); B: evidence-based fan-out review with 36 services in 11 categories; F-4 → MAPPED_FOR_FUTURE_PROVIDER_HARDENING; 154/154 chat tests pass; pnpm check:backend exits 0; zero L*.X diff; zero provider behavior change |

> BTAR-003 was the first Phase 2 implementation BTAR (COMPLETED 2026-05-24). **All Phase 2 required-set BTARs (003..008) are COMPLETED (2026-05-25)**. **P2TG-001 ACCEPTED — P3-READY (2026-05-25)**: Phase 2 is COMPLETE; Phase 3 is UNLOCKED_FOR_SYNTHETIC_TRUTH_SUITE. Next governance action: admit Plan 3.0 (Backend Judgment Truth Suite Roadmap) and the first Phase 3 BTAR via Plan 1.6.

---

## Phase 2 Decisions (ADR / P2TG / P2RR)

| Record ID | Type | Title | Status | Path | Created | Last Updated |
| --------- | ---- | ----- | ------ | ---- | ------- | ------------ |
| P2TG-001  | P2TG | Phase 2 Transition Gate | ACCEPTED — P3-READY | `records/decisions/P2TG-001-phase-2-transition-gate.md` | 2026-05-25 | 2026-05-25 |

---

## Phase 2 Exceptions (AFE / VSE / SCR / UDF)

| Record ID | Type | Title | Status | Path | Created | Last Updated |
| --------- | ---- | ----- | ------ | ---- | ------- | ------------ |
| —         | —    | (none yet) | — | — | — | — |

---

## Phase 2 Formal Replacements (FRP) and Shadow Comparisons (BSCP)

| Record ID | Type | Title | Status | Path | Created | Last Updated |
| --------- | ---- | ----- | ------ | ---- | ------- | ------------ |
| —         | —    | (none yet) | — | — | — | — |

> Plan 2.0 §3.6 anticipates one FRP under Phase 2: the retirement of `formatJudgmentForAI()` (ASCII prompt stuffer) in favor of `buildCoinetJudgmentPromptPackage()`. That FRP will be filed under BTAR-004; it does not exist yet.

---

## Indexing Workflow (Phase 2)

When a new Phase 2 record is created:

1. Save the record file in the correct `phase-2/records/<subfolder>/` location.
2. Add a row to the appropriate section of this registry.
3. **Also** add a row to `phase-1/registries/backend-v1-record-index.registry.md` (master).
4. If the record is an exception, also add a row to `phase-1/registries/backend-v1-exception.registry.md`.
5. If the record is BTAR-class, also add a row to `phase-2/registries/phase-2-btar.registry.md`.
6. If the record opens or closes a finding, update `phase-2/registries/phase-2-findings.registry.md`.

A record that exists in `records/` but is not indexed in this registry is **non-existent** for governance purposes (per Plan 1.7 §10.3 indexing rule).

---

## Naming Conventions (inherited from Plan 1.7)

```text
BTAR-NNN-short-slug.md
AFE-NNN-short-slug.md
VSE-NNN-short-slug.md
FRP-NNN-short-slug.md
BSCP-NNN-short-slug.md
SCR-NNN-short-slug.md
ADR-NNN-short-slug.md
UDF-NNN-short-slug.md
P2TG-NNN-phase-2-transition-gate.md
P2RR-NNN-phase-2-readiness-review.md
```

NNN is zero-padded, sequential per type, and never reused. A blocked or withdrawn record keeps its ID; a reshaped resubmission gets a new ID and back-references the original in its `request_origin` field. BTAR IDs are global across phases (BTAR-001/002 lived in Phase 1; BTAR-003+ live in Phase 2).

---

## Synchronization Rule

This registry and `phase-1/registries/backend-v1-record-index.registry.md` must show the same row for every Phase 2 record. If they diverge:

- the master registry wins on cross-phase truth,
- this registry wins on Phase-2 detail (mission trace, TF coverage, finding coverage),
- the divergence must be reconciled in the next work session.

---

*This registry is Level 4. Plan 2.0 and Plan 2.1 are the Level 1 and Level 2 Phase 2 governance documents that populate it.*
