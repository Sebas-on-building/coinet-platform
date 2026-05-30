# Reconciliation Matrix — Coinet Two-Pipeline Migration Constitution

**Status:** ACTIVE — governing migration artifact
**Document class:** Migration constitution (post-architecture closure, pre-CIP.1)
**Date:** 2026-05-19
**Replaces speculative migration discussion:** YES
**Supersedes informal divergence claims:** YES
**Authority over future cross-pipeline work:** YES — every cross-pipeline change MUST cite an RCN row
**Replay basis:**
- AJP.1 fingerprint: `ajp1.fp.aec692be` (80/80 GREEN — active product pipeline)
- CIP.0.5 fingerprint: `cip05.fp.cc76c0e9` (109/109 GREEN — certified L13+L14 downstream runtime)
- Bridge comparison ledger: `bridge.ledger.fa2d884e` (4 episode comparisons, 6 standing divergence signals)

---

## 1. Executive Truth Statement

Coinet today operates **two parallel intelligence pipelines** that produce judgment-shaped outputs through fundamentally different runtimes:

- **The active product pipeline** — `services/judgment/produceJudgment()` — ships real user-visible judgment via in-service engines (state, contradiction, confidence, timing, scenario) plus thin wrappers around L8 and L10, plus a real Anthropic explanation path via `services/explanations/`, plus partial L14 persistence via `services/calibration-spine/`. This is the system that produces the JSON the chat API serves today.

- **The certified constitutional architecture** — `src/l5/`…`src/l14/` — encodes contracts, engines, invariants, certifications, and end-to-end laws for the same problem. L13 is FROZEN_LIVE. L14 is ARCHITECTURE_COMPLETE. Most sublayers (L9, L11 full DAG, L12 full DAG, L13 full DAG, full L14 chain) are *correct in isolation* but not consumed in production.

This matrix is **not** an architectural celebration. It is the **migration constitution**: the document that converts "two working systems" into one deliberate, certifiable path to a single governed runtime — without losing product value, hiding divergence, or laundering dormant certifications as proof of unification.

### First principles this matrix obeys
1. **No false equivalence.** A certified DAG is not equal to an active in-service engine just because both produce a comparable artifact.
2. **No dormant architecture laundering.** Certifications of unwired layers do not count as live coverage.
3. **No active-path dismissal.** The active product pipeline currently *is* Coinet. Its decisions are user-visible truth until something governed replaces them.
4. **Evidence before recommendation.** Every reconciliation recommendation cites AJP.1, CIP.0.5, or bridge ledger evidence.
5. **CIP.1 blocker honesty.** CIP.1 is not earned by writing a matrix. The matrix defines the blockers; only WP-R01..R08 retire them.
6. **Migration must be certifiable.** Every WP terminates in a cert script with a deterministic fingerprint or it does not count as done.

### Verdict in one paragraph
The 14-layer architecture is **structurally complete and individually proven**, but it is **not the runtime that produces the product**. The product is produced by `services/judgment` + `services/explanations` + `services/omniscore_v3` + `services/calibration-spine`, with L8 and L10 the only constitutional layers truly inside the live spine. CIP.1 cannot be honestly certified until WP-R01 through WP-R05 retire the structural blockers; WP-R06 through WP-R08 close the calibration and delivery surfaces; and a unified judgment runtime exists that calls into governed L9/L11/L12/L13/L14 instead of in-service alternatives.

---

## 2. Why This Matrix Exists

The CIP Readiness Report (`apps/coinet-platform/docs/cip-readiness-report.md`) discovered that the certified architecture and the active product are not the same runtime. The Bridge Certification Program (AJP.1 + CIP.0.5) produced **independent green certifications** of each side and a **comparison ledger** linking them. Both sides are real. Both sides are deterministic. Neither side is the other.

What was missing — and what this document supplies — is a governing, line-by-line accounting of:
- which capabilities exist on which side,
- whether they are comparable, divergent, or non-comparable,
- which divergence is acceptable, which is migration debt, and which is a CIP.1 blocker,
- and what *exactly* must be built or wired before "Coinet runs on one governed spine" is a truthful statement.

Without this matrix, every future cross-pipeline change becomes ad-hoc and risks either silently widening the divergence or silently pretending it has been closed.

---

## 3. Evidence Sources and Scope

### Primary evidence

| Evidence | Location | Fingerprint | What it proves |
|---|---|---|---|
| AJP.1 certification | `apps/coinet-platform/src/scripts/test-ajp1-active-judgment-pipeline.ts` | `ajp1.fp.aec692be` | Active product pipeline runs deterministically across 4 episode families × 20 runs and satisfies AJP-INV-A..J |
| CIP.0.5 certification | `apps/coinet-platform/src/scripts/test-cip05-certified-runtime.ts` | `cip05.fp.cc76c0e9` | Certified L13(synthetic upstream) + L14 chain runs deterministically and satisfies CIP05-INV-A..L; L13 runtime invocation honestly deferred to CIP.0.6 |
| Bridge comparison ledger | `apps/coinet-platform/src/scripts/build-bridge-comparison-ledger.ts` | `bridge.ledger.fa2d884e` | 4 per-episode comparisons + 6 standing divergence signals; encodes which dimensions are comparable vs honestly non-comparable |
| CIP Readiness Report | `apps/coinet-platform/docs/cip-readiness-report.md` | (doc) | Establishes the two-pipeline truth and the Implementation Reality Matrix |
| Bridge synthetic episodes | `src/integration/bridge-certification/fixtures/shared-episode-catalogue.ts` | (catalogue) | 4 shared narratives: SOLX, LEVA, UNLK, MOCKUSD — drove both certifications |

