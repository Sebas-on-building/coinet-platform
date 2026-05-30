/**
 * L13.7 — Scenario Explanation Output Validator
 *
 * §13.7.15.3 — Scenario explanations are illegal if base case,
 * triggers, invalidations, or conditionality preservation are
 * missing.
 */

import type { L13ScenarioExplanationOutput } from '../contracts/scenario-explanation-output';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13ModeViolationCode } from './l13-mode-violation-codes';
import {
  l13ModeResult,
  type L13ModeIssue,
  type L13ModeValidationResult,
} from './_l13-mode-issue';

const SEV = L13ViolationSeverity;

export function validateL13ScenarioExplanationOutput(
  scn: L13ScenarioExplanationOutput,
): L13ModeValidationResult {
  const issues: L13ModeIssue[] = [];
  if (!scn.scenario_explanation_id) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_PAYLOAD_MISSING,
      severity: SEV.CRITICAL,
      message: 'scenario_explanation_id missing',
    });
  }
  if (!scn.replay_hash) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_REPLAY_HASH_MISSING,
      severity: SEV.CRITICAL,
      message: 'replay_hash missing',
    });
  }
  if (scn.lineage_refs.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_MODE_LINEAGE_MISSING,
      severity: SEV.CRITICAL,
      message: 'lineage_refs empty',
    });
  }
  if (!scn.base_case_line || scn.base_case_line.trim().length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_SCENARIO_EXPLANATION_WITHOUT_CONDITIONALITY,
      severity: SEV.CRITICAL,
      message: 'base_case_line missing',
    });
  }
  if (scn.trigger_lines.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_SCENARIO_EXPLANATION_TRIGGER_MISSING,
      severity: SEV.CRITICAL,
      message: 'scenario explanation missing trigger_lines',
    });
  }
  if (scn.invalidation_lines.length === 0) {
    issues.push({
      code: L13ModeViolationCode.L13M_SCENARIO_EXPLANATION_INVALIDATION_MISSING,
      severity: SEV.CRITICAL,
      message: 'scenario explanation missing invalidation_lines',
    });
  }
  if (scn.scenario_conditionality_preserved !== true) {
    issues.push({
      code: L13ModeViolationCode.L13M_SCENARIO_EXPLANATION_WITHOUT_CONDITIONALITY,
      severity: SEV.CRITICAL,
      message:
        'scenario_conditionality_preserved must be true',
    });
  }
  return l13ModeResult(issues);
}
