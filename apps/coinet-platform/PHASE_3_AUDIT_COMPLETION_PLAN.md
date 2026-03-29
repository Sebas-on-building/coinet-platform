# Phase 3 — Divine Perfection Audit + Completion Plan

## Governing principle

A component is only complete when it passes **all five gates**:

| Gate | Meaning |
|------|---------|
| **A — Structural** | System exists in architecture and code |
| **B — Behavioral** | Logic actually runs in real product flows |
| **C — Output** | Outputs are visible and usable where they matter |
| **D — Evaluation** | Measured against outcomes or reliability criteria |
| **E — Governance** | Configs, thresholds, and evolution are controlled safely |

Score: 0 = not started · 1 = conceptual · 2 = partial · 3 = working but narrow · 4 = production-capable · 5 = governed, evaluated, productized

---

## 1. Master Audit Scorecard

| Pillar | Architecture | Implemented | In Product | Measured | Governed | Status |
|--------|:-----------:|:----------:|:---------:|:-------:|:-------:|--------|
| **Full Hypothesis Engine** | 4/5 | 3/5 | 3/5 | 1/5 | 2/5 | **Partial — strong skeleton, missing evaluation spine** |
| **Score Calibration** | 3/5 | 2/5 | 1/5 | 1/5 | 2/5 | **Partial — scaffolding exists, not wired** |
| **Self-Auditing Intelligence** | 3/5 | 3/5 | 2/5 | 1/5 | 2/5 | **Partial — evaluator runs, no unified engine** |
| **Adaptive Weighting** | 3/5 | 2/5 | 1/5 | 0/5 | 1/5 | **Early — fragmented across systems** |
| **Personalization** | 2/5 | 2/5 | 1/5 | 0/5 | 1/5 | **Early — schema exists, no unified doctrine** |

**Aggregate Phase 3 completion: ~40% of divine perfection.**

---

## 2. Pillar-by-Pillar Audit

---

### Pillar 1 — Full Hypothesis Engine

#### What exists (strengths)

| Component | Location | Status |
|-----------|----------|--------|
| Hypothesis taxonomy (12 classes) | `judgment/taxonomies.ts` — `HYPOTHESIS_CLASSES` | Complete |
| Hypothesis profiles with support rules | `judgment/index.ts` — `HYPOTHESIS_PROFILES` | Complete |
| Signal-based support scoring | `judgment/index.ts` — `computeSupport()` | Complete |
| Contradiction penalties per hypothesis | `judgment/index.ts` — `weakenedBy` × severity | Complete |
| Regime priors (boost/suppress by regime) | `judgment/index.ts` — `UnifiedRegime` conditioning | Complete |
| Entity priors (cap bucket, sector) | `judgment/index.ts` — entity-based adjustment | Complete |
| Primary/secondary thesis with clarity | `judgment/types.ts` — `JudgmentThesis` | Complete |
| Ambiguity flag (spread detection) | `judgment/types.ts` — `ambiguity_flag` | Complete |
| Timing invalidation strings | `judgment/timing-engine.ts` — `invalidates_thesis` | Complete |
| Scenario generation from thesis | `judgment/index.ts` — `generateScenario()` | Complete |
| Evidence ledger | `judgment/index.ts` — `buildEvidenceLedger()` | Partial |
| AI/chat integration | `api/chat/service.ts` + `debug-view.ts` | Complete |
| Calibration type for hypothesis | `calibration/types.ts` — `HypothesisPerformance` | Exists |

#### What is missing (gaps)

| Gap | Severity | What to build |
|-----|----------|---------------|
| **Evidence ↔ hypothesis graph** | High | Per-hypothesis evidence map: which evidence supports, contradicts, or is irrelevant to each ranked hypothesis |
| **Formal invalidation engine** | High | State machine: conditions under which each hypothesis becomes invalid (not just text strings) |
| **Hypothesis transition logic** | Medium | When hypothesis A weakens below threshold, what triggers B to become primary? Explicit rules, not just re-sort |
| **Confidence spread surfacing** | Medium | Product-visible spread between top-1 and top-2 (already computed as `clarity`, but not prominently surfaced) |
| **"What would flip" output** | Medium | Per-judgment: "if X evidence changed, ranking would reverse" — counterfactual explanation |
| **Thesis ↔ connector integration** | Medium | `thesis_critical_truth_classes` from judgment → connector acquire params (currently unconnected) |
| **Evaluation: hypothesis hit rate** | High | Forward tracking: was the primary hypothesis confirmed by outcomes? Regime-segmented |
| **Taxonomy ↔ fallback doctrine alignment** | Low | `HYPOTHESIS_CLASSES` enum names vs `weakened_hypothesis_types` in fallback doctrine — reconcile |

