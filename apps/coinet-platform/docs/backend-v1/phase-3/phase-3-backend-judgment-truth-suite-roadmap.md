# Plan 3.0 — Backend Judgment Truth Suite Roadmap

## 0. Document Identity

```text
Title:            Plan 3.0 — Backend Judgment Truth Suite Roadmap
Status:           ACTIVE
Authority Level:  Level 1 (Master Roadmap for Phase 3)
Phase:            Phase 3 — Backend Judgment Truth Suite
Created:          2026-05-26
Created After:    P2TG-001 — ACCEPTED — P3-READY (2026-05-25)
Operator:         Backend program owner
Purpose:          Test and improve Coinet judgment quality using controlled synthetic market episodes.
```

Core meaning:

```text
This document is the master roadmap for Phase 3.
It does not implement Phase 3 code.
It does not admit the first Phase 3 BTAR by itself.
It does not connect any real API.
It does not change frontend.
It does not migrate L13/L14.
```

Roles inside Phase 3:

```text
Plan 3.0  = master roadmap (this document)
P3-BTARs  = implementation work (admitted individually via Plan 1.6)
P3TG-001  = final Phase 3 transition gate
```

Phase 3 dependency check (verified at creation):

```text
[x] P2TG-001 exists                                                          (phase-2/records/decisions/P2TG-001-phase-2-transition-gate.md)
[x] P2TG-001 decision = P3-READY                                             (2026-05-25)
[x] Phase 2 status = COMPLETE                                                (per transition-gate registry)
[x] Phase 3 status = UNLOCKED_FOR_SYNTHETIC_TRUTH_SUITE                      (per transition-gate registry)
[x] BTAR-003..008 are COMPLETED                                               (per phase-2-btar.registry.md)
[x] FRP-001 is COMPLETED
[x] pnpm check:backend passed at P2TG-001 gate-time                          (exit 0)
[x] Full chat suite passed at P2TG-001 gate-time                             (154/154 across 11 files)
```

---

## 1. Phase 3 Mission

```text
Phase 3 exists to test whether Coinet's judgment engine produces correct, coherent, useful, and non-overconfident market judgment under controlled synthetic crypto market episodes.
```

Phase 3 must test the system's ability to answer:

```text
What is happening?
Why is it happening?
What is the thesis?
What contradicts the thesis?
Is the setup early, mature, late, fragile, or invalidating?
What scenario should be watched next?
How much confidence does the judgment deserve?
```

Phase 3 is the first phase focused on **judgment quality**, not infrastructure safety.

```text
Phase 1 made the backend honest.
Phase 2 made the live AI path trustworthy.
Phase 3 tests whether the judgment itself is actually correct.
```

A judgment can be type-safe and still wrong. Phase 3 makes that kind of error detectable. Example:

```text
Episode:
  Spot demand is weak.
  Funding is high.
  Open interest rises aggressively.
  Sentiment is euphoric.

Bad judgment:
  Clean high-confidence accumulation.

Correct judgment:
  Leverage-driven fragile expansion with confidence capped.
```

---

## 2. Why Phase 3 Comes Before Real APIs

Phase 3 uses synthetic data because synthetic data is controlled.
Real APIs are delayed because real data is messy, inconsistent, provider-shaped, and harder to debug.

Correct order:

```text
Controlled fake data
  → judgment correctness
  → normalized signal schema
  → real API integration
```

Forbidden inversion:

```text
Real APIs first
  → messy data
  → unclear failures
  → expensive confusion
```

**Doctrine (Plan-3.0-LAW-01):** Do not connect expensive real APIs before the judgment logic proves it can reason correctly under controlled conditions.

Phase 3 is the controlled-conditions phase. Phase 4 (Plan 4.0, future) is the real-provider phase.

---

## 3. First Principle

```text
Coinet must not only answer safely. Coinet must judge correctly.
```

Phase 2 made Coinet safer.
Phase 3 makes Coinet smarter.

