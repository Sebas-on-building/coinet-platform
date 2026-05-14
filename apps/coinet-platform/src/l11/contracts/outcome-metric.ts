/**
 * L11.6 — Outcome Metrics (§11.6.7)
 *
 * Stable enum of outcome metrics that calibration targets may
 * reference, plus per-metric metadata: value type, outcome
 * direction, allowed score families, allowed horizons, required
 * future-data surfaces.
 */

import { L11ScoreFamily } from './score-family';
import { L11CalibrationHorizon } from './calibration-horizon';

export enum L11OutcomeMetric {
  FORWARD_RETURN = 'FORWARD_RETURN',
  RISK_ADJUSTED_FORWARD_RETURN = 'RISK_ADJUSTED_FORWARD_RETURN',
  RELATIVE_SECTOR_OUTPERFORMANCE = 'RELATIVE_SECTOR_OUTPERFORMANCE',

  MAX_DRAWDOWN = 'MAX_DRAWDOWN',
  VOLATILITY_SPIKE = 'VOLATILITY_SPIKE',
  LIQUIDATION_EVENT_FREQUENCY = 'LIQUIDATION_EVENT_FREQUENCY',
  INVALIDATION_EVENT_OCCURRENCE = 'INVALIDATION_EVENT_OCCURRENCE',

  TIME_TO_CONFIRMATION = 'TIME_TO_CONFIRMATION',
  TIME_TO_INVALIDATION = 'TIME_TO_INVALIDATION',
  ENTRY_WINDOW_QUALITY = 'ENTRY_WINDOW_QUALITY',
  MOMENTUM_PERSISTENCE = 'MOMENTUM_PERSISTENCE',

  HYPOTHESIS_STABILITY = 'HYPOTHESIS_STABILITY',
  CONTRADICTION_EMERGENCE_RATE = 'CONTRADICTION_EMERGENCE_RATE',
  RANKING_FLIP_FREQUENCY = 'RANKING_FLIP_FREQUENCY',

  FORWARD_FLOW_CONFIRMATION = 'FORWARD_FLOW_CONFIRMATION',
  EXCHANGE_FLOW_DIRECTION = 'EXCHANGE_FLOW_DIRECTION',

  POST_UNLOCK_DRAWDOWN = 'POST_UNLOCK_DRAWDOWN',
  LIQUIDITY_ABSORPTION = 'LIQUIDITY_ABSORPTION',
  DISTRIBUTION_PRESSURE = 'DISTRIBUTION_PRESSURE',

  DISLOCATION_EVENT_RATE = 'DISLOCATION_EVENT_RATE',
}

export const ALL_L11_OUTCOME_METRICS: readonly L11OutcomeMetric[] =
  Object.values(L11OutcomeMetric);

/**
 * §11.6.7.1 — Value type and per-metric semantics.
 */
export enum L11OutcomeValueType {
  CONTINUOUS = 'CONTINUOUS',
  RATE = 'RATE',
  COUNT = 'COUNT',
  EVENT_OCCURRENCE = 'EVENT_OCCURRENCE',
  DURATION_MS = 'DURATION_MS',
  RATIO = 'RATIO',
}

/**
 * Whether higher metric values are "better" (constructive) or
 * "worse" (degradation/risk). Calibration targets cross-check this
 * against `expected_direction` in §11.6.8.
 */
export enum L11OutcomeBetterDirection {
  HIGHER_IS_BETTER = 'HIGHER_IS_BETTER',
  LOWER_IS_BETTER = 'LOWER_IS_BETTER',
  NEUTRAL = 'NEUTRAL',
}

/**
 * Where the outcome will be measured. Layers below 11 own these
 * surfaces.
 */
export enum L11OutcomeMeasurementSource {
  L3_PRICE_RETURN = 'L3_PRICE_RETURN',
  L3_VOLATILITY = 'L3_VOLATILITY',
  L3_DRAWDOWN_TRACKER = 'L3_DRAWDOWN_TRACKER',
  L6_EVENT_HISTORY = 'L6_EVENT_HISTORY',
  L7_VALIDATION_OUTCOME = 'L7_VALIDATION_OUTCOME',
  L9_SEQUENCE_OUTCOME = 'L9_SEQUENCE_OUTCOME',
  L10_HYPOTHESIS_HISTORY = 'L10_HYPOTHESIS_HISTORY',
  L4_FLOW_OUTCOME = 'L4_FLOW_OUTCOME',
}

