/**
 * L8.3 — Regime Subject Contract Validator
 *
 * §8.3.2.10 — Enforces completeness and legality of an `L8RegimeSubjectContract`:
 * identity, scope, inputs, temporal rules, classification rules,
 * confidence/multiplier derivation, persistence/evidence policy, and
 * production-extension fields.
 */

import {
  L8RegimeSubjectContract,
} from '../contracts/regime-subject.contract';
import {
  containsL8ForbiddenNaming,
} from '../contracts/l8-boundary';
import {
  getDefaultL8RegimeFamilyRegistry,
  L8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  getDefaultL8RegimeClassRegistry,
  L8RegimeClassRegistry,
} from '../registry/regime-class.registry';
import { L8RegimeContractViolationCode } from './l8-contract-violation-codes';

export interface L8SubjectContractIssue {
  readonly code: L8RegimeContractViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8SubjectContractReport {
  readonly valid: boolean;
  readonly issues: readonly L8SubjectContractIssue[];
}

const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

function requireNonEmpty(
  issues: L8SubjectContractIssue[],
  code: L8RegimeContractViolationCode,
  field: string,
  value: unknown,
): void {
  if (value === undefined || value === null ||
      (typeof value === 'string' && value.length === 0)) {
    issues.push({ code, message: `${field} missing` });
  }
}

export function validateRegimeSubjectContract(
  subject: L8RegimeSubjectContract,
  familyRegistry:
    L8RegimeFamilyRegistry = getDefaultL8RegimeFamilyRegistry(),
  classRegistry:
    L8RegimeClassRegistry = getDefaultL8RegimeClassRegistry(),
): L8SubjectContractReport {
  const issues: L8SubjectContractIssue[] = [];

  // Identity (§8.3.2.2)
  requireNonEmpty(issues,
    L8RegimeContractViolationCode.SUBJECT_MISSING_IDENTITY,
    'regime_subject_id', subject.regime_subject_id);
  requireNonEmpty(issues,
    L8RegimeContractViolationCode.SUBJECT_MISSING_TEMPLATE,
    'regime_template_id', subject.regime_template_id);
  requireNonEmpty(issues,
    L8RegimeContractViolationCode.SUBJECT_MISSING_VERSION,
    'regime_version', subject.regime_version);

  if (!subject.regime_family ||
      !familyRegistry.isRegistered(subject.regime_family)) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_FAMILY,
      message: `regime_family missing or unregistered: ${subject.regime_family}`,
    });
  }

  // Versioning (§8.3.7.1)
  if (!subject.subject_contract_version ||
      !SEMVER.test(subject.subject_contract_version)) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_CONTRACT_VERSION,
      message: `subject_contract_version missing or not semver: ${subject.subject_contract_version}`,
    });
  }
  if (!subject.schema_version) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_SCHEMA_VERSION,
      message: 'schema_version missing',
    });
  }
  if (!subject.policy_version) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_POLICY_VERSION,
      message: 'policy_version missing',
    });
  }

  // Scope (§8.3.2.3)
  if (!subject.scope_type || !subject.scope_id) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_SCOPE,
      message: 'scope_type or scope_id missing',
    });
  }
  if (!subject.scope_granularity) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_SCOPE_GRANULARITY,
      message: 'scope_granularity missing',
    });
  }

  // Family / scope / class-set legality
  if (subject.regime_family && subject.scope_type &&
      familyRegistry.isRegistered(subject.regime_family) &&
      !familyRegistry.allowsScope(subject.regime_family, subject.scope_type)) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_SCOPE,
      message:
        `scope_type ${subject.scope_type} is not legal for family ${subject.regime_family}`,
    });
  }

  if (!subject.allowed_regime_class_set ||
      subject.allowed_regime_class_set.length === 0) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_ALLOWED_CLASS_SET,
      message: 'allowed_regime_class_set must be non-empty',
    });
  } else if (subject.regime_family &&
      familyRegistry.isRegistered(subject.regime_family)) {
    for (const c of subject.allowed_regime_class_set) {
      if (!classRegistry.isRegistered(c) ||
          !classRegistry.belongsToFamily(c, subject.regime_family)) {
        issues.push({
          code: L8RegimeContractViolationCode.SUBJECT_MISSING_ALLOWED_CLASS_SET,
          message:
            `allowed_regime_class_set contains class ${c} not in family ${subject.regime_family}`,
        });
      }
    }
  }

  // Inputs (§8.3.2.4)
  const hasRequiredInputs =
    subject.required_validation_inputs &&
    subject.required_validation_inputs.length > 0;
  if (!hasRequiredInputs) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_VALIDATION_INPUTS,
      message: 'required_validation_inputs empty (L7 handoff refs required)',
    });
  }
  const hasRequiredFeatureInputs =
    subject.required_feature_inputs &&
    subject.required_feature_inputs.length > 0;
  if (!hasRequiredFeatureInputs) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_INPUTS,
      message: 'required_feature_inputs empty',
    });
  }

  // Input-family mix: evidence_only inputs must not be used as required.
  if (subject.required_validation_inputs) {
    for (const r of subject.required_validation_inputs) {
      if (r.evidence_only) {
        issues.push({
          code: L8RegimeContractViolationCode.SUBJECT_INPUT_FAMILY_MIX,
          message:
            `required_validation_inputs contains evidence_only ref: ${r.ref}`,
        });
      }
      if (r.context_only) {
        issues.push({
          code: L8RegimeContractViolationCode.SUBJECT_INPUT_FAMILY_MIX,
          message:
            `required_validation_inputs contains context_only ref: ${r.ref}`,
        });
      }
      if (r.family !== 'L7_VALIDATION' && r.family !== 'L7_CONFIDENCE' &&
          r.family !== 'L7_CONTRADICTION' && r.family !== 'L7_RESTRICTION') {
        issues.push({
          code: L8RegimeContractViolationCode.SUBJECT_INPUT_FAMILY_MIX,
          message:
            `required_validation_inputs[${r.ref}] must be an L7 family, got ${r.family}`,
        });
      }
    }
  }

  // Temporal (§8.3.2.5)
  if (!subject.as_of || !ISO_TS.test(subject.as_of)) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message: `as_of missing or not ISO-8601: ${subject.as_of}`,
    });
  }
  if (!subject.regime_window || !subject.regime_window.window_id ||
      !subject.regime_window.as_of) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message: 'regime_window incomplete',
    });
  }
  if (!subject.transition_window || !subject.transition_window.window_id) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message: 'transition_window incomplete',
    });
  }
  if (typeof subject.freshness_budget_seconds !== 'number' ||
      subject.freshness_budget_seconds <= 0) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message:
        `freshness_budget_seconds must be > 0, got ${subject.freshness_budget_seconds}`,
    });
  }
  if (!subject.staleness_policy) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_TEMPORAL,
      message: 'staleness_policy missing',
    });
  }

  // Classification rules (§8.3.2.6)
  if (!subject.regime_selection_rules ||
      subject.regime_selection_rules.length === 0) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_CLASSIFICATION_RULES,
      message: 'regime_selection_rules empty',
    });
  }
  if (!subject.transition_rules) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_CLASSIFICATION_RULES,
      message: 'transition_rules missing',
    });
  }
  if (!subject.ambiguity_rules) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_CLASSIFICATION_RULES,
      message: 'ambiguity_rules missing',
    });
  }
  if (!subject.degradation_rules) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_CLASSIFICATION_RULES,
      message: 'degradation_rules missing',
    });
  }

  // Confidence + multiplier derivation (§8.3.2.7)
  if (!subject.confidence_derivation_spec ||
      !subject.confidence_derivation_spec.policy_id ||
      !subject.confidence_derivation_spec.policy_version ||
      !subject.confidence_derivation_spec.required_factors ||
      subject.confidence_derivation_spec.required_factors.length === 0) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_CONFIDENCE_SPEC,
      message: 'confidence_derivation_spec incomplete',
    });
  }
  if (!subject.multiplier_derivation_spec ||
      !subject.multiplier_derivation_spec.policy_id ||
      !subject.multiplier_derivation_spec.required_dimensions ||
      subject.multiplier_derivation_spec.required_dimensions.length === 0) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_MULTIPLIER_SPEC,
      message: 'multiplier_derivation_spec incomplete',
    });
  } else if (subject.multiplier_derivation_spec.forbid_final_score_shape !== true) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_MULTIPLIER_SPEC,
      message: 'multiplier_derivation_spec.forbid_final_score_shape must be true',
    });
  }

  // Multiplier dimensions (§8.3.2.9)
  if (!subject.required_multiplier_dimensions ||
      subject.required_multiplier_dimensions.length === 0) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_MULTIPLIER_DIMENSIONS,
      message: 'required_multiplier_dimensions empty',
    });
  }

  // Persistence + evidence (§8.3.2.8)
  if (!subject.materialization_policy) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_PERSISTENCE_POLICY,
      message: 'materialization_policy missing',
    });
  }
  if (!subject.evidence_pack_policy) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_EVIDENCE_POLICY,
      message: 'evidence_pack_policy missing',
    });
  }

  // Restriction + validation consumption (§8.3.2.9)
  if (!subject.restriction_consumption_policy) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_RESTRICTION_POLICY,
      message: 'restriction_consumption_policy missing',
    });
  } else {
    const rcp = subject.restriction_consumption_policy;
    if (rcp.required && rcp.expected_rights.length === 0) {
      issues.push({
        code: L8RegimeContractViolationCode.SUBJECT_MISSING_RESTRICTION_POLICY,
        message:
          'restriction_consumption_policy.required true but expected_rights empty',
      });
    }
  }
  if (!subject.validation_consumption_policy) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_VALIDATION_POLICY,
      message: 'validation_consumption_policy missing',
    });
  } else {
    const vcp = subject.validation_consumption_policy;
    if (vcp.required && vcp.min_validation_refs <= 0) {
      issues.push({
        code: L8RegimeContractViolationCode.SUBJECT_MISSING_VALIDATION_POLICY,
        message:
          'validation_consumption_policy.required true but min_validation_refs <= 0',
      });
    }
  }

  // Lineage (§8.3.2.9)
  if (!subject.lineage_policy) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_LINEAGE_POLICY,
      message: 'lineage_policy missing',
    });
  }
  if (!subject.lineage_refs || !subject.lineage_refs.trace_id ||
      !subject.lineage_refs.manifest_id) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_MISSING_LINEAGE_POLICY,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id required',
    });
  }

  // Judgment leak in descriptive fields
  if (containsL8ForbiddenNaming(subject.description ?? '') ||
      containsL8ForbiddenNaming(subject.created_by ?? '')) {
    issues.push({
      code: L8RegimeContractViolationCode.SUBJECT_JUDGMENT_LEAK,
      message:
        'subject description/created_by contains forbidden judgment/scenario/recommendation semantics',
    });
  }

  return { valid: issues.length === 0, issues };
}
