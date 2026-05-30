/**
 * L14.7 — Calibration Proposal Certification (Bands A..H)
 *
 * §14.7.55 — Proves classes/policies/eligibility, no-mutation law,
 * evidence pack + counterevidence, per-layer proposal classes,
 * review priority + recertification, queue routing + handoff,
 * human review note path, audit + invariants.
 */

import { fnv1a } from '../l13/context/_fnv1a';
import { L14ConstitutionalAuditSeverity } from '../l14/contracts/l14-constitutional-types';
import {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationProposalEligibilityClass,
  L14CalibrationReviewPriority,
  L14CalibrationSampleSufficiencyClass,
  L14CalibrationSubjectClass,
  type L14CalibrationEvidenceRecord,
} from '../l14/contracts/calibration-evidence-core';
import {
  ALL_L14_CALIBRATION_PROPOSAL_CLASSES,
  L14CalibrationProposalClass,
  L14CalibrationProposalEligibilityStatus,
  L14CalibrationProposalReadinessClass,
  L14CalibrationProposalStatus,
  L14ProposedActionClass,
  L14RequiredRecertificationScope,
  L14_PROPOSAL_CLASS_DEFAULT_RECERTIFICATION,
  L14_PROPOSAL_CLASS_OWNING_LAYER,
} from '../l14/contracts/calibration-proposal-core';
import {
  L14ProposalReviewQueueClass,
  L14_LAYER_REVIEW_QUEUE,
} from '../l14/contracts/calibration-proposal-handoff';
import {
  buildL14CalibrationProposal,
  buildL14CalibrationProposalClassPolicy,
  buildL14CalibrationProposalEvidencePack,
  buildL14CalibrationProposalRequest,
  buildL14CalibrationReviewNote,
  buildL14LowerLayerRatificationHandoff,
  classifyL14ProposalReadiness,
  classifyL14ProposedAction,
  defaultL14ProposalNonClaims,
  evaluateL14CalibrationProposalEligibility,
  getAllL14ProposalClassPolicies,
  isActionClassLegalForProposal,
  isEvidenceClassLegalForProposal,
  isProposedActionWordingLegal,
  isTargetClassLegalForProposal,
  mapL14ProposalAffectedTargets,
  resolveL14ProposalReviewPriority,
  resolveL14RequiredRecertificationScope,
  routeL14ProposalReviewQueue,
} from '../l14/proposals/calibration-proposal-engines';
import {
  validateL14CalibrationProposal,
  validateL14CalibrationProposalEligibility,
  validateL14CalibrationProposalEvidencePack,
  validateL14CalibrationProposalRequest,
  validateL14CalibrationReviewNote,
  validateL14LowerLayerRatificationHandoff,
  validateL14ProposalAffectedTargetRef,
  validateL14ProposalEvidenceCompatibility,
  validateL14ProposalReviewPriority,
  validateL14ProposedAction,
  validateL14RequiredRecertificationScope,
} from '../l14/validation/calibration-proposal.validators';
import { L14CalibrationProposalViolationCode } from '../l14/validation/l14-calibration-proposal-violation-codes';
import {
  L14CalibrationProposalAuditSubjectClass,
  emitL14CalibrationProposalAuditRecord,
  getL14CalibrationProposalAuditLog,
  getL14CalibrationProposalCriticalViolations,
  isL14CalibrationProposalBlockingCode,
  resetL14CalibrationProposalAuditLog,
  severityForL14CalibrationProposalCode,
} from '../l14/constitution/l14-calibration-proposal-audit';
import { runAllL14_7Invariants } from '../l14/invariants/l14_7-invariants';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: unknown, msg: string): void {
  if (cond) { passed += 1; console.log(`  ✓ ${msg}`); }
  else { failed += 1; failures.push(msg); console.log(`  ✗ ${msg}`); }
}

function band(name: string): void { console.log(''); console.log(`── ${name} ──`); }

const POLICY_V = 'l14.evidence.v1';

