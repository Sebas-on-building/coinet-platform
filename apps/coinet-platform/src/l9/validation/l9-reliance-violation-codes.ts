/**
 * L9.7 — Reliance-Governance Violation Codes
 *
 * §9.7.10.2 — Typed violation codes for every L9.7 validator. Disjoint
 * from the L9.1 constitutional (`L9_`), L9.2 object (`L9O_`), L9.3
 * contract (`L9C_`), L9.4 runtime (`L9R_`), L9.5 temporal-semantic
 * (`L9T_`), and L9.6 family/template (`L9F_`) code spaces. L9.7 uses
 * the `L9REL_` prefix (reliance).
 */

export enum L9SequenceRelianceViolationCode {
  // ── Confidence-policy law (§9.7.2 / §9.7.3) ──
  CONF_FACTOR_GROUP_MISSING = 'L9REL_CONF_FACTOR_GROUP_MISSING',
  CONF_FACTOR_CLASS_UNREGISTERED = 'L9REL_CONF_FACTOR_CLASS_UNREGISTERED',
  CONF_FACTOR_EFFECT_UNREGISTERED = 'L9REL_CONF_FACTOR_EFFECT_UNREGISTERED',
  CONF_FACTOR_RAW_OUT_OF_RANGE = 'L9REL_CONF_FACTOR_RAW_OUT_OF_RANGE',
  CONF_FACTOR_NORMALIZED_OUT_OF_RANGE =
    'L9REL_CONF_FACTOR_NORMALIZED_OUT_OF_RANGE',
  CONF_FACTOR_ID_DUPLICATE = 'L9REL_CONF_FACTOR_ID_DUPLICATE',
  CONF_FACTOR_POLICY_VERSION_MISSING =
    'L9REL_CONF_FACTOR_POLICY_VERSION_MISSING',
  CONF_RAW_SCORE_OUT_OF_RANGE = 'L9REL_CONF_RAW_SCORE_OUT_OF_RANGE',
  CONF_CAPPED_SCORE_OUT_OF_RANGE = 'L9REL_CONF_CAPPED_SCORE_OUT_OF_RANGE',
  CONF_CAPPED_GT_RAW = 'L9REL_CONF_CAPPED_GT_RAW',
  CONF_BAND_INCONSISTENT_WITH_CAPPED =
    'L9REL_CONF_BAND_INCONSISTENT_WITH_CAPPED',
  CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND =
    'L9REL_CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND',

  // ── Cap-chain law (§9.7.5) ──
  CAP_REASON_UNREGISTERED = 'L9REL_CAP_REASON_UNREGISTERED',
  CAP_DUPLICATE_REASON = 'L9REL_CAP_DUPLICATE_REASON',
  CAP_PRECEDENCE_VIOLATED = 'L9REL_CAP_PRECEDENCE_VIOLATED',
  CAP_POST_CAP_EXCEEDS_CEILING = 'L9REL_CAP_POST_CAP_EXCEEDS_CEILING',
  CAP_POST_CAP_EXCEEDS_PRE_CAP = 'L9REL_CAP_POST_CAP_EXCEEDS_PRE_CAP',
  CAP_REQUIRED_CAP_MISSING = 'L9REL_CAP_REQUIRED_CAP_MISSING',
  CAP_TIGHTEST_INCONSISTENT = 'L9REL_CAP_TIGHTEST_INCONSISTENT',
  CAP_WIDENING_ATTEMPTED = 'L9REL_CAP_WIDENING_ATTEMPTED',
  CAP_READINESS_HINT_INCONSISTENT = 'L9REL_CAP_READINESS_HINT_INCONSISTENT',

  // ── Restriction-rights law (§9.7.6) ──
  RESTR_PROFILE_MISSING = 'L9REL_RESTR_PROFILE_MISSING',
  RESTR_RIGHT_UNREGISTERED = 'L9REL_RESTR_RIGHT_UNREGISTERED',
  RESTR_BAND_UNREGISTERED = 'L9REL_RESTR_BAND_UNREGISTERED',
  RESTR_BROADER_THAN_STATE = 'L9REL_RESTR_BROADER_THAN_STATE',
  RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY =
    'L9REL_RESTR_SCORE_DRIVING_WITH_EVIDENCE_ONLY',
  RESTR_IGNORES_CONTRADICTION_DISCLOSURE =
    'L9REL_RESTR_IGNORES_CONTRADICTION_DISCLOSURE',
  RESTR_IGNORES_CAUSAL_RESTRAINT = 'L9REL_RESTR_IGNORES_CAUSAL_RESTRAINT',
  RESTR_ADDITIONAL_CONFIRMATION_IGNORED =
    'L9REL_RESTR_ADDITIONAL_CONFIRMATION_IGNORED',
  RESTR_BLOCKED_RIGHT_STILL_GRANTED =
    'L9REL_RESTR_BLOCKED_RIGHT_STILL_GRANTED',

