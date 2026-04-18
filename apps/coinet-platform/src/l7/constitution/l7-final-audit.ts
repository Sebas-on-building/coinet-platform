/**
 * L7.9 — Final Audit Surface
 *
 * §7.9.8.4 / §7.9.9.4 — Durable audit of ratification decisions,
 * completion failures, freeze activations, extension classifications,
 * and downstream dependency violations. Enables mechanical inspection
 * of Layer 7 closure state.
 */

import {
  L7CompletionEvaluation,
  L7RatificationViolationCode,
} from '../contracts/l7-completion-standard';
import { L7FreezeStatus } from '../contracts/l7-freeze-policy';
import {
  L7ExtensionClassification,
} from '../contracts/l7-extension-policy';
import {
  L7DownstreamDependencyDecision,
} from '../contracts/l7-downstream-dependency';

export enum L7FinalAuditKind {
  RATIFICATION_DECISION = 'RATIFICATION_DECISION',
  COMPLETION_FAILURE = 'COMPLETION_FAILURE',
  FREEZE_ACTIVATION = 'FREEZE_ACTIVATION',
  EXTENSION_CLASSIFICATION = 'EXTENSION_CLASSIFICATION',
  DOWNSTREAM_DEPENDENCY_VIOLATION = 'DOWNSTREAM_DEPENDENCY_VIOLATION',
}

export enum L7FinalAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
}

export interface L7FinalAuditRecord {
  readonly record_id: string;
  readonly kind: L7FinalAuditKind;
  readonly severity: L7FinalAuditSeverity;
  readonly emitted_at: string;
  readonly subject_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly violation_codes: readonly L7RatificationViolationCode[];
}

const auditLog: L7FinalAuditRecord[] = [];
let sequence = 0;

function nextRecordId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export function emitL7RatificationDecision(
  ratification_run_id: string,
  allowed: boolean,
  violations: readonly L7RatificationViolationCode[],
): L7FinalAuditRecord {
  const rec: L7FinalAuditRecord = {
    record_id: nextRecordId('rat'),
    kind: L7FinalAuditKind.RATIFICATION_DECISION,
    severity: allowed ? L7FinalAuditSeverity.INFO : L7FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: ratification_run_id,
    payload: { allowed },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL7CompletionFailure(
  ratification_run_id: string,
  evaluation: L7CompletionEvaluation,
): L7FinalAuditRecord {
  const rec: L7FinalAuditRecord = {
    record_id: nextRecordId('cmp'),
    kind: L7FinalAuditKind.COMPLETION_FAILURE,
    severity: L7FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: ratification_run_id,
    payload: {
      overall_state: evaluation.overall_state,
      dimensions: evaluation.dimensions,
    },
    violation_codes: evaluation.violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL7FreezeActivation(
  request_id: string,
  activated_status: L7FreezeStatus,
  allowed: boolean,
  violations: readonly L7RatificationViolationCode[],
  rationale: string,
): L7FinalAuditRecord {
  const rec: L7FinalAuditRecord = {
    record_id: nextRecordId('frz'),
    kind: L7FinalAuditKind.FREEZE_ACTIVATION,
    severity: allowed ? L7FinalAuditSeverity.INFO : L7FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { activated_status, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL7ExtensionClassification(
  c: L7ExtensionClassification,
): L7FinalAuditRecord {
  const rec: L7FinalAuditRecord = {
    record_id: nextRecordId('ext'),
    kind: L7FinalAuditKind.EXTENSION_CLASSIFICATION,
    severity: c.requires_recertification
      ? L7FinalAuditSeverity.WARN
      : L7FinalAuditSeverity.INFO,
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

export function emitL7DownstreamDependencyViolation(
  d: L7DownstreamDependencyDecision,
  violation: L7RatificationViolationCode,
): L7FinalAuditRecord {
  const rec: L7FinalAuditRecord = {
    record_id: nextRecordId('dep'),
    kind: L7FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
    severity: L7FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: d.request_id,
    payload: { allowance: d.allowance, rationale: d.rationale },
    violation_codes: [violation],
  };
  auditLog.push(rec);
  return rec;
}

export function listL7FinalAuditRecords(): readonly L7FinalAuditRecord[] {
  return [...auditLog];
}

export function queryL7FinalAuditByKind(
  kind: L7FinalAuditKind,
): readonly L7FinalAuditRecord[] {
  return auditLog.filter(r => r.kind === kind);
}

export function queryL7FinalAuditBySubject(
  subject_id: string,
): readonly L7FinalAuditRecord[] {
  return auditLog.filter(r => r.subject_id === subject_id);
}

export function clearL7FinalAuditLog(): void {
  auditLog.length = 0;
  sequence = 0;
}
