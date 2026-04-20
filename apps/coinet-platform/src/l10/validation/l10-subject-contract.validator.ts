/**
 * L10.3 — Subject Contract Validator
 *
 * §10.3.2.10 — A subject contract is illegal if any required field is
 * missing, if the subject class or any referenced family is not
 * registered, if the subject pre-selects a primary candidate, if
 * required-input families are missing, or if the description leaks
 * judgment / recommendation / scenario-finality / causal-proof
 * semantics.
 */

import type { L10HypothesisSubjectContract } from '../contracts/hypothesis-subject.contract';
import {
  ALL_L10_HYPOTHESIS_STALENESS_POLICIES,
  ALL_L10_HYPOTHESIS_MATERIALIZATION_POLICIES,
  ALL_L10_HYPOTHESIS_EVIDENCE_PACK_POLICIES,
} from '../contracts/hypothesis-materialization-policy';
import {
  L10HypothesisFamilyRegistry,
  getDefaultL10HypothesisFamilyRegistry,
} from '../registry/hypothesis-family.registry';
import {
  L10HypothesisSubjectClassRegistry,
  getDefaultL10HypothesisSubjectClassRegistry,
} from '../registry/hypothesis-subject-class.registry';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';
import { checkL10ContractLeak } from './l10-contract-leak-patterns';

