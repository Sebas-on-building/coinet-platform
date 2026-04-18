/**
 * L6.6 §6.6.4.8 — Security Feature Family
 *
 * Permissions, concentration, verification, malicious adjacency, known
 * rug-pattern similarity. Carries high-stakes implications; false
 * cleanliness must be strongly blocked.
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

export const SECURITY_FAMILY: L6FeatureFamilyDefinition = {
  family_id: L6FeatureFamilyId.SECURITY,
  description: 'Permissions, concentration, verification, malicious adjacency, rug-pattern similarity',
  allowed_scopes: [L6ScopeType.CONTRACT, L6ScopeType.PROJECT, L6ScopeType.ASSET],
  legal_input_surface_classes: [
    L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT,
    L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT,
    L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT,
    L6LegalInputSurfaceClass.ARCHIVED_REPLAY_EVIDENCE,
  ],
  baseline_classes_allowed: [
    L6BaselineMethod.ROLLING_MEAN,
    L6BaselineMethod.PERCENTILE_RANK,
  ],
  default_windows: [
    L6StandardWindowDuration.ONE_DAY, L6StandardWindowDuration.SEVEN_DAY,
    L6StandardWindowDuration.THIRTY_DAY,
  ],
  default_null_policy_range: [L6NullPolicy.REJECT_IF_MISSING, L6NullPolicy.BLOCKED_UNTIL_RECOVERED],
  default_warmup_multiplier: 3,
  linked_event_families: ['SECURITY_RISK_CHANGE'],
  output_kinds_allowed: [L6FeatureValueKind.NUMBER, L6FeatureValueKind.BOOLEAN, L6FeatureValueKind.ORDINAL],
  forbidden_semantic_shortcuts: ['SAFE_TOKEN_LABEL', 'SCAM_VERDICT', 'FALSE_CLEANLINESS'],
  dependency_template: {
    family_id: L6FeatureFamilyId.SECURITY,
    bindings: [
      { surface_id: 'l5.permission_surfaces', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.CONTRACT, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'permission and admin role facts' },
      { surface_id: 'l5.holder_distribution', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.ASSET, L6ScopeType.CONTRACT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'holder distribution surfaces' },
      { surface_id: 'l5.lock_unlock_surfaces', dependency_class: L6DependencyClass.HARD_TRUTH, required: true, scope_compatible: [L6ScopeType.CONTRACT, L6ScopeType.PROJECT], temporal_mode: L6TemporalMode.WINDOWED, replay_legal: true, rationale: 'lock and unlock surfaces' },
      { surface_id: 'l5.malicious_proximity', dependency_class: L6DependencyClass.BASELINE, required: true, scope_compatible: [L6ScopeType.CONTRACT, L6ScopeType.ASSET], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'malicious address proximity graph' },
      { surface_id: 'l5.historical_rug_patterns', dependency_class: L6DependencyClass.EVIDENCE_ONLY, required: false, scope_compatible: [L6ScopeType.CONTRACT], temporal_mode: L6TemporalMode.POINT_IN_TIME, replay_legal: true, rationale: 'historical rug pattern library for similarity' },
    ],
  },
  rollout_priority: L6FamilyRolloutPriority.P6_SECURITY,
  family_invariants: ['no_false_cleanliness', 'missingness_explicit', 'high_stakes_blocking', 'replay_safe'],
};

export const SECURITY_FIRST_FEATURES: readonly L6FirstProductionFeature[] = [
  { feature_id: 'security.mint_authority_risk', family_id: L6FeatureFamilyId.SECURITY, description: 'mint authority risk' },
  { feature_id: 'security.ownership_concentration', family_id: L6FeatureFamilyId.SECURITY, description: 'ownership concentration' },
  { feature_id: 'security.locker_confidence', family_id: L6FeatureFamilyId.SECURITY, description: 'locker confidence' },
  { feature_id: 'security.verification_confidence', family_id: L6FeatureFamilyId.SECURITY, description: 'verification confidence' },
  { feature_id: 'security.malicious_proximity', family_id: L6FeatureFamilyId.SECURITY, description: 'malicious address proximity' },
  { feature_id: 'security.centralization_risk', family_id: L6FeatureFamilyId.SECURITY, description: 'centralization risk' },
  { feature_id: 'security.rug_pattern_similarity', family_id: L6FeatureFamilyId.SECURITY, description: 'rug-pattern similarity' },
];
