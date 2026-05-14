/**
 * L10.9 — Final Audit Surface
 *
 * §10.9.10 / §10.9.12 — Durable audit of ratification decisions,
 * completion failures, freeze activations, extension classifications,
 * downstream handoff violations, rollout-gate decisions, and
 * rollback decisions. Disjoint from earlier L10 audit logs:
 *   - L10.1 constitutional audit
 *   - L10.2 object audit
 *   - L10.3 contract audit
 *   - L10.5 evidence-semantics audit
 *   - L10.6 family/template/rollout/state audit
 *   - L10.7 reliance audit
 *   - L10.8 persistence audit
 */

import {
  L10CompletionEvaluation,
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import { L10FreezeStatus } from '../contracts/l10-freeze-policy';
import {
  L10ExtensionClassification,
} from '../contracts/l10-extension-policy';
import {
  L10DownstreamDependencyDecision,
} from '../contracts/l10-downstream-dependency';
import { L10RolloutPhase } from '../rollout/l10-rollout-phase';
import { L10RollbackClass } from '../rollout/l10-rollback-policy';

export enum L10FinalAuditKind {
  RATIFICATION_DECISION = 'RATIFICATION_DECISION',
  COMPLETION_FAILURE = 'COMPLETION_FAILURE',
  FREEZE_ACTIVATION = 'FREEZE_ACTIVATION',
  EXTENSION_CLASSIFICATION = 'EXTENSION_CLASSIFICATION',
  DOWNSTREAM_DEPENDENCY_VIOLATION = 'DOWNSTREAM_DEPENDENCY_VIOLATION',
  ROLLOUT_DECISION = 'ROLLOUT_DECISION',
  ROLLBACK_DECISION = 'ROLLBACK_DECISION',
}

export enum L10FinalAuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  BLOCK = 'BLOCK',
  CRITICAL = 'CRITICAL',
}

export interface L10FinalAuditRecord {
  readonly record_id: string;
  readonly kind: L10FinalAuditKind;
  readonly severity: L10FinalAuditSeverity;
  readonly emitted_at: string;
  readonly subject_id: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly violation_codes: readonly L10RatificationViolationCode[];
}

const auditLog: L10FinalAuditRecord[] = [];
let sequence = 0;

function nextRecordId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

export function emitL10RatificationDecision(
  ratification_run_id: string,
  allowed: boolean,
  violations: readonly L10RatificationViolationCode[],
): L10FinalAuditRecord {
  const rec: L10FinalAuditRecord = {
    record_id: nextRecordId('rat'),
    kind: L10FinalAuditKind.RATIFICATION_DECISION,
    severity:
      allowed ? L10FinalAuditSeverity.INFO : L10FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: ratification_run_id,
    payload: { allowed },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL10CompletionFailure(
  ratification_run_id: string,
  evaluation: L10CompletionEvaluation,
): L10FinalAuditRecord {
  const rec: L10FinalAuditRecord = {
    record_id: nextRecordId('cmp'),
    kind: L10FinalAuditKind.COMPLETION_FAILURE,
    severity: L10FinalAuditSeverity.BLOCK,
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

export function emitL10FreezeActivation(
  request_id: string,
  activated_status: L10FreezeStatus,
  allowed: boolean,
  violations: readonly L10RatificationViolationCode[],
  rationale: string,
): L10FinalAuditRecord {
  const rec: L10FinalAuditRecord = {
    record_id: nextRecordId('frz'),
    kind: L10FinalAuditKind.FREEZE_ACTIVATION,
    severity:
      allowed ? L10FinalAuditSeverity.INFO : L10FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { activated_status, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL10ExtensionClassification(
  c: L10ExtensionClassification,
): L10FinalAuditRecord {
  const rec: L10FinalAuditRecord = {
    record_id: nextRecordId('ext'),
    kind: L10FinalAuditKind.EXTENSION_CLASSIFICATION,
    severity: c.requires_recertification
      ? L10FinalAuditSeverity.WARN
      : L10FinalAuditSeverity.INFO,
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

export function emitL10DownstreamDependencyViolation(
  d: L10DownstreamDependencyDecision,
  violation: L10RatificationViolationCode,
  critical: boolean = false,
): L10FinalAuditRecord {
  const rec: L10FinalAuditRecord = {
    record_id: nextRecordId('dep'),
    kind: L10FinalAuditKind.DOWNSTREAM_DEPENDENCY_VIOLATION,
    severity: critical
      ? L10FinalAuditSeverity.CRITICAL
      : L10FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: d.request_id,
    payload: { allowance: d.allowance, rationale: d.rationale },
    violation_codes: [violation],
  };
  auditLog.push(rec);
  return rec;
}

export function emitL10RolloutDecision(
  request_id: string,
  from_phase: L10RolloutPhase,
  to_phase: L10RolloutPhase,
  allowed: boolean,
  violations: readonly L10RatificationViolationCode[],
  rationale: string,
): L10FinalAuditRecord {
  const rec: L10FinalAuditRecord = {
    record_id: nextRecordId('rol'),
    kind: L10FinalAuditKind.ROLLOUT_DECISION,
    severity:
      allowed ? L10FinalAuditSeverity.INFO : L10FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { from_phase, to_phase, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function emitL10RollbackDecision(
  request_id: string,
  rollback_class: L10RollbackClass,
  allowed: boolean,
  violations: readonly L10RatificationViolationCode[],
  rationale: string,
): L10FinalAuditRecord {
  const rec: L10FinalAuditRecord = {
    record_id: nextRecordId('rbk'),
    kind: L10FinalAuditKind.ROLLBACK_DECISION,
    severity:
      allowed ? L10FinalAuditSeverity.INFO : L10FinalAuditSeverity.BLOCK,
    emitted_at: new Date().toISOString(),
    subject_id: request_id,
    payload: { rollback_class, rationale },
    violation_codes: violations,
  };
  auditLog.push(rec);
  return rec;
}

export function listL10FinalAuditRecords():
  readonly L10FinalAuditRecord[] {
  return [...auditLog];
}

export function queryL10FinalAuditByKind(
  kind: L10FinalAuditKind,
): readonly L10FinalAuditRecord[] {
  return auditLog.filter(r => r.kind === kind);
}

export function queryL10FinalAuditBySubject(
  subject_id: string,
): readonly L10FinalAuditRecord[] {
  return auditLog.filter(r => r.subject_id === subject_id);
}

export function queryL10FinalAuditBySeverity(
  severity: L10FinalAuditSeverity,
): readonly L10FinalAuditRecord[] {
  return auditLog.filter(r => r.severity === severity);
}

export function clearL10FinalAuditLog(): void {
  auditLog.length = 0;
  sequence = 0;
}
