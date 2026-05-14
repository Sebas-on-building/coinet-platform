/**
 * L12.1 — Forbidden Actions Contract
 *
 * §12.1.7 — What Layer 12 may NEVER do. Codified and test-covered.
 */

import { L12ForbiddenAction } from './l12-constitutional-types';

export interface L12ForbiddenActionDefinition {
  readonly action: L12ForbiddenAction;
  readonly description: string;
  readonly examples: readonly string[];
  readonly severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export const L12_FORBIDDEN_ACTION_DEFINITIONS:
  readonly L12ForbiddenActionDefinition[] = [
  {
    action: L12ForbiddenAction.PREDICTION_THEATER,
    description:
      'L12 may not pose conditional scenarios as predictions of the future.',
    examples: [
      'btc_will_continue_higher',
      'definitely_going_lower',
      'forecast_signal',
      'prediction_path',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.CERTAINTY_CLAIM,
    description: 'L12 may not claim that any path is certain or guaranteed.',
    examples: [
      'guaranteed_path',
      'certain_continuation',
      'inevitable_path',
      'cannot_fail_path',
      'no_failure_path',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.FINAL_JUDGMENT_EMISSION,
    description: 'L12 may not emit final judgment, scenario winner, or chosen path.',
    examples: ['final_judgment', 'scenario_winner', 'final_scenario', 'winning_path'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.RECOMMENDATION_EMISSION,
    description:
      'L12 may not emit recommendation language: buy/sell/hold/avoid/long/short/enter/exit.',
    examples: [
      'buy_signal',
      'sell_signal',
      'avoid_signal',
      'should_buy',
      'should_sell',
      'recommended_buy',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.TRADE_ACTION_EMISSION,
    description: 'L12 may not emit trade-action outputs.',
    examples: [
      'trade_action',
      'portfolio_allocation',
      'entry_ready',
      'trade_ready',
      'guaranteed_setup',
      'safest_trade',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.SCENARIO_AS_GUARANTEE,
    description: 'L12 may not present a scenario as a guarantee of an outcome.',
    examples: ['scenario_as_guarantee', 'guaranteed_scenario', 'safe_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.SINGLE_PATH_FAKE_CERTAINTY,
    description:
      'L12 may not emit a single path while hiding alternative paths or scenario spread.',
    examples: ['only_path', 'single_path_certainty', 'sole_outcome'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.INVALIDATION_OMISSION,
    description: 'A scenario without an invalidation profile is illegal.',
    examples: ['scenario_no_invalidation', 'path_without_invalidation'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.TRIGGER_OMISSION,
    description: 'A scenario without trigger conditions is illegal.',
    examples: ['scenario_no_trigger', 'path_without_trigger'],
    severity: 'HIGH',
  },
  {
    action: L12ForbiddenAction.CONDITION_OMISSION,
    description: 'A scenario without explicit conditions is illegal.',
    examples: ['scenario_no_condition', 'unconditional_scenario'],
    severity: 'HIGH',
  },
  {
    action: L12ForbiddenAction.LOWER_LAYER_TRUTH_REDEFINITION,
    description: 'L12 may not redefine identity, metrics, or any frozen lower-layer truth.',
    examples: [
      'redefine_identity',
      'redefine_metric',
      'override_validation',
      'override_regime',
      'override_sequence',
      'override_hypothesis',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.VALIDATION_REBUILD,
    description: 'L12 may not rebuild L7 validation. It must consume L7 stable handoff.',
    examples: ['rebuild_validation', 'recompute_validation', 're_validate_in_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.REGIME_REBUILD,
    description: 'L12 may not rebuild L8 regime. It must consume L8 as law.',
    examples: ['rebuild_regime', 'reclassify_regime_in_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.SEQUENCE_REBUILD,
    description: 'L12 may not rebuild L9 sequence. It must consume L9 as law.',
    examples: ['rebuild_sequence', 'reorder_events_in_scenario', 'recompute_lead_lag_in_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.HYPOTHESIS_REBUILD,
    description: 'L12 may not rebuild L10 hypotheses or rerank them.',
    examples: ['rebuild_hypothesis', 'rebuild_hypotheses', 'rerank_hypotheses_in_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.SCORE_REBUILD,
    description: 'L12 may not recompute or rebuild any L11 deterministic score.',
    examples: ['rebuild_score', 'recompute_score', 'derive_new_score_in_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L11_SCORE_VALUE_ONLY_CONSUMPTION,
    description:
      'L12 may not consume an L11 score as a naked value; the full score-context bundle is required.',
    examples: [
      'naked_score_consumption',
      'score_value_only',
      'score_no_attribution',
      'score_no_drift',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L7_RESTRICTION_BYPASS,
    description: 'L12 may not widen the rights of an L7 surface beyond its restriction profile.',
    examples: ['bypass_l7_restriction', 'widen_l7_rights_in_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L8_REGIME_POSTURE_IGNORE,
    description: 'L12 may not ignore L8 regime posture or transition risk.',
    examples: ['ignore_regime_posture', 'ignore_transition_risk', 'use_stale_regime'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L9_SEQUENCE_POSTURE_IGNORE,
    description: 'L12 may not ignore L9 sequence posture, decay, or phase.',
    examples: ['ignore_sequence_posture', 'ignore_decay_posture', 'late_signal_as_early_proof'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L10_HYPOTHESIS_POSTURE_IGNORE,
    description: 'L12 may not ignore L10 hypothesis spread, confirmation, or invalidation posture.',
    examples: [
      'ignore_hypothesis_spread',
      'ignore_confirmation_posture',
      'ignore_invalidation_posture',
    ],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L11_SCORE_RESTRICTION_IGNORE,
    description: 'L12 may not ignore the L11 score restriction profile.',
    examples: ['ignore_score_restriction', 'ignore_score_calibration_only_flag'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.CONTRADICTION_DOWNGRADE,
    description: 'L12 may not downgrade or hide L7 contradictions inside a clean scenario.',
    examples: ['downgrade_contradiction', 'hide_contradiction_in_scenario'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.ACTIVE_INVALIDATION_HIDE,
    description: 'L12 may not hide an active invalidation from L10 inside a scenario.',
    examples: ['hide_active_invalidation', 'mask_invalidation_posture'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.MISSING_VISIBILITY_HIDE,
    description: 'L12 may not hide missing-visibility from L11 score-context bundles.',
    examples: ['hide_missing_visibility', 'mask_missing_data_profile'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.DRIFT_STATUS_HIDE,
    description: 'L12 may not hide L11 drift status when emitting scenarios.',
    examples: ['hide_drift_status', 'mask_drift_report'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.PATH_CONFIDENCE_LAUNDERING,
    description:
      'L12 may not present path confidence higher than what missingness/contradiction/drift permit.',
    examples: ['launder_path_confidence', 'inflate_path_confidence'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.SCENARIO_SPREAD_HIDE,
    description: 'L12 may not hide narrow scenario spread or close alternative paths.',
    examples: ['hide_scenario_spread', 'hide_alternative_path'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.RAW_STORAGE_BYPASS,
    description: 'L12 may not write directly to raw storage; only L5-routed writes are legal.',
    examples: ['raw_postgres_insert', 'raw_clickhouse_write', 'shadow_redis_store'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L5_PERSISTENCE_BYPASS,
    description: 'L12 may not persist scenarios outside governed L5 routes.',
    examples: ['bypass_l5', 'direct_postgres_write', 'shadow_object_store'],
    severity: 'CRITICAL',
  },
  {
    action: L12ForbiddenAction.L13_PLUS_CONSUMPTION,
    description: 'L12 may not consume later-layer (L13+) judgment, delivery, or feedback surfaces.',
    examples: ['consume_l13_surface', 'consume_judgment_from_l13', 'consume_recommendation_from_l14'],
    severity: 'CRITICAL',
  },
];

export function getL12ForbiddenActionDefinition(
  action: L12ForbiddenAction,
): L12ForbiddenActionDefinition {
  return L12_FORBIDDEN_ACTION_DEFINITIONS.find(d => d.action === action)!;
}

export function getAllL12CriticalForbiddenActions():
  readonly L12ForbiddenAction[] {
  return L12_FORBIDDEN_ACTION_DEFINITIONS
    .filter(d => d.severity === 'CRITICAL')
    .map(d => d.action);
}
