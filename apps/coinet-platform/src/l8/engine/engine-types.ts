/**
 * L8.4 — Shared engine result types.
 *
 * §8.4.2 — Every engine returns a uniformly-shaped result so the runtime
 * can sequence them deterministically and audit failures with a single
 * vocabulary.
 */

import type { L8RuntimeViolation } from '../validation/l8-runtime-violation-codes';

export interface L8EngineResult<T> {
  readonly ok: boolean;
  readonly value: T | null;
  readonly violations: readonly L8RuntimeViolation[];
}

export function ok<T>(value: T): L8EngineResult<T> {
  return { ok: true, value, violations: [] };
}

export function fail<T>(
  violations: readonly L8RuntimeViolation[],
): L8EngineResult<T> {
  return { ok: false, value: null, violations };
}

export function okWithWarnings<T>(
  value: T,
  violations: readonly L8RuntimeViolation[],
): L8EngineResult<T> {
  return { ok: true, value, violations };
}
