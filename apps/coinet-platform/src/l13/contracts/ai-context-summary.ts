/**
 * L13.2 — AI Context Summary Contracts
 *
 * §13.2.5 — Eight summary contracts that compress governed L3–L12
 * surfaces into AI-safe digests for the input package. None of these
 * summaries carry raw lower-layer state; they reference governed
 * outputs via opaque refs and preserve evidence and lineage.
 */

import { L13DependencyLayer } from './l13-constitutional-types';

/**
 * §13.2.5.3 — Contradiction effect classes.
 */
export enum L13ContradictionEffectClass {
  NONE = 'NONE',
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
  NARROWS_CONFIDENCE = 'NARROWS_CONFIDENCE',
  BLOCKS_CLEAN_EXPLANATION = 'BLOCKS_CLEAN_EXPLANATION',
  BLOCKS_OUTPUT = 'BLOCKS_OUTPUT',
}

export const ALL_L13_CONTRADICTION_EFFECT_CLASSES:
  readonly L13ContradictionEffectClass[] =
  Object.values(L13ContradictionEffectClass);

/**
 * §13.2.5.7 — Score-context completeness classification.
 */
export enum L13ScoreContextCompletenessClass {
  COMPLETE_SCORE_CONTEXT = 'COMPLETE_SCORE_CONTEXT',
  COMPLETE_WITH_DISCLOSURE = 'COMPLETE_WITH_DISCLOSURE',
  MISSING_ATTRIBUTION = 'MISSING_ATTRIBUTION',
  MISSING_MISSING_DATA_PROFILE = 'MISSING_MISSING_DATA_PROFILE',
  MISSING_DRIFT_STATUS = 'MISSING_DRIFT_STATUS',
  MISSING_RESTRICTIONS = 'MISSING_RESTRICTIONS',
  BLOCKED_SCORE_CONTEXT = 'BLOCKED_SCORE_CONTEXT',
}

export const ALL_L13_SCORE_CONTEXT_COMPLETENESS_CLASSES:
  readonly L13ScoreContextCompletenessClass[] =
  Object.values(L13ScoreContextCompletenessClass);

/**
 * §13.2.5.1 — Canonical entity summary.
 */
export interface L13CanonicalEntitySummary {
  readonly entity_summary_id: string;

  readonly entity_id: string;
  readonly canonical_symbol: string;
  readonly canonical_name: string;

  readonly asset_type: string;
  readonly chain_refs: readonly string[];
  readonly ecosystem_refs: readonly string[];
  readonly sector_refs: readonly string[];

  readonly relevant_aliases: readonly string[];

  readonly scope_type: string;
  readonly scope_id: string;
  readonly scope_granularity: string;

  readonly identity_confidence_score: number;
  readonly identity_confidence_band: string;

  readonly entity_restrictions: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.5.2 — Validation summary.
 */
export interface L13ValidationSummary {
  readonly validation_summary_id: string;

  readonly validation_state: string;
  readonly validation_confidence: number;
  readonly validation_confidence_band: string;

  readonly strongest_validated_claim_refs: readonly string[];
  readonly validation_restriction_refs: readonly string[];

  readonly unresolved_validation_gaps: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.5.3 — Contradiction summary.
 */
export interface L13ContradictionSummary {
  readonly contradiction_summary_id: string;

  readonly active_contradiction_refs: readonly string[];
  readonly strongest_contradiction_refs: readonly string[];

  readonly contradiction_pressure_score: number;
  readonly contradiction_pressure_band: string;

  readonly contradiction_effect_class: L13ContradictionEffectClass;

  readonly must_disclose: boolean;

  readonly contradiction_disclosure_codes: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.5.4 — Regime summary.
 */
export interface L13RegimeSummary {
  readonly regime_summary_id: string;

  readonly primary_regime: string;
  readonly secondary_regime?: string;

  readonly regime_confidence_score: number;
  readonly regime_confidence_band: string;

