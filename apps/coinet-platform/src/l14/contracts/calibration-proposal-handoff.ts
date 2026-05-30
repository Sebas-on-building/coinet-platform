/**
 * L14.7 — Review Queue and Lower-Layer Ratification Handoff
 *
 * §14.7.28 / §14.7.29 / §14.7.30
 */

import type {
  L14CalibrationProposalStatus,
  L14ProposalAffectedLayer,
  L14RequiredRecertificationScope,
} from './calibration-proposal-core';

// ── Review queue ──────────────────────────────────────────────────

export enum L14ProposalReviewQueueClass {
  L10_HYPOTHESIS_REVIEW_QUEUE = 'L10_HYPOTHESIS_REVIEW_QUEUE',
  L11_SCORE_GOVERNANCE_QUEUE = 'L11_SCORE_GOVERNANCE_QUEUE',
  L12_SCENARIO_GOVERNANCE_QUEUE = 'L12_SCENARIO_GOVERNANCE_QUEUE',
  L13_EXPRESSION_RUNTIME_REVIEW_QUEUE = 'L13_EXPRESSION_RUNTIME_REVIEW_QUEUE',
  L14_DELIVERY_POLICY_REVIEW_QUEUE = 'L14_DELIVERY_POLICY_REVIEW_QUEUE',
  HUMAN_ANALYST_TRIAGE_QUEUE = 'HUMAN_ANALYST_TRIAGE_QUEUE',
}

// Routing map: affected layer → owning queue.
export const L14_LAYER_REVIEW_QUEUE: Readonly<Record<L14ProposalAffectedLayer, L14ProposalReviewQueueClass>> = {
  L10: L14ProposalReviewQueueClass.L10_HYPOTHESIS_REVIEW_QUEUE,
  L11: L14ProposalReviewQueueClass.L11_SCORE_GOVERNANCE_QUEUE,
  L12: L14ProposalReviewQueueClass.L12_SCENARIO_GOVERNANCE_QUEUE,
  L13: L14ProposalReviewQueueClass.L13_EXPRESSION_RUNTIME_REVIEW_QUEUE,
  L14: L14ProposalReviewQueueClass.L14_DELIVERY_POLICY_REVIEW_QUEUE,
};

// ── Lower-layer ratification handoff ──────────────────────────────

export interface L14LowerLayerRatificationHandoff {
  readonly ratification_handoff_id: string;
  readonly calibration_proposal_ref: string;
  readonly owning_layer: L14ProposalAffectedLayer;
  readonly owning_review_queue: L14ProposalReviewQueueClass;
  readonly affected_target_refs: readonly string[];
  readonly required_recertification_scope: readonly L14RequiredRecertificationScope[];
  readonly proposal_status_at_handoff: L14CalibrationProposalStatus;
  readonly automatic_application_allowed: false;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
