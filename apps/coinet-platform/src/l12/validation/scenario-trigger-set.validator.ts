/**
 * L12.4 — Trigger set validator (§12.4.29).
 */

import { L12TriggerStatus } from '../contracts/scenario-trigger';
import type { L12ResolvedTriggerSet } from '../engine/scenario-trigger-engine';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

const FORBIDDEN: readonly RegExp[] = [
  /(?:^|[^a-z0-9])guaranteed(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])inevitable(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])buy(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])sell(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])long(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])short(?:[^a-z0-9]|$)/i,
];

export interface ValidateL12TriggerSetResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioTriggerSet(
  set: L12ResolvedTriggerSet,
): ValidateL12TriggerSetResult {
  const issues: L12RuntimeViolationIssue[] = [];
  if (set.triggers.length === 0) {
    issues.push(
      l12IssueOf(L12RuntimeViolationCode.L12R_TRIGGER_MISSING, 'no triggers in trigger set', set.trigger_set_id),
    );
  }
  for (const t of set.triggers) {
    if (FORBIDDEN.some(p => p.test(t.trigger_name))) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_TRIGGER_GUARANTEED_OUTCOME, `forbidden phrase in ${t.trigger_name}`, t.trigger_id),
      );
    }
    if (t.evidence_refs.length === 0) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_TRIGGER_NO_EVIDENCE, `no evidence for ${t.trigger_name}`, t.trigger_id),
      );
    }
    if (
      t.trigger_status === L12TriggerStatus.ACTIVE &&
      !t.monitoring_requirement.monitorable
    ) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_TRIGGER_UNMONITORABLE_ACTIVE, `${t.trigger_name} active but not monitorable`, t.trigger_id),
      );
    }
  }
  return { ok: issues.length === 0, issues };
}
