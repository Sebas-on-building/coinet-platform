/**
 * L9.6 — Family / Template Audit
 *
 * §9.6.14.1 — Aggregates `L9FamilyViolation` records produced by every
 * L9.6 validator (family-definition, template-definition, rollout,
 * state-legality) into a single deterministic audit report.
 *
 * INV-9.6-F / INV-9.6-G — audit emission is deterministic (counts and
 * order are stable) and never leaks judgment/recommendation surfaces.
 */

import {
  ALL_L9_FAMILY_VIOLATION_TIERS,
  L9FamilyViolation,
  L9FamilyViolationCode,
  L9FamilyViolationTier,
} from '../validation/l9-family-violation-codes';

export enum L9FamilyAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * §9.6.14.1 — CRITICAL: codes that break family/template law
 * structurally (no family, clean claimed under blocker, leakage).
 */
const CRITICAL_CODES: ReadonlySet<L9FamilyViolationCode> = new Set([
  L9FamilyViolationCode.FAM_UNREGISTERED,
  L9FamilyViolationCode.FAM_PRIMARY_TAXONOMY_MISSING,
  L9FamilyViolationCode.FAM_PRIMARY_TAXONOMY_INVALID,
  L9FamilyViolationCode.FAM_STATE_OWNERSHIP_EMPTY,
  L9FamilyViolationCode.FAM_TEMPLATE_DUPLICATE_ACROSS_FAMILIES,
  L9FamilyViolationCode.FAM_LEAKAGE_JUDGMENT,

  L9FamilyViolationCode.TPL_FAMILY_MISMATCH,
  L9FamilyViolationCode.TPL_PRIMARY_STATE_NOT_OWNED,
  L9FamilyViolationCode.TPL_CHALLENGE_DOMAINS_EMPTY,
  L9FamilyViolationCode.TPL_SUPPORT_DOMAINS_EMPTY,
  L9FamilyViolationCode.TPL_LEAKAGE_JUDGMENT,

  L9FamilyViolationCode.ROLL_PHASE_ORDER_VIOLATED,
  L9FamilyViolationCode.ROLL_FAMILY_STATE_COLLISION,

  L9FamilyViolationCode.STATE_NOT_OWNED_BY_FAMILY,
  L9FamilyViolationCode.STATE_BLOCKER_PRESENT_CLEAN_CLAIMED,
  L9FamilyViolationCode.STATE_ACTIVE_SHOCK_BLOCKS_CLEAN,
  L9FamilyViolationCode.STATE_POST_EVENT_ANCHOR_MISSING,
  L9FamilyViolationCode.STATE_CAUSAL_LEAK,
]);

/**
 * §9.6.14.1 — WARNING: narrowing/coverage variants that don't break
 * law structurally but should be tracked.
 */
const WARNING_CODES: ReadonlySet<L9FamilyViolationCode> = new Set([
  L9FamilyViolationCode.TPL_ROLLOUT_PRIORITY_MISMATCH,
  L9FamilyViolationCode.TPL_CLEAN_COMPLETENESS_OUT_OF_RANGE,
  L9FamilyViolationCode.TPL_CLEAN_SUPPORT_COVERAGE_OUT_OF_RANGE,
  L9FamilyViolationCode.STATE_SUPPORT_COVERAGE_BELOW_MINIMUM,
  L9FamilyViolationCode.STATE_COMPLETENESS_BELOW_MINIMUM,
]);

export function classifyL9FamilyAuditSeverity(
  code: L9FamilyViolationCode,
): L9FamilyAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L9FamilyAuditSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L9FamilyAuditSeverity.WARNING;
  return L9FamilyAuditSeverity.ERROR;
}

export interface L9FamilyAuditReport {
  readonly total: number;
  readonly by_code: Readonly<Record<string, number>>;
  readonly by_tier: Readonly<Record<L9FamilyViolationTier, number>>;
  readonly highest_severity: L9FamilyAuditSeverity;
  readonly violations: readonly L9FamilyViolation[];
}

export function buildL9FamilyAudit(
  violations: readonly L9FamilyViolation[],
): L9FamilyAuditReport {
  const byCode: Record<string, number> = {};
  const byTier: Record<L9FamilyViolationTier, number> = Object.fromEntries(
    ALL_L9_FAMILY_VIOLATION_TIERS.map(t => [t, 0]),
  ) as Record<L9FamilyViolationTier, number>;

  const severityOrder: Record<L9FamilyAuditSeverity, number> = {
    INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3,
  };
  let worst = L9FamilyAuditSeverity.INFO;

  for (const v of violations) {
    byCode[v.code] = (byCode[v.code] ?? 0) + 1;
    byTier[v.tier] = (byTier[v.tier] ?? 0) + 1;
    const sev = classifyL9FamilyAuditSeverity(v.code);
    if (severityOrder[sev] > severityOrder[worst]) worst = sev;
  }

  return {
    total: violations.length,
    by_code: byCode,
    by_tier: byTier,
    highest_severity: worst,
    violations: [...violations],
  };
}

export function hasL9FamilyBlockingViolations(
  report: L9FamilyAuditReport,
): boolean {
  return (
    report.highest_severity === L9FamilyAuditSeverity.CRITICAL ||
    report.highest_severity === L9FamilyAuditSeverity.ERROR
  );
}
