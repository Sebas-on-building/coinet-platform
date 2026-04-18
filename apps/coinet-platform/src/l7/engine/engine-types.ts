/**
 * L7.4 — Shared engine result types.
 *
 * §7.4.2.3 — Every engine returns a uniformly-shaped result so the
 * runtime can sequence them deterministically and audit failures with
 * a single vocabulary.
 */

import type { L7RuntimeViolation } from '../validation/l7-runtime-violation-codes';

export interface L7EngineResult<T> {
  readonly ok: boolean;
  readonly value: T | null;
  readonly violations: readonly L7RuntimeViolation[];
}

export function ok<T>(value: T): L7EngineResult<T> {
  return { ok: true, value, violations: [] };
}

export function fail<T>(violations: readonly L7RuntimeViolation[]): L7EngineResult<T> {
  return { ok: false, value: null, violations };
}

export function okWithWarnings<T>(
  value: T,
  violations: readonly L7RuntimeViolation[],
): L7EngineResult<T> {
  return { ok: true, value, violations };
}
