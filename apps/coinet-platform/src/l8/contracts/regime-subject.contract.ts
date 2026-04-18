/**
 * L8.3 — Regime Subject Contract
 *
 * §8.3.2 — The executable, versioned, replay-safe regime subject. The
 * L8.2 object-level `L8RegimeSubject` remains legal for in-memory
 * prototyping; the L8.3 contract is the shape every engine must honour
 * when emitting, persisting, or replaying a regime subject.
 */

import type {
  L8RegimeFamily,
  L8RegimeScopeType,
} from './regime-family';
import type { L8RegimeClass } from './regime-class';

/**
 * §8.3.2.3 — Scope granularity. The same family may be valid at market,
 * chain, sector, or asset level, and those are not interchangeable.
 */
export type L8ScopeGranularity =
  | 'MARKET_WIDE'
  | 'CHAIN_WIDE'
  | 'SECTOR_WIDE'
  | 'ECOSYSTEM_WIDE'
  | 'ASSET_LOCAL'
  | 'TOKEN_LOCAL'
  | 'PROTOCOL_LOCAL'
  | 'NARRATIVE_CLUSTER_LOCAL';

export const ALL_L8_SCOPE_GRANULARITIES: readonly L8ScopeGranularity[] = [
  'MARKET_WIDE',
  'CHAIN_WIDE',
  'SECTOR_WIDE',
  'ECOSYSTEM_WIDE',
  'ASSET_LOCAL',
  'TOKEN_LOCAL',
  'PROTOCOL_LOCAL',
  'NARRATIVE_CLUSTER_LOCAL',
];

/**
 * §8.3.2.4 — Input family classification. Input refs separate truth
 * inputs from context, history, and evidence-only references.
 */
export type L8InputFamily =
  | 'L7_VALIDATION'
  | 'L7_CONTRADICTION'
  | 'L7_CONFIDENCE'
  | 'L7_RESTRICTION'
  | 'L6_FEATURE'
  | 'L6_EVENT'
  | 'L6_EVIDENCE_PACK'
  | 'L4_CONTEXT'
  | 'L3_METRIC_CONTRACT'
  | 'L3_IDENTITY';

export const ALL_L8_INPUT_FAMILIES: readonly L8InputFamily[] = [
  'L7_VALIDATION',
  'L7_CONTRADICTION',
  'L7_CONFIDENCE',
  'L7_RESTRICTION',
  'L6_FEATURE',
  'L6_EVENT',
  'L6_EVIDENCE_PACK',
  'L4_CONTEXT',
  'L3_METRIC_CONTRACT',
  'L3_IDENTITY',
];

/**
 * §8.3.2.4 — Input reference spec. Runtime engines materialise inputs
 * from these typed refs rather than bare string arrays.
 */
export interface L8RegimeInputRef {
  readonly ref: string;
  readonly family: L8InputFamily;
  readonly required: boolean;
  readonly staleness_critical: boolean;
  readonly evidence_only: boolean;
  /** §8.3.2.4 — context-only means it may condition but never be truth. */
  readonly context_only: boolean;
}

/**
 * §8.3.2.6 — Classification rule identifiers. L8.3 does not implement
 * the rules — later sublayers do — but the subject declares which rule
 * ids it runs against so replay and repair remain deterministic.
 */
export interface L8RegimeRuleRef {
  readonly rule_id: string;
  readonly rule_version: string;
}

/**
 * §8.3.2.5 — Staleness policy for regime inputs. Layer 8 must be
 * temporally explicit.
 */
export type L8StalenessPolicyClass =
  | 'STRICT'
  | 'TOLERANT'
  | 'PERMISSIVE'
  | 'DEGRADED_OK';

export const ALL_L8_STALENESS_POLICIES: readonly L8StalenessPolicyClass[] = [
  'STRICT',
  'TOLERANT',
  'PERMISSIVE',
  'DEGRADED_OK',
];

/**
 * §8.3.2.8 — Materialization policy for regime outputs. Mirrors the
 * L7.3 vocabulary but restricted to the L8 persistence contract.
 */
export type L8MaterializationPolicyClass =
  | 'EAGER'
  | 'ON_DEMAND'
  | 'REPLAY_ONLY'
  | 'REPAIR_ONLY';

export const ALL_L8_MATERIALIZATION_POLICIES:
  readonly L8MaterializationPolicyClass[] = [
    'EAGER',
    'ON_DEMAND',
    'REPLAY_ONLY',
    'REPAIR_ONLY',
  ];

/**
 * §8.3.2.8 — Evidence pack policy. Regime subjects must declare how
 * evidence is captured: always, on demand, or only when material
 * conflict arises.
 */
export type L8EvidencePackPolicyClass =
  | 'REQUIRED'
  | 'OPTIONAL'
  | 'ON_MATERIAL_CONFLICT';

export const ALL_L8_EVIDENCE_PACK_POLICIES:
  readonly L8EvidencePackPolicyClass[] = [
    'REQUIRED',
    'OPTIONAL',
    'ON_MATERIAL_CONFLICT',
  ];

/**
 * §8.3.2.5 — Regime window bounds and budgets.
 */
export interface L8RegimeWindow {
  readonly window_id: string;
  readonly as_of: string;
  readonly lookback_seconds: number;
  readonly lookforward_seconds: number;
  /** Transition detection window — separate from the regime window. */
  readonly transition_lookback_seconds: number;
}

