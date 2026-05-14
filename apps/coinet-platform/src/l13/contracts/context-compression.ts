/**
 * L13.2 — Context Compression Contract
 *
 * §13.2.13 — Compression may shorten context but must not change
 * meaning, drop adverse evidence first, turn uncertainty into
 * clarity, or turn conditional scenario into prediction.
 */

import type { L13ContextClass } from './context-priority';

export enum L13ContextCompressionStrategy {
  NONE = 'NONE',
  PRIORITY_TRUNCATION = 'PRIORITY_TRUNCATION',
  SUMMARIZE_LOW_PRIORITY_HISTORY = 'SUMMARIZE_LOW_PRIORITY_HISTORY',
  EVIDENCE_DIGEST_COMPRESSION = 'EVIDENCE_DIGEST_COMPRESSION',
  REMOVE_OPTIONAL_CONTEXT_ONLY = 'REMOVE_OPTIONAL_CONTEXT_ONLY',
  BLOCK_IF_REQUIRED_CONTEXT_EXCEEDS_BUDGET =
    'BLOCK_IF_REQUIRED_CONTEXT_EXCEEDS_BUDGET',
}

export const ALL_L13_CONTEXT_COMPRESSION_STRATEGIES:
  readonly L13ContextCompressionStrategy[] =
  Object.values(L13ContextCompressionStrategy);

/**
 * §13.2.13 — Illegal compression patterns. The compression engine
 * and validator both check these.
 */
export enum L13IllegalCompressionPattern {
  DROPS_CONTRADICTION_BEFORE_POSITIVE =
    'DROPS_CONTRADICTION_BEFORE_POSITIVE',
  DROPS_ACTIVE_INVALIDATION = 'DROPS_ACTIVE_INVALIDATION',
  DROPS_RESTRICTION = 'DROPS_RESTRICTION',
  DROPS_CONFIDENCE_CAP = 'DROPS_CONFIDENCE_CAP',
  REMOVES_MISSING_DATA_DISCLOSURE = 'REMOVES_MISSING_DATA_DISCLOSURE',
  REMOVES_DRIFT_DISCLOSURE = 'REMOVES_DRIFT_DISCLOSURE',
  REMOVES_EVIDENCE_REFS = 'REMOVES_EVIDENCE_REFS',
  CHANGES_SCENARIO_CONDITIONALITY = 'CHANGES_SCENARIO_CONDITIONALITY',
  DROPS_BASE_CASE_FOR_FORWARD_ANSWER = 'DROPS_BASE_CASE_FOR_FORWARD_ANSWER',
  DROPS_SCORE_ATTRIBUTION_FOR_SCORE_ANSWER =
    'DROPS_SCORE_ATTRIBUTION_FOR_SCORE_ANSWER',
}

export const ALL_L13_ILLEGAL_COMPRESSION_PATTERNS:
  readonly L13IllegalCompressionPattern[] =
  Object.values(L13IllegalCompressionPattern);

/**
 * Audit-ready record of a single compression decision. Builders emit
 * one of these per dropped or summarized context object.
 */
export interface L13ContextCompressionDecision {
  readonly decision_id: string;
  readonly context_ref: string;
  readonly context_class: L13ContextClass;
  readonly strategy: L13ContextCompressionStrategy;
  readonly was_dropped: boolean;
  readonly was_summarized: boolean;
  readonly tokens_before: number;
  readonly tokens_after: number;
  readonly preservation_reason_codes: readonly string[];
  readonly policy_version: string;
}

/**
 * Engine output describing the entire compression run.
 */
export interface L13ContextCompressionResult {
  readonly compression_result_id: string;

  readonly strategy: L13ContextCompressionStrategy;

  readonly tokens_before: number;
  readonly tokens_after: number;

  readonly decisions: readonly L13ContextCompressionDecision[];

  readonly dropped_context_refs: readonly string[];
  readonly preserved_context_refs: readonly string[];

  readonly illegal_patterns_detected:
    readonly L13IllegalCompressionPattern[];

  readonly compression_disclosure_required: boolean;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly replay_hash: string;
  readonly policy_version: string;
}
