/**
 * L13.1 — Constitutional Audit Surface
 *
 * §13.1.12 — Emits durable audit records for every boundary
 * violation across mission, dependency access, output surface
 * emission, capability claim, forbidden actions, contradiction
 * handling, confidence handling, restriction handling, evidence
 * grounding, and invariant evaluation. Audit must be deterministic:
 * same violation material must produce the same audit hash.
 */

import {
  L13ConstitutionalViolationCode,
} from '../contracts/l13-violation-codes';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';

/**
 * §13.1.12.1 — Audit subject classes.
 */
export enum L13ConstitutionalAuditSubjectClass {
  MISSION = 'MISSION',
  BOUNDARY = 'BOUNDARY',
  DEPENDENCY_SURFACE = 'DEPENDENCY_SURFACE',
  OUTPUT_SURFACE = 'OUTPUT_SURFACE',
  CAPABILITY_POLICY = 'CAPABILITY_POLICY',
  FORBIDDEN_ACTION = 'FORBIDDEN_ACTION',
  COMPONENT = 'COMPONENT',
  OUTPUT_SEMANTICS = 'OUTPUT_SEMANTICS',
  CONTRADICTION_HANDLING = 'CONTRADICTION_HANDLING',
  CONFIDENCE_HANDLING = 'CONFIDENCE_HANDLING',
  RESTRICTION_HANDLING = 'RESTRICTION_HANDLING',
  EVIDENCE_GROUNDING = 'EVIDENCE_GROUNDING',
  INVARIANT = 'INVARIANT',
}

export const ALL_L13_AUDIT_SUBJECT_CLASSES:
  readonly L13ConstitutionalAuditSubjectClass[] =
  Object.values(L13ConstitutionalAuditSubjectClass);

export interface L13ConstitutionalAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L13ConstitutionalAuditSubjectClass;
  readonly subject_ref: string;
  readonly violation_code: L13ConstitutionalViolationCode;
  readonly severity: L13ViolationSeverity;
  readonly message: string;
  readonly blocking: boolean;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly created_at: string;
  readonly policy_version: string;
  readonly replay_hash: string;
}

const POLICY_V = 'l13.constitution.v1';

/**
 * §13.1.12.2 — Severity mapping for each L13C_ code.
 */
const CRITICAL_CODES = new Set<L13ConstitutionalViolationCode>([
  L13ConstitutionalViolationCode.L13C_BUY_SELL_HOLD_AVOID_LEAK,
  L13ConstitutionalViolationCode.L13C_LEVERAGE_ADVICE_LEAK,
  L13ConstitutionalViolationCode.L13C_POSITION_SIZE_LEAK,
  L13ConstitutionalViolationCode.L13C_ENTRY_EXIT_LEAK,
  L13ConstitutionalViolationCode.L13C_PREDICTION_THEATER,
  L13ConstitutionalViolationCode.L13C_UNSUPPORTED_CERTAINTY,
  L13ConstitutionalViolationCode.L13C_SCENARIO_AS_PROBABILITY,
  L13ConstitutionalViolationCode.L13C_SCENARIO_AS_WINNER,
  L13ConstitutionalViolationCode.L13C_HYPOTHESIS_AS_FINAL_TRUTH,
  L13ConstitutionalViolationCode.L13C_SCORE_AS_RECOMMENDATION,
  L13ConstitutionalViolationCode.L13C_FINAL_JUDGMENT_LEAK,
  L13ConstitutionalViolationCode.L13C_REBUILDS_SCENARIO,
  L13ConstitutionalViolationCode.L13C_REBUILDS_SCORE,
  L13ConstitutionalViolationCode.L13C_REBUILDS_HYPOTHESIS,
  L13ConstitutionalViolationCode.L13C_REBUILDS_SEQUENCE,
  L13ConstitutionalViolationCode.L13C_REBUILDS_REGIME,
  L13ConstitutionalViolationCode.L13C_CREATES_NEW_SCENARIO,
  L13ConstitutionalViolationCode.L13C_CREATES_NEW_HYPOTHESIS,
  L13ConstitutionalViolationCode.L13C_COMPUTES_SCORE_LOCALLY,
  L13ConstitutionalViolationCode.L13C_INVENTS_SUPPORT,
  L13ConstitutionalViolationCode.L13C_HIDES_CONTRADICTION,
  L13ConstitutionalViolationCode.L13C_IGNORES_RESTRICTION,
  L13ConstitutionalViolationCode.L13C_OVERRIDES_CONFIDENCE,
  L13ConstitutionalViolationCode.L13C_PRETENDS_MISSING_DATA_COMPLETE,
  L13ConstitutionalViolationCode.L13C_RAW_LOWER_LAYER_BYPASS,
  L13ConstitutionalViolationCode.L13C_LATE_LAYER_DEPENDENCY,
  L13ConstitutionalViolationCode.L13C_AI_ACTS_AS_ENGINE,
  L13ConstitutionalViolationCode.L13C_LAYER_ROLE_CONFUSED,
  L13ConstitutionalViolationCode.L13C_MISSION_MISSING,
  L13ConstitutionalViolationCode.L13C_FIRST_PRINCIPLE_MISSING,
  L13ConstitutionalViolationCode.L13C_MISSION_MISMATCH,
]);

