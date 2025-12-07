# 🏆 OMNISCORE v2.3.1 "PRODUCTION HARDENED"

## North Star

OmniScore is a **decision system** with:
- **Reflexivity-safe fundamentals**
- **Market opportunity separation**
- **Risk overrides**
- **Statistical defensibility**
- **Fail-closed outputs**
- **Full provenance ("audit trail")**
- **Continuous calibration**
- **Operational telemetry** (v2.3.1)

**This is what lets you outcompete**: most competitors stop at scoring; you ship **scoring + explainability + governance + improvement simulation + compliance posture**.

---

## v2.3.1 Hardening Pass

### New Features

1. **INV-4a/4b Split**: Score clamping is now tracked and visible in audit
   - **INV-4a (WARN)**: Clamp applied to scores
   - **INV-4b (ERROR)**: NaN/Inf or hard bound failure

2. **INV-11 Enforcement**: Confidence determinism now has ERROR severity

3. **Reflexivity Sentinel**: Live monitoring of `Corr(QS, ΔPrice_30d)`
   - Threshold: 0.3 (warning), 0.5 (alert)

4. **Methodology Provenance**: Every response includes:
   ```json
   "methodology": {
     "id": "OMNISCORE_V2.3.1_PRODUCTION",
     "hash": "sha256:...",
     "url": "/docs/omniscore/v2.3"
   }
   ```

5. **Plugin-Pack Validation Harness**: Property-based tests for sector plugins

---

## Master Math (Production Form)

### Core Scores

```
QS = f(TEAM, TECH, SEC, GOV, ECO)
OS = g(MARKET, VAL, ADOPT, COMM, TOKEN)
Risk = z(S_LEGAL) + z(S_MACRO) + ERS   (z-normalized per regime × sector)
```

### Regime Conditioning

```
POS_r = ω_F,r × QS + ω_O,r × OS - ω_R,r × Risk
POS = Σ_r p_r^final(t) × POS_r
```

### Event-Risk Severity Adjustment

```
POS_adj = POS - γ × ERS
```

γ default capped by sector.

### Narrative Reality Gap

```
NRG = z(COMM + MARKET) - z(ADOPT + SEC + TECH)
```

Interpreted by **percentiles** within regime × sector.

---

## Production Invariants (Full Set)

These are what make this *compliance-grade*.

### Value Bounds

| Code | Constraint | Description | Severity |
|------|------------|-------------|----------|
| **INV-1** | 0 ≤ Q_i ≤ 1 | Data quality bounded | ERROR |
| **INV-2** | 0 ≤ Coverage ≤ 1 | Coverage bounded | ERROR |
| **INV-4a** | Clamp applied to scores | Soft clamp - visibly honest | WARN |
| **INV-4b** | NaN/Inf or repeated clamp | Hard bound failure | ERROR |

### Probability + Weight Sanity

| Code | Constraint | Description | Severity |
|------|------------|-------------|----------|
| **INV-3** | Σ_r p_r^final = 1 | Probability hygiene | ERROR |
| **INV-7** | ω_k ∈ [0,1], Σ_k ω_k = 1 | Weight sanity | ERROR |

### Risk Monotonicity

| Code | Constraint | Description | Severity |
|------|------------|-------------|----------|
| **INV-5** | ERS > 0 ⇒ POS_adj ≤ POS | Risk monotonicity | ERROR |
| **INV-8** | γ ≥ 0 | Gamma safety | ERROR |

### Reflexivity Firewall

| Code | Constraint | Description | Severity |
|------|------------|-------------|----------|
| **INV-9** | QS features ∩ OS features = ∅ | Feature isolation via explicit whitelists | ERROR |

### Time + Confidence Determinism

| Code | Constraint | Description | Severity |
|------|------------|-------------|----------|
| **INV-10** | No future timestamps; max-age by segment | Timestamp sanity | ERROR/WARN |
| **INV-11** | Coverage → confidence mapping is deterministic | Confidence determinism | ERROR |

---

## Fail-Closed Rules (Production Behavior)

### Severity Levels

