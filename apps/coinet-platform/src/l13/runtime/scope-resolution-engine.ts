/**
 * L13.6 — Scope Resolution Engine
 *
 * §13.6.6 — Scope is resolved via canonical lookup, not guessed
 * by the model. The engine consumes the runtime intent
 * classification plus an optional raw scope hint and returns a
 * deterministic `L13ScopeResolutionResult`.
 *
 * §13.6.6.4 — Scope law: scope cannot be inferred from raw string
 * if canonical L3 lookup is unresolved; comparison intent requires
 * multiple resolved scopes; scenario/score/hypothesis intents
 * require their respective scope categories.
 *
 * For Phase 1 of L13.6 the canonical L3 lookup is implemented as
 * a pluggable resolver function. The default implementation uses
 * a small built-in alias table for common assets so the runtime
 * can run end-to-end without an external L3 service.
 */

import type { L13UserIntentClassification } from '../contracts/user-intent';
import { L13UserIntentClass } from '../contracts/user-intent-binding';
import {
  L13ResolvedScopeType,
  L13ScopeAmbiguityReasonCode,
  L13ScopeBlockedReasonCode,
  L13ScopeResolutionStatus,
  type L13ScopeResolutionInput,
  type L13ScopeResolutionResult,
} from '../contracts/scope-resolution';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.runtime.v1';

/**
 * §13.6.6.1 — Built-in canonical alias table. Keys are normalised
 * (lowercased, trimmed). Values are canonical scope ids.
 */
const CANONICAL_ASSET_ALIASES: Readonly<Record<string, string>> = {
  btc: 'asset.btc',
  bitcoin: 'asset.btc',
  eth: 'asset.eth',
  ethereum: 'asset.eth',
  sol: 'asset.sol',
  solana: 'asset.sol',
};

const CANONICAL_MARKET_ALIASES: Readonly<Record<string, string>> = {
  market: 'market.global',
  'crypto market': 'market.global',
  'global market': 'market.global',
};

interface CanonicalLookupResult {
  readonly canonical_id?: string;
  readonly multiple_matches?: boolean;
  readonly partial_match?: boolean;
}

function lookupCanonicalAsset(
  hint: string | undefined,
): CanonicalLookupResult {
  if (!hint) return {};
  const norm = hint.trim().toLowerCase();
  if (norm.length === 0) return {};
  const exact = CANONICAL_ASSET_ALIASES[norm];
  if (exact) return { canonical_id: exact };
  const market = CANONICAL_MARKET_ALIASES[norm];
  if (market) return { canonical_id: market };
  // Partial match heuristic: known asset substring.
  for (const k of Object.keys(CANONICAL_ASSET_ALIASES)) {
    if (norm.includes(k)) {
      return {
        canonical_id: CANONICAL_ASSET_ALIASES[k],
        partial_match: true,
      };
    }
  }
  return {};
}

interface IntentScopeRequirement {
  readonly required_type: L13ResolvedScopeType;
  readonly requires_comparison: boolean;
}

