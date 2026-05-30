# P3-BTAR-003 — Synthetic Episode Corpus

Type: BTAR (Backend Task Admission Record)
Status: COMPLETED — SYNTHETIC_EPISODE_CORPUS_ACTIVE
Phase: Phase 3 — Backend Judgment Truth Suite
Created: 2026-05-26
Last Updated: 2026-05-26
Owner: Backend program owner
Mission Trace: Plan 3.0 §1 (mission), §6 (judgment contract under test), §7 (synthetic episode concept), §9 (BTAR sequence — third entry), §12 (no-API rule)

Depends On / Inherits From:
- Plans 1.1–1.10 ACTIVE
- Plans 1.11 / 1.12 COMPLETED
- Plan 2.0 long-form + roadmap COMPLETE (Phase 2 closed)
- Plans 2.1 / 2.2 / 2.3 COMPLETE (Phase 2 closed)
- **P2TG-001 ACCEPTED — P3-READY** (2026-05-25)
- **Plan 3.0 ACTIVE** (2026-05-26)
- **P3-BTAR-001 COMPLETED — SYNTHETIC_EPISODE_CONTRACT_ACTIVE** (2026-05-26) — supplies `SyntheticEpisodeInput`, `ExpectedJudgmentOracle`, validation helpers, and 5 starter fixtures (4 in `STARTER_SYNTHETIC_EPISODE_CORPUS` + SYN-005 retained)
- **P3-BTAR-002 COMPLETED — JUDGMENT_TRUTH_RUNNER_ACTIVE** (2026-05-26) — supplies `runJudgmentTruthEpisode`, `runJudgmentTruthCorpus`, `assertNoRealProviderExecutor`, `SyntheticJudgmentExecutor` interface

Inheritance audit: Plans 1.1–1.12, Plan 2.0 (both), 2.1, 2.2, 2.3 ACTIVE/COMPLETED. Plan 3.0 ACTIVE. P3-BTAR-001 + P3-BTAR-002 COMPLETED. P2TG-001 authority active.

---

## 1. One-Sentence Mission

> **P3-BTAR-003 expands the Phase 3 synthetic judgment dataset into a validated corpus of 15–25 controlled crypto market episodes covering the core judgment situations Coinet must understand before real API integration.**

### 1.1 Honesty Pin

P3-BTAR-003 is **dataset only**. It does NOT score correctness (P3-BTAR-004). It does NOT produce a truth-suite report (P3-BTAR-005). It does NOT connect Coinet's active judgment engine (deferred per Plan 2.3 OOS-007 + BTAR-008B fan-out review). It does NOT modify the P3-BTAR-001 schema or the P3-BTAR-002 runner unless a defect is discovered. Runner compatibility is asserted using the existing deterministic in-test oracle-echo executor (local to the corpus test file) — this is a runner-mechanics proof at corpus scale, not a semantic correctness proof.

---

## 2. Problem Statement

After P3-BTAR-001 (schema + 5 starter fixtures) and P3-BTAR-002 (runner), Coinet still cannot prove its judgment quality because the dataset is too small. P3-BTAR-003 builds the controlled 15–25 episode corpus needed to stress different market situations (clean strength, fake strength, fragile expansion, mixed signals, unlock risk, sentiment hype, derivatives pressure, late momentum, early accumulation, degraded evidence, liquidity risk, fundamental improvement, security risk, exchange inflow distribution, narrative catalyst weak fundamentals). Without this corpus, P3-BTAR-004 has nothing meaningful to score.

---

## 3. Plan 3.0 Mission Trace

| Field | Value |
| --- | --- |
| Mission clause(s) advanced | Plan 3.0 §1 ("test whether Coinet's judgment is actually correct" — supplies the corpus the assertion engine will eventually use), §7 (synthetic episode concept — expanded from 5 starters to ≥15), §8 (oracle concept — every corpus episode carries authored ground truth) |
| First-principle invariant strengthened | Plan-3.0-INV-01 (corpus carries authored ground truth ONLY — no AI-generated oracles; no runtime mutation) |
| BTAR sequence position | Third Phase 3 BTAR; consumes P3-BTAR-001 + P3-BTAR-002 outputs |
| Judgment contract under test (downstream) | Each corpus oracle expresses the 7-field judgment contract (state / cause / thesis-direction / contradictions / timing / scenario / confidence) |
| No-API rule (Plan-3.0-LAW-03) | Mechanically enforced: deep-walk over the whole corpus for 12 forbidden provider payload keys; mock-count guard; provider-import guard via import-statement extraction |
| Anti-sprawl rule (Plan-3.0-LAW-04) | Followed: P3-BTAR, not a Plan 3.x |
| Honesty pin (Plan-3.0-LAW-02) | Followed: corpus must not weaken P3-BTAR-001 validation; calibration tests are tightenings, not loosenings; runner compatibility uses the existing in-test oracle-echo executor pattern |
| LAW-01 (no real APIs before correctness proven) | Followed: corpus is deterministic, controlled, provider-free |

