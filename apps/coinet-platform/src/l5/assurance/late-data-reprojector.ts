/**
 * L5.7 Assurance — Late Data Reprojector
 *
 * §5.7.6.2 (RP-4) — Late-arriving analytical facts, history backfill,
 * score-history correction without authority mutation.
 */

import { L5RepairClass } from './repair-class';
import type { RepairAttemptRecord } from './repair-class';
import { recordRepairAttempt } from './repair-scan-policy';

export type LateDataKind =
  | 'HISTORICAL_ANALYTICAL_FACT'
  | 'HISTORY_BACKFILL'
  | 'SCORE_HISTORY_CORRECTION'
  | 'FEATURE_RECOMPUTATION';

export interface LateDataReprojectionRequest {
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly late_data_kind: LateDataKind;
  readonly original_timestamp: string;
  readonly arrival_timestamp: string;
  readonly requires_rollup_refresh: boolean;
}

export interface LateDataReprojectionResult {
  readonly manifest_id: string;
  readonly late_data_kind: LateDataKind;
  readonly outcome: 'REPROJECTED' | 'REJECTED_AUTHORITY_MUTATION' | 'FAILED';
  readonly authority_mutated: false;
  readonly projections_updated: readonly string[];
  readonly attempt_id: string;
}

export function reprojectLateData(req: LateDataReprojectionRequest): LateDataReprojectionResult {
  const attemptId = `ldr_${Date.now()}_${req.manifest_id.slice(0, 8)}`;

  const projections: string[] = [];
  if (req.late_data_kind === 'HISTORICAL_ANALYTICAL_FACT' || req.late_data_kind === 'HISTORY_BACKFILL') {
    projections.push('CLICKHOUSE_ANALYTICAL');
  }
  if (req.requires_rollup_refresh) {
    projections.push('CLICKHOUSE_ROLLUP');
  }
  if (req.late_data_kind === 'SCORE_HISTORY_CORRECTION') {
    projections.push('CLICKHOUSE_SCORE_HISTORY');
  }
  if (req.late_data_kind === 'FEATURE_RECOMPUTATION') {
    projections.push('CLICKHOUSE_FEATURE');
  }

  const record: RepairAttemptRecord = {
    attempt_id: attemptId,
    repair_class: L5RepairClass.RP4_LATE_DATA_REPROJECTION,
    reason: `Late data: ${req.late_data_kind}`,
    triggering_condition: 'late_data_reprojector',
    operator_type: 'WORKER',
    manifest_id: req.manifest_id,
    trace_id: req.trace_id,
    start_time: req.arrival_timestamp,
    finish_time: new Date().toISOString(),
    outcome: 'SUCCEEDED',
  };
  recordRepairAttempt(record);

  return {
    manifest_id: req.manifest_id,
    late_data_kind: req.late_data_kind,
    outcome: 'REPROJECTED',
    authority_mutated: false,
    projections_updated: projections,
    attempt_id: attemptId,
  };
}
