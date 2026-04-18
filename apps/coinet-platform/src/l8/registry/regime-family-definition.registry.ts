/**
 * L8.6 — Regime Family Definition Registry
 *
 * §8.6.7.1 / §8.6.7.2 — Canonical family-definition layer that sits on
 * top of the L8.2 `L8RegimeFamilyDescriptor` (coexistence law) and the
 * L8.5 input law. Names which legal input families, validation
 * patterns, and rollout phase each family uses by default.
 *
 * This is distinct from the L8.2 `L8RegimeFamilyRegistry` (which
 * remains the scope/coexistence source) and coexists with it.
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import {
  L8MacroRegimeClass,
  L8CryptoStructureRegimeClass,
  L8TokenRegimeClass,
  L8EcosystemRegimeClass,
  ALL_L8_MACRO_REGIME_CLASSES,
  ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES,
  ALL_L8_TOKEN_REGIME_CLASSES,
  ALL_L8_ECOSYSTEM_REGIME_CLASSES,
} from '../contracts/regime-class';
import { L8RegimeInputFamily } from '../contracts/regime-input-family';
import type { L8RegimeFamilyDefinition } from '../contracts/regime-family-definition';
import { L8RegimeRolloutPhase } from '../contracts/regime-rollout-phase';

const MACRO_FAMILY: L8RegimeFamilyDefinition = {
  family: L8RegimeFamily.MACRO,
  description:
    'Broadest environmental conditioning family — risk-on, risk-off, ' +
    'transitional, and choppy macro states.',
  legal_scope_types: ['MARKET', 'SECTOR', 'ASSET'],
  legal_input_families: [
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
  ],
  legal_validation_patterns: [
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    'MARKET_STRENGTH_VALIDATION',
  ],
  member_regime_classes: ALL_L8_MACRO_REGIME_CLASSES as
    readonly L8MacroRegimeClass[],
  default_confidence_posture: [
    'STRUCTURALLY_CONSERVATIVE',
    'BREADTH_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  default_multiplier_posture: [
    'TREND_AMPLIFICATION_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_1_FOUNDATIONAL,
};

const CRYPTO_STRUCTURE_FAMILY: L8RegimeFamilyDefinition = {
  family: L8RegimeFamily.CRYPTO_STRUCTURE,
  description:
    'Spot-led, leverage-led, deleveraging, and thin-liquidity fragility ' +
    'postures that distinguish healthy from euphoric structure.',
  legal_scope_types: ['MARKET', 'CHAIN', 'ECOSYSTEM', 'ASSET', 'TOKEN'],
  legal_input_families: [
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
  ],
  legal_validation_patterns: [
    'MARKET_STRENGTH_VALIDATION',
    'LIQUIDITY_HEALTH_VALIDATION',
    'LEVERAGE_POSTURE_VALIDATION',
  ],
  member_regime_classes: ALL_L8_CRYPTO_STRUCTURE_REGIME_CLASSES as
    readonly L8CryptoStructureRegimeClass[],
  default_confidence_posture: [
    'STRUCTURALLY_CONSERVATIVE',
    'LIQUIDITY_SENSITIVE',
    'FRAGILITY_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  default_multiplier_posture: [
    'LEVERAGE_CAUTION_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
    'LIQUIDITY_FRAGILITY_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_2_STRUCTURAL,
};

const TOKEN_FAMILY: L8RegimeFamilyDefinition = {
  family: L8RegimeFamily.TOKEN_SPECIFIC,
  description:
    'Token-local lifecycle and structural environment — launch, ' +
    'accumulation, narrative breakout, mature trend, blowoff, distribution, ' +
    'post-unlock digestion.',
  legal_scope_types: ['ASSET', 'TOKEN', 'PROTOCOL'],
  legal_input_families: [
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
  ],
  legal_validation_patterns: [
    'ACCUMULATION_VALIDATION',
    'DISTRIBUTION_VALIDATION',
    'NARRATIVE_VALIDATION',
    'RISK_OVERHANG_VALIDATION',
    'MARKET_STRENGTH_VALIDATION',
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    'LEVERAGE_POSTURE_VALIDATION',
    'LIQUIDITY_HEALTH_VALIDATION',
  ],
  member_regime_classes: ALL_L8_TOKEN_REGIME_CLASSES as
    readonly L8TokenRegimeClass[],
  default_confidence_posture: [
    'STRUCTURALLY_CONSERVATIVE',
    'NARRATIVE_SENSITIVE',
    'FRAGILITY_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  default_multiplier_posture: [
    'TREND_AMPLIFICATION_BIAS',
    'NARRATIVE_SENSITIVITY_BIAS',
    'RISK_OVERHANG_PENALTY_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_3_TOKEN_LIFECYCLE,
};

const ECOSYSTEM_FAMILY: L8RegimeFamilyDefinition = {
  family: L8RegimeFamily.ECOSYSTEM,
  description:
    'Chain / sector / ecosystem posture — expansion, contraction, ' +
    'rotation, meme-mania, DeFi rerating, L2 attention shift.',
  legal_scope_types: [
    'CHAIN', 'ECOSYSTEM', 'SECTOR', 'NARRATIVE_CLUSTER', 'TOKEN',
  ],
  legal_input_families: [
    L8RegimeInputFamily.PROTOCOL_SUBSTANCE_FAMILY,
    L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
    L8RegimeInputFamily.NARRATIVE_STATE_FAMILY,
    L8RegimeInputFamily.L4_GRAPH_CONTEXT_FAMILY,
    L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
    L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
    L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
    L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
    L8RegimeInputFamily.L5_STORAGE_READ_FAMILY,
  ],
  legal_validation_patterns: [
    'ECOSYSTEM_RELATIONAL_VALIDATION',
    'NARRATIVE_VALIDATION',
    'PROTOCOL_SUBSTANCE_VALIDATION',
  ],
  member_regime_classes: ALL_L8_ECOSYSTEM_REGIME_CLASSES as
    readonly L8EcosystemRegimeClass[],
  default_confidence_posture: [
    'BREADTH_SENSITIVE',
    'NARRATIVE_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
  ],
  default_multiplier_posture: [
    'NARRATIVE_SENSITIVITY_BIAS',
    'TREND_AMPLIFICATION_BIAS',
  ],
  rollout_phase: L8RegimeRolloutPhase.PHASE_4_ECOSYSTEM,
};

export const L8_REGIME_FAMILY_DEFINITIONS:
  readonly L8RegimeFamilyDefinition[] = [
    MACRO_FAMILY, CRYPTO_STRUCTURE_FAMILY, TOKEN_FAMILY, ECOSYSTEM_FAMILY,
  ];

export class L8RegimeFamilyDefinitionRegistry {
  private readonly byFamily: Map<L8RegimeFamily, L8RegimeFamilyDefinition>;

  constructor(
    definitions: readonly L8RegimeFamilyDefinition[] =
      L8_REGIME_FAMILY_DEFINITIONS,
  ) {
    this.byFamily = new Map(definitions.map(d => [d.family, d]));
  }

  list(): readonly L8RegimeFamilyDefinition[] {
    return Array.from(this.byFamily.values());
  }

  get(family: L8RegimeFamily): L8RegimeFamilyDefinition | undefined {
    return this.byFamily.get(family);
  }

  isRegistered(value: string): boolean {
    return this.byFamily.has(value as L8RegimeFamily);
  }
}

const defaultDefinitionRegistry = new L8RegimeFamilyDefinitionRegistry();

export function getDefaultL8RegimeFamilyDefinitionRegistry():
  L8RegimeFamilyDefinitionRegistry {
  return defaultDefinitionRegistry;
}
