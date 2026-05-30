/**
 * L14.2 — Delivery Entitlement Profile
 *
 * §14.2.17 — Per-payload entitlement contract. Runtime resolution
 * of user preferences is deferred to L14.3 / L14.9; this contract
 * freezes the entitlement shape.
 */

import type { L14AudienceClass } from './audience-class';
import type { L14DeliveryChannel } from './delivery-channel';

export enum L14EntitlementStatus {
  ENTITLED = 'ENTITLED',
  ENTITLED_INTERNAL_ONLY = 'ENTITLED_INTERNAL_ONLY',
  NOT_ENTITLED_MISSING_OPT_IN = 'NOT_ENTITLED_MISSING_OPT_IN',
  NOT_ENTITLED_MISSING_WATCHLIST_BINDING = 'NOT_ENTITLED_MISSING_WATCHLIST_BINDING',
  NOT_ENTITLED_MISSING_SUBSCRIPTION = 'NOT_ENTITLED_MISSING_SUBSCRIPTION',
  NOT_ENTITLED_MISSING_INTERNAL_ROLE = 'NOT_ENTITLED_MISSING_INTERNAL_ROLE',
  NOT_ENTITLED_CHANNEL_RESERVED = 'NOT_ENTITLED_CHANNEL_RESERVED',
}

export const ALL_L14_ENTITLEMENT_STATUSES:
  readonly L14EntitlementStatus[] =
  Object.values(L14EntitlementStatus);

export function l14EntitlementIsClean(s: L14EntitlementStatus): boolean {
  return s === L14EntitlementStatus.ENTITLED || s === L14EntitlementStatus.ENTITLED_INTERNAL_ONLY;
}

export interface L14DeliveryEntitlementProfile {
  readonly entitlement_profile_id: string;
  readonly audience_class: L14AudienceClass;
  readonly channel: L14DeliveryChannel;
  readonly user_scope_ref?: string;
  readonly channel_opt_in_required: boolean;
  readonly channel_opt_in_present?: boolean;
  readonly watchlist_membership_required: boolean;
  readonly watchlist_membership_present?: boolean;
  readonly subscription_required: boolean;
  readonly subscription_present?: boolean;
  readonly internal_role_required: boolean;
  readonly internal_role_present?: boolean;
  readonly entitlement_status: L14EntitlementStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
