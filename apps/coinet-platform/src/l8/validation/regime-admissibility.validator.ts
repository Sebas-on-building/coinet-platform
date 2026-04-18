/**
 * L8.5 — Regime Admissibility Validator
 *
 * §8.5.7.2 / §8.5.7.4 — Resolves an input's admissibility state and
 * weight class from its declared binding + runtime posture factors.
 * Enforces §8.5.7.6 (restriction-aware narrowing), §8.5.7.7 (contradiction-
 * aware narrowing), and §8.5.7.8 evidence-weighting law.
 */

import {
  L8RegimeInputAdmissibilityFactors,
  L8RegimeInputAdmissibilityDecision,
  L8RegimeInputAdmissibilityClass,
  L8RegimeEvidenceWeightClass,
  deriveEvidenceWeightClass,
  admissibilityStrength,
} from '../contracts/regime-admissibility';
import {
  L8RegimeDependencyClass,
  L8RegimeMaxRelianceClass,
  relianceStrength,
} from '../contracts/regime-input-binding';
import { L8RegimeInputViolationCode } from '../contracts/regime-consumption-rights';

export interface L8AdmissibilityIssue {
  readonly code: L8RegimeInputViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8AdmissibilityReport {
  readonly valid: boolean;
  readonly decision: L8RegimeInputAdmissibilityDecision;
  readonly issues: readonly L8AdmissibilityIssue[];
}

function clampAdmissibility(
  declared: L8RegimeInputAdmissibilityClass,
  ceiling: L8RegimeMaxRelianceClass,
): L8RegimeInputAdmissibilityClass {
  // Admissibility may not exceed the declared binding max reliance.
  // We map declared reliance ceiling → max admissibility class.
  const cap: Record<L8RegimeMaxRelianceClass, L8RegimeInputAdmissibilityClass> = {
    [L8RegimeMaxRelianceClass.FULL_SUPPORT]:
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL,
    [L8RegimeMaxRelianceClass.NARROWED_SUPPORT]:
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED,
    [L8RegimeMaxRelianceClass.CONTEXT_ONLY]:
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY,
    [L8RegimeMaxRelianceClass.EVIDENCE_ONLY]:
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY,
    [L8RegimeMaxRelianceClass.BLOCKED]:
      L8RegimeInputAdmissibilityClass.BLOCKED,
  };
  const capped = cap[ceiling];
  return admissibilityStrength(declared) > admissibilityStrength(capped)
    ? capped : declared;
}

export function resolveRegimeInputAdmissibility(
  f: L8RegimeInputAdmissibilityFactors,
): L8AdmissibilityReport {
  const issues: L8AdmissibilityIssue[] = [];
  const reasons: string[] = [];

  let admissibility: L8RegimeInputAdmissibilityClass =
    L8RegimeInputAdmissibilityClass.ADMISSIBLE_FULL;

  // Hard-block conditions
  if (!f.scope_ok) {
    admissibility = L8RegimeInputAdmissibilityClass.BLOCKED;
    reasons.push('SCOPE_MISMATCH');
    issues.push({
      code: L8RegimeInputViolationCode.SCOPE_MISMATCH,
      message: `scope mismatch for ${f.ref}`,
    });
  }
  if (f.degraded) {
    admissibility = L8RegimeInputAdmissibilityClass.BLOCKED;
    reasons.push('DEGRADED_INPUT');
    issues.push({
      code: L8RegimeInputViolationCode.ADMISSIBILITY_DEGRADED_AS_CLEAN,
      message: `degraded input ${f.ref} cannot appear as clean`,
    });
  }

  // §8.5.4.1 / §8.5.7.6 — Restriction posture required but not consumed
  const requiresRestrictionConsumption =
    f.dependency_class === L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT ||
    f.input_family === 'VALIDATION_ASSESSMENT_FAMILY' ||
    f.input_family === 'CONTRADICTION_BUNDLE_FAMILY' ||
    f.input_family === 'VALIDATION_CONFIDENCE_FAMILY' ||
    f.input_family === 'CLAIM_RESTRICTION_FAMILY';
  if (requiresRestrictionConsumption && !f.consumed_restriction_posture) {
    admissibility = L8RegimeInputAdmissibilityClass.BLOCKED;
    reasons.push('RESTRICTION_POSTURE_NOT_CONSUMED');
    issues.push({
      code: L8RegimeInputViolationCode.ADMISSIBILITY_RESTRICTION_BYPASS,
      message:
        `family ${f.input_family} requires restriction consumption`,
    });
  }

  // §8.5.7.7 — Contradiction posture: if severe and consumed, narrow or
  // drop to evidence-only based on severity. If unresolved and not
  // consumed on a family that requires it, block.
  if (f.contradiction_unresolved && requiresRestrictionConsumption &&
      !f.consumed_contradiction_posture) {
    admissibility = L8RegimeInputAdmissibilityClass.BLOCKED;
    reasons.push('CONTRADICTION_POSTURE_NOT_CONSUMED');
    issues.push({
      code: L8RegimeInputViolationCode.ADMISSIBILITY_CONTRADICTION_NEGLECT,
      message:
        `unresolved contradiction requires consumption for ${f.ref}`,
    });
  }

  // Stale-masquerade (§8.5.9.3 / §8.5.7.6)
  if (f.stale && !f.is_historical_only) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED);
    reasons.push('STALE_SUPPORT_NARROWED');
  }

  // Evidence-complete gate
  if (!f.evidence_complete) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY);
    reasons.push('EVIDENCE_INCOMPLETE');
  }

  // §8.5.4.4 / §8.5.4.5 — validated-supported inputs retain full tier;
  // unsupported primitive-only inputs narrow.
  if (f.dependency_class === L8RegimeDependencyClass.REQUIRED_VALIDATION_INPUT
      && !f.validation_supported) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED);
    reasons.push('VALIDATION_UNSUPPORTED');
  }

  // §8.5.7.3 — Low lower-layer confidence narrows
  if (f.lower_layer_confidence_score < 0.3) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED);
    reasons.push('LOW_LOWER_LAYER_CONFIDENCE');
  }

  // §8.5.7.7 — Severe contradiction narrows to NARROWED at most
  if (f.contradiction_severe && f.consumed_contradiction_posture) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED);
    reasons.push('CONTRADICTION_SEVERE_NARROWS');
  }

  // §8.5.7.6 — Restriction that narrows rights → NARROWED at most
  if (f.restriction_narrows_rights && f.consumed_restriction_posture) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_NARROWED);
    reasons.push('RESTRICTION_NARROWS_RIGHTS');
  }

  // §8.5.6.3 / §8.5.7.2 — historical-only inputs cannot be FULL unless
  // their dependency class is HISTORICAL_INPUT.
  if (f.is_historical_only &&
      f.dependency_class !== L8RegimeDependencyClass.HISTORICAL_INPUT) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_CONTEXT_ONLY);
    reasons.push('HISTORICAL_AS_CURRENT_NARROWED');
    issues.push({
      code: L8RegimeInputViolationCode.ADMISSIBILITY_HISTORICAL_AS_CURRENT,
      message:
        `historical-only input ${f.ref} for non-HISTORICAL dependency class`,
    });
  }

  // §8.5.6.3 — EVIDENCE_ONLY_INPUT can never rise above evidence-only
  if (f.dependency_class === L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT) {
    admissibility = admissibilityMin(admissibility,
      L8RegimeInputAdmissibilityClass.ADMISSIBLE_EVIDENCE_ONLY);
  }

  // §8.5.6.5 — admissibility cannot exceed declared max reliance ceiling
  const clamped = clampAdmissibility(admissibility, f.declared_max_reliance);
  if (admissibilityStrength(admissibility) >
      admissibilityStrength(clamped)) {
    reasons.push('RELIANCE_CEILING_APPLIED');
    admissibility = clamped;
  }

  const weight: L8RegimeEvidenceWeightClass =
    deriveEvidenceWeightClass(admissibility, f.dependency_class);

  const decision: L8RegimeInputAdmissibilityDecision = {
    ref: f.ref,
    admissibility,
    weight_class: weight,
    reasons: reasons.sort(),
  };

  // §8.5.6.5 — If declared ceiling is BLOCKED, the validator must block.
  if (f.declared_max_reliance === L8RegimeMaxRelianceClass.BLOCKED &&
      admissibility !== L8RegimeInputAdmissibilityClass.BLOCKED) {
    issues.push({
      code: L8RegimeInputViolationCode.BINDING_RELIANCE_EXCEEDS_CEILING,
      message: `declared reliance BLOCKED but admissibility resolved ${admissibility}`,
    });
  }

  // If declared reliance is FULL but binding is EVIDENCE_ONLY, flag.
  if (f.dependency_class === L8RegimeDependencyClass.EVIDENCE_ONLY_INPUT &&
      relianceStrength(f.declared_max_reliance) >
        relianceStrength(L8RegimeMaxRelianceClass.EVIDENCE_ONLY)) {
    issues.push({
      code: L8RegimeInputViolationCode.ADMISSIBILITY_EVIDENCE_ONLY_AS_SUPPORT,
      message:
        `EVIDENCE_ONLY_INPUT ${f.ref} declared reliance ${f.declared_max_reliance}`,
    });
  }

  return { valid: issues.length === 0, decision, issues };
}

function admissibilityMin(
  a: L8RegimeInputAdmissibilityClass,
  b: L8RegimeInputAdmissibilityClass,
): L8RegimeInputAdmissibilityClass {
  return admissibilityStrength(a) <= admissibilityStrength(b) ? a : b;
}
