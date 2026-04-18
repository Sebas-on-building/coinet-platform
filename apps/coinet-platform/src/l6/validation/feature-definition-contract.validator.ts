/**
 * L6.3 — Feature Definition Contract Validator
 *
 * §6.3.3.4 / §6.3.3.5 — Enforces feature-definition legality:
 *   - L6.2 primitive contract legality (via delegated validator)
 *   - required definition blocks present
 *   - bounds, normalization method, coverage, freshness class
 *   - input-role classification
 *   - materialization/evidence/event-link legality
 */

import {
  FeatureDefinitionContract,
  REQUIRED_FEATURE_DEFINITION_FIELDS,
  L6FeatureInputRole,
} from '../contracts/feature-definition.contract';
import {
  ALL_COVERAGE_REQUIREMENT_CLASSES,
  ALL_FRESHNESS_BUDGET_CLASSES,
  isValidMaterializationPolicy,
  materializationRequiresHistory,
} from '../contracts/materialization-policy';
import { parseContractVersion } from '../contracts/contract-versioning';
import {
  L6ContractValidationResult,
  L6ContractViolation,
  L6ContractViolationCode,
  contractFail,
  contractMerge,
  contractOk,
  contractViolation,
} from './contract-violation-codes';
import { validateFeatureContract } from './feature-contract.validator';

export function validateFeatureDefinitionContract(
  def: FeatureDefinitionContract,
): L6ContractValidationResult {
  const v: L6ContractViolation[] = [];

  if (!def || typeof def !== 'object') {
    return contractFail([contractViolation(
      L6ContractViolationCode.DEF_MISSING_BLOCK, 'root',
      'Feature definition is missing.', {},
    )]);
  }

  const dict = def as unknown as Record<string, unknown>;
  for (const field of REQUIRED_FEATURE_DEFINITION_FIELDS) {
    if (!hasMeaningfulValue(dict, field)) {
      v.push(contractViolation(
        L6ContractViolationCode.DEF_MISSING_FIELD, field,
        `Feature definition is missing required field "${field}".`,
        { field },
      ));
    }
  }

  if (def.version && !parseContractVersion(def.version)) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_INVALID_VERSION, 'version',
      `Feature definition version "${def.version}" is not a valid L6 contract version.`,
      { version: def.version },
    ));
  }

  if (def.definition_schema_version && !parseContractVersion(def.definition_schema_version)) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_INVALID_VERSION, 'definition_schema_version',
      `definition_schema_version "${def.definition_schema_version}" is not a valid L6 contract version.`,
      { definition_schema_version: def.definition_schema_version },
    ));
  }

  if (def.required_truth_inputs === undefined ||
      !Array.isArray(def.required_truth_inputs) ||
      def.required_truth_inputs.length === 0) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_TRUTH_INPUT, 'required_truth_inputs',
      'Feature definition must declare at least one truth input.', {},
    ));
  } else {
    def.required_truth_inputs.forEach((r, i) => {
      if (!r || r.role !== L6FeatureInputRole.TRUTH) {
        v.push(contractViolation(
          L6ContractViolationCode.DEF_INVALID_INPUT_ROLE,
          `required_truth_inputs[${i}].role`,
          'required_truth_inputs entries must carry role=TRUTH.',
          { got: r?.role },
        ));
      }
    });
  }

  for (const key of ['required_context_inputs', 'optional_context_inputs',
    'baseline_inputs', 'evidence_only_inputs'] as const) {
    const list = def[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) {
      v.push(contractViolation(
        L6ContractViolationCode.DEF_MISSING_FIELD, key,
        `${key} must be an array when declared.`, {},
      ));
      continue;
    }
    const expectedRole =
      key === 'baseline_inputs' ? L6FeatureInputRole.BASELINE :
      key === 'evidence_only_inputs' ? L6FeatureInputRole.EVIDENCE_ONLY :
      L6FeatureInputRole.CONTEXT;
    list.forEach((r, i) => {
      if (!r || r.role !== expectedRole) {
        v.push(contractViolation(
          L6ContractViolationCode.DEF_INVALID_INPUT_ROLE,
          `${key}[${i}].role`,
          `${key} entries must carry role=${expectedRole}.`,
          { got: r?.role, expected: expectedRole },
        ));
      }
    });
  }

  if (!def.bounds) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_BOUNDS, 'bounds',
      'Feature definition must declare value bounds.', {},
    ));
  } else {
    if (def.bounds.isBounded) {
      if (def.bounds.min === null || def.bounds.max === null) {
        v.push(contractViolation(
          L6ContractViolationCode.DEF_MISSING_BOUNDS, 'bounds',
          'Bounded features must declare numeric min and max.', {},
        ));
      } else if ((def.bounds.min as number) > (def.bounds.max as number)) {
        v.push(contractViolation(
          L6ContractViolationCode.DEF_MISSING_BOUNDS, 'bounds',
          'bounds.min may not exceed bounds.max.', {},
        ));
      }
    }
  }

  if (!def.normalization_method || typeof def.normalization_method !== 'string') {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_NORMALIZATION_METHOD, 'normalization_method',
      'Feature definition must declare a canonical normalization_method.', {},
    ));
  }

  if (!def.coverage_requirement || !ALL_COVERAGE_REQUIREMENT_CLASSES.includes(def.coverage_requirement)) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_COVERAGE_REQUIREMENT, 'coverage_requirement',
      `coverage_requirement must be one of ${ALL_COVERAGE_REQUIREMENT_CLASSES.join(', ')}.`,
      { got: def.coverage_requirement },
    ));
  }

  if (!def.freshness_budget_class || !ALL_FRESHNESS_BUDGET_CLASSES.includes(def.freshness_budget_class)) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_FRESHNESS_CLASS, 'freshness_budget_class',
      `freshness_budget_class must be one of ${ALL_FRESHNESS_BUDGET_CLASSES.join(', ')}.`,
      { got: def.freshness_budget_class },
    ));
  }

  if (!def.materialization_policy || !isValidMaterializationPolicy(def.materialization_policy)) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_MATERIALIZATION_POLICY, 'materialization_policy',
      'Feature definition must declare a valid materialization_policy.',
      { got: def.materialization_policy },
    ));
  } else if (!materializationRequiresHistory(def.materialization_policy)) {
    // Not an error — info only: feature kinds may be current-only for some families.
  }

  const underlying = validateFeatureContract(def);
  const underlyingResult: L6ContractValidationResult = underlying.valid
    ? contractOk()
    : contractFail(underlying.violations.map(u =>
      contractViolation(
        L6ContractViolationCode.DEF_UNDERLYING_PRIMITIVE_INVALID,
        u.path,
        `[${u.code}] ${u.detail}`,
        u.context,
      ),
    ));

  const local = v.length === 0 ? contractOk() : contractFail(v);
  return contractMerge(local, underlyingResult);
}

function hasMeaningfulValue(obj: Record<string, unknown>, field: string): boolean {
  if (!(field in obj)) return false;
  const v = obj[field];
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.length === 0) return false;
  if (Array.isArray(v) && v.length === 0 && (field.startsWith('required') || field === 'evidence_source_declarations')) {
    return false;
  }
  return true;
}
