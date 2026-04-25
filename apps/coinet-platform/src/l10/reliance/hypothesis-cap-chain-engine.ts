/**
 * L10.7 — Hypothesis Cap-Chain Engine
 *
 * §10.7.6 — Deterministic builder for the cap chain. Accepts a
 * pre-cap score and an unordered set of applied cap reasons, sorts
 * them by dominance (§10.7.6.4), emits one edge per cap (using the
 * frozen ceiling + rank tables), picks the tightest + dominant caps,
 * composes the post-cap score, and surfaces a readiness hint
 * (§10.7.6.5).
 *
 * Caps may only narrow (INV-10.7-C) — this engine enforces that by
 * construction.
 */

import {
  applyL10HypothesisCapCeilings,
  compareL10HypothesisCapDominance,
  dominantL10HypothesisCap,
  l10HypothesisCapReadinessHintFor,
  tightestL10HypothesisCap,
  L10HypothesisCapChain,
  L10HypothesisCapEdge,
  L10HypothesisCapReason,
  L10_HYPOTHESIS_CAP_CEILING,
  L10_HYPOTHESIS_CAP_DOMINANCE_RANK,
} from '../contracts/hypothesis-cap-chain';

export interface L10HypothesisCapChainBuildInput {
  readonly hypothesis_subject_id: string;
  readonly pre_cap_score: number;
  readonly applied_cap_reasons: readonly L10HypothesisCapReason[];
}

/**
 * §10.7.6 — Build a deterministic cap chain. Caps are deduplicated
 * and sorted by canonical dominance before edges are emitted, so
 * identical inputs always produce an identical chain (INV-10.7-A).
 */
export function buildL10HypothesisCapChain(
  input: L10HypothesisCapChainBuildInput,
): L10HypothesisCapChain {
  const deduped: L10HypothesisCapReason[] = [];
  const seen = new Set<L10HypothesisCapReason>();
  for (const r of input.applied_cap_reasons) {
    if (seen.has(r)) continue;
    seen.add(r);
    deduped.push(r);
  }
  const sorted = [...deduped].sort(compareL10HypothesisCapDominance);

  const edges: L10HypothesisCapEdge[] = sorted.map(cap => ({
    cap_reason: cap,
    dominance_rank: L10_HYPOTHESIS_CAP_DOMINANCE_RANK[cap],
    narrows_to: L10_HYPOTHESIS_CAP_CEILING[cap],
    note: `cap ${cap} narrows reliance to ceiling ` +
      `${L10_HYPOTHESIS_CAP_CEILING[cap].toFixed(2)}`,
  }));

  const clampedPre = Number.isFinite(input.pre_cap_score)
    ? Math.max(0, Math.min(1, input.pre_cap_score))
    : 0;
  const post = applyL10HypothesisCapCeilings(clampedPre, sorted);
  const tightest = tightestL10HypothesisCap(sorted);
  const dominant = dominantL10HypothesisCap(sorted);

  const draft: L10HypothesisCapChain = {
    hypothesis_subject_id: input.hypothesis_subject_id,
    pre_cap_score: clampedPre,
    applied_cap_reasons: sorted,
    edges,
    tightest_cap: tightest,
    dominant_cap_reason: dominant,
    post_cap_score: post,
    // Hint derivation requires a chain; use CLEAN as a placeholder
    // and override via the canonical derivation immediately below so
    // the engine and validator agree by construction.
    readiness_hint: l10HypothesisCapReadinessHintFor({
      hypothesis_subject_id: input.hypothesis_subject_id,
      pre_cap_score: clampedPre,
      applied_cap_reasons: sorted,
      edges,
      tightest_cap: tightest,
      dominant_cap_reason: dominant,
      post_cap_score: post,
      readiness_hint: 'CLEAN' as L10HypothesisCapChain['readiness_hint'],
    }),
  };
  return draft;
}
