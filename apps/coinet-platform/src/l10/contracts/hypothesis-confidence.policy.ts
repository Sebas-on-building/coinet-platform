/**
 * L10.7 — Hypothesis Confidence Policy
 *
 * §10.7.2 / §10.7.3 — Reliance-governance confidence doctrine for the
 * Hypothesis Engine. Distinct from:
 *
 *   - L10.2 `L10HypothesisAssessment` (assessment-object banding)
 *   - L10.3 output-contract confidence labels
 *   - L9.7 `L9RelianceConfidence*` (temporal sequence reliance)
 *
 * L10.7 confidence is the governed answer to: "how strongly may the
 * system rely on this *ranked explanatory competition*?". Not "is the
 * candidate legal?", not "is the ranking consistent?" — those were
 * solved in L10.1–L10.6. Confidence here is the single governed number
 * that summarizes how trustable the ranked primary is, after support
 * strength, contradiction pressure, confirmation completeness,
 * invalidation risk, sequence posture, regime compatibility, validation
 * posture, historical reliability, and spread have been folded in.
 *
 * First principle (§10.7.1.5):
 *   A primary hypothesis is strong only if the system is legally
 *   allowed to rely on it more than the alternatives — never merely
 *   because it is first in rank.
 *
 * §10.7.3.1 — Nine canonical factor groups.
 * §10.7.3.3 — Factor doctrine: explicit, bounded, typed, replay-safe,
 *              independently inspectable, narrowing-capable, never
 *              silently overriding contradiction or spread law.
 * §10.7.4.6 — Bands derive from the *capped* score only (INV-10.7-C).
 */

// ──────────────────────────────────────────────────────────────────
// §10.7.3.1 — Canonical factor classes (exactly nine groups)
// ──────────────────────────────────────────────────────────────────

/**
 * §10.7.3.1 — Every production `L10HypothesisConfidenceProfile` must
 * declare one factor per required class. A missing class rejects the
 * profile (`L10REL_CONF_FACTOR_GROUP_MISSING`).
 */
export enum L10HypothesisConfidenceFactorClass {
  /** §10.7.3.2.A — support strength / completeness / primary weight. */
  SUPPORT_STRENGTH = 'SUPPORT_STRENGTH',
  /** §10.7.3.2.B — contradiction pressure narrowing reliance. */
  CONTRADICTION_PRESSURE = 'CONTRADICTION_PRESSURE',
  /** §10.7.3.2.C — completeness of required confirmations. */
  CONFIRMATION_COMPLETENESS = 'CONFIRMATION_COMPLETENESS',
  /** §10.7.3.2.D — active / near-active invalidation risk. */
  INVALIDATION_RISK = 'INVALIDATION_RISK',
  /** §10.7.3.2.E — L9-inferred sequence quality + sequence confidence. */
  SEQUENCE_QUALITY = 'SEQUENCE_QUALITY',
  /** §10.7.3.2.F — L8 regime compatibility (local factor, never final). */
  REGIME_COMPATIBILITY = 'REGIME_COMPATIBILITY',
  /** §10.7.3.2.G — L7 validation / truth-testing posture strength. */
  VALIDATION_POSTURE = 'VALIDATION_POSTURE',
  /** §10.7.3.2.H — historical reliability of the hypothesis template. */
  TEMPLATE_RELIABILITY = 'TEMPLATE_RELIABILITY',
  /** §10.7.3.2.I — ranking spread vs. the secondary hypothesis. */
  SPREAD_VS_SECONDARY = 'SPREAD_VS_SECONDARY',
}

export const ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_CLASSES:
  readonly L10HypothesisConfidenceFactorClass[] =
    Object.values(L10HypothesisConfidenceFactorClass);

/**
 * §10.7.3.5 — Completeness law: the required set is the full enum.
 * A profile missing any class fails the validator.
 */
export const L10_REQUIRED_CONFIDENCE_FACTOR_CLASSES:
  readonly L10HypothesisConfidenceFactorClass[] =
    ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_CLASSES;