function makeEvidence(opts: {
  cls: L14CalibrationEvidenceClass;
  subjectCls: L14CalibrationSubjectClass;
  subjectRef: string;
  eligibility: L14CalibrationProposalEligibilityClass;
  targetClass: L14CalibrationLowerLayerTargetClass;
  targetLayer: 'L10' | 'L11' | 'L12' | 'L13' | 'L14';
  targetRef: string;
  confidence?: L14CalibrationEvidenceConfidenceClass;
  reviewPriority?: L14CalibrationReviewPriority;
  sample?: number;
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
    observed_pattern_summary: 'cert',
    structured_findings: [{ finding_id: `l14.evidence.finding.${replayHash}` }],
    supporting_aggregate_refs: [`l14.evidence.aggregate.${replayHash}`],
    counterevidence_refs: [],
    affected_lower_layer_targets: [{
      calibration_target_ref_id: `l14.evidence.target.${replayHash}`,
      target_layer: opts.targetLayer,
      target_class: opts.targetClass,
      target_ref: opts.targetRef,
      why_affected: 'cert',
      mutation_allowed_in_l14_6: false,
      policy_version: POLICY_V,
    }],
    recommended_review_priority: opts.reviewPriority ?? L14CalibrationReviewPriority.HIGH,
    proposal_eligibility: opts.eligibility,
    interpretation_limitations: [],
    input_mode: 'OUTCOME_ONLY' as any,
    lineage_refs: ['l14.evidence.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

function buildProposalFor(pCls: L14CalibrationProposalClass, e: L14CalibrationEvidenceRecord) {
  const req = buildL14CalibrationProposalRequest({
    proposal_class: pCls,
    source_calibration_evidence_refs: [e.calibration_evidence_id],
    requested_by: 'SCHEDULED_PROPOSAL_SWEEP',
  });
  const eligibility = evaluateL14CalibrationProposalEligibility({ request: req, evidence: [e] });
  const pack = buildL14CalibrationProposalEvidencePack({
    primary: [e], eligibility_basis: ['ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT'],
  });
  const targets = mapL14ProposalAffectedTargets({ proposal_class: pCls, evidence: [e] });
  const readiness = classifyL14ProposalReadiness({ eligibility_status: eligibility.eligibility_status, counterevidence_present: false });
  const proposalSeed = buildL14CalibrationProposal({
    request: req, eligibility, evidence_pack: pack, affected_target_refs: targets,
    proposal_summary: 'Review whether the policy surface should be re-examined.',
    proposed_action: 'Review whether the policy surface should be re-examined under the relevant regime/horizon.',
    expected_improvement_claim: 'Improved calibration posture.',
    review_priority: resolveL14ProposalReviewPriority({ evidence: [e], counterevidence_present: false }),
    readiness,
  });
  const handoff = buildL14LowerLayerRatificationHandoff({ proposal: proposalSeed });
  const queue = routeL14ProposalReviewQueue(proposalSeed.affected_layer);
  const proposal = buildL14CalibrationProposal({
    request: req, eligibility, evidence_pack: pack, affected_target_refs: targets,
    proposal_summary: proposalSeed.proposal_summary,
    proposed_action: proposalSeed.proposed_action,
    expected_improvement_claim: proposalSeed.expected_improvement_claim,
    review_priority: proposalSeed.review_priority,
    readiness,
    lower_layer_ratification_handoff_ref: handoff.ratification_handoff_id,
    review_queue_ref: queue,
  });
  return { req, eligibility, pack, targets, proposal, handoff };
}

console.log('L14.7 — Calibration Proposal Certification');

// ── BAND A : Proposal classes, policies, eligibility ─────────────
band('BAND A — proposal classes / policies / eligibility');

{
  assert(ALL_L14_CALIBRATION_PROPOSAL_CLASSES.length === 10, `A.1 10 proposal classes registered (got ${ALL_L14_CALIBRATION_PROPOSAL_CLASSES.length})`);
  const policies = getAllL14ProposalClassPolicies();
  assert(policies.length === 10, `A.2 10 class policies built (got ${policies.length})`);
  // Owning-layer map covers all.
  let allLayersOk = true;
  for (const c of ALL_L14_CALIBRATION_PROPOSAL_CLASSES) {
    if (!L14_PROPOSAL_CLASS_OWNING_LAYER[c]) allLayersOk = false;
  }
  assert(allLayersOk, 'A.3 every proposal class has owning layer');
  // Eligibility green path.
  const eOk = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.A',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetLayer: 'L11', targetRef: 'l11.threshold.A',
  });
  const reqA = buildL14CalibrationProposalRequest({
    proposal_class: L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    source_calibration_evidence_refs: [eOk.calibration_evidence_id],
    requested_by: 'SCHEDULED_PROPOSAL_SWEEP',
  });
  const elig = evaluateL14CalibrationProposalEligibility({ request: reqA, evidence: [eOk] });
  assert(elig.eligibility_status === L14CalibrationProposalEligibilityStatus.ELIGIBLE_FOR_PROPOSAL_BUILD, 'A.4 eligible evidence → ELIGIBLE_FOR_PROPOSAL_BUILD');
  // Insufficient eligibility blocks.
  const eIns = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.A2',
    eligibility: L14CalibrationProposalEligibilityClass.NOT_ELIGIBLE_INSUFFICIENT_SAMPLE,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetLayer: 'L11', targetRef: 'l11.threshold.A2',
  });
  const reqIns = buildL14CalibrationProposalRequest({
    proposal_class: L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    source_calibration_evidence_refs: [eIns.calibration_evidence_id],
    requested_by: 'SCHEDULED_PROPOSAL_SWEEP',
  });
  const eligIns = evaluateL14CalibrationProposalEligibility({ request: reqIns, evidence: [eIns] });
  assert(!eligIns.eligible, 'A.5 insufficient evidence not eligible for build');
  // Human-review-only does not create formal proposal.
  const eRev = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.A3',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetLayer: 'L11', targetRef: 'l11.threshold.A3',
  });
  const reqRev = buildL14CalibrationProposalRequest({
    proposal_class: L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
    source_calibration_evidence_refs: [eRev.calibration_evidence_id],
    requested_by: 'HUMAN_ANALYST_REQUEST',
  });
  const eligRev = evaluateL14CalibrationProposalEligibility({ request: reqRev, evidence: [eRev] });
  assert(eligRev.eligibility_status === L14CalibrationProposalEligibilityStatus.ELIGIBLE_FOR_HUMAN_NOTE_ONLY, 'A.6 human-review-only → ELIGIBLE_FOR_HUMAN_NOTE_ONLY');
  // Eligibility validator green.
  assert(validateL14CalibrationProposalEligibility(elig).clean, 'A.7 eligibility validator clean');
  // Eligibility validator rejects forged status.
  const forged = { ...elig, eligibility_status: L14CalibrationProposalEligibilityStatus.BLOCKED_INSUFFICIENT_EVIDENCE };
  assert(!validateL14CalibrationProposalEligibility(forged).clean, 'A.8 eligibility false-green rejected');
}

