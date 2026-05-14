/**
 * L11.1 — Forbidden Actions Contract
 *
 * §11.1.5 / §11.1.8 — What Layer 11 may NEVER do. Codified and
 * test-covered.
 */

import { L11ForbiddenAction } from './l11-constitutional-types';

export interface L11ForbiddenActionDefinition {
  readonly action: L11ForbiddenAction;
  readonly description: string;
  readonly examples: readonly string[];
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const L11_FORBIDDEN_ACTION_DEFINITIONS:
  readonly L11ForbiddenActionDefinition[] = [
  {
    action: L11ForbiddenAction.FINAL_JUDGMENT_EMISSION,
    description:
      'L11 may not emit final judgment. A score may support later judgment but may not be judgment.',
    examples: [
      'final_judgment_score',
      'judgment_override_score',
      'high_score_means_buy',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.RECOMMENDATION_EMISSION,
    description:
      'L11 may not emit recommendation language: buy/sell/avoid/long/short/enter/exit',
    examples: [
      'buy_signal',
      'sell_signal',
      'avoid_signal',
      'trade_signal',
      'final_recommendation',
      'clear_buy_score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.SCENARIO_WINNER_EMISSION,
    description:
      'L11 may not select a scenario winner. Scenario weighting is supported, scenario selection is not.',
    examples: ['scenario_winner', 'final_scenario', 'winning_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.TRADE_ACTION_EMISSION,
    description: 'L11 may not emit trade action outputs',
    examples: [
      'trade_action_score',
      'portfolio_allocation_score',
      'entry_ready_score',
      'trade_ready_score',
      'guaranteed_setup',
      'safest_trade',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.VIBE_SCORE_CREATION,
    description:
      'L11 may not create scores without explicit declared meaning. A vibe score is illegal.',
    examples: [
      'vibe_score',
      'general_quality_score',
      'opportunity_feeling_score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.UNATTRIBUTED_SCORE_EMISSION,
    description: 'L11 may not emit a score without attribution surfaces',
    examples: [
      'unattributed_score',
      'score_no_attribution',
      'opaque_score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.UNVERSIONED_SCORE_EMISSION,
    description: 'L11 may not emit a score without a declared formula version',
    examples: [
      'unversioned_score',
      'score_no_version',
      'untracked_score_formula',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.MEANING_CLAIM_ABSENT,
    description: 'L11 may not emit a score without a meaning claim',
    examples: [
      'no_meaning_claim',
      'missing_meaning_claim',
      'score_without_meaning',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.DIRECTION_UNDECLARED,
    description: 'L11 may not emit a score without a declared direction',
    examples: [
      'direction_undeclared_score',
      'score_no_direction',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.DIRECTION_MIXING,
    description:
      'L11 may not emit a score whose direction semantics are mixed (half higher=better and half higher=worse)',
    examples: [
      'mixed_direction_score',
      'direction_mixed_score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.MISSING_DATA_LAUNDERING,
    description:
      'L11 may not silently treat missing data as neutral score truth. Missing data must be disclosed via posture.',
    examples: [
      'launder_missing_data',
      'neutralize_missing_inputs',
      'hide_missing_data_in_score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.CONTRADICTION_LAUNDERING,
    description:
      'L11 may not hide active L7 contradictions inside a clean score. Contradiction must be disclosed.',
    examples: [
      'launder_contradiction',
      'hide_contradiction_in_score',
      'pretend_no_contradiction',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.LOWER_LAYER_REBUILD,
    description:
      'L11 may not rebuild lower-layer truth (L3–L10) live. It must consume frozen surfaces only.',
    examples: [
      'rebuild_l6_primitives_in_score',
      'rebuild_l7_validation_in_score',
      'rebuild_l8_regime_in_score',
      'rebuild_l9_sequence_in_score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.L10_HYPOTHESIS_REBUILD,
    description:
      'L11 may not rebuild hypotheses live from L6–L9 inside score logic. L10 surfaces must be consumed as stable handoff.',
    examples: [
      'rebuild_hypothesis_inside_score',
      'rebuild_hypotheses_inside_score',
      'derive_primary_hypothesis_inside_score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.REGIME_OVERRIDE,
    description:
      'L11 may not override or reclassify L8 regime. It must consume L8 as law.',
    examples: [
      'override_regime_in_score',
      'reinterpret_regime_in_score',
      'override_regime',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.SEQUENCE_OVERRIDE,
    description:
      'L11 may not override or reinterpret L9 sequence. It must consume L9 as law.',
    examples: [
      'override_sequence_in_score',
      'reinterpret_sequence_in_score',
      'override_sequence',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.L7_LIVE_REVALIDATION,
    description:
      'L11 may not re-run L7 validation live from L6 to bypass restrictions',
    examples: [
      're-validate claim live from l6',
      'bypass l7 inside score formula',
      'recompute validation inside score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.PERSISTENCE_BYPASS,
    description:
      'L11 may not persist or read score outputs outside governed L5 paths',
    examples: [
      'direct postgres write for score',
      'shadow redis store for score',
      'bypass_l5 for score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.LATE_LAYER_CONSUMPTION,
    description:
      'L11 may not consume later-layer (L12+) surfaces such as scenario winners or final judgments',
    examples: [
      'consume scenario from l12',
      'consume judgment from l13',
      'consume recommendation from l14',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.RESTRICTION_BYPASS,
    description:
      'L11 may not widen the downstream rights of L7/L8/L9/L10 outputs beyond their declared restriction profile',
    examples: [
      'widen restriction inside score',
      'use restricted L9 sequence as if unrestricted in score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.RESTRICTION_POSTURE_IGNORED,
    description:
      'L11 may not ignore the restriction profile attached to an L7, L8, L9, or L10 output',
    examples: [
      'ignore restriction posture in score',
      'consume L7 output without restriction posture',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.CALIBRATION_HOOK_ABSENT,
    description:
      'Production-grade scores must be capable of carrying a calibration hook',
    examples: ['calibration_hook_absent', 'no_calibration_hook'],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.IDENTITY_REDEFINITION,
    description: 'L11 may not re-resolve identity established by L3',
    examples: ['re-resolve identity for asset', 'shadow identity map for score'],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.METRIC_REDEFINITION,
    description: 'L11 may not redefine L3 metric meaning',
    examples: ['redefine metric in score', 'invent new metric meaning in score'],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.GRAPH_REDEFINITION,
    description: 'L11 may not invent L4 graph semantics or rebuild propagation law',
    examples: ['invent graph edge in score', 'override propagation in score'],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.PRIMITIVE_REDEFINITION,
    description: 'L11 may not redefine L6 primitive meaning or null/freshness law',
    examples: [
      'redefine feature semantics in score',
      'reinterpret event meaning in score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.HYPOTHESIS_POSTURE_IGNORED,
    description:
      'L11 may not ignore L10 hypothesis spread, reliance, confirmation, or invalidation posture',
    examples: [
      'ignore hypothesis spread in score',
      'ignore hypothesis reliance in score',
      'ignore invalidation posture in score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.HYPOTHESIS_SPREAD_IGNORED,
    description:
      'L11 may not hide a narrow primary/secondary hypothesis spread inside a clean score',
    examples: [
      'hide hypothesis spread in score',
      'pretend wide spread when narrow in score',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L11ForbiddenAction.SCORE_AS_ACTION,
    description:
      'L11 may not let a score result be interpreted as a trade action. A score supports later judgment; it is never the action.',
    examples: [
      'score_as_action',
      'high_opportunity_means_buy',
      'low_risk_means_safe',
    ],
    severity: 'CRITICAL',
  },
];

export function getL11ForbiddenActionDefinition(
  action: L11ForbiddenAction,
): L11ForbiddenActionDefinition {
  return L11_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllL11CriticalForbiddenActions():
  readonly L11ForbiddenAction[] {
  return L11_FORBIDDEN_ACTION_DEFINITIONS
    .filter(d => d.severity === 'CRITICAL')
    .map(d => d.action);
}