// ──────────────────────────────────────────────────────────────────
// §10.7.3.3 — Factor effect posture
// ──────────────────────────────────────────────────────────────────

/**
 * §10.7.3.3 — A factor may support, narrow, or block reliance. A
 * `SUPPORTS` factor may raise the raw confidence but never override a
 * narrowing or blocking factor (cap-chain law does that — §10.7.6).
 */
export enum L10HypothesisConfidenceFactorEffect {
  SUPPORTS = 'SUPPORTS',
  NEUTRAL = 'NEUTRAL',
  NARROWS = 'NARROWS',
  BLOCKS = 'BLOCKS',
}

export const ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_EFFECTS:
  readonly L10HypothesisConfidenceFactorEffect[] =
    Object.values(L10HypothesisConfidenceFactorEffect);

/**
 * §10.7.3.3 — Classes that narrow reliance when they rise (i.e. their
 * raw contribution is inverted when composing the raw score):
 *
 *   - high contradiction → lowers reliance
 *   - high invalidation risk → lowers reliance
 *
 * Every other class rises with reliance.
 */
export const L10_HYPOTHESIS_INVERTED_CONFIDENCE_CLASSES:
  readonly L10HypothesisConfidenceFactorClass[] = [
    L10HypothesisConfidenceFactorClass.CONTRADICTION_PRESSURE,
    L10HypothesisConfidenceFactorClass.INVALIDATION_RISK,
  ];

// ──────────────────────────────────────────────────────────────────
// §10.7.3.4 — Required per-factor surface
// ──────────────────────────────────────────────────────────────────

/**
 * §10.7.3.4 — Per-factor record. Every factor must be explicit,
 * bounded, typed, replay-safe, and independently inspectable.
 */
export interface L10HypothesisConfidenceFactor {
  /** §10.7.3.4 — stable per-subject factor id. */
  readonly factor_id: string;
  /** §10.7.3.4 — factor class (one required per group). */
  readonly factor_class: L10HypothesisConfidenceFactorClass;
  /** §10.7.3.4 — raw contribution in [0,1]; out of range rejects. */
  readonly raw_score: number;
  /** §10.7.3.4 — normalized contribution in [0,1] after policy mapping. */
  readonly normalized_score: number;
  /** §10.7.3.4 — posture on final reliance. */
  readonly reliance_effect: L10HypothesisConfidenceFactorEffect;
  /** §10.7.3.4 — cap reasons this factor would trigger if thresholded. */
  readonly cap_trigger_flags: readonly L10HypothesisCapReasonHint[];
  /** §10.7.3.4 — lineage refs for replay. */
  readonly lineage_refs: readonly string[];
  /** §10.7.3.4 — policy version under which the factor was computed. */
  readonly policy_version: string;
}

/**
 * §10.7.3.4 — Light-weight string-typed cap hints that factors may
 * declare so downstream engines know which cap to consider. The full
 * typed cap reason enum lives in `hypothesis-cap-chain.ts`; factors
 * reference it by string to keep this module cycle-free.
 */
export type L10HypothesisCapReasonHint = string;

// ──────────────────────────────────────────────────────────────────
// §10.7.4 — Confidence bands
// ──────────────────────────────────────────────────────────────────

/**
 * §10.7.4.2 — Reliance-grade confidence band. Derived from the final
 * capped score (§10.7.4.6) — never from the raw score (INV-10.7-C).
 *
 * Named `L10HypothesisRelianceConfidenceBand` to stay disjoint from
 * the L10.2 `L10HypothesisConfidenceBand` (assessment-object banding:
 * LOW / MODERATE / HIGH / FULL). L10.7 bands govern reliance grading;
 * L10.2 bands govern assessment-object score grading.
 */
export enum L10HypothesisRelianceConfidenceBand {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNRESOLVED = 'UNRESOLVED',
}

