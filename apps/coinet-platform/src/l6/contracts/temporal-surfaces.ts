/**
 * L6.5 — Time Surfaces and Temporal Identity
 *
 * §6.5.2 — Every L6 computation must distinguish `observed_at`, `ingested_at`,
 * `as_of`, `effective_at`, window boundaries, and event-detection/resolution
 * timestamps. These may never collapse into a single field.
 *
 * §6.5.2.5 — Every primitive output resolves to one `L6TemporalMode`:
 *   POINT_IN_TIME | WINDOWED | BASELINE_RELATIVE | EVENT_BOUND |
 *   HISTORICAL_REPLAY | REPAIR_RECOMPUTE.
 */

export enum L6TemporalMode {
  POINT_IN_TIME = 'POINT_IN_TIME',
  WINDOWED = 'WINDOWED',
  BASELINE_RELATIVE = 'BASELINE_RELATIVE',
  EVENT_BOUND = 'EVENT_BOUND',
  HISTORICAL_REPLAY = 'HISTORICAL_REPLAY',
  REPAIR_RECOMPUTE = 'REPAIR_RECOMPUTE',
}

export const ALL_TEMPORAL_MODES: readonly L6TemporalMode[] = Object.values(L6TemporalMode);

export function isHistoricalTemporalMode(m: L6TemporalMode): boolean {
  return m === L6TemporalMode.HISTORICAL_REPLAY || m === L6TemporalMode.REPAIR_RECOMPUTE;
}

export function requiresWindowSurfaces(m: L6TemporalMode): boolean {
  return m === L6TemporalMode.WINDOWED || m === L6TemporalMode.BASELINE_RELATIVE;
}

export function requiresEventSurfaces(m: L6TemporalMode): boolean {
  return m === L6TemporalMode.EVENT_BOUND;
}

/**
 * The canonical multi-surface timestamp bundle. A primitive output is expected
 * to be able to produce a subset of this bundle appropriate to its temporal
 * mode; a runtime that emits only `as_of` is illegal.
 */
export interface L6TemporalSurfaces {
  readonly observed_at: string;
  readonly ingested_at: string;
  readonly as_of: string;
  readonly effective_at: string;
  readonly window_start: string | null;
  readonly window_end: string | null;
  readonly detected_at: string | null;
  readonly resolved_at: string | null;
}

export interface L6TemporalIdentity {
  readonly temporal_mode: L6TemporalMode;
  readonly surfaces: L6TemporalSurfaces;
  readonly historical_mode: boolean;
  readonly late_data_flag: boolean;
  readonly window_id: string | null;
  readonly baseline_id: string | null;
}

/**
 * Required surfaces per temporal mode. Callers consult this table to decide
 * whether an emitted `L6TemporalSurfaces` is complete.
 */
export const REQUIRED_SURFACES_BY_MODE: Readonly<Record<L6TemporalMode, readonly (keyof L6TemporalSurfaces)[]>> = Object.freeze({
  [L6TemporalMode.POINT_IN_TIME]: ['observed_at', 'ingested_at', 'as_of', 'effective_at'],
  [L6TemporalMode.WINDOWED]: ['observed_at', 'ingested_at', 'as_of', 'effective_at', 'window_start', 'window_end'],
  [L6TemporalMode.BASELINE_RELATIVE]: ['observed_at', 'ingested_at', 'as_of', 'effective_at', 'window_start', 'window_end'],
  [L6TemporalMode.EVENT_BOUND]: ['observed_at', 'ingested_at', 'as_of', 'effective_at', 'detected_at'],
  [L6TemporalMode.HISTORICAL_REPLAY]: ['observed_at', 'ingested_at', 'as_of', 'effective_at'],
  [L6TemporalMode.REPAIR_RECOMPUTE]: ['observed_at', 'ingested_at', 'as_of', 'effective_at'],
});

export const ALL_TEMPORAL_SURFACE_KEYS: readonly (keyof L6TemporalSurfaces)[] = [
  'observed_at', 'ingested_at', 'as_of', 'effective_at',
  'window_start', 'window_end', 'detected_at', 'resolved_at',
];
