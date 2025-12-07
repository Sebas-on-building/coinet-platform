# OmniScore™ Methodology

**Version 2.3.1** | Coinet Platform

---

## What is OmniScore?

OmniScore is a **decision system** — not just a score. It evaluates cryptocurrency projects across fundamentals, market opportunity, and risk, producing actionable outputs for traders, founders, and analysts.

**Three outputs, one system:**

| Output | Purpose |
|--------|---------|
| **Quality Score (QS)** | What the project *is* — fundamentals, security, team |
| **Opportunity Score (OS)** | What the market *might reward* — positioning, momentum |
| **Project OmniScore (POS)** | Regime-blended decision score with confidence bands |

---

## Core Principles

### 1. Reflexivity Firewall

Quality and opportunity are kept **strictly separate**.

```
QS = f(TEAM, TECH, SEC, GOV, ECO)       ← fundamentals only
OS = g(MARKET, VAL, ADOPT, COMM, TOKEN) ← market signals only
```

This prevents price-driven momentum from inflating perceived quality — a common failure mode in crypto analytics.

### 2. Regime Awareness

Scores are conditioned on market regime:

| Regime | Detection Signals |
|--------|-------------------|
| Bull | BTC +30% 90d, Fear & Greed > 70 |
| Bear | BTC -30% 90d, sustained negative trend |
| Neutral | Normal volatility, mixed signals |
| Crisis | Volatility spike > 2σ, rapid drawdown |
| Recovery | Positive 30d trend after negative 90d |

Weights and thresholds adapt to regime — "Strong in a bull" means something different than "Strong in a crisis."

### 3. Data Quality Weighting

Every input carries a quality score:

```
Q = Reliability × Freshness × Consistency
```

Low-quality data has reduced influence. Missing data is flagged, not hidden.

### 4. Anti-Hype Defenses

Social metrics (COMM) are adjusted for manipulation:

```
COMM_adjusted = COMM × (1 - BotRisk) × (1 - AnomalyScore)
```

Additionally, COMM contribution is **capped at 30%** of the Opportunity Score unless multi-source consistency exceeds 75%.

---

## The Formula

### Master Equation

```
POS = Σ_r p_r(t) × [ω_F × QS + ω_O × OS - ω_R × Risk]
```

Where:
- `p_r(t)` = regime probabilities (sum to 1)
- `ω_F, ω_O, ω_R` = objective weights (currently 0.45, 0.40, 0.15)
- `Risk` = legal + macro + event risk severity

### Event Risk Adjustment

```
POS_adjusted = POS - γ × ERS
```

Where `γ` is sector-specific (e.g., 18 for DeFi, 12 for L1) and `ERS` is Event Risk Severity (0–1).

### Narrative vs Reality Gap (NRG)

```
NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)
```

| NRG Percentile | Interpretation |
|----------------|----------------|
| Top 10% | Overhyped 🔴 |
| 35th–65th | Fairly valued 🟡 |
| Bottom 10% | Severely underhyped 💎 |

---

## Quality Gates

### QS Coverage Gate

If QS coverage falls below 60%, the Opportunity Score is **gated**:

- OS displays as "GATED"
- POS uses QS + Risk only (OS weight set to 0)
- Prevents "market noise looks like opportunity"

### Confidence Levels

Coverage maps deterministically to confidence:

| Coverage | Confidence |
|----------|------------|
| ≥ 80% | High |
| ≥ 60% | Medium |
| ≥ 40% | Low |
| < 40% | Insufficient |

---

## Invariants

OmniScore enforces **11 production invariants** at all times:

| Code | Constraint | Severity |
|------|------------|----------|
| INV-1 | Data quality ∈ [0, 1] | ERROR |
| INV-2 | Coverage ∈ [0, 1] | ERROR |
| INV-3 | Regime probabilities sum to 1 | ERROR |
| INV-4a | Score clamping applied | WARN |
| INV-4b | NaN/Inf in scores | ERROR |
| INV-5 | Event risk reduces POS | ERROR |
| INV-7 | Weights sum to 1 | ERROR |
| INV-8 | Gamma ≥ 0 | ERROR |
| INV-9 | QS/OS features isolated | ERROR |
| INV-10 | Timestamps valid | ERROR/WARN |
| INV-11 | Confidence deterministic | ERROR |

Any ERROR-level violation:
- Gates the Opportunity Score
- Sets confidence to "insufficient"
- Returns POS with low_confidence tag
- Includes violation details in audit trail

---

## Audit Trail

Every response includes full provenance:

```json
{
  "audit": {
    "engineVersion": "2.3.1",
    "methodologyVersion": "2.3.1",
    "requestId": "uuid",
    "dataAsOf": "2024-01-15T10:30:00Z",
    "sourcesUsed": ["coingecko", "defillama", "github"],
    "coverageQS": 0.81,
    "coverageOS": 0.76,
    "confidence": "medium",
    "gatingApplied": false,
    "invariantStatus": "pass",
    "clampApplied": { "qs": false, "os": false, "pos": false },
    "methodology": {
      "id": "OMNISCORE_V2.3.1_PRODUCTION",
      "hash": "sha256:000000005b0c8f21",
      "url": "/docs/omniscore/v2.3"
    },
    "reflexivitySentinel": {
      "corrQsPrice30d": 0.12,
      "status": "healthy",
      "threshold": 0.3
    }
  }
}
```

---

## Upgrade Recommendations

For project founders, OmniScore generates **controllable-only** recommendations:

| Category | Description |
|----------|-------------|
| **High Impact** | Actions with largest expected POS lift |
| **Quick Wins** | Easy-to-implement improvements |
| **Strategic Bet** | Long-term, high-upside investments |

Non-controllable factors (market conditions, macro) are **never** presented as recommendations.

---

## Validation & Calibration

### Testing

- Property-based tests for all invariants
- Golden-case snapshots across regimes and sectors
- Plugin-pack validation for sector extensions

### Calibration Lifecycle

1. **Priors** — Initial weights from domain expertise
2. **Shadow mode** — Compute alongside production, log differences
3. **Live calibration** — Update weights based on predictive performance
4. **Drift monitoring** — Alert on weight divergence, auto-rollback if necessary

### Reflexivity Monitoring

```
Leak(t) = Corr(QS, ΔPrice_30d)
```

If correlation exceeds 0.3 (warning) or 0.5 (alert), the feature set is reviewed for reflexivity contamination.

---

## Tiers & Interpretation

| Score | Tier | Historical Context |
|-------|------|-------------------|
| 85+ | Elite | Top 5% of projects in segment |
| 70–84 | Strong | Top 20% |
| 50–69 | Neutral | Median performance |
| 30–49 | Weak | Below average |
| < 30 | Critical | Bottom 10% |

**Note:** Tiers are computed relative to regime + sector + market-cap bucket, not absolute thresholds.

---

## Disclaimer

OmniScore is a **probabilistic estimate**, not financial advice. Confidence depends on:

- Data coverage and quality
- Regime stability
- Model maturity

Historical backtesting is used where sufficient history exists. All weights are labeled as "initial priors pending empirical calibration" until validated.

---

## API Endpoint

```bash
curl "https://api.coinet.ai/api/omniscore/v2.3?project=ethereum"
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.3.1 | Dec 2024 | INV-4a/4b split, reflexivity sentinel, methodology provenance |
| 2.3.0 | Dec 2024 | Production baseline with 11 invariants |
| 2.2.2 | Dec 2024 | Fail-closed behavior, weight sanity |
| 2.2.0 | Dec 2024 | QS/OS separation, event-risk layer, NRG |

---

*OmniScore™ | Coinet Platform | © 2024*

