/**
 * L11.8 — Persistence Audit Surface (§11.8.18)
 *
 * Deterministic `l11p.audit.…` emitter for L11.8 violations.
 *
 * Audit subject classes:
 *   - persistence envelope
 *   - durable surface
 *   - current authority
 *   - historical fact
 *   - evidence pointer
 *   - read surface
 *   - downstream consumption
 *   - replay
 *   - repair
 *   - run record
 *   - failure record
 *   - invariant
 */

import {
  L11PersistenceIssue,
  L11PersistenceViolationCode,
} from '../persistence/l11-persistence-violation-codes';

export enum L11PersistenceAuditSubjectClass {
  PERSISTENCE_ENVELOPE = 'PERSISTENCE_ENVELOPE',
  DURABLE_SURFACE = 'DURABLE_SURFACE',
  CURRENT_AUTHORITY = 'CURRENT_AUTHORITY',
  HISTORICAL_FACT = 'HISTORICAL_FACT',
  EVIDENCE_POINTER = 'EVIDENCE_POINTER',
  READ_SURFACE = 'READ_SURFACE',
  DOWNSTREAM_CONSUMPTION = 'DOWNSTREAM_CONSUMPTION',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  RUN_RECORD = 'RUN_RECORD',
  FAILURE_RECORD = 'FAILURE_RECORD',
  INVARIANT = 'INVARIANT',
}

export const ALL_L11_PERSISTENCE_AUDIT_SUBJECT_CLASSES:
  readonly L11PersistenceAuditSubjectClass[] =
  Object.values(L11PersistenceAuditSubjectClass);

export enum L11PersistenceAuditSeverity {
  CRITICAL = 'CRITICAL',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

const CRITICAL_CODES: ReadonlySet<L11PersistenceViolationCode> = new Set([
  L11PersistenceViolationCode.L11P_DIRECT_STORE_WRITE_ATTEMPT,
  L11PersistenceViolationCode.L11P_REDIS_USED_AS_AUTHORITY,
  L11PersistenceViolationCode.L11P_REDIS_AS_AUTHORITY_READ,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_ATTEMPT,
  L11PersistenceViolationCode.L11P_CURRENT_AUTHORITY_NOT_POSTGRES,
  L11PersistenceViolationCode.L11P_HISTORICAL_FACT_MUTATION,
  L11PersistenceViolationCode.L11P_EVIDENCE_PATH_TRAVERSAL,
  L11PersistenceViolationCode.L11P_HISTORICAL_PRETENDS_CURRENT_AUTHORITY,
  L11PersistenceViolationCode.L11P_RAW_STORAGE_READ_FOR_OFFICIAL_STATE,
  L11PersistenceViolationCode.L11P_CURRENT_WRITTEN_UNDER_REPLAY,
  L11PersistenceViolationCode.L11P_REPAIR_DESTRUCTIVE_HISTORICAL_MUTATION,
  L11PersistenceViolationCode.L11P_REPAIR_MASQUERADES_AS_LIVE,
  L11PersistenceViolationCode.L11P_REPAIR_INVENTS_EVIDENCE,
  L11PersistenceViolationCode.L11P_CRITICAL_FAILURE_DID_NOT_BLOCK_CURRENT,
]);

const ERROR_CODES: ReadonlySet<L11PersistenceViolationCode> = new Set([
  L11PersistenceViolationCode.L11P_REPLAY_HASH_MISMATCH,
  L11PersistenceViolationCode.L11P_REPLAY_ATTRIBUTION_MISMATCH,
  L11PersistenceViolationCode.L11P_REPLAY_MISSING_DATA_MISMATCH,
  L11PersistenceViolationCode.L11P_REPLAY_MODIFIER_MISMATCH,
  L11PersistenceViolationCode.L11P_REPLAY_CALIBRATION_MISMATCH,
  L11PersistenceViolationCode.L11P_REPLAY_FORMULA_VERSION_MISMATCH,
  L11PersistenceViolationCode.L11P_REPLAY_THRESHOLD_POLICY_MISMATCH,
  L11PersistenceViolationCode.L11P_REPAIR_PARENT_RUN_MISSING,
  L11PersistenceViolationCode.L11P_REPAIR_REASON_MISSING,
  L11PersistenceViolationCode.L11P_REPAIR_REUSES_RUN_ID,
  L11PersistenceViolationCode.L11P_REPAIR_NO_CORRECTION_REFS,
  L11PersistenceViolationCode.L11P_PERSISTENCE_CLASS_SURFACE_MISMATCH,
  L11PersistenceViolationCode.L11P_MODE_NOT_ALLOWED_FOR_SURFACE,
  L11PersistenceViolationCode.L11P_SUPERSESSION_PRIOR_REF_MISSING,
  L11PersistenceViolationCode.L11P_SUPERSESSION_REASON_MISSING,
  L11PersistenceViolationCode.L11P_EVIDENCE_POINTER_INCOMPLETE,
  L11PersistenceViolationCode.L11P_EVIDENCE_PATH_INVALID,
  L11PersistenceViolationCode.L11P_READ_MODE_NOT_ALLOWED,
  L11PersistenceViolationCode.L11P_CONSUMER_NOT_ALLOWED,
  L11PersistenceViolationCode.L11P_CURRENT_READ_BYPASSES_CURRENT_REGISTRY,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_USES_SCORE_WITHOUT_ATTRIBUTION,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_USES_SCORE_WITHOUT_MISSING_DATA,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_SCORING_USE_WITHOUT_DRIFT,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_NOT_REPLAY_OR_REPAIR,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_RECOMPUTE_REASON_MISSING,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_CONSUMER_NOT_ALLOWED,
  L11PersistenceViolationCode.L11P_DOWNSTREAM_READ_MODE_NOT_ALLOWED,
  L11PersistenceViolationCode.L11P_HISTORICAL_FACT_INCOMPLETE,
  L11PersistenceViolationCode.L11P_HISTORICAL_REPLAY_HASH_MISSING,
  L11PersistenceViolationCode.L11P_HISTORICAL_FORMULA_VERSION_MISSING,
  L11PersistenceViolationCode.L11P_HISTORICAL_CORRECTION_LINK_MISSING,
  L11PersistenceViolationCode.L11P_HISTORICAL_ATTRIBUTION_REF_MISSING,
  L11PersistenceViolationCode.L11P_HISTORICAL_COMPONENT_REFS_MISSING,
  L11PersistenceViolationCode.L11P_EVIDENCE_POINTER_ORPHANED,
  L11PersistenceViolationCode.L11P_EVIDENCE_SUBJECT_KIND_MISMATCH,
  L11PersistenceViolationCode.L11P_EVIDENCE_CLASS_MISMATCH,
  L11PersistenceViolationCode.L11P_EVIDENCE_ARCHIVE_URI_MISSING,
  L11PersistenceViolationCode.L11P_EVIDENCE_MANIFEST_MISSING,
  L11PersistenceViolationCode.L11P_EVIDENCE_CHECKSUM_MISSING,
  L11PersistenceViolationCode.L11P_EVIDENCE_REPLAY_REF_MISSING,
  L11PersistenceViolationCode.L11P_REPLAY_RESULT_INCOMPLETE,
  L11PersistenceViolationCode.L11P_REPLAY_SOURCE_RUN_MISSING,
  L11PersistenceViolationCode.L11P_REPLAY_INVENTED_EVIDENCE,
  L11PersistenceViolationCode.L11P_REPLAY_UPDATES_CURRENT,
  L11PersistenceViolationCode.L11P_REPLAY_OVERWRITES_HISTORICAL,
  L11PersistenceViolationCode.L11P_RUN_RECORD_INCOMPLETE,
  L11PersistenceViolationCode.L11P_FAILURE_RECORD_INCOMPLETE,
  L11PersistenceViolationCode.L11P_REPAIR_REQUEST_INCOMPLETE,
]);

export function severityForL11PersistenceCode(
  code: L11PersistenceViolationCode,
): L11PersistenceAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L11PersistenceAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L11PersistenceAuditSeverity.ERROR;
  return L11PersistenceAuditSeverity.WARNING;
}

