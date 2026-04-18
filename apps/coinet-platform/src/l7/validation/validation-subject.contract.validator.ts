/**
 * L7.3 — Validation Subject Contract Validator (executable contract layer)
 *
 * §7.3.2.6 — Validates the L7.3 `L7ValidationSubjectContract`. Distinct
 * from the L7.2 `validateValidationSubjectContract` (which validates the
 * lighter L7.2 `L7ValidationSubject` object). Both can run in series:
 * L7.2 ensures the object shape is sound; L7.3 ensures the contract is
 * complete, versioned, and replay-safe.
 */

import {
  L7ValidationSubjectContract,
  L7_SUBJECT_CONTRACT_REQUIRED_FIELDS,
} from '../contracts/validation-subject.contract';
import { ALL_VALIDATION_INTENTS, ALL_STALENESS_POLICY_CLASSES } from '../contracts/validation-runtime-status';
import { validateValidationWindow } from '../contracts/validation-window';
import { ValidationSubjectClassRegistry } from '../registry/validation-subject-class.registry';
import {
  L7ContractViolation,
  L7ContractViolationCode,
} from './contract-violation-codes';

export interface SubjectContractValidationResult {
  readonly valid: boolean;
  readonly violations: readonly L7ContractViolation[];
}

const VALID_INTENTS = new Set<string>(ALL_VALIDATION_INTENTS as readonly string[]);
const VALID_STALENESS_POLICIES = new Set<string>(ALL_STALENESS_POLICY_CLASSES as readonly string[]);

export function validateValidationSubjectContractV3(
  c: L7ValidationSubjectContract,
  classRegistry: ValidationSubjectClassRegistry = new ValidationSubjectClassRegistry(),
): SubjectContractValidationResult {
  const violations: L7ContractViolation[] = [];
  const obj = c as unknown as Record<string, unknown>;

  for (const f of L7_SUBJECT_CONTRACT_REQUIRED_FIELDS) {
    if (obj[f] === undefined || obj[f] === null) {
      violations.push({
        code: L7ContractViolationCode.SUBJECT_CONTRACT_INCOMPLETE_FIELD,
        message: `Required field missing: ${f}`,
        path: `subject.${f}`,
      });
    }
  }

  if (!c.subject_contract_version || !c.schema_version) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_VERSION,
      message: 'subject_contract_version and schema_version are required.',
      path: 'subject.version',
    });
  }

  if (!c.validation_intent || !VALID_INTENTS.has(c.validation_intent as string)) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_INTENT,
      message: 'validation_intent must be a registered L7ValidationIntent.',
      path: 'subject.validation_intent',
    });
  }

  if (!Array.isArray(c.required_support_inputs) || c.required_support_inputs.length === 0) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_SUPPORT_INPUTS,
      message: 'required_support_inputs must declare at least one support input.',
      path: 'subject.required_support_inputs',
    });
  }
  if (!Array.isArray(c.required_challenge_inputs) || c.required_challenge_inputs.length === 0) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_CHALLENGE_INPUTS,
      message: 'required_challenge_inputs must declare at least one challenge input.',
      path: 'subject.required_challenge_inputs',
    });
  }

  if (!c.as_of || !c.validation_window) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_TEMPORAL,
      message: 'as_of and validation_window are required.',
      path: 'subject.temporal',
    });
  } else {
    const wv = validateValidationWindow(c.validation_window);
    if (!wv.valid) {
      violations.push({
        code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_TEMPORAL,
        message: `validation_window invalid: ${wv.reasons.join(', ')}`,
        path: 'subject.validation_window',
        details: { reasons: wv.reasons },
      });
    }
  }

  if (!c.staleness_policy || !VALID_STALENESS_POLICIES.has(c.staleness_policy as string)) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_STALENESS_POLICY,
      message: 'staleness_policy is required.',
      path: 'subject.staleness_policy',
    });
  }

  if (
    !Array.isArray(c.confirmation_rules) ||
    c.confirmation_rules.length === 0 ||
    !Array.isArray(c.contradiction_rules) ||
    c.contradiction_rules.length === 0
  ) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_RULE_REFS,
      message: 'confirmation_rules and contradiction_rules must declare at least one rule each.',
      path: 'subject.rules',
    });
  }

  if (
    !c.confidence_derivation_spec ||
    !c.confidence_derivation_spec.policy_id ||
    !Array.isArray(c.confidence_derivation_spec.required_factors) ||
    c.confidence_derivation_spec.required_factors.length === 0
  ) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_CONFIDENCE_SPEC,
      message: 'confidence_derivation_spec must declare a policy and at least one required factor.',
      path: 'subject.confidence_derivation_spec',
    });
  }

  if (!c.restriction_derivation_spec || !c.restriction_derivation_spec.policy_id) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_RESTRICTION_SPEC,
      message: 'restriction_derivation_spec must declare a policy.',
      path: 'subject.restriction_derivation_spec',
    });
  }

  if (!c.materialization_policy) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_MATERIALIZATION_POLICY,
      message: 'materialization_policy is required.',
      path: 'subject.materialization_policy',
    });
  }
  if (!c.evidence_pack_policy) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_EVIDENCE_PACK_POLICY,
      message: 'evidence_pack_policy is required.',
      path: 'subject.evidence_pack_policy',
    });
  }

  if (!c.lineage_refs || !c.lineage_refs.trace_id || !c.lineage_refs.manifest_id) {
    violations.push({
      code: L7ContractViolationCode.SUBJECT_CONTRACT_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and lineage_refs.manifest_id are required.',
      path: 'subject.lineage_refs',
    });
  }

  if (c.subject_class && classRegistry.isRegistered(c.subject_class)) {
    const desc = classRegistry.get(c.subject_class);
    if (desc && !desc.legalScopeTypes.includes(c.scope_type)) {
      violations.push({
        code: L7ContractViolationCode.SUBJECT_CONTRACT_INCOMPLETE_FIELD,
        message: `scope_type '${c.scope_type}' illegal for subject class '${c.subject_class}'.`,
        path: 'subject.scope_type',
      });
    }
  }

  return { valid: violations.length === 0, violations };
}
