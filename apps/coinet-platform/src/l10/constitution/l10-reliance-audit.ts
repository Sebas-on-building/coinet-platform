/**
 * L10.7 — Reliance Audit
 *
 * §10.7.10.1 / §10.7.12.5 — Deterministic audit log for L10.7
 * reliance-governance violations. Disjoint from L10.1–L10.6 audits so
 * the severity of a rejection remains unambiguous about which tier
 * produced it (`L10REL_*` vs `L10F_*` vs `L10E_*` vs `L10R_*` vs …).
 *
 * Consumed by:
 *   - L10.7 invariants runner (Phase D)
 *   - L10.7 certification band (Phase E)
 *   - L9.9 master certification (bubbles L10.7 readiness upward)
 */

import {
  l10HypothesisRelianceViolationTier,
  L10HypothesisRelianceViolation,
  L10HypothesisRelianceViolationCode,
  L10HypothesisRelianceViolationTier,
} from '../validation/l10-reliance-violation-codes';

export enum L10RelianceAuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const ALL_L10_RELIANCE_AUDIT_SEVERITIES:
  readonly L10RelianceAuditSeverity[] =
    Object.values(L10RelianceAuditSeverity);

export enum L10RelianceAuditSurface {
  CONFIDENCE = 'CONFIDENCE',
  CAP_CHAIN = 'CAP_CHAIN',
  RESTRICTION = 'RESTRICTION',
  READINESS = 'READINESS',
  RELIANCE = 'RELIANCE',
  REGIME_INTERACTION = 'REGIME_INTERACTION',
  SEQUENCE_INTERACTION = 'SEQUENCE_INTERACTION',
}

export const ALL_L10_RELIANCE_AUDIT_SURFACES:
  readonly L10RelianceAuditSurface[] =
    Object.values(L10RelianceAuditSurface);

export interface L10RelianceAuditRecord {
  readonly id: string;
  readonly timestamp: string;
  readonly surface: L10RelianceAuditSurface;
  readonly severity: L10RelianceAuditSeverity;
  readonly code: L10HypothesisRelianceViolationCode;
  readonly tier: L10HypothesisRelianceViolationTier;
  readonly message: string;
  readonly offending_refs?: readonly string[];
}

// ──────────────────────────────────────────────────────────────────
// §10.7.12.5 — Severity classification.
//
// CRITICAL: structural guarantees: caps widening, tightest/dominant
//   inconsistency with post-cap, readiness STRONG under invalidation /
//   missing confirmations / narrow spread, restriction profile
//   missing, score-driving granted under UNRESOLVED / LOW band.
// HIGH:     missing required factor group, band ≠ derived, blocked
//   right still granted, readiness inconsistency with derived.
// WARNING:  narrowing-class issues that do not break invariants on
//   their own (e.g. missing narrowing note).
// INFO:     anything that did not match a classification.
// ──────────────────────────────────────────────────────────────────

const CRITICAL_CODES: ReadonlySet<L10HypothesisRelianceViolationCode> = new Set([
  L10HypothesisRelianceViolationCode.CAP_POST_CAP_EXCEEDS_CEILING,
  L10HypothesisRelianceViolationCode.CAP_POST_CAP_EXCEEDS_PRE_CAP,
  L10HypothesisRelianceViolationCode.CAP_WIDENING_ATTEMPTED,
  L10HypothesisRelianceViolationCode.CONF_CAPPED_GT_RAW,
  L10HypothesisRelianceViolationCode.CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND,
  L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_NARROW_SPREAD,
  L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_ACTIVE_INVALIDATION,
  L10HypothesisRelianceViolationCode.READ_STRONG_UNDER_MISSING_CONFIRMATIONS,
  L10HypothesisRelianceViolationCode.READ_BLOCKED_WHILE_BROAD_RIGHTS_GRANTED,
  L10HypothesisRelianceViolationCode.RESTR_PROFILE_MISSING,
  L10HypothesisRelianceViolationCode.RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY,
  L10HypothesisRelianceViolationCode.RESTR_FINAL_JUDGMENT_UNDER_UNRESOLVED,
  L10HypothesisRelianceViolationCode.RESTR_BROADER_THAN_STATE,
  L10HypothesisRelianceViolationCode.REL_PROFILE_MISSING,
  L10HypothesisRelianceViolationCode.REGIME_OVERRIDE_ATTEMPTED,
  L10HypothesisRelianceViolationCode.SEQUENCE_OVERRIDE_ATTEMPTED,
]);