---

## 4. Scope

### 4.1 In Scope

- Create `src/services/judgment-truth-suite/synthetic-episode-corpus.ts` with 15–25 episodes (target 18).
- Create `src/services/judgment-truth-suite/synthetic-episode-corpus.metadata.ts` with policy version, target-size constant, required family list, family-coverage helper type.
- Create `src/services/judgment-truth-suite/__tests__/synthetic-episode-corpus.test.ts` covering classes A–F (corpus shape / family coverage / oracle quality / confidence + timing calibration / no-provider proof / runner compatibility).
- Re-export the P3-BTAR-001 starter fixtures as appropriate (preserving canonical IDs where possible).
- Update Phase 3 registries (BTAR, record-index, decision-log) on admission and completion.
- Update Phase 1 cross-phase registries (record-index + decision-log) on completion.

### 4.2 Out of Scope (per spec §4 + Plan 3.0 §5)

- Semantic assertion engine (P3-BTAR-004).
- Scoring engine (P3-BTAR-004).
- Truth-suite report (P3-BTAR-005).
- Judgment flaw remediation (P3-BTAR-006 conditional).
- Active judgment engine adapter.
- Real API integration.
- Provider mapping.
- Frontend changes.
- New judgment engine variant.

### 4.3 Allowed Files

```text
NEW: src/services/judgment-truth-suite/synthetic-episode-corpus.ts
NEW: src/services/judgment-truth-suite/synthetic-episode-corpus.metadata.ts
NEW: src/services/judgment-truth-suite/__tests__/synthetic-episode-corpus.test.ts
NEW: docs/backend-v1/phase-3/records/backend-task-admission-records/P3-BTAR-003-synthetic-episode-corpus.md
MOD (registries only):
  docs/backend-v1/phase-3/registries/phase-3-btar.registry.md
  docs/backend-v1/phase-3/registries/phase-3-record-index.registry.md
  docs/backend-v1/phase-3/registries/phase-3-decision-log.registry.md
  docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md
  docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md
```

`synthetic-episode-fixtures.ts` is treated as read-only by P3-BTAR-003 (its starter fixtures may be re-exported but not mutated).

### 4.4 Forbidden Files / Surfaces

```text
src/api/chat/service.ts
src/services/ai-service.ts
src/services/judgment/
src/l13/
src/l14/
src/index.ts
prisma/schema.prisma
apps/client-web/
.github/workflows/
package.json
tsconfig.json
```

No new `judgment-engine-v2.ts`, `judgment-engine-final.ts`, `semantic-assertions.ts`, `truth-suite-report.ts`, `provider-adapter.ts`, `real-api-corpus.ts`, or any provider-named module.

---

## 5. Corpus Size

```text
minimum:    15
maximum:    25
recommended: 18  (chosen)
```

18 covers all 15 required families + 3 recommended additional families (security-risk override, exchange inflow distribution, narrative catalyst weak fundamentals) without becoming a review burden.

---

## 6. Required Families (Plan §10)

```text
FAM-001  Clean accumulation
FAM-002  Early accumulation with weak sentiment
FAM-003  Leverage-driven fake strength
FAM-004  Spot-led healthy expansion
FAM-005  Late euphoric momentum
FAM-006  Unlock-risk distribution
FAM-007  Fundamentals improving but timing late
FAM-008  Whale accumulation with flat price
FAM-009  Price pump with weak on-chain quality
FAM-010  Sentiment-only pump
FAM-011  Derivatives squeeze risk
FAM-012  Liquidity-thin breakout
FAM-013  Risk-off market despite asset strength
FAM-014  Mixed signals / low confidence
FAM-015  Degraded data / partial blindness
FAM-016  Security-risk override                     (recommended)
FAM-017  Exchange inflow distribution risk          (recommended)
FAM-018  Narrative catalyst with weak fundamentals  (recommended)
```

