/**
 * L12.6 — Persistence / read / replay / repair / downstream audit (§12.6.22).
 *
 * Deterministic audit trail for L12P_* violations. Mirrors the L12.5 template
 * audit shape so all L12 audit surfaces feel uniform.
 *
 * Severity mapping per §12.6.22:
 *   CRITICAL — direct write attempted, L5 route missing, Redis as authority,
 *              replay writes current, downstream rebuild attempt, scenario as
 *              recommendation, scenario as final judgment.
 *   ERROR    — read surface unregistered, evidence pointer incomplete, replay
 *              mismatch hidden, repair parent missing, repair reason missing,
 *              current authority mismatch, etc.
 *   WARNING  — soft posture flags (cache miss fallback, partial windows).
 */

import {
  L12PersistenceViolationCode,
  L12PersistenceViolationIssue,
} from '../persistence/l12-persistence-violation-codes';

export enum L12PersistenceAuditSubjectClass {
  PERSISTENCE_ENVELOPE = 'PERSISTENCE_ENVELOPE',
  CURRENT_AUTHORITY = 'CURRENT_AUTHORITY',
  HISTORICAL_FACT = 'HISTORICAL_FACT',
  EVIDENCE_POINTER = 'EVIDENCE_POINTER',
  MATERIALIZATION_POLICY = 'MATERIALIZATION_POLICY',
  READ_SURFACE = 'READ_SURFACE',
  READ_REQUEST = 'READ_REQUEST',
  READ_RESULT = 'READ_RESULT',
  DOWNSTREAM_CONSUMPTION = 'DOWNSTREAM_CONSUMPTION',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  INVARIANT = 'INVARIANT',
}

export const ALL_L12_PERSISTENCE_AUDIT_SUBJECT_CLASSES: readonly L12PersistenceAuditSubjectClass[] =
  Object.values(L12PersistenceAuditSubjectClass);

export type L12PersistenceAuditSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

const CRITICAL_CODES: ReadonlySet<L12PersistenceViolationCode> = new Set([
  // L5 / direct write / cache authority
  L12PersistenceViolationCode.L12P_L5_ROUTE_MISSING,
  L12PersistenceViolationCode.L12P_DIRECT_WRITE_ATTEMPT,
  L12PersistenceViolationCode.L12P_REDIS_USED_AS_AUTHORITY,
  L12PersistenceViolationCode.L12P_CACHE_USED_AS_AUTHORITY,

  // Replay writes current / shadow writes current
  L12PersistenceViolationCode.L12P_REPLAY_WRITES_CURRENT,
  L12PersistenceViolationCode.L12P_CURRENT_AUTHORITY_WRITTEN_BY_REPLAY,
  L12PersistenceViolationCode.L12P_CURRENT_AUTHORITY_WRITTEN_BY_SHADOW,
  L12PersistenceViolationCode.L12P_CURRENT_WRITE_FROM_NON_LIVE_RUN,
  L12PersistenceViolationCode.L12P_BACKFILL_WRITES_CURRENT,

  // Historical fact mutated in place
  L12PersistenceViolationCode.L12P_HISTORICAL_FACT_MUTATED,

  // Downstream rebuild / forbidden uses
  L12PersistenceViolationCode.L12P_DOWNSTREAM_REBUILD_ATTEMPT,
  L12PersistenceViolationCode.L12P_DOWNSTREAM_LOWER_LAYER_REF_REQUESTED,
  L12PersistenceViolationCode.L12P_SCENARIO_AS_RECOMMENDATION,
  L12PersistenceViolationCode.L12P_SCENARIO_AS_FINAL_JUDGMENT,
  L12PersistenceViolationCode.L12P_SCENARIO_AS_TRADE_INSTRUCTION,
  L12PersistenceViolationCode.L12P_SCENARIO_AS_PREDICTION_CERTAINTY,

  // Repair safety
  L12PersistenceViolationCode.L12P_REPAIR_MUTATES_PRIOR_RUN,
  L12PersistenceViolationCode.L12P_REPAIR_MASQUERADES_AS_LIVE,
  L12PersistenceViolationCode.L12P_REPAIR_BYPASSES_SUPERSESSION,
  L12PersistenceViolationCode.L12P_REPAIR_INVENTED_EVIDENCE,
  L12PersistenceViolationCode.L12P_REPAIR_REUSES_PARENT_COMPUTE_RUN_ID,

  // Replay invented evidence / hidden mismatch
  L12PersistenceViolationCode.L12P_REPLAY_INVENTED_EVIDENCE,
  L12PersistenceViolationCode.L12P_REPLAY_HASH_MISMATCH_HIDDEN,
]);

