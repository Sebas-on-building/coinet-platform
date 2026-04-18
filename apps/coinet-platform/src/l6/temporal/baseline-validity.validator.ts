/**
 * L6.5 §6.5.4.7 — BaselineValidityValidator
 *
 * Enforces:
 *   - required history / warmup / coverage
 *   - baseline_type allowed by the declared spec
 *   - peer-relative / regime-relative allowance
 *   - deterministic baseline_instance_id reconstructable from declared inputs
 */

import {
  L6TemporalBaselineSpec,
  L6BaselineFailureCode,
  REQUIRED_BASELINE_SPEC_FIELDS,
} from '../contracts/baseline-spec';
import {
  L6TemporalBaselineInstance,
  L6BaselineQualityState,
  REQUIRED_BASELINE_INSTANCE_FIELDS,
} from '../contracts/baseline-instance';
import { L6TemporalViolationCode } from '../contracts/temporal-honesty';
import { createHash } from 'crypto';

export interface L6BaselineValidityViolation {
  readonly code: L6TemporalViolationCode;
  readonly field: string;
  readonly detail: string;
  readonly failure_code: L6BaselineFailureCode | null;
}

export interface L6BaselineValidityResult {
  readonly ok: boolean;
  readonly violations: readonly L6BaselineValidityViolation[];
  readonly expected_instance_id: string | null;
}