### Code surface inspected for this matrix

Active product (live):
- `services/judgment/` — `produceJudgment`, `regime-engine`, `timing-engine`, `state-engine`, `contradiction-engine`, `confidence-engine`, `signal-snapshot`, `evaluator`, `taxonomies`
- `services/hypotheses/` — `orchestrator`, `ranker`, `registry`, `support-engine`, `invalidation-engine`, `evidence-mapper`, `modifiers`, `explainer`, `versioning`, `logging`
- `services/omniscore_v3/` — `pipeline/`, `calibration/`, `features/`, `gates/`, `scoring/`, `persistence/`, `audit/`, `segments/`, `sectors/`, `views/`, `data/`
- `services/explanations/` — real Anthropic explanation runtime (not L13-governed)
- `services/calibration-spine/` — `snapshot-writer.ts` partial L14 persistence
- `apps/coinet-platform/src/api/chat/service.ts` — the chat surface that ships judgment to users

Certified architecture (dormant or partially active):
- `src/l5/` — `coordinateWrite` runtime
- `src/l6/`, `src/l7/` — engines exist; no production consumer
- `src/l8/` — production-active via wrapper
- `src/l9/` — full DAG; dormant
- `src/l10/` — production-active via service
- `src/l11/` — full DAG; dormant (OmniScore runs in parallel)
- `src/l12/` — full DAG; dormant
- `src/l13/` — FROZEN_LIVE; not invoked in production
- `src/l14/` — ARCHITECTURE_COMPLETE; partial L14.6 calibration via spine, rest dormant

### Out of scope for this matrix
- Code-level refactors not driven by an RCN row
- New product features not in the existing active pipeline
- Layer redesigns of L1–L4 (still pre-contract)
- Anthropic prompt content changes (handled by L13.5–L13.9 once the runtime is wired)

---

## 4. Current System Reality

### 4.1 What the active product does (production today)
For every chat-driven token judgment:
1. Builds a 22-feature `SignalSnapshot` from market services.
2. Calls `produceJudgment(input)` which sequentially invokes in-service `classifyState`, `detectContradictions`, `computeConfidence`, `classifyTimingFull`, plus wrapper `classifyRegime` (L8) and orchestrator `produceHypothesisOutput` (L10), plus in-service scenario builder.
3. Emits a 7-part `JudgmentOutput` (state / thesis / contradictions / timing / confidence / 24h signal / failure condition).
4. Generates user-facing prose via `services/explanations/` calling Anthropic directly.
5. Logs partial calibration data via `services/calibration-spine/snapshot-writer.ts`.

### 4.2 What the certified architecture does (in isolation)
- L13 master cert (`test-l13_master.ts`) runs 1209/1209 sublayer assertions + 12/12 final invariants — proves the certified L13 runtime end-to-end, but **not invoked by any production code path**.
- L14 master cert runs each sublayer (L14.1–L14.10) — proves delivery, runtime, interaction, outcome, evidence, proposals, persistence, ops, ratification — but **not invoked by any production code path** (calibration spine writes a subset of L14.6-shaped data).
- L5–L12 sublayers are individually certified; only L8 and L10 are live in production via wrappers.

### 4.3 What CIP.0.5 demonstrated about the certified side
- L13 input packages can be synthesized; the L13.2 validator accepts them.
- The full L14 chain (delivery → runtime → interaction → outcome → evidence → proposals → persistence) executes deterministically given a governed L13 output.
- L13 runtime invocation itself is **deferred to CIP.0.6**; CIP.0.5 declared this explicitly as `CIP05_L13_RUNTIME_INVOCATION_DEFERRED_TO_CIP06`.

### 4.4 What AJP.1 demonstrated about the active side
- The active pipeline is deterministic across replay (AJP-INV-G holds).
- It differentiates SOLX (clean) vs LEVA (fragile contradictions) (AJP-INV-F holds).
- It honestly reports lack of identity gating on MOCKUSD (AJP-INV-I via reconciliation flag).
- It produces every required field (regime, hypothesis, scenario) for every non-errored run (AJP-INV-C, D, E).
- Every run carries the standing reconciliation flags: `ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9`, `ACTIVE_AI_PATH_NOT_L13_GOVERNED`, `PRODUCT_DELIVERY_NOT_YET_FULLY_L14_WIRED`.

---

## 5. Summary Divergence Dashboard

