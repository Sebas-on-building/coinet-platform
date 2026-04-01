# L1.1 Source Class Doctrine

## The Observational Constitution of Coinet

**Version:** 1.0.0

---

## Principle

No source enters the system as "data."
Every source enters as a **bounded observer of one type of market reality.**

- CoinGlass is not "market data." It is a **derivatives pressure observer.**
- DeFiLlama is not "fundamental data." It is a **protocol substance observer.**
- Alchemy is not "on-chain data." It is an **on-chain behavior observer.**

This changes the whole architecture. Downstream engines reason with *pressure, substance, behavior, attention, safety* — not miscellaneous metrics.

---

## The Nine Source Classes

| # | Class | Observes | Cannot Justify Alone |
|---|-------|----------|---------------------|
| 1 | **Market Surface** | Price, volume, market cap, liquidity, ranking | Structural demand quality, manipulation, whale conviction |
| 2 | **DEX Emergence** | New pairs, pool liquidity, early trading, pair freshness | Long-term quality, sustainable demand, ownership safety |
| 3 | **Derivatives Pressure** | OI, funding, liquidations, crowding, squeeze conditions | Organic spot demand, protocol quality, treasury intent |
| 4 | **Protocol Substance** | TVL, fees, revenue, inflows, unlocks, business quality | Near-term timing, leverage safety, whale intent |
| 5 | **On-Chain Behavior** | Wallet transfers, exchange flows, treasury movement, whale flows | Derivatives conditions, protocol economics, narrative |
| 6 | **Structural Safety** | Contract risk, honeypot, mint authority, ownership patterns | Opportunity quality, demand strength, timing |
| 7 | **Narrative Attention** | News intensity, social momentum, sentiment, memetic spread | Real accumulation, protocol quality, sustainability |
| 8 | **Entity Context** | Wallet labels, entity identity, smart-money context | Timing, leverage, protocol soundness |
| 9 | **Reasoning Expression** | Nothing directly — translates intelligence into language | Cannot create evidence, replace domains, override contradiction |

---

## Five Revolutionary Strategies

### Strategy 1 — Truth-Domain Sovereignty

Every class gets a sovereign truth role. No downstream system may let one class impersonate another.

- Narrative attention cannot stand in for substance
- Derivatives pressure cannot stand in for spot conviction
- Reasoning expression cannot stand in for truth

### Strategy 2 — Negative-Space Intelligence

Coinet tracks not just what is present, but **what is missing**.

Coverage states: `healthy` | `partial` | `degraded` | `stale_dominant` | `blind`

Missing truth domains change what Coinet can honestly claim.

### Strategy 3 — Cross-Class Tension Memory

Coinet preserves tension between truth domains rather than smoothing it.

Key tensions:
- Attention > Substance (reflexive fragility risk)
- Pressure > Conviction (squeeze fragility)
- Surface > Safety (false confidence risk)
- Behavior > Surface (possible stealth accumulation)
- Narrative > Safety (critical warning)

### Strategy 4 — Claim Escalation Doctrine

Single class = weak claims only. Stronger claims require multi-class confirmation.

| Claim Strength | Requirement |
|----------------|-------------|
| **Weak** | Single class can justify |
| **Medium** | Requires 2 confirming classes |
| **Strong** | Requires 3+ classes with explicit escalation |

### Strategy 5 — User-Visible Truth Fingerprint

Every judgment exposes a truth fingerprint showing the epistemic composition:

```
Surface: healthy (authority: high)
DEX emergence: partial (authority: medium)
Pressure: healthy (authority: high)
Substance: degraded (authority: low)
Behavior: partial (authority: medium)
Safety: healthy (authority: medium)
Attention: healthy (authority: high)
Entity context: blind (authority: absent)
```

---

## Module Map

```
source-systems/classes/
  types.ts                    — Core type system
  doctrine.ts                 — Full doctrine per class
  source-mapping.ts           — Provider → class mapping
  claim-boundaries.ts         — What each class can/cannot justify
  class-interactions.ts       — Cross-class support/contradiction matrix
  cross-class-tension.ts      — Structured disagreement computation
  class-coverage-state.ts     — Negative-space intelligence
  class-health.ts             — Class degradation rules
  truth-fingerprint-builder.ts — Epistemic composition output
  index.ts                    — Barrel exports
```

---

## API

`GET /api/source-systems/doctrine` — Returns full doctrine state, coverage, fingerprint, and validation.

---

## Pass Criteria

- All 9 classes defined with complete allowed/forbidden claim contracts
- All providers mapped (no unmapped providers in runtime)
- Claim escalation enforced: no single weak class can justify a strong claim
- Cross-class tensions computed and preserved
- Coverage state tracks blind spots and degraded classes
- Truth fingerprint attachable to every judgment
- Reasoning expression cannot create evidence or override truth
