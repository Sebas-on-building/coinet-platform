/**
 * L11.6 — Score-family calibration target catalogue (§11.6.11)
 *
 * Per-production-family policy: which outcome metrics are allowed
 * and which dimensions must be stratified. The registry uses this
 * to validate that every production target is composed of legal
 * choices.
 */

import { L11ScoreFamily } from './score-family';
import { L11OutcomeMetric } from './outcome-metric';
import { L11CalibrationHorizon } from './calibration-horizon';

export interface L11ScoreFamilyCalibrationPolicy {
  readonly score_family: L11ScoreFamily;
  readonly allowed_outcome_metrics: readonly L11OutcomeMetric[];
  readonly allowed_horizons: readonly L11CalibrationHorizon[];
  readonly regime_stratification_required: boolean;
  readonly sequence_stratification_required: boolean;
  readonly hypothesis_stratification_required: boolean;
  readonly visibility_stratification_required: boolean;
  readonly liquidity_stratification_required: boolean;
}

const P = (
  family: L11ScoreFamily,
  metrics: readonly L11OutcomeMetric[],
  horizons: readonly L11CalibrationHorizon[],
  s: {
    regime?: boolean; sequence?: boolean; hypothesis?: boolean;
    visibility?: boolean; liquidity?: boolean;
  } = {},
): L11ScoreFamilyCalibrationPolicy => ({
  score_family: family,
  allowed_outcome_metrics: metrics,
  allowed_horizons: horizons,
  regime_stratification_required: s.regime ?? true,
  sequence_stratification_required: s.sequence ?? false,
  hypothesis_stratification_required: s.hypothesis ?? false,
  visibility_stratification_required: s.visibility ?? true,
  liquidity_stratification_required: s.liquidity ?? false,
});

export const L11_PRODUCTION_FAMILY_CALIBRATION_POLICIES:
  readonly L11ScoreFamilyCalibrationPolicy[] = [
  P(L11ScoreFamily.OPPORTUNITY,
    [L11OutcomeMetric.FORWARD_RETURN,
      L11OutcomeMetric.RISK_ADJUSTED_FORWARD_RETURN,
      L11OutcomeMetric.RELATIVE_SECTOR_OUTPERFORMANCE],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14,
      L11CalibrationHorizon.D_30, L11CalibrationHorizon.D_90],
    { regime: true, sequence: true, hypothesis: true,
      visibility: true, liquidity: true }),

  P(L11ScoreFamily.RISK,
    [L11OutcomeMetric.MAX_DRAWDOWN, L11OutcomeMetric.VOLATILITY_SPIKE,
      L11OutcomeMetric.LIQUIDATION_EVENT_FREQUENCY,
      L11OutcomeMetric.INVALIDATION_EVENT_OCCURRENCE],
    [L11CalibrationHorizon.H_24H, L11CalibrationHorizon.D_3,
      L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14,
      L11CalibrationHorizon.D_30],
    { regime: true, sequence: false, hypothesis: false,
      visibility: true, liquidity: true }),

  P(L11ScoreFamily.TIMING,
    [L11OutcomeMetric.TIME_TO_CONFIRMATION,
      L11OutcomeMetric.TIME_TO_INVALIDATION,
      L11OutcomeMetric.ENTRY_WINDOW_QUALITY,
      L11OutcomeMetric.MOMENTUM_PERSISTENCE],
    [L11CalibrationHorizon.H_4H, L11CalibrationHorizon.H_24H,
      L11CalibrationHorizon.D_3, L11CalibrationHorizon.D_7,
      L11CalibrationHorizon.D_14],
    { regime: true, sequence: true, hypothesis: false,
      visibility: true, liquidity: false }),

  P(L11ScoreFamily.THESIS_COHERENCE,
    [L11OutcomeMetric.HYPOTHESIS_STABILITY,
      L11OutcomeMetric.CONTRADICTION_EMERGENCE_RATE,
      L11OutcomeMetric.RANKING_FLIP_FREQUENCY,
      L11OutcomeMetric.INVALIDATION_EVENT_OCCURRENCE],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14,
      L11CalibrationHorizon.D_30],
    { regime: true, sequence: false, hypothesis: true,
      visibility: true, liquidity: false }),

  P(L11ScoreFamily.SIGNAL_CONFIDENCE,
    [L11OutcomeMetric.CONTRADICTION_EMERGENCE_RATE,
      L11OutcomeMetric.RANKING_FLIP_FREQUENCY,
      L11OutcomeMetric.HYPOTHESIS_STABILITY],
    [L11CalibrationHorizon.H_24H, L11CalibrationHorizon.D_3,
      L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14],
    { regime: true, sequence: false, hypothesis: true,
      visibility: true, liquidity: false }),

  P(L11ScoreFamily.MARKET_STRUCTURE,
    [L11OutcomeMetric.MOMENTUM_PERSISTENCE,
      L11OutcomeMetric.VOLATILITY_SPIKE,
      L11OutcomeMetric.LIQUIDATION_EVENT_FREQUENCY,
      L11OutcomeMetric.LIQUIDITY_ABSORPTION,
      L11OutcomeMetric.DISLOCATION_EVENT_RATE],
    [L11CalibrationHorizon.H_4H, L11CalibrationHorizon.H_24H,
      L11CalibrationHorizon.D_3, L11CalibrationHorizon.D_7,
      L11CalibrationHorizon.D_14],
    { regime: true, sequence: false, hypothesis: false,
      visibility: true, liquidity: true }),

  P(L11ScoreFamily.WHALE_CONVICTION,
    [L11OutcomeMetric.FORWARD_FLOW_CONFIRMATION,
      L11OutcomeMetric.EXCHANGE_FLOW_DIRECTION,
      L11OutcomeMetric.FORWARD_RETURN,
      L11OutcomeMetric.HYPOTHESIS_STABILITY],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14,
      L11CalibrationHorizon.D_30, L11CalibrationHorizon.D_90],
    { regime: true, sequence: false, hypothesis: true,
      visibility: true, liquidity: true }),

  P(L11ScoreFamily.UNLOCK_RISK,
    [L11OutcomeMetric.POST_UNLOCK_DRAWDOWN,
      L11OutcomeMetric.LIQUIDITY_ABSORPTION,
      L11OutcomeMetric.DISTRIBUTION_PRESSURE,
      L11OutcomeMetric.VOLATILITY_SPIKE],
    [L11CalibrationHorizon.D_3, L11CalibrationHorizon.D_7,
      L11CalibrationHorizon.D_14, L11CalibrationHorizon.D_30],
    { regime: true, sequence: false, hypothesis: false,
      visibility: true, liquidity: true }),
];

const POLICY_BY_FAMILY = new Map(
  L11_PRODUCTION_FAMILY_CALIBRATION_POLICIES.map(p => [p.score_family, p]),
);

export function getL11ScoreFamilyCalibrationPolicy(
  family: L11ScoreFamily,
): L11ScoreFamilyCalibrationPolicy | null {
  return POLICY_BY_FAMILY.get(family) ?? null;
}
