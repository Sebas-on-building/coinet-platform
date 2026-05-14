/**
 * L12.7 — Downstream / L13 Handoff Validator (§12.7.11, §12.7.15)
 *
 * Pure validator for `L12HandoffAssessment` and the underlying
 * dependency contract. Ensures the no-rebuild law has not been
 * silently weakened.
 */

import {
  L12DownstreamDependencyContract,
  isL12DownstreamDependencyContractValid,
} from '../contracts/l12-downstream-dependency';
import {
  L12HandoffAssessment,
} from '../certification/l12-handoff-validator';
import {
  L12FinalViolationCode,
  L12FinalViolationIssue,
  makeL12FinalIssue,
} from './l12-final-violation-codes';

export function validateL12DownstreamHandoff(args: {
  contract: L12DownstreamDependencyContract;
  assessment: L12HandoffAssessment;
}): readonly L12FinalViolationIssue[] {
  const issues: L12FinalViolationIssue[] = [];
  const ref = args?.assessment?.handoff_request_id;

  if (!args?.contract || !args?.assessment) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_DOWNSTREAM_DEPENDENCY_INVALID,
      'contract or assessment null'));
    return issues;
  }

  const cv = isL12DownstreamDependencyContractValid(args.contract);
  if (!cv.ok) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_DOWNSTREAM_DEPENDENCY_INVALID,
      cv.reason, ref));
  }

  // If approved, contract must be valid AND no rebuild violations
  // present.
  if (args.assessment.approved) {
    if (!cv.ok) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_L13_HANDOFF_NOT_APPROVED,
        'L13 approval emitted on invalid dependency contract', ref));
    }
    for (const v of args.assessment.violation_codes) {
      if (v === 'L12F_LOWER_LAYER_REBUILD_ALLOWED') {
        issues.push(makeL12FinalIssue(
          L12FinalViolationCode.L12F_LOWER_LAYER_REBUILD_ALLOWED,
          'L13 approved despite rebuild violation', ref));
      }
    }
  } else {
    // Surface the underlying violation codes via the L12F_ namespace.
    for (const v of args.assessment.violation_codes) {
      switch (v) {
        case 'L12F_LOWER_LAYER_REBUILD_ALLOWED':
          issues.push(makeL12FinalIssue(
            L12FinalViolationCode.L12F_LOWER_LAYER_REBUILD_ALLOWED,
            'handoff request attempted lower-layer rebuild', ref));
          break;
        case 'L12F_RECOMMENDATION_LEAK':
          issues.push(makeL12FinalIssue(
            L12FinalViolationCode.L12F_RECOMMENDATION_LEAK,
            'handoff request attempted scenario-as-recommendation', ref));
          break;
        case 'L12F_FINAL_JUDGMENT_LEAK':
          issues.push(makeL12FinalIssue(
            L12FinalViolationCode.L12F_FINAL_JUDGMENT_LEAK,
            'handoff request attempted scenario-as-final-judgment', ref));
          break;
        case 'L12F_PREDICTION_THEATER_BREACH':
          issues.push(makeL12FinalIssue(
            L12FinalViolationCode.L12F_PREDICTION_THEATER_BREACH,
            'handoff request attempted scenario-as-prediction', ref));
          break;
        default:
          issues.push(makeL12FinalIssue(
            L12FinalViolationCode.L12F_L13_HANDOFF_NOT_APPROVED,
            v, ref));
      }
    }
  }
  return issues;
}
