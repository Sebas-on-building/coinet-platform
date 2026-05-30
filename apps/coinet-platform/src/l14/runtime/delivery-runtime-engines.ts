/**
 * L14.3 — Delivery Runtime Engines
 *
 * §14.3.14 — Pure-function engines for every runtime DAG stage.
 * All inputs are explicit; all outputs are typed records with
 * deterministic replay hashes.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14AudienceClass,
  l14AudienceIsInternal,
} from '../contracts/audience-class';
import {
  L14DeliverableSourceArtifactClass,
  l14SourceIsFinalL13UserEmittable,
} from '../contracts/deliverable-source-artifact';
import {
  L14DeliveryChannel,
  L14DeliveryChannelStatus,
} from '../contracts/delivery-channel';
import { L14DeliveryClass } from '../contracts/delivery-class';
import {
  L14DeliveryPriorityClass,
  L14DeliveryUrgencyClass,
} from '../contracts/delivery-priority';
import {
  L14DeliveryCandidateReasonCode,
  L14DeliveryCandidateStatus,
  L14DeliveryRuntimeTrigger,
  type L14DeliveryCandidate,
  type L14DeliveryRuntimeRequest,
} from '../contracts/delivery-runtime-request';
import {
  L14AudienceResolutionBasisCode,
  L14ChannelSelectionReasonCode,
  L14DeliveryEligibilityStatus,
  L14EligibilityBlockReasonCode,
  L14PreferenceBindingStatus,
  L14PreferenceBlockReasonCode,
  type L14AudienceResolutionResult,
  type L14ChannelResolutionResult,
  type L14DeliveryEligibilityResult,
  type L14PreferenceEntitlementBinding,
} from '../contracts/delivery-resolution';
import {
  L14_PRIORITY_FACTOR_WEIGHTS_V1,
  L14PriorityReasonCode,
  L14UrgencyReasonCode,
  type L14DeliveryPriorityProfile,
  type L14DeliveryUrgencyProfile,
} from '../contracts/delivery-priority-urgency';
import {
  L14CooldownOverrideReason,
  L14CooldownStatus,
  L14DeliveryDisposition,
  L14DeliveryDispositionReasonCode,
  L14DuplicationStatus,
  L14MergeReason,
  L14SuppressionReason,
  type L14CooldownEvaluationResult,
  type L14DeliveryDeduplicationKey,
  type L14DeliveryDispositionDecision,
  type L14DeliveryMergeRecord,
  type L14DeliverySuppressionRecord,
  type L14DuplicationCheckResult,
} from '../contracts/delivery-disposition';
import {
  L14DeliveryExecutionStatus,
  L14ExpectedInteractionType,
  L14ExpectedOutcomeEvaluationClass,
  L14FeedbackExpectationStatus,
  L14PayloadAssemblyStatus,
  type L14ChannelPayloadAssemblyResult,
  type L14DeliveryEventMaterializationIntent,
  type L14DeliveryExecutionRecord,
  type L14DeliveryFeedbackExpectation,
} from '../contracts/delivery-execution';
import {
  getL14DeliveryChannelDefinition,
  getL14DeliveryConsumerContract,
  l14SourceArtifactAllowedForChannel,
} from '../registry';

const POLICY_V = 'l14.runtime.v1';

// ── 1. Candidate Assembly ──────────────────────────────────────────

export interface L14CandidateAssemblyInput {
  readonly request: L14DeliveryRuntimeRequest;
}

function defaultDeliveryClass(
  src: L14DeliverableSourceArtifactClass,
  trigger: L14DeliveryRuntimeTrigger,
): L14DeliveryClass {
  switch (src) {
    case L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT:
      return L14DeliveryClass.ALERT_NOTIFICATION;
    case L14DeliverableSourceArtifactClass.L13_FINAL_CHAT_OUTPUT:
      return L14DeliveryClass.AI_CHAT_RESPONSE;
    case L14DeliverableSourceArtifactClass.L13_FINAL_REPORT_OUTPUT:
      return trigger === L14DeliveryRuntimeTrigger.USER_ON_DEMAND_VIEW
        ? L14DeliveryClass.TOKEN_REPORT_PAGE_PAYLOAD
        : L14DeliveryClass.CURRENT_STATE_CARD;
    case L14DeliverableSourceArtifactClass.L13_FINAL_COMPARISON_OUTPUT:
      return L14DeliveryClass.AI_CHAT_RESPONSE;
    case L14DeliverableSourceArtifactClass.L13_OUTPUT_QUALITY_FACT:
    case L14DeliverableSourceArtifactClass.L13_FEEDBACK_SUMMARY_FACT:
    case L14DeliverableSourceArtifactClass.L13_AUDIT_FACT:
      return L14DeliveryClass.ANALYST_REVIEW_PAYLOAD;
    case L14DeliverableSourceArtifactClass.L14_CALIBRATION_REVIEW_FACT:
      return L14DeliveryClass.CALIBRATION_REVIEW_PAYLOAD;
    default:
      return L14DeliveryClass.CURRENT_STATE_CARD;
  }
}

function candidateReason(
  src: L14DeliverableSourceArtifactClass,
  trigger: L14DeliveryRuntimeTrigger,
): readonly L14DeliveryCandidateReasonCode[] {
  const codes: L14DeliveryCandidateReasonCode[] = [];
  if (src === L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT) {
    codes.push(L14DeliveryCandidateReasonCode.SOURCE_IS_FINAL_L13_ALERT);
  }
  if (src === L14DeliverableSourceArtifactClass.L13_FINAL_CHAT_OUTPUT) {
    codes.push(L14DeliveryCandidateReasonCode.SOURCE_IS_FINAL_L13_CHAT_RESPONSE);
  }
  if (trigger === L14DeliveryRuntimeTrigger.SCENARIO_TRIGGER_ACTIVATED) {
    codes.push(L14DeliveryCandidateReasonCode.SOURCE_IS_SCENARIO_TRIGGER_EVENT);
  }
  if (trigger === L14DeliveryRuntimeTrigger.SCENARIO_INVALIDATION_ACTIVATED) {
    codes.push(L14DeliveryCandidateReasonCode.SOURCE_IS_SCENARIO_INVALIDATION_EVENT);
  }
  if (trigger === L14DeliveryRuntimeTrigger.SCORE_THRESHOLD_CROSSED) {
    codes.push(L14DeliveryCandidateReasonCode.SOURCE_IS_SCORE_SHIFT_EVENT);
  }
  if (trigger === L14DeliveryRuntimeTrigger.HYPOTHESIS_RANK_SHIFTED) {
    codes.push(L14DeliveryCandidateReasonCode.SOURCE_IS_HYPOTHESIS_SHIFT_EVENT);
  }
  if (
    src === L14DeliverableSourceArtifactClass.L13_OUTPUT_QUALITY_FACT ||
    src === L14DeliverableSourceArtifactClass.L13_FEEDBACK_SUMMARY_FACT ||
    src === L14DeliverableSourceArtifactClass.L13_AUDIT_FACT ||
    src === L14DeliverableSourceArtifactClass.L14_CALIBRATION_REVIEW_FACT
  ) {
    codes.push(L14DeliveryCandidateReasonCode.SOURCE_REQUIRES_INTERNAL_REVIEW);
  }
  return codes;
}

function legalChannelsForSource(
  src: L14DeliverableSourceArtifactClass,
): readonly L14DeliveryChannel[] {
  const channels: L14DeliveryChannel[] = [];
  for (const ch of [
    L14DeliveryChannel.DASHBOARD,
    L14DeliveryChannel.TOKEN_REPORT_PAGE,
    L14DeliveryChannel.AI_CHAT,
    L14DeliveryChannel.TELEGRAM,
    L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE,
  ]) {
    if (l14SourceArtifactAllowedForChannel(src, ch)) channels.push(ch);
  }
  return channels;
}

function legalAudienceForChannels(
  channels: readonly L14DeliveryChannel[],
): readonly L14AudienceClass[] {
  const set = new Set<L14AudienceClass>();
  for (const ch of channels) {
    const def = getL14DeliveryChannelDefinition(ch);
    if (def) for (const a of def.allowed_audience_classes) set.add(a);
  }
  return Array.from(set);
}

export function assembleL14DeliveryCandidate(
  input: L14CandidateAssemblyInput,
): L14DeliveryCandidate {
  const { request } = input;
  const channels = legalChannelsForSource(request.source_artifact_class);
  const audiences = legalAudienceForChannels(channels);
  const deliveryClass = defaultDeliveryClass(
    request.source_artifact_class,
    request.runtime_trigger,
  );
  const reasons = candidateReason(
    request.source_artifact_class,
    request.runtime_trigger,
  );
  let status: L14DeliveryCandidateStatus;
  if (channels.length === 0) {
    status = L14DeliveryCandidateStatus.INELIGIBLE_SOURCE;
  } else if (channels.every(c => {
    const def = getL14DeliveryChannelDefinition(c);
    return def?.internal_only === true;
  })) {
    status = L14DeliveryCandidateStatus.INTERNAL_REVIEW_ONLY;
  } else {
    status = L14DeliveryCandidateStatus.READY_FOR_ELIGIBILITY_CHECK;
  }
  const replayHash = fnv1a(
    [
      request.delivery_runtime_request_id,
      request.source_artifact_class,
      request.source_artifact_ref,
      deliveryClass,
      channels.slice().sort().join(','),
      audiences.slice().sort().join(','),
      reasons.slice().sort().join(','),
      status,
      POLICY_V,
    ].join('|'),
  );
  return {
    delivery_candidate_id: `l14.runtime.candidate.${replayHash}`,
    runtime_request_ref: request.delivery_runtime_request_id,
    source_artifact_class: request.source_artifact_class,
    source_artifact_ref: request.source_artifact_ref,
    supporting_source_artifact_refs: [],
    candidate_delivery_class: deliveryClass,
    candidate_channel_set: channels,
    candidate_audience_set: audiences,
    candidate_reason_codes: reasons,
    user_scope_ref: request.user_scope_ref,
    subject_scope_ref: request.subject_scope_ref,
    candidate_status: status,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 2. Eligibility ────────────────────────────────────────────────

export interface L14EligibilityInput {
  readonly candidate: L14DeliveryCandidate;
  readonly preferred_channel?: L14DeliveryChannel;
}

export function runL14DeliveryEligibility(
  input: L14EligibilityInput,
): L14DeliveryEligibilityResult {
  const c = input.candidate;
  const blocking: L14EligibilityBlockReasonCode[] = [];
  let status: L14DeliveryEligibilityStatus = L14DeliveryEligibilityStatus.ELIGIBLE;
  if (c.candidate_status === L14DeliveryCandidateStatus.INELIGIBLE_SOURCE) {
    blocking.push(L14EligibilityBlockReasonCode.UNGOVERNED_SOURCE);
    status = L14DeliveryEligibilityStatus.BLOCKED_UNGOVERNED_SOURCE;
  }
  // Final-L13 enforcement for AI_CHAT/TELEGRAM previewed at this stage.
  const preferred = input.preferred_channel;
  if (preferred === L14DeliveryChannel.AI_CHAT && !l14SourceIsFinalL13UserEmittable(c.source_artifact_class)) {
    blocking.push(L14EligibilityBlockReasonCode.FINAL_L13_REQUIRED);
    status = L14DeliveryEligibilityStatus.BLOCKED_FINAL_ARTIFACT_REQUIRED;
  }
  if (preferred === L14DeliveryChannel.TELEGRAM && c.source_artifact_class !== L14DeliverableSourceArtifactClass.L13_FINAL_ALERT_OUTPUT) {
    blocking.push(L14EligibilityBlockReasonCode.FINAL_L13_REQUIRED);
    status = L14DeliveryEligibilityStatus.BLOCKED_FINAL_ARTIFACT_REQUIRED;
  }
  if (preferred === L14DeliveryChannel.PUSH_ALERT) {
    blocking.push(L14EligibilityBlockReasonCode.RESERVED_CHANNEL_ROUTE);
    status = L14DeliveryEligibilityStatus.BLOCKED_RESERVED_CHANNEL_ONLY;
  }
  if (c.candidate_status === L14DeliveryCandidateStatus.INTERNAL_REVIEW_ONLY && preferred && preferred !== L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE) {
    blocking.push(L14EligibilityBlockReasonCode.INTERNAL_ONLY_SOURCE);
    status = L14DeliveryEligibilityStatus.BLOCKED_INTERNAL_ONLY;
  }
  if (c.lineage_refs.length === 0) {
    blocking.push(L14EligibilityBlockReasonCode.MISSING_LINEAGE);
  }
  const eligible = blocking.length === 0;
  const replayHash = fnv1a(
    [
      c.delivery_candidate_id,
      preferred ?? '',
      String(eligible),
      status,
      blocking.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  return {
    eligibility_result_id: `l14.runtime.eligibility.${replayHash}`,
    candidate_delivery_ref: c.delivery_candidate_id,
    eligible,
    eligibility_status: status,
    blocking_reason_codes: blocking,
    legal_delivery_classes: [c.candidate_delivery_class],
    legal_channel_candidates: c.candidate_channel_set,
    legal_audience_candidates: c.candidate_audience_set,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 3. Audience Resolution ────────────────────────────────────────

export function resolveL14Audience(
  candidate: L14DeliveryCandidate,
  hint?: L14AudienceClass,
): L14AudienceResolutionResult {
  let resolved: L14AudienceClass;
  const basis: L14AudienceResolutionBasisCode[] = [];
  if (hint && candidate.candidate_audience_set.includes(hint)) {
    resolved = hint;
    if (l14AudienceIsInternal(hint)) {
      basis.push(L14AudienceResolutionBasisCode.INTERNAL_ROLE_BOUND);
    } else if (hint === L14AudienceClass.ALERT_SUBSCRIBER) {
      basis.push(L14AudienceResolutionBasisCode.ALERT_SUBSCRIPTION);
    } else if (hint === L14AudienceClass.WATCHLIST_USER) {
      basis.push(L14AudienceResolutionBasisCode.USER_SCOPE_WATCHLIST);
    } else {
      basis.push(L14AudienceResolutionBasisCode.END_USER_BROADCAST);
    }
  } else if (candidate.candidate_status === L14DeliveryCandidateStatus.INTERNAL_REVIEW_ONLY) {
    resolved = L14AudienceClass.INTERNAL_ANALYST;
    basis.push(L14AudienceResolutionBasisCode.INTERNAL_ROLE_BOUND);
  } else if (candidate.candidate_audience_set.includes(L14AudienceClass.ALERT_SUBSCRIBER)) {
    resolved = L14AudienceClass.ALERT_SUBSCRIBER;
    basis.push(L14AudienceResolutionBasisCode.ALERT_SUBSCRIPTION);
  } else if (candidate.candidate_audience_set.includes(L14AudienceClass.WATCHLIST_USER)) {
    resolved = L14AudienceClass.WATCHLIST_USER;
    basis.push(L14AudienceResolutionBasisCode.USER_SCOPE_WATCHLIST);
  } else {
    resolved = candidate.candidate_audience_set[0] ?? L14AudienceClass.END_USER;
    basis.push(L14AudienceResolutionBasisCode.END_USER_BROADCAST);
  }
  const alternates = candidate.candidate_audience_set.filter(a => a !== resolved);
  const replayHash = fnv1a(
    [
      candidate.delivery_candidate_id,
      resolved,
      alternates.slice().sort().join(','),
      basis.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  return {
    audience_resolution_id: `l14.runtime.audience.${replayHash}`,
    candidate_delivery_ref: candidate.delivery_candidate_id,
    resolved_audience_class: resolved,
    alternate_allowed_audience_classes: alternates,
    resolution_basis_codes: basis,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 4. Channel Resolution ─────────────────────────────────────────

export function resolveL14Channel(
  candidate: L14DeliveryCandidate,
  audience: L14AudienceClass,
  preferred?: L14DeliveryChannel,
  trigger?: L14DeliveryRuntimeTrigger,
): L14ChannelResolutionResult {
  // Filter candidate channels by audience legality.
  const legal: L14DeliveryChannel[] = [];
  for (const ch of candidate.candidate_channel_set) {
    const def = getL14DeliveryChannelDefinition(ch);
    if (!def) continue;
    if (def.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE) continue;
    if (!def.allowed_audience_classes.includes(audience)) continue;
    legal.push(ch);
  }
  const reasons: L14ChannelSelectionReasonCode[] = [];
  let selected: L14DeliveryChannel;
  if (preferred && legal.includes(preferred)) {
    selected = preferred;
    reasons.push(L14ChannelSelectionReasonCode.PREFERRED_CHANNEL_HINT);
  } else if (l14AudienceIsInternal(audience)) {
    selected = L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE;
    reasons.push(L14ChannelSelectionReasonCode.INTERNAL_REVIEW_REQUIRED);
  } else if (trigger === L14DeliveryRuntimeTrigger.L13_ALERT_PAYLOAD_READY && legal.includes(L14DeliveryChannel.TELEGRAM)) {
    selected = L14DeliveryChannel.TELEGRAM;
    reasons.push(L14ChannelSelectionReasonCode.CANDIDATE_DELIVERY_CLASS_LEGAL);
  } else if (legal.length > 0) {
    selected = legal[0];
    reasons.push(L14ChannelSelectionReasonCode.CHANNEL_STATUS_PRODUCTION);
  } else {
    selected = L14DeliveryChannel.INTERNAL_ANALYST_CONSOLE;
    reasons.push(L14ChannelSelectionReasonCode.RESERVED_CHANNEL_REJECTED);
  }
  const alternates = legal.filter(c => c !== selected);
  const replayHash = fnv1a(
    [
      candidate.delivery_candidate_id,
      audience,
      selected,
      alternates.slice().sort().join(','),
      reasons.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  return {
    channel_resolution_id: `l14.runtime.channel.${replayHash}`,
    candidate_delivery_ref: candidate.delivery_candidate_id,
    selected_channel: selected,
    alternate_legal_channels: alternates,
    channel_selection_reason_codes: reasons,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 5. Preference / Entitlement Binding ───────────────────────────

export interface L14PreferenceBindingInput {
  readonly candidate: L14DeliveryCandidate;
  readonly channel: L14DeliveryChannel;
  readonly audience: L14AudienceClass;
  readonly entitlement_profile_ref: string;
  readonly preference_profile_ref?: string;
  readonly channel_enabled: boolean;
  readonly alert_class_enabled: boolean;
  readonly quiet_hours_active: boolean;
  readonly frequency_cap_reached: boolean;
  readonly entitlement_clean: boolean;
}

export function bindL14PreferenceEntitlement(
  input: L14PreferenceBindingInput,
): L14PreferenceEntitlementBinding {
  const blocking: L14PreferenceBlockReasonCode[] = [];
  let status: L14PreferenceBindingStatus = L14PreferenceBindingStatus.CLEAN;
  if (!input.channel_enabled) {
    blocking.push(L14PreferenceBlockReasonCode.CHANNEL_MUTED);
    status = L14PreferenceBindingStatus.MUTED_CHANNEL;
  } else if (!input.alert_class_enabled) {
    blocking.push(L14PreferenceBlockReasonCode.ALERT_CLASS_MUTED);
    status = L14PreferenceBindingStatus.MUTED_ALERT_CLASS;
  } else if (input.quiet_hours_active) {
    blocking.push(L14PreferenceBlockReasonCode.QUIET_HOURS);
    status = L14PreferenceBindingStatus.QUIET_HOURS_ACTIVE;
  } else if (input.frequency_cap_reached) {
    blocking.push(L14PreferenceBlockReasonCode.FREQUENCY_CAP);
    status = L14PreferenceBindingStatus.FREQUENCY_CAP_REACHED;
  } else if (!input.entitlement_clean) {
    blocking.push(L14PreferenceBlockReasonCode.ENTITLEMENT_MISSING);
    status = L14PreferenceBindingStatus.ENTITLEMENT_BLOCKED;
  }
  const replayHash = fnv1a(
    [
      input.candidate.delivery_candidate_id,
      input.channel,
      input.audience,
      input.entitlement_profile_ref,
      String(input.channel_enabled),
      String(input.alert_class_enabled),
      String(input.quiet_hours_active),
      String(input.frequency_cap_reached),
      String(input.entitlement_clean),
      status,
      POLICY_V,
    ].join('|'),
  );
  return {
    preference_binding_id: `l14.runtime.preference.${replayHash}`,
    candidate_delivery_ref: input.candidate.delivery_candidate_id,
    channel: input.channel,
    audience_class: input.audience,
    entitlement_profile_ref: input.entitlement_profile_ref,
    preference_profile_ref: input.preference_profile_ref,
    channel_enabled: input.channel_enabled,
    alert_class_enabled: input.alert_class_enabled,
    quiet_hours_active: input.quiet_hours_active,
    frequency_cap_reached: input.frequency_cap_reached,
    preference_binding_status: status,
    blocking_reason_codes: blocking,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 6. Priority Derivation ────────────────────────────────────────

export interface L14PriorityInput {
  readonly candidate: L14DeliveryCandidate;
  readonly trigger: L14DeliveryRuntimeTrigger;
  readonly source_importance_score: number;
  readonly scenario_shift_score: number;
  readonly trigger_invalidation_score: number;
  readonly score_change_significance_score: number;
  readonly confidence_readiness_score: number;
  readonly novelty_score: number;
  readonly historical_usefulness_score?: number;
  readonly audience_relevance_score: number;
  readonly restriction_cap_applies?: boolean;
  readonly low_confidence_cap_applies?: boolean;
  readonly internal_only_posture?: boolean;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

function priorityClassFromScore(score: number): L14DeliveryPriorityClass {
  if (score >= 90) return L14DeliveryPriorityClass.CRITICAL;
  if (score >= 75) return L14DeliveryPriorityClass.HIGH;
  if (score >= 55) return L14DeliveryPriorityClass.MATERIAL;
  if (score >= 35) return L14DeliveryPriorityClass.ROUTINE;
  if (score >= 1) return L14DeliveryPriorityClass.LOW;
  return L14DeliveryPriorityClass.SUPPRESSED;
}

export function deriveL14DeliveryPriority(
  input: L14PriorityInput,
): L14DeliveryPriorityProfile {
  const w = L14_PRIORITY_FACTOR_WEIGHTS_V1;
  const raw =
    w.source_importance_score * clamp01(input.source_importance_score) +
    w.scenario_shift_score * clamp01(input.scenario_shift_score) +
    w.trigger_invalidation_score * clamp01(input.trigger_invalidation_score) +
    w.score_change_significance_score *
      clamp01(input.score_change_significance_score) +
    w.confidence_readiness_score * clamp01(input.confidence_readiness_score) +
    w.novelty_score * clamp01(input.novelty_score) +
    w.audience_relevance_score * clamp01(input.audience_relevance_score);
  const reasons: L14PriorityReasonCode[] = [];
  if (clamp01(input.source_importance_score) >= 70) reasons.push(L14PriorityReasonCode.SOURCE_IMPORTANCE_HIGH);
  if (clamp01(input.scenario_shift_score) >= 60) reasons.push(L14PriorityReasonCode.SCENARIO_SHIFT_MATERIAL);
  if (clamp01(input.trigger_invalidation_score) >= 60) reasons.push(L14PriorityReasonCode.TRIGGER_OR_INVALIDATION_ACTIVE);
  if (clamp01(input.score_change_significance_score) >= 60) reasons.push(L14PriorityReasonCode.SCORE_CHANGE_MATERIAL);
  if (clamp01(input.confidence_readiness_score) <= 40) reasons.push(L14PriorityReasonCode.CONFIDENCE_READINESS_LOW);
  if (clamp01(input.novelty_score) >= 70) reasons.push(L14PriorityReasonCode.NOVELTY_HIGH);
  if (clamp01(input.audience_relevance_score) >= 70) reasons.push(L14PriorityReasonCode.AUDIENCE_RELEVANCE_HIGH);
  if (input.historical_usefulness_score === undefined) {
    reasons.push(L14PriorityReasonCode.HISTORICAL_USEFULNESS_UNAVAILABLE);
  }
  let final = clamp01(raw);
  let capped_by_restriction = false;
  let capped_by_low_confidence = false;
  let capped_by_internal_only_posture = false;
  if (input.restriction_cap_applies) {
    final = Math.min(final, 54); // cap below HIGH
    capped_by_restriction = true;
    reasons.push(L14PriorityReasonCode.RESTRICTION_CAP_APPLIED);
  }
  if (input.low_confidence_cap_applies) {
    final = Math.min(final, 34); // cap to LOW
    capped_by_low_confidence = true;
  }
  if (input.internal_only_posture) {
    final = Math.min(final, 34);
    capped_by_internal_only_posture = true;
    reasons.push(L14PriorityReasonCode.INTERNAL_ONLY_CAP_APPLIED);
  }
  const cls = priorityClassFromScore(final);
  const replayHash = fnv1a(
    [
      input.candidate.delivery_candidate_id,
      input.trigger,
      String(raw),
      String(final),
      cls,
      reasons.slice().sort().join(','),
      String(capped_by_restriction),
      String(capped_by_low_confidence),
      String(capped_by_internal_only_posture),
      POLICY_V,
    ].join('|'),
  );
  return {
    priority_profile_id: `l14.runtime.priority.${replayHash}`,
    candidate_delivery_ref: input.candidate.delivery_candidate_id,
    source_importance_score: clamp01(input.source_importance_score),
    scenario_shift_score: clamp01(input.scenario_shift_score),
    trigger_invalidation_score: clamp01(input.trigger_invalidation_score),
    score_change_significance_score: clamp01(input.score_change_significance_score),
    confidence_readiness_score: clamp01(input.confidence_readiness_score),
    novelty_score: clamp01(input.novelty_score),
    historical_usefulness_score: input.historical_usefulness_score,
    audience_relevance_score: clamp01(input.audience_relevance_score),
    raw_priority_score: clamp01(raw),
    final_priority_score: final,
    priority_class: cls,
    priority_reason_codes: reasons,
    capped_by_restriction,
    capped_by_low_confidence,
    capped_by_internal_only_posture,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 7. Urgency Derivation ─────────────────────────────────────────

export interface L14UrgencyInput {
  readonly candidate: L14DeliveryCandidate;
  readonly priority_profile: L14DeliveryPriorityProfile;
  readonly time_sensitivity_score: number;
  readonly decay_risk_score: number;
  readonly trigger_recency_score: number;
  readonly audience_time_relevance_score: number;
  readonly active_invalidation?: boolean;
  readonly severe_trigger?: boolean;
  readonly on_demand_surface?: boolean;
  readonly digest_eligible_only?: boolean;
  readonly restriction_cap?: boolean;
  readonly quiet_hours_cap?: boolean;
}

export function deriveL14DeliveryUrgency(
  input: L14UrgencyInput,
): L14DeliveryUrgencyProfile {
  const reasons: L14UrgencyReasonCode[] = [];
  let cls: L14DeliveryUrgencyClass;
  if (input.on_demand_surface) {
    cls = L14DeliveryUrgencyClass.ON_DEMAND_ONLY;
    reasons.push(L14UrgencyReasonCode.ON_DEMAND_SURFACE);
  } else if (input.active_invalidation || input.severe_trigger || input.priority_profile.priority_class === L14DeliveryPriorityClass.CRITICAL) {
    cls = L14DeliveryUrgencyClass.IMMEDIATE;
    if (input.active_invalidation) reasons.push(L14UrgencyReasonCode.ACTIVE_INVALIDATION);
    if (input.severe_trigger) reasons.push(L14UrgencyReasonCode.SEVERE_TRIGGER);
    if (input.priority_profile.priority_class === L14DeliveryPriorityClass.CRITICAL) {
      reasons.push(L14UrgencyReasonCode.HIGH_PRIORITY_ALERT);
    }
  } else if (input.priority_profile.priority_class === L14DeliveryPriorityClass.HIGH) {
    cls = L14DeliveryUrgencyClass.NEAR_REAL_TIME;
    reasons.push(L14UrgencyReasonCode.HIGH_PRIORITY_ALERT);
  } else if (input.digest_eligible_only || input.priority_profile.priority_class === L14DeliveryPriorityClass.MATERIAL || input.priority_profile.priority_class === L14DeliveryPriorityClass.ROUTINE) {
    cls = L14DeliveryUrgencyClass.DIGEST_ELIGIBLE;
    reasons.push(L14UrgencyReasonCode.MATERIAL_SCORE_SHIFT);
  } else {
    cls = L14DeliveryUrgencyClass.ON_DEMAND_ONLY;
    reasons.push(L14UrgencyReasonCode.ROUTINE_STATE_CHANGE);
  }
  if (input.restriction_cap && cls === L14DeliveryUrgencyClass.IMMEDIATE) {
    cls = L14DeliveryUrgencyClass.NEAR_REAL_TIME;
    reasons.push(L14UrgencyReasonCode.RESTRICTION_CAP_APPLIED);
  }
  if (input.quiet_hours_cap && (cls === L14DeliveryUrgencyClass.IMMEDIATE || cls === L14DeliveryUrgencyClass.NEAR_REAL_TIME)) {
    cls = L14DeliveryUrgencyClass.DIGEST_ELIGIBLE;
    reasons.push(L14UrgencyReasonCode.QUIET_HOURS_CAP_APPLIED);
  }
  const replayHash = fnv1a(
    [
      input.candidate.delivery_candidate_id,
      input.priority_profile.priority_profile_id,
      cls,
      reasons.slice().sort().join(','),
      String(input.restriction_cap ?? false),
      String(input.quiet_hours_cap ?? false),
      POLICY_V,
    ].join('|'),
  );
  return {
    urgency_profile_id: `l14.runtime.urgency.${replayHash}`,
    candidate_delivery_ref: input.candidate.delivery_candidate_id,
    time_sensitivity_score: clamp01(input.time_sensitivity_score),
    decay_risk_score: clamp01(input.decay_risk_score),
    trigger_recency_score: clamp01(input.trigger_recency_score),
    audience_time_relevance_score: clamp01(input.audience_time_relevance_score),
    urgency_class: cls,
    urgency_reason_codes: reasons,
    urgency_capped_by_restriction: input.restriction_cap === true,
    urgency_capped_by_quiet_hours: input.quiet_hours_cap === true,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 8. Deduplication + Cooldown ───────────────────────────────────

export interface L14DeduplicationInput {
  readonly candidate: L14DeliveryCandidate;
  readonly channel: L14DeliveryChannel;
  readonly audience: L14AudienceClass;
  readonly semantic_cluster_key: string;
  readonly event_family_key: string;
  readonly matched_delivery_refs?: readonly string[];
  readonly near_duplicate?: boolean;
  readonly materially_new_invalidation?: boolean;
  readonly materially_new_trigger?: boolean;
}

export function buildL14DeduplicationKey(input: L14DeduplicationInput): L14DeliveryDeduplicationKey {
  const replayHash = fnv1a(
    [
      input.channel,
      input.audience,
      input.candidate.user_scope_ref ?? '',
      input.candidate.subject_scope_ref ?? '',
      input.candidate.candidate_delivery_class,
      input.candidate.source_artifact_class,
      input.semantic_cluster_key,
      input.event_family_key,
      POLICY_V,
    ].join('|'),
  );
  return {
    deduplication_key_id: `l14.runtime.dedup.${replayHash}`,
    channel: input.channel,
    audience_class: input.audience,
    user_scope_ref: input.candidate.user_scope_ref,
    subject_scope_ref: input.candidate.subject_scope_ref,
    delivery_class: input.candidate.candidate_delivery_class,
    source_artifact_class: input.candidate.source_artifact_class,
    semantic_cluster_key: input.semantic_cluster_key,
    event_family_key: input.event_family_key,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

export function checkL14Duplication(
  input: L14DeduplicationInput,
  key: L14DeliveryDeduplicationKey,
): L14DuplicationCheckResult {
  const matches = input.matched_delivery_refs ?? [];
  let status: L14DuplicationStatus = L14DuplicationStatus.NO_DUPLICATE;
  if (matches.length > 0) {
    status = input.near_duplicate ? L14DuplicationStatus.NEAR_DUPLICATE : L14DuplicationStatus.EXACT_DUPLICATE;
  }
  const replayHash = fnv1a(
    [
      input.candidate.delivery_candidate_id,
      key.deduplication_key_id,
      status,
      matches.slice().sort().join(','),
      String(input.materially_new_invalidation ?? false),
      String(input.materially_new_trigger ?? false),
      POLICY_V,
    ].join('|'),
  );
  return {
    duplication_result_id: `l14.runtime.dupresult.${replayHash}`,
    candidate_delivery_ref: input.candidate.delivery_candidate_id,
    deduplication_key_ref: key.deduplication_key_id,
    status,
    matched_delivery_refs: matches,
    materially_new_invalidation: input.materially_new_invalidation === true,
    materially_new_trigger: input.materially_new_trigger === true,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

export interface L14CooldownInput {
  readonly candidate: L14DeliveryCandidate;
  readonly dedup_key: L14DeliveryDeduplicationKey;
  readonly cooldown_window_ms: number;
  readonly last_delivery_ref?: string;
  readonly last_delivery_at?: string;
  readonly cooldown_active: boolean;
  readonly priority_class: L14DeliveryPriorityClass;
  readonly new_invalidation?: boolean;
  readonly material_contradiction_change?: boolean;
}

export function evaluateL14Cooldown(input: L14CooldownInput): L14CooldownEvaluationResult {
  let status: L14CooldownStatus;
  let override: L14CooldownOverrideReason | undefined;
  let overrideAllowed = false;
  if (!input.cooldown_active) {
    status = L14CooldownStatus.NO_COOLDOWN_MATCH;
  } else if (input.priority_class === L14DeliveryPriorityClass.CRITICAL) {
    status = L14CooldownStatus.COOLDOWN_OVERRIDE_CRITICAL_ESCALATION;
    override = L14CooldownOverrideReason.CRITICAL_ESCALATION;
    overrideAllowed = true;
  } else if (input.new_invalidation) {
    status = L14CooldownStatus.COOLDOWN_OVERRIDE_NEW_INVALIDATION;
    override = L14CooldownOverrideReason.NEW_INVALIDATION;
    overrideAllowed = true;
  } else if (input.material_contradiction_change) {
    status = L14CooldownStatus.COOLDOWN_OVERRIDE_MATERIAL_CONTRADICTION_CHANGE;
    override = L14CooldownOverrideReason.MATERIAL_CONTRADICTION_CHANGE;
    overrideAllowed = true;
  } else {
    status = L14CooldownStatus.COOLDOWN_ACTIVE;
  }
  const replayHash = fnv1a(
    [
      input.candidate.delivery_candidate_id,
      input.dedup_key.deduplication_key_id,
      String(input.cooldown_window_ms),
      input.last_delivery_ref ?? '',
      status,
      override ?? '',
      POLICY_V,
    ].join('|'),
  );
  return {
    cooldown_evaluation_id: `l14.runtime.cooldown.${replayHash}`,
    candidate_delivery_ref: input.candidate.delivery_candidate_id,
    deduplication_key_ref: input.dedup_key.deduplication_key_id,
    cooldown_window_ms: input.cooldown_window_ms,
    last_delivery_ref: input.last_delivery_ref,
    last_delivery_at: input.last_delivery_at,
    cooldown_active: input.cooldown_active,
    cooldown_override_allowed: overrideAllowed,
    cooldown_override_reason: override,
    result_status: status,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 9. Suppression + Merge + Disposition ──────────────────────────

export interface L14SuppressionInput {
  readonly candidate: L14DeliveryCandidate;
  readonly channel: L14DeliveryChannel;
  readonly audience: L14AudienceClass;
  readonly preference: L14PreferenceEntitlementBinding;
  readonly duplication: L14DuplicationCheckResult;
  readonly cooldown: L14CooldownEvaluationResult;
  readonly urgency: L14DeliveryUrgencyProfile;
  readonly priority: L14DeliveryPriorityProfile;
  readonly low_delivery_confidence?: boolean;
  readonly restriction_profile_blocked?: boolean;
  readonly internal_review_only?: boolean;
  readonly known_noisy_class?: boolean;
  readonly digest_downgrade?: boolean;
}

function suppressionRecord(
  candidate: L14DeliveryCandidate,
  channel: L14DeliveryChannel,
  reason: L14SuppressionReason,
  could_be_delivered_later: boolean,
  digest_eligible: boolean,
): L14DeliverySuppressionRecord {
  const replayHash = fnv1a(
    [
      candidate.delivery_candidate_id,
      channel,
      reason,
      String(could_be_delivered_later),
      String(digest_eligible),
      POLICY_V,
    ].join('|'),
  );
  return {
    suppression_id: `l14.runtime.suppress.${replayHash}`,
    candidate_delivery_ref: candidate.delivery_candidate_id,
    suppression_reason: reason,
    suppression_policy_ref: 'l14.suppression.policy.v1',
    user_scope_ref: candidate.user_scope_ref,
    channel,
    could_be_delivered_later,
    digest_eligible,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

export interface L14SuppressionDecisionOutput {
  readonly decision: L14DeliveryDispositionDecision;
  readonly suppression?: L14DeliverySuppressionRecord;
}

export function decideL14Disposition(
  input: L14SuppressionInput,
): L14SuppressionDecisionOutput {
  const candidate = input.candidate;
  const channel = input.channel;
  const reasons: L14DeliveryDispositionReasonCode[] = [];
  let disposition: L14DeliveryDisposition;
  let suppression: L14DeliverySuppressionRecord | undefined;
  // Reserved channel blocking is highest precedence.
  const channelDef = getL14DeliveryChannelDefinition(channel);
  if (channelDef?.channel_status === L14DeliveryChannelStatus.RESERVED_NOT_EMISSIBLE) {
    disposition = L14DeliveryDisposition.BLOCKED_ILLEGAL_DELIVERY;
    reasons.push(L14DeliveryDispositionReasonCode.CHANNEL_RESERVED_BLOCK);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.CHANNEL_RESERVED, false, false);
  } else if (input.restriction_profile_blocked) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.RESTRICTION_PROFILE_BLOCK);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.RESTRICTION_PROFILE_BLOCKED, false, false);
  } else if (input.internal_review_only || channelDef?.internal_only) {
    disposition = L14DeliveryDisposition.INTERNAL_REVIEW_ONLY;
    reasons.push(L14DeliveryDispositionReasonCode.INTERNAL_REVIEW_ROUTE);
  } else if (input.duplication.status === L14DuplicationStatus.EXACT_DUPLICATE && !input.duplication.materially_new_invalidation && !input.duplication.materially_new_trigger) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.DUPLICATE_SUPPRESSED);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.DUPLICATE_ALERT, false, false);
  } else if (input.cooldown.result_status === L14CooldownStatus.COOLDOWN_ACTIVE) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.COOLDOWN_SUPPRESSED);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.COOLDOWN_ACTIVE, true, true);
  } else if (input.preference.preference_binding_status === L14PreferenceBindingStatus.MUTED_CHANNEL) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.MUTED_CHANNEL_SUPPRESSED);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.USER_MUTED_CHANNEL, false, false);
  } else if (input.preference.preference_binding_status === L14PreferenceBindingStatus.MUTED_ALERT_CLASS) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.MUTED_CHANNEL_SUPPRESSED);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.USER_MUTED_ALERT_CLASS, false, false);
  } else if (input.preference.preference_binding_status === L14PreferenceBindingStatus.QUIET_HOURS_ACTIVE) {
    // Defer to digest unless critical.
    if (input.priority.priority_class === L14DeliveryPriorityClass.CRITICAL) {
      disposition = L14DeliveryDisposition.EXECUTE_IMMEDIATELY;
      reasons.push(L14DeliveryDispositionReasonCode.CRITICAL_INVALIDATION);
    } else {
      disposition = L14DeliveryDisposition.DEFER_TO_DIGEST;
      reasons.push(L14DeliveryDispositionReasonCode.QUIET_HOURS_DEFER);
      suppression = suppressionRecord(candidate, channel, L14SuppressionReason.QUIET_HOURS_ACTIVE, true, true);
    }
  } else if (input.preference.preference_binding_status === L14PreferenceBindingStatus.FREQUENCY_CAP_REACHED) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.FREQUENCY_CAP_SUPPRESSED);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.FREQUENCY_CAP_REACHED, true, true);
  } else if (input.preference.preference_binding_status === L14PreferenceBindingStatus.ENTITLEMENT_BLOCKED) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.ENTITLEMENT_SUPPRESSED);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.ENTITLEMENT_NOT_SATISFIED, false, false);
  } else if (input.low_delivery_confidence) {
    disposition = L14DeliveryDisposition.SUPPRESS_WITH_RECORD;
    reasons.push(L14DeliveryDispositionReasonCode.RESTRICTION_PROFILE_BLOCK);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.LOW_DELIVERY_CONFIDENCE, false, false);
  } else if (input.known_noisy_class) {
    disposition = L14DeliveryDisposition.DEFER_TO_DIGEST;
    reasons.push(L14DeliveryDispositionReasonCode.MATERIAL_DIGEST);
    suppression = suppressionRecord(candidate, channel, L14SuppressionReason.KNOWN_NOISY_ALERT_CLASS_LIMITED, true, true);
  } else if (input.digest_downgrade || input.urgency.urgency_class === L14DeliveryUrgencyClass.DIGEST_ELIGIBLE) {
    disposition = L14DeliveryDisposition.DEFER_TO_DIGEST;
    reasons.push(L14DeliveryDispositionReasonCode.MATERIAL_DIGEST);
  } else if (input.urgency.urgency_class === L14DeliveryUrgencyClass.IMMEDIATE) {
    disposition = L14DeliveryDisposition.EXECUTE_IMMEDIATELY;
    reasons.push(L14DeliveryDispositionReasonCode.CRITICAL_INVALIDATION);
  } else if (input.urgency.urgency_class === L14DeliveryUrgencyClass.NEAR_REAL_TIME) {
    disposition = L14DeliveryDisposition.EXECUTE_NEAR_REAL_TIME;
    reasons.push(L14DeliveryDispositionReasonCode.HIGH_PRIORITY_IMMEDIATE);
  } else {
    // ON_DEMAND_ONLY → internal review only (analyst/dashboard surfaces don't push).
    disposition = L14DeliveryDisposition.INTERNAL_REVIEW_ONLY;
    reasons.push(L14DeliveryDispositionReasonCode.INTERNAL_REVIEW_ROUTE);
  }
  const replayHash = fnv1a(
    [
      candidate.delivery_candidate_id,
      channel,
      disposition,
      reasons.slice().sort().join(','),
      suppression?.suppression_id ?? '',
      POLICY_V,
    ].join('|'),
  );
  const decision: L14DeliveryDispositionDecision = {
    disposition_decision_id: `l14.runtime.disposition.${replayHash}`,
    candidate_delivery_ref: candidate.delivery_candidate_id,
    disposition,
    suppression_record_ref: suppression?.suppression_id,
    decision_reason_codes: reasons,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
  return { decision, suppression };
}

// ── Merge helper ──────────────────────────────────────────────────

export function buildL14MergeRecord(
  source_candidates: readonly L14DeliveryCandidate[],
  merged_candidate_ref: string,
  reason: L14MergeReason,
  digest_eligible: boolean,
): L14DeliveryMergeRecord {
  const refs = source_candidates.map(c => c.delivery_candidate_id);
  const replayHash = fnv1a(
    [
      refs.slice().sort().join(','),
      merged_candidate_ref,
      reason,
      String(digest_eligible),
      POLICY_V,
    ].join('|'),
  );
  return {
    merge_record_id: `l14.runtime.merge.${replayHash}`,
    source_candidate_refs: refs,
    merged_delivery_candidate_ref: merged_candidate_ref,
    merge_reason: reason,
    digest_eligible,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 10. Payload Assembly ──────────────────────────────────────────

export interface L14PayloadAssemblyInput {
  readonly candidate: L14DeliveryCandidate;
  readonly disposition: L14DeliveryDispositionDecision;
  readonly delivery_payload_ref: string;
  readonly rendering_profile_ref: string;
  readonly disclosure_profile_ref: string;
  readonly restriction_profile_ref: string;
  readonly channel: L14DeliveryChannel;
  readonly delivery_class: L14DeliveryClass;
  readonly source_semantics_at_risk?: boolean;
  readonly rendering_profile_missing?: boolean;
  readonly with_disclosure?: boolean;
}

export function assembleL14ChannelPayload(
  input: L14PayloadAssemblyInput,
): L14ChannelPayloadAssemblyResult {
  let status: L14PayloadAssemblyStatus;
  if (input.disposition.disposition === L14DeliveryDisposition.BLOCKED_ILLEGAL_DELIVERY) {
    status = L14PayloadAssemblyStatus.BLOCKED_RENDERING_CONTRACT;
  } else if (input.rendering_profile_missing) {
    status = L14PayloadAssemblyStatus.BLOCKED_MISSING_RENDERING_PROFILE;
  } else if (input.source_semantics_at_risk) {
    status = L14PayloadAssemblyStatus.BLOCKED_SOURCE_SEMANTICS_RISK;
  } else if (input.with_disclosure) {
    status = L14PayloadAssemblyStatus.ASSEMBLED_WITH_DISCLOSURE;
  } else {
    status = L14PayloadAssemblyStatus.ASSEMBLED_CLEAN;
  }
  const replayHash = fnv1a(
    [
      input.candidate.delivery_candidate_id,
      input.disposition.disposition_decision_id,
      input.delivery_payload_ref,
      input.rendering_profile_ref,
      input.channel,
      input.delivery_class,
      status,
      POLICY_V,
    ].join('|'),
  );
  return {
    payload_assembly_id: `l14.runtime.assembly.${replayHash}`,
    candidate_delivery_ref: input.candidate.delivery_candidate_id,
    disposition_decision_ref: input.disposition.disposition_decision_id,
    delivery_payload_ref: input.delivery_payload_ref,
    channel_payload_ref: `l14.channel.payload.${replayHash}`,
    channel: input.channel,
    delivery_class: input.delivery_class,
    rendering_profile_ref: input.rendering_profile_ref,
    disclosure_profile_ref: input.disclosure_profile_ref,
    restriction_profile_ref: input.restriction_profile_ref,
    assembly_status: status,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 11. Execution ─────────────────────────────────────────────────

export interface L14ExecutionInput {
  readonly assembly: L14ChannelPayloadAssemblyResult;
  readonly disposition: L14DeliveryDispositionDecision;
  readonly executed?: boolean;
  readonly provider_failed?: boolean;
  readonly retry_eligible?: boolean;
  readonly retry_count?: number;
  readonly failure_reasons?: readonly string[];
  readonly provider_message_ref?: string;
  readonly sent_at?: string;
  readonly failed_at?: string;
}

export function executeL14Delivery(
  input: L14ExecutionInput,
): L14DeliveryExecutionRecord {
  let status: L14DeliveryExecutionStatus;
  if (input.disposition.disposition === L14DeliveryDisposition.BLOCKED_ILLEGAL_DELIVERY) {
    status = L14DeliveryExecutionStatus.BLOCKED_BEFORE_PROVIDER;
  } else if (input.disposition.disposition === L14DeliveryDisposition.SUPPRESS_WITH_RECORD || input.disposition.disposition === L14DeliveryDisposition.INTERNAL_REVIEW_ONLY) {
    status = L14DeliveryExecutionStatus.CANCELLED_BY_SUPPRESSION_REEVALUATION;
  } else if (input.provider_failed) {
    status = input.retry_eligible ? L14DeliveryExecutionStatus.FAILED_RETRYABLE : L14DeliveryExecutionStatus.FAILED_NON_RETRYABLE;
  } else if (input.executed) {
    status = input.provider_message_ref ? L14DeliveryExecutionStatus.SENT_WITH_PROVIDER_ACK : L14DeliveryExecutionStatus.SENT;
  } else if (input.disposition.disposition === L14DeliveryDisposition.DEFER_TO_DIGEST || input.disposition.disposition === L14DeliveryDisposition.MERGE_INTO_EXISTING_PENDING_DELIVERY) {
    status = L14DeliveryExecutionStatus.QUEUED;
  } else {
    status = L14DeliveryExecutionStatus.QUEUED;
  }
  const replayHash = fnv1a(
    [
      input.assembly.payload_assembly_id,
      input.disposition.disposition_decision_id,
      status,
      String(input.retry_count ?? 0),
      input.provider_message_ref ?? '',
      POLICY_V,
    ].join('|'),
  );
  return {
    delivery_execution_id: `l14.runtime.execution.${replayHash}`,
    delivery_payload_ref: input.assembly.delivery_payload_ref,
    channel: input.assembly.channel,
    delivery_status: status,
    sent_at: input.sent_at,
    failed_at: input.failed_at,
    provider_message_ref: input.provider_message_ref,
    retry_eligible: input.retry_eligible === true,
    retry_count: input.retry_count ?? 0,
    execution_failure_reason_codes: input.failure_reasons as never,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 12. Materialization Intent ────────────────────────────────────

export interface L14MaterializationIntentInput {
  readonly runtime_run_id: string;
  readonly candidate: L14DeliveryCandidate;
  readonly suppression?: L14DeliverySuppressionRecord;
  readonly merge?: L14DeliveryMergeRecord;
  readonly assembly?: L14ChannelPayloadAssemblyResult;
  readonly execution?: L14DeliveryExecutionRecord;
}

export function emitL14MaterializationIntent(
  input: L14MaterializationIntentInput,
): L14DeliveryEventMaterializationIntent {
  const replayHash = fnv1a(
    [
      input.runtime_run_id,
      input.candidate.delivery_candidate_id,
      input.suppression?.suppression_id ?? '',
      input.merge?.merge_record_id ?? '',
      input.assembly?.payload_assembly_id ?? '',
      input.execution?.delivery_execution_id ?? '',
      POLICY_V,
    ].join('|'),
  );
  return {
    materialization_intent_id: `l14.runtime.materialize.${replayHash}`,
    runtime_run_id: input.runtime_run_id,
    candidate_delivery_ref: input.candidate.delivery_candidate_id,
    suppression_record_ref: input.suppression?.suppression_id,
    merge_record_ref: input.merge?.merge_record_id,
    delivery_payload_ref: input.assembly?.delivery_payload_ref,
    execution_record_ref: input.execution?.delivery_execution_id,
    should_persist_delivery_candidate: true,
    should_persist_suppression: !!input.suppression,
    should_persist_merge_record: !!input.merge,
    should_persist_execution_record: !!input.execution,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── 13. Feedback Expectation Registration ────────────────────────

export interface L14FeedbackExpectationInput {
  readonly disposition: L14DeliveryDispositionDecision;
  readonly execution?: L14DeliveryExecutionRecord;
  readonly suppression?: L14DeliverySuppressionRecord;
  readonly channel: L14DeliveryChannel;
  readonly expected_interaction_window_ms?: number;
  readonly expected_outcome_evaluation_window_ms?: number;
}

export function registerL14FeedbackExpectation(
  input: L14FeedbackExpectationInput,
): L14DeliveryFeedbackExpectation {
  let status: L14FeedbackExpectationStatus;
  const interactions: L14ExpectedInteractionType[] = [];
  const outcomes: L14ExpectedOutcomeEvaluationClass[] = [];
  const d = input.disposition.disposition;
  const channelDef = getL14DeliveryChannelDefinition(input.channel);
  if (d === L14DeliveryDisposition.BLOCKED_ILLEGAL_DELIVERY) {
    status = L14FeedbackExpectationStatus.BLOCKED_NO_EXECUTION_CONTEXT;
  } else if (d === L14DeliveryDisposition.INTERNAL_REVIEW_ONLY || channelDef?.internal_only) {
    status = L14FeedbackExpectationStatus.NOT_REQUIRED_INTERNAL_REVIEW_ONLY;
  } else if (
    input.channel === L14DeliveryChannel.DASHBOARD ||
    input.channel === L14DeliveryChannel.TOKEN_REPORT_PAGE
  ) {
    status = L14FeedbackExpectationStatus.NOT_REQUIRED_ON_DEMAND_SURFACE;
    interactions.push(L14ExpectedInteractionType.TOKEN_REPORT_VIEW);
  } else if (d === L14DeliveryDisposition.EXECUTE_IMMEDIATELY || d === L14DeliveryDisposition.EXECUTE_NEAR_REAL_TIME || d === L14DeliveryDisposition.DEFER_TO_DIGEST) {
    status = L14FeedbackExpectationStatus.REGISTERED;
    interactions.push(
      L14ExpectedInteractionType.ALERT_OPEN,
      L14ExpectedInteractionType.ALERT_CLICK,
      L14ExpectedInteractionType.ALERT_IGNORE_WINDOW_ELAPSED,
      L14ExpectedInteractionType.USER_FEEDBACK,
    );
    outcomes.push(
      L14ExpectedOutcomeEvaluationClass.ALERT_OUTCOME_ALIGNMENT,
      L14ExpectedOutcomeEvaluationClass.SCENARIO_TRIGGER_ALIGNMENT,
    );
  } else if (d === L14DeliveryDisposition.SUPPRESS_WITH_RECORD) {
    status = L14FeedbackExpectationStatus.BLOCKED_NO_EXECUTION_CONTEXT;
  } else {
    status = L14FeedbackExpectationStatus.NOT_REQUIRED_ON_DEMAND_SURFACE;
  }
  const replayHash = fnv1a(
    [
      input.disposition.disposition_decision_id,
      input.execution?.delivery_execution_id ?? '',
      input.suppression?.suppression_id ?? '',
      input.channel,
      status,
      interactions.slice().sort().join(','),
      outcomes.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  return {
    feedback_expectation_id: `l14.runtime.expectation.${replayHash}`,
    delivery_execution_ref: input.execution?.delivery_execution_id,
    suppression_record_ref: input.suppression?.suppression_id,
    expected_interaction_window_ms: input.expected_interaction_window_ms ?? 60 * 60 * 1000,
    expected_outcome_evaluation_window_ms: input.expected_outcome_evaluation_window_ms,
    eligible_interaction_types: interactions,
    eligible_outcome_evaluation_classes: outcomes,
    expectation_status: status,
    lineage_refs: ['l14.runtime.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Orchestrator ──────────────────────────────────────────────────

export interface L14RuntimeOrchestratorInput {
  readonly request: L14DeliveryRuntimeRequest;
  readonly entitlement_profile_ref: string;
  readonly channel_enabled: boolean;
  readonly alert_class_enabled: boolean;
  readonly quiet_hours_active: boolean;
  readonly frequency_cap_reached: boolean;
  readonly entitlement_clean: boolean;
  readonly priority_inputs: Omit<L14PriorityInput, 'candidate' | 'trigger'>;
  readonly urgency_inputs: Omit<L14UrgencyInput, 'candidate' | 'priority_profile'>;
  readonly semantic_cluster_key: string;
  readonly event_family_key: string;
  readonly matched_delivery_refs?: readonly string[];
  readonly near_duplicate?: boolean;
  readonly materially_new_invalidation?: boolean;
  readonly materially_new_trigger?: boolean;
  readonly cooldown_window_ms: number;
  readonly cooldown_active: boolean;
  readonly last_delivery_ref?: string;
  readonly last_delivery_at?: string;
  readonly material_contradiction_change?: boolean;
  readonly low_delivery_confidence?: boolean;
  readonly restriction_profile_blocked?: boolean;
  readonly internal_review_only?: boolean;
  readonly known_noisy_class?: boolean;
  readonly digest_downgrade?: boolean;
  readonly rendering_profile_ref: string;
  readonly disclosure_profile_ref: string;
  readonly restriction_profile_ref: string;
  readonly delivery_payload_ref: string;
  readonly source_semantics_at_risk?: boolean;
  readonly rendering_profile_missing?: boolean;
  readonly with_disclosure?: boolean;
  readonly executed?: boolean;
  readonly provider_failed?: boolean;
  readonly retry_eligible?: boolean;
  readonly retry_count?: number;
  readonly failure_reasons?: readonly string[];
  readonly provider_message_ref?: string;
}

export interface L14RuntimeOrchestratorResult {
  readonly runtime_run_id: string;
  readonly candidate: L14DeliveryCandidate;
  readonly eligibility: L14DeliveryEligibilityResult;
  readonly audience: L14AudienceResolutionResult;
  readonly channel: L14ChannelResolutionResult;
  readonly preference: L14PreferenceEntitlementBinding;
  readonly priority: L14DeliveryPriorityProfile;
  readonly urgency: L14DeliveryUrgencyProfile;
  readonly dedup_key: L14DeliveryDeduplicationKey;
  readonly duplication: L14DuplicationCheckResult;
  readonly cooldown: L14CooldownEvaluationResult;
  readonly disposition: L14DeliveryDispositionDecision;
  readonly suppression?: L14DeliverySuppressionRecord;
  readonly assembly: L14ChannelPayloadAssemblyResult;
  readonly execution: L14DeliveryExecutionRecord;
  readonly materialization: L14DeliveryEventMaterializationIntent;
  readonly expectation: L14DeliveryFeedbackExpectation;
}

export function runL14DeliveryRuntime(
  input: L14RuntimeOrchestratorInput,
): L14RuntimeOrchestratorResult {
  const runtime_run_id = `l14.run.${fnv1a([input.request.delivery_runtime_request_id, POLICY_V].join('|'))}`;
  const candidate = assembleL14DeliveryCandidate({ request: input.request });
  const eligibility = runL14DeliveryEligibility({
    candidate,
    preferred_channel: input.request.preferred_channel_hint,
  });
  const audience = resolveL14Audience(candidate, input.request.preferred_audience_hint);
  const channel = resolveL14Channel(
    candidate,
    audience.resolved_audience_class,
    input.request.preferred_channel_hint,
    input.request.runtime_trigger,
  );
  const preference = bindL14PreferenceEntitlement({
    candidate,
    channel: channel.selected_channel,
    audience: audience.resolved_audience_class,
    entitlement_profile_ref: input.entitlement_profile_ref,
    channel_enabled: input.channel_enabled,
    alert_class_enabled: input.alert_class_enabled,
    quiet_hours_active: input.quiet_hours_active,
    frequency_cap_reached: input.frequency_cap_reached,
    entitlement_clean: input.entitlement_clean,
  });
  const priority = deriveL14DeliveryPriority({
    candidate,
    trigger: input.request.runtime_trigger,
    ...input.priority_inputs,
  });
  const urgency = deriveL14DeliveryUrgency({
    candidate,
    priority_profile: priority,
    ...input.urgency_inputs,
  });
  const dedup_key = buildL14DeduplicationKey({
    candidate,
    channel: channel.selected_channel,
    audience: audience.resolved_audience_class,
    semantic_cluster_key: input.semantic_cluster_key,
    event_family_key: input.event_family_key,
    matched_delivery_refs: input.matched_delivery_refs,
    near_duplicate: input.near_duplicate,
    materially_new_invalidation: input.materially_new_invalidation,
    materially_new_trigger: input.materially_new_trigger,
  });
  const duplication = checkL14Duplication(
    {
      candidate,
      channel: channel.selected_channel,
      audience: audience.resolved_audience_class,
      semantic_cluster_key: input.semantic_cluster_key,
      event_family_key: input.event_family_key,
      matched_delivery_refs: input.matched_delivery_refs,
      near_duplicate: input.near_duplicate,
      materially_new_invalidation: input.materially_new_invalidation,
      materially_new_trigger: input.materially_new_trigger,
    },
    dedup_key,
  );
  const cooldown = evaluateL14Cooldown({
    candidate,
    dedup_key,
    cooldown_window_ms: input.cooldown_window_ms,
    last_delivery_ref: input.last_delivery_ref,
    last_delivery_at: input.last_delivery_at,
    cooldown_active: input.cooldown_active,
    priority_class: priority.priority_class,
    new_invalidation: input.materially_new_invalidation,
    material_contradiction_change: input.material_contradiction_change,
  });
  const { decision: disposition, suppression } = decideL14Disposition({
    candidate,
    channel: channel.selected_channel,
    audience: audience.resolved_audience_class,
    preference,
    duplication,
    cooldown,
    urgency,
    priority,
    low_delivery_confidence: input.low_delivery_confidence,
    restriction_profile_blocked: input.restriction_profile_blocked,
    internal_review_only: input.internal_review_only,
    known_noisy_class: input.known_noisy_class,
    digest_downgrade: input.digest_downgrade,
  });
  const assembly = assembleL14ChannelPayload({
    candidate,
    disposition,
    delivery_payload_ref: input.delivery_payload_ref,
    rendering_profile_ref: input.rendering_profile_ref,
    disclosure_profile_ref: input.disclosure_profile_ref,
    restriction_profile_ref: input.restriction_profile_ref,
    channel: channel.selected_channel,
    delivery_class: candidate.candidate_delivery_class,
    source_semantics_at_risk: input.source_semantics_at_risk,
    rendering_profile_missing: input.rendering_profile_missing,
    with_disclosure: input.with_disclosure,
  });
  const execution = executeL14Delivery({
    assembly,
    disposition,
    executed: input.executed,
    provider_failed: input.provider_failed,
    retry_eligible: input.retry_eligible,
    retry_count: input.retry_count,
    failure_reasons: input.failure_reasons,
    provider_message_ref: input.provider_message_ref,
  });
  const materialization = emitL14MaterializationIntent({
    runtime_run_id,
    candidate,
    suppression,
    assembly,
    execution,
  });
  const expectation = registerL14FeedbackExpectation({
    disposition,
    execution,
    suppression,
    channel: channel.selected_channel,
  });
  return {
    runtime_run_id,
    candidate,
    eligibility,
    audience,
    channel,
    preference,
    priority,
    urgency,
    dedup_key,
    duplication,
    cooldown,
    disposition,
    suppression,
    assembly,
    execution,
    materialization,
    expectation,
  };
}

// Suppress unused-import warnings for helpers referenced by downstream
// cert paths.
void buildL14MergeRecord;
