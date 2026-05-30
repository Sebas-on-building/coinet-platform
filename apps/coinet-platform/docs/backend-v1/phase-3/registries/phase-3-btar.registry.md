# Phase 3 BTAR Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — derived from Plan 3.0)
**Source Plan:** `phase-3/phase-3-backend-judgment-truth-suite-roadmap.md` (Plan 3.0)
**Phase:** Phase 3 — Backend Judgment Truth Suite
**Last Updated:** 2026-05-26 (P3TG-001 ACCEPTED — P4-READY_FOR_PROVIDER_INTEGRATION)

> Tracks every Phase 3 BTAR (P3-BTAR-001+) from admission through completion. Mirrors the structure of `phase-2/registries/phase-2-btar.registry.md` for Phase 2 BTARs. The Phase 1 master `record-index.registry.md` continues to index every record (Phase 1, Phase 2, and Phase 3) for cross-phase auditability.

---

## 1. Indexing Rule

Every Phase 3 BTAR record file in `phase-3/records/backend-task-admission-records/` must have:

1. A row in this registry (the Phase 3 BTAR-specific view).
2. A row in `phase-1/registries/backend-v1-record-index.registry.md` (the cross-phase master index).
3. (On completion) An entry in `phase-1/registries/backend-v1-decision-log.registry.md`.

Per Plan 1.7 §10.3, no record exists outside the index.

---

## 2. Phase 3 BTAR Index

