# CIP.1 Readiness Report — Coinet 14-Layer Integration Pipeline

**Status:** Discovery complete. CIP.1 cannot be honestly certified today as `Full 14-Layer Synthetic Pipeline`. This report maps the actual executable surface, identifies the earliest honest synthetic ingress point, and prescribes the work required before a truthful integration certification.

**Date:** 2026-05-17
**Architecture closure status:** L13 FROZEN_LIVE, L14 ARCHITECTURE_COMPLETE
**Active product status:** `services/judgment` produces live judgment output via a parallel orchestration that bypasses most of the certified layer runtimes

---

## 1. Executive Truth Statement

The Coinet 14-layer architecture is **ratified by contract, invariant, and certification artifact**. The L14 master script emits a deterministic `ARCHITECTURE_COMPLETE` artifact. L13 master is FROZEN_LIVE. Every sublayer law is enforced by code that can be re-run on demand.

But the executable system today contains **two parallel intelligence pipelines** that do not share a single runtime spine:

1. **The certified constitutional architecture** (`src/l5/`–`src/l14/`):
   contracts, engines, DAGs, registries, invariants, certification. Proven correct *in isolation*. **L8 and L10 run in production via wrapper services. L9, L11 full DAG, L12 full DAG, L13 full DAG, L14 full DAG are certified but dormant.**

2. **The active product orchestration** (`src/services/judgment/`):
   `produceJudgment()` wires state, contradiction, confidence, timing, regime, hypothesis, and scenario engines into the 7-part judgment output that the chat API ships to users. This was built **before** the constitutional layers and **runs in production**.

A "full 14-layer synthetic pipeline test" today would have to either (a) drive the dormant L5→L14 DAG runtimes — which requires building orchestrators that do not yet exist for L6, L7, L8, L9, L11, L12 — or (b) drive the active product pipeline — which only touches L8 + L10 + a fraction of L13/L14.

**There is no third option that does not involve building real integration code first.**

This report exists to enumerate exactly what that integration code must be.

---

## 2. Implementation Reality Matrix: L1–L14

| Layer | Architectural status | Code/runtime status | Single-entry orchestrator? | Production-active? | Integration readiness |
|---|---|---|---|---|---|
| L1 Source Systems | Defined in spec | **No code directory** | N/A | Conceptual — ingestion services live under `services/source-systems/classes/` but no L1 layer dir | Not implementable as test ingress |
| L2 Connector & Routing | Defined in spec | **No code directory** | N/A | Conceptual | Not implementable as test ingress |
| L3 Canonical Intelligence Platform | Defined in spec | **No code directory** (canonicalization lives under `services/canonicalization/`) | N/A | Partial — entity confidence model is active | No L3-shaped synthetic ingress possible |
| L4 Knowledge Graph | Defined in spec | **No code directory** | N/A | Conceptual | Not implementable |
| L5 Storage Sovereignty | Implemented | `src/l5/` — full runtime | **YES**: `coordinateWrite(env)` | Unknown — needs verification | Single-entry executable; cert script proves end-to-end |
| L6 Feature/Event Engine | Implemented | `src/l6/` — engines exist | **NO** — caller must build DAG + invoke 5+ engines manually | No (active product uses `services/omniscore_v3` and `services/judgment/signal-snapshot.ts` instead) | Requires orchestrator wrapper before chainable |
| L7 Validation/Contradiction | Implemented | `src/l7/` — engines exist | **NO** — caller must build 15-stage DAG | No (active product uses `services/judgment/contradiction-engine.ts` instead) | Requires orchestrator wrapper |
| L8 Regime Engine | Implemented | `src/l8/` — engines exist | **NO** in `l8/` | **YES** via wrapper `services/judgment/regime-engine.ts:classifyRegime()` | Active; wrapper bridges L8 → product |
| L9 Sequence/Temporal | Implemented | `src/l9/` — engines exist | **NO** | **NO** — timing done by `services/judgment/timing-engine.ts:classifyTimingFull()` (in-service alternative) | Dormant; no production consumer |
| L10 Hypothesis Engine | Implemented | `src/l10/` — engines exist | **YES** via service: `services/hypotheses/orchestrator.ts:produceHypothesisOutput()` | **YES** — judgment.ts:176 calls it | Single-entry; chainable |
| L11 Deterministic Scoring | Implemented | `src/l11/` — engines exist | Partial — `services/omniscore_v3/pipeline/orchestrator.ts` exists, scoped to OmniScore | **Partial** — OmniScore runs standalone, fed into judgment as reference `scores` | Active but not constitutional L11 DAG |
| L12 Scenario Engine | Implemented | `src/l12/` — engines exist | **NO** | **NO** — scenario built in-service inside `produceJudgment` | Dormant; in-service alternative exists |
| L13 AI Judgment & Explanation | RATIFIED — FROZEN_LIVE | `src/l13/` — full runtime, certified | **YES** — runtime orchestrator I built (mock model gateway + grounding + safety + style + final gate) | **Partial** — chat service uses real Claude/Anthropic + `services/explanations/` and `services/grounding/`, NOT the certified L13 runtime | Two L13s coexist: certified + active |
| L14 Delivery/Feedback/Calibration | ARCHITECTURE_COMPLETE | `src/l14/` — full runtime, certified | **YES** — sublayer engines per L14.2–L14.9 | **Partial** — calibration spine `services/calibration-spine/` and `services/hypotheses/logging.ts` actively persist judgment snapshots; rest of L14 is dormant | Two L14s coexist: certified + active partial |

