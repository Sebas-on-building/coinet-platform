/**
 * L13.7 — Asset Comparison Output Contract
 *
 * §13.7.13 — Asset comparison must contrast governed states across
 * scores, scenarios, risk, timing, hypothesis strength, confidence,
 * invalidation pressure, missing-data quality, drift, and
 * restrictions. It may never become a "better buy" recommendation.
 */

import type { L13ExplanationConfidenceBand } from './confidence-breakdown';

/**
 * §13.7.13.2 — Comparison dimension taxonomy.
 */
export enum L13ComparisonDimension {
  SCORES = 'SCORES',
  SCENARIOS = 'SCENARIOS',
  RISK = 'RISK',
  TIMING = 'TIMING',
  HYPOTHESIS_STRENGTH = 'HYPOTHESIS_STRENGTH',
  CONFIDENCE = 'CONFIDENCE',
  INVALIDATION_PRESSURE = 'INVALIDATION_PRESSURE',
  MISSING_DATA_QUALITY = 'MISSING_DATA_QUALITY',
  DRIFT = 'DRIFT',
  RESTRICTIONS = 'RESTRICTIONS',
}

export const ALL_L13_COMPARISON_DIMENSIONS:
  readonly L13ComparisonDimension[] =
  Object.values(L13ComparisonDimension);

/**
 * Mandatory dimensions every clean asset comparison must address.
 */
export const L13_MANDATORY_ASSET_COMPARISON_DIMENSIONS:
  readonly L13ComparisonDimension[] = [
  L13ComparisonDimension.SCORES,
  L13ComparisonDimension.SCENARIOS,
  L13ComparisonDimension.RISK,
  L13ComparisonDimension.TIMING,
  L13ComparisonDimension.HYPOTHESIS_STRENGTH,
  L13ComparisonDimension.CONFIDENCE,
  L13ComparisonDimension.INVALIDATION_PRESSURE,
  L13ComparisonDimension.MISSING_DATA_QUALITY,
  L13ComparisonDimension.DRIFT,
  L13ComparisonDimension.RESTRICTIONS,
];

/**
 * §13.7.13.5 — Comparison relations.
 */
export enum L13ComparisonRelation {
  LEFT_STRONGER = 'LEFT_STRONGER',
  RIGHT_STRONGER = 'RIGHT_STRONGER',
  ROUGHLY_BALANCED = 'ROUGHLY_BALANCED',
  INCOMPARABLE_DUE_TO_VISIBILITY = 'INCOMPARABLE_DUE_TO_VISIBILITY',
  INCOMPARABLE_DUE_TO_RESTRICTION = 'INCOMPARABLE_DUE_TO_RESTRICTION',
}

export const ALL_L13_COMPARISON_RELATIONS:
  readonly L13ComparisonRelation[] =
  Object.values(L13ComparisonRelation);

/**
 * §13.7.13.3 — Asymmetry disclosure when one side has materially
 * worse visibility or stronger restrictions than the other.
 */
export enum L13ComparisonAsymmetryClass {
  MISSING_DATA_ASYMMETRY = 'MISSING_DATA_ASYMMETRY',
  DRIFT_ASYMMETRY = 'DRIFT_ASYMMETRY',
  RESTRICTION_ASYMMETRY = 'RESTRICTION_ASYMMETRY',
  CONFIDENCE_ASYMMETRY = 'CONFIDENCE_ASYMMETRY',
  SCENARIO_COVERAGE_ASYMMETRY = 'SCENARIO_COVERAGE_ASYMMETRY',
}

export interface L13ComparisonAsymmetryDisclosure {
  readonly asymmetry_class: L13ComparisonAsymmetryClass;
  readonly affected_subject_ref: string;
  readonly statement: string;
}

export enum L13ComparisonScopeClass {
  TWO_ASSETS = 'TWO_ASSETS',
  N_ASSETS = 'N_ASSETS',
  ASSET_VS_SECTOR = 'ASSET_VS_SECTOR',
  ASSET_VS_MARKET = 'ASSET_VS_MARKET',
}

export const ALL_L13_COMPARISON_SCOPE_CLASSES:
  readonly L13ComparisonScopeClass[] =
  Object.values(L13ComparisonScopeClass);

export interface L13ComparisonDimensionResult {
  readonly comparison_dimension_result_id: string;
  readonly dimension: L13ComparisonDimension;
  readonly left_subject_ref: string;
  readonly right_subject_ref: string;
  readonly relation: L13ComparisonRelation;
  readonly comparison_statement: string;
  readonly confidence_band: L13ExplanationConfidenceBand;
  readonly asymmetry_flag: boolean;
  readonly restriction_flag: boolean;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export enum L13ComparisonReadinessClass {
  COMPARISON_READY = 'COMPARISON_READY',
  COMPARISON_READY_WITH_DISCLOSURE = 'COMPARISON_READY_WITH_DISCLOSURE',
  COMPARISON_NARROWED_BY_ASYMMETRY = 'COMPARISON_NARROWED_BY_ASYMMETRY',
  COMPARISON_NARROWED_BY_RESTRICTION = 'COMPARISON_NARROWED_BY_RESTRICTION',
  COMPARISON_INCOMPLETE = 'COMPARISON_INCOMPLETE',
  COMPARISON_REFUSAL_REQUIRED = 'COMPARISON_REFUSAL_REQUIRED',
  COMPARISON_BLOCKED = 'COMPARISON_BLOCKED',
}

export const ALL_L13_COMPARISON_READINESS_CLASSES:
  readonly L13ComparisonReadinessClass[] =
  Object.values(L13ComparisonReadinessClass);

export interface L13AssetComparisonOutput {
  readonly asset_comparison_id: string;
  readonly output_id: string;
  readonly input_package_id: string;

  readonly comparison_subject_refs: readonly string[];
  readonly comparison_scope_class: L13ComparisonScopeClass;
  readonly comparison_dimension_results:
    readonly L13ComparisonDimensionResult[];

  readonly strongest_relative_advantage_lines: readonly string[];
  readonly strongest_relative_weakness_lines: readonly string[];

  readonly scenario_clarity_comparison: string;
  readonly opportunity_quality_comparison: string;
  readonly risk_comparison: string;
  readonly timing_comparison: string;
  readonly hypothesis_strength_comparison: string;
  readonly confidence_comparison: string;
  readonly invalidation_pressure_comparison: string;
  readonly missing_data_quality_comparison: string;
  readonly drift_comparison: string;
  readonly restriction_comparison: string;

  readonly asymmetry_disclosures:
    readonly L13ComparisonAsymmetryDisclosure[];

  readonly final_comparison_summary: string;
  readonly recommendation_language_detected: false;

  readonly comparison_readiness: L13ComparisonReadinessClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.7.13.7 — Comparison recommendation-leak patterns. Used by
 * the validator.
 */
export const L13_COMPARISON_RECOMMENDATION_LEAK_PATTERNS:
  readonly RegExp[] = [
  /\bbetter\s+buy\b/i,
  /\bshould\s+outperform\b/i,
  /\bbuy\s+(asset|btc|eth|sol|this)\b/i,
  /\bsell\s+(asset|btc|eth|sol|this)\b/i,
  /\bpick\s+(asset|btc|eth|sol|this)\s+over\b/i,
  /\bchoose\s+(asset|btc|eth|sol|this)\s+over\b/i,
];
