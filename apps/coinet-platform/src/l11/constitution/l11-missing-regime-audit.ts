/**
 * L11.5 — Missing-Data & Regime Modifier Audit Surface (§11.5.16)
 *
 * Deterministic audit emitter for L11.5 violations. Distinct from
 * L11.1 / L11.2 / L11.3 / L11.4 audits so missing-data and regime
 * failures can be reasoned about independently.
 *
 * Audit subjects (§11.5.16):
 *   - missing-data profile
 *   - missing input ref
 *   - behaviour resolution
 *   - visibility class
 *   - regime modifier
 *   - regime modifier matrix
 *   - missing-regime interaction
 *   - replay identity
 *   - invariant
 */

import {
  L11MissingRegimeIssue,
  L11MissingRegimeSeverity,
  L11MissingRegimeViolationCode,
  severityForL11MissingRegimeCode,
} from '../validation/l11-missing-regime-violation-codes';

export enum L11MissingRegimeAuditSubjectClass {
  MISSING_DATA_PROFILE = 'MISSING_DATA_PROFILE',
  MISSING_INPUT_REF = 'MISSING_INPUT_REF',
  BEHAVIOR_RESOLUTION = 'BEHAVIOR_RESOLUTION',
  VISIBILITY_CLASS = 'VISIBILITY_CLASS',
  REGIME_MODIFIER = 'REGIME_MODIFIER',
  REGIME_MODIFIER_MATRIX = 'REGIME_MODIFIER_MATRIX',
  MISSING_REGIME_INTERACTION = 'MISSING_REGIME_INTERACTION',
  REPLAY_IDENTITY = 'REPLAY_IDENTITY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L11_MISSING_REGIME_AUDIT_SUBJECT_CLASSES:
  readonly L11MissingRegimeAuditSubjectClass[] =
  Object.values(L11MissingRegimeAuditSubjectClass);

export interface L11MissingRegimeAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L11MissingRegimeAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L11MissingRegimeViolationCode;
  readonly severity: L11MissingRegimeSeverity;
  readonly explanation: string;
  readonly emitted_at: string;
  readonly score_id?: string;
  readonly score_family?: string;
  readonly missing_profile_id?: string;
  readonly modifier_id?: string;
  readonly interaction_id?: string;
  readonly input_ref_id?: string;
}

export function makeL11MissingRegimeAuditRecord(
  subject_class: L11MissingRegimeAuditSubjectClass,
  subject_ref: string,
  issue: L11MissingRegimeIssue,
  emitted_at: string,
): L11MissingRegimeAuditRecord {
  return {
    audit_id: deterministicAuditId(subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: issue.severity ?? severityForL11MissingRegimeCode(issue.code),
    explanation: issue.message,
    emitted_at,
    score_id: issue.score_id,
    score_family: issue.score_family,
    missing_profile_id: issue.missing_profile_id,
    modifier_id: issue.modifier_id,
    interaction_id: issue.interaction_id,
    input_ref_id: issue.input_ref_id,
  };
}

export function emitL11MissingRegimeAuditRecords(
  subject_class: L11MissingRegimeAuditSubjectClass,
  subject_ref: string,
  issues: readonly L11MissingRegimeIssue[],
  emitted_at: string,
): readonly L11MissingRegimeAuditRecord[] {
  return issues.map(i => makeL11MissingRegimeAuditRecord(subject_class, subject_ref, i, emitted_at));
}

export function emitL11MissingRegimeAuditBatch(
  subject_class: L11MissingRegimeAuditSubjectClass,
  default_subject_ref: string,
  issues: readonly L11MissingRegimeIssue[],
  emitted_at: string,
): readonly L11MissingRegimeAuditRecord[] {
  return issues.map(i => {
    const ref =
      i.modifier_id ??
      i.interaction_id ??
      i.missing_profile_id ??
      i.input_ref_id ??
      i.score_id ??
      default_subject_ref;
    return makeL11MissingRegimeAuditRecord(subject_class, ref, i, emitted_at);
  });
}

function deterministicAuditId(
  subject_class: L11MissingRegimeAuditSubjectClass,
  subject_ref: string,
  code: L11MissingRegimeViolationCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l11m.audit.${h.toString(16).padStart(8, '0')}`;
}