| Dimension | Active product side | Certified architecture side | Comparability | Standing flag |
|---|---|---|---|---|
| Upstream ingest (L1–L4) | `services/source-systems/`, `services/canonicalization/` | No L1–L4 dirs (pre-contract) | NON_COMPARABLE | — |
| Storage / write (L5) | Not exercised in judgment path | `coordinateWrite` certified | NON_COMPARABLE | — |
| Features / events (L6) | In-service signal snapshot + OmniScore features | L6 engines exist; dormant | NON_COMPARABLE | — |
| Validation / contradiction (L7) | `services/judgment/contradiction-engine.ts` | L7 15-stage DAG; dormant | DIVERGENT_BEHAVIOR | — |
| Regime classification (L8) | `services/judgment/regime-engine.ts` wraps L8 | L8 in `src/l8/` | COMPARABLE (single source) | — |
| Sequence / timing (L9) | `services/judgment/timing-engine.ts` | L9 DAG; dormant | DIVERGENT_BEHAVIOR | `ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9` |
| Hypothesis (L10) | `services/hypotheses/orchestrator.ts` wraps L10 | L10 in `src/l10/` | COMPARABLE (single source) | — |
| Scoring (L11) | `services/omniscore_v3/` | L11 DAG; dormant | DIVERGENT_BEHAVIOR | — |
| Scenario (L12) | In-service inside `produceJudgment` | L12 DAG; dormant | DIVERGENT_BEHAVIOR | — |
| AI explanation (L13) | `services/explanations/` real Anthropic | L13 FROZEN_LIVE runtime; dormant | DIVERGENT_BEHAVIOR | `ACTIVE_AI_PATH_NOT_L13_GOVERNED` |
| Delivery (L14.2–L14.3) | Chat response surface only | L14 channel + runtime DAG; dormant | DIVERGENT_BEHAVIOR | `PRODUCT_DELIVERY_NOT_YET_FULLY_L14_WIRED` |
| Interaction truth (L14.4) | None | L14.4 engines; dormant | NON_COMPARABLE | — |
| Outcome eval (L14.5) | None | L14.5 engines; dormant | NON_COMPARABLE | — |
| Calibration evidence (L14.6) | `services/calibration-spine/` partial | L14.6 engines; dormant | PARTIAL_OVERLAP | — |
| Calibration proposals (L14.7) | None | L14.7 engines; dormant | NON_COMPARABLE | — |
| Persistence (L14.8) | Snapshot writer only | L14.8 engines; dormant | PARTIAL_OVERLAP | — |
| Ops / ratification (L14.9, L14.10) | None | Certified | NON_COMPARABLE | — |

Standing program-wide flags (from `bridge.ledger.fa2d884e`):
- `ACTIVE_AI_PATH_NOT_L13_GOVERNED`
- `ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9`
- `ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING`
- `CERTIFIED_RUNTIME_DEPENDS_ON_SYNTHETIC_UPSTREAM`
- `CIP05_L13_RUNTIME_INVOCATION_DEFERRED_TO_CIP06`
- `PRODUCT_DELIVERY_NOT_YET_FULLY_L14_WIRED`

---

## 6. Classification Rules

Each RCN row in §7 is tagged with one of:

| Class | Meaning |
|---|---|
| **COMPARABLE** | Both sides produce semantically equivalent outputs for the same input; can be A/B'd directly. |
| **PARTIAL_OVERLAP** | Output shapes share fields but governance, lineage, or laws differ; A/B requires translation. |
| **DIVERGENT_BEHAVIOR** | Both sides exist and run, but produce outputs under different policies. Requires deliberate reconciliation. |
| **NON_COMPARABLE** | One side exists and the other does not (or is structurally absent). Reconciliation = build/wire, not compare. |
| **ACTIVE_ONLY** | Capability exists only in the active product. Constitutionalisation work pending. |
| **CERTIFIED_ONLY** | Capability exists only in the certified architecture. Activation work pending. |

Each row is also tagged with a **priority**:
- **P0 — CIP.1 blocker.** Cannot ship a true unified runtime without resolving.
- **P1 — High migration debt.** Drives a hard architectural decision (D1–D4).
- **P2 — Migration debt.** Plannable, not yet blocking.
- **P3 — Hygiene.** Can be addressed during the natural migration sweep.

---

## 7. Full Reconciliation Matrix

### 7.1 Upstream entry (L1–L5)

| RCN | Capability | Active product side | Certified side | Class | Priority | Disposition |
|---|---|---|---|---|---|---|
| RCN-001 | Source-system ingestion | `services/source-systems/classes/` runs in production | No L1 layer code | NON_COMPARABLE | P3 | Out of CIP.1 ingress scope; document only |
| RCN-002 | Connector / routing | `services/connector/` (legacy) | No L2 layer code | NON_COMPARABLE | P3 | Out of CIP.1 ingress scope |
| RCN-003 | Canonical entity identity | `services/canonicalization/` produces entity_id, identity_confidence | No L3 layer code | ACTIVE_ONLY | P0 | **CIP.1 blocker** — MOCKUSD divergence signal `ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING` originates here (see WP-R03) |
| RCN-004 | Knowledge graph | None in production | No L4 layer code | NON_COMPARABLE | P3 | Defer |
| RCN-005 | Storage sovereignty | Not on judgment path | `coordinateWrite` certified, unused | CERTIFIED_ONLY | P2 | Wire as the L14.8 persistence sink (see WP-R06) |

### 7.2 Validation, regime, timing (L6–L9)

