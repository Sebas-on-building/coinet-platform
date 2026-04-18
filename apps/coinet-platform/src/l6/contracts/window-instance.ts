/**
 * L6.5 — Window Instance
 *
 * §6.5.3.3 / §6.5.3.6 — A `L6TemporalWindowInstance` is the materialized
 * instance of a `L6TemporalWindowSpec` at a specific scope and anchor time.
 * Its `window_id` is deterministic over (spec, scope, anchor, alignment,
 * policy version, historical/late-data mode).
 */

import { L6ScopeType } from './primitive-contract';

export interface L6TemporalWindowInstance {
  readonly window_id: string;
  readonly spec_id: string;
  readonly scope_type: L6ScopeType;
  readonly scope_id: string;
  readonly window_start: string;
  readonly window_end: string;
  readonly anchor_time: string;
  readonly coverage_ratio: number;
  readonly late_data_flag: boolean;
  readonly historical_mode: boolean;
  readonly policy_version: string;
}

export const REQUIRED_WINDOW_INSTANCE_FIELDS: readonly (keyof L6TemporalWindowInstance)[] = [
  'window_id', 'spec_id', 'scope_type', 'scope_id',
  'window_start', 'window_end', 'anchor_time',
  'coverage_ratio', 'late_data_flag', 'historical_mode', 'policy_version',
];

export function isWindowInstanceOrderLegal(w: L6TemporalWindowInstance): boolean {
  return w.window_start <= w.window_end && w.anchor_time >= w.window_start;
}
