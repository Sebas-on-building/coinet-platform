/**
 * L9.4 — Shared engine result types
 *
 * §9.4.3 — Every L9 runtime engine returns a uniformly-shaped result so
 * the runtime can sequence them deterministically and audit failures
 * with a single vocabulary.
 */

import type {
  L9RuntimeViolation,
} from '../validation/l9-runtime-violation-codes';

export interface L9EngineResult<T> {
  readonly ok: boolean;
  readonly value: T | null;
  readonly violations: readonly L9RuntimeViolation[];
}

export function ok<T>(value: T): L9EngineResult<T> {
  return { ok: true, value, violations: [] };
}

export function fail<T>(
  violations: readonly L9RuntimeViolation[],
): L9EngineResult<T> {
  return { ok: false, value: null, violations };
}

export function okWithWarnings<T>(
  value: T,
  violations: readonly L9RuntimeViolation[],
): L9EngineResult<T> {
  return { ok: true, value, violations };
}
