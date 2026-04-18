/**
 * L6.5 — Warmup Specification
 *
 * §6.5.5 — Warmup is a legal readiness condition. Default rule:
 *   required historical duration ≥ 3× the longest required baseline window
 * unless explicitly overridden by the feature contract.
 */

export enum L6WarmupState {
  READY = 'READY',
  WARMING_UP = 'WARMING_UP',
  INSUFFICIENT_HISTORY = 'INSUFFICIENT_HISTORY',
  INSUFFICIENT_COVERAGE = 'INSUFFICIENT_COVERAGE',
  BLOCKED_BY_DEPENDENCY = 'BLOCKED_BY_DEPENDENCY',
  BLOCKED_BY_BASELINE = 'BLOCKED_BY_BASELINE',
}

export const ALL_WARMUP_STATES: readonly L6WarmupState[] = Object.values(L6WarmupState);

export function isWarmupReady(state: L6WarmupState): boolean {
  return state === L6WarmupState.READY;
}

export enum L6WarmupOverrideMode {
  NONE = 'NONE',
  CONTRACT_OVERRIDE = 'CONTRACT_OVERRIDE',
  EVENT_READINESS_RULE = 'EVENT_READINESS_RULE',
}

export interface L6WarmupSpec {
  readonly spec_id: string;
  readonly required_history_duration_ms: number;
  readonly min_observation_count: number;
  readonly min_coverage_ratio: number;
  readonly override_mode: L6WarmupOverrideMode;
  readonly event_readiness_required: boolean;
  readonly blocks_emission_until_satisfied: boolean;
  readonly policy_version: string;
}

export const REQUIRED_WARMUP_SPEC_FIELDS: readonly (keyof L6WarmupSpec)[] = [
  'spec_id', 'required_history_duration_ms', 'min_observation_count',
  'min_coverage_ratio', 'override_mode', 'event_readiness_required',
  'blocks_emission_until_satisfied', 'policy_version',
];

/**
 * The default 3× longest-baseline-window rule. `baseline_windows_ms` is the
 * list of required baseline window durations declared by the feature. The
 * policy is intentionally pure/deterministic so replay matches live.
 */
export function defaultRequiredWarmupMs(baseline_windows_ms: readonly number[]): number {
  if (baseline_windows_ms.length === 0) return 0;
  return 3 * Math.max(...baseline_windows_ms);
}