export interface L11PersistenceAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L11PersistenceAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L11PersistenceViolationCode;
  readonly severity: L11PersistenceAuditSeverity;
  readonly explanation: string;
  readonly emitted_at: string;
  readonly envelope_id?: string;
  readonly surface_id?: string;
  readonly current_record_id?: string;
  readonly historical_fact_id?: string;
  readonly evidence_pointer_id?: string;
  readonly read_request_id?: string;
  readonly downstream_request_id?: string;
  readonly replay_id?: string;
  readonly repair_request_id?: string;
  readonly score_id?: string;
  readonly run_id?: string;
}

export function makeL11PersistenceAuditRecord(
  subject_class: L11PersistenceAuditSubjectClass,
  subject_ref: string,
  issue: L11PersistenceIssue,
  emitted_at: string,
): L11PersistenceAuditRecord {
  return {
    audit_id: deterministicL11PersistenceAuditId(
      subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: severityForL11PersistenceCode(issue.code),
    explanation: issue.message,
    emitted_at,
    envelope_id: issue.context?.envelope_id,
    surface_id: issue.context?.surface_id,
    current_record_id: issue.context?.current_record_id,
    historical_fact_id: issue.context?.historical_fact_id,
    evidence_pointer_id: issue.context?.evidence_pointer_id,
    read_request_id: issue.context?.read_request_id,
    downstream_request_id: issue.context?.downstream_request_id,
    replay_id: issue.context?.replay_id,
    repair_request_id: issue.context?.repair_request_id,
    score_id: issue.context?.score_id,
    run_id: issue.context?.run_id,
  };
}

export function emitL11PersistenceAuditRecords(
  subject_class: L11PersistenceAuditSubjectClass,
  subject_ref: string,
  issues: readonly L11PersistenceIssue[],
  emitted_at: string,
): readonly L11PersistenceAuditRecord[] {
  return issues.map(i =>
    makeL11PersistenceAuditRecord(subject_class, subject_ref, i, emitted_at));
}

export function emitL11PersistenceAuditBatch(
  subject_class: L11PersistenceAuditSubjectClass,
  default_subject_ref: string,
  issues: readonly L11PersistenceIssue[],
  emitted_at: string,
): readonly L11PersistenceAuditRecord[] {
  return issues.map(i => {
    const ref =
      i.context?.envelope_id ??
      i.context?.surface_id ??
      i.context?.current_record_id ??
      i.context?.historical_fact_id ??
      i.context?.evidence_pointer_id ??
      i.context?.read_request_id ??
      i.context?.downstream_request_id ??
      i.context?.replay_id ??
      i.context?.repair_request_id ??
      default_subject_ref;
    return makeL11PersistenceAuditRecord(subject_class, ref, i, emitted_at);
  });
}

function deterministicL11PersistenceAuditId(
  subject_class: L11PersistenceAuditSubjectClass,
  subject_ref: string,
  code: L11PersistenceViolationCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l11p.audit.${h.toString(16).padStart(8, '0')}`;
}
