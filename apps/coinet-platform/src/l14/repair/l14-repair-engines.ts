/**
 * L14.8 — Repair Engines
 *
 * §14.8.33–§14.8.39
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14RepairBlockingReasonCode,
  L14RepairReason,
  L14RepairStatus,
  type L14RepairRequest,
  type L14RepairRequestSource,
  type L14RepairResult,
} from '../contracts/l14-repair-contracts';

const POLICY_V = 'l14.persistence.v1';

// ── Repair request builder ───────────────────────────────────────

export interface L14RepairRequestInput {
  readonly repair_reason: L14RepairReason;
  readonly repair_subject_ref: string;
  readonly source_history_refs: readonly string[];
  readonly parent_record_ref?: string;
  readonly original_policy_ref?: string;
  readonly original_preference_snapshot_ref?: string;
  readonly requested_by: L14RepairRequestSource;
  readonly intent_invent_user_interaction?: boolean;
  readonly intent_rewrite_feedback?: boolean;
  readonly intent_fabricate_outcome?: boolean;
  readonly intent_mutate_historical_fact?: boolean;
}

export function buildL14RepairRequest(input: L14RepairRequestInput): L14RepairRequest {
  const id = `l14.repair.req.${fnv1a([
    input.repair_reason, input.repair_subject_ref,
    input.source_history_refs.slice().sort().join(','),
    input.parent_record_ref ?? '', input.original_policy_ref ?? '',
    input.original_preference_snapshot_ref ?? '', input.requested_by,
    String(input.intent_invent_user_interaction === true),
    String(input.intent_rewrite_feedback === true),
    String(input.intent_fabricate_outcome === true),
    String(input.intent_mutate_historical_fact === true),
    POLICY_V,
  ].join('|'))}`;
  return {
    repair_request_id: id,
    repair_reason: input.repair_reason,
    repair_subject_ref: input.repair_subject_ref,
    source_history_refs: input.source_history_refs,
    parent_record_ref: input.parent_record_ref,
    original_policy_ref: input.original_policy_ref,
    original_preference_snapshot_ref: input.original_preference_snapshot_ref,
    requested_by: input.requested_by,
    intent_invent_user_interaction: input.intent_invent_user_interaction === true ? true : false,
    intent_rewrite_feedback: input.intent_rewrite_feedback === true ? true : false,
    intent_fabricate_outcome: input.intent_fabricate_outcome === true ? true : false,
    intent_mutate_historical_fact: input.intent_mutate_historical_fact === true ? true : false,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Repair processing ────────────────────────────────────────────

const REASONS_REQUIRING_POLICY_CONTEXT = new Set<L14RepairReason>([
  L14RepairReason.MISSING_DELIVERY_EXECUTION_MATERIALIZATION,
  L14RepairReason.MISSING_DELIVERY_SUPPRESSION_MATERIALIZATION,
  L14RepairReason.CURRENT_DELIVERY_POLICY_REGISTRY_REBUILD,
]);

const REASONS_PRODUCING_DERIVED_FACT = new Set<L14RepairReason>([
  L14RepairReason.ALERT_PERFORMANCE_FACT_RECOMPUTE,
  L14RepairReason.CHANNEL_HEALTH_FACT_RECOMPUTE,
  L14RepairReason.DELIVERY_FAILURE_FACT_REBUILD,
]);

const REASONS_PRODUCING_REGISTRY_REBUILD = new Set<L14RepairReason>([
  L14RepairReason.CURRENT_DELIVERY_POLICY_REGISTRY_REBUILD,
  L14RepairReason.CURRENT_ALERT_PERFORMANCE_REGISTRY_REBUILD,
  L14RepairReason.CURRENT_CALIBRATION_REVIEW_REGISTRY_REBUILD,
  L14RepairReason.CURRENT_CHANNEL_HEALTH_REGISTRY_REBUILD,
]);

export interface L14RepairProcessInput {
  readonly request: L14RepairRequest;
  readonly rebuilt_record_refs?: readonly string[];
  readonly superseded_current_registry_refs?: readonly string[];
}

export function processL14RepairRequest(input: L14RepairProcessInput): L14RepairResult {
  const blocking: L14RepairBlockingReasonCode[] = [];
  let status: L14RepairStatus | undefined;

  // Honesty intent checks first.
  if (input.request.intent_invent_user_interaction === true) {
    blocking.push(L14RepairBlockingReasonCode.ATTEMPTED_USER_INTERACTION_INVENTION);
    status = L14RepairStatus.BLOCKED_USER_INTERACTION_INVENTION;
  } else if (input.request.intent_rewrite_feedback === true) {
    blocking.push(L14RepairBlockingReasonCode.ATTEMPTED_FEEDBACK_REWRITE);
    status = L14RepairStatus.BLOCKED_MUTATION_ATTEMPT;
  } else if (input.request.intent_fabricate_outcome === true) {
    blocking.push(L14RepairBlockingReasonCode.ATTEMPTED_OUTCOME_FABRICATION);
    status = L14RepairStatus.BLOCKED_OUTCOME_FABRICATION;
  } else if (input.request.intent_mutate_historical_fact === true) {
    blocking.push(L14RepairBlockingReasonCode.ATTEMPTED_HISTORICAL_MUTATION);
    status = L14RepairStatus.BLOCKED_MUTATION_ATTEMPT;
  } else if (input.request.source_history_refs.length === 0) {
    blocking.push(L14RepairBlockingReasonCode.SOURCE_HISTORY_REFS_MISSING);
    status = L14RepairStatus.BLOCKED_SOURCE_HISTORY_INCOMPLETE;
  } else if (REASONS_REQUIRING_POLICY_CONTEXT.has(input.request.repair_reason) &&
             !input.request.original_policy_ref) {
    blocking.push(L14RepairBlockingReasonCode.ORIGINAL_POLICY_REF_MISSING);
    status = L14RepairStatus.BLOCKED_POLICY_CONTEXT_MISSING;
  } else {
    if (REASONS_PRODUCING_REGISTRY_REBUILD.has(input.request.repair_reason)) {
      status = L14RepairStatus.COMPLETED_CURRENT_REGISTRY_REBUILD;
    } else if (REASONS_PRODUCING_DERIVED_FACT.has(input.request.repair_reason)) {
      status = L14RepairStatus.COMPLETED_DERIVED_FACT_RECOMPUTE;
    } else {
      status = L14RepairStatus.COMPLETED_MATERIALIZATION_REPAIR;
    }
  }

  const replayHash = fnv1a([
    input.request.repair_request_id, status,
    (input.rebuilt_record_refs ?? []).slice().sort().join(','),
    (input.superseded_current_registry_refs ?? []).slice().sort().join(','),
    blocking.slice().sort().join(','), POLICY_V,
  ].join('|'));
  return {
    repair_result_id: `l14.repair.result.${replayHash}`,
    repair_request_ref: input.request.repair_request_id,
    repair_status: status,
    rebuilt_record_refs: input.rebuilt_record_refs ?? [],
    superseded_current_registry_refs: input.superseded_current_registry_refs ?? [],
    historical_records_mutated: false,
    user_interactions_invented: false,
    outcomes_fabricated: false,
    blocking_reason_codes: blocking,
    lineage_refs: ['l14.persistence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
