/**
 * L12.7 — Rollout Gate Validator (§12.7.12, §12.7.15)
 *
 * Validates a rollout gate decision (or the inputs to one). The
 * validator surfaces missing flags / illegal level / critical breach
 * as L12F_ violations.
 */

import {
  L12RolloutGateDecision,
  L12RolloutGateInput,
} from '../rollout/l12-rollout-gate';
import {
  L12FinalViolationCode,
  L12FinalViolationIssue,
  makeL12FinalIssue,
} from './l12-final-violation-codes';

export function validateL12RolloutGate(args: {
  input: L12RolloutGateInput;
  decision: L12RolloutGateDecision;
}): readonly L12FinalViolationIssue[] {
  const issues: L12FinalViolationIssue[] = [];
  const { input, decision } = args ?? {} as never;
  if (!input || !decision) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_ROLLOUT_GATE_ILLEGAL,
      'rollout gate input/decision null'));
    return issues;
  }
  if (decision.admitted && input.critical_breach_count > 0) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_CRITICAL_BREACH_PRESENT,
      'gate admitted while critical breaches present'));
  }
  if (!decision.admitted && decision.missing_flags.length > 0) {
    for (const f of decision.missing_flags) {
      issues.push(makeL12FinalIssue(
        L12FinalViolationCode.L12F_ROLLOUT_FLAG_MISSING,
        `rollout flag missing: ${f}`));
    }
  }
  if (!decision.admitted &&
      decision.reason.includes('below required')) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_ROLLOUT_LEVEL_TOO_LOW, decision.reason));
  }
  if (!decision.admitted && decision.missing_flags.length === 0
      && input.critical_breach_count === 0
      && !decision.reason.includes('below required')) {
    issues.push(makeL12FinalIssue(
      L12FinalViolationCode.L12F_ROLLOUT_GATE_ILLEGAL, decision.reason));
  }
  return issues;
}
