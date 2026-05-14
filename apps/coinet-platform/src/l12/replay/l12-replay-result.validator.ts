/**
 * L12.6 — Replay request/result validator (§12.6.17).
 */

import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from '../persistence/l12-persistence-violation-codes';
import {
  L12ReplayRequest,
  L12ReplayResult,
  L12ReplayStatus,
} from './l12-persistence-replay-adapter';

export function validateL12ReplayRequest(
  req: L12ReplayRequest,
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  if (!req.source_compute_run_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPAIR_PARENT_MISSING,
        'replay request missing source compute run id',
        req.replay_request_id,
      ),
    );
  }
  if (!req.scenario_set_id) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPLAY_INPUT_SNAPSHOT_MISSING,
        'replay request missing scenario_set_id',
        req.replay_request_id,
      ),
    );
  }
  if ((req as { allow_current_write?: unknown }).allow_current_write === true) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPLAY_WRITES_CURRENT,
        'replay request enabled allow_current_write',
        req.replay_request_id,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}

export function validateL12ReplayResult(
  result: L12ReplayResult,
  ctx?: {
    /** True if reasons were stripped from the result before reporting. */
    readonly hides_mismatch?: boolean;
  },
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  if (result.replay_status === L12ReplayStatus.MATCH) {
    if (
      !result.scenario_set_hash_match ||
      !result.trigger_hash_match ||
      !result.invalidation_hash_match ||
      !result.confidence_hash_match ||
      !result.shift_condition_hash_match ||
      !result.evidence_pack_hash_match ||
      result.mismatch_reason_codes.length > 0
    ) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_REPLAY_HASH_MISMATCH_HIDDEN,
          'replay reports MATCH while flagged mismatches present',
          result.replay_result_id,
        ),
      );
    }
  } else {
    if (result.mismatch_reason_codes.length === 0) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_REPLAY_HASH_MISMATCH_HIDDEN,
          'replay non-MATCH status without reason codes',
          result.replay_result_id,
        ),
      );
    }
  }

  if (ctx?.hides_mismatch === true) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_REPLAY_HASH_MISMATCH_HIDDEN,
        'replay result hides mismatch',
        result.replay_result_id,
      ),
    );
  }

  if (
    result.replay_status === L12ReplayStatus.EVIDENCE_MISSING ||
    !result.evidence_pack_hash_match
  ) {
    if (
      !result.mismatch_reason_codes.includes('EVIDENCE_MISSING') &&
      !result.mismatch_reason_codes.includes('EVIDENCE_HASH_MISMATCH') &&
      !result.mismatch_reason_codes.includes('REPLAY_INVENTED_EVIDENCE')
    ) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_REPLAY_INVENTED_EVIDENCE,
          'evidence drift not surfaced in mismatch reasons',
          result.replay_result_id,
        ),
      );
    }
  }

  return { ok: issues.length === 0, issues };
}