// ── BAND B : Proposal object and no-mutation law ─────────────────
band('BAND B — proposal object / no-mutation law');

{
  const e = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.B',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetLayer: 'L11', targetRef: 'l11.threshold.B',
  });
  const { proposal } = buildProposalFor(L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW, e);
  assert(proposal.automatic_application_allowed === false, 'B.1 automatic_application_allowed=false');
  assert(proposal.requires_review === true, 'B.2 requires_review=true');
  assert(proposal.affected_target_refs.every(t => t.direct_mutation_requested === false), 'B.3 every target ref hard-pinned no-mutation');
  assert(proposal.explicit_non_claims.length === defaultL14ProposalNonClaims().length, 'B.4 explicit non-claims present');
  assert(isProposedActionWordingLegal(proposal.proposed_action), 'B.5 proposed action is review-oriented');
  // Adversarial: flip auto-application flag.
  const bad = { ...proposal, automatic_application_allowed: true } as any;
  assert(!validateL14CalibrationProposal(bad).clean, 'B.6 forged automatic_application_allowed rejected');
  // Adversarial: executable wording.
  const v = validateL14ProposedAction(
    'Lower the threshold from 80 to 72.',
    L14ProposedActionClass.REVIEW_THRESHOLD_SEPARATION,
    L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW,
  );
  assert(!v.clean, 'B.7 executable wording rejected');
  // Missing non-claims rejected.
  const noClaims = { ...proposal, explicit_non_claims: [] };
  assert(!validateL14CalibrationProposal(noClaims).clean, 'B.8 missing non-claims rejected');
  // Validator green on legit proposal.
  assert(validateL14CalibrationProposal(proposal).clean, 'B.9 legit proposal validator clean');
}

