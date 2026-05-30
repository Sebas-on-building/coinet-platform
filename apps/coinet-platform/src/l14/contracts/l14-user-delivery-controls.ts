/**
 * L14.9 — User Delivery Control Contracts
 *
 * §14.9.12 / §14.9.14 / §14.9.15 / §14.9.16
 */

import { L14DeliveryChannel } from './delivery-channel';

export enum L14Weekday {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum L14DigestPreferenceClass {
  IMMEDIATE_ONLY = 'IMMEDIATE_ONLY',
  DIGEST_PREFERRED = 'DIGEST_PREFERRED',
  LOW_AND_ROUTINE_DIGEST_ONLY = 'LOW_AND_ROUTINE_DIGEST_ONLY',
  QUIET_HOURS_DIGEST = 'QUIET_HOURS_DIGEST',
  DIGEST_ONLY = 'DIGEST_ONLY',
  NO_DIGEST = 'NO_DIGEST',
}

export interface L14QuietHoursProfile {
  readonly quiet_hours_profile_id: string;
  readonly timezone_ref: string;
  readonly quiet_hours_start_local: string;
  readonly quiet_hours_end_local: string;
  readonly active_weekday_mask: readonly L14Weekday[];
  readonly digest_during_quiet_hours: boolean;
  readonly severity_override_policy_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14DeliveryPreferenceProfile {
  readonly preference_profile_id: string;
  readonly user_id_hash: string;
  readonly enabled_channels: readonly L14DeliveryChannel[];
  readonly muted_channels: readonly L14DeliveryChannel[];
  readonly enabled_alert_classes: readonly string[];
  readonly muted_alert_classes: readonly string[];
  readonly watchlist_scope_refs: readonly string[];
  readonly quiet_hours_profile?: L14QuietHoursProfile;
  readonly max_alerts_per_window?: number;
  readonly digest_preference: L14DigestPreferenceClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L14DeliveryPreferenceSnapshot {
  readonly preference_snapshot_id: string;
  readonly source_preference_profile_ref: string;
  readonly captured_at: string;
  readonly resolved_enabled_channels: readonly L14DeliveryChannel[];
  readonly resolved_muted_channels: readonly L14DeliveryChannel[];
  readonly resolved_enabled_alert_classes: readonly string[];
  readonly resolved_muted_alert_classes: readonly string[];
  readonly resolved_watchlist_scope_refs: readonly string[];
  readonly quiet_hours_active: boolean;
  readonly active_quiet_hours_profile_ref?: string;
  readonly max_alerts_per_window?: number;
  readonly digest_preference: L14DigestPreferenceClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
