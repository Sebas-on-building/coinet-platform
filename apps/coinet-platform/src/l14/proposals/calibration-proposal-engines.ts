/**
 * L14.7 — Calibration Proposal Engines
 *
 * §14.7.42 — Consolidated pure-function engines:
 * request resolver, eligibility, class compatibility, layer resolver,
 * target mapper, evidence pack builder, counterevidence binder,
 * summary composer, action classifier, recertification resolver,
 * priority resolver, readiness classifier, proposal builder,
 * review queue router, lower-layer handoff builder, review note builder.
 */

import { fnv1a } from '../../l13/context/_fnv1a';
import {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationLowerLayerTargetClass,
  L14CalibrationProposalEligibilityClass,
  L14CalibrationReviewPriority,
  L14CalibrationSampleSufficiencyClass,
  type L14CalibrationEvidenceRecord,
} from '../contracts/calibration-evidence-core';
import {
  ALL_L14_CALIBRATION_PROPOSAL_CLASSES,
  L14CalibrationProposalClass,
  L14CalibrationProposalEligibilityResult,
  L14CalibrationProposalEligibilityStatus,
  L14CalibrationProposalLimitation,
  L14CalibrationProposalMissingRequirement,
  L14CalibrationProposalReadinessClass,
  L14CalibrationProposalRequest,
  L14CalibrationProposalRequestSource,
  L14CalibrationProposalStatus,
  L14ProposalAffectedLayer,
  L14ProposalAffectedTargetRef,
  L14ProposalNonClaim,
  L14ProposedActionClass,
  L14RequiredRecertificationScope,
  L14_PROPOSAL_CLASS_DEFAULT_RECERTIFICATION,
  L14_PROPOSAL_CLASS_OWNING_LAYER,
  type L14CalibrationProposal,
} from '../contracts/calibration-proposal-core';
import {
  L14ProposalEvidenceConsistencyClass,
  type L14CalibrationProposalClassPolicy,
  type L14CalibrationProposalEvidencePack,
  type L14CalibrationReviewNote,
  type L14ProposalConfidenceSummary,
  type L14ProposalSampleSummary,
} from '../contracts/calibration-proposal-evidence-pack';
import {
  L14ProposalReviewQueueClass,
  L14_LAYER_REVIEW_QUEUE,
  type L14LowerLayerRatificationHandoff,
} from '../contracts/calibration-proposal-handoff';

const POLICY_V = 'l14.proposal.v1';

// ── Proposal class policy registry ────────────────────────────────

const ALLOWED_EVIDENCE_BY_PROPOSAL: Readonly<Record<L14CalibrationProposalClass, readonly L14CalibrationEvidenceClass[]>> = {
  [L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW]: [
    L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
    L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE,
  ],
  [L14CalibrationProposalClass.L11_CONFIDENCE_CAP_REVIEW]: [
    L14CalibrationEvidenceClass.SCORE_CONFIDENCE_ACCURACY,
  ],
  [L14CalibrationProposalClass.L11_FORMULA_COMPONENT_REVIEW]: [
    L14CalibrationEvidenceClass.FEATURE_IMPORTANCE_BY_REGIME,
    L14CalibrationEvidenceClass.SCORE_OUTCOME_PERFORMANCE,
  ],
  [L14CalibrationProposalClass.L10_HYPOTHESIS_TEMPLATE_REVIEW]: [
    L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN,
    L14CalibrationEvidenceClass.HYPOTHESIS_SUCCESS_RATE,
  ],
  [L14CalibrationProposalClass.L12_SCENARIO_TEMPLATE_REVIEW]: [
    L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION,
    L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE,
  ],
  [L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW]: [
    L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION,
  ],
  [L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW]: [
    L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS,
  ],
  [L14CalibrationProposalClass.L13_OUTPUT_MODE_EFFECTIVENESS_REVIEW]: [
    L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS,
  ],
  [L14CalibrationProposalClass.L14_DELIVERY_SUPPRESSION_REVIEW]: [
    L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS,
    L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION,
  ],
  [L14CalibrationProposalClass.L14_ALERT_ROUTING_REVIEW]: [
    L14CalibrationEvidenceClass.ALERT_CLASS_USEFULNESS,
  ],
};