// ── BAND C : Evidence pack and counterevidence ───────────────────
band('BAND C — evidence pack / counterevidence');

{
  const e = makeEvidence({
    cls: L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION,
    subjectCls: L14CalibrationSubjectClass.SCENARIO_TEMPLATE,
    subjectRef: 'l12.scen.tmpl.C',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE,
    targetLayer: 'L12', targetRef: 'l12.cap.rule.C',
  });
  const pack = buildL14CalibrationProposalEvidencePack({
    primary: [e], eligibility_basis: ['ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT'],
  });
  assert(validateL14CalibrationProposalEvidencePack(pack).clean, 'C.1 evidence pack validator clean');
  assert(pack.sample_size_summary.total_sample_size === e.sample_size, 'C.2 sample size summary correct');
  assert(pack.confidence_summary.evidence_confidence_floor === L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE, 'C.3 confidence floor correct');
  // Counterevidence preserved.
  const packCounter = buildL14CalibrationProposalEvidencePack({
    primary: [e], counterevidence_refs: ['l14.evidence.counter.1'],
    eligibility_basis: ['ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT'],
  });
  assert(packCounter.counterevidence_refs.length === 1, 'C.4 counterevidence preserved');
  // Counterevidence-blocked evidence rejected.
  const eBlocked = makeEvidence({
    cls: L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION,
    subjectCls: L14CalibrationSubjectClass.SCENARIO_TEMPLATE,
    subjectRef: 'l12.scen.tmpl.Cb',
    eligibility: L14CalibrationProposalEligibilityClass.BLOCKED_CONTRADICTORY_EVIDENCE,
    targetClass: L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE,
    targetLayer: 'L12', targetRef: 'l12.cap.rule.Cb',
  });
  const v = validateL14ProposalEvidenceCompatibility(
    L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW, [eBlocked],
  );
  assert(!v.clean, 'C.5 counterevidence-blocked evidence rejected');
  // Mixed-but-reviewable readiness with counterevidence.
  const req = buildL14CalibrationProposalRequest({
    proposal_class: L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW,
    source_calibration_evidence_refs: [e.calibration_evidence_id],
    requested_by: 'SCHEDULED_PROPOSAL_SWEEP',
  });
  const eligibility = evaluateL14CalibrationProposalEligibility({ request: req, evidence: [e] });
  const targets = mapL14ProposalAffectedTargets({ proposal_class: L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW, evidence: [e] });
  const propWithCounter = buildL14CalibrationProposal({
    request: req, eligibility, evidence_pack: packCounter, affected_target_refs: targets,
    proposal_summary: 'Review whether confidence cap should be re-examined.',
    proposed_action: 'Review whether confidence-cap escalation conditions should be re-examined under transition regime.',
    expected_improvement_claim: 'Reduced overconfidence in transition regimes.',
    review_priority: L14CalibrationReviewPriority.MEDIUM,
    readiness: L14CalibrationProposalReadinessClass.READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED,
  });
  const handoff = buildL14LowerLayerRatificationHandoff({ proposal: propWithCounter });
  const propWithCounterHandoff = { ...propWithCounter, lower_layer_ratification_handoff_ref: handoff.ratification_handoff_id };
  assert(validateL14CalibrationProposal(propWithCounterHandoff).clean, 'C.6 ready+counterevidence-disclosed proposal accepted');
  // Counterevidence ignored: forced READY_FOR_QUEUE with counterevidence_refs present → rejected.
  const propIgnoring = { ...propWithCounterHandoff, proposal_readiness: L14CalibrationProposalReadinessClass.READY_FOR_QUEUE };
  assert(!validateL14CalibrationProposal(propIgnoring).clean, 'C.7 counterevidence ignored rejected');
}

