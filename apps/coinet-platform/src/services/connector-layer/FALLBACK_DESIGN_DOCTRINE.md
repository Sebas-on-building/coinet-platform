# 4.3 Fallback Design — Governed Truth Loss

**Coinet does not treat fallback as backup infrastructure.
Coinet treats fallback as governed truth loss.**

Fallback design is the formal system through which Coinet continues operating when full source truth is unavailable, while explicitly recalculating what can still be known, what has become uncertain, and what must no longer be claimed with the same strength.

A weak system treats fallback as hidden substitution, cached convenience, or silent degradation.

A strong system understands that a failed source is not merely a transport failure — it is a **change in the epistemic state of the machine**.

If a derivatives feed fails, Coinet does not merely lose a data stream.
It loses part of its ability to judge leverage stress, crowding, liquidation sensitivity, and the structural fragility of price action.

**Governing principle:** *Preserve continuity of operation without preserving the illusion of full knowing.*

---

## 4.3.1 Purpose

Fallback design solves six problems simultaneously:

1. **Continuity** — remain operational under source loss
2. **Truth preservation** — preserve as much justified knowledge as possible
3. **Truth loss accounting** — explicitly account for what kind of truth was lost (behavioral, structural, narrative, fundamental, safety, or contextual)
4. **Confidence realism** — reduce confidence in proportion to lost authority, freshness, precision
5. **Claim discipline** — narrow claims when evidence weakens; never produce the same judgment under thinner visibility
6. **User-visible honesty** — tell the user what layer is degraded, what that affects, and what remains uncertain

---

## 4.3.2 The Fallback Doctrine

> **Every fallback event is a governed loss of observational authority.**

The system must ask not only "what is the next available source?" but also:
- What truth class was lost?
- What resolution was lost?
- What freshness was lost?
- What timing precision was lost?
- What hypotheses are now weaker?
- What scores must be penalized?
- What scenarios become less defensible?
- What should the user now trust less?

---

## 4.3.3 The Six-Step Fallback Sequence (deterministic)

Exported as **`FALLBACK_SEQUENCE_STEPS`** in `fallback-design.ts`.

| Step | Name | Description |
|------|------|-------------|
| 1 | Declare degraded mode | Machine-readable, source-class-specific, connector-path-specific |
| 2 | Classify nature of loss | Semantic category + truth-loss accounting (`TruthLossAccounting`) |
| 3 | Attempt safe continuity | Walk continuity hierarchy by semantic integrity |
| 4 | Recompute trust & confidence | Truth-domain-aware, thesis-aware; never flat |
| 5 | Continue bounded scoring | Only where justified; penalize families; enforce hard blockers |
| 6 | Surface degraded visibility | Explicit in machine state and product output — never vague |

This sequence is **never improvised case-by-case**.

---

## 4.3.4 Step 1 — Declare Degraded Mode

Degraded mode is declared immediately via `fallback_epistemic.degraded_mode_active`.

Required properties:
- Machine-readable
- Source-class-specific and connector-path-specific
- Available to all downstream layers
- Persisted for observability and audit

Captures: failed provider, source class, routing mode, time, health state, whether fallback exists, whether safe continuity remains possible.

**Forbidden:** generic "system degraded" flags with no domain specificity; silent source loss.

---

## 4.3.5 Step 2 — Classify the Nature of the Loss

Implemented as `FallbackSemanticCategory` (types) + `buildTruthLossAccounting()` (fallback-design).

| Category | Meaning |
|----------|---------|
| `source_substitution` | Alternate provider, same truth class |
| `cached_trusted_state` | Last trusted snapshot within freshness policy |
| `temporal_downgrade` | Stream/realtime replaced by slower or older path |
| `authority_downgrade` | Weaker authority for the claim |
| `partial_layer` | Subset of signals (e.g. transfers without entity labels) |
| `no_fallback_failure` | No acceptable substitute — layer unavailable |

Each classified loss also generates a **`TruthLossAccounting`** record capturing: lost resolution, lost freshness, lost timing precision, lost relational context, weakened hypotheses, penalized scores, and narrowed scenarios.

---

## 4.3.6 Step 3 — Attempt Safe Continuity

Exported as **`CONTINUITY_HIERARCHY`** in `fallback-design.ts`.

Fallback is attempted in this order (ranked by semantic integrity, not convenience):

| Rank | Strategy | Description |
|------|----------|-------------|
| 1 | Equivalent source substitution | Another provider in same truth class with equivalent authority |
| 2 | Authority-downgrade substitution | Domain-valid but less authoritative substitute |
| 3 | Retained trusted state | Previously trusted state within freshness policy |
| 4 | Bounded partial operation | Operate without the missing domain, under penalties |
| 5 | Explicit non-availability | Layer unavailable — narrow or suppress claims |

The achieved rank is stored as `fallback_epistemic.continuity_hierarchy_rank`.

