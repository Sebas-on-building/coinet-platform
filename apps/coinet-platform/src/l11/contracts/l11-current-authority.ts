/**
 * L11.8 — Current Authority Records (§11.8.7)
 *
 * Authoritative current state for L11 scores. All fields stored in
 * Postgres current registries via L5; never authority elsewhere.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreBand } from './score-band-policy';
import { L11MaterializationMode } from './l11-persistence-surface';

export const L11_CURRENT_AUTHORITY_POLICY_VERSION = 'l11.8.current.v1';

export enum L11ScoreSupersessionReason {
  NEWER_LIVE_RUN = 'NEWER_LIVE_RUN',
  LATE_DATA_CORRECTION = 'LATE_DATA_CORRECTION',
  REPAIR_REBUILD = 'REPAIR_REBUILD',
  FORMULA_VERSION_MIGRATION = 'FORMULA_VERSION_MIGRATION',
  THRESHOLD_POLICY_MIGRATION = 'THRESHOLD_POLICY_MIGRATION',
  CALIBRATION_TARGET_UPDATE = 'CALIBRATION_TARGET_UPDATE',
  DRIFT_GOVERNANCE_ACTION = 'DRIFT_GOVERNANCE_ACTION',
}

export const ALL_L11_SCORE_SUPERSESSION_REASONS:
  readonly L11ScoreSupersessionReason[] =
  Object.values(L11ScoreSupersessionReason);

export interface L11CurrentScoreRecord {
  readonly current_record_id: string;

  readonly score_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_version: string;

  readonly formula_id: string;
  readonly formula_version: string;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly raw_score: number;
  readonly modified_score: number;
  readonly final_score: number;
  readonly score_band: L11ScoreBand;

  readonly attribution_ref: string;
  readonly component_breakdown_ref: string;
  readonly missing_data_profile_ref: string;
  readonly modifier_profile_refs: readonly string[];
  readonly calibration_hook_refs: readonly string[];
  readonly drift_report_refs: readonly string[];

  readonly restriction_profile_ref: string;

  readonly prior_current_record_ref?: string;
  readonly supersession_reason?: L11ScoreSupersessionReason;

  readonly run_id: string;
  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
  readonly evidence_refs: readonly string[];

  readonly materialization_mode: L11MaterializationMode;
  readonly policy_version: string;
}

export function isL11CurrentScoreRecordStructurallyValid(
  r: L11CurrentScoreRecord,
): { ok: boolean; reason: string } {
  if (!r.current_record_id) return { ok: false, reason: 'current_record_id missing' };
  if (!r.score_id) return { ok: false, reason: 'score_id missing' };
  if (!r.score_family) return { ok: false, reason: 'score_family missing' };
  if (!r.formula_id || !r.formula_version) {
    return { ok: false, reason: 'formula_id / formula_version missing' };
  }
  if (!r.score_version) return { ok: false, reason: 'score_version missing' };
  if (!r.scope_type || !r.scope_id) {
    return { ok: false, reason: 'scope_type / scope_id missing' };
  }
  if (!r.as_of) return { ok: false, reason: 'as_of missing' };
  if (!r.score_band) return { ok: false, reason: 'score_band missing' };
  if (!r.attribution_ref) return { ok: false, reason: 'attribution_ref missing' };
  if (!r.component_breakdown_ref) {
    return { ok: false, reason: 'component_breakdown_ref missing' };
  }
  if (!r.missing_data_profile_ref) {
    return { ok: false, reason: 'missing_data_profile_ref missing' };
  }
  if (!r.run_id) return { ok: false, reason: 'run_id missing' };
  if (!r.replay_hash) return { ok: false, reason: 'replay_hash missing' };
  if (!Array.isArray(r.lineage_refs) || r.lineage_refs.length === 0) {
    return { ok: false, reason: 'lineage_refs missing or empty' };
  }
  if (!r.materialization_mode) {
    return { ok: false, reason: 'materialization_mode missing' };
  }
  if (r.prior_current_record_ref && !r.supersession_reason) {
    return { ok: false,
      reason: 'prior_current_record_ref present without supersession_reason' };
  }
  if (!r.prior_current_record_ref && r.supersession_reason) {
    return { ok: false,
      reason: 'supersession_reason present without prior_current_record_ref' };
  }
  if (!r.policy_version) return { ok: false, reason: 'policy_version missing' };
  return { ok: true, reason: 'ok' };
}

/**
 * Materialization modes that may legally write to Postgres current
 * authority. REPLAY_HISTORICAL must never reach current registry.
 */
const CURRENT_AUTHORIZED_MODES: ReadonlySet<L11MaterializationMode> = new Set([
  L11MaterializationMode.LIVE_CURRENT,
  L11MaterializationMode.REPAIR_REBUILD,
  L11MaterializationMode.LATE_DATA_REMATERIALIZATION,
]);

export function isL11MaterializationModeAuthorizedForCurrent(
  m: L11MaterializationMode,
): boolean {
  return CURRENT_AUTHORIZED_MODES.has(m);
}

/** Reasons that *must* carry a `prior_current_record_ref`. */
const REASONS_REQUIRING_PRIOR_REF:
  ReadonlySet<L11ScoreSupersessionReason> = new Set([
  L11ScoreSupersessionReason.NEWER_LIVE_RUN,
  L11ScoreSupersessionReason.LATE_DATA_CORRECTION,
  L11ScoreSupersessionReason.REPAIR_REBUILD,
  L11ScoreSupersessionReason.FORMULA_VERSION_MIGRATION,
  L11ScoreSupersessionReason.THRESHOLD_POLICY_MIGRATION,
  L11ScoreSupersessionReason.CALIBRATION_TARGET_UPDATE,
  L11ScoreSupersessionReason.DRIFT_GOVERNANCE_ACTION,
]);

export function l11SupersessionReasonRequiresPriorRef(
  r: L11ScoreSupersessionReason,
): boolean {
  return REASONS_REQUIRING_PRIOR_REF.has(r);
}
