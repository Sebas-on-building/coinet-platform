/**
 * L12.4 — Runtime readiness validator (§12.4.29).
 *
 * Cross-cuts the entire execution context to verify the *runtime* preserves
 * the L12.3 output-readiness law: clean emission requires every required
 * stage artifact, no prediction theater, no broader-than-readiness
 * restrictions, no fake clean under unresolved competition.
 */

import {
  L12ScenarioOutputReadinessClass,
  isL12BlockingOutputReadiness,
  isL12CleanOutputReadiness,
} from '../contracts/scenario-output-readiness.contract';
import { L12ScenarioSpreadClass } from '../contracts/scenario-set';
import type { L12ScenarioExecutionContext } from '../runtime/scenario-execution-context';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12RuntimeReadinessArgs {
  readonly ctx: L12ScenarioExecutionContext;
  readonly declared_readiness: L12ScenarioOutputReadinessClass;
}

export interface ValidateL12RuntimeReadinessResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12RuntimeReadiness(
  args: ValidateL12RuntimeReadinessArgs,
): ValidateL12RuntimeReadinessResult {
  const issues: L12RuntimeViolationIssue[] = [];
  const ctx = args.ctx;
  const declared = args.declared_readiness;

  const hasRequired = !!(
    ctx.scenario_subject &&
    ctx.input_resolution &&
    ctx.candidate_set &&
    ctx.condition_set &&
    ctx.trigger_set &&
    ctx.invalidation_set &&
    ctx.constructed_paths &&
    ctx.path_confidence &&
    ctx.ranking &&
    ctx.restrictions &&
    ctx.evidence_pack
  );
  if (!hasRequired && isL12CleanOutputReadiness(declared)) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_EXECUTION_CONTEXT_INVALID,
        'CLEAN_EMISSION declared but required artifacts missing',
      ),
    );
  }

  if (
    isL12CleanOutputReadiness(declared) &&
    ctx.ranking?.scenario_spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION
  ) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_RANKING_FAKE_CLEAN,
        'CLEAN_EMISSION but UNRESOLVED_COMPETITION',
      ),
    );
  }
  if (
    isL12BlockingOutputReadiness(declared) &&
    ctx.materialization_intent
  ) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_MATERIALIZATION_BLOCKED_READINESS,
        `blocked readiness (${declared}) but materialization intent present`,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}
