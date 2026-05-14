/**
 * L12.5 — Template / strength / confidence / spread / readiness audit (§12.5.21).
 *
 * Deterministic audit trail for L12T_* violations.
 *
 * Severity mapping per §12.5.21:
 *   CRITICAL — production template missing trigger/invalidation, confidence
 *              uncapped under active invalidation, incomplete L11 score
 *              context, prediction theater / recommendation / judgment / trade
 *              leak, blocking invalidation with clean readiness, blocking
 *              invalidation not blocked, certainty language.
 *   ERROR    — clear primary under invalidation, decisive trigger with weak
 *              evidence, narrow spread without shift conditions, capped >
 *              pre-cap, dominant cap reason missing, etc.
 *   WARNING  — soft posture flags (reserved, none currently mapped).
 */

import {
  L12TemplateViolationCode,
  L12TemplateViolationIssue,
} from '../validation/l12-template-violation-codes';

export enum L12TemplateAuditSubjectClass {
  TEMPLATE = 'TEMPLATE',
  TEMPLATE_REGISTRY = 'TEMPLATE_REGISTRY',
  TEMPLATE_EVALUATION = 'TEMPLATE_EVALUATION',
  TRIGGER_STRENGTH = 'TRIGGER_STRENGTH',
  INVALIDATION_STRENGTH = 'INVALIDATION_STRENGTH',
  TRIGGER_INVALIDATION_INTERACTION = 'TRIGGER_INVALIDATION_INTERACTION',
  PATH_CONFIDENCE_POLICY = 'PATH_CONFIDENCE_POLICY',
  CONFIDENCE_CAP_CHAIN = 'CONFIDENCE_CAP_CHAIN',
  SCENARIO_SPREAD = 'SCENARIO_SPREAD',
  READINESS = 'READINESS',
  INVARIANT = 'INVARIANT',
}

export const ALL_L12_TEMPLATE_AUDIT_SUBJECT_CLASSES: readonly L12TemplateAuditSubjectClass[] =
  Object.values(L12TemplateAuditSubjectClass);

export type L12TemplateAuditSeverity = 'CRITICAL' | 'ERROR' | 'WARNING';

const CRITICAL_CODES: ReadonlySet<L12TemplateViolationCode> = new Set([
  L12TemplateViolationCode.L12T_TEMPLATE_TRIGGER_PATTERN_MISSING,
  L12TemplateViolationCode.L12T_TEMPLATE_INVALIDATION_PATTERN_MISSING,
  L12TemplateViolationCode.L12T_TEMPLATE_SCORE_CONTEXT_REQUIREMENT_MISSING,
  L12TemplateViolationCode.L12T_PRODUCTION_TEMPLATE_WITHOUT_EVIDENCE_CLASSES,
  L12TemplateViolationCode.L12T_TEMPLATE_RESERVED_EMITS_PRODUCTION,
  L12TemplateViolationCode.L12T_TEMPLATE_DUPLICATE_ID,
  L12TemplateViolationCode.L12T_TEMPLATE_POLICY_REF_MISSING,
  L12TemplateViolationCode.L12T_ACTIVE_INVALIDATION_WITHOUT_CONFIDENCE_CAP,
  L12TemplateViolationCode.L12T_BLOCKING_INVALIDATION_WITH_CLEAN_READINESS,
  L12TemplateViolationCode.L12T_BLOCKING_INVALIDATION_NOT_BLOCKED,
  L12TemplateViolationCode.L12T_INCOMPLETE_SCORE_CONTEXT_NOT_BLOCKED,
  L12TemplateViolationCode.L12T_INVALIDATION_GUARANTEED_FAILURE,
  L12TemplateViolationCode.L12T_INVALIDATION_UNMONITORABLE_USED_AS_PROTECTION,
  L12TemplateViolationCode.L12T_TRIGGER_GUARANTEED_OUTCOME,
  L12TemplateViolationCode.L12T_TRIGGER_AS_TRADE_INSTRUCTION,
  L12TemplateViolationCode.L12T_TRIGGER_OVERRIDES_BLOCKING_INVALIDATION,
  L12TemplateViolationCode.L12T_INTERACTION_TRIGGER_DOMINANT_UNDER_BLOCKING,
  L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_ACTIVE_INVALIDATION,
  L12TemplateViolationCode.L12T_CLEAN_READINESS_WITH_MISSING_TRIGGER,
  L12TemplateViolationCode.L12T_CLEAN_READINESS_WITH_MISSING_INVALIDATION,
  L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_MATERIAL_DRIFT,
  L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_INCOMPLETE_SCORE_CONTEXT,
  L12TemplateViolationCode.L12T_CLEAN_READINESS_UNDER_UNRESOLVED_MULTI_PATH,
  L12TemplateViolationCode.L12T_PREDICTION_THEATER,
  L12TemplateViolationCode.L12T_RECOMMENDATION_LEAK,
  L12TemplateViolationCode.L12T_JUDGMENT_LEAK,
  L12TemplateViolationCode.L12T_TRADE_LEAK,
  L12TemplateViolationCode.L12T_CERTAINTY_LANGUAGE,
]);

