/**
 * L13.3 — Output Readiness Validator
 *
 * §13.3.15 — Validates the readiness assessment: class legal,
 * matches the underlying issue state, clean output not permitted
 * under disclosure requirement, blocked output cannot emit, refusal
 * shape requirement, partial answers require disclosure.
 */

import {
  L13OutputReadinessClass,
  type L13OutputReadinessAssessment,
} from '../contracts/output-readiness';
import {
  L13AIOutputClass,
  type L13AIExplanationOutput,
} from '../contracts/ai-output';
import { L13OutputSectionClass } from '../contracts/output-section';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13OutputViolationCode } from './l13-output-violation-codes';
import {
  l13OutputResult,
  type L13OutputIssue,
  type L13OutputValidationResult,
} from './_l13-output-issue';

const SEV = L13ViolationSeverity;

export function validateL13OutputReadinessAssessment(
  assessment: L13OutputReadinessAssessment,
  output: L13AIExplanationOutput,
): L13OutputValidationResult {
  const issues: L13OutputIssue[] = [];

  // Class legality.
  if (
    !Object.values(L13OutputReadinessClass).includes(
      assessment.readiness_class,
    )
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
      severity: SEV.ERROR,
      subject_ref: assessment.readiness_assessment_id,
      message: `unknown readiness class "${assessment.readiness_class}"`,
    });
  }

  // §13.3.15 — Clean output not allowed under disclosure requirement.
  if (
    assessment.readiness_class ===
      L13OutputReadinessClass.CLEAN_GROUNDED_OUTPUT &&
    (output.restriction_disclosure?.required_disclosures.length > 0 ||
      output.confidence_disclosure?.must_use_uncertainty_language ||
      output.contradiction_refs.length > 0)
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_CLEAN_OUTPUT_UNDER_DISCLOSURE_REQUIREMENT,
      severity: SEV.CRITICAL,
      subject_ref: assessment.readiness_assessment_id,
      message:
        'CLEAN_GROUNDED_OUTPUT illegal while disclosures are required',
    });
  }

  // §13.3.15 — Blocked output cannot emit.
  if (
    assessment.readiness_class ===
      L13OutputReadinessClass.BLOCKED_UNGROUNDED &&
    assessment.may_emit_to_user
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_BLOCKED_UNGROUNDED_EMITTED,
      severity: SEV.CRITICAL,
      subject_ref: assessment.readiness_assessment_id,
      message:
        'BLOCKED_UNGROUNDED may not emit to user (may_emit_to_user=true)',
    });
  }

  // §13.3.15 — Refusal must be refusal-shaped.
  if (
    assessment.readiness_class ===
    L13OutputReadinessClass.REFUSAL_REQUIRED
  ) {
    if (assessment.may_emit_to_user) {
      issues.push({
        code: L13OutputViolationCode.L13O_REFUSAL_NOT_REFUSAL_SHAPED,
        severity: SEV.CRITICAL,
        subject_ref: assessment.readiness_assessment_id,
        message:
          'REFUSAL_REQUIRED must NOT set may_emit_to_user=true (refusal emits as its own object)',
      });
    }
    // The output should at least reference a REFUSAL section or use
    // USER_QUESTION_ANSWER class with a refusal section present.
    const hasRefusalShape =
      output.output_class === L13AIOutputClass.USER_QUESTION_ANSWER ||
      [
        output.observation_section,
        output.inference_section,
        output.uncertainty_section,
        output.contradiction_section,
        output.scenario_section,
        output.trigger_invalidation_section,
      ].some(
        s =>
          s &&
          s.present &&
          s.section_class === L13OutputSectionClass.REFUSAL,
      );
    if (!hasRefusalShape) {
      issues.push({
        code: L13OutputViolationCode.L13O_REFUSAL_NOT_REFUSAL_SHAPED,
        severity: SEV.ERROR,
        subject_ref: assessment.readiness_assessment_id,
        message:
          'REFUSAL_REQUIRED output lacks a refusal-shaped class or REFUSAL section',
      });
    }
  }

  // §13.3.15 — Partial answer requires disclosure.
  if (
    assessment.readiness_class ===
      L13OutputReadinessClass.PARTIAL_ANSWER &&
    assessment.disclosure_required_refs.length === 0
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
      severity: SEV.ERROR,
      subject_ref: assessment.readiness_assessment_id,
      message:
        'PARTIAL_ANSWER must declare disclosure_required_refs',
    });
  }

  // §13.3.15 — Narrowed-by-restriction requires restriction refs.
  if (
    assessment.readiness_class ===
      L13OutputReadinessClass.NARROWED_BY_RESTRICTION &&
    assessment.restriction_refs.length === 0
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
      severity: SEV.ERROR,
      subject_ref: assessment.readiness_assessment_id,
      message:
        'NARROWED_BY_RESTRICTION must declare restriction_refs',
    });
  }

  // §13.3.15 — Narrowed-by-uncertainty requires uncertainty refs.
  if (
    assessment.readiness_class ===
      L13OutputReadinessClass.NARROWED_BY_UNCERTAINTY &&
    assessment.uncertainty_refs.length === 0
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_OUTPUT_READINESS_ILLEGAL,
      severity: SEV.ERROR,
      subject_ref: assessment.readiness_assessment_id,
      message:
        'NARROWED_BY_UNCERTAINTY must declare uncertainty_refs',
    });
  }

  // Replay hash must be non-empty.
  if (
    !assessment.replay_hash ||
    assessment.replay_hash.trim().length === 0
  ) {
    issues.push({
      code: L13OutputViolationCode.L13O_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      subject_ref: assessment.readiness_assessment_id,
      message: 'readiness replay_hash missing',
    });
  }

  return l13OutputResult(issues);
}