| Task ID      | Title | TAD | Target | Owner | Status | Source BTAR | Completion Proof |
| ------------ | ----- | --- | ------ | ----- | ------ | ----------- | ---------------- |
| P3-BTAR-001  | Synthetic Episode Contract and Fixture System | TAD-A | NEW Phase-3-owned: `src/services/judgment-truth-suite/synthetic-episode.types.ts` + `synthetic-episode-validation.ts` + `synthetic-episode-fixtures.ts` + `__tests__/synthetic-episode-fixtures.test.ts` | Backend program owner | COMPLETED — SYNTHETIC_EPISODE_CONTRACT_ACTIVE | `P3-BTAR-001-synthetic-episode-contract-and-fixtures.md` (§13) | check:backend exits 0; 20/20 new fixture tests pass; 154/154 Phase 2 chat suite unchanged; 4 starter fixtures + 1 extra; 12-key no-provider-payload assertion enforced; 0 module mocks; zero `src/l*/` diff; zero `services/judgment/*` diff |
| P3-BTAR-002  | Judgment Truth Runner | TAD-A | NEW Phase-3-owned: `src/services/judgment-truth-suite/judgment-truth-runner.types.ts` + `judgment-truth-runner.ts` + `__tests__/judgment-truth-runner.test.ts` | Backend program owner | COMPLETED — JUDGMENT_TRUTH_RUNNER_ACTIVE | `P3-BTAR-002-judgment-truth-runner.md` (§13) | check:backend exits 0; 20/20 new runner tests pass; 20/20 P3-BTAR-001 fixture tests still pass; 154/154 Phase 2 chat suite unchanged; combined 194/194; `runJudgmentTruthEpisode` + `runJudgmentTruthCorpus` + `assertNoRealProviderExecutor`; policy `judgment-truth-runner.v1`; `uses_real_providers: false` + `uses_ai_model: false` type-pinned literals on executor metadata; `semantic_assertions_run: false` + `no_real_provider_calls: true` type-pinned literals on result; defensive runtime guard catches `as any` tampering; 0 module mocks; zero `src/l*/` diff; zero `services/judgment/*` diff; active engine not connected (honest) |
| P3-BTAR-003  | Synthetic Episode Corpus | TAD-A | NEW Phase-3-owned: `src/services/judgment-truth-suite/synthetic-episode-corpus.ts` + `synthetic-episode-corpus.metadata.ts` + `__tests__/synthetic-episode-corpus.test.ts` | Backend program owner | COMPLETED — SYNTHETIC_EPISODE_CORPUS_ACTIVE | `P3-BTAR-003-synthetic-episode-corpus.md` (§17) | check:backend exits 0; 32/32 new corpus tests pass; 20/20 P3-BTAR-001 fixture tests still pass; 20/20 P3-BTAR-002 runner tests still pass; 154/154 Phase 2 chat suite unchanged; combined truth-suite 72/72 + chat 154/154 = **226/226 across 14 test files**; 18 episodes covering all 18 families (FAM-001..FAM-018); 0 VERY_HIGH confidence; degraded + FAM-003 + FAM-016 capped to ≤MEDIUM; FAM-005 timing ∈ {LATE, EXHAUSTED}; FAM-015 timing = UNCLEAR; full corpus runs through P3-BTAR-002 runner via in-test oracle-echo executor; `semantic_assertions_run: false` literal pin preserved; `no_real_provider_calls: true` literal pin preserved; 0 module mocks; 12-key forbidden-provider-payload deep-walk + 18-substring forbidden-import-specifier walk both fail-closed; zero `src/l*/` diff; zero `services/judgment/*` diff; P3-BTAR-001 fixtures file NOT modified; P3-BTAR-002 runner files NOT modified |
| P3-BTAR-004  | Semantic Assertion Engine | TAD-A | NEW Phase-3-owned: `src/services/judgment-truth-suite/semantic-assertions.types.ts` + `semantic-assertions.ts` + `__tests__/semantic-assertions.test.ts` | Backend program owner | COMPLETED — SEMANTIC_ASSERTION_ENGINE_ACTIVE | `P3-BTAR-004-semantic-assertion-engine.md` (§11) | check:backend exits 0; 32/32 new semantic tests pass; 32/32 P3-BTAR-003 corpus + 20/20 P3-BTAR-002 runner + 20/20 P3-BTAR-001 fixtures still pass; combined truth-suite **104/104**; 154/154 Phase 2 chat suite unchanged; grand total **258/258 across 15 test files**; 11 checks (STATE_ALIGNMENT, CAUSE_FAMILY_ALIGNMENT, THESIS_DIRECTION_ALIGNMENT, REQUIRED_CONTRADICTION_COVERAGE, TIMING_PHASE_ALIGNMENT, SCENARIO_TYPE_ALIGNMENT, CONFIDENCE_BAND_CALIBRATION, FORBIDDEN_CLAIM_ABSENCE, REQUIRED_REASONING_NOTE_COVERAGE, DEGRADED_EVIDENCE_RESPECT, RUNNER_RESULT_READINESS); 4 outcomes (PASS/WARNING/FAIL/CRITICAL_FAIL); score 100/-5/-15/-30 clamp [0,100]; policy `semantic-assertions.v1`; `semantic_assertions_run: true` + `no_real_provider_calls: true` type-pinned literals; deterministic STATE/CAUSE/SCENARIO inversion tables + 5-level confidence-band order + 6-level timing-phase order + negation-aware forbidden-claim matcher (mirrors Phase 2 AI output safety gate negation guard); RUNNER_RESULT_READINESS gate returns CRITICAL_FAIL on every non-ready code path (INV-01 preserved); 0 module mocks; 0 provider imports; 0 AI/LLM imports; H1 real-invocation regex + H2 test-file import-extraction + H3 engine-source import-extraction all fail-closed against 18 forbidden specifier substrings; zero `src/l*/` diff; zero `services/judgment/*` diff; P3-BTAR-001/002/003 source files NOT modified |

