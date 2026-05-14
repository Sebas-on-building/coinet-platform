/**
 * L12.7 — Failure Playbooks (§12.7.13)
 *
 * Mandatory failure playbooks for L12 — each declares the violation
 * code prefix(es) it owns, severity, immediate action, rollback
 * action, and whether persistence / audit / downstream notification /
 * repair are required.
 */

import { L12RollbackAction } from './l12-rollback-policy';

export const L12_FAILURE_PLAYBOOK_POLICY_VERSION =
  'l12.7.playbooks.v1';

export enum L12FailurePlaybookId {
  PB1_PREDICTION_THEATER_BREACH = 'PB1_PREDICTION_THEATER_BREACH',
  PB2_RECOMMENDATION_LEAKAGE = 'PB2_RECOMMENDATION_LEAKAGE',
  PB3_FINAL_JUDGMENT_LEAKAGE = 'PB3_FINAL_JUDGMENT_LEAKAGE',
  PB4_LOWER_LAYER_REBUILD_BYPASS = 'PB4_LOWER_LAYER_REBUILD_BYPASS',
  PB5_INVALIDATION_MISSING_LIVE = 'PB5_INVALIDATION_MISSING_LIVE',
  PB6_TRIGGER_MISSING_LIVE = 'PB6_TRIGGER_MISSING_LIVE',
  PB7_REPLAY_MISMATCH = 'PB7_REPLAY_MISMATCH',
  PB8_DIRECT_WRITE_DETECTED = 'PB8_DIRECT_WRITE_DETECTED',
  PB9_CURRENT_AUTHORITY_CORRUPTION = 'PB9_CURRENT_AUTHORITY_CORRUPTION',
  PB10_EVIDENCE_PACK_ORPHANING = 'PB10_EVIDENCE_PACK_ORPHANING',
  PB11_TEMPLATE_PROHIBITED_PROMOTION =
    'PB11_TEMPLATE_PROHIBITED_PROMOTION',
  PB12_DOCTRINE_OR_LAW_SILENT_CHANGE =
    'PB12_DOCTRINE_OR_LAW_SILENT_CHANGE',
}

export const ALL_L12_FAILURE_PLAYBOOK_IDS:
  readonly L12FailurePlaybookId[] =
  Object.values(L12FailurePlaybookId);

export type L12PlaybookSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

export enum L12PlaybookImmediateAction {
  BLOCK_CURRENT_EMISSION = 'BLOCK_CURRENT_EMISSION',
  BLOCK_HISTORICAL_APPEND = 'BLOCK_HISTORICAL_APPEND',
  ROLLBACK_INVOKE = 'ROLLBACK_INVOKE',
  REPAIR_INVOKE = 'REPAIR_INVOKE',
  ALERT_OPS = 'ALERT_OPS',
  FREEZE_DOWNSTREAM = 'FREEZE_DOWNSTREAM',
  BLOCK_L13_HANDOFF = 'BLOCK_L13_HANDOFF',
}

export interface L12FailurePlaybook {
  readonly playbook_id: L12FailurePlaybookId;
  readonly title: string;
  readonly violation_code_prefixes: readonly string[];
  readonly severity: L12PlaybookSeverity;
  readonly immediate_actions: readonly L12PlaybookImmediateAction[];
  readonly rollback_action: L12RollbackAction;
  readonly requires_persistence: boolean;
  readonly requires_audit: boolean;
  readonly requires_downstream_notification: boolean;
  readonly requires_repair_or_replay: boolean;
}

