/**
 * L10.7 — Hypothesis Readiness Engine
 *
 * §10.7.7 — Deterministic wrapper around the canonical readiness
 * summarizer. Extracts the relevant posture flags from the cap chain,
 * restriction profile, and caller-provided evidence posture, then
 * delegates to `summarizeL10HypothesisRelianceReadiness`. Kept as a
 * separate module so callers can assemble and replay readiness
 * without instantiating the full reliance aggregator.
 */

import {
  L10HypothesisCapChain,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisRelianceConfidenceBand,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisRelianceReadinessClass,
  summarizeL10HypothesisRelianceReadiness,
} from '../contracts/hypothesis-readiness';
import {
  L10HypothesisRestrictionProfileL10_7,
  L10HypothesisRestrictionRight,
} from '../contracts/hypothesis-restriction-rights';
import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';

export interface L10HypothesisReadinessEngineInput {
  readonly band: L10HypothesisRelianceConfidenceBand;
  readonly cap_chain: L10HypothesisCapChain;
  readonly restriction: L10HypothesisRestrictionProfileL10_7;
  readonly spread_class: L10SpreadClass;
  readonly active_invalidation: boolean;
  readonly material_missing_confirmations: boolean;
}

export function deriveL10HypothesisReadiness(
  input: L10HypothesisReadinessEngineInput,
): L10HypothesisRelianceReadinessClass {
  const rights = new Set<L10HypothesisRestrictionRight>(
    input.restriction.rights,
  );
  return summarizeL10HypothesisRelianceReadiness({
    band: input.band,
    cap_hint: input.cap_chain.readiness_hint,
    spread_class: input.spread_class,
    has_evidence_only_right: rights.has(
      L10HypothesisRestrictionRight.EVIDENCE_ONLY,
    ),
    has_final_judgment_blocked_right: rights.has(
      L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
    ),
    active_invalidation: input.active_invalidation,
    material_missing_confirmations: input.material_missing_confirmations,
  });
}
