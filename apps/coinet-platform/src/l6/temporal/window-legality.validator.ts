/**
 * L6.5 §6.5.3.7 — WindowLegalityValidator
 *
 * Enforces:
 *   - window constructed from governed library (L6StandardWindowDuration)
 *   - anchor and alignment policies declared
 *   - coverage measurable and satisfies minimum
 *   - late-data inclusion policy explicit
 *   - deterministic window_id composable from spec + scope + anchor + policy
 */

import {
  ALL_WINDOW_ANCHOR_POLICIES,
  ALL_WINDOW_ALIGNMENT_POLICIES,
  ALL_LATE_DATA_INCLUSION_POLICIES,
  L6TemporalWindowSpec,
  REQUIRED_WINDOW_SPEC_FIELDS,
  STANDARD_WINDOW_DURATION_MS,
  isGovernedDuration,
} from '../contracts/window-spec';
import {
  L6TemporalWindowInstance,
  REQUIRED_WINDOW_INSTANCE_FIELDS,
  isWindowInstanceOrderLegal,
} from '../contracts/window-instance';
import { L6TemporalViolationCode } from '../contracts/temporal-honesty';
import { createHash } from 'crypto';

export interface L6WindowLegalityViolation {
  readonly code: L6TemporalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6WindowLegalityResult {
  readonly ok: boolean;
  readonly violations: readonly L6WindowLegalityViolation[];
  readonly expected_window_id: string | null;
}

export function canonicalWindowId(
  spec: Pick<L6TemporalWindowSpec, 'spec_id' | 'anchor_policy' | 'alignment_policy' | 'policy_version'>,
  scope_type: string,
  scope_id: string,
  anchor_time: string,
  historical_mode: boolean,
  late_data_flag: boolean,
): string {
  const payload = [
    spec.spec_id,
    spec.anchor_policy,
    spec.alignment_policy,
    spec.policy_version,
    scope_type,
    scope_id,
    anchor_time,
    historical_mode ? 'H' : 'L',
    late_data_flag ? 'LD' : 'OT',
  ].join('|');
  return 'win_' + createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

export class WindowLegalityValidator {
  validateSpec(spec: L6TemporalWindowSpec): L6WindowLegalityResult {
    const v: L6WindowLegalityViolation[] = [];

    for (const f of REQUIRED_WINDOW_SPEC_FIELDS) {
      if (spec[f] === undefined || spec[f] === null || (typeof spec[f] === 'string' && spec[f] === '')) {
        v.push({
          code: L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY,
          field: String(f),
          detail: 'required window spec field missing',
        });
      }
    }

    if (!isGovernedDuration(spec.duration)) {
      // CUSTOM must provide an explicit duration_ms, otherwise illegal.
      if (!spec.duration_ms || spec.duration_ms <= 0) {
        v.push({
          code: L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY,
          field: 'duration',
          detail: 'CUSTOM duration requires duration_ms > 0 with explicit governance',
        });
      }
    } else {
      const expected = STANDARD_WINDOW_DURATION_MS[spec.duration];
      if (expected !== null && spec.duration_ms !== expected) {
        v.push({
          code: L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY,
          field: 'duration_ms',
          detail: `duration_ms=${spec.duration_ms} does not match standard ${spec.duration}=${expected}`,
        });
      }
    }

    if (!ALL_WINDOW_ANCHOR_POLICIES.includes(spec.anchor_policy)) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_ANCHOR_UNDECLARED,
        field: 'anchor_policy',
        detail: `${spec.anchor_policy} not in governed set`,
      });
    }
    if (!ALL_WINDOW_ALIGNMENT_POLICIES.includes(spec.alignment_policy)) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY,
        field: 'alignment_policy',
        detail: `${spec.alignment_policy} not in governed set`,
      });
    }
    if (!ALL_LATE_DATA_INCLUSION_POLICIES.includes(spec.late_data_inclusion_policy)) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY,
        field: 'late_data_inclusion_policy',
        detail: `${spec.late_data_inclusion_policy} not in governed set`,
      });
    }

    if (spec.min_coverage_ratio < 0 || spec.min_coverage_ratio > 1) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_COVERAGE_INSUFFICIENT,
        field: 'min_coverage_ratio',
        detail: 'must be in [0,1]',
      });
    }

    return { ok: v.length === 0, violations: v, expected_window_id: null };
  }

  validateInstance(
    spec: L6TemporalWindowSpec,
    instance: L6TemporalWindowInstance,
  ): L6WindowLegalityResult {
    const v: L6WindowLegalityViolation[] = [];

    // Spec-side fails are propagated first.
    const specRes = this.validateSpec(spec);
    v.push(...specRes.violations);

    for (const f of REQUIRED_WINDOW_INSTANCE_FIELDS) {
      if (
        instance[f] === undefined ||
        instance[f] === null ||
        (typeof instance[f] === 'string' && instance[f] === '')
      ) {
        v.push({
          code: L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY,
          field: String(f),
          detail: 'required window instance field missing',
        });
      }
    }

    if (instance.spec_id !== spec.spec_id) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_NOT_FROM_GOVERNED_LIBRARY,
        field: 'spec_id',
        detail: `instance.spec_id=${instance.spec_id} does not match spec.spec_id=${spec.spec_id}`,
      });
    }

    if (!isWindowInstanceOrderLegal(instance)) {
      v.push({
        code: L6TemporalViolationCode.TIME_ORDERING_VIOLATED,
        field: 'window_start|window_end|anchor_time',
        detail: 'window ordering violates start<=end, anchor>=start',
      });
    }

    if (instance.coverage_ratio < spec.min_coverage_ratio) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_COVERAGE_INSUFFICIENT,
        field: 'coverage_ratio',
        detail: `coverage ${instance.coverage_ratio} < required ${spec.min_coverage_ratio}`,
      });
    }

    const expected_id = canonicalWindowId(
      spec,
      instance.scope_type,
      instance.scope_id,
      instance.anchor_time,
      instance.historical_mode,
      instance.late_data_flag,
    );
    if (instance.window_id && instance.window_id !== expected_id) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_IDENTITY_NON_DETERMINISTIC,
        field: 'window_id',
        detail: `window_id=${instance.window_id} != canonical=${expected_id}`,
      });
    }

    if (instance.policy_version !== spec.policy_version) {
      v.push({
        code: L6TemporalViolationCode.WINDOW_IDENTITY_NON_DETERMINISTIC,
        field: 'policy_version',
        detail: `instance.policy_version=${instance.policy_version} does not match spec.policy_version=${spec.policy_version}`,
      });
    }

    return { ok: v.length === 0, violations: v, expected_window_id: expected_id };
  }
}
