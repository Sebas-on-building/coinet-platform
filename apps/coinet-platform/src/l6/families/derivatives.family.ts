/**
 * L6.6 §6.6.4.5 — Derivatives Feature Family
 *
 * Leverage, crowding, basis distortion, and liquidation pressure.
 * May NOT output final squeeze judgment.
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

export const DERIVATIVES_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.DERIVATIVES,
  description: 'Leverage, crowding, basis distortion, and liquidation pressure',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.MARKET],
  legal_input_surface_classes: [
    L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT,
    L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    L6LegalInputSurfaceClass.AUTHORITATIVE_CURRENT_STATE,
  ],
  baseline_classes_allowed: [
    L6BaselineMethod.Z_SCORE,
    L6BaselineMethod.VOLATILITY,
    L6BaselineMethod.PERCENTILE_RANK,
  ],
  default_windows: [
    L6StandardWindowDuration.ONE_HOUR, L6StandardWindowDuration.FOUR_HOUR,
    L6StandardWindowDuration.ONE_DAY, L6StandardWindowDuration.SEVEN_DAY,
    L6StandardWindowDuration.THIRTY_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.REJECT_IF_MISSING, L6NullPolicy.DEGRADE_EXPLICITLY],
  default_warmup_multiplier: 3,
  linked_event_families: ['FUNDING_SPIKE', 'LIQUIDATION_BURST'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.NUMBER_VECTOR, L6FeatureValueKind.COMPOSITE],
  forbidden_semantic_shortcuts: ['SQUEEZE_JUDGMENT', 'POSITION_RECOMMENDATION', 'LIQUIDATION_PREDICTION'],
  dependency_template: {
    family_id: L6FeatureFamilyId.DERIVATIVES,
    bindings: [
      { surface_id: 'l5.oi_history', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.MARKET], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'OI time series' },
      { surface_id: 'l5.funding_history', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.MARKET], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'funding rate history' },
      { surface_id: 'l5.basis_surfaces', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'basis and premium' },
      { surface_id: 'l5.liquidation_density', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'liquidation heatmap' },
      { surface_id: 'l6.market_features', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.ASSET], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'legally chained market features' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P2_DERIVATIVES,
  family_invariants: ['no_squeeze_judgment', 'replay_safe', 'crowding_explicit'],
};

export const DERIVATIVES_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'derivatives.oi_velocity', family_id: L6FeatureFamilyId.DERIVATIVES, description: 'OI velocity' },
  { feature_id: 'derivatives.funding_z_score', family_id: L6FeatureFamilyId.DERIVATIVES, description: 'funding z-score' },
  { feature_id: 'derivatives.oi_mcap_pressure', family_id: L6FeatureFamilyId.DERIVATIVES, description: 'OI/market-cap pressure' },
  { feature_id: 'derivatives.liquidation_density', family_id: L6FeatureFamilyId.DERIVATIVES, description: 'liquidation density near spot' },
  { feature_id: 'derivatives.basis_distortion', family_id: L6FeatureFamilyId.DERIVATIVES, description: 'basis distortion' },
  { feature_id: 'derivatives.crowding_index', family_id: L6FeatureFamilyId.DERIVATIVES, description: 'crowding index' },
  { feature_id: 'derivatives.squeeze_pressure', family_id: L6FeatureFamilyId.DERIVATIVES, description: 'squeeze pressure proxy' },
];
