/**
 * L14.2 — Delivery Invariants
 *
 * §14.2.28 — INV-14.2-A through INV-14.2-J.
 */

import { L14AudienceClass } from '../contracts/audience-class';
import {
  L14DeliverabilityStatus,
} from '../contracts/deliverability-status';
import { L14DeliverableSourceArtifactClass } from '../contracts/deliverable-source-artifact';
import {
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
} from '../contracts/delivery-channel';
import { L14DeliveryClass } from '../contracts/delivery-class';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from '../contracts/delivery-priority';
import { L14RenderingProfileClass } from '../contracts/rendering-profile';
import {
  L14EntitlementStatus,
  type L14DeliveryEntitlementProfile,
} from '../contracts/delivery-entitlement-profile';
import type { L14DeliveryPayload } from '../contracts/delivery-payload';
import {
  getL14DeliveryChannelDefinition,
  getL14DeliveryChannelDefinitions,
  getL14DeliveryConsumerContract,
  getL14DeliveryConsumerContracts,
  getL14RenderingProfile,
  getL14RenderingProfiles,
  l14DeliveryChannelRegistered,
  l14RenderingProfileRegistered,
} from '../registry';
import { ALL_L14_DELIVERY_CHANNELS } from '../contracts/delivery-channel';
import {
  validateL14ChannelSpecificDelivery,
  validateL14DeliveryConsumerContract,
  validateL14DeliveryPayload,
  validateL14RenderingProfile,
  validateL14RenderingUsage,
  validateL14DeliveryEntitlement,
} from '../validation/delivery.validators';
import { fnv1a } from '../../l13/context/_fnv1a';

const POLICY_V = 'l14.delivery.v1';

export interface L14_2InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_2InvariantResult {
  return { id, name, holds, evidence };
}