const HIGH_CODES: ReadonlySet<L10HypothesisRelianceViolationCode> = new Set([
  L10HypothesisRelianceViolationCode.CONF_FACTOR_GROUP_MISSING,
  L10HypothesisRelianceViolationCode.CONF_BAND_INCONSISTENT_WITH_CAPPED,
  L10HypothesisRelianceViolationCode.CONF_FACTOR_RAW_OUT_OF_RANGE,
  L10HypothesisRelianceViolationCode.CONF_FACTOR_NORMALIZED_OUT_OF_RANGE,
  L10HypothesisRelianceViolationCode.CONF_RAW_SCORE_OUT_OF_RANGE,
  L10HypothesisRelianceViolationCode.CONF_CAPPED_SCORE_OUT_OF_RANGE,
  L10HypothesisRelianceViolationCode.CONF_PRIMARY_REF_MISSING,
  L10HypothesisRelianceViolationCode.CONF_REPLAY_HASH_MISSING,
  L10HypothesisRelianceViolationCode.CAP_PRECEDENCE_VIOLATED,
  L10HypothesisRelianceViolationCode.CAP_TIGHTEST_INCONSISTENT,
  L10HypothesisRelianceViolationCode.CAP_DOMINANT_INCONSISTENT,
  L10HypothesisRelianceViolationCode.CAP_EDGE_CEILING_MISMATCH,
  L10HypothesisRelianceViolationCode.CAP_EDGE_RANK_MISMATCH,
  L10HypothesisRelianceViolationCode.CAP_READINESS_HINT_INCONSISTENT,
  L10HypothesisRelianceViolationCode.CAP_REQUIRED_CAP_MISSING,
  L10HypothesisRelianceViolationCode.RESTR_BLOCKED_RIGHT_STILL_GRANTED,
  L10HypothesisRelianceViolationCode.RESTR_IGNORES_CONTRADICTION_DISCLOSURE,
  L10HypothesisRelianceViolationCode.RESTR_IGNORES_NARROW_SPREAD,
  L10HypothesisRelianceViolationCode.RESTR_ADDITIONAL_CONFIRMATION_IGNORED,
  L10HypothesisRelianceViolationCode.READ_INCONSISTENT_WITH_DERIVED,
  L10HypothesisRelianceViolationCode.READ_NARROWED_WITHOUT_CAUSE,
  L10HypothesisRelianceViolationCode.READ_UNRESOLVED_WITHOUT_COMPETITION,
  L10HypothesisRelianceViolationCode.REL_READINESS_INCONSISTENT,
  L10HypothesisRelianceViolationCode.REL_CONFIDENCE_MISMATCH,
  L10HypothesisRelianceViolationCode.REL_BAND_MISMATCH,
  L10HypothesisRelianceViolationCode.REL_CAP_CHAIN_MISMATCH,
  L10HypothesisRelianceViolationCode.REL_RESTRICTION_MISMATCH,
  L10HypothesisRelianceViolationCode.REL_SPREAD_MISMATCH,
  L10HypothesisRelianceViolationCode.REL_REPLAY_HASH_MISSING,
  L10HypothesisRelianceViolationCode.REL_POLICY_VERSION_MISMATCH,
  L10HypothesisRelianceViolationCode.REGIME_LOCAL_IMPERSONATES_FINAL,
  L10HypothesisRelianceViolationCode.SEQUENCE_LOCAL_IMPERSONATES_FINAL,
]);

const WARNING_CODES: ReadonlySet<L10HypothesisRelianceViolationCode> = new Set([
  L10HypothesisRelianceViolationCode.CONF_FACTOR_CLASS_UNREGISTERED,
  L10HypothesisRelianceViolationCode.CONF_FACTOR_EFFECT_UNREGISTERED,
  L10HypothesisRelianceViolationCode.CONF_FACTOR_ID_DUPLICATE,
  L10HypothesisRelianceViolationCode.CONF_FACTOR_POLICY_VERSION_MISSING,
  L10HypothesisRelianceViolationCode.CONF_SECONDARY_IMPLIED_WITHOUT_REF,
  L10HypothesisRelianceViolationCode.CAP_REASON_UNREGISTERED,
  L10HypothesisRelianceViolationCode.CAP_DUPLICATE_REASON,
  L10HypothesisRelianceViolationCode.RESTR_RIGHT_UNREGISTERED,
  L10HypothesisRelianceViolationCode.RESTR_BAND_UNREGISTERED,
  L10HypothesisRelianceViolationCode.READ_CLASS_UNREGISTERED,
]);

