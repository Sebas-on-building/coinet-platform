/**
 * L8.8 — Persistence & Serving Audit Surface
 *
 * §8.8 — Emits durable audit records whenever a persistence
 * validator, evidence-storage validator, read-surface validator, or
 * downstream-consumption validator rejects an attempt.
 *
 * Disjoint from every earlier L8 audit log:
 *   - L8.1 constitutional audit
 *   - L8.2 object audit
 *   - L8.3 contract audit
 *   - L8.4 runtime audit (via runtime violation codes)
 *   - L8.5 input audit
 *   - L8.6 template audit
 *   - L8.7 reliance audit
 */

import { L8PersistenceViolationCode }
  from '../persistence/l8-persistence-violation-codes';

export type L8PersistenceAuditSurface =
  | 'DURABLE_SURFACE'
  | 'CURRENT_AUTHORITY'
  | 'HISTORICAL_WRITE'
  | 'EVIDENCE_STORAGE'
  | 'READ_SURFACE'
  | 'DOWNSTREAM_CONSUMPTION'
  | 'LINEAGE_REPLAY'
  | 'INVARIANT';

export type L8PersistenceAuditSeverity =
  | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO';

export interface L8PersistenceAuditRecord {
  readonly timestamp: string;
  readonly violationCode: L8PersistenceViolationCode | null;
  readonly source: string;
  readonly auditSurface: L8PersistenceAuditSurface;
  readonly regimeSubjectId: string | null;
  readonly durableSurfaceId: string | null;
  readonly readSurfaceId: string | null;
  readonly consumerClass: string | null;
  readonly materializationMode: string | null;
  readonly detail: string;
  readonly context: Record<string, unknown>;
  readonly severity: L8PersistenceAuditSeverity;
}

const auditLog: L8PersistenceAuditRecord[] = [];

export function resetL8PersistenceAuditLog(): void {
  auditLog.length = 0;
}

