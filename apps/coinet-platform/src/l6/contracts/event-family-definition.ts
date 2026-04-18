/**
 * L6.6 — Event Family Definition Contract
 *
 * §6.6.5 — Every production event family must declare its trigger surface
 * linkage, confirmation logic, suppression/dedupe policy, evidence
 * requirements, resolution logic, and severity model.
 */

import { L6ScopeType } from './primitive-contract';
import { L6LegalInputSurfaceClass } from './legal-input-surface';
import { L6FamilyRolloutPriority } from './family-rollout-priority';
import { L6FeatureFamilyId } from './feature-family-definition';

export enum L6EventFamilyId {
  NEW_PAIR_CREATED = 'NEW_PAIR_CREATED',
  WHALE_ACCUMULATION_CLUSTER = 'WHALE_ACCUMULATION_CLUSTER',
  FUNDING_SPIKE = 'FUNDING_SPIKE',
  LIQUIDATION_BURST = 'LIQUIDATION_BURST',
  UNLOCK_APPROACHING = 'UNLOCK_APPROACHING',
  TREASURY_TRANSFER_TO_EXCHANGE = 'TREASURY_TRANSFER_TO_EXCHANGE',
  SUDDEN_NARRATIVE_BREAKOUT = 'SUDDEN_NARRATIVE_BREAKOUT',
  SECURITY_RISK_CHANGE = 'SECURITY_RISK_CHANGE',
}

export const ALL_EVENT_FAMILY_IDS: readonly L6EventFamilyId[] = Object.values(L6EventFamilyId);

export enum L6EventSeverityModelClass {
  INFORMATIONAL = 'INFORMATIONAL',
  THRESHOLD_MAGNITUDE = 'THRESHOLD_MAGNITUDE',
  SIZE_QUALITY_PERSISTENCE = 'SIZE_QUALITY_PERSISTENCE',
  MAGNITUDE_PERSISTENCE = 'MAGNITUDE_PERSISTENCE',
  NOTIONAL_PROXIMITY = 'NOTIONAL_PROXIMITY',
  SCHEDULE_MATERIALITY = 'SCHEDULE_MATERIALITY',
  CONFIDENCE_EXPLOITABILITY = 'CONFIDENCE_EXPLOITABILITY',
  INTENSITY_BREADTH = 'INTENSITY_BREADTH',
}

export const ALL_SEVERITY_MODEL_CLASSES: readonly L6EventSeverityModelClass[] =
  Object.values(L6EventSeverityModelClass);

export enum L6EventResolutionClass {
  REVERSAL = 'REVERSAL',
  DISSIPATION = 'DISSIPATION',
  NORMALIZATION = 'NORMALIZATION',
  INVALIDATION = 'INVALIDATION',
  SCHEDULE_PASS = 'SCHEDULE_PASS',
  ABSORPTION = 'ABSORPTION',
  STABILIZATION = 'STABILIZATION',
  BREADTH_COLLAPSE = 'BREADTH_COLLAPSE',
}

export const ALL_RESOLUTION_CLASSES: readonly L6EventResolutionClass[] =
  Object.values(L6EventResolutionClass);

export interface L6EventFamilyDefinition {
  readonly family_id: L6EventFamilyId;
  readonly description: string;
  readonly allowed_scopes: readonly L6ScopeType[];
  readonly triggering_feature_families: readonly L6FeatureFamilyId[];
  readonly legal_context_surface_classes: readonly L6LegalInputSurfaceClass[];
  readonly confirmation_window_durations_ms: readonly number[];
  readonly suppression_family_id: string;
  readonly severity_model_class: L6EventSeverityModelClass;
  readonly resolution_classes: readonly L6EventResolutionClass[];
  readonly evidence_requirements: readonly string[];
  readonly rollout_priority: L6FamilyRolloutPriority;
  readonly family_invariants: readonly string[];
}

export const REQUIRED_EVENT_FAMILY_FIELDS: readonly (keyof L6EventFamilyDefinition)[] = [
  'family_id', 'description', 'allowed_scopes', 'triggering_feature_families',
  'legal_context_surface_classes', 'confirmation_window_durations_ms',
  'suppression_family_id', 'severity_model_class', 'resolution_classes',
  'evidence_requirements', 'rollout_priority', 'family_invariants',
];