export function validateL10SubjectContract(
  s: L10HypothesisSubjectContract,
  subjectRegistry: L10HypothesisSubjectClassRegistry =
    getDefaultL10HypothesisSubjectClassRegistry(),
  familyRegistry: L10HypothesisFamilyRegistry =
    getDefaultL10HypothesisFamilyRegistry(),
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  // Identity (§10.3.2.2)
  if (!s.hypothesis_subject_id) {
    issues.push({ code: V.SUBJECT_MISSING_IDENTITY,
      message: 'hypothesis_subject_id is required' });
  }
  if (!s.subject_class) {
    issues.push({ code: V.SUBJECT_MISSING_CLASS,
      message: 'subject_class is required' });
  } else if (!subjectRegistry.has(s.subject_class)) {
    issues.push({ code: V.SUBJECT_CLASS_UNREGISTERED,
      message: `subject_class '${s.subject_class}' not registered` });
  }
  if (!s.subject_version) {
    issues.push({ code: V.SUBJECT_MISSING_VERSION,
      message: 'subject_version is required' });
  }

  // Versioning (§10.3.8.1)
  if (!s.subject_contract_version) {
    issues.push({ code: V.SUBJECT_MISSING_CONTRACT_VERSION,
      message: 'subject_contract_version is required' });
  }
  if (!s.schema_version) {
    issues.push({ code: V.SUBJECT_MISSING_SCHEMA_VERSION,
      message: 'schema_version is required' });
  }
  if (!s.policy_version) {
    issues.push({ code: V.SUBJECT_MISSING_POLICY_VERSION,
      message: 'policy_version is required' });
  }

  // Scope (§10.3.2.2)
  if (!s.scope_id || !s.scope_type) {
    issues.push({ code: V.SUBJECT_MISSING_SCOPE,
      message: 'scope_type and scope_id are required' });
  }
  if (!s.scope_granularity) {
    issues.push({ code: V.SUBJECT_MISSING_SCOPE_GRANULARITY,
      message: 'scope_granularity is required' });
  }
  if (!s.materiality) {
    issues.push({ code: V.SUBJECT_MISSING_MATERIALITY,
      message: 'materiality is required' });
  }

  // Temporal (§10.3.2.3)
  if (!s.as_of) {
    issues.push({ code: V.SUBJECT_MISSING_TEMPORAL,
      message: 'as_of is required' });
  }
  if (!s.hypothesis_window || !s.hypothesis_window.window_id) {
    issues.push({ code: V.SUBJECT_MISSING_WINDOW,
      message: 'hypothesis_window is required' });
  }
  if (!s.staleness_policy
    || !ALL_L10_HYPOTHESIS_STALENESS_POLICIES.includes(s.staleness_policy)) {
    issues.push({ code: V.SUBJECT_MISSING_TEMPORAL,
      message: 'staleness_policy is required and must be registered' });
  }

  // Families (§10.3.2.2)
  if (!s.hypothesis_family_set || s.hypothesis_family_set.length === 0) {
    issues.push({ code: V.SUBJECT_MISSING_FAMILY_SET,
      message: 'hypothesis_family_set must not be empty' });
  } else {
    for (const f of s.hypothesis_family_set) {
      if (!familyRegistry.has(f)) {
        issues.push({ code: V.SUBJECT_FAMILY_UNREGISTERED,
          message: `family '${f}' is not registered` });
      } else if (s.scope_type && !familyRegistry.allowsScope(f, s.scope_type)) {
        issues.push({ code: V.SUBJECT_FAMILY_SCOPE_ILLEGAL,
          message: `family '${f}' illegal at scope '${s.scope_type}'` });
      }
    }
  }

  // Inputs (§10.3.2.3)
  if (!s.required_validation_inputs
    || s.required_validation_inputs.length === 0) {
    issues.push({ code: V.SUBJECT_MISSING_VALIDATION_INPUTS,
      message: 'required_validation_inputs must not be empty' });
  }
  const needsRegime = (s.hypothesis_family_set ?? []).some(
    f => familyRegistry.get(f)?.requiresRegimeConditioning === true);
  const needsSequence = (s.hypothesis_family_set ?? []).some(
    f => familyRegistry.get(f)?.requiresSequenceConditioning === true);
  if (needsRegime
    && (!s.required_regime_inputs || s.required_regime_inputs.length === 0)) {
    issues.push({ code: V.SUBJECT_MISSING_REGIME_INPUTS,
      message: 'regime-conditioned families require required_regime_inputs' });
  }
  if (needsSequence
    && (!s.required_sequence_inputs || s.required_sequence_inputs.length === 0)) {
    issues.push({ code: V.SUBJECT_MISSING_SEQUENCE_INPUTS,
      message: 'sequence-conditioned families require required_sequence_inputs' });
  }
  if (!s.required_feature_inputs) {
    issues.push({ code: V.SUBJECT_MISSING_FEATURE_INPUTS,
      message: 'required_feature_inputs must be declared (may be empty list)' });
  }
  if (!s.required_event_inputs) {
    issues.push({ code: V.SUBJECT_MISSING_EVENT_INPUTS,
      message: 'required_event_inputs must be declared (may be empty list)' });
  }

  // Input family-mix sanity: evidence_only inputs may never be the only
  // truth-input surface (§10.3.2.6). If *all* truth inputs are empty but
  // evidence_only has entries, that's a family-mix violation.
  const truthInputCount =
    (s.required_validation_inputs?.length ?? 0) +
    (s.required_regime_inputs?.length ?? 0) +
    (s.required_sequence_inputs?.length ?? 0) +
    (s.required_feature_inputs?.length ?? 0) +
    (s.required_event_inputs?.length ?? 0);
  if (truthInputCount === 0 && (s.evidence_only_inputs?.length ?? 0) > 0) {
    issues.push({ code: V.SUBJECT_INPUT_FAMILY_MIX,
      message: 'evidence_only inputs cannot be the sole input surface' });
  }

  // Candidate generation (§10.3.2.5)
  const cg = s.candidate_generation;
  if (!cg) {
    issues.push({ code: V.SUBJECT_MISSING_CANDIDATE_GENERATION,
      message: 'candidate_generation is required' });
  } else {
    if (cg.forbid_preselected_primary !== true) {
      issues.push({ code: V.SUBJECT_CANDIDATE_GEN_PRESELECTED,
        message: 'candidate_generation.forbid_preselected_primary must be true' });
    }
    if (cg.min_candidate_count < 2) {
      issues.push({ code: V.SUBJECT_CANDIDATE_GEN_PRESELECTED,
        message: 'min_candidate_count must be >= 2 (no single-candidate subjects)' });
    }
    const overlap = (cg.required_family_templates ?? []).filter(
      t => (cg.forbidden_family_templates ?? []).includes(t));
    if (overlap.length > 0) {
      issues.push({ code: V.SUBJECT_CANDIDATE_GEN_TEMPLATE_CONFLICT,
        message: `templates appear in both required and forbidden: ${overlap.join(', ')}` });
    }
  }

  // Policies (§10.3.2.3)
  if (!s.competition_policy) {
    issues.push({ code: V.SUBJECT_MISSING_COMPETITION_POLICY,
      message: 'competition_policy is required' });
  }
  if (!s.cleanliness_policy) {
    issues.push({ code: V.SUBJECT_MISSING_CLEANLINESS_POLICY,
      message: 'cleanliness_policy is required' });
  }
  if (!s.materialization_policy
    || !ALL_L10_HYPOTHESIS_MATERIALIZATION_POLICIES.includes(s.materialization_policy)) {
    issues.push({ code: V.SUBJECT_MISSING_MATERIALIZATION_POLICY,
      message: 'materialization_policy must be a registered policy' });
  }
  if (!s.evidence_pack_policy
    || !ALL_L10_HYPOTHESIS_EVIDENCE_PACK_POLICIES.includes(s.evidence_pack_policy)) {
    issues.push({ code: V.SUBJECT_MISSING_EVIDENCE_POLICY,
      message: 'evidence_pack_policy must be a registered policy' });
  }
  if (!s.restriction_consumption_policy) {
    issues.push({ code: V.SUBJECT_MISSING_RESTRICTION_POLICY,
      message: 'restriction_consumption_policy is required' });
  }
  if (!s.regime_consumption_policy) {
    issues.push({ code: V.SUBJECT_MISSING_REGIME_POLICY,
      message: 'regime_consumption_policy is required' });
  }
  if (!s.sequence_consumption_policy) {
    issues.push({ code: V.SUBJECT_MISSING_SEQUENCE_POLICY,
      message: 'sequence_consumption_policy is required' });
  }
  if (!s.validation_consumption_policy) {
    issues.push({ code: V.SUBJECT_MISSING_VALIDATION_POLICY,
      message: 'validation_consumption_policy is required' });
  }
  if (!s.causal_restraint_policy
    || s.causal_restraint_policy.forbid_causal_proof_semantics !== true
    || s.causal_restraint_policy.forbid_final_judgment_semantics !== true
    || s.causal_restraint_policy.forbid_recommendation_semantics !== true
    || s.causal_restraint_policy.forbid_scenario_finality_semantics !== true) {
    issues.push({ code: V.SUBJECT_MISSING_CAUSAL_RESTRAINT_POLICY,
      message: 'causal_restraint_policy must forbid judgment/recommendation/scenario/causal-proof' });
  }

  // Lineage (§10.3.2.7)
  if (!s.input_snapshot_ref) {
    issues.push({ code: V.SUBJECT_MISSING_INPUT_SNAPSHOT,
      message: 'input_snapshot_ref is required' });
  }
  if (!s.lineage_policy) {
    issues.push({ code: V.SUBJECT_MISSING_LINEAGE_POLICY,
      message: 'lineage_policy is required' });
  }
  if (!s.lineage_refs
    || !s.lineage_refs.trace_id
    || !s.lineage_refs.manifest_id) {
    issues.push({ code: V.SUBJECT_MISSING_LINEAGE_REFS,
      message: 'lineage_refs.trace_id and .manifest_id are required' });
  }

  // Leak (§10.3.5.4 mirrored at subject tier — description can't leak)
  const leak = checkL10ContractLeak(s.description ?? '');
  if (leak.leaks) {
    issues.push({ code: V.SUBJECT_JUDGMENT_LEAK,
      message: `subject description leaks ${leak.label ?? 'forbidden'} semantics` });
  }

  return { valid: issues.length === 0, issues };
}
