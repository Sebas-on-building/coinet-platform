/**
 * L11.2 — Score Doctrine Audit Surface
 *
 * §11.2.16 / §11.2.20 — Emits durable audit records for every score
 * doctrine violation. Disjoint from the L11.1 constitutional audit
 * log so doctrine and constitutional audits can be reasoned about
 * independently.
 */

import {
  L11ScoreDoctrineIssue,
  L11ScoreDoctrineSeverity,
  L11ScoreDoctrineViolationCode,
} from '../validation/l11-score-doctrine-violation-codes';

export interface L11ScoreDoctrineAuditRecord {
  readonly audit_id: string;
  readonly emitted_at: string;
  readonly violation_code: L11ScoreDoctrineViolationCode;
  readonly severity: L11ScoreDoctrineSeverity;
  readonly explanation: string;
  readonly subject_ref?: string;
  readonly score_family?: string;
  readonly meaning_claim_id?: string;
  readonly band_policy_id?: string;
  readonly source: string;
  readonly context: Record<string, unknown>;
}

const auditLog: L11ScoreDoctrineAuditRecord[] = [];
let auditCounter = 0;

function nextAuditId(): string {
  auditCounter += 1;
  return `l11d.audit.${auditCounter.toString().padStart(8, '0')}`;
}

export function resetL11ScoreDoctrineAuditLog(): void {
  auditLog.length = 0;
  auditCounter = 0;
}

export function getL11ScoreDoctrineAuditLog():
  readonly L11ScoreDoctrineAuditRecord[] {
  return [...auditLog];
}

export function getL11ScoreDoctrineCriticalViolations():
  readonly L11ScoreDoctrineAuditRecord[] {
  return auditLog.filter(r => r.severity === 'CRITICAL');
}

export function getL11ScoreDoctrineViolationsByCode(
  code: L11ScoreDoctrineViolationCode,
): readonly L11ScoreDoctrineAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function hasAnyL11ScoreDoctrineViolations(): boolean {
  return auditLog.length > 0;
}

export function getL11ScoreDoctrineViolationCount(): number {
  return auditLog.length;
}

export interface EmitL11ScoreDoctrineAuditOptions {
  readonly source: string;
  readonly context?: Record<string, unknown>;
}

export function emitL11ScoreDoctrineAuditRecord(
  issue: L11ScoreDoctrineIssue,
  options: EmitL11ScoreDoctrineAuditOptions,
): L11ScoreDoctrineAuditRecord {
  const record: L11ScoreDoctrineAuditRecord = {
    audit_id: nextAuditId(),
    emitted_at: new Date().toISOString(),
    violation_code: issue.code,
    severity: issue.severity,
    explanation: issue.message,
    subject_ref: issue.subject_ref,
    score_family: issue.score_family,
    meaning_claim_id: issue.meaning_claim_id,
    band_policy_id: issue.band_policy_id,
    source: options.source,
    context: options.context ?? {},
  };
  auditLog.push(record);
  return record;
}

export function emitL11ScoreDoctrineAuditBatch(
  issues: readonly L11ScoreDoctrineIssue[],
  options: EmitL11ScoreDoctrineAuditOptions,
): readonly L11ScoreDoctrineAuditRecord[] {
  return issues.map(i => emitL11ScoreDoctrineAuditRecord(i, options));
}

/**
 * §11.2.21 Band E helper — rebuilds two records from the same issue
 * and confirms identical violation_code / severity / explanation.
 * Audit_id and emitted_at are excluded from the determinism check.
 */
export function isL11ScoreDoctrineAuditDeterministic(
  a: L11ScoreDoctrineAuditRecord,
  b: L11ScoreDoctrineAuditRecord,
): boolean {
  return (
    a.violation_code === b.violation_code &&
    a.severity === b.severity &&
    a.explanation === b.explanation &&
    a.subject_ref === b.subject_ref &&
    a.score_family === b.score_family &&
    a.meaning_claim_id === b.meaning_claim_id &&
    a.band_policy_id === b.band_policy_id &&
    a.source === b.source
  );
}