const ERROR_CODES = new Set<L13ConstitutionalViolationCode>([
  L13ConstitutionalViolationCode.L13C_DEPENDENCY_SURFACE_UNREGISTERED,
  L13ConstitutionalViolationCode.L13C_ILLEGAL_DEPENDENCY_USAGE,
  L13ConstitutionalViolationCode.L13C_OUTPUT_SURFACE_UNREGISTERED,
  L13ConstitutionalViolationCode.L13C_ILLEGAL_OUTPUT_CLASS,
  L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING,
  L13ConstitutionalViolationCode.L13C_LINEAGE_REFS_MISSING,
  L13ConstitutionalViolationCode.L13C_CONFIDENCE_DISCLOSURE_MISSING,
  L13ConstitutionalViolationCode.L13C_RESTRICTION_DISCLOSURE_MISSING,
  L13ConstitutionalViolationCode.L13C_REPLAY_HASH_MISSING,
  L13ConstitutionalViolationCode.L13C_FORBIDDEN_NAMING,
  L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_TRIGGER_DISCLOSURE,
  L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE,
  L13ConstitutionalViolationCode.L13C_ILLEGAL_CAPABILITY_CLAIM,
  L13ConstitutionalViolationCode.L13C_CAPABILITY_DENIED,
  L13ConstitutionalViolationCode.L13C_AUDIT_RECORD_MISSING,
  L13ConstitutionalViolationCode.L13C_INVARIANT_FAILED,
]);

export function severityForL13ViolationCode(
  code: L13ConstitutionalViolationCode,
): L13ViolationSeverity {
  if (CRITICAL_CODES.has(code)) return L13ViolationSeverity.CRITICAL;
  if (ERROR_CODES.has(code)) return L13ViolationSeverity.ERROR;
  return L13ViolationSeverity.WARNING;
}

/**
 * §13.1.12.3 — Whether a violation is blocking. Critical violations
 * are always blocking; specific errors that compromise replay or
 * grounding are also blocking.
 */
const BLOCKING_ERRORS = new Set<L13ConstitutionalViolationCode>([
  L13ConstitutionalViolationCode.L13C_DEPENDENCY_SURFACE_UNREGISTERED,
  L13ConstitutionalViolationCode.L13C_ILLEGAL_DEPENDENCY_USAGE,
  L13ConstitutionalViolationCode.L13C_OUTPUT_SURFACE_UNREGISTERED,
  L13ConstitutionalViolationCode.L13C_ILLEGAL_OUTPUT_CLASS,
  L13ConstitutionalViolationCode.L13C_EVIDENCE_REFS_MISSING,
  L13ConstitutionalViolationCode.L13C_LINEAGE_REFS_MISSING,
  L13ConstitutionalViolationCode.L13C_CONFIDENCE_DISCLOSURE_MISSING,
  L13ConstitutionalViolationCode.L13C_RESTRICTION_DISCLOSURE_MISSING,
  L13ConstitutionalViolationCode.L13C_REPLAY_HASH_MISSING,
  L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_TRIGGER_DISCLOSURE,
  L13ConstitutionalViolationCode.L13C_SCENARIO_WITHOUT_INVALIDATION_DISCLOSURE,
  L13ConstitutionalViolationCode.L13C_INVARIANT_FAILED,
]);

