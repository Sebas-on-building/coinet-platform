/**
 * L7.1 — Forbidden Actions Contract
 *
 * §7.1.6 — What Layer 7 may NEVER do. These must be codified and
 * test-covered, not left as prose.
 */

import { L7ForbiddenAction } from './l7-constitutional-types';

export interface ForbiddenActionDefinition {
  readonly action: L7ForbiddenAction;
  readonly description: string;
  readonly examples: readonly string[];
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const FORBIDDEN_ACTION_DEFINITIONS: readonly ForbiddenActionDefinition[] = [
  {
    action: L7ForbiddenAction.ILLEGAL_PRIMITIVE_REINTERPRETATION,
    description: 'L7 may consume L6 primitives but may not mutate their meaning',
    examples: [
      'Reinterpreting a funding_z_score as a different metric',
      'Redefining what an event instance represents',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.CONTRADICTION_LAUNDERING,
    description:
      'L7 may not average contradictions away, hide severe contradiction in ' +
      'mild confidence adjustments, or rewrite contradiction as positive support',
    examples: [
      'mean-of-contradictions',
      'silently reclassify contradiction as noise',
      'drop contradiction under preferred narrative',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.AMBIGUITY_SILENT_RESOLUTION,
    description: 'L7 may not silently resolve ambiguity via preferred narrative or price action',
    examples: [
      'tie-broken by recent price',
      'selective support weighting',
      'ignore missing confirmation',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.STALE_SUPPORT_MASQUERADE,
    description: 'L7 may not treat stale support as equivalent to fresh support',
    examples: [
      'omit staleness from validation class',
      'collapse stale into fresh confidence',
    ],
    severity: 'HIGH',
  },
  {
    action: L7ForbiddenAction.INCOMPLETENESS_NEGLECT,
    description: 'L7 may not silently ignore material incompleteness',
    examples: [
      'missing on-chain support is treated as confirmed',
      'missing funding evidence is hidden',
    ],
    severity: 'HIGH',
  },
  {
    action: L7ForbiddenAction.FINAL_SCENARIO_LEAK,
    description: 'L7 may not emit scenario finalization',
    examples: [
      'scenario_winner', 'most_likely_scenario', 'final_regime_class',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.FINAL_JUDGMENT_LEAK,
    description: 'L7 may not emit final judgment language',
    examples: [
      'judgment_override', 'final_bullish_truth', 'final_narrative',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.RECOMMENDATION_LANGUAGE_LEAK,
    description: 'L7 may not emit recommendation or actionability language',
    examples: [
      'buy_signal', 'sell_signal', 'trade_signal', 'action_signal',
      'buy_ready_validation', 'best_trade_confirmed',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.ILLEGAL_L5_BYPASS,
    description: 'L7 may not persist or read outside governed L5 paths',
    examples: [
      'Direct Postgres INSERT bypassing L5',
      'Shadow Redis store for validation state',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.LOWER_LAYER_CONFIDENCE_OVERRIDE,
    description: 'L7 may not overwrite L3 confidence law with shadow heuristics',
    examples: [
      'ignore L3 confidence score and invent own',
      'rewrite confidence field meaning',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.LOWER_LAYER_IDENTITY_REDEFINITION,
    description: 'L7 may not re-resolve identity established by L3',
    examples: ['creating entity IDs from provider keys', 'shadow identity maps'],
    severity: 'CRITICAL',
  },
  {
    action: L7ForbiddenAction.LOWER_LAYER_GRAPH_REDEFINITION,
    description: 'L7 may not invent graph semantics or rebuild propagation law',
    examples: ['ad hoc edges outside L4', 'local propagation weights'],
    severity: 'CRITICAL',
  },
];

export function getForbiddenActionDefinition(
  action: L7ForbiddenAction,
): ForbiddenActionDefinition {
  return FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllCriticalForbiddenActions(): readonly L7ForbiddenAction[] {
  return FORBIDDEN_ACTION_DEFINITIONS.filter(d => d.severity === 'CRITICAL').map(d => d.action);
}
