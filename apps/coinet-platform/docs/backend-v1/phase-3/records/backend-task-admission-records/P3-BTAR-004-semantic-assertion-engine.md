# P3-BTAR-004 — Semantic Assertion Engine

Type: BTAR (Backend Task Admission Record)
Status: COMPLETED — SEMANTIC_ASSERTION_ENGINE_ACTIVE
Phase: Phase 3 — Backend Judgment Truth Suite
Created: 2026-05-26
Last Updated: 2026-05-26
Owner: Backend program owner
Mission Trace: Plan 3.0 §1 (mission), §3 (first principle: "judge correctly"), §6 (judgment contract under test), §9 (BTAR sequence — fourth entry), §11 (flaw severity), §12 (no-API rule)

Depends On / Inherits From:
- Plans 1.1–1.10 ACTIVE
- Plans 1.11 / 1.12 COMPLETED
- Plan 2.0 long-form + roadmap COMPLETE (Phase 2 closed)
- Plans 2.1 / 2.2 / 2.3 COMPLETE (Phase 2 closed)
- **P2TG-001 ACCEPTED — P3-READY** (2026-05-25)
- **Plan 3.0 ACTIVE** (2026-05-26)
- **P3-BTAR-001 COMPLETED — SYNTHETIC_EPISODE_CONTRACT_ACTIVE** (2026-05-26)
- **P3-BTAR-002 COMPLETED — JUDGMENT_TRUTH_RUNNER_ACTIVE** (2026-05-26)
- **P3-BTAR-003 COMPLETED — SYNTHETIC_EPISODE_CORPUS_ACTIVE** (2026-05-26)

---

## 1. One-Sentence Mission

> **P3-BTAR-004 creates a deterministic semantic assertion engine that compares `SyntheticActualJudgment` outputs against `ExpectedJudgmentOracle` expectations and returns PASS / WARNING / FAIL / CRITICAL_FAIL results without using AI, real APIs, provider calls, or live market data.**

### 1.1 Honesty Pin

P3-BTAR-004 is **deterministic-only** — no LLM judge, no real APIs, no live data. The engine is purely text-and-enum-comparison: normalized phrase matching, ordered confidence-band arithmetic, and small deterministic state-family / cause-family / scenario-family inversion tables. The engine evaluates `JudgmentTruthRunnerResult` envelopes; it does NOT score active-engine output (that requires the executor pattern from P3-BTAR-002 + a future adapter). The full corpus-wide report is **not** produced here — that is P3-BTAR-005's job.

---

## 2. Problem Statement

After P3-BTAR-001 (schema + fixtures), P3-BTAR-002 (runner), and P3-BTAR-003 (18-episode corpus), Phase 3 can package "actual vs expected" but cannot yet decide whether the actual is correct, incomplete, wrong, or dangerously wrong. P3-BTAR-004 builds the deterministic judge so P3-BTAR-005 can compose a real truth-suite report on top.

---

## 3. Plan 3.0 Mission Trace

| Field | Value |
| --- | --- |
| Mission clause(s) advanced | Plan 3.0 §1 (judges correctness), §3 (first principle: "Coinet must judge correctly"), §11 (flaw severity: PASS / WARNING / FAIL / CRITICAL_FAIL) |
| First-principle invariant strengthened | Plan-3.0-INV-01 (a judgment failure cannot pass as success: missing actual_judgment or non-ready runner_result returns CRITICAL_FAIL with RUNNER_RESULT_READINESS check) |
| BTAR sequence position | Fourth Phase 3 BTAR; consumes P3-BTAR-001 + P3-BTAR-002 + P3-BTAR-003 outputs |
| Judgment contract under test | All 7 oracle fields + reasoning notes + degraded evidence respect |
| No-API rule (Plan-3.0-LAW-03) | Mechanically enforced: 0 provider imports, 0 LLM imports, deterministic text comparison only |
| Anti-sprawl rule (Plan-3.0-LAW-04) | Followed: P3-BTAR, not a Plan 3.x |
| Honesty pin (Plan-3.0-LAW-02) | Engine is deterministic. Tests are tightenings (overconfidence is CRITICAL_FAIL, not WARNING). No oracle / fixture / corpus / runner code is rewritten to make tests pass |
| LAW-01 (no real APIs before correctness proven) | Followed: this BTAR is the *prove correctness* step |