| RCN | Capability | Active product side | Certified side | Class | Priority | Disposition |
|---|---|---|---|---|---|---|
| RCN-010 | Feature/event materialization | `services/judgment/signal-snapshot.ts` + `services/omniscore_v3/features/` | `src/l6/` engines exist, no orchestrator | NON_COMPARABLE | P2 | WP-R02 (feature spine reconciliation, post-D2) |
| RCN-011 | Validation / contradiction detection | `services/judgment/contradiction-engine.ts` (in-service) | `src/l7/` 15-stage DAG | DIVERGENT_BEHAVIOR | P1 | Compare LEVA contradiction load both ways; certified DAG governs after WP-R04 |
| RCN-012 | Regime classification (single source) | `services/judgment/regime-engine.ts` wraps `src/l8/` | Same source | COMPARABLE | P3 | Hygiene: enforce wrapper-only ingestion of L8 outputs |
| RCN-013 | Sequence / timing | `services/judgment/timing-engine.ts` — in-service formula | `src/l9/` DAG dormant | DIVERGENT_BEHAVIOR | **P0** | **D1 decision required** — see §8; CIP.1 blocker because LEVA/UNLK temporal semantics diverge |
| RCN-014 | Timing-as-feature in OmniScore | OmniScore uses its own time features | L9 DAG independent | DIVERGENT_BEHAVIOR | P1 | Resolved by D1 outcome (consolidate post-D1) |

### 7.3 Hypotheses, scoring, confidence (L10–L11)

| RCN | Capability | Active product side | Certified side | Class | Priority | Disposition |
|---|---|---|---|---|---|---|
| RCN-020 | Hypothesis generation (single source) | `services/hypotheses/orchestrator.ts` wraps `src/l10/` | Same source | COMPARABLE | P3 | Hygiene: lineage tagging of which hypothesis ranker version ran |
| RCN-021 | Hypothesis invalidation triggers | `services/hypotheses/invalidation-engine.ts` | `src/l10/` invalidation contracts | PARTIAL_OVERLAP | P1 | Reconcile invalidation taxonomy with L14.5 outcome eval |
| RCN-022 | Deterministic scoring | `services/omniscore_v3/pipeline/orchestrator.ts` | `src/l11/` DAG dormant | DIVERGENT_BEHAVIOR | **P0** | **D2 decision required** — see §8; CIP.1 blocker |
| RCN-023 | Score component features | `services/omniscore_v3/features/`, `gates/`, `segments/`, `sectors/` | L11 component contracts | DIVERGENT_BEHAVIOR | P1 | Resolved by D2 outcome |
| RCN-024 | Confidence calculation | `services/judgment/confidence-engine.ts` in-service | L11 confidence + L13.5 confidence ceiling + L14.5 confidence accuracy | DIVERGENT_BEHAVIOR | P1 | Confidence must terminate on L13.5/L14.5 once D2 lands |
| RCN-025 | Score → confidence cap law | Implicit in-service | L11 cap + L13.5 ceiling | PARTIAL_OVERLAP | P1 | Make cap explicit and governed (WP-R04) |

### 7.4 Scenarios and judgment composition (L12)

| RCN | Capability | Active product side | Certified side | Class | Priority | Disposition |
|---|---|---|---|---|---|---|
| RCN-030 | Scenario template construction | In-service inside `produceJudgment` | `src/l12/` template DAG dormant | DIVERGENT_BEHAVIOR | **P0** | **D3 decision required** — see §8; UNLK divergence signal anchors here |
| RCN-031 | Scenario path confidence | In-service | L12 path-confidence + L14.5 evaluation | DIVERGENT_BEHAVIOR | P1 | Resolved by D3 outcome |
| RCN-032 | Scenario-as-failure-condition | `produceJudgment` emits 24h signal + failure condition fields | L12 + L14.5 invalidation-effectiveness | PARTIAL_OVERLAP | P1 | Reconcile after D3 |
| RCN-033 | Judgment composition (7-part output) | `services/judgment/produceJudgment` is the composer | No certified composer exists yet; L13.6 assembles its own output envelope | NON_COMPARABLE | P0 | **Unified judgment composer** required (WP-R05) — composes L8/L10/L9-or-L12-or-D1/D3 outputs into one canonical record |

### 7.5 AI explanation (L13)

| RCN | Capability | Active product side | Certified side | Class | Priority | Disposition |
|---|---|---|---|---|---|---|
| RCN-040 | AI input packaging | None — explanation service uses ad-hoc prompts | `src/l13/context/` builds `L13AIInputPackage` (proven by CIP.0.5) | CERTIFIED_ONLY | **P0** | **D4 decision required** — see §8; CIP.1 blocker |
| RCN-041 | Grounding / evidence / citation | `services/grounding/` (partial) | `src/l13/grounding/` certified | DIVERGENT_BEHAVIOR | P0 | Resolved by D4 outcome |
| RCN-042 | Expression governance (uncertainty, contradiction, restriction, confidence-phrasing) | None in active path | `src/l13/restrictions/` certified | CERTIFIED_ONLY | P0 | Active path currently has no constitutional guardrails on AI phrasing |
| RCN-043 | Safety / non-recommendation / forbidden-financial-language | None constitutionally enforced | `src/l13/safety/` certified (EN/DE/ES) | CERTIFIED_ONLY | **P0** | **Compliance risk** in active path; D4 closure mandatory |
| RCN-044 | Style / persona / verbosity / multilingual safety | Implicit prompt style | `src/l13/style/` certified | CERTIFIED_ONLY | P1 | Migrate after D4 lands |
| RCN-045 | Output mode discipline (chat / report / comparison / scenario / score / contradiction / debug) | `services/explanations/` ad-hoc | `src/l13/outputs/` certified product mode builders | CERTIFIED_ONLY | P1 | Migrate per mode after D4 |
| RCN-046 | Final output gate | None | `src/l13/runtime/final-output-gate.ts` | CERTIFIED_ONLY | P0 | Required to govern active path |
| RCN-047 | Replay / repair / adversarial / regression coverage | None | `src/l13/replay/`, `repair/`, `adversarial/`, `regression/` | CERTIFIED_ONLY | P1 | Activate once L13 runtime is the live AI path |

