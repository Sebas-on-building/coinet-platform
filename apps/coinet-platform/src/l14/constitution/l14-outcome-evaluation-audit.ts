/**
 * L14.5 — Outcome Evaluation Audit Surface
 *
 * §14.5.64 / §14.5.65 — Deterministic audit log for L14O findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14OutcomeViolationCode } from '../validation/l14-outcome-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.outcome.v1';

export enum L14OutcomeAuditSubjectClass {
  EVALUATION_REQUEST = 'EVALUATION_REQUEST',
  EVALUATION_HORIZON = 'EVALUATION_HORIZON',
  EXPECTED_EFFECT_PROFILE = 'EXPECTED_EFFECT_PROFILE',
  REALIZED_OUTCOME_PROFILE = 'REALIZED_OUTCOME_PROFILE',
  SCORE_OUTCOME = 'SCORE_OUTCOME',
  CONFIDENCE_ACCURACY = 'CONFIDENCE_ACCURACY',
  HYPOTHESIS_OUTCOME = 'HYPOTHESIS_OUTCOME',
  SCENARIO_OUTCOME = 'SCENARIO_OUTCOME',
  TRIGGER_OUTCOME = 'TRIGGER_OUTCOME',
  INVALIDATION_OUTCOME = 'INVALIDATION_OUTCOME',
  ALERT_OUTCOME = 'ALERT_OUTCOME',
  EXPLANATION_OUTCOME = 'EXPLANATION_OUTCOME',
  FALSE_CLASSIFICATION = 'FALSE_CLASSIFICATION',
  ALERT_EFFECTIVENESS = 'ALERT_EFFECTIVENESS',
  REGIME_CONTEXT = 'REGIME_CONTEXT',
  EVALUATION_RECORD = 'EVALUATION_RECORD',
  INVARIANT = 'INVARIANT',
}

export interface L14OutcomeAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14OutcomeAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14OutcomeViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14OutcomeViolationCode;

const CRITICAL = new Set<L14OutcomeViolationCode>([
  C.L14O_UNREGISTERED_ARTIFACT_CLASS,
  C.L14O_HORIZON_NOT_ELAPSED_BUT_FINALIZED,
  C.L14O_HORIZON_SOURCE_ILLEGAL,
  C.L14O_REALIZED_FACTS_INCOMPLETE_BUT_MARKED_ALIGNED,
  C.L14O_EXPECTED_EFFECT_CLASS_ILLEGAL_FOR_ARTIFACT,
  C.L14O_SCORE_EVALUATED_WITHOUT_L11_TARGET,
  C.L14O_HYPOTHESIS_EVALUATED_BY_PRICE_ONLY,
  C.L14O_SCENARIO_EVALUATED_AS_BINARY_PREDICTION,
  C.L14O_TRIGGER_EVALUATED_WITHOUT_DOWNSTREAM_EFFECT,
  C.L14O_INVALIDATION_EVALUATED_BY_PRICE_DIP_ONLY,
  C.L14O_ALERT_EVALUATED_BY_OPEN_RATE,
  C.L14O_EXPLANATION_EVALUATED_AS_STYLE_SCORE,
  C.L14O_ALIGNMENT_FALSE_GREEN,
  C.L14O_MISALIGNMENT_HIDDEN,
  C.L14O_INCONCLUSIVE_FORCED_TO_ALIGNED,
  C.L14O_NOT_YET_EVALUABLE_FORCED_TO_VERDICT,
  C.L14O_FALSE_POSITIVE_DECLARED_FROM_IMMEDIATE_PRICE_MOVE,
  C.L14O_FALSE_NEGATIVE_WITHOUT_ELIGIBLE_OMISSION_BASIS,
  C.L14O_OVERCONFIDENCE_HIDDEN,
  C.L14O_REGIME_SHIFT_IGNORED,
  C.L14O_ALERT_EFFECTIVENESS_COLLAPSES_BEHAVIOR_INTO_TRUTH,
]);

const ERROR_CODES = new Set<L14OutcomeViolationCode>([
  C.L14O_EVALUATION_REQUEST_MISSING,
  C.L14O_EVALUATED_ARTIFACT_REF_MISSING,
  C.L14O_HORIZON_MISSING,
  C.L14O_REALIZED_OUTCOME_REF_MISSING,
  C.L14O_CALIBRATION_TARGET_REQUIRED_BUT_MISSING,
  C.L14O_EXPECTED_EFFECT_PROFILE_MISSING,
  C.L14O_CONFIDENCE_ACCURACY_MISSING_WHEN_REQUIRED,
  C.L14O_REGIME_CONTEXT_MISSING_WHEN_REQUIRED,
  C.L14O_LINEAGE_MISSING,
  C.L14O_REPLAY_HASH_MISSING,
]);

export function severityForL14OutcomeCode(
  code: L14OutcomeViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14OutcomeBlockingCode(
  code: L14OutcomeViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14OutcomeAuditRecord[] = [];

export function resetL14OutcomeAuditLog(): void {
  auditLog.length = 0;
}

export interface L14OutcomeAuditEmissionInput {
  readonly subjectClass: L14OutcomeAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14OutcomeViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14OutcomeViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14OutcomeCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14OutcomeAuditRecord(
  input: L14OutcomeAuditEmissionInput,
): L14OutcomeAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.outcome.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14OutcomeBlockingCode(c));
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      sortedCodes.join(','),
      input.message,
      severity,
      String(blocking),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L14OutcomeAuditRecord = {
    audit_id: `l14o.audit.${replayHash}`,
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

export function getL14OutcomeAuditLog(): readonly L14OutcomeAuditRecord[] {
  return [...auditLog];
}

export function getL14OutcomeCriticalViolations(): readonly L14OutcomeAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