```typescript
type InvariantSeverity = "WARN" | "ERROR";

interface InvariantViolation {
  code: string;
  severity: InvariantSeverity;
  message: string;
  value?: number;
  bound?: string;
}
```

### Hard Rules (ERROR)

Any **ERROR** violation triggers:
- Gate OS
- Set confidence to **"insufficient"**
- Return POS with **low_confidence** tag
- Include violations in audit block

### Soft Rules (WARN)

Any **WARN** violation triggers:
- Keep outputs
- Attach caveats + audit warnings

---

## Quality Gate (QS → OS Exposure Firewall)

This is your anti-hype safety.

```
if Coverage_w_QS < 0.60
  => OS = "GATED"
  => POS uses QS + Risk only (OS weight set to 0)
```

---

## Segment-Specific Freshness (Production Model)

```typescript
const FRESHNESS_DEFAULTS = {
  TEAM:   "months",
  GOV:    "months",
  SEC:    "weeks",
  TECH:   "days",
  ADOPT:  "days",
  TOKEN:  "days",
  MARKET: "hours",
  COMM:   "hours",
  LEGAL:  "days",
  MACRO:  "hours",
};
```

Implementation:

```
F_i(t) = exp(-λ_g × Δt)
```

---

## Adversarial Resistance (Must-Have Moat)

### COMM Adjustment

```
COMM_adj = COMM × (1 - BotRisk) × (1 - AnomalyScore)
```

### Production Twist: Contribution Cap

```
COMM contribution cannot exceed 30% of OS
unless multi-source consistency ≥ 75%
```

This stops gameable segments from dominating.

---

## Hierarchical Peer Normalization (Fallback Ladder)

1. regime × sector × cap
2. regime × sector
3. sector × cap
4. sector
5. global

This prevents thin-bucket explosions.

---

## Audit Trail API Block (Non-Negotiable)