**Bottom line:** of the 14 layers, only **L5 (`coordinateWrite`) and L10 (`produceHypothesisOutput`) are both production-active AND single-entry callable in the constitutional sense.** Everything else is either:
- dormant constitutional code (L6, L7, L9, L11 DAG, L12, full L13, full L14), or
- active product code that runs *in parallel to* the constitutional layer rather than *through* it (L11 OmniScore, L13 explanations, L14 calibration spine).

---

## 3. The Earliest Honest Synthetic Ingress Point

### The question

"What is the earliest layer into which we can inject synthetic data while still truthfully testing a real downstream pipeline?"

### The answer

**Two honest ingress points exist, each proving different things:**

#### Option A — `SignalSnapshot` ingress at the judgment service layer

`services/judgment/produceJudgment(input: ProduceJudgmentInput)` accepts a `SignalSnapshot` (22 normalized features) plus optional regime market-wide context and produces a complete 7-part `JudgmentOutput`. This invokes:
- `classifyRegime()` — real L8 wrapper
- `produceHypothesisOutput()` — real L10 orchestrator
- `classifyTimingFull()` — in-service timing (NOT L9)
- `detectContradictions()`, `classifyState()`, `computeConfidence()` — in-service engines
- scenario builder — in-service

This is **the path that already runs in production**. A synthetic test here would prove:
- ✓ The active product pipeline computes deterministically
- ✓ L8 + L10 are invoked legally
- ✓ Calibration snapshot persistence works
- ✗ Does **NOT** exercise L5/L6/L7/L9/L11 DAG/L12/L13 DAG/L14 DAG

This is **honest** if labeled correctly. It is **not CIP.1**. It would be:
**`AJP.1 — Active Judgment Pipeline Synthetic Certification`**

#### Option B — Synthetic `L13AIInputPackage` ingress at L13 runtime

The certified L13 runtime accepts an `L13AIInputPackage` (built from L10/L11/L12 outputs) and produces a final output envelope. From there L14 takes over.

A synthetic test here would prove:
- ✓ Full L13 runtime + grounding + safety + style + final gate
- ✓ Full L14 chain (delivery, runtime, interaction, outcome, evidence, proposals, persistence, ops, ratification)
- ✗ Does **NOT** exercise L5–L12; requires manual construction of `L13AIInputPackage` from synthetic L10/L11/L12 outputs (which the spec forbids: "no fake L10, L11, L12 outputs")

This is the most we can do honestly with the **certified** runtimes without building new orchestrators. It would be:
**`CIP.0.5 — L13+L14 Integrated Synthetic Pipeline Certification`** with explicit `upstream_synthetic_handoff: L13_INPUT_PACKAGE` declared in the artifact.

