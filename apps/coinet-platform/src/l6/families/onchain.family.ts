/**
 * L6.6 §6.6.4.7 — On-Chain Feature Family
 *
 * Wallet behavior, exchange flows, treasury anomalies, contract activity.
 * Must NEVER convert weak wallet labeling into clean truth without
 * confidence-aware dependency law.
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

export const ONCHAIN_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.ONCHAIN,
  description: 'Wallet behavior, exchange flows, treasury anomalies, contract activity',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.PROJECT, L6ScopeType.CONTRACT],
  legal_input_surface_classes: [
    L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT,
    L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT,
  ],
  baseline_classes_allowed: [
    L6BaselineMethod.ROLLING_MEAN,
    L6BaselineMethod.ROLLING_MEDIAN,
    L6BaselineMethod.PERCENTILE_RANK,
  ],
  default_windows: [
    L6StandardWindowDuration.ONE_HOUR, L6StandardWindowDuration.ONE_DAY,
    L6StandardWindowDuration.SEVEN_DAY, L6StandardWindowDuration.THIRTY_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.DEGRADE_EXPLICITLY, L6NullPolicy.PROVISIONAL_IF_PARTIAL],
  default_warmup_multiplier: 3,
  linked_event_families: ['WHALE_ACCUMULATION_CLUSTER', 'TREASURY_TRANSFER_TO_EXCHANGE'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.BOOLEAN, L6FeatureValueKind.ORDINAL],
  forbidden_semantic_shortcuts: ['WHALE_VERDICT', 'INSIDER_JUDGMENT', 'CLEAN_WALLET_TRUTH_FROM_WEAK_LABEL'],
  dependency_template: {
    family_id: L6FeatureFamilyId.ONCHAIN,
    bindings: [
      { surface_id: 'l5.labeled_wallet_flows', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'labeled wallet flows' },
      { surface_id: 'l5.exchange_cluster_flows', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'exchange cluster flows' },
      { surface_id: 'l5.treasury_transfers', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'treasury transfer history' },
      { surface_id: 'l4.entity_context', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'entity resolution context' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P5_ONCHAIN,
  family_invariants: ['confidence_aware_labeling', 'no_weak_wallet_as_clean_truth', 'replay_safe'],
};

export const ONCHAIN_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'onchain.whale_accumulation', family_id: L6FeatureFamilyId.ONCHAIN, description: 'whale accumulation score' },
  { feature_id: 'onchain.exchange_inflow_danger', family_id: L6FeatureFamilyId.ONCHAIN, description: 'exchange inflow danger' },
  { feature_id: 'onchain.exchange_outflow_conviction', family_id: L6FeatureFamilyId.ONCHAIN, description: 'exchange outflow conviction' },
  { feature_id: 'onchain.treasury_anomaly', family_id: L6FeatureFamilyId.ONCHAIN, description: 'treasury anomaly score' },
  { feature_id: 'onchain.smart_wallet_clustering', family_id: L6FeatureFamilyId.ONCHAIN, description: 'smart-wallet clustering' },
  { feature_id: 'onchain.fresh_wallet_participation', family_id: L6FeatureFamilyId.ONCHAIN, description: 'fresh-wallet participation' },
  { feature_id: 'onchain.contract_interaction_spikes', family_id: L6FeatureFamilyId.ONCHAIN, description: 'contract interaction spikes' },
  { feature_id: 'onchain.liquidity_add_remove_pressure', family_id: L6FeatureFamilyId.ONCHAIN, description: 'liquidity add/remove pressure' },
];