export const L12_FAILURE_PLAYBOOK_REGISTRY:
  Readonly<Record<L12FailurePlaybookId, L12FailurePlaybook>> = {
  [L12FailurePlaybookId.PB1_PREDICTION_THEATER_BREACH]: {
    playbook_id: L12FailurePlaybookId.PB1_PREDICTION_THEATER_BREACH,
    title: 'Prediction theater breach',
    violation_code_prefixes: ['L12F_PREDICTION_THEATER_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_action: L12RollbackAction.DISABLE_LIVE_SERVING,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L12FailurePlaybookId.PB2_RECOMMENDATION_LEAKAGE]: {
    playbook_id: L12FailurePlaybookId.PB2_RECOMMENDATION_LEAKAGE,
    title: 'Recommendation leakage in scenario output',
    violation_code_prefixes: ['L12F_RECOMMENDATION_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_action: L12RollbackAction.DISABLE_LIVE_SERVING,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L12FailurePlaybookId.PB3_FINAL_JUDGMENT_LEAKAGE]: {
    playbook_id: L12FailurePlaybookId.PB3_FINAL_JUDGMENT_LEAKAGE,
    title: 'Final judgment leakage in scenario output',
    violation_code_prefixes: ['L12F_FINAL_JUDGMENT_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_action: L12RollbackAction.DISABLE_LIVE_SERVING,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L12FailurePlaybookId.PB4_LOWER_LAYER_REBUILD_BYPASS]: {
    playbook_id: L12FailurePlaybookId.PB4_LOWER_LAYER_REBUILD_BYPASS,
    title: 'L13+ attempted lower-layer rebuild bypass',
    violation_code_prefixes: ['L12F_LOWER_LAYER_REBUILD_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_L13_HANDOFF,
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_action: L12RollbackAction.BLOCK_L13_CONSUMPTION,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L12FailurePlaybookId.PB5_INVALIDATION_MISSING_LIVE]: {
    playbook_id: L12FailurePlaybookId.PB5_INVALIDATION_MISSING_LIVE,
    title: 'Invalidation missing in live scenario output',
    violation_code_prefixes: ['L12F_INVALIDATION_LAW_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_action: L12RollbackAction.FORCE_SHADOW_ONLY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L12FailurePlaybookId.PB6_TRIGGER_MISSING_LIVE]: {
    playbook_id: L12FailurePlaybookId.PB6_TRIGGER_MISSING_LIVE,
    title: 'Trigger missing in live scenario output',
    violation_code_prefixes: ['L12F_TRIGGER_LAW_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_action: L12RollbackAction.FORCE_SHADOW_ONLY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L12FailurePlaybookId.PB7_REPLAY_MISMATCH]: {
    playbook_id: L12FailurePlaybookId.PB7_REPLAY_MISMATCH,
    title: 'Replay mismatch above threshold',
    violation_code_prefixes: ['L12P_REPLAY_'],
    severity: 'ERROR',
    immediate_actions: [
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.REPAIR_INVOKE,
    ],
    rollback_action: L12RollbackAction.REQUIRE_REPAIR_RUN,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L12FailurePlaybookId.PB8_DIRECT_WRITE_DETECTED]: {
    playbook_id: L12FailurePlaybookId.PB8_DIRECT_WRITE_DETECTED,
    title: 'Direct write attempted (L5 bypass)',
    violation_code_prefixes: ['L12P_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_action: L12RollbackAction.REQUIRE_FULL_RECERTIFICATION,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L12FailurePlaybookId.PB9_CURRENT_AUTHORITY_CORRUPTION]: {
    playbook_id: L12FailurePlaybookId.PB9_CURRENT_AUTHORITY_CORRUPTION,
    title: 'Current scenario authority corruption detected',
    violation_code_prefixes: ['L12P_CURRENT_'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.FREEZE_DOWNSTREAM,
    ],
    rollback_action:
      L12RollbackAction.FALL_BACK_TO_PREVIOUS_RATIFIED_ARTIFACT,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L12FailurePlaybookId.PB10_EVIDENCE_PACK_ORPHANING]: {
    playbook_id: L12FailurePlaybookId.PB10_EVIDENCE_PACK_ORPHANING,
    title: 'Evidence pack orphaning detected',
    violation_code_prefixes: ['L12P_EVIDENCE_'],
    severity: 'ERROR',
    immediate_actions: [
      L12PlaybookImmediateAction.ALERT_OPS,
      L12PlaybookImmediateAction.REPAIR_INVOKE,
    ],
    rollback_action: L12RollbackAction.REQUIRE_REPAIR_RUN,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
  [L12FailurePlaybookId.PB11_TEMPLATE_PROHIBITED_PROMOTION]: {
    playbook_id: L12FailurePlaybookId.PB11_TEMPLATE_PROHIBITED_PROMOTION,
    title: 'Template promoted without ratification',
    violation_code_prefixes: ['L12T_', 'L12F_PROHIBITED_EXTENSION'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_action: L12RollbackAction.DISABLE_TEMPLATE_FAMILY,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: false,
  },
  [L12FailurePlaybookId.PB12_DOCTRINE_OR_LAW_SILENT_CHANGE]: {
    playbook_id: L12FailurePlaybookId.PB12_DOCTRINE_OR_LAW_SILENT_CHANGE,
    title: 'Doctrine / trigger / invalidation law silently changed',
    violation_code_prefixes: ['L12F_WEAKENS_', 'L12F_FREEZE_ACTIVATION_ILLEGAL'],
    severity: 'CRITICAL',
    immediate_actions: [
      L12PlaybookImmediateAction.BLOCK_CURRENT_EMISSION,
      L12PlaybookImmediateAction.FREEZE_DOWNSTREAM,
      L12PlaybookImmediateAction.ALERT_OPS,
    ],
    rollback_action: L12RollbackAction.REQUIRE_FULL_RECERTIFICATION,
    requires_persistence: true,
    requires_audit: true,
    requires_downstream_notification: true,
    requires_repair_or_replay: true,
  },
};

export function getL12FailurePlaybook(
  id: L12FailurePlaybookId,
): L12FailurePlaybook {
  return L12_FAILURE_PLAYBOOK_REGISTRY[id];
}

export interface L12FailurePlaybookCoverageReport {
  readonly ok: boolean;
  readonly registered: number;
  readonly missing: readonly L12FailurePlaybookId[];
}

export function buildL12FailurePlaybookCoverageReport():
  L12FailurePlaybookCoverageReport {
  const missing: L12FailurePlaybookId[] = [];
  for (const id of ALL_L12_FAILURE_PLAYBOOK_IDS) {
    if (!L12_FAILURE_PLAYBOOK_REGISTRY[id]) missing.push(id);
  }
  return {
    ok: missing.length === 0,
    registered: ALL_L12_FAILURE_PLAYBOOK_IDS.length - missing.length,
    missing,
  };
}