#### What CIP.1 actually requires

For the true `Full 14-Layer Synthetic Pipeline Certification` to be honest, we need **new orchestrator code** for L6, L7, L8 full DAG, L9, L11 full DAG, L12. None of these layers expose a single-entry function comparable to L5's `coordinateWrite` or L10's `produceHypothesisOutput`.

**Verdict:** the earliest honest single-entry ingress for a "full architecture" test is whichever entry point exists. Today that's two options (A or B), each scoped narrower than CIP.1's stated ambition.

---

## 4. Layer-by-Layer Callable Engine Inventory

### L5 — Storage Sovereignty & Write Coordination

**Single entry point:** ✓ `coordinateWrite(env: ResolvedStorageEnvelope): L5CoordinationResult`
**File:** `src/l5/coordination/write-coordinator.ts`
**Input:** `ResolvedStorageEnvelope` (~30 fields; must pass `validateEnvelope()`)
**Output:** `L5CoordinationResult` with manifest_id, outcome enum, completion ratios
**Real example:** `src/scripts/test-l55-coordination.ts` ~line 250
**Feeds L6 directly?** No — L6 consumes from registries + compute runs, not from L5 results. **Adapter required.**
**Verdict:** Standalone-executable. Not chainable to L6 without explicit adapter.

### L6 — Feature/Event Engine

**Single entry point:** ✗ **None.**
**Sub-engines (~12):** `EventDetectionEngine`, `FeatureComputeEngine`, `BaselineEngine`, `WindowBuilder`, `ChangeDetectionEngine`, `ConfidenceAttachmentEngine`, `DependencyPlanner`, `EvidencePackBuilder`, `buildL6Dag()`, materializer, quality gate engine, more
**To run L6:** caller builds `L6ComputeRun`, constructs DAG via `buildL6Dag()`, walks DAG topologically, invokes correct engine per node
**Real example:** `src/l6/certification/test-l6-master.ts` exercises engines via fixtures, but no end-to-end compute pipeline shown
**Input to `FeatureComputeEngine.compute()`:** `L6ComputeRun` + `FeatureDefinitionContract` (~50 fields) + `L6Window`, `L6Baseline`, `QualityGateInput`, `ConfidenceAttachmentInput`, `material_inputs`
**Output:** `EventOutput[]`, `FeatureOutput[]`, `L6EvidencePack`
**Feeds L7 directly?** Via L6 read surfaces (materialized → queried). Requires the **materialization → read** loop to actually run.
**Verdict:** REQUIRES ORCHESTRATION LAYER. Adapter work = ~150 lines per workflow.

### L7 — Validation / Contradiction

**Single entry point:** ✗ **None.**
**Sub-engines (~12):** `claim-assembly`, `contradiction-detection`, `incompleteness`, `staleness`, `ambiguity`, `degradation`, `validation-confidence`, `restriction-profile`, plus 15-stage validation DAG builder
**To run L7:** caller builds `L7ValidationRun`, constructs 15-stage DAG via `buildValidationDag()`, walks DAG, invokes engines
**Real example:** `src/l7/certification/l7-master-certification.ts` (no end-to-end pipeline shown — invariants over fixtures)
**Input:** `L7ValidationRun` + `L7ValidationSubjectContract[]` (50+ fields per subject)
**Output:** `L7ValidationOutputContract` per subject (validation_class, confidence, restrictions, contradictions)
**Feeds upward?** L10 hypothesis engine can consume L7 validation outputs as evidence refs
**Verdict:** REQUIRES ORCHESTRATION LAYER. Adapter work = ~200 lines per workflow.

### L8 — Regime Classification