export function classifyL10RelianceAuditSeverity(
  code: L10HypothesisRelianceViolationCode,
): L10RelianceAuditSeverity {
  if (CRITICAL_CODES.has(code)) return L10RelianceAuditSeverity.CRITICAL;
  if (HIGH_CODES.has(code)) return L10RelianceAuditSeverity.HIGH;
  if (WARNING_CODES.has(code)) return L10RelianceAuditSeverity.WARNING;
  return L10RelianceAuditSeverity.INFO;
}

/**
 * §10.7.10.1 — Tier → audit surface mapping. Keeps the audit output
 * aligned with the validator families that raised the violation.
 */
export function l10RelianceAuditSurfaceForTier(
  tier: L10HypothesisRelianceViolationTier,
): L10RelianceAuditSurface {
  switch (tier) {
    case L10HypothesisRelianceViolationTier.CONFIDENCE:
      return L10RelianceAuditSurface.CONFIDENCE;
    case L10HypothesisRelianceViolationTier.CAP_CHAIN:
      return L10RelianceAuditSurface.CAP_CHAIN;
    case L10HypothesisRelianceViolationTier.RESTRICTION:
      return L10RelianceAuditSurface.RESTRICTION;
    case L10HypothesisRelianceViolationTier.READINESS:
      return L10RelianceAuditSurface.READINESS;
    case L10HypothesisRelianceViolationTier.REGIME:
      return L10RelianceAuditSurface.REGIME_INTERACTION;
    case L10HypothesisRelianceViolationTier.SEQUENCE:
      return L10RelianceAuditSurface.SEQUENCE_INTERACTION;
    case L10HypothesisRelianceViolationTier.RELIANCE:
    default:
      return L10RelianceAuditSurface.RELIANCE;
  }
}

export interface L10RelianceAuditInput {
  readonly violations: readonly L10HypothesisRelianceViolation[];
  readonly clock?: () => string;
  readonly id_prefix?: string;
}

export function buildL10RelianceAuditRecords(
  input: L10RelianceAuditInput,
): readonly L10RelianceAuditRecord[] {
  const clock = input.clock ?? (() => new Date().toISOString());
  const prefix = input.id_prefix ?? 'l10rel';
  return input.violations.map((violation, idx) => {
    const tier = violation.tier ?? l10HypothesisRelianceViolationTier(
      violation.code,
    );
    return {
      id: `${prefix}-${idx.toString().padStart(4, '0')}`,
      timestamp: clock(),
      surface: l10RelianceAuditSurfaceForTier(tier),
      severity: classifyL10RelianceAuditSeverity(violation.code),
      code: violation.code,
      tier,
      message: violation.detail,
      ...(violation.offending_refs
        ? { offending_refs: violation.offending_refs }
        : {}),
    };
  });
}

export interface L10RelianceAuditSummary {
  readonly total: number;
  readonly by_severity: Record<L10RelianceAuditSeverity, number>;
  readonly by_surface: Record<L10RelianceAuditSurface, number>;
  readonly all_clean: boolean;
}

export function summariseL10RelianceAudit(
  records: readonly L10RelianceAuditRecord[],
): L10RelianceAuditSummary {
  const by_severity: Record<L10RelianceAuditSeverity, number> = {
    [L10RelianceAuditSeverity.INFO]: 0,
    [L10RelianceAuditSeverity.WARNING]: 0,
    [L10RelianceAuditSeverity.HIGH]: 0,
    [L10RelianceAuditSeverity.CRITICAL]: 0,
  };
  const by_surface: Record<L10RelianceAuditSurface, number> = {
    [L10RelianceAuditSurface.CONFIDENCE]: 0,
    [L10RelianceAuditSurface.CAP_CHAIN]: 0,
    [L10RelianceAuditSurface.RESTRICTION]: 0,
    [L10RelianceAuditSurface.READINESS]: 0,
    [L10RelianceAuditSurface.RELIANCE]: 0,
    [L10RelianceAuditSurface.REGIME_INTERACTION]: 0,
    [L10RelianceAuditSurface.SEQUENCE_INTERACTION]: 0,
  };
  for (const r of records) {
    by_severity[r.severity]++;
    by_surface[r.surface]++;
  }
  return {
    total: records.length,
    by_severity,
    by_surface,
    all_clean: records.length === 0,
  };
}
