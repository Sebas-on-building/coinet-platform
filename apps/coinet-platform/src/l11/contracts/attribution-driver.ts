/**
 * L11.4 — Attribution Driver Doctrine (§11.4.4)
 *
 * Driver classes, contribution direction enum, attribution reason
 * codes, and the universal `L11AttributionDriver` object that
 * aggregates contributions from components, caps, penalties,
 * modifiers, and missing-data effects.
 */

import { L11ScoreFamily } from './score-family';
import { L11AttributionMaterialityClass } from './attribution-materiality';

export enum L11AttributionDriverClass {
  PRIMARY_POSITIVE_DRIVER = 'PRIMARY_POSITIVE_DRIVER',
  SECONDARY_POSITIVE_DRIVER = 'SECONDARY_POSITIVE_DRIVER',
  PRIMARY_NEGATIVE_DRIVER = 'PRIMARY_NEGATIVE_DRIVER',
  SECONDARY_NEGATIVE_DRIVER = 'SECONDARY_NEGATIVE_DRIVER',
  CAP_DRIVER = 'CAP_DRIVER',
  PENALTY_DRIVER = 'PENALTY_DRIVER',
  MISSING_DATA_DRIVER = 'MISSING_DATA_DRIVER',
  REGIME_MODIFIER_DRIVER = 'REGIME_MODIFIER_DRIVER',
  SEQUENCE_MODIFIER_DRIVER = 'SEQUENCE_MODIFIER_DRIVER',
  HYPOTHESIS_DRIVER = 'HYPOTHESIS_DRIVER',
  VALIDATION_DRIVER = 'VALIDATION_DRIVER',
  CONTRADICTION_DRIVER = 'CONTRADICTION_DRIVER',
  CONFIDENCE_DRIVER = 'CONFIDENCE_DRIVER',
}

export const ALL_L11_ATTRIBUTION_DRIVER_CLASSES:
  readonly L11AttributionDriverClass[] =
  Object.values(L11AttributionDriverClass);

/**
 * §11.4.4.3 — Direction of a contribution. Must be interpreted
 * relative to the score family direction (constructive vs risk).
 */
export enum L11ContributionDirection {
  RAISES_SCORE = 'RAISES_SCORE',
  LOWERS_SCORE = 'LOWERS_SCORE',
  CAPS_SCORE = 'CAPS_SCORE',
  FLOORS_SCORE = 'FLOORS_SCORE',
  INCREASES_RISK_SCORE = 'INCREASES_RISK_SCORE',
  REDUCES_RISK_SCORE = 'REDUCES_RISK_SCORE',
  NARROWS_CONFIDENCE = 'NARROWS_CONFIDENCE',
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
}

export const ALL_L11_CONTRIBUTION_DIRECTIONS:
  readonly L11ContributionDirection[] =
  Object.values(L11ContributionDirection);

/**
 * §11.4.4.2 — Stable reason codes for explanation summaries. Codes
 * are intentionally enumerated so the system never explains a score
 * with arbitrary free text.
 */
export enum L11AttributionReasonCode {
  COMPONENT_STRONG = 'COMPONENT_STRONG',
  COMPONENT_WEAK = 'COMPONENT_WEAK',
  COMPONENT_NEUTRAL = 'COMPONENT_NEUTRAL',
  CAP_TRIGGERED = 'CAP_TRIGGERED',
  PENALTY_TRIGGERED = 'PENALTY_TRIGGERED',
  REGIME_AMPLIFIES = 'REGIME_AMPLIFIES',
  REGIME_DAMPENS = 'REGIME_DAMPENS',
  SEQUENCE_AMPLIFIES = 'SEQUENCE_AMPLIFIES',
  SEQUENCE_DAMPENS = 'SEQUENCE_DAMPENS',
  HYPOTHESIS_AMPLIFIES = 'HYPOTHESIS_AMPLIFIES',
  HYPOTHESIS_DAMPENS = 'HYPOTHESIS_DAMPENS',
  VALIDATION_SUPPORTS = 'VALIDATION_SUPPORTS',
  VALIDATION_CONFLICTS = 'VALIDATION_CONFLICTS',
  CONTRADICTION_PRESENT = 'CONTRADICTION_PRESENT',
  MISSING_REQUIRED_INPUT = 'MISSING_REQUIRED_INPUT',
  STALE_INPUT = 'STALE_INPUT',
  DEGRADED_INPUT = 'DEGRADED_INPUT',
  EVIDENCE_ONLY_DISCLOSURE = 'EVIDENCE_ONLY_DISCLOSURE',
  CONFIDENCE_LOW = 'CONFIDENCE_LOW',
  CONFIDENCE_HIGH = 'CONFIDENCE_HIGH',
}

export const ALL_L11_ATTRIBUTION_REASON_CODES:
  readonly L11AttributionReasonCode[] =
  Object.values(L11AttributionReasonCode);