// ── BAND D : Proposal classes by lower layer ─────────────────────
band('BAND D — proposal classes by lower layer');

{
  type Case = { p: L14CalibrationProposalClass; e: L14CalibrationEvidenceClass; t: L14CalibrationLowerLayerTargetClass; layer: 'L10' | 'L11' | 'L12' | 'L13' | 'L14'; subjectCls: L14CalibrationSubjectClass };
  const cases: readonly Case[] = [
    { p: L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW, e: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION, t: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY, layer: 'L11', subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY },
    { p: L14CalibrationProposalClass.L11_CONFIDENCE_CAP_REVIEW, e: L14CalibrationEvidenceClass.SCORE_CONFIDENCE_ACCURACY, t: L14CalibrationLowerLayerTargetClass.L11_SCORE_CONFIDENCE_RULE, layer: 'L11', subjectCls: L14CalibrationSubjectClass.SCORE_BAND },
    { p: L14CalibrationProposalClass.L10_HYPOTHESIS_TEMPLATE_REVIEW, e: L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN, t: L14CalibrationLowerLayerTargetClass.L10_HYPOTHESIS_FAMILY_INTERPRETATION, layer: 'L10', subjectCls: L14CalibrationSubjectClass.HYPOTHESIS_FAMILY },
    { p: L14CalibrationProposalClass.L12_SCENARIO_TEMPLATE_REVIEW, e: L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION, t: L14CalibrationLowerLayerTargetClass.L12_SCENARIO_TEMPLATE, layer: 'L12', subjectCls: L14CalibrationSubjectClass.SCENARIO_TEMPLATE },
    { p: L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW, e: L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION, t: L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE, layer: 'L12', subjectCls: L14CalibrationSubjectClass.SCENARIO_TEMPLATE },
    { p: L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW, e: L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS, t: L14CalibrationLowerLayerTargetClass.L13_ALERT_EXPRESSION_POLICY, layer: 'L13', subjectCls: L14CalibrationSubjectClass.ALERT_CLASS },
    { p: L14CalibrationProposalClass.L14_ALERT_ROUTING_REVIEW, e: L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS, t: L14CalibrationLowerLayerTargetClass.L14_DELIVERY_PRIORITY_POLICY, layer: 'L14', subjectCls: L14CalibrationSubjectClass.ALERT_CLASS },
  ];
  for (const c of cases) {
    const ev = makeEvidence({
      cls: c.e, subjectCls: c.subjectCls,
      subjectRef: `subj.${c.layer}`,
      eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
      targetClass: c.t, targetLayer: c.layer, targetRef: `tgt.${c.layer}`,
    });
    const { proposal } = buildProposalFor(c.p, ev);
    assert(validateL14CalibrationProposal(proposal).clean, `D.${c.p} proposal validator clean`);
    assert(proposal.affected_layer === c.layer, `D.${c.p} affected_layer=${c.layer}`);
  }
  // Class/evidence mismatch rejected.
  const wrong = makeEvidence({
    cls: L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS,
    subjectCls: L14CalibrationSubjectClass.ALERT_CLASS,
    subjectRef: 'l13.alert.D',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L13_ALERT_EXPRESSION_POLICY,
    targetLayer: 'L13', targetRef: 'l13.alert.D',
  });
  const vWrong = validateL14ProposalEvidenceCompatibility(L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW, [wrong]);
  assert(!vWrong.clean, 'D.mismatch evidence class mismatch rejected');
}

// ── BAND E : Review priority and recertification ─────────────────
band('BAND E — review priority / recertification');