---

## 4. Scope

### 4.1 In Scope

- Create `src/services/judgment-truth-suite/semantic-assertions.types.ts` (result + check types, policy version `semantic-assertions.v1`).
- Create `src/services/judgment-truth-suite/semantic-assertions.ts` with the 11 deterministic checks (STATE / CAUSE / THESIS / CONTRADICTIONS / TIMING / SCENARIO / CONFIDENCE / FORBIDDEN_CLAIMS / REASONING_NOTES / DEGRADED_EVIDENCE / RUNNER_RESULT_READINESS) + score derivation + outcome derivation.
- Create `src/services/judgment-truth-suite/__tests__/semantic-assertions.test.ts` covering classes A–H (happy path / readiness failures / field alignment / contradiction+reasoning coverage / confidence calibration / forbidden claims / degraded respect / no-provider discipline).
- Update Phase 3 registries (BTAR, record-index, decision-log).
- Update Phase 1 cross-phase registries on completion.

### 4.2 Out of Scope (per spec §4 + Plan 3.0 §5)

- Full truth-suite execution report (P3-BTAR-005).
- Judgment flaw remediation (P3-BTAR-006 conditional).
- Active judgment engine adapter.
- AI / LLM judge.
- Real API integration.
- Frontend changes.
- New judgment engine variant.
- Corpus / runner / fixtures rewriting (read-only consumption).

### 4.3 Allowed Files

```text
NEW: src/services/judgment-truth-suite/semantic-assertions.types.ts
NEW: src/services/judgment-truth-suite/semantic-assertions.ts
NEW: src/services/judgment-truth-suite/__tests__/semantic-assertions.test.ts
NEW: docs/backend-v1/phase-3/records/backend-task-admission-records/P3-BTAR-004-semantic-assertion-engine.md
MOD (registries only):
  docs/backend-v1/phase-3/registries/phase-3-btar.registry.md
  docs/backend-v1/phase-3/registries/phase-3-record-index.registry.md
  docs/backend-v1/phase-3/registries/phase-3-decision-log.registry.md
  docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md
  docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md
```

### 4.4 Forbidden Files / Surfaces

```text
src/api/chat/service.ts
src/services/ai-service.ts
src/services/judgment/
src/services/judgment-truth-suite/synthetic-episode.types.ts          (consume read-only)
src/services/judgment-truth-suite/synthetic-episode-validation.ts     (consume read-only)
src/services/judgment-truth-suite/synthetic-episode-fixtures.ts       (consume read-only)
src/services/judgment-truth-suite/synthetic-episode-corpus.ts         (consume read-only)
src/services/judgment-truth-suite/synthetic-episode-corpus.metadata.ts (consume read-only)
src/services/judgment-truth-suite/judgment-truth-runner.ts            (consume read-only)
src/services/judgment-truth-suite/judgment-truth-runner.types.ts      (consume read-only)
src/l13/  src/l14/  src/index.ts  prisma/schema.prisma  apps/client-web/
.github/workflows/  package.json  tsconfig.json
```

No new `ai-judge.ts` / `llm-evaluator.ts` / `semantic-assertions-v2.ts` / `judgment-engine-v2.ts` / `judgment-engine-final.ts` / `truth-suite-report.ts` / `provider-judgment-adapter.ts` / `real-api-assertions.ts`.

---

## 5. Required Checks

11 checks (10 semantic + 1 readiness):