Coverage discipline: each family is covered by **exactly one** canonical episode; tags carry `family:FAM-NNN` so future families can be added with multi-episode coverage without breaking tests.

---

## 7. Canonical Episode IDs

```text
SYN-001-clean-accumulation                          (FAM-001; reused from P3-BTAR-001 starter)
SYN-002-early-accumulation-weak-sentiment           (FAM-002; NEW)
SYN-003-leverage-driven-fake-strength               (FAM-003; replaces SYN-002 starter sense)
SYN-004-spot-led-healthy-expansion                  (FAM-004; NEW)
SYN-005-late-euphoric-momentum                      (FAM-005; NEW, replaces SYN-005 starter sense)
SYN-006-unlock-risk-distribution                    (FAM-006; replaces SYN-004 starter sense)
SYN-007-fundamentals-improve-late-timing            (FAM-007; NEW)
SYN-008-whale-accumulation-flat-price               (FAM-008; NEW)
SYN-009-price-pump-weak-onchain                     (FAM-009; NEW)
SYN-010-sentiment-only-pump                         (FAM-010; NEW)
SYN-011-derivatives-squeeze-risk                    (FAM-011; NEW)
SYN-012-liquidity-thin-breakout                     (FAM-012; NEW)
SYN-013-risk-off-asset-strength                     (FAM-013; NEW)
SYN-014-mixed-signals-low-confidence                (FAM-014; NEW)
SYN-015-degraded-partial-blindness                  (FAM-015; replaces SYN-003 starter sense)
SYN-016-security-risk-override                      (FAM-016; NEW)
SYN-017-exchange-inflow-distribution                (FAM-017; NEW)
SYN-018-narrative-catalyst-weak-fundamentals        (FAM-018; NEW)
```

Honesty note on starter-fixture continuity: P3-BTAR-001's `STARTER_SYNTHETIC_EPISODE_CORPUS` IDs (SYN-001 clean accumulation, SYN-002 leverage fragility, SYN-003 degraded mixed read, SYN-004 unlock-risk distribution, SYN-005 sentiment-only pump) are **not all** preserved in the canonical numbering of the full corpus — only SYN-001 keeps its slot. The starter fixtures file remains unchanged (so its tests stay green), and the corpus file simply imports the starter fixtures it can reuse identity-wise (SYN-001) and defines fresh episodes (with distinct IDs) for the others. No fixture is mutated; no ID is reused across the two surfaces.

---

## 8. Oracle Requirements (Plan §12)

Every corpus oracle:

- has all 9 fields from `ExpectedJudgmentOracle`
- has ≥ 2 `required_contradictions`
- has ≥ 2 `forbidden_claims`
- has ≥ 2 `required_reasoning_notes`
- has no empty-string fields anywhere

Forbidden-claim discipline: every oracle includes at least one explicit anti-overconfidence claim (e.g. "guaranteed continuation", "risk-free entry", "must buy now", "must sell now", "certain breakdown", "safe to chase").

---

## 9. Confidence Calibration Rules (Plan §13)

```text
VERY_HIGH       0 episodes (Plan §13 — should not appear unless explicitly justified)
HIGH            allowed only when spot+onchain+fundamentals+liquidity+risk align AND derivatives not overheated AND contradiction_severity LOW
MEDIUM          default for constructive-but-incomplete
LOW             used when major contradiction / degraded / leverage-dominant / risk elevated / timing unclear
VERY_LOW        used when signal quality is unreliable OR security/unlock/liquidity risk dominates
```

Mechanical assertions in tests:

- No oracle uses `VERY_HIGH` (Class D).
- Degraded episodes (any degraded_components OR family ∈ {FAM-015}) do NOT use HIGH or VERY_HIGH.
- Leverage-fake-strength (family = FAM-003) does NOT use HIGH or VERY_HIGH.
- Security-risk override (family = FAM-016) does NOT use HIGH or VERY_HIGH.

---

## 10. Timing Calibration Rules (Plan §14)

```text
clean accumulation                          → EARLY or MID
late euphoric momentum                      → LATE or EXHAUSTED
degraded partial blindness                  → UNCLEAR
unlock-risk distribution                    → LATE or INVALIDATING
liquidity-thin breakout                     → EARLY or MID
```

