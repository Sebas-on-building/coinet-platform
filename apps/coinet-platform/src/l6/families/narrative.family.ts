/**
 * L6.6 §6.6.4.9 — Narrative Feature Family
 *
 * Attention, breadth, skew, and divergence between narrative and other
 * governed state surfaces. May represent narrative state and narrative
 * contradiction; may NOT act as final market truth.
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

export const NARRATIVE_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.NARRATIVE,
  description: 'Attention, breadth, skew, and divergence between narrative and governed state',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.NARRATIVE, L6ScopeType.PROJECT],
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
    L6StandardWindowDuration.ONE_HOUR, L6StandardWindowDuration.FOUR_HOUR,
    L6StandardWindowDuration.ONE_DAY, L6StandardWindowDuration.SEVEN_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.DEGRADE_EXPLICITLY, L6NullPolicy.PROVISIONAL_IF_PARTIAL],
  default_warmup_multiplier: 3,
  linked_event_families: ['SUDDEN_NARRATIVE_BREAKOUT'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.DIVERGENCE_PAIR, L6FeatureValueKind.ORDINAL],
  forbidden_semantic_shortcuts: ['MARKET_TRUTH_FROM_NARRATIVE', 'SENTIMENT_AS_PRICE_SIGNAL', 'NARRATIVE_AUTHORITY'],
  dependency_template: {
    family_id: L6FeatureFamilyId.NARRATIVE,
    bindings: [
      { surface_id: 'l5.social_mention_series', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.NARRATIVE], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'governed social mention series' },
      { surface_id: 'l5.news_article_series', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.NARRATIVE], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'news/article series' },
      { surface_id: 'l4.narrative_context', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.NARRATIVE, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'narrative graph context' },
      { surface_id: 'l6.market_features', dependency_class: L6DependencyClass.OPTIONAL_CONTEXT, required: false, scope_compatible: [L6ScopeType.ASSET], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'market comparison for divergence' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P7_NARRATIVE,
  family_invariants: ['narrative_not_market_truth', 'replay_safe', 'divergence_explicit'],
};

export const NARRATIVE_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'narrative.social_acceleration', family_id: L6FeatureFamilyId.NARRATIVE, description: 'social acceleration' },
  { feature_id: 'narrative.news_intensity', family_id: L6FeatureFamilyId.NARRATIVE, description: 'news intensity' },
  { feature_id: 'narrative.breadth', family_id: L6FeatureFamilyId.NARRATIVE, description: 'narrative breadth' },
  { feature_id: 'narrative.sentiment_skew', family_id: L6FeatureFamilyId.NARRATIVE, description: 'sentiment skew' },
  { feature_id: 'narrative.sentiment_fundamentals_divergence', family_id: L6FeatureFamilyId.NARRATIVE, description: 'sentiment/fundamentals divergence' },
  { feature_id: 'narrative.price_divergence', family_id: L6FeatureFamilyId.NARRATIVE, description: 'narrative/price divergence' },
];