function buildPayload(opts: {
  channel: L14DeliveryChannel;
  delivery_class: L14DeliveryClass;
  audience: L14AudienceClass;
  source_layer: L14DeliveryPayload['source_layer'];
  rendering_profile_class: L14RenderingProfileClass;
  status?: L14DeliverabilityStatus;
}): L14DeliveryPayload {
  const profile = getL14RenderingProfile(opts.rendering_profile_class);
  const replayHash = fnv1a(
    [
      opts.channel,
      opts.delivery_class,
      opts.audience,
      opts.source_layer,
      opts.rendering_profile_class,
      POLICY_V,
    ].join('|'),
  );
  return {
    delivery_payload_id: `l14.delivery.${replayHash}`,
    source_layer: opts.source_layer,
    primary_source_artifact_ref: 'l14.cert.src',
    supporting_source_artifact_refs: [],
    delivery_channel: opts.channel,
    delivery_class: opts.delivery_class,
    audience_class: opts.audience,
    content_payload_ref: 'l14.cert.content',
    rendering_profile_ref: profile?.rendering_profile_id ?? 'l14.cert.render',
    priority_class: L14DeliveryPriorityClass.MATERIAL,
    urgency_class: L14DeliveryUrgencyClass.NEAR_REAL_TIME,
    disclosure_profile_ref: 'l14.cert.disc',
    restriction_profile_ref: 'l14.cert.restr',
    deliverability_status: opts.status ?? L14DeliverabilityStatus.DELIVERABLE_CLEAN,
    lineage_refs: ['l14.delivery.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

function buildEntitlement(opts: {
  audience: L14AudienceClass;
  channel: L14DeliveryChannel;
  status: L14EntitlementStatus;
  opt_in_required?: boolean;
  opt_in_present?: boolean;
  watchlist_required?: boolean;
  watchlist_present?: boolean;
  subscription_required?: boolean;
  subscription_present?: boolean;
  internal_role_required?: boolean;
  internal_role_present?: boolean;
}): L14DeliveryEntitlementProfile {
  return {
    entitlement_profile_id: `l14.ent.${opts.channel}.${opts.audience}.${opts.status}`,
    audience_class: opts.audience,
    channel: opts.channel,
    channel_opt_in_required: opts.opt_in_required ?? false,
    channel_opt_in_present: opts.opt_in_present,
    watchlist_membership_required: opts.watchlist_required ?? false,
    watchlist_membership_present: opts.watchlist_present,
    subscription_required: opts.subscription_required ?? false,
    subscription_present: opts.subscription_present,
    internal_role_required: opts.internal_role_required ?? false,
    internal_role_present: opts.internal_role_present,
    entitlement_status: opts.status,
    lineage_refs: ['l14.delivery.lineage'],
    replay_hash: 'cert',
    policy_version: POLICY_V,
  };
}

// ── INV-14.2-A : channel registration law ───────────────────────────

export function checkINV_142_A(): L14_2InvariantResult {
  const defs = getL14DeliveryChannelDefinitions();
  const contracts = getL14DeliveryConsumerContracts();
  const allRegistered = ALL_L14_DELIVERY_CHANNELS.every(c => l14DeliveryChannelRegistered(c));
  const allHaveContract = ALL_L14_DELIVERY_CHANNELS.every(c => !!getL14DeliveryConsumerContract(c));
  return inv(
    'INV-14.2-A',
    'channel registration law',
    defs.length === 6 && contracts.length === 6 && allRegistered && allHaveContract,
    `channels=${defs.length} contracts=${contracts.length} allRegistered=${allRegistered} allContract=${allHaveContract}`,
  );
}

// ── INV-14.2-B : reserved push channel law ──────────────────────────

export function checkINV_142_B(): L14_2InvariantResult {
  const push = getL14DeliveryChannelDefinition(L14DeliveryChannel.PUSH_ALERT);
  const contract = getL14DeliveryConsumerContract(L14DeliveryChannel.PUSH_ALERT);
  const holds =
    push?.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE &&
    push.production_emissible === false &&
    contract?.may_serve_user_facing === false &&
    contract?.may_serve_internal_only === false;
  return inv('INV-14.2-B', 'reserved push channel law', !!holds, `push=${push?.channel_status} emissible=${push?.production_emissible}`);
}

// ── INV-14.2-C : channel/payload compatibility law ──────────────────

export function checkINV_142_C(): L14_2InvariantResult {
  // Green dashboard payload validates.
  const greenPayload = buildPayload({
    channel: L14DeliveryChannel.DASHBOARD,
    delivery_class: L14DeliveryClass.CURRENT_STATE_CARD,
    audience: L14AudienceClass.END_USER,
    source_layer: 'L13',
    rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
  });
  const green = validateL14ChannelSpecificDelivery({
    payload: greenPayload,
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_REPORT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
  });
  // Wrong delivery class for channel rejected.
  const wrongClass = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.DASHBOARD,
      delivery_class: L14DeliveryClass.ALERT_NOTIFICATION, // not allowed on dashboard
      audience: L14AudienceClass.END_USER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_REPORT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
  });
  // Wrong rendering profile for channel rejected.
  const wrongRender = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.DASHBOARD,
      delivery_class: L14DeliveryClass.CURRENT_STATE_CARD,
      audience: L14AudienceClass.END_USER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_REPORT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
  });
  return inv(
    'INV-14.2-C',
    'channel/payload compatibility law',
    green.clean && !wrongClass.clean && !wrongRender.clean,
    `green=${green.clean} wrongClassRejected=${!wrongClass.clean} wrongRenderRejected=${!wrongRender.clean}`,
  );
}

// ── INV-14.2-D : AI chat final-artifact law ─────────────────────────

export function checkINV_142_D(): L14_2InvariantResult {
  const greenChat = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.AI_CHAT,
      delivery_class: L14DeliveryClass.AI_CHAT_RESPONSE,
      audience: L14AudienceClass.END_USER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_CHAT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
  });
  const badChat = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.AI_CHAT,
      delivery_class: L14DeliveryClass.AI_CHAT_RESPONSE,
      audience: L14AudienceClass.END_USER,
      source_layer: 'L11',
      rendering_profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L11_SCORE_SNAPSHOT, // not final L13
    rendering_profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
  });
  return inv(
    'INV-14.2-D',
    'AI chat final-artifact law',
    greenChat.clean && !badChat.clean,
    `green=${greenChat.clean} nonFinalRejected=${!badChat.clean}`,
  );
}

// ── INV-14.2-E : Telegram final-alert law ───────────────────────────

