/**
 * L10.7 — Hypothesis Confidence Policy Validator
 *
 * §10.7.3 / §10.7.4 — Validates that a
 * `L10HypothesisConfidenceProfile` is legal:
 *
 *   - factor completeness (every required class present — §10.7.3.5)
 *   - factor boundedness (raw/normalized in [0,1])
 *   - factor-id uniqueness
 *   - policy_version present on every factor
 *   - raw and capped in [0,1], capped ≤ raw
 *   - band matches `classifyL10HypothesisRelianceConfidenceBand(capped)`
 *   - no blocking factor present while the band is HIGH
 */

import {
  ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_CLASSES,
  ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_EFFECTS,
  L10HypothesisConfidenceFactor,
  L10HypothesisConfidenceFactorClass,
  L10HypothesisConfidenceFactorEffect,
  L10HypothesisConfidenceProfile,
  L10HypothesisRelianceConfidenceBand,
  L10_REQUIRED_CONFIDENCE_FACTOR_CLASSES,
  classifyL10HypothesisRelianceConfidenceBand,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisRelianceValidationError,
  L10HypothesisRelianceViolation,
  L10HypothesisRelianceViolationCode,
  L10HypothesisRelianceViolationTier,
} from './l10-reliance-violation-codes';

export interface L10ConfidencePolicyValidationInput {
  readonly profile: L10HypothesisConfidenceProfile;
  /** §10.7.3.5 — classes the engine says must be present (defaults to
   *  the full required set — §10.7.3.5). */
  readonly required_factor_classes?:
    readonly L10HypothesisConfidenceFactorClass[];
}

export interface L10ConfidencePolicyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10HypothesisRelianceViolation[];
}

function v(
  code: L10HypothesisRelianceViolationCode,
  detail: string,
  refs?: readonly string[],
): L10HypothesisRelianceViolation {
  return {
    code,
    tier: L10HypothesisRelianceViolationTier.CONFIDENCE,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

function in01(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export function validateL10HypothesisConfidenceProfile(
  input: L10ConfidencePolicyValidationInput,
): L10ConfidencePolicyValidationResult {
  const p = input.profile;
  const violations: L10HypothesisRelianceViolation[] = [];

  // §10.7.9.2 — replay identity / primary ref prerequisites.
  if (!p.primary_hypothesis_ref) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CONF_PRIMARY_REF_MISSING,
        'confidence profile missing primary_hypothesis_ref'));
  }
  if (!p.replay_hash) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CONF_REPLAY_HASH_MISSING,
        'confidence profile missing replay_hash'));
  }

  // §10.7.3 — factor completeness, boundedness, uniqueness.
  const seenIds = new Set<string>();
  const seenClasses = new Set<L10HypothesisConfidenceFactorClass>();
  for (const f of p.factors) {
    if (!ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_CLASSES.includes(f.factor_class)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CONF_FACTOR_CLASS_UNREGISTERED,
          `factor_class ${f.factor_class} not registered`,
          [f.factor_id]));
    }
    if (!ALL_L10_HYPOTHESIS_CONFIDENCE_FACTOR_EFFECTS.includes(
      f.reliance_effect,
    )) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CONF_FACTOR_EFFECT_UNREGISTERED,
          `reliance_effect ${f.reliance_effect} not registered`,
          [f.factor_id]));
    }
    if (!in01(f.raw_score)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CONF_FACTOR_RAW_OUT_OF_RANGE,
          `factor ${f.factor_id} raw_score=${f.raw_score} out of [0,1]`,
          [f.factor_id]));
    }
    if (!in01(f.normalized_score)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CONF_FACTOR_NORMALIZED_OUT_OF_RANGE,
          `factor ${f.factor_id} normalized_score=${f.normalized_score} ` +
            `out of [0,1]`,
          [f.factor_id]));
    }
    if (seenIds.has(f.factor_id)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CONF_FACTOR_ID_DUPLICATE,
          `factor_id ${f.factor_id} duplicated`,
          [f.factor_id]));
    }
    seenIds.add(f.factor_id);
    seenClasses.add(f.factor_class);
    if (!f.policy_version) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CONF_FACTOR_POLICY_VERSION_MISSING,
          `factor ${f.factor_id} missing policy_version`,
          [f.factor_id]));
    }
  }
  const required =
    input.required_factor_classes ?? L10_REQUIRED_CONFIDENCE_FACTOR_CLASSES;
  for (const cls of required) {
    if (!seenClasses.has(cls)) {
      violations.push(
        v(L10HypothesisRelianceViolationCode.CONF_FACTOR_GROUP_MISSING,
          `required factor class ${cls} missing`,
          [String(cls)]));
    }
  }

  // §10.7.4.6 — raw/capped bounds + band consistency.
  if (!in01(p.raw_confidence_score)) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CONF_RAW_SCORE_OUT_OF_RANGE,
        `raw_confidence_score=${p.raw_confidence_score} out of [0,1]`));
  }
  if (!in01(p.capped_confidence_score)) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CONF_CAPPED_SCORE_OUT_OF_RANGE,
        `capped_confidence_score=${p.capped_confidence_score} out of [0,1]`));
  }
  if (
    Number.isFinite(p.raw_confidence_score) &&
    Number.isFinite(p.capped_confidence_score) &&
    p.capped_confidence_score > p.raw_confidence_score + 1e-9
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CONF_CAPPED_GT_RAW,
        `capped=${p.capped_confidence_score} exceeds raw=` +
          `${p.raw_confidence_score} (INV-10.7-C)`));
  }
  const expectedBand = classifyL10HypothesisRelianceConfidenceBand(
    p.capped_confidence_score,
  );
  if (expectedBand !== p.confidence_band) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CONF_BAND_INCONSISTENT_WITH_CAPPED,
        `confidence_band=${p.confidence_band} does not match derived ` +
          `${expectedBand} for capped=${p.capped_confidence_score}`));
  }

  // §10.7.4.6 — blocking-factor guard under clean-band (HIGH).
  const hasBlocking = p.factors.some(
    (f: L10HypothesisConfidenceFactor) =>
      f.reliance_effect === L10HypothesisConfidenceFactorEffect.BLOCKS,
  );
  if (
    hasBlocking &&
    p.confidence_band === L10HypothesisRelianceConfidenceBand.HIGH
  ) {
    violations.push(
      v(L10HypothesisRelianceViolationCode.CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND,
        'blocking factor present while confidence_band=HIGH (INV-10.7-B)'));
  }

  return { ok: violations.length === 0, violations };
}

export function assertL10HypothesisConfidenceProfileLegal(
  input: L10ConfidencePolicyValidationInput,
): void {
  const r = validateL10HypothesisConfidenceProfile(input);
  if (!r.ok) throw new L10HypothesisRelianceValidationError(r.violations);
}
