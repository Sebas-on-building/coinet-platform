/**
 * L8.4 — TransitionDetectionEngine
 *
 * §8.4.5.4-5 — Produces a `TransitionOutput` describing whether regime
 * is stable, transitioning, or unresolved. It may not assign the final
 * regime class; that remains the classification engine's exclusive duty.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type {
  L8RegimeCandidate,
  L8TransitionOutput,
} from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8TransitionDetectionInput {
  readonly subject: L8RegimeSubjectContract;
  readonly candidates: readonly L8RegimeCandidate[];
  /**
   * Prior-run primary regime, when known. Used to detect regime flips
   * across time. Null when no prior run exists (cold start or repair).
   */
  readonly prior_primary_regime_class: string | null;
  /**
   * Signatures fired during this run. Each is a family-specific instability
   * signature id (e.g. `macro.risk_on_to_risk_off.v1`). The runtime supplies
   * these; the engine stores refs only.
   */
  readonly fired_signature_refs: readonly string[];
}

export function detectTransition(
  input: L8TransitionDetectionInput,
): L8EngineResult<L8TransitionOutput> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;
  const candidates = input.candidates;

  if (candidates.length === 0) {
    violations.push(v(
      L8RuntimeViolationCode.QUALITY_OUT_OF_ORDER, s,
      'transition engine invoked with no candidates',
      {},
    ));
    return fail(violations);
  }

  const top = candidates[0];
  const second = candidates[1];

  // Transition risk heuristic:
  //   - if prior primary differs from current top, that's an active flip
  //   - if top and second strengths are close, coexistence is active
  //   - if fired signatures exist, transition risk rises
  let risk = 0.05;
  const reasons: string[] = [];
  const candidateFlipRefs: string[] = [];

  if (input.prior_primary_regime_class &&
      input.prior_primary_regime_class !== top.regime_class) {
    risk += 0.35;
    reasons.push('PRIOR_REGIME_FLIP');
    candidateFlipRefs.push(`flip:${input.prior_primary_regime_class}->${top.regime_class}`);
  }
  if (second) {
    const gap = top.candidate_strength_score - second.candidate_strength_score;
    if (gap < 0.1) {
      risk += 0.3;
      reasons.push('CLOSE_CANDIDATES');
      candidateFlipRefs.push(`flip:${top.regime_class}<->${second.regime_class}`);
    } else if (gap < 0.2) {
      risk += 0.15;
      reasons.push('MODERATE_CANDIDATE_GAP');
    }
  }
  if (input.fired_signature_refs.length > 0) {
    risk += Math.min(0.4, input.fired_signature_refs.length * 0.1);
    reasons.push('INSTABILITY_SIGNATURES_FIRED');
  }
  risk = Math.max(0, Math.min(1, risk));

  // Coexistence hint — engineering hint only; actual coexistence class
  // is set by the classification engine.
  let coexistenceHint: L8TransitionOutput['coexistence_hint'];
  if (!second) {
    coexistenceHint = 'CLEAN_SINGLE';
  } else {
    const gap = top.candidate_strength_score - second.candidate_strength_score;
    if (gap < 0.1) coexistenceHint = 'AMBIGUOUS_MULTI_CANDIDATE';
    else if (gap < 0.2) coexistenceHint = 'TRANSITIONAL_OVERLAP';
    else coexistenceHint = 'PRIMARY_PLUS_SECONDARY';
  }

  if (risk < 0 || risk > 1) {
    violations.push(v(
      L8RuntimeViolationCode.TRANSITION_SCORE_OUT_OF_RANGE, s,
      `transition_risk_score OOR: ${risk}`, { risk },
    ));
    return fail(violations);
  }

  const instabilityReasons = reasons.sort();
  const isHigh = risk >= 0.6;
  if (isHigh && instabilityReasons.length === 0) {
    violations.push(v(
      L8RuntimeViolationCode.TRANSITION_HIGH_WITHOUT_REASONS, s,
      `high transition risk but no instability reasons`,
      { risk },
    ));
    return fail(violations);
  }

  const output: L8TransitionOutput = {
    regime_subject_id: s.regime_subject_id,
    transition_risk_score: risk,
    coexistence_hint: coexistenceHint,
    signature_refs: [...input.fired_signature_refs].sort(),
    candidate_flip_refs: candidateFlipRefs.sort(),
    instability_reasons: instabilityReasons,
  };

  return ok(output);
}

function v(
  code: L8RuntimeViolationCode,
  s: L8RegimeSubjectContract,
  detail: string,
  context: Record<string, unknown>,
): L8RuntimeViolation {
  return {
    code,
    source: 'transition-detection-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