```text
STATE_ALIGNMENT
CAUSE_FAMILY_ALIGNMENT
THESIS_DIRECTION_ALIGNMENT
REQUIRED_CONTRADICTION_COVERAGE
TIMING_PHASE_ALIGNMENT
SCENARIO_TYPE_ALIGNMENT
CONFIDENCE_BAND_CALIBRATION
FORBIDDEN_CLAIM_ABSENCE
REQUIRED_REASONING_NOTE_COVERAGE
DEGRADED_EVIDENCE_RESPECT
RUNNER_RESULT_READINESS
```

---

## 6. Outcome and Score Discipline

```text
PASS         score_delta = 0
WARNING      score_delta = -5
FAIL         score_delta = -15
CRITICAL_FAIL score_delta = -30

score start = 100
clamp [0, 100]

Overall outcome:
  any CRITICAL_FAIL          → CRITICAL_FAIL
  any FAIL                    → FAIL
  any WARNING                 → WARNING
  otherwise                   → PASS
```

Plan-3.0-INV-01 invariant: non-ready runner result must return overall_outcome `CRITICAL_FAIL` regardless of any other check.

---

## 7. Eight-Question Plan 1.6 Gate

| # | Question | Answer |
| - | -------- | ------ |
| 1 | Admissible under Plan 3.0 §9? | YES — fourth entry. |
| 2 | New architecture required? | NO. |
| 3 | Activate any Plan 1.3 deferred area? | NO. |
| 4 | Touch V1_CORE? | NO. |
| 5 | Cross any Plan 2.3 OOS line (OOS-001..018)? | NO. |
| 6 | Require a Plan 3.x sibling (anti-sprawl)? | NO. |
| 7 | Require any provider key? | NO — Plan-3.0-LAW-03. |
| 8 | Loosen any prior test? | NO — Plan-3.0-LAW-02; tests are tightenings. |

All eight: PASS.

---

## 8. Validation Plan

```bash
pnpm check:backend
cd apps/coinet-platform && pnpm exec vitest run src/services/judgment-truth-suite/__tests__/semantic-assertions.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/services/judgment-truth-suite/__tests__/
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/
```

Expected:

```text
pnpm check:backend                                                           → EXIT 0
semantic-assertions.test.ts                                                  → all PASS
all 4 judgment-truth-suite test files combined                               → all PASS
Phase 2 chat suite (11 files)                                                → 154 / 154 PASS
```

---

## 9. Possible Findings

Filed only if observed:

- P3-F-001 — oracle vocabulary too loose for deterministic matching
- P3-F-002 — actual judgment envelope lacks enough fields for semantic scoring
- P3-F-003 — confidence-band taxonomy too coarse
- P3-F-004 — contradiction matching needs controlled synonym map
- P3-F-005 — degraded evidence detection needs stronger oracle field

---

## 10. Completion Section

To be appended on completion with: files changed, assertion-engine summary, score/outcome logic, test count + classes, validation results (with exit codes), no-real-API + no-AI-judge proof, semantic-scoring honesty note, registry sync proof, out-of-scope proof, next task.

Required completion declaration:

```text
P3-BTAR-004 COMPLETED — SEMANTIC_ASSERTION_ENGINE_ACTIVE
```

---

## 11. Completion Section

### 11.1 Completion Claim

```text
P3-BTAR-004 COMPLETED — SEMANTIC_ASSERTION_ENGINE_ACTIVE
```

### 11.2 Files Created