#### Completion tasks (ordered)

1. **Hypothesis invalidation engine** — formal rule system per class (not strings)
2. **Evidence ↔ hypothesis mapping** — tag evidence items with which hypotheses they support/contradict
3. **Counterfactual layer** — "what would change the ranking" per judgment
4. **Thesis → connector wiring** — pass `thesis_critical_truth_classes` from judgment to evidence acquisition
5. **Hypothesis evaluation harness** — persist `topHypothesis` per snapshot, track confirmation rates
6. **Product: spread + flip visibility** — surface clarity, spread, and counterfactual in token page / chat

---

### Pillar 2 — Personalization

#### What exists (strengths)

| Component | Location | Status |
|-----------|----------|--------|
| Prisma `UserPreferences` schema | `prisma/schema.prisma` | Exists (retention-focused) |
| Prisma `UserMemory` storage | `prisma/schema.prisma` | Exists |
| Memory extraction from chat | `memory-service.ts` — `extractMemoriesFromMessage()` | Working |
| User context for AI | `memory-service.ts` — `buildUserContextForAI()` | Working |
| Chat personalization injection | `api/chat/service.ts` | Working |
| Notification preferences | Multiple services (send-notifications, live-market-feeds) | Fragmented |
| OmniScore "views" (same truth, different slice) | `omniscore_v3/types.ts` — allocator/trader view | Conceptual |
| `preferredDepth` field | `UserPreferences` Prisma model | Schema only |

#### What is missing (gaps)

| Gap | Severity | What to build |
|-----|----------|---------------|
| **Unified decision profile model** | High | Canonical `DecisionProfile` type: horizon, style, risk, depth, asset focus — one source of truth |
| **Personalization boundary doctrine** | Critical | Formal rule: what personalization may/may not affect. Must never alter raw scores, contradictions, regime, or fallback penalties |
| **Profile-aware output contract** | High | Delivery rules: short-horizon first for scalpers, structural-thesis first for investors, etc. |
| **Horizon preference → judgment** | Medium | User horizon weighting scenario priorities (not truth) |
| **Alert threshold personalization** | Medium | User-tunable sensitivity per alert type with safety floors |
| **Cross-surface consistency** | Medium | Same profile governs chat, token page, alerts, reports |
| **Evaluation** | High | Does personalization improve engagement without distorting truth? |
| **No truth corruption tests** | Critical | Automated: same evidence → same core scores regardless of profile |

#### Completion tasks (ordered — last pillar)

1. **Personalization boundary doctrine** — write the inviolable rule
2. **Canonical `DecisionProfile` type** — unified schema
3. **Profile-aware delivery rules** — horizon/style → output ordering
4. **Safety tests** — prove same evidence base, same core truth across profiles
5. **Product integration** — settings UI, cross-surface delivery
6. **Evaluation** — engagement + truth-integrity metrics

---

### Pillar 3 — Score Calibration

#### What exists (strengths)

| Component | Location | Status |
|-----------|----------|--------|
| `ScoreSnapshot` type | `calibration/types.ts` | Complete |
| `Outcome` + `OutcomeType` types | `calibration/types.ts` | Complete (missing 6h/72h) |
| `CalibrationReport` type | `calibration/types.ts` | Complete |
| `DriftReport` + `DriftDimension` types | `calibration/types.ts` | Complete |
| `UserFeedback` type | `calibration/types.ts` | Complete |
| In-memory outcome tracker | `calibration/outcome-tracker.ts` | Exists (not wired) |
| Feedback loop + calibration report | `calibration/feedback-loop.ts` | Exists (not wired) |
| Drift monitor | `calibration/drift-monitor.ts` | Exists (not wired) |
| OmniScore golden cases | `omniscore_v3/calibration/golden-cases.ts` | Working (BTC/ETH/SOL) |
| OmniScore distribution health | `omniscore_v3/calibration/distribution.ts` | Working |
| Prisma `OmniScoreHistory` | `prisma/schema.prisma` | Exists |
| Config version tracking | `truth-dump.ts` + `debug-view.ts` | Partial |
| Backfill/replay routing | `connector-layer/routing-modes.ts` | Complete |

#### What is missing (gaps)

