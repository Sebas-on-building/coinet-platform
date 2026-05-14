/**
 * L11.9 — Failure Playbooks (§11.9.17)
 *
 * The 12 mandatory failure playbooks. Each declares its violation
 * code prefix(es), severity, immediate action, rollback mode, and
 * whether persistence / audit / downstream notification / repair
 * are required.
 */

import { L11RollbackMode } from './l11-rollback-policy';

export const L11_FAILURE_PLAYBOOK_POLICY_VERSION = 'l11.9.playbooks.v1';

export enum L11FailurePlaybookId {
  PB1_SCORE_WITHOUT_ATTRIBUTION = 'PB1_SCORE_WITHOUT_ATTRIBUTION',
  PB2_FORMULA_REPLAY_MISMATCH = 'PB2_FORMULA_REPLAY_MISMATCH',
  PB3_MISSING_DATA_NEUTRALIZATION = 'PB3_MISSING_DATA_NEUTRALIZATION',
  PB4_REGIME_MODIFIER_WITHOUT_L8_REF = 'PB4_REGIME_MODIFIER_WITHOUT_L8_REF',
  PB5_CALIBRATION_TARGET_MISSING = 'PB5_CALIBRATION_TARGET_MISSING',
  PB6_CRITICAL_DRIFT_WITHOUT_ACTION = 'PB6_CRITICAL_DRIFT_WITHOUT_ACTION',
  PB7_THRESHOLD_OVERLAP_OR_GAP = 'PB7_THRESHOLD_OVERLAP_OR_GAP',
  PB8_L5_PERSISTENCE_BYPASS = 'PB8_L5_PERSISTENCE_BYPASS',
  PB9_DOWNSTREAM_RECOMPUTE_ATTEMPT = 'PB9_DOWNSTREAM_RECOMPUTE_ATTEMPT',
  PB10_JUDGMENT_OR_RECOMMENDATION_LEAKAGE =
    'PB10_JUDGMENT_OR_RECOMMENDATION_LEAKAGE',
  PB11_RESERVED_FAMILY_PRODUCTION_ATTEMPT =
    'PB11_RESERVED_FAMILY_PRODUCTION_ATTEMPT',
  PB12_FORMULA_MEANING_OR_DIRECTION_SILENT_CHANGE =
    'PB12_FORMULA_MEANING_OR_DIRECTION_SILENT_CHANGE',
}

export const ALL_L11_FAILURE_PLAYBOOK_IDS:
  readonly L11FailurePlaybookId[] = Object.values(L11FailurePlaybookId);

export type L11PlaybookSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

export enum L11PlaybookImmediateAction {
  BLOCK_CURRENT_EMISSION = 'BLOCK_CURRENT_EMISSION',
  BLOCK_HISTORICAL_APPEND = 'BLOCK_HISTORICAL_APPEND',
  ROLLBACK_INVOKE = 'ROLLBACK_INVOKE',
  REPAIR_INVOKE = 'REPAIR_INVOKE',
  ALERT_OPS = 'ALERT_OPS',
  FREEZE_DOWNSTREAM = 'FREEZE_DOWNSTREAM',
}

export interface L11FailurePlaybook {
  readonly playbook_id: L11FailurePlaybookId;
  readonly title: string;
  readonly violation_code_prefixes: readonly string[];
  readonly severity: L11PlaybookSeverity;
  readonly immediate_actions: readonly L11PlaybookImmediateAction[];
  readonly rollback_mode: L11RollbackMode;
  readonly requires_persistence: boolean;
  readonly requires_audit: boolean;
  readonly requires_downstream_notification: boolean;
  readonly requires_repair_or_replay: boolean;
}

