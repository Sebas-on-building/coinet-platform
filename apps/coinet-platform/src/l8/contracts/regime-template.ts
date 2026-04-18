/**
 * L8.6 — Regime Template Contract
 *
 * §8.6.3.1 — `RegimeTemplate` is the bridge between regime doctrine
 * (L8.2) and runtime classification (L8.4). Every regime class used in
 * runtime must be backed by a registered template; the runtime reads
 * support domains, challenge domains, transition signatures, ambiguity
 * signatures, confidence defaults, multiplier defaults, and rollout
 * phase from here rather than hard-coding them in engines.
 */

import type { L8RegimeFamily, L8RegimeScopeType } from './regime-family';
import type { L8RegimeClass } from './regime-class';
import type { L8RegimeInputDomain } from './regime-input-domain';
import type { L8RegimeInputFamily } from './regime-input-family';
import type {
  L8RegimeTransitionSignature,
  L8RegimeAmbiguitySignature,
} from './regime-signature';
import {
  L8RegimeRolloutPhase,
  L8RegimeTemplateState,
} from './regime-rollout-phase';

/**
 * §8.6.3.10 — Confidence posture defaults. Templates do not set final
 * confidence, only the posture that influences L8.4's confidence engine.
 */
export type L8RegimeConfidencePostureDefault =
  | 'STRUCTURALLY_CONSERVATIVE'
  | 'TRANSITION_SENSITIVE'
  | 'CONTRADICTION_SENSITIVE'
  | 'BREADTH_SENSITIVE'
  | 'LIQUIDITY_SENSITIVE'
  | 'NARRATIVE_SENSITIVE'
  | 'FRAGILITY_SENSITIVE';

export const ALL_L8_REGIME_CONFIDENCE_POSTURE_DEFAULTS:
  readonly L8RegimeConfidencePostureDefault[] = [
    'STRUCTURALLY_CONSERVATIVE',
    'TRANSITION_SENSITIVE',
    'CONTRADICTION_SENSITIVE',
    'BREADTH_SENSITIVE',
    'LIQUIDITY_SENSITIVE',
    'NARRATIVE_SENSITIVE',
    'FRAGILITY_SENSITIVE',
  ];

/**
 * §8.6.3.11 — Multiplier posture defaults. Templates declare default
 * narrowing bias; the multiplier engine translates posture into
 * dimension-level numbers.
 */
export type L8RegimeMultiplierPostureDefault =
  | 'TREND_AMPLIFICATION_BIAS'
  | 'BREAKOUT_SKEPTICISM_BIAS'
  | 'LEVERAGE_CAUTION_BIAS'
  | 'FRAGILITY_SENSITIVITY_BIAS'
  | 'NARRATIVE_SENSITIVITY_BIAS'
  | 'RISK_OVERHANG_PENALTY_BIAS'
  | 'MOMENTUM_TRUST_BIAS'
  | 'LIQUIDITY_FRAGILITY_BIAS';

export const ALL_L8_REGIME_MULTIPLIER_POSTURE_DEFAULTS:
  readonly L8RegimeMultiplierPostureDefault[] = [
    'TREND_AMPLIFICATION_BIAS',
    'BREAKOUT_SKEPTICISM_BIAS',
    'LEVERAGE_CAUTION_BIAS',
    'FRAGILITY_SENSITIVITY_BIAS',
    'NARRATIVE_SENSITIVITY_BIAS',
    'RISK_OVERHANG_PENALTY_BIAS',
    'MOMENTUM_TRUST_BIAS',
    'LIQUIDITY_FRAGILITY_BIAS',
  ];

/**
 * §8.6.3.4 — Validation patterns. Templates reference governed L7
 * validation families rather than raw strings so validators can reason
 * uniformly.
 */
export type L8RegimeValidationPattern =
  | 'ACCUMULATION_VALIDATION'
  | 'DISTRIBUTION_VALIDATION'
  | 'NARRATIVE_VALIDATION'
  | 'RISK_OVERHANG_VALIDATION'
  | 'CROSS_DOMAIN_ALIGNMENT_VALIDATION'
  | 'PROTOCOL_SUBSTANCE_VALIDATION'
  | 'MARKET_STRENGTH_VALIDATION'
  | 'ECOSYSTEM_RELATIONAL_VALIDATION'
  | 'LIQUIDITY_HEALTH_VALIDATION'
  | 'LEVERAGE_POSTURE_VALIDATION';