| Gap | Severity | What to build |
|-----|----------|---------------|
| **Calibration module not wired** | Critical | `services/calibration/` has zero imports — never called from any HTTP handler or pipeline |
| **6h/72h forward windows** | High | `OutcomeType` lacks `price_change_6h` and `price_change_72h` |
| **Automated outcome collection** | Critical | Only `collect24hOutcomes` exists (in-memory); no 7d/30d scheduled jobs |
| **Score reliability curves** | High | No persisted reliability tables; no "does 80 outperform 60" analysis |
| **Config-linked evaluation** | High | Outcomes not tied to `engineVersion`/`formulaVersion` at evaluation time |
| **Regime-segmented calibration** | Medium | Type exists (`RegimePerformance`) but no production pipeline populates it |
| **Product: calibration dashboard** | Medium | No UI for reliability curves, hit rates, or drift visualization |
| **Persistent storage** | High | In-memory snapshots/outcomes — need DB persistence for production calibration |

#### Completion tasks (ordered)

1. **Wire calibration module** — integrate `captureSnapshot` into judgment API response path
2. **Add 6h/72h outcome types** — extend `OutcomeType`
3. **Persistent snapshot storage** — move from in-memory to Prisma/Postgres
4. **Automated outcome collection** — scheduled jobs for 24h/7d/30d price outcomes
5. **Config-linked snapshots** — stamp `engineVersion`, `formulaVersion`, `judgmentConfigVersion` on every snapshot
6. **Score reliability computation** — bucketed performance, monotonicity, calibration error
7. **Internal calibration dashboard** — reliability curves, regime breakdown, drift
8. **Golden-case expansion** — beyond BTC/ETH/SOL to cover asset diversity

---

### Pillar 4 — Adaptive Weighting

#### What exists (strengths)

| Component | Location | Status |
|-----------|----------|--------|
| Adaptive weighting engine (analytics) | `ai-analytics/adaptive_weighting_engine.ts` | Exists (separate service) |
| Signal eval adaptive weights | `signal-evaluation-engine/src/correlation/` | Exists |
| Regime-aware rule weights | `signal-evaluation-engine/src/alerts/RuleEngine.ts` | Working |
| CSI v5 effective weights | `csi-v5-calibrated.ts` — quality × base weight | Working |
| OmniScore v3 fixed weights | `omniscore_v3/scoring/weights.ts` | Fixed (explicit) |
| Source health weight suppression | `omniscore-stability.ts` — degraded/failed source factor | Working |
| OmniScore weight lifecycle enum | `omniscore-v2.2.ts` — `CalibrationStatus.weightsStatus` | Schema only |
| ML multimodal fusion weights | `ai-services/ml-service/multimodal_fusion.py` | Working (Python) |
| Hypothesis regime conditioning | `judgment/index.ts` — boost/suppress by regime | Working |

#### What is missing (gaps)

| Gap | Severity | What to build |
|-----|----------|---------------|
| **Unified weight policy framework** | Critical | No single module governs which scores adapt, what context variables may affect weights, allowed ranges |
| **Contextual weight tables** | High | Explicit doctrine: "leverage-led regime → derivatives weight rises" — exists informally in CSI v5 / judgment, not as a governed table |
| **Weight versioning** | High | No version-tracked weight table changes with rollback capability |
| **Shadow testing infra** | High | `shadow_testing` exists as status enum only; no live comparison pipeline |
| **A/B evaluation** | Critical | Cannot compare static vs adaptive performance empirically |
| **Debug surface** | Medium | No output explains "which weight policy applied and why" for a given judgment |
| **Weight bounds enforcement** | Medium | ML fusion has bounds; OmniScore/judgment does not enforce min/max ranges formally |

#### Completion tasks (ordered — requires calibration first)

1. **Weight policy doctrine** — formal document: which weights can adapt, allowed ranges, forbidden behaviors
2. **Contextual weight tables** — governed per-regime weight modifiers
3. **Weight versioning system** — every table change versioned, attributable, reversible
4. **Shadow testing pipeline** — run static vs adaptive in parallel, compare outcomes
5. **Debug output** — per-judgment: "weight policy X applied because regime Y, modified scores by Z"
6. **Evaluation** — prove adaptive > static across regimes before production rollout

---

### Pillar 5 — Self-Auditing Intelligence

#### What exists (strengths)

| Component | Location | Status |
|-----------|----------|--------|
| Judgment evaluator (meta-quality) | `judgment/evaluator.ts` — 10+ check types | Working |
| Confidence vs contradiction check | `evaluator.ts` — `CONF_CONTRADICTION_MISMATCH` | Working |
| Evidence depth check | `evaluator.ts` — `EVIDENCE_TOO_THIN` | Working |
| Stale data detection | `evaluator.ts` — `DATA_MOSTLY_STALE` | Working |
| Thesis ignores contradictions | `evaluator.ts` — `THESIS_IGNORES_CONTRADICTIONS` | Working |
| State ambiguity detection | `evaluator.ts` — close primary/secondary states | Working |
| Contradiction engine | `judgment/contradiction-engine.ts` — load, structural warnings | Working |
| Confidence engine penalties | `judgment/confidence-engine.ts` — freshness, completeness | Working |
| Security R6 cap | `judgment/index.ts` — `enforceR6SecurityCap` | Working |
| Connector epistemic metadata | `connector-layer/fallback-design.ts` — full 6-step doctrine | Working |
| Envelope validator invariants | `connector-layer/envelope-validator.ts` — I1–I9 | Working |
| Hard-blocker evaluation | `fallback-design.ts` — `evaluateHardBlocker()` | Working |

