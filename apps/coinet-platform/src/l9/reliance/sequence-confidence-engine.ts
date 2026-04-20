/**
 * L9.7 — Reliance Confidence Engine
 *
 * §9.7.3 / §9.7.4 — Deterministic builder for the reliance-grade
 * confidence profile. Takes a `L9RelianceConfidenceInput` (per-factor
 * normalized contributions + raw inputs), composes a raw score from
 * the factor model, delegates cap application to the cap-chain engine,
 * and derives the final band from the *capped* score (§9.7.4.6 /
 * INV-9.7-C).
 *
 * This engine never mutates inputs and its output is a pure function
 * of inputs — the basis for INV-9.7-A / INV-9.7-G replay identity.
 */

import {
  L9RelianceConfidenceBand,
  L9RelianceConfidenceProfile,
  L9SequenceConfidenceFactor,
  L9SequenceConfidenceFactorClass,
  L9SequenceConfidenceFactorEffect,
  L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES,
  classifyL9RelianceConfidenceBand,
} from '../contracts/l9_7-sequence-confidence-policy';
import {
  L9SequenceCapChain,
  L9SequenceCapReason,
} from '../contracts/l9_7-sequence-cap-chain';
import {
  buildL9SequenceCapChain,
} from './sequence-cap-chain-engine';

export interface L9RelianceConfidenceInput {
  readonly sequence_subject_id: string;
  /**
   * §9.7.3.4 — normalized per-class contributions in [0,1]. Missing
   * classes produce a profile that fails the confidence validator
   * (CONF_FACTOR_GROUP_MISSING).
   */
  readonly contributions: Readonly<
    Record<L9SequenceConfidenceFactorClass, number>
  >;
  /** §9.7.5.1 — applied cap reasons (tie-broken by the engine). */
  readonly applied_caps: readonly L9SequenceCapReason[];
  /** §9.7.3.4 — lineage refs propagated to each factor. */
  readonly lineage_refs: readonly string[];
  /** §9.7.3.4 — policy version that produced this profile. */
  readonly policy_version: string;
  /**
   * §9.7.3.3 — optional per-class effect override. Defaults to
   * `SUPPORTS` for support-class factors and `NARROWS` for factors
   * explicitly narrowing reliance (contradiction / decay / ambiguity).
   */
  readonly effect_overrides?: Partial<
    Record<L9SequenceConfidenceFactorClass, L9SequenceConfidenceFactorEffect>
  >;
}

export interface L9RelianceConfidenceEngineOutput {
  readonly profile: L9RelianceConfidenceProfile;
  readonly cap_chain: L9SequenceCapChain;
}

/**
 * §9.7.3.1 — Canonical weights per factor class when composing the
 * raw reliance score. Factors may be specialized later; the weights
 * sum to 1.0. These are intentionally uniform-ish so no single factor
 * dominates (§9.7.3.3).
 */
export const L9_RELIANCE_CONFIDENCE_FACTOR_WEIGHTS: Readonly<
  Record<L9SequenceConfidenceFactorClass, number>
> = {
  [L9SequenceConfidenceFactorClass.ORDER_CLARITY]: 0.14,
  [L9SequenceConfidenceFactorClass.LEAD_LAG_STABILITY]: 0.12,
  [L9SequenceConfidenceFactorClass.CHAIN_COMPLETENESS]: 0.14,
  [L9SequenceConfidenceFactorClass.FRESHNESS]: 0.10,
  [L9SequenceConfidenceFactorClass.CONTRADICTION_PRESSURE]: 0.12,
  [L9SequenceConfidenceFactorClass.REGIME_COMPATIBILITY]: 0.08,
  [L9SequenceConfidenceFactorClass.HISTORICAL_RELIABILITY]: 0.10,
  [L9SequenceConfidenceFactorClass.DECAY_BURDEN]: 0.10,
  [L9SequenceConfidenceFactorClass.ORDERING_AMBIGUITY]: 0.10,
};

