# Coinet AI — Production-Ready Intelligence Pipeline

> **Core Design Principle:** Coinet must not be built as `API calls → LLM prompt → answer`.  
> It must be built as:  
> **multi-source ingestion → canonical data model → feature computation → reliability and conflict engine → regime engine → deterministic scoring → AI interpretation layer → delivery layer → feedback loop**

---

## Executive Summary

This document maps the **target 10-layer production architecture** to the **current Coinet codebase**, identifies gaps, and provides a phased implementation roadmap. The architecture prioritizes **deterministic intelligence first, AI explanation second**.

---

## 1. System Goals (Non-Negotiable)

| # | Goal | Current State |
|---|------|---------------|
| 1 | Ingest heterogeneous crypto data reliably | ✅ Connectors exist; ⚠️ no unified envelope |
| 2 | Normalize all sources into one canonical intelligence model | ✅ CIS Layer 1, Evidence Pack; ⚠️ connector output not standardized |
| 3 | Compute structured features, not raw dashboards | ✅ OmniScore segments; ⚠️ feature families incomplete |
| 4 | Reason under contradiction and uncertainty | ⚠️ Partial (quality_flags, confidence); ❌ no conflict resolution |
| 5 | Produce deterministic scores before AI explanation | ✅ OmniScore v3; ✅ Evidence Pack → Insight Pack |
| 6 | Scale across chains, assets, users without breaking | ⚠️ Chain-agnostic intent; some ETH/SOL assumptions remain |

---

## 2. Top-Level Architecture — 10 Layers

```
Sources → Connector Layer → Event Bus → Canonical Schema → Storage
  → Feature Engine → Validation/Conflict Engine → Regime Engine
  → Scoring Engine → AI Explanation Layer → Alerts/Dashboard → Feedback
```

---

## 3. Layer 1 — Source Connectors Layer

### 3.1 Current Connectors

| Connector Group | Provider | Location | Status |
|----------------|----------|----------|--------|
| Market | CoinGecko | `services/market-prices/`, `apps/coinet-platform` | ✅ |
| Market | CoinMarketCap | `services/market-prices/` | ✅ |
| Market | Birdeye | — | ❌ |
| DEX | DexScreener | `apps/coinet-platform/src/services/dexscreener.ts` | ✅ |
| DEX | GeckoTerminal | `services/market-prices/` | ✅ |
| Derivatives | CoinGlass | — | ❌ |
| Protocol | DeFiLlama | `services/market-prices/` | ✅ |
| On-chain | Alchemy | `services/alchemy-whales/` | ✅ |
| On-chain | QuickNode | — | ❌ |
| Security | GoPlus | `apps/coinet-platform/src/services/real-data-sources.ts` | ✅ |
| Security | Etherscan/Solscan | — | Partial |
| Narrative | CryptoPanic | `services/market-prices/`, `apps/coinet-platform` | ✅ |
| Narrative | LunarCrush, Twitter | — | ❌ |
| Entity | Arkham, Nansen | — | ❌ |
| AI | OpenAI, Gemini | `apps/coinet-platform` | ✅ |

### 3.2 Connector Contract (Target)

Every connector MUST return data in this standard envelope:

```typescript
interface ConnectorEnvelope {
  source: string;                    // e.g. "coingecko", "dexscreener"
  entity_type: 'asset' | 'pair' | 'protocol' | 'wallet' | 'chain';
  entity_id: string;                 // canonical ID
  chain: string | null;
  symbol: string | null;
  timestamp_observed: string;        // ISO8601
  timestamp_ingested: string;        // ISO8601
  raw_payload: Record<string, unknown>;
  normalized_partial_payload: Record<string, unknown>;  // maps to canonical metrics
  freshness_seconds: number;
  source_confidence: number;         // 0-1
  rate_limit_cost: number;           // for cost tracking
  trace_id: string;
}
```

**Gap:** Connectors currently return provider-specific JSON. Need adapter layer to wrap outputs into `ConnectorEnvelope`.

### 3.3 Connector Rules (Target)

Each connector must support:

- [ ] Retry with exponential backoff
- [ ] Timeout handling
- [ ] Stale-data marking
- [ ] Provider health status
- [ ] Circuit breaker logic
- [ ] Response schema validation (Zod)
- [ ] Source versioning

---

## 4. Layer 2 — Ingestion & Event Routing Layer

### 4.1 Ingestion Types

| Type | Use Case | Current State |
|------|----------|---------------|
| **Streaming** | Alchemy webhooks, QuickNode WS, CoinGlass WS | ⚠️ Binance WS in ingest; Kafka partially disabled in prod |
| **Scheduled** | DeFiLlama, CoinGecko, DexScreener, CryptoPanic | ✅ Cron jobs, AI Data Feeder |
| **On-demand** | Token analysis, asset reports, watchlist drilldown | ✅ Evidence Pack builder, OmniScore pipeline |
| **Backfill** | OHLCV, training data, score history | ⚠️ Partial |

### 4.2 Event Bus Topics (Target)