### 7.6 Delivery, interaction, outcome, calibration, persistence (L14)

| RCN | Capability | Active product side | Certified side | Class | Priority | Disposition |
|---|---|---|---|---|---|---|
| RCN-050 | Channel contracts (Dashboard, Token Report, Chat, Telegram, Push, Internal) | Chat channel only | L14.2 certified channel registry | PARTIAL_OVERLAP | P1 | WP-R07 — channel wiring |
| RCN-051 | Delivery runtime DAG (candidate → eligibility → audience → channel → preference → priority/urgency → dedup/cooldown → suppression/merge → assembly → execution → materialization → expectation) | None | L14.3 certified | CERTIFIED_ONLY | P0 | Required for any non-chat surface (CIP.1 blocker for Telegram/Dashboard alerts) |
| RCN-052 | Interaction truth (open/click/dismiss/ignore-derivation/feedback bridge) | None | L14.4 certified | CERTIFIED_ONLY | P1 | WP-R07 |
| RCN-053 | Outcome evaluation (alignment / score calibration / hypothesis ranking / scenario path / trigger / invalidation / alert effectiveness / explanation consistency) | None | L14.5 certified | CERTIFIED_ONLY | P1 | WP-R07 |
| RCN-054 | Calibration evidence aggregation | `services/calibration-spine/snapshot-writer.ts` partial | L14.6 certified | PARTIAL_OVERLAP | P1 | WP-R06 — migrate spine into L14.6 record schema |
| RCN-055 | Calibration proposals (propose-not-mutate law) | None | L14.7 certified | CERTIFIED_ONLY | P1 | WP-R08 — calibration governance enablement |
| RCN-056 | Persistence (L14.8) | Snapshot writer only | L14.8 certified | PARTIAL_OVERLAP | P1 | Wire L14.8 over `coordinateWrite` (RCN-005) |
| RCN-057 | Ops / live ratification (L14.9) | None | L14.9 certified | CERTIFIED_ONLY | P2 | Activate when delivery DAG goes live |
| RCN-058 | Final ratification / architecture-complete (L14.10) | N/A | L14.10 ARCHITECTURE_COMPLETE | CERTIFIED_ONLY | P2 | Already proven in isolation; downstream of CIP.1 |

### 7.7 Product surfaces (frontend) and cross-cutting

| RCN | Capability | Active product side | Certified side | Class | Priority | Disposition |
|---|---|---|---|---|---|---|
| RCN-060 | Chat answer surface | `apps/coinet-platform/src/api/chat/service.ts` ships judgment | L13.7 chat-answer-builder + L14.2 AI_CHAT channel | DIVERGENT_BEHAVIOR | P0 | Resolved by D4 + WP-R07 |
| RCN-061 | Token Report page | Active in `apps/client-web` | L13.7 structured-report-builder + L14.2 TOKEN_REPORT_PAGE channel | DIVERGENT_BEHAVIOR | P1 | Migrate report rendering to L13 builders |
| RCN-062 | Asset / thesis comparison surface | Partial in client-web | L13.7 asset-comparison-builder + thesis-comparison-builder | DIVERGENT_BEHAVIOR | P2 | Migrate after D4 |
| RCN-063 | Telegram + Push alerts | Not shipping in production | L14.2 TELEGRAM (opt-in) + PUSH_ALERT (reserved) | NON_COMPARABLE | P2 | Cannot ship until L14.3 runtime is wired (RCN-051) |
| RCN-064 | Internal analyst console | Not shipping | L14.2 INTERNAL_ANALYST_CONSOLE channel | CERTIFIED_ONLY | P3 | Activate when L14.3 lands |
| RCN-065 | Determinism / replay across the unified path | AJP.1 proves active determinism; CIP.0.5 proves certified determinism | Bridge ledger joins fingerprints | PARTIAL_OVERLAP | P1 | CIP.1 must show a single replay hash across the unified DAG |

---

## 8. Four Hard Architectural Decisions

Each decision below is **required** before its dependent work packages can ship. The certified side already has a runnable, certified DAG. The active side already has a production behavior. The decision is *not* whether to keep both — it is **how the certified side becomes the runtime while preserving any irreplaceable product value of the active side**.

### D1 — Timing semantics (RCN-013, RCN-014)

**Question.** Does Coinet keep `services/judgment/timing-engine.ts` as the production source of timing, or does it migrate to the certified L9 DAG?

**Options.**
- **D1.a** Promote L9 DAG to the runtime; deprecate `timing-engine.ts`; migrate any in-service signals into L9 contracts.
- **D1.b** Promote `timing-engine.ts` semantics into L9 (treat the active engine as the de-facto specification, then re-certify L9 against it).
- **D1.c** Keep both indefinitely and document `ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9` as a permanent flag. **Rejected.** Permanent divergence violates First Principle 2 (no dormant architecture laundering).

**Recommended default.** D1.a. The certified L9 DAG was built to be the timing layer; the active engine was built before the architecture was closed. Migration cost is contained because the consumer of timing is `produceJudgment`, a single composer.

