# Phase 2 BTAR Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 2.0)
**Source Plan:** `phase-2/phase-2-general-plan-live-judgment-chat-ai-trust.md` (Plan 2.0)
**Phase:** Phase 2 — Live-Path Trust Hardening
**Last Updated:** 2026-05-25

> Tracks every Phase 2 BTAR (BTAR-003..008+) from admission through completion. Mirrors the structure of `phase-1/registries/backend-v1-active-task.registry.md` for Phase 1 BTARs. The Phase 1 master `record-index.registry.md` continues to index every record (Phase 1 and Phase 2) for cross-phase auditability.

---

## 1. Indexing Rule

Every Phase 2 BTAR record file in `phase-2/records/backend-task-admission-records/` must have:

1. A row in this registry (the Phase 2 BTAR-specific view).
2. A row in `phase-1/registries/backend-v1-record-index.registry.md` (the cross-phase master index).
3. (On completion) An entry in `phase-1/registries/backend-v1-decision-log.registry.md`.

Per Plan 1.7 §10.3, no record exists outside the index.

---

## 2. Phase 2 BTAR Index

| Task ID  | Title | TAD | Target | Owner | Status | Source BTAR | Completion Proof |
| -------- | ----- | --- | ------ | ----- | ------ | ----------- | ---------------- |
| BTAR-003 | Silent fallback removal + JudgmentAvailabilityState | TAD-A | P2-S01 (`api/chat/service.ts`) + P2-S10 (new helpers) + P2-S08 (new tests) | Backend program owner | COMPLETED — JUDGMENT_AVAILABILITY_STATE_ACTIVE | `BTAR-003-silent-fallback-judgment-availability.md` | §18.3: check:backend exits 0; helper 25/25 pass; failure-path 1/1 pass; smoke 2/2 pass. F-3 closed; F-5 filed |
| BTAR-004 | CoinetJudgmentPromptPackage | TAD-A | P2-S01 (`api/chat/service.ts` bridge region) + P2-S09 (new package files) + P2-S08 (new + harden tests) | Backend program owner | COMPLETED — TYPED_JUDGMENT_PROMPT_PACKAGE_ACTIVE | `BTAR-004-coinet-judgment-prompt-package.md` (§18) | check:backend exits 0; 5 chat test files, 52/52 tests pass; FRP-001 COMPLETED; F-6 newly filed + resolved (investigation-service live-call path mocked) |
| BTAR-005 | AI Output Safety / Expression Gate | TAD-A | P2-S01 (`api/chat/service.ts` final-output region) + P2-S11 (new gate files) + P2-S08 (new tests) | Backend program owner | COMPLETED — AI_OUTPUT_SAFETY_GATE_ACTIVE | `BTAR-005-ai-output-safety-expression-gate.md` (§17) | check:backend exits 0; 7 chat test files, 78/78 tests pass; live gate-intervention logged on UNAVAILABLE branch; TF-003/005/006 closed at output layer + TF-001 partial; no new findings |
| BTAR-006 | Bounded Chat Service Extraction | TAD-A | P2-S01 (`api/chat/service.ts` trust regions) + P2-S12 (new chat-trust-context.ts + chat-ai-response-finalizer.ts) + P2-S08 (new 0-mock unit tests) | Backend program owner | COMPLETED — TRUST_CRITICAL_CHAT_SEAMS_EXTRACTED | `BTAR-006-bounded-chat-service-extraction.md` (§14) | check:backend exits 0; 9 chat test files, 102/102 tests pass; 14+10 new seam tests use 0 module mocks and do NOT import chat/service.ts; F-2/F-5 → PARTIALLY_RESOLVED at trust-seam level; behavior preserved; TF-007 primary closure |
| BTAR-007 | Failure-Path Regression Suite | TAD-A | P2-S08 only (new `chat-failure-regression.test.ts` + `fixtures/chat-failure-fixtures.ts`) | Backend program owner | COMPLETED — FAILURE_PATH_REGRESSION_SUITE_ACTIVE | `BTAR-007-failure-path-regression-suite.md` (§13) | check:backend exits 0; 10 chat test files, 126/126 tests pass; 24 new regression tests use 0 module mocks; F-5 upgraded to RESOLVED_SEAM_REGRESSION_ORACLE; F-2 unchanged at PARTIALLY_RESOLVED_TRUST_SEAMS; no production source touched; regression-detection for TF-001..008 |
| BTAR-008 | Runtime Trust Evidence + External Fan-Out Review | TAD-A | P2-S01 (`api/chat/service.ts` evidence log) + P2-S12 (new `chat-runtime-trust-evidence.ts` + `.types.ts`) + P2-S08 (new unit tests) + docs (`chat-external-fanout-review.md`) | Backend program owner | COMPLETED — RUNTIME_TRUST_EVIDENCE_ACTIVE_AND_FANOUT_REVIEWED | `BTAR-008-runtime-trust-evidence-and-external-fanout-review.md` (§13) | check:backend exits 0; 11 chat test files, 154/154 tests pass; 28 evidence tests use 0 module mocks; sensitive_fields_stored literal `false` + assertion enforced; fan-out review covers 36 services in 11 categories; F-4 → MAPPED_FOR_FUTURE_PROVIDER_HARDENING; zero L*.X diff; zero provider behavior change |