```json
{
  "audit": {
    "engineVersion": "2.3.1",
    "methodologyVersion": "2.3.1",
    "requestId": "uuid",
    "dataAsOf": "ISO8601",
    "sourcesUsed": ["coingecko", "defillama", "github"],
    "coverageQS": 0.81,
    "coverageOS": 0.76,
    "confidence": "medium",
    "gatingApplied": false,
    "invariantStatus": "pass",
    "violations": [],
    "warnings": [],
    "regimeSnapshot": { "bull": 0.22, "bear": 0.31, "neutral": 0.47 },
    "clampApplied": { "qs": false, "os": false, "pos": false, "posAdj": false },
    "methodology": {
      "id": "OMNISCORE_V2.3.1_PRODUCTION",
      "hash": "sha256:...",
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

## Production API Response (Final)

```json
{
  "success": true,
  "engine": "OmniScore",
  "version": "2.3.1",
  "project": "supra",
  "timestamp": "ISO8601",
  
  "qualityScore": {
    "score": 68.4,
    "tier": "Strong",
    "confidence": "medium",
    "coverage": 0.81,
    "breakdown": {
      "team": 0.72,
      "tech": 0.65,
      "security": 0.70,
      "governance": 0.55,
      "ecosystem": 0.68
    }
  },
  
  "opportunityScore": {
    "status": "ok",
    "score": 61.2,
    "tier": "Neutral",
    "coverage": 0.76
  },
  
  "risk": {
    "score": 0.22,
    "eventRiskSeverity": 0.0,
    "adjustmentGamma": 15
  },
  
  "pos": {
    "raw": 67.3,
    "adjusted": 67.3,
    "tier": "Strong",
    "confidenceBand": [62.1, 72.5]
  },
  
  "nrg": {
    "value": -0.42,
    "percentile": 0.28,
    "interpretation": "underhyped"
  },
  
  "explainability": {
    "qsDrivers": [
      { "feature": "sec_audit_depth", "z": 1.1, "Q": 0.92, "contribution": 0.8, "trend7d": "up" }
    ],
    "osDrivers": [
      { "feature": "market_liquidity_depth", "z": 0.9, "Q": 0.88, "contribution": 0.5, "trend7d": "flat" }
    ]
  },
  
  "upgradeRecommendations": {
    "note": "controllable-only",
    "highImpact": [],
    "quickWins": [],
    "strategicBet": null
  },
  
  "audit": { }
}
```

---

## Testing & Monitoring (Production Gate)

### Required Tests

- [x] **Property-based**: random missingness, negative values, extreme variance
- [x] **Golden-case snapshots**: pinned projects × regimes × cap tiers
- [x] **Regression tests**: NRG percentile mapping unchanged unless version bump
- [x] **Security tests**: bot/anomaly penalties can't increase COMM beyond cap
- [x] **Plugin-pack validation**: INV-9 isolation for sector plugins

### Required Monitoring (v2.3.1 Metrics)

**Core health**
- `omniscore_invariant_error_rate`
- `omniscore_invariant_warn_rate`
- `omniscore_response_latency_ms`
- `omniscore_data_freshness_age_seconds{segment}`

**Quality gate**
- `omniscore_os_gated_rate`
- `omniscore_coverage_qs_p50/p90`
- `omniscore_coverage_os_p50/p90`

**Anti-hype**
- `omniscore_botrisk_mean`
- `omniscore_anomalyscore_trigger_rate`
- `omniscore_comm_cap_applied_rate`

**Event risk**
- `omniscore_ers_trigger_rate`
- `omniscore_pos_adjustment_mean`

**Reflexivity**
- `omniscore_reflexivity_corr_qs_price_30d` — alert if above 0.3 (warning) or 0.5 (alert)

---

## Competitive "Why You Win" Stack

1. **QS/OS separation** (reflexivity firewall)
2. **Fail-closed invariants**
3. **Audit trails per response**
4. **Adversarial social + adoption defenses**
5. **Event-risk severity math**
6. **Hierarchical peer normalization**
7. **Counterfactual improvement simulator**
8. **Multi-uncertainty decomposition**
9. **Sector plug-in packs (Core 40 + 200)**

Most competitors have **1–2** of these. You have **all**.

---

## Production Launch Checklist

### Invariants & Validation

- [ ] INV-1…11 enforced + unit tested
- [ ] Fail-closed logic wired into API
- [ ] QS gating disables OS weight in POS

### API & Audit

- [ ] Audit trail block shipped
- [ ] Versioned methodology link in API

### Testing

- [ ] Golden-case snapshots stable
- [ ] Property-based tests with ≥ 3 real properties

### Monitoring

- [ ] Reflexivity sentinel metric live
- [ ] Invariant violation rate tracked

### Documentation

- [ ] Sector overrides documented
- [ ] All heuristics labeled as defaults/priors

---

## The Summary Line

> **OmniScore v2.3.1 is a regime-aware, quality-gated, adversarially defended project decision system with explicit invariants, hierarchical peer normalization, event-risk severity adjustments, reflexivity monitoring, and trading-desk-grade explainability.**

---

## What This Achieves

If you implement this exact production baseline, OmniScore won't just be "better."
It will feel like the **only** system that is:

- **trader-usable** — explainability pack, NRG, confidence bands
- **founder-actionable** — upgrade recommendations (controllable-only)
- **audit-defensible** — full provenance, methodology hash, invariant validation
- **anti-hype resilient** — COMM cap, adversarial adjustments, reflexivity sentinel
- **statistically honest** — fail-closed, deterministic confidence, clamp tracking
- **operationally provable** — telemetry suite for day-to-day monitoring

That combination is the category win.

---

## Release Strategy

### Shadow Mode
Compute v2.3.1 alongside v2.2.x without user exposure. Log differences.

### Canary
1–5% traffic with:
- Alerting on invariant ERROR rate
- OS gating spikes
- Latency regressions

### Full Rollout
Once stability metrics are flat.

---

## Files

- `apps/coinet-platform/src/services/omniscore-v2.3.ts` — Production implementation
- `apps/coinet-platform/src/services/__tests__/omniscore-v231-invariants.test.ts` — Property-based tests
- `apps/coinet-platform/docs/OMNISCORE_V2.3_PRODUCTION.md` — This document

---

*OmniScore v2.3.1 "Production Hardened" | Coinet Platform | Trading-Desk Grade Decision System*

