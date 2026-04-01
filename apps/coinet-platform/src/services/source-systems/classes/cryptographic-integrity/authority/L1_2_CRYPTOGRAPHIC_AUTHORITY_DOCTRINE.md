# L1.2 Cryptographic Integrity Authority System

## Doctrine Version: 1.0.0

---

## Governing Principle

> "This cryptographic conclusion is based on the highest-available authority for this
> domain, adjusted for agreement, freshness, and coverage, with explicit treatment of
> conflict and uncertainty."

---

## 7 Core Doctrine Rules

| # | Rule | Enforcement |
|---|------|-------------|
| 3.1 | Authority is domain-specific | Field→domain map in `registry.ts` |
| 3.2 | Authority follows reality hierarchy | `REALITY_HIERARCHY_WEIGHT` in `doctrine.ts` |
| 3.3 | Behavior beats intention | `DOCTRINE_OVERRIDE_RULES` enforced in resolver |
| 3.4 | Deployment beats proposal | Override rules: `deployed_code_overrides_proposals`, etc. |
| 3.5 | Conflict preserved when material | `CONFLICT_CONFIDENCE_PENALTY` + structured conflict records |
| 3.6 | Authority does not remove uncertainty | `STRONG_INFERENCE_MIN_CONFIDENCE` threshold |
| 3.7 | Fallback must be explicit | `FALLBACK_PENALTY_SCHEDULE` + logged reason + degradation flag |

---

## 6 Truth Domains

| Domain | What It Covers | Primary Authority |
|--------|---------------|-------------------|
| `protocol_structure` | Signature scheme, trusted setup, key models | Code repository, audited specs |
| `onchain_exposure` | Key exposure, address reuse, dormant supply behavior | On-chain observation |
| `pqc_readiness` | PQC support, migration stage, deployment | Mainnet activation |
| `vulnerability_modeling` | Attack surfaces, fragility classification | Peer-reviewed research |
| `dormant_supply` | Dormant vulnerable supply estimation | On-chain clustering |
| `governance_upgrade` | Validator/admin models, upgrade paths | Executed governance actions |

---

## 4 Authority Levels

| Level | Weight | Role |
|-------|--------|------|
| `primary` | 1.00 | Highest-confidence source for this domain |
| `secondary` | 0.80 | Fallback with explicit confidence penalty |
| `supporting` | 0.60 | Corroborative evidence only |
| `speculative` | 0.35 | Inference, heuristics — never sufficient alone |

---

## 7 Trust Classes

| Class | Weight | Description |
|-------|--------|-------------|
| `verified` | 1.00 | Directly observed or confirmed |
| `audited` | 0.92 | Professionally audited |
| `official` | 0.82 | Official project documentation |
| `third_party` | 0.72 | Third-party analysis |
| `heuristic` | 0.55 | Rule-based inference |
| `modeled` | 0.45 | Statistical model output |
| `unknown` | 0.30 | Source quality undetermined |

---

## Reality Hierarchy

```
deployed_reality (1.0)
  > governance_action (0.92)
  > onchain_observation (0.95)
  > code_repository (0.9)
  > indexing_system (0.88)
  > specification (0.82)
  > security_report (0.75)
  > proposal (0.65)
  > statement (0.55)
  > research (0.5)
  > inference (0.35)
```

---

## Doctrine Override Rules (3.3, 3.4)

6 explicit override rules enforced at resolution time:

1. On-chain behavior overrides protocol documentation claims
2. Deployed or merged code overrides governance proposals
3. Actual activation overrides roadmap statements
4. Shipped code > approved but undeployed proposal
5. Operationally active feature > merged but inactive code
6. Mainnet operational use > testnet demonstration

When an override applies, the `override_applied` field names the rule.

---

## Resolution Logic (Section 7.5)

```
If single valid primary → use it
If multiple primaries agree → consensus, use consensus value
If multiple primaries disagree → preserve both, reduce confidence, mark conflict
If no primary → fallback to secondary, reduce confidence, attach degradation
If no reliable sources → mark unresolved, prohibit strong inference
```

---

## Confidence Composition (Section 7.6)

5-component weighted formula:

