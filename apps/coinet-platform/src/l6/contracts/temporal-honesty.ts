/**
 * L6.5 — Temporal Honesty
 *
 * §6.5.8 — A feature or event computed from stale or incomplete windows must
 * never look equally valid to a clean, current output. Temporal honesty is
 * classified explicitly.
 */

export enum L6TemporalHonestyClass {
  CURRENT_CLEAN = 'CURRENT_CLEAN',
  CURRENT_DEGRADED = 'CURRENT_DEGRADED',
  HISTORICAL_CLEAN = 'HISTORICAL_CLEAN',
  HISTORICAL_DEGRADED = 'HISTORICAL_DEGRADED',
  LATE_RECOMPUTED = 'LATE_RECOMPUTED',
  PROVISIONAL_WARMUP = 'PROVISIONAL_WARMUP',
  BLOCKED_TEMPORAL = 'BLOCKED_TEMPORAL',
}

export const ALL_TEMPORAL_HONESTY_CLASSES: readonly L6TemporalHonestyClass[] =
  Object.values(L6TemporalHonestyClass);

export function isCleanHonestyClass(c: L6TemporalHonestyClass): boolean {
  return c === L6TemporalHonestyClass.CURRENT_CLEAN ||
         c === L6TemporalHonestyClass.HISTORICAL_CLEAN;
}

export function isDegradedHonestyClass(c: L6TemporalHonestyClass): boolean {
  return c === L6TemporalHonestyClass.CURRENT_DEGRADED ||
         c === L6TemporalHonestyClass.HISTORICAL_DEGRADED ||
         c === L6TemporalHonestyClass.LATE_RECOMPUTED ||
         c === L6TemporalHonestyClass.PROVISIONAL_WARMUP;
}

export function isBlockedHonestyClass(c: L6TemporalHonestyClass): boolean {
  return c === L6TemporalHonestyClass.BLOCKED_TEMPORAL;
}

/**
 * §6.5.8.6 — Typed temporal violation codes. These are the machine-readable
 * codes audit records carry when a temporal law is broken.
 */
export enum L6TemporalViolationCode {
  TIME_SURFACE_MISSING = 'TIME_SURFACE_MISSING',
  TIME_SURFACE_COLLAPSED = 'TIME_SURFACE_COLLAPSED',
  TIME_ORDERING_VIOLATED = 'TIME_ORDERING_VIOLATED',
  WINDOW_NOT_FROM_GOVERNED_LIBRARY = 'WINDOW_NOT_FROM_GOVERNED_LIBRARY',
  WINDOW_IDENTITY_NON_DETERMINISTIC = 'WINDOW_IDENTITY_NON_DETERMINISTIC',
  WINDOW_COVERAGE_INSUFFICIENT = 'WINDOW_COVERAGE_INSUFFICIENT',
  WINDOW_ANCHOR_UNDECLARED = 'WINDOW_ANCHOR_UNDECLARED',
  BASELINE_ILLEGAL = 'BASELINE_ILLEGAL',
  BASELINE_REPLAY_NOT_RECONSTRUCTABLE = 'BASELINE_REPLAY_NOT_RECONSTRUCTABLE',
  WARMUP_NOT_SATISFIED = 'WARMUP_NOT_SATISFIED',
  NULL_POLICY_MISSING = 'NULL_POLICY_MISSING',
  NULL_POLICY_FORBIDDEN_FALLBACK = 'NULL_POLICY_FORBIDDEN_FALLBACK',
  NULL_STATE_INCONSISTENT_WITH_VALIDITY = 'NULL_STATE_INCONSISTENT_WITH_VALIDITY',
  LATE_DATA_CLASS_MISSING = 'LATE_DATA_CLASS_MISSING',
  LATE_DATA_SILENT_CURRENT_MUTATION = 'LATE_DATA_SILENT_CURRENT_MUTATION',
  TEMPORAL_HONESTY_MISCLASSIFIED = 'TEMPORAL_HONESTY_MISCLASSIFIED',
  HISTORICAL_OUTPUT_MISSING_MARKERS = 'HISTORICAL_OUTPUT_MISSING_MARKERS',
}

export const ALL_TEMPORAL_VIOLATION_CODES: readonly L6TemporalViolationCode[] =
  Object.values(L6TemporalViolationCode);