```
market.price.updated
dex.pair.new
dex.pair.updated
derivatives.oi.updated
protocol.fees.updated
protocol.tvl.updated
wallet.whale.transfer.detected
security.token.scan.updated
narrative.sentiment.shifted
unlock.schedule.updated
```

**Current:** Stream processor uses `market.price`, `news.article`. Need structured topic namespace.

---

## 5. Layer 3 — Canonical Data Model Layer

### 5.1 Canonical Entities (Target vs Current)

| Entity | Target Fields | Current |
|--------|---------------|---------|
| **Asset** | canonical_id, addresses by chain, symbol aliases, project_id, coingecko_id, cmc_id, defillama_link, category_tags | `TokenIdentity`, `ResolvedToken` |
| **Pair** | pair_id, base, quote, venue, chain, dex_type, pool_address | Evidence Pack `DexScreenerData` (implicit) |
| **Protocol** | protocol_id, slug, category, chains, governance_token, treasury, fee_model | DeFiLlama data (not canonical entity) |
| **Wallet** | wallet_id, chain, label, entity_type, smart_money_confidence, exchange_tag | Alchemy whales (partial) |
| **Chain** | chain_id, family, health_metrics, ecosystem_tags | Implicit in token resolution |

### 5.2 Canonical Metrics Namespace (Target)

Map all source metrics into:

| Namespace | Description | CIS / OmniScore Mapping |
|-----------|-------------|-------------------------|
| `price.spot` | CEX spot price | DataPoint `price_usd` |
| `price.dex` | DEX price | DexScreener `price_usd` |
| `market_cap` | Market cap USD | DexScreener, CoinGecko |
| `fdv` | Fully diluted valuation | DexScreener `fdv_usd` |
| `liquidity.usd` | DEX liquidity | DexScreener `liquidity_usd` |
| `oi.notional` | Open interest | DerivativesEvidence |
| `funding.rate` | Perp funding | DerivativesEvidence |
| `liq.long.usd`, `liq.short.usd` | Liquidation levels | — |
| `protocol.tvl` | TVL | DeFiLlama |
| `protocol.fees.usd` | Protocol fees | DeFiLlama |
| `protocol.revenue.usd` | Protocol revenue | DeFiLlama |
| `protocol.unlock.next_usd` | Next unlock value | Messari, DeFiLlama |
| `wallet.inflow.exchange.usd` | Exchange inflow | OnchainEvidence |
| `wallet.outflow.exchange.usd` | Exchange outflow | OnchainEvidence |
| `security.risk_score` | Security score | SecurityEvidence |
| `sentiment.velocity` | Sentiment change | SentimentEvidence |
| `narrative.news_intensity` | News intensity | NewsEvidence |

**CIS Layer 1** uses `metric_id` pattern `{category}_{name}_v{version}`. Need mapping layer from canonical namespace to CIS.

---

## 6. Layer 4 — Storage Layer

| Store | Use Case | Current |
|-------|----------|---------|
| **PostgreSQL** | Entities, scores, watchlists, alerts, user settings | ✅ Prisma |
| **TimescaleDB** | Prices, OI, TVL history, fees, sentiment | ✅ |
| **ClickHouse** | Streaming analytics, events | ✅ Stream processor |
| **Redis** | Hot state, rate limiting, dedupe, cache | ✅ Evidence cache, Redis client |
| **S3** | Raw payload archives, backfill dumps, audit | ❌ |

---

## 7. Layer 5 — Feature Engineering Layer

### 7.1 Feature Families (Target)

| Family | Examples | Current |
|--------|----------|---------|
| **Market** | price momentum 5m/1h/24h/7d, volume acceleration, FDV/liquidity, volatility | OmniScore OS segments |
| **DEX** | pair age, liquidity depth, buy/sell imbalance, new-pair ignition | DexScreener data |
| **Derivatives** | OI expansion velocity, funding z-score, liquidation density | DerivativesEvidence |
| **Protocol** | TVL growth, net inflow, fee growth, revenue retention | DeFiLlama, OmniScore QS |
| **On-chain** | whale accumulation, exchange inflow risk, treasury anomaly | OnchainEvidence |
| **Security** | mint risk, ownership concentration, liquidity lock | SecurityEvidence |
| **Narrative** | news intensity, social acceleration, sentiment divergence | NewsEvidence, SentimentEvidence |
| **Entity** | smart money participation, exchange proximity | — |

### 7.2 Feature Rules

Every feature must have:

- Exact definition
- Calculation formula
- Update frequency
- Freshness rule
- Expected range
- Missing-value policy
- Chain applicability

---

## 8. Layer 6 — Validation & Conflict Resolution Layer

### 8.1 Current State

- **CIS Layer 1:** `validation_status` (pass/warn/fail), `quality_flags` (fresh, stale, conflicting, etc.)
- **OmniScore:** Legitimacy gate, Confidence gate
- **Evidence Pack:** `ModuleStatus` (ok, missing, stale, error)

### 8.2 Source Confidence Hierarchy (Target)

| Source | Trust Level |
|--------|-------------|
| Raw on-chain (Alchemy) | High |
| CoinGlass aggregated derivatives | High |
| CoinGecko market cap | Medium-High |
| Social sentiment | Medium |
| Narrative buzz (X scraping) | Lower |

