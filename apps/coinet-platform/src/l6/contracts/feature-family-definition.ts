/**
 * L6.6 — Feature Family Definition Contract
 *
 * §6.6.4 — Every production feature family must define its allowed scopes,
 * legal input surfaces, baseline classes, windows, null policy, warmup,
 * event linkage, output kinds, and forbidden shortcuts.
 */

import { L6ScopeType } from './primitive-contract';
import { L6LegalInputSurfaceClass } from './legal-input-surface';
import { L6FeatureValueKind } from './feature-contract';
import { L6NullPolicy } from './primitive-null-policy';
import { L6BaselineMethod } from '../engine/baseline-engine';
import { L6StandardWindowDuration } from './window-spec';
import { L6DependencyTemplate } from './dependency-class';
import { L6FamilyRolloutPriority } from './family-rollout-priority';

export enum L6FeatureFamilyId {
  MARKET = 'MARKET',
  DEX = 'DEX',
  DERIVATIVES = 'DERIVATIVES',
  PROTOCOL = 'PROTOCOL',
  ONCHAIN = 'ONCHAIN',
  SECURITY = 'SECURITY',
  NARRATIVE = 'NARRATIVE',
  ENTITY = 'ENTITY',
}

export const ALL_FEATURE_FAMILY_IDS: readonly L6FeatureFamilyId[] = Object.values(L6FeatureFamilyId);

export interface L6FeatureFamilyDefinition {
  readonly family_id: L6FeatureFamilyId;
  readonly description: string;
  readonly allowed_scopes: readonly L6ScopeType[];
  readonly legal_input_surface_classes: readonly L6LegalInputSurfaceClass[];
  readonly baseline_classes_allowed: readonly L6BaselineMethod[];
  readonly default_windows: readonly L6StandardWindowDuration[];
  readonly default_null_policy_range: readonly L6NullPolicy[];
  readonly default_warmup_multiplier: number;
  readonly linked_event_families: readonly string[];
  readonly output_kinds_allowed: readonly L6FeatureValueKind[];
  readonly forbidden_semantic_shortcuts: readonly string[];
  readonly dependency_template: L6DependencyTemplate;
  readonly rollout_priority: L6FamilyRolloutPriority;
  readonly family_invariants: readonly string[];
}

export const REQUIRED_FEATURE_FAMILY_FIELDS: readonly (keyof L6FeatureFamilyDefinition)[] = [
  'family_id', 'description', 'allowed_scopes', 'legal_input_surface_classes',
  'baseline_classes_allowed', 'default_windows', 'default_null_policy_range',
  'default_warmup_multiplier', 'linked_event_families', 'output_kinds_allowed',
  'forbidden_semantic_shortcuts', 'dependency_template', 'rollout_priority',
  'family_invariants',
];

export interface L6FirstProductionFeature {
  readonly feature_id: string;
  readonly family_id: L6FeatureFamilyId;
  readonly description: string;
}
