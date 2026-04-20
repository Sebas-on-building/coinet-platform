/**
 * L10.3 — Hypothesis Subject Contract
 *
 * §10.3.2 — The executable, versioned, replay-safe hypothesis subject.
 * The L10.2 object-level `L10HypothesisSubject` remains legal for
 * in-memory prototyping; the L10.3 contract is the shape every
 * hypothesis engine must honour when emitting, persisting, or
 * replaying a subject.
 *
 * §10.3.1.5 — No explanation object may become runtime truth unless it
 * is contract-complete, lineage-complete, replay-safe, competition-
 * preserving, and explicit about support, contradiction, confirmations,
 * invalidations, spread, and restriction posture.
 */

import type {
  L10HypothesisFamilyClass,
  L10HypothesisSubjectClass,
  L10ScopeType,
} from './hypothesis-subject-class';
import type {
  L10HypothesisMaterializationPolicy,
  L10HypothesisEvidencePackPolicy,
  L10HypothesisStalenessPolicy,
} from './hypothesis-materialization-policy';
import type { L10MaterialityClass } from './hypothesis-materiality';
import type { L10HypothesisWindowGranularity } from './hypothesis-window';

/**
 * §10.3.2.3 — Input family classification. Separates truth inputs from
 * context, history, and evidence-only references so the L10 runtime
 * can never quietly promote an evidence-only ref into a ranking input.
 */
export type L10SubjectInputFamily =
  | 'L3_IDENTITY'
  | 'L3_METRIC_CONTRACT'
  | 'L4_CONTEXT'
  | 'L6_FEATURE'
  | 'L6_EVENT'
  | 'L6_EVIDENCE_PACK'
  | 'L7_VALIDATION'
  | 'L7_CONTRADICTION'
  | 'L7_CONFIDENCE'
  | 'L7_RESTRICTION'
  | 'L8_REGIME'
  | 'L9_SEQUENCE'
  | 'L9_LEAD_LAG'
  | 'L9_PHASE'
  | 'L9_DECAY'
  | 'L9_SEQUENCE_RESTRICTION';

export const ALL_L10_SUBJECT_INPUT_FAMILIES:
  readonly L10SubjectInputFamily[] = [
    'L3_IDENTITY',
    'L3_METRIC_CONTRACT',
    'L4_CONTEXT',
    'L6_FEATURE',
    'L6_EVENT',
    'L6_EVIDENCE_PACK',
    'L7_VALIDATION',
    'L7_CONTRADICTION',
    'L7_CONFIDENCE',
    'L7_RESTRICTION',
    'L8_REGIME',
    'L9_SEQUENCE',
    'L9_LEAD_LAG',
    'L9_PHASE',
    'L9_DECAY',
    'L9_SEQUENCE_RESTRICTION',
  ];

/**
 * §10.3.2.3 — Typed input reference. Runtime engines materialise
 * inputs from these refs rather than bare string arrays so contract
 * validators can reason about the *kind* of surface being consumed.
 */
export interface L10SubjectInputRef {
  readonly ref: string;
  readonly family: L10SubjectInputFamily;
  readonly required: boolean;
  readonly staleness_critical: boolean;
  readonly evidence_only: boolean;
  readonly context_only: boolean;
}

/**
 * §10.3.2.5 — Rule identifiers. L10.3 does not implement the rules;
 * later sublayers do. The subject declares which rule ids it runs
 * against so replay and repair remain deterministic.
 */
export interface L10SubjectRuleRef {
  readonly rule_id: string;
  readonly rule_version: string;
}

/**
 * §10.3.2.4 — Hypothesis window. The overall temporal window the
 * subject explains. Distinct from the (optional) comparison window.
 */
export interface L10SubjectHypothesisWindow {
  readonly window_id: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly as_of: string;
  readonly granularity: L10HypothesisWindowGranularity;
  readonly freshness_budget_ms: number;
}

