/**
 * L6.1 — Forbidden Actions Contract
 *
 * §6.1.6 — What Layer 6 may NEVER do.
 * §6.1.6.2 — Direct raw payload ban.
 * §6.1.6.3 — Silent neutralization ban.
 * §6.1.6.4 — Late-data mutation ban.
 * §6.1.6.5 — Judgment emission ban.
 */

import { L6ForbiddenAction, ALL_FORBIDDEN_ACTIONS } from './l6-constitutional-types';

export interface ForbiddenActionDefinition {
  readonly action: L6ForbiddenAction;
  readonly description: string;
  readonly examples: readonly string[];
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const FORBIDDEN_ACTION_DEFINITIONS: readonly ForbiddenActionDefinition[] = [
  {
    action: L6ForbiddenAction.ILLEGAL_IDENTITY_INFERENCE,
    description: 'L6 may not resolve or invent identity — must use L3 canonical refs',
    examples: ['Creating entity IDs from provider-native keys', 'Resolving ticker symbols outside L3'],
    severity: 'CRITICAL',
  },
  {
    action: L6ForbiddenAction.MISSING_METRIC_CONTRACT_BYPASS,
    description: 'L6 may not infer missing metric contracts',
    examples: ['Using a metric value without verifying contract exists', 'Guessing units or precision'],
    severity: 'CRITICAL',
  },
  {
    action: L6ForbiddenAction.RAW_PROVIDER_BYPASS,
    description: 'L6 may not consume raw provider-native payloads directly',
    examples: ['Reading raw CoinGecko JSON', 'Parsing unsanctioned cache blobs', 'Using UI aggregates as inputs'],
    severity: 'CRITICAL',
  },
  {
    action: L6ForbiddenAction.HIDDEN_NEUTRAL_FILL,
    description: 'L6 may not silently replace missing data with neutral values',
    examples: ['missing metric → 0', 'missing context → "neutral"', 'missing baseline → "normal"', 'stale state → treated as current'],
    severity: 'CRITICAL',
  },
  {
    action: L6ForbiddenAction.LATE_DATA_SILENT_MUTATION,
    description: 'Late data may trigger recomputation but may not silently rewrite current authority',
    examples: ['Overwriting current feature state with a backfilled value without rematerialization law'],
    severity: 'HIGH',
  },
  {
    action: L6ForbiddenAction.JUDGMENT_LANGUAGE_LEAK,
    description: 'L6 may not emit names, types, or docs implying final judgment',
    examples: ['buy_signal', 'bullish_confirmation', 'strong_thesis_validated', 'avoid_score', 'high_conviction_trade_event'],
    severity: 'HIGH',
  },
  {
    action: L6ForbiddenAction.ILLEGAL_GRAPH_REINTERPRETATION,
    description: 'L6 may not redefine L4 graph meaning, edges, or propagation semantics',
    examples: ['Creating ad hoc edges outside L4 law', 'Inventing propagation weights'],
    severity: 'CRITICAL',
  },
  {
    action: L6ForbiddenAction.ILLEGAL_STORAGE_BYPASS,
    description: 'L6 may not write to stores outside L5 coordination',
    examples: ['Direct Postgres INSERT bypassing L5', 'Direct Redis SET outside L5 key families'],
    severity: 'CRITICAL',
  },
  {
    action: L6ForbiddenAction.CONFIDENCE_LAW_OVERRIDE,
    description: 'L6 may not create shadow confidence logic that overrides L3 confidence law',
    examples: ['Ignoring L3 confidence scores', 'Replacing confidence with custom heuristics'],
    severity: 'HIGH',
  },
  {
    action: L6ForbiddenAction.LOWER_LAYER_REDEFINITION,
    description: 'L6 may not redefine L3 identity, L4 graph meaning, or L5 storage authority',
    examples: ['Re-resolving entity identity', 'Redefining authority homes', 'Overriding topology law'],
    severity: 'CRITICAL',
  },
];

export function getForbiddenActionDefinition(action: L6ForbiddenAction): ForbiddenActionDefinition {
  return FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllCriticalForbiddenActions(): readonly L6ForbiddenAction[] {
  return FORBIDDEN_ACTION_DEFINITIONS.filter(d => d.severity === 'CRITICAL').map(d => d.action);
}
