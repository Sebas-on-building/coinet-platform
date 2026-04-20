/**
 * L10.3 — Output Contract Validator
 *
 * §10.3.5.4 — An output is illegal if support/contradiction/
 * confirmation/invalidation objects are missing, if claimed scores
 * have no backing refs, if scores are out of range, if ranking
 * posture is missing, if spread/restriction profile refs are absent,
 * if evidence pack / input snapshot / replay hash / lineage is
 * missing, or if the description leaks judgment/recommendation/
 * scenario-finality/causal-proof semantics.
 *
 * §10.3.9.2 — Cleanliness law is enforced separately by
 * `l10-output-readiness.validator.ts` — this validator is structural.
 */

import type { L10HypothesisOutputContract } from '../contracts/hypothesis-output.contract';
import {
  L10HypothesisConfidenceBand,
  l10ConfidenceBandForScore,
} from '../contracts/hypothesis-assessment';
import {
  ALL_L10_HYPOTHESIS_EMISSION_READINESS_CLASSES,
  ALL_L10_HYPOTHESIS_REPLAY_IDENTITY_MODES,
  ALL_L10_HYPOTHESIS_LATE_DATA_CLASSES,
  ALL_L10_HYPOTHESIS_MATERIALIZATION_POLICIES,
} from '../contracts/hypothesis-materialization-policy';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';
import { checkL10ContractLeak } from './l10-contract-leak-patterns';

