/**
 * L7.7 — Persistence & Serving Audit Surface
 *
 * §7.7 — Emits durable audit records whenever a persistence validator,
 * evidence-storage validator, read-surface validator, or downstream-
 * consumption validator rejects an attempt.
 *
 * Disjoint from:
 *   - L7.1 constitutional audit
 *   - L7.2 object audit
 *   - L7.3 contract audit
 *   - L7.4 runtime audit
 *   - L7.5 semantic audit
 *   - L7.6 confidence audit
 */

import { L7PersistenceViolationCode } from '../persistence/l7-persistence-violation-codes';

export type L7PersistenceAuditSurface =
  | 'DURABLE_SURFACE'
  | 'CURRENT_AUTHORITY'
  | 'HISTORICAL_WRITE'
  | 'EVIDENCE_STORAGE'
  | 'READ_SURFACE'
  | 'DOWNSTREAM_CONSUMPTION'
  | 'LINEAGE_REPLAY';

export interface L7PersistenceAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L7PersistenceViolationCode;
  readonly source: string;
  readonly auditSurface: L7PersistenceAuditSurface;
  readonly subjectId: string | null;
  readonly durableSurfaceId: string | null;
  readonly readSurfaceId: string | null;
  readonly consumerClass: string | null;
  readonly materializationMode: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';
}

const auditLog: L7PersistenceAuditRecord[] = [];

export function resetPersistenceAuditLog(): void {
  auditLog.length = 0;
}

