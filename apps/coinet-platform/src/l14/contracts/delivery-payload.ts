/**
 * L14.2 — Delivery Payload Contract
 *
 * §14.2.9 — Durable delivery-payload shape. Carries the primary
 * source artifact ref + supporting refs so dashboards / token
 * reports / chat / Telegram never launder supporting context.
 */

import type { L14AudienceClass } from './audience-class';
import type { L14DeliverabilityStatus } from './deliverability-status';
import type { L14DeliveryChannel } from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';
import type {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from './delivery-priority';

export type L14DeliveryPayloadSourceLayer = 'L10' | 'L11' | 'L12' | 'L13';

export interface L14DeliveryPayload {
  readonly delivery_payload_id: string;
  readonly source_layer: L14DeliveryPayloadSourceLayer;
  readonly primary_source_artifact_ref: string;
  readonly supporting_source_artifact_refs: readonly string[];
  readonly delivery_channel: L14DeliveryChannel;
  readonly delivery_class: L14DeliveryClass;
  readonly user_scope_ref?: string;
  readonly audience_class: L14AudienceClass;
  readonly content_payload_ref: string;
  readonly rendering_profile_ref: string;
  readonly priority_class: L14DeliveryPriorityClass;
  readonly urgency_class: L14DeliveryUrgencyClass;
  readonly disclosure_profile_ref: string;
  readonly restriction_profile_ref: string;
  readonly entitlement_profile_ref?: string;
  readonly deliverability_status: L14DeliverabilityStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
