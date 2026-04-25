/**
 * L10.7 — Hypothesis Confidence Engine
 *
 * §10.7.3 / §10.7.4 — Deterministic builder for the hypothesis
 * confidence profile. Accepts per-factor-class contributions, composes
 * a raw score from the factor model (§10.7.3.3), delegates cap
 * application to the cap-chain engine (§10.7.6), and derives the
 * final band from the *capped* score (§10.7.4.6 / INV-10.7-C).
 *
 * This engine never mutates inputs; output is a pure function of
 * inputs — the basis for INV-10.7-A replay identity.
 */

import {
  classifyL10HypothesisRelianceConfidenceBand,
  L10HypothesisConfidenceFactor,
  L10HypothesisConfidenceFactorClass,
  L10HypothesisConfidenceFactorEffect,
  L10HypothesisConfidenceProfile,
  L10HypothesisRelianceConfidenceBand,
  L10_HYPOTHESIS_CONFIDENCE_FACTOR_WEIGHTS,
  L10_HYPOTHESIS_INVERTED_CONFIDENCE_CLASSES,
  L10_REQUIRED_CONFIDENCE_FACTOR_CLASSES,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisCapChain,
  L10HypothesisCapReason,
} from '../contracts/hypothesis-cap-chain';
import { buildL10HypothesisCapChain } from './hypothesis-cap-chain-engine';

export interface L10HypothesisConfidenceEngineInput {
  readonly hypothesis_subject_id: string;
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  /**
   * §10.7.3.4 — normalized per-class contributions in [0,1]. Missing
   * classes produce a profile that fails the confidence validator
   * (CONF_FACTOR_GROUP_MISSING).
   */
  readonly contributions: Readonly<
    Record<L10HypothesisConfidenceFactorClass, number>
  >;
  /** §10.7.6.1 — cap reasons this engine should apply (tie-broken by
   *  the cap-chain engine). */
  readonly applied_caps: readonly L10HypothesisCapReason[];
  /** §10.7.3.4 — lineage refs propagated to each factor. */
  readonly lineage_refs: readonly string[];
  /** §10.7.3.4 — policy version that produced this profile. */
  readonly policy_version: string;
  /**
   * §10.7.3.3 — optional per-class effect override. Defaults to
   * `SUPPORTS` for support-class factors and `NARROWS` for factors
   * that explicitly narrow reliance (contradiction / invalidation
   * risk).
   */
  readonly effect_overrides?: Partial<
    Record<L10HypothesisConfidenceFactorClass, L10HypothesisConfidenceFactorEffect>
  >;
  /**
   * §10.7.3.4 — optional per-class cap-trigger flag override. When a
   * factor signals that it would trigger a cap if thresholded, those
   * hints are propagated to the factor record for traceability.
   */
  readonly cap_trigger_flag_overrides?: Partial<
    Record<L10HypothesisConfidenceFactorClass, readonly string[]>
  >;
}

export interface L10HypothesisConfidenceEngineOutput {
  readonly profile: L10HypothesisConfidenceProfile;
  readonly cap_chain: L10HypothesisCapChain;
}

const INVERTED_SET: ReadonlySet<L10HypothesisConfidenceFactorClass> =
  new Set(L10_HYPOTHESIS_INVERTED_CONFIDENCE_CLASSES);

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function defaultEffectFor(
  cls: L10HypothesisConfidenceFactorClass,
  normalized: number,
): L10HypothesisConfidenceFactorEffect {
  if (INVERTED_SET.has(cls)) {
    if (normalized >= 0.80) return L10HypothesisConfidenceFactorEffect.BLOCKS;
    if (normalized >= 0.40) return L10HypothesisConfidenceFactorEffect.NARROWS;
    return L10HypothesisConfidenceFactorEffect.NEUTRAL;
  }
  if (normalized <= 0.20) return L10HypothesisConfidenceFactorEffect.NARROWS;
  if (normalized >= 0.60) return L10HypothesisConfidenceFactorEffect.SUPPORTS;
  return L10HypothesisConfidenceFactorEffect.NEUTRAL;
}

function round4(x: number): string {
  return Number.isFinite(x) ? x.toFixed(4) : 'NaN';
}

/**
 * §10.7.3 / §10.7.4 — Build a deterministic confidence profile + its
 * companion cap chain.
 */
export function buildL10HypothesisConfidenceProfile(
  input: L10HypothesisConfidenceEngineInput,
): L10HypothesisConfidenceEngineOutput {
  const factors: L10HypothesisConfidenceFactor[] = [];
  let rawScore = 0;

  for (const cls of L10_REQUIRED_CONFIDENCE_FACTOR_CLASSES) {
    const raw = clamp01(input.contributions[cls]);
    const normalized = raw;
    const contribution = INVERTED_SET.has(cls) ? 1 - normalized : normalized;
    rawScore += contribution * L10_HYPOTHESIS_CONFIDENCE_FACTOR_WEIGHTS[cls];

    const effectOverride = input.effect_overrides?.[cls];
    const effect = effectOverride ?? defaultEffectFor(cls, normalized);
    const triggerFlags = input.cap_trigger_flag_overrides?.[cls] ?? [];

    factors.push({
      factor_id: `${input.hypothesis_subject_id}:${cls}`,
      factor_class: cls,
      raw_score: raw,
      normalized_score: normalized,
      reliance_effect: effect,
      cap_trigger_flags: triggerFlags,
      lineage_refs: [...input.lineage_refs].sort(),
      policy_version: input.policy_version,
    });
  }
  rawScore = clamp01(rawScore);

  const capChain = buildL10HypothesisCapChain({
    hypothesis_subject_id: input.hypothesis_subject_id,
    pre_cap_score: rawScore,
    applied_cap_reasons: input.applied_caps,
  });

  const cappedScore = capChain.post_cap_score;
  const band: L10HypothesisRelianceConfidenceBand =
    classifyL10HypothesisRelianceConfidenceBand(cappedScore);

  const profile: L10HypothesisConfidenceProfile = {
    hypothesis_subject_id: input.hypothesis_subject_id,
    primary_hypothesis_ref: input.primary_hypothesis_ref,
    secondary_hypothesis_ref: input.secondary_hypothesis_ref,
    factors,
    raw_confidence_score: rawScore,
    capped_confidence_score: cappedScore,
    confidence_band: band,
    cap_chain_ref: `l10ccr:${input.hypothesis_subject_id}:` +
      `${capChain.tightest_cap ?? 'none'}`,
    policy_version: input.policy_version,
    replay_hash:
      `h:l10cp:${input.hypothesis_subject_id}:${band}:` +
      `${round4(rawScore)}/${round4(cappedScore)}:` +
      [...input.applied_caps].sort().join('+'),
  };

  return { profile, cap_chain: capChain };
}
