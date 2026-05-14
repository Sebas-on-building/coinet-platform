/**
 * L12.2 — Scenario families (§12.2.7, §12.2.8, §12.2.9).
 *
 * 12 frozen launch families. Each family carries a descriptor declaring
 * legal scenario types, legal scopes, required lower-layer contexts,
 * supporting/contradicting layer hints, posture-context requirements,
 * trigger/invalidation requirements, default horizon, and production status.
 */

import { L12ScenarioTimeHorizon } from './scenario-time-horizon';
import { L12ScenarioType } from './scenario-type';

export enum L12ScenarioFamily {
  SPOT_LED_CONTINUATION = 'SPOT_LED_CONTINUATION',
  LEVERAGE_DRIVEN_CONTINUATION = 'LEVERAGE_DRIVEN_CONTINUATION',
  FRAGILE_BREAKOUT = 'FRAGILE_BREAKOUT',
  THIN_LIQUIDITY_FAILURE = 'THIN_LIQUIDITY_FAILURE',
  DISTRIBUTION_REVERSAL = 'DISTRIBUTION_REVERSAL',
  POST_UNLOCK_DIGESTION = 'POST_UNLOCK_DIGESTION',
  POST_UNLOCK_RECOVERY = 'POST_UNLOCK_RECOVERY',
  RISK_OFF_BREAKDOWN = 'RISK_OFF_BREAKDOWN',
  CHOP_CONTINUATION = 'CHOP_CONTINUATION',
  NARRATIVE_REFLEXIVE_EXTENSION = 'NARRATIVE_REFLEXIVE_EXTENSION',
  HYPOTHESIS_SHIFT_CASE = 'HYPOTHESIS_SHIFT_CASE',
  INSUFFICIENT_DATA_CASE = 'INSUFFICIENT_DATA_CASE',
}

export const ALL_L12_SCENARIO_FAMILIES: readonly L12ScenarioFamily[] =
  Object.values(L12ScenarioFamily);

/** Required lower-layer context classes the family must consume. */
export enum L12RequiredContextClass {
  L7_VALIDATION = 'L7_VALIDATION',
  L7_CONTRADICTION = 'L7_CONTRADICTION',
  L7_RESTRICTION = 'L7_RESTRICTION',
  L8_REGIME = 'L8_REGIME',
  L8_LIQUIDITY = 'L8_LIQUIDITY',
  L8_MACRO = 'L8_MACRO',
  L9_SEQUENCE = 'L9_SEQUENCE',
  L9_PHASE = 'L9_PHASE',
  L9_LEAD_LAG = 'L9_LEAD_LAG',
  L10_HYPOTHESIS_RANKING = 'L10_HYPOTHESIS_RANKING',
  L10_HYPOTHESIS_SPREAD = 'L10_HYPOTHESIS_SPREAD',
  L10_HYPOTHESIS_SHIFT = 'L10_HYPOTHESIS_SHIFT',
  L11_SCORE_CONTEXT_BUNDLE = 'L11_SCORE_CONTEXT_BUNDLE',
  L11_MISSING_DATA = 'L11_MISSING_DATA',
  L11_DRIFT = 'L11_DRIFT',
}

export const ALL_L12_REQUIRED_CONTEXT_CLASSES: readonly L12RequiredContextClass[] =
  Object.values(L12RequiredContextClass);