#### What is missing (gaps)

| Gap | Severity | What to build |
|-----|----------|---------------|
| **Unified self-audit engine** | High | No single `AuditEngine` class — checks scattered across evaluator, confidence engine, connector validator |
| **Audit rule registry** | High | Rules are inline code; need a governed, extensible registry like `HYPOTHESIS_PROFILES` |
| **Consequence framework** | Medium | Evaluator produces issues but does not directly downgrade judgment output (consequence is advisory) |
| **Meta-quality score propagation** | Medium | `evaluator.score` exists but is not used to cap or modify judgment confidence |
| **Single-domain dominance warning** | Medium | No check for "80% of support comes from one truth class" |
| **Hypothesis instability detection** | Medium | No tracking of "primary hypothesis changed 3 times in 6 hours" |
| **Internal observability dashboard** | Medium | Audit triggers not aggregated for pattern analysis |
| **Product: judgment quality flags** | Medium | User sees evaluation only in debug mode; should surface material quality concerns |

#### Completion tasks (ordered)

1. **Audit rule registry** — formal, extensible rule definitions with severity and consequence mappings
2. **Consequence framework** — audit findings that actually modify output: cap confidence, widen ambiguity, suppress overconfident language
3. **Meta-quality score integration** — evaluator score feeds into judgment confidence bounds
4. **Single-domain dominance + hypothesis instability** — new audit rules
5. **Product: quality flags** — surface "judgment quality reduced" or "narrow thesis margin" where useful
6. **Observability** — aggregate audit triggers for recurring pattern detection

---

## 3. Cross-Pillar Dependency Map

```
┌──────────────────────┐
│  Hypothesis Engine    │ ← MUST come first (rankings feed everything)
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Score Calibration    │ ← Measures whether hypothesis + scores deserve trust
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Self-Auditing        │ ← Detects weak judgment using calibration signals
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Adaptive Weighting   │ ← Only after calibration proves what works
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Personalization      │ ← Last — on top of stable, measured truth
└──────────────────────┘
```

---

## 4. Execution Waves

### Wave 1 — Audit (this document) ✅

- Build Phase 3 audit matrix
- Score all five pillars
- Identify missing artifacts and hard blockers

### Wave 2 — Complete Full Hypothesis Engine

**Priority: HIGHEST**

Deliverables:
- [ ] Hypothesis invalidation engine (formal rule system per class)
- [ ] Evidence ↔ hypothesis mapping (tag evidence with supported/contradicted hypotheses)
- [ ] Counterfactual layer ("what would change the ranking")
- [ ] Thesis → connector wiring (`thesis_critical_truth_classes` from judgment)
- [ ] Hypothesis evaluation logging (persist `topHypothesis` per snapshot)
- [ ] Product: spread + flip visibility in chat and token analysis

**Gate:** Primary/secondary hypotheses are stable, rankings shift for real reasons, invalidations are explicit, outputs are visible, and the system can explain why Hypothesis A outranked B.

### Wave 3 — Build Score Calibration Spine

**Priority: HIGH**

Deliverables:
- [ ] Wire `services/calibration` into judgment API (snapshot capture on every judgment)
- [ ] Add `price_change_6h`, `price_change_72h` to `OutcomeType`
- [ ] Persistent snapshot storage (Prisma migration)
- [ ] Automated outcome collection jobs (24h, 7d, 30d)
- [ ] Config-linked evaluation (stamp engine/formula/judgment versions)
- [ ] Score reliability computation (bucketed performance, monotonicity, calibration error)
- [ ] Internal calibration dashboard (reliability curves, regime breakdown)
- [ ] Golden-case expansion (beyond BTC/ETH/SOL)

**Gate:** Scores have measured meaning, confidence has empirical accountability, calibration is version-aware, drift is visible, and tuning decisions are evidence-backed.

### Wave 4 — Build Self-Audit Core

**Priority: HIGH (after Wave 3)**

