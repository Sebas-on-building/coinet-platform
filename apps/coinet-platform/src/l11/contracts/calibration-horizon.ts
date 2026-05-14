/**
 * L11.6 — Calibration Horizons (§11.6.6)
 *
 * Stable enum of evaluation horizons. Each horizon resolves to a
 * deterministic millisecond duration so engines can compute
 * `evaluation_due_at` from `as_of` without ambiguity.
 */

import { L11ScoreFamily } from './score-family';

export enum L11CalibrationHorizon {
  H_1H = 'H_1H',
  H_4H = 'H_4H',
  H_24H = 'H_24H',
  D_3 = 'D_3',
  D_7 = 'D_7',
  D_14 = 'D_14',
  D_30 = 'D_30',
  D_90 = 'D_90',
}

export const ALL_L11_CALIBRATION_HORIZONS:
  readonly L11CalibrationHorizon[] =
  Object.values(L11CalibrationHorizon);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const L11_HORIZON_DURATION_MS:
  Readonly<Record<L11CalibrationHorizon, number>> = {
  [L11CalibrationHorizon.H_1H]: 1 * HOUR_MS,
  [L11CalibrationHorizon.H_4H]: 4 * HOUR_MS,
  [L11CalibrationHorizon.H_24H]: 24 * HOUR_MS,
  [L11CalibrationHorizon.D_3]: 3 * DAY_MS,
  [L11CalibrationHorizon.D_7]: 7 * DAY_MS,
  [L11CalibrationHorizon.D_14]: 14 * DAY_MS,
  [L11CalibrationHorizon.D_30]: 30 * DAY_MS,
  [L11CalibrationHorizon.D_90]: 90 * DAY_MS,
};

export function getL11HorizonDurationMs(
  h: L11CalibrationHorizon,
): number {
  return L11_HORIZON_DURATION_MS[h];
}

/**
 * §11.6.5 — Evaluation window for a hook. The window starts at
 * `as_of + window_offset_ms` and ends at `as_of + window_offset_ms +
 * window_length_ms`. The horizon-based defaults anchor the window
 * to the horizon end (offset = horizon, length = 0 by default).
 */
export interface L11EvaluationWindow {
  readonly window_offset_ms: number;
  readonly window_length_ms: number;
  /** ISO start time. Computed from `as_of`. */
  readonly window_start: string;
  /** ISO end time. Computed from `as_of` + offset + length. */
  readonly window_end: string;
}

/**
 * §11.6.6.2 — Allowed horizons per production score family.
 */
export const L11_ALLOWED_HORIZONS_BY_FAMILY:
  Readonly<Record<L11ScoreFamily, readonly L11CalibrationHorizon[]>> = {
  [L11ScoreFamily.OPPORTUNITY]: [
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
    L11CalibrationHorizon.D_30,
    L11CalibrationHorizon.D_90,
  ],
  [L11ScoreFamily.RISK]: [
    L11CalibrationHorizon.H_24H,
    L11CalibrationHorizon.D_3,
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
    L11CalibrationHorizon.D_30,
  ],
  [L11ScoreFamily.TIMING]: [
    L11CalibrationHorizon.H_4H,
    L11CalibrationHorizon.H_24H,
    L11CalibrationHorizon.D_3,
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
  ],
  [L11ScoreFamily.THESIS_COHERENCE]: [
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
    L11CalibrationHorizon.D_30,
  ],
  [L11ScoreFamily.SIGNAL_CONFIDENCE]: [
    L11CalibrationHorizon.H_24H,
    L11CalibrationHorizon.D_3,
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
  ],
  [L11ScoreFamily.MARKET_STRUCTURE]: [
    L11CalibrationHorizon.H_4H,
    L11CalibrationHorizon.H_24H,
    L11CalibrationHorizon.D_3,
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
  ],
  [L11ScoreFamily.WHALE_CONVICTION]: [
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
    L11CalibrationHorizon.D_30,
    L11CalibrationHorizon.D_90,
  ],
  [L11ScoreFamily.UNLOCK_RISK]: [
    L11CalibrationHorizon.D_3,
    L11CalibrationHorizon.D_7,
    L11CalibrationHorizon.D_14,
    L11CalibrationHorizon.D_30,
  ],
  // Reserved families have no allowed horizons (production targets blocked)
  [L11ScoreFamily.NARRATIVE_QUALITY]: [],
  [L11ScoreFamily.FUNDAMENTAL_SUBSTANCE]: [],
  [L11ScoreFamily.LIQUIDITY_QUALITY]: [],
  [L11ScoreFamily.MANIPULATION_RISK]: [],
  [L11ScoreFamily.ECOSYSTEM_BETA]: [],
  [L11ScoreFamily.CONTINUATION_QUALITY]: [],
  [L11ScoreFamily.REVERSAL_RISK]: [],
};

export function isL11HorizonAllowedForFamily(
  family: L11ScoreFamily,
  horizon: L11CalibrationHorizon,
): boolean {
  return L11_ALLOWED_HORIZONS_BY_FAMILY[family].includes(horizon);
}

/**
 * Compute an `L11EvaluationWindow` anchored to a score's `as_of`.
 * Default policy: window_offset = horizon, window_length = 0
 * (point-in-time outcome at `as_of + horizon`). Callers may override.
 */
export function computeL11EvaluationWindow(
  as_of: string,
  horizon: L11CalibrationHorizon,
  opts: { window_offset_ms?: number; window_length_ms?: number } = {},
): L11EvaluationWindow {
  const horizonMs = getL11HorizonDurationMs(horizon);
  const offset = opts.window_offset_ms ?? horizonMs;
  const length = opts.window_length_ms ?? 0;
  const asOfMs = Date.parse(as_of);
  if (!Number.isFinite(asOfMs)) {
    throw new Error(`as_of ${as_of} is not parseable as ISO timestamp`);
  }
  return {
    window_offset_ms: offset,
    window_length_ms: length,
    window_start: new Date(asOfMs + offset).toISOString(),
    window_end: new Date(asOfMs + offset + length).toISOString(),
  };
}

/**
 * §11.6.6.3 — Evaluation window must be ≥ horizon duration when
 * window_length_ms > 0. We measure the *effective end* relative to
 * `as_of`. A non-finite or negative window is illegal.
 */
export function isL11EvaluationWindowLegal(
  window: L11EvaluationWindow,
  horizon: L11CalibrationHorizon,
): { ok: boolean; reason: string } {
  if (!Number.isFinite(window.window_offset_ms) || window.window_offset_ms < 0) {
    return { ok: false, reason: 'window_offset_ms must be ≥ 0' };
  }
  if (!Number.isFinite(window.window_length_ms) || window.window_length_ms < 0) {
    return { ok: false, reason: 'window_length_ms must be ≥ 0' };
  }
  const horizonMs = getL11HorizonDurationMs(horizon);
  const effectiveEnd = window.window_offset_ms + window.window_length_ms;
  if (effectiveEnd < horizonMs) {
    return {
      ok: false,
      reason: `evaluation window end ${effectiveEnd}ms < horizon duration ${horizonMs}ms`,
    };
  }
  return { ok: true, reason: 'ok' };
}
