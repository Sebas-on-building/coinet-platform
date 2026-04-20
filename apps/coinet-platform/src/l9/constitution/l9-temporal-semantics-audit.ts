/**
 * L9.5 — Temporal Semantics Audit
 *
 * §9.5.12.2 — Aggregates `L9TemporalSemanticViolation` records produced
 * by every L9.5 validator (surface, window, lead-lag, phase, change
 * point, decay, post-event, interaction) into a single deterministic
 * audit report.
 */

import {
  ALL_L9_TEMPORAL_SEMANTIC_TIERS,
  L9TemporalSemanticTier,
} from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
} from '../validation/l9-temporal-semantic-violation-codes';

export enum L9TemporalSemanticSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * §9.5.12.2 — Severity map. Codes that break determinism, collapse
 * time surfaces, or silently launder causality/ambiguity are CRITICAL;
 * weak-but-recoverable narrowings are WARNING.
 */
const CRITICAL_CODES: ReadonlySet<L9TemporalSemanticViolationCode> = new Set([
  L9TemporalSemanticViolationCode.TS_AS_OF_COLLAPSED_TO_OBSERVED,
  L9TemporalSemanticViolationCode
    .TS_OBSERVED_EQUALS_INGESTED_WITHOUT_ANCHOR,
  L9TemporalSemanticViolationCode.TS_AS_OF_MISSING,
  L9TemporalSemanticViolationCode.TS_MARKET_VS_SYSTEM_TIME_CONFUSION,

  L9TemporalSemanticViolationCode.LL_CAUSAL_INFERENCE_LAUNDERED,
  L9TemporalSemanticViolationCode.LL_DECISIVE_CONTRADICTION_NOT_VOIDED,

  L9TemporalSemanticViolationCode.PHASE_TRANSITION_ILLEGAL,
  L9TemporalSemanticViolationCode.PHASE_AMBIGUITY_COLLAPSED,

  L9TemporalSemanticViolationCode.CP_MISSING_EVENT_ANCHOR,
  L9TemporalSemanticViolationCode.CP_MISSING_PRIOR_POSTURE,
  L9TemporalSemanticViolationCode.CP_MISSING_NEXT_POSTURE,

  L9TemporalSemanticViolationCode
    .DECAY_RECOVERY_CLAIM_WHILE_SHOCK_DOMINANT,
  L9TemporalSemanticViolationCode.DECAY_STALENESS_SUBSTITUTED,

  L9TemporalSemanticViolationCode.PE_ANCHOR_MISSING,
  L9TemporalSemanticViolationCode.PE_LIFECYCLE_TRANSITION_ILLEGAL,
  L9TemporalSemanticViolationCode.PE_EXPIRED_WINDOW_AS_GOVERNOR,

  L9TemporalSemanticViolationCode.IX_PHASE_JUMP_WITHOUT_CHANGE_POINT,
  L9TemporalSemanticViolationCode
    .IX_REACCUMULATION_WHILE_SHOCK_ACTIVE,
  L9TemporalSemanticViolationCode
    .IX_DIGESTION_WITHOUT_POST_EVENT_ANCHOR,
  L9TemporalSemanticViolationCode
    .IX_AMBIGUITY_HIDDEN_UNDER_CLEAN_OUTPUT,
  L9TemporalSemanticViolationCode.IX_CONTRADICTION_DOES_NOT_VOID_LAG,
]);

const WARNING_CODES: ReadonlySet<L9TemporalSemanticViolationCode> = new Set([
  L9TemporalSemanticViolationCode.LL_LATE_MARKED_AS_EARLY_CONFIRMATION,
  L9TemporalSemanticViolationCode.CP_SEVERITY_BELOW_MATERIALITY,
  L9TemporalSemanticViolationCode.CP_NOISE_MASQUERADING_AS_BREAK,
  L9TemporalSemanticViolationCode.DECAY_DOMINANCE_CLASS_MISMATCH,
  L9TemporalSemanticViolationCode.DECAY_FRESH_CLASS_WITH_HIGH_CONTRADICTION,
  L9TemporalSemanticViolationCode.WIN_LATE_DATA_FLAG_MISMATCH,
]);

export function classifyL9TemporalSemanticSeverity(
  code: L9TemporalSemanticViolationCode,
): L9TemporalSemanticSeverity {
  if (CRITICAL_CODES.has(code)) return L9TemporalSemanticSeverity.CRITICAL;
  if (WARNING_CODES.has(code)) return L9TemporalSemanticSeverity.WARNING;
  return L9TemporalSemanticSeverity.ERROR;
}

export interface L9TemporalSemanticAuditReport {
  readonly total: number;
  readonly by_code: Readonly<Record<string, number>>;
  readonly by_tier: Readonly<Record<L9TemporalSemanticTier, number>>;
  readonly highest_severity: L9TemporalSemanticSeverity;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

/**
 * §9.5.12.2 — Aggregate an L9.5 audit report. Deterministic in
 * violation order (preserves the caller's sequencing) so replay
 * produces identical reports.
 */
export function buildL9TemporalSemanticsAudit(
  violations: readonly L9TemporalSemanticViolation[],
): L9TemporalSemanticAuditReport {
  const byCode: Record<string, number> = {};
  const byTier: Record<L9TemporalSemanticTier, number> = Object.fromEntries(
    ALL_L9_TEMPORAL_SEMANTIC_TIERS.map(t => [t, 0]),
  ) as Record<L9TemporalSemanticTier, number>;

  const severityOrder: Record<L9TemporalSemanticSeverity, number> = {
    INFO: 0, WARNING: 1, ERROR: 2, CRITICAL: 3,
  };
  let worst = L9TemporalSemanticSeverity.INFO;

  for (const v of violations) {
    byCode[v.code] = (byCode[v.code] ?? 0) + 1;
    byTier[v.tier] = (byTier[v.tier] ?? 0) + 1;
    const sev = classifyL9TemporalSemanticSeverity(v.code);
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

/** §9.5.12.2 — Does the audit contain any blocking (ERROR/CRITICAL) violations? */
export function hasL9TemporalSemanticBlockingViolations(
  report: L9TemporalSemanticAuditReport,
): boolean {
  return report.highest_severity === L9TemporalSemanticSeverity.CRITICAL ||
         report.highest_severity === L9TemporalSemanticSeverity.ERROR;
}