| P3-BTAR-005  | Full Truth Suite Execution and Report | TAD-A | NEW Phase-3-owned: `src/services/judgment-truth-suite/judgment-truth-suite-execution.types.ts` + `judgment-truth-suite-execution.ts` + `__tests__/judgment-truth-suite-execution.test.ts` + `scripts/render-truth-suite-report.ts` + `docs/backend-v1/phase-3/judgment-truth-suite-report.md` | Backend program owner | COMPLETED — FULL_TRUTH_SUITE_EXECUTION_REPORT_ACTIVE | `P3-BTAR-005-full-truth-suite-execution-and-report.md` (§13) | check:backend exits 0; 36/36 new execution tests pass; 32/32 P3-BTAR-004 + 32/32 P3-BTAR-003 + 20/20 P3-BTAR-002 + 20/20 P3-BTAR-001 still pass; combined truth-suite **140/140 across 5 files**; 154/154 Phase 2 chat suite unchanged; grand total **294/294 across 16 test files**; rendered report `docs/backend-v1/phase-3/judgment-truth-suite-report.md` (18 episodes / 18 PASS / score 100/100/100) under HARNESS_CERTIFICATION execution mode with `report_claim_level=HARNESS_ONLY` and `active_judgment_engine_connected=false` honesty pins; policy `judgment-truth-suite-execution.v1`; `semantic_assertions_run: true` + `no_real_provider_calls: true` type-pinned literals on aggregate envelope; 11 check_ids aggregated (10 semantic + 1 readiness); deterministic harness oracle-projection executor with `uses_real_providers: false` + `uses_ai_model: false` literal-pinned metadata; `assertJudgmentTruthSuiteRunResultValid` defensive validator rejects HARNESS mode claiming active-engine connection; failure-visibility Class E uses in-test bad executor (overconfident inverter) and proves CRITICAL_FAIL propagates to aggregate + report + findings_recommended (with P3-BTAR-006 recommendation); 0 module mocks; 0 provider imports; 0 AI/LLM imports; 0 `process.env` reads in execution module; F1 real-invocation regex + F2/F3/F4 import-extraction over 18 forbidden specifier substrings all fail-closed across test file + execution module + execution-types module; zero `src/l*/` diff; zero `services/judgment/*` diff; zero chat-service / ai-service diff; P3-BTAR-001/002/003/004 source files NOT modified (read-only imports only); no judgment logic modified; **Phase 3 required-set BTAR-001..005 closed** |

| P3-BTAR-006A | Active Synthetic Judgment Adapter | TAD-A | NEW Phase-3-owned: `src/services/judgment-truth-suite/active-synthetic-judgment-adapter.types.ts` + `active-synthetic-judgment-adapter.ts` + `__tests__/active-synthetic-judgment-adapter.test.ts` + `scripts/render-active-synthetic-judgment-report.ts` + `docs/backend-v1/phase-3/active-synthetic-judgment-suite-report.md` | Backend program owner | COMPLETED — ACTIVE_SYNTHETIC_ADAPTER_FAILURES_REVEALED | `P3-BTAR-006A-active-synthetic-judgment-adapter.md` (§13) | check:backend exits 0; 32/32 new adapter tests pass; 36/36 P3-BTAR-005 + 32/32 P3-BTAR-004 + 32/32 P3-BTAR-003 + 20/20 P3-BTAR-002 + 20/20 P3-BTAR-001 still pass; combined truth-suite **172/172 across 6 files**; 154/154 Phase 2 chat suite unchanged; grand total **326/326 across 17 test files**; readiness = ADAPTER_READY (active engine confirmed synchronous + pure, 0 provider / 0 AI / 0 DB / 0 env / 0 network coupling across services/judgment/ + transitive deps); full 18-episode corpus run through `runJudgmentTruthSuite` in ACTIVE_SYNTHETIC_ADAPTER mode with `createActiveSyntheticJudgmentExecutor` → **18 / 18 CRITICAL_FAIL**, score 1 (avg) / 0 (min) / 10 (max); rendered report `docs/backend-v1/phase-3/active-synthetic-judgment-suite-report.md` (`active_judgment_engine_connected: true`, `report_claim_level: ACTIVE_SYNTHETIC_JUDGMENT_EVALUATED`); 3 OPEN findings filed (P3-F-001 vocabulary-mismatch dominant pattern / P3-F-002 5 specific semantic inversions on SYN-003/007/009/012/016 / P3-F-003 active-engine output vocabulary narrower than oracle); policy `active-synthetic-judgment-adapter.v1`; executor metadata literal-pinned `uses_real_providers: false` + `uses_ai_model: false` + `deterministic: true`; mapping is pure deterministic enum→numeric for SignalSnapshot and enum→phrase via 5 small dictionaries (`MARKET_STATE_TO_PHRASE` / `CAUSAL_FAMILY_TO_PHRASE` / `HYPOTHESIS_TO_THESIS_DIRECTION` / `TIMING_PHASE_TO_ORACLE` / `CONFIDENCE_BAND_TO_ORACLE`); 0 module mocks; 0 forbidden provider/AI/chat/ai-service/market-data/L13/L14 imports (Class F1..F6 mechanical proofs across test file + adapter module + adapter-types module + comment-stripped real-invocation checks); zero `src/l*/` diff; zero `src/services/judgment/` modification (read-only import only); zero chat-service / ai-service diff; P3-BTAR-001..005 source files NOT modified; **Plan-3.0-LAW-02 honored** — no fixture / corpus / runner / semantic engine / oracle modified post-hoc; **triggers P3-BTAR-006 — Serious Judgment Flaw Remediation** per Plan 3.0 §11 (any CRITICAL_FAIL → admit remediation BTAR); **P3TG-001 BLOCKED until P3-BTAR-006 completes** (per INV-01 a 100% CRITICAL_FAIL rate must NOT appear as success) |