Deliverables:
- [ ] Unified audit rule registry (governed, extensible)
- [ ] Consequence framework (audit findings → output modifications)
- [ ] Meta-quality score integration (evaluator → confidence bounds)
- [ ] New rules: single-domain dominance, hypothesis instability
- [ ] Product: judgment quality flags (visible where useful)
- [ ] Observability: aggregate audit triggers, recurring pattern detection

**Gate:** System detects weak judgment, reacts correctly, does not overstate confidence, and audit logic measurably improves trust quality.

### Wave 5 — Adaptive Weighting

**Priority: MEDIUM (requires calibration proof)**

Deliverables:
- [ ] Weight policy doctrine (which weights adapt, allowed ranges, forbidden behaviors)
- [ ] Contextual weight tables (per-regime modifiers)
- [ ] Weight versioning system (every change versioned, attributable, reversible)
- [ ] Shadow testing pipeline (static vs adaptive comparison)
- [ ] Debug output ("which weight policy, why, how much it changed the score")
- [ ] Evaluation: prove adaptive > static before production rollout

**Gate:** Adaptive weighting improves measured outcomes, does not reduce interpretability, and remains governed and debuggable.

### Wave 6 — Personalization

**Priority: LOWER (last — on top of stable truth)**

Deliverables:
- [ ] Personalization boundary doctrine (inviolable truth-protection rule)
- [ ] Canonical `DecisionProfile` type (unified schema)
- [ ] Profile-aware delivery rules (horizon/style → output ordering)
- [ ] Safety tests (prove same core truth regardless of profile)
- [ ] Product integration (settings UI, cross-surface delivery)
- [ ] Evaluation (engagement + truth-integrity metrics)

**Gate:** Personalization improves usefulness, never distorts truth, and works consistently across chat, token page, alerts, and reports.

---

## 5. What "Divine Perfection" Means (Measurable)

Phase 3 is complete when **all five** of these are true:

| # | Criterion | How we prove it |
|---|-----------|-----------------|
| 1 | Coinet ranks multiple plausible market explanations with explicit evidence, contradiction, invalidation, and confidence spread | Hypothesis engine outputs visible primary/secondary with counterfactuals; evaluation harness tracks hit rates |
| 2 | Coinet measures whether its scores and confidence levels deserve trust | Calibration spine running: reliability curves, regime-segmented evaluation, config-linked outcomes |
| 3 | Coinet detects when its own judgment quality is weak, narrow, unstable, or overstated | Self-audit engine fires and modifies output: caps, narrows, qualifies — tracked in observability |
| 4 | Coinet adapts signal importance by regime and context without becoming opaque or unstable | Shadow testing proves adaptive > static; weight changes are versioned and debuggable |
| 5 | Coinet tailors delivery to user decision context without changing underlying truth | Safety tests pass: same evidence → same scores; profile only affects framing and priority |

**Not divine perfection:** maximum complexity, fancy language, adaptive everything, pseudo-intelligence.

**Divine perfection:** hypothesis engine ranks reality cleanly. Calibration proves what scores mean. Self-audit prevents overclaiming. Adaptive weighting improves results without losing interpretability. Personalization improves usefulness without corrupting truth.

---

## 6. Blockers and Hard Dependencies

| Blocker | Affects | Resolution |
|---------|---------|------------|
| `services/calibration/` has zero imports | Wave 3 | Wire into `/api/judgment` response path |
| `thesis_critical_truth_classes` not passed from judgment to connectors | Wave 2 | Connect `produceJudgment` to `ConnectorAcquireParams` |
| `topHypothesis` in `ScoreSnapshot` but `captureSnapshot` never called | Wave 2 + 3 | Wire after judgment API responds |
| No persistent outcome storage | Wave 3 | Prisma migration for `CalibrationSnapshot` + `CalibrationOutcome` tables |
| Hypothesis taxonomy names mismatch between judgment and fallback doctrine | Wave 2 | Reconcile `HYPOTHESIS_CLASSES` with `weakened_hypothesis_types` |
| No shadow testing infrastructure | Wave 5 | Build comparison pipeline |
| Personalization schema drift (Prisma vs controllers) | Wave 6 | Audit and unify |

---

## 7. Recommended Immediate Next Step

**Wave 2: Complete the Full Hypothesis Engine.**

This is the single highest-leverage investment because:
- Every other pillar depends on it (calibration measures hypothesis quality, self-audit checks hypothesis stability, adaptive weighting conditions on thesis)
- It is the closest to completion (architecture 4/5, implementation 3/5)
- The gaps are well-defined and actionable
- It directly improves the product's visible intelligence quality

Start with the **invalidation engine** and **evidence ↔ hypothesis mapping** — these unlock everything downstream.
