/**
 * L13.9 — Safety Audit Surface
 *
 * §13.9.28 — Deterministic audit log for safety-law violations.
 * Mirrors the L13.6 / L13.7 / L13.8 audit pattern.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13SafetyViolationCode } from '../validation/l13-safety-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.safety.v1';

export enum L13SafetyAuditSubjectClass {
  SAFETY_POLICY = 'SAFETY_POLICY',
  SAFETY_SCAN = 'SAFETY_SCAN',
  NON_RECOMMENDATION_ASSESSMENT = 'NON_RECOMMENDATION_ASSESSMENT',
  ADVICE_ADJACENT_REWRITE = 'ADVICE_ADJACENT_REWRITE',
  OUTPUT_SAFETY_CLASSIFICATION = 'OUTPUT_SAFETY_CLASSIFICATION',
  FINAL_SAFETY_GATE = 'FINAL_SAFETY_GATE',
  MARKET_MANIPULATION_DETECTOR = 'MARKET_MANIPULATION_DETECTOR',
  TAX_LEGAL_ADVICE_DETECTOR = 'TAX_LEGAL_ADVICE_DETECTOR',
  GUARANTEE_CERTAINTY_DETECTOR = 'GUARANTEE_CERTAINTY_DETECTOR',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_SAFETY_AUDIT_SUBJECT_CLASSES:
  readonly L13SafetyAuditSubjectClass[] =
  Object.values(L13SafetyAuditSubjectClass);

export interface L13SafetyAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13SafetyAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13SafetyViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly output_id?: string;
  readonly risk_class?: string;
  readonly safety_action?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const CRITICAL = new Set<L13SafetyViolationCode>([
  L13SafetyViolationCode.L13Y_SAFETY_POLICY_MISSING,
  L13SafetyViolationCode.L13Y_SAFETY_SCAN_MISSING,
  L13SafetyViolationCode.L13Y_SAFETY_CLASSIFICATION_MISSING,
  L13SafetyViolationCode.L13Y_FINAL_SAFETY_GATE_MISSING,
  L13SafetyViolationCode.L13Y_BUY_SELL_INSTRUCTION_EMITTED,
  L13SafetyViolationCode.L13Y_HOLD_AVOID_INSTRUCTION_EMITTED,
  L13SafetyViolationCode.L13Y_LONG_SHORT_INSTRUCTION_EMITTED,
  L13SafetyViolationCode.L13Y_ENTRY_EXIT_INSTRUCTION_EMITTED,
  L13SafetyViolationCode.L13Y_LEVERAGE_RECOMMENDATION_EMITTED,
  L13SafetyViolationCode.L13Y_POSITION_SIZING_INSTRUCTION_EMITTED,
  L13SafetyViolationCode.L13Y_STOP_LOSS_TAKE_PROFIT_INSTRUCTION_EMITTED,
  L13SafetyViolationCode.L13Y_LIQUIDATION_TARGET_ADVICE_EMITTED,
  L13SafetyViolationCode.L13Y_MARKET_MANIPULATION_ASSISTANCE_EMITTED,
  L13SafetyViolationCode.L13Y_BLOCK_REQUIRED_BUT_OUTPUT_CONTINUED,
  L13SafetyViolationCode.L13Y_REWRITE_REQUIRED_BUT_EMITTED,
  L13SafetyViolationCode.L13Y_SAFETY_TRIED_TO_OVERRIDE_GROUNDING,
  L13SafetyViolationCode.L13Y_GROUNDING_TRIED_TO_OVERRIDE_SAFETY,
  L13SafetyViolationCode.L13Y_SAFETY_GATE_NOT_CONSUMED_BY_FINAL_GATE,
  L13SafetyViolationCode.L13Y_SAFETY_REPLAY_HASH_MISSING,
]);

const ERROR_CODES = new Set<L13SafetyViolationCode>([
  L13SafetyViolationCode.L13Y_ADVICE_ADJACENT_OUTPUT_NOT_REWRITTEN,
  L13SafetyViolationCode.L13Y_TAX_LEGAL_ADVICE_EMITTED,
  L13SafetyViolationCode.L13Y_GUARANTEED_OUTCOME_EMITTED,
  L13SafetyViolationCode.L13Y_PUMP_DUMP_PROPHECY_EMITTED,
  L13SafetyViolationCode.L13Y_UNSUPPORTED_CERTAINTY_EMITTED,
  L13SafetyViolationCode.L13Y_REFUSAL_REQUIRED_BUT_NOT_EMITTED,
  L13SafetyViolationCode.L13Y_SAFETY_LINEAGE_MISSING,
]);

export function severityForL13SafetyCode(
  code: L13SafetyViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13SafetyBlockingCode(
  code: L13SafetyViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L13SafetyAuditRecord[] = [];

export function resetL13SafetyAuditLog(): void {
  auditLog.length = 0;
}

export interface L13SafetyAuditEmissionInput {
  readonly subjectClass: L13SafetyAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13SafetyViolationCode;
  readonly message: string;
  readonly outputId?: string;
  readonly riskClass?: string;
  readonly safetyAction?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13SafetyAuditRecord(
  input: L13SafetyAuditEmissionInput,
): L13SafetyAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.outputId ?? '',
      input.riskClass ?? '',
      input.safetyAction ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13SafetyAuditRecord = {
    audit_id: `l13y.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13SafetyCode(input.violationCode),
    message: input.message,
    blocking: isL13SafetyBlockingCode(input.violationCode),
    output_id: input.outputId,
    risk_class: input.riskClass,
    safety_action: input.safetyAction,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13SafetyAuditLog():
  readonly L13SafetyAuditRecord[] {
  return [...auditLog];
}

export function getL13SafetyCriticalViolations():
  readonly L13SafetyAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13SafetyBlockingViolations():
  readonly L13SafetyAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13SafetyViolationsByCode(
  code: L13SafetyViolationCode,
): readonly L13SafetyAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13SafetyViolationsByOutputId(
  outputId: string,
): readonly L13SafetyAuditRecord[] {
  return auditLog.filter(r => r.output_id === outputId);
}

export function getL13SafetyViolationsByRiskClass(
  riskClass: string,
): readonly L13SafetyAuditRecord[] {
  return auditLog.filter(r => r.risk_class === riskClass);
}

export function getL13SafetyViolationsBySafetyAction(
  action: string,
): readonly L13SafetyAuditRecord[] {
  return auditLog.filter(r => r.safety_action === action);
}
