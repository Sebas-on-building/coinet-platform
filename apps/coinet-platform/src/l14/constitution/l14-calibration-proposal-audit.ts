/**
 * L14.7 — Calibration Proposal Audit Surface
 *
 * §14.7.52 / §14.7.53 — Deterministic audit log for L14Q findings.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14CalibrationProposalViolationCode } from '../validation/l14-calibration-proposal-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.proposal.v1';

export enum L14CalibrationProposalAuditSubjectClass {
  PROPOSAL_REQUEST = 'PROPOSAL_REQUEST',
  PROPOSAL_ELIGIBILITY = 'PROPOSAL_ELIGIBILITY',
  PROPOSAL_CLASS_POLICY = 'PROPOSAL_CLASS_POLICY',
  PROPOSAL_EVIDENCE_PACK = 'PROPOSAL_EVIDENCE_PACK',
  PROPOSAL_AFFECTED_TARGET = 'PROPOSAL_AFFECTED_TARGET',
  PROPOSED_ACTION = 'PROPOSED_ACTION',
  PROPOSAL_REVIEW_PRIORITY = 'PROPOSAL_REVIEW_PRIORITY',
  RECERTIFICATION_SCOPE = 'RECERTIFICATION_SCOPE',
  CALIBRATION_PROPOSAL = 'CALIBRATION_PROPOSAL',
  REVIEW_QUEUE_ROUTE = 'REVIEW_QUEUE_ROUTE',
  LOWER_LAYER_HANDOFF = 'LOWER_LAYER_HANDOFF',
  REVIEW_NOTE = 'REVIEW_NOTE',
  INVARIANT = 'INVARIANT',
}

export interface L14CalibrationProposalAuditRecord {
  readonly audit_id: string;
  readonly audit_subject_class: L14CalibrationProposalAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14CalibrationProposalViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

const C = L14CalibrationProposalViolationCode;

const CRITICAL = new Set<L14CalibrationProposalViolationCode>([
  C.L14Q_EVIDENCE_NOT_PROPOSAL_ELIGIBLE,
  C.L14Q_HUMAN_REVIEW_ONLY_EVIDENCE_PROMOTED_TO_FORMAL_PROPOSAL,
  C.L14Q_COUNTEREVIDENCE_BLOCKED_PROPOSAL_GENERATED,
  C.L14Q_PROPOSAL_CLASS_EVIDENCE_CLASS_MISMATCH,
  C.L14Q_AFFECTED_LAYER_CLASS_MISMATCH,
  C.L14Q_ILLEGAL_TARGET_CLASS_FOR_PROPOSAL,
  C.L14Q_MUTATION_REQUESTED_BY_PROPOSAL,
  C.L14Q_AUTOMATIC_APPLICATION_FLAG_NOT_FALSE,
  C.L14Q_REQUIRES_REVIEW_FLAG_NOT_TRUE,
  C.L14Q_PROPOSED_ACTION_TOO_EXECUTABLE,
  C.L14Q_PROPOSAL_ACTION_CLASS_ILLEGAL,
  C.L14Q_COUNTEREVIDENCE_NOT_DISCLOSED,
  C.L14Q_REVIEW_PRIORITY_UNSUPPORTED,
  C.L14Q_RECERTIFICATION_REQUIRED_BUT_MISSING,
  C.L14Q_RECERTIFICATION_SCOPE_FALSE_GREEN,
  C.L14Q_READINESS_FALSE_GREEN,
  C.L14Q_REVIEW_QUEUE_MISSING,
  C.L14Q_HANDOFF_LAYER_MISMATCH,
]);

const ERROR_CODES = new Set<L14CalibrationProposalViolationCode>([
  C.L14Q_PROPOSAL_REQUEST_MISSING,
  C.L14Q_PROPOSAL_CLASS_MISSING,
  C.L14Q_SOURCE_EVIDENCE_REFS_MISSING,
  C.L14Q_AFFECTED_TARGET_MAPPING_MISSING,
  C.L14Q_PROPOSAL_SUMMARY_MISSING,
  C.L14Q_PROPOSED_ACTION_MISSING,
  C.L14Q_NON_CLAIMS_MISSING,
  C.L14Q_EVIDENCE_PACK_MISSING,
  C.L14Q_LOWER_LAYER_HANDOFF_MISSING,
  C.L14Q_HUMAN_REVIEW_NOTE_MISSING_FOR_REVIEW_ONLY_EVIDENCE,
  C.L14Q_LINEAGE_MISSING,
  C.L14Q_REPLAY_HASH_MISSING,
]);

export function severityForL14CalibrationProposalCode(
  code: L14CalibrationProposalViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14CalibrationProposalBlockingCode(
  code: L14CalibrationProposalViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14CalibrationProposalAuditRecord[] = [];

export function resetL14CalibrationProposalAuditLog(): void {
  auditLog.length = 0;
}

export interface L14CalibrationProposalAuditEmissionInput {
  readonly subjectClass: L14CalibrationProposalAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14CalibrationProposalViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(codes: readonly L14CalibrationProposalViolationCode[]): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14CalibrationProposalCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14CalibrationProposalAuditRecord(
  input: L14CalibrationProposalAuditEmissionInput,
): L14CalibrationProposalAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.proposal.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14CalibrationProposalBlockingCode(c));
  const replayHash = fnv1a([
    input.subjectClass, input.subjectRef, sortedCodes.join(','), input.message,
    severity, String(blocking), lineage.join(','), POLICY_V,
  ].join('|'));
  const record: L14CalibrationProposalAuditRecord = {
    audit_id: `l14q.audit.${replayHash}`,
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

export function getL14CalibrationProposalAuditLog(): readonly L14CalibrationProposalAuditRecord[] {
  return [...auditLog];
}

export function getL14CalibrationProposalCriticalViolations(): readonly L14CalibrationProposalAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}