const WARNING_CODES: ReadonlySet<L12TemplateViolationCode> = new Set<L12TemplateViolationCode>([
  // Reserved — currently empty; soft posture mappings will land here.
]);

export function severityForL12TemplateViolationCode(
  code: L12TemplateViolationCode,
): L12TemplateAuditSeverity {
  if (CRITICAL_CODES.has(code)) return 'CRITICAL';
  if (WARNING_CODES.has(code)) return 'WARNING';
  return 'ERROR';
}

export interface L12TemplateAuditRecord {
  readonly audit_id: string;
  readonly subject_class: L12TemplateAuditSubjectClass;
  readonly violation_code: L12TemplateViolationCode;
  readonly severity: L12TemplateAuditSeverity;
  readonly subject_ref?: string;
  readonly detail: string;
  readonly emitted_at: string;
  readonly source: string;
}

const AUDIT_LOG: L12TemplateAuditRecord[] = [];
let SEQ = 0;

function nextAuditId(): string {
  SEQ += 1;
  return `l12.template_audit.${String(SEQ).padStart(8, '0')}`;
}

export function makeL12TemplateAuditRecord(
  subjectClass: L12TemplateAuditSubjectClass,
  source: string,
  issue: L12TemplateViolationIssue,
): L12TemplateAuditRecord {
  const rec: L12TemplateAuditRecord = {
    audit_id: nextAuditId(),
    subject_class: subjectClass,
    violation_code: issue.code,
    severity: severityForL12TemplateViolationCode(issue.code),
    subject_ref: issue.subject_ref,
    detail: issue.message,
    emitted_at: new Date().toISOString(),
    source,
  };
  AUDIT_LOG.push(rec);
  return rec;
}

export function emitL12TemplateAuditRecords(
  subjectClass: L12TemplateAuditSubjectClass,
  source: string,
  issues: readonly L12TemplateViolationIssue[],
): readonly L12TemplateAuditRecord[] {
  return issues.map(i => makeL12TemplateAuditRecord(subjectClass, source, i));
}

export function getL12TemplateAuditLog(): readonly L12TemplateAuditRecord[] {
  return [...AUDIT_LOG];
}

export function resetL12TemplateAuditLog(): void {
  AUDIT_LOG.length = 0;
  SEQ = 0;
}

export function getL12TemplateViolationCount(): number {
  return AUDIT_LOG.length;
}

export function hasAnyL12TemplateViolations(): boolean {
  return AUDIT_LOG.length > 0;
}

export function getL12TemplateCriticalViolations(): readonly L12TemplateAuditRecord[] {
  return AUDIT_LOG.filter(r => r.severity === 'CRITICAL');
}

export function getL12TemplateViolationsBySubjectClass(
  cls: L12TemplateAuditSubjectClass,
): readonly L12TemplateAuditRecord[] {
  return AUDIT_LOG.filter(r => r.subject_class === cls);
}

export function getL12TemplateViolationsByCode(
  code: L12TemplateViolationCode,
): readonly L12TemplateAuditRecord[] {
  return AUDIT_LOG.filter(r => r.violation_code === code);
}
