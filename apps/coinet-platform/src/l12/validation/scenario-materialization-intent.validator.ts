/**
 * L12.4 — Materialization intent validator (§12.4.29).
 */

import {
  isL12BlockingOutputReadiness,
  L12ScenarioOutputReadinessClass,
} from '../contracts/scenario-output-readiness.contract';
import type { L12ScenarioMaterializationIntent } from '../materialization/scenario-materializer';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12MaterializationIntentArgs {
  readonly intent: L12ScenarioMaterializationIntent;
  readonly readiness_class: L12ScenarioOutputReadinessClass;
  readonly evidence_pack_present: boolean;
}

export interface ValidateL12MaterializationIntentResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12MaterializationIntent(
  args: ValidateL12MaterializationIntentArgs,
): ValidateL12MaterializationIntentResult {
  const issues: L12RuntimeViolationIssue[] = [];
  const i = args.intent;
  if (!i.evidence_pack_ref || !args.evidence_pack_present) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_MATERIALIZATION_WITHOUT_EVIDENCE_PACK,
        'no evidence pack',
        i.materialization_intent_id,
      ),
    );
  }
  if (!i.l5_route_ref) {
    issues.push(
      l12IssueOf(L12RuntimeViolationCode.L12R_L5_ROUTE_MISSING, 'no L5 route', i.materialization_intent_id),
    );
  }
  if (i.direct_store_write_attempted) {
    issues.push(
      l12IssueOf(L12RuntimeViolationCode.L12R_DIRECT_STORE_WRITE, 'direct store write', i.materialization_intent_id),
    );
  }
  if (isL12BlockingOutputReadiness(args.readiness_class)) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_MATERIALIZATION_BLOCKED_READINESS,
        `materialization with blocked readiness ${args.readiness_class}`,
        i.materialization_intent_id,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}