  readonly transition_risk_score: number;
  readonly transition_risk_band: string;

  readonly regime_restriction_refs: readonly string[];

  readonly regime_explanation_codes: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.5.5 — Sequence summary.
 */
export interface L13SequenceSummary {
  readonly sequence_summary_id: string;

  readonly primary_sequence_state: string;
  readonly secondary_sequence_state?: string;

  readonly phase_state: string;
  readonly phase_progression_class: string;

  readonly lead_lag_summary: string;
  readonly decay_posture: string;

  readonly sequence_confidence_score: number;
  readonly sequence_confidence_band: string;

  readonly sequence_restriction_refs: readonly string[];

  readonly sequence_explanation_codes: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.5.6 — Hypothesis summary.
 */
export interface L13HypothesisSummary {
  readonly hypothesis_summary_id: string;

  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref?: string;

  readonly primary_hypothesis_name: string;
  readonly secondary_hypothesis_name?: string;

  readonly hypothesis_spread_score: number;
  readonly hypothesis_spread_class: string;

  readonly support_refs: readonly string[];
  readonly contradiction_refs: readonly string[];
  readonly missing_confirmation_refs: readonly string[];
  readonly invalidation_signal_refs: readonly string[];
  readonly shift_condition_refs: readonly string[];

  readonly hypothesis_restriction_refs: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.5.7 — Score summary.
 */
export interface L13ScoreBandSummary {
  readonly score_family: string;
  readonly band: string;
  readonly value: number;
  readonly direction: string;
}

export interface L13ScoreSummary {
  readonly score_summary_id: string;

  readonly score_snapshot_ref: string;

  readonly active_score_refs: readonly string[];
  readonly production_score_families: readonly string[];

  readonly score_band_summaries: readonly L13ScoreBandSummary[];

  readonly top_positive_attribution_refs: readonly string[];
  readonly top_negative_attribution_refs: readonly string[];

  readonly score_missing_data_profile_refs: readonly string[];
  readonly score_drift_refs: readonly string[];
  readonly score_restriction_refs: readonly string[];

  readonly score_context_completeness_class:
    L13ScoreContextCompletenessClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * §13.2.5.8 — Scenario summary.
 */
export interface L13ScenarioSummary {
  readonly scenario_summary_id: string;

  readonly scenario_set_ref: string;

  readonly base_case_ref: string;
  readonly base_case_name: string;

  readonly bullish_path_refs: readonly string[];
  readonly bearish_path_refs: readonly string[];
  readonly neutral_chop_path_refs: readonly string[];

  readonly trigger_refs: readonly string[];
  readonly invalidation_refs: readonly string[];

  readonly path_confidence_refs: readonly string[];
  readonly confidence_cap_refs: readonly string[];

  readonly scenario_spread_ref: string;
  readonly scenario_spread_class: string;

  readonly shift_condition_refs: readonly string[];

  readonly scenario_readiness_class: string;

  readonly scenario_restriction_refs: readonly string[];

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}

/**
 * Source-layer reference helper (used by validators that want to know
 * which lower layer a summary came from).
 */
export const L13_SUMMARY_SOURCE_LAYERS: Readonly<
  Record<
    | 'entity'
    | 'validation'
    | 'contradiction'
    | 'regime'
    | 'sequence'
    | 'hypothesis'
    | 'score'
    | 'scenario',
    L13DependencyLayer
  >
> = {
  entity: L13DependencyLayer.L3_IDENTITY,
  validation: L13DependencyLayer.L7_VALIDATION,
  contradiction: L13DependencyLayer.L7_VALIDATION,
  regime: L13DependencyLayer.L8_REGIME,
  sequence: L13DependencyLayer.L9_SEQUENCE,
  hypothesis: L13DependencyLayer.L10_HYPOTHESIS,
  score: L13DependencyLayer.L11_SCORE,
  scenario: L13DependencyLayer.L12_SCENARIO,
};