export function checkINV_142_E(): L14_2InvariantResult {
  const ent = buildEntitlement({
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
    channel: L14DeliveryChannel.TELEGRAM,
    status: L14EntitlementStatus.ENTITLED,
    opt_in_required: true, opt_in_present: true,
    subscription_required: true, subscription_present: true,
  });
  const green = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.TELEGRAM,
      delivery_class: L14DeliveryClass.ALERT_NOTIFICATION,
      audience: L14AudienceClass.ALERT_SUBSCRIBER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    entitlement: ent,
  });
  const rawL12 = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.TELEGRAM,
      delivery_class: L14DeliveryClass.ALERT_NOTIFICATION,
      audience: L14AudienceClass.ALERT_SUBSCRIBER,
      source_layer: 'L12',
      rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L12_TRIGGER_INVALIDATION_SUMMARY,
    rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    entitlement: ent,
  });
  return inv(
    'INV-14.2-E',
    'Telegram final-alert law',
    green.clean && !rawL12.clean,
    `green=${green.clean} rawL12Rejected=${!rawL12.clean}`,
  );
}

// ── INV-14.2-F : entitlement law ────────────────────────────────────

export function checkINV_142_F(): L14_2InvariantResult {
  // Telegram missing opt-in rejected.
  const noOptIn = buildEntitlement({
    audience: L14AudienceClass.ALERT_SUBSCRIBER,
    channel: L14DeliveryChannel.TELEGRAM,
    status: L14EntitlementStatus.NOT_ENTITLED_MISSING_OPT_IN,
    opt_in_required: true, opt_in_present: false,
    subscription_required: true, subscription_present: true,
  });
  const v1 = validateL14DeliveryEntitlement(noOptIn);
  // Internal console missing internal role rejected.
  const noRole = buildEntitlement({
    audience: L14AudienceClass.INTERNAL_ANALYST,
    channel: L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
    status: L14EntitlementStatus.NOT_ENTITLED_MISSING_INTERNAL_ROLE,
    internal_role_required: true, internal_role_present: false,
  });
  const v2 = validateL14DeliveryEntitlement(noRole);
  // Reserved channel must report NOT_ENTITLED_CHANNEL_RESERVED.
  const reserved = buildEntitlement({
    audience: L14AudienceClass.END_USER,
    channel: L14DeliveryChannel.PUSH_ALERT,
    status: L14EntitlementStatus.NOT_ENTITLED_CHANNEL_RESERVED,
  });
  const v3 = validateL14DeliveryEntitlement(reserved);
  return inv(
    'INV-14.2-F',
    'entitlement law',
    !v1.clean && !v2.clean && v3.clean,
    `noOptInRejected=${!v1.clean} noRoleRejected=${!v2.clean} reservedClean=${v3.clean}`,
  );
}

// ── INV-14.2-G : rendering non-mutation law ─────────────────────────

export function checkINV_142_G(): L14_2InvariantResult {
  const profiles = getL14RenderingProfiles();
  const allClean = profiles.every(p => validateL14RenderingProfile(p).clean);
  // Usage that removes disclosure is rejected.
  const u1 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    channel: L14DeliveryChannel.TELEGRAM,
    removed_required_disclosure: true,
  });
  // Usage that converts conditional to certainty is rejected.
  const u2 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
    channel: L14DeliveryChannel.AI_CHAT,
    converted_condition_to_certainty: true,
  });
  // Usage that regenerates meaning is rejected.
  const u3 = validateL14RenderingUsage({
    profile_class: L14RenderingProfileClass.CHAT_RESPONSE_CONTAINER,
    channel: L14DeliveryChannel.AI_CHAT,
    regenerated_language: true,
  });
  return inv(
    'INV-14.2-G',
    'rendering non-mutation law',
    allClean && !u1.clean && !u2.clean && !u3.clean,
    `profilesClean=${allClean} disclosureRemovalRejected=${!u1.clean} certaintyRejected=${!u2.clean} regenRejected=${!u3.clean}`,
  );
}

// ── INV-14.2-H : internal console containment law ───────────────────

