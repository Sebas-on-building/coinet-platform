/**
 * L12.4 — Invalidation set validator (§12.4.29).
 */

import { isL12ActiveInvalidationStatus } from '../contracts/scenario-invalidation';
import type { L12ResolvedInvalidationSet } from '../engine/scenario-invalidation-engine';
import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12InvalidationSetArgs {
  readonly invalidation_set: L12ResolvedInvalidationSet;
  readonly path_confidence?: L12PathConfidenceContract;
}

export interface ValidateL12InvalidationSetResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioInvalidationSet(
  args: ValidateL12InvalidationSetArgs,
): ValidateL12InvalidationSetResult {
  const issues: L12RuntimeViolationIssue[] = [];
  const set = args.invalidation_set;
  if (set.invalidations.length === 0) {
    issues.push(
      l12IssueOf(L12RuntimeViolationCode.L12R_INVALIDATION_MISSING, 'no invalidations', set.invalidation_set_id),
    );
  }
  for (const i of set.invalidations) {
    if (i.evidence_refs.length === 0) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_INVALIDATION_NO_EVIDENCE, `no evidence ${i.invalidation_name}`, i.invalidation_id),
      );
    }
    if (
      isL12ActiveInvalidationStatus(i.invalidation_status) &&
      !i.monitoring_requirement.monitorable
    ) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_INVALIDATION_UNMONITORABLE_ACTIVE, `${i.invalidation_name} active but not monitorable`, i.invalidation_id),
      );
    }
  }
  // Active invalidation MUST be reflected in confidence cap refs
  if (set.active_invalidation_refs.length > 0 && args.path_confidence) {
    const caps = args.path_confidence.cap_reason_refs;
    if (!caps.some(c => c === 'CAP_ACTIVE_INVALIDATION')) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_INVALIDATION_HIDDEN_FROM_CONFIDENCE,
          'active invalidation not reflected in confidence caps',
          set.invalidation_set_id,
        ),
      );
    }
  }
  return { ok: issues.length === 0, issues };
}
