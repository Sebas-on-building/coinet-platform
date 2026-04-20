/**
 * L9.5 — Window Policy Validator
 *
 * §9.5.4 — Validates L9WindowDoctrine instances against the frozen
 * per-family window policy table.
 */

import { L9SequenceFamily } from '../contracts/sequence-family';
import {
  L9WindowClass,
  L9WindowDoctrine,
  L9WindowPolicyEntry,
  getL9WindowPolicy,
} from '../contracts/l9-window-policy';
import { L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9WindowValidationInput {
  readonly family: L9SequenceFamily;
  readonly window: L9WindowDoctrine;
}

export interface L9WindowValidationResult {
  readonly ok: boolean;
  readonly policy: L9WindowPolicyEntry | undefined;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

export function validateL9Window(
  input: L9WindowValidationInput,
): L9WindowValidationResult {
  const violations: L9TemporalSemanticViolation[] = [];
  const policy = getL9WindowPolicy(input.family, input.window.window_class);

  if (!policy) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_CLASS_ILLEGAL_FOR_FAMILY,
      L9TemporalSemanticTier.WINDOW,
      `window class ${input.window.window_class} illegal for family ${input.family}`,
    ));
    return { ok: false, policy: undefined, violations };
  }

  const w = input.window;

  // §9.5.4.3 — anchor requirement per policy
  if (policy.requires_anchor && !w.anchor_ref) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_ANCHOR_MISSING,
      L9TemporalSemanticTier.WINDOW,
      `${w.window_class} requires an anchor_ref for ${input.family}`,
    ));
  }

  const start = Date.parse(w.start);
  const end = Date.parse(w.end);
  if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_END_BEFORE_START,
      L9TemporalSemanticTier.WINDOW,
      `${w.window_class} end is before start`,
    ));
  }

  if (w.allowable_drift_ms < 0) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_DRIFT_NEGATIVE,
      L9TemporalSemanticTier.WINDOW,
      'allowable_drift_ms must be non-negative',
    ));
  }
  // §9.5.4.4 — drift may not exceed policy default, otherwise the
  // engine is silently widening tolerances
  if (w.allowable_drift_ms > policy.default_drift_ms * 2) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_DRIFT_EXCEEDS_POLICY,
      L9TemporalSemanticTier.WINDOW,
      `allowable_drift_ms=${w.allowable_drift_ms} exceeds policy for ${w.window_class}`,
    ));
  }

  if (w.freshness_ceiling_ms < 0) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_FRESHNESS_CEILING_NEGATIVE,
      L9TemporalSemanticTier.WINDOW,
      'freshness_ceiling_ms must be non-negative',
    ));
  }

  // §9.5.4.4 — window span may not exceed 2x the policy default
  const span = end - start;
  if (Number.isFinite(span) && span > policy.default_span_ms * 2) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_SPAN_EXCEEDS_POLICY,
      L9TemporalSemanticTier.WINDOW,
      `window span ${span}ms exceeds 2x policy default for ${w.window_class}`,
    ));
  }

  // §9.5.4.3 — late-data flag must match policy (cannot silently
  // flip policy)
  if (w.late_data_may_reinterpret !== policy.late_data_may_reinterpret) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.WIN_LATE_DATA_FLAG_MISMATCH,
      L9TemporalSemanticTier.WINDOW,
      `late_data_may_reinterpret=${w.late_data_may_reinterpret} disagrees with policy`,
    ));
  }

  return { ok: violations.length === 0, policy, violations };
}
