/**
 * L12.6 — Repair request/result validator (§12.6.18).
 */

import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from '../persistence/l12-persistence-violation-codes';
import {
  L12RepairRequest,
  L12RepairResult,
  L12RepairStatus,
} from './l12-persistence-repair-adapter';

export function validateL12RepairRequest(
  req: L12RepairRequest,
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  if (!req.parent_compute_run_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPAIR_PARENT_MISSING,
        'repair request missing parent compute run id',
        req.repair_request_id,
      ),
    );
  }
  if (!req.repair_reason) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPAIR_REASON_MISSING,
        'repair request missing reason',
        req.repair_request_id,
      ),
    );
  }
  if (!req.correction_lineage_refs || req.correction_lineage_refs.length === 0) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPAIR_LINEAGE_MISSING,
        'repair request missing correction lineage',
        req.repair_request_id,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}

export function validateL12RepairResult(
  result: L12RepairResult,
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  if (result.repair_compute_run_id === result.parent_compute_run_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPAIR_REUSES_PARENT_COMPUTE_RUN_ID,
        'repair result reuses parent compute run id',
        result.repair_result_id,
      ),
    );
  }

  // Surface specific code-mapped issues from change summary
  const codeMap: Record<string, L12PersistenceViolationCode> = {
    REPAIR_MUTATES_PRIOR_RUN: L12PersistenceViolationCode.L12P_REPAIR_MUTATES_PRIOR_RUN,
    REPAIR_MASQUERADES_AS_LIVE: L12PersistenceViolationCode.L12P_REPAIR_MASQUERADES_AS_LIVE,
    REPAIR_BYPASSES_SUPERSESSION: L12PersistenceViolationCode.L12P_REPAIR_BYPASSES_SUPERSESSION,
    REPAIR_REMOVED_TRIGGER_WITHOUT_EVIDENCE:
      L12PersistenceViolationCode.L12P_REPAIR_REMOVED_TRIGGER_WITHOUT_EVIDENCE,
    REPAIR_REMOVED_INVALIDATION_WITHOUT_EVIDENCE:
      L12PersistenceViolationCode.L12P_REPAIR_REMOVED_INVALIDATION_WITHOUT_EVIDENCE,
    REPAIR_UPGRADED_CONFIDENCE_WITHOUT_EVIDENCE:
      L12PersistenceViolationCode.L12P_REPAIR_UPGRADED_CONFIDENCE_WITHOUT_EVIDENCE,
    REPAIR_INVENTED_EVIDENCE: L12PersistenceViolationCode.L12P_REPAIR_INVENTED_EVIDENCE,
    REPAIR_REUSES_PARENT_COMPUTE_RUN_ID:
      L12PersistenceViolationCode.L12P_REPAIR_REUSES_PARENT_COMPUTE_RUN_ID,
    REPAIR_PARENT_MISSING: L12PersistenceViolationCode.L12P_REPAIR_PARENT_MISSING,
    REPAIR_REASON_MISSING: L12PersistenceViolationCode.L12P_REPAIR_REASON_MISSING,
    REPAIR_LINEAGE_MISSING: L12PersistenceViolationCode.L12P_REPAIR_LINEAGE_MISSING,
  };
  for (const code of result.repair_change_summary_codes) {
    const mapped = codeMap[code];
    if (mapped) {
      issues.push(
        l12PersistenceIssueOf(
          mapped,
          `repair surfaced ${code}`,
          result.repair_result_id,
        ),
      );
    }
  }

  if (
    result.repair_status === L12RepairStatus.COMPLETED &&
    result.repair_change_summary_codes.length > 0
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPAIR_MUTATES_PRIOR_RUN,
        'repair reports COMPLETED while change summary contains rejection codes',
        result.repair_result_id,
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
