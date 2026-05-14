/**
 * L13.2 — Context Priority Engine
 *
 * §13.2.12 — Classifies and ranks every context object the
 * input-package builder considers. Required preservation overrides
 * priority rank so contradictions, invalidations, triggers,
 * confidence caps, restrictions, missing-data, drift, evidence and
 * lineage may never be dropped during compression.
 */

import {
  L13ContextClass,
  getL13ContextPriorityRank,
  isL13MustPreserveContextClass,
  type L13ContextPriorityDecision,
} from '../contracts/context-priority';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

export interface L13ContextItem {
  readonly context_ref: string;
  readonly context_class: L13ContextClass;
  /**
   * Estimated token cost. Used by the compression engine; a default
   * estimate of 0 means "ignore for budget computation".
   */
  readonly token_cost?: number;
  /**
   * Whether the item is required by the user intent (for example
   * `L12_SCENARIO_BASE_CASE` is required when intent is forward
   * looking). Drives `preserve_required` even when the item is not
   * on the global must-preserve list.
   */
  readonly intent_required?: boolean;
}

export interface L13ContextPriorityResult {
  readonly priority_result_id: string;
  readonly decisions: readonly L13ContextPriorityDecision[];
  readonly required_refs: readonly string[];
  readonly droppable_refs: readonly string[];
  readonly policy_version: string;
}

function decisionId(item: L13ContextItem, rank: number): string {
  return `l13d.priority.${fnv1a(
    [item.context_ref, item.context_class, String(rank)].join('|'),
  )}`;
}

/**
 * §13.2.12 — Build priority decisions for every context item.
 */
export function classifyL13Context(
  items: readonly L13ContextItem[],
): L13ContextPriorityResult {
  const decisions: L13ContextPriorityDecision[] = [];
  const requiredRefs: string[] = [];
  const droppableRefs: string[] = [];

  for (const item of items) {
    const rank = getL13ContextPriorityRank(item.context_class);
    const mustPreserve = isL13MustPreserveContextClass(item.context_class);
    const intentRequired = item.intent_required === true;
    const preserveRequired = mustPreserve || intentRequired;

    const reasons: string[] = [];
    if (mustPreserve) reasons.push('CRITICAL_PRESERVATION_OVERRIDE');
    if (intentRequired) reasons.push('USER_INTENT_REQUIRED');

    const decision: L13ContextPriorityDecision = {
      priority_decision_id: decisionId(item, rank),
      context_ref: item.context_ref,
      context_class: item.context_class,
      priority_rank: rank,
      preserve_required: preserveRequired,
      compression_allowed: !mustPreserve, // protected items must keep meaning
      dropping_allowed: !preserveRequired,
      preservation_reason_codes: reasons,
      policy_version: POLICY_V,
    };
    decisions.push(decision);
    if (preserveRequired) requiredRefs.push(item.context_ref);
    else droppableRefs.push(item.context_ref);
  }

  decisions.sort((a, b) => {
    if (a.priority_rank !== b.priority_rank) {
      return a.priority_rank - b.priority_rank;
    }
    return a.context_ref.localeCompare(b.context_ref);
  });

  return {
    priority_result_id: `l13d.priority_result.${fnv1a(
      decisions.map(d => d.priority_decision_id).join('|'),
    )}`,
    decisions,
    required_refs: requiredRefs.sort(),
    droppable_refs: droppableRefs.sort(),
    policy_version: POLICY_V,
  };
}
