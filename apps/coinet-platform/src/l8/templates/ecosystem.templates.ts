/**
 * L8.6 — Ecosystem Regime Templates
 *
 * §8.6.4.15 – §8.6.4.20 — First production ecosystem templates:
 *   ECO_CHAIN_EXPANSION@v1, ECO_CHAIN_CONTRACTION@v1,
 *   ECO_SECTOR_ROTATION@v1, ECO_MEMECOIN_MANIA@v1,
 *   ECO_DEFI_RERATING@v1, ECO_L2_ATTENTION_SHIFT@v1.
 *
 * Ecosystem is `PHASE_4_ECOSYSTEM`. Some templates roll out in
 * certification mode until ecosystem context is ready (§8.6.6.5).
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import { L8EcosystemRegimeClass } from '../contracts/regime-class';
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

const FAMILY = L8RegimeFamily.ECOSYSTEM;
const SIG_PREFIX = familyPrefixForSignatures(FAMILY);

const ECO_INPUT_FAMILIES: readonly L8RegimeInputFamily[] = [
  L8RegimeInputFamily.PROTOCOL_SUBSTANCE_FAMILY,
  L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
  L8RegimeInputFamily.NARRATIVE_STATE_FAMILY,
  L8RegimeInputFamily.L4_GRAPH_CONTEXT_FAMILY,
  L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
  L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
  L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
  L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
  L8RegimeInputFamily.L5_STORAGE_READ_FAMILY,
];

const PHASE = L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM;

const CHAIN_EXPANSION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8EcosystemRegimeClass.CHAIN_EXPANSION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8EcosystemRegimeClass.CHAIN_EXPANSION,
  template_version: '1.0.0',
  applicable_scope_types: ['CHAIN', 'ECOSYSTEM'],
  required_validation_patterns: [
    'ECOSYSTEM_RELATIONAL_VALIDATION',
    'PROTOCOL_SUBSTANCE_VALIDATION',
  ],
  required_feature_patterns: [
    'PROTOCOL_SUBSTANCE', 'ONCHAIN_FLOW',
  ],
  support_domains: [
    L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
    L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
  ],
  legal_input_families: ECO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'chain_expansion_fading'),
      description: 'chain expansion fading',
      triggered_by_domains: [
        L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
        L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'uneven_chain_expansion'),
      description: 'expansion uneven across sub-ecosystem',
      triggered_by_domains: [
        L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
      ],
      ambiguity_weight: 0.55,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'BREADTH_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'TREND_AMPLIFICATION_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 1,
  template_state: L8RegimeTemplateState.CERTIFICATION_ONLY,
  description:
    'A specific chain ecosystem broadening in activity, liquidity, attention.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const CHAIN_CONTRACTION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8EcosystemRegimeClass.CHAIN_CONTRACTION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8EcosystemRegimeClass.CHAIN_CONTRACTION,
  template_version: '1.0.0',
  applicable_scope_types: ['CHAIN', 'ECOSYSTEM'],
  required_validation_patterns: [
    'ECOSYSTEM_RELATIONAL_VALIDATION',
    'PROTOCOL_SUBSTANCE_VALIDATION',
  ],
  required_feature_patterns: [
    'PROTOCOL_SUBSTANCE', 'ONCHAIN_FLOW', 'LIQUIDITY',
  ],
  support_domains: [
    L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
    L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
  ],
  legal_input_families: ECO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'chain_recovery'),
      description: 'chain ecosystem recovery',
      triggered_by_domains: [
        L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
      ],
      transition_weight: 0.5,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'noisy_contraction'),
      description: 'contraction noisy vs one-off events',
      triggered_by_domains: [
        L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
      ],
      ambiguity_weight: 0.55,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'RISK_OVERHANG_PENALTY_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 2,
  template_state: L8RegimeTemplateState.CERTIFICATION_ONLY,
  description:
    'A chain ecosystem weakening in participation, activity, or capital.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const SECTOR_ROTATION: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8EcosystemRegimeClass.SECTOR_ROTATION, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8EcosystemRegimeClass.SECTOR_ROTATION,
  template_version: '1.0.0',
  applicable_scope_types: ['SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER'],
  required_validation_patterns: [
    'ECOSYSTEM_RELATIONAL_VALIDATION',
    'NARRATIVE_VALIDATION',
  ],
  required_feature_patterns: [
    'NARRATIVE_STATE', 'ONCHAIN_FLOW',
  ],
  support_domains: [
    L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
  ],
  legal_input_families: ECO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'rotation_exhaustion'),
      description: 'rotation energy exhausting',
      triggered_by_domains: [
        L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'narrow_rotation'),
      description: 'narrow rotation masquerading as broad',
      triggered_by_domains: [
        L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
        L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
      ],
      ambiguity_weight: 0.6,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'NARRATIVE_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'NARRATIVE_SENSITIVITY_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 3,
  template_state: L8RegimeTemplateState.CERTIFICATION_ONLY,
  description:
    'Capital / attention rotating across sectors materially.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const MEMECOIN_MANIA: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8EcosystemRegimeClass.MEMECOIN_MANIA, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8EcosystemRegimeClass.MEMECOIN_MANIA,
  template_version: '1.0.0',
  applicable_scope_types: [
    'SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER', 'TOKEN',
  ],
  required_validation_patterns: [
    'NARRATIVE_VALIDATION',
    'ECOSYSTEM_RELATIONAL_VALIDATION',
  ],
  required_feature_patterns: [
    'NARRATIVE_STATE', 'LIQUIDITY', 'VOLATILITY',
  ],
  support_domains: [
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
    L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
    L8RegimeInputDomain.VOLATILITY_DOMAIN,
  ],
  legal_input_families: ECO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'mania_fade'),
      description: 'meme mania attention fading',
      triggered_by_domains: [L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN],
      transition_weight: 0.65,
      forces_transitional_overlap: true,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'fragile_mania'),
      description: 'mania with fragile liquidity undercurrent',
      triggered_by_domains: [
        L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
        L8RegimeInputDomain.LIQUIDITY_DOMAIN,
      ],
      ambiguity_weight: 0.7,
      blocks_clean_single: true,
    },
  ],
  confidence_posture_defaults: [
    'FRAGILITY_SENSITIVE',
    'NARRATIVE_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'FRAGILITY_SENSITIVITY_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
    'NARRATIVE_SENSITIVITY_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 4,
  template_state: L8RegimeTemplateState.SHADOW_ONLY,
  description:
    'Speculative meme-driven attention dominating ecosystem interpretation.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const DEFI_RERATING: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8EcosystemRegimeClass.DEFI_RERATING, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8EcosystemRegimeClass.DEFI_RERATING,
  template_version: '1.0.0',
  applicable_scope_types: [
    'SECTOR', 'ECOSYSTEM', 'NARRATIVE_CLUSTER',
  ],
  required_validation_patterns: [
    'PROTOCOL_SUBSTANCE_VALIDATION',
    'ECOSYSTEM_RELATIONAL_VALIDATION',
  ],
  required_feature_patterns: [
    'PROTOCOL_SUBSTANCE', 'ONCHAIN_FLOW', 'NARRATIVE_STATE',
  ],
  support_domains: [
    L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.LIQUIDITY_DOMAIN,
  ],
  legal_input_families: ECO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'defi_rerating_stall'),
      description: 'DeFi rerating momentum stalling',
      triggered_by_domains: [
        L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'defi_mixed'),
      description: 'DeFi rerating mixed with sector rotation',
      triggered_by_domains: [
        L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
        L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
      ],
      ambiguity_weight: 0.6,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'BREADTH_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'TREND_AMPLIFICATION_BIAS',
    'NARRATIVE_SENSITIVITY_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 5,
  template_state: L8RegimeTemplateState.CERTIFICATION_ONLY,
  description:
    'DeFi-related assets and protocols being structurally rerated.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

const L2_ATTENTION_SHIFT: L8RegimeTemplate = {
  template_id: buildL8RegimeTemplateIdV6(
    FAMILY, L8EcosystemRegimeClass.L2_ATTENTION_SHIFT, '1.0.0'),
  regime_family: FAMILY,
  regime_class: L8EcosystemRegimeClass.L2_ATTENTION_SHIFT,
  template_version: '1.0.0',
  applicable_scope_types: ['CHAIN', 'ECOSYSTEM', 'NARRATIVE_CLUSTER'],
  required_validation_patterns: [
    'ECOSYSTEM_RELATIONAL_VALIDATION',
    'NARRATIVE_VALIDATION',
  ],
  required_feature_patterns: [
    'NARRATIVE_STATE', 'ONCHAIN_FLOW',
  ],
  support_domains: [
    L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
    L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
    L8RegimeInputDomain.VALIDATION_SUPPORT_DOMAIN,
  ],
  challenge_domains: [
    L8RegimeInputDomain.PROTOCOL_ACTIVITY_DOMAIN,
  ],
  legal_input_families: ECO_INPUT_FAMILIES,
  transition_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.TRANSITION, SIG_PREFIX, 'l2_attention_reverse'),
      description: 'L2 attention reversal',
      triggered_by_domains: [
        L8RegimeInputDomain.NARRATIVE_BREADTH_DOMAIN,
      ],
      transition_weight: 0.55,
      forces_transitional_overlap: false,
    },
  ],
  ambiguity_signatures: [
    {
      signature_id: buildL8RegimeSignatureId(
        L8RegimeSignatureClass.AMBIGUITY, SIG_PREFIX, 'partial_l2_shift'),
      description: 'partial L2 shift vs broad sector rotation',
      triggered_by_domains: [
        L8RegimeInputDomain.ECOSYSTEM_ROTATION_DOMAIN,
      ],
      ambiguity_weight: 0.55,
      blocks_clean_single: false,
    },
  ],
  confidence_posture_defaults: [
    'NARRATIVE_SENSITIVE',
  ],
  multiplier_derivation_defaults: [
    'NARRATIVE_SENSITIVITY_BIAS',
  ],
  rollout_phase: PHASE,
  rollout_priority: 6,
  template_state: L8RegimeTemplateState.CERTIFICATION_ONLY,
  description:
    'Attention / capital / narrative energy shifting across L2 ecosystems.',
  created_by: 'regime-engine',
  created_at: '2026-04-17T12:00:00Z',
};

export const L8_ECOSYSTEM_REGIME_TEMPLATES: readonly L8RegimeTemplate[] = [
  CHAIN_EXPANSION, CHAIN_CONTRACTION, SECTOR_ROTATION,
  MEMECOIN_MANIA, DEFI_RERATING, L2_ATTENTION_SHIFT,
];
