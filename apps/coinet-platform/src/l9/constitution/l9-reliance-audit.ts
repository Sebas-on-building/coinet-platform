/**
 * L9.7 — Reliance Audit
 *
 * §9.7.11 — Aggregates `L9SequenceRelianceViolation` records produced
 * by every L9.7 validator (confidence, cap-chain, restriction, causal,
 * reliance-profile) into a single deterministic audit report.
 *
 * INV-9.7-E / INV-9.7-G — audit emission is deterministic (counts and
 * order are stable) and never leaks judgment or final-environment
 * surfaces.
 */

import {
  ALL_L9_SEQUENCE_RELIANCE_VIOLATION_TIERS,
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
} from '../validation/l9-reliance-violation-codes';

export enum L9RelianceAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * §9.7.11.1 — CRITICAL: codes that structurally break reliance law:
 * widening of caps, causal language detected, final judgment emitted
 * under a BLOCKED_CAUSAL_LANGUAGE restraint, score-driving rights
 * present alongside EVIDENCE_ONLY, regime override attempts.
 */
const CRITICAL_CODES: ReadonlySet<L9SequenceRelianceViolationCode> = new Set([
  L9SequenceRelianceViolationCode.CAP_WIDENING_ATTEMPTED,
  L9SequenceRelianceViolationCode.CAP_POST_CAP_EXCEEDS_PRE_CAP,
  L9SequenceRelianceViolationCode.CAP_POST_CAP_EXCEEDS_CEILING,
  L9SequenceRelianceViolationCode.CAP_REQUIRED_CAP_MISSING,

  L9SequenceRelianceViolationCode.CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND,
  L9SequenceRelianceViolationCode.CONF_CAPPED_GT_RAW,

  L9SequenceRelianceViolationCode.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY,
  L9SequenceRelianceViolationCode.RESTR_BROADER_THAN_STATE,
  L9SequenceRelianceViolationCode.RESTR_IGNORES_CAUSAL_RESTRAINT,
  L9SequenceRelianceViolationCode.RESTR_BLOCKED_RIGHT_STILL_GRANTED,

  L9SequenceRelianceViolationCode.CAUSAL_LANGUAGE_DETECTED,
  L9SequenceRelianceViolationCode.CAUSAL_FINAL_JUDGMENT_UNDER_BLOCKED,
  L9SequenceRelianceViolationCode.CAUSAL_FINAL_JUDGMENT_UNDER_STRICT,

  L9SequenceRelianceViolationCode.REL_READINESS_INCONSISTENT,

  L9SequenceRelianceViolationCode.REGIME_LOCAL_IMPERSONATES_FINAL,
  L9SequenceRelianceViolationCode.REGIME_OVERRIDE_ATTEMPTED,
]);

/**
 * §9.7.11.1 — WARNING: narrowing/coverage variants that don't break
 * reliance law structurally but should be tracked.
 */
const WARNING_CODES: ReadonlySet<L9SequenceRelianceViolationCode> = new Set([
  L9SequenceRelianceViolationCode.RESTR_IGNORES_CONTRADICTION_DISCLOSURE,
  L9SequenceRelianceViolationCode.RESTR_ADDITIONAL_CONFIRMATION_IGNORED,
  L9SequenceRelianceViolationCode.CAUSAL_RATIONALE_EMPTY,
]);

export function classifyL9RelianceAuditSeverity(
  code: L9SequenceRelianceViolationCode,
): L9RelianceAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L9RelianceAuditSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L9RelianceAuditSeverity.WARNING;
  return L9RelianceAuditSeverity.ERROR;
}

export interface L9RelianceAuditReport {
  readonly total: number;
  readonly by_code: Readonly<Record<string, number>>;
  readonly by_tier: Readonly<Record<L9SequenceRelianceViolationTier, number>>;
  readonly highest_severity: L9RelianceAuditSeverity;
  readonly violations: readonly L9SequenceRelianceViolation[];
}

export function buildL9RelianceAudit(
  violations: readonly L9SequenceRelianceViolation[],
): L9RelianceAuditReport {
  const byCode: Record<string, number> = {};
  const byTier: Record<L9SequenceRelianceViolationTier, number> =
    Object.fromEntries(
      ALL_L9_SEQUENCE_RELIANCE_VIOLATION_TIERS.map(t => [t, 0]),
    ) as Record<L9SequenceRelianceViolationTier, number>;

  const severityOrder: Record<L9RelianceAuditSeverity, number> = {
    INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3,
  };
  let worst = L9RelianceAuditSeverity.INFO;

  for (const v of violations) {
    byCode[v.code] = (byCode[v.code] ?? 0) + 1;
    byTier[v.tier] = (byTier[v.tier] ?? 0) + 1;
    const sev = classifyL9RelianceAuditSeverity(v.code);
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

export function hasL9RelianceBlockingViolations(
  report: L9RelianceAuditReport,
): boolean {
  return (
    report.highest_severity === L9RelianceAuditSeverity.CRITICAL ||
    report.highest_severity === L9RelianceAuditSeverity.ERROR
  );
}