**Blocks.** WP-R01 cannot complete until D1 is resolved.

### D2 — Scoring runtime (RCN-022, RCN-023, RCN-024, RCN-025)

**Question.** Does Coinet keep OmniScore v3 as the production score, or does it migrate to the certified L11 DAG?

**Options.**
- **D2.a** Promote L11 DAG to the runtime; deprecate OmniScore v3; migrate gates/features/segments/sectors into L11 components.
- **D2.b** Refactor OmniScore v3 into L11 components (treat OmniScore as the de-facto specification, then re-certify L11). This is materially harder than D1.b because OmniScore has years of calibration history.
- **D2.c** Run both, with L11 governing confidence capping while OmniScore governs the score itself. **Acceptable transitional state** but not a permanent answer.

**Recommended default.** **D2.c → D2.b.** Use OmniScore as the score producer while L11 governs the *bounds* (confidence cap, sufficiency floor, restriction interaction). Then refactor OmniScore v3 into L11 components incrementally. Forcing D2.a immediately would lose OmniScore's calibration history.

**Blocks.** WP-R04 (confidence + restriction binding) requires D2 resolution. WP-R05 (unified composer) depends on D2.

### D3 — Scenario runtime (RCN-030, RCN-031, RCN-032)

**Question.** Does Coinet keep the in-service scenario builder inside `produceJudgment`, or does it migrate to the certified L12 DAG?

**Options.**
- **D3.a** Promote L12 DAG to the runtime; replace in-service scenario logic; the unified composer consumes L12 scenarios.
- **D3.b** Treat the in-service scenario logic as the spec, then re-certify L12. Lower migration risk but slower to retire dormant DAG.
- **D3.c** Keep both. **Rejected** for the same reason as D1.c.

**Recommended default.** D3.a. UNLK and LEVA episode families exercise the divergence; L12's path-confidence + template laws are the ones we want governing in production.

**Blocks.** WP-R02, WP-R05.

### D4 — AI explanation runtime (RCN-040..RCN-047)

**Question.** Does Coinet keep `services/explanations/` (real Anthropic ad-hoc) as the production AI path, or does it migrate to the certified L13 runtime?

**Options.**
- **D4.a** Promote the certified L13 runtime to the live AI path; route `services/explanations/` callers through L13.6 runtime; retire ad-hoc prompts; gate every output through L13.4 grounding, L13.5 expression governance, L13.9 safety, and the final gate.
- **D4.b** Continue ad-hoc Anthropic calls in production. **Rejected** — `ACTIVE_AI_PATH_NOT_L13_GOVERNED` is a known compliance risk (RCN-043 forbidden-financial-language is not enforced today).
- **D4.c** Run L13 in shadow mode (every prompt goes through both runtimes; certified output is recorded but not served) until parity is proven, then promote. **Recommended transitional path.**

**Recommended default.** **D4.c → D4.a.** This is the most surgically important migration: it is the layer most exposed to user-visible language, regulatory phrasing, and replay/repair requirements. Shadow mode buys parity without blocking product. Promotion is the CIP.1-aligning event.

**Blocks.** WP-R03 (L13 runtime activation), WP-R07 (delivery wiring), and the final CIP.1 itself.

---

## 9. Migration Work Packages

Every WP terminates in a deterministic cert script with a fingerprint. Work is not "done" until that fingerprint exists.

### WP-R01 — L9 timing wiring (depends on D1)
- Scope: replace `classifyTimingFull()` consumers with the L9 DAG entry point (or refactor L9 per D1.b).
- Deliverables: timing wrapper service analogous to `regime-engine.ts`, golden tests across 4 episodes, retire `timing-engine.ts` or annotate its replacement.
- Cert: `test-wp-r01-timing-wiring.ts` — proves active pipeline produces same fingerprint with L9 timing for the AJP.1 corpus (or documents permitted shifts).
- Removes flag: `ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9`.

### WP-R02 — Scenario runtime wiring (depends on D3)
- Scope: replace in-service scenario builder with L12 DAG.
- Deliverables: scenario wrapper, regression suite over UNLK + LEVA + SOLX, replay parity.
- Cert: `test-wp-r02-scenario-wiring.ts`.

### WP-R03 — L13 runtime activation in shadow mode (depends on D4.c)
- Scope: route every `services/explanations/` call through the certified L13.6 runtime in shadow mode; capture both outputs; compute parity metrics.
- Deliverables: `l13-shadow-bridge` adapter, L13 input-package builder over the active judgment, daily parity report.
- Cert: `test-wp-r03-l13-shadow.ts` — proves N consecutive shadow runs with replay determinism and parity ≥ threshold.
- Promotion criterion to D4.a: parity ≥ agreed threshold + zero L13.4 grounding violations + zero L13.9 safety violations across N production runs.

### WP-R04 — Confidence + restriction binding (depends on D2)
- Scope: bind in-service `confidence-engine.ts` to L11 caps + L13.5 confidence ceiling + L14.5 confidence accuracy.
- Deliverables: confidence translator, restriction composer, golden tests covering MOCKUSD identity contestation.
- Cert: `test-wp-r04-confidence-binding.ts`.
- Removes flag: `ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING` (in combination with WP-R05).

