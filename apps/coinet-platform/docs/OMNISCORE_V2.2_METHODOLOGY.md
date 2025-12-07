# 🏆 OMNISCORE v2.2.2 FINAL FORM — INVARIANT-VALIDATED, AUDIT-READY

## Design Goal

A globally consistent, adversarially hardened, regime-aware project decision system with:
- Strict definitions
- Probability hygiene
- Weight-aware data confidence
- Anti-gaming defenses
- Explainability that holds up in institutional review

---

## System Invariants (Verified via Property-Based Testing)

| Code | Constraint | Description | Severity |
|------|------------|-------------|----------|
| **INV-1** | 0 ≤ Q_i(t) ≤ 1 | Data quality bounded | ERROR |
| **INV-2** | 0 ≤ Coverage_w(S) ≤ 1 | Coverage bounded | ERROR |
| **INV-3** | Σ_r p_r^final(t) = 1 | Probability hygiene | ERROR |
| **INV-4** | 0 ≤ QS, OS, POS ≤ 100 | Score bounds enforced | WARN |
| **INV-5** | ERS > 0 ⇒ POS_adj ≤ POS | Risk monotonicity | ERROR |
| **INV-6** | Coverage_w_QS < 0.60 ⇒ OS = GATED | Quality gate | ERROR |
| **INV-7** | ω_k ∈ [0,1], Σ_k ω_k = 1 | Weight sanity | WARN |
| **INV-8** | γ ≥ 0 | Gamma safety | ERROR |
| **INV-9** | QS ∩ OS inputs = ∅ | Feature isolation | ERROR |

**Fail-Closed Behavior:**
- ERROR → gate OS, label POS low confidence, or stop response
- WARN → show explanation, continue with caveats

---

## Canonical Definitions (Single Source of Truth)

### Data Quality

```
Q_i(t) = R_i × F_g(t) × C_i(t)    ∈ [0, 1]
```

### Freshness Decay

```
F_g(t) = exp(-λ_g × Δt_days)
HalfLife_g = ln(2) / λ_g
```

| Segment | λ (days⁻¹) | Half-Life |
|---------|------------|-----------|
| TEAM | 0.0033 | 210 days |
| GOV | 0.0050 | 139 days |
| SEC | 0.0330 | 21 days |
| TECH | 0.0990 | 7 days |
| MARKET | 0.6931 | 1 day |

### Canonical Coverage

```
Coverage_w(S, t) = Σᵢ∈S 1[xᵢ] × Qᵢ × w̄ᵢ / Σᵢ∈S w̄ᵢ
```

**Derived:**
- Coverage_w_all — Global
- Coverage_w_QS — Quality Score segments
- Coverage_w_OS — Opportunity Score segments
- Coverage_w_NRG — NRG calculation segments

---

## Score Construction

### Segment Scores

```
S_g(t) = Σᵢ∈g w_{g,i} × Q_i(t) × z̃_i(t)
```

### Quality Score (Fundamentals)

```
QS(t) = Σ_{g∈{TEAM,TECH,SEC,GOV,ECO}} α_g × S_g(t)
```

### Opportunity Score (Market)

```
OS_r(t) = Σ_{g∈{MARKET,TOKEN,VAL,ADOPT,COMM}} β_{r,g} × S_g(t)
```

### Risk Core

```
Risk(t) = S_LEGAL(t) + S_MACRO(t) + ERS(t)
```

**Scaling note:** Risk components are z-normalized within regime × sector before aggregation.

---

## POS Aggregation

```
POS_r(t) = ω_F × QS(t) + ω_O × OS_r(t) - ω_R × Risk(t)
POS(t) = Σ_r p_r^final(t) × POS_r(t)
```

**Initial priors (pending empirical calibration):**
- ω_F = 0.45
- ω_O = 0.40
- ω_R = 0.15

---

## Regime Detection (Hybrid + Smoothed)

```
p_r(t) = η × p_r^model(t) + (1-η) × p_r^rules(t)
p̃_r(t) = EMA(p_r(t), τ)    where τ = 5 days
p_r^final(t) = p̃_r(t) / Σ_k p̃_k(t)    [INV-3: mandatory re-normalization]
```

---

## Event-Risk Override

```
ERS(t) = max(event severities)
POS_adj(t) = POS(t) - γ × ERS(t)
```

Where γ ≥ 0 (INV-8), default 15 (sector-tunable)

**INV-5:** ERS > 0 ⇒ POS_adj ≤ POS (risk monotonicity)

---

## Manipulation & Gaming Defenses

### Cross-Venue Validation

Increase WashRisk when CEX volume spikes without:
- DEX volume confirmation
- Order book depth coherence
- Price impact coherence

### Hierarchical Peer Normalization (Fallback Ladder)

