/**
 * L10.7 — Hypothesis Reliance Engine
 *
 * §10.7.9 — Aggregator that composes confidence + cap chain +
 * restriction profile + readiness into the canonical
 * `L10HypothesisRelianceProfile`. Kept deterministic: every input
 * produces exactly one output with a stable replay hash
 * (§10.7.9.2 / INV-10.7-A).
 */

import {
  L10HypothesisCapChain,
  L10HypothesisCapReason,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisConfidenceFactorClass,
  L10HypothesisConfidenceProfile,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisRelianceProfile,
} from '../contracts/hypothesis-reliance-profile';
import {
  L10HypothesisRestrictionProfileL10_7,
} from '../contracts/hypothesis-restriction-rights';
import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';
import {
  buildL10HypothesisConfidenceProfile,
} from './hypothesis-confidence-engine';
import {
  buildL10HypothesisRestrictionProfile,
} from './hypothesis-restriction-engine';
import {
  deriveL10HypothesisReadiness,
} from './hypothesis-readiness-engine';

export interface L10HypothesisRelianceEngineInput {
  readonly hypothesis_subject_id: string;
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  /** §10.7.3.4 — normalized per-class contributions in [0,1]. */
  readonly contributions: Readonly<
    Record<L10HypothesisConfidenceFactorClass, number>
  >;
  readonly applied_caps: readonly L10HypothesisCapReason[];
  readonly spread_class: L10SpreadClass;
  readonly active_contradiction: boolean;
  readonly active_invalidation: boolean;
  readonly material_missing_confirmations: boolean;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export interface L10HypothesisRelianceEngineOutput {
  readonly profile: L10HypothesisRelianceProfile;
  readonly confidence: L10HypothesisConfidenceProfile;
  readonly cap_chain: L10HypothesisCapChain;
  readonly restriction: L10HypothesisRestrictionProfileL10_7;
}

export function buildL10HypothesisRelianceProfile(
  input: L10HypothesisRelianceEngineInput,
): L10HypothesisRelianceEngineOutput {
  const { profile: confidence, cap_chain } =
    buildL10HypothesisConfidenceProfile({
      hypothesis_subject_id: input.hypothesis_subject_id,
      primary_hypothesis_ref: input.primary_hypothesis_ref,
      secondary_hypothesis_ref: input.secondary_hypothesis_ref,
      contributions: input.contributions,
      applied_caps: input.applied_caps,
      lineage_refs: input.lineage_refs,
      policy_version: input.policy_version,
    });

  const restriction = buildL10HypothesisRestrictionProfile({
    hypothesis_subject_id: input.hypothesis_subject_id,
    band: confidence.confidence_band,
    cap_chain,
    spread_class: input.spread_class,
    active_contradiction: input.active_contradiction,
    active_invalidation: input.active_invalidation,
    material_missing_confirmations: input.material_missing_confirmations,
    lineage_refs: input.lineage_refs,
    policy_version: input.policy_version,
  });

  const readiness = deriveL10HypothesisReadiness({
    band: confidence.confidence_band,
    cap_chain,
    restriction,
    spread_class: input.spread_class,
    active_invalidation: input.active_invalidation,
    material_missing_confirmations: input.material_missing_confirmations,
  });

  const replayHash =
    `h:l10rel:${input.hypothesis_subject_id}:${confidence.confidence_band}:` +
    `${input.spread_class}:${readiness}:` +
    confidence.replay_hash + ':' + restriction.replay_hash;

  const profile: L10HypothesisRelianceProfile = {
    hypothesis_subject_id: input.hypothesis_subject_id,
    primary_hypothesis_ref: input.primary_hypothesis_ref,
    secondary_hypothesis_ref: input.secondary_hypothesis_ref,
    confidence,
    cap_chain,
    restriction,
    spread_class: input.spread_class,
    readiness,
    confidence_score: confidence.capped_confidence_score,
    confidence_band: confidence.confidence_band,
    policy_version: input.policy_version,
    lineage_refs: [...input.lineage_refs].sort(),
    replay_hash: replayHash,
  };

  return { profile, confidence, cap_chain, restriction };
}