export function emitL8PersistenceAuditRecord(
  record: Omit<L8PersistenceAuditRecord, 'timestamp'>,
): L8PersistenceAuditRecord {
  const full: L8PersistenceAuditRecord = {
    ...record,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(full);
  return full;
}

export function getL8PersistenceAuditLog():
  readonly L8PersistenceAuditRecord[] {
  return [...auditLog];
}

export function getL8PersistenceViolationsByCode(
  code: L8PersistenceViolationCode,
): readonly L8PersistenceAuditRecord[] {
  return auditLog.filter(r => r.violationCode === code);
}

export function getL8PersistenceViolationsBySurface(
  surface: L8PersistenceAuditSurface,
): readonly L8PersistenceAuditRecord[] {
  return auditLog.filter(r => r.auditSurface === surface);
}

export function hasAnyL8PersistenceViolations(): boolean {
  return auditLog.length > 0;
}

export function getL8PersistenceViolationCount(): number {
  return auditLog.length;
}

export function getL8PersistenceCriticalViolations():
  readonly L8PersistenceAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

// ── Code → surface → severity mapping ─────────────────────────────────

export function surfaceForL8PersistenceViolation(
  code: L8PersistenceViolationCode,
): L8PersistenceAuditSurface {
  switch (code) {
    case L8PersistenceViolationCode.UNKNOWN_DURABLE_SURFACE:
    case L8PersistenceViolationCode.DURABLE_SURFACE_NOT_REGISTERED:
    case L8PersistenceViolationCode.AUTHORITY_STORE_MISMATCH:
    case L8PersistenceViolationCode.AUTHORITY_STORE_INVALID_FOR_SURFACE:
    case L8PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATED:
    case L8PersistenceViolationCode.SHADOW_AUTHORITY_DETECTED:
    case L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT:
    case L8PersistenceViolationCode.OBJECT_STORE_AS_CURRENT_AUTHORITY:
    case L8PersistenceViolationCode.CLICKHOUSE_AS_CURRENT_AUTHORITY:
    case L8PersistenceViolationCode.DIRECT_STORE_BYPASS:
    case L8PersistenceViolationCode.L5_BYPASS_ATTEMPT:
      return 'DURABLE_SURFACE';

    case L8PersistenceViolationCode.CURRENT_STATE_OVERWRITE_WITHOUT_SUPERSESSION:
    case L8PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING:
    case L8PersistenceViolationCode.CURRENT_MATERIALIZATION_NOT_READY:
    case L8PersistenceViolationCode.CURRENT_MATERIALIZATION_MODE_INVALID:
    case L8PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE:
    case L8PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE:
    case L8PersistenceViolationCode.LATE_DATA_WRITTEN_AS_LIVE:
    case L8PersistenceViolationCode.LIVE_WRITTEN_AS_HISTORICAL:
    case L8PersistenceViolationCode.AUTHORITY_CLASS_SURFACE_MISMATCH:
      return 'CURRENT_AUTHORITY';

    case L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY:
    case L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE:
    case L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE:
    case L8PersistenceViolationCode.HISTORICAL_ROW_MODE_MISSING:
    case L8PersistenceViolationCode.HISTORICAL_ROW_EVIDENCE_REF_MISSING:
    case L8PersistenceViolationCode.HISTORICAL_ROW_POLICY_VERSION_MISSING:
    case L8PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT:
    case L8PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON:
    case L8PersistenceViolationCode.CORRECTION_ROW_NOT_APPENDED:
    case L8PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY:
      return 'HISTORICAL_WRITE';

    case L8PersistenceViolationCode.EVIDENCE_CLASS_UNKNOWN:
    case L8PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_MANIFEST_LINKAGE_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_SUBJECT_LINK_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_REPLAY_REF_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_CLASS_PAYLOAD_MISMATCH:
    case L8PersistenceViolationCode.EVIDENCE_SUBJECT_KIND_MISMATCH:
    case L8PersistenceViolationCode.ORPHAN_EVIDENCE:
    case L8PersistenceViolationCode.EVIDENCE_REQUIRED_BUT_ABSENT:
    case L8PersistenceViolationCode.EVIDENCE_PATH_NON_DETERMINISTIC:
      return 'EVIDENCE_STORAGE';

    case L8PersistenceViolationCode.UNKNOWN_READ_SURFACE:
    case L8PersistenceViolationCode.READ_SURFACE_NOT_REGISTERED:
    case L8PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE:
    case L8PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED:
    case L8PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT:
    case L8PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE:
    case L8PersistenceViolationCode.CURRENT_FROM_HISTORICAL_GUESS:
    case L8PersistenceViolationCode.HISTORICAL_FROM_CURRENT_GUESS:
    case L8PersistenceViolationCode.READ_SCOPE_REQUIRED_BUT_MISSING:
    case L8PersistenceViolationCode.READ_SUBJECT_REQUIRED_BUT_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER:
      return 'READ_SURFACE';

    case L8PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE:
    case L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_REGIME_LIVE:
    case L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_TRANSITION_LIVE:
    case L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_MULTIPLIER_LIVE:
    case L8PersistenceViolationCode.DOWNSTREAM_RAW_ARCHIVE_ACCESS:
    case L8PersistenceViolationCode.DOWNSTREAM_IGNORES_RELIANCE_POSTURE:
    case L8PersistenceViolationCode.DOWNSTREAM_IGNORES_CAP_CHAIN:
    case L8PersistenceViolationCode.DOWNSTREAM_READ_MODE_SPOOFED:
      return 'DOWNSTREAM_CONSUMPTION';

    case L8PersistenceViolationCode.LINEAGE_LINK_BROKEN:
    case L8PersistenceViolationCode.REPLAY_GENERATION_REF_MISSING:
    case L8PersistenceViolationCode.CURRENT_HISTORICAL_INCONSISTENCY:
    case L8PersistenceViolationCode.REPLAY_REPAIR_SEMANTIC_DRIFT:
    case L8PersistenceViolationCode.REPAIR_REUSES_LIVE_RUN_ID:
    case L8PersistenceViolationCode.REPAIR_MISSING_PARENT_RUN:
    case L8PersistenceViolationCode.REPAIR_MISSING_REASON:
      return 'LINEAGE_REPLAY';
  }
}

export function defaultSeverityForL8PersistenceViolation(
  code: L8PersistenceViolationCode,
): L8PersistenceAuditSeverity {
  switch (code) {
    case L8PersistenceViolationCode.SHADOW_AUTHORITY_DETECTED:
    case L8PersistenceViolationCode.REDIS_AS_AUTHORITY_ATTEMPT:
    case L8PersistenceViolationCode.OBJECT_STORE_AS_CURRENT_AUTHORITY:
    case L8PersistenceViolationCode.CLICKHOUSE_AS_CURRENT_AUTHORITY:
    case L8PersistenceViolationCode.L5_BYPASS_ATTEMPT:
    case L8PersistenceViolationCode.DIRECT_STORE_BYPASS:
    case L8PersistenceViolationCode.HISTORICAL_ROW_DESTRUCTIVE_OVERWRITE:
    case L8PersistenceViolationCode.HISTORICAL_MUTATES_CURRENT_SILENTLY:
    case L8PersistenceViolationCode.REPLAY_WRITTEN_AS_LIVE:
    case L8PersistenceViolationCode.REPAIR_WRITTEN_AS_LIVE:
    case L8PersistenceViolationCode.LATE_DATA_WRITTEN_AS_LIVE:
    case L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_REGIME_LIVE:
    case L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_TRANSITION_LIVE:
    case L8PersistenceViolationCode.DOWNSTREAM_REBUILDS_MULTIPLIER_LIVE:
      return 'CRITICAL';

    case L8PersistenceViolationCode.AUTHORITY_STORE_MISMATCH:
    case L8PersistenceViolationCode.MUTATION_DISCIPLINE_VIOLATED:
    case L8PersistenceViolationCode.SUPERSEDED_PRIOR_REF_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_ARCHIVE_URI_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_CHECKSUM_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_MANIFEST_LINKAGE_MISSING:
    case L8PersistenceViolationCode.EVIDENCE_SUBJECT_LINK_MISSING:
    case L8PersistenceViolationCode.ORPHAN_EVIDENCE:
    case L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_REPLAY_IDENTITY:
    case L8PersistenceViolationCode.HISTORICAL_ROW_MISSING_LINEAGE:
    case L8PersistenceViolationCode.CORRECTION_ROW_MISSING_PARENT:
    case L8PersistenceViolationCode.CORRECTION_ROW_MISSING_REASON:
    case L8PersistenceViolationCode.READ_MODE_INVALID_FOR_SURFACE:
    case L8PersistenceViolationCode.CONSUMER_CLASS_NOT_ALLOWED:
    case L8PersistenceViolationCode.RAW_STORAGE_READ_ATTEMPT:
    case L8PersistenceViolationCode.REDIS_READ_AS_AUTHORITATIVE:
    case L8PersistenceViolationCode.EVIDENCE_READ_WITHOUT_POINTER:
    case L8PersistenceViolationCode.DOWNSTREAM_BYPASSES_READ_SURFACE:
    case L8PersistenceViolationCode.DOWNSTREAM_RAW_ARCHIVE_ACCESS:
    case L8PersistenceViolationCode.REPLAY_REPAIR_SEMANTIC_DRIFT:
      return 'HIGH';

    default:
      return 'MEDIUM';
  }
}

// ── typed emitters ────────────────────────────────────────────────────

export function emitL8PersistenceViolation(
  source: string, code: L8PersistenceViolationCode,
  regimeSubjectId: string | null,
  durableSurfaceId: string | null, detail: string,
  context: Record<string, unknown> = {},
): L8PersistenceAuditRecord {
  return emitL8PersistenceAuditRecord({
    violationCode: code, source,
    auditSurface: surfaceForL8PersistenceViolation(code),
    regimeSubjectId, durableSurfaceId,
    readSurfaceId: null, consumerClass: null, materializationMode: null,
    detail, context,
    severity: defaultSeverityForL8PersistenceViolation(code),
  });
}

export function emitL8ReadSurfaceViolation(
  source: string, code: L8PersistenceViolationCode,
  regimeSubjectId: string | null,
  readSurfaceId: string | null, consumerClass: string | null,
  detail: string, context: Record<string, unknown> = {},
): L8PersistenceAuditRecord {
  return emitL8PersistenceAuditRecord({
    violationCode: code, source,
    auditSurface: 'READ_SURFACE',
    regimeSubjectId, durableSurfaceId: null,
    readSurfaceId, consumerClass, materializationMode: null,
    detail, context,
    severity: defaultSeverityForL8PersistenceViolation(code),
  });
}

export function emitL8DownstreamViolation(
  source: string, code: L8PersistenceViolationCode,
  regimeSubjectId: string | null, consumerClass: string,
  detail: string, context: Record<string, unknown> = {},
): L8PersistenceAuditRecord {
  return emitL8PersistenceAuditRecord({
    violationCode: code, source,
    auditSurface: 'DOWNSTREAM_CONSUMPTION',
    regimeSubjectId, durableSurfaceId: null,
    readSurfaceId: null, consumerClass, materializationMode: null,
    detail, context,
    severity: defaultSeverityForL8PersistenceViolation(code),
  });
}

export function emitL8PersistenceInvariantFailure(
  source: string, invariantId: string, detail: string,
  context: Record<string, unknown> = {},
): L8PersistenceAuditRecord {
  return emitL8PersistenceAuditRecord({
    violationCode: null, source,
    auditSurface: 'INVARIANT',
    regimeSubjectId: null, durableSurfaceId: null,
    readSurfaceId: null, consumerClass: null, materializationMode: null,
    detail: `${invariantId} :: ${detail}`, context,
    severity: 'CRITICAL',
  });
}
