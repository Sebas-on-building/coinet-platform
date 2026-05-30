/**
 * L13.8 — Style Audit Surface
 *
 * §13.8.35 — Deterministic audit log for style-law violations.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13StyleViolationCode } from '../validation/l13-style-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.style.v1';

export enum L13StyleAuditSubjectClass {
  STYLE_CONTROL_PLAN = 'STYLE_CONTROL_PLAN',
  VERBOSITY_PROFILE = 'VERBOSITY_PROFILE',
  PERSONA_POLICY = 'PERSONA_POLICY',
  LANGUAGE_PROFILE = 'LANGUAGE_PROFILE',
  MULTILINGUAL_SAFETY_SCAN = 'MULTILINGUAL_SAFETY_SCAN',
  RESPONSE_SHAPER = 'RESPONSE_SHAPER',
  STYLE_SEMANTIC_INTEGRITY = 'STYLE_SEMANTIC_INTEGRITY',
  STYLED_RESPONSE_ENVELOPE = 'STYLED_RESPONSE_ENVELOPE',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_STYLE_AUDIT_SUBJECT_CLASSES:
  readonly L13StyleAuditSubjectClass[] =
  Object.values(L13StyleAuditSubjectClass);

export interface L13StyleAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13StyleAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13StyleViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly output_id?: string;
  readonly language?: string;
  readonly answer_mode?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const CRITICAL = new Set<L13StyleViolationCode>([
  L13StyleViolationCode.L13S_STYLE_REMOVED_UNCERTAINTY,
  L13StyleViolationCode.L13S_STYLE_REMOVED_CONTRADICTION,
  L13StyleViolationCode.L13S_STYLE_REMOVED_TRIGGER,
  L13StyleViolationCode.L13S_STYLE_REMOVED_INVALIDATION,
  L13StyleViolationCode.L13S_STYLE_REMOVED_RESTRICTION,
  L13StyleViolationCode.L13S_STYLE_ADDED_NEW_CLAIM,
  L13StyleViolationCode.L13S_STYLE_STRENGTHENED_CONFIDENCE,
  L13StyleViolationCode.L13S_STYLE_WEAKENED_DISCLOSURE,
  L13StyleViolationCode.L13S_MULTILINGUAL_TRADE_ADVICE_LEAK,
  L13StyleViolationCode.L13S_MULTILINGUAL_CERTAINTY_LEAK,
  L13StyleViolationCode.L13S_MULTILINGUAL_PUMP_DUMP_PROPHECY,
  L13StyleViolationCode.L13S_MULTILINGUAL_SCORE_AS_ACTION,
  L13StyleViolationCode.L13S_MULTILINGUAL_SCENARIO_AS_CERTAINTY,
  L13StyleViolationCode.L13S_STYLE_READINESS_ILLEGAL,
  L13StyleViolationCode.L13S_STYLED_ENVELOPE_MISSING,
  L13StyleViolationCode.L13S_STYLE_CONTROL_PLAN_MISSING,
  L13StyleViolationCode.L13S_VERBOSITY_PROFILE_MISSING,
  L13StyleViolationCode.L13S_PERSONA_PROFILE_MISSING,
  L13StyleViolationCode.L13S_LANGUAGE_PROFILE_MISSING,
  L13StyleViolationCode.L13S_RESOLVED_VERBOSITY_MISSING,
  L13StyleViolationCode.L13S_REPORT_MODE_NOT_REPORT_SHAPED,
  L13StyleViolationCode.L13S_PERSONA_HYPE_DETECTED,
  L13StyleViolationCode.L13S_PERSONA_FINANCIAL_ADVISOR_DETECTED,
  L13StyleViolationCode.L13S_PERSONA_PROPHECY_ENGINE_DETECTED,
  L13StyleViolationCode.L13S_PERSONA_SALES_COPY_DETECTED,
  L13StyleViolationCode.L13S_STYLE_REPLAY_HASH_MISSING,
]);

const ERROR_CODES = new Set<L13StyleViolationCode>([
  L13StyleViolationCode.L13S_VERBOSITY_BELOW_DISCLOSURE_FLOOR,
  L13StyleViolationCode.L13S_DEEP_MODE_NOT_EXPANDED,
  L13StyleViolationCode.L13S_ALERT_TOO_LONG,
  L13StyleViolationCode.L13S_OUTPUT_LANGUAGE_UNSUPPORTED,
  L13StyleViolationCode.L13S_UNAUTHORIZED_CODE_SWITCH,
  L13StyleViolationCode.L13S_LANGUAGE_RESOLUTION_MISSING,
  L13StyleViolationCode.L13S_OUTPUT_LANGUAGE_MISMATCH,
  L13StyleViolationCode.L13S_PERSONA_DISCLAIMER_MACHINE_DETECTED,
  L13StyleViolationCode.L13S_PERSONA_ROBOTIC_DASHBOARD_DETECTED,
  L13StyleViolationCode.L13S_STYLE_LINEAGE_MISSING,
]);

export function severityForL13StyleCode(
  code: L13StyleViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13StyleBlockingCode(
  code: L13StyleViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L13StyleAuditRecord[] = [];

export function resetL13StyleAuditLog(): void {
  auditLog.length = 0;
}

export interface L13StyleAuditEmissionInput {
  readonly subjectClass: L13StyleAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13StyleViolationCode;
  readonly message: string;
  readonly outputId?: string;
  readonly language?: string;
  readonly answerMode?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13StyleAuditRecord(
  input: L13StyleAuditEmissionInput,
): L13StyleAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.outputId ?? '',
      input.language ?? '',
      input.answerMode ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13StyleAuditRecord = {
    audit_id: `l13s.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13StyleCode(input.violationCode),
    message: input.message,
    blocking: isL13StyleBlockingCode(input.violationCode),
    output_id: input.outputId,
    language: input.language,
    answer_mode: input.answerMode,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13StyleAuditLog():
  readonly L13StyleAuditRecord[] {
  return [...auditLog];
}

export function getL13StyleCriticalViolations():
  readonly L13StyleAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13StyleBlockingViolations():
  readonly L13StyleAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13StyleViolationsByCode(
  code: L13StyleViolationCode,
): readonly L13StyleAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13StyleViolationsByOutputId(
  outputId: string,
): readonly L13StyleAuditRecord[] {
  return auditLog.filter(r => r.output_id === outputId);
}

export function getL13StyleViolationsByLanguage(
  language: string,
): readonly L13StyleAuditRecord[] {
  return auditLog.filter(r => r.language === language);
}

export function getL13StyleViolationsByAnswerMode(
  mode: string,
): readonly L13StyleAuditRecord[] {
  return auditLog.filter(r => r.answer_mode === mode);
}