export interface L11OutcomeMetricDefinition {
  readonly metric: L11OutcomeMetric;
  readonly value_type: L11OutcomeValueType;
  readonly better_direction: L11OutcomeBetterDirection;
  readonly measurement_source: L11OutcomeMeasurementSource;
  readonly allowed_score_families: readonly L11ScoreFamily[];
  readonly allowed_horizons: readonly L11CalibrationHorizon[];
  /** Stable refs to future-data surfaces this metric depends on. */
  readonly required_future_data_surface_refs: readonly string[];
  readonly description: string;
}

const ALL_HORIZONS: readonly L11CalibrationHorizon[] =
  ALL_L11_OUTCOME_METRICS.length > 0 ? Object.values(L11CalibrationHorizon) : [];

const D = (
  metric: L11OutcomeMetric,
  value_type: L11OutcomeValueType,
  better_direction: L11OutcomeBetterDirection,
  measurement_source: L11OutcomeMeasurementSource,
  allowed_score_families: readonly L11ScoreFamily[],
  allowed_horizons: readonly L11CalibrationHorizon[],
  required_future_data_surface_refs: readonly string[],
  description: string,
): L11OutcomeMetricDefinition => ({
  metric, value_type, better_direction, measurement_source,
  allowed_score_families, allowed_horizons,
  required_future_data_surface_refs, description,
});

const SHORT_HORIZONS: readonly L11CalibrationHorizon[] = [
  L11CalibrationHorizon.H_4H,
  L11CalibrationHorizon.H_24H,
  L11CalibrationHorizon.D_3,
  L11CalibrationHorizon.D_7,
];

const RETURN_HORIZONS: readonly L11CalibrationHorizon[] = [
  L11CalibrationHorizon.D_7,
  L11CalibrationHorizon.D_14,
  L11CalibrationHorizon.D_30,
  L11CalibrationHorizon.D_90,
];

const RISK_HORIZONS: readonly L11CalibrationHorizon[] = [
  L11CalibrationHorizon.H_24H,
  L11CalibrationHorizon.D_3,
  L11CalibrationHorizon.D_7,
  L11CalibrationHorizon.D_14,
  L11CalibrationHorizon.D_30,
];

const TIMING_HORIZONS: readonly L11CalibrationHorizon[] = [
  L11CalibrationHorizon.H_4H,
  L11CalibrationHorizon.H_24H,
  L11CalibrationHorizon.D_3,
  L11CalibrationHorizon.D_7,
  L11CalibrationHorizon.D_14,
];