### 8.3 Conflict Resolution (Gap)

Need formal `signal_confidence_score` based on:

- Source reliability
- Cross-source agreement
- Freshness
- Feature completeness
- Regime compatibility
- History of false positives

---

## 9. Layer 7 — Regime & Context Engine

### 9.1 Regime Categories (Target)

| Category | Examples |
|----------|----------|
| **Macro** | risk-on, risk-off, sideways, high-volatility transition |
| **Crypto structure** | leverage expansion, deleveraging, spot-led expansion, low-liquidity fragility |
| **Token-specific** | launch discovery, early adoption, narrative breakout, distribution, post-unlock digestion |
| **Ecosystem** | chain expansion, contraction, sector rotation, memecoin mania |

### 9.2 Current State

- **Sentiment regime:** `coinet-sentiment-index.ts` — extreme_fear, fear, neutral, greed, extreme_greed
- **Market condition:** `market_condition_tracker.ts`, `market_condition_reports.ts` — bull, bear, sideways, volatile
- **Anomaly:** `anomaly-latency-monitor.ts` — low/normal/high/extreme volatility
- **OmniScore v3:** No regime modulation in engine (fixed weights)

### 9.3 Regime Output (Target)

Every asset/report should carry:

- `primary_regime`
- `secondary_regime`
- `regime_confidence`
- `regime_transition_risk`

---

## 10. Layer 8 — Scoring Engine

### 10.1 Core Scores (Target vs Current)

| Score | Target | Current |
|-------|--------|---------|
| Opportunity Score | Asymmetric upside | ✅ OmniScore OS |
| Risk Score | Structural downside | ✅ OmniScore Risk |
| Fraud/Rug Risk | Scam probability | ✅ Legitimacy gate |
| Protocol Quality | Economic strength | ✅ OmniScore QS |
| Market Structure | Trading health | ⚠️ Partial (DEX data) |
| Whale Conviction | Large-wallet quality | ❌ |
| Narrative Strength | Attention/memetic force | ⚠️ Sentiment, news |
| Unlock Risk | Supply overhang | ⚠️ Messari, DeFiLlama |
| Signal Confidence | Conclusion reliability | ✅ Confidence gate |

### 10.2 Score Architecture

OmniScore v3: `POS = 0.55×QS + 0.25×OS + 0.20×(100-Risk)`. Fixed weights, no regime modulation.

---

## 11. Layer 9 — AI Reasoning & Explanation Layer

### 11.1 Current Flow

1. **Evidence Pack** (server-generated truth) → DexScreener, Security, Holders, Sentiment, News, Derivatives, Onchain
2. **Insight Pack** (Pass-1) → Grok/Gemini schema-enforced output
3. **Chat Service** → Intent handlers, AI service
4. **CIS Layer 7–8** → Explanation objects, deterministic narration

### 11.2 AI Rules (Aligned)

- Mention uncertainty when present
- Do not overstate weak signals
- Reference contradictions
- Separate fact from inference
- Use score and regime grounding

---

## 12. Layer 10 — Delivery, Monitoring, and Feedback Layer

| Channel | Status |
|---------|--------|
| Dashboard | ✅ |
| Asset report page | ✅ |
| AI chat assistant | ✅ |
| Telegram alerts | ⚠️ |
| Email | ❌ |
| Feedback loop (click/ignore, outcomes) | ❌ |

---

## 13. End-to-End Flow (One Asset)

```
1. Trigger (new pair / user request / whale spike / narrative spike / scheduled)
2. Entity resolution (token → canonical asset id, protocol, chain, pools)
3. Pull/receive source updates (market, DEX, derivatives, fundamentals, on-chain, security, narrative)
4. Normalize → canonical schema
5. Compute features → feature vector
6. Validate → confirmed / conflicting / stale / incomplete
7. Detect regime → primary, secondary, confidence
8. Score → deterministic scores
9. AI reasoning → grounded explanation
10. Deliver → store, alert, dashboard
11. Learn → track outcome, performance
```

---

## 14. Scalability Principles

| Principle | Status |
|-----------|--------|
| Provider isolation (no business logic in connectors) | ⚠️ Partial |
| Event-driven core | ⚠️ Kafka exists, not fully utilized |
| Deterministic intelligence first | ✅ |
| Hot/cold data split | ✅ Redis + TimescaleDB/ClickHouse |
| Incremental computation | ⚠️ Partial |
| Chain-agnostic internal model | ⚠️ Some assumptions |
| Explainable scoring | ✅ Score drivers |
| Graceful degradation | ✅ Evidence Pack coverage, gates |

---

## 15. Implementation Roadmap

See `docs/COINET_AI_IMPLEMENTATION_ROADMAP.md` for phased build plan.

---

## 16. Final Pipeline (One Line)

**Sources → Connector Layer → Event Bus → Canonical Schema → Storage → Feature Engine → Validation/Conflict Engine → Regime Engine → Scoring Engine → AI Explanation Layer → Alerts/Dashboard → Feedback & Recalibration**

---

*Document version: 1.0.0 | Last updated: 2025-03-13*
