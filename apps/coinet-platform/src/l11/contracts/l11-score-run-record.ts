/**
 * L11.8 — Score Run / Failure Records (§11.8.10)
 */

import { L11ScoreFamily } from './score-family';

export const L11_SCORE_RUN_POLICY_VERSION = 'l11.8.run.v1';

export enum L11ScoreRunMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  BACKFILL = 'BACKFILL',
  LATE_DATA = 'LATE_DATA',
  SHADOW = 'SHADOW',
}

export const ALL_L11_SCORE_RUN_MODES:
  readonly L11ScoreRunMode[] = Object.values(L11ScoreRunMode);

export enum L11ScoreRunStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export const ALL_L11_SCORE_RUN_STATUSES:
  readonly L11ScoreRunStatus[] = Object.values(L11ScoreRunStatus);

export enum L11ScoreFailureStage {
  INPUT_LOADING = 'INPUT_LOADING',
  COMPONENT_EVALUATION = 'COMPONENT_EVALUATION',
  FORMULA_EVALUATION = 'FORMULA_EVALUATION',
  ATTRIBUTION_BUILD = 'ATTRIBUTION_BUILD',
  MISSING_DATA_PROFILE_BUILD = 'MISSING_DATA_PROFILE_BUILD',
  REGIME_MODIFIER_APPLY = 'REGIME_MODIFIER_APPLY',
  CALIBRATION_HOOK_BUILD = 'CALIBRATION_HOOK_BUILD',
  DRIFT_REPORT_BUILD = 'DRIFT_REPORT_BUILD',
  PERSISTENCE_ENVELOPE_BUILD = 'PERSISTENCE_ENVELOPE_BUILD',
  L5_ROUTING = 'L5_ROUTING',
}

export const ALL_L11_SCORE_FAILURE_STAGES:
  readonly L11ScoreFailureStage[] = Object.values(L11ScoreFailureStage);

export enum L11ScoreRecoveryAction {
  NONE = 'NONE',
  RETRY = 'RETRY',
  REPAIR_REQUIRED = 'REPAIR_REQUIRED',
  REPLAY_REQUIRED = 'REPLAY_REQUIRED',
  ESCALATE = 'ESCALATE',
  BLOCK_FAMILY = 'BLOCK_FAMILY',
}

export const ALL_L11_SCORE_RECOVERY_ACTIONS:
  readonly L11ScoreRecoveryAction[] = Object.values(L11ScoreRecoveryAction);

export interface L11ScoreRunRecord {
  readonly run_id: string;

  readonly run_mode: L11ScoreRunMode;
  readonly run_status: L11ScoreRunStatus;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly score_families_requested: readonly L11ScoreFamily[];
  readonly score_families_emitted: readonly L11ScoreFamily[];
  readonly score_families_blocked: readonly L11ScoreFamily[];

  readonly formula_versions_used: Readonly<Partial<Record<L11ScoreFamily, string>>>;

  readonly score_output_refs: readonly string[];
  readonly attribution_refs: readonly string[];
  readonly missing_data_profile_refs: readonly string[];
  readonly modifier_refs: readonly string[];
  readonly calibration_hook_refs: readonly string[];
  readonly drift_report_refs: readonly string[];

  readonly parent_run_id?: string;
  readonly repair_reason?: string;
  readonly replay_source_run_id?: string;

  readonly started_at: string;
  readonly completed_at?: string;

  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export function isL11ScoreRunRecordStructurallyValid(
  r: L11ScoreRunRecord,
): { ok: boolean; reason: string } {
  if (!r.run_id) return { ok: false, reason: 'run_id missing' };
  if (!r.run_mode) return { ok: false, reason: 'run_mode missing' };
  if (!r.run_status) return { ok: false, reason: 'run_status missing' };
  if (!r.scope_type || !r.scope_id) {
    return { ok: false, reason: 'scope_type / scope_id missing' };
  }
  if (!r.as_of) return { ok: false, reason: 'as_of missing' };
  if (!r.started_at) return { ok: false, reason: 'started_at missing' };
  if (!r.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (!Array.isArray(r.lineage_refs) || r.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!r.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (r.run_mode === L11ScoreRunMode.REPAIR && !r.parent_run_id) {
    return { ok: false, reason: 'REPAIR run requires parent_run_id' };
  }
  if (r.run_mode === L11ScoreRunMode.REPAIR && !r.repair_reason) {
    return { ok: false, reason: 'REPAIR run requires repair_reason' };
  }
  if (r.run_mode === L11ScoreRunMode.REPLAY && !r.replay_source_run_id) {
    return { ok: false, reason: 'REPLAY run requires replay_source_run_id' };
  }
  return { ok: true, reason: 'ok' };
}

export interface L11ScoreFailureRecord {
  readonly failure_id: string;

  readonly run_id: string;
  readonly score_family?: L11ScoreFamily;
  readonly score_id?: string;

  readonly failure_stage: L11ScoreFailureStage;
  readonly violation_code: string;
  readonly severity: 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

  readonly blocked_current_emission: boolean;
  readonly blocked_historical_append: boolean;

  readonly offending_refs: readonly string[];

  readonly recovery_action: L11ScoreRecoveryAction;

  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];

  readonly occurred_at: string;
  readonly policy_version: string;
}

export function isL11ScoreFailureRecordStructurallyValid(
  f: L11ScoreFailureRecord,
): { ok: boolean; reason: string } {
  if (!f.failure_id) return { ok: false, reason: 'failure_id missing' };
  if (!f.run_id) return { ok: false, reason: 'run_id missing' };
  if (!f.failure_stage) return { ok: false, reason: 'failure_stage missing' };
  if (!f.violation_code) return { ok: false, reason: 'violation_code missing' };
  if (!f.severity) return { ok: false, reason: 'severity missing' };
  if (!f.recovery_action) return { ok: false, reason: 'recovery_action missing' };
  if (!f.occurred_at) return { ok: false, reason: 'occurred_at missing' };
  if (!f.policy_version) return { ok: false, reason: 'policy_version missing' };
  if (f.severity === 'CRITICAL' && !f.blocked_current_emission) {
    return { ok: false,
      reason: 'CRITICAL failure must block current emission' };
  }
  return { ok: true, reason: 'ok' };
}