function in01(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export function validateL10OutputContract(
  o: L10HypothesisOutputContract,
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  // Identity (§10.3.5.2)
  if (!o.hypothesis_assessment_id)
    issues.push({ code: V.OUTPUT_MISSING_IDENTITY, message: 'hypothesis_assessment_id required' });
  if (!o.hypothesis_subject_id)
    issues.push({ code: V.OUTPUT_MISSING_SUBJECT_REF, message: 'hypothesis_subject_id required' });
  if (!o.hypothesis_candidate_id)
    issues.push({ code: V.OUTPUT_MISSING_CANDIDATE_REF, message: 'hypothesis_candidate_id required' });
  if (!o.subject_contract_ref)
    issues.push({ code: V.OUTPUT_MISSING_SUBJECT_CONTRACT_REF, message: 'subject_contract_ref required' });
  if (!o.candidate_contract_ref)
    issues.push({ code: V.OUTPUT_MISSING_CANDIDATE_CONTRACT_REF, message: 'candidate_contract_ref required' });

  // Versioning
  if (!o.output_contract_version)
    issues.push({ code: V.OUTPUT_MISSING_CONTRACT_VERSION, message: 'output_contract_version required' });
  if (!o.schema_version)
    issues.push({ code: V.OUTPUT_MISSING_SCHEMA_VERSION, message: 'schema_version required' });
  if (!o.policy_version)
    issues.push({ code: V.OUTPUT_MISSING_POLICY_VERSION, message: 'policy_version required' });

  // Family / template
  if (!o.hypothesis_family)
    issues.push({ code: V.OUTPUT_MISSING_FAMILY, message: 'hypothesis_family required' });
  if (!o.hypothesis_template_id)
    issues.push({ code: V.OUTPUT_MISSING_TEMPLATE, message: 'hypothesis_template_id required' });

  // Scope / time
  if (!o.scope_id || !o.scope_type)
    issues.push({ code: V.OUTPUT_MISSING_SCOPE, message: 'scope_type/scope_id required' });
  if (!o.as_of)
    issues.push({ code: V.OUTPUT_MISSING_TIME_ANCHOR, message: 'as_of required' });

  // Evidence objects (§10.3.4)
  if (!o.support_set_ref)
    issues.push({ code: V.OUTPUT_MISSING_SUPPORT_SET, message: 'support_set_ref required' });
  if (!o.contradiction_set_ref)
    issues.push({ code: V.OUTPUT_MISSING_CONTRADICTION_SET, message: 'contradiction_set_ref required' });
  if (!o.confirmation_set_ref)
    issues.push({ code: V.OUTPUT_MISSING_CONFIRMATION_SET, message: 'confirmation_set_ref required' });
  if (!o.invalidation_set_ref)
    issues.push({ code: V.OUTPUT_MISSING_INVALIDATION_SET, message: 'invalidation_set_ref required' });

  // Score-ref coherence (§10.3.5.4)
  if ((o.support_strength_score ?? 0) > 0
    && (o.supporting_evidence_refs?.length ?? 0) === 0) {
    issues.push({ code: V.OUTPUT_SUPPORT_CLAIMED_WITHOUT_REFS,
      message: 'support_strength_score > 0 with no supporting_evidence_refs' });
  }
  if ((o.contradiction_pressure_score ?? 0) > 0
    && (o.contradicting_evidence_refs?.length ?? 0) === 0) {
    issues.push({ code: V.OUTPUT_CONTRADICTION_CLAIMED_WITHOUT_REFS,
      message: 'contradiction_pressure_score > 0 with no contradicting_evidence_refs' });
  }
  if ((o.confirmation_gap_score ?? 0) < 1
    && (o.required_confirmation_refs?.length ?? 0) === 0) {
    issues.push({ code: V.OUTPUT_CONFIRMATION_REQUIRED_BUT_MISSING,
      message: 'confirmation_gap_score < 1 but no required_confirmation_refs surfaced' });
  }
  if ((o.invalidation_risk_score ?? 0) > 0
    && (o.invalidation_signal_refs?.length ?? 0) === 0) {
    issues.push({ code: V.OUTPUT_INVALIDATION_CLAIMED_WITHOUT_REFS,
      message: 'invalidation_risk_score > 0 with no invalidation_signal_refs' });
  }

  // Score ranges (§10.3.5.2)
  if (!in01(o.support_strength_score)
    || !in01(o.contradiction_pressure_score)
    || !in01(o.confirmation_gap_score)
    || !in01(o.invalidation_risk_score)
    || !in01(o.hypothesis_confidence_score)) {
    issues.push({ code: V.OUTPUT_SCORE_OUT_OF_RANGE,
      message: 'one or more scores are outside [0,1]' });
  }

  // Confidence band coherence (§10.3.5.2)
  if (in01(o.hypothesis_confidence_score)
    && (o.hypothesis_confidence_band as L10HypothesisConfidenceBand)
       !== l10ConfidenceBandForScore(o.hypothesis_confidence_score)) {
    issues.push({ code: V.OUTPUT_CONFIDENCE_BAND_INCONSISTENT,
      message: 'hypothesis_confidence_band does not match hypothesis_confidence_score' });
  }

  // Ranking posture (§10.3.5.2 / §10.3.5.6)
  if (!o.ranking_ref)
    issues.push({ code: V.OUTPUT_MISSING_RANKING_REF, message: 'ranking_ref required' });
  if (o.rank_position === undefined || o.rank_position === null)
    issues.push({ code: V.OUTPUT_MISSING_RANK_POSITION, message: 'rank_position required' });
  if (o.rank_spread_to_next === undefined || o.rank_spread_to_next === null)
    issues.push({ code: V.OUTPUT_MISSING_RANK_SPREAD, message: 'rank_spread_to_next required' });

  // Side-outputs (§10.3.5.2)
  if (!o.restriction_profile_ref)
    issues.push({ code: V.OUTPUT_MISSING_RESTRICTION_PROFILE, message: 'restriction_profile_ref required' });
  if (!o.spread_profile_ref)
    issues.push({ code: V.OUTPUT_MISSING_SPREAD_PROFILE, message: 'spread_profile_ref required' });

  // Evidence + persistence (§10.3.5.2)
  if (!o.evidence_pack_ref)
    issues.push({ code: V.OUTPUT_MISSING_EVIDENCE_PACK, message: 'evidence_pack_ref required' });
  if (!o.input_snapshot_ref)
    issues.push({ code: V.OUTPUT_MISSING_INPUT_SNAPSHOT, message: 'input_snapshot_ref required' });
  if (!o.compute_run_id)
    issues.push({ code: V.OUTPUT_MISSING_RUN_ID, message: 'compute_run_id required' });
  if (!o.replay_hash)
    issues.push({ code: V.OUTPUT_MISSING_REPLAY_HASH, message: 'replay_hash required' });

  // Integrity + materialization (§10.3.5.3)
  if (!o.runtime_integrity_flags)
    issues.push({ code: V.OUTPUT_MISSING_INTEGRITY_FLAGS, message: 'runtime_integrity_flags required' });
  if (!o.materialization_policy
    || !ALL_L10_HYPOTHESIS_MATERIALIZATION_POLICIES.includes(o.materialization_policy)) {
    issues.push({ code: V.OUTPUT_MISSING_MATERIALIZATION,
      message: 'materialization_policy must be a registered policy' });
  }
  if (!o.replay_mode_flag
    || !ALL_L10_HYPOTHESIS_REPLAY_IDENTITY_MODES.includes(o.replay_mode_flag)) {
    issues.push({ code: V.OUTPUT_MISSING_MATERIALIZATION,
      message: 'replay_mode_flag must be a registered mode' });
  }
  if (!o.late_data_class
    || !ALL_L10_HYPOTHESIS_LATE_DATA_CLASSES.includes(o.late_data_class)) {
    issues.push({ code: V.OUTPUT_MISSING_MATERIALIZATION,
      message: 'late_data_class must be a registered class' });
  }
  if (!o.emission_readiness_class
    || !ALL_L10_HYPOTHESIS_EMISSION_READINESS_CLASSES.includes(o.emission_readiness_class)) {
    issues.push({ code: V.OUTPUT_MISSING_MATERIALIZATION,
      message: 'emission_readiness_class must be a registered class' });
  }

  // Causal restraint (§10.3.5.2)
  const cr = o.causal_restraint_flags;
  if (!cr
    || cr.hypothesis_is_explanation_candidate !== true
    || cr.scenario_excluded !== true
    || cr.recommendation_excluded !== true
    || cr.judgment_excluded !== true
    || cr.score_is_not_probability_of_truth !== true) {
    issues.push({ code: V.OUTPUT_MISSING_CAUSAL_RESTRAINT,
      message: 'causal_restraint_flags must mark judgment/scenario/recommendation excluded' });
  }

  // Posture consumption (§10.3.5.3 / INV-10.3-E)
  if (!o.lower_layer_posture_consumption_refs) {
    issues.push({ code: V.OUTPUT_MISSING_POSTURE_CONSUMPTION,
      message: 'lower_layer_posture_consumption_refs required' });
  }

  // Lineage
  if (!o.lineage_refs
    || !o.lineage_refs.trace_id
    || !o.lineage_refs.manifest_id) {
    issues.push({ code: V.OUTPUT_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and .manifest_id are required' });
  }

  // Description leakage (§10.3.5.4)
  if (o.description) {
    const leak = checkL10ContractLeak(o.description);
    if (leak.leaks && leak.code) {
      issues.push({ code: leak.code,
        message: `output description leaks ${leak.label ?? 'forbidden'} semantics` });
    }
  }
  if (o.hypothesis_name) {
    const leak = checkL10ContractLeak(o.hypothesis_name);
    if (leak.leaks && leak.code) {
      issues.push({ code: leak.code,
        message: `output hypothesis_name leaks ${leak.label ?? 'forbidden'} semantics` });
    }
  }

  return { valid: issues.length === 0, issues };
}