export const ALL_L10_HYPOTHESIS_RELIANCE_CONFIDENCE_BANDS:
  readonly L10HypothesisRelianceConfidenceBand[] =
    Object.values(L10HypothesisRelianceConfidenceBand);

/**
 * §10.7.4.3 / §10.7.4.6 — Canonical band thresholds on the *capped*
 * score. Use `classifyL10HypothesisRelianceConfidenceBand` — raw-
 * score callers are a bug.
 */
export const L10_HYPOTHESIS_RELIANCE_CONFIDENCE_BAND_THRESHOLDS: Readonly<{
  HIGH_MIN: number;
  MEDIUM_MIN: number;
  LOW_MIN: number;
}> = {
  HIGH_MIN: 0.80,
  MEDIUM_MIN: 0.60,
  LOW_MIN: 0.35,
};

/**
 * §10.7.4.6 — Band-consistency law. Accepts the *capped* score only.
 */
export function classifyL10HypothesisRelianceConfidenceBand(
  capped_score: number,
): L10HypothesisRelianceConfidenceBand {
  if (!Number.isFinite(capped_score)) {
    return L10HypothesisRelianceConfidenceBand.UNRESOLVED;
  }
  const s = Math.max(0, Math.min(1, capped_score));
  if (s >= L10_HYPOTHESIS_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.HIGH_MIN) {
    return L10HypothesisRelianceConfidenceBand.HIGH;
  }
  if (s >= L10_HYPOTHESIS_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.MEDIUM_MIN) {
    return L10HypothesisRelianceConfidenceBand.MEDIUM;
  }
  if (s >= L10_HYPOTHESIS_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.LOW_MIN) {
    return L10HypothesisRelianceConfidenceBand.LOW;
  }
  return L10HypothesisRelianceConfidenceBand.UNRESOLVED;
}

// ──────────────────────────────────────────────────────────────────
// §10.7.4.1 / §10.7.4.5 — Full confidence profile surface
// ──────────────────────────────────────────────────────────────────

/**
 * §10.7.4.1 — Full confidence profile. Raw and capped are kept
 * separate so cap-chain law is never lost (INV-10.7-C).
 */
export interface L10HypothesisConfidenceProfile {
  readonly hypothesis_subject_id: string;
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  readonly factors: readonly L10HypothesisConfidenceFactor[];
  readonly raw_confidence_score: number;
  readonly capped_confidence_score: number;
  readonly confidence_band: L10HypothesisRelianceConfidenceBand;
  /** §10.7.6.5 / §10.7.9.2 — back-ref to the applied cap chain. */
  readonly cap_chain_ref: string;
  readonly policy_version: string;
  /** §10.7.9.2 / INV-10.7-A — stable hash for replay identity. */
  readonly replay_hash: string;
}

/**
 * §10.7.3.1 — Canonical weights when composing the raw reliance
 * score. Weights are deliberately uniform-ish so no single factor
 * dominates (§10.7.3.3). Sum = 1.0.
 */
export const L10_HYPOTHESIS_CONFIDENCE_FACTOR_WEIGHTS: Readonly<
  Record<L10HypothesisConfidenceFactorClass, number>
> = {
  [L10HypothesisConfidenceFactorClass.SUPPORT_STRENGTH]: 0.16,
  [L10HypothesisConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.14,
  [L10HypothesisConfidenceFactorClass.CONFIRMATION_COMPLETENESS]: 0.12,
  [L10HypothesisConfidenceFactorClass.INVALIDATION_RISK]: 0.12,
  [L10HypothesisConfidenceFactorClass.SEQUENCE_QUALITY]: 0.10,
  [L10HypothesisConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.08,
  [L10HypothesisConfidenceFactorClass.VALIDATION_POSTURE]: 0.10,
  [L10HypothesisConfidenceFactorClass.TEMPLATE_RELIABILITY]: 0.08,
  [L10HypothesisConfidenceFactorClass.SPREAD_VS_SECONDARY]: 0.10,
};