{
  // CRITICAL requires HIGH/STRONG evidence.
  const e = makeEvidence({
    cls: L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    subjectCls: L14CalibrationSubjectClass.SCORE_THRESHOLD_POLICY,
    subjectRef: 'l11.threshold.E',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY,
    targetLayer: 'L11', targetRef: 'l11.threshold.E',
    confidence: L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE,
    reviewPriority: L14CalibrationReviewPriority.CRITICAL,
  });
  const { proposal } = buildProposalFor(L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW, e);
  assert(proposal.review_priority === L14CalibrationReviewPriority.CRITICAL, 'E.1 review priority resolved from evidence');
  assert(validateL14ProposalReviewPriority(proposal).clean, 'E.2 CRITICAL priority with STRONG evidence accepted');
  // Forge CRITICAL with LOW evidence.
  const forged = { ...proposal, evidence_confidence: L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE };
  assert(!validateL14ProposalReviewPriority(forged).clean, 'E.3 CRITICAL with LOW confidence rejected');
  // Recertification scope.
  const scopeThreshold = resolveL14RequiredRecertificationScope(L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW);
  assert(scopeThreshold[0] === L14RequiredRecertificationScope.TARGET_LAYER_AND_DOWNSTREAM_REGRESSION, 'E.4 threshold review → DOWNSTREAM_REGRESSION');
  const scopeFormula = resolveL14RequiredRecertificationScope(L14CalibrationProposalClass.L11_FORMULA_COMPONENT_REVIEW);
  assert(scopeFormula[0] === L14RequiredRecertificationScope.FULL_MASTER_RATIFICATION_REQUIRED, 'E.5 formula component review → MASTER_RATIFICATION');
  const scopeCopy = resolveL14RequiredRecertificationScope(L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW);
  assert(scopeCopy[0] === L14RequiredRecertificationScope.TARGET_LAYER_LOCAL_CERTIFICATION, 'E.6 copy policy review → LOCAL_CERTIFICATION');
  // Recertification false-green rejected.
  assert(!validateL14RequiredRecertificationScope([L14RequiredRecertificationScope.NONE], true).clean, 'E.7 NONE scope with requires_recert rejected');
  assert(!validateL14RequiredRecertificationScope([], true).clean, 'E.8 empty scope with requires_recert rejected');
}

// ── BAND F : Queue routing and lower-layer handoff ───────────────
band('BAND F — queue routing / lower-layer handoff');

{
  const layers: Array<'L10' | 'L11' | 'L12' | 'L13' | 'L14'> = ['L10', 'L11', 'L12', 'L13', 'L14'];
  for (const L of layers) {
    const q = routeL14ProposalReviewQueue(L);
    assert(q === L14_LAYER_REVIEW_QUEUE[L], `F.${L} routes to ${L14_LAYER_REVIEW_QUEUE[L]}`);
  }
  // Handoff owning_layer matches proposal.
  const e = makeEvidence({
    cls: L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION,
    subjectCls: L14CalibrationSubjectClass.SCENARIO_TEMPLATE,
    subjectRef: 'l12.scen.tmpl.F',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT,
    targetClass: L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE,
    targetLayer: 'L12', targetRef: 'l12.cap.rule.F',
  });
  const { proposal, handoff } = buildProposalFor(L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW, e);
  assert(handoff.owning_layer === proposal.affected_layer, 'F.6 handoff owning_layer matches proposal');
  assert(validateL14LowerLayerRatificationHandoff(handoff, proposal).clean, 'F.7 handoff validator clean');
  // Mismatch rejected.
  const bad = { ...handoff, owning_layer: 'L11' as any };
  assert(!validateL14LowerLayerRatificationHandoff(bad, proposal).clean, 'F.8 mismatched owning_layer rejected');
  // Wrong queue rejected.
  const badQueue = { ...handoff, owning_review_queue: L14ProposalReviewQueueClass.L11_SCORE_GOVERNANCE_QUEUE };
  assert(!validateL14LowerLayerRatificationHandoff(badQueue, proposal).clean, 'F.9 wrong queue rejected');
  // automatic_application_allowed must be false.
  const badAuto = { ...handoff, automatic_application_allowed: true } as any;
  assert(!validateL14LowerLayerRatificationHandoff(badAuto, proposal).clean, 'F.10 auto-application=true rejected');
}

// ── BAND G : Human analyst review note path ──────────────────────
band('BAND G — human analyst review note path');

