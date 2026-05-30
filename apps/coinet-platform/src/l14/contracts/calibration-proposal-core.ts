/**
 * L14.7 — Calibration Proposal Core Contracts
 *
 * §14.7.7 / §14.7.9 / §14.7.13 / §14.7.14 / §14.7.15 / §14.7.17 /
 * §14.7.26 / §14.7.36 — Consolidated proposal taxonomy.
 */

import type {
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationReviewPriority,
} from './calibration-evidence-core';

// ── Proposal class + ownership map ─────────────────────────────────

export enum L14CalibrationProposalClass {
  L11_SCORE_THRESHOLD_REVIEW = 'L11_SCORE_THRESHOLD_REVIEW',
  L11_CONFIDENCE_CAP_REVIEW = 'L11_CONFIDENCE_CAP_REVIEW',
  L11_FORMULA_COMPONENT_REVIEW = 'L11_FORMULA_COMPONENT_REVIEW',
  L10_HYPOTHESIS_TEMPLATE_REVIEW = 'L10_HYPOTHESIS_TEMPLATE_REVIEW',
  L12_SCENARIO_TEMPLATE_REVIEW = 'L12_SCENARIO_TEMPLATE_REVIEW',
  L12_PATH_CONFIDENCE_CAP_REVIEW = 'L12_PATH_CONFIDENCE_CAP_REVIEW',
  L13_ALERT_COPY_POLICY_REVIEW = 'L13_ALERT_COPY_POLICY_REVIEW',
  L13_OUTPUT_MODE_EFFECTIVENESS_REVIEW = 'L13_OUTPUT_MODE_EFFECTIVENESS_REVIEW',
  L14_DELIVERY_SUPPRESSION_REVIEW = 'L14_DELIVERY_SUPPRESSION_REVIEW',
  L14_ALERT_ROUTING_REVIEW = 'L14_ALERT_ROUTING_REVIEW',
}
export const ALL_L14_CALIBRATION_PROPOSAL_CLASSES: readonly L14CalibrationProposalClass[] =
  Object.values(L14CalibrationProposalClass);

export type L14ProposalAffectedLayer = 'L10' | 'L11' | 'L12' | 'L13' | 'L14';

export const L14_PROPOSAL_CLASS_OWNING_LAYER: Readonly<Record<L14CalibrationProposalClass, L14ProposalAffectedLayer>> = {
  [L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW]: 'L11',
  [L14CalibrationProposalClass.L11_CONFIDENCE_CAP_REVIEW]: 'L11',
  [L14CalibrationProposalClass.L11_FORMULA_COMPONENT_REVIEW]: 'L11',
  [L14CalibrationProposalClass.L10_HYPOTHESIS_TEMPLATE_REVIEW]: 'L10',
  [L14CalibrationProposalClass.L12_SCENARIO_TEMPLATE_REVIEW]: 'L12',
  [L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW]: 'L12',
  [L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW]: 'L13',
  [L14CalibrationProposalClass.L13_OUTPUT_MODE_EFFECTIVENESS_REVIEW]: 'L13',
  [L14CalibrationProposalClass.L14_DELIVERY_SUPPRESSION_REVIEW]: 'L14',
  [L14CalibrationProposalClass.L14_ALERT_ROUTING_REVIEW]: 'L14',
};

// ── Proposed action classes ───────────────────────────────────────

export enum L14ProposedActionClass {
  REVIEW_THRESHOLD_SEPARATION = 'REVIEW_THRESHOLD_SEPARATION',
  REVIEW_CONFIDENCE_CAP_ESCALATION = 'REVIEW_CONFIDENCE_CAP_ESCALATION',
  REVIEW_COMPONENT_WEIGHT_OR_DEPENDENCY = 'REVIEW_COMPONENT_WEIGHT_OR_DEPENDENCY',
  REVIEW_HYPOTHESIS_TEMPLATE_INTERPRETATION = 'REVIEW_HYPOTHESIS_TEMPLATE_INTERPRETATION',
  REVIEW_SCENARIO_TEMPLATE_CONDITIONS = 'REVIEW_SCENARIO_TEMPLATE_CONDITIONS',
  REVIEW_TRIGGER_OR_INVALIDATION_LOGIC = 'REVIEW_TRIGGER_OR_INVALIDATION_LOGIC',
  REVIEW_ALERT_COPY_POLICY = 'REVIEW_ALERT_COPY_POLICY',
  REVIEW_OUTPUT_MODE_EFFECTIVENESS = 'REVIEW_OUTPUT_MODE_EFFECTIVENESS',
  REVIEW_DELIVERY_SUPPRESSION_POLICY = 'REVIEW_DELIVERY_SUPPRESSION_POLICY',
  REVIEW_ALERT_ROUTING_POLICY = 'REVIEW_ALERT_ROUTING_POLICY',
}

