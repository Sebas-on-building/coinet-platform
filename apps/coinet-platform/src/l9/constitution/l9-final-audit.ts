/**
 * L9.9 — Final Audit Surface
 *
 * §9.9.6 / §9.9.8 — Durable audit of ratification decisions, completion
 * failures, freeze activations, extension classifications, downstream
 * handoff violations, rollout-gate decisions, and rollback decisions.
 * Disjoint from earlier L9 audit logs:
 *   - L9.1 constitutional audit
 *   - L9.2 object / family audit
 *   - L9.3 contract audit
 *   - L9.5 temporal-semantics audit
 *   - L9.6 family audit
 *   - L9.7 reliance audit
 *   - L9.8 persistence audit
 */

import {
  L9CompletionEvaluation,
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import { L9FreezeStatus } from '../contracts/l9-freeze-policy';
import {
  L9ExtensionClassification,
} from '../contracts/l9-extension-policy';
import {
  L9DownstreamDependencyDecision,
} from '../contracts/l9-downstream-dependency';
import { L9RolloutPhase } from '../rollout/l9-rollout-phase';
import { L9RollbackClass } from '../rollout/l9-rollback-policy';

export enum L9FinalAuditKind {
  RATIFICATION_DECISION = 'RATIFICATION_DECISION',
  COMPLETION_FAILURE = 'COMPLETION_FAILURE',
  FREEZE_ACTIVATION = 'FREEZE_ACTIVATION',
  EXTENSION_CLASSIFICATION = 'EXTENSION_CLASSIFICATION',
  DOWNSTREAM_DEPENDENCY_VIOLATION = 'DOWNSTREAM_DEPENDENCY_VIOLATION',
  ROLLOUT_DECISION = 'ROLLOUT_DECISION',
  ROLLBACK_DECISION = 'ROLLBACK_DECISION',
}

export enum L9FinalAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
}

export interface L9FinalAuditRecord {
  readonly record_id: string;
  readonly kind: L9FinalAuditKind;
  readonly severity: L9FinalAuditSeverity;
  readonly emitted_at: string;
  readonly subject_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly violation_codes: readonly L9RatificationViolationCode[];
}

const auditLog: L9FinalAuditRecord[] = [];
let sequence = 0;

function nextRecordId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export function emitL9RatificationDecision(
  ratification_run_id: string,
  allowed: boolean,
  violations: readonly L9RatificationViolationCode[],
): L9FinalAuditRecord {
  const rec: L9FinalAuditRecord = {
    record_id: nextRecordId('rat'),
    kind: L9FinalAuditKind.RATIFICATION_DECISION,
    severity: allowed ? L9FinalAuditSeverity.INFO : L9FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: ratification_run_id,
    payload: { allowed },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL9CompletionFailure(
  ratification_run_id: string,
  evaluation: L9CompletionEvaluation,
): L9FinalAuditRecord {
  const rec: L9FinalAuditRecord = {
    record_id: nextRecordId('cmp'),
    kind: L9FinalAuditKind.COMPLETION_FAILURE,
    severity: L9FinalAuditSeverity.BLOCK,
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

export function emitL9FreezeActivation(
  request_id: string,
  activated_status: L9FreezeStatus,
  allowed: boolean,
  violations: readonly L9RatificationViolationCode[],
  rationale: string,
): L9FinalAuditRecord {
  const rec: L9FinalAuditRecord = {
    record_id: nextRecordId('frz'),
    kind: L9FinalAuditKind.FREEZE_ACTIVATION,
    severity: allowed ? L9FinalAuditSeverity.INFO : L9FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { activated_status, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL9ExtensionClassification(
  c: L9ExtensionClassification,
): L9FinalAuditRecord {
  const rec: L9FinalAuditRecord = {
    record_id: nextRecordId('ext'),
    kind: L9FinalAuditKind.EXTENSION_CLASSIFICATION,
    severity: c.requires_recertification
      ? L9FinalAuditSeverity.WARN
      : L9FinalAuditSeverity.INFO,
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

export function emitL9DownstreamDependencyViolation(
  d: L9DownstreamDependencyDecision,
  violation: L9RatificationViolationCode,
): L9FinalAuditRecord {
  const rec: L9FinalAuditRecord = {
    record_id: nextRecordId('dep'),
    kind: L9FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
    severity: L9FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: d.request_id,
    payload: { allowance: d.allowance, rationale: d.rationale },
    violation_codes: [violation],
  };
  auditLog.push(rec);
  return rec;
}

export function emitL9RolloutDecision(
  request_id: string,
  from_phase: L9RolloutPhase,
  to_phase: L9RolloutPhase,
  allowed: boolean,
  violations: readonly L9RatificationViolationCode[],
  rationale: string,
): L9FinalAuditRecord {
  const rec: L9FinalAuditRecord = {
    record_id: nextRecordId('rol'),
    kind: L9FinalAuditKind.ROLLOUT_DECISION,
    severity: allowed ? L9FinalAuditSeverity.INFO : L9FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { from_phase, to_phase, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL9RollbackDecision(
  request_id: string,
  rollback_class: L9RollbackClass,
  allowed: boolean,
  violations: readonly L9RatificationViolationCode[],
  rationale: string,
): L9FinalAuditRecord {
  const rec: L9FinalAuditRecord = {
    record_id: nextRecordId('rbk'),
    kind: L9FinalAuditKind.ROLLBACK_DECISION,
    severity: allowed ? L9FinalAuditSeverity.INFO : L9FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { rollback_class, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function listL9FinalAuditRecords(): readonly L9FinalAuditRecord[] {
  return [...auditLog];
}

export function queryL9FinalAuditByKind(
  kind: L9FinalAuditKind,
): readonly L9FinalAuditRecord[] {
  return auditLog.filter(r => r.kind === kind);
}

export function queryL9FinalAuditBySubject(
  subject_id: string,
): readonly L9FinalAuditRecord[] {
  return auditLog.filter(r => r.subject_id === subject_id);
}

export function clearL9FinalAuditLog(): void {
  auditLog.length = 0;
  sequence = 0;
}
