/**
 * L8.1 — Forbidden Actions Contract
 *
 * §8.1.5 — What Layer 8 may NEVER do. These must be codified and
 * test-covered, not left as prose.
 */

import { L8ForbiddenAction } from './l8-constitutional-types';

export interface L8ForbiddenActionDefinition {
  readonly action: L8ForbiddenAction;
  readonly description: string;
  readonly examples: readonly string[];
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const L8_FORBIDDEN_ACTION_DEFINITIONS: readonly L8ForbiddenActionDefinition[] = [
  {
    action: L8ForbiddenAction.VALIDATION_TRUTH_REDEFINITION,
    description:
      'L8 may consume L7 validation truth but may not redefine or override it. ' +
      'Validation classes, contradiction families, and confidence bands from L7 are law.',
    examples: [
      'Overriding a L7 validation class from CONFLICTING to CONFIRMED inside a regime calc',
      'Recomputing validation truth from L6 to bypass L7 restrictions',
      'Reclassifying a contradiction family as noise within a regime engine',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.CONTRADICTION_POSTURE_IGNORE,
    description:
      'L8 may not ignore the contradiction posture attached to an L7 assessment when ' +
      'conditioning regime outputs or multipliers',
    examples: [
      'Treating a L7 result with open contradiction as fully supported inside a regime call',
      'Silently dropping contradiction posture when deriving multiplier',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.RESTRICTION_POSTURE_IGNORE,
    description:
      'L8 may not ignore the restriction profile attached to an L7 assessment',
    examples: [
      'Using L7 output in multiplier derivation when restriction profile forbids it',
      'Serving restricted L7 state to L9 consumers without governed re-declaration',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.RESTRICTION_BYPASS,
    description:
      'L8 may not widen the downstream rights of L7 outputs beyond their declared restriction profile',
    examples: [
      'Emit a multiplier that requires more L7 strength than restriction allows',
      'Use restricted L7 state as if it were unrestricted',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.RAW_DATA_REGIME_INVENTION,
    description:
      'L8 may not invent regime labels from raw ungated data that bypasses L6/L7 governance',
    examples: [
      'Compute regime directly from an exchange websocket feed',
      'Compute regime from provider-native snapshots not routed through L6',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.RAW_L6_REVALIDATION_BYPASS,
    description:
      'L8 may not re-run validation live from L6 to bypass L7 restrictions — that is L7 work',
    examples: [
      'Redo contradiction detection in regime engine',
      'Re-assess confidence from L6 primitives without going through L7',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.AMBIGUITY_LAUNDERING,
    description:
      'L8 may not silently flatten multi-regime ambiguity or active transitions into fake certainty',
    examples: [
      'Tie-breaking two coexisting regimes by recent price action',
      'Picking a single regime when multiple materially apply',
      'Dropping transition risk when a transition is in progress',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.FINAL_SCENARIO_LEAK,
    description: 'L8 may not emit scenario finalization',
    examples: [
      'scenario_winner', 'most_likely_scenario', 'final_scenario',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.FINAL_JUDGMENT_LEAK,
    description:
      'L8 may not emit final judgment language such as "this regime is attractive" ' +
      'or "high-conviction setup"',
    examples: [
      'final_judgment', 'conviction_trade', 'attractive_regime', 'winning_thesis',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
    description:
      'L8 may not emit recommendation or actionability language — no buy/sell/avoid signals',
    examples: [
      'buy_signal', 'sell_signal', 'avoid_signal', 'trade_signal',
      'risk_on_buy', 'risk_off_avoid',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.SCORE_OVERRIDE_AS_MULTIPLIER,
    description:
      'L8 may not disguise score overrides as regime multipliers — multipliers are interpretive, not final',
    examples: [
      'Applying a +100% score bump labeled "regime multiplier"',
      'Returning a multiplier that is the final score in disguise',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.ACTION_BIAS_IN_REGIME_NAME,
    description:
      'Regime labels must describe environments, not imply actions',
    examples: [
      'buy_ready_regime', 'avoid_regime', 'bullish_confirmed_regime',
    ],
    severity: 'HIGH',
  },
  {
    action: L8ForbiddenAction.ILLEGAL_L5_BYPASS,
    description: 'L8 may not persist or read outside governed L5 paths',
    examples: [
      'Direct Postgres INSERT bypassing L5',
      'Shadow Redis store for regime state',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.LOWER_LAYER_IDENTITY_REDEFINITION,
    description: 'L8 may not re-resolve identity established by L3',
    examples: ['creating entity IDs from provider keys', 'shadow identity maps'],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.LOWER_LAYER_GRAPH_REDEFINITION,
    description: 'L8 may not invent graph semantics or rebuild propagation law',
    examples: ['ad hoc edges outside L4', 'local propagation weights'],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.LOWER_LAYER_PRIMITIVE_REDEFINITION,
    description:
      'L8 may consume L6 primitives but may not mutate their meaning or reinterpret their null/freshness law',
    examples: [
      'Treating a funding_z as a different metric inside a regime calc',
      'Redefining event instance semantics inside regime logic',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L8ForbiddenAction.STALE_REGIME_MASQUERADE,
    description:
      'L8 may not silently fall back to stale regime state without explicit classification',
    examples: [
      'Returning last-known regime without staleness or freshness declaration',
      'Marking a stale regime as current when the underlying L6/L7 inputs are stale',
    ],
    severity: 'HIGH',
  },
];

export function getL8ForbiddenActionDefinition(
  action: L8ForbiddenAction,
): L8ForbiddenActionDefinition {
  return L8_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllL8CriticalForbiddenActions(): readonly L8ForbiddenAction[] {
  return L8_FORBIDDEN_ACTION_DEFINITIONS.filter(d => d.severity === 'CRITICAL').map(d => d.action);
}
