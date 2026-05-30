/**
 * L14.6 — Calibration Evidence Validators
 *
 * §14.6.62 — Consolidated per-shape validators using L14E_* codes.
 */

import { L14ConstitutionalAuditSeverity } from '../contracts/l14-constitutional-types';
import {
  L14CalibrationEvidenceClass,
  L14CalibrationEvidenceConfidenceClass,
  L14CalibrationEvidenceInputMode,
  L14CalibrationEvidenceRequest,
  L14CalibrationProposalEligibilityClass,
  L14CalibrationReviewPriority,
  L14CalibrationSampleSufficiencyClass,
  L14CalibrationSubjectClass,
  L14CalibrationTargetRef,
  L14_EVIDENCE_CLASS_INPUT_MODE,
  L14_SAMPLE_INSUFFICIENT_MAX,
  type L14CalibrationEvidenceRecord,
} from '../contracts/calibration-evidence-core';
import {
  L14CalibrationFindingSeverity,
  L14CalibrationObservedMetric,
  type L14CalibrationFinding,
} from '../contracts/calibration-evidence-findings';
import {
  type L14CalibrationAggregateComputation,
  type L14CalibrationCohortDefinition,
  type L14CalibrationEvidenceWindow,
} from '../contracts/calibration-evidence-aggregation';
import {
  L14AlertClassUsefulnessClass,
  L14PerformanceAssociationStrength,
  type L14AlertClassUsefulnessProfile,
  type L14PerformanceAttributionFinding,
  type L14PerformanceAttributionProfile,
} from '../contracts/calibration-evidence-specialized';
import { L14CalibrationEvidenceViolationCode as C } from './l14-calibration-evidence-violation-codes';

const SEV = L14ConstitutionalAuditSeverity;

export interface L14CalibrationEvidenceIssue {
  readonly code: C;
  readonly severity: L14ConstitutionalAuditSeverity;
  readonly message: string;
}

export interface L14CalibrationEvidenceValidationResult {
  readonly clean: boolean;
  readonly issues: readonly L14CalibrationEvidenceIssue[];
}

function result(issues: readonly L14CalibrationEvidenceIssue[]): L14CalibrationEvidenceValidationResult {
  return { clean: issues.length === 0, issues };
}

function err(code: C, severity: L14ConstitutionalAuditSeverity, message: string): L14CalibrationEvidenceIssue {
  return { code, severity, message };
}

// ── 1. Request ────────────────────────────────────────────────────

export function validateL14CalibrationEvidenceRequest(
  r: L14CalibrationEvidenceRequest,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (!r.calibration_evidence_request_id) issues.push(err(C.L14E_REQUEST_MISSING, SEV.ERROR, 'request id missing'));
  if (!r.evidence_class) issues.push(err(C.L14E_EVIDENCE_CLASS_MISSING, SEV.ERROR, 'evidence_class missing'));
  if (!r.subject_ref) issues.push(err(C.L14E_SUBJECT_REF_MISSING, SEV.ERROR, 'subject_ref missing'));
  if (!r.evidence_window_ref) issues.push(err(C.L14E_EVIDENCE_WINDOW_MISSING, SEV.ERROR, 'evidence_window_ref missing'));
  if (!r.lineage_refs || r.lineage_refs.length === 0) issues.push(err(C.L14E_LINEAGE_MISSING, SEV.ERROR, 'lineage_refs empty'));
  if (!r.replay_hash) issues.push(err(C.L14E_REPLAY_HASH_MISSING, SEV.ERROR, 'replay_hash missing'));
  return result(issues);
}

// ── 2. Evidence window ───────────────────────────────────────────

export function validateL14CalibrationEvidenceWindow(
  w: L14CalibrationEvidenceWindow,
  incompatibleHorizonsMerged: boolean,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (!w.evidence_window_id) issues.push(err(C.L14E_EVIDENCE_WINDOW_MISSING, SEV.ERROR, 'window id missing'));
  if (incompatibleHorizonsMerged) {
    issues.push(err(C.L14E_WINDOW_INCOMPATIBLE_HORIZONS_MERGED, SEV.CRITICAL,
      'incompatible horizon classes merged without disclosure'));
  }
  return result(issues);
}

// ── 3. Cohort definition ─────────────────────────────────────────

