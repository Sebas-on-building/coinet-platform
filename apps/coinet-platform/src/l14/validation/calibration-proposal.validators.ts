/**
 * L14.7 — Calibration Proposal Validators
 *
 * §14.7.47 — Consolidated per-shape validators using L14Q_* codes.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationProposalEligibilityClass as L14EvidenceProposalEligibilityClass,
  type L14CalibrationEvidenceRecord,
} from '../contracts/calibration-evidence-core';
import {
  L14CalibrationProposalClass,
  L14CalibrationProposalEligibilityStatus,
  L14CalibrationProposalReadinessClass,
  L14CalibrationProposalStatus,
  L14ProposedActionClass,
  L14RequiredRecertificationScope,
  L14_PROPOSAL_CLASS_OWNING_LAYER,
  L14_PROPOSAL_STATUSES_OWNED_BY_L14_7,
  type L14CalibrationProposal,
  type L14CalibrationProposalEligibilityResult,
  type L14CalibrationProposalRequest,
  type L14ProposalAffectedTargetRef,
} from '../contracts/calibration-proposal-core';
import {
  type L14CalibrationProposalEvidencePack,
  type L14CalibrationReviewNote,
} from '../contracts/calibration-proposal-evidence-pack';
import {
  L14ProposalReviewQueueClass,
  L14_LAYER_REVIEW_QUEUE,
  type L14LowerLayerRatificationHandoff,
} from '../contracts/calibration-proposal-handoff';
import {
  isActionClassLegalForProposal,
  isEvidenceClassLegalForProposal,
  isProposedActionWordingLegal,
  isTargetClassLegalForProposal,
} from '../proposals/calibration-proposal-engines';
import { L14CalibrationProposalViolationCode as C } from './l14-calibration-proposal-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14CalibrationProposalIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14CalibrationProposalValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14CalibrationProposalIssue[];
}

function result(issues: readonly L14CalibrationProposalIssue[]): L14CalibrationProposalValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: C, severity: L14ConstitutionalAuditSeverity, message: string): L14CalibrationProposalIssue {
  return { code, severity, message };
}

// ── 1. Request ────────────────────────────────────────────────────

export function validateL14CalibrationProposalRequest(
  r: L14CalibrationProposalRequest,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (!r.calibration_proposal_request_id) issues.push(err(C.L14Q_PROPOSAL_REQUEST_MISSING, SEV.ERROR, 'request id missing'));
  if (!r.proposal_class) issues.push(err(C.L14Q_PROPOSAL_CLASS_MISSING, SEV.ERROR, 'proposal_class missing'));
  if (!r.source_calibration_evidence_refs || r.source_calibration_evidence_refs.length === 0) {
    issues.push(err(C.L14Q_SOURCE_EVIDENCE_REFS_MISSING, SEV.ERROR, 'source evidence refs empty'));
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) issues.push(err(C.L14Q_LINEAGE_MISSING, SEV.ERROR, 'lineage empty'));
  if (!r.replay_hash) issues.push(err(C.L14Q_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 2. Eligibility ────────────────────────────────────────────────

export function validateL14CalibrationProposalEligibility(
  e: L14CalibrationProposalEligibilityResult,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (e.eligible && e.eligibility_status !== L14CalibrationProposalEligibilityStatus.ELIGIBLE_FOR_PROPOSAL_BUILD) {
    issues.push(err(C.L14Q_READINESS_FALSE_GREEN, SEV.CRITICAL, 'eligible=true with non-ELIGIBLE_FOR_PROPOSAL_BUILD status'));
  }
  return result(issues);
}

// ── 3. Evidence pack ─────────────────────────────────────────────

export function validateL14CalibrationProposalEvidencePack(
  p: L14CalibrationProposalEvidencePack | undefined,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (!p) {
    issues.push(err(C.L14Q_EVIDENCE_PACK_MISSING, SEV.ERROR, 'evidence pack missing'));
    return result(issues);
  }
  if (!p.proposal_evidence_pack_id) issues.push(err(C.L14Q_EVIDENCE_PACK_MISSING, SEV.ERROR, 'pack id missing'));
  if (p.primary_evidence_refs.length === 0) issues.push(err(C.L14Q_SOURCE_EVIDENCE_REFS_MISSING, SEV.ERROR, 'primary refs empty'));
  if (p.aggregate_computation_refs.length === 0) issues.push(err(C.L14Q_EVIDENCE_PACK_MISSING, SEV.ERROR, 'aggregate refs empty'));
  if (!p.lineage_refs || p.lineage_refs.length === 0) issues.push(err(C.L14Q_LINEAGE_MISSING, SEV.ERROR, 'lineage empty'));
  if (!p.replay_hash) issues.push(err(C.L14Q_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 4. Affected target ref ───────────────────────────────────────

export function validateL14ProposalAffectedTargetRef(
  t: L14ProposalAffectedTargetRef,
  proposalClass: L14CalibrationProposalClass,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (!t.affected_target_ref_id || !t.target_ref) {
    issues.push(err(C.L14Q_AFFECTED_TARGET_MAPPING_MISSING, SEV.ERROR, 'target ref missing'));
  }
  if (t.direct_mutation_requested !== false) {
    issues.push(err(C.L14Q_MUTATION_REQUESTED_BY_PROPOSAL, SEV.CRITICAL,
      'target ref must hard-pin direct_mutation_requested=false'));
  }
  if (t.target_layer !== L14_PROPOSAL_CLASS_OWNING_LAYER[proposalClass]) {
    issues.push(err(C.L14Q_AFFECTED_LAYER_CLASS_MISMATCH, SEV.CRITICAL,
      `target layer ${t.target_layer} does not match owning layer for ${proposalClass}`));
  }
  if (!isTargetClassLegalForProposal(proposalClass, t.target_class)) {
    issues.push(err(C.L14Q_ILLEGAL_TARGET_CLASS_FOR_PROPOSAL, SEV.CRITICAL,
      `target class ${t.target_class} illegal for ${proposalClass}`));
  }
  return result(issues);
}

// ── 5. Proposed action wording ───────────────────────────────────

export function validateL14ProposedAction(
  text: string,
  actionClass: L14ProposedActionClass,
  proposalClass: L14CalibrationProposalClass,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (!text || text.trim().length === 0) {
    issues.push(err(C.L14Q_PROPOSED_ACTION_MISSING, SEV.ERROR, 'proposed action missing'));
  }
  if (text && !isProposedActionWordingLegal(text)) {
    issues.push(err(C.L14Q_PROPOSED_ACTION_TOO_EXECUTABLE, SEV.CRITICAL,
      'proposed action contains executable/non-review wording'));
  }
  if (!isActionClassLegalForProposal(proposalClass, actionClass)) {
    issues.push(err(C.L14Q_PROPOSAL_ACTION_CLASS_ILLEGAL, SEV.CRITICAL,
      `action class ${actionClass} illegal for ${proposalClass}`));
  }
  return result(issues);
}

// ── 6. Recertification scope ─────────────────────────────────────

export function validateL14RequiredRecertificationScope(
  scope: readonly L14RequiredRecertificationScope[],
  requiresRecert: boolean,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (requiresRecert) {
    if (!scope || scope.length === 0) {
      issues.push(err(C.L14Q_RECERTIFICATION_REQUIRED_BUT_MISSING, SEV.CRITICAL,
        'requires_recertification=true but scope empty'));
    } else if (scope.length === 1 && scope[0] === L14RequiredRecertificationScope.NONE) {
      issues.push(err(C.L14Q_RECERTIFICATION_SCOPE_FALSE_GREEN, SEV.CRITICAL,
        'requires_recertification=true but scope=NONE (false-green)'));
    }
  }
  return result(issues);
}

// ── 7. Review priority ───────────────────────────────────────────

export function validateL14ProposalReviewPriority(
  proposal: L14CalibrationProposal,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (proposal.review_priority === 'CRITICAL' &&
      proposal.evidence_confidence !== L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE &&
      proposal.evidence_confidence !== L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE) {
    issues.push(err(C.L14Q_REVIEW_PRIORITY_UNSUPPORTED, SEV.CRITICAL,
      'CRITICAL review priority requires HIGH/STRONG evidence confidence'));
  }
  if (proposal.review_priority === 'HIGH' &&
      proposal.evidence_confidence === L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE) {
    issues.push(err(C.L14Q_REVIEW_PRIORITY_UNSUPPORTED, SEV.CRITICAL,
      'HIGH review priority with INSUFFICIENT_EVIDENCE'));
  }
  return result(issues);
}

// ── 8. Lower-layer ratification handoff ──────────────────────────

export function validateL14LowerLayerRatificationHandoff(
  h: L14LowerLayerRatificationHandoff | undefined,
  proposal: L14CalibrationProposal,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (!h) {
    if (proposal.proposal_readiness === L14CalibrationProposalReadinessClass.READY_FOR_QUEUE ||
        proposal.proposal_readiness === L14CalibrationProposalReadinessClass.READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED) {
      issues.push(err(C.L14Q_LOWER_LAYER_HANDOFF_MISSING, SEV.ERROR, 'handoff missing for ready proposal'));
    }
    return result(issues);
  }
  if (h.owning_layer !== proposal.affected_layer) {
    issues.push(err(C.L14Q_HANDOFF_LAYER_MISMATCH, SEV.CRITICAL,
      `handoff owning_layer ${h.owning_layer} != proposal.affected_layer ${proposal.affected_layer}`));
  }
  if (h.owning_review_queue !== L14_LAYER_REVIEW_QUEUE[proposal.affected_layer]) {
    issues.push(err(C.L14Q_REVIEW_QUEUE_MISSING, SEV.CRITICAL,
      `handoff queue does not match canonical mapping for ${proposal.affected_layer}`));
  }
  if (h.automatic_application_allowed !== false) {
    issues.push(err(C.L14Q_AUTOMATIC_APPLICATION_FLAG_NOT_FALSE, SEV.CRITICAL,
      'handoff must hard-pin automatic_application_allowed=false'));
  }
  return result(issues);
}

// ── 9. Review note ───────────────────────────────────────────────

export function validateL14CalibrationReviewNote(
  n: L14CalibrationReviewNote | undefined,
  evidence: readonly L14CalibrationEvidenceRecord[],
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  // For review-only evidence, a note must exist.
  const hasReviewOnly = evidence.some(e => e.proposal_eligibility === L14EvidenceProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY);
  if (hasReviewOnly && !n) {
    issues.push(err(C.L14Q_HUMAN_REVIEW_NOTE_MISSING_FOR_REVIEW_ONLY_EVIDENCE, SEV.ERROR,
      'review-only evidence present but no review note built'));
  }
  if (n && n.routed_queue !== 'HUMAN_ANALYST_TRIAGE_QUEUE') {
    issues.push(err(C.L14Q_REVIEW_QUEUE_MISSING, SEV.ERROR, 'review note must route to HUMAN_ANALYST_TRIAGE_QUEUE'));
  }
  return result(issues);
}

// ── 10. Master proposal validator ────────────────────────────────

export function validateL14CalibrationProposal(
  p: L14CalibrationProposal,
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  if (!p.calibration_proposal_id) issues.push(err(C.L14Q_PROPOSAL_REQUEST_MISSING, SEV.ERROR, 'proposal id missing'));
  if (p.automatic_application_allowed !== false) {
    issues.push(err(C.L14Q_AUTOMATIC_APPLICATION_FLAG_NOT_FALSE, SEV.CRITICAL,
      'automatic_application_allowed must be false'));
  }
  if (p.requires_review !== true) {
    issues.push(err(C.L14Q_REQUIRES_REVIEW_FLAG_NOT_TRUE, SEV.CRITICAL,
      'requires_review must be true'));
  }
  if (!p.proposal_summary || p.proposal_summary.trim().length === 0) {
    issues.push(err(C.L14Q_PROPOSAL_SUMMARY_MISSING, SEV.ERROR, 'proposal_summary empty'));
  }
  if (!p.proposed_action || p.proposed_action.trim().length === 0) {
    issues.push(err(C.L14Q_PROPOSED_ACTION_MISSING, SEV.ERROR, 'proposed_action empty'));
  }
  if (p.proposed_action && !isProposedActionWordingLegal(p.proposed_action)) {
    issues.push(err(C.L14Q_PROPOSED_ACTION_TOO_EXECUTABLE, SEV.CRITICAL,
      'proposed action too executable'));
  }
  if (!p.explicit_non_claims || p.explicit_non_claims.length === 0) {
    issues.push(err(C.L14Q_NON_CLAIMS_MISSING, SEV.ERROR, 'explicit_non_claims missing'));
  }
  if (!p.evidence_pack_ref) issues.push(err(C.L14Q_EVIDENCE_PACK_MISSING, SEV.ERROR, 'evidence_pack_ref missing'));
  if (!p.affected_target_refs || p.affected_target_refs.length === 0) {
    issues.push(err(C.L14Q_AFFECTED_TARGET_MAPPING_MISSING, SEV.ERROR, 'affected_target_refs empty'));
  }
  for (const t of p.affected_target_refs) {
    const v = validateL14ProposalAffectedTargetRef(t, p.proposal_class);
    issues.push(...v.issues);
  }
  // Target layer matches proposal class owning layer.
  if (p.affected_layer !== L14_PROPOSAL_CLASS_OWNING_LAYER[p.proposal_class]) {
    issues.push(err(C.L14Q_AFFECTED_LAYER_CLASS_MISMATCH, SEV.CRITICAL,
      `proposal.affected_layer ${p.affected_layer} != owning layer for ${p.proposal_class}`));
  }
  // Action class legality.
  if (!isActionClassLegalForProposal(p.proposal_class, p.proposed_action_class)) {
    issues.push(err(C.L14Q_PROPOSAL_ACTION_CLASS_ILLEGAL, SEV.CRITICAL,
      `action class ${p.proposed_action_class} illegal for ${p.proposal_class}`));
  }
  // Recertification.
  const recertIssues = validateL14RequiredRecertificationScope(p.required_recertification_scope, p.requires_recertification);
  issues.push(...recertIssues.issues);
  // Review priority.
  issues.push(...validateL14ProposalReviewPriority(p).issues);
  // L14.7 may only own statuses in the set.
  if (!L14_PROPOSAL_STATUSES_OWNED_BY_L14_7.has(p.proposal_status) &&
      p.proposal_status !== L14CalibrationProposalStatus.UNDER_OWNER_REVIEW &&
      p.proposal_status !== L14CalibrationProposalStatus.RETURNED_FOR_MORE_EVIDENCE &&
      p.proposal_status !== L14CalibrationProposalStatus.REJECTED_BY_OWNER &&
      p.proposal_status !== L14CalibrationProposalStatus.ACCEPTED_FOR_LOWER_LAYER_RATIFICATION) {
    issues.push(err(C.L14Q_READINESS_FALSE_GREEN, SEV.ERROR, `unknown proposal_status ${p.proposal_status}`));
  }
  // Readiness false-green: READY but missing queue/handoff.
  if ((p.proposal_readiness === L14CalibrationProposalReadinessClass.READY_FOR_QUEUE ||
       p.proposal_readiness === L14CalibrationProposalReadinessClass.READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED) &&
      !p.lower_layer_ratification_handoff_ref) {
    issues.push(err(C.L14Q_LOWER_LAYER_HANDOFF_MISSING, SEV.ERROR, 'ready proposal missing handoff ref'));
  }
  // Counterevidence disclosure required.
  if (p.proposal_readiness === L14CalibrationProposalReadinessClass.READY_FOR_QUEUE &&
      p.counterevidence_refs.length > 0) {
    issues.push(err(C.L14Q_COUNTEREVIDENCE_NOT_DISCLOSED, SEV.CRITICAL,
      'counterevidence present but readiness ignores it'));
  }
  if (!p.lineage_refs || p.lineage_refs.length === 0) issues.push(err(C.L14Q_LINEAGE_MISSING, SEV.ERROR, 'lineage empty'));
  if (!p.replay_hash) issues.push(err(C.L14Q_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  return result(issues);
}

// ── 11. Proposal source evidence validation ──────────────────────

export function validateL14ProposalEvidenceCompatibility(
  proposalClass: L14CalibrationProposalClass,
  evidence: readonly L14CalibrationEvidenceRecord[],
): L14CalibrationProposalValidationResult {
  const issues: L14CalibrationProposalIssue[] = [];
  let foundEligible = false;
  for (const e of evidence) {
    if (!isEvidenceClassLegalForProposal(proposalClass, e.evidence_class)) {
      issues.push(err(C.L14Q_PROPOSAL_CLASS_EVIDENCE_CLASS_MISMATCH, SEV.CRITICAL,
        `evidence ${e.calibration_evidence_id} class ${e.evidence_class} mismatch for ${proposalClass}`));
    }
    if (e.proposal_eligibility === L14EvidenceProposalEligibilityClass.BLOCKED_CONTRADICTORY_EVIDENCE) {
      issues.push(err(C.L14Q_COUNTEREVIDENCE_BLOCKED_PROPOSAL_GENERATED, SEV.CRITICAL,
        `evidence ${e.calibration_evidence_id} is counterevidence-blocked`));
    }
    if (e.proposal_eligibility === L14EvidenceProposalEligibilityClass.NOT_ELIGIBLE_INSUFFICIENT_SAMPLE ||
        e.proposal_eligibility === L14EvidenceProposalEligibilityClass.NOT_ELIGIBLE_WEAK_SIGNAL) {
      issues.push(err(C.L14Q_EVIDENCE_NOT_PROPOSAL_ELIGIBLE, SEV.CRITICAL,
        `evidence ${e.calibration_evidence_id} not proposal-eligible: ${e.proposal_eligibility}`));
    }
    if (e.proposal_eligibility === L14EvidenceProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT) {
      foundEligible = true;
    }
  }
  // If ALL evidence is review-only, must not promote.
  if (!foundEligible &&
      evidence.length > 0 &&
      evidence.every(e => e.proposal_eligibility === L14EvidenceProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY)) {
    issues.push(err(C.L14Q_HUMAN_REVIEW_ONLY_EVIDENCE_PROMOTED_TO_FORMAL_PROPOSAL, SEV.CRITICAL,
      'all evidence is review-only — formal proposal not allowed'));
  }
  return result(issues);
}
