# L1.3 Redundancy & Substitution Matrix

## Doctrine Version: 1.0.0

---

## Governing Principle

> Substitution is not about keeping the UI alive.
> It is about preserving as much truth as possible **without lying about what has been lost**.

---

## Five Substitution Modes

| Mode | Description | Authority Preserved |
|------|-------------|---------------------|
| **SAME_AUTHORITY** | Secondary observes the same truth atom with equivalent authority | Full |
| **LOWER_AUTHORITY_SAME_TRUTH** | Secondary observes the same atom with weaker authority | Reduced |
| **ADJACENT_TRUTH_CONTINUITY** | Different truth atom gives partial continuity, not equivalence | Weak |
| **TEMPORAL_FALLBACK** | Last trusted state reused within bounded time window | Time-decaying |
| **NO_FALLBACK** | No substitution allowed; truth atom is blind | None |

---

## Five Revolutionary Strategies

### Strategy 1 — Truth-Preserving Redundancy

Substitution happens at the truth-atom level, not the vendor level. A provider can only substitute for another if it observes the same truth atom or an explicitly permitted adjacent truth.

### Strategy 2 — Non-Isomorphic Redundancy

When same-truth substitution fails, adjacent-truth continuity may preserve a weaker structural view — but it must never impersonate full equivalence.

### Strategy 3 — Fail-Soft vs Fail-Stop Doctrine

Every truth atom declares whether degraded mode is allowed (fail-soft) or whether certain claims must be refused entirely (fail-stop).

### Strategy 4 — Claim Lockouts

Fallback changes what Coinet is **allowed to say**, not just the source. When derivatives are blind, leverage-dominance claims are locked. When safety is blind, legitimacy claims are locked.

### Strategy 5 — Blind-Spot Escalation

When multiple critical truth atoms are blind simultaneously, compound blindness escalates from `degraded` → `partial_blind` → `judgment_unsafe`.

---

## Fail-Stop Sanctuaries

These truth atoms require fail-stop when blind:

- `security.risk_score` — no "token appears safe" claim without safety authority
- `security.mint_authority` — no "mint authority is safe" claim without direct verification
- `security.ownership_conc` — no "ownership is distributed" claim without evidence
- `entity.label_confidence` — no "smart money" claims without entity authority
- `entity.institutional` — no "institutional involvement" claims without entity authority

---

## Resolution Flow

1. Identify truth atom and active primary authority
2. Check primary health, freshness, endpoint validity
3. If primary fails → evaluate same-truth secondary substitutions
4. If none → evaluate temporal fallback rules (bounded by `maxAgeMs`)
5. If temporal not allowed or expired → evaluate adjacent-truth continuity
6. If no valid continuity → mark atom **BLIND**
7. Apply substitution penalties and claim lockouts
8. Run compound blind-spot escalation across related atoms
9. Emit substitution fingerprint for downstream judgment

---

## Penalty Dimensions

Every substitution carries:

- **Authority penalty** — how much primary authority was lost
- **Freshness penalty** — how stale the substitute is
- **Scope penalty** — how much the observation scope narrowed
- **Confidence penalty** — direct confidence reduction
- **Claim-rights penalty** — what strength of claims are now forbidden

---

## Truth Atom Coverage

### Derivatives Pressure (fail-soft, severity: high)

- `oi.notional`, `oi.velocity`, `funding.rate`, `liq.long.usd`, `liq.short.usd`, `crowding.index`
- No same-truth secondary currently available
- Temporal fallback: 2-10 min depending on atom
- When blind: leverage, crowding, and squeeze claims locked

### Protocol Substance (fail-soft, severity: medium)

- `protocol.tvl`, `protocol.fees.usd`, `protocol.revenue.usd`, `protocol.unlock.next`
- Temporal fallback: 1-24h depending on atom (substance changes slowly)
- Adjacent-truth continuity via on-chain behavior for TVL (heavy penalty)

### On-Chain Behavior (fail-soft, severity: high)

- `wallet.exchange_inflow`, `wallet.exchange_outflow`, `wallet.whale_flow`
- Alchemy ↔ QuickNode same-authority substitution
- Explorer reconstruction as lower-authority fallback
- When blind: exchange-pressure and accumulation claims locked

### Structural Safety (fail-stop, severity: critical)

- `security.risk_score`, `security.mint_authority`, `security.ownership_conc`
- Explorer-based lower-authority fallback available
- When blind: ALL safety-positive claims locked — no "appears safe" without evidence

### Market Surface (fail-soft, severity: high)

- `price.spot`, `volume.usd`
- CoinGecko ↔ CoinMarketCap same-authority substitution
- Birdeye, DexScreener as lower-authority fallback

### DEX Emergence (fail-soft, severity: medium)

- `pair.newly_created`, `pair.liquidity.depth`
- DexScreener ↔ GeckoTerminal same-authority substitution

### Narrative Attention (fail-soft, severity: low)

- `narrative.intensity`, `social.acceleration`
- Multi-source composite: LunarCrush, CryptoPanic, Twitter API
- When blind: strong attention-driven thesis claims locked

### Entity Context (fail-stop, severity: medium)

- `entity.label_confidence`, `entity.institutional`
- Arkham ↔ Nansen same-authority substitution
- When blind: actor identity claims locked

---

## Claim Lockout Categories

14 formal lockout rules across 6 truth domains:

- Leverage/derivatives: 3 lockout rules
- Safety/legitimacy: 3 lockout rules
- Entity/identity: 3 lockout rules
- On-chain/behavior: 2 lockout rules
- Substance/fundamental: 2 lockout rules
- Narrative/attention: 1 lockout rule

---

## Compound Escalation Thresholds

| Blind Classes | Level |
|---------------|-------|
| 0-1 | degraded |
| 2-3 | partial_blind |
| 4+ | judgment_unsafe |

Escalation considers critical claim-family groups where multiple required truth classes are blind simultaneously.

---

## Diagnostics & Observability

The diagnostics panel exposes:
- Per-atom resolution status (primary/substituted/temporal/blind)
- Active claim lockouts
- Blind-spot escalation level
- Historical substitution frequency (most fragile atoms)
- Fail-stop atom blind warnings

---

## Module Structure

```
redundancy/
  types.ts              — Core type system
  truth-atom-rules.ts   — Canonical redundancy rules per atom
  penalty-model.ts      — Penalty computation
  claim-lockouts.ts     — Claim-family lockout doctrine
  blind-spot-escalation.ts — Compound blindness detection
  resolver.ts           — Runtime substitution resolver
  substitution-memory.ts — Event logging for governance
  fingerprint.ts        — Per-judgment substitution summary
  diagnostics.ts        — Internal observability console
  index.ts              — Barrel exports
```

---

## Pass Criteria

L1.3 is complete when:

- [x] Every critical truth atom has explicit redundancy rules
- [x] Acceptable substitutions are explicit with penalty profiles
- [x] Unacceptable substitutions are explicit with reasons
- [x] No-fallback situations are defined (fail-stop sanctuaries)
- [x] Temporal fallback respects time bounds and claim-strength limits
- [x] Claim lockouts block illegal claims under degraded visibility
- [x] Compound blind-spot escalation prevents compound blindness
- [x] Substitution memory logs events for governance
- [x] Fingerprint is available for downstream judgment layers
- [x] Diagnostics expose full substitution health
- [x] All rules are versioned
- [x] TypeScript compiles with zero errors
- [x] API endpoint exposes diagnostics