export function canonicalBaselineInstanceId(
  spec: Pick<L6TemporalBaselineSpec, 'baseline_id' | 'baseline_type' | 'policy_version'>,
  scope_type: string,
  scope_id: string,
  window_id: string,
  historical_mode: boolean,
): string {
  const payload = [
    spec.baseline_id,
    spec.baseline_type,
    spec.policy_version,
    scope_type,
    scope_id,
    window_id,
    historical_mode ? 'H' : 'L',
  ].join('|');
  return 'bli_' + createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

export interface BaselineExecutionContext {
  readonly peer_relative_in_use: boolean;
  readonly regime_relative_in_use: boolean;
  readonly observed_sample_count: number;
  readonly observed_history_duration_ms: number;
  readonly window_legal: boolean;
  readonly inputs_legal: boolean;
}

export class BaselineValidityValidator {
  validateSpec(spec: L6TemporalBaselineSpec): L6BaselineValidityResult {
    const v: L6BaselineValidityViolation[] = [];
    for (const f of REQUIRED_BASELINE_SPEC_FIELDS) {
      const val = spec[f];
      if (val === undefined || val === null) {
        v.push({
          code: L6TemporalViolationCode.BASELINE_ILLEGAL,
          field: String(f),
          detail: 'required baseline spec field missing',
          failure_code: null,
        });
      }
    }
    if (spec.min_coverage_ratio < 0 || spec.min_coverage_ratio > 1) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'min_coverage_ratio',
        detail: 'must be in [0,1]',
        failure_code: null,
      });
    }
    if (spec.min_observation_count < 1) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'min_observation_count',
        detail: 'must be >= 1',
        failure_code: null,
      });
    }
    if (spec.warmup_duration_ms < 0) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'warmup_duration_ms',
        detail: 'must be >= 0',
        failure_code: null,
      });
    }
    return { ok: v.length === 0, violations: v, expected_instance_id: null };
  }

  validateInstance(
    spec: L6TemporalBaselineSpec,
    instance: L6TemporalBaselineInstance,
    ctx: BaselineExecutionContext,
  ): L6BaselineValidityResult {
    const v: L6BaselineValidityViolation[] = [];
    const specRes = this.validateSpec(spec);
    v.push(...specRes.violations);

    for (const f of REQUIRED_BASELINE_INSTANCE_FIELDS) {
      const val = instance[f];
      if (val === undefined || val === null) {
        v.push({
          code: L6TemporalViolationCode.BASELINE_ILLEGAL,
          field: String(f),
          detail: 'required baseline instance field missing',
          failure_code: null,
        });
      }
    }

    if (instance.baseline_id !== spec.baseline_id) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'baseline_id',
        detail: `instance baseline_id=${instance.baseline_id} does not match spec ${spec.baseline_id}`,
        failure_code: null,
      });
    }
    if (instance.baseline_type !== spec.baseline_type) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'baseline_type',
        detail: `instance baseline_type mismatch`,
        failure_code: null,
      });
    }

    // Coverage
    if (instance.coverage_ratio < spec.min_coverage_ratio) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'coverage_ratio',
        detail: `coverage ${instance.coverage_ratio} < required ${spec.min_coverage_ratio}`,
        failure_code: L6BaselineFailureCode.INSUFFICIENT_COVERAGE,
      });
    }
    // Sample count
    if (ctx.observed_sample_count < spec.min_observation_count) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'observed_sample_count',
        detail: `${ctx.observed_sample_count} < min_observation_count ${spec.min_observation_count}`,
        failure_code: L6BaselineFailureCode.INSUFFICIENT_OBSERVATIONS,
      });
    }
    // Warmup
    if (ctx.observed_history_duration_ms < spec.warmup_duration_ms) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'observed_history_duration_ms',
        detail: `${ctx.observed_history_duration_ms}ms < warmup ${spec.warmup_duration_ms}ms`,
        failure_code: L6BaselineFailureCode.WARMUP_NOT_SATISFIED,
      });
    }
    // Peer / regime allowance
    if (ctx.peer_relative_in_use && !spec.peer_relative_allowed) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'peer_relative_in_use',
        detail: 'peer-relative baseline used but spec forbids it',
        failure_code: L6BaselineFailureCode.PEER_RELATIVE_NOT_ALLOWED,
      });
    }
    if (ctx.regime_relative_in_use && !spec.regime_relative_allowed) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'regime_relative_in_use',
        detail: 'regime-relative baseline used but spec forbids it',
        failure_code: L6BaselineFailureCode.REGIME_RELATIVE_NOT_ALLOWED,
      });
    }
    // Window legality propagated
    if (!ctx.window_legal) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'window_id',
        detail: 'baseline window failed legality',
        failure_code: L6BaselineFailureCode.BASELINE_WINDOW_INVALID,
      });
    }
    if (!ctx.inputs_legal) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'input_surface_ids',
        detail: 'baseline inputs failed upstream legality',
        failure_code: L6BaselineFailureCode.BASELINE_INPUT_ILLEGAL,
      });
    }

    // Validity vs quality-state coherence: a BLOCKED baseline must not carry a
    // numeric baseline_value; a CLEAN baseline must.
    if (
      instance.baseline_quality_state === L6BaselineQualityState.BLOCKED &&
      instance.baseline_value !== null
    ) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'baseline_value',
        detail: 'BLOCKED baseline must not emit a numeric baseline_value',
        failure_code: null,
      });
    }
    if (
      instance.baseline_quality_state === L6BaselineQualityState.CLEAN &&
      instance.baseline_value === null
    ) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_ILLEGAL,
        field: 'baseline_value',
        detail: 'CLEAN baseline must carry a numeric baseline_value',
        failure_code: null,
      });
    }

    // Deterministic instance id
    const expected_id = canonicalBaselineInstanceId(
      spec,
      instance.scope_type,
      instance.scope_id,
      instance.window_id,
      instance.historical_mode,
    );
    if (instance.baseline_instance_id && instance.baseline_instance_id !== expected_id) {
      v.push({
        code: L6TemporalViolationCode.BASELINE_REPLAY_NOT_RECONSTRUCTABLE,
        field: 'baseline_instance_id',
        detail: `baseline_instance_id=${instance.baseline_instance_id} != canonical=${expected_id}`,
        failure_code: null,
      });
    }

    return { ok: v.length === 0, violations: v, expected_instance_id: expected_id };
  }
}