**Single entry point in `src/l8/`:** ✗ **None.**
**Single entry point via wrapper:** ✓ `services/judgment/regime-engine.ts:classifyRegime(signals, marketWide): UnifiedRegime`
**Sub-engines (~8):** `regime-assembly`, `regime-candidate`, `regime-classification`, `regime-confidence`, `regime-multiplier`, `regime-evidence-pack-builder`
**Production-active:** ✓ `services/judgment/index.ts:168`
**Wrapper input:** `SignalSnapshot` + optional `Partial<MarketWideInputs>`
**Wrapper output:** `UnifiedRegime { macro: { posture }, ecosystem, confidence, configVersion }`
**Feeds L9?** L9 input families list `L8_REGIME` but L9 is dormant
**Feeds L10?** ✓ Active — `regime.macro.posture` is passed to `produceHypothesisOutput` as `regimePrimary`
**Verdict:** Wrapper-chainable. Underlying L8 DAG is dormant.

### L9 — Sequence/Temporal

**Single entry point:** ✗ **None.**
**Sub-engines (~6):** `sequence-assembly`, `lead-lag`, `phase-progression`, `change-point`, `decay`
**Production-active:** ✗ **No.** Timing is done by `services/judgment/timing-engine.ts:classifyTimingFull(state, signals)` — an in-service alternative that does NOT invoke L9.
**Real example:** `src/scripts/test-l9_4-runtime.ts` (cert only)
**Verdict:** Dormant. No production consumer. Reconciliation between L9 and `services/judgment/timing-engine.ts` is itself an open architectural question.

### L10 — Hypothesis Engine

**Single entry point in `src/l10/`:** Partially — full L10 DAG/runtime exists but is dormant
**Single entry point via service:** ✓ `services/hypotheses/orchestrator.ts:produceHypothesisOutput(input): ProduceHypothesisResult`
**Production-active:** ✓ `services/judgment/index.ts:176`
**Service input:** `{ signals: SignalSnapshot (22 fields), regimePrimary?, sequenceState?, regimeConfigVersion?, coverageOverride? }`
**Service output:** `HypothesisOutput { primary, secondary, alternatives[], ambiguityLevel, ... }` + coverage + audit notes
**Implementation:** uses registry-based `rankAllHypotheses({signals, coverage, regimePrimary, sequenceState})`, NOT the constitutional L10 DAG
**Verdict:** Service-orchestrator chainable. **Constitutional L10 DAG dormant.** Two L10s coexist.

### L11 — Deterministic Scoring

**Single entry point in `src/l11/`:** ✗ **None.**
**Single entry point via service:** Partial — `services/omniscore_v3/pipeline/orchestrator.ts` orchestrates OmniScore pipeline (Quality, Risk, Opportunity, Position scores)
**Production-active:** ✓ via OmniScore — fed into `produceJudgment` as reference `scores`
**Service input:** OmniScore-specific input shape (not constitutional L11 contracts)
**Service output:** OmniScore numeric scores
**Verdict:** OmniScore active, constitutional L11 dormant. **Same problem as L10 — two parallel implementations.**

### L12 — Scenario Engine

**Single entry point:** ✗ **None.**
**Production scenario building:** in-service inside `produceJudgment` (see `services/judgment/index.ts`, `JudgmentScenario` type)
**Sub-engines:** `ScenarioDagBuilder`, `ScenarioEvidencePackBuilder`, `InvalidationStrengthProfileEngine`, `ScenarioPathResolutionEngine`, `TemplatizedScenarioEngine` — all dormant
**Verdict:** Dormant. In-service alternative runs. Reconciliation required.

### L13 — AI Judgment & Explanation

**Two coexisting implementations:**

**A. Certified constitutional L13** (`src/l13/`):
- Runtime: `src/l13/runtime/` (`ai-explanation-runtime.ts`, `model-gateway` with INTERNAL_MOCK provider)
- Input: `L13AIInputPackage` (built from L10/L11/L12 outputs)
- Output: governed envelope with grounding, safety, style, final gate
- Production-active: ✗ **No** (uses INTERNAL_MOCK gateway)

**B. Active product L13-equivalent:**
- `services/explanations/` (real Claude/Anthropic calls)
- `services/grounding/`
- Used by chat API
- Production-active: ✓

**Verdict:** **Two L13s coexist.** Certified is dormant; active uses external AI provider.

### L14 — Delivery / Feedback / Calibration

**Two coexisting implementations:**

