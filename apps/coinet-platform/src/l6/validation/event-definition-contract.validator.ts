/**
 * L6.3 — Event Definition Contract Validator
 *
 * §6.3.5.3 / §6.3.5.4 — Enforces event-definition legality:
 *   - L6.2 primitive/event contract legality (via delegated validator)
 *   - required definition blocks present
 *   - evidence source declarations present
 *   - suppression taxonomy binding present
 *   - lifecycle completeness declared
 *   - freshness class and materialization compatibility
 */

import {
  EventDefinitionContract,
  REQUIRED_EVENT_DEFINITION_FIELDS,
  L6EventEvidenceSourceRole,
} from '../contracts/event-definition.contract';
import {
  ALL_FRESHNESS_BUDGET_CLASSES,
  isValidMaterializationPolicy,
  materializationRequiresInstance,
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
import { validateEventContract } from './event-contract.validator';

export function validateEventDefinitionContract(
  def: EventDefinitionContract,
): L6ContractValidationResult {
  const v: L6ContractViolation[] = [];

  if (!def || typeof def !== 'object') {
    return contractFail([contractViolation(
      L6ContractViolationCode.DEF_MISSING_BLOCK, 'root',
      'Event definition is missing.', {},
    )]);
  }

  const dict = def as unknown as Record<string, unknown>;
  for (const field of REQUIRED_EVENT_DEFINITION_FIELDS) {
    if (!hasMeaningfulValue(dict, field)) {
      v.push(contractViolation(
        L6ContractViolationCode.DEF_MISSING_FIELD, field,
        `Event definition is missing required field "${field}".`,
        { field },
      ));
    }
  }

  if (def.version && !parseContractVersion(def.version)) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_INVALID_VERSION, 'version',
      `Event definition version "${def.version}" is not a valid L6 contract version.`,
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

  if (!Array.isArray(def.evidence_source_declarations) || def.evidence_source_declarations.length === 0) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_EVIDENCE_SOURCES, 'evidence_source_declarations',
      'Event definition must declare at least one evidence source.', {},
    ));
  } else {
    const hasTrigger = def.evidence_source_declarations.some(e =>
      e?.role === L6EventEvidenceSourceRole.TRIGGER && e.required);
    if (!hasTrigger) {
      v.push(contractViolation(
        L6ContractViolationCode.DEF_MISSING_EVIDENCE_SOURCES, 'evidence_source_declarations',
        'Event definition must declare at least one required TRIGGER evidence source.', {},
      ));
    }
  }

  if (!def.suppression_taxonomy_binding
      || !def.suppression_taxonomy_binding.taxonomyId
      || !def.suppression_taxonomy_binding.suppressionGroupId) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_SUPPRESSION_TAXONOMY, 'suppression_taxonomy_binding',
      'Event definition must bind to a suppression taxonomy and group.', {},
    ));
  }

  if (!def.lifecycle_completeness) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_LIFECYCLE_COMPLETENESS, 'lifecycle_completeness',
      'Event definition must declare lifecycle_completeness.', {},
    ));
  } else {
    const lc = def.lifecycle_completeness;
    if (!lc.requiresCandidate) {
      v.push(contractViolation(
        L6ContractViolationCode.DEF_MISSING_LIFECYCLE_COMPLETENESS, 'lifecycle_completeness.requiresCandidate',
        'lifecycle_completeness must require CANDIDATE stage.', {},
      ));
    }
    if (!lc.requiresResolution && !lc.allowsExpiry) {
      v.push(contractViolation(
        L6ContractViolationCode.DEF_MISSING_LIFECYCLE_COMPLETENESS, 'lifecycle_completeness',
        'lifecycle_completeness must declare resolution or expiry path.', {},
      ));
    }
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
      'Event definition must declare a valid materialization_policy.',
      { got: def.materialization_policy },
    ));
  } else if (!materializationRequiresInstance(def.materialization_policy)) {
    v.push(contractViolation(
      L6ContractViolationCode.DEF_MISSING_MATERIALIZATION_POLICY, 'materialization_policy',
      'Event definitions require a materialization_policy that persists instance rows.',
      { got: def.materialization_policy },
    ));
  }

  const underlying = validateEventContract(def);
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
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}