/** Supporting or contradicting layer hints. */
export enum L12SupportingLayerClass {
  L7_VALIDATION_PROFILE = 'L7_VALIDATION_PROFILE',
  L7_CONTRADICTION_BUNDLE = 'L7_CONTRADICTION_BUNDLE',
  L8_REGIME_STATE = 'L8_REGIME_STATE',
  L8_LIQUIDITY_PROFILE = 'L8_LIQUIDITY_PROFILE',
  L9_SEQUENCE_STATE = 'L9_SEQUENCE_STATE',
  L9_PHASE_PROFILE = 'L9_PHASE_PROFILE',
  L10_HYPOTHESIS_RANKING = 'L10_HYPOTHESIS_RANKING',
  L10_HYPOTHESIS_SPREAD = 'L10_HYPOTHESIS_SPREAD',
  L11_OPPORTUNITY_SCORE = 'L11_OPPORTUNITY_SCORE',
  L11_RISK_SCORE = 'L11_RISK_SCORE',
  L11_TIMING_SCORE = 'L11_TIMING_SCORE',
  L11_MARKET_STRUCTURE_SCORE = 'L11_MARKET_STRUCTURE_SCORE',
  L11_THESIS_COHERENCE_SCORE = 'L11_THESIS_COHERENCE_SCORE',
  L11_SIGNAL_CONFIDENCE_SCORE = 'L11_SIGNAL_CONFIDENCE_SCORE',
  L11_WHALE_CONVICTION_SCORE = 'L11_WHALE_CONVICTION_SCORE',
  L11_UNLOCK_RISK_SCORE = 'L11_UNLOCK_RISK_SCORE',
  L11_MISSING_DATA_PROFILE = 'L11_MISSING_DATA_PROFILE',
  L11_DRIFT_REPORT = 'L11_DRIFT_REPORT',
}

export const ALL_L12_SUPPORTING_LAYER_CLASSES: readonly L12SupportingLayerClass[] =
  Object.values(L12SupportingLayerClass);

/** Production status of a scenario family. */
export enum L12ScenarioFamilyProductionStatus {
  PRODUCTION_ENABLED = 'PRODUCTION_ENABLED',
  SHADOW_ONLY = 'SHADOW_ONLY',
  RESERVED = 'RESERVED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L12_SCENARIO_FAMILY_PRODUCTION_STATUSES: readonly L12ScenarioFamilyProductionStatus[] =
  Object.values(L12ScenarioFamilyProductionStatus);

/** Family descriptor (§12.2.8). */
export interface L12ScenarioFamilyDescriptor {
  readonly scenario_family: L12ScenarioFamily;
  readonly family_name: string;
  readonly doctrine_description: string;

  readonly legal_scenario_types: readonly L12ScenarioType[];

  readonly legal_scope_types: readonly string[];

  readonly required_lower_layer_contexts: readonly L12RequiredContextClass[];

  readonly typical_supporting_layers: readonly L12SupportingLayerClass[];
  readonly typical_contradicting_layers: readonly L12SupportingLayerClass[];

  readonly requires_l8_regime_context: boolean;
  readonly requires_l9_sequence_context: boolean;
  readonly requires_l10_hypothesis_context: boolean;
  readonly requires_l11_score_context: boolean;

  readonly requires_trigger_profile: boolean;
  readonly requires_invalidation_profile: boolean;
  readonly requires_shift_conditions_when_close: boolean;

  readonly default_path_horizon: L12ScenarioTimeHorizon;

  readonly production_status: L12ScenarioFamilyProductionStatus;

