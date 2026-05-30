/**
 * L14.2 — Delivery Channel Registry
 *
 * §14.2.4 / §14.2.5 / §14.2.8 — Frozen registry of the six
 * canonical Coinet delivery channels with their production
 * statuses and admissibility envelopes.
 */

import { L14AudienceClass } from '../contracts/audience-class';
import { L14DeliverableSourceArtifactClass } from '../contracts/deliverable-source-artifact';
import {
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
  type L14DeliveryChannelDefinition,
} from '../contracts/delivery-channel';
import { L14DeliveryClass } from '../contracts/delivery-class';

const POLICY_V = 'l14.delivery.v1';

const A = L14DeliverableSourceArtifactClass;

function def(
  channel: L14DeliveryChannel,
  channel_status: L14DeliveryChannelStatus,
  user_facing: boolean,
  internal_only: boolean,
  production_emissible: boolean,
  allowed_delivery_classes: readonly L14DeliveryClass[],
  allowed_audience_classes: readonly L14AudienceClass[],
  allowed_source_artifact_classes: readonly L14DeliverableSourceArtifactClass[],
  entitlement_required: boolean,
): L14DeliveryChannelDefinition {
  return {
    channel,
    channel_status,
    user_facing,
    internal_only,
    production_emissible,
    allowed_delivery_classes,
    allowed_audience_classes,
    allowed_source_artifact_classes,
    entitlement_required,
    restriction_profile_required: true,
    disclosure_profile_required: true,
    rendering_profile_required: true,
    may_reconstruct_lower_layer_truth: false,
    may_rebuild_l13_meaning: false,
    may_mutate_source_payload: false,
    policy_version: POLICY_V,
  };
}

const REGISTRY: ReadonlyArray<L14DeliveryChannelDefinition> = [
  def(
    L14DeliveryChannel.DASHBOARD,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
    true, false, true,
    [L14DeliveryClass.CURRENT_STATE_CARD, L14DeliveryClass.ALERT_DIGEST_ITEM],
    [L14AudienceClass.END_USER, L14AudienceClass.WATCHLIST_USER],
    [
      A.L10_HYPOTHESIS_SUMMARY,
      A.L11_SCORE_SNAPSHOT,
      A.L11_SCORE_ATTRIBUTION_SUMMARY,
      A.L12_SCENARIO_SUMMARY,
      A.L13_FINAL_REPORT_OUTPUT,
    ],
    false,
  ),
  def(
    L14DeliveryChannel.TOKEN_REPORT_PAGE,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
    true, false, true,
    [L14DeliveryClass.TOKEN_REPORT_PAGE_PAYLOAD],
    [L14AudienceClass.END_USER, L14AudienceClass.WATCHLIST_USER],
    [
      A.L10_HYPOTHESIS_SUMMARY,
      A.L11_SCORE_SNAPSHOT,
      A.L11_SCORE_ATTRIBUTION_SUMMARY,
      A.L12_SCENARIO_SUMMARY,
      A.L12_TRIGGER_INVALIDATION_SUMMARY,
      A.L13_FINAL_REPORT_OUTPUT,
    ],
    false,
  ),
  def(
    L14DeliveryChannel.AI_CHAT,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
    true, false, true,
    [L14DeliveryClass.AI_CHAT_RESPONSE],
    [L14AudienceClass.END_USER],
    [
      A.L13_FINAL_CHAT_OUTPUT,
      A.L13_FINAL_REPORT_OUTPUT,
      A.L13_FINAL_COMPARISON_OUTPUT,
    ],
    false,
  ),
  def(
    L14DeliveryChannel.TELEGRAM,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
    true, false, true,
    [L14DeliveryClass.ALERT_NOTIFICATION, L14DeliveryClass.ALERT_DIGEST_ITEM],
    [L14AudienceClass.ALERT_SUBSCRIBER, L14AudienceClass.WATCHLIST_USER],
    [A.L13_FINAL_ALERT_OUTPUT],
    true,
  ),
  def(
    L14DeliveryChannel.PUSH_ALERT,
    L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE,
    false, false, false,
    [],
    [],
    [],
    true,
  ),
  def(
    L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
    L14DeliveryChannelStatus.PRODUCTION_INTERNAL_ONLY,
    false, true, true,
    [
      L14DeliveryClass.ANALYST_REVIEW_PAYLOAD,
      L14DeliveryClass.CALIBRATION_REVIEW_PAYLOAD,
    ],
    [
      L14AudienceClass.INTERNAL_ANALYST,
      L14AudienceClass.INTERNAL_SYSTEM_REVIEW,
    ],
    [
      A.L13_OUTPUT_QUALITY_FACT,
      A.L13_FEEDBACK_SUMMARY_FACT,
      A.L13_AUDIT_FACT,
      A.L14_CALIBRATION_REVIEW_FACT,
    ],
    true,
  ),
];

const INDEX: ReadonlyMap<L14DeliveryChannel, L14DeliveryChannelDefinition> =
  new Map(REGISTRY.map(d => [d.channel, d]));

export function getL14DeliveryChannelDefinitions():
  readonly L14DeliveryChannelDefinition[] {
  return REGISTRY;
}

export function getL14DeliveryChannelDefinition(
  channel: L14DeliveryChannel,
): L14DeliveryChannelDefinition | undefined {
  return INDEX.get(channel);
}

export function l14DeliveryChannelRegistered(
  channel: L14DeliveryChannel,
): boolean {
  return INDEX.has(channel);
}
