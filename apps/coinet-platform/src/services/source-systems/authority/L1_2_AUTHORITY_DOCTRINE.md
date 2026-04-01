# L1.2 Source Authority Hierarchy

## The Governed Authority Constitution for Market Truth

**Version:** 1.0.0

---

## Doctrine Principle

Authority is not global by provider.
It is **domain-scoped, claim-scoped, endpoint-scoped, and condition-scoped**.

CoinGlass is not "authoritative" in general.
CoinGlass is authoritative for specific derivatives-pressure truth atoms under specific freshness and health conditions.

---

## Five Doctrine Innovations

### Strategy 1 — Authority by Truth Atom, not by Brand

Authority attaches to the smallest useful truth unit (`protocol.tvl`, `oi.velocity`, `wallet.whale_flow`), not to vague provider labels.

**46 truth atoms** defined across 8 observational classes (Reasoning Expression has zero — it is expression, not observation).

### Strategy 2 — Challenger Rights, not just Backup Sources

A challenger can **weaken or dispute** a primary claim even when the primary is healthy.

- **Metric challengers** dispute the raw data value
- **Interpretation challengers** dispute what the data means for a thesis

**13 challenger rules** defined, covering derivatives-vs-behavior, substance-vs-behavior, safety-vs-behavior, narrative-vs-substance, and more.

### Strategy 3 — Authority is Conditional, not Static

Authority changes with:
- Source freshness and staleness
- Provider health and circuit state
- Chain support (Alchemy for EVM, QuickNode for Solana)
- Token age bands
- Endpoint families

All evaluated at runtime by the policy engine.

### Strategy 4 — Strong Claims Require Authority Quorum

| Level | Requirement |
|-------|-------------|
| **WEAK** | Single healthy primary |
| **MEDIUM** | Primary + 1 supporting domain |
| **STRONG** | 3+ domains, no severe challenger dispute |
| **DECISIVE** | 4-5 domain quorum, clean authority, rare by design |

**16 claim authority requirements** defined with explicit truth class quorums.

### Strategy 5 — Authority Fingerprint

Every judgment can carry:

```
derivatives pressure: healthy (coinglass)
protocol substance: healthy (defillama)
on-chain behavior: partial (alchemy) [substituted]
structural safety: degraded (goplus)
entity context: contested [challenged]
narrative attention: healthy (lunarcrush)
```

---

## Resolution Engine

For each truth atom, the resolver executes:

1. Load candidate authority rules
2. Filter by condition (freshness, health, chain, endpoint)
3. Select active primary
4. Check secondary substitution
5. Load challenger rights
6. Evaluate active challenger signals
7. Produce outcome:
   - `PRIMARY_CONFIRMED`
   - `PRIMARY_WITH_SECONDARY_SUPPORT`
   - `PRIMARY_CONTESTED`
   - `SECONDARY_SUBSTITUTED`
   - `AUTHORITY_PARTIAL`
   - `AUTHORITY_BLIND`
   - `UNRESOLVED_CONFLICT`

---

## Contested States

When conflict should not be flattened, the system produces a **ContestedState**:

- Severity: `mild` | `moderate` | `severe`
- Whether tension should be preserved
- Resolution advice
- Downstream impact on confidence and explanation

---

## Module Map

```
source-systems/authority/
  types.ts                  — Core type system
  truth-atoms.ts            — 46 canonical truth atoms
  capability-registry.ts    — Provider endpoint → atom mapping
  authority-registry.ts     — 80+ primary/secondary/challenger rules
  authority-policies.ts     — Conditional authority evaluation
  challenger-matrix.ts      — 13 challenger rules
  claim-authority-ladder.ts — 16 claim strength requirements
  resolver.ts               — Runtime resolution engine
  contested-state.ts        — Unresolved conflict handler
  authority-fingerprint.ts  — Per-judgment authority summary
  diagnostics.ts            — Internal authority console
  index.ts                  — Barrel exports
```

---

## API

`GET /api/source-systems/authority` — Returns full authority diagnostics.

Optional query params: `chain`, `asset_class`, `token_age`, `challengers` (comma-separated trigger signals).

---

## Pass Criteria

- All truth atoms have at least one primary authority rule
- No provider has vague global authority — only atom-scoped
- Challenger rules are explicit with typed challenge type (metric vs interpretation)
- Strong claims cannot be made from weak authority alone
- Contested states preserve disagreement rather than flattening
- Authority fingerprint is attachable to every judgment
- Conditional policies degrade authority based on real health/freshness/chain
- Reasoning models have zero truth atoms — expression only