const INTENT_SCOPE_REQUIREMENTS:
  Readonly<Record<L13UserIntentClass, IntentScopeRequirement | null>> = {
  [L13UserIntentClass.WHATS_HAPPENING]: {
    required_type: L13ResolvedScopeType.ASSET,
    requires_comparison: false,
  },
  [L13UserIntentClass.WHATS_NEXT]: {
    required_type: L13ResolvedScopeType.SCENARIO_SET,
    requires_comparison: false,
  },
  [L13UserIntentClass.WHY_IS_THIS_MOVING]: {
    required_type: L13ResolvedScopeType.ASSET,
    requires_comparison: false,
  },
  [L13UserIntentClass.EXPLAIN_SCORE]: {
    required_type: L13ResolvedScopeType.SCORE_OUTPUT,
    requires_comparison: false,
  },
  [L13UserIntentClass.EXPLAIN_SCENARIO]: {
    required_type: L13ResolvedScopeType.SCENARIO_SET,
    requires_comparison: false,
  },
  [L13UserIntentClass.EXPLAIN_HYPOTHESIS]: {
    required_type: L13ResolvedScopeType.HYPOTHESIS_SET,
    requires_comparison: false,
  },
  [L13UserIntentClass.EXPLAIN_REGIME]: {
    required_type: L13ResolvedScopeType.MARKET,
    requires_comparison: false,
  },
  [L13UserIntentClass.EXPLAIN_SEQUENCE]: {
    required_type: L13ResolvedScopeType.MARKET,
    requires_comparison: false,
  },
  [L13UserIntentClass.COMPARE_ASSETS]: {
    required_type: L13ResolvedScopeType.COMPARISON,
    requires_comparison: true,
  },
  [L13UserIntentClass.COMPARE_THESES]: {
    required_type: L13ResolvedScopeType.COMPARISON,
    requires_comparison: true,
  },
  [L13UserIntentClass.WRITE_ALERT]: {
    required_type: L13ResolvedScopeType.ASSET,
    requires_comparison: false,
  },
  [L13UserIntentClass.WRITE_REPORT]: {
    required_type: L13ResolvedScopeType.ASSET,
    requires_comparison: false,
  },
  [L13UserIntentClass.CONTRADICTION_INSIGHT]: {
    required_type: L13ResolvedScopeType.ASSET,
    requires_comparison: false,
  },
  // Adversarial intents are blocked at runtime; scope resolution
  // returns BLOCKED_ILLEGAL_SCOPE_REQUEST.
  [L13UserIntentClass.REQUESTS_TRADE_ADVICE]: null,
  [L13UserIntentClass.REQUESTS_CERTAINTY]: null,
  [L13UserIntentClass.REQUESTS_BULLISH_BEARISH_ONLY]: null,
};

