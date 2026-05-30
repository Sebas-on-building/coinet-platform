/**
 * L14.4 — Interaction Audit Surface
 *
 * §14.4.45 — Deterministic audit log for L14I findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14InteractionViolationCode } from '../validation/l14-interaction-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.interaction.v1';

export enum L14InteractionAuditSubjectClass {
  INTERACTION_EVENT = 'INTERACTION_EVENT',
  INTERACTION_CONTEXT = 'INTERACTION_CONTEXT',
  ATTRIBUTION = 'ATTRIBUTION',
  DEDUPLICATION = 'DEDUPLICATION',
  IGNORED_ALERT_DERIVATION = 'IGNORED_ALERT_DERIVATION',
  DEEPER_INVESTIGATION_CONVERSION = 'DEEPER_INVESTIGATION_CONVERSION',
  FEEDBACK_BRIDGE = 'FEEDBACK_BRIDGE',
  EXPECTATION_RESOLUTION = 'EXPECTATION_RESOLUTION',
  INTERPRETATION_POLICY = 'INTERPRETATION_POLICY',
  INVARIANT = 'INVARIANT',
}

export interface L14InteractionAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14InteractionAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14InteractionViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14InteractionViolationCode;

const CRITICAL = new Set<L14InteractionViolationCode>([
  C.L14I_RAW_USER_IDENTIFIER_PRESENT,
  C.L14I_DIRECT_ATTRIBUTION_WITHOUT_SOURCE_REF,
  C.L14I_WEAK_ATTRIBUTION_PRESENTED_AS_DIRECT,
  C.L14I_IGNORED_DERIVED_BEFORE_WINDOW_ELAPSED,
  C.L14I_IGNORED_DERIVED_AFTER_FAILED_DELIVERY,
  C.L14I_IGNORED_DERIVED_DESPITE_QUALIFYING_INTERACTION,
  C.L14I_DISMISSED_AND_IGNORED_CONFLATED,
  C.L14I_BEHAVIOR_INTERPRETED_AS_CORRECTNESS,
  C.L14I_FEEDBACK_INTERPRETED_AS_TRUTH,
  C.L14I_REPORT_SAVE_INTERPRETED_AS_FACTUAL_VALIDATION,
  C.L14I_ALERT_IGNORE_INTERPRETED_AS_WRONG_ALERT,
  C.L14I_CONVERSION_ATTRIBUTION_ILLEGAL,
  C.L14I_EXPECTATION_RESOLUTION_MISSING_EXPECTATION_REF,
  C.L14I_EXPECTATION_EXPIRED_WITHOUT_RESOLUTION,
]);

const ERROR_CODES = new Set<L14InteractionViolationCode>([
  C.L14I_INTERACTION_EVENT_ID_MISSING,
  C.L14I_INTERACTION_TYPE_MISSING,
  C.L14I_INTERACTION_CONTEXT_MISSING,
  C.L14I_OCCURRED_AT_MISSING,
  C.L14I_USER_HASH_REQUIRED_BUT_MISSING,
  C.L14I_ALERT_EVENT_MISSING_EXECUTION_REF,
  C.L14I_CHAT_FOLLOWUP_MISSING_PRIOR_OUTPUT_REF,
  C.L14I_REPORT_SAVE_MISSING_REPORT_REF,
  C.L14I_WATCHLIST_ACTION_MISSING_SCOPE_REF,
  C.L14I_FEEDBACK_EVENT_MISSING_L13_FEEDBACK_REF,
  C.L14I_ATTRIBUTION_QUALITY_ILLEGAL,
  C.L14I_DUPLICATE_EVENT_DOUBLE_COUNTED,
  C.L14I_DEDUPLICATION_KEY_MISSING,
  C.L14I_CONVERSION_RECORD_MISSING_TARGET,
  C.L14I_LINEAGE_MISSING,
  C.L14I_REPLAY_HASH_MISSING,
]);

export function severityForL14InteractionCode(
  code: L14InteractionViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14InteractionBlockingCode(
  code: L14InteractionViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14InteractionAuditRecord[] = [];

export function resetL14InteractionAuditLog(): void {
  auditLog.length = 0;
}

export interface L14InteractionAuditEmissionInput {
  readonly subjectClass: L14InteractionAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14InteractionViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14InteractionViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14InteractionCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14InteractionAuditRecord(
  input: L14InteractionAuditEmissionInput,
): L14InteractionAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.interaction.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14InteractionBlockingCode(c));
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
  const record: L14InteractionAuditRecord = {
    audit_id: `l14i.audit.${replayHash}`,
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

export function getL14InteractionAuditLog(): readonly L14InteractionAuditRecord[] {
  return [...auditLog];
}

export function getL14InteractionCriticalViolations(): readonly L14InteractionAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