### WP-R05 — Unified judgment composer (depends on D1, D2, D3)
- Scope: replace `produceJudgment` with a composer that consumes governed outputs from L8 + L10 + L9 (D1) + L11 (D2) + L12 (D3) and produces a single canonical judgment record.
- Deliverables: new `produceUnifiedJudgment(input)` composer; old `produceJudgment` becomes a deprecated shim during transition.
- Cert: `test-wp-r05-unified-composer.ts` — proves the composer is deterministic over the AJP.1 corpus and that every required field originates from a governed layer.

### WP-R06 — Persistence / calibration spine migration
- Scope: migrate `services/calibration-spine/snapshot-writer.ts` into L14.6 + L14.8 records; sink through `coordinateWrite` (RCN-005).
- Deliverables: snapshot-to-L14.6 translator, L14.8 persistence wiring.
- Cert: `test-wp-r06-calibration-migration.ts`.

### WP-R07 — Delivery DAG activation (depends on D4)
- Scope: wire L14.2 channels + L14.3 runtime DAG + L14.4 interaction + L14.5 outcome behind the existing chat + token report surfaces; enable Telegram opt-in once L14.3 holds.
- Deliverables: channel adapters for Dashboard, Token Report, AI Chat; later Telegram.
- Cert: `test-wp-r07-delivery-activation.ts`.
- Removes flag: `PRODUCT_DELIVERY_NOT_YET_FULLY_L14_WIRED`.

### WP-R08 — Calibration proposal governance enablement
- Scope: enable L14.7 calibration proposals to flow from L14.6 evidence; route to lower-layer review queues; surface in an analyst console (RCN-064).
- Deliverables: proposal adapter, review-queue UI hook.
- Cert: `test-wp-r08-proposal-governance.ts`.

---

## 10. Recommended Migration Sequence

1. **Decision phase (parallel).** D1 + D3 first (cheaper, isolated). D2 + D4 in parallel (D2 transitional D2.c immediately; D4 shadow D4.c immediately).
2. **WP-R01 + WP-R02 + WP-R03 (shadow) in parallel.** All three start once their parent decision is recorded.
3. **WP-R04 + WP-R05.** Once D2 transitional plus D1 and D3 are wired, the unified composer can land.
4. **WP-R06 + WP-R07.** Persistence + delivery DAG activation, gated on WP-R05.
5. **WP-R03 promotion to D4.a.** Once parity holds for the required window, retire `services/explanations/` ad-hoc paths.
6. **WP-R08.** Closes the calibration loop end-to-end.
7. **CIP.1.** Earned, not declared. Re-runs every cert from L5 through L14 over the unified composer with a single replay hash. Fingerprint to be assigned at that time.

---

## 11. CIP.1 Readiness Verdict

CIP.1 is **NOT YET CERTIFIABLE**. Standing blockers:

| Blocker | Source | Retiring WP |
|---|---|---|
| Identity gating absent in active path | `ACTIVE_PIPELINE_LACKS_CERTIFIED_IDENTITY_GATING` (RCN-003, RCN-024) | WP-R04 + WP-R05 |
| Timing semantics divergence | `ACTIVE_TIMING_SEMANTICS_DIVERGE_FROM_L9` (RCN-013) | WP-R01 |
| AI path not L13-governed | `ACTIVE_AI_PATH_NOT_L13_GOVERNED` (RCN-040..047) | WP-R03 → D4.a |
| Delivery DAG not wired | `PRODUCT_DELIVERY_NOT_YET_FULLY_L14_WIRED` (RCN-051) | WP-R07 |
| Certified runtime depends on synthetic upstream | `CERTIFIED_RUNTIME_DEPENDS_ON_SYNTHETIC_UPSTREAM` (CIP.0.5 declaration) | WP-R05 (unified composer feeds L13 from real upstream) |
| CIP.0.5 deferred L13 runtime | `CIP05_L13_RUNTIME_INVOCATION_DEFERRED_TO_CIP06` | CIP.0.6 — earned by WP-R03 reaching D4.a |

CIP.1 is **certifiable when**:
- All four hard decisions (D1–D4) are recorded with chosen options.
- WP-R01, WP-R02, WP-R03 (promoted to D4.a), WP-R04, WP-R05, WP-R06, WP-R07 carry green cert fingerprints.
- A single unified replay hash spans the L5→L14 chain over the bridge episode corpus.

---

## 12. Risks of Delaying Reconciliation

- **Compliance exposure.** RCN-043 (forbidden-financial-language) is currently unenforced in the active AI path. Each day this persists is a day Coinet ships unguarded prose to users.
- **Calibration drift.** OmniScore continues to compound calibration history independent of L11 + L14.6, increasing eventual migration cost (D2.b) every quarter.
- **Dormant cert decay.** Certified DAGs that never see real traffic accumulate confidence debt — every new feature on the active side risks invalidating the certified equivalents silently.
- **Two-pipeline confusion.** Every new contributor to Coinet sees two systems for "the same" job and must be told which is real. The matrix is the only thing preventing arbitrary judgment about which to extend.
- **CIP.1 false-positive risk.** Without this matrix, future leadership pressure to "just declare unification" would produce a false-green CIP.1. The matrix exists in part to make that impossible.

---

## 13. Appendix A — Evidence References

