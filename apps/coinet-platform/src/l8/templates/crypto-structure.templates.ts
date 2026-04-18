/**
 * L8.6 — Crypto-Structure Regime Templates
 *
 * §8.6.4.4 – §8.6.4.7 — First production crypto-structure templates:
 *   CRYPTO_SPOT_LED_EXPANSION@v1, CRYPTO_LEVERAGE_LED_EXPANSION@v1,
 *   CRYPTO_DELEVERAGING@v1, CRYPTO_THIN_LIQUIDITY_FRAGILITY@v1.
 *
 * Crypto structure is `PHASE_2_STRUCTURAL`.
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import { L8CryptoStructureRegimeClass } from '../contracts/regime-class';
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

const FAMILY = L8RegimeFamily.CRYPTO_STRUCTURE;
const SIG_PREFIX = familyPrefixForSignatures(FAMILY);

const CRYPTO_INPUT_FAMILIES: readonly L8RegimeInputFamily[] = [
  L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
  L8RegimeInputFamily.VOLATILITY_FAMILY,
  L8RegimeInputFamily.LIQUIDITY_STRUCTURE_FAMILY,
  L8RegimeInputFamily.DERIVATIVES_STRUCTURE_FAMILY,
  L8RegimeInputFamily.SPOT_PERP_RELATION_FAMILY,
  L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
  L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
  L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
  L8RegimeInputFamily.L5_STORAGE_READ_FAMILY,
];

const SPOT_LED_EXPANSION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
  required_validation_patterns: [
    'MARKET_STRENGTH_VALIDATION',
    'LIQUIDITY_HEALTH_VALIDATION',
  ],
  required_feature_patterns: [
    'MOMENTUM', 'SPOT_PERP_RELATION', 'LIQUIDITY', 'BASIS_FUNDING',
  ],
  support_domains: [
    L8RegimeInputDomain.SPOT_PERP_RELATION_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.BREADTH_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
  ],
  legal_input_families: CRYPTO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'crowding_acceleration'),
      description: 'derivatives crowding acceleration',
      triggered_by_domains: [
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
      ],
      transition_weight: 0.6,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'funding_distortion'),
      description: 'basis / funding distortion growth',
      triggered_by_domains: [
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'liquidity_weakening'),
      description: 'liquidity deteriorating beneath rally',
      triggered_by_domains: [L8RegimeInputDomain.LIQUIDITY_DOMAIN],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'spot_vs_perp_mixed'),
      description: 'mixed spot-led and leverage-led signals',
      triggered_by_domains: [
        L8RegimeInputDomain.SPOT_PERP_RELATION_DOMAIN,
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
      ],
      ambiguity_weight: 0.6,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'STRUCTURALLY_CONSERVATIVE',
    'LIQUIDITY_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'TREND_AMPLIFICATION_BIAS',
    'MOMENTUM_TRUST_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_2_STRUCTURAL,
  rollout_priority: 1,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Expansion supported by healthy spot participation and structural demand.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const LEVERAGE_LED_EXPANSION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
  required_validation_patterns: [
    'LEVERAGE_POSTURE_VALIDATION',
    'MARKET_STRENGTH_VALIDATION',
  ],
  required_feature_patterns: [
    'CROWDING', 'BASIS_FUNDING', 'SPOT_PERP_RELATION', 'MOMENTUM',
  ],
  support_domains: [
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
    L8RegimeInputDomain.SPOT_PERP_RELATION_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
  ],
  legal_input_families: CRYPTO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'leverage_unwind_risk'),
      description: 'leverage unwind probability rising',
      triggered_by_domains: [
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
      ],
      transition_weight: 0.75,
      forces_transitional_overlap: true,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'funding_flip'),
      description: 'funding regime flip',
      triggered_by_domains: [
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
      ],
      transition_weight: 0.65,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'crowded_with_fragile_liquidity'),
      description: 'crowding dominant with fragile liquidity',
      triggered_by_domains: [
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      ambiguity_weight: 0.7,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'TRANSITION_SENSITIVE',
    'FRAGILITY_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'LEVERAGE_CAUTION_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_2_STRUCTURAL,
  rollout_priority: 2,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Expansion driven disproportionately by leverage and crowding. ' +
    'High transition sensitivity by default.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const DELEVERAGING: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8CryptoStructureRegimeClass.DELEVERAGING, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8CryptoStructureRegimeClass.DELEVERAGING,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
  required_validation_patterns: [
    'LEVERAGE_POSTURE_VALIDATION',
  ],
  required_feature_patterns: [
    'CROWDING', 'BASIS_FUNDING', 'LIQUIDITY',
  ],
  support_domains: [
    L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.SPOT_PERP_RELATION_DOMAIN,
    L8RegimeInputDomain.BREADTH_DOMAIN,
  ],
  legal_input_families: CRYPTO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'spot_reaccumulation'),
      description: 'healthy spot-led reaccumulation emerging',
      triggered_by_domains: [
        L8RegimeInputDomain.SPOT_PERP_RELATION_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'deleveraging_exhaustion'),
      description: 'unwind exhaustion returning to balance',
      triggered_by_domains: [L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'mixed_unwind_vs_recovery'),
      description: 'continued unwind mixed with early recovery',
      triggered_by_domains: [
        L8RegimeInputDomain.DERIVATIVES_STRUCTURE_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      ambiguity_weight: 0.6,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'CONTRADICTION_SENSITIVE',
    'FRAGILITY_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'LEVERAGE_CAUTION_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_2_STRUCTURAL,
  rollout_priority: 3,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Dominant leverage unwind and crowding collapse with contraction of ' +
    'aggressive positioning.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const THIN_LIQUIDITY_FRAGILITY: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY,
  template_version: '1.0.0',
  applicable_scope_types: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
  required_validation_patterns: [
    'LIQUIDITY_HEALTH_VALIDATION',
  ],
  required_feature_patterns: [
    'LIQUIDITY', 'VOLATILITY', 'CROWDING',
  ],
  support_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.BREADTH_DOMAIN,
    L8RegimeInputDomain.SPOT_PERP_RELATION_DOMAIN,
  ],
  legal_input_families: CRYPTO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'depth_recovery'),
      description: 'liquidity depth recovering',
      triggered_by_domains: [L8RegimeInputDomain.LIQUIDITY_DOMAIN],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'fragile_but_narrative_strong'),
      description: 'fragile structure masked by narrative momentum',
      triggered_by_domains: [
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
        L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
      ],
      ambiguity_weight: 0.65,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'FRAGILITY_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
    'LIQUIDITY_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'LIQUIDITY_FRAGILITY_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_2_STRUCTURAL,
  rollout_priority: 4,
  template_state: L8RegimeTemplateState.PRODUCTION_ENABLED,
  description:
    'Structurally weak because liquidity is too thin to trust surface ' +
    'moves naively. Caps breakout trust.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

export const L8_CRYPTO_STRUCTURE_REGIME_TEMPLATES:
  readonly L8RegimeTemplate[] = [
    SPOT_LED_EXPANSION, LEVERAGE_LED_EXPANSION,
    DELEVERAGING, THIN_LIQUIDITY_FRAGILITY,
  ];
