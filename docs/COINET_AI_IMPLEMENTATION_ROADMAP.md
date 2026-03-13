# Coinet AI — Implementation Roadmap

Phased build plan to evolve the current codebase into the production-ready 10-layer pipeline.

---

## Phase 0: Foundation (✅ Done)

- [x] Monorepo, CIS Layer 1, OmniScore v3, Evidence Pack, Insight Pack
- [x] Connectors: DexScreener, CoinGecko, DeFiLlama, CryptoPanic, Binance, Alchemy, GoPlus
- [x] Storage: Postgres, Redis, TimescaleDB, ClickHouse
- [x] AI: Evidence Pack → Insight Pack → Chat

---

## Phase 1: Connector Contract & Canonical Namespace (Weeks 1–2)

**Goal:** Standardize connector output so downstream systems never depend on provider-specific JSON.

### 1.1 Create Connector Envelope Package

- [ ] Add `packages/connector-contract/` with:
  - `ConnectorEnvelope` type (Zod schema)
  - `ConnectorRules` interface (retry, timeout, circuit breaker)
  - `normalizeToEnvelope(provider, raw)` adapter pattern
- [ ] Document in `docs/CONNECTOR_CONTRACT.md`

### 1.2 Canonical Metric Namespace

- [ ] Add `packages/shared-models/src/canonical-metrics.ts`:
  - Enum/const for `price.spot`, `price.dex`, `market_cap`, `liquidity.usd`, etc.
  - Mapping: canonical metric → CIS `metric_id`
- [ ] Use in Evidence Pack modules when building `normalized_partial_payload`

### 1.3 Wrap First Connectors

- [ ] DexScreener → `ConnectorEnvelope` adapter
- [ ] CoinGecko → `ConnectorEnvelope` adapter
- [ ] DeFiLlama → `ConnectorEnvelope` adapter

---

## Phase 2: Event Bus & Ingestion Types (Weeks 3–4)

**Goal:** Structured event topics and clear ingestion modes.

### 2.1 Event Topic Schema

- [ ] Define Kafka topic namespace: `market.price.updated`, `dex.pair.new`, etc.
- [ ] Add event payload schema (Zod) per topic
- [ ] Update stream-processor to consume new topics

### 2.2 Ingestion Mode Routing

- [ ] Document and implement:
  - **Streaming:** WebSocket → Kafka (Binance, Alchemy)
  - **Scheduled:** Cron → fetch → Kafka or direct DB
  - **On-demand:** API → Evidence Pack builder → OmniScore
  - **Backfill:** Batch job → TimescaleDB / S3

### 2.3 Enable Kafka in Production (Optional)

- [ ] Re-enable Kafka in ingest service for production
- [ ] Add fallback path when Kafka unavailable (graceful degradation)

---

## Phase 3: Regime Engine (Weeks 5–6)

**Goal:** Classify market/token context before scoring; feed regime into score interpretation.

### 3.1 Regime Types

- [ ] Macro: risk-on, risk-off, sideways, high-volatility
- [ ] Crypto structure: leverage expansion, deleveraging, spot-led, low-liquidity
- [ ] Token-specific: launch, early adoption, narrative breakout, distribution, post-unlock
- [ ] Ecosystem: chain expansion, sector rotation, memecoin mania

### 3.2 Regime Detector

- [ ] Create `apps/coinet-platform/src/services/regime-engine/`:
  - Input: canonical metrics, sentiment, Fear & Greed, OI, TVL
  - Output: `primary_regime`, `secondary_regime`, `regime_confidence`, `regime_transition_risk`
- [ ] Integrate with Coinet Sentiment Index and market condition tracker

### 3.3 Regime-Aware Scoring (Optional)

- [ ] Add regime as context to OmniScore (e.g., weight adjustments)
- [ ] Or: keep OmniScore deterministic; use regime only in AI explanation layer

---

## Phase 4: Validation & Conflict Resolution (Weeks 7–8)

**Goal:** Formal `signal_confidence_score` and conflict handling.

### 4.1 Source Confidence Hierarchy

- [ ] Define trust weights per source (config)
- [ ] Apply in Evidence Pack when aggregating multi-source data

### 4.2 Conflict Detection

- [ ] Detect when sources disagree (e.g., price.coingecko vs price.dexscreener)
- [ ] Mark as `conflicting` in quality_flags
- [ ] Add conflict resolution rules (e.g., prefer on-chain for price when available)

### 4.3 Signal Confidence Score

- [ ] Compute `signal_confidence_score` from:
  - Source reliability
  - Cross-source agreement
  - Freshness
  - Feature completeness
  - Regime compatibility
- [ ] Expose in OmniScore snapshot / Evidence Pack

---

## Phase 5: Feature Engineering Expansion (Weeks 9–11)

**Goal:** Structured feature families with explicit definitions.

### 5.1 Feature Specification Sheets (FSS)

- [ ] Document each feature: definition, formula, update frequency, freshness, range, missing-value policy
- [ ] Start with: market momentum, DEX pair age, OI velocity, TVL growth

### 5.2 New Feature Families

- [ ] Whale Conviction Score (from on-chain + holder data)
- [ ] Narrative Strength Score (from news + sentiment)
- [ ] Unlock Risk Score (from Messari/DeFiLlama unlocks)
- [ ] Market Structure Score (from DEX liquidity, volume, imbalance)

### 5.3 Feature Pipeline

- [ ] Incremental computation: recompute only affected features when new signals arrive
- [ ] Store features in Redis (hot) and TimescaleDB (history)

---

## Phase 6: Connector Expansion (Weeks 12–14)

**Goal:** Add missing connectors per architecture.

### 6.1 High Priority

- [ ] CoinGlass (derivatives)
- [ ] Birdeye (market, DEX)
- [ ] QuickNode (on-chain)

### 6.2 Medium Priority

- [ ] LunarCrush (social)
- [ ] Arkham / Nansen (entity)

### 6.3 Connector Rules

- [ ] Retry with backoff
- [ ] Circuit breaker
- [ ] Health status endpoint
- [ ] Stale-data marking

---

## Phase 7: Delivery & Feedback (Weeks 15–17)

**Goal:** Alerts, monitoring, feedback loop.

### 7.1 Alert Logic

- [ ] Threshold + confidence minimum + novelty test + cooldown
- [ ] User relevance filter

### 7.2 Observability

- [ ] Source uptime
- [ ] Ingestion lag
- [ ] Stale source detection
- [ ] Feature pipeline failures
- [ ] Score drift
- [ ] AI cost and latency

### 7.3 Feedback Loop

- [ ] Log: which alerts clicked, which ignored
- [ ] Track: subsequent asset outcomes
- [ ] Score accuracy by regime
- [ ] False-positive clusters

---

## Phase 8: Storage & Backfill (Weeks 18–20)

**Goal:** S3 for raw archives, backfill jobs.

### 8.1 Object Storage

- [ ] S3-compatible for raw API payloads
- [ ] Historical backfill dumps
- [ ] Audit snapshots

### 8.2 Backfill Jobs

- [ ] OHLCV rebuild
- [ ] Score history reconstruction
- [ ] Regime backtests

---

## Recommended Starting Point

**Start with Phase 1 (Connector Contract & Canonical Namespace).**

1. Creates the foundation for all downstream work
2. Low risk: additive, does not break existing flows
3. Enables Phase 2 (event bus) and Phase 4 (conflict resolution) cleanly

**Alternative:** If you want immediate user impact, start with **Phase 3 (Regime Engine)** — regime-aware explanations will make the AI feel smarter without changing core scoring.

---

*Document version: 1.0.0 | Last updated: 2025-03-13*
