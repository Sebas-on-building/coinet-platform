/**
 * L8.7 — Regime Multiplier Policy
 *
 * §8.7.5 / §8.7.6 / §8.7.8 — Multipliers are governed interpretive
 * objects. They condition how later layers should interpret validated
 * truths; they do not set final verdicts. This policy defines:
 *
 *   §8.7.5.5 — per-template default multiplier posture
 *   §8.7.8.3 — narrowing-reason enumeration
 *   §8.7.6.4 — the structural detector for score-shaped multipliers
 *              (on top of the L8.3 structural detector, which is reused).
 */

import type {
  L8RegimeMultiplierDimensions,
} from './regime-multiplier-profile.contract';
import { L8_MULTIPLIER_MIN, L8_MULTIPLIER_MAX }
  from './regime-multiplier-profile.contract';
import type { L8RegimeClass } from './regime-class';
import {
  L8CryptoStructureRegimeClass, L8MacroRegimeClass,
  L8TokenRegimeClass, L8EcosystemRegimeClass,
} from './regime-class';

/**
 * §8.7.8.3 — Narrowing reasons. A narrowed multiplier profile must
 * carry at least one of these codes to explain what narrowed it.
 */
export enum L8RegimeMultiplierNarrowingReason {
  NARROWED_BY_RESTRICTION = 'NARROWED_BY_RESTRICTION',
  NARROWED_BY_CONTRADICTION = 'NARROWED_BY_CONTRADICTION',
  NARROWED_BY_TRANSITION = 'NARROWED_BY_TRANSITION',
  NARROWED_BY_AMBIGUITY = 'NARROWED_BY_AMBIGUITY',
  NARROWED_BY_STALENESS = 'NARROWED_BY_STALENESS',
  NARROWED_BY_DEGRADATION = 'NARROWED_BY_DEGRADATION',
}

export const ALL_L8_REGIME_MULTIPLIER_NARROWING_REASONS:
  readonly L8RegimeMultiplierNarrowingReason[] =
    Object.values(L8RegimeMultiplierNarrowingReason);

/**
 * §8.7.5.5 — Default multiplier posture per regime class. Values are
 * deliberately bounded and shaped to express interpretive tilt, not
 * final verdicts. All templates that do not appear here fall back to
 * neutral posture (1.0 across the board).
 */
export const L8_REGIME_DEFAULT_MULTIPLIER_POSTURE:
  Partial<Record<L8RegimeClass, L8RegimeMultiplierDimensions>> = {
    // ------- Macro family -------
    [L8MacroRegimeClass.RISK_ON]: {
      trend_amplification: 1.2,
      momentum_trust_multiplier: 1.15,
      breakout_skepticism_multiplier: 0.9,
      leverage_risk_multiplier: 1.0,
      liquidity_fragility_multiplier: 0.9,
      narrative_sensitivity_multiplier: 1.1,
      risk_overhang_sensitivity_multiplier: 0.9,
    },
    [L8MacroRegimeClass.RISK_OFF]: {
      trend_amplification: 0.85,
      momentum_trust_multiplier: 0.85,
      breakout_skepticism_multiplier: 1.2,
      leverage_risk_multiplier: 1.25,
      liquidity_fragility_multiplier: 1.3,
      narrative_sensitivity_multiplier: 0.9,
      risk_overhang_sensitivity_multiplier: 1.25,
    },
    [L8MacroRegimeClass.TRANSITION]: {
      trend_amplification: 0.9,
      momentum_trust_multiplier: 0.9,
      breakout_skepticism_multiplier: 1.15,
      leverage_risk_multiplier: 1.1,
      liquidity_fragility_multiplier: 1.1,
      narrative_sensitivity_multiplier: 1.0,
      risk_overhang_sensitivity_multiplier: 1.1,
    },
    [L8MacroRegimeClass.CHOP]: {
      trend_amplification: 0.8,
      momentum_trust_multiplier: 0.85,
      breakout_skepticism_multiplier: 1.25,
      leverage_risk_multiplier: 1.05,
      liquidity_fragility_multiplier: 1.1,
      narrative_sensitivity_multiplier: 0.95,
      risk_overhang_sensitivity_multiplier: 1.05,
    },

    // ------- Crypto-structure family -------
    [L8CryptoStructureRegimeClass.SPOT_LED_EXPANSION]: {
      trend_amplification: 1.2,
      momentum_trust_multiplier: 1.25,
      breakout_skepticism_multiplier: 0.85,
      leverage_risk_multiplier: 1.0,
      liquidity_fragility_multiplier: 0.95,
      narrative_sensitivity_multiplier: 1.05,
      risk_overhang_sensitivity_multiplier: 0.9,
    },
    [L8CryptoStructureRegimeClass.LEVERAGE_LED_EXPANSION]: {
      trend_amplification: 1.05,
      momentum_trust_multiplier: 0.9,
      breakout_skepticism_multiplier: 1.2,
      leverage_risk_multiplier: 1.35,
      liquidity_fragility_multiplier: 1.15,
      narrative_sensitivity_multiplier: 1.0,
      risk_overhang_sensitivity_multiplier: 1.15,
    },
    [L8CryptoStructureRegimeClass.DELEVERAGING]: {
      trend_amplification: 0.85,
      momentum_trust_multiplier: 0.85,
      breakout_skepticism_multiplier: 1.25,
      leverage_risk_multiplier: 1.3,
      liquidity_fragility_multiplier: 1.25,
      narrative_sensitivity_multiplier: 0.9,
      risk_overhang_sensitivity_multiplier: 1.3,
    },
    [L8CryptoStructureRegimeClass.THIN_LIQUIDITY_FRAGILITY]: {
      trend_amplification: 0.85,
      momentum_trust_multiplier: 0.85,
      breakout_skepticism_multiplier: 1.25,
      leverage_risk_multiplier: 1.15,
      liquidity_fragility_multiplier: 1.4,
      narrative_sensitivity_multiplier: 0.85,
      risk_overhang_sensitivity_multiplier: 1.2,
    },

    // ------- Token family (subset, §8.7.5.5 exemplars) -------
    [L8TokenRegimeClass.POST_UNLOCK_DIGESTION]: {
      trend_amplification: 0.85,
      momentum_trust_multiplier: 0.85,
      breakout_skepticism_multiplier: 1.15,
      leverage_risk_multiplier: 1.05,
      liquidity_fragility_multiplier: 1.1,
      narrative_sensitivity_multiplier: 0.95,
      risk_overhang_sensitivity_multiplier: 1.35,
    },
    [L8TokenRegimeClass.MATURE_TREND]: {
      trend_amplification: 1.15,
      momentum_trust_multiplier: 1.1,
      breakout_skepticism_multiplier: 0.95,
      leverage_risk_multiplier: 1.0,
      liquidity_fragility_multiplier: 0.95,
      narrative_sensitivity_multiplier: 1.0,
      risk_overhang_sensitivity_multiplier: 1.0,
    },

    // ------- Ecosystem family (exemplar) -------
    [L8EcosystemRegimeClass.MEMECOIN_MANIA]: {
      trend_amplification: 1.1,
      momentum_trust_multiplier: 0.95,
      breakout_skepticism_multiplier: 1.2,
      leverage_risk_multiplier: 1.1,
      liquidity_fragility_multiplier: 1.3,
      narrative_sensitivity_multiplier: 1.25,
      risk_overhang_sensitivity_multiplier: 1.1,
    },
  };

