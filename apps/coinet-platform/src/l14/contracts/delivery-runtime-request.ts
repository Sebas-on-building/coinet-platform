/**
 * L14.3 — Delivery Runtime Request + Candidate
 *
 * §14.3.9 / §14.3.10 / §14.3.11 / §14.3.12 / §14.3.13 — Frozen
 * runtime trigger, request, candidate, status, and reason codes.
 */

import type { L14AudienceClass } from './audience-class';
import type { L14DeliverableSourceArtifactClass } from './deliverable-source-artifact';
import type { L14DeliveryChannel } from './delivery-channel';
import type { L14DeliveryClass } from './delivery-class';

export enum L14DeliveryRuntimeTrigger {
  NEW_GOVERNED_ARTIFACT = 'NEW_GOVERNED_ARTIFACT',
  SCENARIO_TRIGGER_ACTIVATED = 'SCENARIO_TRIGGER_ACTIVATED',
  SCENARIO_INVALIDATION_ACTIVATED = 'SCENARIO_INVALIDATION_ACTIVATED',
  SCORE_THRESHOLD_CROSSED = 'SCORE_THRESHOLD_CROSSED',
  HYPOTHESIS_RANK_SHIFTED = 'HYPOTHESIS_RANK_SHIFTED',
  L13_ALERT_PAYLOAD_READY = 'L13_ALERT_PAYLOAD_READY',
  USER_ON_DEMAND_VIEW = 'USER_ON_DEMAND_VIEW',
  SCHEDULED_DIGEST_WINDOW = 'SCHEDULED_DIGEST_WINDOW',
  INTERNAL_ANALYST_REVIEW_REQUEST = 'INTERNAL_ANALYST_REVIEW_REQUEST',
}

export const ALL_L14_DELIVERY_RUNTIME_TRIGGERS:
  readonly L14DeliveryRuntimeTrigger[] =
  Object.values(L14DeliveryRuntimeTrigger);

export interface L14DeliveryRuntimeRequest {
  readonly delivery_runtime_request_id: string;
  readonly source_artifact_class: L14DeliverableSourceArtifactClass;
  readonly source_artifact_ref: string;
  readonly preferred_channel_hint?: L14DeliveryChannel;
  readonly preferred_audience_hint?: L14AudienceClass;
  readonly user_scope_ref?: string;
  readonly subject_scope_ref?: string;
  readonly originating_layer: 'L10' | 'L11' | 'L12' | 'L13';
  readonly runtime_trigger: L14DeliveryRuntimeTrigger;
  readonly trace_context_ref?: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export enum L14DeliveryCandidateStatus {
  ASSEMBLED = 'ASSEMBLED',
  INELIGIBLE_SOURCE = 'INELIGIBLE_SOURCE',
  BLOCKED_BY_CHANNEL_CONTRACT = 'BLOCKED_BY_CHANNEL_CONTRACT',
  INTERNAL_REVIEW_ONLY = 'INTERNAL_REVIEW_ONLY',
  READY_FOR_ELIGIBILITY_CHECK = 'READY_FOR_ELIGIBILITY_CHECK',
}

export enum L14DeliveryCandidateReasonCode {
  SOURCE_IS_FINAL_L13_ALERT = 'SOURCE_IS_FINAL_L13_ALERT',
  SOURCE_IS_FINAL_L13_CHAT_RESPONSE = 'SOURCE_IS_FINAL_L13_CHAT_RESPONSE',
  SOURCE_IS_SCENARIO_TRIGGER_EVENT = 'SOURCE_IS_SCENARIO_TRIGGER_EVENT',
  SOURCE_IS_SCENARIO_INVALIDATION_EVENT = 'SOURCE_IS_SCENARIO_INVALIDATION_EVENT',
  SOURCE_IS_SCORE_SHIFT_EVENT = 'SOURCE_IS_SCORE_SHIFT_EVENT',
  SOURCE_IS_HYPOTHESIS_SHIFT_EVENT = 'SOURCE_IS_HYPOTHESIS_SHIFT_EVENT',
  SOURCE_REQUIRES_INTERNAL_REVIEW = 'SOURCE_REQUIRES_INTERNAL_REVIEW',
  SOURCE_NOT_USER_DELIVERABLE = 'SOURCE_NOT_USER_DELIVERABLE',
}

export interface L14DeliveryCandidate {
  readonly delivery_candidate_id: string;
  readonly runtime_request_ref: string;
  readonly source_artifact_class: L14DeliverableSourceArtifactClass;
  readonly source_artifact_ref: string;
  readonly supporting_source_artifact_refs: readonly string[];
  readonly candidate_delivery_class: L14DeliveryClass;
  readonly candidate_channel_set: readonly L14DeliveryChannel[];
  readonly candidate_audience_set: readonly L14AudienceClass[];
  readonly candidate_reason_codes: readonly L14DeliveryCandidateReasonCode[];
  readonly user_scope_ref?: string;
  readonly subject_scope_ref?: string;
  readonly candidate_status: L14DeliveryCandidateStatus;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