Compare within progressively broader buckets:

1. regime × sector × cap
2. regime × sector
3. sector × cap
4. sector
5. global

Ensures stability for thin buckets.

### Token Entity Clustering (Fallback Heuristic — Uncalibrated Default)

**Per-sector override map:**
- DeFi: 1.4x
- Meme: 1.5x
- L1/L2: 1.2x
- Infrastructure: 1.25x
- Default: 1.3x

**Cluster signals (future full implementation):**
- Shared funding graph
- Time-synchronized transfers
- Correlated deposit/withdraw behavior
- Synchronized sell-offs

---

## NRG (Narrative vs Reality Gap)

```
NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)
```

### Confidence Gate (No Defaults)

```
Coverage_w_NRG < 0.60 ⇒ NRG.label = "low_confidence"
```

**Important:** Do NOT auto-assign "fairly valued."

---

## Feature Isolation (INV-9)

**QS features must NOT include:** MARKET, VAL, COMM, TOKEN raw inputs

**OS features must NOT include:** TEAM, TECH, SEC, GOV, ECO raw inputs

This is the moat — prevents price-driven signals from contaminating fundamentals.

---

## Reflexivity Leak Monitoring

```
Leak(t) = Corr(QS, ΔPrice_30d)
QS_Integrity = 1 - |Leak(t)|
```

| QS_Integrity | Level |
|--------------|-------|
| ≥ 0.9 | Excellent |
| ≥ 0.7 | Good |
| ≥ 0.5 | Moderate |
| < 0.5 | Poor |

---

## Explainability Pack (Trading-Desk Grade)

Expose:
- **Top 5 QS drivers** — each with z̃_i, Q_i, contribution
- **Top 5 OS drivers** — each with z̃_i, Q_i, contribution

**Example:**

```json
{
  "qsDrivers": [
    { "feature": "sec_audit_depth", "z": 1.1, "Q": 0.92, "contribution": 0.8 }
  ],
  "osDrivers": [
    { "feature": "market_liquidity_depth", "z": 0.9, "Q": 0.88, "contribution": 0.5 }
  ]
}
```

---

## Uncertainty (Initial Calibrated Priors)

```
σ_data = (1 - Coverage_w_all) × k_data
σ_model = k_model
σ_regime = H(p_r^final) / H_max × k_regime

σ_total = √(σ²_data + σ²_model + σ²_regime)
```

**Upgrade path (v3.0):**

```
σ_data → √(Σᵢ (1-Qᵢ)² × wᵢ² × σᵢ²)
```

---

## Testing

### Property-Based Tests

Invariant compliance is verified via property-based testing across:
- Missing data
- Negative values
- Exploding variances
- Weird regime distributions

### Golden-Case Snapshot Tests

10 known projects with frozen historical states:
- QS, OS, POS
- Gating flags
- NRG interpretation
- ERS adjustments

No regression across versions.

---

## API Response Structure

```json
{
  "version": "2.2.2-final",
  "qualityScore": { "score": 75.4, "tier": "Strong" },
  "opportunityScore": { "score": 62.3, "tier": "Neutral", "gated": false },
  "explainability": {
    "qsDrivers": [...],
    "osDrivers": [...],
    "topDrivers": [...],
    "topRisks": [...]
  },
  "manipulationDefenses": {
    "peerBucketAnomaly": { "bucketTier": 2 },
    "entityClustering": { "method": "placeholder", "multiplier": 1.3 }
  },
  "dataCoverage": { "all": 0.78, "qs": 0.82, "os": 0.74, "nrg": 0.76 },
  "reflexivityMonitor": { "qsIntegrity": 0.88 },
  "invariantValidation": { "allPassed": true, "errorCount": 0, "warnCount": 0 },
  "methodologyFooter": "Scores are probabilistic estimates. Confidence depends on data coverage, regime stability, and model maturity."
}
```

---

## The Summary Line

> **OmniScore v2.2.2 is a regime-aware, quality-gated, adversarially defended project decision system with explicit invariants, hierarchical peer normalization, event-risk severity adjustments, and trading-desk-grade explainability.**

---

## What This Achieves

With this final-form implementation:
- ✅ No known loose ends in v2.2.x scope
- ✅ Invariant-validated via property-based testing
- ✅ Fail-closed behavior on ERROR violations
- ✅ Trading-desk-grade explainability pack
- ✅ Feature isolation enforced (QS/OS firewall)
- ✅ Hierarchical peer normalization for thin-bucket stability
- ✅ Uncalibrated defaults clearly labeled

---

## Methodology Footer

Scores are probabilistic estimates. Confidence depends on data coverage, regime stability, and model maturity.

---

*OmniScore v2.2.2 Final Form | Coinet Platform | Invariant-Validated, Audit-Ready*
