/**
 * L8.6 — Macro Regime Templates
 *
 * §8.6.4.1 – §8.6.4.3 — First production macro templates:
 *   MACRO_RISK_ON@v1, MACRO_RISK_OFF@v1, MACRO_CHOP@v1, MACRO_TRANSITION@v1.
 *
 * Macro is `PHASE_1_FOUNDATIONAL` and rolls out first (§8.6.6.1).
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import { L8MacroRegimeClass } from '../contracts/regime-class';
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

const FAMILY = L8RegimeFamily.MACRO;
const SIG_PREFIX = familyPrefixForSignatures(FAMILY);
const MACRO_INPUT_FAMILIES: readonly L8RegimeInputFamily[] = [
  L8RegimeInputFamily.BREADTH_FAMILY,
  L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
  L8RegimeInputFamily.VOLATILITY_FAMILY,
  L8RegimeInputFamily.LIQUIDITY_STRUCTURE_FAMILY,
  L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
  L8RegimeInputFamily.NARRATIVE_STATE_FAMILY,
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
  L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
  L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
  L8RegimeInputFamily.L5_STORAGE_READ_FAMILY,
];

const MACRO_RISK_ON: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8MacroRegimeClass.RISK_ON, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8MacroRegimeClass.RISK_ON,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'SECTOR', 'ASSET'],
  required_validation_patterns: [
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    'MARKET_STRENGTH_VALIDATION',
  ],
  required_feature_patterns: [
    'BREADTH', 'STABLECOIN_FLOW', 'LIQUIDITY', 'VOLATILITY',
  ],
  support_domains: [
    L8RegimeInputDomain.BREADTH_DOMAIN,
    L8RegimeInputDomain.STABLECOIN_FLOW_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
    L8RegimeInputDomain.RISK_OVERHANG_DOMAIN,
  ],
  legal_input_families: MACRO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'breadth_deterioration'),
      description: 'breadth deterioration',
      triggered_by_domains: [L8RegimeInputDomain.BREADTH_DOMAIN],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'volatility_escalation'),
      description: 'volatility escalation',
      triggered_by_domains: [L8RegimeInputDomain.VOLATILITY_DOMAIN],
      transition_weight: 0.45,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'contradiction_accumulation'),
      description: 'L7 contradiction accumulation',
      triggered_by_domains: [L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN],
      transition_weight: 0.6,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'stablecoin_flattening'),
      description: 'stablecoin growth flattening',
      triggered_by_domains: [L8RegimeInputDomain.STABLECOIN_FLOW_DOMAIN],
      transition_weight: 0.4,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'risk_on_with_chop'),
      description: 'simultaneous risk-on and chop support',
      triggered_by_domains: [
        L8RegimeInputDomain.BREADTH_DOMAIN,
        L8RegimeInputDomain.VOLATILITY_DOMAIN,
      ],
      ambiguity_weight: 0.65,
      blocks_clean_single: true,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'breadth_vs_liquidity'),
      description: 'breadth positive but liquidity weak',
      triggered_by_domains: [
        L8RegimeInputDomain.BREADTH_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      ambiguity_weight: 0.55,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'BREADTH_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
    'STRUCTURALLY_CONSERVATIVE',
  ],
  multiplier_derivation_defaults: [
    'TREND_AMPLIFICATION_BIAS',
    'MOMENTUM_TRUST_BIAS',
    'LEVERAGE_CAUTION_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
  rollout_priority: 1,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Broad risk-on environmental regime. Supported by breadth, stablecoin ' +
    'growth, liquidity, and governed validation surfaces.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const MACRO_RISK_OFF: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8MacroRegimeClass.RISK_OFF, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8MacroRegimeClass.RISK_OFF,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'SECTOR', 'ASSET'],
  required_validation_patterns: [
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    'MARKET_STRENGTH_VALIDATION',
  ],
  required_feature_patterns: [
    'BREADTH', 'VOLATILITY', 'LIQUIDITY', 'STABLECOIN_FLOW',
  ],
  support_domains: [
    L8RegimeInputDomain.BREADTH_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.STABLECOIN_FLOW_DOMAIN,
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
  ],
  legal_input_families: MACRO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'breadth_recovery'),
      description: 'breadth recovering with contradiction easing',
      triggered_by_domains: [
        L8RegimeInputDomain.BREADTH_DOMAIN,
        L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
      ],
      transition_weight: 0.6,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'liquidity_healing'),
      description: 'liquidity conditions healing',
      triggered_by_domains: [L8RegimeInputDomain.LIQUIDITY_DOMAIN],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'volatility_compression'),
      description: 'constructive volatility compression',
      triggered_by_domains: [L8RegimeInputDomain.VOLATILITY_DOMAIN],
      transition_weight: 0.4,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'risk_off_mixed_breadth'),
      description: 'weakness with partial breadth resilience',
      triggered_by_domains: [
        L8RegimeInputDomain.BREADTH_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      ambiguity_weight: 0.55,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'STRUCTURALLY_CONSERVATIVE',
    'CONTRADICTION_SENSITIVE',
    'LIQUIDITY_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'BREAKOUT_SKEPTICISM_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
    'RISK_OVERHANG_PENALTY_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
  rollout_priority: 2,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Broad risk-off environmental regime. Supported by breadth decay, ' +
    'fragility signals, and defensive validation backdrop.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const MACRO_TRANSITION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8MacroRegimeClass.TRANSITION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8MacroRegimeClass.TRANSITION,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'SECTOR', 'ASSET'],
  required_validation_patterns: [
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
  ],
  required_feature_patterns: [
    'BREADTH', 'VOLATILITY', 'LIQUIDITY',
  ],
  support_domains: [
    L8RegimeInputDomain.BREADTH_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
  ],
  legal_input_families: MACRO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'regime_flip_candidate'),
      description: 'macro environment flipping between broad states',
      triggered_by_domains: [
        L8RegimeInputDomain.BREADTH_DOMAIN,
        L8RegimeInputDomain.VOLATILITY_DOMAIN,
      ],
      transition_weight: 0.8,
      forces_transitional_overlap: true,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'mixed_transition_signals'),
      description: 'simultaneous recovery and deterioration signals',
      triggered_by_domains: [
        L8RegimeInputDomain.BREADTH_DOMAIN,
        L8RegimeInputDomain.VOLATILITY_DOMAIN,
      ],
      ambiguity_weight: 0.7,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'TRANSITION_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'BREAKOUT_SKEPTICISM_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
  rollout_priority: 3,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Macro environment in transition. May not be treated as stable.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const MACRO_CHOP: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8MacroRegimeClass.CHOP, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8MacroRegimeClass.CHOP,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'SECTOR', 'ASSET'],
  required_validation_patterns: [
    'MARKET_STRENGTH_VALIDATION',
  ],
  required_feature_patterns: [
    'BREADTH', 'VOLATILITY',
  ],
  support_domains: [
    L8RegimeInputDomain.BREADTH_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
  ],
  legal_input_families: MACRO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'chop_resolution'),
      description: 'directional cleanliness returning',
      triggered_by_domains: [L8RegimeInputDomain.BREADTH_DOMAIN],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'chop_misread_as_trend'),
      description: 'chop frequently masquerades as early trend',
      triggered_by_domains: [
        L8RegimeInputDomain.BREADTH_DOMAIN,
        L8RegimeInputDomain.VOLATILITY_DOMAIN,
      ],
      ambiguity_weight: 0.75,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'STRUCTURALLY_CONSERVATIVE',
    'TRANSITION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'BREAKOUT_SKEPTICISM_BIAS',
    'MOMENTUM_TRUST_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
  rollout_priority: 4,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Choppy macro environment with high false follow-through risk.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

export const L8_MACRO_REGIME_TEMPLATES: readonly L8RegimeTemplate[] = [
  MACRO_RISK_ON, MACRO_RISK_OFF, MACRO_TRANSITION, MACRO_CHOP,
];
