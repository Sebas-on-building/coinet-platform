/**
 * L14.2 — Delivery Validators
 *
 * §14.2.24 — All seven per-shape validators consolidated into a
 * single module: channel, payload, consumer-contract, rendering,
 * entitlement, deliverability, channel-specific. Each is a pure
 * function returning {clean, issues}.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import { L14AudienceClass, l14AudienceIsInternal } from '../contracts/audience-class';
import {
  L14DeliverabilityStatus,
  l14StatusIsBlocking,
  l14StatusIsUserEmitting,
} from '../contracts/deliverability-status';
import { L14DeliverableSourceArtifactClass, l14SourceIsFinalL13UserEmittable } from '../contracts/deliverable-source-artifact';
import {
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
  type L14DeliveryChannelDefinition,
} from '../contracts/delivery-channel';
import { L14DeliveryClass } from '../contracts/delivery-class';
import type { L14DeliveryConsumerContract } from '../contracts/delivery-consumer-contract';
import type { L14DeliveryPayload } from '../contracts/delivery-payload';
import {
  L14EntitlementStatus,
  l14EntitlementIsClean,
  type L14DeliveryEntitlementProfile,
} from '../contracts/delivery-entitlement-profile';
import {
  L14RenderingProfileClass,
  type L14RenderingProfile,
} from '../contracts/rendering-profile';
import {
  getL14DeliveryChannelDefinition,
  l14DeliveryChannelRegistered,
} from '../registry/delivery-channel.registry';
import { getL14DeliveryConsumerContract } from '../registry/delivery-consumer-contract.registry';
import { l14RenderingProfileRegistered } from '../registry/rendering-profile.registry';
import { l14SourceArtifactRegistered } from '../registry/deliverable-source-artifact.registry';
import { L14DeliveryViolationCode } from './l14-delivery-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;
const C = L14DeliveryViolationCode;

export interface L14DeliveryIssue {
  readonly code: L14DeliveryViolationCode;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14DeliveryValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14DeliveryIssue[];
}

function result(issues: readonly L14DeliveryIssue[]): L14DeliveryValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: L14DeliveryViolationCode, severity: L14ConstitutionalAuditSeverity, message: string): L14DeliveryIssue {
  return { code, severity, message };
}

// ── 1. Channel ─────────────────────────────────────────────────────

export function validateL14DeliveryChannel(
  def: L14DeliveryChannelDefinition,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  if (!l14DeliveryChannelRegistered(def.channel)) {
    issues.push(err(C.L14D_CHANNEL_UNREGISTERED, SEV.ERROR, `channel ${def.channel} not registered`));
  }
  // Reserved channels must not be production-emissible.
  if (
    def.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE &&
    def.production_emissible
  ) {
    issues.push(err(C.L14D_RESERVED_CHANNEL_PRODUCTION_EMISSION, SEV.CRITICAL, `reserved channel ${def.channel} cannot be production-emissible`));
  }
  // Deprecated channels are blocked.
  if (def.channel_status === L14DeliveryChannelStatus.DEPRECATED_BLOCKED && def.production_emissible) {
    issues.push(err(C.L14D_CHANNEL_STATUS_ILLEGAL, SEV.CRITICAL, `deprecated channel ${def.channel} still emissible`));
  }
  // Internal-only must not be user-facing.
  if (def.internal_only && def.user_facing) {
    issues.push(err(C.L14D_INTERNAL_CONSOLE_USER_FACING_LEAK, SEV.CRITICAL, `channel ${def.channel} marked both internal_only and user_facing`));
  }
  return result(issues);
}

// ── 2. Consumer contract ───────────────────────────────────────────

export function validateL14DeliveryConsumerContract(
  c: L14DeliveryConsumerContract,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  if (!l14DeliveryChannelRegistered(c.channel)) {
    issues.push(err(C.L14D_CHANNEL_UNREGISTERED, SEV.ERROR, `contract channel ${c.channel} not registered`));
  }
  // AI chat must require final L13 artifact.
  if (c.channel === L14DeliveryChannel.AI_CHAT && !c.requires_final_l13_artifact) {
    issues.push(err(C.L14D_AI_CHAT_REQUIRES_FINAL_L13_ARTIFACT, SEV.CRITICAL, 'AI chat contract must require final L13 artifact'));
  }
  // Telegram must require final L13 alert artifact AND entitlement.
  if (c.channel === L14DeliveryChannel.TELEGRAM) {
    if (!c.requires_final_l13_artifact) {
      issues.push(err(C.L14D_TELEGRAM_REQUIRES_FINAL_L13_ALERT_ARTIFACT, SEV.CRITICAL, 'Telegram contract must require final L13 alert artifact'));
    }
    if (!c.requires_entitlement_profile) {
      issues.push(err(C.L14D_ENTITLEMENT_PROFILE_REQUIRED, SEV.CRITICAL, 'Telegram contract must require entitlement profile'));
    }
  }
  // Internal console must not be user-facing.
  if (
    c.channel === L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE &&
    c.may_serve_user_facing
  ) {
    issues.push(err(C.L14D_INTERNAL_CONSOLE_USER_FACING_LEAK, SEV.CRITICAL, 'internal console contract cannot be user-facing'));
  }
  // Reserved channels must not legally serve.
  if (
    c.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE &&
    (c.may_serve_user_facing || c.may_serve_internal_only)
  ) {
    issues.push(err(C.L14D_RESERVED_CHANNEL_PRODUCTION_EMISSION, SEV.CRITICAL, `reserved channel ${c.channel} cannot serve`));
  }
  return result(issues);
}

// ── 3. Rendering profile ──────────────────────────────────────────

export function validateL14RenderingProfile(
  p: L14RenderingProfile,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  if (!l14RenderingProfileRegistered(p.rendering_profile_class)) {
    issues.push(err(C.L14D_RENDERING_PROFILE_NOT_ALLOWED_FOR_CHANNEL, SEV.ERROR, `rendering profile ${p.rendering_profile_class} unregistered`));
  }
  // Non-mutation flags must be intact.
  if (!p.must_preserve_disclosures) issues.push(err(C.L14D_RENDERING_REMOVES_REQUIRED_DISCLOSURE, SEV.CRITICAL, 'rendering profile must preserve disclosures'));
  if (!p.must_preserve_restrictions) issues.push(err(C.L14D_RENDERING_REMOVES_RESTRICTION, SEV.CRITICAL, 'rendering profile must preserve restrictions'));
  if (!p.must_preserve_trigger_invalidation_state) issues.push(err(C.L14D_RENDERING_REMOVES_REQUIRED_DISCLOSURE, SEV.CRITICAL, 'rendering profile must preserve trigger/invalidation state'));
  if (!p.must_preserve_source_semantics) issues.push(err(C.L14D_RENDERING_REGENERATES_MEANING, SEV.CRITICAL, 'rendering profile must preserve source semantics'));
  // Mutation flags must be false.
  if (p.may_regenerate_language) issues.push(err(C.L14D_RENDERING_REGENERATES_MEANING, SEV.CRITICAL, 'rendering profile may not regenerate language'));
  if (p.may_intensify_urgency) issues.push(err(C.L14D_RENDERING_INTENSIFIES_URGENCY, SEV.CRITICAL, 'rendering profile may not intensify urgency'));
  if (p.may_convert_condition_to_certainty) issues.push(err(C.L14D_RENDERING_CONVERTS_CONDITIONAL_TO_CERTAINTY, SEV.CRITICAL, 'rendering profile may not convert conditional language to certainty'));
  return result(issues);
}

// ── 4. Rendering usage (per-event mutation flags) ─────────────────

export interface L14RenderingUsageInput {
  readonly profile_class: L14RenderingProfileClass;
  readonly channel: L14DeliveryChannel;
  readonly removed_required_disclosure?: boolean;
  readonly removed_restriction?: boolean;
  readonly regenerated_language?: boolean;
  readonly intensified_urgency?: boolean;
  readonly converted_condition_to_certainty?: boolean;
}

export function validateL14RenderingUsage(
  u: L14RenderingUsageInput,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  if (!l14RenderingProfileRegistered(u.profile_class)) {
    issues.push(err(C.L14D_RENDERING_PROFILE_NOT_ALLOWED_FOR_CHANNEL, SEV.ERROR, `rendering profile ${u.profile_class} unregistered`));
  }
  if (u.removed_required_disclosure) issues.push(err(C.L14D_RENDERING_REMOVES_REQUIRED_DISCLOSURE, SEV.CRITICAL, 'rendering removed required disclosure'));
  if (u.removed_restriction) issues.push(err(C.L14D_RENDERING_REMOVES_RESTRICTION, SEV.CRITICAL, 'rendering removed restriction'));
  if (u.regenerated_language) issues.push(err(C.L14D_RENDERING_REGENERATES_MEANING, SEV.CRITICAL, 'rendering regenerated meaning'));
  if (u.intensified_urgency) issues.push(err(C.L14D_RENDERING_INTENSIFIES_URGENCY, SEV.CRITICAL, 'rendering intensified urgency'));
  if (u.converted_condition_to_certainty) issues.push(err(C.L14D_RENDERING_CONVERTS_CONDITIONAL_TO_CERTAINTY, SEV.CRITICAL, 'rendering converted conditional to certainty'));
  return result(issues);
}

// ── 5. Entitlement ────────────────────────────────────────────────

export function validateL14DeliveryEntitlement(
  e: L14DeliveryEntitlementProfile,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  // Reserved channels never entitled.
  const def = getL14DeliveryChannelDefinition(e.channel);
  if (def?.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE) {
    if (e.entitlement_status !== L14EntitlementStatus.NOT_ENTITLED_CHANNEL_RESERVED) {
      issues.push(err(C.L14D_RESERVED_CHANNEL_PRODUCTION_EMISSION, SEV.CRITICAL, `reserved channel ${e.channel} entitlement must be NOT_ENTITLED_CHANNEL_RESERVED`));
    }
    return result(issues);
  }
  // Per-requirement checks.
  if (e.channel_opt_in_required && !e.channel_opt_in_present) {
    issues.push(err(C.L14D_ENTITLEMENT_OPT_IN_MISSING, SEV.ERROR, 'channel opt-in missing'));
  }
  if (e.watchlist_membership_required && !e.watchlist_membership_present) {
    issues.push(err(C.L14D_ENTITLEMENT_WATCHLIST_MISSING, SEV.ERROR, 'watchlist membership missing'));
  }
  if (e.subscription_required && !e.subscription_present) {
    issues.push(err(C.L14D_ENTITLEMENT_SUBSCRIPTION_MISSING, SEV.ERROR, 'subscription missing'));
  }
  if (e.internal_role_required && !e.internal_role_present) {
    issues.push(err(C.L14D_ENTITLEMENT_INTERNAL_ROLE_MISSING, SEV.ERROR, 'internal role missing'));
  }
  // Status must agree with flags.
  const allMet =
    (!e.channel_opt_in_required || e.channel_opt_in_present === true) &&
    (!e.watchlist_membership_required || e.watchlist_membership_present === true) &&
    (!e.subscription_required || e.subscription_present === true) &&
    (!e.internal_role_required || e.internal_role_present === true);
  if (allMet && !l14EntitlementIsClean(e.entitlement_status)) {
    issues.push(err(C.L14D_ENTITLEMENT_PROFILE_REQUIRED, SEV.ERROR, 'entitlement status inconsistent with met requirements'));
  }
  if (!allMet && l14EntitlementIsClean(e.entitlement_status)) {
    issues.push(err(C.L14D_ENTITLEMENT_PROFILE_REQUIRED, SEV.CRITICAL, 'entitlement status declared clean despite unmet requirements'));
  }
  return result(issues);
}

// ── 6. Delivery payload ───────────────────────────────────────────

export function validateL14DeliveryPayload(
  p: L14DeliveryPayload,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  if (!p.primary_source_artifact_ref) {
    issues.push(err(C.L14D_DELIVERY_PAYLOAD_SOURCE_MISSING, SEV.ERROR, 'primary_source_artifact_ref missing'));
  }
  if (!p.content_payload_ref) {
    issues.push(err(C.L14D_DELIVERY_PAYLOAD_CONTENT_REF_MISSING, SEV.ERROR, 'content_payload_ref missing'));
  }
  if (!p.disclosure_profile_ref) {
    issues.push(err(C.L14D_DELIVERY_PAYLOAD_DISCLOSURE_REF_MISSING, SEV.ERROR, 'disclosure_profile_ref missing'));
  }
  if (!p.restriction_profile_ref) {
    issues.push(err(C.L14D_DELIVERY_PAYLOAD_RESTRICTION_REF_MISSING, SEV.ERROR, 'restriction_profile_ref missing'));
  }
  if (!p.lineage_refs || p.lineage_refs.length === 0) {
    issues.push(err(C.L14D_DELIVERY_PAYLOAD_LINEAGE_MISSING, SEV.ERROR, 'lineage_refs empty'));
  }
  if (!p.replay_hash) {
    issues.push(err(C.L14D_DELIVERY_PAYLOAD_REPLAY_HASH_MISSING, SEV.ERROR, 'replay_hash missing'));
  }
  return result(issues);
}

// ── 7. Channel-specific delivery + deliverability status ──────────

export interface L14ChannelSpecificDeliveryInput {
  readonly payload: L14DeliveryPayload;
  readonly source_artifact_class: L14DeliverableSourceArtifactClass;
  readonly rendering_profile_class: L14RenderingProfileClass;
  readonly entitlement?: L14DeliveryEntitlementProfile;
  readonly restriction_blocking?: boolean;
}

function deriveExpectedStatus(
  channel: L14DeliveryChannel,
  channelDef: L14DeliveryChannelDefinition | undefined,
  contract: L14DeliveryConsumerContract | undefined,
  input: L14ChannelSpecificDeliveryInput,
): L14DeliverabilityStatus {
  if (!channelDef || !contract) return L14DeliverabilityStatus.BLOCKED_CHANNEL_CONTRACT;
  if (channelDef.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE) {
    return L14DeliverabilityStatus.BLOCKED_RESERVED_CHANNEL;
  }
  // Source artifact admissibility.
  if (!l14SourceArtifactRegistered(input.source_artifact_class)) {
    return L14DeliverabilityStatus.BLOCKED_UNGOVERNED_SOURCE;
  }
  if (!channelDef.allowed_source_artifact_classes.includes(input.source_artifact_class)) {
    return L14DeliverabilityStatus.BLOCKED_CHANNEL_CONTRACT;
  }
  // Final L13 artifact requirement.
  if (contract.requires_final_l13_artifact && !l14SourceIsFinalL13UserEmittable(input.source_artifact_class)) {
    return L14DeliverabilityStatus.BLOCKED_FINAL_ARTIFACT_REQUIRED;
  }
  // Delivery class admissibility.
  if (!channelDef.allowed_delivery_classes.includes(input.payload.delivery_class)) {
    return L14DeliverabilityStatus.BLOCKED_CHANNEL_CONTRACT;
  }
  // Audience admissibility.
  if (!channelDef.allowed_audience_classes.includes(input.payload.audience_class)) {
    return L14DeliverabilityStatus.BLOCKED_AUDIENCE_CLASS;
  }
  // Rendering profile admissibility.
  if (!contract.legal_rendering_profiles.includes(input.rendering_profile_class)) {
    return L14DeliverabilityStatus.BLOCKED_UNCERTIFIED_RENDERING_PROFILE;
  }
  if (!l14RenderingProfileRegistered(input.rendering_profile_class)) {
    return L14DeliverabilityStatus.BLOCKED_UNCERTIFIED_RENDERING_PROFILE;
  }
  // Entitlement requirement.
  if (contract.requires_entitlement_profile) {
    if (!input.entitlement) return L14DeliverabilityStatus.BLOCKED_ENTITLEMENT;
    if (!l14EntitlementIsClean(input.entitlement.entitlement_status)) {
      return L14DeliverabilityStatus.BLOCKED_ENTITLEMENT;
    }
  }
  // Restriction profile blocking.
  if (input.restriction_blocking) return L14DeliverabilityStatus.BLOCKED_RESTRICTION_PROFILE;
  // Internal-only consumer contracts never claim user-emitting status.
  if (contract.may_serve_internal_only && !contract.may_serve_user_facing) {
    return L14DeliverabilityStatus.INTERNAL_ONLY_DELIVERABLE;
  }
  return L14DeliverabilityStatus.DELIVERABLE_CLEAN;
}

export function validateL14ChannelSpecificDelivery(
  input: L14ChannelSpecificDeliveryInput,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  const channel = input.payload.delivery_channel;
  const def = getL14DeliveryChannelDefinition(channel);
  const contract = getL14DeliveryConsumerContract(channel);
  if (!def) {
    issues.push(err(C.L14D_CHANNEL_UNREGISTERED, SEV.ERROR, `channel ${channel} not registered`));
    return result(issues);
  }
  if (!contract) {
    issues.push(err(C.L14D_CHANNEL_UNREGISTERED, SEV.ERROR, `channel ${channel} has no consumer contract`));
    return result(issues);
  }
  // Reserved channel emission attempt.
  if (def.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE) {
    if (l14StatusIsUserEmitting(input.payload.deliverability_status)) {
      issues.push(err(C.L14D_RESERVED_CHANNEL_PRODUCTION_EMISSION, SEV.CRITICAL, `reserved channel ${channel} cannot have user-emitting status`));
    }
  }
  // Delivery class admissibility.
  if (!def.allowed_delivery_classes.includes(input.payload.delivery_class)) {
    issues.push(err(C.L14D_DELIVERY_CLASS_NOT_ALLOWED_FOR_CHANNEL, SEV.ERROR, `delivery class ${input.payload.delivery_class} not allowed for ${channel}`));
  }
  // Audience admissibility.
  if (!def.allowed_audience_classes.includes(input.payload.audience_class)) {
    issues.push(err(C.L14D_AUDIENCE_CLASS_NOT_ALLOWED_FOR_CHANNEL, SEV.ERROR, `audience ${input.payload.audience_class} not allowed for ${channel}`));
  }
  // Source artifact admissibility.
  if (!def.allowed_source_artifact_classes.includes(input.source_artifact_class)) {
    issues.push(err(C.L14D_SOURCE_ARTIFACT_NOT_ALLOWED_FOR_CHANNEL, SEV.ERROR, `source artifact ${input.source_artifact_class} not allowed for ${channel}`));
  }
  // Rendering profile admissibility.
  if (!contract.legal_rendering_profiles.includes(input.rendering_profile_class)) {
    issues.push(err(C.L14D_RENDERING_PROFILE_NOT_ALLOWED_FOR_CHANNEL, SEV.ERROR, `rendering profile ${input.rendering_profile_class} not allowed for ${channel}`));
  }
  // AI chat final-artifact law.
  if (channel === L14DeliveryChannel.AI_CHAT && !l14SourceIsFinalL13UserEmittable(input.source_artifact_class)) {
    issues.push(err(C.L14D_AI_CHAT_REQUIRES_FINAL_L13_ARTIFACT, SEV.CRITICAL, 'AI chat requires final L13 user-emittable artifact'));
  }
  // Telegram final-alert law.
  if (channel === L14DeliveryChannel.TELEGRAM && input.source_artifact_class !== L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT) {
    issues.push(err(C.L14D_TELEGRAM_REQUIRES_FINAL_L13_ALERT_ARTIFACT, SEV.CRITICAL, 'Telegram requires final L13 alert artifact'));
  }
  // Internal console user-facing leak.
  if (channel === L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE && !l14AudienceIsInternal(input.payload.audience_class)) {
    issues.push(err(C.L14D_INTERNAL_CONSOLE_USER_FACING_LEAK, SEV.CRITICAL, 'internal console payload targeted to non-internal audience'));
  }
  // Entitlement.
  if (contract.requires_entitlement_profile) {
    if (!input.entitlement) {
      issues.push(err(C.L14D_ENTITLEMENT_PROFILE_REQUIRED, SEV.CRITICAL, `channel ${channel} requires entitlement profile`));
    } else {
      const v = validateL14DeliveryEntitlement(input.entitlement);
      issues.push(...v.issues);
    }
  }
  // Internal-only payload must not be marked user-deliverable.
  if (
    !contract.may_serve_user_facing &&
    l14StatusIsUserEmitting(input.payload.deliverability_status)
  ) {
    issues.push(err(C.L14D_INTERNAL_ONLY_PAYLOAD_MARKED_USER_DELIVERABLE, SEV.CRITICAL, 'internal-only channel payload marked user-deliverable'));
  }
  // Deliverability status honesty.
  const expected = deriveExpectedStatus(channel, def, contract, input);
  const declared = input.payload.deliverability_status;
  // If derivation expects blocking but payload claims user-emitting → false green.
  if (l14StatusIsBlocking(expected) && l14StatusIsUserEmitting(declared)) {
    issues.push(err(C.L14D_DELIVERABILITY_STATUS_FALSE_GREEN, SEV.CRITICAL, `deliverability status false green (expected ${expected}, declared ${declared})`));
  }
  return result(issues);
}

// ── 8. Deliverability status validator ────────────────────────────

export function validateL14DeliverabilityStatus(
  status: L14DeliverabilityStatus,
  audience: L14AudienceClass,
): L14DeliveryValidationResult {
  const issues: L14DeliveryIssue[] = [];
  // Internal-only status must be paired with internal audience.
  if (
    status === L14DeliverabilityStatus.INTERNAL_ONLY_DELIVERABLE &&
    !l14AudienceIsInternal(audience)
  ) {
    issues.push(err(C.L14D_INTERNAL_ONLY_PAYLOAD_MARKED_USER_DELIVERABLE, SEV.CRITICAL, 'INTERNAL_ONLY_DELIVERABLE used with non-internal audience'));
  }
  return result(issues);
}
