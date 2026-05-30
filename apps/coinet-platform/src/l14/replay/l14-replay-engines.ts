/**
 * L14.8 — Replay Engines
 *
 * §14.8.26–§14.8.32
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14ReplayMismatchReasonCode,
  L14ReplayStatus,
  L14ReplaySubjectClass,
  type L14ReplayRequest,
  type L14ReplayResult,
} from '../contracts/l14-replay-contracts';

const POLICY_V = 'l14.persistence.v1';

// ── Replay request builder ───────────────────────────────────────

export interface L14ReplayRequestInput {
  readonly replay_subject_class: L14ReplaySubjectClass;
  readonly source_record_ref: string;
  readonly expected_policy_version?: string;
  readonly expected_delivery_policy_ref?: string;
  readonly expected_preference_snapshot_ref?: string;
  readonly replay_window_start?: string;
  readonly replay_window_end?: string;
}

export function buildL14ReplayRequest(input: L14ReplayRequestInput): L14ReplayRequest {
  const id = `l14.replay.req.${fnv1a([
    input.replay_subject_class, input.source_record_ref,
    input.expected_policy_version ?? '', input.expected_delivery_policy_ref ?? '',
    input.expected_preference_snapshot_ref ?? '',
    input.replay_window_start ?? '', input.replay_window_end ?? '', POLICY_V,
  ].join('|'))}`;
  return {
    replay_request_id: id,
    replay_subject_class: input.replay_subject_class,
    source_record_ref: input.source_record_ref,
    expected_policy_version: input.expected_policy_version,
    expected_delivery_policy_ref: input.expected_delivery_policy_ref,
    expected_preference_snapshot_ref: input.expected_preference_snapshot_ref,
    replay_window_start: input.replay_window_start,
    replay_window_end: input.replay_window_end,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Replay decision (delivery sent/suppressed) ───────────────────

export interface L14DeliveryReplayInput {
  readonly request: L14ReplayRequest;
  readonly original_decision_ref?: string;
  readonly reconstructed_decision_ref?: string;
  readonly original_policy_ref?: string;
  readonly original_preference_snapshot_ref?: string;
  readonly original_payload_ref?: string;
  readonly reconstructed_payload_ref?: string;
  readonly original_suppression_reason?: string;
  readonly reconstructed_suppression_reason?: string;
  readonly interaction_timeline_match?: boolean;
}

export function replayL14DeliveryDecision(input: L14DeliveryReplayInput): L14ReplayResult {
  const mismatch: L14ReplayMismatchReasonCode[] = [];

  if (!input.original_policy_ref) {
    mismatch.push(L14ReplayMismatchReasonCode.ORIGINAL_POLICY_REF_MISSING);
  }
  const policyMatch = !!input.original_policy_ref &&
    input.original_policy_ref === input.request.expected_delivery_policy_ref;

  let prefMatch: boolean | undefined;
  if (input.original_preference_snapshot_ref !== undefined ||
      input.request.expected_preference_snapshot_ref !== undefined) {
    if (!input.original_preference_snapshot_ref) {
      mismatch.push(L14ReplayMismatchReasonCode.ORIGINAL_PREFERENCE_SNAPSHOT_MISSING);
      prefMatch = false;
    } else {
      prefMatch = input.original_preference_snapshot_ref === input.request.expected_preference_snapshot_ref;
      if (!prefMatch) mismatch.push(L14ReplayMismatchReasonCode.ORIGINAL_PREFERENCE_SNAPSHOT_MISSING);
    }
  }

  let artifactMatch: boolean | undefined;
  if (input.original_payload_ref !== undefined || input.reconstructed_payload_ref !== undefined) {
    if (!input.original_payload_ref) {
      mismatch.push(L14ReplayMismatchReasonCode.ORIGINAL_DELIVERY_PAYLOAD_MISSING);
      artifactMatch = false;
    } else {
      artifactMatch = input.original_payload_ref === input.reconstructed_payload_ref;
    }
  }

  let suppressionMatch: boolean | undefined;
  if (input.request.replay_subject_class === L14ReplaySubjectClass.DELIVERY_SUPPRESSION_DECISION) {
    if (!input.original_suppression_reason) {
      mismatch.push(L14ReplayMismatchReasonCode.ORIGINAL_SUPPRESSION_RECORD_MISSING);
      suppressionMatch = false;
    } else {
      suppressionMatch = input.original_suppression_reason === input.reconstructed_suppression_reason;
    }
  }

  let status: L14ReplayStatus;
  if (!input.original_policy_ref) {
    status = L14ReplayStatus.BLOCKED_ILLEGAL_REPLAY;
  } else if (!policyMatch) {
    status = L14ReplayStatus.ROUTING_POLICY_MISMATCH;
  } else if (prefMatch === false) {
    status = L14ReplayStatus.PREFERENCE_SNAPSHOT_MISMATCH;
  } else if (artifactMatch === false) {
    status = L14ReplayStatus.DELIVERY_ARTIFACT_MISMATCH;
  } else if (suppressionMatch === false) {
    status = L14ReplayStatus.SUPPRESSION_REASON_MISMATCH;
  } else if (input.interaction_timeline_match === false) {
    status = L14ReplayStatus.INTERACTION_TIMELINE_MISMATCH;
    mismatch.push(L14ReplayMismatchReasonCode.INTERACTION_CHAIN_INCOMPLETE);
  } else if (input.original_decision_ref === input.reconstructed_decision_ref &&
             input.original_decision_ref !== undefined) {
    status = L14ReplayStatus.EXACT_RECONSTRUCTION;
  } else {
    status = L14ReplayStatus.LEGALLY_EQUIVALENT_RECONSTRUCTION;
  }

  const replayHash = fnv1a([
    input.request.replay_request_id, status,
    String(policyMatch), String(prefMatch), String(artifactMatch),
    String(suppressionMatch), String(input.interaction_timeline_match),
    mismatch.slice().sort().join(','), POLICY_V,
  ].join('|'));
  return {
    replay_result_id: `l14.replay.result.${replayHash}`,
    replay_request_ref: input.request.replay_request_id,
    replay_subject_class: input.request.replay_subject_class,
    replay_status: status,
    original_decision_ref: input.original_decision_ref,
    reconstructed_decision_ref: input.reconstructed_decision_ref,
    policy_ref_match: policyMatch,
    preference_snapshot_match: prefMatch,
    delivered_artifact_match: artifactMatch,
    suppression_reason_match: suppressionMatch,
    interaction_timeline_match: input.interaction_timeline_match,
    mismatch_reason_codes: mismatch,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
