/**
 * L11.2 — Score Family Definition Contract & Catalogue (§11.2.13 / §11.2.14)
 *
 * Each production score family ships a complete `L11ScoreFamilyDefinition`
 * declaring its meaning-claim ref, direction, scope types, dependency
 * surfaces from L3–L10, required output surfaces, disclosures,
 * modifier requirements, default restriction flags, and band-policy
 * ref. Reserved families ship deliberately minimal definitions that
 * the validator/registry treat as embargoed.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreFamilyDirectionClass, L11_REQUIRED_DIRECTION_BY_FAMILY } from './score-direction';
import { L11ScoreProductionStatus } from './score-production-status';
import {
  L11ScoreDisclosureRequirement,
  L11ScoreDownstreamUse,
  L11ForbiddenScoreUse,
} from './score-meaning-claim';
import {
  L11DependencySurfaceClass,
  L11OutputSurfaceClass,
  L11ScoreRestrictionFlag,
} from './l11-constitutional-types';

export interface L11ScoreFamilyDefinition {
  readonly score_family: L11ScoreFamily;
  readonly score_name: string;
  readonly production_status: L11ScoreProductionStatus;

  readonly meaning_claim_ref: string;
  readonly direction_class: L11ScoreFamilyDirectionClass;

  readonly legal_interpretations: readonly string[];
  readonly illegal_interpretations: readonly string[];

  readonly applicable_scope_types: readonly string[];

  readonly required_lower_layer_surfaces: readonly L11DependencySurfaceClass[];
  readonly required_output_surfaces: readonly L11OutputSurfaceClass[];

  readonly required_disclosure_requirements: readonly L11ScoreDisclosureRequirement[];

  readonly intended_downstream_uses: readonly L11ScoreDownstreamUse[];
  readonly forbidden_downstream_uses: readonly L11ForbiddenScoreUse[];

  readonly requires_component_breakdown: boolean;
  readonly requires_positive_attribution: boolean;
  readonly requires_negative_attribution: boolean;
  readonly requires_missing_data_profile: boolean;
  readonly requires_regime_modifiers: boolean;
  readonly requires_sequence_modifiers: boolean;
  readonly requires_hypothesis_modifiers: boolean;
  readonly requires_calibration_target: boolean;

  readonly default_restriction_flags: readonly L11ScoreRestrictionFlag[];

  readonly band_policy_ref: string;
  readonly policy_version: string;
}

export const L11_DOCTRINE_POLICY_VERSION = 'l11.2.doctrine.v1';

const DEFAULT_REQUIRED_OUTPUTS: readonly L11OutputSurfaceClass[] = [
  L11OutputSurfaceClass.SCORE_OUTPUT,
  L11OutputSurfaceClass.SCORE_COMPONENT_BREAKDOWN,
  L11OutputSurfaceClass.SCORE_ATTRIBUTION,
  L11OutputSurfaceClass.SCORE_MODIFIER_PROFILE,
  L11OutputSurfaceClass.SCORE_MISSING_DATA_PROFILE,
  L11OutputSurfaceClass.SCORE_CALIBRATION_HOOK,
  L11OutputSurfaceClass.SCORE_DRIFT_HOOK,
  L11OutputSurfaceClass.SCORE_EVIDENCE_READ_SURFACE,
];

const DEFAULT_RESTRICTION_FLAGS: readonly L11ScoreRestrictionFlag[] = [
  L11ScoreRestrictionFlag.SCENARIO_WEIGHTING_ALLOWED,
  L11ScoreRestrictionFlag.RANKING_SUPPORT_ALLOWED,
  L11ScoreRestrictionFlag.JUDGMENT_SUPPORT_ALLOWED,
  L11ScoreRestrictionFlag.FINAL_RECOMMENDATION_BLOCKED,
  L11ScoreRestrictionFlag.REQUIRES_ATTRIBUTION_DISCLOSURE,
  L11ScoreRestrictionFlag.REQUIRES_MISSING_DATA_DISCLOSURE,
];

const DEFAULT_DOWNSTREAM_USES: readonly L11ScoreDownstreamUse[] = [
  L11ScoreDownstreamUse.SCENARIO_WEIGHTING_INPUT,
  L11ScoreDownstreamUse.RANKING_SUPPORT,
  L11ScoreDownstreamUse.JUDGMENT_SUPPORT,
  L11ScoreDownstreamUse.CALIBRATION_INPUT,
  L11ScoreDownstreamUse.MONITORING_INPUT,
];

const DEFAULT_FORBIDDEN_USES: readonly L11ForbiddenScoreUse[] = [
  L11ForbiddenScoreUse.FINAL_RECOMMENDATION,
  L11ForbiddenScoreUse.FINAL_JUDGMENT,
  L11ForbiddenScoreUse.TRADE_ACTION,
  L11ForbiddenScoreUse.SCENARIO_WINNER_SELECTION,
  L11ForbiddenScoreUse.PORTFOLIO_ALLOCATION,
  L11ForbiddenScoreUse.GUARANTEED_OUTCOME_CLAIM,
  L11ForbiddenScoreUse.CAUSAL_CERTAINTY_CLAIM,
];

const DEFAULT_SCOPE_TYPES: readonly string[] = ['ASSET', 'NARRATIVE', 'ECOSYSTEM'];

function defaultBandPolicyRefFor(family: L11ScoreFamily): string {
  return `l11d.band_policy.${family.toLowerCase()}.v1`;
}

function defaultMeaningClaimRefFor(family: L11ScoreFamily): string {
  return `l11d.meaning_claim.${family.toLowerCase()}.v1`;
}

// ── Production family definitions (§11.2.7 / §11.2.14) ──

const OPPORTUNITY_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.OPPORTUNITY,
  score_name: 'opportunity_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.OPPORTUNITY),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.OPPORTUNITY],
  legal_interpretations: [
    'governed quantitative interpretation of opportunity quality',
    'support for later scenario weighting and judgment support',
  ],
  illegal_interpretations: [
    'buy signal',
    'final recommendation',
    'guaranteed setup',
    'scenario winner',
    'best trade',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    L11DependencySurfaceClass.L8_REGIME_STATE,
    L11DependencySurfaceClass.L8_REGIME_MULTIPLIER_PROFILE,
    L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT,
    L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.REGIME_MODIFIER,
    L11ScoreDisclosureRequirement.SEQUENCE_MODIFIER,
    L11ScoreDisclosureRequirement.HYPOTHESIS_MODIFIER,
    L11ScoreDisclosureRequirement.HYPOTHESIS_RELIANCE_INFLUENCE,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: true,
  requires_sequence_modifiers: true,
  requires_hypothesis_modifiers: true,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.OPPORTUNITY),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

const RISK_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.RISK,
  score_name: 'risk_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.RISK),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.RISK],
  legal_interpretations: [
    'governed quantitative interpretation of downside risk',
  ],
  illegal_interpretations: [
    'avoid signal',
    'guaranteed loss',
    'final risk judgment',
    'sell signal',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L7_CONTRADICTION_BUNDLE,
    L11DependencySurfaceClass.L8_REGIME_TRANSITION_PROFILE,
    L11DependencySurfaceClass.L9_DECAY_PROFILE,
    L11DependencySurfaceClass.L10_CONFIRMATION_INVALIDATION_SURFACE,
    L11DependencySurfaceClass.L6_EVENT_HISTORY,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.CONTRADICTION_POSTURE,
    L11ScoreDisclosureRequirement.INVALIDATION_POSTURE,
    L11ScoreDisclosureRequirement.REGIME_MODIFIER,
    L11ScoreDisclosureRequirement.SEQUENCE_MODIFIER,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: true,
  requires_sequence_modifiers: true,
  requires_hypothesis_modifiers: false,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.RISK),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

const TIMING_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.TIMING,
  score_name: 'timing_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.TIMING),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.TIMING],
  legal_interpretations: [
    'governed quantitative interpretation of timing quality',
  ],
  illegal_interpretations: [
    'enter now',
    'exact buy zone',
    'perfect timing',
    'guaranteed continuation',
    'final timing call',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L9_PHASE_STATE,
    L11DependencySurfaceClass.L9_LEAD_LAG_PROFILE,
    L11DependencySurfaceClass.L9_DECAY_PROFILE,
    L11DependencySurfaceClass.L8_REGIME_TRANSITION_PROFILE,
    L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.SEQUENCE_MODIFIER,
    L11ScoreDisclosureRequirement.REGIME_MODIFIER,
    L11ScoreDisclosureRequirement.HYPOTHESIS_MODIFIER,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: true,
  requires_sequence_modifiers: true,
  requires_hypothesis_modifiers: true,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.TIMING),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

const THESIS_COHERENCE_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.THESIS_COHERENCE,
  score_name: 'thesis_coherence_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.THESIS_COHERENCE),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.THESIS_COHERENCE],
  legal_interpretations: [
    'governed quantitative interpretation of thesis coherence',
  ],
  illegal_interpretations: [
    'guaranteed thesis',
    'thesis confirmation',
    'winning thesis',
    'final judgment',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    L11DependencySurfaceClass.L7_CONTRADICTION_BUNDLE,
    L11DependencySurfaceClass.L8_REGIME_STATE,
    L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT,
    L11DependencySurfaceClass.L10_HYPOTHESIS_SPREAD_SURFACE,
    L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.CONTRADICTION_POSTURE,
    L11ScoreDisclosureRequirement.HYPOTHESIS_MODIFIER,
    L11ScoreDisclosureRequirement.REGIME_MODIFIER,
    L11ScoreDisclosureRequirement.SEQUENCE_MODIFIER,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: true,
  requires_sequence_modifiers: true,
  requires_hypothesis_modifiers: true,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.THESIS_COHERENCE),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

const SIGNAL_CONFIDENCE_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.SIGNAL_CONFIDENCE,
  score_name: 'signal_confidence_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.SIGNAL_CONFIDENCE),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.SIGNAL_CONFIDENCE],
  legal_interpretations: [
    'governed quantitative interpretation of signal stack reliability',
  ],
  illegal_interpretations: [
    'bullish',
    'bearish',
    'final answer',
    'recommendation',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L6_EVIDENCE_PACK,
    L11DependencySurfaceClass.L7_CONFIDENCE_ASSESSMENT,
    L11DependencySurfaceClass.L8_REGIME_CONFIDENCE_PROFILE,
    L11DependencySurfaceClass.L9_SEQUENCE_RESTRICTION_PROFILE,
    L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.CONTRADICTION_POSTURE,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: false,
  requires_sequence_modifiers: false,
  requires_hypothesis_modifiers: true,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.SIGNAL_CONFIDENCE),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

const MARKET_STRUCTURE_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.MARKET_STRUCTURE,
  score_name: 'market_structure_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.MARKET_STRUCTURE),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.MARKET_STRUCTURE],
  legal_interpretations: [
    'governed quantitative interpretation of market structure quality',
  ],
  illegal_interpretations: [
    'guaranteed continuation',
    'safe structure',
    'final entry quality',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    L11DependencySurfaceClass.L6_FEATURE_HISTORY,
    L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    L11DependencySurfaceClass.L8_REGIME_STATE,
    L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.REGIME_MODIFIER,
    L11ScoreDisclosureRequirement.SEQUENCE_MODIFIER,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: true,
  requires_sequence_modifiers: true,
  requires_hypothesis_modifiers: false,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.MARKET_STRUCTURE),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

const WHALE_CONVICTION_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.WHALE_CONVICTION,
  score_name: 'whale_conviction_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.WHALE_CONVICTION),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.WHALE_CONVICTION],
  legal_interpretations: [
    'governed quantitative interpretation of whale-behavior support for accumulation or distribution',
  ],
  illegal_interpretations: [
    'whales are always right',
    'guaranteed accumulation truth',
    'final accumulation judgment',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    L11DependencySurfaceClass.L6_EVENT_HISTORY,
    L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT,
    L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.SEQUENCE_MODIFIER,
    L11ScoreDisclosureRequirement.HYPOTHESIS_MODIFIER,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: false,
  requires_sequence_modifiers: true,
  requires_hypothesis_modifiers: true,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.WHALE_CONVICTION),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

const UNLOCK_RISK_DEF: L11ScoreFamilyDefinition = {
  score_family: L11ScoreFamily.UNLOCK_RISK,
  score_name: 'unlock_risk_score',
  production_status: L11ScoreProductionStatus.PRODUCTION_ENABLED,
  meaning_claim_ref: defaultMeaningClaimRefFor(L11ScoreFamily.UNLOCK_RISK),
  direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[L11ScoreFamily.UNLOCK_RISK],
  legal_interpretations: [
    'governed quantitative interpretation of supply-overhang risk',
  ],
  illegal_interpretations: [
    'guaranteed dump',
    'sell signal',
    'avoid automatically',
    'final downside judgment',
  ],
  applicable_scope_types: DEFAULT_SCOPE_TYPES,
  required_lower_layer_surfaces: [
    L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    L11DependencySurfaceClass.L6_EVENT_HISTORY,
    L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    L11DependencySurfaceClass.L8_REGIME_STATE,
    L11DependencySurfaceClass.L9_DECAY_PROFILE,
    L11DependencySurfaceClass.L10_CONFIRMATION_INVALIDATION_SURFACE,
  ],
  required_output_surfaces: DEFAULT_REQUIRED_OUTPUTS,
  required_disclosure_requirements: [
    L11ScoreDisclosureRequirement.POSITIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.NEGATIVE_ATTRIBUTION,
    L11ScoreDisclosureRequirement.MISSING_DATA_PROFILE,
    L11ScoreDisclosureRequirement.CONTRADICTION_POSTURE,
    L11ScoreDisclosureRequirement.REGIME_MODIFIER,
    L11ScoreDisclosureRequirement.SEQUENCE_MODIFIER,
    L11ScoreDisclosureRequirement.RESTRICTION_POSTURE,
    L11ScoreDisclosureRequirement.CALIBRATION_TARGET,
    L11ScoreDisclosureRequirement.EVIDENCE_PACK,
  ],
  intended_downstream_uses: DEFAULT_DOWNSTREAM_USES,
  forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
  requires_component_breakdown: true,
  requires_positive_attribution: true,
  requires_negative_attribution: true,
  requires_missing_data_profile: true,
  requires_regime_modifiers: true,
  requires_sequence_modifiers: true,
  requires_hypothesis_modifiers: false,
  requires_calibration_target: true,
  default_restriction_flags: DEFAULT_RESTRICTION_FLAGS,
  band_policy_ref: defaultBandPolicyRefFor(L11ScoreFamily.UNLOCK_RISK),
  policy_version: L11_DOCTRINE_POLICY_VERSION,
};

// ── Reserved family definitions (§11.2.8) ──

function reservedDef(
  family: L11ScoreFamily,
  name: string,
): L11ScoreFamilyDefinition {
  return {
    score_family: family,
    score_name: name,
    production_status: L11ScoreProductionStatus.RESERVED,
    meaning_claim_ref: defaultMeaningClaimRefFor(family),
    direction_class: L11_REQUIRED_DIRECTION_BY_FAMILY[family],
    legal_interpretations: ['reserved — not production-emissible'],
    illegal_interpretations: [
      'production score emission',
      'current authoritative read surface',
      'production aggregate inclusion',
      'L12+ official input',
      'fallback substitute for production family',
    ],
    applicable_scope_types: DEFAULT_SCOPE_TYPES,
    required_lower_layer_surfaces: [],
    required_output_surfaces: [],
    required_disclosure_requirements: [],
    intended_downstream_uses: [],
    forbidden_downstream_uses: DEFAULT_FORBIDDEN_USES,
    requires_component_breakdown: false,
    requires_positive_attribution: false,
    requires_negative_attribution: false,
    requires_missing_data_profile: false,
    requires_regime_modifiers: false,
    requires_sequence_modifiers: false,
    requires_hypothesis_modifiers: false,
    requires_calibration_target: false,
    default_restriction_flags: [],
    band_policy_ref: defaultBandPolicyRefFor(family),
    policy_version: L11_DOCTRINE_POLICY_VERSION,
  };
}

export const L11_SCORE_FAMILY_DEFINITIONS: readonly L11ScoreFamilyDefinition[] = [
  OPPORTUNITY_DEF,
  RISK_DEF,
  TIMING_DEF,
  THESIS_COHERENCE_DEF,
  SIGNAL_CONFIDENCE_DEF,
  MARKET_STRUCTURE_DEF,
  WHALE_CONVICTION_DEF,
  UNLOCK_RISK_DEF,
  reservedDef(L11ScoreFamily.NARRATIVE_QUALITY, 'narrative_quality_score'),
  reservedDef(L11ScoreFamily.FUNDAMENTAL_SUBSTANCE, 'fundamental_substance_score'),
  reservedDef(L11ScoreFamily.LIQUIDITY_QUALITY, 'liquidity_quality_score'),
  reservedDef(L11ScoreFamily.MANIPULATION_RISK, 'manipulation_risk_score'),
  reservedDef(L11ScoreFamily.ECOSYSTEM_BETA, 'ecosystem_beta_score'),
  reservedDef(L11ScoreFamily.CONTINUATION_QUALITY, 'continuation_quality_score'),
  reservedDef(L11ScoreFamily.REVERSAL_RISK, 'reversal_risk_score'),
];

export function getL11ScoreFamilyDefinition(
  family: L11ScoreFamily,
): L11ScoreFamilyDefinition | undefined {
  return L11_SCORE_FAMILY_DEFINITIONS.find(d => d.score_family === family);
}