/**
 * §11.4.4.2 — A single attribution driver. The driver is an
 * aggregator over one underlying contribution (component / cap /
 * penalty / modifier / missing-data) so the top-driver selector can
 * rank uniformly.
 */
export interface L11AttributionDriver {
  readonly driver_id: string;
  readonly score_id: string;
  readonly score_family: L11ScoreFamily;

  readonly driver_class: L11AttributionDriverClass;
  readonly driver_name: string;

  readonly contribution_direction: L11ContributionDirection;
  /** Magnitude in score units. */
  readonly contribution_magnitude: number;
  /** Magnitude normalized to [0,1] for materiality classification. */
  readonly normalized_impact: number;

  readonly materiality_class: L11AttributionMaterialityClass;

  readonly source_component_ref?: string;
  readonly source_cap_ref?: string;
  readonly source_penalty_ref?: string;
  readonly source_modifier_ref?: string;
  readonly source_missing_data_ref?: string;

  readonly lower_layer_refs: readonly string[];
  readonly attribution_reason_codes: readonly L11AttributionReasonCode[];

  readonly policy_version: string;
}

/**
 * Driver class priority (lower = higher priority). Used by the
 * top-driver selector tie-break rules (§11.4.10.5).
 */
export const L11_NEGATIVE_DRIVER_CLASS_PRIORITY:
  Readonly<Record<L11AttributionDriverClass, number>> = {
  [L11AttributionDriverClass.CAP_DRIVER]: 0,
  [L11AttributionDriverClass.MISSING_DATA_DRIVER]: 1,
  [L11AttributionDriverClass.CONTRADICTION_DRIVER]: 2,
  [L11AttributionDriverClass.PENALTY_DRIVER]: 3,
  [L11AttributionDriverClass.REGIME_MODIFIER_DRIVER]: 4,
  [L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER]: 5,
  [L11AttributionDriverClass.HYPOTHESIS_DRIVER]: 6,
  [L11AttributionDriverClass.PRIMARY_NEGATIVE_DRIVER]: 7,
  [L11AttributionDriverClass.SECONDARY_NEGATIVE_DRIVER]: 8,
  // Positive-only classes get high penalty so they don't surface in
  // the negative-driver list during a tie.
  [L11AttributionDriverClass.PRIMARY_POSITIVE_DRIVER]: 100,
  [L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER]: 100,
  [L11AttributionDriverClass.VALIDATION_DRIVER]: 100,
  [L11AttributionDriverClass.CONFIDENCE_DRIVER]: 100,
};

export const L11_POSITIVE_DRIVER_CLASS_PRIORITY:
  Readonly<Record<L11AttributionDriverClass, number>> = {
  [L11AttributionDriverClass.PRIMARY_POSITIVE_DRIVER]: 0,
  [L11AttributionDriverClass.HYPOTHESIS_DRIVER]: 1,
  [L11AttributionDriverClass.VALIDATION_DRIVER]: 2,
  [L11AttributionDriverClass.REGIME_MODIFIER_DRIVER]: 3,
  [L11AttributionDriverClass.SEQUENCE_MODIFIER_DRIVER]: 4,
  [L11AttributionDriverClass.CONFIDENCE_DRIVER]: 5,
  [L11AttributionDriverClass.SECONDARY_POSITIVE_DRIVER]: 6,
  // Strictly negative-only classes get high penalty.
  [L11AttributionDriverClass.PRIMARY_NEGATIVE_DRIVER]: 100,
  [L11AttributionDriverClass.SECONDARY_NEGATIVE_DRIVER]: 100,
  [L11AttributionDriverClass.CAP_DRIVER]: 100,
  [L11AttributionDriverClass.PENALTY_DRIVER]: 100,
  [L11AttributionDriverClass.MISSING_DATA_DRIVER]: 100,
  [L11AttributionDriverClass.CONTRADICTION_DRIVER]: 100,
};

/**
 * §11.4.4.3 — Whether a direction means the score is being raised
 * (positive driver) or lowered (negative driver). Caps and missing
 * data are surfaced as negative drivers; floors as positive drivers
 * for risk-family scores. DISCLOSURE_ONLY is neither.
 */
export function isPositiveDirection(d: L11ContributionDirection): boolean {
  return (
    d === L11ContributionDirection.RAISES_SCORE ||
    d === L11ContributionDirection.FLOORS_SCORE ||
    d === L11ContributionDirection.INCREASES_RISK_SCORE
  );
}

export function isNegativeDirection(d: L11ContributionDirection): boolean {
  return (
    d === L11ContributionDirection.LOWERS_SCORE ||
    d === L11ContributionDirection.CAPS_SCORE ||
    d === L11ContributionDirection.REDUCES_RISK_SCORE ||
    d === L11ContributionDirection.NARROWS_CONFIDENCE
  );
}
