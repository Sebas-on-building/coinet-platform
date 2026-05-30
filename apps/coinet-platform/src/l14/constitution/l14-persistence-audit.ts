/**
 * L14.8 — Persistence Audit Surface
 *
 * §14.8.47 — Deterministic audit log for L14P findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14PersistenceViolationCode } from '../validation/l14-persistence-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.persistence.v1';

export enum L14PersistenceAuditSubjectClass {
  DURABLE_SURFACE_DESCRIPTOR = 'DURABLE_SURFACE_DESCRIPTOR',
  PERSISTENCE_ENVELOPE = 'PERSISTENCE_ENVELOPE',
  CURRENT_REGISTRY_WRITE = 'CURRENT_REGISTRY_WRITE',
  HISTORICAL_FACT_APPEND = 'HISTORICAL_FACT_APPEND',
  DERIVED_FACT_APPEND = 'DERIVED_FACT_APPEND',
  READ_SURFACE_REQUEST = 'READ_SURFACE_REQUEST',
  READ_SURFACE_RESULT = 'READ_SURFACE_RESULT',
  REPLAY_REQUEST = 'REPLAY_REQUEST',
  REPLAY_RESULT = 'REPLAY_RESULT',
  REPAIR_REQUEST = 'REPAIR_REQUEST',
  REPAIR_RESULT = 'REPAIR_RESULT',
  REGISTRY_REBUILD = 'REGISTRY_REBUILD',
  INVARIANT = 'INVARIANT',
}

export interface L14PersistenceAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14PersistenceAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14PersistenceViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14PersistenceViolationCode;

const CRITICAL = new Set<L14PersistenceViolationCode>([
  C.L14P_L5_ROUTE_MISSING,
  C.L14P_DIRECT_WRITE_ATTEMPT,
  C.L14P_UNKNOWN_DURABLE_SURFACE,
  C.L14P_ILLEGAL_MATERIALIZATION_MODE,
  C.L14P_APPEND_ONLY_SURFACE_MUTATION_ATTEMPT,
  C.L14P_REGISTRY_NOT_RECOMPUTABLE_FROM_HISTORY,
  C.L14P_CACHE_CLAIMED_AUTHORITY,
  C.L14P_DELIVERY_REPLAY_POLICY_REF_MISSING,
  C.L14P_DELIVERY_REPLAY_PREFERENCE_SNAPSHOT_MISSING,
  C.L14P_DELIVERY_REPLAY_ARTIFACT_MISMATCH,
  C.L14P_SUPPRESSION_REPLAY_REASON_MISMATCH,
  C.L14P_INTERACTION_TIMELINE_REPLAY_MISMATCH,
  C.L14P_REPAIR_ATTEMPTED_HISTORICAL_MUTATION,
  C.L14P_REPAIR_ATTEMPTED_INTERACTION_INVENTION,
  C.L14P_REPAIR_ATTEMPTED_FEEDBACK_REWRITE,
  C.L14P_REPAIR_ATTEMPTED_OUTCOME_FABRICATION,
]);

const ERROR_CODES = new Set<L14PersistenceViolationCode>([
  C.L14P_LINEAGE_REFS_MISSING,
  C.L14P_REPLAY_HASH_MISSING,
  C.L14P_CURRENT_REGISTRY_WRITE_WITHOUT_SUPERSESSION,
  C.L14P_HISTORICAL_FACT_SOURCE_REF_MISSING,
  C.L14P_HISTORICAL_FACT_FAMILY_MISMATCH,
  C.L14P_READ_SURFACE_UNKNOWN,
  C.L14P_READ_MODE_NOT_ALLOWED,
  C.L14P_READ_CONSUMER_NOT_ALLOWED,
  C.L14P_REPAIR_SOURCE_HISTORY_MISSING,
  C.L14P_ALERT_PERFORMANCE_FACT_SOURCE_INCOMPLETE,
  C.L14P_CHANNEL_HEALTH_FACT_SOURCE_INCOMPLETE,
  C.L14P_CALIBRATION_QUEUE_REGISTRY_MISMATCH,
  C.L14P_CHANNEL_HEALTH_REGISTRY_MISMATCH,
  C.L14P_AUDIT_EVENT_NOT_DETERMINISTIC,
]);

export function severityForL14PersistenceCode(
  code: L14PersistenceViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14PersistenceBlockingCode(
  code: L14PersistenceViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14PersistenceAuditRecord[] = [];

export function resetL14PersistenceAuditLog(): void {
  auditLog.length = 0;
}

export interface L14PersistenceAuditEmissionInput {
  readonly subjectClass: L14PersistenceAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14PersistenceViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14PersistenceViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14PersistenceCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14PersistenceAuditRecord(
  input: L14PersistenceAuditEmissionInput,
): L14PersistenceAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.persistence.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14PersistenceBlockingCode(c));
  const replayHash = fnv1a([
    input.subjectClass, input.subjectRef, sortedCodes.join(','), input.message,
    severity, String(blocking), lineage.join(','), POLICY_V,
  ].join('|'));
  const record: L14PersistenceAuditRecord = {
    audit_id: `l14p.audit.${replayHash}`,
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

export function getL14PersistenceAuditLog(): readonly L14PersistenceAuditRecord[] {
  return [...auditLog];
}

export function getL14PersistenceCriticalViolations(): readonly L14PersistenceAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