  // ── Causal-restraint law (§9.7.7) ──
  CAUSAL_CLASS_UNREGISTERED = 'L9REL_CAUSAL_CLASS_UNREGISTERED',
  CAUSAL_LANGUAGE_DETECTED = 'L9REL_CAUSAL_LANGUAGE_DETECTED',
  CAUSAL_OVERCLAIM_UNDER_STRICT = 'L9REL_CAUSAL_OVERCLAIM_UNDER_STRICT',
  CAUSAL_FINAL_JUDGMENT_UNDER_BLOCKED =
    'L9REL_CAUSAL_FINAL_JUDGMENT_UNDER_BLOCKED',
  CAUSAL_FINAL_JUDGMENT_UNDER_STRICT =
    'L9REL_CAUSAL_FINAL_JUDGMENT_UNDER_STRICT',
  CAUSAL_RATIONALE_EMPTY = 'L9REL_CAUSAL_RATIONALE_EMPTY',

  // ── Reliance-profile law (§9.7.9) ──
  REL_READINESS_UNREGISTERED = 'L9REL_REL_READINESS_UNREGISTERED',
  REL_READINESS_INCONSISTENT = 'L9REL_REL_READINESS_INCONSISTENT',
  REL_REPLAY_HASH_MISSING = 'L9REL_REL_REPLAY_HASH_MISSING',
  REL_POLICY_VERSION_MISMATCH = 'L9REL_REL_POLICY_VERSION_MISMATCH',

  // ── Regime interaction (§9.7.8 / INV-9.7-F) ──
  REGIME_LOCAL_IMPERSONATES_FINAL = 'L9REL_REGIME_LOCAL_IMPERSONATES_FINAL',
  REGIME_OVERRIDE_ATTEMPTED = 'L9REL_REGIME_OVERRIDE_ATTEMPTED',
}

export const ALL_L9_SEQUENCE_RELIANCE_VIOLATION_CODES:
  readonly L9SequenceRelianceViolationCode[] =
    Object.values(L9SequenceRelianceViolationCode);

/**
 * §9.7.10.2 — Semantic tier label. Parallels `L9FamilyViolationTier`
 * from L9.6 so audits can distinguish which L9.7 sublayer raised a
 * given rejection.
 */
export enum L9SequenceRelianceViolationTier {
  CONFIDENCE = 'CONFIDENCE',
  CAP_CHAIN = 'CAP_CHAIN',
  RESTRICTION = 'RESTRICTION',
  CAUSAL = 'CAUSAL',
  RELIANCE = 'RELIANCE',
  REGIME = 'REGIME',
}

export const ALL_L9_SEQUENCE_RELIANCE_VIOLATION_TIERS:
  readonly L9SequenceRelianceViolationTier[] =
    Object.values(L9SequenceRelianceViolationTier);

export interface L9SequenceRelianceViolation {
  readonly code: L9SequenceRelianceViolationCode;
  readonly tier: L9SequenceRelianceViolationTier;
  readonly detail: string;
  readonly offending_refs?: readonly string[];
}

export class L9SequenceRelianceValidationError extends Error {
  constructor(
    public readonly violations: readonly L9SequenceRelianceViolation[],
  ) {
    super(
      `L9.7 reliance validation failed with ${violations.length} ` +
        `violation(s): ${violations.map(v => v.code).join(', ')}`,
    );
    this.name = 'L9SequenceRelianceValidationError';
  }
}

/**
 * §9.7.10.2 — Canonical code→tier mapping. Used by the audit layer
 * to group violations without hand-maintaining parallel switches.
 */
export function l9RelianceViolationTier(
  code: L9SequenceRelianceViolationCode,
): L9SequenceRelianceViolationTier {
  const s = String(code);
  if (s.startsWith('L9REL_CONF_')) return L9SequenceRelianceViolationTier.CONFIDENCE;
  if (s.startsWith('L9REL_CAP_')) return L9SequenceRelianceViolationTier.CAP_CHAIN;
  if (s.startsWith('L9REL_RESTR_')) return L9SequenceRelianceViolationTier.RESTRICTION;
  if (s.startsWith('L9REL_CAUSAL_')) return L9SequenceRelianceViolationTier.CAUSAL;
  if (s.startsWith('L9REL_REL_')) return L9SequenceRelianceViolationTier.RELIANCE;
  if (s.startsWith('L9REL_REGIME_')) return L9SequenceRelianceViolationTier.REGIME;
  return L9SequenceRelianceViolationTier.RELIANCE;
}