export const L11_OUTCOME_METRIC_DEFINITIONS:
  readonly L11OutcomeMetricDefinition[] = [
  D(L11OutcomeMetric.FORWARD_RETURN, L11OutcomeValueType.CONTINUOUS,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L3_PRICE_RETURN,
    [L11ScoreFamily.OPPORTUNITY, L11ScoreFamily.WHALE_CONVICTION],
    RETURN_HORIZONS,
    ['l3.price.return.future'],
    'forward arithmetic return over horizon'),
  D(L11OutcomeMetric.RISK_ADJUSTED_FORWARD_RETURN, L11OutcomeValueType.CONTINUOUS,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L3_PRICE_RETURN,
    [L11ScoreFamily.OPPORTUNITY],
    RETURN_HORIZONS,
    ['l3.price.return.future', 'l3.volatility.future'],
    'forward return / forward realized volatility'),
  D(L11OutcomeMetric.RELATIVE_SECTOR_OUTPERFORMANCE, L11OutcomeValueType.CONTINUOUS,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L3_PRICE_RETURN,
    [L11ScoreFamily.OPPORTUNITY],
    RETURN_HORIZONS,
    ['l3.price.return.future', 'l4.sector.benchmark.future'],
    'forward return minus sector benchmark forward return'),

  D(L11OutcomeMetric.MAX_DRAWDOWN, L11OutcomeValueType.CONTINUOUS,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L3_DRAWDOWN_TRACKER,
    [L11ScoreFamily.RISK],
    RISK_HORIZONS,
    ['l3.drawdown.future'],
    'maximum drawdown observed within evaluation window'),
  D(L11OutcomeMetric.VOLATILITY_SPIKE, L11OutcomeValueType.RATE,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L3_VOLATILITY,
    [L11ScoreFamily.RISK, L11ScoreFamily.MARKET_STRUCTURE, L11ScoreFamily.UNLOCK_RISK],
    RISK_HORIZONS,
    ['l3.volatility.future'],
    'volatility spike rate within window'),
  D(L11OutcomeMetric.LIQUIDATION_EVENT_FREQUENCY, L11OutcomeValueType.COUNT,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L6_EVENT_HISTORY,
    [L11ScoreFamily.RISK, L11ScoreFamily.MARKET_STRUCTURE],
    RISK_HORIZONS,
    ['l6.event.liquidation.future'],
    'count of liquidation events within window'),
  D(L11OutcomeMetric.INVALIDATION_EVENT_OCCURRENCE, L11OutcomeValueType.EVENT_OCCURRENCE,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L7_VALIDATION_OUTCOME,
    [L11ScoreFamily.RISK, L11ScoreFamily.THESIS_COHERENCE],
    RISK_HORIZONS,
    ['l7.invalidation.future'],
    'whether at least one invalidation occurred'),

  D(L11OutcomeMetric.TIME_TO_CONFIRMATION, L11OutcomeValueType.DURATION_MS,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L9_SEQUENCE_OUTCOME,
    [L11ScoreFamily.TIMING],
    TIMING_HORIZONS,
    ['l9.confirmation.future'],
    'time until confirmation event observed'),
  D(L11OutcomeMetric.TIME_TO_INVALIDATION, L11OutcomeValueType.DURATION_MS,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L7_VALIDATION_OUTCOME,
    [L11ScoreFamily.TIMING, L11ScoreFamily.THESIS_COHERENCE],
    TIMING_HORIZONS,
    ['l7.invalidation.future'],
    'time until first invalidation, if any'),
  D(L11OutcomeMetric.ENTRY_WINDOW_QUALITY, L11OutcomeValueType.RATIO,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L9_SEQUENCE_OUTCOME,
    [L11ScoreFamily.TIMING],
    TIMING_HORIZONS,
    ['l9.entry-window.future'],
    'composite entry-window quality score'),
  D(L11OutcomeMetric.MOMENTUM_PERSISTENCE, L11OutcomeValueType.RATIO,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L9_SEQUENCE_OUTCOME,
    [L11ScoreFamily.TIMING, L11ScoreFamily.MARKET_STRUCTURE],
    TIMING_HORIZONS,
    ['l9.momentum.future'],
    'momentum persistence ratio'),

  D(L11OutcomeMetric.HYPOTHESIS_STABILITY, L11OutcomeValueType.RATIO,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L10_HYPOTHESIS_HISTORY,
    [L11ScoreFamily.THESIS_COHERENCE, L11ScoreFamily.SIGNAL_CONFIDENCE,
      L11ScoreFamily.WHALE_CONVICTION],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14, L11CalibrationHorizon.D_30],
    ['l10.hypothesis.history.future'],
    'fraction of evaluation window with stable top-hypothesis'),
  D(L11OutcomeMetric.CONTRADICTION_EMERGENCE_RATE, L11OutcomeValueType.RATE,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L7_VALIDATION_OUTCOME,
    [L11ScoreFamily.THESIS_COHERENCE, L11ScoreFamily.SIGNAL_CONFIDENCE],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14, L11CalibrationHorizon.D_30],
    ['l7.contradiction.future'],
    'rate of contradiction emergence per unit time'),
  D(L11OutcomeMetric.RANKING_FLIP_FREQUENCY, L11OutcomeValueType.RATE,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L10_HYPOTHESIS_HISTORY,
    [L11ScoreFamily.THESIS_COHERENCE, L11ScoreFamily.SIGNAL_CONFIDENCE],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14, L11CalibrationHorizon.D_30],
    ['l10.ranking.history.future'],
    'frequency of top-hypothesis ranking flips'),

  D(L11OutcomeMetric.FORWARD_FLOW_CONFIRMATION, L11OutcomeValueType.RATIO,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L4_FLOW_OUTCOME,
    [L11ScoreFamily.WHALE_CONVICTION],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14, L11CalibrationHorizon.D_30,
      L11CalibrationHorizon.D_90],
    ['l4.flow.future'],
    'forward flow confirms whale accumulation hypothesis'),
  D(L11OutcomeMetric.EXCHANGE_FLOW_DIRECTION, L11OutcomeValueType.CONTINUOUS,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L4_FLOW_OUTCOME,
    [L11ScoreFamily.WHALE_CONVICTION],
    [L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14, L11CalibrationHorizon.D_30],
    ['l4.exchange.flow.future'],
    'net exchange flow direction (positive = inflow to wallets)'),

  D(L11OutcomeMetric.POST_UNLOCK_DRAWDOWN, L11OutcomeValueType.CONTINUOUS,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L3_DRAWDOWN_TRACKER,
    [L11ScoreFamily.UNLOCK_RISK],
    [L11CalibrationHorizon.D_3, L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14,
      L11CalibrationHorizon.D_30],
    ['l3.drawdown.future', 'l6.event.unlock'],
    'drawdown observed after unlock event'),
  D(L11OutcomeMetric.LIQUIDITY_ABSORPTION, L11OutcomeValueType.RATIO,
    L11OutcomeBetterDirection.HIGHER_IS_BETTER,
    L11OutcomeMeasurementSource.L4_FLOW_OUTCOME,
    [L11ScoreFamily.UNLOCK_RISK, L11ScoreFamily.MARKET_STRUCTURE],
    [L11CalibrationHorizon.D_3, L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14],
    ['l4.liquidity.absorption.future'],
    'fraction of unlocked supply absorbed by liquid demand'),
  D(L11OutcomeMetric.DISTRIBUTION_PRESSURE, L11OutcomeValueType.RATIO,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L4_FLOW_OUTCOME,
    [L11ScoreFamily.UNLOCK_RISK, L11ScoreFamily.WHALE_CONVICTION],
    [L11CalibrationHorizon.D_3, L11CalibrationHorizon.D_7, L11CalibrationHorizon.D_14,
      L11CalibrationHorizon.D_30],
    ['l4.distribution.future'],
    'distribution pressure observed during evaluation window'),

  D(L11OutcomeMetric.DISLOCATION_EVENT_RATE, L11OutcomeValueType.RATE,
    L11OutcomeBetterDirection.LOWER_IS_BETTER,
    L11OutcomeMeasurementSource.L6_EVENT_HISTORY,
    [L11ScoreFamily.MARKET_STRUCTURE],
    RISK_HORIZONS,
    ['l6.event.dislocation.future'],
    'rate of liquidity dislocation events'),
];

const DEFINITIONS_BY_METRIC =
  new Map(L11_OUTCOME_METRIC_DEFINITIONS.map(d => [d.metric, d]));

export function getL11OutcomeMetricDefinition(
  metric: L11OutcomeMetric,
): L11OutcomeMetricDefinition | null {
  return DEFINITIONS_BY_METRIC.get(metric) ?? null;
}

export function isL11OutcomeMetricLegalForFamily(
  metric: L11OutcomeMetric,
  family: L11ScoreFamily,
): boolean {
  const def = getL11OutcomeMetricDefinition(metric);
  if (!def) return false;
  return def.allowed_score_families.includes(family);
}

export function isL11OutcomeMetricLegalForHorizon(
  metric: L11OutcomeMetric,
  horizon: L11CalibrationHorizon,
): boolean {
  const def = getL11OutcomeMetricDefinition(metric);
  if (!def) return false;
  return def.allowed_horizons.includes(horizon);
}

void ALL_HORIZONS;
