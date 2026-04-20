/**
 * L10.4 — Shared engine result types
 *
 * §10.4.3 — Every L10 engine returns this uniform shape so the runtime
 * can sequence them deterministically, short-circuit on failure, and
 * feed violations into a single `L10RuntimeAudit` log.
 */

import type {
  L10RuntimeViolation,
} from '../validation/l10-runtime-violation-codes';

export interface L10EngineResult<T> {
  readonly ok: boolean;
  readonly value: T | null;
  readonly violations: readonly L10RuntimeViolation[];
}

export function ok<T>(value: T): L10EngineResult<T> {
  return { ok: true, value, violations: [] };
}

export function fail<T>(
  violations: readonly L10RuntimeViolation[],
): L10EngineResult<T> {
  return { ok: false, value: null, violations };
}

export function okWithWarnings<T>(
  value: T,
  violations: readonly L10RuntimeViolation[],
): L10EngineResult<T> {
  return { ok: true, value, violations };
}
