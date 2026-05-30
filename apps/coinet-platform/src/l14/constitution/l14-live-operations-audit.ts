/**
 * L14.9 — Live Operations Audit Surface
 *
 * §14.9.57 — Deterministic audit log for L14L findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14LiveOperationsViolationCode } from '../validation/l14-live-operations-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.live.v1';

export enum L14LiveOperationsAuditSubjectClass {
  CHANNEL_ROLLOUT_POLICY = 'CHANNEL_ROLLOUT_POLICY',
  ALERT_CLASS_ROLLOUT_POLICY = 'ALERT_CLASS_ROLLOUT_POLICY',
  TELEGRAM_DELIVERY_GATE = 'TELEGRAM_DELIVERY_GATE',
  PUSH_ENABLEMENT_GATE = 'PUSH_ENABLEMENT_GATE',
  DELIVERY_PREFERENCE_PROFILE = 'DELIVERY_PREFERENCE_PROFILE',
  DELIVERY_PREFERENCE_SNAPSHOT = 'DELIVERY_PREFERENCE_SNAPSHOT',
  FREQUENCY_POLICY = 'FREQUENCY_POLICY',
  LIVE_CONTROL_DECISION = 'LIVE_CONTROL_DECISION',
  EXPERIMENT_POLICY = 'EXPERIMENT_POLICY',
  EXPERIMENT_ASSIGNMENT = 'EXPERIMENT_ASSIGNMENT',
  OPERATIONAL_SIGNAL = 'OPERATIONAL_SIGNAL',
  OPERATIONAL_INCIDENT = 'OPERATIONAL_INCIDENT',
  OPERATIONAL_PLAYBOOK = 'OPERATIONAL_PLAYBOOK',
  ANALYST_OPERATIONAL_ACTION = 'ANALYST_OPERATIONAL_ACTION',
  INVARIANT = 'INVARIANT',
}

export interface L14LiveOperationsAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14LiveOperationsAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14LiveOperationsViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14LiveOperationsViolationCode;

const CRITICAL = new Set<L14LiveOperationsViolationCode>([
  C.L14L_CHANNEL_ROLLOUT_STATUS_ILLEGAL,
  C.L14L_RESERVED_PUSH_ENABLEMENT_ATTEMPT,
  C.L14L_TELEGRAM_GATE_MISSING_OPT_IN,
  C.L14L_TELEGRAM_GATE_BINDING_MISSING,
  C.L14L_TELEGRAM_HEALTH_BELOW_THRESHOLD,
  C.L14L_ALERT_CLASS_ROLLOUT_STATUS_ILLEGAL,
  C.L14L_QUIET_HOURS_OVERRIDE_ILLEGAL,
  C.L14L_FREQUENCY_CAP_BYPASS_ILLEGAL,
  C.L14L_SEVERITY_OVERRIDE_POLICY_MISSING,
  C.L14L_SEVERITY_OVERRIDE_USED_ON_INELIGIBLE_ALERT,
  C.L14L_EXPERIMENT_SURFACE_PROHIBITED,
  C.L14L_EXPERIMENT_TRUTH_MUTATION_ATTEMPT,
  C.L14L_EXPERIMENT_SAFETY_MUTATION_ATTEMPT,
  C.L14L_EXPERIMENT_GROUNDING_MUTATION_ATTEMPT,
  C.L14L_EXPERIMENT_DISCLOSURE_MUTATION_ATTEMPT,
  C.L14L_EXPERIMENT_ASSIGNMENT_NOT_DETERMINISTIC,
  C.L14L_EXPERIMENT_METRIC_NOT_ALLOWED,
  C.L14L_PLAYBOOK_PROHIBITED_ACTION_PRESENT,
  C.L14L_ANALYST_ACTION_ATTEMPTED_LOWER_LAYER_MUTATION,
  C.L14L_ANALYST_ACTION_ATTEMPTED_HISTORY_MUTATION,
  C.L14L_ANALYST_ACTION_ATTEMPTED_USER_PREFERENCE_BYPASS,
]);

const ERROR_CODES = new Set<L14LiveOperationsViolationCode>([
  C.L14L_ALERT_CLASS_CHANNEL_NOT_ALLOWED,
  C.L14L_PREFERENCE_PROFILE_CONFLICTING_CHANNEL_STATE,
  C.L14L_PREFERENCE_PROFILE_CONFLICTING_ALERT_CLASS_STATE,
  C.L14L_PREFERENCE_PROFILE_CAP_INVALID,
  C.L14L_PREFERENCE_SNAPSHOT_MISSING,
  C.L14L_QUIET_HOURS_PROFILE_INVALID,
  C.L14L_DIGEST_DOWNGRADE_POLICY_MISSING,
  C.L14L_OPERATIONAL_SIGNAL_SOURCE_READ_SURFACE_MISSING,
  C.L14L_OPERATIONAL_INCIDENT_WITHOUT_PLAYBOOK,
  C.L14L_AUDIT_EVENT_NOT_DETERMINISTIC,
]);

export function severityForL14LiveOperationsCode(
  code: L14LiveOperationsViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14LiveOperationsBlockingCode(
  code: L14LiveOperationsViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14LiveOperationsAuditRecord[] = [];

export function resetL14LiveOperationsAuditLog(): void {
  auditLog.length = 0;
}

export interface L14LiveOperationsAuditEmissionInput {
  readonly subjectClass: L14LiveOperationsAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14LiveOperationsViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14LiveOperationsViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14LiveOperationsCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14LiveOperationsAuditRecord(
  input: L14LiveOperationsAuditEmissionInput,
): L14LiveOperationsAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.live.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14LiveOperationsBlockingCode(c));
  const replayHash = fnv1a([
    input.subjectClass, input.subjectRef, sortedCodes.join(','), input.message,
    severity, String(blocking), lineage.join(','), POLICY_V,
  ].join('|'));
  const record: L14LiveOperationsAuditRecord = {
    audit_id: `l14l.audit.${replayHash}`,
    audit_subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_codes: sortedCodes,
    severity,
    blocking,
    message: input.message,
    emitted_at: input.emittedAt ?? new Date().toISOString(),
    lineage_refs: lineage,
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
  auditLog.push(record);
  return record;
}

export function getL14LiveOperationsAuditLog(): readonly L14LiveOperationsAuditRecord[] {
  return [...auditLog];
}

export function getL14LiveOperationsCriticalViolations(): readonly L14LiveOperationsAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