export function isL13BlockingViolationCode(
  code: L13ConstitutionalViolationCode,
): boolean {
  if (CRITICAL_CODES.has(code)) return true;
  if (BLOCKING_ERRORS.has(code)) return true;
  return false;
}

/**
 * §13.1.12 — Deterministic FNV-1a 32-bit replay hash. Same
 * (subject_class, subject_ref, code, message) produces the same
 * replay_hash and the same audit_id.
 */
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function deterministicHash(parts: readonly string[]): string {
  return fnv1a(parts.join('|'));
}

const auditLog: L13ConstitutionalAuditRecord[] = [];
let auditCounter = 0;

export function resetL13ConstitutionalAuditLog(): void {
  auditLog.length = 0;
  auditCounter = 0;
}

export interface L13AuditEmissionInput {
  readonly subjectClass: L13ConstitutionalAuditSubjectClass;
  readonly subjectRef: string;
  readonly violationCode: L13ConstitutionalViolationCode;
  readonly message: string;
  readonly evidenceRefs?: readonly string[];
  readonly lineageRefs?: readonly string[];
  /** Optional override for tests (deterministic). */
  readonly createdAt?: string;
}

export function emitL13AuditRecord(
  input: L13AuditEmissionInput,
): L13ConstitutionalAuditRecord {
  auditCounter += 1;
  const evidence = input.evidenceRefs ?? [];
  const lineage = input.lineageRefs ?? [];
  const replayHash = deterministicHash([
    input.subjectClass,
    input.subjectRef,
    input.violationCode,
    input.message,
    evidence.join(','),
    lineage.join(','),
    POLICY_V,
  ]);
  const auditId = `l13r.audit.${replayHash}`;
  const severity = severityForL13ViolationCode(input.violationCode);
  const blocking = isL13BlockingViolationCode(input.violationCode);
  const record: L13ConstitutionalAuditRecord = {
    audit_id: auditId,
    subject_class: input.subjectClass,
    subject_ref: input.subjectRef,
    violation_code: input.violationCode,
    severity,
    message: input.message,
    blocking,
    evidence_refs: evidence,
    lineage_refs: lineage,
    created_at: input.createdAt ?? new Date().toISOString(),
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
  auditLog.push(record);
  return record;
}

export function emitL13AuditRecords(
  inputs: readonly L13AuditEmissionInput[],
): readonly L13ConstitutionalAuditRecord[] {
  return inputs.map(i => emitL13AuditRecord(i));
}

export function getL13ConstitutionalAuditLog():
  readonly L13ConstitutionalAuditRecord[] {
  return [...auditLog];
}

export function getL13CriticalViolations():
  readonly L13ConstitutionalAuditRecord[] {
  return auditLog.filter(
    r => r.severity === L13ViolationSeverity.CRITICAL,
  );
}

export function getL13BlockingViolations():
  readonly L13ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.blocking);
}

export function getL13ViolationsByCode(
  code: L13ConstitutionalViolationCode,
): readonly L13ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.violation_code === code);
}

export function getL13ViolationsBySubjectClass(
  cls: L13ConstitutionalAuditSubjectClass,
): readonly L13ConstitutionalAuditRecord[] {
  return auditLog.filter(r => r.subject_class === cls);
}

export function hasAnyL13Violations(): boolean {
  return auditLog.length > 0;
}

export function getL13ViolationCount(): number {
  return auditLog.length;
}

void auditCounter;
