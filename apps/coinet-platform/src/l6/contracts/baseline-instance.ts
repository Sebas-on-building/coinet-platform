/**
 * L6.5 — Baseline Instance
 *
 * §6.5.4.3 — A `L6TemporalBaselineInstance` is the computed baseline at a
 * scope + window. Its identity must be replay-reconstructable from the
 * declared inputs, windows, method, version, and historical mode.
 */

import { L6ScopeType } from './primitive-contract';
import { L6BaselineType } from './baseline-spec';

export enum L6BaselineQualityState {
  CLEAN = 'CLEAN',
  DEGRADED = 'DEGRADED',
  PROVISIONAL = 'PROVISIONAL',
  BLOCKED = 'BLOCKED',
}

export const ALL_BASELINE_QUALITY_STATES: readonly L6BaselineQualityState[] =
  Object.values(L6BaselineQualityState);

export interface L6BaselineObservedRange {
  readonly start: string;
  readonly end: string;
  readonly observation_count: number;
}

export interface L6TemporalBaselineInstance {
  readonly baseline_instance_id: string;
  readonly baseline_id: string;
  readonly baseline_type: L6BaselineType;
  readonly scope_type: L6ScopeType;
  readonly scope_id: string;
  readonly window_id: string;
  readonly observed_range: L6BaselineObservedRange;
  readonly coverage_ratio: number;
  readonly baseline_value: number | null;
  readonly dispersion_value: number | null;
  readonly baseline_quality_state: L6BaselineQualityState;
  readonly historical_mode: boolean;
  readonly policy_version: string;
}

export const REQUIRED_BASELINE_INSTANCE_FIELDS: readonly (keyof L6TemporalBaselineInstance)[] = [
  'baseline_instance_id', 'baseline_id', 'baseline_type',
  'scope_type', 'scope_id', 'window_id', 'observed_range',
  'coverage_ratio', 'baseline_quality_state', 'historical_mode', 'policy_version',
];
