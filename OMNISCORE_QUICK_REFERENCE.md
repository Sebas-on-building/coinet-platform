# OmniScore v2.3.3 — Quick Reference Card

**Version**: 2.3.3 "Diabolical"  
**Date**: December 12, 2025

---

## Core Formula (One-Liner)

```
POS = (0.45 × QS + 0.40 × OS - 0.15 × Risk) - γ × ERS
```

---

## Component Scores

### Quality Score (QS) — What the project IS
```
QS = 0.20×TEAM + 0.25×TECH + 0.25×SEC + 0.15×GOV + 0.15×ECO
Range: 0-100
Segments: Fundamentals only
```

### Opportunity Score (OS) — What market rewards NOW
```
OS = 0.20×MARKET + 0.20×VAL + 0.25×ADOPT + 0.15×COMM + 0.20×TOKEN
Range: 0-100
Segments: Market metrics only
v2.3.3: Capped at 92 for mega-caps, 95 for large-caps
```

### Risk Score
```
Risk = f(LEGAL, MACRO, ERS)
Range: 0-100 (higher = more risk)
```

---

## Tier Thresholds (FIXED)

```
Elite:    85-100   🏆
Strong:   70-84    💪
Neutral:  50-69    ⚡
Weak:     30-49    ⚠️
Critical: 0-29     🚨
```

**IMPORTANT**: Use exact tier from engine payload, never derive from score!

---

## Quadrant Zones (QS vs OS)

```
         OS ≥ 60              OS < 60
      ┌─────────────────┬─────────────────┐
QS≥60 │  TARGET ZONE    │  BUILDER ZONE   │
      │  (buy & hold)   │  (accumulate)   │
      ├─────────────────┼─────────────────┤
QS<60 │  HYPE ZONE      │  AVOID ZONE     │
      │  (ride/exit)    │  (stay away)    │
      └─────────────────┴─────────────────┘
```

---

## Narrative Energy (NRG)

```
NRG = z(COMM + MARKET) - z(SEC + TECH + ADOPT)

NRG > 0:  Overhyped (narrative > reality)
NRG < 0:  Underhyped (reality > narrative)
NRG ≈ 0:  Balanced

v2.3.3: Mega-caps get 30% dampening on positive NRG
```

---

## Narrative Manipulation Index (NMI)

```
NMI = 100 × (0.25×Bot + 0.20×Anomaly + 0.20×ICR + 0.15×Disp + 0.20×Div)

Tiers:
  clean:       NMI < 20   ✅
  suspicious:  NMI 20-40  ⚠️
  manipulated: NMI 40-60  🚨
  severe:      NMI ≥ 60   ⛔
```

---

## Key Invariants

```
INV-1:  0 ≤ Q_i ≤ 1
INV-5:  ERS > 0 ⇒ POS_adj ≤ POS_raw
INV-6:  IF coverageQS < 60% THEN gate OS
INV-7:  Σ weights = 1.0
INV-9:  QS_features ∩ OS_features = ∅
INV-13: OS ≤ ceiling[capBucket]  (v2.3.3)
```

---

## Gamma by Sector

```
DeFi:          γ = 18
Meme:          γ = 25
L1:            γ = 12
L2:            γ = 12
Infrastructure: γ = 10
```

---

## OS Ceiling by Cap (v2.3.3)

```
Mega ($10B+):   OS_max = 92
Large ($1B+):   OS_max = 95
Mid ($100M+):   OS_max = 98
Small/Micro:    OS_max = 100
```

---

## Confidence Levels

```
high:         coverage ≥ 80%
medium:       coverage ≥ 60%
low:          coverage ≥ 40%
insufficient: coverage < 40%
```

---

## Example: ETH (Builder Zone, Weak tier)

```
QS = 74 (Strong fundamentals)
OS = 31 (Weak opportunity)
Risk = 22
ERS = 0.05
γ = 12

POS = (0.45×74 + 0.40×31 - 0.15×22) - 12×0.05
    = (33.3 + 12.4 - 3.3) - 0.6
    = 42.4 → 42

Tier: Weak (30-49)
Quadrant: Builder (QS≥60, OS<60)

Narrative: "Strong fundamentals, weak opportunity"
```

---

## Chat Presentation Rules

```
STEP 1: "[PROJECT] scores [X]/100 ([TIER] tier)"
STEP 2: "QS is [X]/100 ([TIER]) — [interpretation]"
        "OS is [X]/100 ([TIER]) — [interpretation]"
STEP 3: "Positioned in [QUADRANT] Zone"

NEVER:
❌ Improvise tier labels
❌ Call 43 "Neutral" (it's Weak)
❌ Use fuzzy numbers ("around 74-ish")
❌ Confuse quadrant with tier
```

---

## Quick Diagnostic

**If POS seems wrong**:
1. Check QS coverage (quality gate at 60%)
2. Check OS cap adjustment (mega-caps capped at 92)
3. Check gamma × ERS adjustment
4. Verify tier is from fixed thresholds, not conditioned

**If tier label seems wrong**:
1. Use rawTier from payload (not conditionedTier)
2. 43 = Weak, not Neutral
3. Never derive tier from score yourself

---

*For complete formulas, see OMNISCORE_V2.3.3_COMPLETE_FORMULAS.md*
