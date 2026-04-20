/**
 * L10.2 — Hypothesis Window Contract
 *
 * §10.2.6 — Defines the explicit temporal window a hypothesis subject
 * evaluates over. Window granularity and staleness are first-class
 * because hypotheses may not be constructed against unspecified time.
 */

export type L10HypothesisWindowGranularity =
  | 'MINUTE'
  | 'HOUR'
  | 'SESSION'
  | 'DAY'
  | 'WEEK'
  | 'EVENT_ANCHORED';

export interface L10HypothesisWindow {
  readonly window_start: string;
  readonly window_end: string;
  readonly granularity: L10HypothesisWindowGranularity;
  readonly freshness_budget_ms: number;
  readonly staleness_policy: 'STRICT' | 'RELAXED' | 'ANCHORED_ONLY';
}

export const ALL_L10_HYPOTHESIS_WINDOW_GRANULARITIES:
  readonly L10HypothesisWindowGranularity[] = [
    'MINUTE', 'HOUR', 'SESSION', 'DAY', 'WEEK', 'EVENT_ANCHORED',
  ];

export function isLegalL10Window(w: L10HypothesisWindow): boolean {
  if (!w.window_start || !w.window_end) return false;
  if (!ALL_L10_HYPOTHESIS_WINDOW_GRANULARITIES.includes(w.granularity)) return false;
  if (!Number.isFinite(w.freshness_budget_ms) || w.freshness_budget_ms < 0) return false;
  const start = Date.parse(w.window_start);
  const end = Date.parse(w.window_end);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return end >= start;
}