| Path | Purpose |
| ---- | ------- |
| `src/services/judgment-truth-suite/semantic-assertions.types.ts` | Policy version `semantic-assertions.v1` + 4 outcome enum + 11 check-id enum + per-check result + aggregate `JudgmentSemanticAssertionResult` envelope with type-pinned `semantic_assertions_run: true` and `no_real_provider_calls: true` literals + engine input type |
| `src/services/judgment-truth-suite/semantic-assertions.ts` | Pure deterministic engine: `runSemanticAssertions` (11 checks) + `assertSemanticAssertionResultValid` + `normalizeJudgmentText` / `containsNormalizedNeedle` + `forbiddenClaimAppearsPositively` (negation-aware) + `deriveOverallOutcome` + `calculateSemanticScore`; small deterministic STATE / CAUSE / SCENARIO inversion tables + confidence-band order + timing-phase order |
| `src/services/judgment-truth-suite/__tests__/semantic-assertions.test.ts` | 32 tests across classes A–H, 0 module mocks |
| `docs/backend-v1/phase-3/records/backend-task-admission-records/P3-BTAR-004-semantic-assertion-engine.md` | This BTAR admission + completion record |

### 11.3 Files Modified (registries only)

```text
docs/backend-v1/phase-3/registries/phase-3-btar.registry.md            (row added, current status updated)
docs/backend-v1/phase-3/registries/phase-3-record-index.registry.md    (row added, next-action note updated)
docs/backend-v1/phase-3/registries/phase-3-decision-log.registry.md    (ADMITTED + COMPLETED rows appended)
docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md (cross-phase row added)
docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md (cross-phase row appended)
```

**Zero non-registry source files modified outside the new files above.** P3-BTAR-001 / P3-BTAR-002 / P3-BTAR-003 are consumed read-only via imports.

### 11.4 Engine Summary

11 checks (10 semantic + 1 readiness gate):

```text
RUNNER_RESULT_READINESS              — gate; CRITICAL_FAIL on non-ready runner_result (Plan-3.0-INV-01)
STATE_ALIGNMENT                       — normalized text match / partial overlap / inversion-table CRITICAL_FAIL
CAUSE_FAMILY_ALIGNMENT                — normalized text match / partial overlap / inversion-table CRITICAL_FAIL
THESIS_DIRECTION_ALIGNMENT            — normalized text match / partial overlap / opposite-direction CRITICAL_FAIL
REQUIRED_CONTRADICTION_COVERAGE       — per-required-contradiction needle / key-prefix / 70% token-overlap match
TIMING_PHASE_ALIGNMENT                — distance 0=PASS / 1=WARNING / 2+=FAIL / dangerously-early CRITICAL_FAIL
SCENARIO_TYPE_ALIGNMENT               — normalized text match / partial overlap / inversion-table CRITICAL_FAIL
CONFIDENCE_BAND_CALIBRATION           — 5-level order; overconfidence is strictly more dangerous than underconfidence
FORBIDDEN_CLAIM_ABSENCE               — negation-aware substring search across 7 actual-judgment fields; HIGH+ confidence with hit → CRITICAL_FAIL
REQUIRED_REASONING_NOTE_COVERAGE      — same coverage logic as contradictions
DEGRADED_EVIDENCE_RESPECT             — when oracle indicates degraded evidence, actual must mention disclosure AND cap confidence
```

Outcome derivation (§6 / §23):

```text
any CRITICAL_FAIL → CRITICAL_FAIL
any FAIL          → FAIL
any WARNING       → WARNING
otherwise         → PASS

score start = 100; deltas { PASS: 0, WARNING: -5, FAIL: -15, CRITICAL_FAIL: -30 }; clamp [0, 100]
```

### 11.5 Test Results

```text
pnpm check:backend                                                              → EXIT 0 (clean typecheck)
src/services/judgment-truth-suite/__tests__/semantic-assertions.test.ts          → 32 / 32 PASS (7ms)
src/services/judgment-truth-suite/__tests__/synthetic-episode-corpus.test.ts     → 32 / 32 PASS (P3-BTAR-003 regression)
src/services/judgment-truth-suite/__tests__/judgment-truth-runner.test.ts        → 20 / 20 PASS (P3-BTAR-002 regression)
src/services/judgment-truth-suite/__tests__/synthetic-episode-fixtures.test.ts   → 20 / 20 PASS (P3-BTAR-001 regression)
Combined judgment-truth-suite run (4 files)                                      → 104 / 104 PASS
src/api/chat/__tests__/  (Phase 2 regression, 11 files)                          → 154 / 154 PASS
Grand total this session                                                         → 258 / 258 PASS (across 15 test files)
```