Mechanical assertions in tests (Class D):

- `FAM-005` (late euphoric momentum) → `LATE` or `EXHAUSTED`.
- `FAM-015` (degraded partial blindness) → `UNCLEAR`.

---

## 11. Tags (Plan §16)

Each episode carries:

```text
family:FAM-NNN
regime:<SyntheticMarketRegime>
risk:<low|medium|high|extreme>
confidence:<expected_confidence_band lowercased>
timing:<expected_timing_phase lowercased>
```

Plus topical optional tags (`leverage`, `unlock`, `sentiment`, `liquidity`, `whales`, `degraded`, `exchange-flows`, `security`, `fundamentals`, `narrative`) where appropriate.

---

## 12. Runner Compatibility (Plan §18)

P3-BTAR-003 must prove the full corpus runs through the P3-BTAR-002 runner using a deterministic in-test executor (no production-engine connection). Required assertions (Class F):

- `runJudgmentTruthCorpus(SYNTHETIC_EPISODE_CORPUS, executor)` returns one result per episode.
- Result order matches corpus order.
- All results have `runner_status: 'RUNNER_COMPLETED'`.
- All results have `comparison_ready: true`.
- All results have `semantic_assertions_run: false` (type-pinned literal, never `true`).
- All results have `no_real_provider_calls: true` (type-pinned literal, never `false`).

This is runner-mechanics-at-corpus-scale, not a semantic correctness claim.

---

## 13. Eight-Question Plan 1.6 Gate

| # | Question | Answer |
| - | -------- | ------ |
| 1 | Is this work admissible under Plan 3.0 §9? | YES — third entry in the locked BTAR sequence. |
| 2 | Does it require new architecture? | NO — reuses P3-BTAR-001 contract and P3-BTAR-002 runner verbatim. |
| 3 | Does it activate any Plan 1.3 deferred area? | NO. |
| 4 | Does it touch V1_CORE? | NO. |
| 5 | Does it cross any Plan 2.3 OOS line (OOS-001..018)? | NO — no real APIs, no provider integration, no chat-service touch, no L13/L14 migration, no v2/final files. |
| 6 | Does it require a Plan 3.x sibling (anti-sprawl)? | NO. |
| 7 | Does it require any provider key for tests? | NO — Plan-3.0-LAW-03. |
| 8 | Does it loosen any prior test? | NO — Plan-3.0-LAW-02; calibration tests are tightenings. |

All eight: PASS.

---

## 14. Validation Plan

Commands to run before flipping status to COMPLETED:

```bash
pnpm check:backend
cd apps/coinet-platform && pnpm exec vitest run src/services/judgment-truth-suite/__tests__/synthetic-episode-corpus.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/services/judgment-truth-suite/__tests__/judgment-truth-runner.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/services/judgment-truth-suite/__tests__/synthetic-episode-fixtures.test.ts
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/
```

Expected:

```text
pnpm check:backend                                          → EXIT 0
synthetic-episode-corpus.test.ts                            → all tests PASS
synthetic-episode-fixtures.test.ts (P3-BTAR-001 regression) → 20/20 PASS
judgment-truth-runner.test.ts    (P3-BTAR-002 regression)   → 20/20 PASS
Phase 2 chat suite (11 files)                               → 154/154 PASS
```

---

## 15. Possible Findings (Plan §22)

Filed only if actually observed:

- P3-F-001 — episode schema too narrow for required family
- P3-F-002 — oracle vocabulary inconsistent across families
- P3-F-003 — runner cannot handle full corpus shape
- P3-F-004 — confidence-band taxonomy too coarse
- P3-F-005 — corpus needs future normalized signal schema

No findings invented preemptively.

---

## 16. Completion Section

To be appended on completion with: files changed, fixture / corpus counts, family coverage table, oracle quality summary, confidence / timing calibration proof, runner compatibility proof, test count + classes, validation results (with exit codes), no-real-API proof, no-provider-payload proof, registry sync proof, out-of-scope proof, next task.

Required completion declaration:

```text
P3-BTAR-003 COMPLETED — SYNTHETIC_EPISODE_CORPUS_ACTIVE
```

---

## 17. Completion Section

### 17.1 Completion Claim

```text
P3-BTAR-003 COMPLETED — SYNTHETIC_EPISODE_CORPUS_ACTIVE
```

### 17.2 Files Created

