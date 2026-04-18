/**
 * L6.6 §6.6.5 — First Production Event Families
 *
 * 8 initial event families, each with trigger linkage, confirmation,
 * suppression, evidence, and resolution rules.
 */

import {
  L6EventFamilyDefinition,
  L6EventFamilyId,
  L6EventSeverityModelClass,
  L6EventResolutionClass,
} from '../contracts/event-family-definition';
import { L6FeatureFamilyId } from '../contracts/feature-family-definition';
import { L6ScopeType } from '../contracts/primitive-contract';
import { L6LegalInputSurfaceClass } from '../contracts/legal-input-surface';
import { L6FamilyRolloutPriority } from '../contracts/family-rollout-priority';
import { L6StandardWindowDuration, STANDARD_WINDOW_DURATION_MS } from '../contracts/window-spec';

const ms = (d: L6StandardWindowDuration) => STANDARD_WINDOW_DURATION_MS[d]!;

export const NEW_PAIR_CREATED_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.NEW_PAIR_CREATED,
  description: 'DEX pair activation above liquidity threshold',
  allowed_scopes: [L6ScopeType.PAIR],
  triggering_feature_families: [L6FeatureFamilyId.DEX],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT, L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.FIFTEEN_MIN), ms(L6StandardWindowDuration.ONE_HOUR)],
  suppression_family_id: 'supp_new_pair',
  severity_model_class: L6EventSeverityModelClass.INFORMATIONAL,
  resolution_classes: [L6EventResolutionClass.INVALIDATION, L6EventResolutionClass.STABILIZATION],
  evidence_requirements: ['pair_activation_fact', 'liquidity_threshold_proof', 'dex_context'],
  rollout_priority: L6FamilyRolloutPriority.P3_DEX,
  family_invariants: ['trigger_from_dex_family', 'confirmation_required'],
};

export const WHALE_ACCUMULATION_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.WHALE_ACCUMULATION_CLUSTER,
  description: 'Whale accumulation cluster with persistence and coherence',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.PROJECT],
  triggering_feature_families: [L6FeatureFamilyId.ONCHAIN, L6FeatureFamilyId.ENTITY],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT, L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.FOUR_HOUR), ms(L6StandardWindowDuration.ONE_DAY)],
  suppression_family_id: 'supp_whale_cluster',
  severity_model_class: L6EventSeverityModelClass.SIZE_QUALITY_PERSISTENCE,
  resolution_classes: [L6EventResolutionClass.REVERSAL, L6EventResolutionClass.DISSIPATION],
  evidence_requirements: ['whale_flows', 'net_accumulation_quality', 'exchange_offset_context'],
  rollout_priority: L6FamilyRolloutPriority.P5_ONCHAIN,
  family_invariants: ['persistence_required', 'cluster_coherence'],
};

export const FUNDING_SPIKE_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.FUNDING_SPIKE,
  description: 'Persistent extreme funding rate deviation',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.MARKET],
  triggering_feature_families: [L6FeatureFamilyId.DERIVATIVES, L6FeatureFamilyId.MARKET],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT, L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.ONE_HOUR), ms(L6StandardWindowDuration.FOUR_HOUR)],
  suppression_family_id: 'supp_funding',
  severity_model_class: L6EventSeverityModelClass.MAGNITUDE_PERSISTENCE,
  resolution_classes: [L6EventResolutionClass.NORMALIZATION, L6EventResolutionClass.DISSIPATION],
  evidence_requirements: ['funding_z_score', 'duration_proof', 'crowding_alignment'],
  rollout_priority: L6FamilyRolloutPriority.P2_DERIVATIVES,
  family_invariants: ['non_noisy_continuation', 'replay_safe'],
};

export const LIQUIDATION_BURST_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.LIQUIDATION_BURST,
  description: 'Liquidation cascade or burst above threshold',
  allowed_scopes: [L6ScopeType.ASSET],
  triggering_feature_families: [L6FeatureFamilyId.DERIVATIVES],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT, L6LegalInputSurfaceClass.HISTORICAL_ANALYTICAL_FACT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.FIFTEEN_MIN), ms(L6StandardWindowDuration.ONE_HOUR)],
  suppression_family_id: 'supp_liquidation',
  severity_model_class: L6EventSeverityModelClass.NOTIONAL_PROXIMITY,
  resolution_classes: [L6EventResolutionClass.DISSIPATION],
  evidence_requirements: ['liquidation_density', 'burst_continuation', 'cascade_proof'],
  rollout_priority: L6FamilyRolloutPriority.P2_DERIVATIVES,
  family_invariants: ['cascade_confirmation', 'replay_safe'],
};

