/**
 * L11.2 — Score Object Readiness Validator (§11.2.10)
 *
 * Combines the score-output validator and the family-interpretation
 * validator to derive a single `L11ScoreObjectReadinessClass` for the
 * given score output. Used by the L11.2 boundary audit and INV-11.2-C.
 */

import { L11ScoreOutput } from '../contracts/score-output';
import { L11ScoreObjectReadinessClass } from '../contracts/score-object-readiness';
import {
  validateL11ScoreOutput,
} from './score-output.validator';
import {
  scanL11FamilyInterpretation,
} from './score-family-interpretation.validator';
import {
  L11ScoreDoctrineIssue,
  L11ScoreDoctrineViolationCode,
  makeL11ScoreDoctrineIssue,
} from './l11-score-doctrine-violation-codes';

export interface L11ScoreReadinessInput {
  readonly score: L11ScoreOutput;
  /** Free-form descriptive texts attached to the score (e.g. attribution
   * summaries, downstream-use declarations) that the interpretation
   * validator should scan. */
  readonly descriptive_texts?: readonly string[];
}

export interface L11ScoreReadinessResult {
  readonly ok: boolean;
  readonly readiness_class: L11ScoreObjectReadinessClass;
  readonly issues: readonly L11ScoreDoctrineIssue[];
}

const SEMANTIC_LEAK_CODES = new Set<L11ScoreDoctrineViolationCode>([
  L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_RECOMMENDATION,
  L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_JUDGMENT,
  L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_SCENARIO_WINNER,
  L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_TRADE_ACTION,
  L11ScoreDoctrineViolationCode.L11D_SCORE_ACTS_AS_CERTAINTY,
  L11ScoreDoctrineViolationCode.L11D_FAMILY_INTERPRETATION_LEAK,
]);

const RESERVED_BLOCKED_CODES = new Set<L11ScoreDoctrineViolationCode>([
  L11ScoreDoctrineViolationCode.L11D_RESERVED_FAMILY_EMITTED,
  L11ScoreDoctrineViolationCode.L11D_DEPRECATED_FAMILY_EMITTED,
  L11ScoreDoctrineViolationCode.L11D_EXPERIMENTAL_FAMILY_EMITTED,
]);

const DISCLOSURE_CODES = new Set<L11ScoreDoctrineViolationCode>([
  L11ScoreDoctrineViolationCode.L11D_REQUIRED_DISCLOSURE_MISSING,
  L11ScoreDoctrineViolationCode.L11D_REGIME_MODIFIER_MISSING,
  L11ScoreDoctrineViolationCode.L11D_SEQUENCE_MODIFIER_MISSING,
  L11ScoreDoctrineViolationCode.L11D_HYPOTHESIS_MODIFIER_MISSING,
  L11ScoreDoctrineViolationCode.L11D_MISSING_DATA_PROFILE_MISSING,
  L11ScoreDoctrineViolationCode.L11D_ATTRIBUTION_MISSING,
  L11ScoreDoctrineViolationCode.L11D_CALIBRATION_TARGET_MISSING,
  L11ScoreDoctrineViolationCode.L11D_RESTRICTION_PROFILE_MISSING,
  L11ScoreDoctrineViolationCode.L11D_EVIDENCE_PACK_MISSING,
]);

export function classifyL11ScoreObjectReadiness(
  input: L11ScoreReadinessInput,
): L11ScoreReadinessResult {
  const out = validateL11ScoreOutput(input.score);
  const interp = scanL11FamilyInterpretation({
    score_family: input.score.score_family,
    texts: [
      input.score.score_name,
      ...(input.descriptive_texts ?? []),
    ].filter(Boolean) as string[],
    subject_ref: `score:${input.score.score_id}`,
  });

  const issues: L11ScoreDoctrineIssue[] = [...out.issues, ...interp.issues];

  let readinessClass: L11ScoreObjectReadinessClass = L11ScoreObjectReadinessClass.OBJECT_COMPLETE;

  if (issues.some(i => RESERVED_BLOCKED_CODES.has(i.code))) {
    readinessClass = L11ScoreObjectReadinessClass.RESERVED_FAMILY_BLOCKED;
  } else if (issues.some(i => SEMANTIC_LEAK_CODES.has(i.code))) {
    readinessClass = L11ScoreObjectReadinessClass.SEMANTIC_LEAK_BLOCKED;
  } else if (issues.some(i => DISCLOSURE_CODES.has(i.code))) {
    readinessClass = L11ScoreObjectReadinessClass.DISCLOSURE_REQUIRED;
  } else if (issues.length > 0) {
    readinessClass = L11ScoreObjectReadinessClass.CONTRACT_INCOMPLETE;
  }

  if (readinessClass !== L11ScoreObjectReadinessClass.OBJECT_COMPLETE) {
    issues.push(
      makeL11ScoreDoctrineIssue(
        L11ScoreDoctrineViolationCode.L11D_OBJECT_NOT_READY,
        `score object readiness = ${readinessClass}`,
        {
          subject_ref: `score:${input.score.score_id}`,
          score_family: input.score.score_family,
        },
      ),
    );
  }

  return {
    ok: readinessClass === L11ScoreObjectReadinessClass.OBJECT_COMPLETE,
    readiness_class: readinessClass,
    issues,
  };
}