**A. Certified constitutional L14** (`src/l14/`):
- All 10 sublayers green, ARCHITECTURE_COMPLETE
- Engines: delivery channels/runtime, interaction tracking, outcome eval, calibration evidence/proposals, persistence/replay/repair, live ops
- Production-active: ✗ **No** (no real channel adapters wired)

**B. Active product L14-equivalent:**
- `services/calibration-spine/snapshot-writer.ts:captureJudgmentSnapshot()` — persists judgment to DB
- `services/hypotheses/logging.ts:persistHypothesisJudgmentSnapshot()` — calibration evidence
- Telegram/dashboard/AI-chat surfaces in `services/` and `apps/client-web/`
- Production-active: ✓ partially

**Verdict:** **Two L14s coexist.** Certified is dormant; active calibration spine writes to real DB.

---

## 5. Actual Executable Dependency DAG

### What the active product pipeline actually looks like today

```
[Chat API request]
  → services/canonicalization/ (entity resolution, confidence gate)
  → services/omniscore_v3/pipeline/orchestrator.ts (OmniScore numeric scores)
  → services/judgment/signal-snapshot.ts (build SignalSnapshot from scoring + features)
  → services/judgment/index.ts:produceJudgment()
      ├─ classifyState()              ← in-service
      ├─ detectContradictions()       ← in-service
      ├─ classifyRegime()             ← WRAPS L8 engines
      ├─ classifyTimingFull()         ← in-service (bypasses L9)
      ├─ produceHypothesisOutput()    ← WRAPS L10 ranker (not constitutional L10 DAG)
      ├─ in-service scenario build    ← bypasses L12
      ├─ computeConfidence()          ← in-service
  → JudgmentOutput (7-part)
  → services/explanations/ (real Claude/Anthropic API)   ← bypasses constitutional L13
  → calibration-spine snapshot writers                   ← partial L14 (DB writes only)
  → chat response
```

### What the certified constitutional DAG looks like

```
synthetic envelope
  → L5 coordinateWrite()                                  ← ✓ runable
  → ??? adapter ???                                       ← MISSING
  → L6 compute pipeline (manual engine chain)             ← orchestrator missing
  → L6 materialization → L6 read surfaces                 ← orchestrator missing
  → L7 validation DAG (manual 15-stage chain)             ← orchestrator missing
  → L8 regime DAG (manual engine chain)                   ← orchestrator missing
  → L9 sequence DAG (manual engine chain)                 ← orchestrator missing + DORMANT
  → L10 hypothesis DAG (manual engine chain)              ← orchestrator missing + DORMANT (service version active)
  → L11 score DAG (manual)                                ← orchestrator missing + DORMANT
  → L12 scenario DAG (manual)                             ← orchestrator missing + DORMANT
  → L13 AIInputPackage builder                            ← exists but consumes dormant L10/L11/L12 outputs
  → L13 runtime (mock model)                              ← ✓ runable (with synthetic input package)
  → L14 delivery runtime (mock channels)                  ← ✓ runable (with synthetic source artifacts)
  → L14 calibration spine (mock)                          ← ✓ runable
```

### Edge marking

| Edge | Status |
|---|---|
| Synthetic envelope → L5 | DIRECTLY COMPATIBLE (cert script proves) |
| L5 → L6 | NOT CHAINABLE FROM CODE TODAY (no adapter; orthogonal concerns) |
| L6 → L7 | REQUIRES ORCHESTRATION (must invoke materialize → read in between) |
| L7 → L8 | REQUIRES ORCHESTRATION (L7 output refs must be wrapped into L8 surface availability) |
| L8 → L9 | REQUIRES ORCHESTRATION + L9 DORMANT |
| L8 → L10 (service) | ✓ ACTIVE (regime.macro.posture → regimePrimary) |
| L9 → L10 | DORMANT (sequenceState param is accepted but not used by ranker) |
| L10 (service) → L11 (service) | ✓ ACTIVE (OmniScore pre-computed, fed to judgment as scores) |
| L11 → L12 | DORMANT (in-service scenario builder runs instead) |
| L12 → L13 | DORMANT on both ends |
| L13 → L14 (certified) | DIRECTLY COMPATIBLE (I built both ends) |
| L14 → user surfaces | PARTIAL (calibration spine active; channels dormant) |