export function checkINV_142_H(): L14_2InvariantResult {
  const internalContract = getL14DeliveryConsumerContract(L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE);
  const internalDef = getL14DeliveryChannelDefinition(L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE);
  const contractValid =
    internalContract?.may_serve_user_facing === false &&
    internalContract?.may_serve_internal_only === true &&
    internalDef?.internal_only === true;
  // Targeting end-user with internal console rejected.
  const leak = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
      delivery_class: L14DeliveryClass.ANALYST_REVIEW_PAYLOAD,
      audience: L14AudienceClass.END_USER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.ANALYST_REVIEW_PANEL,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_OUTPUT_QUALITY_FACT,
    rendering_profile_class: L14RenderingProfileClass.ANALYST_REVIEW_PANEL,
  });
  return inv(
    'INV-14.2-H',
    'internal console containment law',
    !!contractValid && !leak.clean,
    `contract=${contractValid} leakRejected=${!leak.clean}`,
  );
}

// ── INV-14.2-I : deliverability honesty law ─────────────────────────

export function checkINV_142_I(): L14_2InvariantResult {
  // Mismatched: Telegram with no entitlement claiming DELIVERABLE_CLEAN.
  const falseGreen = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.TELEGRAM,
      delivery_class: L14DeliveryClass.ALERT_NOTIFICATION,
      audience: L14AudienceClass.ALERT_SUBSCRIBER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
      status: L14DeliverabilityStatus.DELIVERABLE_CLEAN,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
    // No entitlement provided despite contract requiring it.
  });
  // Reserved channel claiming DELIVERABLE_CLEAN.
  const reservedClaim = validateL14ChannelSpecificDelivery({
    payload: buildPayload({
      channel: L14DeliveryChannel.PUSH_ALERT,
      delivery_class: L14DeliveryClass.ALERT_NOTIFICATION,
      audience: L14AudienceClass.ALERT_SUBSCRIBER,
      source_layer: 'L13',
      rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
      status: L14DeliverabilityStatus.DELIVERABLE_CLEAN,
    }),
    source_artifact_class: L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT,
    rendering_profile_class: L14RenderingProfileClass.TELEGRAM_ALERT_MESSAGE,
  });
  return inv(
    'INV-14.2-I',
    'deliverability honesty law',
    !falseGreen.clean && !reservedClaim.clean,
    `falseGreenRejected=${!falseGreen.clean} reservedClaimRejected=${!reservedClaim.clean}`,
  );
}

// ── INV-14.2-J : replay and lineage law ─────────────────────────────

export function checkINV_142_J(): L14_2InvariantResult {
  const payload = buildPayload({
    channel: L14DeliveryChannel.DASHBOARD,
    delivery_class: L14DeliveryClass.CURRENT_STATE_CARD,
    audience: L14AudienceClass.END_USER,
    source_layer: 'L13',
    rendering_profile_class: L14RenderingProfileClass.DASHBOARD_CARD,
  });
  const v = validateL14DeliveryPayload(payload);
  // Missing replay hash flagged.
  const noHash = validateL14DeliveryPayload({ ...payload, replay_hash: '' });
  // Missing lineage flagged.
  const noLineage = validateL14DeliveryPayload({ ...payload, lineage_refs: [] });
  // Every registered profile must have id + class.
  const profilesRegistered = ALL_L14_DELIVERY_CHANNELS.every(c => l14DeliveryChannelRegistered(c));
  const allRenderingRegistered = Object.values(L14RenderingProfileClass).every(c => l14RenderingProfileRegistered(c));
  // Consumer contracts validate clean.
  const contractsClean = getL14DeliveryConsumerContracts().every(c => validateL14DeliveryConsumerContract(c).clean);
  return inv(
    'INV-14.2-J',
    'replay and lineage law',
    v.clean && !noHash.clean && !noLineage.clean && profilesRegistered && allRenderingRegistered && contractsClean,
    `payloadClean=${v.clean} noHashRejected=${!noHash.clean} noLineageRejected=${!noLineage.clean} contracts=${contractsClean}`,
  );
}

export function runAllL14_2Invariants(): readonly L14_2InvariantResult[] {
  return [
    checkINV_142_A(),
    checkINV_142_B(),
    checkINV_142_C(),
    checkINV_142_D(),
    checkINV_142_E(),
    checkINV_142_F(),
    checkINV_142_G(),
    checkINV_142_H(),
    checkINV_142_I(),
    checkINV_142_J(),
  ];
}