| Path | LOC | Purpose |
| ---- | --: | ------- |
| `src/services/judgment-truth-suite/synthetic-episode-corpus.metadata.ts` | 76 | Policy version `synthetic-episode-corpus.v1` + `SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE` (15/25/18) + `REQUIRED_SYNTHETIC_EPISODE_FAMILIES` (FAM-001..FAM-018, all `required: true`) + `SyntheticEpisodeFamilyCoverage` helper type |
| `src/services/judgment-truth-suite/synthetic-episode-corpus.ts` | ≈830 | 18 deterministic synthetic episodes (`SYN_001`..`SYN_018`) + frozen `SYNTHETIC_EPISODE_CORPUS_BY_ID` lookup + `getSyntheticEpisodeById` / `getSyntheticEpisodesByTag` / `getSyntheticEpisodesByRegime` helpers |
| `src/services/judgment-truth-suite/__tests__/synthetic-episode-corpus.test.ts` | ≈340 | 32 tests across 6 classes A–F, 0 module mocks |
| `docs/backend-v1/phase-3/records/backend-task-admission-records/P3-BTAR-003-synthetic-episode-corpus.md` | (this) | BTAR admission + completion record |

### 17.3 Files Modified (registries only)

```text
docs/backend-v1/phase-3/registries/phase-3-btar.registry.md            (row added, current status updated)
docs/backend-v1/phase-3/registries/phase-3-record-index.registry.md    (row added, next-action note updated)
docs/backend-v1/phase-3/registries/phase-3-decision-log.registry.md    (ADMITTED + COMPLETED rows appended)
docs/backend-v1/phase-1/registries/backend-v1-record-index.registry.md (cross-phase row added)
docs/backend-v1/phase-1/registries/backend-v1-decision-log.registry.md (cross-phase row appended)
```

**Zero non-registry source files modified outside the new files above.** The P3-BTAR-001 starter fixtures file (`synthetic-episode-fixtures.ts`) is **NOT** modified — the corpus defines its own `SYN_001` inline so the corpus can carry `family:FAM-001` tag and ≥2 contradictions without disturbing the starter regression suite.

### 17.4 Episode Count and Family Coverage

```text
Corpus size:               18 episodes  (within 15–25 band; matches recommended target)
Required families:         18 / 18 covered  (FAM-001..FAM-018)
Optional/extra families:    0
```

Coverage table:

| Family | Episode |
| ------ | ------- |
| FAM-001 Clean accumulation | SYN-001-clean-accumulation |
| FAM-002 Early accumulation with weak sentiment | SYN-002-early-accumulation-weak-sentiment |
| FAM-003 Leverage-driven fake strength | SYN-003-leverage-driven-fake-strength |
| FAM-004 Spot-led healthy expansion | SYN-004-spot-led-healthy-expansion |
| FAM-005 Late euphoric momentum | SYN-005-late-euphoric-momentum |
| FAM-006 Unlock-risk distribution | SYN-006-unlock-risk-distribution |
| FAM-007 Fundamentals improving but timing late | SYN-007-fundamentals-improve-late-timing |
| FAM-008 Whale accumulation with flat price | SYN-008-whale-accumulation-flat-price |
| FAM-009 Price pump with weak on-chain quality | SYN-009-price-pump-weak-onchain |
| FAM-010 Sentiment-only pump | SYN-010-sentiment-only-pump |
| FAM-011 Derivatives squeeze risk | SYN-011-derivatives-squeeze-risk |
| FAM-012 Liquidity-thin breakout | SYN-012-liquidity-thin-breakout |
| FAM-013 Risk-off market despite asset strength | SYN-013-risk-off-asset-strength |
| FAM-014 Mixed signals / low confidence | SYN-014-mixed-signals-low-confidence |
| FAM-015 Degraded data / partial blindness | SYN-015-degraded-partial-blindness |
| FAM-016 Security-risk override | SYN-016-security-risk-override |
| FAM-017 Exchange inflow distribution risk | SYN-017-exchange-inflow-distribution |
| FAM-018 Narrative catalyst with weak fundamentals | SYN-018-narrative-catalyst-weak-fundamentals |

### 17.5 Oracle Quality Summary

