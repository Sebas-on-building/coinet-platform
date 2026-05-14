/**
 * L11.5 — Regime-Modifier Family Matrix (§11.5.10 / §11.5.11)
 *
 * Frozen registry of which L8 regime postures legally amplify,
 * discount, cap, floor, penalise, reduce-confidence, require
 * disclosure, or mark a score family as evidence-only. Pairs each
 * (family × regime) with the modifier type, strength bound, reason
 * codes, and the §11.5.11.2 hard-cap rules.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';
import {
  L11RegimeModifierType,
  L11RegimeModifierReasonCode,
} from './regime-modifier';

/**
 * Canonical L8-regime posture codes consumed by the regime-modifier
 * matrix. These are *names* of L8 surfaces; the engine validates
 * that a given regime ref carries the corresponding stable posture.
 */
export enum L11RegimePostureCode {
  SPOT_LED_EXPANSION = 'SPOT_LED_EXPANSION',
  LEVERAGE_LED_EXPANSION = 'LEVERAGE_LED_EXPANSION',
  THIN_LIQUIDITY_FRAGILITY = 'THIN_LIQUIDITY_FRAGILITY',
  RISK_OFF = 'RISK_OFF',
  CHOP = 'CHOP',
  POST_UNLOCK_DIGESTION = 'POST_UNLOCK_DIGESTION',
  HIGH_TRANSITION_RISK = 'HIGH_TRANSITION_RISK',
  STALE_OR_AMBIGUOUS_REGIME = 'STALE_OR_AMBIGUOUS_REGIME',
}

export const ALL_L11_REGIME_POSTURE_CODES:
  readonly L11RegimePostureCode[] =
  Object.values(L11RegimePostureCode);

export interface L11RegimeModifierMatrixEntry {
  readonly entry_id: string;
  readonly score_family: L11ScoreFamily;
  readonly regime_posture: L11RegimePostureCode;
  readonly modifier_type: L11RegimeModifierType;
  /** Recommended bounded strength in [0, 1]. */
  readonly recommended_strength: number;
  readonly reason_codes: readonly L11RegimeModifierReasonCode[];
  /** True if this entry expresses a §11.5.11.2 hard cap. */
  readonly is_hard_cap: boolean;
  /** Hard-cap band ceiling, if any. */
  readonly hard_cap_band?: L11ScoreBand;
  readonly description: string;
}

const E = (
  family: L11ScoreFamily,
  posture: L11RegimePostureCode,
  type: L11RegimeModifierType,
  strength: number,
  reason_codes: readonly L11RegimeModifierReasonCode[],
  description: string,
  opts: { hard_cap?: L11ScoreBand } = {},
): L11RegimeModifierMatrixEntry => ({
  entry_id: `l11m.matrix.${family}.${posture}.${type}`,
  score_family: family,
  regime_posture: posture,
  modifier_type: type,
  recommended_strength: strength,
  reason_codes,
  is_hard_cap: opts.hard_cap !== undefined,
  hard_cap_band: opts.hard_cap,
  description,
});

/**
 * §11.5.10 — Frozen production matrix entries. Each entry encodes
 * a single legal modifier path; engine choices that fall outside
 * this matrix produce `L11M_REGIME_MODIFIER_OUTSIDE_MATRIX`.
 */