const LEGAL_TARGETS_BY_PROPOSAL: Readonly<Record<L14CalibrationProposalClass, readonly L14CalibrationLowerLayerTargetClass[]>> = {
  [L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW]: [L14CalibrationLowerLayerTargetClass.L11_SCORE_THRESHOLD_POLICY],
  [L14CalibrationProposalClass.L11_CONFIDENCE_CAP_REVIEW]: [L14CalibrationLowerLayerTargetClass.L11_SCORE_CONFIDENCE_RULE],
  [L14CalibrationProposalClass.L11_FORMULA_COMPONENT_REVIEW]: [
    L14CalibrationLowerLayerTargetClass.L11_SCORE_FORMULA,
    L14CalibrationLowerLayerTargetClass.L11_SCORE_COMPONENT_WEIGHT_PROFILE,
  ],
  [L14CalibrationProposalClass.L10_HYPOTHESIS_TEMPLATE_REVIEW]: [
    L14CalibrationLowerLayerTargetClass.L10_HYPOTHESIS_FAMILY_INTERPRETATION,
    L14CalibrationLowerLayerTargetClass.L10_HYPOTHESIS_CONFIDENCE_RULE,
  ],
  [L14CalibrationProposalClass.L12_SCENARIO_TEMPLATE_REVIEW]: [
    L14CalibrationLowerLayerTargetClass.L12_SCENARIO_TEMPLATE,
    L14CalibrationLowerLayerTargetClass.L12_TRIGGER_RULE,
    L14CalibrationLowerLayerTargetClass.L12_INVALIDATION_RULE,
  ],
  [L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW]: [L14CalibrationLowerLayerTargetClass.L12_PATH_CONFIDENCE_CAP_RULE],
  [L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW]: [L14CalibrationLowerLayerTargetClass.L13_ALERT_EXPRESSION_POLICY],
  [L14CalibrationProposalClass.L13_OUTPUT_MODE_EFFECTIVENESS_REVIEW]: [L14CalibrationLowerLayerTargetClass.L13_OUTPUT_MODE_POLICY],
  [L14CalibrationProposalClass.L14_DELIVERY_SUPPRESSION_REVIEW]: [L14CalibrationLowerLayerTargetClass.L14_SUPPRESSION_POLICY],
  [L14CalibrationProposalClass.L14_ALERT_ROUTING_REVIEW]: [L14CalibrationLowerLayerTargetClass.L14_DELIVERY_PRIORITY_POLICY],
};

const LEGAL_ACTIONS_BY_PROPOSAL: Readonly<Record<L14CalibrationProposalClass, readonly L14ProposedActionClass[]>> = {
  [L14CalibrationProposalClass.L11_SCORE_THRESHOLD_REVIEW]: [L14ProposedActionClass.REVIEW_THRESHOLD_SEPARATION],
  [L14CalibrationProposalClass.L11_CONFIDENCE_CAP_REVIEW]: [L14ProposedActionClass.REVIEW_CONFIDENCE_CAP_ESCALATION],
  [L14CalibrationProposalClass.L11_FORMULA_COMPONENT_REVIEW]: [L14ProposedActionClass.REVIEW_COMPONENT_WEIGHT_OR_DEPENDENCY],
  [L14CalibrationProposalClass.L10_HYPOTHESIS_TEMPLATE_REVIEW]: [L14ProposedActionClass.REVIEW_HYPOTHESIS_TEMPLATE_INTERPRETATION],
  [L14CalibrationProposalClass.L12_SCENARIO_TEMPLATE_REVIEW]: [
    L14ProposedActionClass.REVIEW_SCENARIO_TEMPLATE_CONDITIONS,
    L14ProposedActionClass.REVIEW_TRIGGER_OR_INVALIDATION_LOGIC,
  ],
  [L14CalibrationProposalClass.L12_PATH_CONFIDENCE_CAP_REVIEW]: [L14ProposedActionClass.REVIEW_CONFIDENCE_CAP_ESCALATION],
  [L14CalibrationProposalClass.L13_ALERT_COPY_POLICY_REVIEW]: [L14ProposedActionClass.REVIEW_ALERT_COPY_POLICY],
  [L14CalibrationProposalClass.L13_OUTPUT_MODE_EFFECTIVENESS_REVIEW]: [L14ProposedActionClass.REVIEW_OUTPUT_MODE_EFFECTIVENESS],
  [L14CalibrationProposalClass.L14_DELIVERY_SUPPRESSION_REVIEW]: [L14ProposedActionClass.REVIEW_DELIVERY_SUPPRESSION_POLICY],
  [L14CalibrationProposalClass.L14_ALERT_ROUTING_REVIEW]: [L14ProposedActionClass.REVIEW_ALERT_ROUTING_POLICY],
};

