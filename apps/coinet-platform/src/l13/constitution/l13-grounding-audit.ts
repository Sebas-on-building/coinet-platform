/**
 * L13.4 — Grounding Audit Surface
 *
 * §13.4.18 — Deterministic audit log for grounding violations.
 * Mirrors the L13.1/L13.2/L13.3 audit pattern.
 */

import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13GroundingViolationCode } from '../validation/l13-grounding-violation-codes';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.grounding.v1';

/**
 * §13.4.18 — Audit subject classes.
 */
export enum L13GroundingAuditSubjectClass {
  CLAIM_EXTRACTION = 'CLAIM_EXTRACTION',
  EXTRACTED_CLAIM = 'EXTRACTED_CLAIM',
  GROUNDED_CLAIM = 'GROUNDED_CLAIM',
  EVIDENCE_MATCH = 'EVIDENCE_MATCH',
  CONTRADICTION_MATCH = 'CONTRADICTION_MATCH',
  NO_INVENTION_GATE = 'NO_INVENTION_GATE',
  CITATION_PACK = 'CITATION_PACK',
  GROUNDING_RESULT = 'GROUNDING_RESULT',
  GROUNDED_OUTPUT_ENVELOPE = 'GROUNDED_OUTPUT_ENVELOPE',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_GROUNDING_AUDIT_SUBJECT_CLASSES:
  readonly L13GroundingAuditSubjectClass[] =
  Object.values(L13GroundingAuditSubjectClass);

export interface L13GroundingAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13GroundingAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13GroundingViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly output_id?: string;
  readonly claim_id?: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

// ── Severity mapping (§13.4.17) ─────────────────────────────────────

const CRITICAL = new Set<L13GroundingViolationCode>([
  L13GroundingViolationCode.L13G_CLAIM_ID_MISSING,
  L13GroundingViolationCode.L13G_OUTPUT_REF_MISSING,
  L13GroundingViolationCode.L13G_INPUT_PACKAGE_REF_MISSING,
  L13GroundingViolationCode.L13G_CLAIM_TEXT_MISSING,
  L13GroundingViolationCode.L13G_CLAIM_TYPE_MISSING,
  L13GroundingViolationCode.L13G_GROUNDING_CLASS_MISSING,
  L13GroundingViolationCode.L13G_REPLAY_HASH_MISSING,

  L13GroundingViolationCode.L13G_ALLOWED_CLAIM_WITHOUT_EVIDENCE,
  L13GroundingViolationCode.L13G_UNSUPPORTED_CLAIM_EMITTED,
  L13GroundingViolationCode.L13G_CONTRADICTED_CLAIM_EMITTED,
  L13GroundingViolationCode.L13G_SEMANTIC_MATCH_OVERRIDES_CONTRADICTION,

  L13GroundingViolationCode.L13G_INVENTED_EVIDENCE,
  L13GroundingViolationCode.L13G_INVENTED_SCORE_DRIVER,
  L13GroundingViolationCode.L13G_INVENTED_SCENARIO_TRIGGER,
  L13GroundingViolationCode.L13G_INVENTED_SCENARIO_INVALIDATION,
  L13GroundingViolationCode.L13G_INVENTED_HYPOTHESIS_SUPPORT,
  L13GroundingViolationCode.L13G_INVENTED_CONTRADICTION_ABSENCE,
  L13GroundingViolationCode.L13G_INVENTED_CONFIDENCE,
  L13GroundingViolationCode.L13G_INVENTED_REGIME_STATE,
  L13GroundingViolationCode.L13G_INVENTED_SEQUENCE_STATE,
  L13GroundingViolationCode.L13G_INVENTED_DATA_COMPLETENESS,
  L13GroundingViolationCode.L13G_INVENTED_FINANCIAL_INSTRUCTION,

  L13GroundingViolationCode.L13G_CITATION_PACK_MISSING,
  L13GroundingViolationCode.L13G_SCENARIO_CLAIM_WITHOUT_SCENARIO_REF,
  L13GroundingViolationCode.L13G_SCORE_CLAIM_WITHOUT_SCORE_REF,
  L13GroundingViolationCode.L13G_HYPOTHESIS_CLAIM_WITHOUT_HYPOTHESIS_REF,
  L13GroundingViolationCode.L13G_CONTRADICTION_CLAIM_WITHOUT_CONTRADICTION_REF,
  L13GroundingViolationCode.L13G_REGIME_CLAIM_WITHOUT_REGIME_REF,
  L13GroundingViolationCode.L13G_SEQUENCE_CLAIM_WITHOUT_SEQUENCE_REF,

  L13GroundingViolationCode.L13G_BLOCK_REQUIRED_BUT_OUTPUT_ALLOWED,
  L13GroundingViolationCode.L13G_GROUNDING_READINESS_ILLEGAL,
  L13GroundingViolationCode.L13G_NO_INVENTION_GATE_BLOCKED,
  L13GroundingViolationCode.L13G_ENVELOPE_EMIT_WHILE_BLOCK_REQUIRED,

  L13GroundingViolationCode.L13G_EXTRACTION_DROPPED_MATERIAL_CLAIM,
]);

const ERROR_CODES = new Set<L13GroundingViolationCode>([
  L13GroundingViolationCode.L13G_SECTION_REF_MISSING,
  L13GroundingViolationCode.L13G_POLICY_VERSION_MISSING,
  L13GroundingViolationCode.L13G_LINEAGE_REF_MISSING,
  L13GroundingViolationCode.L13G_EVIDENCE_REF_NOT_IN_PACKAGE,
  L13GroundingViolationCode.L13G_CONTRADICTION_REF_NOT_IN_PACKAGE,
  L13GroundingViolationCode.L13G_SOURCE_LAYER_REF_MISSING,
  L13GroundingViolationCode.L13G_WEAK_MATCH_USED_AS_STRONG_SUPPORT,
  L13GroundingViolationCode.L13G_CITATION_CLAIM_MISSING,
  L13GroundingViolationCode.L13G_CITATION_REF_UNGOVERNED,
  L13GroundingViolationCode.L13G_REWRITE_REQUIRED_BUT_NOT_MARKED,
  L13GroundingViolationCode.L13G_EVIDENCE_MATCH_INVALID,
  L13GroundingViolationCode.L13G_CONTRADICTION_MATCH_INVALID,
  L13GroundingViolationCode.L13G_NO_INVENTION_GATE_INVALID,
  L13GroundingViolationCode.L13G_ENVELOPE_INVALID,
  L13GroundingViolationCode.L13G_EXTRACTION_HASH_MISSING,
]);

export function severityForL13GroundingCode(
  code: L13GroundingViolationCode,
): L13ViolationSeverity {
  if (CRITICAL.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

export function isL13GroundingBlockingCode(
  code: L13GroundingViolationCode,
): boolean {
  return CRITICAL.has(code);
}

// ── Audit log ───────────────────────────────────────────────────────

const auditLog: L13GroundingAuditRecord[] = [];

export function resetL13GroundingAuditLog(): void {
  auditLog.length = 0;
}

export interface L13GroundingAuditEmissionInput {
  readonly subjectClass: L13GroundingAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13GroundingViolationCode;
  readonly message: string;
  readonly outputId?: string;
  readonly claimId?: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  readonly createdAt?: string;
}

export function emitL13GroundingAuditRecord(
  input: L13GroundingAuditEmissionInput,
): L13GroundingAuditRecord {
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = fnv1a(
    [
      input.subjectClass,
      input.subjectRef,
      input.violationCode,
      input.message,
      input.outputId ?? '',
      input.claimId ?? '',
      evidence.join(','),
      lineage.join(','),
      POLICY_V,
    ].join('|'),
  );
  const record: L13GroundingAuditRecord = {
    audit_id: `l13g.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity: severityForL13GroundingCode(input.violationCode),
    message: input.message,
    blocking: isL13GroundingBlockingCode(input.violationCode),
    output_id: input.outputId,
    claim_id: input.claimId,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL13GroundingAuditLog():
  readonly L13GroundingAuditRecord[] {
  return [...auditLog];
}

export function getL13GroundingCriticalViolations():
  readonly L13GroundingAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13GroundingBlockingViolations():
  readonly L13GroundingAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13GroundingViolationsByCode(
  code: L13GroundingViolationCode,
): readonly L13GroundingAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13GroundingViolationsByOutputId(
  outputId: string,
): readonly L13GroundingAuditRecord[] {
  return auditLog.filter(r => r.output_id === outputId);
}

export function getL13GroundingViolationsByClaimId(
  claimId: string,
): readonly L13GroundingAuditRecord[] {
  return auditLog.filter(r => r.claim_id === claimId);
}

export function getL13GroundingViolationsBySubjectClass(
  cls: L13GroundingAuditSubjectClass,
): readonly L13GroundingAuditRecord[] {
  return auditLog.filter(r => r.subject_class === cls);
}

export function hasAnyL13GroundingViolations(): boolean {
  return auditLog.length > 0;
}

export function getL13GroundingViolationCount(): number {
  return auditLog.length;
}
