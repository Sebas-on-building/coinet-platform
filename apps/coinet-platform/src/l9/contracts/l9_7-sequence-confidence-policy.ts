/**
 * L9.7 — Sequence Confidence Policy
 *
 * §9.7.2–§9.7.4 — Reliance-governance confidence doctrine. Distinct
 * from the L9.4 handoff confidence bundle (which only *carries* the
 * classification output's posture downstream): L9.7 confidence is the
 * governed answer to "how strongly may the system actually rely on
 * the inferred sequence?".
 *
 * §9.7.3 — Nine required factor groups.
 * §9.7.4 — Four-band scoring with a strict raw/capped/band separation.
 *
 * Disjoint from L9.2 `L9SequenceRelianceBand` (object-layer reliance
 * banding) and from L9.4 `L9ConfidenceHandoffBundle` (handoff shape).
 * L9.7 adds the bands, factor law, and ranges that let later layers
 * read one governed reliance number instead of reconstructing it.
 */

/**
 * §9.7.3.1 — Canonical factor groups. Every `L9SequenceConfidenceProfile`
 * must surface one factor per group (§9.7.3.5). Any missing group
 * rejects the profile (`L9REL_CONF_FACTOR_GROUP_MISSING`).
 */
export enum L9SequenceConfidenceFactorClass {
  /** §9.7.3.2.A — clarity and non-ambiguity of ordering. */
  ORDER_CLARITY = 'ORDER_CLARITY',
  /** §9.7.3.2.B — stability and meaningfulness of lead-lag relations. */
  LEAD_LAG_STABILITY = 'LEAD_LAG_STABILITY',
  /** §9.7.3.2.C — completeness of the required sequence spine. */
  CHAIN_COMPLETENESS = 'CHAIN_COMPLETENESS',
  /** §9.7.3.2.D — temporal currency of relevant sequence evidence. */
  FRESHNESS = 'FRESHNESS',
  /** §9.7.3.2.E — contradiction posture narrowing reliance. */
  CONTRADICTION_PRESSURE = 'CONTRADICTION_PRESSURE',
  /**
   * §9.7.3.2.F — local compatibility of inferred sequence with the
   * current L8 regime. Never an authoritative regime classification
   * (§9.7.8 / INV-9.7-F).
   */
  REGIME_COMPATIBILITY = 'REGIME_COMPATIBILITY',
  /** §9.7.3.2.G — historical reliability of the sequence template. */
  HISTORICAL_RELIABILITY = 'HISTORICAL_RELIABILITY',
  /** §9.7.3.2.H — burden from material decay of earlier support. */
  DECAY_BURDEN = 'DECAY_BURDEN',
  /** §9.7.3.2.I — unresolved ambiguity in ordering / phase. */
  ORDERING_AMBIGUITY = 'ORDERING_AMBIGUITY',
}

export const ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES:
  readonly L9SequenceConfidenceFactorClass[] =
    Object.values(L9SequenceConfidenceFactorClass);

/**
 * §9.7.3.5 — Completeness law: every production confidence profile
 * must declare at least one factor per required class. The required
 * set is the full enum (all nine classes).
 */
export const L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES:
  readonly L9SequenceConfidenceFactorClass[] =
    ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES;

/**
 * §9.7.3.4 — Per-factor effect on reliance. A factor may support,
 * narrow, or block reliance. `SUPPORTS` factors may raise confidence
 * but never override a narrowing or blocking factor (§9.7.3.3).
 */
export enum L9SequenceConfidenceFactorEffect {
  SUPPORTS = 'SUPPORTS',
  NEUTRAL = 'NEUTRAL',
  NARROWS = 'NARROWS',
  BLOCKS = 'BLOCKS',
}

export const ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_EFFECTS:
  readonly L9SequenceConfidenceFactorEffect[] =
    Object.values(L9SequenceConfidenceFactorEffect);

/**
 * §9.7.3.4 — Factor record. Every factor is explicit, bounded, typed,
 * replay-safe, and independently inspectable.
 */
export interface L9SequenceConfidenceFactor {
  /** §9.7.3.4 — stable per-subject factor id. */
  readonly factor_id: string;
  /** §9.7.3.4 — required factor class (one per group minimum). */
  readonly factor_class: L9SequenceConfidenceFactorClass;
  /** §9.7.3.4 — raw contribution in [0,1]; unclamped rejects. */
  readonly raw_score: number;
  /** §9.7.3.4 — normalized contribution in [0,1] after policy mapping. */
  readonly normalized_score: number;
  /** §9.7.3.4 — effect posture on final reliance. */
  readonly reliance_effect: L9SequenceConfidenceFactorEffect;
  /** §9.7.3.4 — lineage refs replay-tracking. */
  readonly lineage_refs: readonly string[];
  /** §9.7.3.4 — policy version under which the factor was computed. */
  readonly policy_version: string;
}

/**
 * §9.7.4.2 — Reliance-grade confidence band. Derived from the final
 * capped score (§9.7.4.6) — never from the raw score (INV-9.7-C).
 *
 * Named `L9RelianceConfidenceBand` to stay disjoint from the L9.2
 * `L9SequenceConfidenceBand` (assessment-object banding). L9.7 bands
 * govern reliance grading; L9.2 bands governed raw-score banding on
 * the assessment object.
 */
export enum L9RelianceConfidenceBand {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  UNRESOLVED = 'UNRESOLVED',
}

export const ALL_L9_RELIANCE_CONFIDENCE_BANDS:
  readonly L9RelianceConfidenceBand[] =
    Object.values(L9RelianceConfidenceBand);

/**
 * §9.7.4.3 / §9.7.4.6 — Canonical band thresholds on the *capped*
 * score. The final band must be derived using `classifyL9RelianceConfidenceBand`.
 */
export const L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS: Readonly<{
  HIGH_MIN: number;
  MEDIUM_MIN: number;
  LOW_MIN: number;
}> = {
  HIGH_MIN: 0.80,
  MEDIUM_MIN: 0.60,
  LOW_MIN: 0.35,
};

/**
 * §9.7.4.6 — Band-consistency law. Accepts the *capped* score and
 * returns the canonical band. Raw-score callers are a bug.
 */
export function classifyL9RelianceConfidenceBand(
  capped_score: number,
): L9RelianceConfidenceBand {
  if (!Number.isFinite(capped_score)) {
    return L9RelianceConfidenceBand.UNRESOLVED;
  }
  const s = Math.max(0, Math.min(1, capped_score));
  if (s >= L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.HIGH_MIN) {
    return L9RelianceConfidenceBand.HIGH;
  }
  if (s >= L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.MEDIUM_MIN) {
    return L9RelianceConfidenceBand.MEDIUM;
  }
  if (s >= L9_RELIANCE_CONFIDENCE_BAND_THRESHOLDS.LOW_MIN) {
    return L9RelianceConfidenceBand.LOW;
  }
  return L9RelianceConfidenceBand.UNRESOLVED;
}

/**
 * §9.7.4.1 / §9.7.4.5 — Full reliance-grade confidence profile. Keeps
 * raw and capped separate so cap-chain law is never lost.
 */
export interface L9RelianceConfidenceProfile {
  readonly sequence_subject_id: string;
  readonly factors: readonly L9SequenceConfidenceFactor[];
  readonly raw_confidence_score: number;
  readonly capped_confidence_score: number;
  readonly confidence_band: L9RelianceConfidenceBand;
  /** §9.7.5.5 — back-ref to the applied cap chain. */
  readonly cap_chain_ref: string;
  readonly policy_version: string;
  /** §9.7.10.3 — stable hash for replay identity. */
  readonly replay_hash: string;
}