export function buildL14CalibrationProposalClassPolicy(
  cls: L14CalibrationProposalClass,
): L14CalibrationProposalClassPolicy {
  return {
    proposal_class: cls,
    affected_layer: L14_PROPOSAL_CLASS_OWNING_LAYER[cls],
    required_or_allowed_evidence_classes: ALLOWED_EVIDENCE_BY_PROPOSAL[cls],
    legal_target_classes: LEGAL_TARGETS_BY_PROPOSAL[cls],
    legal_action_classes: LEGAL_ACTIONS_BY_PROPOSAL[cls],
    default_recertification_scope: [L14_PROPOSAL_CLASS_DEFAULT_RECERTIFICATION[cls]],
    permits_formal_proposal: true,
    permits_human_note_only: true,
    policy_version: POLICY_V,
  };
}

export function getAllL14ProposalClassPolicies(): readonly L14CalibrationProposalClassPolicy[] {
  return ALL_L14_CALIBRATION_PROPOSAL_CLASSES.map(buildL14CalibrationProposalClassPolicy);
}

export function isEvidenceClassLegalForProposal(
  pCls: L14CalibrationProposalClass,
  eCls: L14CalibrationEvidenceClass,
): boolean {
  return ALLOWED_EVIDENCE_BY_PROPOSAL[pCls].includes(eCls);
}

export function isTargetClassLegalForProposal(
  pCls: L14CalibrationProposalClass,
  tCls: L14CalibrationLowerLayerTargetClass,
): boolean {
  return LEGAL_TARGETS_BY_PROPOSAL[pCls].includes(tCls);
}

export function isActionClassLegalForProposal(
  pCls: L14CalibrationProposalClass,
  aCls: L14ProposedActionClass,
): boolean {
  return LEGAL_ACTIONS_BY_PROPOSAL[pCls].includes(aCls);
}

// ── Request resolver ──────────────────────────────────────────────

export function buildL14CalibrationProposalRequest(input: {
  proposal_class: L14CalibrationProposalClass;
  source_calibration_evidence_refs: readonly string[];
  requested_by: L14CalibrationProposalRequestSource;
}): L14CalibrationProposalRequest {
  const id = `l14.proposal.req.${fnv1a([
    input.proposal_class,
    input.source_calibration_evidence_refs.slice().sort().join(','),
    input.requested_by, POLICY_V,
  ].join('|'))}`;
  return {
    calibration_proposal_request_id: id,
    proposal_class: input.proposal_class,
    source_calibration_evidence_refs: input.source_calibration_evidence_refs,
    requested_by: input.requested_by,
    lineage_refs: ['l14.proposal.lineage'],
    replay_hash: id,
    policy_version: POLICY_V,
  };
}

// ── Eligibility engine ────────────────────────────────────────────

