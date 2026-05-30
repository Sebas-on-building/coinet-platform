/**
 * L14.2 — Delivery Audit Surface
 *
 * §14.2.27 — Deterministic audit log for L14D delivery findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14DeliveryViolationCode } from '../validation/l14-delivery-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.delivery.v1';

export enum L14DeliveryAuditSubjectClass {
  DELIVERY_CHANNEL = 'DELIVERY_CHANNEL',
  DELIVERY_PAYLOAD = 'DELIVERY_PAYLOAD',
  DELIVERY_CONSUMER_CONTRACT = 'DELIVERY_CONSUMER_CONTRACT',
  RENDERING_PROFILE = 'RENDERING_PROFILE',
  ENTITLEMENT_PROFILE = 'ENTITLEMENT_PROFILE',
  DELIVERABILITY_STATUS = 'DELIVERABILITY_STATUS',
  CHANNEL_SPECIFIC_RULE = 'CHANNEL_SPECIFIC_RULE',
  INVARIANT = 'INVARIANT',
}

export interface L14DeliveryAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14DeliveryAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14DeliveryViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14DeliveryViolationCode;

const CRITICAL = new Set<L14DeliveryViolationCode>([
  C.L14D_RESERVED_CHANNEL_PRODUCTION_EMISSION,
  C.L14D_AI_CHAT_REQUIRES_FINAL_L13_ARTIFACT,
  C.L14D_TELEGRAM_REQUIRES_FINAL_L13_ALERT_ARTIFACT,
  C.L14D_INTERNAL_CONSOLE_USER_FACING_LEAK,
  C.L14D_RENDERING_REGENERATES_MEANING,
  C.L14D_RENDERING_REMOVES_REQUIRED_DISCLOSURE,
  C.L14D_RENDERING_REMOVES_RESTRICTION,
  C.L14D_RENDERING_CONVERTS_CONDITIONAL_TO_CERTAINTY,
  C.L14D_RENDERING_INTENSIFIES_URGENCY,
  C.L14D_DELIVERABILITY_STATUS_FALSE_GREEN,
  C.L14D_INTERNAL_ONLY_PAYLOAD_MARKED_USER_DELIVERABLE,
  C.L14D_CHANNEL_STATUS_ILLEGAL,
  C.L14D_ENTITLEMENT_PROFILE_REQUIRED,
]);

const ERROR_CODES = new Set<L14DeliveryViolationCode>([
  C.L14D_CHANNEL_UNREGISTERED,
  C.L14D_DELIVERY_CLASS_NOT_ALLOWED_FOR_CHANNEL,
  C.L14D_AUDIENCE_CLASS_NOT_ALLOWED_FOR_CHANNEL,
  C.L14D_SOURCE_ARTIFACT_NOT_ALLOWED_FOR_CHANNEL,
  C.L14D_RENDERING_PROFILE_NOT_ALLOWED_FOR_CHANNEL,
  C.L14D_DELIVERY_PAYLOAD_SOURCE_MISSING,
  C.L14D_DELIVERY_PAYLOAD_CONTENT_REF_MISSING,
  C.L14D_DELIVERY_PAYLOAD_DISCLOSURE_REF_MISSING,
  C.L14D_DELIVERY_PAYLOAD_RESTRICTION_REF_MISSING,
  C.L14D_DELIVERY_PAYLOAD_LINEAGE_MISSING,
  C.L14D_DELIVERY_PAYLOAD_REPLAY_HASH_MISSING,
  C.L14D_ENTITLEMENT_OPT_IN_MISSING,
  C.L14D_ENTITLEMENT_WATCHLIST_MISSING,
  C.L14D_ENTITLEMENT_SUBSCRIPTION_MISSING,
  C.L14D_ENTITLEMENT_INTERNAL_ROLE_MISSING,
]);

export function severityForL14DeliveryCode(
  code: L14DeliveryViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14DeliveryBlockingCode(
  code: L14DeliveryViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14DeliveryAuditRecord[] = [];

export function resetL14DeliveryAuditLog(): void {
  auditLog.length = 0;
}

export interface L14DeliveryAuditEmissionInput {
  readonly subjectClass: L14DeliveryAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14DeliveryViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(
  codes: readonly L14DeliveryViolationCode[],
): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14DeliveryCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14DeliveryAuditRecord(
  input: L14DeliveryAuditEmissionInput,
): L14DeliveryAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.delivery.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14DeliveryBlockingCode(c));
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
  const record: L14DeliveryAuditRecord = {
    audit_id: `l14d.audit.${replayHash}`,
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

export function getL14DeliveryAuditLog():
  readonly L14DeliveryAuditRecord[] {
  return [...auditLog];
}

export function getL14DeliveryCriticalViolations():
  readonly L14DeliveryAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
