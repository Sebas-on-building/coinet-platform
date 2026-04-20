/**
 * L10.2 — HypothesisAssessment Validator
 *
 * §10.2.12.4 — An assessment is illegal if identity absent, support
 * claimed but refs absent, contradiction omitted, required confirmations
 * absent, invalidation posture absent, rank position/spread absent,
 * restriction profile absent, replay hash absent, lineage absent, or
 * name leaks judgment/recommendation/scenario-finality/fake-certainty.
 */

import {
  L10HypothesisAssessment,
  l10ConfidenceBandForScore,
} from '../contracts/hypothesis-assessment';
import {
  L10HypothesisFamilyRegistry,
  getDefaultL10HypothesisFamilyRegistry,
} from '../registry/hypothesis-family.registry';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
  checkL10ObjectLeak,
} from './hypothesis-object-violation-codes';

const inRange01 = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1;

export function validateL10HypothesisAssessment(
  a: L10HypothesisAssessment,
  familyRegistry: L10HypothesisFamilyRegistry = getDefaultL10HypothesisFamilyRegistry(),
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];

  if (!a.hypothesis_assessment_id) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_ID, message: 'hypothesis_assessment_id required' });
  }
  if (!a.hypothesis_subject_id) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_SUBJECT, message: 'hypothesis_subject_id required' });
  }
  if (!a.hypothesis_candidate_id) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_CANDIDATE, message: 'hypothesis_candidate_id required' });
  }
  if (!a.hypothesis_family) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_FAMILY, message: 'hypothesis_family required' });
  } else if (!familyRegistry.has(a.hypothesis_family)) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_FAMILY, message: `family ${a.hypothesis_family} not registered` });
  }
  if (!a.hypothesis_template_id) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_TEMPLATE, message: 'hypothesis_template_id required' });
  }
  if (!a.hypothesis_name) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_NAME, message: 'hypothesis_name required' });
  } else {
    const leak = checkL10ObjectLeak(`${a.hypothesis_name} ${a.description ?? ''}`);
    if (leak.leaks) {
      issues.push({
        code: L10ObjectViolationCode.ASSESSMENT_NAME_LEAKS_SEMANTICS,
        message: `assessment leaks ${leak.label}`,
        details: { leak: leak.label },
      });
    }
  }

  // First-class sub-object refs must exist
  if (!a.support_set_ref) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_SUPPORT_OBJECT, message: 'support_set_ref required' });
  }
  if (!a.contradiction_set_ref) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_CONTRADICTION_OBJECT, message: 'contradiction_set_ref required' });
  }
  if (!a.confirmation_set_ref) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_CONFIRMATION_OBJECT, message: 'confirmation_set_ref required' });
  }
  if (!a.invalidation_set_ref) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_INVALIDATION_OBJECT, message: 'invalidation_set_ref required' });
  }

  if (a.rank_position === undefined || a.rank_position === null || a.rank_position < 0) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_RANK_POSITION, message: 'rank_position required (>= 0)' });
  }
  if (a.rank_spread_to_next === undefined || a.rank_spread_to_next === null) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_RANK_SPREAD, message: 'rank_spread_to_next required' });
  }

  if (!a.restriction_profile_ref) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_RESTRICTION_PROFILE, message: 'restriction_profile_ref required' });
  }

  if (!a.evidence_pack_ref) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_EVIDENCE_PACK, message: 'evidence_pack_ref required' });
  }
  if (!a.input_snapshot_ref) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_INPUT_SNAPSHOT, message: 'input_snapshot_ref required' });
  }
  if (!a.compute_run_id) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_COMPUTE_RUN, message: 'compute_run_id required' });
  }
  if (!a.replay_hash) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_REPLAY_HASH, message: 'replay_hash required' });
  }
  if (!a.lineage_refs || a.lineage_refs.length === 0) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_LINEAGE, message: 'lineage_refs required' });
  }
  if (!a.policy_version) {
    issues.push({ code: L10ObjectViolationCode.ASSESSMENT_MISSING_POLICY_VERSION, message: 'policy_version required' });
  }

  // Causal restraint flags must all be asserted.
  const f = a.causal_restraint_flags;
  if (
    !f ||
    f.hypothesis_is_explanation_candidate !== true ||
    f.scenario_excluded !== true ||
    f.recommendation_excluded !== true ||
    f.judgment_excluded !== true ||
    f.score_is_not_probability_of_truth !== true ||
    !f.not_final_judgment_disclaimer
  ) {
    issues.push({
      code: L10ObjectViolationCode.ASSESSMENT_MISSING_CAUSAL_RESTRAINT,
      message: 'causal_restraint_flags incomplete',
    });
  }

  // Score ranges and band consistency
  if (!inRange01(a.hypothesis_confidence_score)) {
    issues.push({
      code: L10ObjectViolationCode.ASSESSMENT_CONFIDENCE_OUT_OF_RANGE,
      message: `hypothesis_confidence_score=${a.hypothesis_confidence_score} out of [0,1]`,
    });
  } else if (l10ConfidenceBandForScore(a.hypothesis_confidence_score) !== a.hypothesis_confidence_band) {
    issues.push({
      code: L10ObjectViolationCode.ASSESSMENT_CONFIDENCE_BAND_INCONSISTENT,
      message: `band ${a.hypothesis_confidence_band} inconsistent with score ${a.hypothesis_confidence_score}`,
    });
  }
  if (!inRange01(a.support_strength_score)) {
    issues.push({
      code: L10ObjectViolationCode.ASSESSMENT_SUPPORT_SCORE_OUT_OF_RANGE,
      message: `support_strength_score=${a.support_strength_score} out of [0,1]`,
    });
  }
  if (!inRange01(a.contradiction_pressure_score)) {
    issues.push({
      code: L10ObjectViolationCode.ASSESSMENT_CONTRADICTION_SCORE_OUT_OF_RANGE,
      message: `contradiction_pressure_score=${a.contradiction_pressure_score} out of [0,1]`,
    });
  }
  if (!inRange01(a.confirmation_gap_score)) {
    issues.push({
      code: L10ObjectViolationCode.ASSESSMENT_CONFIRMATION_SCORE_OUT_OF_RANGE,
      message: `confirmation_gap_score=${a.confirmation_gap_score} out of [0,1]`,
    });
  }
  if (!inRange01(a.invalidation_risk_score)) {
    issues.push({
      code: L10ObjectViolationCode.ASSESSMENT_INVALIDATION_SCORE_OUT_OF_RANGE,
      message: `invalidation_risk_score=${a.invalidation_risk_score} out of [0,1]`,
    });
  }

  return { valid: issues.length === 0, issues };
}
