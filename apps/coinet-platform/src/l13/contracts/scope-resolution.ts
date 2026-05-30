/**
 * L13.6 — Scope Resolution Contract
 *
 * §13.6.6 — Scope is resolved through governed lookup, never
 * guessed by the model. Scope may be ENTITY, ASSET, SECTOR,
 * ECOSYSTEM, MARKET, SCENARIO_SET, SCORE_OUTPUT, HYPOTHESIS_SET,
 * or COMPARISON.
 */

/**
 * §13.6.6.1 — Resolved scope type taxonomy.
 */
export enum L13ResolvedScopeType {
  ENTITY = 'ENTITY',
  ASSET = 'ASSET',
  SECTOR = 'SECTOR',
  ECOSYSTEM = 'ECOSYSTEM',
  MARKET = 'MARKET',
  SCENARIO_SET = 'SCENARIO_SET',
  SCORE_OUTPUT = 'SCORE_OUTPUT',
  HYPOTHESIS_SET = 'HYPOTHESIS_SET',
  COMPARISON = 'COMPARISON',
}

export const ALL_L13_RESOLVED_SCOPE_TYPES:
  readonly L13ResolvedScopeType[] =
  Object.values(L13ResolvedScopeType);

/**
 * §13.6.6.3 — Scope resolution status.
 */
export enum L13ScopeResolutionStatus {
  RESOLVED_CLEAN = 'RESOLVED_CLEAN',
  RESOLVED_WITH_DISCLOSURE = 'RESOLVED_WITH_DISCLOSURE',
  AMBIGUOUS_NEEDS_CLARIFICATION = 'AMBIGUOUS_NEEDS_CLARIFICATION',
  BLOCKED_UNRESOLVED_SCOPE = 'BLOCKED_UNRESOLVED_SCOPE',
  BLOCKED_ILLEGAL_SCOPE_REQUEST = 'BLOCKED_ILLEGAL_SCOPE_REQUEST',
}

export const ALL_L13_SCOPE_RESOLUTION_STATUSES:
  readonly L13ScopeResolutionStatus[] =
  Object.values(L13ScopeResolutionStatus);

/**
 * §13.6.6.4 — Scope law violation reason codes.
 */
export enum L13ScopeAmbiguityReasonCode {
  MULTIPLE_CANONICAL_MATCHES = 'MULTIPLE_CANONICAL_MATCHES',
  NO_CANONICAL_MATCH = 'NO_CANONICAL_MATCH',
  PARTIAL_MATCH_BELOW_THRESHOLD = 'PARTIAL_MATCH_BELOW_THRESHOLD',
  COMPARISON_REQUIRES_MULTIPLE_SCOPES = 'COMPARISON_REQUIRES_MULTIPLE_SCOPES',
  INTENT_SCOPE_MISMATCH = 'INTENT_SCOPE_MISMATCH',
  CANONICAL_LOOKUP_TIMEOUT = 'CANONICAL_LOOKUP_TIMEOUT',
}

export enum L13ScopeBlockedReasonCode {
  RAW_SCOPE_STRING_REJECTED = 'RAW_SCOPE_STRING_REJECTED',
  FORBIDDEN_SCOPE_CATEGORY = 'FORBIDDEN_SCOPE_CATEGORY',
  SCENARIO_SCOPE_MISSING_FOR_FORWARD_INTENT = 'SCENARIO_SCOPE_MISSING_FOR_FORWARD_INTENT',
  SCORE_SCOPE_MISSING_FOR_SCORE_INTENT = 'SCORE_SCOPE_MISSING_FOR_SCORE_INTENT',
  HYPOTHESIS_SCOPE_MISSING_FOR_HYPOTHESIS_INTENT = 'HYPOTHESIS_SCOPE_MISSING_FOR_HYPOTHESIS_INTENT',
}

/**
 * §13.6.6.2 — Scope Resolution Result.
 */
export interface L13ScopeResolutionResult {
  readonly scope_resolution_id: string;
  readonly request_id: string;
  readonly intent_classification_ref: string;

  readonly resolved_scope_type: L13ResolvedScopeType;
  readonly resolved_scope_id: string;
  readonly comparison_scope_refs: readonly string[];
  readonly canonical_entity_refs: readonly string[];

  readonly canonical_scope_confidence: string;
  readonly scope_resolution_status: L13ScopeResolutionStatus;

  readonly ambiguity_reason_codes: readonly L13ScopeAmbiguityReasonCode[];
  readonly blocked_reason_codes: readonly L13ScopeBlockedReasonCode[];

  readonly requires_clarification_output: boolean;

  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * §13.6.6 — Scope resolution input. The classifier-derived intent
 * is required; raw scope strings are accepted but must pass through
 * canonical lookup before they may be honored.
 */
export interface L13ScopeResolutionInput {
  readonly request_id: string;
  readonly intent_classification_ref: string;
  readonly raw_scope_hint?: string;
  readonly raw_comparison_scope_hints?: readonly string[];
}

export function isL13BlockingScopeStatus(
  status: L13ScopeResolutionStatus,
): boolean {
  return (
    status === L13ScopeResolutionStatus.BLOCKED_UNRESOLVED_SCOPE ||
    status === L13ScopeResolutionStatus.BLOCKED_ILLEGAL_SCOPE_REQUEST
  );
}
