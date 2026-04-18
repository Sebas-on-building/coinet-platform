/**
 * L6.5 §6.5.5.7 — WarmupLegalityValidator
 *
 * Enforces the rule that a primitive may not be declared VALID / an event may
 * not be CONFIRMED while warmup is unsatisfied. Also verifies the default
 * 3× longest-baseline-window rule when no override is declared.
 */

import {
  L6WarmupSpec,
  L6WarmupState,
  L6WarmupOverrideMode,
  REQUIRED_WARMUP_SPEC_FIELDS,
  defaultRequiredWarmupMs,
} from '../contracts/warmup-spec';
import { L6WarmupStatus, L6ReadinessState, REQUIRED_WARMUP_STATUS_FIELDS } from '../contracts/warmup-status';
import { L6FeatureValidityState } from '../contracts/feature-validity-state';
import { L6EventLifecycleState } from '../contracts/event-lifecycle-state';
import { L6TemporalViolationCode } from '../contracts/temporal-honesty';

export interface L6WarmupLegalityViolation {
  readonly code: L6TemporalViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6WarmupLegalityResult {
  readonly ok: boolean;
  readonly violations: readonly L6WarmupLegalityViolation[];
  readonly derived_state: L6WarmupState;
}

export interface WarmupExecutionContext {
  readonly baseline_window_durations_ms: readonly number[];
  readonly dependency_blocked: boolean;
  readonly baseline_blocked: boolean;
}

export class WarmupLegalityValidator {
  validateSpec(spec: L6WarmupSpec): L6WarmupLegalityResult {
    const v: L6WarmupLegalityViolation[] = [];
    for (const f of REQUIRED_WARMUP_SPEC_FIELDS) {
      const val = spec[f];
      if (val === undefined || val === null) {
        v.push({
          code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED,
          field: String(f),
          detail: 'required warmup spec field missing',
        });
      }
    }
    if (spec.min_coverage_ratio < 0 || spec.min_coverage_ratio > 1) {
      v.push({
        code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED,
        field: 'min_coverage_ratio',
        detail: 'must be in [0,1]',
      });
    }
    return { ok: v.length === 0, violations: v, derived_state: L6WarmupState.READY };
  }

  /**
   * Derives a `L6WarmupStatus`-compatible state from spec + runtime observations.
   * This is a pure deterministic decision used by the runtime.
   */
  deriveStatus(
    spec: L6WarmupSpec,
    observed: {
      observed_history_duration_ms: number;
      observed_sample_count: number;
      coverage_ratio: number;
    },
    ctx: WarmupExecutionContext,
  ): L6WarmupStatus {
    let state = L6WarmupState.READY;
    let reason = 'warmup satisfied';

    const requiredHistory =
      spec.override_mode === L6WarmupOverrideMode.CONTRACT_OVERRIDE
        ? spec.required_history_duration_ms
        : Math.max(
            spec.required_history_duration_ms,
            defaultRequiredWarmupMs(ctx.baseline_window_durations_ms),
          );

    if (ctx.dependency_blocked) {
      state = L6WarmupState.BLOCKED_BY_DEPENDENCY;
      reason = 'upstream dependency blocked';
    } else if (ctx.baseline_blocked) {
      state = L6WarmupState.BLOCKED_BY_BASELINE;
      reason = 'baseline legality failed';
    } else if (observed.observed_history_duration_ms < requiredHistory) {
      state =
        observed.observed_history_duration_ms === 0
          ? L6WarmupState.INSUFFICIENT_HISTORY
          : L6WarmupState.WARMING_UP;
      reason = `history ${observed.observed_history_duration_ms}ms < required ${requiredHistory}ms`;
    } else if (observed.observed_sample_count < spec.min_observation_count) {
      state = L6WarmupState.INSUFFICIENT_HISTORY;
      reason = `samples ${observed.observed_sample_count} < required ${spec.min_observation_count}`;
    } else if (observed.coverage_ratio < spec.min_coverage_ratio) {
      state = L6WarmupState.INSUFFICIENT_COVERAGE;
      reason = `coverage ${observed.coverage_ratio} < required ${spec.min_coverage_ratio}`;
    }

    const warmup_satisfied = state === L6WarmupState.READY;
    const readiness = state as unknown as L6ReadinessState;

    return {
      spec_id: spec.spec_id,
      warmup_satisfied,
      state,
      readiness,
      reason,
      observed_history_duration_ms: observed.observed_history_duration_ms,
      observed_sample_count: observed.observed_sample_count,
      coverage_ratio: observed.coverage_ratio,
    };
  }

  validateStatus(status: L6WarmupStatus): L6WarmupLegalityResult {
    const v: L6WarmupLegalityViolation[] = [];
    for (const f of REQUIRED_WARMUP_STATUS_FIELDS) {
      const val = status[f];
      if (val === undefined || val === null) {
        v.push({
          code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED,
          field: String(f),
          detail: 'required warmup status field missing',
        });
      }
    }
    if (status.warmup_satisfied && status.state !== L6WarmupState.READY) {
      v.push({
        code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED,
        field: 'warmup_satisfied',
        detail: `warmup_satisfied=true but state=${status.state}`,
      });
    }
    if (!status.warmup_satisfied && status.state === L6WarmupState.READY) {
      v.push({
        code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED,
        field: 'state',
        detail: 'state=READY but warmup_satisfied=false',
      });
    }
    return { ok: v.length === 0, violations: v, derived_state: status.state };
  }

  /**
   * §6.5.5.4 — VALID emission requires warmup satisfied.
   */
  isFeatureEmissionLegal(
    requested: L6FeatureValidityState,
    status: L6WarmupStatus,
    spec: L6WarmupSpec,
  ): L6WarmupLegalityResult {
    const v: L6WarmupLegalityViolation[] = [];
    if (
      spec.blocks_emission_until_satisfied &&
      !status.warmup_satisfied &&
      requested === L6FeatureValidityState.VALID
    ) {
      v.push({
        code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED,
        field: 'validity_state',
        detail: `VALID emission forbidden while warmup state=${status.state}`,
      });
    }
    return { ok: v.length === 0, violations: v, derived_state: status.state };
  }

  /**
   * §6.5.5.6 — CONFIRMED event requires event-readiness warmup satisfied.
   */
  isEventConfirmationLegal(
    targetState: L6EventLifecycleState,
    status: L6WarmupStatus,
    spec: L6WarmupSpec,
  ): L6WarmupLegalityResult {
    const v: L6WarmupLegalityViolation[] = [];
    if (
      spec.event_readiness_required &&
      !status.warmup_satisfied &&
      targetState === L6EventLifecycleState.CONFIRMED
    ) {
      v.push({
        code: L6TemporalViolationCode.WARMUP_NOT_SATISFIED,
        field: 'event_lifecycle_state',
        detail: `CONFIRMED transition forbidden while warmup state=${status.state}`,
      });
    }
    return { ok: v.length === 0, violations: v, derived_state: status.state };
  }
}
