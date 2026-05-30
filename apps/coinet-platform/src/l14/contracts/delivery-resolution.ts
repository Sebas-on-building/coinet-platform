/**
 * L14.3 — Eligibility, Audience, Channel, Preference Resolution
 *
 * §14.3.14 — Consolidated resolution-stage contracts.
 */

import type { L14AudienceClass } from './audience-class';
import type { L14DeliveryChannel } from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';

// ── Eligibility ─────────────────────────────────────────────────────

export enum L14DeliveryEligibilityStatus {
  ELIGIBLE = 'ELIGIBLE',
  BLOCKED_UNGOVERNED_SOURCE = 'BLOCKED_UNGOVERNED_SOURCE',
  BLOCKED_FINAL_ARTIFACT_REQUIRED = 'BLOCKED_FINAL_ARTIFACT_REQUIRED',
  BLOCKED_INTERNAL_ONLY = 'BLOCKED_INTERNAL_ONLY',
  BLOCKED_RESERVED_CHANNEL_ONLY = 'BLOCKED_RESERVED_CHANNEL_ONLY',
  BLOCKED_CONSUMER_CONTRACT_MISMATCH = 'BLOCKED_CONSUMER_CONTRACT_MISMATCH',
}

export enum L14EligibilityBlockReasonCode {
  UNGOVERNED_SOURCE = 'UNGOVERNED_SOURCE',
  FINAL_L13_REQUIRED = 'FINAL_L13_REQUIRED',
  INTERNAL_ONLY_SOURCE = 'INTERNAL_ONLY_SOURCE',
  RESERVED_CHANNEL_ROUTE = 'RESERVED_CHANNEL_ROUTE',
  CONTRACT_MISMATCH = 'CONTRACT_MISMATCH',
  MISSING_LINEAGE = 'MISSING_LINEAGE',
}

export interface L14DeliveryEligibilityResult {
  readonly eligibility_result_id: string;
  readonly candidate_delivery_ref: string;
  readonly eligible: boolean;
  readonly eligibility_status: L14DeliveryEligibilityStatus;
  readonly blocking_reason_codes: readonly L14EligibilityBlockReasonCode[];
  readonly legal_delivery_classes: readonly L14DeliveryClass[];
  readonly legal_channel_candidates: readonly L14DeliveryChannel[];
  readonly legal_audience_candidates: readonly L14AudienceClass[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Audience resolution ────────────────────────────────────────────

export enum L14AudienceResolutionBasisCode {
  USER_SCOPE_WATCHLIST = 'USER_SCOPE_WATCHLIST',
  ALERT_SUBSCRIPTION = 'ALERT_SUBSCRIPTION',
  END_USER_BROADCAST = 'END_USER_BROADCAST',
  INTERNAL_ROLE_BOUND = 'INTERNAL_ROLE_BOUND',
  SYSTEM_REVIEW_PIPELINE = 'SYSTEM_REVIEW_PIPELINE',
}

export interface L14AudienceResolutionResult {
  readonly audience_resolution_id: string;
  readonly candidate_delivery_ref: string;
  readonly resolved_audience_class: L14AudienceClass;
  readonly alternate_allowed_audience_classes: readonly L14AudienceClass[];
  readonly resolution_basis_codes: readonly L14AudienceResolutionBasisCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Channel resolution ─────────────────────────────────────────────

export enum L14ChannelSelectionReasonCode {
  PREFERRED_CHANNEL_HINT = 'PREFERRED_CHANNEL_HINT',
  CANDIDATE_DELIVERY_CLASS_LEGAL = 'CANDIDATE_DELIVERY_CLASS_LEGAL',
  AUDIENCE_CLASS_LEGAL = 'AUDIENCE_CLASS_LEGAL',
  CHANNEL_STATUS_PRODUCTION = 'CHANNEL_STATUS_PRODUCTION',
  INTERNAL_REVIEW_REQUIRED = 'INTERNAL_REVIEW_REQUIRED',
  RESERVED_CHANNEL_REJECTED = 'RESERVED_CHANNEL_REJECTED',
}

export interface L14ChannelResolutionResult {
  readonly channel_resolution_id: string;
  readonly candidate_delivery_ref: string;
  readonly selected_channel: L14DeliveryChannel;
  readonly alternate_legal_channels: readonly L14DeliveryChannel[];
  readonly channel_selection_reason_codes:
    readonly L14ChannelSelectionReasonCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Preference / entitlement binding ──────────────────────────────

export enum L14PreferenceBindingStatus {
  CLEAN = 'CLEAN',
  MUTED_CHANNEL = 'MUTED_CHANNEL',
  MUTED_ALERT_CLASS = 'MUTED_ALERT_CLASS',
  QUIET_HOURS_ACTIVE = 'QUIET_HOURS_ACTIVE',
  FREQUENCY_CAP_REACHED = 'FREQUENCY_CAP_REACHED',
  ENTITLEMENT_BLOCKED = 'ENTITLEMENT_BLOCKED',
}

export enum L14PreferenceBlockReasonCode {
  CHANNEL_MUTED = 'CHANNEL_MUTED',
  ALERT_CLASS_MUTED = 'ALERT_CLASS_MUTED',
  QUIET_HOURS = 'QUIET_HOURS',
  FREQUENCY_CAP = 'FREQUENCY_CAP',
  ENTITLEMENT_MISSING = 'ENTITLEMENT_MISSING',
}

export interface L14PreferenceEntitlementBinding {
  readonly preference_binding_id: string;
  readonly candidate_delivery_ref: string;
  readonly channel: L14DeliveryChannel;
  readonly audience_class: L14AudienceClass;
  readonly entitlement_profile_ref: string;
  readonly preference_profile_ref?: string;
  readonly channel_enabled: boolean;
  readonly alert_class_enabled: boolean;
  readonly quiet_hours_active: boolean;
  readonly frequency_cap_reached: boolean;
  readonly preference_binding_status: L14PreferenceBindingStatus;
  readonly blocking_reason_codes: readonly L14PreferenceBlockReasonCode[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export function l14PreferenceBindingIsClean(
  s: L14PreferenceBindingStatus,
): boolean {
  return s === L14PreferenceBindingStatus.CLEAN;
}
