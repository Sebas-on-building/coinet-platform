# L1.1 Cryptographic Integrity — Source Class Doctrine

## Sub-layer Version: 1.0.0

---

## Governing Principle

> Cryptographic integrity is a structural property of how ownership, verification,
> authorization, and security assumptions are implemented, exposed, and maintained
> over time.

Coinet claims **structural fragility**, not event certainty.

---

## Scope

### In Scope

- Signature systems and key exposure pathways
- Address/account exposure properties
- Validator and admin key security structures
- Trusted setup dependency
- Post-quantum readiness and migration posture
- Dormant vulnerable supply
- Cryptographic attack surfaces
- Evidence quality and uncertainty for all of the above

### Out of Scope

- Exact exploit execution or adversarial playbooks
- Exact CRQC arrival dates
- Sensational event prediction
- Broad software security unrelated to cryptographic structure

---

## Truth Model (5 Dimensions)

| Dimension | What it captures |
|-----------|-----------------|
| **Structural** | Primitives, verification schemes, trust assumptions, key models |
| **Exposure** | How secrets become visible, persistent, reusable, or inferable |
| **Temporal** | Current, historical, transitional, stale, planned, deployed |
| **Migration** | PQC readiness from unprepared through operationally adopted |
| **Confidence** | Source authority, freshness, agreement, completeness, conflict |

---

## Canonical Data Contract

Every field carries mandatory metadata:

| Metadata | Purpose |
|----------|---------|
| `value` | The actual field value |
| `confidence` | 0-1 confidence score |
| `freshness` | 0-1 freshness score |
| `degradation_state` | healthy / partial / stale / conflicting / degraded / unresolved |
| `evidence_mode` | direct / inferred / reconciled / modeled |
| `source_origin` | Contributing source IDs |
| `last_verified_timestamp` | Last verification time |

No field may exist as a naked uncited value internally.

---

## Allowed Claims (7 categories)

1. **Structural exposure** — factual statements about key visibility
2. **Structural fragility** — classification of cryptographic resilience
3. **Migration posture** — assessment of PQC readiness
4. **Attack surface class** — structural attack class identification
5. **Cryptographic dependency** — primitive and trust assumption identification
6. **Confidence-bounded vulnerability** — conditional vulnerability with explicit bounds
7. **Unresolved/degraded state** — honest declaration of incomplete knowledge

---

## Forbidden Claims (4 categories)

1. **Overclaim future events** — no "will be hacked" or "will fail by X"
2. **Invent hidden structure** — no inferring undisclosed design from insufficient evidence
3. **Collapse evidence weakness** — no converting incomplete data into false confidence
4. **Confuse truth classes** — no blurring observed facts with scenarios or aspirations

---

## Attack Surface Classification

Six surfaces, each independently assessed:

| Surface | What it measures |
|---------|-----------------|
| `at_rest_exposure` | Keys permanently visible on-chain |
| `on_spend_susceptibility` | Vulnerability during transaction broadcast |
| `on_setup_dependency` | Trusted setup ceremony risk |
| `validator_compromise_surface` | Validator key architecture fragility |
| `admin_compromise_surface` | Upgrade/admin control structure risk |
| `cross_domain_surface` | Cross-chain key reuse exposure |

---

## Fragility Classes

| Class | Meaning |
|-------|---------|
| `structurally_strong` | Low attack surface across all dimensions |
| `conditionally_resilient` | Generally sound with specific conditional risks |
| `partially_fragile` | Material exposure in one or more dimensions |
| `structurally_fragile` | Broad exposure across multiple surfaces |
| `critically_fragile` | Systemic exposure — highest structural risk |
| `unresolved` | Too many unknown dimensions to classify |

---

## PQC Migration Stages

| Stage | Meaning |
|-------|---------|
| `no_path` | No migration effort detected |
| `conceptual` | Academic/research-level discussion |
| `governance_discussion` | Community/governance proposals |
| `implementation_in_progress` | Code being written |
| `testnet` | PQC features on testnet |
| `mainnet_partial` | Partial mainnet deployment |
| `mainnet_live` | Full mainnet deployment |
| `operationally_adopted` | Actual ecosystem-wide adoption |
| `unresolved` | Cannot determine stage |

---

## Runtime Modules

| Module | Responsibility |
|--------|---------------|
| `protocol-parser.ts` | Parse chain/protocol structure (scheme, setup, key models) |
| `exposure-analyzer.ts` | Classify key exposure pathways and dormant vulnerability |
| `security-classifier.ts` | Map to attack surface classes and fragility |
| `pqc-tracker.ts` | Track PQC migration posture across stages |
| `dormant-supply.ts` | Estimate dormant vulnerable supply with bounds |
| `degradation.ts` | Detect and propagate epistemic weakness |
| `orchestrator.ts` | 10-step processing flow producing canonical state |
| `diagnostics.ts` | Full observability with alerts and evaluation notes |

---

## Processing Flow

1. Ingest cryptographic-relevant sources
2. Classify source by truth domain
3. Parse direct structural facts
4. Compute exposure properties
5. Reconcile conflicting evidence
6. Derive bounded structural inference
7. Attach confidence and degradation metadata
8. Emit canonical cryptographic state
9. Persist lineage and version state
10. Expose state to downstream layers

---

## Known Chain Coverage

Built-in canonical structures for:
Bitcoin, Ethereum, Solana, Polkadot, Cosmos, Avalanche, Zcash, Cardano, NEAR

Additional chains resolved via text-based inference with explicit uncertainty flags.

---

## Degradation Doctrine

When cryptographic truth weakens, the system must produce one or more of:
- Lower field confidence
- Lower downstream confidence
- Wider hypothesis/scenario spread
- Contradiction preservation
- Unresolved-state tagging
- Explicit blind-spot disclosure
- Score penalties for uncertainty
- AI language softening

**Invariant**: The system must never interpret missing cryptographic truth as neutral.

---

## Diagnostics & Alerts

The diagnostics panel generates alerts for:
- High unresolved field rate (>40%)
- Stale fields (>30%)
- Source disagreement
- Critical fragility classification
- No PQC migration path
- Dangerous admin key model
- Full claim lockout from degradation
- Significant dormant vulnerable supply
- Low field coverage (<50%)

---

## Pass Criteria

- [x] Every cryptographic concept has a precise meaning
- [x] All required fields exist in canonical `CitedField` form
- [x] All fields carry confidence, freshness, evidence mode, degradation state
- [x] 6 runtime modules with separate responsibilities
- [x] Uncertainty is explicit; unresolved states remain visible
- [x] Conflict preserved when material
- [x] Downstream scoring and AI outputs shapeable by this sub-layer
- [x] Cryptographic integrity is judgment-shaping truth, not decorative metadata
- [x] TypeScript compiles with zero errors
- [x] API endpoint exposes full diagnostics