The system must distinguish, in controlled synthetic episodes:

```text
clean accumulation
fragile expansion
leverage-driven fake strength
late euphoric momentum
unlock-risk distribution
sentiment-only pump
fundamental rerating
liquidity-thin breakout
mixed contradiction
degraded partial read
```

Plan-3.0-INV-01 (first-principle invariant):

```text
A Phase 3 BTAR may NOT make a judgment failure look like a judgment success.
Tests must FAIL when judgment is wrong, not be loosened to absorb the wrongness.
```

---

## 4. In-Scope Work

Plan 3.0 allows the following Phase 3 work (admitted through P3-BTARs via Plan 1.6):

```text
[in scope] synthetic episode schema
[in scope] expected judgment oracle schema
[in scope] synthetic fixture corpus (15–25 episodes)
[in scope] judgment truth runner
[in scope] semantic assertion engine
[in scope] full truth-suite execution + report
[in scope] reasoning flaw registry
[in scope] bounded judgment-logic fixes ONLY IF tests expose serious flaws (P3-BTAR-006 only)
```

Allowed code areas (introduced by P3-BTARs, NOT touched by Plan 3.0 itself):

```text
src/services/judgment-truth-suite/
src/services/judgment-truth-suite/__tests__/
src/services/judgment/                                  (touch only under P3-BTAR-006, only with explicit admission)
src/services/judgment/__tests__/                        (synthetic-episode-driven additions only)
docs/backend-v1/phase-3/                                (docs, registries, records)
```

Plan 3.0 itself touches **only documentation** (this roadmap, registries, READMEs).

---

## 5. Out-of-Scope Boundaries

The following are explicitly forbidden in Phase 3 under Plan 3.0:

```text
[forbidden] real paid API integration
[forbidden] provider purchase implementation
[forbidden] CoinGecko / CoinGlass / Nansen / Arkham integration
[forbidden] Alchemy / QuickNode / Twitter / LunarCrush integration
[forbidden] real API-dependent tests
[forbidden] tests that require any provider API key
[forbidden] frontend / backend product integration
[forbidden] Strategy Lab backend
[forbidden] Chart Canvas backend
[forbidden] plugin system
[forbidden] agent builder
[forbidden] portfolio backend expansion
[forbidden] advanced alerts platform
[forbidden] full CIP.1
[forbidden] full L13/L14 production migration
[forbidden] L13/L14 runtime activation in chat or judgment path
[forbidden] new ai-service-v2.ts
[forbidden] new judgment-engine-final.ts
[forbidden] new chat-service-v2.ts
[forbidden] broad duplicate cleanup
[forbidden] full chat-service rewrite
[forbidden] performance optimization unrelated to judgment correctness
```

Phase 3 is not Phase 4. Phase 4 admission requires P3TG-001 returning `P4-READY_FOR_PROVIDER_INTEGRATION`.

---

## 6. Judgment Contract Under Test

Every synthetic episode must test the seven-field judgment contract:

```text
1. State
2. Cause
3. Thesis
4. Contradictions
5. Timing
6. Scenario
7. Confidence
```

Plan 3.0 explicit declaration:

```text
Phase 3 tests semantic correctness, not only valid object shape.
A judgment may contain all required fields and still fail if the interpretation is wrong.
```

Type-safety was earned in Phases 1–2. Semantic correctness is the Phase 3 contribution.

---

## 7. Synthetic Episode Concept

A synthetic episode is:

```text
A controlled fake crypto market situation containing structured signal conditions across spot, derivatives, on-chain, sentiment, fundamentals, risk, liquidity, and events.
```

Each episode SHOULD include (final schema is defined by P3-BTAR-001):

```text
episode_id
title
asset_symbol            (optional; many episodes are asset-agnostic regimes)
market_regime
spot_signals
derivatives_signals
on_chain_signals
sentiment_signals / narrative_signals
fundamental_signals
risk_signals
liquidity_signals
event_context
blind_spots
degraded_components
```