/** Neutral posture returned for templates with no explicit default. */
export const L8_REGIME_NEUTRAL_MULTIPLIER_POSTURE:
  L8RegimeMultiplierDimensions = {
    trend_amplification: 1.0,
    momentum_trust_multiplier: 1.0,
    breakout_skepticism_multiplier: 1.0,
    leverage_risk_multiplier: 1.0,
    liquidity_fragility_multiplier: 1.0,
    narrative_sensitivity_multiplier: 1.0,
    risk_overhang_sensitivity_multiplier: 1.0,
  };

export function resolveL8DefaultMultiplierPosture(
  regime: L8RegimeClass,
): L8RegimeMultiplierDimensions {
  const out = L8_REGIME_DEFAULT_MULTIPLIER_POSTURE[regime];
  return out ?? L8_REGIME_NEUTRAL_MULTIPLIER_POSTURE;
}

/**
 * §8.7.6.4 — Extra score-shape detector used by the L8.7 policy
 * validator. It is stricter than the L8.3 detector: it flags profiles
 * where every dimension is monotonically biased in one direction (all
 * > 1.1 or all < 0.9) without at least one non-aligned dimension,
 * because a uniform direction = stealth single-score.
 */
export function multiplierIsUniformlyDirectional(
  d: L8RegimeMultiplierDimensions,
): boolean {
  const vs = [
    d.trend_amplification,
    d.momentum_trust_multiplier,
    d.breakout_skepticism_multiplier,
    d.leverage_risk_multiplier,
    d.liquidity_fragility_multiplier,
    d.narrative_sensitivity_multiplier,
    d.risk_overhang_sensitivity_multiplier,
  ];
  if (vs.some(v => !Number.isFinite(v) || v < L8_MULTIPLIER_MIN || v > L8_MULTIPLIER_MAX)) {
    return true;
  }
  const allHigh = vs.every(v => v > 1.1);
  const allLow = vs.every(v => v < 0.9);
  return allHigh || allLow;
}

/**
 * §8.7.6.2 — Multiplier-rights bounds. Narrowing must strictly move the
 * observed dimension value toward 1.0 (neutral). A narrowed profile
 * whose values are further from 1.0 than the default is illegal.
 */
export function multiplierValueIsMoreNeutralThan(
  narrowed: number, defaultValue: number,
): boolean {
  const nd = Math.abs(narrowed - 1.0);
  const dd = Math.abs(defaultValue - 1.0);
  return nd <= dd + 1e-9;
}

export function multiplierProfileRespectsNarrowing(
  narrowed: L8RegimeMultiplierDimensions,
  defaults: L8RegimeMultiplierDimensions,
): boolean {
  const keys: (keyof L8RegimeMultiplierDimensions)[] = [
    'trend_amplification',
    'momentum_trust_multiplier',
    'breakout_skepticism_multiplier',
    'leverage_risk_multiplier',
    'liquidity_fragility_multiplier',
    'narrative_sensitivity_multiplier',
    'risk_overhang_sensitivity_multiplier',
  ];
  return keys.every(k =>
    multiplierValueIsMoreNeutralThan(narrowed[k], defaults[k]),
  );
}

/**
 * §8.7.3.5 — Policy version.
 */
export const L8_REGIME_MULTIPLIER_POLICY_VERSION =
  'l8.7-multiplier-policy-v1';
