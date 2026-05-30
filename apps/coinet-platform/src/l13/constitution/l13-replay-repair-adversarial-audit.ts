/**
 * L13.11 — Replay / Repair / Adversarial Audit Surface
 *
 * §13.11.30 — Deterministic audit log for L13RPA findings.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ReplayRepairAdversarialViolationCode } from '../validation/l13-replay-repair-adversarial-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.rpa.v1';

export enum L13ReplayRepairAdversarialAuditSubjectClass {
  REPLAY_RESULT = 'REPLAY_RESULT',
  REPLAY_EQUIVALENCE = 'REPLAY_EQUIVALENCE',
  SEMANTIC_DRIFT_ASSESSMENT = 'SEMANTIC_DRIFT_ASSESSMENT',
  REPAIR_REQUEST = 'REPAIR_REQUEST',
  REPAIR_RESULT = 'REPAIR_RESULT',
  PROMPT_INJECTION_ASSESSMENT = 'PROMPT_INJECTION_ASSESSMENT',
  ADVERSARIAL_CASE_RESULT = 'ADVERSARIAL_CASE_RESULT',
  ADVERSARIAL_SUITE_RESULT = 'ADVERSARIAL_SUITE_RESULT',
  REGRESSION_CHECK_RESULT = 'REGRESSION_CHECK_RESULT',
  INVARIANT = 'INVARIANT',
}

export interface L13ReplayRepairAdversarialAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13ReplayRepairAdversarialAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13ReplayRepairAdversarialViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly source_output_id?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const C = L13ReplayRepairAdversarialViolationCode;

const CRITICAL = new Set<L13ReplayRepairAdversarialViolationCode>([
  C.L13RPA_REPLAY_RESULT_MISSING,
  C.L13RPA_REPLAY_SUBSTRATE_INCOMPLETE,
  C.L13RPA_CAPTURED_REPLAY_WITHOUT_PROVIDER_ARTIFACT,
  C.L13RPA_FRESH_REPLAY_DEMANDED_EXACT_WORDING,
  C.L13RPA_GROUNDING_EQUIVALENCE_FALSE_GREEN,
  C.L13RPA_SAFETY_EQUIVALENCE_FALSE_GREEN,
  C.L13RPA_DISCLOSURE_EQUIVALENCE_FALSE_GREEN,
  C.L13RPA_RESTRICTION_EQUIVALENCE_FALSE_GREEN,
  C.L13RPA_SEMANTIC_DRIFT_HIDDEN,
  C.L13RPA_REPLAY_MISMATCH_REASON_MISSING,
  C.L13RPA_REPAIR_REQUEST_MISSING,
  C.L13RPA_REPAIR_MUTATED_OLD_OUTPUT,
  C.L13RPA_REPAIR_HID_ORIGINAL_VIOLATION,
  C.L13RPA_REPAIR_INVENTED_EVIDENCE,
  C.L13RPA_REPAIR_REMOVED_CONTRADICTION,
  C.L13RPA_REPAIR_UPGRADED_CONFIDENCE_WITHOUT_SUPPORT,
  C.L13RPA_PROMPT_INJECTION_NOT_DETECTED,
  C.L13RPA_BUY_SELL_ADVERSARIAL_NOT_BLOCKED,
  C.L13RPA_CERTAINTY_REQUEST_NOT_BLOCKED,
  C.L13RPA_CONTRADICTION_IGNORE_NOT_REJECTED,
  C.L13RPA_BULLISH_BEARISH_COLLAPSE_NOT_REJECTED,
  C.L13RPA_RISK_BYPASS_NOT_REJECTED,
  C.L13RPA_MULTILINGUAL_ATTACK_NOT_BLOCKED,
  C.L13RPA_MALFORMED_PACKAGE_ACCEPTED,
  C.L13RPA_MISSING_EVIDENCE_ACCEPTED,
  C.L13RPA_MISSING_SCENARIO_ACCEPTED,
  C.L13RPA_HIDDEN_INVALIDATION_ACCEPTED,
  C.L13RPA_ROLLOUT_BLOCKING_REGRESSION_IGNORED,
  C.L13RPA_REPLAY_HASH_MISSING,
]);

const ERROR_CODES = new Set<L13ReplayRepairAdversarialViolationCode>([
  C.L13RPA_REGRESSION_RESULT_MISSING,
  C.L13RPA_LINEAGE_MISSING,
]);

export function severityForL13RPACode(
  code: L13ReplayRepairAdversarialViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13RPABlockingCode(
  code: L13ReplayRepairAdversarialViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L13ReplayRepairAdversarialAuditRecord[] = [];

export function resetL13RPAAuditLog(): void {
  auditLog.length = 0;
}

export interface L13RPAAuditEmissionInput {
  readonly subjectClass: L13ReplayRepairAdversarialAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13ReplayRepairAdversarialViolationCode;
  readonly message: string;
  readonly sourceOutputId?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13RPAAuditRecord(
  input: L13RPAAuditEmissionInput,
): L13ReplayRepairAdversarialAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.sourceOutputId ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13ReplayRepairAdversarialAuditRecord = {
    audit_id: `l13rpa.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13RPACode(input.violationCode),
    message: input.message,
    blocking: isL13RPABlockingCode(input.violationCode),
    source_output_id: input.sourceOutputId,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13RPAAuditLog():
  readonly L13ReplayRepairAdversarialAuditRecord[] {
  return [...auditLog];
}

export function getL13RPACriticalViolations():
  readonly L13ReplayRepairAdversarialAuditRecord[] {
  return auditLog.filter(r => r.severity === L13ViolationSeverity.CRITICAL);
}
