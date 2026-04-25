/**
 * L10.7 — Hypothesis Reliance Profile
 *
 * §10.7.9 — Final reliance bundle later layers consume. Aggregates
 * the confidence profile, cap chain, spread profile, restriction
 * rights, and readiness class into a single governed surface *without*
 * replacing any of them (INV-10.7-G).
 */

import {
  L10HypothesisCapChain,
} from './hypothesis-cap-chain';
import {
  L10HypothesisConfidenceProfile,
  L10HypothesisRelianceConfidenceBand,
} from './hypothesis-confidence.policy';
import {
  L10HypothesisRelianceReadinessClass,
} from './hypothesis-readiness';
import {
  L10HypothesisRestrictionProfileL10_7,
} from './hypothesis-restriction-rights';
import {
  L10SpreadClass,
} from './hypothesis-spread-profile';

/**
 * §10.7.9.2 — Required top-level reliance object. Consumed by later
 * layers that need the canonical answer to "how strongly may the
 * current primary explanation be relied on?".
 */
export interface L10HypothesisRelianceProfile {
  readonly hypothesis_subject_id: string;
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  /** §10.7.9.4 — confidence profile (not replaced, aggregated). */
  readonly confidence: L10HypothesisConfidenceProfile;
  /** §10.7.9.4 — cap chain (not replaced, aggregated). */
  readonly cap_chain: L10HypothesisCapChain;
  /** §10.7.9.4 — restriction rights (not replaced, aggregated). */
  readonly restriction: L10HypothesisRestrictionProfileL10_7;
  /** §10.7.9.4 — spread class captured here so readiness logic can
   *  self-verify (the full spread profile lives on L10.2). */
  readonly spread_class: L10SpreadClass;
  /** §10.7.9.2 — final readiness summary. */
  readonly readiness: L10HypothesisRelianceReadinessClass;
  readonly confidence_score: number;
  readonly confidence_band: L10HypothesisRelianceConfidenceBand;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  /** §10.7.9.2 / INV-10.7-A — stable hash for replay identity. */
  readonly replay_hash: string;
}
