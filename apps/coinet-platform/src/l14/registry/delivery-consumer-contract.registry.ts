/**
 * L14.2 — Consumer Contract Registry
 *
 * §14.2.20 — Per-channel consumer contracts. Built from the
 * channel registry so admissibility envelopes stay 1:1 with the
 * channel definitions.
 */

import { L14AudienceClass } from '../contracts/audience-class';
import { L14DeliverableSourceArtifactClass } from '../contracts/deliverable-source-artifact';
import {
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
} from '../contracts/delivery-channel';
import { L14DeliveryClass } from '../contracts/delivery-class';
import { L14RenderingProfileClass } from '../contracts/rendering-profile';
import type { L14DeliveryConsumerContract } from '../contracts/delivery-consumer-contract';

const POLICY_V = 'l14.delivery.v1';

const A = L14DeliverableSourceArtifactClass;

function contract(
  channel: L14DeliveryChannel,
  channel_status: L14DeliveryChannelStatus,
  legal_delivery_classes: readonly L14DeliveryClass[],
  legal_audience_classes: readonly L14AudienceClass[],
  legal_source_artifact_classes: readonly L14DeliverableSourceArtifactClass[],
  legal_rendering_profiles: readonly L14RenderingProfileClass[],
  requires_final_l13_artifact: boolean,
  requires_entitlement_profile: boolean,
  may_serve_user_facing: boolean,
  may_serve_internal_only: boolean,
): L14DeliveryConsumerContract {
  return {
    consumer_contract_id: `l14.contract.${channel}`,
    channel,
    channel_status,
    legal_delivery_classes,
    legal_audience_classes,
    legal_source_artifact_classes,
    legal_rendering_profiles,
    requires_final_l13_artifact,
    requires_entitlement_profile,
    requires_disclosure_profile: true,
    requires_restriction_profile: true,
    may_serve_user_facing,
    may_serve_internal_only,
    may_reconstruct_meaning: false,
    may_mutate_source_semantics: false,
    may_auto_upgrade_priority: false,
    policy_version: POLICY_V,
  };
}

const REGISTRY: ReadonlyArray<L14DeliveryConsumerContract> = [
  contract(
    L14DeliveryChannel.DASHBOARD,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
    [L14DeliveryClass.CURRENT_STATE_CARD, L14DeliveryClass.ALERT_DIGEST_ITEM],
    [L14AudienceClass.END_USER, L14AudienceClass.WATCHLIST_USER],
    [
      A.L10_HYPOTHESIS_SUMMARY,
      A.L11_SCORE_SNAPSHOT,
      A.L11_SCORE_ATTRIBUTION_SUMMARY,
      A.L12_SCENARIO_SUMMARY,
      A.L13_FINAL_REPORT_OUTPUT,
    ],
    [L14RenderingProfileClass.DASHBOARD_CARD],
    false, false, true, false,
  ),
  contract(
    L14DeliveryChannel.TOKEN_REPORT_PAGE,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
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
    [L14RenderingProfileClass.TOKEN_REPORT_SECTION],
    false, false, true, false,
  ),
  contract(
    L14DeliveryChannel.AI_CHAT,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
    [L14DeliveryClass.AI_CHAT_RESPONSE],
    [L14AudienceClass.END_USER],
    [
      A.L13_FINAL_CHAT_OUTPUT,
      A.L13_FINAL_REPORT_OUTPUT,
      A.L13_FINAL_COMPARISON_OUTPUT,
    ],
    [L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER],
    true, false, true, false,
  ),
  contract(
    L14DeliveryChannel.TELEGRAM,
    L14DeliveryChannelStatus.PRODUCTION_USER_FACING,
    [L14DeliveryClass.ALERT_NOTIFICATION, L14DeliveryClass.ALERT_DIGEST_ITEM],
    [L14AudienceClass.ALERT_SUBSCRIBER, L14AudienceClass.WATCHLIST_USER],
    [A.L13_FINAL_ALERT_OUTPUT],
    [
      L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
      L14RenderingProfileClass.TELEGRAM_DIGEST_ITEM,
    ],
    true, true, true, false,
  ),
  contract(
    L14DeliveryChannel.PUSH_ALERT,
    L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE,
    [],
    [],
    [],
    [],
    true, true, false, false,
  ),
  contract(
    L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
    L14DeliveryChannelStatus.PRODUCTION_INTERNAL_ONLY,
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
    [
      L14RenderingProfileClass.ANALYST_REVIEW_PANEL,
      L14RenderingProfileClass.CALIBRATION_REVIEW_PANEL,
    ],
    false, true, false, true,
  ),
];

const INDEX: ReadonlyMap<L14DeliveryChannel, L14DeliveryConsumerContract> =
  new Map(REGISTRY.map(c => [c.channel, c]));

export function getL14DeliveryConsumerContracts():
  readonly L14DeliveryConsumerContract[] {
  return REGISTRY;
}

export function getL14DeliveryConsumerContract(
  channel: L14DeliveryChannel,
): L14DeliveryConsumerContract | undefined {
  return INDEX.get(channel);
}
