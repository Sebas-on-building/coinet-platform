/**
 * L8.5 — Regime Consumption Rights Matrix
 *
 * §8.5.8 — Lower-layer consumption law. The matrix decides, per
 * dependency class × admissibility class, which downstream regime
 * decisions an input may legally influence.
 *
 * §8.5.9 — Misuse bans draw their violation codes from here.
 */

import {
  L8RegimeDependencyClass,
} from './regime-input-binding';
import {
  L8RegimeInputAdmissibilityClass,
} from './regime-admissibility';

/**
 * §8.5.8.4 — Which downstream regime decisions an input is allowed to
 * influence. Each represents one arm of the runtime DAG.
 */
export enum L8RegimeConsumptionRight {
  INFLUENCE_PRIMARY_CLASSIFICATION = 'INFLUENCE_PRIMARY_CLASSIFICATION',
  INFLUENCE_SECONDARY_CLASSIFICATION = 'INFLUENCE_SECONDARY_CLASSIFICATION',
  INFLUENCE_TRANSITION_RISK = 'INFLUENCE_TRANSITION_RISK',
  INFLUENCE_CONFIDENCE = 'INFLUENCE_CONFIDENCE',
  INFLUENCE_MULTIPLIER = 'INFLUENCE_MULTIPLIER',
  EVIDENCE_ATTACHMENT_ONLY = 'EVIDENCE_ATTACHMENT_ONLY',
}

export const ALL_L8_REGIME_CONSUMPTION_RIGHTS:
  readonly L8RegimeConsumptionRight[] =
    Object.values(L8RegimeConsumptionRight);

/**
 * §8.5.9.3 — Typed misuse categories. The consumption validator surfaces
 * these codes whenever a binding attempts to influence a downstream
 * decision it is not entitled to influence.
 */
export enum L8RegimeInputViolationCode {
  // Taxonomy / family / domain
  UNREGISTERED_FAMILY = 'L8I_UNREGISTERED_FAMILY',
  UNREGISTERED_DOMAIN = 'L8I_UNREGISTERED_DOMAIN',
  DOMAIN_FAMILY_MISMATCH = 'L8I_DOMAIN_FAMILY_MISMATCH',
  DOMAIN_SCOPE_ILLEGAL = 'L8I_DOMAIN_SCOPE_ILLEGAL',
  DOMAIN_SOURCE_LAYER_ILLEGAL = 'L8I_DOMAIN_SOURCE_LAYER_ILLEGAL',

  // Binding
  BINDING_MISSING_DEPENDENCY_CLASS = 'L8I_BINDING_MISSING_DEP_CLASS',
  BINDING_MISSING_MAX_RELIANCE = 'L8I_BINDING_MISSING_RELIANCE',
  BINDING_RELIANCE_EXCEEDS_CEILING = 'L8I_BINDING_RELIANCE_EXCEEDS_CEILING',
  BINDING_SOURCE_SURFACE_ILLEGAL = 'L8I_BINDING_SURFACE_CLASS_ILLEGAL',
  BINDING_SOURCE_LAYER_MISMATCH = 'L8I_BINDING_SOURCE_LAYER_MISMATCH',
  BINDING_FAMILY_REQUIRES_RESTRICTION = 'L8I_BINDING_REQUIRES_RESTRICTION',
  BINDING_FAMILY_REQUIRES_CONTRADICTION = 'L8I_BINDING_REQUIRES_CONTRADICTION',
  BINDING_EVIDENCE_ONLY_AS_REQUIRED = 'L8I_BINDING_EVIDENCE_ONLY_AS_REQUIRED',
  BINDING_HISTORICAL_AS_CURRENT = 'L8I_BINDING_HISTORICAL_AS_CURRENT',
  BINDING_OPTIONAL_AS_REQUIRED = 'L8I_BINDING_OPTIONAL_AS_REQUIRED',

  // Admissibility
  ADMISSIBILITY_RAW_INPUT_BYPASS = 'L8I_RAW_INPUT_BYPASS',
  ADMISSIBILITY_RESTRICTION_BYPASS = 'L8I_RESTRICTION_BYPASS',
  ADMISSIBILITY_CONTRADICTION_NEGLECT = 'L8I_CONTRADICTION_NEGLECT',
  ADMISSIBILITY_STALE_SUPPORT_MASQUERADE = 'L8I_STALE_SUPPORT_MASQUERADE',
  ADMISSIBILITY_HISTORICAL_AS_CURRENT = 'L8I_HISTORICAL_AS_CURRENT',
  ADMISSIBILITY_EVIDENCE_ONLY_AS_SUPPORT = 'L8I_EVIDENCE_ONLY_AS_SUPPORT',
  ADMISSIBILITY_OPTIONAL_AS_REQUIRED = 'L8I_OPTIONAL_AS_REQUIRED',
  ADMISSIBILITY_DEGRADED_AS_CLEAN = 'L8I_DEGRADED_AS_CLEAN',