```text
9-field oracle present on every episode:                18 / 18  (Class C1)
≥2 required_contradictions on every oracle:             18 / 18  (Class C2)
≥2 forbidden_claims on every oracle:                    18 / 18  (Class C3)
≥2 required_reasoning_notes on every oracle:            18 / 18  (Class C4)
no empty-string oracle fields anywhere:                 18 / 18  (Class C5)
explicit anti-overconfidence forbidden_claim present:   18 / 18  (Class C6)
```

### 17.6 Confidence and Timing Calibration Proof

```text
Confidence band distribution:
  VERY_HIGH:     0 episodes   (Plan §13 — must not appear; mechanically asserted D1)
  HIGH:          1 episode    (SYN-004 spot-led healthy expansion — multi-signal alignment justifies)
  MEDIUM:        8 episodes
  LOW:           8 episodes
  VERY_LOW:      1 episode    (SYN-016 security risk override)

Calibration tests (Class D):
  D1 no VERY_HIGH                                            PASS
  D2 degraded (FAM-015 or degraded_components) ≠ HIGH/VERY_HIGH  PASS
  D3 leverage fake strength (FAM-003)         ≠ HIGH/VERY_HIGH  PASS
  D4 security risk override   (FAM-016)       ≠ HIGH/VERY_HIGH  PASS
  D5 late euphoric momentum   (FAM-005) timing ∈ {LATE, EXHAUSTED}  PASS  (EXHAUSTED)
  D6 degraded partial blindness (FAM-015) timing = UNCLEAR    PASS
```

### 17.7 Runner Compatibility Proof (Class F)

```text
runJudgmentTruthCorpus(SYNTHETIC_EPISODE_CORPUS, oracleEchoExecutor)
  → 18 results returned                                                PASS (F1)
  → result order matches corpus order                                   PASS (F2)
  → every result.runner_status === 'RUNNER_COMPLETED'                   PASS (F3)
  → every result.comparison_ready === true                              PASS (F4)
  → every result.semantic_assertions_run === false (type-pinned)        PASS (F5)
  → every result.no_real_provider_calls === true (type-pinned)          PASS (F6)
  → single-episode SYN-001 run returns RUNNER_COMPLETED + actual_judgment populated   PASS (F7)
```

This proves runner-mechanics-at-corpus-scale only. **No semantic correctness claim is made by P3-BTAR-003.** Semantic scoring is P3-BTAR-004's job (Plan-3.0-INV-01 honesty pin preserved).

### 17.8 Test Results

```text
pnpm check:backend                                                                       → EXIT 0 (clean typecheck)
src/services/judgment-truth-suite/__tests__/synthetic-episode-corpus.test.ts             → 32 / 32 PASS (10ms)
src/services/judgment-truth-suite/__tests__/judgment-truth-runner.test.ts                → 20 / 20 PASS (P3-BTAR-002 regression)
src/services/judgment-truth-suite/__tests__/synthetic-episode-fixtures.test.ts           → 20 / 20 PASS (P3-BTAR-001 regression)
Combined judgment-truth-suite run (3 files)                                              → 72 / 72 PASS
src/api/chat/__tests__/  (Phase 2 regression, 11 files)                                  → 154 / 154 PASS
Grand total this session                                                                 → 226 / 226 PASS (across 14 test files)
```

### 17.9 Test Class Coverage (per §19 of admission)

| Class | Tests | Coverage |
| --- | ---: | --- |
| A — Corpus shape | 5 | A1 15–25 band / A2 recommended target=18 / A3 unique IDs / A4 all validate / A5 corpus-by-id integrity |
| B — Family coverage | 5 | B1 every required family covered / B2 every episode has family tag / B3 no zero-coverage family / B4 getSyntheticEpisodesByTag parity / B5 getSyntheticEpisodesByRegime correctness |
| C — Oracle quality | 6 | C1 7-field surface present / C2 ≥2 contradictions / C3 ≥2 forbidden_claims / C4 ≥2 reasoning_notes / C5 no empty strings / C6 anti-overconfidence claim present |
| D — Confidence + timing calibration | 6 | D1 no VERY_HIGH / D2 degraded ≠ HIGH+ / D3 FAM-003 ≠ HIGH+ / D4 FAM-016 ≠ HIGH+ / D5 FAM-005 timing / D6 FAM-015 timing |
| E — No-provider proof | 3 | E1 12-key deep-walk for forbidden provider payload keys / E2 real-invocation regex for vi.mock / E3 import-statement extraction with 18 forbidden specifier substrings |
| F — Runner compatibility | 7 | F1 one-result-per-episode / F2 order preserved / F3 all RUNNER_COMPLETED / F4 comparison_ready=true / F5 semantic_assertions_run=false / F6 no_real_provider_calls=true / F7 single-episode SYN-001 |

