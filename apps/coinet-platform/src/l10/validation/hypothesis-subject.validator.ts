/**
 * L10.2 — HypothesisSubject Validator
 *
 * §10.2.6.4 — A subject is illegal if scope is absent, no family set
 * declared, no lower-layer inputs declared, candidate rules absent,
 * lineage absent, or if a single candidate is pre-selected.
 */

import { L10HypothesisSubject } from '../contracts/hypothesis-subject';
import { isLegalL10Window } from '../contracts/hypothesis-window';
import { isL10RegisteredMateriality } from '../contracts/hypothesis-materiality';
import {
  L10HypothesisSubjectClassRegistry,
  getDefaultL10HypothesisSubjectClassRegistry,
} from '../registry/hypothesis-subject-class.registry';
import {
  L10HypothesisFamilyRegistry,
  getDefaultL10HypothesisFamilyRegistry,
} from '../registry/hypothesis-family.registry';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

export function validateL10HypothesisSubject(
  s: L10HypothesisSubject,
  subjectRegistry: L10HypothesisSubjectClassRegistry = getDefaultL10HypothesisSubjectClassRegistry(),
  familyRegistry: L10HypothesisFamilyRegistry = getDefaultL10HypothesisFamilyRegistry(),
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];

  if (!s.hypothesis_subject_id) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_ID,
      message: 'hypothesis_subject_id is required',
    });
  }
  if (!s.subject_class) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_CLASS,
      message: 'subject_class is required',
    });
  } else if (!subjectRegistry.has(s.subject_class)) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_CLASS_UNREGISTERED,
      message: `subject_class ${s.subject_class} is not registered`,
    });
  }

  if (!s.scope_id || !s.scope_type) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_SCOPE,
      message: 'scope_type and scope_id are required',
    });
  } else if (
    s.subject_class &&
    subjectRegistry.has(s.subject_class) &&
    !subjectRegistry.allowsScope(s.subject_class, s.scope_type)
  ) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_SCOPE_ILLEGAL_FOR_CLASS,
      message: `scope_type ${s.scope_type} illegal for subject_class ${s.subject_class}`,
    });
  }

  if (!s.as_of) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_AS_OF,
      message: 'as_of is required',
    });
  }

  if (!s.window) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_WINDOW,
      message: 'window is required',
    });
  } else if (!isLegalL10Window(s.window)) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_ILLEGAL_WINDOW,
      message: 'window is structurally illegal',
    });
  }

  if (!s.hypothesis_family_set || s.hypothesis_family_set.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_FAMILY_SET,
      message: 'hypothesis_family_set must not be empty',
    });
  } else {
    for (const f of s.hypothesis_family_set) {
      if (!familyRegistry.has(f)) {
        issues.push({
          code: L10ObjectViolationCode.SUBJECT_FAMILY_UNREGISTERED,
          message: `hypothesis_family ${f} is not registered`,
        });
      } else if (s.scope_type && !familyRegistry.allowsScope(f, s.scope_type)) {
        issues.push({
          code: L10ObjectViolationCode.SUBJECT_FAMILY_SCOPE_ILLEGAL,
          message: `family ${f} may not operate at scope ${s.scope_type}`,
        });
      }
    }
  }

  if (!s.materiality || !isL10RegisteredMateriality(s.materiality)) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MATERIALITY_UNREGISTERED,
      message: 'materiality is missing or not registered',
    });
  }

  if (!s.required_validation_inputs || s.required_validation_inputs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_VALIDATION_INPUTS,
      message: 'required_validation_inputs must not be empty',
    });
  }

  // regime/sequence inputs are required if any family demands conditioning
  const needsRegime = s.hypothesis_family_set.some(
    f => familyRegistry.get(f)?.requiresRegimeConditioning === true,
  );
  const needsSequence = s.hypothesis_family_set.some(
    f => familyRegistry.get(f)?.requiresSequenceConditioning === true,
  );
  if (needsRegime && s.required_regime_inputs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_REGIME_INPUTS,
      message: 'required_regime_inputs required for regime-conditioned families',
    });
  }
  if (needsSequence && s.required_sequence_inputs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_SEQUENCE_INPUTS,
      message: 'required_sequence_inputs required for sequence-conditioned families',
    });
  }

  // Any of feature/event/historical/evidence_only must exist to confirm
  // input declarations are not implicit.
  const anyInputDecl =
    (s.required_feature_inputs?.length ?? 0) +
    (s.required_event_inputs?.length ?? 0) +
    (s.historical_inputs?.length ?? 0) +
    (s.evidence_only_inputs?.length ?? 0);
  if (anyInputDecl === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_INPUT_DECLARATIONS,
      message: 'at least one feature / event / historical / evidence-only declaration required',
    });
  }

  if (!s.candidate_generation_rules || s.candidate_generation_rules.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_CANDIDATE_RULES,
      message: 'candidate_generation_rules must not be empty',
    });
  }

  // Pre-selected candidate detection: allowlist of size 1 with empty
  // blocklist and no rules is an illegal pre-selection.
  if (
    s.candidate_template_allowlist.length === 1 &&
    s.candidate_template_blocklist.length === 0 &&
    s.candidate_generation_rules.length <= 1
  ) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_PRESELECTED_CANDIDATE,
      message: 'subject starts with a single pre-selected candidate; competition required',
    });
  }

  if (!s.input_snapshot_ref) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_INPUT_SNAPSHOT,
      message: 'input_snapshot_ref is required',
    });
  }

  if (
    !s.lineage_refs ||
    !s.lineage_refs.trace_id ||
    !s.lineage_refs.manifest_id ||
    s.lineage_refs.upstream_refs.length === 0
  ) {
    issues.push({
      code: L10ObjectViolationCode.SUBJECT_MISSING_LINEAGE,
      message: 'lineage_refs (trace, manifest, upstream) are required',
    });
  }

  return { valid: issues.length === 0, issues };
}
