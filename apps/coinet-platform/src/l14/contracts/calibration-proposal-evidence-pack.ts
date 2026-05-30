/**
 * L14.7 — Proposal Evidence Pack, Confidence/Sample Summaries,
 *         Class Policy, Review Note Contracts.
 *
 * §14.7.20 / §14.7.21 / §14.7.22 / §14.7.31 / §14.7.43
 */

import type {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationSampleSufficiencyClass,
} from './calibration-evidence-core';
import type {
  L14CalibrationProposalClass,
  L14ProposalAffectedLayer,
  L14ProposedActionClass,
  L14RequiredRecertificationScope,
} from './calibration-proposal-core';

// ── Sample / confidence summaries ─────────────────────────────────

export interface L14ProposalSampleSummary {
  readonly total_sample_size: number;
  readonly strongest_supporting_sample_size: number;
  readonly smallest_supporting_sample_size: number;
  readonly sample_sufficiency_floor: L14CalibrationSampleSufficiencyClass;
  readonly sample_sufficiency_ceiling: L14CalibrationSampleSufficiencyClass;
}

export enum L14ProposalEvidenceConsistencyClass {
  CONSISTENT_STRONG = 'CONSISTENT_STRONG',
  CONSISTENT_MODERATE = 'CONSISTENT_MODERATE',
  MIXED_BUT_REVIEWABLE = 'MIXED_BUT_REVIEWABLE',
  CONTRADICTORY_BLOCKING = 'CONTRADICTORY_BLOCKING',
}

export interface L14ProposalConfidenceSummary {
  readonly evidence_confidence_floor: L14CalibrationEvidenceConfidenceClass;
  readonly evidence_confidence_ceiling: L14CalibrationEvidenceConfidenceClass;
  readonly confidence_consistency_class: L14ProposalEvidenceConsistencyClass;
}

// ── Evidence pack ─────────────────────────────────────────────────

export interface L14CalibrationProposalEvidencePack {
  readonly proposal_evidence_pack_id: string;
  readonly primary_evidence_refs: readonly string[];
  readonly supporting_evidence_refs: readonly string[];
  readonly counterevidence_refs: readonly string[];
  readonly aggregate_computation_refs: readonly string[];
  readonly finding_refs: readonly string[];
  readonly performance_attribution_refs: readonly string[];
  readonly sample_size_summary: L14ProposalSampleSummary;
  readonly confidence_summary: L14ProposalConfidenceSummary;
  readonly proposal_eligibility_basis: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

// ── Class policy ──────────────────────────────────────────────────

export interface L14CalibrationProposalClassPolicy {
  readonly proposal_class: L14CalibrationProposalClass;
  readonly affected_layer: L14ProposalAffectedLayer;
  readonly required_or_allowed_evidence_classes: readonly L14CalibrationEvidenceClass[];
  readonly legal_target_classes: readonly L14CalibrationLowerLayerTargetClass[];
  readonly legal_action_classes: readonly L14ProposedActionClass[];
  readonly default_recertification_scope: readonly L14RequiredRecertificationScope[];
  readonly permits_formal_proposal: boolean;
  readonly permits_human_note_only: boolean;
  readonly policy_version: string;
}

// ── Review note ───────────────────────────────────────────────────

export interface L14CalibrationReviewNote {
  readonly review_note_id: string;
  readonly source_evidence_refs: readonly string[];
  readonly subject_ref: string;
  readonly affected_layer_hint?: L14ProposalAffectedLayer;
  readonly note_summary: string;
  readonly reason_not_promoted_to_proposal: string;
  readonly routed_queue: 'HUMAN_ANALYST_TRIAGE_QUEUE';
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}