Construction rules:

```text
No real providers.
No real API calls.
No environment-dependent randomness.
Episodes are deterministic, in-memory, file-backed fixtures.
```

---

## 8. Expected Judgment Oracle Concept

Each episode must include an **expected judgment oracle** — the correct answer Coinet should produce.

Required oracle fields (final schema defined by P3-BTAR-001):

```text
expected_state
expected_cause_family
expected_thesis_direction
required_contradictions
expected_timing_phase
expected_scenario_type
expected_confidence_band
forbidden_claims
required_reasoning_notes
```

The oracle is what the truth suite compares Coinet against.

Oracle authoring rules:

```text
The oracle is authored once per episode and reviewed.
The oracle defines the SEMANTIC outcome, not the exact wording.
Forbidden claims are explicit (e.g., "must NOT call this clean accumulation").
Required reasoning notes are explicit (e.g., "must mention funding-driven fragility").
```

---

## 9. Phase 3 BTAR Sequence

The expected Phase 3 implementation sequence (each admitted individually via Plan 1.6):

| Task         | Title                                                  | Required for Phase 3 done?         | Touches |
| ------------ | ------------------------------------------------------ | ---------------------------------- | ------- |
| P3-BTAR-001  | Synthetic Episode Contract and Fixture System          | **Required**                       | new `src/services/judgment-truth-suite/synthetic-episode.types.ts` + first fixtures + tests |
| P3-BTAR-002  | Judgment Truth Runner                                  | **Required**                       | new `src/services/judgment-truth-suite/judgment-truth-runner.ts` + tests |
| P3-BTAR-003  | Synthetic Episode Corpus (15–25 episodes)              | **Required**                       | new fixtures only (no new contract, no new runner) |
| P3-BTAR-004  | Semantic Assertion Engine                              | **Required**                       | new `src/services/judgment-truth-suite/semantic-assertions.ts` + tests |
| P3-BTAR-005  | Full Truth Suite Execution and Report                  | **Required**                       | new `judgment-truth-suite.test.ts` + `docs/backend-v1/phase-3/judgment-truth-suite-report.md` |
| P3-BTAR-006  | Serious Judgment Flaw Remediation                       | **Conditional** (only if P3-BTAR-005 surfaces CRITICAL_FAIL / FAIL flaws) | bounded touches to `src/services/judgment/` under explicit admission |
| P3TG-001     | Phase 3 Transition Gate                                 | **Required (final)**               | `phase-3/records/decisions/P3TG-001-phase-3-transition-gate.md` |

Rules:

```text
P3-BTARs do the work.
Plan 3.0 only defines the roadmap.
Each P3-BTAR uses the Plan 1.6 admission process (template, eight-question gate, scope mapping).
Plan 3.0 may NOT short-circuit Plan 1.6.
```

---

## 10. Validation Standard

Every P3-BTAR must run:

```bash
pnpm check:backend
```

Relevant Phase 3 tests (introduced by P3-BTAR-001..005):

```bash
cd apps/coinet-platform && pnpm exec vitest run src/services/judgment-truth-suite/__tests__/
```

Phase 2 regression must remain green:

```bash
cd apps/coinet-platform && pnpm exec vitest run src/api/chat/__tests__/
```

Phase 3 standing rule:

```text
No real API keys may be required to run any Phase 3 test.
```

---

## 11. Serious Judgment Flaw Handling

Phase 3 flaw severity ladder (per-episode classification produced by the semantic-assertion engine):

```text
PASS
WARNING
FAIL
CRITICAL_FAIL
```

Meanings:

```text
PASS            = judgment matches expected oracle
WARNING         = directionally right but missing nuance (e.g., correct thesis, weak contradiction mention)
FAIL            = important expected element missing or wrong (e.g., wrong thesis direction, missing required contradiction)
CRITICAL_FAIL   = wrong thesis + dangerous confidence, or contradiction ignored when explicitly required
```

Examples of serious flaws (non-exhaustive):