export const L11_REGIME_MODIFIER_MATRIX:
  readonly L11RegimeModifierMatrixEntry[] = [
  // Opportunity
  E(L11ScoreFamily.OPPORTUNITY, L11RegimePostureCode.SPOT_LED_EXPANSION,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.4,
    [
      L11RegimeModifierReasonCode.REGIME_AMPLIFIES_VALIDATION,
      L11RegimeModifierReasonCode.REGIME_AMPLIFIES_STRUCTURE,
      L11RegimeModifierReasonCode.REGIME_AMPLIFIES_SEQUENCE,
    ],
    'spot-led expansion may amplify validation/structure/sequence components'),
  E(L11ScoreFamily.OPPORTUNITY, L11RegimePostureCode.LEVERAGE_LED_EXPANSION,
    L11RegimeModifierType.DISCOUNT_COMPONENT, 0.3,
    [
      L11RegimeModifierReasonCode.REGIME_DISCOUNTS_LEVERAGE_DRIVEN_STRENGTH,
      L11RegimeModifierReasonCode.REGIME_DISCLOSES_LATE_BREAKOUT_TIMING,
    ],
    'leverage-led expansion must discount price-strength opportunity'),
  E(L11ScoreFamily.OPPORTUNITY, L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY,
    L11RegimeModifierType.CAP_SCORE, 0.0,
    [
      L11RegimeModifierReasonCode.REGIME_CAPS_SCORE_DUE_TO_THIN_LIQUIDITY,
      L11RegimeModifierReasonCode.REGIME_DISCOUNTS_THIN_LIQUIDITY_BREAKOUT,
    ],
    'thin liquidity fragility hard-caps opportunity below VERY_HIGH',
    { hard_cap: L11ScoreBand.HIGH }),
  E(L11ScoreFamily.OPPORTUNITY, L11RegimePostureCode.RISK_OFF,
    L11RegimeModifierType.DISCOUNT_COMPONENT, 0.4,
    [L11RegimeModifierReasonCode.REGIME_DISCOUNTS_NARRATIVE_IN_RISK_OFF],
    'risk-off must discount narrative/flow opportunity'),
  E(L11ScoreFamily.OPPORTUNITY, L11RegimePostureCode.HIGH_TRANSITION_RISK,
    L11RegimeModifierType.CAP_SCORE, 0.0,
    [L11RegimeModifierReasonCode.REGIME_CAPS_SCORE_DUE_TO_HIGH_TRANSITION_RISK],
    'high transition risk hard-caps opportunity below VERY_HIGH',
    { hard_cap: L11ScoreBand.HIGH }),

  // Risk
  E(L11ScoreFamily.RISK, L11RegimePostureCode.LEVERAGE_LED_EXPANSION,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.45,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_LEVERAGE_RISK],
    'leverage-led expansion amplifies leverage crowding/invalidation risk'),
  E(L11ScoreFamily.RISK, L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.5,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_LIQUIDITY_FRAGILITY],
    'thin liquidity fragility amplifies dislocation/invalidation risk'),
  E(L11ScoreFamily.RISK, L11RegimePostureCode.RISK_OFF,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.4,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_DOWNSIDE_FRAGILITY],
    'risk-off amplifies downside fragility / invalidation sensitivity'),
  E(L11ScoreFamily.RISK, L11RegimePostureCode.SPOT_LED_EXPANSION,
    L11RegimeModifierType.DISCOUNT_COMPONENT, 0.2,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_STRUCTURE],
    'spot-led expansion may reduce structure-risk components only'),

  // Timing
  E(L11ScoreFamily.TIMING, L11RegimePostureCode.SPOT_LED_EXPANSION,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.3,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_SEQUENCE],
    'spot-led expansion may amplify timely expansion signals'),
  E(L11ScoreFamily.TIMING, L11RegimePostureCode.LEVERAGE_LED_EXPANSION,
    L11RegimeModifierType.DISCOUNT_COMPONENT, 0.4,
    [L11RegimeModifierReasonCode.REGIME_DISCLOSES_LATE_BREAKOUT_TIMING],
    'leverage-led expansion must discount late breakout timing'),
  E(L11ScoreFamily.TIMING, L11RegimePostureCode.CHOP,
    L11RegimeModifierType.CAP_SCORE, 0.0,
    [L11RegimeModifierReasonCode.REGIME_CAPS_SCORE_DUE_TO_HIGH_TRANSITION_RISK],
    'CHOP must cap timing unless sequence confidence is high',
    { hard_cap: L11ScoreBand.MEDIUM }),
  E(L11ScoreFamily.TIMING, L11RegimePostureCode.POST_UNLOCK_DIGESTION,
    L11RegimeModifierType.REQUIRE_DISCLOSURE, 0.0,
    [L11RegimeModifierReasonCode.REGIME_REQUIRES_POST_UNLOCK_DIGESTION_FRAME],
    'post-unlock digestion must reframe timing through digestion/recovery'),

  // Thesis Coherence
  E(L11ScoreFamily.THESIS_COHERENCE, L11RegimePostureCode.HIGH_TRANSITION_RISK,
    L11RegimeModifierType.DISCOUNT_COMPONENT, 0.3,
    [L11RegimeModifierReasonCode.REGIME_REDUCES_CONFIDENCE_STALE_OR_AMBIGUOUS],
    'regime mismatch must reduce coherence'),
  E(L11ScoreFamily.THESIS_COHERENCE, L11RegimePostureCode.SPOT_LED_EXPANSION,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.2,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_VALIDATION],
    'aligned regime may raise coherence (only if L7/L9/L10 also aligned)'),

  // Signal Confidence
  E(L11ScoreFamily.SIGNAL_CONFIDENCE, L11RegimePostureCode.HIGH_TRANSITION_RISK,
    L11RegimeModifierType.REDUCE_CONFIDENCE, 0.45,
    [L11RegimeModifierReasonCode.REGIME_REDUCES_CONFIDENCE_STALE_OR_AMBIGUOUS],
    'high transition risk must reduce signal confidence',
    { hard_cap: L11ScoreBand.HIGH }),
  E(L11ScoreFamily.SIGNAL_CONFIDENCE, L11RegimePostureCode.STALE_OR_AMBIGUOUS_REGIME,
    L11RegimeModifierType.CAP_SCORE, 0.0,
    [L11RegimeModifierReasonCode.REGIME_CAPS_SCORE_DUE_TO_HIGH_TRANSITION_RISK],
    'stale/ambiguous regime hard-caps signal confidence below VERY_HIGH',
    { hard_cap: L11ScoreBand.HIGH }),

  // Market Structure
  E(L11ScoreFamily.MARKET_STRUCTURE, L11RegimePostureCode.SPOT_LED_EXPANSION,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.3,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_STRUCTURE],
    'spot-led expansion raises structure health'),
  E(L11ScoreFamily.MARKET_STRUCTURE, L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY,
    L11RegimeModifierType.CAP_SCORE, 0.0,
    [L11RegimeModifierReasonCode.REGIME_CAPS_SCORE_DUE_TO_THIN_LIQUIDITY],
    'thin liquidity fragility hard-caps structure below HIGH',
    { hard_cap: L11ScoreBand.MEDIUM }),
  E(L11ScoreFamily.MARKET_STRUCTURE, L11RegimePostureCode.LEVERAGE_LED_EXPANSION,
    L11RegimeModifierType.DISCOUNT_COMPONENT, 0.3,
    [L11RegimeModifierReasonCode.REGIME_DISCOUNTS_LEVERAGE_DRIVEN_STRENGTH],
    'leverage-led expansion must discount derivatives-driven structure'),

  // Whale Conviction
  E(L11ScoreFamily.WHALE_CONVICTION, L11RegimePostureCode.SPOT_LED_EXPANSION,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.35,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_VALIDATION],
    'whale accumulation in spot-led expansion may count more constructively'),
  E(L11ScoreFamily.WHALE_CONVICTION, L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY,
    L11RegimeModifierType.DISCOUNT_COMPONENT, 0.4,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_LIQUIDITY_FRAGILITY],
    'whale accumulation in thin liquidity must be discounted unless liquidity confirms'),

  // Unlock Risk
  E(L11ScoreFamily.UNLOCK_RISK, L11RegimePostureCode.THIN_LIQUIDITY_FRAGILITY,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.45,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_UNLOCK_SUPPLY_RISK],
    'thin liquidity amplifies unlock risk'),
  E(L11ScoreFamily.UNLOCK_RISK, L11RegimePostureCode.RISK_OFF,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.35,
    [L11RegimeModifierReasonCode.REGIME_AMPLIFIES_UNLOCK_SUPPLY_RISK],
    'risk-off amplifies unlock risk'),
  E(L11ScoreFamily.UNLOCK_RISK, L11RegimePostureCode.POST_UNLOCK_DIGESTION,
    L11RegimeModifierType.AMPLIFY_COMPONENT, 0.3,
    [L11RegimeModifierReasonCode.REGIME_REQUIRES_POST_UNLOCK_DIGESTION_FRAME],
    'post-unlock digestion amplifies unlock risk'),
];

export function lookupL11RegimeModifierMatrixEntry(
  family: L11ScoreFamily,
  posture: L11RegimePostureCode,
): L11RegimeModifierMatrixEntry | null {
  return L11_REGIME_MODIFIER_MATRIX.find(
    e => e.score_family === family && e.regime_posture === posture,
  ) ?? null;
}

export function listL11RegimeModifierMatrixEntriesForFamily(
  family: L11ScoreFamily,
): readonly L11RegimeModifierMatrixEntry[] {
  return L11_REGIME_MODIFIER_MATRIX.filter(e => e.score_family === family);
}

/**
 * §11.5.11.2 — Lookup a hard-cap entry. Returns the worst (lowest)
 * band cap for a given (family × posture).
 */
export function getL11RegimeHardCapBand(
  family: L11ScoreFamily,
  posture: L11RegimePostureCode,
): L11ScoreBand | null {
  const e = lookupL11RegimeModifierMatrixEntry(family, posture);
  if (e?.is_hard_cap && e.hard_cap_band) return e.hard_cap_band;
  return null;
}
