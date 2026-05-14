/**
 * L11.7 — Score Drift Type Taxonomy (§11.7.5)
 *
 * Stable enum of drift types L11.7 monitors. Each type maps to a
 * distinct drift-monitoring surface from §11.7.4.
 */

export enum L11ScoreDriftType {
  SCORE_DISTRIBUTION_DRIFT = 'SCORE_DISTRIBUTION_DRIFT',
  COMPONENT_DISTRIBUTION_DRIFT = 'COMPONENT_DISTRIBUTION_DRIFT',
  CALIBRATION_DRIFT = 'CALIBRATION_DRIFT',
  OUTCOME_CORRELATION_DRIFT = 'OUTCOME_CORRELATION_DRIFT',
  THRESHOLD_BREACH_FREQUENCY_DRIFT = 'THRESHOLD_BREACH_FREQUENCY_DRIFT',
  REGIME_SPECIFIC_DRIFT = 'REGIME_SPECIFIC_DRIFT',
  TEMPLATE_SPECIFIC_DRIFT = 'TEMPLATE_SPECIFIC_DRIFT',
  FORMULA_VERSION_DRIFT = 'FORMULA_VERSION_DRIFT',
  SCORE_BAND_DISTRIBUTION_DRIFT = 'SCORE_BAND_DISTRIBUTION_DRIFT',
  MISSING_DATA_FREQUENCY_DRIFT = 'MISSING_DATA_FREQUENCY_DRIFT',
  ATTRIBUTION_DRIVER_DRIFT = 'ATTRIBUTION_DRIVER_DRIFT',
  COHORT_COMPOSITION_DRIFT = 'COHORT_COMPOSITION_DRIFT',
  ADVERSARIAL_PATTERN_DRIFT = 'ADVERSARIAL_PATTERN_DRIFT',
}

export const ALL_L11_SCORE_DRIFT_TYPES: readonly L11ScoreDriftType[] =
  Object.values(L11ScoreDriftType);

/**
 * §11.7.5.2 — Per-type semantic class. Used by validators and the
 * severity engine to decide which actions are admissible.
 */
export enum L11DriftTypeImpactClass {
  /** Affects emitted score values across cohort. */
  DISTRIBUTION = 'DISTRIBUTION',
  /** Affects calibration / outcome relationship. */
  CALIBRATION = 'CALIBRATION',
  /** Affects threshold-band partitioning. */
  THRESHOLD = 'THRESHOLD',
  /** Affects formula identity, attribution, or input topology. */
  STRUCTURAL = 'STRUCTURAL',
  /** Affects environmental conditions (regime, cohort, adversary). */
  ENVIRONMENTAL = 'ENVIRONMENTAL',
}

export const L11_DRIFT_TYPE_IMPACT_CLASS:
  Readonly<Record<L11ScoreDriftType, L11DriftTypeImpactClass>> = {
  [L11ScoreDriftType.SCORE_DISTRIBUTION_DRIFT]: L11DriftTypeImpactClass.DISTRIBUTION,
  [L11ScoreDriftType.COMPONENT_DISTRIBUTION_DRIFT]: L11DriftTypeImpactClass.DISTRIBUTION,
  [L11ScoreDriftType.CALIBRATION_DRIFT]: L11DriftTypeImpactClass.CALIBRATION,
  [L11ScoreDriftType.OUTCOME_CORRELATION_DRIFT]: L11DriftTypeImpactClass.CALIBRATION,
  [L11ScoreDriftType.THRESHOLD_BREACH_FREQUENCY_DRIFT]: L11DriftTypeImpactClass.THRESHOLD,
  [L11ScoreDriftType.SCORE_BAND_DISTRIBUTION_DRIFT]: L11DriftTypeImpactClass.THRESHOLD,
  [L11ScoreDriftType.REGIME_SPECIFIC_DRIFT]: L11DriftTypeImpactClass.ENVIRONMENTAL,
  [L11ScoreDriftType.TEMPLATE_SPECIFIC_DRIFT]: L11DriftTypeImpactClass.ENVIRONMENTAL,
  [L11ScoreDriftType.COHORT_COMPOSITION_DRIFT]: L11DriftTypeImpactClass.ENVIRONMENTAL,
  [L11ScoreDriftType.ADVERSARIAL_PATTERN_DRIFT]: L11DriftTypeImpactClass.ENVIRONMENTAL,
  [L11ScoreDriftType.FORMULA_VERSION_DRIFT]: L11DriftTypeImpactClass.STRUCTURAL,
  [L11ScoreDriftType.ATTRIBUTION_DRIVER_DRIFT]: L11DriftTypeImpactClass.STRUCTURAL,
  [L11ScoreDriftType.MISSING_DATA_FREQUENCY_DRIFT]: L11DriftTypeImpactClass.STRUCTURAL,
};

export function getL11DriftTypeImpactClass(
  t: L11ScoreDriftType,
): L11DriftTypeImpactClass {
  return L11_DRIFT_TYPE_IMPACT_CLASS[t];
}