// ── Proposal non-claims ───────────────────────────────────────────

export enum L14ProposalNonClaim {
  DOES_NOT_AUTOMATICALLY_APPLY_CHANGE = 'DOES_NOT_AUTOMATICALLY_APPLY_CHANGE',
  DOES_NOT_DECLARE_CURRENT_POLICY_INVALID = 'DOES_NOT_DECLARE_CURRENT_POLICY_INVALID',
  DOES_NOT_OVERRIDE_LOWER_LAYER_OWNER = 'DOES_NOT_OVERRIDE_LOWER_LAYER_OWNER',
  DOES_NOT_BYPASS_RECERTIFICATION = 'DOES_NOT_BYPASS_RECERTIFICATION',
  DOES_NOT_CLAIM_CAUSAL_PROOF_FROM_ASSOCIATION = 'DOES_NOT_CLAIM_CAUSAL_PROOF_FROM_ASSOCIATION',
  DOES_NOT_REPLACE_HUMAN_OR_LAYER_REVIEW = 'DOES_NOT_REPLACE_HUMAN_OR_LAYER_REVIEW',
}

// ── Proposal status lifecycle ─────────────────────────────────────

export enum L14CalibrationProposalStatus {
  DRAFTED = 'DRAFTED',
  EVIDENCE_INSUFFICIENT_BLOCKED = 'EVIDENCE_INSUFFICIENT_BLOCKED',
  COUNTEREVIDENCE_BLOCKED = 'COUNTEREVIDENCE_BLOCKED',
  READY_FOR_REVIEW_QUEUE = 'READY_FOR_REVIEW_QUEUE',
  ROUTED_TO_LOWER_LAYER_OWNER = 'ROUTED_TO_LOWER_LAYER_OWNER',
  UNDER_OWNER_REVIEW = 'UNDER_OWNER_REVIEW',
  RETURNED_FOR_MORE_EVIDENCE = 'RETURNED_FOR_MORE_EVIDENCE',
  REJECTED_BY_OWNER = 'REJECTED_BY_OWNER',
  ACCEPTED_FOR_LOWER_LAYER_RATIFICATION = 'ACCEPTED_FOR_LOWER_LAYER_RATIFICATION',
}

// Statuses L14.7 itself may set.
export const L14_PROPOSAL_STATUSES_OWNED_BY_L14_7: ReadonlySet<L14CalibrationProposalStatus> = new Set([
  L14CalibrationProposalStatus.DRAFTED,
  L14CalibrationProposalStatus.EVIDENCE_INSUFFICIENT_BLOCKED,
  L14CalibrationProposalStatus.COUNTEREVIDENCE_BLOCKED,
  L14CalibrationProposalStatus.READY_FOR_REVIEW_QUEUE,
  L14CalibrationProposalStatus.ROUTED_TO_LOWER_LAYER_OWNER,
]);

// ── Proposal readiness ────────────────────────────────────────────

export enum L14CalibrationProposalReadinessClass {
  READY_FOR_QUEUE = 'READY_FOR_QUEUE',
  READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED = 'READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED',
  BLOCKED_INSUFFICIENT_EVIDENCE = 'BLOCKED_INSUFFICIENT_EVIDENCE',
  BLOCKED_CONTRADICTORY_EVIDENCE = 'BLOCKED_CONTRADICTORY_EVIDENCE',
  BLOCKED_UNSUPPORTED_TARGET = 'BLOCKED_UNSUPPORTED_TARGET',
  BLOCKED_PROPOSAL_CLASS_MISMATCH = 'BLOCKED_PROPOSAL_CLASS_MISMATCH',
}