const WARNING_CODES: ReadonlySet<L12PersistenceViolationCode> = new Set<L12PersistenceViolationCode>([
  L12PersistenceViolationCode.L12P_READ_FRESHNESS_MISMATCH,
]);

export function severityForL12PersistenceViolationCode(
  code: L12PersistenceViolationCode,
): L12PersistenceAuditSeverity {
  if (CRITICAL_CODES.has(code)) return 'CRITICAL';
  if (WARNING_CODES.has(code)) return 'WARNING';
  return 'ERROR';
}

export interface L12PersistenceAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L12PersistenceAuditSubjectClass;
  readonly violation_code: L12PersistenceViolationCode;
  readonly severity: L12PersistenceAuditSeverity;
  readonly subject_ref?: string;
  readonly detail: string;
  readonly emitted_at: string;
  readonly source: string;
}

const AUDIT_LOG: L12PersistenceAuditRecord[] = [];
let SEQ = 0;

function nextAuditId(): string {
  SEQ += 1;
  return `l12.persistence_audit.${String(SEQ).padStart(8, '0')}`;
}

export function makeL12PersistenceAuditRecord(
  subjectClass: L12PersistenceAuditSubjectClass,
  source: string,
  issue: L12PersistenceViolationIssue,
): L12PersistenceAuditRecord {
  const rec: L12PersistenceAuditRecord = {
    audit_id: nextAuditId(),
    subject_class: subjectClass,
    violation_code: issue.code,
    severity: severityForL12PersistenceViolationCode(issue.code),
    subject_ref: issue.subject_ref,
    detail: issue.message,
    emitted_at: new Date().toISOString(),
    source,
  };
  AUDIT_LOG.push(rec);
  return rec;
}

export function emitL12PersistenceAuditRecords(
  subjectClass: L12PersistenceAuditSubjectClass,
  source: string,
  issues: readonly L12PersistenceViolationIssue[],
): readonly L12PersistenceAuditRecord[] {
  return issues.map(i => makeL12PersistenceAuditRecord(subjectClass, source, i));
}

export function getL12PersistenceAuditLog(): readonly L12PersistenceAuditRecord[] {
  return [...AUDIT_LOG];
}

export function resetL12PersistenceAuditLog(): void {
  AUDIT_LOG.length = 0;
  SEQ = 0;
}

export function getL12PersistenceViolationCount(): number {
  return AUDIT_LOG.length;
}

export function hasAnyL12PersistenceViolations(): boolean {
  return AUDIT_LOG.length > 0;
}

export function getL12PersistenceCriticalViolations(): readonly L12PersistenceAuditRecord[] {
  return AUDIT_LOG.filter(r => r.severity === 'CRITICAL');
}

export function getL12PersistenceViolationsBySubjectClass(
  cls: L12PersistenceAuditSubjectClass,
): readonly L12PersistenceAuditRecord[] {
  return AUDIT_LOG.filter(r => r.subject_class === cls);
}

export function getL12PersistenceViolationsByCode(
  code: L12PersistenceViolationCode,
): readonly L12PersistenceAuditRecord[] {
  return AUDIT_LOG.filter(r => r.violation_code === code);
}
