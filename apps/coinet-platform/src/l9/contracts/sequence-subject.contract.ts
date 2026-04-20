/**
 * L9.3 — Sequence Subject Contract
 *
 * §9.3.2 — The executable, versioned, replay-safe sequence subject.
 * The L9.2 object-level `L9SequenceSubject` remains legal for
 * in-memory prototyping; the L9.3 contract is the shape every temporal
 * engine must honour when emitting, persisting, or replaying a subject.
 *
 * §9.3.1.5 — No temporal object may become runtime truth unless it is
 * contract-complete, lineage-complete, replay-safe, and explicit about
 * ambiguity, decay, and restriction posture.
 */

import type {
  L9SequenceFamily,
  L9SequenceScopeType,
} from './sequence-family';
import type { L9SequenceState } from './sequence-state';
import type {
  L9SequenceStalenessPolicy,
  L9SequenceMaterializationPolicy,
  L9SequenceEvidencePackPolicy,
} from './sequence-materialization-policy';

/**
 * §9.3.2.2 — Scope granularity. The same family may be valid at
 * point-in-time, range, or aggregate level, and those are not
 * interchangeable.
 */
export type L9SubjectScopeGranularity =
  | 'POINT'
  | 'RANGE'
  | 'AGGREGATE';

export const ALL_L9_SUBJECT_SCOPE_GRANULARITIES:
  readonly L9SubjectScopeGranularity[] = [
    'POINT',
    'RANGE',
    'AGGREGATE',
  ];

/**
 * §9.3.2.3 — Input family classification. Separates truth inputs from
 * context, history, and evidence-only references so the L9 runtime can
 * never quietly promote an evidence-only ref into a truth ref.
 */
export type L9SubjectInputFamily =
  | 'L8_REGIME'
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