### Safe reuse of last trusted state (rank 3)

Retained state is allowed only when:
- Previous state was high-trust or medium-trust
- Freshness remains acceptable for the routing mode and truth domain
- No newer contradictory observation invalidates it
- Retained state is explicitly marked as retained, not live
- Downstream use case can still justify using it

**Required distinction** (never flatten into one):
- `live_primary_truth`
- `fallback_source_truth`
- `retained_trusted_state`
- `historical_backfill_state`

---

## 4.3.7 Step 4 — Recompute Trust and Confidence

Confidence must be recomputed as a function of:
- Lost source authority
- Lost freshness
- Lost completeness
- Lost timing precision
- Lost cross-layer confirmation
- Lost truth-domain coverage
- **Thesis dependence on the missing layer**

Penalties are:
- **Truth-domain-aware** (base penalty per truth class in `TRUTH_DOMAIN_FALLBACK_DOCTRINE`)
- **Category-aware** (multiplier per `FallbackSemanticCategory`)
- **Thesis-aware** (amplified via `THESIS_CRITICAL_CONFIDENCE_MULTIPLIER` when the lost layer is thesis-critical)
- **Minimum-enforced** (`MIN_MATERIAL_CONFIDENCE_PENALTY` — no zero penalty under material degradation)

**Example:** Losing derivatives in a leverage-led thesis → sharp penalty. Losing derivatives in a fundamentals-driven thesis → moderate penalty.

**Forbidden:** flat generic penalties; leaving confidence unchanged under meaningful truth loss.

---

## 4.3.8 Step 5 — Continue Bounded Scoring

### Hard blockers vs degradable losses

Evaluated by **`evaluateHardBlocker()`** in `fallback-design.ts`.

**Hard blockers** — losses that make outputs unjustifiable:
- No structural safety for a risky new launch
- No canonical identity confidence for the analyzed object
- Insufficient source-class diversity for minimum thesis coherence
- No timing-valid substitute for a timing-critical alert flow

**Degradable losses** — weaken but do not eliminate meaningful output:
- Partial narrative loss while structural layers remain
- Temporary market-source degradation while another remains healthy
- Lagging fundamentals in a non-fundamentals-critical short-term judgment

Scoring may continue only when: sufficient evidence supports bounded judgment, affected score families are penalized, scenario depth is reduced, and output reflects the missing layer.

`is_hard_blocker` is carried on every `FallbackEpistemicMetadata` object.

**Forbidden:** pretending missing layers are neutral; suppressing all outputs for non-critical losses; continuing full-strength scoring when hard blockers are present.

---

## 4.3.9 Step 6 — Surface Degraded Visibility

Every meaningful degraded-state output exposes:
- Which truth domain is degraded or missing
- What fallback type is in effect
- Whether retained state or alternate authority is being used
- Which parts of judgment are affected
- What confidence consequence resulted

**Example output language** (from `user_visible_template_degraded`):
- "Derivatives layer degraded — leverage, crowding, and liquidation interpretation carry elevated uncertainty."
- "On-chain visibility partial — whale, exchange-flow, and treasury behavior conclusions carry elevated uncertainty."
- "Structural safety visibility reduced — contract and ownership risk assessment is incomplete; opportunity confidence is capped."

**Forbidden:** generic "data may be incomplete" phrasing; missing-layer invisibility; silent fallback that preserves full rhetorical force.

---

## 4.3.10 Truth-Domain-Specific Fallback Doctrine

Exported as **`TRUTH_DOMAIN_FALLBACK_DOCTRINE`** — per truth class: doctrine, main risk, base penalty, penalized score families, downstream impact, weakened hypotheses, narrowed scenarios, user-visible templates.

| Domain | Key Characteristic | Main Risk |
|--------|-------------------|-----------|
| Market surface | Relatively substitutable | Surface continuity masking metadata degradation |
| DEX emergence | Timing-sensitive | False early/late interpretation |
| Derivatives pressure | Highly timing-sensitive | Misreading crowding/fragility |
| Protocol substance | Slow-decaying | Overstating improvement with lagged data |
| On-chain behavior | High authority | Speaking as if behavior observed when it is not |
| Structural safety | Hard constraint | Bullish conviction in dangerous setups |
| Narrative attention | Softer degradation | Underestimating memetic acceleration |
| Entity context | Actor significance | Misreading unlabeled behavior as smart money |
| Reasoning expression | Expression quality | Weaker communication, not weaker core truth |

---

## 4.3.11 Fallback Impact Matrix

Exported via **`getFallbackImpactMatrix()`** — maps truth-domain loss to downstream capability loss:

| Truth Domain Loss | Downstream Impact |
|-------------------|-------------------|
| Market | Weaker surface context, weaker comparability, weaker ranking |
| DEX | Weaker emergence detection, weaker timing precision |
| Derivatives | Weaker pressure interpretation, weaker structure-based timing, weaker crowding detection |
| Fundamentals | Weaker rerating/substance interpretation, weaker valuation context |
| On-chain | Weaker behavior and actor confirmation, weaker exchange-flow interpretation |
| Security | Hard cap on positive claims, structural caution required |
| Narrative | Weaker attention and hype interpretation |
| Entity | Weaker actor significance, weaker smart-money attribution |
| LLM path | Weaker explanation quality |

This matrix feeds: confidence penalties, score penalties, output wording, scenario narrowing, and hard-blocker logic.

---

## 4.3.12 Invariants (9)

Exported as **`FALLBACK_INVARIANTS`** in `fallback-design.ts`.

| # | Invariant |
|---|-----------|
| I1 | No source failure may remain invisible |
| I2 | Every fallback must be explicitly represented in machine-readable state |
| I3 | Fallback must never preserve the illusion of unchanged authority |
| I4 | Cached or retained state must never masquerade as live state |
| I5 | Confidence must always respond when fallback materially alters evidence quality |
| I6 | Fallback semantics must be truth-domain-specific |
| I7 | If bounded judgment is no longer possible, the system must say so |
| I8 | Fallback must narrow claims before it suppresses transparency |
| I9 | User-visible outputs must reflect missing truth domains, not just generic uncertainty |

---

## 4.3.13 Production Rules (8)

Exported as **`PRODUCTION_FALLBACK_RULES`** in `fallback-design.ts`.

| # | Rule |
|---|------|
| R1 | Every connector and routing path must define valid fallback options before production use |
| R2 | Every fallback event must be classified semantically, not just technically |
| R3 | Retained state may only be reused under freshness-aware and use-case-aware policy |
| R4 | Confidence penalties must be proportional to truth-domain importance and thesis dependence |
| R5 | Scoring may continue only where bounded judgment remains justified |
| R6 | Hard blockers must halt or sharply constrain outputs rather than being silently tolerated |
| R7 | Missing layers must propagate into both downstream reasoning and user-visible outputs |
| R8 | No fallback design is acceptable if it hides reduced visibility behind unchanged confidence or unchanged rhetorical certainty |

---

## 4.3.14 Why This Outperforms the Industry

Most products are strongest in ideal conditions and weakest when users most need them. Coinet's design is stronger because it does not ask only "can the system continue?" — it asks:

- What truth was lost?
- What remains defensible?
- What has become less certain?
- What should be penalized?
- What must now be said explicitly?

That makes Coinet more resilient, more honest, more trustworthy, and more useful than systems that fail hard, silently substitute, keep full confidence under partial blindness, or stop helping when reality becomes messy.

---

## 4.3.15 Final Definition

**Fallback design is the governed system by which Coinet preserves operational continuity under source loss while explicitly recalculating the system's epistemic condition. It treats fallback not as a hidden transport substitution, but as a formal loss of observational authority that must be classified, bounded, penalized, and surfaced. It allows Coinet to reuse trusted state only when justified, continue scoring only where meaningful judgment remains possible, reduce confidence in proportion to lost truth, and expose missing layers explicitly so that degraded operation remains honest rather than merely available.**

---

## 4.3.16 Reader Execution Doctrine (8 steps)

Exported as **`READER_EXECUTION_DOCTRINE`** in `fallback-design.ts`.

1. Define fallback as a change in knowing, not just a backup path
2. Classify fallback types semantically
3. Define freshness-aware and use-case-aware reuse rules for last trusted state
4. Build a truth-domain-specific impact matrix
5. Map fallback effects into confidence, scoring, hypotheses, timing, and scenarios
6. Define hard blockers versus degradable losses
7. Require explicit machine-state and user-visible expression of degraded truth
8. Reject any design that preserves full confidence or full rhetorical certainty under partial blindness

---

## Code Map

| Artifact | Role |
|----------|------|
| `types.ts` | `FallbackEpistemicMetadata`, `FallbackSemanticCategory`, `TruthStateKind`, `ContinuityHierarchyRank`, `TruthLossAccounting`, `SubstitutionSemantics`, `JudgmentMeaningfulness` |
| `fallback-design.ts` | Doctrine tables, 6-step sequence, continuity hierarchy, inference, penalty engine, hard-blocker evaluation, impact matrix, invariants & rules |
| `base-connector.ts` | Attaches `fallback_epistemic` to every envelope; failure results |
| `envelope-factory.ts` | Evidence-path epistemic metadata |
| `envelope-validator.ts` | Enforces invariants I1–I9: presence, truth-state alignment, hierarchy rank, hard-blocker consistency, user-visible domain specificity |
| `connector-registry.ts` | Fallback chain + `primary_provider_id_for_epistemic`; failure epistemic |
| `/api/connector-layer/diagnostics` | Exports doctrine + invariants + impact matrix |
