/**
 * L10.5 — Evidence-Semantics Audit
 *
 * §10.5.10 — Deterministic audit log for L10.5 evidence-semantics
 * violations. Disjoint from L10.1/L10.2/L10.3/L10.4 audits so the
 * severity of a rejection remains unambiguous about which semantic
 * tier produced it.
 */

import {
  L10EvidenceSemanticValidationReport,
  L10EvidenceSemanticViolationCode,
} from '../validation/l10-evidence-semantics-violation-codes';

export enum L10EvidenceSemanticAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface L10EvidenceSemanticAuditRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly surface: L10EvidenceSemanticSurface;
  readonly objectId: string;
  readonly code: L10EvidenceSemanticViolationCode;
  readonly severity: L10EvidenceSemanticAuditSeverity;
  readonly message: string;
}

export enum L10EvidenceSemanticSurface {
  SUPPORT = 'SUPPORT',
  CONTRADICTION = 'CONTRADICTION',
  CONFIRMATION = 'CONFIRMATION',
  INVALIDATION = 'INVALIDATION',
  SHIFT_CONDITION = 'SHIFT_CONDITION',
  INTERACTION = 'INTERACTION',
  POSTURE = 'POSTURE',
}

/**
 * §10.5.10 — Severity classification.
 *
 * CRITICAL: semantic masquerade, netting, single-story flattening —
 *   the set of codes that, if tolerated, would make Layer 10 an
 *   untrustworthy persuasion engine.
 * HIGH:     structural omissions (missing role, missing presence,
 *   missing anchor, missing driver, missing threshold).
 * WARNING:  out-of-range numeric scores.
 * INFO:     anything that slipped through the classifier.
 */
const CRITICAL_CODES: ReadonlySet<L10EvidenceSemanticViolationCode> = new Set<
  L10EvidenceSemanticViolationCode
>([
  L10EvidenceSemanticViolationCode.CONTRADICTION_NETTED_INTO_CONFIDENCE,
  L10EvidenceSemanticViolationCode.CONTRADICTION_BLOCKING_MISLABELED_AS_NARROWING,
  L10EvidenceSemanticViolationCode.CONTRADICTION_ACTIVE_MISLABELED_AS_DECAYED,
  L10EvidenceSemanticViolationCode.CONFIRMATION_MISSING_HIDDEN,
  L10EvidenceSemanticViolationCode.CONFIRMATION_PRIMARY_WITH_MISSING_UPGRADES,
  L10EvidenceSemanticViolationCode.INVALIDATION_ACTIVE_HIDDEN_IN_POTENTIAL,
  L10EvidenceSemanticViolationCode.INVALIDATION_PRIMARY_STABLE_UNDER_ACTIVE,
  L10EvidenceSemanticViolationCode.SHIFT_CONDITION_STATIC_RANKING_WITH_LIVE_COMPETITION,
  L10EvidenceSemanticViolationCode.SHIFT_CONDITION_COLLAPSE_ABSENT_WITH_ACTIVE_INVALIDATION,
  L10EvidenceSemanticViolationCode.SUPPORT_STALE_PRESENTED_AS_CLEAN,
  L10EvidenceSemanticViolationCode.SUPPORT_DEGRADED_PRESENTED_AS_CLEAN,
  L10EvidenceSemanticViolationCode.POSTURE_STALE_TREATED_AS_CURRENT,
  L10EvidenceSemanticViolationCode.POSTURE_DECAYED_TREATED_AS_ACTIVE,
  L10EvidenceSemanticViolationCode.POSTURE_DEGRADED_TREATED_AS_FULL,
  L10EvidenceSemanticViolationCode.INTERACTION_NETTED_SUPPORT_MINUS_CONTRADICTION,
  L10EvidenceSemanticViolationCode.INTERACTION_FLATTENED_INTO_SINGLE_STORY,
  L10EvidenceSemanticViolationCode.INTERACTION_SEMANTIC_ORDER_VIOLATED,
  L10EvidenceSemanticViolationCode.INTERACTION_FRAGILE_CANDIDATE_MARKED_STABLE,
  L10EvidenceSemanticViolationCode.INTERACTION_CONFIDENCE_UNCAPPED_UNDER_ACTIVE_INVALIDATION,
]);

const WARNING_CODES: ReadonlySet<L10EvidenceSemanticViolationCode> = new Set<
  L10EvidenceSemanticViolationCode
>([
  L10EvidenceSemanticViolationCode.SUPPORT_STRENGTH_OUT_OF_RANGE,
  L10EvidenceSemanticViolationCode.CONTRADICTION_PRESSURE_OUT_OF_RANGE,
  L10EvidenceSemanticViolationCode.INVALIDATION_THRESHOLD_OUT_OF_RANGE,
]);

export function classifyL10EvidenceSemanticSeverity(
  code: L10EvidenceSemanticViolationCode,
): L10EvidenceSemanticAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L10EvidenceSemanticAuditSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L10EvidenceSemanticAuditSeverity.WARNING;
  const s = code.toString();
  if (s.includes('MISSING') || s.includes('OMITTED') || s.includes('DISALLOWED')) {
    return L10EvidenceSemanticAuditSeverity.HIGH;
  }
  if (s.includes('UNREGISTERED')) return L10EvidenceSemanticAuditSeverity.HIGH;
  return L10EvidenceSemanticAuditSeverity.INFO;
}

const log: L10EvidenceSemanticAuditRecord[] = [];

export function emitL10EvidenceSemanticsAudit(
  surface: L10EvidenceSemanticSurface,
  objectId: string,
  report: L10EvidenceSemanticValidationReport,
): readonly L10EvidenceSemanticAuditRecord[] {
  const emitted: L10EvidenceSemanticAuditRecord[] = [];
  for (const issue of report.issues) {
    const rec: L10EvidenceSemanticAuditRecord = {
      id: `audit_l10e_${log.length + 1}`,
      timestamp: new Date(0).toISOString(),
      surface,
      objectId,
      code: issue.code,
      severity: classifyL10EvidenceSemanticSeverity(issue.code),
      message: issue.message,
    };
    log.push(rec);
    emitted.push(rec);
  }
  return emitted;
}

export function getL10EvidenceSemanticsAuditLog(): readonly L10EvidenceSemanticAuditRecord[] {
  return log.slice();
}

export function clearL10EvidenceSemanticsAuditLog(): void {
  log.length = 0;
}

export function filterL10EvidenceSemanticsAuditBySeverity(
  s: L10EvidenceSemanticAuditSeverity,
): readonly L10EvidenceSemanticAuditRecord[] {
  return log.filter(r => r.severity === s);
}

export function hasL10EvidenceSemanticsBlockingViolations(
  records: readonly L10EvidenceSemanticAuditRecord[],
): boolean {
  return records.some(
    r =>
      r.severity === L10EvidenceSemanticAuditSeverity.CRITICAL ||
      r.severity === L10EvidenceSemanticAuditSeverity.HIGH,
  );
}