### 11.6 Test Class Coverage

| Class | Tests | Coverage |
| --- | ---: | --- |
| A — Happy path | 5 | A1 perfect → PASS / A2 score=100 / A3 `semantic_assertions_run:true` / A4 `no_real_provider_calls:true` / A5 policy_version + validator |
| B — Readiness failures | 4 | B1 VALIDATION_FAILED → CRITICAL_FAIL / B2 EXECUTOR_FAILED → CRITICAL_FAIL / B3 missing actual_judgment → CRITICAL_FAIL / B4 single readiness check returned |
| C — Field alignment | 5 | C1 inverted state / C2 leverage-vs-spot cause inversion / C3 opposite-direction thesis / C4 wrong scenario / C5 EARLY-when-EXHAUSTED timing CRITICAL_FAIL |
| D — Contradiction + reasoning coverage | 4 | D1 missing 1-of-2 contradiction → WARNING / D2 missing all → CRITICAL_FAIL / D3 missing 1 reasoning note → WARNING / D4 missing all → CRITICAL_FAIL |
| E — Confidence calibration | 5 | E1 matching → PASS / E2 +1 → WARNING / E3 LOW→HIGH (severe overconfidence) → CRITICAL_FAIL / E4 LOW→HIGH (explicit) → CRITICAL_FAIL / E5 VERY_HIGH without expected VERY_HIGH → CRITICAL_FAIL |
| F — Forbidden claims | 3 | F1 forbidden phrase in thesis → FAIL / F2 forbidden + HIGH confidence → CRITICAL_FAIL / F3 clean actual → PASS (with negation-aware matcher) |
| G — Degraded evidence respect | 3 | G1 degraded + capped confidence → PASS / G2 degraded ignored + HIGH confidence → CRITICAL_FAIL / G3 degraded disclosure missing (LOW confidence) → FAIL |
| H — No-provider discipline | 3 | H1 0 `vi.mock(` invocations / H2 test imports clean / H3 engine source imports clean |

**Total: 32 tests** (within 24–34 spec band).

### 11.7 Mock-Count Evidence

```text
semantic-assertions.test.ts        → 0 vi.mock() invocations (mechanically asserted in H1)
semantic-assertions.ts             → imports types only from synthetic-episode.types + judgment-truth-runner.types + semantic-assertions.types
semantic-assertions.types.ts       → type-only imports
```

### 11.8 No-Real-API + No-AI-Judge Proof (Plan-3.0-LAW-03)

```text
Provider imports across all 3 new files:           0
LLM / AI judge imports:                             0
Network calls:                                      0
process.env reads in production engine code:        0
Provider API keys required by any test:             0
Date.now() / Math.random() in engine:               0
```

Defense-in-depth:

- **Type-level pin**: `semantic_assertions_run: true` + `no_real_provider_calls: true` are literal types on `JudgmentSemanticAssertionResult` (compile-time enforcement).
- **Validator**: `assertSemanticAssertionResultValid` throws on any tampered envelope.
- **Class H1**: real-invocation regex `/^[ \t]*vi\.mock\s*\(/m` over self-source rejects any actual `vi.mock(` call site.
- **Class H2**: import-statement extraction with 18-substring forbidden-specifier list over the test file (openai / grok / @anthropic-ai / coingecko / coinglass / nansen / arkham / alchemy / quicknode / lunarcrush / cryptopanic / twitter / api/chat/service / services/judgment / services/ai-service / services/market-data / src/l13 / src/l14).
- **Class H3**: same 18-substring import-statement extraction over `semantic-assertions.ts` itself (the engine module — not just the test file).