| P3-BTAR-006  | Serious Judgment Flaw Remediation | TAD-A | MODIFIED `src/services/judgment-truth-suite/active-synthetic-judgment-adapter.ts` (Phase B + C: projection enrichment + risk-override rules using synthetic input + active output, never oracle) + NEW `__tests__/serious-judgment-flaw-remediation.test.ts` + NEW `docs/backend-v1/phase-3/active-synthetic-judgment-remediation-report.md`; **zero `src/services/judgment/` diff** (adapter-only remediation; no engine modification required) | Backend program owner | COMPLETED — PARTIAL_REMEDIATION_RESIDUALS_DOCUMENTED | `P3-BTAR-006-serious-judgment-flaw-remediation.md` (§13) | check:backend exits 0; 32/32 new remediation tests pass; 32/32 P3-BTAR-006A + 36/36 P3-BTAR-005 + 32/32 P3-BTAR-004 + 32/32 P3-BTAR-003 + 20/20 P3-BTAR-002 + 20/20 P3-BTAR-001 still pass; combined truth-suite **204/204 across 7 files**; 154/154 Phase 2 chat suite unchanged; grand total **358/358 across 18 test files**; **before/after active synthetic suite: 18/18 CRITICAL_FAIL → 0/18 CRITICAL_FAIL** (100% elimination); outcome counts shifted 0/0/0/18 → 6/7/5/0 (PASS/WARNING/FAIL/CRITICAL_FAIL); average score 1 → 81 (+80); min 0 → 15 (+15); max 10 → 100 (+90); **all 5 dangerous inversions resolved** — SYN-003 PASS / SYN-007 WARNING / SYN-009 WARNING / SYN-012 WARNING / SYN-016 PASS; safety-critical confidence caps enforced via Class C tests (security risk → VERY_LOW; degraded / leverage-fragility / thin-liquidity / weak-onchain → not HIGH/VERY_HIGH); P3-F-001 RESOLVED; P3-F-002 RESOLVED; P3-F-003 PARTIALLY_RESOLVED_NON_BLOCKING (5 FAIL residuals on non-dangerous episodes — SYN-005/010/014/015/018); **LAW-02 mechanically preserved** — Class E (5 tests) introspects adapter source for 9 specific oracle accessors + broad `episode.expected_oracle.` regex (comments stripped) + verifies corpus / semantic-assertions module are byte-identical to P3-BTAR-006A baseline; **Class F no-provider proof** — 17-substring forbidden-import denylist on test + adapter; 0 `process.env` reads; 0 fetch/axios/http(s).request calls (line comments stripped); active engine `produceJudgment` source UNCHANGED (adapter-only remediation); zero `src/l*/` diff; zero chat-service / ai-service diff; corpus / oracle / semantic threshold / runner / fixtures all FROZEN; **P3TG-001 READY** with documented non-blocking residual on 5 non-dangerous coverage gaps (P3-F-003 partial); next governance action — admit **P3TG-001 — Phase 3 Transition Gate** via Plan 1.6 |

