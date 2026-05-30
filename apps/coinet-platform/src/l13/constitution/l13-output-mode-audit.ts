/**
 * L13.7 — Output Mode Audit Surface
 *
 * §13.7.25 — Deterministic audit log for product-mode law
 * violations. Mirrors the L13.6 runtime audit pattern.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from '../validation/l13-mode-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.outputs.v1';

export enum L13OutputModeAuditSubjectClass {
  ANSWER_MODE_DEFINITION = 'ANSWER_MODE_DEFINITION',
  OUTPUT_MODE_ENVELOPE = 'OUTPUT_MODE_ENVELOPE',
  CHAT_ANSWER = 'CHAT_ANSWER',
  ALERT_OUTPUT = 'ALERT_OUTPUT',
  STRUCTURED_REPORT = 'STRUCTURED_REPORT',
  ASSET_COMPARISON = 'ASSET_COMPARISON',
  THESIS_COMPARISON = 'THESIS_COMPARISON',
  SCENARIO_EXPLANATION = 'SCENARIO_EXPLANATION',
  SCORE_EXPLANATION = 'SCORE_EXPLANATION',
  CONTRADICTION_EXPLANATION = 'CONTRADICTION_EXPLANATION',
  DEBUG_EXPLANATION = 'DEBUG_EXPLANATION',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_OUTPUT_MODE_AUDIT_SUBJECT_CLASSES:
  readonly L13OutputModeAuditSubjectClass[] =
  Object.values(L13OutputModeAuditSubjectClass);

export interface L13OutputModeAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13OutputModeAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13ModeViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly mode_envelope_ref?: string;
  readonly output_id?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const CRITICAL = new Set<L13ModeViolationCode>([
  L13ModeViolationCode.L13M_ANSWER_MODE_UNREGISTERED,
  L13ModeViolationCode.L13M_ANSWER_MODE_STATUS_ILLEGAL,
  L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
  L13ModeViolationCode.L13M_MODE_ENVELOPE_MISSING,
  L13ModeViolationCode.L13M_CHAT_DIRECT_ANSWER_MISSING,
  L13ModeViolationCode.L13M_CHAT_IGNORES_USER_INTENT,
  L13ModeViolationCode.L13M_CHAT_RAW_METRIC_DUMP_UNREQUESTED,
  L13ModeViolationCode.L13M_WHAT_NEXT_WITHOUT_SCENARIO,
  L13ModeViolationCode.L13M_WHAT_NEXT_WITHOUT_TRIGGER,
  L13ModeViolationCode.L13M_WHAT_NEXT_WITHOUT_INVALIDATION,
  L13ModeViolationCode.L13M_ALERT_CHANGE_SUBJECT_MISSING,
  L13ModeViolationCode.L13M_ALERT_WHY_IT_MATTERS_MISSING,
  L13ModeViolationCode.L13M_ALERT_TRIGGER_OR_INVALIDATION_OMITTED,
  L13ModeViolationCode.L13M_ALERT_CONFIDENCE_SHIFT_HIDDEN,
  L13ModeViolationCode.L13M_REPORT_EXECUTIVE_SUMMARY_MISSING,
  L13ModeViolationCode.L13M_REPORT_CONTRADICTION_SECTION_MISSING,
  L13ModeViolationCode.L13M_REPORT_UNCERTAINTY_SECTION_MISSING,
  L13ModeViolationCode.L13M_REPORT_TRIGGER_SECTION_MISSING,
  L13ModeViolationCode.L13M_REPORT_INVALIDATION_SECTION_MISSING,
  L13ModeViolationCode.L13M_REPORT_RESTRICTION_SECTION_MISSING,
  L13ModeViolationCode.L13M_REPORT_APPENDIX_OR_EVIDENCE_MISSING,
  L13ModeViolationCode.L13M_ASSET_COMPARISON_RECOMMENDATION_LEAK,
  L13ModeViolationCode.L13M_ASSET_COMPARISON_PARITY_MISSING,
  L13ModeViolationCode.L13M_ASSET_COMPARISON_MISSING_DATA_ASYMMETRY_HIDDEN,
  L13ModeViolationCode.L13M_ASSET_COMPARISON_DRIFT_ASYMMETRY_HIDDEN,
  L13ModeViolationCode.L13M_ASSET_COMPARISON_RESTRICTION_ASYMMETRY_HIDDEN,
  L13ModeViolationCode.L13M_ASSET_COMPARISON_DIMENSION_INCOMPLETE,
  L13ModeViolationCode.L13M_THESIS_COMPARISON_FINALITY_LEAK,
  L13ModeViolationCode.L13M_THESIS_COMPARISON_MISSING_CONTRADICTION,
  L13ModeViolationCode.L13M_SCENARIO_EXPLANATION_WITHOUT_CONDITIONALITY,
  L13ModeViolationCode.L13M_SCENARIO_EXPLANATION_TRIGGER_MISSING,
  L13ModeViolationCode.L13M_SCENARIO_EXPLANATION_INVALIDATION_MISSING,
  L13ModeViolationCode.L13M_SCORE_EXPLANATION_WITHOUT_ATTRIBUTION,
  L13ModeViolationCode.L13M_SCORE_EXPLANATION_RECOMMENDATION_LEAK,
  L13ModeViolationCode.L13M_CONTRADICTION_EXPLANATION_WITHOUT_L7_REF,
  L13ModeViolationCode.L13M_CONTRADICTION_EXPLANATION_WITHOUT_AFFECTED_CONTEXT,
  L13ModeViolationCode.L13M_CONTRADICTION_EXPLANATION_MINIMIZED,
  L13ModeViolationCode.L13M_DEBUG_MODE_USER_EMITTED,
  L13ModeViolationCode.L13M_MODE_READINESS_ILLEGAL,
  L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
  L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
  L13ModeViolationCode.L13M_MODE_FORBIDDEN_OMISSION,
  L13ModeViolationCode.L13M_MODE_REQUIRED_DISCLOSURE_MISSING,
  L13ModeViolationCode.L13M_MODE_REQUIRED_SECTION_MISSING,
  L13ModeViolationCode.L13M_MODE_REQUIRED_CONTEXT_MISSING,
]);

export function severityForL13ModeCode(
  code: L13ModeViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  return L13ViolationSeverity.WARNING;
}

export function isL13ModeBlockingCode(
  code: L13ModeViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L13OutputModeAuditRecord[] = [];

export function resetL13OutputModeAuditLog(): void {
  auditLog.length = 0;
}

export interface L13OutputModeAuditEmissionInput {
  readonly subjectClass: L13OutputModeAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13ModeViolationCode;
  readonly message: string;
  readonly modeEnvelopeRef?: string;
  readonly outputId?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13OutputModeAuditRecord(
  input: L13OutputModeAuditEmissionInput,
): L13OutputModeAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.modeEnvelopeRef ?? '',
      input.outputId ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13OutputModeAuditRecord = {
    audit_id: `l13m.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13ModeCode(input.violationCode),
    message: input.message,
    blocking: isL13ModeBlockingCode(input.violationCode),
    mode_envelope_ref: input.modeEnvelopeRef,
    output_id: input.outputId,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13OutputModeAuditLog():
  readonly L13OutputModeAuditRecord[] {
  return [...auditLog];
}

export function getL13OutputModeCriticalViolations():
  readonly L13OutputModeAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13OutputModeBlockingViolations():
  readonly L13OutputModeAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13OutputModeViolationsByCode(
  code: L13ModeViolationCode,
): readonly L13OutputModeAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13OutputModeViolationsBySubject(
  cls: L13OutputModeAuditSubjectClass,
): readonly L13OutputModeAuditRecord[] {
  return auditLog.filter(r => r.subject_class === cls);
}

export function getL13OutputModeViolationsByOutputId(
  outputId: string,
): readonly L13OutputModeAuditRecord[] {
  return auditLog.filter(r => r.output_id === outputId);
}
