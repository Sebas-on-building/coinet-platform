/**
 * L12.4 — Condition set validator (§12.4.29).
 */

import {
  L12ConditionMaterialityClass,
  L12ConditionRole,
  isL12LegalConditionTypeLayer,
} from '../contracts/scenario-condition';
import type { L12ResolvedConditionSet } from '../engine/scenario-condition-resolver';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

const RAW_REF = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;

export interface ValidateL12ConditionSetResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioConditionSet(
  set: L12ResolvedConditionSet,
): ValidateL12ConditionSetResult {
  const issues: L12RuntimeViolationIssue[] = [];
  for (const c of set.conditions) {
    if (!isL12LegalConditionTypeLayer(c.condition_type, c.source_layer)) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_CONDITION_TYPE_LAYER_MISMATCH,
          `${c.condition_type}/${c.source_layer}`,
          c.condition_id,
        ),
      );
    }
    if (RAW_REF.test(c.required_surface_ref)) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_CONDITION_RAW_INPUT,
          `raw ref ${c.required_surface_ref}`,
          c.condition_id,
        ),
      );
    }
    if (
      (c.materiality_class === L12ConditionMaterialityClass.MATERIAL ||
        c.materiality_class === L12ConditionMaterialityClass.CRITICAL) &&
      c.evidence_refs.length === 0
    ) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_CONDITION_NO_EVIDENCE, 'material condition without evidence', c.condition_id),
      );
    }
    if (
      (c.condition_role === L12ConditionRole.CONFIRMS_PATH ||
        c.condition_role === L12ConditionRole.INVALIDATES_PATH) &&
      !c.monitorable
    ) {
      issues.push(
        l12IssueOf(
          L12RuntimeViolationCode.L12R_CONDITION_NOT_MONITORABLE,
          `confirmation/invalidation condition not monitorable`,
          c.condition_id,
        ),
      );
    }
  }
  return { ok: issues.length === 0, issues };
}