function buildBlockedResult(
  request_id: string,
  intentRef: string,
  required_type: L13ResolvedScopeType,
  blockedReasons: readonly L13ScopeBlockedReasonCode[],
  ambiguityReasons: readonly L13ScopeAmbiguityReasonCode[],
  status: L13ScopeResolutionStatus,
  hint?: string,
): L13ScopeResolutionResult {
  const replayHash = fnv1a(
    [
      request_id,
      intentRef,
      required_type,
      hint ?? '',
      status,
      blockedReasons.join(','),
      ambiguityReasons.join(','),
      POLICY_V,
    ].join('|'),
  );
  return {
    scope_resolution_id: `l13.scope.${replayHash}`,
    request_id,
    intent_classification_ref: intentRef,
    resolved_scope_type: required_type,
    resolved_scope_id: '',
    comparison_scope_refs: [],
    canonical_entity_refs: [],
    canonical_scope_confidence: 'NONE',
    scope_resolution_status: status,
    ambiguity_reason_codes: ambiguityReasons,
    blocked_reason_codes: blockedReasons,
    requires_clarification_output:
      status ===
      L13ScopeResolutionStatus.AMBIGUOUS_NEEDS_CLARIFICATION,
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}

/**
 * §13.6.6 — Resolve scope. Pure function over intent + hints.
 */
export function resolveL13Scope(
  intent: L13UserIntentClassification,
  input: L13ScopeResolutionInput,
): L13ScopeResolutionResult {
  const reqs = INTENT_SCOPE_REQUIREMENTS[intent.selected_intent];
  if (!reqs) {
    return buildBlockedResult(
      input.request_id,
      intent.intent_classification_id,
      L13ResolvedScopeType.ASSET,
      [L13ScopeBlockedReasonCode.FORBIDDEN_SCOPE_CATEGORY],
      [],
      L13ScopeResolutionStatus.BLOCKED_ILLEGAL_SCOPE_REQUEST,
      input.raw_scope_hint,
    );
  }
  if (reqs.requires_comparison) {
    const hints = input.raw_comparison_scope_hints ?? [];
    if (hints.length < 2) {
      return buildBlockedResult(
        input.request_id,
        intent.intent_classification_id,
        L13ResolvedScopeType.COMPARISON,
        [],
        [
          L13ScopeAmbiguityReasonCode.COMPARISON_REQUIRES_MULTIPLE_SCOPES,
        ],
        L13ScopeResolutionStatus.AMBIGUOUS_NEEDS_CLARIFICATION,
      );
    }
    const resolved: string[] = [];
    for (const h of hints) {
      const r = lookupCanonicalAsset(h);
      if (r.canonical_id) resolved.push(r.canonical_id);
    }
    if (resolved.length < 2) {
      return buildBlockedResult(
        input.request_id,
        intent.intent_classification_id,
        L13ResolvedScopeType.COMPARISON,
        [],
        [
          L13ScopeAmbiguityReasonCode.NO_CANONICAL_MATCH,
          L13ScopeAmbiguityReasonCode.COMPARISON_REQUIRES_MULTIPLE_SCOPES,
        ],
        L13ScopeResolutionStatus.AMBIGUOUS_NEEDS_CLARIFICATION,
      );
    }
    const replayHash = fnv1a(
      [
        input.request_id,
        intent.intent_classification_id,
        L13ResolvedScopeType.COMPARISON,
        resolved.sort().join(','),
        POLICY_V,
      ].join('|'),
    );
    return {
      scope_resolution_id: `l13.scope.${replayHash}`,
      request_id: input.request_id,
      intent_classification_ref: intent.intent_classification_id,
      resolved_scope_type: L13ResolvedScopeType.COMPARISON,
      resolved_scope_id: `comparison.${replayHash}`,
      comparison_scope_refs: resolved,
      canonical_entity_refs: resolved,
      canonical_scope_confidence: 'STRONG',
      scope_resolution_status:
        L13ScopeResolutionStatus.RESOLVED_CLEAN,
      ambiguity_reason_codes: [],
      blocked_reason_codes: [],
      requires_clarification_output: false,
      lineage_refs: ['l13.runtime.lineage'],
      policy_version: POLICY_V,
      replay_hash: replayHash,
    };
  }
  // Single-scope case.
  const lookup = lookupCanonicalAsset(input.raw_scope_hint);
  if (!lookup.canonical_id) {
    return buildBlockedResult(
      input.request_id,
      intent.intent_classification_id,
      reqs.required_type,
      [],
      [L13ScopeAmbiguityReasonCode.NO_CANONICAL_MATCH],
      L13ScopeResolutionStatus.AMBIGUOUS_NEEDS_CLARIFICATION,
      input.raw_scope_hint,
    );
  }
  const status = lookup.partial_match
    ? L13ScopeResolutionStatus.RESOLVED_WITH_DISCLOSURE
    : L13ScopeResolutionStatus.RESOLVED_CLEAN;
  const confidence = lookup.partial_match ? 'MEDIUM' : 'STRONG';
  const replayHash = fnv1a(
    [
      input.request_id,
      intent.intent_classification_id,
      reqs.required_type,
      lookup.canonical_id,
      status,
      confidence,
      POLICY_V,
    ].join('|'),
  );
  return {
    scope_resolution_id: `l13.scope.${replayHash}`,
    request_id: input.request_id,
    intent_classification_ref: intent.intent_classification_id,
    resolved_scope_type: reqs.required_type,
    resolved_scope_id: lookup.canonical_id,
    comparison_scope_refs: [],
    canonical_entity_refs: [lookup.canonical_id],
    canonical_scope_confidence: confidence,
    scope_resolution_status: status,
    ambiguity_reason_codes: lookup.partial_match
      ? [L13ScopeAmbiguityReasonCode.PARTIAL_MATCH_BELOW_THRESHOLD]
      : [],
    blocked_reason_codes: [],
    requires_clarification_output: false,
    lineage_refs: ['l13.runtime.lineage'],
    policy_version: POLICY_V,
    replay_hash: replayHash,
  };
}