> **Note:** Plan 3.0 (this Phase 3 master roadmap) does NOT itself admit any BTAR. Phase 3 BTARs are appended above as they are admitted through the Plan 1.6 process. P3-BTAR-001..004 were admitted in the same overall Phase 3 working session; P3-BTAR-005 in a follow-on session; P3-BTAR-006A (bridge) and P3-BTAR-006 (conditional remediation, TRIGGERED by P3-BTAR-006A's 18/18 CRITICAL_FAIL) in this session.

---

## 3. Expected Phase 3 BTAR Sequence (per Plan 3.0 §9)

| BTAR         | Title                                                  | Required for Phase 3 done? |
| ------------ | ------------------------------------------------------ | -------------------------- |
| P3-BTAR-001  | Synthetic Episode Contract and Fixture System          | **Required** |
| P3-BTAR-002  | Judgment Truth Runner                                  | **Required** |
| P3-BTAR-003  | Synthetic Episode Corpus (15–25 episodes)              | **Required** |
| P3-BTAR-004  | Semantic Assertion Engine                              | **Required** |
| P3-BTAR-005  | Full Truth Suite Execution and Report                  | **Required** |
| P3-BTAR-006  | Serious Judgment Flaw Remediation                       | **Conditional** (only if P3-BTAR-005 surfaces CRITICAL_FAIL / FAIL flaws) |

These are **candidate** BTARs. Each must go through Plan 1.6 admission individually (BTAR template, eight-question gate, scope mapping).

---

## 4. Required Fields (per entry)

| Field            | Meaning |
| ---------------- | ------- |
| Task ID          | `P3-BTAR-NNN` zero-padded sequential |
| Title            | Short, declarative title |
| TAD              | Type-of-Admission Descriptor (TAD-A standard admission unless otherwise noted) |
| Target           | Surface(s) touched (folder-rooted) |
| Owner            | Approving authority |
| Status           | `APPROVED — NOT_STARTED` / `IN_PROGRESS` / `COMPLETED — <claim>` / `WITHDRAWN` / `BLOCKED` |
| Source BTAR      | Filename of the BTAR record in `records/backend-task-admission-records/` |
| Completion Proof | Fresh validation evidence (test counts, exit codes, file diffs) and finding updates |

---

## 5. Status Values

```text
APPROVED — NOT_STARTED                Admitted via Plan 1.6 but implementation has not begun.
IN_PROGRESS                            Implementation underway; tests still being added.
COMPLETED — <claim>                    All Done Definition items met; canonical completion claim attached.
WITHDRAWN                              Admission revoked before completion (must include rationale).
BLOCKED                                Implementation cannot proceed; reason must be cross-linked to a finding.
```

---

## 6. Append-Only

Past rows are never removed. A `WITHDRAWN` admission remains visible alongside any later resubmission so the audit trail is complete.

---

## 7. Current Phase 3 Status

```text
Phase 3 governance:               Plan 3.0 ACTIVE (created 2026-05-26)
Phase 3 BTAR admissions:          5 of 5 required (P3-BTAR-001..005) + 1 bridge (P3-BTAR-006A) + 1 conditional (P3-BTAR-006)
Phase 3 BTAR completions:         5 of 5 required + 1 bridge + 1 conditional — **ALL COMPLETED**
Phase 3 findings:                  P3-F-001 RESOLVED; P3-F-002 RESOLVED; P3-F-003 PARTIALLY_RESOLVED_NON_BLOCKING (5 non-dangerous coverage residuals)
Phase 3 unlock authority:         P2TG-001 (2026-05-25) — P3-READY
Latest governance event:          **P3TG-001 ACCEPTED — P4-READY_FOR_PROVIDER_INTEGRATION** (2026-05-26)
Phase 3 Status:                   **COMPLETE**
Phase 4 Status:                   **UNLOCKED_FOR_PROVIDER_INTEGRATION**
Next governance event:            Admit **Plan 4.0 — Provider Integration and Normalized Signal Schema Roadmap** and first Phase 4 BTAR via Plan 1.6
Phase 4 unlock:                   BLOCKED until P3TG-001 returns P4-READY_FOR_PROVIDER_INTEGRATION
Phase 4 unlock:                   BLOCKED until P3TG-001 returns P4-READY_FOR_PROVIDER_INTEGRATION
```

---

*This registry is Level 4. Plan 3.0 §9 (expected BTAR sequence) and §14 (done definition) are authoritative for what each P3-BTAR must accomplish. Individual P3-BTAR records (Level 3) are authoritative for specific implementation work.*