```text
confidence inflation
missing contradiction when required
wrong timing phase
treating leverage as spot demand
treating sentiment as substance
ignoring unlock risk
ignoring liquidity fragility
ignoring degraded-data status
```

Handling rule (Plan-3.0-LAW-02 — honesty pin):

```text
Do not weaken tests to fake a pass.
Do not change episodes to hide flaws.
Either fix judgment logic (via admitted P3-BTAR-006 scope) or document the flaw honestly in the Phase 3 findings registry.
```

---

## 12. No-API Rule

Plan 3.0 standing rule (Plan-3.0-LAW-03):

```text
Phase 3 tests must run without OpenAI, Grok, CoinGecko, CoinGlass, Nansen, Arkham, Alchemy, QuickNode, Twitter, LunarCrush, or any real provider.
```

Enforcement:

```text
If a test requires a real provider key, the P3-BTAR fails.
If a test imports a module that triggers real network calls, the P3-BTAR fails.
Mocks, fixtures, and pure synthetic data are the only sources of input for Phase 3 tests.
```

---

## 13. Required Phase 3 Artifacts

Final expected artifacts when Phase 3 is done (created across P3-BTAR-001..005 + P3TG-001):

### Docs

```text
docs/backend-v1/phase-3/phase-3-backend-judgment-truth-suite-roadmap.md   (this document)
docs/backend-v1/phase-3/judgment-truth-suite-report.md                     (P3-BTAR-005)
docs/backend-v1/phase-3/records/decisions/P3TG-001-phase-3-transition-gate.md
```

### Code (later, introduced by P3-BTARs)

```text
src/services/judgment-truth-suite/synthetic-episode.types.ts                (P3-BTAR-001)
src/services/judgment-truth-suite/synthetic-episode-fixtures.ts             (P3-BTAR-001, expanded by P3-BTAR-003)
src/services/judgment-truth-suite/judgment-truth-runner.ts                  (P3-BTAR-002)
src/services/judgment-truth-suite/semantic-assertions.ts                    (P3-BTAR-004)
```

### Tests (later, introduced by P3-BTARs)

```text
src/services/judgment-truth-suite/__tests__/synthetic-episode-fixtures.test.ts   (P3-BTAR-001 / -003)
src/services/judgment-truth-suite/__tests__/judgment-truth-runner.test.ts        (P3-BTAR-002)
src/services/judgment-truth-suite/__tests__/semantic-assertions.test.ts          (P3-BTAR-004)
src/services/judgment-truth-suite/__tests__/judgment-truth-suite.test.ts          (P3-BTAR-005)
```

### Registries

```text
docs/backend-v1/phase-3/registries/phase-3-btar.registry.md
docs/backend-v1/phase-3/registries/phase-3-record-index.registry.md
docs/backend-v1/phase-3/registries/phase-3-decision-log.registry.md
docs/backend-v1/phase-3/registries/phase-3-findings.registry.md
```

Plan 3.0 creates the four registries empty-but-structured. P3-BTARs append rows.

---

## 14. Done Definition

Phase 3 is DONE only when ALL of the following are true:

```text
[ ] Plan 3.0 exists.                                                    (created here)
[ ] P3-BTAR-001 completed.
[ ] P3-BTAR-002 completed.
[ ] P3-BTAR-003 completed.
[ ] P3-BTAR-004 completed.
[ ] P3-BTAR-005 completed.
[ ] P3-BTAR-006 completed if and only if serious flaws were found in P3-BTAR-005.
[ ] 15–25 synthetic episodes exist (P3-BTAR-003).
[ ] Judgment truth runner exists (P3-BTAR-002).
[ ] Semantic assertion engine exists (P3-BTAR-004).
[ ] Truth-suite report exists (P3-BTAR-005).
[ ] All CRITICAL_FAIL flaws are fixed or explicitly carried forward as findings.
[ ] pnpm check:backend exits 0.
[ ] Phase 2 chat tests remain green (regression).
[ ] No real API dependency is introduced.
[ ] P3TG-001 exists and is ACCEPTED.
```

