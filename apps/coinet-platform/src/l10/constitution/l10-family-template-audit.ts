/**
 * L10.6 — Family / Template Audit
 *
 * §10.6.15 — Deterministic audit log for L10.6 family / template /
 * rollout / state-legality violations. Disjoint from L10.1–L10.5
 * audits so the severity of a rejection remains unambiguous about
 * which tier produced it (`L10F_*` vs `L10E_*` vs `L10R_*` vs …).
 *
 * Consumed by:
 *   - L10.6 invariants runner (Phase E)
 *   - L10.6 certification band (Phase F)
 *   - L9.9 master certification (bubbles L10.6 readiness upward)
 */

import {
  L10FamilyValidationIssue,
  L10FamilyValidationReport,
  L10FamilyViolationCode,
  L10HypothesisFamilyId,
  L10HypothesisTemplateId,
  L10TemplateLegalityClass,
  L10_FAMILY_BLOCKING_CODES,
  L10_FAMILY_INVALID_CODES,
  L10_FAMILY_NARROWING_CODES,
} from '../contracts/hypothesis-template-policy';

export enum L10FamilyAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum L10FamilyAuditSurface {
  FAMILY_DEFINITION = 'FAMILY_DEFINITION',
  TEMPLATE_DEFINITION = 'TEMPLATE_DEFINITION',
  ROLLOUT_STATE = 'ROLLOUT_STATE',
  STATE_LEGALITY = 'STATE_LEGALITY',
  INTERACTION = 'INTERACTION',
}

export interface L10FamilyAuditRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly surface: L10FamilyAuditSurface;
  readonly severity: L10FamilyAuditSeverity;
  readonly code: L10FamilyViolationCode;
  readonly message: string;
  readonly family_id?: L10HypothesisFamilyId;
  readonly template_id?: L10HypothesisTemplateId;
  readonly legality: L10TemplateLegalityClass;
}

/**
 * §10.6.15 — Severity classification.
 *
 * CRITICAL: blocking codes (BLOCKED legality) — family/template leaks
 *   or blocker-condition violations that would let a persuasion
 *   engine emit under an explicit forbid condition.
 * HIGH:     definition-level malformations (INVALID legality).
 * WARNING:  narrowing conditions (NARROWED legality) and
 *   unsupported / rollout-not-ready conditions (UNSUPPORTED).
 * INFO:     anything that did not match a classification.
 */
const CRITICAL_CODES: ReadonlySet<L10FamilyViolationCode> = new Set(
  L10_FAMILY_BLOCKING_CODES,
);
const HIGH_CODES: ReadonlySet<L10FamilyViolationCode> = new Set(
  L10_FAMILY_INVALID_CODES,
);
const WARNING_CODES: ReadonlySet<L10FamilyViolationCode> = new Set(
  L10_FAMILY_NARROWING_CODES,
);

export function classifyL10FamilyAuditSeverity(
  code: L10FamilyViolationCode,
): L10FamilyAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L10FamilyAuditSeverity.CRITICAL;
  if (HIGH_CODES.has(code)) return L10FamilyAuditSeverity.HIGH;
  if (WARNING_CODES.has(code)) return L10FamilyAuditSeverity.WARNING;
  return L10FamilyAuditSeverity.INFO;
}

export interface L10FamilyAuditInput {
  readonly surface: L10FamilyAuditSurface;
  readonly report: L10FamilyValidationReport;
  readonly clock?: () => string;
  readonly id_prefix?: string;
}

export function buildL10FamilyAuditRecords(
  input: L10FamilyAuditInput,
): readonly L10FamilyAuditRecord[] {
  const clock = input.clock ?? (() => new Date().toISOString());
  const prefix = input.id_prefix ?? 'l10f';
  return input.report.issues.map((issue, idx) =>
    recordFromIssue(issue, input.surface, clock, prefix, idx, input.report.legality),
  );
}

function recordFromIssue(
  issue: L10FamilyValidationIssue,
  surface: L10FamilyAuditSurface,
  clock: () => string,
  prefix: string,
  idx: number,
  legality: L10TemplateLegalityClass,
): L10FamilyAuditRecord {
  return {
    id: `${prefix}-${idx.toString().padStart(4, '0')}`,
    timestamp: clock(),
    surface,
    severity: classifyL10FamilyAuditSeverity(issue.code),
    code: issue.code,
    message: issue.message,
    family_id: issue.family_id,
    template_id: issue.template_id,
    legality,
  };
}

/**
 * §10.6.15 — Summarise an audit batch. Used by the invariants runner
 * and by the certification band to assert that an L10.6 green
 * pipeline emits zero records.
 */
export interface L10FamilyAuditSummary {
  readonly total: number;
  readonly by_severity: Record<L10FamilyAuditSeverity, number>;
  readonly by_legality: Record<L10TemplateLegalityClass, number>;
  readonly all_clean: boolean;
}

export function summariseL10FamilyAudit(
  records: readonly L10FamilyAuditRecord[],
): L10FamilyAuditSummary {
  const by_severity: Record<L10FamilyAuditSeverity, number> = {
    [L10FamilyAuditSeverity.INFO]: 0,
    [L10FamilyAuditSeverity.WARNING]: 0,
    [L10FamilyAuditSeverity.HIGH]: 0,
    [L10FamilyAuditSeverity.CRITICAL]: 0,
  };
  const by_legality: Record<L10TemplateLegalityClass, number> = {
    [L10TemplateLegalityClass.CLEAN]: 0,
    [L10TemplateLegalityClass.NARROWED]: 0,
    [L10TemplateLegalityClass.BLOCKED]: 0,
    [L10TemplateLegalityClass.UNSUPPORTED]: 0,
    [L10TemplateLegalityClass.INVALID]: 0,
  };
  for (const r of records) {
    by_severity[r.severity]++;
    by_legality[r.legality]++;
  }
  return {
    total: records.length,
    by_severity,
    by_legality,
    all_clean: records.length === 0,
  };
}
