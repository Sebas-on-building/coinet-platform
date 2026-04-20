/**
 * L9.3 — Contract Compatibility Validator
 *
 * §9.3.7.5 — Delta is illegal if:
 *   - version regresses (non-monotonic)
 *   - required fields are removed without a migration declaration
 *   - semantics change silently (classification mismatch with declared)
 *   - replay identity changes silently
 *   - declared compatibility class is weaker than actual semantic impact
 */

import {
  L9ContractCompatibilityClass,
  L9ContractDelta,
  L9ContractSurface,
  classifyL9ContractDelta,
  compareL9ContractVersions,
} from '../contracts/sequence-contract-versioning';
import { L9_SUBJECT_CONTRACT_REQUIRED_FIELDS } from '../contracts/sequence-subject.contract';
import { L9_OUTPUT_CONTRACT_REQUIRED_FIELDS } from '../contracts/sequence-output.contract';
import { L9_LEAD_LAG_CONTRACT_REQUIRED_FIELDS } from '../contracts/lead-lag-relation.contract';
import { L9_CHAIN_CONTRACT_REQUIRED_FIELDS } from '../contracts/sequence-chain.contract';
import { L9_PHASE_CONTRACT_REQUIRED_FIELDS } from '../contracts/phase-state.contract';
import { L9_DECAY_CONTRACT_REQUIRED_FIELDS } from '../contracts/decay-profile.contract';
import { L9_POST_EVENT_CONTRACT_REQUIRED_FIELDS } from '../contracts/post-event-window.contract';
import { L9_RESTRICTION_CONTRACT_REQUIRED_FIELDS } from '../contracts/sequence-restriction.contract';
import { L9SequenceContractViolationCode } from './l9-contract-violation-codes';

export interface L9CompatibilityIssue {
  readonly code: L9SequenceContractViolationCode;
  readonly message: string;
}
export interface L9CompatibilityReport {
  readonly valid: boolean;
  readonly classifiedClass: L9ContractCompatibilityClass;
  readonly issues: readonly L9CompatibilityIssue[];
}

export interface L9CompatibilityInput {
  readonly delta: L9ContractDelta;
  readonly declaredClass: L9ContractCompatibilityClass;
  readonly allowMigrationRequired?: boolean;
  readonly allowBreaking?: boolean;
  readonly migrationApproved?: boolean;
}

function requiredFieldsForSurface(
  surface: L9ContractSurface,
): readonly string[] {
  switch (surface) {
    case L9ContractSurface.SUBJECT:
      return L9_SUBJECT_CONTRACT_REQUIRED_FIELDS;
    case L9ContractSurface.OUTPUT:
      return L9_OUTPUT_CONTRACT_REQUIRED_FIELDS;
    case L9ContractSurface.LEAD_LAG:
      return L9_LEAD_LAG_CONTRACT_REQUIRED_FIELDS;
    case L9ContractSurface.CHAIN:
      return L9_CHAIN_CONTRACT_REQUIRED_FIELDS;
    case L9ContractSurface.PHASE:
      return L9_PHASE_CONTRACT_REQUIRED_FIELDS;
    case L9ContractSurface.DECAY:
      return L9_DECAY_CONTRACT_REQUIRED_FIELDS;
    case L9ContractSurface.POST_EVENT:
      return L9_POST_EVENT_CONTRACT_REQUIRED_FIELDS;
    case L9ContractSurface.RESTRICTION:
      return L9_RESTRICTION_CONTRACT_REQUIRED_FIELDS;
  }
}

// Classes ordered from least to most disruptive.
const classOrder: Record<L9ContractCompatibilityClass, number> = {
  [L9ContractCompatibilityClass.ADDITIVE_SAFE]: 0,
  [L9ContractCompatibilityClass.BACKWARD_COMPATIBLE]: 1,
  [L9ContractCompatibilityClass.MIGRATION_REQUIRED]: 2,
  [L9ContractCompatibilityClass.BREAKING_SEMANTIC]: 3,
  [L9ContractCompatibilityClass.PROHIBITED]: 4,
};

export function validateL9ContractCompatibility(
  input: L9CompatibilityInput,
): L9CompatibilityReport {
  const issues: L9CompatibilityIssue[] = [];
  const { delta, declaredClass } = input;

  const cls = classifyL9ContractDelta(delta);

  // PROHIBITED always illegal.
  if (cls === L9ContractCompatibilityClass.PROHIBITED) {
    issues.push({
      code: L9SequenceContractViolationCode.COMPATIBILITY_PROHIBITED,
      message: `delta marked prohibited_change=true (${delta.surface} ${delta.from}→${delta.to})`,
    });
  }

  // Non-monotonic version.
  if (compareL9ContractVersions(delta.to, delta.from) <= 0) {
    issues.push({
      code: L9SequenceContractViolationCode.COMPATIBILITY_NON_MONOTONIC_VERSION,
      message:
        `version did not advance: from=${delta.from} to=${delta.to}`,
    });
  }

  // Required-field removal without migration approval.
  const requiredFields = new Set(requiredFieldsForSurface(delta.surface));
  const removedRequired = delta.removed_fields.filter(f => requiredFields.has(f));
  if (removedRequired.length > 0) {
    if (!input.migrationApproved) {
      issues.push({
        code: L9SequenceContractViolationCode.COMPATIBILITY_REQUIRED_FIELD_REMOVED,
        message:
          `required fields removed without migration approval: ${removedRequired.join(', ')}`,
      });
    }
  }

  // Classification mismatch: declared weaker than actual.
  if (classOrder[declaredClass] < classOrder[cls]) {
    issues.push({
      code: L9SequenceContractViolationCode.COMPATIBILITY_CLASSIFICATION_MISMATCH,
      message:
        `declaredClass=${declaredClass} weaker than classified=${cls}`,
    });
  }

  // BREAKING_SEMANTIC without explicit approval.
  if (cls === L9ContractCompatibilityClass.BREAKING_SEMANTIC &&
      input.allowBreaking !== true) {
    issues.push({
      code: L9SequenceContractViolationCode.COMPATIBILITY_BREAKING_SEMANTIC_UNAPPROVED,
      message:
        `BREAKING_SEMANTIC delta emitted without allowBreaking=true; fields=${delta.semantically_changed_fields.join(', ')}`,
    });
  }

  // MIGRATION_REQUIRED without explicit approval.
  if (cls === L9ContractCompatibilityClass.MIGRATION_REQUIRED &&
      input.allowMigrationRequired !== true &&
      input.migrationApproved !== true) {
    issues.push({
      code: L9SequenceContractViolationCode.COMPATIBILITY_BREAKING_SEMANTIC_UNAPPROVED,
      message:
        `MIGRATION_REQUIRED delta emitted without allowMigrationRequired=true`,
    });
  }

  return {
    valid: issues.length === 0,
    classifiedClass: cls,
    issues,
  };
}
