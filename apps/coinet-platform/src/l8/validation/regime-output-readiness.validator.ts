/**
 * L8.3 — Regime Output Readiness Validator
 *
 * §8.3.8.3 / §8.3.8.5 — Orchestrates the full L8.3 contract family and
 * answers:
 *
 *   1. Is this output contract-complete?
 *   2. Is this output legally emissible?
 *   3. What law blocked emission if not?
 *
 * The readiness validator runs subject, output, confidence, transition,
 * and multiplier validators in one pass and returns the combined issue
 * set plus a `readiness_class` describing the output's emission state.
 */

import { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import {
  L8RegimeOutputContract,
  outputIsMaterialAmbiguous,
  outputIsMaterialDegraded,
  outputIsMaterialStale,
  outputIsHighTransition,
} from '../contracts/regime-output.contract';
import { L8RegimeConfidenceContract } from '../contracts/regime-confidence.contract';
import { L8RegimeTransitionContract } from '../contracts/regime-transition.contract';
import { L8RegimeMultiplierProfileContract } from '../contracts/regime-multiplier-profile.contract';
import {
  validateRegimeSubjectContract,
  L8SubjectContractIssue,
} from './regime-subject-contract.validator';
import {
  validateRegimeOutputContract,
  L8OutputContractIssue,
} from './regime-output-contract.validator';
import {
  validateRegimeConfidenceContract,
  L8ConfidenceContractIssue,
} from './regime-confidence-contract.validator';
import {
  validateRegimeTransitionContract,
  L8TransitionContractIssue,
} from './regime-transition-contract.validator';
import {
  validateRegimeMultiplierContract,
  L8MultiplierContractIssue,
} from './regime-multiplier-contract.validator';
import { L8RegimeContractViolationCode } from './l8-contract-violation-codes';

/**
 * §8.3.8.2 — Cleanliness eligibility states. A regime output moves
 * through these states based on contract validation + cleanliness law.
 */
export enum L8RegimeOutputReadinessClass {
  CLEAN_EMISSION = 'CLEAN_EMISSION',
  MODIFIER_REQUIRED = 'MODIFIER_REQUIRED',
  CAPPED_CONFIDENCE = 'CAPPED_CONFIDENCE',
  DEGRADED_EMISSION = 'DEGRADED_EMISSION',
  BLOCKED_EMISSION = 'BLOCKED_EMISSION',
}

export const ALL_L8_REGIME_OUTPUT_READINESS_CLASSES:
  readonly L8RegimeOutputReadinessClass[] =
    Object.values(L8RegimeOutputReadinessClass);

export interface L8ReadinessBundleIssue {
  readonly surface: 'SUBJECT' | 'OUTPUT' | 'CONFIDENCE' | 'TRANSITION' | 'MULTIPLIER';
  readonly code: L8RegimeContractViolationCode;
  readonly message: string;
}

export interface L8ReadinessReport {
  readonly emissible: boolean;
  readonly readiness_class: L8RegimeOutputReadinessClass;
  readonly issues: readonly L8ReadinessBundleIssue[];
}

export interface L8ReadinessBundle {
  readonly subject: L8RegimeSubjectContract;
  readonly output: L8RegimeOutputContract;
  readonly confidence: L8RegimeConfidenceContract;
  readonly transition: L8RegimeTransitionContract;
  readonly multiplier: L8RegimeMultiplierProfileContract;
}

function wrap<I extends { code: L8RegimeContractViolationCode; message: string }>(
  surface: L8ReadinessBundleIssue['surface'],
  list: readonly I[],
): L8ReadinessBundleIssue[] {
  return list.map(i => ({ surface, code: i.code, message: i.message }));
}

export function validateRegimeOutputReadiness(
  bundle: L8ReadinessBundle,
): L8ReadinessReport {
  const s = validateRegimeSubjectContract(bundle.subject);
  const o = validateRegimeOutputContract(bundle.output);
  const c = validateRegimeConfidenceContract(bundle.confidence, {
    ambiguity_score: bundle.output.ambiguity_score,
    restriction_required:
      bundle.subject.restriction_consumption_policy?.required ?? false,
    staleness_material: outputIsMaterialStale(bundle.output),
    transition_high: outputIsHighTransition(bundle.output),
  });
  const t = validateRegimeTransitionContract(bundle.transition, {
    ambiguity_score: bundle.output.ambiguity_score,
  });
  const m = validateRegimeMultiplierContract(bundle.multiplier, {
    restriction_required:
      bundle.subject.restriction_consumption_policy?.required ?? false,
  });

  const issues: L8ReadinessBundleIssue[] = [
    ...wrap<L8SubjectContractIssue>('SUBJECT', s.issues),
    ...wrap<L8OutputContractIssue>('OUTPUT', o.issues),
    ...wrap<L8ConfidenceContractIssue>('CONFIDENCE', c.issues),
    ...wrap<L8TransitionContractIssue>('TRANSITION', t.issues),
    ...wrap<L8MultiplierContractIssue>('MULTIPLIER', m.issues),
  ];

  if (issues.length > 0) {
    return {
      emissible: false,
      readiness_class: L8RegimeOutputReadinessClass.BLOCKED_EMISSION,
      issues,
    };
  }

  const ambiguous = outputIsMaterialAmbiguous(bundle.output);
  const stale = outputIsMaterialStale(bundle.output);
  const degraded = outputIsMaterialDegraded(bundle.output);
  const transitionHigh = outputIsHighTransition(bundle.output);
  const capped =
    bundle.confidence.confidence_score_capped <
    bundle.confidence.confidence_score_raw - 1e-9;

  let cls: L8RegimeOutputReadinessClass =
    L8RegimeOutputReadinessClass.CLEAN_EMISSION;
  if (degraded) cls = L8RegimeOutputReadinessClass.DEGRADED_EMISSION;
  else if (stale || ambiguous) cls =
    L8RegimeOutputReadinessClass.MODIFIER_REQUIRED;
  else if (capped || transitionHigh) cls =
    L8RegimeOutputReadinessClass.CAPPED_CONFIDENCE;

  return {
    emissible: true,
    readiness_class: cls,
    issues: [],
  };
}
