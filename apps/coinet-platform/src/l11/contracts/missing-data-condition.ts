/**
 * L11.5 — Missing-Data Condition Classes (§11.5.3)
 *
 * Runtime taxonomy of missing-visibility states. Distinct from
 * L11.3's `L11InputConditionClass` (formula-time, 7 values): the
 * L11.5 runtime enum has 11 values and adds optional/required
 * separation, INSUFFICIENT_INPUT_SET, and UNKNOWN_VISIBILITY_STATE.
 *
 * The L11.3 formula-time enum maps cleanly into the L11.5 runtime
 * enum via `mapL11InputConditionToMissingDataCondition` so the
 * profile engine can consume L11.3 evaluation effects without
 * losing fidelity.
 */

import { L11InputConditionClass } from './formula-missing-data-rule';

export enum L11MissingDataConditionClass {
  ABSENT_REQUIRED_INPUT = 'ABSENT_REQUIRED_INPUT',
  ABSENT_OPTIONAL_INPUT = 'ABSENT_OPTIONAL_INPUT',
  STALE_REQUIRED_INPUT = 'STALE_REQUIRED_INPUT',
  STALE_OPTIONAL_INPUT = 'STALE_OPTIONAL_INPUT',
  DEGRADED_REQUIRED_INPUT = 'DEGRADED_REQUIRED_INPUT',
  DEGRADED_OPTIONAL_INPUT = 'DEGRADED_OPTIONAL_INPUT',
  EVIDENCE_ONLY_INPUT = 'EVIDENCE_ONLY_INPUT',
  RESTRICTED_INPUT = 'RESTRICTED_INPUT',
  CONFLICTING_INPUT = 'CONFLICTING_INPUT',
  INSUFFICIENT_INPUT_SET = 'INSUFFICIENT_INPUT_SET',
  UNKNOWN_VISIBILITY_STATE = 'UNKNOWN_VISIBILITY_STATE',
}

export const ALL_L11_MISSING_DATA_CONDITION_CLASSES:
  readonly L11MissingDataConditionClass[] =
  Object.values(L11MissingDataConditionClass);

/**
 * §11.5.3 — Critical conditions are those that may NEVER be treated
 * as neutral (per INV-11.5-A). Optional-missing and evidence-only
 * are non-critical because they ship with their own behaviour
 * envelopes.
 */
const CRITICAL_CONDITIONS: ReadonlySet<L11MissingDataConditionClass> = new Set([
  L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT,
  L11MissingDataConditionClass.STALE_REQUIRED_INPUT,
  L11MissingDataConditionClass.DEGRADED_REQUIRED_INPUT,
  L11MissingDataConditionClass.RESTRICTED_INPUT,
  L11MissingDataConditionClass.CONFLICTING_INPUT,
  L11MissingDataConditionClass.INSUFFICIENT_INPUT_SET,
  L11MissingDataConditionClass.UNKNOWN_VISIBILITY_STATE,
]);

const OPTIONAL_CONDITIONS: ReadonlySet<L11MissingDataConditionClass> = new Set([
  L11MissingDataConditionClass.ABSENT_OPTIONAL_INPUT,
  L11MissingDataConditionClass.STALE_OPTIONAL_INPUT,
  L11MissingDataConditionClass.DEGRADED_OPTIONAL_INPUT,
]);

export function isL11CriticalMissingCondition(
  c: L11MissingDataConditionClass,
): boolean {
  return CRITICAL_CONDITIONS.has(c);
}

export function isL11OptionalMissingCondition(
  c: L11MissingDataConditionClass,
): boolean {
  return OPTIONAL_CONDITIONS.has(c);
}

/**
 * §11.5.3 — Map an L11.3 formula-time input condition into the
 * L11.5 runtime taxonomy. The runtime engine pairs this mapping
 * with the dependency class of the underlying input surface to
 * disambiguate REQUIRED vs OPTIONAL.
 */
export function mapL11InputConditionToMissingDataCondition(
  c: L11InputConditionClass,
  required: boolean,
): L11MissingDataConditionClass {
  switch (c) {
    case L11InputConditionClass.REQUIRED_MISSING:
      return L11MissingDataConditionClass.ABSENT_REQUIRED_INPUT;
    case L11InputConditionClass.OPTIONAL_MISSING:
      return L11MissingDataConditionClass.ABSENT_OPTIONAL_INPUT;
    case L11InputConditionClass.STALE:
      return required
        ? L11MissingDataConditionClass.STALE_REQUIRED_INPUT
        : L11MissingDataConditionClass.STALE_OPTIONAL_INPUT;
    case L11InputConditionClass.DEGRADED:
      return required
        ? L11MissingDataConditionClass.DEGRADED_REQUIRED_INPUT
        : L11MissingDataConditionClass.DEGRADED_OPTIONAL_INPUT;
    case L11InputConditionClass.RESTRICTED:
      return L11MissingDataConditionClass.RESTRICTED_INPUT;
    case L11InputConditionClass.EVIDENCE_ONLY:
      return L11MissingDataConditionClass.EVIDENCE_ONLY_INPUT;
    case L11InputConditionClass.CONFLICTING:
      return L11MissingDataConditionClass.CONFLICTING_INPUT;
    default:
      return L11MissingDataConditionClass.UNKNOWN_VISIBILITY_STATE;
  }
}
