/**
 * L13.2 — Context Compression Engine
 *
 * §13.2.13 — Compress context to fit token budgets without changing
 * meaning, dropping adverse evidence first, or turning uncertainty
 * into clarity. Stage order:
 *
 *   1. classify items via context-priority-engine
 *   2. mark must-preserve and intent-required as protected
 *   3. drop optional/historical first
 *   4. drop low-priority positive evidence before contradictions
 *   5. preserve trigger/invalidation/uncertainty/restriction always
 *   6. block if required cannot fit
 */

import {
  L13ContextCompressionStrategy,
  L13IllegalCompressionPattern,
  type L13ContextCompressionDecision,
  type L13ContextCompressionResult,
} from '../contracts/context-compression';
import { L13ContextClass } from '../contracts/context-priority';
import {
  classifyL13Context,
  type L13ContextItem,
} from './context-priority-engine';
import { fnv1a } from './_fnv1a';

const POLICY_V = 'l13.input-package.v1';

export interface L13ContextCompressionInput {
  readonly request_id: string;
  readonly items: readonly L13ContextItem[];
  readonly available_tokens: number;
  readonly strategy: L13ContextCompressionStrategy;
  readonly evidence_refs?: readonly string[];
  readonly lineage_refs?: readonly string[];
}

const DEFAULT_TOKEN_COST = 50;

function tokensFor(item: L13ContextItem): number {
  return item.token_cost ?? DEFAULT_TOKEN_COST;
}

/**
 * §13.2.13 — Stable, deterministic compression.
 */
export function compressL13Context(
  input: L13ContextCompressionInput,
): L13ContextCompressionResult {
  const classified = classifyL13Context(input.items);

  // Index by ref for quick lookup.
  const itemByRef = new Map<string, L13ContextItem>();
  for (const it of input.items) itemByRef.set(it.context_ref, it);

  // Walk decisions from lowest to highest priority (largest rank first
  // = lowest priority). Drop droppable items until the budget fits.
  const decisionsLowestFirst = [...classified.decisions].sort(
    (a, b) => b.priority_rank - a.priority_rank,
  );

  const totalBefore = input.items.reduce(
    (s, it) => s + tokensFor(it),
    0,
  );
  let currentTokens = totalBefore;

  const droppedRefs = new Set<string>();
  const compressionDecisions: L13ContextCompressionDecision[] = [];

  if (input.strategy !== L13ContextCompressionStrategy.NONE) {
    for (const d of decisionsLowestFirst) {
      if (currentTokens <= input.available_tokens) break;
      if (!d.dropping_allowed) continue;
      const item = itemByRef.get(d.context_ref);
      if (!item) continue;
      const cost = tokensFor(item);
      droppedRefs.add(item.context_ref);
      compressionDecisions.push({
        decision_id: `l13d.compression.${fnv1a(
          [item.context_ref, 'DROP'].join('|'),
        )}`,
        context_ref: item.context_ref,
        context_class: item.context_class,
        strategy: input.strategy,
        was_dropped: true,
        was_summarized: false,
        tokens_before: cost,
        tokens_after: 0,
        preservation_reason_codes: [],
        policy_version: POLICY_V,
      });
      currentTokens -= cost;
    }
  }

  // §13.2.13 — Detect illegal compression patterns.
  const illegal: L13IllegalCompressionPattern[] = [];

  // Pattern: dropped contradiction while a positive of same/lower
  // priority remained.
  const droppedClasses = new Set<L13ContextClass>();
  for (const ref of droppedRefs) {
    const item = itemByRef.get(ref);
    if (item) droppedClasses.add(item.context_class);
  }

  if (
    droppedClasses.has(L13ContextClass.STRONGEST_CONTRADICTIONS) ||
    droppedClasses.has(L13ContextClass.L7_CONTRADICTIONS)
  ) {
    illegal.push(
      L13IllegalCompressionPattern.DROPS_CONTRADICTION_BEFORE_POSITIVE,
    );
  }
  if (
    droppedClasses.has(L13ContextClass.L12_INVALIDATIONS) ||
    droppedClasses.has(L13ContextClass.INVALIDATION_EVIDENCE)
  ) {
    illegal.push(L13IllegalCompressionPattern.DROPS_ACTIVE_INVALIDATION);
  }
  if (
    droppedClasses.has(L13ContextClass.RESTRICTIONS) ||
    droppedClasses.has(L13ContextClass.L7_RESTRICTIONS) ||
    droppedClasses.has(L13ContextClass.L11_SCORE_RESTRICTIONS) ||
    droppedClasses.has(L13ContextClass.L12_SCENARIO_RESTRICTIONS)
  ) {
    illegal.push(L13IllegalCompressionPattern.DROPS_RESTRICTION);
  }
  if (droppedClasses.has(L13ContextClass.CONFIDENCE_CAPS)) {
    illegal.push(L13IllegalCompressionPattern.DROPS_CONFIDENCE_CAP);
  }
  if (droppedClasses.has(L13ContextClass.MISSING_DATA_DISCLOSURES)) {
    illegal.push(
      L13IllegalCompressionPattern.REMOVES_MISSING_DATA_DISCLOSURE,
    );
  }
  if (droppedClasses.has(L13ContextClass.DRIFT_DISCLOSURES)) {
    illegal.push(L13IllegalCompressionPattern.REMOVES_DRIFT_DISCLOSURE);
  }
  if (droppedClasses.has(L13ContextClass.EVIDENCE_REFS)) {
    illegal.push(L13IllegalCompressionPattern.REMOVES_EVIDENCE_REFS);
  }
  if (droppedClasses.has(L13ContextClass.L12_SCENARIO_BASE_CASE)) {
    illegal.push(
      L13IllegalCompressionPattern.DROPS_BASE_CASE_FOR_FORWARD_ANSWER,
    );
  }
  if (droppedClasses.has(L13ContextClass.L11_SCORE_ATTRIBUTION)) {
    illegal.push(
      L13IllegalCompressionPattern.DROPS_SCORE_ATTRIBUTION_FOR_SCORE_ANSWER,
    );
  }

  const preservedRefs = input.items
    .map(i => i.context_ref)
    .filter(r => !droppedRefs.has(r))
    .sort();
  const droppedSorted = [...droppedRefs].sort();

  const replayHash = fnv1a(
    [
      input.request_id,
      input.strategy,
      String(input.available_tokens),
      preservedRefs.join(','),
      droppedSorted.join(','),
    ].join('|'),
  );

  return {
    compression_result_id: `l13d.compression_result.${replayHash}`,
    strategy: input.strategy,
    tokens_before: totalBefore,
    tokens_after: currentTokens,
    decisions: compressionDecisions,
    dropped_context_refs: droppedSorted,
    preserved_context_refs: preservedRefs,
    illegal_patterns_detected: [...new Set(illegal)].sort(),
    compression_disclosure_required: droppedSorted.length > 0,
    evidence_refs: [...(input.evidence_refs ?? [])].sort(),
    lineage_refs: [...(input.lineage_refs ?? [])].sort(),
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
