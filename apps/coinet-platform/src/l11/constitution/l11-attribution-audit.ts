/**
 * L11.4 — Attribution Audit Surface (§11.4.17)
 *
 * Deterministic audit emitter for L11.4 attribution-law violations.
 * Distinct from L11.1 / L11.2 / L11.3 audits so attribution failures
 * can be reasoned about independently.
 *
 * Audit subjects (§11.4.17):
 *   - attribution object
 *   - component contribution
 *   - cap contribution
 *   - penalty contribution
 *   - modifier contribution
 *   - missing-data contribution
 *   - top-driver selection
 *   - summary code
 *   - completeness class
 *   - replay identity
 *   - invariant
 */

import {
  L11ScoreAttributionIssue,
  L11ScoreAttributionSeverity,
  L11ScoreAttributionViolationCode,
  severityForL11AttributionCode,
} from '../validation/l11-score-attribution-violation-codes';

export enum L11AttributionAuditSubjectClass {
  ATTRIBUTION_OBJECT = 'ATTRIBUTION_OBJECT',
  COMPONENT_CONTRIBUTION = 'COMPONENT_CONTRIBUTION',
  CAP_CONTRIBUTION = 'CAP_CONTRIBUTION',
  PENALTY_CONTRIBUTION = 'PENALTY_CONTRIBUTION',
  MODIFIER_CONTRIBUTION = 'MODIFIER_CONTRIBUTION',
  MISSING_DATA_CONTRIBUTION = 'MISSING_DATA_CONTRIBUTION',
  TOP_DRIVER_SELECTION = 'TOP_DRIVER_SELECTION',
  SUMMARY_CODE = 'SUMMARY_CODE',
  COMPLETENESS_CLASS = 'COMPLETENESS_CLASS',
  REPLAY_IDENTITY = 'REPLAY_IDENTITY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L11_ATTRIBUTION_AUDIT_SUBJECT_CLASSES:
  readonly L11AttributionAuditSubjectClass[] =
  Object.values(L11AttributionAuditSubjectClass);

export interface L11AttributionAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L11AttributionAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L11ScoreAttributionViolationCode;
  readonly severity: L11ScoreAttributionSeverity;
  readonly explanation: string;
  readonly emitted_at: string;
  readonly score_id?: string;
  readonly score_family?: string;
  readonly attribution_id?: string;
  readonly contribution_id?: string;
}

export function makeL11AttributionAuditRecord(
  subject_class: L11AttributionAuditSubjectClass,
  subject_ref: string,
  issue: L11ScoreAttributionIssue,
  emitted_at: string,
): L11AttributionAuditRecord {
  return {
    audit_id: deterministicAuditId(subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: issue.severity ?? severityForL11AttributionCode(issue.code),
    explanation: issue.message,
    emitted_at,
    score_id: issue.score_id,
    score_family: issue.score_family,
    attribution_id: issue.attribution_id,
    contribution_id: issue.contribution_id,
  };
}

export function emitL11AttributionAuditRecords(
  subject_class: L11AttributionAuditSubjectClass,
  subject_ref: string,
  issues: readonly L11ScoreAttributionIssue[],
  emitted_at: string,
): readonly L11AttributionAuditRecord[] {
  return issues.map(i => makeL11AttributionAuditRecord(subject_class, subject_ref, i, emitted_at));
}

/**
 * Convenience: audit a batch of issues, deriving the most specific
 * subject_ref available on each issue (contribution_id ->
 * attribution_id -> default).
 */
export function emitL11AttributionAuditBatch(
  subject_class: L11AttributionAuditSubjectClass,
  default_subject_ref: string,
  issues: readonly L11ScoreAttributionIssue[],
  emitted_at: string,
): readonly L11AttributionAuditRecord[] {
  return issues.map(i => {
    const ref =
      i.contribution_id ??
      i.attribution_id ??
      i.score_id ??
      default_subject_ref;
    return makeL11AttributionAuditRecord(subject_class, ref, i, emitted_at);
  });
}

function deterministicAuditId(
  subject_class: L11AttributionAuditSubjectClass,
  subject_ref: string,
  code: L11ScoreAttributionViolationCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l11a.audit.${h.toString(16).padStart(8, '0')}`;
}
