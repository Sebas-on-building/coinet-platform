/**
 * L12.4 — Runtime audit log (§12.4.30).
 *
 * Deterministic audit trail for runtime-level violations (`L12R_*`).
 * Severity mapping per §12.4.30:
 *   CRITICAL — DAG cycle, missing invalidation/trigger, naked score, direct
 *              store write, prediction theater, judgment leak.
 *   ERROR    — ranking before confidence, stage mutation after seal, replay
 *              mismatch, incomplete evidence pack, etc.
 *   WARNING  — soft posture flags (none currently mapped here; reserved).
 */

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
} from '../validation/l12-runtime-violation-codes';

export enum L12RuntimeAuditSubjectClass {
  DAG = 'DAG',
  NODE = 'NODE',
  EDGE = 'EDGE',
  COMPUTE_RUN = 'COMPUTE_RUN',
  EXECUTION_CONTEXT = 'EXECUTION_CONTEXT',
  ASSEMBLY_ENGINE = 'ASSEMBLY_ENGINE',
  INPUT_RESOLUTION = 'INPUT_RESOLUTION',
  CANDIDATE_ENGINE = 'CANDIDATE_ENGINE',
  CONDITION_ENGINE = 'CONDITION_ENGINE',
  TRIGGER_ENGINE = 'TRIGGER_ENGINE',
  INVALIDATION_ENGINE = 'INVALIDATION_ENGINE',
  PATH_CONSTRUCTION = 'PATH_CONSTRUCTION',
  PATH_CONFIDENCE = 'PATH_CONFIDENCE',
  RANKING = 'RANKING',
  SHIFT_CONDITIONS = 'SHIFT_CONDITIONS',
  RESTRICTIONS = 'RESTRICTIONS',
  EVIDENCE_PACK = 'EVIDENCE_PACK',
  MATERIALIZATION = 'MATERIALIZATION',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  INVARIANT = 'INVARIANT',
}

export const ALL_L12_RUNTIME_AUDIT_SUBJECT_CLASSES: readonly L12RuntimeAuditSubjectClass[] =
  Object.values(L12RuntimeAuditSubjectClass);

export type L12RuntimeAuditSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

const CRITICAL_CODES: ReadonlySet<L12RuntimeViolationCode> = new Set([
  L12RuntimeViolationCode.L12R_DAG_CYCLE_DETECTED,
  L12RuntimeViolationCode.L12R_INVALIDATION_MISSING,
  L12RuntimeViolationCode.L12R_INVALIDATION_HIDDEN_FROM_CONFIDENCE,
  L12RuntimeViolationCode.L12R_TRIGGER_MISSING,
  L12RuntimeViolationCode.L12R_TRIGGER_UNMONITORABLE_ACTIVE,
  L12RuntimeViolationCode.L12R_INVALIDATION_UNMONITORABLE_ACTIVE,
  L12RuntimeViolationCode.L12R_NAKED_SCORE_CONSUMPTION,
  L12RuntimeViolationCode.L12R_L11_SCORE_CONTEXT_INCOMPLETE,
  L12RuntimeViolationCode.L12R_DIRECT_STORE_WRITE,
  L12RuntimeViolationCode.L12R_MATERIALIZATION_WITHOUT_EVIDENCE_PACK,
  L12RuntimeViolationCode.L12R_PREDICTION_THEATER,
  L12RuntimeViolationCode.L12R_RECOMMENDATION_LEAK,
  L12RuntimeViolationCode.L12R_JUDGMENT_LEAK,
  L12RuntimeViolationCode.L12R_TRADE_LEAK,
  L12RuntimeViolationCode.L12R_PATH_WITHOUT_TRIGGER,
  L12RuntimeViolationCode.L12R_PATH_WITHOUT_INVALIDATION,
  L12RuntimeViolationCode.L12R_BULLISH_ONLY_FAKE_CERTAINTY,
  L12RuntimeViolationCode.L12R_TRIGGER_GUARANTEED_OUTCOME,
  L12RuntimeViolationCode.L12R_PATH_CERTAINTY_LANGUAGE,
  L12RuntimeViolationCode.L12R_RANKING_NO_BASE_CASE,
  L12RuntimeViolationCode.L12R_RANKING_NO_PRIMARY,
  L12RuntimeViolationCode.L12R_RANKING_FAKE_CLEAN,
  L12RuntimeViolationCode.L12R_REPLAY_INVENTED_EVIDENCE,
  L12RuntimeViolationCode.L12R_REPLAY_ERASED_INVALIDATION,
  L12RuntimeViolationCode.L12R_REPLAY_ERASED_TRIGGER,
  L12RuntimeViolationCode.L12R_REPAIR_REMOVED_TRIGGER,
  L12RuntimeViolationCode.L12R_REPAIR_REMOVED_INVALIDATION,
  L12RuntimeViolationCode.L12R_REPAIR_UPGRADED_CONFIDENCE_NO_NEW_EVIDENCE,
  L12RuntimeViolationCode.L12R_DAG_NODE_MISSING,
  L12RuntimeViolationCode.L12R_DAG_NODE_DUPLICATE,
  L12RuntimeViolationCode.L12R_DAG_EDGE_ILLEGAL,
  L12RuntimeViolationCode.L12R_DAG_EDGE_BACKWARD,
]);

