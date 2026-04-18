/**
 * L8.9 — Final Audit Surface
 *
 * §8.9.8.6 / §8.9.9.4 — Durable audit of ratification decisions,
 * completion failures, freeze activations, extension classifications,
 * and downstream dependency violations. Disjoint from earlier L8
 * audit logs:
 *   - L8.1 constitutional audit
 *   - L8.2 object audit
 *   - L8.3 contract audit
 *   - L8.4 runtime audit
 *   - L8.5 input audit
 *   - L8.6 template audit
 *   - L8.7 reliance audit
 *   - L8.8 persistence audit
 */

import {
  L8CompletionEvaluation,
  L8RatificationViolationCode,
} from '../contracts/l8-completion-standard';
import { L8FreezeStatus } from '../contracts/l8-freeze-policy';
import {
  L8ExtensionClassification,
} from '../contracts/l8-extension-policy';
import {
  L8DownstreamDependencyDecision,
} from '../contracts/l8-downstream-dependency';

export enum L8FinalAuditKind {
  RATIFICATION_DECISION = 'RATIFICATION_DECISION',
  COMPLETION_FAILURE = 'COMPLETION_FAILURE',
  FREEZE_ACTIVATION = 'FREEZE_ACTIVATION',
  EXTENSION_CLASSIFICATION = 'EXTENSION_CLASSIFICATION',
  DOWNSTREAM_DEPENDENCY_VIOLATION = 'DOWNSTREAM_DEPENDENCY_VIOLATION',
}

export enum L8FinalAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
}

export interface L8FinalAuditRecord {
  readonly record_id: string;
  readonly kind: L8FinalAuditKind;
  readonly severity: L8FinalAuditSeverity;
  readonly emitted_at: string;
  readonly subject_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly violation_codes: readonly L8RatificationViolationCode[];
}

const auditLog: L8FinalAuditRecord[] = [];
let sequence = 0;

function nextRecordId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export function emitL8RatificationDecision(
  ratification_run_id: string,
  allowed: boolean,
  violations: readonly L8RatificationViolationCode[],
): L8FinalAuditRecord {
  const rec: L8FinalAuditRecord = {
    record_id: nextRecordId('rat'),
    kind: L8FinalAuditKind.RATIFICATION_DECISION,
    severity: allowed ? L8FinalAuditSeverity.INFO : L8FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: ratification_run_id,
    payload: { allowed },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL8CompletionFailure(
  ratification_run_id: string,
  evaluation: L8CompletionEvaluation,
): L8FinalAuditRecord {
  const rec: L8FinalAuditRecord = {
    record_id: nextRecordId('cmp'),
    kind: L8FinalAuditKind.COMPLETION_FAILURE,
    severity: L8FinalAuditSeverity.BLOCK,
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

export function emitL8FreezeActivation(
  request_id: string,
  activated_status: L8FreezeStatus,
  allowed: boolean,
  violations: readonly L8RatificationViolationCode[],
  rationale: string,
): L8FinalAuditRecord {
  const rec: L8FinalAuditRecord = {
    record_id: nextRecordId('frz'),
    kind: L8FinalAuditKind.FREEZE_ACTIVATION,
    severity: allowed ? L8FinalAuditSeverity.INFO : L8FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { activated_status, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL8ExtensionClassification(
  c: L8ExtensionClassification,
): L8FinalAuditRecord {
  const rec: L8FinalAuditRecord = {
    record_id: nextRecordId('ext'),
    kind: L8FinalAuditKind.EXTENSION_CLASSIFICATION,
    severity: c.requires_recertification
      ? L8FinalAuditSeverity.WARN
      : L8FinalAuditSeverity.INFO,
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

export function emitL8DownstreamDependencyViolation(
  d: L8DownstreamDependencyDecision,
  violation: L8RatificationViolationCode,
): L8FinalAuditRecord {
  const rec: L8FinalAuditRecord = {
    record_id: nextRecordId('dep'),
    kind: L8FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
    severity: L8FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: d.request_id,
    payload: { allowance: d.allowance, rationale: d.rationale },
    violation_codes: [violation],
  };
  auditLog.push(rec);
  return rec;
}

export function listL8FinalAuditRecords(): readonly L8FinalAuditRecord[] {
  return [...auditLog];
}

export function queryL8FinalAuditByKind(
  kind: L8FinalAuditKind,
): readonly L8FinalAuditRecord[] {
  return auditLog.filter(r => r.kind === kind);
}

export function queryL8FinalAuditBySubject(
  subject_id: string,
): readonly L8FinalAuditRecord[] {
  return auditLog.filter(r => r.subject_id === subject_id);
}

export function clearL8FinalAuditLog(): void {
  auditLog.length = 0;
  sequence = 0;
}