// ── Required recertification scope ────────────────────────────────

export enum L14RequiredRecertificationScope {
  NONE = 'NONE',
  TARGET_LAYER_LOCAL_CERTIFICATION = 'TARGET_LAYER_LOCAL_CERTIFICATION',
  TARGET_LAYER_AND_DOWNSTREAM_REGRESSION = 'TARGET_LAYER_AND_DOWNSTREAM_REGRESSION',
  CROSS_LAYER_CONSTITUTIONAL_REVIEW = 'CROSS_LAYER_CONSTITUTIONAL_REVIEW',
  FULL_MASTER_RATIFICATION_REQUIRED = 'FULL_MASTER_RATIFICATION_REQUIRED',
}

// Suggested mapping per §14.7.27
export const L14_PROPOSAL_CLASS_DEFAULT_RECERTIFICATION: Readonly<Record<L14CalibrationProposalClass, L14RequiredRecertificationScope>> = {
  [L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_AND_DOWNSTREAM_REGRESSION,
  [L14CalibrationProposalClass.L11_CONFIDENCE_CAP_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_AND_DOWNSTREAM_REGRESSION,
  [L14CalibrationProposalClass.L11_FORMULA_COMPONENT_REVIEW]: L14RequiredRecertificationScope.FULL_MASTER_RATIFICATION_REQUIRED,
  [L14CalibrationProposalClass.L10_HYPOTHESIS_TEMPLATE_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_AND_DOWNSTREAM_REGRESSION,
  [L14CalibrationProposalClass.L12_SCENARIO_TEMPLATE_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_AND_DOWNSTREAM_REGRESSION,
  [L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_AND_DOWNSTREAM_REGRESSION,
  [L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_LOCAL_CERTIFICATION,
  [L14CalibrationProposalClass.L13_OUTPUT_MODE_EFFECTIVENESS_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_LOCAL_CERTIFICATION,
  [L14CalibrationProposalClass.L14_DELIVERY_SUPPRESSION_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_LOCAL_CERTIFICATION,
  [L14CalibrationProposalClass.L14_ALERT_ROUTING_REVIEW]: L14RequiredRecertificationScope.TARGET_LAYER_LOCAL_CERTIFICATION,
};

// ── Proposal limitations ──────────────────────────────────────────

export enum L14CalibrationProposalLimitation {
  COUNTEREVIDENCE_PRESENT = 'COUNTEREVIDENCE_PRESENT',
  REVIEW_SCOPE_NARROW = 'REVIEW_SCOPE_NARROW',
  REGIME_SPECIFIC_ONLY = 'REGIME_SPECIFIC_ONLY',
  HORIZON_SPECIFIC_ONLY = 'HORIZON_SPECIFIC_ONLY',
  ASSOCIATIONAL_NOT_CAUSAL = 'ASSOCIATIONAL_NOT_CAUSAL',
  SAMPLE_MODERATE_NOT_LARGE = 'SAMPLE_MODERATE_NOT_LARGE',
  PARTIAL_FEEDBACK_SIGNAL = 'PARTIAL_FEEDBACK_SIGNAL',
  REQUIRES_OWNER_LAYER_INTERPRETATION = 'REQUIRES_OWNER_LAYER_INTERPRETATION',
}

// ── Affected target ref ───────────────────────────────────────────

export interface L14ProposalAffectedTargetRef {
  readonly affected_target_ref_id: string;
  readonly target_layer: L14ProposalAffectedLayer;
  readonly target_class: L14CalibrationLowerLayerTargetClass;
  readonly target_ref: string;
  readonly proposal_relevance: string;
  readonly direct_mutation_requested: false;
  readonly policy_version: string;
}

// ── Proposal request ──────────────────────────────────────────────

export type L14CalibrationProposalRequestSource =
  | 'SCHEDULED_PROPOSAL_SWEEP'
  | 'HIGH_PRIORITY_EVIDENCE_ESCALATION'
  | 'HUMAN_ANALYST_REQUEST'
  | 'REPLAY_REPAIR';

export interface L14CalibrationProposalRequest {
  readonly calibration_proposal_request_id: string;
  readonly proposal_class: L14CalibrationProposalClass;
  readonly source_calibration_evidence_refs: readonly string[];
  readonly requested_by: L14CalibrationProposalRequestSource;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Eligibility result ────────────────────────────────────────────

export enum L14CalibrationProposalEligibilityStatus {
  ELIGIBLE_FOR_PROPOSAL_BUILD = 'ELIGIBLE_FOR_PROPOSAL_BUILD',
  ELIGIBLE_FOR_HUMAN_NOTE_ONLY = 'ELIGIBLE_FOR_HUMAN_NOTE_ONLY',
  BLOCKED_INSUFFICIENT_EVIDENCE = 'BLOCKED_INSUFFICIENT_EVIDENCE',
  BLOCKED_COUNTEREVIDENCE = 'BLOCKED_COUNTEREVIDENCE',
  BLOCKED_PROPOSAL_CLASS_EVIDENCE_MISMATCH = 'BLOCKED_PROPOSAL_CLASS_EVIDENCE_MISMATCH',
  BLOCKED_TARGET_MAPPING_FAILURE = 'BLOCKED_TARGET_MAPPING_FAILURE',
}

export enum L14CalibrationProposalMissingRequirement {
  NO_PROPOSAL_ELIGIBLE_EVIDENCE = 'NO_PROPOSAL_ELIGIBLE_EVIDENCE',
  NO_SUPPORTED_AFFECTED_TARGET = 'NO_SUPPORTED_AFFECTED_TARGET',
  NO_VALID_REVIEW_PRIORITY = 'NO_VALID_REVIEW_PRIORITY',
  NO_RECERTIFICATION_SCOPE = 'NO_RECERTIFICATION_SCOPE',
  COUNTEREVIDENCE_NOT_DISCLOSED = 'COUNTEREVIDENCE_NOT_DISCLOSED',
  EVIDENCE_CLASS_NOT_LEGAL_FOR_PROPOSAL = 'EVIDENCE_CLASS_NOT_LEGAL_FOR_PROPOSAL',
}

export interface L14CalibrationProposalEligibilityResult {
  readonly proposal_eligibility_result_id: string;
  readonly proposal_request_ref: string;
  readonly eligible: boolean;
  readonly eligibility_status: L14CalibrationProposalEligibilityStatus;
  readonly eligible_evidence_refs: readonly string[];
  readonly rejected_evidence_refs: readonly string[];
  readonly missing_requirements: readonly L14CalibrationProposalMissingRequirement[];
  readonly proposal_readiness_if_built?: L14CalibrationProposalReadinessClass;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Master proposal object ────────────────────────────────────────

export interface L14CalibrationProposal {
  readonly calibration_proposal_id: string;
  readonly proposal_class: L14CalibrationProposalClass;
  readonly affected_layer: L14ProposalAffectedLayer;
  readonly affected_target_refs: readonly L14ProposalAffectedTargetRef[];
  readonly evidence_refs: readonly string[];
  readonly evidence_pack_ref: string;
  readonly supporting_evidence_count: number;
  readonly counterevidence_refs: readonly string[];
  readonly sample_size: number;
  readonly evidence_confidence: L14CalibrationEvidenceConfidenceClass;
  readonly review_priority: L14CalibrationReviewPriority;
  readonly proposal_summary: string;
  readonly proposed_action: string;
  readonly proposed_action_class: L14ProposedActionClass;
  readonly expected_improvement_claim: string;
  readonly explicit_non_claims: readonly L14ProposalNonClaim[];
  readonly automatic_application_allowed: false;
  readonly requires_review: true;
  readonly requires_recertification: boolean;
  readonly required_recertification_scope: readonly L14RequiredRecertificationScope[];
  readonly proposal_status: L14CalibrationProposalStatus;
  readonly proposal_readiness: L14CalibrationProposalReadinessClass;
  readonly lower_layer_ratification_handoff_ref?: string;
  readonly review_queue_ref?: string;
  readonly interpretation_limitations: readonly L14CalibrationProposalLimitation[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