export interface L10SubjectComparisonWindow {
  readonly window_id: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly purpose:
    | 'BASELINE'
    | 'LAGGED'
    | 'LEADING'
    | 'POST_EVENT'
    | 'PRIOR_REGIME';
}

/**
 * §10.3.2.3 — Candidate-generation logic. The subject declares the
 * rule-ids and template posture that govern candidate assembly. L10.3
 * does not construct candidates; it defines the law candidate
 * construction must obey.
 */
export interface L10SubjectCandidateGenerationSpec {
  readonly rules: readonly L10SubjectRuleRef[];
  readonly required_family_templates: readonly string[];
  readonly forbidden_family_templates: readonly string[];
  readonly min_candidate_count: number;
  readonly forbid_single_story_collapse: true;
  readonly forbid_preselected_primary: true;
}

/**
 * §10.3.2.3 — Competition policy. Subjects may not hardcode one
 * explanation as primary before candidate construction (§10.3.2.5).
 */
export interface L10SubjectCompetitionPolicy {
  readonly min_competition_size: number;
  readonly requires_secondary: boolean;
  readonly single_story_collapse_forbidden: true;
  readonly close_spread_threshold: number;
  readonly require_shift_conditions_when_close: true;
}

/**
 * §10.3.2.3 / §10.3.2.8 — Restriction-consumption policy. Every subject
 * that consumes L7 / L9 restriction profiles must declare how.
 */
export interface L10RestrictionConsumptionPolicy {
  readonly required: boolean;
  readonly expected_rights: readonly (
    | 'HYPOTHESIS_INPUT'
    | 'RANKING_INPUT'
    | 'CONFIDENCE_INPUT'
    | 'EVIDENCE_ONLY'
  )[];
  readonly block_on_missing_profile: boolean;
  readonly narrow_on_restrictive_band: boolean;
}

/**
 * §10.3.2.3 / §10.3.2.8 — Regime / sequence consumption policies.
 */
export interface L10RegimeConsumptionPolicy {
  readonly required: boolean;
  readonly min_regime_refs: number;
  readonly block_on_unstable_regime: boolean;
}

export interface L10SequenceConsumptionPolicy {
  readonly required: boolean;
  readonly min_sequence_refs: number;
  readonly block_on_damaged_chain: boolean;
}

export interface L10ValidationConsumptionPolicy {
  readonly required: boolean;
  readonly min_validation_refs: number;
  readonly block_on_restricted_outputs: boolean;
}

/**
 * §10.3.2.3 — Cleanliness policy. Explicit at the contract tier so the
 * runtime cannot quietly weaken single-story prohibitions.
 */
export interface L10HypothesisCleanlinessPolicy {
  readonly forbid_clean_single_when_contradiction_material: true;
  readonly forbid_clean_when_confirmation_gap_material: true;
  readonly forbid_clean_when_invalidation_material: true;
  readonly forbid_clean_when_spread_narrow: true;
}

/**
 * §10.3.8 — Causal-restraint policy on the subject; mirrors the L10.2
 * object-tier flags but elevated to contract discipline so lower
 * sublayers can reason about causal posture without reaching into
 * individual candidate objects.
 */
export interface L10SubjectCausalRestraintPolicy {
  readonly forbid_causal_proof_semantics: true;
  readonly treat_adjacency_as_temporal_only: true;
  readonly require_causal_disclaimer_on_outputs: true;
  readonly forbid_final_judgment_semantics: true;
  readonly forbid_recommendation_semantics: true;
  readonly forbid_scenario_finality_semantics: true;
}

export interface L10SubjectLineagePolicy {
  readonly requires_trace_id: true;
  readonly requires_manifest_id: true;
  readonly requires_upstream_refs: boolean;
}

export interface L10SubjectLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

/**
 * §10.3.2.1 — The full executable hypothesis subject contract. Every
 * field is required (no optional `?:`). Where semantics allow an empty
 * list, we use `readonly T[]` with length 0.
 */
export interface L10HypothesisSubjectContract {
  // Identity (§10.3.2.2)
  readonly hypothesis_subject_id: string;
  readonly subject_class: L10HypothesisSubjectClass;
  readonly subject_version: string;