export const ALL_L9_SUBJECT_INPUT_FAMILIES:
  readonly L9SubjectInputFamily[] = [
    'L8_REGIME',
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
 * §9.3.2.3 — Typed input reference. Runtime engines materialise inputs
 * from these refs rather than bare string arrays so contract validators
 * can reason about the *kind* of surface being consumed.
 */
export interface L9SubjectInputRef {
  readonly ref: string;
  readonly family: L9SubjectInputFamily;
  readonly required: boolean;
  readonly staleness_critical: boolean;
  readonly evidence_only: boolean;
  readonly context_only: boolean;
}

/**
 * §9.3.2.5 — Rule identifiers. L9.3 does not implement the rules;
 * later sublayers do. The subject declares which rule ids it runs
 * against so replay and repair remain deterministic.
 */
export interface L9SubjectRuleRef {
  readonly rule_id: string;
  readonly rule_version: string;
}

/**
 * §9.3.2.4 — The sequence window: the overall temporal window the
 * subject sequences over. Distinct from the lead-lag window.
 */
export interface L9SubjectSequenceWindow {
  readonly window_id: string;
  readonly as_of: string;
  readonly lookback_seconds: number;
  readonly lookforward_seconds: number;
  readonly granularity: 'MINUTE' | 'HOUR' | 'SESSION' | 'DAY' | 'WEEK';
}

/**
 * §9.3.2.4 — The lead-lag window: the window within which signals are
 * compared to discover lead-lag relations.
 */
export interface L9SubjectLeadLagWindow {
  readonly window_id: string;
  readonly as_of: string;
  readonly lookback_seconds: number;
  readonly max_lag_ms: number;
}

/**
 * §9.3.2.4 — Optional post-event window spec. Only required for
 * families that need a post-event anchor (OVERHANG_AND_DIGESTION,
 * SHOCK_AND_RECOVERY) — see §9.2.5.2 `requiresPostEventAnchor`.
 */
export interface L9SubjectPostEventWindowSpec {
  readonly required: boolean;
  readonly max_anchor_age_seconds: number;
  readonly allowed_window_classes: readonly string[];
}

/**
 * §9.3.2.4 — Decay window spec. Declares how far back the decay engine
 * should consider signal survival vs decay.
 */
export interface L9SubjectDecayWindowSpec {
  readonly required: boolean;
  readonly lookback_seconds: number;
  readonly max_time_burden_ms: number;
}

/**
 * §9.3.2.6 — Confidence derivation spec. The subject *declares* how
 * sequence-confidence must be derived; the confidence engine must
 * honour this declaration.
 */
export interface L9SubjectConfidenceDerivationSpec {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly required_factors: readonly string[];
  readonly factor_weights: Readonly<Record<string, number>>;
  readonly caps: readonly string[];
  readonly consumes_l7_confidence: boolean;
  readonly consumes_l8_regime: boolean;
}

/**
 * §9.3.2.6 — Restriction derivation spec. Governs how the sequence
 * restriction profile is built and which narrowing reasons may be
 * emitted.
 */
export interface L9SubjectRestrictionDerivationSpec {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly default_reliance_band: string;
  readonly required_narrowing_reasons: readonly string[];
  readonly forbid_decisive_when_ambiguous: true;
}

/**
 * §9.3.2.8 — Restriction consumption policy. Every subject that
 * consumes L7 restriction profiles must declare how.
 */
export interface L9RestrictionConsumptionPolicy {
  readonly required: boolean;
  readonly expected_rights: readonly (
    | 'TEMPORAL_CONDITIONING'
    | 'SEQUENCE_INPUT'
    | 'CONFIDENCE_INPUT'
    | 'ORDERING_INPUT'
  )[];
  readonly block_on_missing_profile: boolean;
}

/**
 * §9.3.2.8 — Regime consumption policy. Subjects of families whose
 * meaning depends on regime conditioning (see §9.2.5.2) must declare
 * the L8 regime posture they consume.
 */
export interface L9RegimeConsumptionPolicy {
  readonly required: boolean;
  readonly min_regime_refs: number;
  readonly block_on_unstable_regime: boolean;
}

/**
 * §9.3.2.8 — Validation consumption policy.
 */
export interface L9ValidationConsumptionPolicy {
  readonly required: boolean;
  readonly min_validation_refs: number;
  readonly block_on_restricted_outputs: boolean;
}

/**
 * §9.3.2.8 — Ambiguity cleanliness policy. Determines whether a subject
 * may emit a clean single primary state when ambiguity is material.
 */
export interface L9AmbiguityCleanlinessPolicy {
  readonly forbid_clean_single_when_ambiguous: true;
  readonly ambiguity_material_threshold: number;
  readonly require_secondary_when_transitional: boolean;
}

/**
 * §9.3.2.8 — Causal-restraint policy. Governs what disclaimers the
 * subject requires on every emitted lead-lag and assessment object.
 */
export interface L9CausalRestraintPolicy {
  readonly treat_adjacency_as_temporal_only: true;
  readonly require_causal_disclaimer_on_lead_lag: true;
  readonly forbid_causal_certainty_semantics: true;
}

/**
 * §9.3.2.8 — Chain integrity requirements.
 */
export interface L9ChainIntegrityRequirements {
  readonly minimum_completeness_score: number;
  readonly forbid_clean_when_chain_damaged: true;
  readonly required_lead_lag_support: 'ANY' | 'AT_LEAST_ONE' | 'MULTIPLE';
}

/**
 * §9.3.2.8 — Lineage policy.
 */
export interface L9SubjectLineagePolicy {
  readonly requires_trace_id: true;
  readonly requires_manifest_id: true;
  readonly requires_upstream_refs: boolean;
}

/**
 * §9.3.2.8 — Lineage refs actually carried by the subject.
 */
export interface L9SubjectLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

/**
 * §9.3.2.1 — The full executable sequence subject contract. Every
 * field is required (no optional `?:`). Where semantics allow an
 * empty list, we use `readonly string[]` with length 0.
 */
export interface L9SequenceSubjectContract {
  // Identity (§9.3.2.2)
  readonly sequence_subject_id: string;
  readonly sequence_family: L9SequenceFamily;
  readonly sequence_template_id: string;
  readonly sequence_version: string;

  // Contract versioning (§9.3.7.1)
  readonly subject_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Scope (§9.3.2.2)
  readonly scope_type: L9SequenceScopeType;
  readonly scope_id: string;
  readonly scope_granularity: L9SubjectScopeGranularity;

  // Inputs (§9.3.2.3)
  readonly required_validation_inputs: readonly L9SubjectInputRef[];
  readonly required_event_inputs: readonly L9SubjectInputRef[];
  readonly required_feature_inputs: readonly L9SubjectInputRef[];
  readonly required_regime_inputs: readonly L9SubjectInputRef[];
  readonly required_context_inputs: readonly L9SubjectInputRef[];
  readonly optional_context_inputs: readonly L9SubjectInputRef[];
  readonly historical_inputs: readonly L9SubjectInputRef[];
  readonly evidence_only_inputs: readonly L9SubjectInputRef[];

  // Temporal logic (§9.3.2.4)
  readonly as_of: string;
  readonly sequence_window: L9SubjectSequenceWindow;
  readonly lead_lag_window: L9SubjectLeadLagWindow;
  readonly post_event_window_spec: L9SubjectPostEventWindowSpec;
  readonly decay_window_spec: L9SubjectDecayWindowSpec;
  readonly freshness_budget_seconds: number;
  readonly staleness_policy: L9SequenceStalenessPolicy;

  // Sequence logic (§9.3.2.5)
  readonly sequence_selection_rules: readonly L9SubjectRuleRef[];
  readonly lead_lag_rules: readonly L9SubjectRuleRef[];
  readonly phase_rules: readonly L9SubjectRuleRef[];
  readonly change_point_rules: readonly L9SubjectRuleRef[];
  readonly decay_rules: readonly L9SubjectRuleRef[];
  readonly ambiguity_rules: readonly L9SubjectRuleRef[];
  readonly degradation_rules: readonly L9SubjectRuleRef[];

  // Confidence + restriction derivation (§9.3.2.6)
  readonly confidence_derivation_spec: L9SubjectConfidenceDerivationSpec;
  readonly restriction_derivation_spec: L9SubjectRestrictionDerivationSpec;

  // Persistence + evidence (§9.3.2.7)
  readonly materialization_policy: L9SequenceMaterializationPolicy;
  readonly evidence_pack_policy: L9SequenceEvidencePackPolicy;

  // Production extensions (§9.3.2.8)
  readonly restriction_consumption_policy: L9RestrictionConsumptionPolicy;
  readonly regime_consumption_policy: L9RegimeConsumptionPolicy;
  readonly validation_consumption_policy: L9ValidationConsumptionPolicy;
  readonly ambiguity_cleanliness_policy: L9AmbiguityCleanlinessPolicy;
  readonly causal_restraint_policy: L9CausalRestraintPolicy;
  readonly chain_integrity_requirements: L9ChainIntegrityRequirements;
  readonly allowed_sequence_state_set: readonly L9SequenceState[];
  readonly allowed_secondary_sequence_state_set: readonly L9SequenceState[];

  // Lineage (§9.3.2.8)
  readonly lineage_policy: L9SubjectLineagePolicy;
  readonly lineage_refs: L9SubjectLineageRefs;

  // Authoring
  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

/**
 * §9.3.2.10 — Minimum required-field surface used by the compatibility
 * validator to classify required-field removals as MIGRATION_REQUIRED.
 */
export const L9_SUBJECT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'sequence_subject_id', 'sequence_family', 'sequence_template_id',
  'sequence_version',
  'subject_contract_version', 'schema_version', 'policy_version',
  'scope_type', 'scope_id', 'scope_granularity',
  'required_validation_inputs', 'required_event_inputs',
  'required_feature_inputs', 'required_regime_inputs',
  'as_of', 'sequence_window', 'lead_lag_window',
  'post_event_window_spec', 'decay_window_spec',
  'freshness_budget_seconds', 'staleness_policy',
  'sequence_selection_rules', 'lead_lag_rules', 'phase_rules',
  'change_point_rules', 'decay_rules', 'ambiguity_rules',
  'degradation_rules',
  'confidence_derivation_spec', 'restriction_derivation_spec',
  'materialization_policy', 'evidence_pack_policy',
  'restriction_consumption_policy', 'regime_consumption_policy',
  'validation_consumption_policy', 'ambiguity_cleanliness_policy',
  'causal_restraint_policy', 'chain_integrity_requirements',
  'allowed_sequence_state_set',
  'lineage_policy', 'lineage_refs',
];
