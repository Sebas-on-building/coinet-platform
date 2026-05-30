/**
 * L14.7 — Calibration Proposal Invariants
 *
 * §14.7.54 — INV-14.7-A through INV-14.7-L.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationProposalEligibilityClass,
  L14CalibrationReviewPriority,
  L14CalibrationSampleSufficiencyClass,
  L14CalibrationSubjectClass,
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
} from '../contracts/calibration-proposal-core';
import { L14_LAYER_REVIEW_QUEUE } from '../contracts/calibration-proposal-handoff';
import {
  buildL14CalibrationProposal,
  buildL14CalibrationProposalEvidencePack,
  buildL14CalibrationProposalRequest,
  buildL14CalibrationReviewNote,
  buildL14LowerLayerRatificationHandoff,
  classifyL14ProposalReadiness,
  classifyL14ProposedAction,
  defaultL14ProposalNonClaims,
  evaluateL14CalibrationProposalEligibility,
  isProposedActionWordingLegal,
  mapL14ProposalAffectedTargets,
  resolveL14ProposalReviewPriority,
  resolveL14RequiredRecertificationScope,
  routeL14ProposalReviewQueue,
} from '../proposals/calibration-proposal-engines';
import {
  validateL14CalibrationProposal,
  validateL14CalibrationProposalRequest,
  validateL14CalibrationProposalEvidencePack,
  validateL14LowerLayerRatificationHandoff,
  validateL14ProposalEvidenceCompatibility,
  validateL14ProposedAction,
  validateL14RequiredRecertificationScope,
  validateL14CalibrationReviewNote,
} from '../validation/calibration-proposal.validators';

const POLICY_V = 'l14.proposal.v1';

export interface L14_7InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

function inv(id: string, name: string, holds: boolean, evidence: string): L14_7InvariantResult {
  return { id, name, holds, evidence };
}

// ── Fixture builders ──────────────────────────────────────────────

function makeEvidence(opts: {
  cls: L14CalibrationEvidenceClass;
  subjectCls: L14CalibrationSubjectClass;
  subjectRef: string;
  eligibility: L14CalibrationProposalEligibilityClass;
  targetClass: L14CalibrationLowerLayerTargetClass;
  targetRef: string;
  confidence?: L14CalibrationEvidenceConfidenceClass;
  reviewPriority?: L14CalibrationReviewPriority;
  sample?: number;
  counterevidence?: readonly string[];
}): L14CalibrationEvidenceRecord {
  const sample = opts.sample ?? 640;
  const replayHash = fnv1a([
    opts.cls, opts.subjectCls, opts.subjectRef, opts.eligibility,
    opts.targetClass, opts.targetRef, String(sample), POLICY_V,
  ].join('|'));
  return {
    calibration_evidence_id: `l14.evidence.${replayHash}`,
    evidence_class: opts.cls,
    subject_class: opts.subjectCls,
    subject_ref: opts.subjectRef,
    sample_size: sample,
    sample_sufficiency_class: L14CalibrationSampleSufficiencyClass.SAMPLE_STRONG,
    confidence_class: opts.confidence ?? L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE,
    observed_pattern_summary: 'fixture',
    structured_findings: [{ finding_id: `l14.evidence.finding.${replayHash}` }],
    supporting_aggregate_refs: [`l14.evidence.aggregate.${replayHash}`],
    counterevidence_refs: opts.counterevidence ?? [],
    affected_lower_layer_targets: [{
      calibration_target_ref_id: `l14.evidence.target.${replayHash}`,
      target_layer: 'L11',
      target_class: opts.targetClass,
      target_ref: opts.targetRef,
      why_affected: 'fixture',
      mutation_allowed_in_l14_6: false,
      policy_version: 'l14.evidence.v1',
    }],
    recommended_review_priority: opts.reviewPriority ?? L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: opts.eligibility,
    interpretation_limitations: [],
    input_mode: 'OUTCOME_ONLY' as any,
    lineage_refs: ['l14.evidence.lineage'],
    replay_hash: replayHash,
    policy_version: 'l14.evidence.v1',
  };
}

function buildFullProposal(opts?: {
  withCounterevidence?: boolean;
  reviewPriority?: L14CalibrationReviewPriority;
  proposalClass?: L14CalibrationProposalClass;
}) {
  const pCls = opts?.proposalClass ?? L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW;
  const e = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.80',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetRef: 'l11.threshold.opportunity.80',
    counterevidence: opts?.withCounterevidence ? ['l14.evidence.counter.1'] : [],
    reviewPriority: opts?.reviewPriority,
  });
  const req = buildL14CalibrationProposalRequest({
    proposal_class: pCls,
    source_calibration_evidence_refs: [e.calibration_evidence_id],
    requested_by: 'SCHEDULED_PROPOSAL_SWEEP',
  });
  const eligibility = evaluateL14CalibrationProposalEligibility({ request: req, evidence: [e] });
  const pack = buildL14CalibrationProposalEvidencePack({
    primary: [e],
    counterevidence_refs: opts?.withCounterevidence ? ['l14.evidence.counter.1'] : [],
    eligibility_basis: ['ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT'],
  });
  const targets = mapL14ProposalAffectedTargets({ proposal_class: pCls, evidence: [e] });
  const reviewPriority = resolveL14ProposalReviewPriority({
    evidence: [e], counterevidence_present: !!opts?.withCounterevidence,
  });
  const readiness = classifyL14ProposalReadiness({
    eligibility_status: eligibility.eligibility_status,
    counterevidence_present: !!opts?.withCounterevidence,
  });
  const seed = buildL14CalibrationProposal({
    request: req, eligibility, evidence_pack: pack,
    affected_target_refs: targets,
    proposal_summary: 'Review whether high-band threshold separation is appropriate.',
    proposed_action: 'Review whether the HIGH-band threshold should be re-examined under transition regime.',
    expected_improvement_claim: 'Improved alert specificity.',
    review_priority: reviewPriority,
    readiness,
  });
  const handoff = buildL14LowerLayerRatificationHandoff({ proposal: seed });
  const proposal = buildL14CalibrationProposal({
    request: req, eligibility, evidence_pack: pack,
    affected_target_refs: targets,
    proposal_summary: seed.proposal_summary,
    proposed_action: seed.proposed_action,
    expected_improvement_claim: seed.expected_improvement_claim,
    review_priority: reviewPriority,
    readiness,
    lower_layer_ratification_handoff_ref: handoff.ratification_handoff_id,
  });
  return { e, req, eligibility, pack, targets, proposal, handoff };
}

// ── INV-14.7-A : propose-not-mutate law ───────────────────────────

export function checkINV_147_A(): L14_7InvariantResult {
  const { proposal } = buildFullProposal();
  const allTargetsNonMut = proposal.affected_target_refs.every(t => t.direct_mutation_requested === false);
  return inv('INV-14.7-A', 'propose-not-mutate',
    proposal.automatic_application_allowed === false &&
    proposal.requires_review === true &&
    allTargetsNonMut,
    `auto=${proposal.automatic_application_allowed} review=${proposal.requires_review} targetsNonMut=${allTargetsNonMut}`);
}

// ── INV-14.7-B : evidence eligibility law ─────────────────────────

export function checkINV_147_B(): L14_7InvariantResult {
  const ineligible = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.B',
    eligibility: L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_INSUFFICIENT_SAMPLE,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetRef: 'l11.threshold.B',
  });
  const v = validateL14ProposalEvidenceCompatibility(
    L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    [ineligible],
  );
  return inv('INV-14.7-B', 'evidence eligibility law', !v.clean,
    `validatorRejects=${!v.clean}`);
}

// ── INV-14.7-C : human-review-only separation law ─────────────────

export function checkINV_147_C(): L14_7InvariantResult {
  const reviewOnly = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.C',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetRef: 'l11.threshold.C',
  });
  const req = buildL14CalibrationProposalRequest({
    proposal_class: L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    source_calibration_evidence_refs: [reviewOnly.calibration_evidence_id],
    requested_by: 'HUMAN_ANALYST_REQUEST',
  });
  const elig = evaluateL14CalibrationProposalEligibility({ request: req, evidence: [reviewOnly] });
  const note = buildL14CalibrationReviewNote({
    source_evidence_refs: [reviewOnly.calibration_evidence_id],
    subject_ref: reviewOnly.subject_ref,
    affected_layer_hint: 'L11',
    note_summary: 'Pattern noted for analyst triage',
    reason_not_promoted_to_proposal: 'review-only evidence',
  });
  const v = validateL14CalibrationReviewNote(note, [reviewOnly]);
  const formalRejected = validateL14ProposalEvidenceCompatibility(
    L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    [reviewOnly],
  );
  return inv('INV-14.7-C', 'human-review-only separation',
    elig.eligibility_status === L14CalibrationProposalEligibilityStatus.ELIGIBLE_FOR_HUMAN_NOTE_ONLY &&
    v.clean && !formalRejected.clean,
    `status=${elig.eligibility_status} noteValid=${v.clean} formalRejected=${!formalRejected.clean}`);
}

// ── INV-14.7-D : proposal class compatibility law ─────────────────

export function checkINV_147_D(): L14_7InvariantResult {
  // Wrong evidence class for proposal class.
  const wrong = makeEvidence({
    cls: L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS,
    subjectCls: L14CalibrationSubjectClass.ALERT_CLASS,
    subjectRef: 'l13.alert.cls',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L13_ALERT_EXPRESSION_POLICY,
    targetRef: 'l13.alert.policy',
  });
  const v = validateL14ProposalEvidenceCompatibility(
    L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    [wrong],
  );
  return inv('INV-14.7-D', 'proposal class compatibility',
    !v.clean,
    `validatorRejects=${!v.clean}`);
}

// ── INV-14.7-E : counterevidence preservation law ────────────────

export function checkINV_147_E(): L14_7InvariantResult {
  const { proposal } = buildFullProposal({ withCounterevidence: true });
  const v = validateL14CalibrationProposal(proposal);
  // Counterevidence present → readiness must be READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED.
  const readinessOk = proposal.proposal_readiness === L14CalibrationProposalReadinessClass.READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED;
  // Counterevidence refs preserved.
  const preserved = proposal.counterevidence_refs.length > 0;
  // Counterevidence caps priority to MEDIUM.
  const cappedPriority = proposal.review_priority === L14CalibrationReviewPriority.MEDIUM;
  return inv('INV-14.7-E', 'counterevidence preservation',
    v.clean && readinessOk && preserved && cappedPriority,
    `valid=${v.clean} readiness=${readinessOk} preserved=${preserved} capped=${cappedPriority}`);
}

// ── INV-14.7-F : review priority honesty law ─────────────────────

export function checkINV_147_F(): L14_7InvariantResult {
  // Build proposal then forge CRITICAL review priority on LOW evidence.
  const { proposal } = buildFullProposal();
  const forged = { ...proposal, review_priority: L14CalibrationReviewPriority.CRITICAL,
    evidence_confidence: L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE };
  const v = validateL14CalibrationProposal(forged);
  return inv('INV-14.7-F', 'review priority honesty', !v.clean,
    `forgedRejected=${!v.clean}`);
}

// ── INV-14.7-G : recertification law ─────────────────────────────

export function checkINV_147_G(): L14_7InvariantResult {
  const vMissing = validateL14RequiredRecertificationScope([], true);
  const vNoneFalseGreen = validateL14RequiredRecertificationScope([L14RequiredRecertificationScope.NONE], true);
  const vScoped = validateL14RequiredRecertificationScope([L14RequiredRecertificationScope.TARGET_LAYER_AND_DOWNSTREAM_REGRESSION], true);
  const formulaScope = resolveL14RequiredRecertificationScope(L14CalibrationProposalClass.L11_FORMULA_COMPONENT_REVIEW);
  const isMaster = formulaScope[0] === L14RequiredRecertificationScope.FULL_MASTER_RATIFICATION_REQUIRED;
  return inv('INV-14.7-G', 'recertification law',
    !vMissing.clean && !vNoneFalseGreen.clean && vScoped.clean && isMaster,
    `missingRejected=${!vMissing.clean} noneRejected=${!vNoneFalseGreen.clean} scopedOk=${vScoped.clean} formulaMaster=${isMaster}`);
}

// ── INV-14.7-H : lower-layer ownership law ───────────────────────

export function checkINV_147_H(): L14_7InvariantResult {
  // Affected layer must match canonical owning layer.
  const { proposal, handoff } = buildFullProposal({ proposalClass: L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW });
  // Use L12 evidence target.
  const e2 = makeEvidence({
    cls: L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION,
    subjectCls: L14CalibrationSubjectClass.SCENARIO_TEMPLATE,
    subjectRef: 'l12.scen.tmpl.X',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE,
    targetRef: 'l12.cap.rule.1',
  });
  const req = buildL14CalibrationProposalRequest({
    proposal_class: L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW,
    source_calibration_evidence_refs: [e2.calibration_evidence_id],
    requested_by: 'SCHEDULED_PROPOSAL_SWEEP',
  });
  const eligibility = evaluateL14CalibrationProposalEligibility({ request: req, evidence: [e2] });
  const pack = buildL14CalibrationProposalEvidencePack({
    primary: [e2], eligibility_basis: ['ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT'],
  });
  const targets = mapL14ProposalAffectedTargets({ proposal_class: L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW, evidence: [e2] });
  const seed2 = buildL14CalibrationProposal({
    request: req, eligibility, evidence_pack: pack, affected_target_refs: targets,
    proposal_summary: 'Review whether L12 path confidence cap should be re-examined.',
    proposed_action: 'Review whether confidence-cap escalation conditions should be re-examined under transition regime.',
    expected_improvement_claim: 'Reduced overconfidence in transition regimes.',
    review_priority: L14CalibrationReviewPriority.HIGH,
    readiness: L14CalibrationProposalReadinessClass.READY_FOR_QUEUE,
  });
  const handoff2 = buildL14LowerLayerRatificationHandoff({ proposal: seed2 });
  const proposal2 = buildL14CalibrationProposal({
    request: req, eligibility, evidence_pack: pack, affected_target_refs: targets,
    proposal_summary: seed2.proposal_summary,
    proposed_action: seed2.proposed_action,
    expected_improvement_claim: seed2.expected_improvement_claim,
    review_priority: L14CalibrationReviewPriority.HIGH,
    readiness: L14CalibrationProposalReadinessClass.READY_FOR_QUEUE,
    lower_layer_ratification_handoff_ref: handoff2.ratification_handoff_id,
  });
  const v = validateL14LowerLayerRatificationHandoff(handoff2, proposal2);
  const layerMatch = proposal2.affected_layer === L14_PROPOSAL_CLASS_OWNING_LAYER[L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW];
  const queueMatch = handoff2.owning_review_queue === L14_LAYER_REVIEW_QUEUE.L12;
  // Adversarial: mismatched owning layer.
  const bad = { ...handoff2, owning_layer: 'L11' as any };
  const vBad = validateL14LowerLayerRatificationHandoff(bad, proposal2);
  return inv('INV-14.7-H', 'lower-layer ownership law',
    v.clean && layerMatch && queueMatch && !vBad.clean,
    `valid=${v.clean} layerMatch=${layerMatch} queueMatch=${queueMatch} mismatchRejected=${!vBad.clean}`);
}

// ── INV-14.7-I : non-executable wording law ───────────────────────

export function checkINV_147_I(): L14_7InvariantResult {
  const legit = isProposedActionWordingLegal('Review whether the threshold should be re-examined under transition regime.');
  const illegit = isProposedActionWordingLegal('Lower the threshold from 80 to 72.');
  const illegit2 = isProposedActionWordingLegal('Disable this template now.');
  const v = validateL14ProposedAction(
    'Lower the threshold from 80 to 72.',
    L14ProposedActionClass.REVIEW_THRESHOLD_SEPARATION,
    L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
  );
  return inv('INV-14.7-I', 'non-executable wording',
    legit && !illegit && !illegit2 && !v.clean,
    `legit=${legit} illegit1=${!illegit} illegit2=${!illegit2} validatorRejects=${!v.clean}`);
}

// ── INV-14.7-J : proposal evidence pack law ───────────────────────

export function checkINV_147_J(): L14_7InvariantResult {
  const { pack, proposal } = buildFullProposal();
  const v = validateL14CalibrationProposalEvidencePack(pack);
  const vMissing = validateL14CalibrationProposalEvidencePack(undefined);
  const requiredFields = pack.sample_size_summary.total_sample_size > 0 &&
    pack.confidence_summary.evidence_confidence_floor !== undefined &&
    pack.aggregate_computation_refs.length > 0;
  const hasNonClaims = proposal.explicit_non_claims.length === defaultL14ProposalNonClaims().length;
  return inv('INV-14.7-J', 'proposal evidence pack law',
    v.clean && !vMissing.clean && requiredFields && hasNonClaims,
    `valid=${v.clean} missingRejected=${!vMissing.clean} fields=${requiredFields} nonClaims=${hasNonClaims}`);
}

// ── INV-14.7-K : review queue and handoff law ─────────────────────

export function checkINV_147_K(): L14_7InvariantResult {
  // Every owning layer maps to its canonical queue.
  const layers: Array<'L10' | 'L11' | 'L12' | 'L13' | 'L14'> = ['L10', 'L11', 'L12', 'L13', 'L14'];
  let allMatch = true;
  for (const L of layers) {
    const q = routeL14ProposalReviewQueue(L);
    if (q !== L14_LAYER_REVIEW_QUEUE[L]) allMatch = false;
  }
  const { proposal, handoff } = buildFullProposal();
  const v = validateL14LowerLayerRatificationHandoff(handoff, proposal);
  // READY proposal without handoff_ref → validator rejects.
  const noHandoff = { ...proposal, lower_layer_ratification_handoff_ref: undefined };
  const vNoHandoff = validateL14CalibrationProposal(noHandoff);
  return inv('INV-14.7-K', 'review queue and handoff law',
    allMatch && v.clean && !vNoHandoff.clean,
    `allMatch=${allMatch} handoffOk=${v.clean} missingHandoffRejected=${!vNoHandoff.clean}`);
}

// ── INV-14.7-L : lineage and replay law ──────────────────────────

export function checkINV_147_L(): L14_7InvariantResult {
  const { req, eligibility, pack, proposal, handoff } = buildFullProposal();
  const vReq = validateL14CalibrationProposalRequest(req);
  const vProp = validateL14CalibrationProposal(proposal);
  const vHandoff = validateL14LowerLayerRatificationHandoff(handoff, proposal);
  // Replay determinism.
  const { proposal: proposal2 } = buildFullProposal();
  const same = proposal.replay_hash === proposal2.replay_hash;
  const allLineage = !!req.lineage_refs.length && !!eligibility.lineage_refs.length &&
    !!pack.lineage_refs.length && !!proposal.lineage_refs.length && !!handoff.lineage_refs.length;
  return inv('INV-14.7-L', 'lineage and replay law',
    vReq.clean && vProp.clean && vHandoff.clean && same && allLineage,
    `req=${vReq.clean} prop=${vProp.clean} handoff=${vHandoff.clean} replay=${same} lineage=${allLineage}`);
}

// Keep helpers live.
void classifyL14ProposedAction;
void L14CalibrationProposalStatus.DRAFTED;

export function runAllL14_7Invariants(): readonly L14_7InvariantResult[] {
  return [
    checkINV_147_A(),
    checkINV_147_B(),
    checkINV_147_C(),
    checkINV_147_D(),
    checkINV_147_E(),
    checkINV_147_F(),
    checkINV_147_G(),
    checkINV_147_H(),
    checkINV_147_I(),
    checkINV_147_J(),
    checkINV_147_K(),
    checkINV_147_L(),
  ];
}
