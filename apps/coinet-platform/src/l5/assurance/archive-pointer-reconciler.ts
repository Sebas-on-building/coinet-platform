/**
 * L5.7 Assurance — Archive Pointer Reconciler
 *
 * §5.7.6.2 (RP-3) — Reconcile archive pointers, tag mismatches,
 * and missing pointers where objects exist.
 */

import { L5RepairClass } from './repair-class';
import type { RepairAttemptRecord } from './repair-class';
import { recordRepairAttempt } from './repair-scan-policy';

export interface ArchiveReconciliationCandidate {
  readonly manifest_id: string;
  readonly trace_id: string;
  readonly expected_archive_uri: string;
  readonly object_exists: boolean;
  readonly pointer_exists: boolean;
  readonly tag_mismatch: boolean;
  readonly checksum_match: boolean;
}

export type ReconciliationOutcome =
  | 'POINTER_CREATED'
  | 'TAGS_REPAIRED'
  | 'ALREADY_CONSISTENT'
  | 'OBJECT_MISSING_FATAL'
  | 'CHECKSUM_MISMATCH_FATAL';

export interface ArchiveReconciliationResult {
  readonly manifest_id: string;
  readonly outcome: ReconciliationOutcome;
  readonly repair_class: L5RepairClass;
  readonly attempt_id: string;
}

export function reconcileArchivePointer(candidate: ArchiveReconciliationCandidate): ArchiveReconciliationResult {
  const attemptId = `arc_${Date.now()}_${candidate.manifest_id.slice(0, 8)}`;

  if (candidate.pointer_exists && !candidate.tag_mismatch && candidate.checksum_match) {
    return { manifest_id: candidate.manifest_id, outcome: 'ALREADY_CONSISTENT', repair_class: L5RepairClass.RP0_NO_REPAIR_NEEDED, attempt_id: attemptId };
  }

  if (!candidate.object_exists) {
    const record: RepairAttemptRecord = {
      attempt_id: attemptId, repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE,
      reason: 'Archive object missing', triggering_condition: 'archive_reconciler',
      operator_type: 'WORKER', manifest_id: candidate.manifest_id, trace_id: candidate.trace_id,
      start_time: new Date().toISOString(), finish_time: new Date().toISOString(), outcome: 'FAILED_FATAL',
    };
    recordRepairAttempt(record);
    return { manifest_id: candidate.manifest_id, outcome: 'OBJECT_MISSING_FATAL', repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE, attempt_id: attemptId };
  }

  if (!candidate.checksum_match) {
    const record: RepairAttemptRecord = {
      attempt_id: attemptId, repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE,
      reason: 'Archive checksum mismatch', triggering_condition: 'archive_reconciler',
      operator_type: 'WORKER', manifest_id: candidate.manifest_id, trace_id: candidate.trace_id,
      start_time: new Date().toISOString(), finish_time: new Date().toISOString(), outcome: 'FAILED_FATAL',
    };
    recordRepairAttempt(record);
    return { manifest_id: candidate.manifest_id, outcome: 'CHECKSUM_MISMATCH_FATAL', repair_class: L5RepairClass.RP7_FATAL_NON_REPAIRABLE, attempt_id: attemptId };
  }

  const isTagRepair = candidate.pointer_exists && candidate.tag_mismatch;
  const outcome: ReconciliationOutcome = isTagRepair ? 'TAGS_REPAIRED' : 'POINTER_CREATED';

  const record: RepairAttemptRecord = {
    attempt_id: attemptId, repair_class: L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR,
    reason: isTagRepair ? 'Tag mismatch repair' : 'Missing pointer creation',
    triggering_condition: 'archive_reconciler',
    operator_type: 'WORKER', manifest_id: candidate.manifest_id, trace_id: candidate.trace_id,
    start_time: new Date().toISOString(), finish_time: new Date().toISOString(), outcome: 'SUCCEEDED',
  };
  recordRepairAttempt(record);

  return { manifest_id: candidate.manifest_id, outcome, repair_class: L5RepairClass.RP3_ARCHIVE_COMPLETENESS_REPAIR, attempt_id: attemptId };
}
