/**
 * L12.4 — Path construction validator (§12.4.29).
 */

import {
  detectL12PathClaimCertainty,
  isL12PathClaimConditional,
} from '../contracts/scenario-path.contract';
import { L12ScenarioType } from '../contracts/scenario-type';
import type { L12ConstructedScenarioPaths } from '../engine/scenario-path-construction-engine';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12PathConstructionArgs {
  readonly constructed: L12ConstructedScenarioPaths;
  readonly insufficient_inputs_for_alternatives?: boolean;
}

export interface ValidateL12PathConstructionResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioPathConstruction(
  args: ValidateL12PathConstructionArgs,
): ValidateL12PathConstructionResult {
  const issues: L12RuntimeViolationIssue[] = [];
  const c = args.constructed;
  if (c.scenario_paths.length === 1 && !args.insufficient_inputs_for_alternatives) {
    if (c.scenario_paths[0]!.scenario_type !== L12ScenarioType.INSUFFICIENT_DATA_CASE) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_SINGLE_PATH_WITHOUT_INSUFFICIENT,
          'single path without insufficient-competition disclosure',
          c.constructed_paths_id,
        ),
      );
    }
  }
  for (const p of c.scenario_paths) {
    if (
      p.scenario_type !== L12ScenarioType.INSUFFICIENT_DATA_CASE &&
      p.trigger_refs.length === 0
    ) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_PATH_WITHOUT_TRIGGER, `path without triggers: ${p.scenario_name}`, p.scenario_id),
      );
    }
    if (
      p.scenario_type !== L12ScenarioType.INSUFFICIENT_DATA_CASE &&
      p.invalidation_refs.length === 0
    ) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_PATH_WITHOUT_INVALIDATION, `path without invalidations: ${p.scenario_name}`, p.scenario_id),
      );
    }
    if (!isL12PathClaimConditional(p.path_claim)) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_PATH_NOT_CONDITIONAL, `path claim not conditional: ${p.scenario_name}`, p.scenario_id),
      );
    }
    if (detectL12PathClaimCertainty(p.path_claim)) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_PATH_CERTAINTY_LANGUAGE, `certainty wording: ${p.scenario_name}`, p.scenario_id),
      );
    }
  }
  return { ok: issues.length === 0, issues };
}
