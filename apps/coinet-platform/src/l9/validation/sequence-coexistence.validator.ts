/**
 * L9.2 — Sequence Coexistence Validator
 *
 * §9.2.7 — Enforces both intra-family coexistence law and cross-family
 * uniqueness. A SequenceAssessment may carry at most one primary state
 * per family; multiple families may coexist cleanly (§9.2.7.4), but
 * intra-family pairs must follow the rulebook.
 */

import { L9SequenceFamily } from '../contracts/sequence-family';
import { L9SequenceState } from '../contracts/sequence-state';
import {
  L9SequenceCoexistenceClass,
  L9CoexistenceDecision,
} from '../contracts/sequence-coexistence';
import { L9SequenceObjectViolationCode } from '../contracts/sequence-output-class';
import {
  L9SequenceCoexistenceRegistry,
  getDefaultL9SequenceCoexistenceRegistry,
} from '../registry/sequence-coexistence.registry';
import {
  L9SequenceStateRegistry,
  getDefaultL9SequenceStateRegistry,
} from '../registry/sequence-state.registry';
import {
  L9SequenceFamilyRegistry,
  getDefaultL9SequenceFamilyRegistry,
} from '../registry/sequence-family.registry';

export interface L9CoexistenceIssue {
  readonly code: L9SequenceObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L9CoexistenceValidationReport {
  readonly valid: boolean;
  readonly issues: readonly L9CoexistenceIssue[];
  readonly decision: L9CoexistenceDecision | null;
}

export interface L9IntraFamilyCoexistenceInput {
  readonly family: L9SequenceFamily;
  readonly primary: L9SequenceState;
  readonly secondary: L9SequenceState | null;
  readonly declaredClass: L9SequenceCoexistenceClass;
  /** §9.2.4.9 — Whether a post-event window is anchored for this subject. */
  readonly postEventAnchorPresent: boolean;
}

export function validateL9IntraFamilyCoexistence(
  input: L9IntraFamilyCoexistenceInput,
  coexRegistry: L9SequenceCoexistenceRegistry = getDefaultL9SequenceCoexistenceRegistry(),
  stateRegistry: L9SequenceStateRegistry = getDefaultL9SequenceStateRegistry(),
): L9CoexistenceValidationReport {
  const issues: L9CoexistenceIssue[] = [];

  // Post-event anchor requirement is pair-aware: if either state requires
  // one, the anchor must be present.
  const primaryNeedsAnchor = stateRegistry.requiresPostEventAnchor(input.primary);
  const secondaryNeedsAnchor = input.secondary
    ? stateRegistry.requiresPostEventAnchor(input.secondary)
    : false;
  if (
    (primaryNeedsAnchor || secondaryNeedsAnchor) &&
    !input.postEventAnchorPresent
  ) {
    issues.push({
      code: L9SequenceObjectViolationCode.COEXISTENCE_MISSING_POST_EVENT_ANCHOR,
      message:
        `State requires a post-event window anchor but none is declared ` +
        `(primary=${input.primary}, secondary=${input.secondary ?? 'null'})`,
      details: { primary: input.primary, secondary: input.secondary },
    });
  }

  const decision = coexRegistry.decide(
    input.family,
    input.primary,
    input.secondary,
    input.declaredClass,
  );

  if (!decision.allowed) {
    // Disambiguate the failure into one of the specific coexistence codes.
    if (decision.requiredClass === L9SequenceCoexistenceClass.ILLEGAL_COLLISION) {
      issues.push({
        code: L9SequenceObjectViolationCode.COEXISTENCE_ILLEGAL_COLLISION,
        message: decision.reason,
        details: { decision },
      });
    } else if (
      decision.declaredClass === L9SequenceCoexistenceClass.CLEAN_SINGLE &&
      decision.requiredClass !== L9SequenceCoexistenceClass.CLEAN_SINGLE
    ) {
      // Distinguish the "state forbids clean single" reason from the
      // generic fake-clean-single case.
      if (decision.reason.includes('CLEAN_SINGLE (§9.2.6.5)')) {
        issues.push({
          code: L9SequenceObjectViolationCode.COEXISTENCE_STATE_FORBIDS_CLEAN_SINGLE,
          message: decision.reason,
          details: { decision },
        });
      } else {
        issues.push({
          code: L9SequenceObjectViolationCode.COEXISTENCE_FAKE_CLEAN_SINGLE,
          message: decision.reason,
          details: { decision },
        });
      }
    } else if (
      decision.requiredClass === L9SequenceCoexistenceClass.TRANSITIONAL_OVERLAP
    ) {
      issues.push({
        code: L9SequenceObjectViolationCode.COEXISTENCE_MISSING_TRANSITION,
        message: decision.reason,
        details: { decision },
      });
    } else if (
      decision.requiredClass === L9SequenceCoexistenceClass.AMBIGUOUS_MULTI_STATE
    ) {
      issues.push({
        code: L9SequenceObjectViolationCode.COEXISTENCE_MISSING_AMBIGUITY,
        message: decision.reason,
        details: { decision },
      });
    } else {
      issues.push({
        code: L9SequenceObjectViolationCode.COEXISTENCE_ILLEGAL_COLLISION,
        message: decision.reason,
        details: { decision },
      });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    decision,
  };
}

/**
 * §9.2.7.2 / §9.2.7.4 — Cross-family coexistence: multiple families may
 * be present in a single SequenceAssessment *only* if (a) the families
 * are declared as coexistsWith each other in the family descriptor and
 * (b) no family is declared more than once.
 */
export interface L9CrossFamilyCoexistenceInput {
  readonly families: readonly L9SequenceFamily[];
}

export function validateL9CrossFamilyCoexistence(
  input: L9CrossFamilyCoexistenceInput,
  familyRegistry: L9SequenceFamilyRegistry = getDefaultL9SequenceFamilyRegistry(),
): L9CoexistenceValidationReport {
  const issues: L9CoexistenceIssue[] = [];
  const seen = new Set<L9SequenceFamily>();

  for (const f of input.families) {
    if (!familyRegistry.isRegistered(f)) {
      issues.push({
        code: L9SequenceObjectViolationCode.FAMILY_UNREGISTERED,
        message: `Family ${f} is not registered`,
        details: { family: f },
      });
      continue;
    }
    if (seen.has(f)) {
      issues.push({
        code: L9SequenceObjectViolationCode.COEXISTENCE_CROSS_FAMILY_DUPLICATE,
        message: `Family ${f} is declared more than once in cross-family coexistence`,
        details: { family: f, families: input.families },
      });
    }
    seen.add(f);
  }

  const unique = Array.from(seen);
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const a = unique[i];
      const b = unique[j];
      if (!familyRegistry.coexistsWith(a, b)) {
        issues.push({
          code: L9SequenceObjectViolationCode.COEXISTENCE_CROSS_FAMILY_ILLEGAL,
          message: `Families ${a} and ${b} may not coexist`,
          details: { a, b },
        });
      }
    }
  }

  return { valid: issues.length === 0, issues, decision: null };
}
