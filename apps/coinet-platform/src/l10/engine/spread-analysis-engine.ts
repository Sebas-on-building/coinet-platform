/**
 * L10.4 — SpreadAnalysisEngine
 *
 * §10.4.13 — Derives the `L10HypothesisSpreadOutput` that quantifies
 * explanatory competition: primary vs secondary confidence delta,
 * narrow-spread flag, stability class. Runs after ranking.
 */

import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';
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
  L10HypothesisRankingOutput,
  L10HypothesisSpreadOutput,
} from '../runtime/hypothesis-execution-context';

export interface L10SpreadInput {
  readonly ranking: L10HypothesisRankingOutput;
  readonly confidences: ReadonlyMap<string, L10HypothesisCandidateConfidence>;
  readonly close_spread_threshold: number;
}

export function analyseSpread(
  input: L10SpreadInput,
): L10EngineResult<L10HypothesisSpreadOutput> {
  const violations: L10RuntimeViolation[] = [];
  const r = input.ranking;
  const v = (
    code: L10RuntimeViolationCode, detail: string,
  ): L10RuntimeViolation => ({
    code,
    source: 'SpreadAnalysisEngine',
    nodeId: null,
    hypothesis_run_id: null,
    hypothesis_subject_id: r.hypothesis_subject_id,
    hypothesis_candidate_id: null,
    detail,
    context: { ranking: r.ranking_id },
  });

  if (r.competition_size < 2) {
    violations.push(v(
      L10RuntimeViolationCode.SPREAD_INCONSISTENT_CANDIDATE_SET,
      `spread undefined for competition_size=${r.competition_size}`,
    ));
    return fail(violations);
  }
  const primary = input.confidences.get(r.primary_hypothesis_ref);
  const secondary = r.secondary_hypothesis_ref
    ? input.confidences.get(r.secondary_hypothesis_ref)
    : null;
  if (!primary || !secondary) {
    violations.push(v(
      L10RuntimeViolationCode.SPREAD_INCONSISTENT_CANDIDATE_SET,
      'primary/secondary confidence missing',
    ));
    return fail(violations);
  }

  const spread = round6(Math.max(
    0,
    primary.hypothesis_confidence_score -
      secondary.hypothesis_confidence_score,
  ));
  if (Math.abs(spread - r.confidence_spread) > 1e-6) {
    violations.push(v(
      L10RuntimeViolationCode.SPREAD_CLASS_INCONSISTENT,
      `spread ${spread} disagrees with ranking spread ${r.confidence_spread}`,
    ));
  }
  if (spread < 0 || spread > 1) {
    violations.push(v(
      L10RuntimeViolationCode.SPREAD_MAGNITUDE_OUT_OF_RANGE,
      `spread out of [0,1]: ${spread}`,
    ));
  }

  const narrow = spread < input.close_spread_threshold;
  const klass: L10SpreadClass =
    spread <= 1e-9 ? L10SpreadClass.TIED :
    narrow ? L10SpreadClass.NARROW :
    spread >= 0.25 ? L10SpreadClass.WIDE :
    L10SpreadClass.MODERATE;

  const stability: L10RankingStabilityClass = r.ranking_stability_class;

  if (narrow !== r.narrow_spread_flag) {
    violations.push(v(
      L10RuntimeViolationCode.SPREAD_NARROW_HIDDEN,
      `narrow_spread_flag disagrees with ranking (${r.narrow_spread_flag})`,
    ));
  }

  if (violations.length > 0) return fail(violations);

  const out: L10HypothesisSpreadOutput = {
    spread_profile_id: `lhspr:${r.hypothesis_subject_id}`,
    hypothesis_subject_id: r.hypothesis_subject_id,
    ranking_ref: r.ranking_id,
    primary_hypothesis_ref: r.primary_hypothesis_ref,
    secondary_hypothesis_ref: r.secondary_hypothesis_ref,
    confidence_spread: spread,
    spread_class: klass,
    ranking_stability_class: stability,
    narrow_spread_flag: narrow,
    competition_size: r.competition_size,
  };
  return ok(out);
}

function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}
