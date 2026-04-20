/**
 * L10.4 — HypothesisRankingEngine
 *
 * §10.4.12 — The *only* engine that assigns primary / secondary /
 * ordered ranks. Sole writer of `L10HypothesisRankingOutput`. Runs
 * strictly after confidence + confirmation + invalidation have been
 * resolved; uses blocking-contradiction and restriction posture as
 * veto gates.
 *
 * §10.4.12.5 — Must refuse single-story collapse and narrative
 * preference. The deterministic tie-break is:
 *   (confidence_desc, priority_seed_asc, candidate_id_asc)
 */

import {
  L10RankingStabilityClass,
} from '../contracts/hypothesis-ranking';
import {
  L10RuntimeViolation,
  L10RuntimeViolationCode,
} from '../validation/l10-runtime-violation-codes';
import { L10EngineResult, fail, ok } from './engine-types';
import type {
  L10HypothesisCandidateConfidence,
  L10HypothesisCandidateInstance,
  L10HypothesisContradictionSet,
  L10HypothesisRankingOutput,
} from '../runtime/hypothesis-execution-context';

export interface L10RankingInput {
  readonly hypothesis_subject_id: string;
  readonly candidates: readonly L10HypothesisCandidateInstance[];
  readonly confidences: ReadonlyMap<string, L10HypothesisCandidateConfidence>;
  readonly contradictions: ReadonlyMap<string, L10HypothesisContradictionSet>;
  readonly restriction_narrowed_refs: readonly string[];
  readonly close_spread_threshold: number;
}

export function rankHypotheses(
  input: L10RankingInput,
): L10EngineResult<L10HypothesisRankingOutput> {
  const violations: L10RuntimeViolation[] = [];
  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'HypothesisRankingEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: input.hypothesis_subject_id,
    hypothesis_candidate_id: null,
    detail,
    context: { hypothesis_subject_id: input.hypothesis_subject_id },
  });

  if (input.candidates.length < 2) {
    violations.push(v(
      L10RuntimeViolationCode.RANKING_SINGLE_STORY_COLLAPSE,
      `only ${input.candidates.length} candidate(s) in ranking`,
    ));
    return fail(violations);
  }

  for (const c of input.candidates) {
    if (!input.confidences.has(c.hypothesis_candidate_id)) {
      violations.push(v(
        L10RuntimeViolationCode.RANKING_PRIMARY_NOT_IN_CANDIDATE_SET,
        `candidate ${c.hypothesis_candidate_id} missing confidence`,
      ));
    }
  }
  if (violations.length > 0) return fail(violations);

  const narrowed = new Set(input.restriction_narrowed_refs);
  type Row = {
    id: string;
    seed: number;
    score: number;
    blocked: boolean;
    narrowed: boolean;
  };
  const rows: Row[] = [];
  for (const c of input.candidates) {
    const conf = input.confidences.get(c.hypothesis_candidate_id)!;
    const contradiction = input.contradictions.get(c.hypothesis_candidate_id);
    const blocked =
      !!contradiction &&
      contradiction.blocking_contradiction_refs.length > 0;
    rows.push({
      id: c.hypothesis_candidate_id,
      seed: c.candidate_priority_seed,
      score: conf.hypothesis_confidence_score,
      blocked,
      narrowed: narrowed.has(c.hypothesis_candidate_id),
    });
  }

  rows.sort((a, b) => {
    if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
    if (b.score !== a.score) return b.score - a.score;
    if (a.seed !== b.seed) return a.seed - b.seed;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const ordered = rows.map(r => r.id);
  const primary = rows[0].id;
  const secondary = rows.length >= 2 ? rows[1].id : null;

  if (primary === secondary) {
    violations.push(v(
      L10RuntimeViolationCode.RANKING_PRIMARY_SAME_AS_SECONDARY,
      'primary and secondary resolve to same candidate id',
    ));
  }
  if (rows[0].blocked) {
    violations.push(v(
      L10RuntimeViolationCode.RANKING_IGNORES_BLOCKING_CONTRADICTION,
      'top-ranked candidate has blocking contradiction',
    ));
  }
  if (rows[0].narrowed && input.restriction_narrowed_refs.length > 0) {
    violations.push(v(
      L10RuntimeViolationCode.RANKING_IGNORES_RESTRICTION,
      'top-ranked candidate is narrowed by restriction posture',
    ));
  }

  const spread = rows.length >= 2
    ? Math.max(0, rows[0].score - rows[1].score)
    : 1;
  const narrow = spread < input.close_spread_threshold;

  const stability: L10RankingStabilityClass =
    rows.length <= 1 ? L10RankingStabilityClass.STABLE :
    spread >= 0.25 ? L10RankingStabilityClass.STABLE :
    spread >= 0.1 ? L10RankingStabilityClass.FRAGILE :
    L10RankingStabilityClass.VOLATILE;

  if (violations.length > 0) return fail(violations);

  const out: L10HypothesisRankingOutput = {
    ranking_id: `lhrnk:${input.hypothesis_subject_id}`,
    hypothesis_subject_id: input.hypothesis_subject_id,
    ordered_hypothesis_refs: ordered,
    primary_hypothesis_ref: primary,
    secondary_hypothesis_ref: secondary,
    competition_size: rows.length,
    confidence_spread: round6(spread),
    narrow_spread_flag: narrow,
    ranking_stability_class: stability,
  };
  return ok(out);
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
