/**
 * L11.3 — Formula Audit Surface (§11.3.21)
 *
 * Deterministic audit emitter for L11.3 formula law violations.
 * Distinct from L11.1 constitutional audit and L11.2 doctrine audit
 * so that operators can reason about formula failures independently.
 *
 * Audit subjects (§11.3.21):
 *   - formula definition
 *   - component definition
 *   - weight profile
 *   - cap rule
 *   - penalty rule
 *   - modifier rule
 *   - missing-data rule
 *   - evaluation result
 *   - registry
 *   - invariant
 */

import {
  L11ScoreFormulaIssue,
  L11ScoreFormulaSeverity,
  L11ScoreFormulaViolationCode,
  severityForL11FormulaCode,
} from '../validation/l11-score-formula-violation-codes';

export enum L11FormulaAuditSubjectClass {
  FORMULA_DEFINITION = 'FORMULA_DEFINITION',
  COMPONENT_DEFINITION = 'COMPONENT_DEFINITION',
  WEIGHT_PROFILE = 'WEIGHT_PROFILE',
  CAP_RULE = 'CAP_RULE',
  PENALTY_RULE = 'PENALTY_RULE',
  MODIFIER_RULE = 'MODIFIER_RULE',
  MISSING_DATA_RULE = 'MISSING_DATA_RULE',
  EVALUATION_RESULT = 'EVALUATION_RESULT',
  REGISTRY = 'REGISTRY',
  INVARIANT = 'INVARIANT',
}

export const ALL_L11_FORMULA_AUDIT_SUBJECT_CLASSES:
  readonly L11FormulaAuditSubjectClass[] =
  Object.values(L11FormulaAuditSubjectClass);

export interface L11FormulaAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L11FormulaAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L11ScoreFormulaViolationCode;
  readonly severity: L11ScoreFormulaSeverity;
  readonly explanation: string;
  readonly emitted_at: string;
  readonly score_family?: string;
  readonly formula_id?: string;
  readonly component_id?: string;
}

export function makeL11FormulaAuditRecord(
  subject_class: L11FormulaAuditSubjectClass,
  subject_ref: string,
  issue: L11ScoreFormulaIssue,
  emitted_at: string,
): L11FormulaAuditRecord {
  return {
    audit_id: deterministicAuditId(subject_class, subject_ref, issue.code, emitted_at),
    subject_class,
    subject_ref,
    violation_code: issue.code,
    severity: issue.severity ?? severityForL11FormulaCode(issue.code),
    explanation: issue.message,
    emitted_at,
    score_family: issue.score_family,
    formula_id: issue.formula_id,
    component_id: issue.component_id,
  };
}

export function emitL11FormulaAuditRecords(
  subject_class: L11FormulaAuditSubjectClass,
  subject_ref: string,
  issues: readonly L11ScoreFormulaIssue[],
  emitted_at: string,
): readonly L11FormulaAuditRecord[] {
  return issues.map(i => makeL11FormulaAuditRecord(subject_class, subject_ref, i, emitted_at));
}

/**
 * Convenience: audit a batch of issues with the same subject_class
 * but different subject_refs encoded inside the issue (formula_id /
 * component_id). Falls back to provided default subject_ref when the
 * issue has no specific ref.
 */
export function emitL11FormulaAuditBatch(
  subject_class: L11FormulaAuditSubjectClass,
  default_subject_ref: string,
  issues: readonly L11ScoreFormulaIssue[],
  emitted_at: string,
): readonly L11FormulaAuditRecord[] {
  return issues.map(i => {
    const ref = subject_class === L11FormulaAuditSubjectClass.COMPONENT_DEFINITION
      ? (i.component_id ?? i.formula_id ?? default_subject_ref)
      : (i.formula_id ?? default_subject_ref);
    return makeL11FormulaAuditRecord(subject_class, ref, i, emitted_at);
  });
}

function deterministicAuditId(
  subject_class: L11FormulaAuditSubjectClass,
  subject_ref: string,
  code: L11ScoreFormulaViolationCode,
  emitted_at: string,
): string {
  const seed = `${subject_class}::${subject_ref}::${code}::${emitted_at}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `l11f.audit.${h.toString(16).padStart(8, '0')}`;
}
