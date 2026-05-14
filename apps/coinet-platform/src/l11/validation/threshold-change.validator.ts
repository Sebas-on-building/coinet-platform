/**
 * L11.7 — Threshold change validator (§11.7.12)
 *
 * Validates that a threshold-change assessment between two
 * `L11ThresholdPolicy` instances is classified, version-bumped
 * where required, and not silently rewriting active production.
 */

import {
  L11ThresholdPolicy,
  L11ThresholdPolicyStatus,
} from '../contracts/threshold-policy';
import {
  L11ThresholdChangeClassification,
  ALL_L11_THRESHOLD_CHANGE_CLASSIFICATIONS,
  l11ThresholdChangeRequiresVersionBump,
  isL11ThresholdChangeProhibited,
} from '../contracts/threshold-change-classification';
import { classifyL11ThresholdChange } from '../drift/threshold-governance-engine';
import {
  L11DriftViolationCode,
  L11DriftIssue,
  makeL11DriftIssue,
} from './l11-drift-violation-codes';

export interface L11ThresholdChangeValidationInput {
  readonly old_policy: L11ThresholdPolicy | null;
  readonly new_policy: L11ThresholdPolicy;
  readonly declared_classification?: L11ThresholdChangeClassification;
}

export function validateL11ThresholdChange(
  inp: L11ThresholdChangeValidationInput,
): L11DriftIssue[] {
  const issues: L11DriftIssue[] = [];
  const ref = inp.new_policy.threshold_policy_id;
  if (!inp.declared_classification) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_CHANGE_UNCLASSIFIED,
      'threshold change must be classified before activation',
      { threshold_policy_id: ref }));
    return issues;
  }
  if (!ALL_L11_THRESHOLD_CHANGE_CLASSIFICATIONS.includes(
        inp.declared_classification)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_CHANGE_UNCLASSIFIED,
      `unknown threshold-change classification ${inp.declared_classification}`,
      { threshold_policy_id: ref }));
    return issues;
  }
  if (isL11ThresholdChangeProhibited(inp.declared_classification)) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_CHANGE_PROHIBITED,
      'threshold change classified PROHIBITED',
      { threshold_policy_id: ref }));
  }
  const expected = classifyL11ThresholdChange(inp.old_policy, inp.new_policy);

  // The declared classification may not be weaker than what the
  // engine derives. We only flag when declared is materially weaker.
  if (rank(inp.declared_classification) < rank(expected.classification)) {
    if (expected.classification ===
        L11ThresholdChangeClassification.PROHIBITED) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_CHANGE_PROHIBITED,
        `engine classified PROHIBITED (${expected.reasons.join('; ')}) but declared ${inp.declared_classification}`,
        { threshold_policy_id: ref }));
    } else if (expected.classification ===
               L11ThresholdChangeClassification.BREAKING_SEMANTIC ||
               expected.classification ===
               L11ThresholdChangeClassification.MIGRATION_REQUIRED) {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_CHANGE_REQUIRES_MIGRATION,
        `engine requires migration but declared ${inp.declared_classification}`,
        { threshold_policy_id: ref }));
    } else {
      issues.push(makeL11DriftIssue(
        L11DriftViolationCode.L11G_THRESHOLD_CHANGE_UNCLASSIFIED,
        `declared ${inp.declared_classification} weaker than engine ${expected.classification}`,
        { threshold_policy_id: ref }));
    }
  }
  if (l11ThresholdChangeRequiresVersionBump(inp.declared_classification) &&
      inp.old_policy &&
      inp.old_policy.threshold_version === inp.new_policy.threshold_version) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_CHANGE_REQUIRES_VERSION_BUMP,
      `classification ${inp.declared_classification} requires threshold_version bump`,
      { threshold_policy_id: ref }));
  }
  // Historical ambiguity: an ACTIVE→ACTIVE silent rewrite of band
  // boundaries without versioning creates ambiguity.
  if (inp.old_policy &&
      inp.old_policy.threshold_status === L11ThresholdPolicyStatus.ACTIVE &&
      inp.new_policy.threshold_status === L11ThresholdPolicyStatus.ACTIVE &&
      inp.old_policy.threshold_version === inp.new_policy.threshold_version &&
      expected.classification !== L11ThresholdChangeClassification.ADDITIVE_SAFE &&
      expected.classification !== L11ThresholdChangeClassification.BACKWARD_COMPATIBLE) {
    issues.push(makeL11DriftIssue(
      L11DriftViolationCode.L11G_THRESHOLD_CHANGE_HISTORICAL_AMBIGUITY,
      'active production threshold rewrite without version bump creates historical ambiguity',
      { threshold_policy_id: ref }));
  }
  return issues;
}

function rank(c: L11ThresholdChangeClassification): number {
  switch (c) {
    case L11ThresholdChangeClassification.ADDITIVE_SAFE: return 0;
    case L11ThresholdChangeClassification.BACKWARD_COMPATIBLE: return 1;
    case L11ThresholdChangeClassification.RECALIBRATION_REQUIRED: return 2;
    case L11ThresholdChangeClassification.MIGRATION_REQUIRED: return 3;
    case L11ThresholdChangeClassification.BREAKING_SEMANTIC: return 4;
    case L11ThresholdChangeClassification.PROHIBITED: return 5;
  }
}