| Component | Weight |
|-----------|--------|
| Authority level | 0.30 |
| Source agreement | 0.20 |
| Freshness | 0.20 |
| Coverage | 0.15 |
| Trust class | 0.15 |

Then subtract:
- Fallback penalty (0.12 secondary, 0.25 supporting, 0.40 speculative)
- Conflict penalty (0.08 interpretive, 0.12 temporal, 0.20 structural)

If `final_confidence < 0.45`, strong inference is prohibited.

---

## Resolution Output Fields

Every field resolution returns:

| Field | Purpose |
|-------|---------|
| `selected_source` | Who was selected |
| `selected_authority_level` | At what authority level |
| `selected_trust_class` | With what trust class |
| `used_fallback` | Whether primary was unavailable |
| `fallback_reason` | Why fallback occurred |
| `degradation_flag` | Whether epistemic quality is reduced |
| `conflict_type` | structural / temporal / interpretive / none |
| `consensus_state` | single_source / consensus / disagreement / no_sources |
| `prohibit_strong_inference` | Whether confidence is too low for strong claims |
| `override_applied` | Which doctrine override rule fired |
| `conflicts[]` | Preserved disagreeing sources with rationale |
| `confidence` | 5-component decomposition |
| `attribution` | Full traceability (source, level, class, mode, confidence) |
| `rationale[]` | Human-readable decision trail |

---

## Diagnostics (Section 8)

### 8.1 Metrics (7)
- Authority distribution by domain
- Fallback rate
- Conflict rate
- Agreement ratio
- Stale primary rate
- Unresolved field rate
- Authority drift over time

### 8.2 Logs (5 event types)
- `source_selected`
- `conflict_detected`
- `fallback_used`
- `authority_override`
- `degradation_triggered`

### 8.3 Alerts (8 categories)
- `missing_primary_sources`
- `repeated_fallback_dependency`
- `high_conflict_in_critical_fields`
- `sudden_authority_changes`
- `stale_critical_sources`
- `critical_domain_conflicts`
- `strong_inference_blocked`
- `doctrine_overrides_applied`

---

## Evaluation (Section 9)

| Check | What It Measures |
|-------|-----------------|
| Correctness | Primary coverage per domain, wrong-domain fields |
| Stability | Drift rate, flapping field detection |
| Impact | Average confidence, strong-inference blocks, conflict preservation |
| Failure Detection | Weak overriding strong, stale-as-current, collapsed conflicts, undegraded fallback |

---

## Governance (Section 10)

### 7 Governance Rules (all enforced)
- Authority mappings versioned
- Domain definitions locked
- New source types require classification
- Authority changes auditable
- No free-text production fields
- Enums centrally controlled
- Thresholds configurable and auditable

### 7 Change Control Triggers
Each requires version bump and designated reviewers:
- New provider
- Protocol architecture change
- New research standard
- Authority logic failure
- Domain definition change
- Enum expansion
- Freshness threshold change

---

## Pass Criteria (Section 11)

### Traceability
- [x] Every field answers: who produced it, why trusted, what domain

### Conflict Integrity
- [x] Conflicts never hidden
- [x] Disagreement is structured (type + preserved records)
- [x] Confidence reflects disagreement (penalty schedule)

### Fallback Integrity
- [x] Fallback is explicit (logged reason)
- [x] Confidence degrades (FALLBACK_PENALTY_SCHEDULE)
- [x] Blind spots visible (unresolved field rate metric)

### Stability
- [x] Authority drift detection across resolutions
- [x] Flapping field detection in evaluation

### Epistemic Integrity
- [x] System never pretends certainty (prohibit_strong_inference)
- [x] Authority + confidence + freshness always aligned (5-component composition)

---

## Module Structure

```
authority/
  types.ts        — Core types (ConsensusState, FieldAuthorityResolution, etc.)
  doctrine.ts     — 7 doctrine rules, override rules, penalty schedules, thresholds
  registry.ts     — 18 field→domain mappings, 16 authority sources
  resolver.ts     — 7-step runtime resolver with override enforcement
  diagnostics.ts  — 7 metrics, 5 log types, 8 alert categories
  evaluation.ts   — 4 evaluation checks (correctness, stability, impact, failure)
  governance.ts   — 7 rules, 7 change triggers, change log, reviewer requirements
  index.ts        — Barrel exports
```