---

## 6. Minimal Viable Coherent Synthetic Episode

If we wanted to run "Spot-Led Continuation" through the **active product pipeline** today (Option A from §3), the minimal synthetic input is:

```ts
const synthetic: ProduceJudgmentInput = {
  entity_id: 'l13.test.SOLX',
  symbol: 'SOLX',
  chain: 'solana',
  signals: {
    // 22 normalized features driving the spot-led pattern
    price_momentum_24h: 0.6,
    price_momentum_1h: 0.4,
    volume_24h: 0.7,
    buy_sell_ratio: 0.65,
    liquidity: 0.75,
    pair_age_hours: 720,
    leverage_pressure: 0.2,        // low — this is spot-led
    funding_rate: 0.1,             // cool funding
    liquidation_density: 0.15,
    fundamentals_strength: 0.6,
    tvl_trend: 0.55,
    revenue_quality: 0.5,
    whale_activity: 0.55,
    exchange_inflow: 0.3,
    exchange_outflow: 0.55,        // outflow > inflow → accumulation
    security_risk: 0.2,
    holder_concentration: 0.35,
    narrative_intensity: 0.5,
    sentiment: 0.6,
    unlock_pressure: 0.15,
    data_completeness: 0.85,
    data_freshness: 0.9,
  },
  marketWide: { /* market-wide regime context */ },
};

const result = produceJudgment(synthetic);
```

This drives:
- L8 regime classification (real)
- L10 hypothesis ranking (real)
- In-service timing, contradiction, state, confidence, scenario (real but bypass L9/L11/L12)
- Calibration spine snapshot (real DB write — needs ephemeral DB or skip)

**This is honest. It is not CIP.1.** It would be `AJP.1`.

For the true CIP.1 with the constitutional DAG, the minimal synthetic input cannot be constructed today because **the constitutional path cannot run end-to-end** without orchestrators that don't yet exist.

---

## 7. Missing Adapters / Wiring Blockers

| # | Adapter / wiring work | Layer scope | Estimated effort | Risk |
|---|---|---|---|---|
| 1 | L5 → L6 adapter (envelope manifest → ComputeRun) | L5↔L6 | ~50 LOC | LOW (mechanical mapping) |
| 2 | **L6 layer orchestrator** (`executeL6Compute(run, definitions): L6OutputBundle`) | L6 | ~300 LOC | MEDIUM (DAG walk + engine sequencing) |
| 3 | L6 → L7 adapter (materialize + read surface invocation) | L6↔L7 | ~150 LOC | MEDIUM |
| 4 | **L7 layer orchestrator** (`executeL7Validation(run, subjects): L7ValidationResultSet`) | L7 | ~400 LOC | HIGH (15-stage DAG, multiple subjects) |
| 5 | L7 → L8 adapter (validation outputs → surface availability) | L7↔L8 | ~100 LOC | MEDIUM |
| 6 | **L8 constitutional orchestrator** (replace `services/judgment/regime-engine.ts` wrapper with full L8 DAG) | L8 | ~300 LOC | MEDIUM (existing wrapper to study) |
| 7 | L8 → L9 adapter + **L9 constitutional orchestrator** + decision: keep L9 or absorb into judgment timing | L8↔L9, L9 | ~400 LOC + architectural decision | HIGH (existing in-service timing must reconcile) |
| 8 | **L10 constitutional orchestrator** (replace `services/hypotheses/orchestrator.ts` wrapper with full L10 DAG) or formally accept the wrapper as L10's entry | L10 | ~250 LOC OR governance decision | MEDIUM |
| 9 | **L11 constitutional orchestrator** + reconcile with OmniScore | L11 | ~400 LOC + reconciliation | HIGH (active OmniScore must stay green) |
| 10 | **L12 constitutional orchestrator** + reconcile with in-service scenario builder | L12 | ~300 LOC + reconciliation | HIGH |
| 11 | L12 → L13 input package builder (assembles `L13AIInputPackage` from real L10/L11/L12 outputs) | L12↔L13 | ~150 LOC | MEDIUM |
| 12 | L13 constitutional ↔ active explanations reconciliation (when does product use INTERNAL_MOCK vs real Anthropic?) | L13 | governance decision + ~100 LOC routing | MEDIUM |
| 13 | L14 channel adapter set (real Telegram/Push/Dashboard) | L14 | ~200 LOC per channel + provider auth | HIGH (external dependencies) |

