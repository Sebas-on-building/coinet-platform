/**
 * L14.1 — Constitutional Audit Surface
 *
 * §14.1.19 / §14.1.20 — Deterministic audit log for L14C
 * constitutional violations. Severity mapping mirrors prior
 * layers; blocking helper drives downstream gating.
 */

import {
  L14ConstitutionalAuditSeverity,
  L14ConstitutionalAuditSubjectClass,
} from '../contracts/l14-constitutional-types';
import { L14ConstitutionalViolationCode } from '../contracts/l14-violation-codes';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.constitution.v1';

export interface L14ConstitutionalAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L14ConstitutionalAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_codes: readonly L14ConstitutionalViolationCode[];
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly blocking: boolean;
  readonly message: string;
  readonly emitted_at: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

const C = L14ConstitutionalViolationCode;

const CRITICAL = new Set<L14ConstitutionalViolationCode>([
  C.L14C_MISSION_MISSING,
  C.L14C_MISSION_MUTATED,
  C.L14C_FIRST_PRINCIPLE_MISSING,
  C.L14C_RAW_LOWER_LAYER_REBUILD_ATTEMPT,
  C.L14C_L10_HYPOTHESIS_REBUILD_ATTEMPT,
  C.L14C_L11_SCORE_REBUILD_ATTEMPT,
  C.L14C_L12_SCENARIO_REBUILD_ATTEMPT,
  C.L14C_L13_EXPLANATION_REBUILD_ATTEMPT,
  C.L14C_ENGAGEMENT_AS_TRUTH,
  C.L14C_FEEDBACK_AS_AUTOMATIC_TRUTH,
  C.L14C_OPEN_RATE_AS_CORRECTNESS,
  C.L14C_CLICK_RATE_AS_CORRECTNESS,
  C.L14C_SILENT_LOWER_LAYER_MUTATION,
  C.L14C_AUTO_THRESHOLD_MUTATION,
  C.L14C_AUTO_SCENARIO_TEMPLATE_MUTATION,
  C.L14C_AUTO_L13_POLICY_MUTATION,
  C.L14C_OUTCOME_MISALIGNMENT_HIDDEN,
  C.L14C_FALSE_POSITIVE_HIDDEN,
  C.L14C_CONFIDENCE_OVERSTATEMENT_HIDDEN,
  C.L14C_DELIVERY_SOURCE_UNGOVERNED,
  C.L14C_DELIVERY_REWRITES_SOURCE_MEANING,
  C.L14C_DELIVERY_BYPASSES_RESTRICTION,
  C.L14C_CALIBRATION_EVIDENCE_WITHOUT_LINEAGE,
  C.L14C_CALIBRATION_PROPOSAL_AUTO_APPLY,
  C.L14C_EVALUATION_WITHOUT_HORIZON,
  C.L14C_OUTPUT_SURFACE_UNREGISTERED,
  C.L14C_OUTPUT_SURFACE_L5_ROUTE_MISSING,
  C.L14C_UNREGISTERED_DEPENDENCY_SURFACE,
]);

const ERROR_CODES = new Set<L14ConstitutionalViolationCode>([
  C.L14C_OUTPUT_SURFACE_LINEAGE_MISSING,
  C.L14C_OUTPUT_SURFACE_REPLAY_HASH_MISSING,
]);

export function severityForL14ConstitutionalCode(
  code: L14ConstitutionalViolationCode,
): L14ConstitutionalAuditSeverity {
  if (CRITICAL.has(code)) return L14ConstitutionalAuditSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L14ConstitutionalAuditSeverity.ERROR;
  return L14ConstitutionalAuditSeverity.WARNING;
}

export function isL14ConstitutionalBlockingCode(
  code: L14ConstitutionalViolationCode,
): boolean {
  return CRITICAL.has(code);
}

const auditLog: L14ConstitutionalAuditRecord[] = [];

export function resetL14ConstitutionalAuditLog(): void {
  auditLog.length = 0;
}

export interface L14ConstitutionalAuditEmissionInput {
  readonly subjectClass: L14ConstitutionalAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCodes: readonly L14ConstitutionalViolationCode[];
  readonly message: string;
  readonly lineageRefs?: readonly string[];
  readonly emittedAt?: string;
}

function aggregateSeverity(
  codes: readonly L14ConstitutionalViolationCode[],
): L14ConstitutionalAuditSeverity {
  let top: L14ConstitutionalAuditSeverity = L14ConstitutionalAuditSeverity.WARNING;
  for (const c of codes) {
    const s = severityForL14ConstitutionalCode(c);
    if (s === L14ConstitutionalAuditSeverity.CRITICAL) return s;
    if (s === L14ConstitutionalAuditSeverity.ERROR) top = L14ConstitutionalAuditSeverity.ERROR;
  }
  return top;
}

export function emitL14ConstitutionalAuditRecord(
  input: L14ConstitutionalAuditEmissionInput,
): L14ConstitutionalAuditRecord {
  const lineage = input.lineageRefs ?? ['l14.constitution.lineage'];
  const sortedCodes = [...input.violationCodes].sort();
  const severity = aggregateSeverity(sortedCodes);
  const blocking = sortedCodes.some(c => isL14ConstitutionalBlockingCode(c));
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
  const record: L14ConstitutionalAuditRecord = {
    audit_id: `l14c.audit.${replayHash}`,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_codes: sortedCodes,
    severity,
    blocking,
    message: input.message,
    emitted_at: input.emittedAt ?? new Date().toISOString(),
    lineage_refs: lineage,
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function getL14ConstitutionalAuditLog():
  readonly L14ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getL14ConstitutionalCriticalViolations():
  readonly L14ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.severity === L14ConstitutionalAuditSeverity.CRITICAL);
}

export function getL14ConstitutionalBlockingViolations():
  readonly L14ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL14ConstitutionalViolationsByCode(
  code: L14ConstitutionalViolationCode,
): readonly L14ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violation_codes.includes(code));
}
