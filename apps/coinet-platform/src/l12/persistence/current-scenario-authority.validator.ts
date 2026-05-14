/**
 * L12.6 — Current scenario authority validator (§12.6.8).
 */

import {
  L12CurrentScenarioRecord,
  isL12BlockedCurrentReadiness,
} from '../contracts/l12-current-authority';
import {
  L12PersistenceValidationResult,
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
  l12PersistenceIssueOf,
} from './l12-persistence-violation-codes';
import { L12ScenarioRunMode } from '../runtime/scenario-compute-run';

export function validateL12CurrentScenarioRecord(
  record: L12CurrentScenarioRecord,
  ctx?: { source_run_mode?: L12ScenarioRunMode },
): L12PersistenceValidationResult {
  const issues: L12PersistenceViolationIssue[] = [];

  const required: Array<[keyof L12CurrentScenarioRecord, string]> = [
    ['scenario_set_id', 'scenario_set_id'],
    ['base_case_ref', 'base_case_ref'],
    ['primary_scenario_ref', 'primary_scenario_ref'],
    ['path_confidence_profile_ref', 'path_confidence_profile_ref'],
    ['shift_condition_set_ref', 'shift_condition_set_ref'],
    ['restriction_profile_ref', 'restriction_profile_ref'],
    ['compute_run_id', 'compute_run_id'],
    ['source_template_version', 'source_template_version'],
    ['source_runtime_version', 'source_runtime_version'],
    ['input_snapshot_ref', 'input_snapshot_ref'],
  ];
  for (const [key, label] of required) {
    const v = record[key] as unknown;
    if (typeof v !== 'string' || v.trim() === '') {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_CURRENT_RECORD_INCOMPLETE,
          `current scenario record missing ${label}`,
          record.current_record_id,
        ),
      );
    }
  }

  if (
    !Array.isArray(record.trigger_profile_refs) ||
    record.trigger_profile_refs.length === 0
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_RECORD_INCOMPLETE,
        'current scenario record missing trigger_profile_refs',
        record.current_record_id,
      ),
    );
  }
  if (
    !Array.isArray(record.invalidation_profile_refs) ||
    record.invalidation_profile_refs.length === 0
  ) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_RECORD_INCOMPLETE,
        'current scenario record missing invalidation_profile_refs',
        record.current_record_id,
      ),
    );
  }

  // Evidence
  if (!record.evidence_pack_ref || record.evidence_pack_ref.trim() === '') {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_RECORD_MISSING_EVIDENCE,
        'current scenario record missing evidence_pack_ref',
        record.current_record_id,
      ),
    );
  }

  // Replay hash
  if (!record.replay_hash || record.replay_hash.trim() === '') {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_RECORD_MISSING_REPLAY_HASH,
        'current scenario record missing replay_hash',
        record.current_record_id,
      ),
    );
  }

  // Supersession discipline
  if (record.supersedes_current_record_id) {
    if (!record.supersession_reason) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_CURRENT_SUPERSESSION_REASON_MISSING,
          'supersedes set without supersession reason',
          record.current_record_id,
        ),
      );
    }
  } else if (record.supersession_reason) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_SUPERSEDES_REF_MISSING,
        'supersession reason set without supersedes_current_record_id',
        record.current_record_id,
      ),
    );
  }

  // Run mode safety
  if (ctx?.source_run_mode) {
    if (
      ctx.source_run_mode === L12ScenarioRunMode.REPLAY ||
      ctx.source_run_mode === L12ScenarioRunMode.SHADOW ||
      ctx.source_run_mode === L12ScenarioRunMode.BACKFILL
    ) {
      issues.push(
        l12PersistenceIssueOf(
          L12PersistenceViolationCode.L12P_CURRENT_WRITE_FROM_NON_LIVE_RUN,
          `current scenario record produced by ${ctx.source_run_mode} run`,
          record.current_record_id,
        ),
      );
    }
  }

  // Blocked readiness
  if (isL12BlockedCurrentReadiness(record.readiness_class)) {
    issues.push(
      l12PersistenceIssueOf(
        L12PersistenceViolationCode.L12P_CURRENT_RECORD_BLOCKED_READINESS,
        `current record produced under blocked readiness ${record.readiness_class}`,
        record.current_record_id,
      ),
    );
  }

  return { ok: issues.length === 0, issues };
}