### 11.9 Semantic-Scoring Honesty (Plan-3.0-INV-01)

```text
This engine evaluates JudgmentTruthRunnerResult envelopes only.
This engine does NOT score active-engine output (active engine is not connected — Plan 2.3 OOS-007).
The corpus-wide truth-suite report is NOT produced here (P3-BTAR-005's job).
Plan-3.0-INV-01 preserved: non-ready runner_result → overall_outcome=CRITICAL_FAIL via RUNNER_RESULT_READINESS gate, before any semantic checks run.
```

### 11.10 Plan 3.0 LAW + INV Audit

| Pin | Status | Evidence |
| --- | ------ | -------- |
| LAW-01 (no real APIs before correctness proven) | PASS | Engine is deterministic + provider-free + AI-free; H3 mechanically rejects forbidden engine imports |
| LAW-02 (no test loosening to fake passes) | PASS | When SYN-001 starter's "confirmed breakout" / "not yet confirmed breakout" overlap exposed a false-positive in FORBIDDEN_CLAIM_ABSENCE, the fix was to **add negation awareness** to the engine (`forbiddenClaimAppearsPositively` with 7-prefix negation guard, mirroring Phase 2 AI output safety gate) — a tightening of correctness. The contradiction-coverage threshold was raised from 0.5 → 0.7 to reject shared-discourse-word false positives — also a tightening. D1 test switched to a controlled in-test 2-contradiction episode rather than depending on starter fixture's 1-contradiction quirk; no fixture / corpus / runner code was modified |
| LAW-03 (no Phase 3 test may require any provider key) | PASS | H1/H2/H3 mechanical proofs |
| LAW-04 (anti-sprawl — no Plan 3.x unless cross-cutting) | PASS | P3-BTAR, not Plan 3.x |
| INV-01 (judgment failure must NOT appear as success) | PASS | RUNNER_RESULT_READINESS gate returns CRITICAL_FAIL on every non-ready code path; missing `actual_judgment` cannot pass as success |

### 11.11 Out-of-Scope Audit (spec §4 + Plan 3.0 §5)

```text
[x] No truth-suite report                                       (P3-BTAR-005)
[x] No judgment flaw remediation                                (P3-BTAR-006 conditional)
[x] No active judgment engine adapter                           (Plan 2.3 OOS-007)
[x] No AI/LLM judge                                              (deterministic engine only)
[x] No real API integration
[x] No provider keys
[x] No frontend changes
[x] No new judgment-engine variant
[x] No chat-service / ai-service changes
[x] Zero `src/l*/` diff                                          (Plan 1.4 architecture freeze)
[x] No v2/final files                                            (Plan 2.3 OOS-012/013/014)
[x] No Plan 1.3 deferred area activation
[x] P3-BTAR-001/002/003 source files NOT modified
```

### 11.12 Registry Sync Proof

```text
[x] phase-3/registries/phase-3-btar.registry.md          — P3-BTAR-004 row appended, current status updated
[x] phase-3/registries/phase-3-record-index.registry.md  — P3-BTAR-004 row appended, next-action updated
[x] phase-3/registries/phase-3-decision-log.registry.md  — ADMITTED + COMPLETED rows appended in chronological order
[x] phase-1/registries/backend-v1-record-index.registry.md — cross-phase row appended
[x] phase-1/registries/backend-v1-decision-log.registry.md — cross-phase row appended
[x] MEMORY.md                                             — P3-BTAR-004 completion summary added
```

### 11.13 Findings

No findings filed.

### 11.14 Next Governance Action

Admit **P3-BTAR-005 — Full Truth Suite Execution and Report** via Plan 1.6 process. P3-BTAR-005 composes the runner (P3-BTAR-002) + corpus (P3-BTAR-003) + assertion engine (P3-BTAR-004) into a single executable suite that emits a per-episode + aggregate truth-suite report.

