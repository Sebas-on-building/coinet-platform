/**
 * L8.6 — Token-Specific Regime Templates
 *
 * §8.6.4.8 – §8.6.4.14 — First production token-specific templates:
 *   TOKEN_LAUNCH_DISCOVERY@v1, TOKEN_EARLY_ACCUMULATION@v1,
 *   TOKEN_NARRATIVE_BREAKOUT@v1, TOKEN_MATURE_TREND@v1,
 *   TOKEN_BLOWOFF_REFLEXIVE_LATE_STAGE@v1, TOKEN_DISTRIBUTION@v1,
 *   TOKEN_POST_UNLOCK_DIGESTION@v1.
 *
 * Token-specific is `PHASE_3_TOKEN_LIFECYCLE`.
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import { L8TokenRegimeClass } from '../contracts/regime-class';
import { L8RegimeInputDomain } from '../contracts/regime-input-domain';
import { L8RegimeInputFamily } from '../contracts/regime-input-family';
import {
  L8RegimeRolloutPhase,
  L8RegimeTemplateState,
} from '../contracts/regime-rollout-phase';
import {
  L8RegimeSignatureClass,
  buildL8RegimeSignatureId,
} from '../contracts/regime-signature';
import {
  L8RegimeTemplate,
  buildL8RegimeTemplateIdV6,
  familyPrefixForSignatures,
} from '../contracts/regime-template';

const FAMILY = L8RegimeFamily.TOKEN_SPECIFIC;
const SIG_PREFIX = familyPrefixForSignatures(FAMILY);

const TOKEN_INPUT_FAMILIES: readonly L8RegimeInputFamily[] = [
  L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
  L8RegimeInputFamily.VOLATILITY_FAMILY,
  L8RegimeInputFamily.LIQUIDITY_STRUCTURE_FAMILY,
  L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
  L8RegimeInputFamily.NARRATIVE_STATE_FAMILY,
  L8RegimeInputFamily.SECURITY_OVERHANG_FAMILY,
  L8RegimeInputFamily.SEQUENCE_STATE_FAMILY,
  L8RegimeInputFamily.PROTOCOL_SUBSTANCE_FAMILY,
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
  L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
  L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
  L8RegimeInputFamily.L5_STORAGE_READ_FAMILY,
];

const PHASE = L8RegimeRolloutPhase.PHASE_3_TOKEN_LIFECYCLE;

const LAUNCH_DISCOVERY: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8TokenRegimeClass.LAUNCH_DISCOVERY, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8TokenRegimeClass.LAUNCH_DISCOVERY,
  template_version: '1.0.0',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_validation_patterns: [
    'MARKET_STRENGTH_VALIDATION',
  ],
  required_feature_patterns: [
    'SEQUENCE_STATE', 'MOMENTUM', 'LIQUIDITY',
  ],
  support_domains: [
    L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.RISK_OVERHANG_DOMAIN,
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
  ],
  legal_input_families: TOKEN_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'discovery_into_accumulation'),
      description: 'discovery maturing into early accumulation',
      triggered_by_domains: [
        L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'immature_mixed_posture'),
      description: 'early state lacks clean lifecycle cleanliness',
      triggered_by_domains: [L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN],
      ambiguity_weight: 0.55,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'STRUCTURALLY_CONSERVATIVE',
    'FRAGILITY_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'FRAGILITY_SENSITIVITY_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 1,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Early lifecycle state with immature but active participation.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const EARLY_ACCUMULATION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8TokenRegimeClass.EARLY_ACCUMULATION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8TokenRegimeClass.EARLY_ACCUMULATION,
  template_version: '1.0.0',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_validation_patterns: [
    'ACCUMULATION_VALIDATION',
    'LIQUIDITY_HEALTH_VALIDATION',
  ],
  required_feature_patterns: [
    'ONCHAIN_FLOW', 'SEQUENCE_STATE', 'LIQUIDITY', 'NARRATIVE_STATE',
  ],
  support_domains: [
    L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.RISK_OVERHANG_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
  ],
  legal_input_families: TOKEN_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'narrative_acceleration'),
      description: 'narrative acceleration increasing',
      triggered_by_domains: [L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'overhang_resolution'),
      description: 'overhang resolution signal',
      triggered_by_domains: [L8RegimeInputDomain.RISK_OVERHANG_DOMAIN],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'distribution_competing_with_accumulation'),
      description: 'competing distribution and accumulation signals',
      triggered_by_domains: [
        L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
      ],
      ambiguity_weight: 0.65,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'STRUCTURALLY_CONSERVATIVE',
    'CONTRADICTION_SENSITIVE',
    'NARRATIVE_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'TREND_AMPLIFICATION_BIAS',
    'MOMENTUM_TRUST_BIAS',
    'NARRATIVE_SENSITIVITY_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 2,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Structural support building ahead of broad attention saturation.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const NARRATIVE_BREAKOUT: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8TokenRegimeClass.NARRATIVE_BREAKOUT, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8TokenRegimeClass.NARRATIVE_BREAKOUT,
  template_version: '1.0.0',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_validation_patterns: [
    'NARRATIVE_VALIDATION',
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
  ],
  required_feature_patterns: [
    'NARRATIVE_STATE', 'MOMENTUM', 'BREADTH', 'LIQUIDITY',
  ],
  support_domains: [
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
    L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.RISK_OVERHANG_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
  ],
  legal_input_families: TOKEN_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'narrative_decay'),
      description: 'narrative decay signatures rising',
      triggered_by_domains: [L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN],
      transition_weight: 0.6,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'loud_but_narrow'),
      description: 'narrative loud but not broad',
      triggered_by_domains: [
        L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
        L8RegimeInputDomain.BREADTH_DOMAIN,
      ],
      ambiguity_weight: 0.7,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'CONTRADICTION_SENSITIVE',
    'NARRATIVE_SENSITIVE',
    'STRUCTURALLY_CONSERVATIVE',
  ],
  multiplier_derivation_defaults: [
    'NARRATIVE_SENSITIVITY_BIAS',
    'TREND_AMPLIFICATION_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 3,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Narrative participation driving visible environment change around the token.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const MATURE_TREND: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8TokenRegimeClass.MATURE_TREND, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8TokenRegimeClass.MATURE_TREND,
  template_version: '1.0.0',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_validation_patterns: [
    'MARKET_STRENGTH_VALIDATION',
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
  ],
  required_feature_patterns: [
    'SEQUENCE_STATE', 'MOMENTUM', 'LIQUIDITY',
  ],
  support_domains: [
    L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
  ],
  legal_input_families: TOKEN_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'late_stage_risk'),
      description: 'late-stage reflexivity risk increasing',
      triggered_by_domains: [
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
        L8RegimeInputDomain.VOLATILITY_DOMAIN,
      ],
      transition_weight: 0.65,
      forces_transitional_overlap: true,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'mature_with_distribution_hints'),
      description: 'mature trend mixed with distribution hints',
      triggered_by_domains: [L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN],
      ambiguity_weight: 0.55,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'STRUCTURALLY_CONSERVATIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'TREND_AMPLIFICATION_BIAS',
    'MOMENTUM_TRUST_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 4,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Token beyond discovery into a more established directional regime.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const BLOWOFF_REFLEXIVE_LATE_STAGE: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8TokenRegimeClass.BLOWOFF_REFLEXIVE_LATE_STAGE,
  template_version: '1.0.0',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_validation_patterns: [
    'MARKET_STRENGTH_VALIDATION',
    'LEVERAGE_POSTURE_VALIDATION',
  ],
  required_feature_patterns: [
    'MOMENTUM', 'CROWDING', 'VOLATILITY', 'SEQUENCE_STATE',
  ],
  support_domains: [
    L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.BREADTH_DOMAIN,
  ],
  legal_input_families: TOKEN_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'exhaustion_break'),
      description: 'reflexive exhaustion break',
      triggered_by_domains: [
        L8RegimeInputDomain.VOLATILITY_DOMAIN,
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
      ],
      transition_weight: 0.85,
      forces_transitional_overlap: true,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'late_stage_vs_continuation'),
      description: 'simultaneous continuation and late-stage exhaustion',
      triggered_by_domains: [
        L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
        L8RegimeInputDomain.VOLATILITY_DOMAIN,
      ],
      ambiguity_weight: 0.75,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'TRANSITION_SENSITIVE',
    'FRAGILITY_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'BREAKOUT_SKEPTICISM_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
    'LEVERAGE_CAUTION_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 5,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Extreme reflexivity with late-stage instability. Strongly narrows trust.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const DISTRIBUTION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8TokenRegimeClass.DISTRIBUTION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8TokenRegimeClass.DISTRIBUTION,
  template_version: '1.0.0',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_validation_patterns: [
    'DISTRIBUTION_VALIDATION',
  ],
  required_feature_patterns: [
    'ONCHAIN_FLOW', 'SEQUENCE_STATE', 'LIQUIDITY',
  ],
  support_domains: [
    L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
  ],
  legal_input_families: TOKEN_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'distribution_exhaustion'),
      description: 'distribution exhaustion with re-accumulation',
      triggered_by_domains: [
        L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'distribution_vs_accumulation'),
      description: 'distribution vs early accumulation tension',
      triggered_by_domains: [L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN],
      ambiguity_weight: 0.65,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'CONTRADICTION_SENSITIVE',
    'FRAGILITY_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'RISK_OVERHANG_PENALTY_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 6,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Selling / rotation / distribution behaviour dominates.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const POST_UNLOCK_DIGESTION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8TokenRegimeClass.POST_UNLOCK_DIGESTION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8TokenRegimeClass.POST_UNLOCK_DIGESTION,
  template_version: '1.0.0',
  applicable_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  required_validation_patterns: [
    'RISK_OVERHANG_VALIDATION',
  ],
  required_feature_patterns: [
    'OVERHANG', 'ONCHAIN_FLOW', 'LIQUIDITY', 'SEQUENCE_STATE',
  ],
  support_domains: [
    L8RegimeInputDomain.RISK_OVERHANG_DOMAIN,
    L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
  ],
  legal_input_families: TOKEN_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'overhang_digested'),
      description: 'unlock overhang digestion completing',
      triggered_by_domains: [
        L8RegimeInputDomain.RISK_OVERHANG_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'digestion_vs_distribution'),
      description: 'digestion vs distribution overlap',
      triggered_by_domains: [L8RegimeInputDomain.SEQUENCE_STATE_DOMAIN],
      ambiguity_weight: 0.6,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'STRUCTURALLY_CONSERVATIVE',
    'FRAGILITY_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'RISK_OVERHANG_PENALTY_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 7,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Post-unlock overhang digestion with partial incomplete re-accumulation.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

export const L8_TOKEN_REGIME_TEMPLATES: readonly L8RegimeTemplate[] = [
  LAUNCH_DISCOVERY,
  EARLY_ACCUMULATION,
  NARRATIVE_BREAKOUT,
  MATURE_TREND,
  BLOWOFF_REFLEXIVE_LATE_STAGE,
  DISTRIBUTION,
  POST_UNLOCK_DIGESTION,
];