**Total: 32 tests** (within the 24–30 suggested band, with 2 extras for helper parity in Class B).

### 17.10 Mock-Count Evidence

```text
synthetic-episode-corpus.test.ts        → 0 vi.mock() invocations (mechanically asserted in Class E2)
synthetic-episode-corpus.ts             → imports types only + uses `SyntheticEpisodeInput`/`SyntheticMarketRegime`
synthetic-episode-corpus.metadata.ts    → no runtime imports (pure data + types)
```

Test file `import` statements (mechanically enumerated in Class E3, all clean):

```text
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SYNTHETIC_EPISODE_CORPUS, SYNTHETIC_EPISODE_CORPUS_BY_ID, getSyntheticEpisodeById, getSyntheticEpisodesByRegime, getSyntheticEpisodesByTag } from '../synthetic-episode-corpus';
import { REQUIRED_SYNTHETIC_EPISODE_FAMILIES, SYNTHETIC_EPISODE_CORPUS_TARGET_SIZE, type SyntheticEpisodeFamilyCoverage } from '../synthetic-episode-corpus.metadata';
import { FORBIDDEN_PROVIDER_PAYLOAD_KEYS, validateSyntheticEpisode } from '../synthetic-episode-validation';
import type { ExpectedConfidenceBand, ExpectedTimingPhase, SyntheticEpisodeInput } from '../synthetic-episode.types';
import { runJudgmentTruthCorpus, runJudgmentTruthEpisode } from '../judgment-truth-runner';
import type { SyntheticActualJudgment, SyntheticJudgmentExecutor, SyntheticJudgmentExecutorMetadata } from '../judgment-truth-runner.types';
```

Zero provider, AI, chat-service, judgment, market-data, l13, or l14 imports.

### 17.11 No-Real-API Proof (Plan-3.0-LAW-03)

```text
Provider imports across all 3 new files:           0
Network calls:                                      0
process.env reads in production corpus code:        0
Provider API keys required by any test:             0
Date.now() / Math.random() in corpus data:          0
Live price references:                              0
```

Defense-in-depth:

- **Source rule**: corpus is statically declared TypeScript object literals; no runtime mutation, no dynamic generation, no environment reads.
- **Validation**: every episode passes `validateSyntheticEpisode` (which runs the 12-key forbidden-provider-payload deep-walk).
- **Class E1**: deep-walk over every key in every episode rejects any of the 12 forbidden keys (`coingecko_id`, `coinglass_id`, `nansen_label`, `arkham_entity`, `alchemy_response`, `quicknode_payload`, `api_key`, `authorization`, `bearer`, `headers`, `raw_response`, `provider_payload`).
- **Class E2**: real-invocation regex (`/^[ \t]*vi\.mock\s*\(/m`) over the test file's own source rejects any actual `vi.mock(` call site (allowing the regex literal itself, which is in a comment-adjacent string and never a line-start invocation).
- **Class E3**: import-statement extraction with 18 forbidden specifier substrings (openai, grok, @anthropic-ai, coingecko, coinglass, nansen, arkham, alchemy, quicknode, lunarcrush, cryptopanic, twitter, api/chat/service, services/judgment, services/ai-service, services/market-data, src/l13, src/l14).

### 17.12 Semantic-Scoring-Not-Run Honesty (Plan-3.0-INV-01)

```text
The corpus does NOT compare actual_judgment to expected_oracle.
The corpus does NOT score correctness.
The runner result envelope continues to pin `semantic_assertions_run: false`.
No assertion in this test file claims the active judgment engine produces correct judgments.
```

The oracle-echo executor used in Class F deliberately echoes the expected oracle so that `RUNNER_COMPLETED` proves runner mechanics on the corpus, not judgment correctness on the active engine. P3-BTAR-004 is where semantic scoring happens.

### 17.13 Plan 3.0 LAW + INV Audit

