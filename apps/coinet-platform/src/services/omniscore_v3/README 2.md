# OmniScore v3.0 "DIABOLICAL" — Ground-Up Rebuild

## 🎯 North Star

OmniScore must answer, for any token:

| Question | Maps To | Speed | Fail Mode |
|----------|---------|-------|-----------|
| **Is it legit?** | Legitimacy Gate | Once | **BLOCK** |
| **Is it fundamentally strong?** | QS (Quality Score) | Slow (days) | Degrade |
| **Is now a good time?** | OS (Opportunity Score) | Fast (hours) | Degrade/Gate |
| **What can kill it?** | Risk Score | Medium | Always show |
| **How sure are we?** | Confidence | Always | **BLOCK if low** |

If Legitimacy or Confidence fails → **no score** (fail-closed).

---

## 🚨 Non-Negotiable Rules

### Rule 1: No Regime-Dependent Weights
Weights are **fixed**. The formula does not change based on market conditions.
This prevents score swings from regime detection noise.

### Rule 2: No Estimates Masquerading as Truth
Every value must be:
- **Measured**: Direct API/blockchain data with source + timestamp
- **Derived**: Explicitly labeled with derivation chain (e.g., `momentum_30d ← price_history(CoinGecko)`)
- **Estimate**: BANNED from scores. Only allowed for debugging with `reliability: 0.0`

### Rule 3: One Engine, One Entrypoint, One Output
- Single calculation path: `calculateOmniScore()` in `engine.ts`
- Single entrypoint: `index.ts`
- Single output schema: `OmniScoreResult` in `types.ts`

### Rule 4: Fail-Closed on Low Quality
If any of these fail, **no score is produced**:
- Legitimacy gate fails (hard fail or 3+ soft fails)
- Confidence < `minimum` threshold
- Coverage < minimum for required segments
- Data staleness > maximum age

### Rule 5: Every Number is Traceable
The audit trail must show:
```
POS (72.5) ← engine.calculatePOS()
  ├── QS (85.2) ← segments/quality.ts
  │     ├── TEAM (78) ← github_contributors(GitHub, 2024-01-15T10:00:00Z)
  │     └── TECH (92) ← github_commits_30d(GitHub, 2024-01-15T10:00:00Z)
  ├── OS (65.0) ← segments/opportunity.ts
  │     └── MARKET (65) ← volume_24h(CoinGecko, 2024-01-15T10:00:00Z)
  └── Risk (25.0) ← segments/risk.ts
```

### Rule 6: No Derived Scores Without Explicit Audit
If `OS` uses `momentum_30d`, and `momentum_30d` is derived from `price_history`:
```
OS ← momentum_30d ← price_history(source: CoinGecko, fetched: 2024-01-15T10:00:00Z)
```

---

## 📐 Formula (Fixed Weights)

```typescript
const FIXED_WEIGHTS = {
  w_qs: 0.55,      // Fundamentals dominant
  w_os: 0.25,      // Opportunity secondary
  w_safety: 0.20,  // Safety = 100 - Risk
};

// POS = w_qs × QS + w_os × OS + w_safety × (100 - Risk)
// If OS is gated, renormalize: POS = (w_qs/(w_qs+w_safety)) × QS + (w_safety/(w_qs+w_safety)) × Safety
```

---

## 📁 Directory Structure

```
omniscore_v3/
├── index.ts                 # Single entrypoint
├── engine.ts                # Core calculation
├── types.ts                 # All TypeScript types
├── constants.ts             # Tier thresholds (fixed)
├── smoothing.ts             # Temporal smoothing
│
├── segments/
│   ├── quality.ts           # QS calculation
│   ├── opportunity.ts       # OS calculation
│   └── risk.ts              # Risk calculation
│
├── gates/
│   ├── legitimacy.ts        # Legitimacy gate
│   └── confidence.ts        # Confidence gate
│
├── data/
│   ├── fetcher.ts           # Single data fetcher
│   ├── sources.ts           # Source registry
│   └── requirements.ts      # Min data requirements
│
├── views/
│   ├── allocator.ts         # Allocator view (long-term)
│   └── trader.ts            # Trader view (short-term)
│
├── # Infrastructure (copied from v2, unchanged)
├── validation.ts            # Zod schemas
├── errors.ts                # Error handling
├── invariants.ts            # INV-1 to INV-12
├── logging.ts               # Structured logs
├── version.ts               # Version management
└── persistence.ts           # DB state
```

---

## 🔢 Tier Thresholds (Fixed)

| Tier | Range | Description |
|------|-------|-------------|
| Elite | 85-100 | Top performers |
| Strong | 70-84 | Above average |
| Neutral | 50-69 | Average |
| Weak | 30-49 | Below average |
| Critical | 0-29 | Poor performers |

---

## 🛡️ Gates

### Legitimacy Gate
**Hard fails** (instant block):
- Rug pull history
- Active SEC warning
- Contract honeypot
- Fake audit PDF

**Soft fails** (gate if 3+):
- No public team
- Less than 30 days old
- Less than 100 holders
- Wash trading detected
- No security audit

### Confidence Gate
| Confidence | Coverage | Action |
|------------|----------|--------|
| High | ≥ 80% | Full score |
| Medium | 60-79% | Score with warning |
| Low | 40-59% | Degraded score |
| Insufficient | < 40% | **BLOCK** |

---

## 📊 Two Views, One Truth

### Allocator View (Long-Term)
- Focus: QS, Risk, Confidence
- Time horizon: 6-12 months
- Recommendation: accumulate / hold / reduce / avoid
- May hide OS in extreme fear (unreliable)

### Trader View (Short-Term)
- Focus: OS, NRG, Momentum
- Time horizon: 1-4 weeks
- Signal: strong_buy / buy / neutral / sell / strong_sell
- Shows gate reason if OS unavailable

---

## 🔄 Smoothing Rules

| Score | Max Daily Δ | Alpha | Min Hours | Bypass on Event |
|-------|-------------|-------|-----------|-----------------|
| QS | ±2 | 0.2 | 24 | Never |
| OS | ±10 | 0.5 | 4 | Yes (ERS > 0.5) |
| POS | ±5 | 0.35 | 8 | Yes (ERS > 0.5) |

---

## 🚀 Version

- **Engine Version**: 3.0.0
- **Formula Version**: v3.0
- **Methodology ID**: OMNISCORE_V3.0_DIABOLICAL

---

## ❌ What Was Removed

- Regime-dependent weight modulation
- Multiple parallel engines
- Estimates masquerading as data
- In-memory-only caching
- 119k lines of bloat

## ✅ What Was Kept

- Zod validation schemas
- Error handling with codes
- Production invariants (INV-1 to INV-12)
- Structured logging + audit trails
- Version management
- Database persistence for smoothing
- Golden test cases
