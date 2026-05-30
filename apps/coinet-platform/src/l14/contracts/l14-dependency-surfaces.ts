/**
 * L14.1 — Dependency Surface Contracts
 *
 * §14.1.9 / §14.1.10 — Closed set of governed lower-layer
 * surfaces Layer 14 may legally consume, plus the descriptor
 * every registered surface must populate.
 */

export enum L14DependencySurfaceClass {
  L5_CURRENT_AUTHORITY_READ = 'L5_CURRENT_AUTHORITY_READ',
  L5_HISTORICAL_FACT_READ = 'L5_HISTORICAL_FACT_READ',
  L5_REPLAY_SUBSTRATE = 'L5_REPLAY_SUBSTRATE',
  L10_CURRENT_HYPOTHESIS_RANKING = 'L10_CURRENT_HYPOTHESIS_RANKING',
  L10_HYPOTHESIS_RELIANCE_PROFILE = 'L10_HYPOTHESIS_RELIANCE_PROFILE',
  L10_HYPOTHESIS_SHIFT_CONDITIONS = 'L10_HYPOTHESIS_SHIFT_CONDITIONS',
  L10_HYPOTHESIS_HISTORICAL_FACTS = 'L10_HYPOTHESIS_HISTORICAL_FACTS',
  L11_CURRENT_SCORE_SET = 'L11_CURRENT_SCORE_SET',
  L11_SCORE_ATTRIBUTION = 'L11_SCORE_ATTRIBUTION',
  L11_CALIBRATION_TARGETS = 'L11_CALIBRATION_TARGETS',
  L11_SCORE_DRIFT_REPORTS = 'L11_SCORE_DRIFT_REPORTS',
  L11_HISTORICAL_SCORE_FACTS = 'L11_HISTORICAL_SCORE_FACTS',
  L12_CURRENT_SCENARIO_SET = 'L12_CURRENT_SCENARIO_SET',
  L12_SCENARIO_TRIGGERS = 'L12_SCENARIO_TRIGGERS',
  L12_SCENARIO_INVALIDATIONS = 'L12_SCENARIO_INVALIDATIONS',
  L12_PATH_CONFIDENCE = 'L12_PATH_CONFIDENCE',
  L12_SCENARIO_HISTORICAL_FACTS = 'L12_SCENARIO_HISTORICAL_FACTS',
  L13_FINAL_OUTPUT_ARTIFACT = 'L13_FINAL_OUTPUT_ARTIFACT',
  L13_ALERT_PAYLOAD = 'L13_ALERT_PAYLOAD',
  L13_REPORT_PAYLOAD = 'L13_REPORT_PAYLOAD',
  L13_COMPARISON_PAYLOAD = 'L13_COMPARISON_PAYLOAD',
  L13_FEEDBACK_RECORDS = 'L13_FEEDBACK_RECORDS',
  L13_OUTPUT_QUALITY_METRICS = 'L13_OUTPUT_QUALITY_METRICS',
  L13_SAFETY_EVENT_FACTS = 'L13_SAFETY_EVENT_FACTS',
}

export const ALL_L14_DEPENDENCY_SURFACE_CLASSES:
  readonly L14DependencySurfaceClass[] =
  Object.values(L14DependencySurfaceClass);

export type L14DependencySourceLayer = 'L5' | 'L10' | 'L11' | 'L12' | 'L13';

export interface L14DependencySurfaceDefinition {
  readonly dependency_surface_id: string;
  readonly source_layer: L14DependencySourceLayer;
  readonly surface_class: L14DependencySurfaceClass;
  readonly semantic_purpose: string;
  readonly current_authority_required: boolean;
  readonly historical_surface_allowed: boolean;
  readonly raw_lower_layer_bypass_forbidden: true;
  readonly restriction_posture_required: boolean;
  readonly lineage_required: boolean;
  readonly replay_hash_required: boolean;
  readonly policy_version: string;
}