export const L11_FAILURE_PLAYBOOK_REGISTRY:
  Readonly<Record<L11FailurePlaybookId, L11FailurePlaybook>> = {
  [L11FailurePlaybookId.PB1_SCORE_WITHOUT_ATTRIBUTION]: {
    playbook_id: L11FailurePlaybookId.PB1_SCORE_WITHOUT_ATTRIBUTION,
    title: 'Score emitted without attribution',
    violation_code_prefixes: ['L11A_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L11PlaybookImmediateAction.BLOCK_HISTORICAL_APPEND,
      L11PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_mode: L11RollbackMode.DISABLE_SCORE_FAMILY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L11FailurePlaybookId.PB2_FORMULA_REPLAY_MISMATCH]: {
    playbook_id: L11FailurePlaybookId.PB2_FORMULA_REPLAY_MISMATCH,
    title: 'Formula replay mismatch',
    violation_code_prefixes: ['L11F_', 'L11P_REPLAY_'],
    severity: 'ERROR',
    immediate_actions: [
      L11PlaybookImmediateAction.ALERT_OPS,
      L11PlaybookImmediateAction.REPAIR_INVOKE,
    ],
    rollback_mode: L11RollbackMode.REPAIR_AND_REMATERIALIZE,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L11FailurePlaybookId.PB3_MISSING_DATA_NEUTRALIZATION]: {
    playbook_id: L11FailurePlaybookId.PB3_MISSING_DATA_NEUTRALIZATION,
    title: 'Missing data treated as neutral',
    violation_code_prefixes: ['L11M_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L11PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_mode: L11RollbackMode.DISABLE_SCORE_FAMILY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L11FailurePlaybookId.PB4_REGIME_MODIFIER_WITHOUT_L8_REF]: {
    playbook_id: L11FailurePlaybookId.PB4_REGIME_MODIFIER_WITHOUT_L8_REF,
    title: 'Regime modifier without L8 reference',
    violation_code_prefixes: ['L11M_'],
    severity: 'ERROR',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
    ],
    rollback_mode: L11RollbackMode.DISABLE_SCORE_FAMILY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L11FailurePlaybookId.PB5_CALIBRATION_TARGET_MISSING]: {
    playbook_id: L11FailurePlaybookId.PB5_CALIBRATION_TARGET_MISSING,
    title: 'Calibration target missing',
    violation_code_prefixes: ['L11C_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
    ],
    rollback_mode: L11RollbackMode.DISABLE_SCORE_FAMILY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L11FailurePlaybookId.PB6_CRITICAL_DRIFT_WITHOUT_ACTION]: {
    playbook_id: L11FailurePlaybookId.PB6_CRITICAL_DRIFT_WITHOUT_ACTION,
    title: 'Critical drift without recommended action',
    violation_code_prefixes: ['L11G_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.ALERT_OPS,
      L11PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_mode: L11RollbackMode.FREEZE_DOWNSTREAM_CONSUMPTION,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L11FailurePlaybookId.PB7_THRESHOLD_OVERLAP_OR_GAP]: {
    playbook_id: L11FailurePlaybookId.PB7_THRESHOLD_OVERLAP_OR_GAP,
    title: 'Threshold policy overlap or gap',
    violation_code_prefixes: ['L11G_THRESHOLD_'],
    severity: 'ERROR',
    immediate_actions: [
      L11PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_mode: L11RollbackMode.REVERT_THRESHOLD_POLICY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L11FailurePlaybookId.PB8_L5_PERSISTENCE_BYPASS]: {
    playbook_id: L11FailurePlaybookId.PB8_L5_PERSISTENCE_BYPASS,
    title: 'L5 persistence bypass',
    violation_code_prefixes: ['L11P_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L11PlaybookImmediateAction.ALERT_OPS,
      L11PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_mode: L11RollbackMode.FULL_LAYER_SAFE_MODE,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L11FailurePlaybookId.PB9_DOWNSTREAM_RECOMPUTE_ATTEMPT]: {
    playbook_id: L11FailurePlaybookId.PB9_DOWNSTREAM_RECOMPUTE_ATTEMPT,
    title: 'Downstream attempts ad hoc score recompute',
    violation_code_prefixes: ['L11P_DOWNSTREAM_RECOMPUTE_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.FREEZE_DOWNSTREAM,
      L11PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_mode: L11RollbackMode.FREEZE_DOWNSTREAM_CONSUMPTION,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L11FailurePlaybookId.PB10_JUDGMENT_OR_RECOMMENDATION_LEAKAGE]: {
    playbook_id:
      L11FailurePlaybookId.PB10_JUDGMENT_OR_RECOMMENDATION_LEAKAGE,
    title: 'Judgment / recommendation leakage in score outputs',
    violation_code_prefixes: ['L11_', 'L11A_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L11PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_mode: L11RollbackMode.FULL_LAYER_SAFE_MODE,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L11FailurePlaybookId.PB11_RESERVED_FAMILY_PRODUCTION_ATTEMPT]: {
    playbook_id:
      L11FailurePlaybookId.PB11_RESERVED_FAMILY_PRODUCTION_ATTEMPT,
    title: 'Reserved score family production promotion without ratification',
    violation_code_prefixes: ['L11D_', 'L11_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L11PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_mode: L11RollbackMode.DISABLE_SCORE_FAMILY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L11FailurePlaybookId.PB12_FORMULA_MEANING_OR_DIRECTION_SILENT_CHANGE]: {
    playbook_id:
      L11FailurePlaybookId.PB12_FORMULA_MEANING_OR_DIRECTION_SILENT_CHANGE,
    title: 'Formula meaning or direction silently changed',
    violation_code_prefixes: ['L11G_FORMULA_', 'L11D_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L11PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L11PlaybookImmediateAction.FREEZE_DOWNSTREAM,
      L11PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_mode: L11RollbackMode.REVERT_TO_PRIOR_FORMULA_VERSION,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
};

export function getL11FailurePlaybook(
  id: L11FailurePlaybookId,
): L11FailurePlaybook {
  return L11_FAILURE_PLAYBOOK_REGISTRY[id];
}

export interface L11FailurePlaybookCoverageReport {
  readonly ok: boolean;
  readonly registered: number;
  readonly missing: readonly L11FailurePlaybookId[];
}

export function buildL11FailurePlaybookCoverageReport():
  L11FailurePlaybookCoverageReport {
  const missing: L11FailurePlaybookId[] = [];
  for (const id of ALL_L11_FAILURE_PLAYBOOK_IDS) {
    if (!L11_FAILURE_PLAYBOOK_REGISTRY[id]) missing.push(id);
  }
  return {
    ok: missing.length === 0,
    registered: ALL_L11_FAILURE_PLAYBOOK_IDS.length - missing.length,
    missing,
  };
}
