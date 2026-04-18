/**
 * L8.4 — RegimeAmbiguityEngine
 *
 * §8.4.5.6 — Produces one `L8QualityOutput` tagged domain='AMBIGUITY'.
 * Never emits staleness or degradation signals — those are separate
 * engines (§8.4.5.9 separation law).
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type {
  L8RegimeCandidate,
  L8TransitionOutput,
  L8QualityOutput,
} from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8AmbiguityEngineInput {
  readonly subject: L8RegimeSubjectContract;
  readonly candidates: readonly L8RegimeCandidate[];
  readonly transition: L8TransitionOutput;
}

export function evaluateAmbiguity(
  input: L8AmbiguityEngineInput,
): L8EngineResult<L8QualityOutput> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;
  const c = input.candidates;
  if (c.length === 0) {
    violations.push(v(L8RuntimeViolationCode.QUALITY_OUT_OF_ORDER, s,
      'ambiguity engine invoked with no candidates', {}));
    return fail(violations);
  }

  // Strict domain guard: ambiguity must not consume staleness/degradation
  // refs from the candidate's contradicting surfaces as if they were
  // ambiguity signals. We detect misrouted quality concerns by checking
  // for known staleness/degradation prefixes.
  const refs = [
    ...c.flatMap(x => x.supporting_surface_refs),
    ...c.flatMap(x => x.contradicting_surface_refs),
  ];
  for (const r of refs) {
    if (r.includes(':stale_') || r.startsWith('staleness:')) {
      violations.push(v(
        L8RuntimeViolationCode.QUALITY_AMBIGUITY_AS_TRANSITION, s,
        `ambiguity engine consumed staleness-tagged surface ${r}`,
        { ref: r },
      ));
    }
  }

  let score = 0;
  const reasons: string[] = [];
  const top = c[0];
  const second = c[1];

  if (second) {
    const gap = top.candidate_strength_score - second.candidate_strength_score;
    if (gap < 0.05) {
      score = 0.8;
      reasons.push('CANDIDATES_WITHIN_5PT');
    } else if (gap < 0.15) {
      score = 0.5;
      reasons.push('CANDIDATES_WITHIN_15PT');
    } else if (gap < 0.25) {
      score = 0.3;
      reasons.push('CANDIDATES_WITHIN_25PT');
    } else {
      score = 0.1;
    }
  }

  if (input.transition.coexistence_hint === 'AMBIGUOUS_MULTI_CANDIDATE') {
    score = Math.max(score, 0.7);
    reasons.push('TRANSITION_ENGINE_HINT_AMBIGUOUS');
  } else if (input.transition.coexistence_hint === 'TRANSITIONAL_OVERLAP') {
    score = Math.max(score, 0.4);
    reasons.push('TRANSITION_ENGINE_HINT_OVERLAP');
  }

  if (score < 0 || score > 1) {
    violations.push(v(
      L8RuntimeViolationCode.QUALITY_SCORE_OUT_OF_RANGE, s,
      `ambiguity score OOR: ${score}`, { score },
    ));
    return fail(violations);
  }

  if (violations.length > 0) return fail(violations);

  const out: L8QualityOutput = {
    domain: 'AMBIGUITY',
    regime_subject_id: s.regime_subject_id,
    score,
    reasons: reasons.sort(),
    affected_surface_refs: refs.slice(0, 16).sort(),
    blocks_classification: score >= 0.85,
  };
  return ok(out);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'regime-ambiguity-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