export function validateL14CalibrationCohortDefinition(
  c: L14CalibrationCohortDefinition | undefined,
  evidenceClass: L14CalibrationEvidenceClass,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (!c) {
    issues.push(err(C.L14E_COHORT_DEFINITION_MISSING, SEV.ERROR, 'cohort definition missing'));
    return result(issues);
  }
  if (!c.cohort_definition_id) issues.push(err(C.L14E_COHORT_DEFINITION_MISSING, SEV.ERROR, 'cohort id missing'));
  if (evidenceClass === L14CalibrationEvidenceClass.REGIME_SPECIFIC_PERFORMANCE) {
    if (!c.included_regime_refs || c.included_regime_refs.length === 0) {
      issues.push(err(C.L14E_REGIME_COMPARISON_REQUIRED_BUT_MISSING, SEV.CRITICAL,
        'regime-specific evidence requires included_regime_refs'));
    }
  }
  return result(issues);
}

// ── 4. Aggregate computation ─────────────────────────────────────

export function validateL14CalibrationAggregateComputation(
  a: L14CalibrationAggregateComputation,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (!a.aggregate_computation_id) issues.push(err(C.L14E_AGGREGATE_COMPUTATION_MISSING, SEV.ERROR, 'aggregate id missing'));
  if (typeof a.sample_size !== 'number') issues.push(err(C.L14E_SAMPLE_SIZE_MISSING, SEV.ERROR, 'sample_size missing'));
  // Sufficiency false-green: claiming SAMPLE_STRONG/LARGE while N is below threshold.
  if ((a.sample_sufficiency_class === L14CalibrationSampleSufficiencyClass.SAMPLE_STRONG && a.sample_size <= 299) ||
      (a.sample_sufficiency_class === L14CalibrationSampleSufficiencyClass.SAMPLE_LARGE_STABLE && a.sample_size <= 999) ||
      (a.sample_sufficiency_class === L14CalibrationSampleSufficiencyClass.SAMPLE_MODERATE && a.sample_size <= 99) ||
      (a.sample_sufficiency_class !== L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT && a.sample_size <= L14_SAMPLE_INSUFFICIENT_MAX)) {
    issues.push(err(C.L14E_SAMPLE_SUFFICIENCY_CLASS_FALSE_GREEN, SEV.CRITICAL,
      `sufficiency class ${a.sample_sufficiency_class} false-green at N=${a.sample_size}`));
  }
  if (!a.lineage_refs || a.lineage_refs.length === 0) issues.push(err(C.L14E_LINEAGE_MISSING, SEV.ERROR, 'lineage empty'));
  if (!a.replay_hash) issues.push(err(C.L14E_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  // Input mode honesty: behavior used on outcome-only evidence class.
  const mode = L14_EVIDENCE_CLASS_INPUT_MODE[a.evidence_class];
  if (mode === L14CalibrationEvidenceInputMode.OUTCOME_ONLY && a.source_behavior_refs.length > 0) {
    issues.push(err(C.L14E_BEHAVIOR_USED_FOR_OUTCOME_ONLY_CLASS, SEV.CRITICAL,
      `behavior refs supplied to OUTCOME_ONLY evidence class ${a.evidence_class}`));
  }
  if ((mode === L14CalibrationEvidenceInputMode.OUTCOME_ONLY ||
       mode === L14CalibrationEvidenceInputMode.OUTCOME_PLUS_BEHAVIOR) &&
      a.source_feedback_refs.length > 0) {
    issues.push(err(C.L14E_FEEDBACK_TREATED_AS_CORRECTNESS, SEV.CRITICAL,
      `feedback refs supplied to evidence class ${a.evidence_class} with mode ${mode}`));
  }
  return result(issues);
}

// ── 5. Calibration finding ───────────────────────────────────────

export function validateL14CalibrationFinding(
  f: L14CalibrationFinding,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (!f.finding_id) issues.push(err(C.L14E_STRUCTURED_FINDINGS_MISSING, SEV.ERROR, 'finding id missing'));
  return result(issues);
}

// ── 6. Performance attribution ───────────────────────────────────

export function validateL14PerformanceAttributionProfile(
  p: L14PerformanceAttributionProfile,
  stateAsCausal: boolean,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (p.causal_claim_allowed !== false) {
    issues.push(err(C.L14E_FEATURE_IMPORTANCE_STATED_CAUSALLY, SEV.CRITICAL,
      'attribution profile must hard-pin causal_claim_allowed=false'));
  }
  if (stateAsCausal) {
    issues.push(err(C.L14E_FEATURE_IMPORTANCE_STATED_CAUSALLY, SEV.CRITICAL,
      'attribution stated causally outside association strength bounds'));
  }
  return result(issues);
}

// ── 7. Alert usefulness ──────────────────────────────────────────

export function validateL14AlertClassUsefulnessProfile(
  p: L14AlertClassUsefulnessProfile,
  openRateOnly: boolean,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (openRateOnly) {
    issues.push(err(C.L14E_ALERT_USEFULNESS_DECLARED_FROM_OPEN_RATE_ONLY, SEV.CRITICAL,
      'alert usefulness declared from open rate only'));
  }
  // HIGH_VALUE_ALERT_CLASS requires outcome_alignment_rate >= 0.5
  if (p.usefulness_class === L14AlertClassUsefulnessClass.HIGH_VALUE_ALERT_CLASS && p.outcome_alignment_rate < 0.5) {
    issues.push(err(C.L14E_ENGAGEMENT_COLLAPSED_INTO_TRUTH, SEV.CRITICAL,
      'HIGH_VALUE alert class with weak outcome alignment'));
  }
  return result(issues);
}

// ── 8. Counterevidence validator ─────────────────────────────────

export function validateL14CalibrationCounterevidence(
  record: L14CalibrationEvidenceRecord,
  detectedCounterevidenceRefs: readonly string[],
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  const declared = new Set(record.counterevidence_refs);
  for (const ref of detectedCounterevidenceRefs) {
    if (!declared.has(ref)) {
      issues.push(err(C.L14E_COUNTEREVIDENCE_HIDDEN, SEV.CRITICAL,
        `counterevidence ${ref} present but hidden from record`));
    }
  }
  if (detectedCounterevidenceRefs.length > 0 &&
      record.proposal_eligibility === L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT) {
    issues.push(err(C.L14E_PROPOSAL_ELIGIBILITY_GRANTED_DESPITE_COUNTEREVIDENCE, SEV.CRITICAL,
      'proposal draft eligibility granted despite counterevidence'));
  }
  return result(issues);
}

// ── 9. Target ref ────────────────────────────────────────────────

export function validateL14CalibrationTargetRef(
  t: L14CalibrationTargetRef,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (!t.calibration_target_ref_id || !t.target_ref) {
    issues.push(err(C.L14E_AFFECTED_TARGETS_MISSING, SEV.ERROR, 'target ref missing'));
  }
  if (t.mutation_allowed_in_l14_6 !== false) {
    issues.push(err(C.L14E_MUTATION_ALLOWED_IN_L14_6, SEV.CRITICAL,
      'target ref must hard-pin mutation_allowed_in_l14_6=false'));
  }
  return result(issues);
}

// ── 10. Master record validator ──────────────────────────────────

export function validateL14CalibrationEvidenceRecord(
  rec: L14CalibrationEvidenceRecord,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (!rec.calibration_evidence_id) issues.push(err(C.L14E_REQUEST_MISSING, SEV.ERROR, 'evidence id missing'));
  if (!rec.replay_hash) issues.push(err(C.L14E_REPLAY_HASH_MISSING, SEV.ERROR, 'replay hash missing'));
  if (!rec.lineage_refs || rec.lineage_refs.length === 0) issues.push(err(C.L14E_LINEAGE_MISSING, SEV.ERROR, 'lineage empty'));
  if (!rec.structured_findings || rec.structured_findings.length === 0) {
    issues.push(err(C.L14E_STRUCTURED_FINDINGS_MISSING, SEV.ERROR, 'structured_findings empty'));
  }
  if (!rec.supporting_aggregate_refs || rec.supporting_aggregate_refs.length === 0) {
    issues.push(err(C.L14E_AGGREGATE_COMPUTATION_MISSING, SEV.ERROR, 'supporting_aggregate_refs empty'));
  }
  if (!rec.affected_lower_layer_targets || rec.affected_lower_layer_targets.length === 0) {
    if (rec.recommended_review_priority !== L14CalibrationReviewPriority.NO_REVIEW) {
      issues.push(err(C.L14E_AFFECTED_TARGETS_MISSING, SEV.ERROR, 'affected_lower_layer_targets empty for review priority > NO_REVIEW'));
    }
  }
  if (!rec.confidence_class) issues.push(err(C.L14E_CONFIDENCE_CLASS_MISSING, SEV.ERROR, 'confidence_class missing'));
  // Sample insufficient promoted: priority>NO_REVIEW with INSUFFICIENT_EVIDENCE or SAMPLE_INSUFFICIENT.
  if ((rec.confidence_class === L14CalibrationEvidenceConfidenceClass.INSUFFICIENT_EVIDENCE ||
       rec.sample_sufficiency_class === L14CalibrationSampleSufficiencyClass.SAMPLE_INSUFFICIENT) &&
      rec.recommended_review_priority !== L14CalibrationReviewPriority.NO_REVIEW) {
    issues.push(err(C.L14E_SAMPLE_INSUFFICIENT_BUT_PROMOTED, SEV.CRITICAL,
      'insufficient evidence/sample promoted to review priority above NO_REVIEW'));
  }
  // Review priority unsupported: CRITICAL requires STRONG_REPEATED or HIGH_CONFIDENCE evidence.
  if (rec.recommended_review_priority === L14CalibrationReviewPriority.CRITICAL &&
      rec.confidence_class !== L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE &&
      rec.confidence_class !== L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE) {
    issues.push(err(C.L14E_REVIEW_PRIORITY_UNSUPPORTED, SEV.CRITICAL,
      'CRITICAL review priority requires HIGH/STRONG evidence'));
  }
  // Proposal eligibility overstated: GOVERNED_DRAFT requires HIGH/STRONG.
  if (rec.proposal_eligibility === L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT &&
      rec.confidence_class !== L14CalibrationEvidenceConfidenceClass.STRONG_REPEATED_EVIDENCE &&
      rec.confidence_class !== L14CalibrationEvidenceConfidenceClass.HIGH_CONFIDENCE_EVIDENCE) {
    issues.push(err(C.L14E_PROPOSAL_ELIGIBILITY_OVERSTATED, SEV.CRITICAL,
      'GOVERNED_PROPOSAL_DRAFT requires HIGH/STRONG evidence'));
  }
  if (rec.proposal_eligibility === L14CalibrationProposalEligibilityClass.ELIGIBLE_FOR_GOVERNED_PROPOSAL_DRAFT &&
      rec.counterevidence_refs.length > 0) {
    issues.push(err(C.L14E_PROPOSAL_ELIGIBILITY_GRANTED_DESPITE_COUNTEREVIDENCE, SEV.CRITICAL,
      'proposal eligibility granted with counterevidence present'));
  }
  // Affected target mutation law.
  for (const t of rec.affected_lower_layer_targets) {
    if (t.mutation_allowed_in_l14_6 !== false) {
      issues.push(err(C.L14E_MUTATION_ALLOWED_IN_L14_6, SEV.CRITICAL,
        `target ${t.calibration_target_ref_id} permits mutation in L14.6`));
    }
  }
  return result(issues);
}

// ── 11. Threshold noise semantics ────────────────────────────────

export function validateL14ThresholdNoiseEvidence(
  rec: L14CalibrationEvidenceRecord,
  outcomeAlignmentRate: number,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (rec.evidence_class !== L14CalibrationEvidenceClass.THRESHOLD_NOISE_DETECTION) return result(issues);
  // Threshold noise REQUIRES weak outcome behavior.
  if (outcomeAlignmentRate >= 0.5) {
    issues.push(err(C.L14E_THRESHOLD_NOISE_WITHOUT_OUTCOME_WEAKNESS, SEV.CRITICAL,
      `threshold noise asserted with alignment ${outcomeAlignmentRate} >= 0.5`));
  }
  return result(issues);
}

// ── 12. Hypothesis failure semantics ─────────────────────────────

export function validateL14HypothesisFailureEvidence(
  rec: L14CalibrationEvidenceRecord,
  invalidationEvidencePresent: boolean,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (rec.evidence_class !== L14CalibrationEvidenceClass.HYPOTHESIS_FAILURE_PATTERN) return result(issues);
  if (!invalidationEvidencePresent) {
    issues.push(err(C.L14E_HYPOTHESIS_FAILURE_PATTERN_WITHOUT_INVALIDATION_EVIDENCE, SEV.CRITICAL,
      'hypothesis failure pattern asserted without invalidation evidence'));
  }
  return result(issues);
}

// ── 13. Scenario confidence semantics ────────────────────────────

export function validateL14ScenarioConfidenceEvidence(
  rec: L14CalibrationEvidenceRecord,
  misalignmentEvidencePresent: boolean,
): L14CalibrationEvidenceValidationResult {
  const issues: L14CalibrationEvidenceIssue[] = [];
  if (rec.evidence_class !== L14CalibrationEvidenceClass.SCENARIO_CONFIDENCE_CALIBRATION) return result(issues);
  if (!misalignmentEvidencePresent) {
    issues.push(err(C.L14E_SCENARIO_CONFIDENCE_REVIEW_WITHOUT_MISALIGNMENT, SEV.CRITICAL,
      'scenario confidence review asserted without misalignment evidence'));
  }
  return result(issues);
}
