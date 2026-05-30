/**
 * L13.7 — Contradiction Explanation Output Validator
 *
 * §13.7.17 — Contradiction explanations must carry L7 refs and
 * affected L10/L12 refs, and may not minimise active contradiction.
 */

import {
  L13_CONTRADICTION_MINIMIZATION_PATTERNS,
  type L13ContradictionExplanationOutput,
} from '../contracts/contradiction-explanation-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export function validateL13ContradictionExplanationOutput(
  con: L13ContradictionExplanationOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!con.contradiction_explanation_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'contradiction_explanation_id missing',
    });
  }
  if (!con.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (con.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (con.supporting_l7_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_CONTRADICTION_EXPLANATION_WITHOUT_L7_REF,
      severity: SEV.CRITICAL,
      message: 'supporting_l7_refs empty',
    });
  }
  if (
    con.affected_l10_hypothesis_refs.length === 0 &&
    con.affected_l12_scenario_refs.length === 0
  ) {
    issues.push({
      code: L13ModeViolationCode.L13M_CONTRADICTION_EXPLANATION_WITHOUT_AFFECTED_CONTEXT,
      severity: SEV.CRITICAL,
      message:
        'contradiction explanation must reference at least one L10 hypothesis or L12 scenario',
    });
  }
  const corpus = [
    con.contradiction_summary_line,
    ...con.what_it_weakens_lines,
    ...con.confidence_impact_lines,
    ...con.restriction_impact_lines,
    ...con.possible_resolution_lines,
    ...con.escalation_lines,
  ].join(' ');
  for (const pattern of L13_CONTRADICTION_MINIMIZATION_PATTERNS) {
    if (pattern.test(corpus)) {
      issues.push({
        code: L13ModeViolationCode.L13M_CONTRADICTION_EXPLANATION_MINIMIZED,
        severity: SEV.CRITICAL,
        message: `contradiction minimization detected (pattern: ${pattern.source})`,
      });
      break;
    }
  }
  if (con.contradiction_minimized_detected !== false) {
    issues.push({
      code: L13ModeViolationCode.L13M_CONTRADICTION_EXPLANATION_MINIMIZED,
      severity: SEV.CRITICAL,
      message: 'contradiction_minimized_detected must be false',
    });
  }
  return l13ModeResult(issues);
}
