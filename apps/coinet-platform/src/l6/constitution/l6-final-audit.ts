/**
 * L6.9 — Final Audit Surface
 *
 * §6.9.8.4 — Durable audit of ratification decisions, completion
 * failures, freeze activations, extension classifications, and
 * downstream dependency violations. Enables mechanical inspection of
 * closure state (§6.9.9.4).
 */

import {
  L6CompletionEvaluation,
  L6RatificationViolationCode,
} from '../contracts/l6-completion-standard';
import { L6FreezeStatus } from '../contracts/l6-freeze-policy';
import {
  L6ExtensionClassification,
} from '../contracts/l6-extension-policy';
import {
  L6DownstreamDependencyDecision,
} from '../contracts/l6-downstream-dependency';

export enum L6FinalAuditKind {
  RATIFICATION_DECISION = 'RATIFICATION_DECISION',
  COMPLETION_FAILURE = 'COMPLETION_FAILURE',
  FREEZE_ACTIVATION = 'FREEZE_ACTIVATION',
  EXTENSION_CLASSIFICATION = 'EXTENSION_CLASSIFICATION',
  DOWNSTREAM_DEPENDENCY_VIOLATION = 'DOWNSTREAM_DEPENDENCY_VIOLATION',
}

export enum L6FinalAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
}

export interface L6FinalAuditRecord {
  readonly record_id: string;
  readonly kind: L6FinalAuditKind;
  readonly severity: L6FinalAuditSeverity;
  readonly emitted_at: string;
  readonly subject_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly violation_codes: readonly L6RatificationViolationCode[];
}

const auditLog: L6FinalAuditRecord[] = [];
let sequence = 0;

function nextRecordId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export function emitRatificationDecision(
  ratification_run_id: string,
  allowed: boolean,
  violations: readonly L6RatificationViolationCode[],
): L6FinalAuditRecord {
  const rec: L6FinalAuditRecord = {
    record_id: nextRecordId('rat'),
    kind: L6FinalAuditKind.RATIFICATION_DECISION,
    severity: allowed ? L6FinalAuditSeverity.INFO : L6FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: ratification_run_id,
    payload: { allowed },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitCompletionFailure(
  ratification_run_id: string,
  evaluation: L6CompletionEvaluation,
): L6FinalAuditRecord {
  const rec: L6FinalAuditRecord = {
    record_id: nextRecordId('cmp'),
    kind: L6FinalAuditKind.COMPLETION_FAILURE,
    severity: L6FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: ratification_run_id,
    payload: { overall_state: evaluation.overall_state, dimensions: evaluation.dimensions },
    violation_codes: evaluation.violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitFreezeActivation(
  request_id: string,
  activated_status: L6FreezeStatus,
  allowed: boolean,
  violations: readonly L6RatificationViolationCode[],
  rationale: string,
): L6FinalAuditRecord {
  const rec: L6FinalAuditRecord = {
    record_id: nextRecordId('frz'),
    kind: L6FinalAuditKind.FREEZE_ACTIVATION,
    severity: allowed ? L6FinalAuditSeverity.INFO : L6FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { activated_status, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitExtensionClassification(
  c: L6ExtensionClassification,
): L6FinalAuditRecord {
  const rec: L6FinalAuditRecord = {
    record_id: nextRecordId('ext'),
    kind: L6FinalAuditKind.EXTENSION_CLASSIFICATION,
    severity: c.requires_recertification ? L6FinalAuditSeverity.WARN : L6FinalAuditSeverity.INFO,
    emitted_at: new Date().toISOString(),
    subject_id: c.proposal_id,
    payload: {
      classification: c.classification,
      requires_recertification: c.requires_recertification,
      rationale: c.rationale,
    },
    violation_codes: [],
  };
  auditLog.push(rec);
  return rec;
}

export function emitDownstreamDependencyViolation(
  d: L6DownstreamDependencyDecision,
  violation: L6RatificationViolationCode,
): L6FinalAuditRecord {
  const rec: L6FinalAuditRecord = {
    record_id: nextRecordId('dep'),
    kind: L6FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
    severity: L6FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: d.request_id,
    payload: { allowance: d.allowance, rationale: d.rationale },
    violation_codes: [violation],
  };
  auditLog.push(rec);
  return rec;
}

export function listFinalAuditRecords(): readonly L6FinalAuditRecord[] {
  return [...auditLog];
}

export function queryFinalAuditByKind(kind: L6FinalAuditKind): readonly L6FinalAuditRecord[] {
  return auditLog.filter(r => r.kind === kind);
}

export function queryFinalAuditBySubject(subject_id: string): readonly L6FinalAuditRecord[] {
  return auditLog.filter(r => r.subject_id === subject_id);
}

export function clearFinalAuditLog(): void {
  auditLog.length = 0;
  sequence = 0;
}
