/**
 * L12.4 — Input resolution validator (§12.4.29).
 */

import type { L12ScenarioInputResolution } from '../engine/scenario-input-resolver';
import { L12ResolvedInputReadinessClass } from '../engine/scenario-input-resolver';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

const RAW_REF = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;

export interface ValidateL12InputResolutionResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioInputResolution(
  res: L12ScenarioInputResolution,
): ValidateL12InputResolutionResult {
  const issues: L12RuntimeViolationIssue[] = [];

  if (res.usable_score_context_refs.length === 0) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_L11_SCORE_CONTEXT_INCOMPLETE,
        'no usable L11 score context refs',
        res.input_resolution_id,
      ),
    );
  }
  for (const ref of res.usable_score_context_refs) {
    if (RAW_REF.test(ref)) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_NAKED_SCORE_CONSUMPTION,
          `naked/raw score ref: ${ref}`,
          res.input_resolution_id,
        ),
      );
    }
  }
  if (res.readiness_class === L12ResolvedInputReadinessClass.BLOCKED) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_INPUT_RESOLUTION_BLOCKED,
        'input resolution blocked',
        res.input_resolution_id,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}
