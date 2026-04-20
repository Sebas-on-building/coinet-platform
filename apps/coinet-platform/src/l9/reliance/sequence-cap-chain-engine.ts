/**
 * L9.7 — Sequence Cap-Chain Engine
 *
 * §9.7.5 — Deterministic builder for `L9SequenceCapChain`. Sorts
 * applied caps by canonical dominance (§9.7.5.4), computes each
 * edge's `narrows_to` against the frozen ceiling table, picks the
 * tightest cap, and derives `post_cap_score` and `readiness_hint`
 * consistent with the validator (§9.7.5.5).
 */

import {
  L9SequenceCapChain,
  L9SequenceCapEdge,
  L9SequenceCapReadinessHint,
  L9SequenceCapReason,
  L9_SEQUENCE_CAP_CEILING,
  L9_SEQUENCE_CAP_DOMINANCE_RANK,
  applyL9SequenceCapCeilings,
  compareL9SequenceCapDominance,
  tightestL9SequenceCap,
} from '../contracts/l9_7-sequence-cap-chain';
import {
  l9SequenceCapReadinessHintFor,
} from '../validation/sequence-cap-chain.validator';

export interface L9SequenceCapChainInput {
  readonly sequence_subject_id: string;
  readonly pre_cap_score: number;
  readonly applied_caps: readonly L9SequenceCapReason[];
}

export function buildL9SequenceCapChain(
  input: L9SequenceCapChainInput,
): L9SequenceCapChain {
  const uniqueSorted = Array.from(new Set(input.applied_caps)).sort(
    compareL9SequenceCapDominance,
  );

  const edges: L9SequenceCapEdge[] = uniqueSorted.map(r => ({
    cap_reason: r,
    dominance_rank: L9_SEQUENCE_CAP_DOMINANCE_RANK[r],
    narrows_to: L9_SEQUENCE_CAP_CEILING[r],
    note: `cap ${r} narrows to ${L9_SEQUENCE_CAP_CEILING[r]}`,
  }));

  const tightest = tightestL9SequenceCap(uniqueSorted);
  const post = applyL9SequenceCapCeilings(input.pre_cap_score, uniqueSorted);

  const chain: L9SequenceCapChain = {
    sequence_subject_id: input.sequence_subject_id,
    pre_cap_score: clamp01(input.pre_cap_score),
    applied_cap_reasons: uniqueSorted,
    edges,
    tightest_cap: tightest,
    post_cap_score: post,
    readiness_hint: L9SequenceCapReadinessHint.CLEAN, // overwritten below
  };

  // Derive the readiness hint after the numeric fields are set —
  // the validator and the engine share `l9SequenceCapReadinessHintFor`
  // so they agree by construction.
  return {
    ...chain,
    readiness_hint: l9SequenceCapReadinessHintFor(chain),
  };
}

function clamp01(x: number): number {
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
