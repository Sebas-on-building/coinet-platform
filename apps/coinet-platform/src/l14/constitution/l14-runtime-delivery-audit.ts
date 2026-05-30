/**
 * L14.3 — Runtime Delivery Audit Surface
 *
 * §14.3.53 — Deterministic audit log for L14R runtime findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14RuntimeViolationCode } from '../validation/l14-runtime-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.runtime.v1';

export enum L14RuntimeDeliveryAuditSubjectClass {
  RUNTIME_REQUEST = 'RUNTIME_REQUEST',
  RUNTIME_CONTEXT = 'RUNTIME_CONTEXT',
  DELIVERY_CANDIDATE = 'DELIVERY_CANDIDATE',
  ELIGIBILITY_RESULT = 'ELIGIBILITY_RESULT',
  AUDIENCE_RESOLUTION = 'AUDIENCE_RESOLUTION',
  CHANNEL_RESOLUTION = 'CHANNEL_RESOLUTION',
  PREFERENCE_BINDING = 'PREFERENCE_BINDING',
  PRIORITY_PROFILE = 'PRIORITY_PROFILE',
  URGENCY_PROFILE = 'URGENCY_PROFILE',
  DEDUPLICATION_RESULT = 'DEDUPLICATION_RESULT',
  COOLDOWN_RESULT = 'COOLDOWN_RESULT',
  SUPPRESSION_RECORD = 'SUPPRESSION_RECORD',
  DISPOSITION_DECISION = 'DISPOSITION_DECISION',
  MERGE_RECORD = 'MERGE_RECORD',
  PAYLOAD_ASSEMBLY = 'PAYLOAD_ASSEMBLY',
  EXECUTION_RECORD = 'EXECUTION_RECORD',
  MATERIALIZATION_INTENT = 'MATERIALIZATION_INTENT',
  FEEDBACK_EXPECTATION = 'FEEDBACK_EXPECTATION',
  INVARIANT = 'INVARIANT',
}

export interface L14RuntimeDeliveryAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L14RuntimeDeliveryAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14RuntimeViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14RuntimeViolationCode;

const CRITICAL = new Set<L14RuntimeViolationCode>([
  C.L14R_STAGE_ORDER_ILLEGAL,
  C.L14R_STAGE_MUTATION_AFTER_SEAL,
  C.L14R_CANDIDATE_SOURCE_UNGOVERNED,
  C.L14R_ELIGIBILITY_FALSE_GREEN,
  C.L14R_INELIGIBLE_CANDIDATE_ROUTED,
  C.L14R_CHANNEL_RESERVED_ROUTED,
  C.L14R_CHANNEL_CONTRACT_IGNORED,
  C.L14R_MUTED_CHANNEL_EXECUTED,
  C.L14R_MUTED_ALERT_CLASS_EXECUTED,
  C.L14R_QUIET_HOURS_EXECUTION_ILLEGAL,
  C.L14R_FREQUENCY_CAP_EXECUTION_ILLEGAL,
  C.L14R_PRIORITY_IGNORES_RESTRICTION_CAP,
  C.L14R_FALSE_URGENCY_ESCALATION,
  C.L14R_DIGEST_ELIGIBLE_MARKED_IMMEDIATE,
  C.L14R_DUPLICATE_ALERT_EXECUTED,
  C.L14R_COOLDOWN_ACTIVE_EXECUTED,
  C.L14R_COOLDOWN_OVERRIDE_WITHOUT_REASON,
  C.L14R_SUPPRESSION_REQUIRED_BUT_MISSING,
  C.L14R_SUPPRESSION_SILENT,
  C.L14R_PAYLOAD_ASSEMBLY_BEFORE_DISPOSITION,
  C.L14R_PAYLOAD_ASSEMBLY_RENDERING_ILLEGAL,
  C.L14R_EXECUTION_WITHOUT_PAYLOAD,
  C.L14R_EXECUTION_BEFORE_DELIVERABILITY,
  C.L14R_EXECUTION_RETRY_REGENERATED_MEANING,
  C.L14R_FEEDBACK_EXPECTATION_MISSING,
]);

const ERROR_CODES = new Set<L14RuntimeViolationCode>([
  C.L14R_RUNTIME_REQUEST_MISSING,
  C.L14R_RUNTIME_CONTEXT_MISSING,
  C.L14R_DELIVERY_CANDIDATE_MISSING,
  C.L14R_AUDIENCE_RESOLUTION_MISSING,
  C.L14R_CHANNEL_RESOLUTION_MISSING,
  C.L14R_ENTITLEMENT_BINDING_MISSING,
  C.L14R_PRIORITY_PROFILE_MISSING,
  C.L14R_PRIORITY_SCORE_OUT_OF_BOUNDS,
  C.L14R_PRIORITY_CLASS_MISMATCH,
  C.L14R_URGENCY_PROFILE_MISSING,
  C.L14R_DUPLICATION_CHECK_MISSING,
  C.L14R_COOLDOWN_CHECK_MISSING,
  C.L14R_MERGE_REQUIRED_BUT_NOT_RECORDED,
  C.L14R_MATERIALIZATION_INTENT_MISSING,
  C.L14R_LINEAGE_MISSING,
  C.L14R_REPLAY_HASH_MISSING,
  C.L14R_AUDIENCE_NOT_ALLOWED_FOR_CHANNEL,
]);

export function severityForL14RuntimeCode(
  code: L14RuntimeViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14RuntimeBlockingCode(
  code: L14RuntimeViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14RuntimeDeliveryAuditRecord[] = [];

export function resetL14RuntimeDeliveryAuditLog(): void {
  auditLog.length = 0;
}

export interface L14RuntimeDeliveryAuditEmissionInput {
  readonly subjectClass: L14RuntimeDeliveryAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14RuntimeViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14RuntimeViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14RuntimeCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14RuntimeDeliveryAuditRecord(
  input: L14RuntimeDeliveryAuditEmissionInput,
): L14RuntimeDeliveryAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.runtime.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14RuntimeBlockingCode(c));
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      sortedCodes.join(','),
      input.message,
      severity,
      String(blocking),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L14RuntimeDeliveryAuditRecord = {
    audit_id: `l14r.audit.${replayHash}`,
    subject_class: input.subjectClass,
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

export function getL14RuntimeDeliveryAuditLog():
  readonly L14RuntimeDeliveryAuditRecord[] {
  return [...auditLog];
}

export function getL14RuntimeDeliveryCriticalViolations():
  readonly L14RuntimeDeliveryAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
