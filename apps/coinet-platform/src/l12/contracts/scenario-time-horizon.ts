/**
 * L12.2 — Scenario time horizon (§12.2.4 / §12.2.6).
 */

export enum L12ScenarioTimeHorizon {
  INTRADAY = 'INTRADAY',
  SHORT_TERM = 'SHORT_TERM',
  MEDIUM_TERM = 'MEDIUM_TERM',
  LONG_TERM = 'LONG_TERM',
  EVENT_BOUND = 'EVENT_BOUND',
  UNDEFINED = 'UNDEFINED',
}

export const ALL_L12_SCENARIO_TIME_HORIZONS: readonly L12ScenarioTimeHorizon[] =
  Object.values(L12ScenarioTimeHorizon);

export interface L12ScenarioWindow {
  /** Inclusive start. */
  readonly window_start: string;
  /** Inclusive end (≥ start). */
  readonly window_end: string;
  /** Logical horizon class. */
  readonly horizon: L12ScenarioTimeHorizon;
}
