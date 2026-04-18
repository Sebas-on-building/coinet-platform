/**
 * L6.6 §6.6.4.6 — Protocol Feature Family
 *
 * Business-quality, flow persistence, chain concentration, and valuation
 * mismatch. Must distinguish business substance from token market motion.
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

export const PROTOCOL_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.PROTOCOL,
  description: 'Business-quality, flow persistence, chain concentration, valuation mismatch',
  allowed_scopes: [L6ScopeType.PROJECT, L6ScopeType.ASSET],
  legal_input_surface_classes: [
    L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT,
    L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT,
  ],
  baseline_classes_allowed: [
    L6BaselineMethod.ROLLING_MEAN,
    L6BaselineMethod.ROLLING_MEDIAN,
    L6BaselineMethod.PERCENTILE_RANK,
    L6BaselineMethod.PEER_RELATIVE,
  ],
  default_windows: [
    L6StandardWindowDuration.ONE_DAY, L6StandardWindowDuration.SEVEN_DAY,
    L6StandardWindowDuration.THIRTY_DAY, L6StandardWindowDuration.NINETY_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.DEGRADE_EXPLICITLY, L6NullPolicy.PROVISIONAL_IF_PARTIAL],
  default_warmup_multiplier: 3,
  linked_event_families: ['TREASURY_TRANSFER_TO_EXCHANGE'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.COMPOSITE, L6FeatureValueKind.DIVERGENCE_PAIR],
  forbidden_semantic_shortcuts: ['INVEST_SCORE', 'TOKEN_QUALITY_LABEL', 'FLATTEN_BUSINESS_AND_TOKEN'],
  dependency_template: {
    family_id: L6FeatureFamilyId.PROTOCOL,
    bindings: [
      { surface_id: 'l5.tvl_history', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'TVL history' },
      { surface_id: 'l5.fee_revenue_history', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'fee/revenue history' },
      { surface_id: 'l5.net_flow_history', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'net flows' },
      { surface_id: 'l4.protocol_context', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'protocol graph context' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P4_PROTOCOL,
  family_invariants: ['business_token_separation', 'peer_relative_declared', 'replay_safe'],
};

export const PROTOCOL_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'protocol.tvl_growth_adj', family_id: L6FeatureFamilyId.PROTOCOL, description: 'TVL growth adjusted for price' },
  { feature_id: 'protocol.net_inflow_persistence', family_id: L6FeatureFamilyId.PROTOCOL, description: 'net inflow persistence' },
  { feature_id: 'protocol.fee_trend', family_id: L6FeatureFamilyId.PROTOCOL, description: 'fee trend' },
  { feature_id: 'protocol.revenue_quality', family_id: L6FeatureFamilyId.PROTOCOL, description: 'revenue quality' },
  { feature_id: 'protocol.holders_capture_ratio', family_id: L6FeatureFamilyId.PROTOCOL, description: 'holders-capture ratio' },
  { feature_id: 'protocol.treasury_runway', family_id: L6FeatureFamilyId.PROTOCOL, description: 'treasury runway proxy' },
  { feature_id: 'protocol.chain_diversification', family_id: L6FeatureFamilyId.PROTOCOL, description: 'chain diversification' },
  { feature_id: 'protocol.valuation_biz_mismatch', family_id: L6FeatureFamilyId.PROTOCOL, description: 'valuation vs business-quality mismatch' },
];
