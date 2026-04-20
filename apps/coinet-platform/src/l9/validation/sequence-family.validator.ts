/**
 * L9.2 — Sequence Family Validator
 *
 * §9.2.5.2 — A sequence state may not exist outside a registered family,
 * and a family may not consume states from another family. Enforces
 * scope legality for both the declared family and the declared state
 * under the given scope.
 */

import {
  L9SequenceFamily,
  L9SequenceScopeType,
} from '../contracts/sequence-family';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9SequenceObjectViolationCode } from '../contracts/sequence-output-class';
import {
  L9SequenceFamilyRegistry,
  getDefaultL9SequenceFamilyRegistry,
} from '../registry/sequence-family.registry';
import {
  L9SequenceStateRegistry,
  getDefaultL9SequenceStateRegistry,
} from '../registry/sequence-state.registry';

export interface L9FamilyValidationIssue {
  readonly code: L9SequenceObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L9FamilyValidationReport {
  readonly valid: boolean;
  readonly issues: readonly L9FamilyValidationIssue[];
}

export interface L9FamilyCheckInput {
  readonly family: L9SequenceFamily;
  readonly sequenceState: L9SequenceState;
  readonly scope_type: L9SequenceScopeType;
}

export function validateL9SequenceFamily(
  input: L9FamilyCheckInput,
  familyRegistry: L9SequenceFamilyRegistry = getDefaultL9SequenceFamilyRegistry(),
  stateRegistry: L9SequenceStateRegistry = getDefaultL9SequenceStateRegistry(),
): L9FamilyValidationReport {
  const issues: L9FamilyValidationIssue[] = [];

  if (!familyRegistry.isRegistered(input.family)) {
    issues.push({
      code: L9SequenceObjectViolationCode.FAMILY_UNREGISTERED,
      message: `Family ${input.family} is not registered`,
      details: { family: input.family },
    });
    return { valid: false, issues };
  }

  if (!stateRegistry.isRegistered(input.sequenceState)) {
    issues.push({
      code: L9SequenceObjectViolationCode.STATE_UNREGISTERED,
      message: `Sequence state ${input.sequenceState} is not registered`,
      details: { state: input.sequenceState },
    });
    return { valid: false, issues };
  }

  if (!stateRegistry.belongsToFamily(input.sequenceState, input.family)) {
    issues.push({
      code: L9SequenceObjectViolationCode.STATE_NOT_IN_FAMILY,
      message:
        `Sequence state ${input.sequenceState} does not belong to family ${input.family}`,
      details: { state: input.sequenceState, family: input.family },
    });
  }

  if (!familyRegistry.allowsScope(input.family, input.scope_type)) {
    issues.push({
      code: L9SequenceObjectViolationCode.SUBJECT_SCOPE_ILLEGAL_FOR_FAMILY,
      message:
        `Scope ${input.scope_type} is not legal for family ${input.family}`,
      details: { scope_type: input.scope_type, family: input.family },
    });
  }

  if (!stateRegistry.allowsScope(input.sequenceState, input.scope_type)) {
    issues.push({
      code: L9SequenceObjectViolationCode.STATE_SCOPE_ILLEGAL,
      message:
        `Scope ${input.scope_type} is not legal for state ${input.sequenceState}`,
      details: { scope_type: input.scope_type, state: input.sequenceState },
    });
  }

  return { valid: issues.length === 0, issues };
}