export function evaluateL14CalibrationProposalEligibility(input: {
  request: L14CalibrationProposalRequest;
  evidence: readonly L14CalibrationEvidenceRecord[];
}): L14CalibrationProposalEligibilityResult {
  const pCls = input.request.proposal_class;
  const eligible: string[] = [];
  const rejected: string[] = [];
  const missing: L14CalibrationProposalMissingRequirement[] = [];
  let humanOnly = false;
  let counterBlocked = false;
  let mismatch = false;
  let targetMappingFail = false;

  if (input.evidence.length === 0) {
    missing.push(L14CalibrationProposalMissingRequirement.NO_PROPOSAL_ELIGIBLE_EVIDENCE);
  }

  for (const e of input.evidence) {
    // Class compatibility.
    if (!isEvidenceClassLegalForProposal(pCls, e.evidence_class)) {
      rejected.push(e.calibration_evidence_id);
      mismatch = true;
      continue;
    }
    // Eligibility per L14.6 verdict.
    switch (e.proposal_eligibility) {
      case L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT:
        eligible.push(e.calibration_evidence_id);
        break;
      case L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_HUMAN_REVIEW_ONLY:
        humanOnly = true;
        rejected.push(e.calibration_evidence_id);
        break;
      case L14CalibrationProposalEligibilityClass.BLOCKED_CONTRADICTORY_EVIDENCE:
        counterBlocked = true;
        rejected.push(e.calibration_evidence_id);
        break;
      default:
        rejected.push(e.calibration_evidence_id);
    }
    // Target mapping: at least one affected target must legally map to proposal.
    const anyLegal = e.affected_lower_layer_targets.some(t => isTargetClassLegalForProposal(pCls, t.target_class));
    if (!anyLegal) targetMappingFail = true;
  }

  let status: L14CalibrationProposalEligibilityStatus;
  let isEligible = false;
  if (eligible.length > 0 && !mismatch && !counterBlocked && !targetMappingFail) {
    status = L14CalibrationProposalEligibilityStatus.ELIGIBLE_FOR_PROPOSAL_BUILD;
    isEligible = true;
  } else if (mismatch && eligible.length === 0) {
    status = L14CalibrationProposalEligibilityStatus.BLOCKED_PROPOSAL_CLASS_EVIDENCE_MISMATCH;
    missing.push(L14CalibrationProposalMissingRequirement.EVIDENCE_CLASS_NOT_LEGAL_FOR_PROPOSAL);
  } else if (counterBlocked) {
    status = L14CalibrationProposalEligibilityStatus.BLOCKED_COUNTEREVIDENCE;
  } else if (targetMappingFail && eligible.length === 0) {
    status = L14CalibrationProposalEligibilityStatus.BLOCKED_TARGET_MAPPING_FAILURE;
    missing.push(L14CalibrationProposalMissingRequirement.NO_SUPPORTED_AFFECTED_TARGET);
  } else if (humanOnly && eligible.length === 0) {
    status = L14CalibrationProposalEligibilityStatus.ELIGIBLE_FOR_HUMAN_NOTE_ONLY;
  } else {
    status = L14CalibrationProposalEligibilityStatus.BLOCKED_INSUFFICIENT_EVIDENCE;
    if (missing.length === 0) missing.push(L14CalibrationProposalMissingRequirement.NO_PROPOSAL_ELIGIBLE_EVIDENCE);
  }

  let readiness: L14CalibrationProposalReadinessClass | undefined;
  if (status === L14CalibrationProposalEligibilityStatus.ELIGIBLE_FOR_PROPOSAL_BUILD) {
    readiness = L14CalibrationProposalReadinessClass.READY_FOR_QUEUE;
  } else if (status === L14CalibrationProposalEligibilityStatus.BLOCKED_COUNTEREVIDENCE) {
    readiness = L14CalibrationProposalReadinessClass.BLOCKED_CONTRADICTORY_EVIDENCE;
  } else if (status === L14CalibrationProposalEligibilityStatus.BLOCKED_INSUFFICIENT_EVIDENCE) {
    readiness = L14CalibrationProposalReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE;
  } else if (status === L14CalibrationProposalEligibilityStatus.BLOCKED_PROPOSAL_CLASS_EVIDENCE_MISMATCH) {
    readiness = L14CalibrationProposalReadinessClass.BLOCKED_PROPOSAL_CLASS_MISMATCH;
  } else if (status === L14CalibrationProposalEligibilityStatus.BLOCKED_TARGET_MAPPING_FAILURE) {
    readiness = L14CalibrationProposalReadinessClass.BLOCKED_UNSUPPORTED_TARGET;
  }

  const replayHash = fnv1a([
    input.request.calibration_proposal_request_id,
    eligible.slice().sort().join(','),
    rejected.slice().sort().join(','),
    status, String(isEligible), POLICY_V,
  ].join('|'));
  return {
    proposal_eligibility_result_id: `l14.proposal.eligibility.${replayHash}`,
    proposal_request_ref: input.request.calibration_proposal_request_id,
    eligible: isEligible,
    eligibility_status: status,
    eligible_evidence_refs: eligible,
    rejected_evidence_refs: rejected,
    missing_requirements: missing,
    proposal_readiness_if_built: readiness,
    lineage_refs: ['l14.proposal.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Affected target mapper ────────────────────────────────────────

export function mapL14ProposalAffectedTargets(input: {
  proposal_class: L14CalibrationProposalClass;
  evidence: readonly L14CalibrationEvidenceRecord[];
}): readonly L14ProposalAffectedTargetRef[] {
  const owningLayer = L14_PROPOSAL_CLASS_OWNING_LAYER[input.proposal_class];
  const refs: L14ProposalAffectedTargetRef[] = [];
  for (const e of input.evidence) {
    for (const t of e.affected_lower_layer_targets) {
      if (!isTargetClassLegalForProposal(input.proposal_class, t.target_class)) continue;
      const id = `l14.proposal.target.${fnv1a([
        owningLayer, t.target_class, t.target_ref, POLICY_V,
      ].join('|'))}`;
      refs.push({
        affected_target_ref_id: id,
        target_layer: owningLayer,
        target_class: t.target_class,
        target_ref: t.target_ref,
        proposal_relevance: t.why_affected,
        direct_mutation_requested: false,
        policy_version: POLICY_V,
      });
    }
  }
  return dedupe(refs);
}

function dedupe(refs: readonly L14ProposalAffectedTargetRef[]): readonly L14ProposalAffectedTargetRef[] {
  const seen = new Set<string>();
  const out: L14ProposalAffectedTargetRef[] = [];
  for (const r of refs) {
    if (!seen.has(r.affected_target_ref_id)) { seen.add(r.affected_target_ref_id); out.push(r); }
  }
  return out;
}

// ── Evidence pack builder ─────────────────────────────────────────

const SUFFICIENCY_RANK: Record<L14CalibrationSampleSufficiencyClass, number> = {
  [L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT]: 0,
  [L14CalibrationSampleSufficiencyClass.SAMPLE_SMALL_DIRECTIONAL]: 1,
  [L14CalibrationSampleSufficiencyClass.SAMPLE_MODERATE]: 2,
  [L14CalibrationSampleSufficiencyClass.SAMPLE_STRONG]: 3,
  [L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE]: 4,
};

const CONFIDENCE_RANK: Record<L14CalibrationEvidenceConfidenceClass, number> = {
  [L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE]: 0,
  [L14CalibrationEvidenceConfidenceClass.LOW_CONFIDENCE_EVIDENCE]: 1,
  [L14CalibrationEvidenceConfidenceClass.MODERATE_CONFIDENCE_EVIDENCE]: 2,
  [L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE]: 3,
  [L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE]: 4,
};

export function buildL14CalibrationProposalEvidencePack(input: {
  primary: readonly L14CalibrationEvidenceRecord[];
  supporting?: readonly L14CalibrationEvidenceRecord[];
  counterevidence_refs?: readonly string[];
  eligibility_basis: readonly string[];
}): L14CalibrationProposalEvidencePack {
  const supporting = input.supporting ?? [];
  const all = [...input.primary, ...supporting];
  const sufRanks = all.map(e => SUFFICIENCY_RANK[e.sample_sufficiency_class]);
  const confRanks = all.map(e => CONFIDENCE_RANK[e.confidence_class]);
  const sampleSizes = all.map(e => e.sample_size);
  const confEntries = Object.entries(CONFIDENCE_RANK) as [L14CalibrationEvidenceConfidenceClass, number][];
  const sufEntries = Object.entries(SUFFICIENCY_RANK) as [L14CalibrationSampleSufficiencyClass, number][];
  const rankToConf = (r: number) => confEntries.find(([, v]) => v === r)![0];
  const rankToSuf = (r: number) => sufEntries.find(([, v]) => v === r)![0];

  const confFloor = rankToConf(Math.min(...confRanks));
  const confCeiling = rankToConf(Math.max(...confRanks));
  let consistency: L14ProposalEvidenceConsistencyClass;
  const counterPresent = (input.counterevidence_refs ?? []).length > 0;
  if (counterPresent) consistency = L14ProposalEvidenceConsistencyClass.CONTRADICTORY_BLOCKING;
  else if (confFloor === L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE ||
           confFloor === L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE) {
    consistency = L14ProposalEvidenceConsistencyClass.CONSISTENT_STRONG;
  } else if (confFloor === L14CalibrationEvidenceConfidenceClass.MODERATE_CONFIDENCE_EVIDENCE) {
    consistency = L14ProposalEvidenceConsistencyClass.CONSISTENT_MODERATE;
  } else {
    consistency = L14ProposalEvidenceConsistencyClass.MIXED_BUT_REVIEWABLE;
  }

  const sampleSummary: L14ProposalSampleSummary = {
    total_sample_size: sampleSizes.reduce((a, b) => a + b, 0),
    strongest_supporting_sample_size: Math.max(...sampleSizes),
    smallest_supporting_sample_size: Math.min(...sampleSizes),
    sample_sufficiency_floor: rankToSuf(Math.min(...sufRanks)),
    sample_sufficiency_ceiling: rankToSuf(Math.max(...sufRanks)),
  };
  const confidenceSummary: L14ProposalConfidenceSummary = {
    evidence_confidence_floor: confFloor,
    evidence_confidence_ceiling: confCeiling,
    confidence_consistency_class: consistency,
  };

  const replayHash = fnv1a([
    input.primary.map(e => e.calibration_evidence_id).sort().join(','),
    supporting.map(e => e.calibration_evidence_id).sort().join(','),
    (input.counterevidence_refs ?? []).slice().sort().join(','),
    sampleSummary.total_sample_size, consistency, POLICY_V,
  ].join('|'));
  return {
    proposal_evidence_pack_id: `l14.proposal.pack.${replayHash}`,
    primary_evidence_refs: input.primary.map(e => e.calibration_evidence_id),
    supporting_evidence_refs: supporting.map(e => e.calibration_evidence_id),
    counterevidence_refs: input.counterevidence_refs ?? [],
    aggregate_computation_refs: all.flatMap(e => e.supporting_aggregate_refs),
    finding_refs: all.flatMap(e => (e.structured_findings as Array<{ finding_id: string }>).map(f => f.finding_id)),
    performance_attribution_refs: all.flatMap(e => e.performance_attribution_ref ? [e.performance_attribution_ref] : []),
    sample_size_summary: sampleSummary,
    confidence_summary: confidenceSummary,
    proposal_eligibility_basis: input.eligibility_basis,
    lineage_refs: ['l14.proposal.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Action classifier ─────────────────────────────────────────────

export function classifyL14ProposedAction(
  cls: L14CalibrationProposalClass,
): L14ProposedActionClass {
  return LEGAL_ACTIONS_BY_PROPOSAL[cls][0];
}

// ── Proposed action wording validator (executability check) ──────

// Words that suggest direct execution rather than review.
const FORBIDDEN_EXECUTABLE_TOKENS = [
  /\bchange\s+(the|x|y)\b/i,
  /\blower\s+the\b/i,
  /\braise\s+the\b/i,
  /\bdisable\s+this\b/i,
  /\brewrite\s+the\b/i,
  /\bswitch\s+this\s+routing\b/i,
  /\bset\s+the\s+threshold\s+to\b/i,
  /\bapply\s+(this|the)\s+change\b/i,
];

export function isProposedActionWordingLegal(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\breview\b|\bevaluate\b|\bassess\b|\bconsider\b|\binvestigate\b/.test(t)) return false;
  for (const rx of FORBIDDEN_EXECUTABLE_TOKENS) {
    if (rx.test(text)) return false;
  }
  return true;
}

// ── Recertification scope resolver ────────────────────────────────

export function resolveL14RequiredRecertificationScope(
  cls: L14CalibrationProposalClass,
): readonly L14RequiredRecertificationScope[] {
  return [L14_PROPOSAL_CLASS_DEFAULT_RECERTIFICATION[cls]];
}

// ── Review priority resolver ──────────────────────────────────────

export function resolveL14ProposalReviewPriority(input: {
  evidence: readonly L14CalibrationEvidenceRecord[];
  counterevidence_present: boolean;
}): L14CalibrationReviewPriority {
  // Take max review priority from source evidence; counterevidence caps to MEDIUM.
  const ranks: Record<L14CalibrationReviewPriority, number> = {
    [L14CalibrationReviewPriority.NO_REVIEW]: 0,
    [L14CalibrationReviewPriority.LOW]: 1,
    [L14CalibrationReviewPriority.MEDIUM]: 2,
    [L14CalibrationReviewPriority.HIGH]: 3,
    [L14CalibrationReviewPriority.CRITICAL]: 4,
  };
  let max = L14CalibrationReviewPriority.NO_REVIEW;
  for (const e of input.evidence) {
    if (ranks[e.recommended_review_priority] > ranks[max]) max = e.recommended_review_priority;
  }
  if (input.counterevidence_present) {
    if (ranks[max] > ranks[L14CalibrationReviewPriority.MEDIUM]) max = L14CalibrationReviewPriority.MEDIUM;
  }
  return max;
}

// ── Readiness classifier ──────────────────────────────────────────

export function classifyL14ProposalReadiness(input: {
  eligibility_status: L14CalibrationProposalEligibilityStatus;
  counterevidence_present: boolean;
}): L14CalibrationProposalReadinessClass {
  if (input.eligibility_status === L14CalibrationProposalEligibilityStatus.BLOCKED_COUNTEREVIDENCE) {
    return L14CalibrationProposalReadinessClass.BLOCKED_CONTRADICTORY_EVIDENCE;
  }
  if (input.eligibility_status === L14CalibrationProposalEligibilityStatus.BLOCKED_INSUFFICIENT_EVIDENCE) {
    return L14CalibrationProposalReadinessClass.BLOCKED_INSUFFICIENT_EVIDENCE;
  }
  if (input.eligibility_status === L14CalibrationProposalEligibilityStatus.BLOCKED_PROPOSAL_CLASS_EVIDENCE_MISMATCH) {
    return L14CalibrationProposalReadinessClass.BLOCKED_PROPOSAL_CLASS_MISMATCH;
  }
  if (input.eligibility_status === L14CalibrationProposalEligibilityStatus.BLOCKED_TARGET_MAPPING_FAILURE) {
    return L14CalibrationProposalReadinessClass.BLOCKED_UNSUPPORTED_TARGET;
  }
  if (input.counterevidence_present) {
    return L14CalibrationProposalReadinessClass.READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED;
  }
  return L14CalibrationProposalReadinessClass.READY_FOR_QUEUE;
}

// ── Default non-claims ────────────────────────────────────────────

export function defaultL14ProposalNonClaims(): readonly L14ProposalNonClaim[] {
  return [
    L14ProposalNonClaim.DOES_NOT_AUTOMATICALLY_APPLY_CHANGE,
    L14ProposalNonClaim.DOES_NOT_DECLARE_CURRENT_POLICY_INVALID,
    L14ProposalNonClaim.DOES_NOT_OVERRIDE_LOWER_LAYER_OWNER,
    L14ProposalNonClaim.DOES_NOT_BYPASS_RECERTIFICATION,
    L14ProposalNonClaim.DOES_NOT_CLAIM_CAUSAL_PROOF_FROM_ASSOCIATION,
    L14ProposalNonClaim.DOES_NOT_REPLACE_HUMAN_OR_LAYER_REVIEW,
  ];
}

// ── Proposal builder ──────────────────────────────────────────────

export interface L14CalibrationProposalBuilderInput {
  readonly request: L14CalibrationProposalRequest;
  readonly eligibility: L14CalibrationProposalEligibilityResult;
  readonly evidence_pack: L14CalibrationProposalEvidencePack;
  readonly affected_target_refs: readonly L14ProposalAffectedTargetRef[];
  readonly proposal_summary: string;
  readonly proposed_action: string;
  readonly expected_improvement_claim: string;
  readonly review_priority: L14CalibrationReviewPriority;
  readonly readiness: L14CalibrationProposalReadinessClass;
  readonly limitations?: readonly L14CalibrationProposalLimitation[];
  readonly status?: L14CalibrationProposalStatus;
  readonly review_queue_ref?: string;
  readonly lower_layer_ratification_handoff_ref?: string;
}

export function buildL14CalibrationProposal(
  input: L14CalibrationProposalBuilderInput,
): L14CalibrationProposal {
  const pCls = input.request.proposal_class;
  const owningLayer = L14_PROPOSAL_CLASS_OWNING_LAYER[pCls];
  const actionCls = classifyL14ProposedAction(pCls);
  const recert = resolveL14RequiredRecertificationScope(pCls);
  const status = input.status ??
    (input.readiness === L14CalibrationProposalReadinessClass.READY_FOR_QUEUE ||
     input.readiness === L14CalibrationProposalReadinessClass.READY_BUT_COUNTEREVIDENCE_DISCLOSURE_REQUIRED
      ? L14CalibrationProposalStatus.READY_FOR_REVIEW_QUEUE
      : L14CalibrationProposalStatus.DRAFTED);
  const replayHash = fnv1a([
    input.request.calibration_proposal_request_id,
    input.evidence_pack.proposal_evidence_pack_id,
    input.affected_target_refs.map(t => t.affected_target_ref_id).sort().join(','),
    input.proposal_summary, input.proposed_action,
    input.review_priority, input.readiness, status,
    pCls, owningLayer, actionCls,
    recert.slice().sort().join(','),
    POLICY_V,
  ].join('|'));
  return {
    calibration_proposal_id: `l14.proposal.${replayHash}`,
    proposal_class: pCls,
    affected_layer: owningLayer,
    affected_target_refs: input.affected_target_refs,
    evidence_refs: input.eligibility.eligible_evidence_refs,
    evidence_pack_ref: input.evidence_pack.proposal_evidence_pack_id,
    supporting_evidence_count: input.evidence_pack.supporting_evidence_refs.length,
    counterevidence_refs: input.evidence_pack.counterevidence_refs,
    sample_size: input.evidence_pack.sample_size_summary.total_sample_size,
    evidence_confidence: input.evidence_pack.confidence_summary.evidence_confidence_ceiling,
    review_priority: input.review_priority,
    proposal_summary: input.proposal_summary,
    proposed_action: input.proposed_action,
    proposed_action_class: actionCls,
    expected_improvement_claim: input.expected_improvement_claim,
    explicit_non_claims: defaultL14ProposalNonClaims(),
    automatic_application_allowed: false,
    requires_review: true,
    requires_recertification: recert[0] !== L14RequiredRecertificationScope.NONE,
    required_recertification_scope: recert,
    proposal_status: status,
    proposal_readiness: input.readiness,
    lower_layer_ratification_handoff_ref: input.lower_layer_ratification_handoff_ref,
    review_queue_ref: input.review_queue_ref,
    interpretation_limitations: input.limitations ?? [],
    lineage_refs: ['l14.proposal.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Review queue router ──────────────────────────────────────────

export function routeL14ProposalReviewQueue(
  affectedLayer: L14ProposalAffectedLayer,
): L14ProposalReviewQueueClass {
  return L14_LAYER_REVIEW_QUEUE[affectedLayer];
}

// ── Lower-layer ratification handoff builder ─────────────────────

export function buildL14LowerLayerRatificationHandoff(input: {
  proposal: L14CalibrationProposal;
}): L14LowerLayerRatificationHandoff {
  const queue = routeL14ProposalReviewQueue(input.proposal.affected_layer);
  const replayHash = fnv1a([
    input.proposal.calibration_proposal_id,
    input.proposal.affected_layer, queue,
    input.proposal.required_recertification_scope.slice().sort().join(','),
    input.proposal.proposal_status,
    POLICY_V,
  ].join('|'));
  return {
    ratification_handoff_id: `l14.proposal.handoff.${replayHash}`,
    calibration_proposal_ref: input.proposal.calibration_proposal_id,
    owning_layer: input.proposal.affected_layer,
    owning_review_queue: queue,
    affected_target_refs: input.proposal.affected_target_refs.map(t => t.affected_target_ref_id),
    required_recertification_scope: input.proposal.required_recertification_scope,
    proposal_status_at_handoff: input.proposal.proposal_status,
    automatic_application_allowed: false,
    lineage_refs: ['l14.proposal.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}

// ── Review note builder ───────────────────────────────────────────

export function buildL14CalibrationReviewNote(input: {
  source_evidence_refs: readonly string[];
  subject_ref: string;
  affected_layer_hint?: L14ProposalAffectedLayer;
  note_summary: string;
  reason_not_promoted_to_proposal: string;
}): L14CalibrationReviewNote {
  const replayHash = fnv1a([
    input.source_evidence_refs.slice().sort().join(','),
    input.subject_ref, input.affected_layer_hint ?? '',
    input.note_summary, input.reason_not_promoted_to_proposal,
    POLICY_V,
  ].join('|'));
  return {
    review_note_id: `l14.proposal.note.${replayHash}`,
    source_evidence_refs: input.source_evidence_refs,
    subject_ref: input.subject_ref,
    affected_layer_hint: input.affected_layer_hint,
    note_summary: input.note_summary,
    reason_not_promoted_to_proposal: input.reason_not_promoted_to_proposal,
    routed_queue: 'HUMAN_ANALYST_TRIAGE_QUEUE',
    lineage_refs: ['l14.proposal.lineage'],
    replay_hash: replayHash,
    policy_version: POLICY_V,
  };
}