{
  const eRev = makeEvidence({
    cls: L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS,
    subjectCls: L14CalibrationSubjectClass.ALERT_CLASS,
    subjectRef: 'l13.alert.G',
    eligibility: L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY,
    targetClass: L14CalibrationLowerLayerTargetClass.L13_ALERT_EXPRESSION_POLICY,
    targetLayer: 'L13', targetRef: 'l13.alert.G',
  });
  const note = buildL14CalibrationReviewNote({
    source_evidence_refs: [eRev.calibration_evidence_id],
    subject_ref: eRev.subject_ref,
    affected_layer_hint: 'L13',
    note_summary: 'Pattern routed for analyst triage',
    reason_not_promoted_to_proposal: 'evidence eligible for human review only',
  });
  assert(validateL14CalibrationReviewNote(note, [eRev]).clean, 'G.1 review note validator clean');
  assert(note.routed_queue === 'HUMAN_ANALYST_TRIAGE_QUEUE', 'G.2 review note routed to analyst triage');
  // Missing note for review-only evidence rejected.
  assert(!validateL14CalibrationReviewNote(undefined, [eRev]).clean, 'G.3 missing note for review-only evidence rejected');
  // Note does not impersonate proposal: no proposal id or proposal class field.
  assert((note as any).calibration_proposal_id === undefined, 'G.4 review note has no proposal id');
  // Trying to formally propose from review-only evidence rejected.
  const v = validateL14ProposalEvidenceCompatibility(L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW, [eRev]);
  assert(!v.clean, 'G.5 review-only-only formal proposal rejected');
}

// ── BAND H : audit + invariants ───────────────────────────────────
band('BAND H — audit + invariants');

{
  resetL14CalibrationProposalAuditLog();
  const a = emitL14CalibrationProposalAuditRecord({
    subjectClass: L14CalibrationProposalAuditSubjectClass.CALIBRATION_PROPOSAL,
    subjectRef: 'l14.proposal.cert.1',
    violationCodes: [L14CalibrationProposalViolationCode.L14Q_MUTATION_REQUESTED_BY_PROPOSAL],
    message: 'cert',
  });
  const b = emitL14CalibrationProposalAuditRecord({
    subjectClass: L14CalibrationProposalAuditSubjectClass.CALIBRATION_PROPOSAL,
    subjectRef: 'l14.proposal.cert.1',
    violationCodes: [L14CalibrationProposalViolationCode.L14Q_MUTATION_REQUESTED_BY_PROPOSAL],
    message: 'cert',
  });
  assert(a.replay_hash === b.replay_hash, 'H.1 audit replay hash deterministic');
  assert(a.severity === L14ConstitutionalAuditSeverity.CRITICAL && a.blocking, 'H.2 mutation-requested is CRITICAL + blocking');
  assert(severityForL14CalibrationProposalCode(L14CalibrationProposalViolationCode.L14Q_LINEAGE_MISSING) === L14ConstitutionalAuditSeverity.ERROR, 'H.3 lineage-missing classified ERROR');
  assert(!isL14CalibrationProposalBlockingCode(L14CalibrationProposalViolationCode.L14Q_LINEAGE_MISSING), 'H.4 lineage-missing not blocking');
  assert(isL14CalibrationProposalBlockingCode(L14CalibrationProposalViolationCode.L14Q_AUTOMATIC_APPLICATION_FLAG_NOT_FALSE), 'H.5 auto-application-not-false blocking');
  assert(getL14CalibrationProposalAuditLog().length === 2, 'H.6 audit log queryable');
  assert(getL14CalibrationProposalCriticalViolations().length === 2, 'H.7 critical violations queryable');
  const invs = runAllL14_7Invariants();
  assert(invs.length === 12, `H.8 twelve invariants executed (got ${invs.length})`);
  for (const i of invs) {
    assert(i.holds, `H.9 ${i.id} ${i.name} (${i.evidence})`);
  }
}

console.log('');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}

// Touch unused references so transpile doesn't complain.
void classifyL14ProposedAction;
void isEvidenceClassLegalForProposal;
void isTargetClassLegalForProposal;
void isActionClassLegalForProposal;
void validateL14ProposalAffectedTargetRef;
void L14_PROPOSAL_CLASS_DEFAULT_RECERTIFICATION;
void L14CalibrationProposalStatus.DRAFTED;
void buildL14CalibrationProposalClassPolicy;