**Total greenfield code to enable true L5→L14 chain: ~3,000–4,000 LOC of orchestrators + adapters, plus 4–5 architectural reconciliation decisions where the constitutional layer and the active product implement the same logic differently.**

---

## 8. The Two-Pipeline Problem

This is the most important finding in this report.

**The active product** (`services/judgment` + `services/omniscore` + `services/explanations` + `services/calibration-spine`) and **the certified constitutional architecture** (`src/l5/`–`src/l14/`) are **not the same code path**.

Where they overlap:
- L8 wrapper (`regime-engine.ts`) bridges L8 → product
- L10 wrapper (`services/hypotheses/orchestrator.ts`) bridges L10 → product
- L14 partial (`calibration-spine/snapshot-writer.ts`) writes constitutional-shaped snapshots to DB

Where they diverge:
- L9: in-service `timing-engine.ts` replaces the certified L9 DAG entirely
- L11: in-service OmniScore replaces the certified L11 DAG entirely
- L12: in-service scenario builder replaces the certified L12 DAG entirely
- L13: real Anthropic API in `services/explanations` replaces the certified L13 runtime (which uses INTERNAL_MOCK)
- L14: most channels/runtime/replay/repair are dormant

**This is not a critique — it is a fact of how Coinet evolved.** The product was built first; the constitutional architecture was built afterward to formalize what *should* be true. The two paths now need formal reconciliation.

**Until they're reconciled, no test can honestly claim to certify "Coinet's full 14-layer pipeline" because there is no single 14-layer pipeline today — there are two parallel ones with overlap.**

---

## 9. Revised CIP.1 Scope — Three Honest Options

### Option α — `CIP.1-FULL` (true full-stack)

Build all 13 missing orchestrators/adapters in §7, reconcile the four divergent layers (L9/L11/L12/L13), then certify a single L5→L14 path that exercises real engines for every layer.

- **Effort:** ~3,500 LOC + 4 reconciliation decisions
- **Calendar:** 4–6 weeks of focused work
- **Outcome:** Truthful CIP.1 artifact

### Option β — `AJP.1` (active judgment pipeline cert)

Certify the **active product pipeline** end-to-end with synthetic `ProduceJudgmentInput`. Drives L8 + L10 wrappers + in-service engines + (optionally) calibration spine.

- **Effort:** ~600 LOC harness, 4 episodes + corpus
- **Calendar:** 1 session
- **Outcome:** Truthful **active-product** synthetic certification (NOT a 14-layer cert). Label honestly.

### Option γ — `CIP.0.5` (certified-runtime partial cert)

Certify the certified L13 + L14 runtime end-to-end with a synthetic `L13AIInputPackage` ingress. The harness explicitly declares `upstream_synthetic_handoff: L13_INPUT_PACKAGE` and lists the dormant upstream layers it does not exercise.

- **Effort:** ~800 LOC harness, 4 episodes + corpus
- **Calendar:** 1 session
- **Outcome:** Truthful **L13+L14 chain** synthetic certification. Useful as proof that the constitutional bottom-half works as one organism. Does not prove L5–L12 interconnection.

### My recommendation

**Run Option β AND Option γ in parallel, then commit to Option α as a multi-week project with a clear backlog.**

Reasoning:
- **β certifies what users actually experience today** — this is the highest-value test that can be honest today
- **γ certifies the constitutional architecture I just built** — this is the highest-value test of the *theoretical* system
- **α is the real CIP.1** — but it requires real architecture/product reconciliation, which is a multi-week project, not a turn