| Pin | Status | Evidence |
| --- | ------ | -------- |
| LAW-01 (no real APIs before correctness proven) | PASS | Corpus is deterministic + provider-free + key-rejected (E1) |
| LAW-02 (no test loosening to fake passes) | PASS | When initial SYN-001 reuse failed C2 (≥2 contradictions) and B1 (family coverage), the fix was to define a fresh corpus SYN-001 with ≥2 contradictions AND a `family:FAM-001` tag — **not** to weaken the test. Tests were tightened (C6 explicit anti-overconfidence clause), not loosened |
| LAW-03 (no Phase 3 test may require any provider key) | PASS | 0 provider imports, 0 network calls, 0 env reads; Class E1/E2/E3 mechanical proofs |
| LAW-04 (anti-sprawl — no Plan 3.x unless cross-cutting) | PASS | This is a P3-BTAR, not a Plan 3.x |
| INV-01 (judgment failure must NOT appear as success) | PASS | `semantic_assertions_run: false` literal pin preserved; no correctness claim made |

### 17.14 Out-of-Scope Audit (spec §4 + Plan 3.0 §5)

```text
[x] No semantic assertion engine                                 (P3-BTAR-004)
[x] No scoring engine                                            (P3-BTAR-004)
[x] No truth-suite report                                        (P3-BTAR-005)
[x] No judgment flaw remediation                                 (P3-BTAR-006 conditional)
[x] No active judgment engine adapter                            (Plan 2.3 OOS-007)
[x] No real API integration
[x] No provider mapping
[x] No frontend changes
[x] No new judgment-engine variant
[x] No chat-service / ai-service changes
[x] Zero `src/l*/` diff                                          (Plan 1.4 architecture freeze)
[x] No v2 / final files                                          (Plan 2.3 OOS-012/013/014)
[x] No Plan 1.3 deferred area activation
[x] P3-BTAR-001 fixtures file NOT modified
[x] P3-BTAR-002 runner files NOT modified
```

Forbidden surfaces confirmed absent in diff: `src/api/chat/service.ts`, `src/services/judgment/*`, `src/services/ai-service.ts`, `src/l13/`, `src/l14/`, `src/index.ts`, `prisma/schema.prisma`, `apps/client-web/`, CI, root `package.json`, `tsconfig.json`.

### 17.15 Registry Sync Proof

```text
[x] phase-3/registries/phase-3-btar.registry.md          — P3-BTAR-003 row appended, current status updated
[x] phase-3/registries/phase-3-record-index.registry.md  — P3-BTAR-003 row appended, next-action updated
[x] phase-3/registries/phase-3-decision-log.registry.md  — ADMITTED + COMPLETED rows appended in chronological order
[x] phase-1/registries/backend-v1-record-index.registry.md — cross-phase row appended
[x] phase-1/registries/backend-v1-decision-log.registry.md — cross-phase row appended
[x] MEMORY.md                                             — P3-BTAR-003 completion summary added
```

### 17.16 Findings

No findings filed.

### 17.17 Done Definition Check (per §25 of admission)

```text
[x] BTAR record exists.
[x] synthetic-episode-corpus.ts exists.
[x] synthetic-episode-corpus.metadata.ts exists.
[x] synthetic-episode-corpus.test.ts exists.
[x] 15–25 synthetic episodes exist (18).
[x] Recommended target of 18 episodes met.
[x] All required 15 families covered (plus 3 recommended additions FAM-016/017/018).
[x] All episodes validate.
[x] All episode IDs are unique.
[x] All oracles include the required fields.
[x] Every oracle has ≥2 contradictions, ≥2 forbidden claims, ≥2 reasoning notes.
[x] Confidence calibration tests pass (D1–D4).
[x] Timing calibration tests pass (D5–D6).
[x] No provider payload keys exist anywhere in the corpus.
[x] Full corpus runs through P3-BTAR-002 runner.
[x] Runner returns comparison_ready results.
[x] semantic_assertions_run remains false.
[x] No semantic assertion engine created.
[x] No truth-suite report created.
[x] No judgment logic modified.
[x] No real APIs required.
[x] No provider keys required.
[x] P3-BTAR-001 tests still pass (20/20).
[x] P3-BTAR-002 tests still pass (20/20).
[x] Phase 2 chat tests still pass (154/154).
[x] Registries updated.
```

### 17.18 Next Governance Action

Admit **P3-BTAR-004 — Semantic Assertion Engine** via Plan 1.6 process. P3-BTAR-004 is where actual-vs-expected comparison and correctness scoring begin; the corpus delivered by P3-BTAR-003 becomes its primary input dataset.

