/**
 * L8.5 — Regime Input Admissibility Contract
 *
 * §8.5.7 — Admissibility doctrine. Every consumed input must resolve
 * into one of the typed admissibility classes. Evidence weighting,
 * contradiction-aware narrowing, and restriction-aware narrowing all
 * feed into the final admissibility decision.
 */

import type { L8RegimeInputFamily } from './regime-input-family';
import type { L8RegimeInputDomain } from './regime-input-domain';
import {
  L8RegimeDependencyClass,
  L8RegimeMaxRelianceClass,
} from './regime-input-binding';

/**
 * §8.5.7.2 — Input admissibility states.
 */
export enum L8RegimeInputAdmissibilityClass {
  ADMISSIBLE_FULL = 'ADMISSIBLE_FULL',
  ADMISSIBLE_NARROWED = 'ADMISSIBLE_NARROWED',
  ADMISSIBLE_CONTEXT_ONLY = 'ADMISSIBLE_CONTEXT_ONLY',
  ADMISSIBLE_EVIDENCE_ONLY = 'ADMISSIBLE_EVIDENCE_ONLY',
  BLOCKED = 'BLOCKED',
}

export const ALL_L8_REGIME_INPUT_ADMISSIBILITY_CLASSES:
  readonly L8RegimeInputAdmissibilityClass[] =
    Object.values(L8RegimeInputAdmissibilityClass);

/**
 * §8.5.7.5 — Evidence weight classes.
 */
export enum L8RegimeEvidenceWeightClass {
  PRIMARY_EVIDENCE_WEIGHT = 'PRIMARY_EVIDENCE_WEIGHT',
  SECONDARY_EVIDENCE_WEIGHT = 'SECONDARY_EVIDENCE_WEIGHT',
  NARROWED_EVIDENCE_WEIGHT = 'NARROWED_EVIDENCE_WEIGHT',
  CONTEXTUAL_WEIGHT = 'CONTEXTUAL_WEIGHT',
  AUDIT_ONLY_WEIGHT = 'AUDIT_ONLY_WEIGHT',
  ZERO_WEIGHT = 'ZERO_WEIGHT',
}

export const ALL_L8_REGIME_EVIDENCE_WEIGHT_CLASSES:
  readonly L8RegimeEvidenceWeightClass[] =
    Object.values(L8RegimeEvidenceWeightClass);

/**
 * §8.5.7.3 — Admissibility factors per evaluated input. Populated by the
 * runtime before the admissibility validator runs.
 */
export interface L8RegimeInputAdmissibilityFactors {
  readonly ref: string;
  readonly input_family: L8RegimeInputFamily;
  readonly input_domain: L8RegimeInputDomain;
  readonly dependency_class: L8RegimeDependencyClass;
  readonly declared_max_reliance: L8RegimeMaxRelianceClass;

  // §8.5.7.3 factors
  readonly freshness_ok: boolean;
  readonly stale: boolean;
  readonly degraded: boolean;
  readonly scope_ok: boolean;
  readonly evidence_complete: boolean;
  readonly is_historical_only: boolean;

  // §8.5.7.6 / §8.5.7.7 — L7 posture consumed
  readonly consumed_restriction_posture: boolean;
  readonly restriction_narrows_rights: boolean;
  readonly consumed_contradiction_posture: boolean;
  readonly contradiction_severe: boolean;
  readonly contradiction_unresolved: boolean;

  // §8.5.7.4 factors
  readonly lower_layer_confidence_score: number; // 0..1
  readonly validation_supported: boolean;
  readonly direct_to_regime_family: boolean;
  readonly historical_reliability_score: number; // 0..1
}

/**
 * §8.5.7.2 + §8.5.7.4 — Admissibility decision returned by the
 * admissibility validator.
 */
export interface L8RegimeInputAdmissibilityDecision {
  readonly ref: string;
  readonly admissibility: L8RegimeInputAdmissibilityClass;
  readonly weight_class: L8RegimeEvidenceWeightClass;
  readonly reasons: readonly string[];
}

/**
 * §8.5.7.5 — Strength ordering for admissibility classes.
 *   ADMISSIBLE_FULL (4) > ADMISSIBLE_NARROWED (3) >
 *   ADMISSIBLE_CONTEXT_ONLY (2) > ADMISSIBLE_EVIDENCE_ONLY (1) >
 *   BLOCKED (0)
 */
export const L8_ADMISSIBILITY_STRENGTH_INDEX:
  Readonly<Record<L8RegimeInputAdmissibilityClass, number>> = {
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL]: 4,
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED]: 3,
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY]: 2,
    [L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY]: 1,
    [L8RegimeInputAdmissibilityClass.BLOCKED]: 0,
  };

export function admissibilityStrength(
  cls: L8RegimeInputAdmissibilityClass,
): number {
  return L8_ADMISSIBILITY_STRENGTH_INDEX[cls] ?? 0;
}

/**
 * Deterministic weight-class derivation from admissibility + dependency
 * class. Keeps weighting uniform across engines.
 */
export function deriveEvidenceWeightClass(
  admissibility: L8RegimeInputAdmissibilityClass,
  depClass: L8RegimeDependencyClass,
): L8RegimeEvidenceWeightClass {
  if (admissibility === L8RegimeInputAdmissibilityClass.BLOCKED) {
    return L8RegimeEvidenceWeightClass.ZERO_WEIGHT;
  }
  if (admissibility ===
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY) {
    return L8RegimeEvidenceWeightClass.AUDIT_ONLY_WEIGHT;
  }
  if (admissibility ===
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY) {
    return L8RegimeEvidenceWeightClass.CONTEXTUAL_WEIGHT;
  }
  if (admissibility ===
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED) {
    return L8RegimeEvidenceWeightClass.NARROWED_EVIDENCE_WEIGHT;
  }
  // ADMISSIBLE_FULL
  if (depClass === L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT) {
    return L8RegimeEvidenceWeightClass.PRIMARY_EVIDENCE_WEIGHT;
  }
  return L8RegimeEvidenceWeightClass.SECONDARY_EVIDENCE_WEIGHT;
}
