/**
 * L5.7 Assurance — Replay Entry Points
 *
 * §5.7.4.3 — 7 entry points (A–G)
 */

import { L5ReplayFidelity } from './replay-fidelity';

export type ReplayEntryPointType =
  | 'TRACE_ID'
  | 'REPLAY_WINDOW_ID'
  | 'CANONICAL_SCOPE_TIME_RANGE'
  | 'REPORT_ID'
  | 'SCORE_ID'
  | 'MANIFEST_ID'
  | 'ENVELOPE_ID';

export const ALL_ENTRY_POINT_TYPES: readonly ReplayEntryPointType[] = [
  'TRACE_ID', 'REPLAY_WINDOW_ID', 'CANONICAL_SCOPE_TIME_RANGE',
  'REPORT_ID', 'SCORE_ID', 'MANIFEST_ID', 'ENVELOPE_ID',
];

export interface ScopeTimeRange {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly start_at: string;
  readonly end_at: string;
}

export interface L5ReplayRequest {
  readonly entry_point_type: ReplayEntryPointType;
  readonly value: string | ScopeTimeRange;
  readonly fidelity: L5ReplayFidelity;
}

export function isValidReplayRequest(req: L5ReplayRequest): boolean {
  if (!ALL_ENTRY_POINT_TYPES.includes(req.entry_point_type)) return false;
  if (!Object.values(L5ReplayFidelity).includes(req.fidelity)) return false;
  if (req.entry_point_type === 'CANONICAL_SCOPE_TIME_RANGE') {
    if (typeof req.value === 'string') return false;
    const scope = req.value as ScopeTimeRange;
    return !!scope.scope_type && !!scope.scope_id && !!scope.start_at && !!scope.end_at;
  }
  return typeof req.value === 'string' && req.value.length > 0;
}