export const ALL_L8_REGIME_VALIDATION_PATTERNS:
  readonly L8RegimeValidationPattern[] = [
    'ACCUMULATION_VALIDATION',
    'DISTRIBUTION_VALIDATION',
    'NARRATIVE_VALIDATION',
    'RISK_OVERHANG_VALIDATION',
    'CROSS_DOMAIN_ALIGNMENT_VALIDATION',
    'PROTOCOL_SUBSTANCE_VALIDATION',
    'MARKET_STRENGTH_VALIDATION',
    'ECOSYSTEM_RELATIONAL_VALIDATION',
    'LIQUIDITY_HEALTH_VALIDATION',
    'LEVERAGE_POSTURE_VALIDATION',
  ];

/**
 * §8.6.3.5 — Feature patterns. Templates reference L6 feature families
 * that must be consumable for the template to classify.
 */
export type L8RegimeFeaturePattern =
  | 'MOMENTUM'
  | 'VOLATILITY'
  | 'LIQUIDITY'
  | 'CROWDING'
  | 'BASIS_FUNDING'
  | 'BREADTH'
  | 'PROTOCOL_SUBSTANCE'
  | 'SEQUENCE_STATE'
  | 'OVERHANG'
  | 'NARRATIVE_STATE'
  | 'SPOT_PERP_RELATION'
  | 'STABLECOIN_FLOW'
  | 'ONCHAIN_FLOW';

export const ALL_L8_REGIME_FEATURE_PATTERNS:
  readonly L8RegimeFeaturePattern[] = [
    'MOMENTUM',
    'VOLATILITY',
    'LIQUIDITY',
    'CROWDING',
    'BASIS_FUNDING',
    'BREADTH',
    'PROTOCOL_SUBSTANCE',
    'SEQUENCE_STATE',
    'OVERHANG',
    'NARRATIVE_STATE',
    'SPOT_PERP_RELATION',
    'STABLECOIN_FLOW',
    'ONCHAIN_FLOW',
  ];

/**
 * §8.6.3.1 — The full regime template contract.
 */
export interface L8RegimeTemplate {
  readonly template_id: string;
  readonly regime_family: L8RegimeFamily;
  readonly regime_class: L8RegimeClass;
  readonly template_version: string;

  // §8.6.3.1 — legal scope types
  readonly applicable_scope_types: readonly L8RegimeScopeType[];

  // §8.6.3.4 / §8.6.3.5 — required patterns
  readonly required_validation_patterns:
    readonly L8RegimeValidationPattern[];
  readonly required_feature_patterns:
    readonly L8RegimeFeaturePattern[];

  // §8.6.3.6 — support domains
  readonly support_domains: readonly L8RegimeInputDomain[];

  // §8.6.3.7 — challenge domains
  readonly challenge_domains: readonly L8RegimeInputDomain[];

  // §8.6.3.1 — legal lower-layer input families (consistency with L8.5)
  readonly legal_input_families: readonly L8RegimeInputFamily[];

  // §8.6.3.8 / §8.6.3.9 — signatures
  readonly transition_signatures: readonly L8RegimeTransitionSignature[];
  readonly ambiguity_signatures: readonly L8RegimeAmbiguitySignature[];

  // §8.6.3.10 / §8.6.3.11 — posture defaults
  readonly confidence_posture_defaults:
    readonly L8RegimeConfidencePostureDefault[];
  readonly multiplier_derivation_defaults:
    readonly L8RegimeMultiplierPostureDefault[];

  // §8.6.6.4 — rollout state
  readonly rollout_phase: L8RegimeRolloutPhase;
  readonly rollout_priority: number;
  readonly template_state: L8RegimeTemplateState;

  // §8.6.3.1 — human-readable + lineage
  readonly description: string;
  readonly created_by: string;
  readonly created_at: string;
}

/**
 * §8.6.8.3 — Deterministic template id builder. Named `_v6` because the
 * L8.2 subject module already exports a `buildL8RegimeTemplateId` for
 * subject-template ids.
 */
export function buildL8RegimeTemplateIdV6(
  family: L8RegimeFamily,
  regimeClass: L8RegimeClass,
  version: string,
): string {
  return `tpl.${family}.${regimeClass}@${version}`;
}

/**
 * Lowercase prefix used by signature ids built for this template.
 */
export function familyPrefixForSignatures(family: L8RegimeFamily): string {
  return family.toLowerCase();
}
