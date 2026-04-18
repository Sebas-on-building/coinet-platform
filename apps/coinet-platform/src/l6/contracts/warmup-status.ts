/**
 * L6.5 — Warmup Status
 *
 * §6.5.5.3 — Runtime warmup classification. A primitive may be contract-legal
 * but not yet warmup-ready: readiness is separate from validity.
 */

import { L6WarmupState } from './warmup-spec';

export enum L6ReadinessState {
  READY = 'READY',
  WARMING_UP = 'WARMING_UP',
  INSUFFICIENT_HISTORY = 'INSUFFICIENT_HISTORY',
  INSUFFICIENT_COVERAGE = 'INSUFFICIENT_COVERAGE',
  BLOCKED_BY_DEPENDENCY = 'BLOCKED_BY_DEPENDENCY',
  BLOCKED_BY_BASELINE = 'BLOCKED_BY_BASELINE',
}

export const ALL_READINESS_STATES: readonly L6ReadinessState[] = Object.values(L6ReadinessState);

export function readinessFromWarmupState(s: L6WarmupState): L6ReadinessState {
  return s as unknown as L6ReadinessState;
}

export interface L6WarmupStatus {
  readonly spec_id: string;
  readonly warmup_satisfied: boolean;
  readonly state: L6WarmupState;
  readonly readiness: L6ReadinessState;
  readonly reason: string;
  readonly observed_history_duration_ms: number;
  readonly observed_sample_count: number;
  readonly coverage_ratio: number;
}

export const REQUIRED_WARMUP_STATUS_FIELDS: readonly (keyof L6WarmupStatus)[] = [
  'spec_id', 'warmup_satisfied', 'state', 'readiness', 'reason',
  'observed_history_duration_ms', 'observed_sample_count', 'coverage_ratio',
];
