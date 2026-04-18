/**
 * L6.5 §6.5.2.6 — TemporalSurfaceValidator
 *
 * Rejects:
 *   - collapsed timestamp usage (observed/ingested/as_of/effective identical)
 *   - missing required time surfaces for the temporal mode
 *   - illegal timestamp ordering (window_start > window_end, resolved before
 *     detected, etc.)
 *   - replay outputs lacking historical temporal markers
 *   - late-data outputs lacking legal late-data classification
 */

import {
  L6TemporalIdentity,
  L6TemporalMode,
  L6TemporalSurfaces,
  REQUIRED_SURFACES_BY_MODE,
  isHistoricalTemporalMode,
} from '../contracts/temporal-surfaces';
import { L6TemporalViolationCode } from '../contracts/temporal-honesty';

export interface L6TemporalSurfaceViolation {
  readonly code: L6TemporalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6TemporalSurfaceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6TemporalSurfaceViolation[];
}

const COLLAPSED_TIMESTAMP_FIELDS: readonly (keyof L6TemporalSurfaces)[] = [
  'observed_at', 'ingested_at', 'as_of', 'effective_at',
];

function isIsoMonotonic(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return true;
  return a <= b;
}

export class TemporalSurfaceValidator {
  validate(identity: L6TemporalIdentity): L6TemporalSurfaceValidationResult {
    const v: L6TemporalSurfaceViolation[] = [];
    const s = identity.surfaces;

    // Required surfaces per mode
    const required = REQUIRED_SURFACES_BY_MODE[identity.temporal_mode];
    for (const key of required) {
      if (s[key] === null || s[key] === undefined || s[key] === '') {
        v.push({
          code: L6TemporalViolationCode.TIME_SURFACE_MISSING,
          field: key,
          detail: `required for temporal_mode=${identity.temporal_mode}`,
        });
      }
    }

    // Collapsed timestamp detection — observed/ingested/as_of/effective must
    // not all be literally identical unless temporal mode is explicitly
    // POINT_IN_TIME with a synthetic boundary (we still disallow 4-way
    // identity as illegal; legal cases should differentiate ingested_at).
    const collapsedKey = new Set(COLLAPSED_TIMESTAMP_FIELDS.map((k) => s[k]));
    if (collapsedKey.size === 1 && s.observed_at && s.observed_at.length > 0) {
      v.push({
        code: L6TemporalViolationCode.TIME_SURFACE_COLLAPSED,
        field: 'observed_at|ingested_at|as_of|effective_at',
        detail: 'four core timestamps are identical',
      });
    }

    // Ordering law
    if (!isIsoMonotonic(s.window_start, s.window_end)) {
      v.push({
        code: L6TemporalViolationCode.TIME_ORDERING_VIOLATED,
        field: 'window_start<=window_end',
        detail: `${s.window_start} > ${s.window_end}`,
      });
    }
    if (!isIsoMonotonic(s.detected_at, s.resolved_at)) {
      v.push({
        code: L6TemporalViolationCode.TIME_ORDERING_VIOLATED,
        field: 'detected_at<=resolved_at',
        detail: `${s.detected_at} > ${s.resolved_at}`,
      });
    }
    if (!isIsoMonotonic(s.window_start, s.as_of)) {
      v.push({
        code: L6TemporalViolationCode.TIME_ORDERING_VIOLATED,
        field: 'window_start<=as_of',
        detail: `${s.window_start} > ${s.as_of}`,
      });
    }

    // Historical markers
    if (isHistoricalTemporalMode(identity.temporal_mode) && !identity.historical_mode) {
      v.push({
        code: L6TemporalViolationCode.HISTORICAL_OUTPUT_MISSING_MARKERS,
        field: 'historical_mode',
        detail: `temporal_mode=${identity.temporal_mode} requires historical_mode=true`,
      });
    }

    // Late-data flag must have a classification available upstream; if the
    // flag is true and the output is claiming to be current/fresh, that will
    // fail later validators. Here we only require the flag to be a boolean.
    if (typeof identity.late_data_flag !== 'boolean') {
      v.push({
        code: L6TemporalViolationCode.LATE_DATA_CLASS_MISSING,
        field: 'late_data_flag',
        detail: 'late_data_flag must be explicit boolean',
      });
    }

    return { ok: v.length === 0, violations: v };
  }
}
