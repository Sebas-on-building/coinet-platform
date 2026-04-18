/**
 * L6.6 §6.6.4.3 — Market Feature Family
 *
 * Market state, motion, and distribution. May describe motion and stress;
 * may NOT emit direct "trade" semantics.
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

export const MARKET_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.MARKET,
  description: 'Market state, motion, and distribution features',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.PAIR, L6ScopeType.MARKET],
  legal_input_surface_classes: [
    L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT,
    L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    L6LegalInputSurfaceClass.AUTHORITATIVE_CURRENT_STATE,
  ],
  baseline_classes_allowed: [
    L6BaselineMethod.ROLLING_MEAN,
    L6BaselineMethod.Z_SCORE,
    L6BaselineMethod.PERCENTILE_RANK,
    L6BaselineMethod.EXPECTED_RANGE,
  ],
  default_windows: [
    L6StandardWindowDuration.FIVE_MIN, L6StandardWindowDuration.FIFTEEN_MIN,
    L6StandardWindowDuration.ONE_HOUR, L6StandardWindowDuration.FOUR_HOUR,
    L6StandardWindowDuration.ONE_DAY, L6StandardWindowDuration.SEVEN_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.REJECT_IF_MISSING, L6NullPolicy.DEGRADE_EXPLICITLY],
  default_warmup_multiplier: 3,
  linked_event_families: ['FUNDING_SPIKE', 'LIQUIDATION_BURST'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.NUMBER_VECTOR, L6FeatureValueKind.BOOLEAN],
  forbidden_semantic_shortcuts: ['TRADE_SIGNAL', 'BUY_SELL_RECOMMENDATION', 'POSITION_SIZING'],
  dependency_template: {
    family_id: L6FeatureFamilyId.MARKET,
    bindings: [
      { surface_id: 'l5.price_series', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.PAIR], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'canonical price history' },
      { surface_id: 'l5.ohlcv', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.PAIR, L6ScopeType.MARKET], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'OHLCV bars' },
      { surface_id: 'l4.market_context', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.ASSET], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'optional market graph context' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P1_MARKET,
  family_invariants: ['no_trade_semantics', 'replay_safe', 'scope_must_be_canonical'],
};

export const MARKET_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'market.momentum', family_id: L6FeatureFamilyId.MARKET, description: 'momentum across multiple horizons' },
  { feature_id: 'market.volatility_expansion', family_id: L6FeatureFamilyId.MARKET, description: 'volatility expansion/compression' },
  { feature_id: 'market.volume_acceleration', family_id: L6FeatureFamilyId.MARKET, description: 'volume acceleration' },
  { feature_id: 'market.fdv_liquidity_ratio', family_id: L6FeatureFamilyId.MARKET, description: 'FDV/liquidity ratio' },
  { feature_id: 'market.price_location', family_id: L6FeatureFamilyId.MARKET, description: 'price-location vs historical bands' },
  { feature_id: 'market.cross_source_dislocation', family_id: L6FeatureFamilyId.MARKET, description: 'cross-source price dislocation' },
];
