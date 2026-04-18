/**
 * L6.6 §6.6.4.10 — Entity Feature Family
 *
 * Actor-quality, institutional relevance, exchange adjacency, insider
 * concentration. Particularly strict about resolved entity provenance.
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

export const ENTITY_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.ENTITY,
  description: 'Actor-quality, institutional relevance, exchange adjacency, insider concentration',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.PROJECT],
  legal_input_surface_classes: [
    L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT,
    L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT,
  ],
  baseline_classes_allowed: [
    L6BaselineMethod.ROLLING_MEAN,
    L6BaselineMethod.PERCENTILE_RANK,
    L6BaselineMethod.PEER_RELATIVE,
  ],
  default_windows: [
    L6StandardWindowDuration.ONE_DAY, L6StandardWindowDuration.SEVEN_DAY,
    L6StandardWindowDuration.THIRTY_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.DEGRADE_EXPLICITLY, L6NullPolicy.BLOCKED_UNTIL_RECOVERED],
  default_warmup_multiplier: 3,
  linked_event_families: ['WHALE_ACCUMULATION_CLUSTER'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.ORDINAL],
  forbidden_semantic_shortcuts: ['INSIDER_VERDICT', 'WEAK_ATTRIBUTION_AS_FACT', 'ENTITY_TRUTH_FROM_HEURISTIC'],
  dependency_template: {
    family_id: L6FeatureFamilyId.ENTITY,
    bindings: [
      { surface_id: 'l5.smart_wallet_cohorts', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'smart-wallet cohort surfaces' },
      { surface_id: 'l5.institutional_relevance', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'institutional relevance surfaces' },
      { surface_id: 'l4.entity_context', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'entity resolution graph context' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P8_ENTITY,
  family_invariants: ['strict_entity_provenance', 'no_weak_attribution', 'peer_relative_declared', 'replay_safe'],
};

export const ENTITY_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'entity.smart_money_quality', family_id: L6FeatureFamilyId.ENTITY, description: 'smart money quality' },
  { feature_id: 'entity.institutional_relevance', family_id: L6FeatureFamilyId.ENTITY, description: 'institutional relevance' },
  { feature_id: 'entity.exchange_proximity', family_id: L6FeatureFamilyId.ENTITY, description: 'exchange proximity' },
  { feature_id: 'entity.insider_concentration', family_id: L6FeatureFamilyId.ENTITY, description: 'insider concentration' },
];
