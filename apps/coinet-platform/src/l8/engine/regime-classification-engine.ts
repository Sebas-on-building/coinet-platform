/**
 * L8.4 — RegimeClassificationEngine
 *
 * §8.4.6.1-3 — The only legal place that assigns `primary_regime`,
 * `secondary_regime`, `transition_risk_class`, and the final
 * `coexistence_class`. Consumes candidates, transition output, and the
 * three quality outputs; enforces coexistence law from L8.2.
 */

import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import {
  L8RegimeClass,
} from '../contracts/regime-class';
import {
  L8RegimeCoexistenceClass,
} from '../contracts/regime-state';
import {
  decideCoexistence,
  isIllegalIntraFamilyPair,
} from '../contracts/regime-coexistence';
import type {
  L8RegimeCandidate,
  L8TransitionOutput,
  L8QualityOutput,
  L8ClassificationOutput,
  L8InputReadinessClass,
} from '../runtime/regime-execution-context';
import {
  L8RuntimeViolation,
  L8RuntimeViolationCode,
} from '../validation/l8-runtime-violation-codes';
import { L8EngineResult, fail, ok } from './engine-types';

export interface L8ClassificationEngineInput {
  readonly subject: L8RegimeSubjectContract;
  readonly candidates: readonly L8RegimeCandidate[];
  readonly transition: L8TransitionOutput;
  readonly qualities: readonly L8QualityOutput[];
  readonly readiness_class: L8InputReadinessClass;
  /**
   * Whether the validation-consumption resolver narrowed any consumed
   * L7 output beyond multiplier/confidence tier. If so, clean-single
   * high-confidence classification is not allowed.
   */
  readonly had_narrowed_validation_consumption: boolean;
}

function resolveTransitionClass(score: number): L8ClassificationOutput['transition_risk_class'] {
  if (score < 0.15) return 'STABLE';
  if (score < 0.35) return 'MILD';
  if (score < 0.6) return 'ELEVATED';
  if (score < 0.85) return 'HIGH';
  return 'CRITICAL';
}