The β + γ pair gives you two truthful integration certifications by the end of next session, plus a clear backlog for α.

---

## 10. Effort Estimate Table

| Work package | LOC | Sessions | Risk | Yields |
|---|---:|---:|---|---|
| This readiness report | — | done | LOW | Blueprint |
| `AJP.1` (Option β) — active judgment pipeline cert | ~600 | 1 | LOW | Truthful active-pipeline cert |
| `CIP.0.5` (Option γ) — L13+L14 certified-runtime cert | ~800 | 1 | LOW | Truthful constitutional-bottom-half cert |
| L5→L6 adapter (#1) | ~50 | 0.25 | LOW | One edge closed |
| L6 orchestrator (#2) | ~300 | 1 | MEDIUM | L6 directly chainable |
| L6→L7 adapter (#3) | ~150 | 0.5 | MEDIUM | Edge closed |
| L7 orchestrator (#4) | ~400 | 1.5 | HIGH | L7 directly chainable |
| L7→L8 adapter (#5) | ~100 | 0.25 | MEDIUM | Edge closed |
| L8 full DAG orchestrator (#6) | ~300 | 1 | MEDIUM | L8 constitutional path |
| L8→L9 + L9 orchestrator + reconciliation (#7) | ~400 | 2 | HIGH | L9 alive OR formally absorbed |
| L10 reconciliation (#8) | ~250 or decision | 1 | MEDIUM | L10 constitutional path or formal wrapper |
| L11 reconciliation (#9) | ~400 | 2 | HIGH | L11 constitutional or OmniScore canonicalized |
| L12 reconciliation (#10) | ~300 | 1.5 | HIGH | L12 constitutional or in-service canonicalized |
| L12→L13 input package builder (#11) | ~150 | 0.5 | MEDIUM | Edge closed |
| L13 constitutional/active reconciliation (#12) | ~100 + decision | 1 | MEDIUM | Single L13 runtime |
| **`CIP.1-FULL` (Option α) — true full-stack cert** | ~700 cert harness on top | 1 (after all above) | MEDIUM | **The real CIP.1** |

**Realistic total for true CIP.1:** ~13 sessions across 3,700–4,200 LOC + 4 reconciliation decisions.

**Realistic total for honest interim coverage (β + γ):** 2 sessions across ~1,400 LOC.

---

## 11. Recommendations

1. **Do not produce a green artifact labeled `CIP.1 Full 14-Layer Synthetic Pipeline Certification` today.** It cannot be honest.

2. **Run β + γ next session.** This delivers two truthful integration certifications that cover the real product pipeline AND the certified architecture's bottom-half. They are each scoped honestly.

3. **Adopt the implementation state matrix from §2 as a living document** at `apps/coinet-platform/docs/implementation-state-matrix.md`. Update it whenever a constitutional/active reconciliation lands.

4. **Make the four reconciliation decisions explicitly:**
   - **L9 decision:** keep L9 as constitutional DAG and migrate `services/judgment/timing-engine.ts` to consume it, OR formally retire L9 and document timing as in-service-by-design
   - **L11 decision:** same question for L11 vs OmniScore
   - **L12 decision:** same question for L12 vs in-service scenario builder
   - **L13 decision:** define when product uses INTERNAL_MOCK vs real Anthropic, and which is the "canonical" L13

5. **Build the adapters in §7 in priority order** (L5→L6 first because lowest risk, L9/L11/L12 reconciliations last because highest risk).

6. **Then certify CIP.1 properly.** The artifact at that point will have meaningful weight because every claim in it traces to real interconnected code.

---

## 12. What This Report Proves

This report does **not** prove the architecture is complete (the certification artifacts already do that).
This report **does** prove:

- The architecture is **internally complete** but **externally not yet wired**
- The active product is **functionally complete** but **constitutionally inconsistent**
- The two systems are **parallel, not identical**
- A truthful CIP.1 requires **bridging them first**, which is a real multi-session project, not a turn

This is the honest state of Coinet on 2026-05-17 after L14.10 closure.

The right next move is the one the architecture itself demanded throughout: **prefer blocked truth over clean-looking falsehood**.
