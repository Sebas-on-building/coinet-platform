/**
 * L6.6 §6.6.4.4 — DEX Feature Family
 *
 * DEX pair structure, liquidity behavior, and pool consistency. Must obey
 * strong anti-rug and anti-noise gating.
 */

import { L6FeatureFamilyDefinition, L6FeatureFamilyId, L6FirstProductionFeature } from '../contracts/feature-family-definition';
import { L6ScopeType } from '../contracts/primitive-contract';
import { L6LegalInputSurfaceClass } from '../contracts/legal-input-surface';
import { L6BaselineMethod } from '../engine/baseline-engine';
import { L6StandardWindowDuration } from '../contracts/window-spec';
import { L6NullPolicy } from '../contracts/primitive-null-policy';
import { L6FeatureValueKind } from '../contracts/feature-contract';
import { L6FamilyRolloutPriority } from '../contracts/family-rollout-priority';
import { L6DependencyClass } from '../contracts/dependency-class';
import { L6TemporalMode } from '../contracts/temporal-surfaces';

export const DEX_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.DEX,
  description: 'DEX pair structure, liquidity behavior, and pool consistency',
  allowed_scopes: [L6ScopeType.PAIR, L6ScopeType.CONTRACT],
  legal_input_surface_classes: [
    L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT,
    L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT,
  ],
  baseline_classes_allowed: [
    L6BaselineMethod.ROLLING_MEAN,
    L6BaselineMethod.PERCENTILE_RANK,
    L6BaselineMethod.ROLLING_MEDIAN,
  ],
  default_windows: [
    L6StandardWindowDuration.FIVE_MIN, L6StandardWindowDuration.ONE_HOUR,
    L6StandardWindowDuration.ONE_DAY, L6StandardWindowDuration.SEVEN_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.REJECT_IF_MISSING, L6NullPolicy.DEGRADE_EXPLICITLY, L6NullPolicy.BLOCKED_UNTIL_RECOVERED],
  default_warmup_multiplier: 3,
  linked_event_families: ['NEW_PAIR_CREATED'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.BOOLEAN, L6FeatureValueKind.ORDINAL],
  forbidden_semantic_shortcuts: ['RUG_LABEL', 'SAFE_PAIR_LABEL', 'TRADE_RECOMMENDATION'],
  dependency_template: {
    family_id: L6FeatureFamilyId.DEX,
    bindings: [
      { surface_id: 'l5.pair_creation', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.PAIR], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'pair activation facts' },
      { surface_id: 'l5.pool_reserves', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.PAIR, L6ScopeType.CONTRACT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'pool reserve history' },
      { surface_id: 'l5.swap_flows', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.PAIR], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'swap flow data' },
      { surface_id: 'l4.dex_context', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.PAIR, L6ScopeType.CONTRACT], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'DEX context packages' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P3_DEX,
  family_invariants: ['anti_rug_gating', 'anti_noise_gating', 'replay_safe'],
};

export const DEX_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'dex.pair_age', family_id: L6FeatureFamilyId.DEX, description: 'pair age' },
  { feature_id: 'dex.liquidity_depth', family_id: L6FeatureFamilyId.DEX, description: 'liquidity depth' },
  { feature_id: 'dex.liquidity_growth_slope', family_id: L6FeatureFamilyId.DEX, description: 'liquidity growth slope' },
  { feature_id: 'dex.buy_sell_imbalance', family_id: L6FeatureFamilyId.DEX, description: 'buy/sell imbalance' },
  { feature_id: 'dex.pool_fragmentation', family_id: L6FeatureFamilyId.DEX, description: 'pool fragmentation' },
  { feature_id: 'dex.multi_pool_consistency', family_id: L6FeatureFamilyId.DEX, description: 'multi-pool consistency' },
  { feature_id: 'dex.ignition_score', family_id: L6FeatureFamilyId.DEX, description: 'ignition score for fresh pairs' },
];
