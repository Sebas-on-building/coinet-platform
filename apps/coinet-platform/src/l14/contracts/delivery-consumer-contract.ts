/**
 * L14.2 — Delivery Consumer Contract
 *
 * §14.2.19 / §14.2.20 — Per-channel consumer contract.
 */

import type { L14AudienceClass } from './audience-class';
import type { L14DeliverableSourceArtifactClass } from './deliverable-source-artifact';
import type {
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
} from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';
import type { L14RenderingProfileClass } from './rendering-profile';

export interface L14DeliveryConsumerContract {
  readonly consumer_contract_id: string;
  readonly channel: L14DeliveryChannel;
  readonly channel_status: L14DeliveryChannelStatus;
  readonly legal_delivery_classes: readonly L14DeliveryClass[];
  readonly legal_audience_classes: readonly L14AudienceClass[];
  readonly legal_source_artifact_classes:
    readonly L14DeliverableSourceArtifactClass[];
  readonly legal_rendering_profiles:
    readonly L14RenderingProfileClass[];
  readonly requires_final_l13_artifact: boolean;
  readonly requires_entitlement_profile: boolean;
  readonly requires_disclosure_profile: true;
  readonly requires_restriction_profile: true;
  readonly may_serve_user_facing: boolean;
  readonly may_serve_internal_only: boolean;
  readonly may_reconstruct_meaning: false;
  readonly may_mutate_source_semantics: false;
  readonly may_auto_upgrade_priority: false;
  readonly policy_version: string;
}