| Ref | Path |
|---|---|
| AJP.1 cert | `apps/coinet-platform/src/scripts/test-ajp1-active-judgment-pipeline.ts` |
| AJP.1 orchestrator | `apps/coinet-platform/src/integration/ajp1/ajp1-orchestrator.ts` |
| AJP.1 invariants | `apps/coinet-platform/src/integration/ajp1/ajp1-invariants.ts` |
| AJP.1 fixtures | `apps/coinet-platform/src/integration/ajp1/ajp1-fixtures.ts` |
| CIP.0.5 cert | `apps/coinet-platform/src/scripts/test-cip05-certified-runtime.ts` |
| Bridge ledger emitter | `apps/coinet-platform/src/scripts/build-bridge-comparison-ledger.ts` |
| Bridge scope contract | `apps/coinet-platform/src/integration/bridge-certification/contracts/bridge-certification-scope.ts` |
| Bridge episode catalogue | `apps/coinet-platform/src/integration/bridge-certification/fixtures/shared-episode-catalogue.ts` |
| Bridge synthetic episode contract | `apps/coinet-platform/src/integration/bridge-certification/contracts/bridge-synthetic-episode.ts` |
| Bridge comparison evidence contract | `apps/coinet-platform/src/integration/bridge-certification/contracts/bridge-comparison-evidence.ts` |
| CIP Readiness Report | `apps/coinet-platform/docs/cip-readiness-report.md` |
| Active product orchestrator | `apps/coinet-platform/src/services/judgment/index.ts` (`produceJudgment`) |
| Active regime wrapper | `apps/coinet-platform/src/services/judgment/regime-engine.ts` |
| Active timing engine | `apps/coinet-platform/src/services/judgment/timing-engine.ts` |
| Active hypothesis orchestrator | `apps/coinet-platform/src/services/hypotheses/orchestrator.ts` |
| Active scoring runtime | `apps/coinet-platform/src/services/omniscore_v3/pipeline/orchestrator.ts` |
| Active explanation runtime | `apps/coinet-platform/src/services/explanations/` |
| Active calibration spine | `apps/coinet-platform/src/services/calibration-spine/snapshot-writer.ts` |
| Certified L13 master cert | `apps/coinet-platform/src/scripts/test-l13_master.ts` |
| Certified L13 runtime | `apps/coinet-platform/src/l13/runtime/` |
| Certified L14 sublayers | `apps/coinet-platform/src/l14/` |

---

## 14. Appendix B — Shared Episode Comparison Summary

From `bridge.ledger.fa2d884e`:

| Family | Active overlap | Active vs Certified divergence | Matrix priority |
|---|---|---|---|
| **SOLX_SPOT_LED_CONTINUATION** | Both classify constructive regime via L8; both produce primary hypothesis via L10 | Active emits real Anthropic explanation; certified emits governed `AlertOutcomeEvaluation` | P2 |
| **LEVA_FRAGILITY_INVALIDATION** | Both detect elevated contradiction load; both narrow confidence below SOLX clean case | Active confidence is in-service formula; certified applies L13.5 + L14.5 governance | P1 |
| **UNLK_POST_UNLOCK_DIGESTION** | Both produce hypothesis sensitive to unlock pressure | Active scenario is in-service variant; certified L12 template engine (dormant) would represent via post-event template | P1 |
| **MOCKUSD_IDENTITY_CONTESTATION** | Both acknowledge low data completeness | Active has no constitutional L3 identity gating; certified blocks delivery via entitlement+restriction profile (L14.3 disposition = SUPPRESS_WITH_RECORD) | **P0** |

---

## 15. Appendix C — Terms and Decision Taxonomy

| Term | Meaning |
|---|---|
| **Active product pipeline** | The runtime that today produces user-visible judgment via `services/judgment/produceJudgment()`. |
| **Certified architecture** | The runtimes encoded under `src/l5/`…`src/l14/`, each individually certified and constitutionally constrained. |
| **Dormant** | Certified code that exists, is correct in isolation, but is not invoked by any production code path. |
| **Wrapper-active** | A constitutional layer that is invoked in production only through a thin service wrapper (today: L8, L10). |
| **Standing flag** | A `BridgeReconciliationFlag` value that is automatically attached to every relevant run because the divergence has not been retired. |
| **Comparable / Partial overlap / Divergent / Non-comparable / Active-only / Certified-only** | RCN row classifications, defined in §6. |
| **P0 / P1 / P2 / P3** | RCN priority levels: blocker / high migration debt / migration debt / hygiene. |
| **D1 / D2 / D3 / D4** | The four hard architectural decisions: timing / scoring / scenarios / AI explanation. |
| **WP-R0X** | Reconciliation work packages; each must terminate in a deterministic cert fingerprint. |
| **CIP.1** | Full unified-runtime synthetic certification; cannot be declared, only earned by retiring all standing blockers in §11. |
| **CIP.0.5** | Certified L13(synthetic upstream) + L14 chain certification; proves the certified downstream runtime deterministically. |
| **AJP.1** | Active product judgment pipeline certification; proves the live runtime is deterministic and obeys 10 cross-pipeline laws. |
| **Bridge ledger** | The normalized comparison artifact joining AJP.1 and CIP.0.5 fingerprints + per-episode priorities + standing divergence flags. |

---

**Authority.** This matrix is the migration constitution. Every cross-pipeline change from this point forward MUST cite a specific RCN row and either (a) close it via a WP cert fingerprint or (b) explicitly defer it with a recorded reason. Silent merges of active and certified semantics are violations of First Principle 2 (no dormant architecture laundering) and First Principle 3 (no active-path dismissal).