---

## 15. Transition to Phase 4

Phase 4 is only unlocked after P3TG-001.

Expected Phase 4 (subject to its own Plan 4.0 roadmap; not authorized by Plan 3.0):

```text
Real API / provider integration
Normalized internal signal schema
Provider mapping
Real-data ingestion
Cost-aware provider strategy
```

Expected successful P3TG-001 outcome:

```text
P4-READY_FOR_PROVIDER_INTEGRATION
```

Plan 3.0 standing statement:

```text
Phase 3 does not authorize Phase 4 work.
Phase 4 admission requires P3TG-001 returning P4-READY_FOR_PROVIDER_INTEGRATION and a separately admitted Plan 4.0 master roadmap.
```

---

## 16. Anti-Sprawl Rule

Plan-3.0-LAW-04 (anti-sprawl, mirrors Plan 2.0 roadmap §13):

```text
No Plan 3.1, Plan 3.2, or Plan 3.3 may be created unless a future P3-BTAR discovers a major missing cross-cutting rule that affects multiple remaining Phase 3 tasks and cannot be handled inside the BTAR itself.
```

Default decision on any Plan 3.x proposal: **DEFER** → propose as P3-BTAR instead.

Examples (must be P3-BTARs, NOT new Plan 3.x docs):

```text
Need episode schema       → P3-BTAR-001, not Plan 3.1.
Need truth runner         → P3-BTAR-002, not Plan 3.2.
Need synthetic corpus     → P3-BTAR-003, not Plan 3.3.
Need semantic assertions  → P3-BTAR-004, not Plan 3.4.
Need full suite report    → P3-BTAR-005, not Plan 3.5.
Need flaw remediation     → P3-BTAR-006, not Plan 3.6.
```

A new Plan 3.x is admissible **only** if:

```text
A finding cuts across BTARs not yet admitted,
AND it cannot be handled inside any single BTAR's scope,
AND it requires a Level-2 constitutional rule (e.g., a doctrine on how an entire BTAR family must behave).
```

If those three conditions are not all met, the work is a P3-BTAR.

---

## 17. Acceptance Block

```text
Plan 3.0 Status:                  ACTIVE
Phase 3 Status:                   UNLOCKED_FOR_SYNTHETIC_TRUTH_SUITE
Next Action:                      Admit P3-BTAR-001 — Synthetic Episode Contract and Fixture System via Plan 1.6
Source Code Touched:              NO
Real APIs Introduced:             NO
Frontend Changed:                 NO
L13/L14 Migration Started:        NO
chat-service Touched:             NO
ai-service Touched:               NO
judgment-engine Touched:          NO
Registry Sync Completed:          YES (Phase 3 registries created; Phase 1 cross-phase registries updated)
Authority:                        P2TG-001 (2026-05-25) — P3-READY
Honesty pin:                      Phase 3 will fail tests when judgment is wrong; tests will NOT be loosened to fake passes (Plan-3.0-INV-01 + LAW-02)
```

---

## 18. Quick Reference

```text
Plan 3.0                = master roadmap (this document)
P3-BTAR-001..006        = implementation work (admitted individually via Plan 1.6)
P3TG-001                = final Phase 3 transition gate

Phase 3 input:          controlled synthetic episodes (no real APIs)
Phase 3 test target:    7-field judgment contract — semantic correctness
Phase 3 output:         judgment-truth-suite-report.md + P3TG-001 decision
Phase 3 success:        P3TG-001 returns P4-READY_FOR_PROVIDER_INTEGRATION
```

---

*This document is Level 1 (master roadmap for Phase 3). It is authoritative for what Phase 3 is and is not. Individual P3-BTAR records (Level 3, implementation tasks) and P3TG-001 (Level 5, decision record) are appended under `phase-3/records/` and registered in `phase-3/registries/`.*
