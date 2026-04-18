/**
 * L7.5 — Validation Class Validator
 *
 * §7.5.2 — Enforces primary-class law: singular class, no masquerade,
 * registered class only, precedence-safe resolution, and no redefinition
 * by family-specific validators.
 */

import {
  L7PrimaryValidationClass,
  L7_PRIMARY_CLASS_PRECEDENCE,
  getL7PrimaryClassDescriptor,
  isL7PrimaryValidationClass,
  resolvePrimaryClassByPrecedence,
} from '../contracts/validation-class.policy';
import {
  L7SemanticViolation,
  L7SemanticViolationCode,
} from './l7-semantic-violation-codes';

export interface L7PrimaryClassSelectionInput {
  /** Candidate classes identified by independent evaluators. */
  readonly candidates: readonly L7PrimaryValidationClass[];
  /** Optional: class a family proposed after local interpretation. */
  readonly familyProposed?: L7PrimaryValidationClass;
  /** Evidence flags that should constrain the selection. */
  readonly flags?: {
    readonly criticalContradictionPresent?: boolean;
    readonly blockingContradictionPresent?: boolean;
    readonly incompleteness?: boolean;
    readonly staleness?: boolean;
    readonly degradation?: boolean;
  };
}

export interface L7PrimaryClassSelectionResult {
  readonly primary: L7PrimaryValidationClass | null;
  readonly violations: readonly L7SemanticViolation[];
}

function v(
  code: L7SemanticViolationCode,
  detail: string,
  extra: Partial<L7SemanticViolation> = {},
): L7SemanticViolation {
  return { code, detail, ...extra };
}

export class L7ValidationClassValidator {
  /**
   * §7.5.2 — Validates that a single class is legal, known, and
   * truth-safe for the supplied evidence flags.
   */
  validateSingle(cls: string): readonly L7SemanticViolation[] {
    const violations: L7SemanticViolation[] = [];
    if (!isL7PrimaryValidationClass(cls)) {
      violations.push(
        v(L7SemanticViolationCode.UNKNOWN_PRIMARY_CLASS, `unknown primary class ${cls}`, {
          primaryClass: cls,
        }),
      );
      return violations;
    }
    const d = getL7PrimaryClassDescriptor(cls);
    if (!d) {
      violations.push(
        v(L7SemanticViolationCode.UNKNOWN_PRIMARY_CLASS, `missing descriptor for ${cls}`, {
          primaryClass: cls,
        }),
      );
    }
    return violations;
  }

  /**
   * §7.5.2.3 / §7.5.2.4 — Selects the primary class per truth-safety
   * precedence from a set of candidates. Rejects multi-class misuse
   * and clean-confirmation masquerade.
   */
  select(input: L7PrimaryClassSelectionInput): L7PrimaryClassSelectionResult {
    const violations: L7SemanticViolation[] = [];

    if (input.candidates.length === 0) {
      return { primary: null, violations };
    }

    // All candidates must be known.
    for (const c of input.candidates) {
      violations.push(...this.validateSingle(c));
    }

    const unique = new Set(input.candidates);
    if (unique.size === 0) {
      return { primary: null, violations };
    }

    const winner = resolvePrimaryClassByPrecedence([...unique]);
    if (!winner) {
      return { primary: null, violations };
    }

    const flags = input.flags ?? {};

    // §7.5.2.4 — Clean confirmation masquerade: CONFIRMED may not win
    // when degradation / staleness / critical contradiction flags are set.
    if (winner === L7PrimaryValidationClass.CONFIRMED) {
      if (flags.degradation) {
        violations.push(
          v(
            L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE,
            'CONFIRMED chosen while degradation flag is set',
            { primaryClass: winner },
          ),
        );
      }
      if (flags.staleness) {
        violations.push(
          v(
            L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE,
            'CONFIRMED chosen while staleness flag is set',
            { primaryClass: winner },
          ),
        );
      }
      if (flags.criticalContradictionPresent || flags.blockingContradictionPresent) {
        violations.push(
          v(
            L7SemanticViolationCode.CLEAN_CONFIRMATION_MASQUERADE,
            'CONFIRMED chosen while critical/blocking contradiction flag is set',
            { primaryClass: winner },
          ),
        );
      }
    }

    // §7.5.2.3 — Class exclusivity enforcement: candidates may suggest
    // multiple classes, but selection MUST collapse to one. We already
    // collapse; we flag only if family proposed a class that is earlier
    // in precedence than the winner (family must never upgrade safety).
    if (input.familyProposed) {
      const familyIdx = L7_PRIMARY_CLASS_PRECEDENCE.indexOf(input.familyProposed);
      const winnerIdx = L7_PRIMARY_CLASS_PRECEDENCE.indexOf(winner);
      if (familyIdx > winnerIdx) {
        violations.push(
          v(
            L7SemanticViolationCode.PRIMARY_CLASS_REDEFINED_BY_FAMILY,
            `family proposed ${input.familyProposed} overriding precedence winner ${winner}`,
            { primaryClass: input.familyProposed },
          ),
        );
      }
    }

    return { primary: winner, violations };
  }

  /**
   * §7.5.2.4 — Precedence-safety check: verify that the chosen class is
   * no less truth-safe than the safest candidate.
   */
  checkPrecedence(
    chosen: L7PrimaryValidationClass,
    candidates: readonly L7PrimaryValidationClass[],
  ): readonly L7SemanticViolation[] {
    const violations: L7SemanticViolation[] = [];
    if (candidates.length === 0) return violations;
    const safest = resolvePrimaryClassByPrecedence(candidates);
    if (safest && safest !== chosen) {
      const chosenIdx = L7_PRIMARY_CLASS_PRECEDENCE.indexOf(chosen);
      const safestIdx = L7_PRIMARY_CLASS_PRECEDENCE.indexOf(safest);
      if (chosenIdx > safestIdx) {
        violations.push(
          v(
            L7SemanticViolationCode.PRECEDENCE_VIOLATED,
            `chosen ${chosen} is less truth-safe than safest candidate ${safest}`,
            { primaryClass: chosen },
          ),
        );
      }
    }
    return violations;
  }
}

const defaultValidationClassValidator = new L7ValidationClassValidator();

export function getDefaultValidationClassValidator(): L7ValidationClassValidator {
  return defaultValidationClassValidator;
}
