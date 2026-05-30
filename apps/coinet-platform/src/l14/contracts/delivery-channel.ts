/**
 * L14.2 — Delivery Channel + Status Contracts
 *
 * §14.2.3 / §14.2.4 / §14.2.5 — Canonical channel taxonomy plus
 * production-status enum and channel-definition descriptor.
 */

import type { L14AudienceClass } from './audience-class';
import type { L14DeliverableSourceArtifactClass } from './deliverable-source-artifact';
import type { L14DeliveryClass } from './delivery-class';

export enum L14DeliveryChannel {
  DASHBOARD = 'DASHBOARD',
  TOKEN_REPORT_PAGE = 'TOKEN_REPORT_PAGE',
  AI_CHAT = 'AI_CHAT',
  TELEGRAM = 'TELEGRAM',
  PUSH_ALERT = 'PUSH_ALERT',
  INTERNAL_ANALYST_CONSOLE = 'INTERNAL_ANALYST_CONSOLE',
}

export const ALL_L14_DELIVERY_CHANNELS: readonly L14DeliveryChannel[] =
  Object.values(L14DeliveryChannel);

export enum L14DeliveryChannelStatus {
  PRODUCTION_USER_FACING = 'PRODUCTION_USER_FACING',
  PRODUCTION_INTERNAL_ONLY = 'PRODUCTION_INTERNAL_ONLY',
  RESERVED_NOT_EMISSIBLE = 'RESERVED_NOT_EMISSIBLE',
  DEPRECATED_BLOCKED = 'DEPRECATED_BLOCKED',
}

export const ALL_L14_DELIVERY_CHANNEL_STATUSES:
  readonly L14DeliveryChannelStatus[] =
  Object.values(L14DeliveryChannelStatus);

export interface L14DeliveryChannelDefinition {
  readonly channel: L14DeliveryChannel;
  readonly channel_status: L14DeliveryChannelStatus;
  readonly user_facing: boolean;
  readonly internal_only: boolean;
  readonly production_emissible: boolean;
  readonly allowed_delivery_classes: readonly L14DeliveryClass[];
  readonly allowed_audience_classes: readonly L14AudienceClass[];
  readonly allowed_source_artifact_classes:
    readonly L14DeliverableSourceArtifactClass[];
  readonly entitlement_required: boolean;
  readonly restriction_profile_required: true;
  readonly disclosure_profile_required: true;
  readonly rendering_profile_required: true;
  readonly may_reconstruct_lower_layer_truth: false;
  readonly may_rebuild_l13_meaning: false;
  readonly may_mutate_source_payload: false;
  readonly policy_version: string;
}
