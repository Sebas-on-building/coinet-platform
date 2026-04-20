/**
 * L9.7 — Sequence Confidence Policy Validator
 *
 * §9.7.3 / §9.7.4 — Validates an `L9RelianceConfidenceProfile` against
 * the confidence policy: factor coverage (§9.7.3.5), per-factor range
 * and registration (§9.7.3.4), raw/capped/band separation
 * (§9.7.4.5–§9.7.4.6), and blocking-factor invariants
 * (INV-9.7-B / §9.7.2.4).
 */

import {
  ALL_L9_RELIANCE_CONFIDENCE_BANDS,
  ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES,
  ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_EFFECTS,
  L9RelianceConfidenceBand,
  L9RelianceConfidenceProfile,
  L9SequenceConfidenceFactor,
  L9SequenceConfidenceFactorClass,
  L9SequenceConfidenceFactorEffect,
  L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES,
  classifyL9RelianceConfidenceBand,
} from '../contracts/l9_7-sequence-confidence-policy';
import {
  L9SequenceRelianceValidationError,
  L9SequenceRelianceViolation,
  L9SequenceRelianceViolationCode,
  L9SequenceRelianceViolationTier,
} from './l9-reliance-violation-codes';

export interface L9SequenceConfidencePolicyValidationInput {
  readonly profile: L9RelianceConfidenceProfile;
}

export interface L9SequenceConfidencePolicyValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9SequenceRelianceViolation[];
}

function v(
  code: L9SequenceRelianceViolationCode,
  detail: string,
  refs?: readonly string[],
): L9SequenceRelianceViolation {
  return {
    code,
    tier: L9SequenceRelianceViolationTier.CONFIDENCE,
    detail,
    ...(refs ? { offending_refs: refs } : {}),
  };
}

function isIn01(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export function validateL9SequenceConfidencePolicy(
  input: L9SequenceConfidencePolicyValidationInput,
): L9SequenceConfidencePolicyValidationResult {
  const p = input.profile;
  const violations: L9SequenceRelianceViolation[] = [];

  // §9.7.3.4 — per-factor checks + duplicate-id detection
  const seenIds = new Set<string>();
  const classesSeen = new Set<L9SequenceConfidenceFactorClass>();
  for (const f of p.factors) {
    if (seenIds.has(f.factor_id)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_FACTOR_ID_DUPLICATE,
          `factor_id ${f.factor_id} duplicated in profile`,
          [f.factor_id]));
    }
    seenIds.add(f.factor_id);

    if (!ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_CLASSES.includes(f.factor_class)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_FACTOR_CLASS_UNREGISTERED,
          `factor_class ${f.factor_class} not a registered L9.7 factor class`,
          [f.factor_id]));
    } else {
      classesSeen.add(f.factor_class);
    }

    if (!ALL_L9_SEQUENCE_CONFIDENCE_FACTOR_EFFECTS.includes(f.reliance_effect)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_FACTOR_EFFECT_UNREGISTERED,
          `reliance_effect ${f.reliance_effect} not registered`,
          [f.factor_id]));
    }

    if (!isIn01(f.raw_score)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_FACTOR_RAW_OUT_OF_RANGE,
          `factor ${f.factor_id} raw_score=${f.raw_score} not in [0,1]`,
          [f.factor_id]));
    }
    if (!isIn01(f.normalized_score)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_FACTOR_NORMALIZED_OUT_OF_RANGE,
          `factor ${f.factor_id} normalized_score=${f.normalized_score} not in [0,1]`,
          [f.factor_id]));
    }
    if (!f.policy_version || f.policy_version.length === 0) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_FACTOR_POLICY_VERSION_MISSING,
          `factor ${f.factor_id} missing policy_version`,
          [f.factor_id]));
    }
  }

  // §9.7.3.5 — completeness: every required class present
  for (const cls of L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES) {
    if (!classesSeen.has(cls)) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_FACTOR_GROUP_MISSING,
          `profile missing required factor class ${cls}`,
          [cls]));
    }
  }

  // §9.7.4.5 — raw/capped ranges
  if (!isIn01(p.raw_confidence_score)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CONF_RAW_SCORE_OUT_OF_RANGE,
        `raw_confidence_score=${p.raw_confidence_score} not in [0,1]`));
  }
  if (!isIn01(p.capped_confidence_score)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CONF_CAPPED_SCORE_OUT_OF_RANGE,
        `capped_confidence_score=${p.capped_confidence_score} not in [0,1]`));
  }
  if (
    Number.isFinite(p.raw_confidence_score) &&
    Number.isFinite(p.capped_confidence_score) &&
    p.capped_confidence_score > p.raw_confidence_score + 1e-9
  ) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CONF_CAPPED_GT_RAW,
        `capped_confidence_score (${p.capped_confidence_score}) exceeds ` +
          `raw_confidence_score (${p.raw_confidence_score}); caps narrow only`));
  }

  // §9.7.4.6 — band derived from *capped* score
  if (!ALL_L9_RELIANCE_CONFIDENCE_BANDS.includes(p.confidence_band)) {
    violations.push(
      v(L9SequenceRelianceViolationCode.CONF_BAND_INCONSISTENT_WITH_CAPPED,
        `confidence_band ${p.confidence_band} not a registered band`));
  } else {
    const expected = classifyL9RelianceConfidenceBand(p.capped_confidence_score);
    if (expected !== p.confidence_band) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_BAND_INCONSISTENT_WITH_CAPPED,
          `confidence_band ${p.confidence_band} does not match capped=` +
            `${p.capped_confidence_score} (expected ${expected})`));
    }
  }

  // §9.7.2.4 / INV-9.7-B — blocking factor under HIGH/MEDIUM band is illegal
  if (
    p.confidence_band === L9RelianceConfidenceBand.HIGH ||
    p.confidence_band === L9RelianceConfidenceBand.MEDIUM
  ) {
    if (p.factors.some(
      f => f.reliance_effect === L9SequenceConfidenceFactorEffect.BLOCKS,
    )) {
      violations.push(
        v(L9SequenceRelianceViolationCode.CONF_BLOCKING_FACTOR_UNDER_CLEAN_BAND,
          `profile has a BLOCKS factor but surfaces band=${p.confidence_band}`));
    }
  }

  return { ok: violations.length === 0, violations };
}

export function assertL9SequenceConfidencePolicyLegal(
  input: L9SequenceConfidencePolicyValidationInput,
): void {
  const r = validateL9SequenceConfidencePolicy(input);
  if (!r.ok) throw new L9SequenceRelianceValidationError(r.violations);
}

/**
 * §9.7.3.5 — Helper: does an arbitrary factor list cover every
 * required class? Public because the engine uses it before emitting.
 */
export function l9SequenceConfidenceFactorsComplete(
  factors: readonly L9SequenceConfidenceFactor[],
): boolean {
  const seen = new Set(factors.map(f => f.factor_class));
  return L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES.every(c => seen.has(c));
}
