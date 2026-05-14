/**
 * L11.9 — Final Layer Definition (§11.9.1)
 *
 * Canonical, frozen one-line and structured definitions for Layer 11
 * after closure. These constants are used by the master certification
 * orchestrator and the ratification artifact emitter.
 *
 * §11.9.2 Non-duplication law: this file MUST NOT redefine any
 * L11.1–L11.8 contract. It only adds closure-time prose constants.
 */

export const L11_FINAL_DEFINITION_POLICY_VERSION = 'l11.9.final-definition.v1';

/** §11.9.1.2 — frozen layer sentence. */
export const L11_FINAL_LAYER_SENTENCE: string =
  'Layer 11 converts governed truth into deterministic quantitative ' +
  'meaning objects, without becoming judgment.';

export interface L11FinalLayerDefinition {
  readonly layer_id: 'L11';
  readonly layer_name: 'Deterministic Scoring Engine';
  readonly final_sentence: string;
  readonly produces: readonly L11ProducedSurfaceTag[];
  readonly does_not_produce: readonly L11NonProductionSurfaceTag[];
  readonly upstream_dependencies: readonly L11UpstreamLayerTag[];
  readonly policy_version: string;
}

export enum L11ProducedSurfaceTag {
  SCORE_OUTPUTS = 'SCORE_OUTPUTS',
  COMPONENT_BREAKDOWNS = 'COMPONENT_BREAKDOWNS',
  SCORE_ATTRIBUTION = 'SCORE_ATTRIBUTION',
  MISSING_DATA_PROFILES = 'MISSING_DATA_PROFILES',
  MODIFIER_PROFILES = 'MODIFIER_PROFILES',
  CALIBRATION_HOOKS = 'CALIBRATION_HOOKS',
  DRIFT_REPORTS = 'DRIFT_REPORTS',
  SCORE_EVIDENCE_BUNDLES = 'SCORE_EVIDENCE_BUNDLES',
  CURRENT_AND_HISTORICAL_READ_SURFACES = 'CURRENT_AND_HISTORICAL_READ_SURFACES',
}

export const ALL_L11_PRODUCED_SURFACE_TAGS:
  readonly L11ProducedSurfaceTag[] = Object.values(L11ProducedSurfaceTag);

/** §11.9.1.1 — Layer 11 explicitly does NOT produce these. */
export enum L11NonProductionSurfaceTag {
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  SCENARIO_WINNER = 'SCENARIO_WINNER',
  RECOMMENDATION = 'RECOMMENDATION',
  TRADE_ACTION = 'TRADE_ACTION',
  BUY_SELL_HOLD_AVOID_INSTRUCTION = 'BUY_SELL_HOLD_AVOID_INSTRUCTION',
}

export const ALL_L11_NON_PRODUCTION_SURFACE_TAGS:
  readonly L11NonProductionSurfaceTag[] =
  Object.values(L11NonProductionSurfaceTag);

export enum L11UpstreamLayerTag {
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
  L6 = 'L6',
  L7 = 'L7',
  L8 = 'L8',
  L9 = 'L9',
  L10 = 'L10',
}

export const L11_FINAL_LAYER_DEFINITION: L11FinalLayerDefinition = {
  layer_id: 'L11',
  layer_name: 'Deterministic Scoring Engine',
  final_sentence: L11_FINAL_LAYER_SENTENCE,
  produces: ALL_L11_PRODUCED_SURFACE_TAGS,
  does_not_produce: ALL_L11_NON_PRODUCTION_SURFACE_TAGS,
  upstream_dependencies: [
    L11UpstreamLayerTag.L3,
    L11UpstreamLayerTag.L4,
    L11UpstreamLayerTag.L5,
    L11UpstreamLayerTag.L6,
    L11UpstreamLayerTag.L7,
    L11UpstreamLayerTag.L8,
    L11UpstreamLayerTag.L9,
    L11UpstreamLayerTag.L10,
  ],
  policy_version: L11_FINAL_DEFINITION_POLICY_VERSION,
};