const WARNING_CODES: ReadonlySet<L12RuntimeViolationCode> = new Set([
  L12RuntimeViolationCode.L12R_DAG_NODE_CLASS_STAGE_MISMATCH,
]);

export function severityForL12RuntimeViolationCode(
  code: L12RuntimeViolationCode,
): L12RuntimeAuditSeverity {
  if (CRITICAL_CODES.has(code)) return 'CRITICAL';
  if (WARNING_CODES.has(code)) return 'WARNING';
  return 'ERROR';
}

export interface L12RuntimeAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L12RuntimeAuditSubjectClass;
  readonly violation_code: L12RuntimeViolationCode;
  readonly severity: L12RuntimeAuditSeverity;
  readonly subject_ref?: string;
  readonly stage_ref?: number | string;
  readonly detail: string;
  readonly emitted_at: string;
  readonly source: string;
}

const AUDIT_LOG: L12RuntimeAuditRecord[] = [];
let SEQ = 0;

function nextAuditId(): string {
  SEQ += 1;
  return `l12.runtime_audit.${String(SEQ).padStart(8, '0')}`;
}

export function makeL12RuntimeAuditRecord(
  subjectClass: L12RuntimeAuditSubjectClass,
  source: string,
  issue: L12RuntimeViolationIssue,
): L12RuntimeAuditRecord {
  const rec: L12RuntimeAuditRecord = {
    audit_id: nextAuditId(),
    subject_class: subjectClass,
    violation_code: issue.code,
    severity: severityForL12RuntimeViolationCode(issue.code),
    subject_ref: issue.subject_ref,
    stage_ref: issue.stage_ref,
    detail: issue.message,
    emitted_at: new Date().toISOString(),
    source,
  };
  AUDIT_LOG.push(rec);
  return rec;
}

export function emitL12RuntimeAuditRecords(
  subjectClass: L12RuntimeAuditSubjectClass,
  source: string,
  issues: readonly L12RuntimeViolationIssue[],
): readonly L12RuntimeAuditRecord[] {
  return issues.map(i => makeL12RuntimeAuditRecord(subjectClass, source, i));
}

export function getL12RuntimeAuditLog(): readonly L12RuntimeAuditRecord[] {
  return [...AUDIT_LOG];
}

export function resetL12RuntimeAuditLog(): void {
  AUDIT_LOG.length = 0;
  SEQ = 0;
}

export function getL12RuntimeViolationCount(): number {
  return AUDIT_LOG.length;
}

export function hasAnyL12RuntimeViolations(): boolean {
  return AUDIT_LOG.length > 0;
}

export function getL12RuntimeCriticalViolations(): readonly L12RuntimeAuditRecord[] {
  return AUDIT_LOG.filter(r => r.severity === 'CRITICAL');
}

export function getL12RuntimeViolationsBySubjectClass(
  cls: L12RuntimeAuditSubjectClass,
): readonly L12RuntimeAuditRecord[] {
  return AUDIT_LOG.filter(r => r.subject_class === cls);
}

export function getL12RuntimeViolationsByCode(
  code: L12RuntimeViolationCode,
): readonly L12RuntimeAuditRecord[] {
  return AUDIT_LOG.filter(r => r.violation_code === code);
}
