/**
 * L14.5 — Expected/Realized Effect Profiles + Regime Context
 *
 * §14.5.18 / §14.5.19 / §14.5.20 / §14.5.21 / §14.5.22 / §14.5.54
 */

import type { L14EvaluatedArtifactClass } from './outcome-evaluation-core';

export enum L14ExpectedEffectClass {
  FORWARD_RETURN_OUTPERFORMANCE = 'FORWARD_RETURN_OUTPERFORMANCE',
  FORWARD_RETURN_UNDERPERFORMANCE = 'FORWARD_RETURN_UNDERPERFORMANCE',
  MAX_DRAWDOWN_RISK = 'MAX_DRAWDOWN_RISK',
  VOLATILITY_SPIKE = 'VOLATILITY_SPIKE',
  LIQUIDITY_STRESS_INCREASE = 'LIQUIDITY_STRESS_INCREASE',
  SCENARIO_PATH_FOLLOW_THROUGH = 'SCENARIO_PATH_FOLLOW_THROUGH',
  SCENARIO_PATH_FAILURE = 'SCENARIO_PATH_FAILURE',
  TRIGGER_SIGNIFICANCE = 'TRIGGER_SIGNIFICANCE',
  INVALIDATION_MATERIALIZATION = 'INVALIDATION_MATERIALIZATION',
  HYPOTHESIS_SUPPORT_PERSISTENCE = 'HYPOTHESIS_SUPPORT_PERSISTENCE',
  HYPOTHESIS_INVALIDATION = 'HYPOTHESIS_INVALIDATION',
  CONFIDENCE_WELL_CALIBRATED = 'CONFIDENCE_WELL_CALIBRATED',
  ALERT_OUTCOME_RELEVANCE = 'ALERT_OUTCOME_RELEVANCE',
  EXPLANATION_OUTCOME_CONSISTENCY = 'EXPLANATION_OUTCOME_CONSISTENCY',
}

export const ALL_L14_EXPECTED_EFFECT_CLASSES:
  readonly L14ExpectedEffectClass[] =
  Object.values(L14ExpectedEffectClass);

export enum L14ExpectedDirectionClass {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL',
  CONDITIONAL = 'CONDITIONAL',
}

export enum L14ExpectedMagnitudeClass {
  SMALL = 'SMALL',
  MODERATE = 'MODERATE',
  LARGE = 'LARGE',
  EXTREME = 'EXTREME',
}

export enum L14RealizedOutcomeFactClass {
  FORWARD_RETURN_FACT = 'FORWARD_RETURN_FACT',
  RISK_ADJUSTED_RETURN_FACT = 'RISK_ADJUSTED_RETURN_FACT',
  MAX_DRAWDOWN_FACT = 'MAX_DRAWDOWN_FACT',
  REALIZED_VOLATILITY_FACT = 'REALIZED_VOLATILITY_FACT',
  LIQUIDITY_CHANGE_FACT = 'LIQUIDITY_CHANGE_FACT',
  FUNDING_CHANGE_FACT = 'FUNDING_CHANGE_FACT',
  OI_CHANGE_FACT = 'OI_CHANGE_FACT',
  EXCHANGE_FLOW_FACT = 'EXCHANGE_FLOW_FACT',
  SCORE_TRAJECTORY_FACT = 'SCORE_TRAJECTORY_FACT',
  HYPOTHESIS_RANK_TRAJECTORY_FACT = 'HYPOTHESIS_RANK_TRAJECTORY_FACT',
  SCENARIO_PATH_TRAJECTORY_FACT = 'SCENARIO_PATH_TRAJECTORY_FACT',
  TRIGGER_REALIZATION_FACT = 'TRIGGER_REALIZATION_FACT',
  INVALIDATION_REALIZATION_FACT = 'INVALIDATION_REALIZATION_FACT',
  CONTRADICTION_EMERGENCE_FACT = 'CONTRADICTION_EMERGENCE_FACT',
}

export enum L14RealizedDirectionClass {
  POSITIVE = 'POSITIVE',
  NEGATIVE = 'NEGATIVE',
  NEUTRAL = 'NEUTRAL',
  MIXED = 'MIXED',
}

export enum L14RealizedMagnitudeClass {
  SMALL = 'SMALL',
  MODERATE = 'MODERATE',
  LARGE = 'LARGE',
  EXTREME = 'EXTREME',
}

export enum L14RealizedOutcomeSummaryCode {
  EXPECTED_EFFECT_MATERIALIZED = 'EXPECTED_EFFECT_MATERIALIZED',
  EXPECTED_EFFECT_PARTIALLY_MATERIALIZED = 'EXPECTED_EFFECT_PARTIALLY_MATERIALIZED',
  OPPOSITE_EFFECT_OBSERVED = 'OPPOSITE_EFFECT_OBSERVED',
  NO_MATERIAL_EFFECT_OBSERVED = 'NO_MATERIAL_EFFECT_OBSERVED',
  EVIDENCE_INSUFFICIENT = 'EVIDENCE_INSUFFICIENT',
}

export enum L14RealizedOutcomeCompletenessClass {
  COMPLETE = 'COMPLETE',
  PARTIAL_BUT_EVALUABLE = 'PARTIAL_BUT_EVALUABLE',
  PARTIAL_INCONCLUSIVE = 'PARTIAL_INCONCLUSIVE',
  MISSING_REQUIRED_FACTS = 'MISSING_REQUIRED_FACTS',
}

export interface L14ExpectedEffectProfile {
  readonly expected_effect_profile_id: string;
  readonly evaluated_artifact_ref: string;
  readonly evaluated_artifact_class: L14EvaluatedArtifactClass;
  readonly expected_effect_class: L14ExpectedEffectClass;
  readonly expected_direction?: L14ExpectedDirectionClass;
  readonly expected_magnitude_class?: L14ExpectedMagnitudeClass;
  readonly required_realized_fact_classes: readonly L14RealizedOutcomeFactClass[];
  readonly evaluation_tolerance_profile_ref: string;
  readonly policy_version: string;
}

export interface L14RealizedOutcomeProfile {
  readonly realized_effect_profile_id: string;
  readonly evaluation_horizon_ref: string;
  readonly realized_fact_refs: readonly string[];
  readonly realized_fact_classes: readonly L14RealizedOutcomeFactClass[];
  readonly realized_direction?: L14RealizedDirectionClass;
  readonly realized_magnitude_class?: L14RealizedMagnitudeClass;
  readonly realized_summary_codes: readonly L14RealizedOutcomeSummaryCode[];
  readonly completeness_class: L14RealizedOutcomeCompletenessClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14OutcomeRegimeContext {
  readonly outcome_regime_context_id: string;
  readonly evaluation_ref: string;
  readonly regime_ref: string;
  readonly primary_regime_at_emission: string;
  readonly transition_risk_at_emission?: string;
  readonly regime_changed_during_horizon: boolean;
  readonly realized_regime_ref_at_resolution?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