export const UNLOCK_APPROACHING_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.UNLOCK_APPROACHING,
  description: 'Governed unlock schedule entering risk window',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.PROJECT],
  triggering_feature_families: [L6FeatureFamilyId.PROTOCOL],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.SCHEDULED_REFERENCE_DATA, L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.ONE_DAY), ms(L6StandardWindowDuration.SEVEN_DAY)],
  suppression_family_id: 'supp_unlock',
  severity_model_class: L6EventSeverityModelClass.SCHEDULE_MATERIALITY,
  resolution_classes: [L6EventResolutionClass.SCHEDULE_PASS, L6EventResolutionClass.ABSORPTION],
  evidence_requirements: ['unlock_schedule', 'unlock_size', 'float_liquidity_context'],
  rollout_priority: L6FamilyRolloutPriority.P4_PROTOCOL,
  family_invariants: ['schedule_governed', 'materiality_threshold'],
};

export const TREASURY_TRANSFER_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.TREASURY_TRANSFER_TO_EXCHANGE,
  description: 'Treasury-labeled wallet transfer to exchange cluster',
  allowed_scopes: [L6ScopeType.PROJECT, L6ScopeType.ASSET],
  triggering_feature_families: [L6FeatureFamilyId.ONCHAIN, L6FeatureFamilyId.PROTOCOL],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT, L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.ONE_HOUR), ms(L6StandardWindowDuration.FOUR_HOUR)],
  suppression_family_id: 'supp_treasury',
  severity_model_class: L6EventSeverityModelClass.SIZE_QUALITY_PERSISTENCE,
  resolution_classes: [L6EventResolutionClass.REVERSAL, L6EventResolutionClass.ABSORPTION],
  evidence_requirements: ['treasury_wallet_send', 'exchange_cluster_destination', 'path_confidence'],
  rollout_priority: L6FamilyRolloutPriority.P5_ONCHAIN,
  family_invariants: ['path_confidence_required', 'destination_verified'],
};

export const NARRATIVE_BREAKOUT_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.SUDDEN_NARRATIVE_BREAKOUT,
  description: 'Sudden cross-source narrative acceleration',
  allowed_scopes: [L6ScopeType.ASSET, L6ScopeType.NARRATIVE, L6ScopeType.PROJECT],
  triggering_feature_families: [L6FeatureFamilyId.NARRATIVE],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT, L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.ONE_HOUR), ms(L6StandardWindowDuration.FOUR_HOUR)],
  suppression_family_id: 'supp_narrative',
  severity_model_class: L6EventSeverityModelClass.INTENSITY_BREADTH,
  resolution_classes: [L6EventResolutionClass.BREADTH_COLLAPSE, L6EventResolutionClass.DISSIPATION],
  evidence_requirements: ['social_news_acceleration', 'breadth_proof', 'divergence_context'],
  rollout_priority: L6FamilyRolloutPriority.P7_NARRATIVE,
  family_invariants: ['cross_source_confirmation', 'replay_safe'],
};

export const SECURITY_RISK_CHANGE_EVENT: L6EventFamilyDefinition = {
  family_id: L6EventFamilyId.SECURITY_RISK_CHANGE,
  description: 'Material shift in security feature surface',
  allowed_scopes: [L6ScopeType.CONTRACT, L6ScopeType.PROJECT, L6ScopeType.ASSET],
  triggering_feature_families: [L6FeatureFamilyId.SECURITY],
  legal_context_surface_classes: [L6LegalInputSurfaceClass.CANONICAL_SCOPED_FACT, L6LegalInputSurfaceClass.GRAPH_DERIVED_CONTEXT],
  confirmation_window_durations_ms: [ms(L6StandardWindowDuration.ONE_HOUR), ms(L6StandardWindowDuration.ONE_DAY)],
  suppression_family_id: 'supp_security',
  severity_model_class: L6EventSeverityModelClass.CONFIDENCE_EXPLOITABILITY,
  resolution_classes: [L6EventResolutionClass.STABILIZATION, L6EventResolutionClass.REVERSAL],
  evidence_requirements: ['security_feature_delta', 'second_source_confirmation', 'policy_verification'],
  rollout_priority: L6FamilyRolloutPriority.P6_SECURITY,
  family_invariants: ['second_source_when_required', 'replay_safe'],
};

export const ALL_PRODUCTION_EVENT_FAMILIES: readonly L6EventFamilyDefinition[] = [
  NEW_PAIR_CREATED_EVENT,
  WHALE_ACCUMULATION_EVENT,
  FUNDING_SPIKE_EVENT,
  LIQUIDATION_BURST_EVENT,
  UNLOCK_APPROACHING_EVENT,
  TREASURY_TRANSFER_EVENT,
  NARRATIVE_BREAKOUT_EVENT,
  SECURITY_RISK_CHANGE_EVENT,
];