export function classifyRegime(
  input: L8ClassificationEngineInput,
): L8EngineResult<L8ClassificationOutput> {
  const violations: L8RuntimeViolation[] = [];
  const s = input.subject;

  // §8.4.6.1 quality ordering guard
  const hasAllQualityDomains =
    input.qualities.some(q => q.domain === 'AMBIGUITY') &&
    input.qualities.some(q => q.domain === 'STALENESS') &&
    input.qualities.some(q => q.domain === 'DEGRADATION');
  if (!hasAllQualityDomains) {
    violations.push(v(
      L8RuntimeViolationCode.CLASSIFY_BEFORE_QUALITY, s,
      'classification invoked before all 3 quality domains resolved',
      { domains: input.qualities.map(q => q.domain) },
    ));
    return fail(violations);
  }

  if (input.candidates.length === 0) {
    violations.push(v(
      L8RuntimeViolationCode.CLASSIFY_BEFORE_QUALITY, s,
      'classification invoked with no candidates', {},
    ));
    return fail(violations);
  }

  const [top, second] = input.candidates;
  const ambiguity = input.qualities.find(q => q.domain === 'AMBIGUITY')!;
  // Staleness/degradation are retrieved for future-proofing even when not
  // consulted directly in this simple deterministic rule.
  const staleness = input.qualities.find(q => q.domain === 'STALENESS')!;
  const degradation = input.qualities.find(q => q.domain === 'DEGRADATION')!;
  void staleness; void degradation;

  if (top.regime_family !== s.regime_family) {
    violations.push(v(
      L8RuntimeViolationCode.CLASSIFY_PRIMARY_NOT_IN_FAMILY, s,
      `top candidate ${top.regime_class} not in family ${s.regime_family}`,
      { family: s.regime_family, top: top.regime_class },
    ));
  }

  const primary: L8RegimeClass = top.regime_class;
  let secondary: L8RegimeClass | null = null;
  let coexistenceClass: L8RegimeCoexistenceClass =
    L8RegimeCoexistenceClass.CLEAN_SINGLE;

  if (second) {
    const gap =
      top.candidate_strength_score - second.candidate_strength_score;
    if (isIllegalIntraFamilyPair(s.regime_family, primary, second.regime_class)) {
      violations.push(v(
        L8RuntimeViolationCode.CLASSIFY_ILLEGAL_COEXISTENCE, s,
        `primary ${primary} + secondary ${second.regime_class} illegal in family ${s.regime_family}`,
        { primary, secondary: second.regime_class },
      ));
      return fail(violations);
    }

    if (second.regime_class === primary) {
      violations.push(v(
        L8RuntimeViolationCode.CLASSIFY_SECONDARY_SAME_AS_PRIMARY, s,
        'secondary regime equals primary', { primary },
      ));
      return fail(violations);
    }

    if (ambiguity.score >= 0.6) {
      secondary = second.regime_class;
      coexistenceClass = L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE;
    } else if (input.transition.transition_risk_score >= 0.4) {
      secondary = second.regime_class;
      coexistenceClass = L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP;
    } else if (gap < 0.2) {
      secondary = second.regime_class;
      coexistenceClass = L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY;
    }
  }

  // §8.4.6.3 — coexistence consistency via L8.2 decision law
  const decision = decideCoexistence(
    s.regime_family, primary, secondary, coexistenceClass,
  );
  if (!decision.allowed) {
    violations.push(v(
      L8RuntimeViolationCode.CLASSIFY_ILLEGAL_COEXISTENCE, s,
      `coexistence decision rejected: ${decision.reason}`,
      { primary, secondary, declared: coexistenceClass,
        required: decision.requiredClass },
    ));
    return fail(violations);
  }

  // §8.4.6.3 — fake clean-single while ambiguity is high
  if (coexistenceClass === L8RegimeCoexistenceClass.CLEAN_SINGLE &&
      ambiguity.score >= 0.4) {
    violations.push(v(
      L8RuntimeViolationCode.CLASSIFY_FAKE_CLEAN_SINGLE, s,
      `CLEAN_SINGLE declared with ambiguity_score=${ambiguity.score}`,
      { ambiguity: ambiguity.score },
    ));
    return fail(violations);
  }

  // §8.4.6.3 — stable-clean state when transition is high
  if (coexistenceClass === L8RegimeCoexistenceClass.CLEAN_SINGLE &&
      input.transition.transition_risk_score >= 0.6) {
    violations.push(v(
      L8RuntimeViolationCode.CLASSIFY_STABLE_WHILE_TRANSITION_HIGH, s,
      `CLEAN_SINGLE with transition_risk=${input.transition.transition_risk_score}`,
      { transition: input.transition.transition_risk_score },
    ));
    return fail(violations);
  }

  // §8.4.6.3 — restricted validation inputs used strongly while clean
  if (coexistenceClass === L8RegimeCoexistenceClass.CLEAN_SINGLE &&
      input.had_narrowed_validation_consumption) {
    violations.push(v(
      L8RuntimeViolationCode.CLASSIFY_RESTRICTED_INPUT_USED_STRONGLY, s,
      'CLEAN_SINGLE with narrowed L7 consumption (restricted inputs)',
      {},
    ));
    return fail(violations);
  }

  if (violations.length > 0) return fail(violations);

  const out: L8ClassificationOutput = {
    regime_subject_id: s.regime_subject_id,
    regime_family: s.regime_family,
    primary_regime: primary,
    secondary_regime: secondary,
    coexistence_class: coexistenceClass,
    transition_risk_class:
      resolveTransitionClass(input.transition.transition_risk_score),
    rationale_codes: [
      `primary_strength_band:${top.candidate_strength_band}`,
      `transition_risk:${input.transition.transition_risk_score.toFixed(2)}`,
      `ambiguity:${ambiguity.score.toFixed(2)}`,
    ],
    readiness_class: input.readiness_class,
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
    source: 'regime-classification-engine',
    nodeId: null,
    regime_run_id: null,
    regime_subject_id: s.regime_subject_id,
    detail,
    context,
  };
}