  // Consumption rights (§8.5.8.4)
  RIGHT_PRIMARY_NOT_GRANTED = 'L8I_RIGHT_PRIMARY_NOT_GRANTED',
  RIGHT_SECONDARY_NOT_GRANTED = 'L8I_RIGHT_SECONDARY_NOT_GRANTED',
  RIGHT_TRANSITION_NOT_GRANTED = 'L8I_RIGHT_TRANSITION_NOT_GRANTED',
  RIGHT_CONFIDENCE_NOT_GRANTED = 'L8I_RIGHT_CONFIDENCE_NOT_GRANTED',
  RIGHT_MULTIPLIER_NOT_GRANTED = 'L8I_RIGHT_MULTIPLIER_NOT_GRANTED',

  // Lower-layer consumption (§8.5.8.1-2)
  LOWER_LAYER_L7_BYPASS = 'L8I_L7_BYPASS',
  LOWER_LAYER_L6_REVALIDATION = 'L8I_L6_REVALIDATION',
  LOWER_LAYER_RIGHTS_WIDENED = 'L8I_RIGHTS_WIDENED',
  LOWER_LAYER_CONTRADICTION_DOWNGRADED = 'L8I_CONTRADICTION_DOWNGRADED',
  LOWER_LAYER_BLOCKED_CONSUMED = 'L8I_BLOCKED_CONSUMED',

  // Cross-scope / cross-family
  SCOPE_MISMATCH = 'L8I_SCOPE_MISMATCH',
  FAMILY_MISMATCH = 'L8I_FAMILY_MISMATCH',
  JUDGMENT_SURFACE_LEAK = 'L8I_JUDGMENT_SURFACE_LEAK',
}

export const ALL_L8_REGIME_INPUT_VIOLATION_CODES:
  readonly L8RegimeInputViolationCode[] =
    Object.values(L8RegimeInputViolationCode);

/**
 * §8.5.8.4 — Consumption rights matrix. Maps (dependency_class ×
 * admissibility) → set of downstream decisions the input may influence.
 */
export const L8_CONSUMPTION_RIGHTS_MATRIX: Readonly<
  Record<
    L8RegimeDependencyClass,
    Readonly<Record<
      L8RegimeInputAdmissibilityClass,
      readonly L8RegimeConsumptionRight[]
    >>
  >
> = {
  [L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT]: {
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL]: [
      L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION,
      L8RegimeConsumptionRight.INFLUENCE_SECONDARY_CLASSIFICATION,
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE,
      L8RegimeConsumptionRight.INFLUENCE_MULTIPLIER,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED]: [
      L8RegimeConsumptionRight.INFLUENCE_SECONDARY_CLASSIFICATION,
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.BLOCKED]: [],
  },

  [L8RegimeDependencyClass.REQUIRED_PRIMITIVE_INPUT]: {
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL]: [
      L8RegimeConsumptionRight.INFLUENCE_PRIMARY_CLASSIFICATION,
      L8RegimeConsumptionRight.INFLUENCE_SECONDARY_CLASSIFICATION,
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.INFLUENCE_MULTIPLIER,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED]: [
      L8RegimeConsumptionRight.INFLUENCE_SECONDARY_CLASSIFICATION,
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.INFLUENCE_MULTIPLIER,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.BLOCKED]: [],
  },

  [L8RegimeDependencyClass.REQUIRED_CONTEXT_INPUT]: {
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.INFLUENCE_MULTIPLIER,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.BLOCKED]: [],
  },

  [L8RegimeDependencyClass.OPTIONAL_CONTEXT_INPUT]: {
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.BLOCKED]: [],
  },

  [L8RegimeDependencyClass.HISTORICAL_INPUT]: {
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.INFLUENCE_CONFIDENCE,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED]: [
      L8RegimeConsumptionRight.INFLUENCE_TRANSITION_RISK,
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.BLOCKED]: [],
  },

  [L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT]: {
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY]: [
      L8RegimeConsumptionRight.EVIDENCE_ATTACHMENT_ONLY,
    ],
    [L8RegimeInputAdmissibilityClass.BLOCKED]: [],
  },
};

export function getL8ConsumptionRights(
  depClass: L8RegimeDependencyClass,
  admissibility: L8RegimeInputAdmissibilityClass,
): readonly L8RegimeConsumptionRight[] {
  return L8_CONSUMPTION_RIGHTS_MATRIX[depClass]?.[admissibility] ?? [];
}

export function hasL8ConsumptionRight(
  depClass: L8RegimeDependencyClass,
  admissibility: L8RegimeInputAdmissibilityClass,
  right: L8RegimeConsumptionRight,
): boolean {
  return getL8ConsumptionRights(depClass, admissibility).includes(right);
}