export function emitPersistenceAuditRecord(
  record: Omit<L7PersistenceAuditRecord, 'timestamp'>,
): L7PersistenceAuditRecord {
  const full: L7PersistenceAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getPersistenceAuditLog(): readonly L7PersistenceAuditRecord[] {
  return [...auditLog];
}

export function getPersistenceViolationsByCode(
  code: L7PersistenceViolationCode,
): readonly L7PersistenceAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getPersistenceViolationsBySurface(
  surface: L7PersistenceAuditSurface,
): readonly L7PersistenceAuditRecord[] {
  return auditLog.filter(r => r.auditSurface === surface);
}

export function hasAnyPersistenceViolations(): boolean {
  return auditLog.length > 0;
}

export function getPersistenceViolationCount(): number {
  return auditLog.length;
}

export function getPersistenceCriticalViolations(): readonly L7PersistenceAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function surfaceForPersistenceViolation(
  code: L7PersistenceViolationCode,
): L7PersistenceAuditSurface {
  switch (code) {
    case L7PersistenceViolationCode.UNKNOWN_DURABLE_SURFACE:
    case L7PersistenceViolationCode.DURABLE_SURFACE_NOT_REGISTERED:
    case L7PersistenceViolationCode.AUTHORITY_STORE_MISMATCH:
    case L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE:
    case L7PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATED:
    case L7PersistenceViolationCode.SHADOW_AUTHORITY_DETECTED:
    case L7PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT:
    case L7PersistenceViolationCode.OBJECT_STORE_AS_CURRENT_AUTHORITY:
    case L7PersistenceViolationCode.DIRECT_STORE_BYPASS:
    case L7PersistenceViolationCode.L5_BYPASS_ATTEMPT:
      return 'DURABLE_SURFACE';

    case L7PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION:
    case L7PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING:
    case L7PersistenceViolationCode.CURRENT_MATERIALIZATION_NOT_READY:
    case L7PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID:
    case L7PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE:
    case L7PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE:
    case L7PersistenceViolationCode.LIVE_WRITTEN_AS_REPLAY:
      return 'CURRENT_AUTHORITY';

    case L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY:
    case L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE:
    case L7PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE:
    case L7PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING:
    case L7PersistenceViolationCode.HISTORICAL_ROW_EVIDENCE_REF_MISSING:
    case L7PersistenceViolationCode.HISTORICAL_ROW_POLICY_VERSION_MISSING:
    case L7PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT:
    case L7PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON:
    case L7PersistenceViolationCode.CORRECTION_ROW_NOT_APPENDED:
    case L7PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY:
      return 'HISTORICAL_WRITE';

    case L7PersistenceViolationCode.EVIDENCE_CLASS_UNKNOWN:
    case L7PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_MANIFEST_LINKAGE_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_SUBJECT_LINK_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_REPLAY_REF_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_CLASS_PAYLOAD_MISMATCH:
    case L7PersistenceViolationCode.ORPHAN_EVIDENCE:
    case L7PersistenceViolationCode.EVIDENCE_REQUIRED_BUT_ABSENT:
    case L7PersistenceViolationCode.EVIDENCE_PATH_NON_DETERMINISTIC:
      return 'EVIDENCE_STORAGE';

    case L7PersistenceViolationCode.UNKNOWN_READ_SURFACE:
    case L7PersistenceViolationCode.READ_SURFACE_NOT_REGISTERED:
    case L7PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE:
    case L7PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED:
    case L7PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT:
    case L7PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE:
    case L7PersistenceViolationCode.CURRENT_FROM_HISTORICAL_GUESS:
    case L7PersistenceViolationCode.HISTORICAL_FROM_CURRENT_GUESS:
    case L7PersistenceViolationCode.AD_HOC_REVALIDATION_FROM_L6:
    case L7PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER:
      return 'READ_SURFACE';

    case L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE:
    case L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_RESTRICTION:
    case L7PersistenceViolationCode.DOWNSTREAM_REBUILDS_VALIDATION:
    case L7PersistenceViolationCode.DOWNSTREAM_RAW_ARCHIVE_ACCESS:
    case L7PersistenceViolationCode.DOWNSTREAM_IGNORES_CAP_CHAIN:
    case L7PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION_POSTURE:
    case L7PersistenceViolationCode.DOWNSTREAM_READ_MODE_SPOOFED:
      return 'DOWNSTREAM_CONSUMPTION';

    case L7PersistenceViolationCode.LINEAGE_LINK_BROKEN:
    case L7PersistenceViolationCode.REPLAY_GENERATION_REF_MISSING:
    case L7PersistenceViolationCode.CURRENT_HISTORICAL_INCONSISTENCY:
    case L7PersistenceViolationCode.REPLAY_REPAIR_SEMANTIC_DRIFT:
      return 'LINEAGE_REPLAY';

    default:
      return 'DURABLE_SURFACE';
  }
}

export function defaultSeverityForPersistenceViolation(
  code: L7PersistenceViolationCode,
): L7PersistenceAuditRecord['severity'] {
  switch (code) {
    case L7PersistenceViolationCode.L5_BYPASS_ATTEMPT:
    case L7PersistenceViolationCode.DIRECT_STORE_BYPASS:
    case L7PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT:
    case L7PersistenceViolationCode.OBJECT_STORE_AS_CURRENT_AUTHORITY:
    case L7PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE:
    case L7PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY:
    case L7PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION:
    case L7PersistenceViolationCode.DOWNSTREAM_REBUILDS_VALIDATION:
    case L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_RESTRICTION:
    case L7PersistenceViolationCode.DOWNSTREAM_RAW_ARCHIVE_ACCESS:
    case L7PersistenceViolationCode.DOWNSTREAM_READ_MODE_SPOOFED:
    case L7PersistenceViolationCode.ORPHAN_EVIDENCE:
    case L7PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT:
    case L7PersistenceViolationCode.AD_HOC_REVALIDATION_FROM_L6:
      return 'CRITICAL';

    case L7PersistenceViolationCode.AUTHORITY_STORE_MISMATCH:
    case L7PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE:
    case L7PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATED:
    case L7PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE:
    case L7PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE:
    case L7PersistenceViolationCode.LIVE_WRITTEN_AS_REPLAY:
    case L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY:
    case L7PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE:
    case L7PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT:
    case L7PersistenceViolationCode.CORRECTION_ROW_NOT_APPENDED:
    case L7PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_MANIFEST_LINKAGE_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_REPLAY_REF_MISSING:
    case L7PersistenceViolationCode.EVIDENCE_CLASS_PAYLOAD_MISMATCH:
    case L7PersistenceViolationCode.CURRENT_FROM_HISTORICAL_GUESS:
    case L7PersistenceViolationCode.HISTORICAL_FROM_CURRENT_GUESS:
    case L7PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE:
    case L7PersistenceViolationCode.DOWNSTREAM_IGNORES_CAP_CHAIN:
    case L7PersistenceViolationCode.DOWNSTREAM_IGNORES_RESTRICTION_POSTURE:
    case L7PersistenceViolationCode.LINEAGE_LINK_BROKEN:
    case L7PersistenceViolationCode.CURRENT_HISTORICAL_INCONSISTENCY:
    case L7PersistenceViolationCode.REPLAY_REPAIR_SEMANTIC_DRIFT:
      return 'HIGH';

    default:
      return 'MEDIUM';
  }
}