/**
 * §9.7.3.3 — Which classes, when high, actively *narrow* reliance.
 * For these classes the contribution must be *inverted* (1 − x) when
 * composing the raw reliance score, because high contradiction or
 * decay or ambiguity reduces — does not raise — how strongly the
 * system may rely on the sequence.
 */
const L9_RELIANCE_INVERTED_CLASSES:
  ReadonlySet<L9SequenceConfidenceFactorClass> = new Set([
    L9SequenceConfidenceFactorClass.CONTRADICTION_PRESSURE,
    L9SequenceConfidenceFactorClass.DECAY_BURDEN,
    L9SequenceConfidenceFactorClass.ORDERING_AMBIGUITY,
  ]);

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function defaultEffectFor(
  cls: L9SequenceConfidenceFactorClass,
  normalized: number,
): L9SequenceConfidenceFactorEffect {
  if (L9_RELIANCE_INVERTED_CLASSES.has(cls)) {
    if (normalized >= 0.80) return L9SequenceConfidenceFactorEffect.BLOCKS;
    if (normalized >= 0.40) return L9SequenceConfidenceFactorEffect.NARROWS;
    return L9SequenceConfidenceFactorEffect.NEUTRAL;
  }
  if (normalized <= 0.20) return L9SequenceConfidenceFactorEffect.NARROWS;
  if (normalized >= 0.60) return L9SequenceConfidenceFactorEffect.SUPPORTS;
  return L9SequenceConfidenceFactorEffect.NEUTRAL;
}

/**
 * §9.7.3 / §9.7.4 — Build the reliance confidence profile and its
 * companion cap chain. Deterministic by construction.
 */
export function buildL9RelianceConfidenceProfile(
  input: L9RelianceConfidenceInput,
): L9RelianceConfidenceEngineOutput {
  const factors: L9SequenceConfidenceFactor[] = [];
  let rawScore = 0;

  for (const cls of L9_REQUIRED_CONFIDENCE_FACTOR_CLASSES) {
    const raw = clamp01(input.contributions[cls]);
    const normalized = raw; // normalized == raw in canonical mapping
    const contribution = L9_RELIANCE_INVERTED_CLASSES.has(cls)
      ? 1 - normalized
      : normalized;
    rawScore += contribution * L9_RELIANCE_CONFIDENCE_FACTOR_WEIGHTS[cls];

    const effectOverride = input.effect_overrides?.[cls];
    const effect = effectOverride ?? defaultEffectFor(cls, normalized);
    factors.push({
      factor_id: `${input.sequence_subject_id}:${cls}`,
      factor_class: cls,
      raw_score: raw,
      normalized_score: normalized,
      reliance_effect: effect,
      lineage_refs: [...input.lineage_refs].sort(),
      policy_version: input.policy_version,
    });
  }
  rawScore = clamp01(rawScore);

  // Delegate cap application to the cap-chain engine (§9.7.5).
  const capChain = buildL9SequenceCapChain({
    sequence_subject_id: input.sequence_subject_id,
    pre_cap_score: rawScore,
    applied_caps: input.applied_caps,
  });

  const cappedScore = capChain.post_cap_score;
  const band: L9RelianceConfidenceBand =
    classifyL9RelianceConfidenceBand(cappedScore);

  const profile: L9RelianceConfidenceProfile = {
    sequence_subject_id: input.sequence_subject_id,
    factors,
    raw_confidence_score: rawScore,
    capped_confidence_score: cappedScore,
    confidence_band: band,
    cap_chain_ref:
      `ccr:${input.sequence_subject_id}:${capChain.tightest_cap ?? 'none'}`,
    policy_version: input.policy_version,
    replay_hash:
      `h:rcp:${input.sequence_subject_id}:${band}:` +
      `${round4(rawScore)}/${round4(cappedScore)}:` +
      [...input.applied_caps].sort().join('+'),
  };

  return { profile, cap_chain: capChain };
}

function round4(x: number): string {
  return Number.isFinite(x) ? x.toFixed(4) : 'NaN';
}