/**
 * §8.3.2.7 `confidence_derivation_spec`. The subject *declares* how
 * regime-call confidence must be derived (required factors, weights,
 * caps). The confidence engine must honour this declaration.
 */
export interface L8RegimeConfidenceDerivationSpec {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly required_factors: readonly string[];
  readonly factor_weights: Readonly<Record<string, number>>;
  readonly caps: readonly string[];
  /** Consumes L7 confidence posture as an input. */
  readonly consumes_l7_confidence: boolean;
}

/**
 * §8.3.2.7 `multiplier_derivation_spec`. The subject declares the
 * required multiplier dimensions and the derivation policy used to
 * populate them.
 */
export interface L8RegimeMultiplierDerivationSpec {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly required_dimensions: readonly string[];
  /** §8.3.6.4 — must never allow action-leaning rewriting. */
  readonly forbid_final_score_shape: true;
}

/**
 * §8.3.2.9 — Restriction consumption policy. Every subject that
 * consumes L7 restriction profiles must declare how.
 */
export interface L8RestrictionConsumptionPolicy {
  readonly required: boolean;
  readonly expected_rights: readonly (
    | 'REGIME_CONDITIONING'
    | 'MULTIPLIER_INPUT'
    | 'CONFIDENCE_INPUT'
  )[];
  readonly block_on_missing_profile: boolean;
}

/**
 * §8.3.2.9 — Validation consumption policy.
 */
export interface L8ValidationConsumptionPolicy {
  readonly required: boolean;
  readonly min_validation_refs: number;
  readonly block_on_restricted_outputs: boolean;
}

/**
 * §8.3.2.5 — The full executable regime subject contract.
 *
 * Every field is required (no optional `?:`). Where semantics allow an
 * empty list, we use `readonly string[]` with length 0.
 */
export interface L8RegimeSubjectContract {
  // Identity (§8.3.2.2)
  readonly regime_subject_id: string;
  readonly regime_family: L8RegimeFamily;
  readonly regime_template_id: string;
  readonly regime_version: string;

  // Contract versioning (§8.3.7.1)
  readonly subject_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Scope (§8.3.2.3)
  readonly scope_type: L8RegimeScopeType;
  readonly scope_id: string;
  readonly scope_granularity: L8ScopeGranularity;

  // Inputs (§8.3.2.4)
  readonly required_validation_inputs: readonly L8RegimeInputRef[];
  readonly required_feature_inputs: readonly L8RegimeInputRef[];
  readonly required_context_inputs: readonly L8RegimeInputRef[];
  readonly optional_context_inputs: readonly L8RegimeInputRef[];
  readonly historical_inputs: readonly L8RegimeInputRef[];
  readonly evidence_only_inputs: readonly L8RegimeInputRef[];

  // Temporal (§8.3.2.5)
  readonly as_of: string;
  readonly regime_window: L8RegimeWindow;
  readonly transition_window: L8RegimeWindow;
  readonly freshness_budget_seconds: number;
  readonly staleness_policy: L8StalenessPolicyClass;

  // Classification logic (§8.3.2.6)
  readonly regime_selection_rules: readonly L8RegimeRuleRef[];
  readonly secondary_regime_rules: readonly L8RegimeRuleRef[];
  readonly transition_rules: readonly L8RegimeRuleRef[];
  readonly ambiguity_rules: readonly L8RegimeRuleRef[];
  readonly degradation_rules: readonly L8RegimeRuleRef[];

  // Confidence + multiplier derivation (§8.3.2.7)
  readonly confidence_derivation_spec: L8RegimeConfidenceDerivationSpec;
  readonly multiplier_derivation_spec: L8RegimeMultiplierDerivationSpec;

  // Persistence + evidence (§8.3.2.8)
  readonly materialization_policy: L8MaterializationPolicyClass;
  readonly evidence_pack_policy: L8EvidencePackPolicyClass;

  // Production extensions (§8.3.2.9)
  readonly restriction_consumption_policy: L8RestrictionConsumptionPolicy;
  readonly validation_consumption_policy: L8ValidationConsumptionPolicy;
  readonly allowed_regime_class_set: readonly L8RegimeClass[];
  readonly allowed_secondary_regime_set: readonly L8RegimeClass[];
  readonly required_multiplier_dimensions: readonly string[];
  readonly lineage_policy: {
    readonly requires_trace_id: true;
    readonly requires_manifest_id: true;
    readonly requires_upstream_refs: boolean;
  };

  // Lineage
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };

  // Authoring
  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

export const L8_SUBJECT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'regime_subject_id', 'regime_family', 'regime_template_id', 'regime_version',
  'subject_contract_version', 'schema_version', 'policy_version',
  'scope_type', 'scope_id', 'scope_granularity',
  'required_validation_inputs', 'required_feature_inputs',
  'as_of', 'regime_window', 'transition_window',
  'freshness_budget_seconds', 'staleness_policy',
  'regime_selection_rules', 'secondary_regime_rules',
  'transition_rules', 'ambiguity_rules', 'degradation_rules',
  'confidence_derivation_spec', 'multiplier_derivation_spec',
  'materialization_policy', 'evidence_pack_policy',
  'restriction_consumption_policy', 'validation_consumption_policy',
  'allowed_regime_class_set', 'required_multiplier_dimensions',
  'lineage_policy', 'lineage_refs',
];