  // Contract versioning (§10.3.8.1)
  readonly subject_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Scope (§10.3.2.2)
  readonly scope_type: L10ScopeType;
  readonly scope_id: string;
  readonly scope_granularity: 'POINT' | 'RANGE' | 'AGGREGATE';
  readonly materiality: L10MaterialityClass;

  // Temporal logic (§10.3.2.3)
  readonly as_of: string;
  readonly hypothesis_window: L10SubjectHypothesisWindow;
  readonly comparison_window: L10SubjectComparisonWindow | null;
  readonly freshness_budget_ms: number;
  readonly staleness_policy: L10HypothesisStalenessPolicy;

  // Family vocabulary (§10.3.2.2)
  readonly hypothesis_family_set: readonly L10HypothesisFamilyClass[];

  // Inputs (§10.3.2.3)
  readonly required_validation_inputs: readonly L10SubjectInputRef[];
  readonly required_regime_inputs: readonly L10SubjectInputRef[];
  readonly required_sequence_inputs: readonly L10SubjectInputRef[];
  readonly required_feature_inputs: readonly L10SubjectInputRef[];
  readonly required_event_inputs: readonly L10SubjectInputRef[];
  readonly required_context_inputs: readonly L10SubjectInputRef[];
  readonly optional_context_inputs: readonly L10SubjectInputRef[];
  readonly historical_inputs: readonly L10SubjectInputRef[];
  readonly evidence_only_inputs: readonly L10SubjectInputRef[];

  // Candidate-generation (§10.3.2.3)
  readonly candidate_generation: L10SubjectCandidateGenerationSpec;

  // Competition + cleanliness (§10.3.2.3 / §10.3.5.5)
  readonly competition_policy: L10SubjectCompetitionPolicy;
  readonly cleanliness_policy: L10HypothesisCleanlinessPolicy;

  // Persistence + evidence (§10.3.2.3)
  readonly materialization_policy: L10HypothesisMaterializationPolicy;
  readonly evidence_pack_policy: L10HypothesisEvidencePackPolicy;

  // Production extensions (§10.3.2.3)
  readonly restriction_consumption_policy: L10RestrictionConsumptionPolicy;
  readonly regime_consumption_policy: L10RegimeConsumptionPolicy;
  readonly sequence_consumption_policy: L10SequenceConsumptionPolicy;
  readonly validation_consumption_policy: L10ValidationConsumptionPolicy;
  readonly causal_restraint_policy: L10SubjectCausalRestraintPolicy;

  // Input snapshot + lineage (§10.3.2.3)
  readonly input_snapshot_ref: string;
  readonly lineage_policy: L10SubjectLineagePolicy;
  readonly lineage_refs: L10SubjectLineageRefs;

  // Authoring
  readonly created_by: string;
  readonly created_at: string;
  readonly description: string;
}

/**
 * §10.3.2.10 — Minimum required-field surface used by the compatibility
 * validator to classify required-field removals as MIGRATION_REQUIRED.
 */
export const L10_SUBJECT_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'hypothesis_subject_id', 'subject_class', 'subject_version',
  'subject_contract_version', 'schema_version', 'policy_version',
  'scope_type', 'scope_id', 'scope_granularity', 'materiality',
  'as_of', 'hypothesis_window', 'freshness_budget_ms', 'staleness_policy',
  'hypothesis_family_set',
  'required_validation_inputs', 'required_regime_inputs',
  'required_sequence_inputs', 'required_feature_inputs',
  'required_event_inputs',
  'candidate_generation',
  'competition_policy', 'cleanliness_policy',
  'materialization_policy', 'evidence_pack_policy',
  'restriction_consumption_policy', 'regime_consumption_policy',
  'sequence_consumption_policy', 'validation_consumption_policy',
  'causal_restraint_policy',
  'input_snapshot_ref',
  'lineage_policy', 'lineage_refs',
];
