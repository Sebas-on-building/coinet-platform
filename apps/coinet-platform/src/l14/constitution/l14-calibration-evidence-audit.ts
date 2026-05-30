/**
 * L14.6 — Calibration Evidence Audit Surface
 *
 * §14.6.68 / §14.6.69 — Deterministic audit log for L14E findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14CalibrationEvidenceViolationCode } from '../validation/l14-calibration-evidence-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.evidence.v1';

export enum L14CalibrationEvidenceAuditSubjectClass {
  EVIDENCE_REQUEST = 'EVIDENCE_REQUEST',
  EVIDENCE_CLASS_POLICY = 'EVIDENCE_CLASS_POLICY',
  EVIDENCE_WINDOW = 'EVIDENCE_WINDOW',
  COHORT_DEFINITION = 'COHORT_DEFINITION',
  AGGREGATE_COMPUTATION = 'AGGREGATE_COMPUTATION',
  CALIBRATION_FINDING = 'CALIBRATION_FINDING',
  PERFORMANCE_ATTRIBUTION = 'PERFORMANCE_ATTRIBUTION',
  ALERT_USEFULNESS_PROFILE = 'ALERT_USEFULNESS_PROFILE',
  EVIDENCE_CONFIDENCE = 'EVIDENCE_CONFIDENCE',
  REVIEW_PRIORITY = 'REVIEW_PRIORITY',
  PROPOSAL_ELIGIBILITY = 'PROPOSAL_ELIGIBILITY',
  CALIBRATION_EVIDENCE_RECORD = 'CALIBRATION_EVIDENCE_RECORD',
  INVARIANT = 'INVARIANT',
}

export interface L14CalibrationEvidenceAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14CalibrationEvidenceAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14CalibrationEvidenceViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14CalibrationEvidenceViolationCode;

const CRITICAL = new Set<L14CalibrationEvidenceViolationCode>([
  C.L14E_SAMPLE_INSUFFICIENT_BUT_PROMOTED,
  C.L14E_SAMPLE_SUFFICIENCY_CLASS_FALSE_GREEN,
  C.L14E_COUNTEREVIDENCE_HIDDEN,
  C.L14E_BEHAVIOR_USED_FOR_OUTCOME_ONLY_CLASS,
  C.L14E_FEEDBACK_TREATED_AS_CORRECTNESS,
  C.L14E_ENGAGEMENT_COLLAPSED_INTO_TRUTH,
  C.L14E_THRESHOLD_NOISE_WITHOUT_OUTCOME_WEAKNESS,
  C.L14E_HYPOTHESIS_FAILURE_PATTERN_WITHOUT_INVALIDATION_EVIDENCE,
  C.L14E_SCENARIO_CONFIDENCE_REVIEW_WITHOUT_MISALIGNMENT,
  C.L14E_ALERT_USEFULNESS_DECLARED_FROM_OPEN_RATE_ONLY,
  C.L14E_FEATURE_IMPORTANCE_STATED_CAUSALLY,
  C.L14E_REVIEW_PRIORITY_UNSUPPORTED,
  C.L14E_PROPOSAL_ELIGIBILITY_OVERSTATED,
  C.L14E_PROPOSAL_ELIGIBILITY_GRANTED_DESPITE_COUNTEREVIDENCE,
  C.L14E_MUTATION_ALLOWED_IN_L14_6,
  C.L14E_WINDOW_INCOMPATIBLE_HORIZONS_MERGED,
  C.L14E_REGIME_COMPARISON_REQUIRED_BUT_MISSING,
  C.L14E_CONFIDENCE_CLASS_FALSE_GREEN,
]);

const ERROR_CODES = new Set<L14CalibrationEvidenceViolationCode>([
  C.L14E_REQUEST_MISSING,
  C.L14E_EVIDENCE_CLASS_MISSING,
  C.L14E_SUBJECT_REF_MISSING,
  C.L14E_EVIDENCE_WINDOW_MISSING,
  C.L14E_SAMPLE_SIZE_MISSING,
  C.L14E_STRUCTURED_FINDINGS_MISSING,
  C.L14E_AGGREGATE_COMPUTATION_MISSING,
  C.L14E_AFFECTED_TARGETS_MISSING,
  C.L14E_COHORT_DEFINITION_MISSING,
  C.L14E_CONFIDENCE_CLASS_MISSING,
  C.L14E_LINEAGE_MISSING,
  C.L14E_REPLAY_HASH_MISSING,
]);

export function severityForL14CalibrationEvidenceCode(
  code: L14CalibrationEvidenceViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14CalibrationEvidenceBlockingCode(
  code: L14CalibrationEvidenceViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14CalibrationEvidenceAuditRecord[] = [];

export function resetL14CalibrationEvidenceAuditLog(): void {
  auditLog.length = 0;
}

export interface L14CalibrationEvidenceAuditEmissionInput {
  readonly subjectClass: L14CalibrationEvidenceAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14CalibrationEvidenceViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14CalibrationEvidenceViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14CalibrationEvidenceCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14CalibrationEvidenceAuditRecord(
  input: L14CalibrationEvidenceAuditEmissionInput,
): L14CalibrationEvidenceAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.evidence.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14CalibrationEvidenceBlockingCode(c));
  const replayHash = fnv1a([
    input.subjectClass, input.subjectRef, sortedCodes.join(','), input.message,
    severity, String(blocking), lineage.join(','), POLICY_V,
  ].join('|'));
  const record: L14CalibrationEvidenceAuditRecord = {
    audit_id: `l14e.audit.${replayHash}`,
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

export function getL14CalibrationEvidenceAuditLog(): readonly L14CalibrationEvidenceAuditRecord[] {
  return [...auditLog];
}

export function getL14CalibrationEvidenceCriticalViolations(): readonly L14CalibrationEvidenceAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