> **Note:** Plan 2.0 (this Phase 2 master plan) does NOT itself admit any BTAR. Phase 2 BTARs (BTAR-003..008) are appended below as they are admitted through the Plan 1.6 process. The first expected admission is BTAR-003 (silent fallback removal + judgment availability states, per Plan 2.0 §11.1).

---

## 3. Expected Phase 2 BTAR Sequence (per Plan 2.0 §11)

| BTAR     | Title                                                | Required for Phase 2 done? | Findings addressed |
| -------- | ---------------------------------------------------- | -------------------------- | ------------------ |
| BTAR-003 | Silent fallback removal + judgment availability states | **Required**                | F-1, F-3 |
| BTAR-004 | CoinetJudgmentPromptPackage (typed prompt package)   | **Required (FRP)**          | replaces formatJudgmentForAI |
| BTAR-005 | AI output safety and expression gate                  | **Required (DI-01 pin)**    | output safety |
| BTAR-006 | Bounded chat service extraction                       | **Required**                | F-2 testability seam |
| BTAR-007 | Failure-path test suite (classes A–E)                  | **Required**                | regression coverage |
| BTAR-008 | External fan-out reliability review                   | Optional / deferable        | F-4 |

These are **candidate** BTARs. Each must go through Plan 1.6 admission individually (BTAR template, eight-question gate, scope mapping, etc.).

---

## 4. Required Fields (per entry)

| Field            | Meaning                                                    |
| ---------------- | ---------------------------------------------------------- |
| Task ID          | BTAR-NNN identifier                                        |
| Title            | Short, declarative title                                   |
| TAD              | TAD-A / TAD-B / TAD-C / TAD-D / TAD-E (Plan 1.6 §6.1)      |
| Target           | V1 surface(s) the BTAR primarily affects                   |
| Owner            | Person / system responsible                                |
| Status           | Not started / In progress / Done / Blocked / Withdrawn      |
| Source BTAR      | Relative path under `phase-2/records/backend-task-admission-records/` |
| Completion Proof | Summary of completion evidence (or "(pending)" pre-completion) |

---

## 5. Synchronization

When this registry is updated, also update:

- `phase-1/registries/backend-v1-record-index.registry.md` (master cross-phase index)
- `phase-1/registries/backend-v1-decision-log.registry.md` (on BTAR completion)
- `phase-2/registries/phase-2-findings.registry.md` (if a BTAR resolves a finding, mark it RESOLVED there)
- `phase-2/registries/phase-2-transition-gate.registry.md` (when P2TG-001 is filed)

All updates happen in the same work session.

---

## 6. Phase 2 Status Summary

```text
Phase 2 BTARs admitted:      6 (BTAR-003..008)
Phase 2 BTARs completed:     6 (BTAR-003..008)
Phase 2 BTARs in progress:   0
Phase 2 unlock authority:    P1TG-002 (2026-05-23) — P2-READY
Plan 2.0 acceptance:         ACCEPTED (work in progress)
Next governance action:      File P2TG-001 — Phase 2 Trust Gate (rollout claim aggregation across BTAR-003..008)
```

---

*This registry is Level 4. Plan 2.0 is authoritative for Phase 2 mission, scope, and BTAR sequence. Plan 1.6 is authoritative for admission process.*