  readonly policy_version: string;
}

/** Default scope types used by all families unless overridden. */
const DEFAULT_SCOPE_TYPES: readonly string[] = [
  'asset',
  'asset_pair',
  'sector',
  'ecosystem',
  'market',
];

const POLICY_VERSION = 'l12.2.scenario_family.v1';

export const L12_SCENARIO_FAMILY_DESCRIPTORS: readonly L12ScenarioFamilyDescriptor[] = [
  {
    scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
    family_name: 'Spot-led continuation',
    doctrine_description:
      'Continuation path supported by real spot participation, healthier liquidity, and non-crowded confirmation.',
    legal_scenario_types: [
      L12ScenarioType.BASE_CASE,
      L12ScenarioType.BULLISH_CONTINUATION,
      L12ScenarioType.RECOVERY_CASE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L7_VALIDATION,
      L12RequiredContextClass.L7_CONTRADICTION,
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L8_LIQUIDITY,
      L12RequiredContextClass.L9_SEQUENCE,
      L12RequiredContextClass.L10_HYPOTHESIS_RANKING,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L8_LIQUIDITY_PROFILE,
      L12SupportingLayerClass.L9_SEQUENCE_STATE,
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_MARKET_STRUCTURE_SCORE,
      L12SupportingLayerClass.L11_THESIS_COHERENCE_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L7_CONTRADICTION_BUNDLE,
      L12SupportingLayerClass.L11_RISK_SCORE,
      L12SupportingLayerClass.L11_DRIFT_REPORT,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.LEVERAGE_DRIVEN_CONTINUATION,
    family_name: 'Leverage-driven continuation',
    doctrine_description:
      'Continuation path primarily supported by leverage, squeeze dynamics, or reflexive participation, with rising fragility.',
    legal_scenario_types: [
      L12ScenarioType.BASE_CASE,
      L12ScenarioType.BULLISH_CONTINUATION,
      L12ScenarioType.STRESS_CASE,
      L12ScenarioType.BEARISH_FAILURE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L7_VALIDATION,
      L12RequiredContextClass.L7_CONTRADICTION,
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L8_LIQUIDITY,
      L12RequiredContextClass.L9_SEQUENCE,
      L12RequiredContextClass.L10_HYPOTHESIS_RANKING,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L8_REGIME_STATE,
      L12SupportingLayerClass.L9_SEQUENCE_STATE,
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_TIMING_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_RISK_SCORE,
      L12SupportingLayerClass.L11_MARKET_STRUCTURE_SCORE,
      L12SupportingLayerClass.L7_CONTRADICTION_BUNDLE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.FRAGILE_BREAKOUT,
    family_name: 'Fragile breakout',
    doctrine_description:
      'Breakout-like path exists, but confirmation is fragile because support, liquidity, contradiction, or visibility is weak.',
    legal_scenario_types: [
      L12ScenarioType.BASE_CASE,
      L12ScenarioType.BULLISH_CONTINUATION,
      L12ScenarioType.BEARISH_FAILURE,
      L12ScenarioType.INVALIDATION_CASE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L7_VALIDATION,
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L8_LIQUIDITY,
      L12RequiredContextClass.L9_SEQUENCE,
      L12RequiredContextClass.L9_LEAD_LAG,
      L12RequiredContextClass.L10_HYPOTHESIS_SPREAD,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
      L12RequiredContextClass.L11_MISSING_DATA,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L8_LIQUIDITY_PROFILE,
      L12SupportingLayerClass.L11_MARKET_STRUCTURE_SCORE,
      L12SupportingLayerClass.L11_SIGNAL_CONFIDENCE_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L7_CONTRADICTION_BUNDLE,
      L12SupportingLayerClass.L11_MISSING_DATA_PROFILE,
      L12SupportingLayerClass.L11_DRIFT_REPORT,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.THIN_LIQUIDITY_FAILURE,
    family_name: 'Thin liquidity failure',
    doctrine_description:
      'Failure path driven by shallow liquidity, fragile depth, weak absorption, or dislocation risk.',
    legal_scenario_types: [
      L12ScenarioType.BEARISH_FAILURE,
      L12ScenarioType.STRESS_CASE,
      L12ScenarioType.INVALIDATION_CASE,
      L12ScenarioType.RECOVERY_CASE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L7_CONTRADICTION,
      L12RequiredContextClass.L7_RESTRICTION,
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L8_LIQUIDITY,
      L12RequiredContextClass.L9_PHASE,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L8_LIQUIDITY_PROFILE,
      L12SupportingLayerClass.L11_MARKET_STRUCTURE_SCORE,
      L12SupportingLayerClass.L11_RISK_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_THESIS_COHERENCE_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.DISTRIBUTION_REVERSAL,
    family_name: 'Distribution reversal',
    doctrine_description:
      'Reversal/failure path where distribution, exchange inflow, treasury movement, or weakening support undermines a prior constructive path.',
    legal_scenario_types: [
      L12ScenarioType.BEARISH_FAILURE,
      L12ScenarioType.STRESS_CASE,
      L12ScenarioType.INVALIDATION_CASE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L7_CONTRADICTION,
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L9_PHASE,
      L12RequiredContextClass.L10_HYPOTHESIS_RANKING,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L10_HYPOTHESIS_RANKING,
      L12SupportingLayerClass.L11_WHALE_CONVICTION_SCORE,
      L12SupportingLayerClass.L11_RISK_SCORE,
      L12SupportingLayerClass.L11_THESIS_COHERENCE_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_MARKET_STRUCTURE_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.POST_UNLOCK_DIGESTION,
    family_name: 'Post-unlock digestion',
    doctrine_description:
      'Post-event path where unlock or supply overhang has occurred and the setup is digesting before recovery or failure is confirmed.',
    legal_scenario_types: [
      L12ScenarioType.BASE_CASE,
      L12ScenarioType.NEUTRAL_CHOP,
      L12ScenarioType.RECOVERY_CASE,
      L12ScenarioType.BEARISH_FAILURE,
    ],
    legal_scope_types: ['asset', 'sector', 'ecosystem'],
    required_lower_layer_contexts: [
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L8_LIQUIDITY,
      L12RequiredContextClass.L9_PHASE,
      L12RequiredContextClass.L10_HYPOTHESIS_RANKING,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L9_PHASE_PROFILE,
      L12SupportingLayerClass.L11_UNLOCK_RISK_SCORE,
      L12SupportingLayerClass.L11_TIMING_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_RISK_SCORE,
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.EVENT_BOUND,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.POST_UNLOCK_RECOVERY,
    family_name: 'Post-unlock recovery',
    doctrine_description:
      'Recovery path after unlock digestion where absorption, reaccumulation, or liquidity stabilization begins to confirm.',
    legal_scenario_types: [
      L12ScenarioType.RECOVERY_CASE,
      L12ScenarioType.BULLISH_CONTINUATION,
      L12ScenarioType.BASE_CASE,
    ],
    legal_scope_types: ['asset', 'sector', 'ecosystem'],
    required_lower_layer_contexts: [
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L8_LIQUIDITY,
      L12RequiredContextClass.L9_PHASE,
      L12RequiredContextClass.L10_HYPOTHESIS_RANKING,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L11_MARKET_STRUCTURE_SCORE,
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_TIMING_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_UNLOCK_RISK_SCORE,
      L12SupportingLayerClass.L11_RISK_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.EVENT_BOUND,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.RISK_OFF_BREAKDOWN,
    family_name: 'Risk-off breakdown',
    doctrine_description:
      'Failure or stress path where macro/risk-off environment weakens support, liquidity, and continuation probability.',
    legal_scenario_types: [
      L12ScenarioType.BEARISH_FAILURE,
      L12ScenarioType.STRESS_CASE,
      L12ScenarioType.INVALIDATION_CASE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L8_MACRO,
      L12RequiredContextClass.L9_SEQUENCE,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L8_REGIME_STATE,
      L12SupportingLayerClass.L11_RISK_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_THESIS_COHERENCE_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.CHOP_CONTINUATION,
    family_name: 'Chop continuation',
    doctrine_description:
      'Range/chop path where no decisive continuation or failure path is sufficiently confirmed.',
    legal_scenario_types: [
      L12ScenarioType.BASE_CASE,
      L12ScenarioType.NEUTRAL_CHOP,
      L12ScenarioType.INSUFFICIENT_DATA_CASE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L9_SEQUENCE,
      L12RequiredContextClass.L10_HYPOTHESIS_SPREAD,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L8_REGIME_STATE,
      L12SupportingLayerClass.L10_HYPOTHESIS_SPREAD,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_RISK_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.NARRATIVE_REFLEXIVE_EXTENSION,
    family_name: 'Narrative reflexive extension',
    doctrine_description:
      'Continuation path driven by narrative expansion, reflexive attention, or participation acceleration rather than full structural support.',
    legal_scenario_types: [
      L12ScenarioType.BULLISH_CONTINUATION,
      L12ScenarioType.BASE_CASE,
      L12ScenarioType.STRESS_CASE,
      L12ScenarioType.BEARISH_FAILURE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L8_REGIME,
      L12RequiredContextClass.L9_SEQUENCE,
      L12RequiredContextClass.L10_HYPOTHESIS_RANKING,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L10_HYPOTHESIS_RANKING,
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_THESIS_COHERENCE_SCORE,
      L12SupportingLayerClass.L11_SIGNAL_CONFIDENCE_SCORE,
      L12SupportingLayerClass.L11_RISK_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.HYPOTHESIS_SHIFT_CASE,
    family_name: 'Hypothesis shift case',
    doctrine_description:
      'Scenario path where the main uncertainty is whether the primary hypothesis will lose rank to the secondary hypothesis.',
    legal_scenario_types: [
      L12ScenarioType.BASE_CASE,
      L12ScenarioType.INVALIDATION_CASE,
      L12ScenarioType.BEARISH_FAILURE,
      L12ScenarioType.BULLISH_CONTINUATION,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L10_HYPOTHESIS_RANKING,
      L12RequiredContextClass.L10_HYPOTHESIS_SPREAD,
      L12RequiredContextClass.L10_HYPOTHESIS_SHIFT,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L10_HYPOTHESIS_SPREAD,
      L12SupportingLayerClass.L11_THESIS_COHERENCE_SCORE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_RISK_SCORE,
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_SIGNAL_CONFIDENCE_SCORE,
    ],
    requires_l8_regime_context: true,
    requires_l9_sequence_context: true,
    requires_l10_hypothesis_context: true,
    requires_l11_score_context: true,
    requires_trigger_profile: true,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: true,
    default_path_horizon: L12ScenarioTimeHorizon.MEDIUM_TERM,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
  {
    scenario_family: L12ScenarioFamily.INSUFFICIENT_DATA_CASE,
    family_name: 'Insufficient data case',
    doctrine_description:
      'Scenario path where missing visibility, restrictions, drift, or insufficient evidence prevents clean scenario competition.',
    legal_scenario_types: [
      L12ScenarioType.INSUFFICIENT_DATA_CASE,
      L12ScenarioType.NEUTRAL_CHOP,
      L12ScenarioType.BASE_CASE,
    ],
    legal_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_contexts: [
      L12RequiredContextClass.L7_RESTRICTION,
      L12RequiredContextClass.L11_SCORE_CONTEXT_BUNDLE,
      L12RequiredContextClass.L11_MISSING_DATA,
      L12RequiredContextClass.L11_DRIFT,
    ],
    typical_supporting_layers: [
      L12SupportingLayerClass.L11_MISSING_DATA_PROFILE,
      L12SupportingLayerClass.L11_DRIFT_REPORT,
      L12SupportingLayerClass.L7_VALIDATION_PROFILE,
    ],
    typical_contradicting_layers: [
      L12SupportingLayerClass.L11_OPPORTUNITY_SCORE,
      L12SupportingLayerClass.L11_THESIS_COHERENCE_SCORE,
    ],
    requires_l8_regime_context: false,
    requires_l9_sequence_context: false,
    requires_l10_hypothesis_context: false,
    requires_l11_score_context: true,
    requires_trigger_profile: false,
    requires_invalidation_profile: true,
    requires_shift_conditions_when_close: false,
    default_path_horizon: L12ScenarioTimeHorizon.UNDEFINED,
    production_status: L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
    policy_version: POLICY_VERSION,
  },
];

const FAMILY_INDEX: Map<L12ScenarioFamily, L12ScenarioFamilyDescriptor> = (() => {
  const m = new Map<L12ScenarioFamily, L12ScenarioFamilyDescriptor>();
  for (const d of L12_SCENARIO_FAMILY_DESCRIPTORS) m.set(d.scenario_family, d);
  return m;
})();

export function getL12FamilyDescriptor(
  family: L12ScenarioFamily,
): L12ScenarioFamilyDescriptor | undefined {
  return FAMILY_INDEX.get(family);
}

export function isL12FamilyRegistered(family: L12ScenarioFamily): boolean {
  return FAMILY_INDEX.has(family);
}

export function getL12FamiliesAllowingType(
  type: L12ScenarioType,
): readonly L12ScenarioFamilyDescriptor[] {
  return L12_SCENARIO_FAMILY_DESCRIPTORS.filter(d =>
    d.legal_scenario_types.includes(type),
  );
}

export function isL12LegalTypeFamilyPair(
  type: L12ScenarioType,
  family: L12ScenarioFamily,
): boolean {
  const d = FAMILY_INDEX.get(family);
  if (d === undefined) return false;
  return d.legal_scenario_types.includes(type);
}

export function isL12LegalScopeForFamily(
  scopeType: string,
  family: L12ScenarioFamily,
): boolean {
  const d = FAMILY_INDEX.get(family);
  if (d === undefined) return false;
  return d.legal_scope_types.includes(scopeType);
}

export function getL12ProductionFamilies(): readonly L12ScenarioFamilyDescriptor[] {
  return L12_SCENARIO_FAMILY_DESCRIPTORS.filter(
    d => d.production_status === L12ScenarioFamilyProductionStatus.PRODUCTION_ENABLED,
  );
}
