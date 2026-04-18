/**
 * L8.2 — Regime Coexistence Validator
 *
 * §8.2.9 — Enforces intra-family coexistence law and cross-family
 * coexistence law on a set of regime states.
 *
 *   - Within one family: enforces ILLEGAL / TRANSITION_ONLY /
 *     AMBIGUITY_ONLY / ALLOWED rules, and blocks lifecycle collisions
 *     (§8.2.6.5).
 *   - Across families: enforces the family coexistence registry and
 *     blocks duplicates within the same family at the same scope/time.
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import { L8RegimeClass, getLifecyclePosture } from '../contracts/regime-class';
import {
  L8RegimeCoexistenceClass,
} from '../contracts/regime-state';
import { L8RegimeObjectViolationCode } from '../contracts/regime-output-class';
import {
  L8RegimeFamilyRegistry,
  getDefaultL8RegimeFamilyRegistry,
} from '../registry/regime-family.registry';
import {
  L8RegimeCoexistenceRegistry,
  getDefaultL8CoexistenceRegistry,
} from '../registry/regime-coexistence.registry';

export interface L8CoexistenceIssue {
  readonly code: L8RegimeObjectViolationCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface L8CoexistenceReport {
  readonly valid: boolean;
  readonly issues: readonly L8CoexistenceIssue[];
}

/**
 * Intra-family coexistence — one declared (primary, secondary,
 * declared coexistence class).
 */
export interface L8IntraFamilyCoexistenceInput {
  readonly family: L8RegimeFamily;
  readonly primary: L8RegimeClass;
  readonly secondary: L8RegimeClass | null;
  readonly coexistence_class: L8RegimeCoexistenceClass;
}

export function validateIntraFamilyCoexistence(
  input: L8IntraFamilyCoexistenceInput,
  coexistenceRegistry:
    L8RegimeCoexistenceRegistry = getDefaultL8CoexistenceRegistry(),
  familyRegistry:
    L8RegimeFamilyRegistry = getDefaultL8RegimeFamilyRegistry(),
): L8CoexistenceReport {
  const issues: L8CoexistenceIssue[] = [];

  // Self-collision is always illegal.
  if (input.secondary !== null && input.primary === input.secondary) {
    issues.push({
      code: L8RegimeObjectViolationCode.STATE_SECONDARY_EQUALS_PRIMARY,
      message: 'Secondary regime must differ from primary',
      details: { primary: input.primary },
    });
    return { valid: false, issues };
  }

  const decision = coexistenceRegistry.decide(
    input.family,
    input.primary,
    input.secondary,
    input.coexistence_class,
  );

  if (!decision.allowed) {
    // Map the required class / rule kind to a specific violation code.
    if (decision.rule?.kind === 'ILLEGAL' ||
        decision.requiredClass === L8RegimeCoexistenceClass.ILLEGAL_COLLISION) {
      issues.push({
        code: L8RegimeObjectViolationCode.COEXISTENCE_ILLEGAL_COLLISION,
        message: decision.reason,
        details: {
          family: input.family,
          primary: input.primary,
          secondary: input.secondary,
          declared: decision.declaredClass,
        },
      });
    } else if (decision.requiredClass ===
        L8RegimeCoexistenceClass.TRANSITIONAL_OVERLAP) {
      issues.push({
        code: L8RegimeObjectViolationCode.COEXISTENCE_MISSING_TRANSITION,
        message: decision.reason,
        details: {
          declared: decision.declaredClass,
          required: decision.requiredClass,
        },
      });
    } else if (decision.requiredClass ===
        L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE) {
      issues.push({
        code: L8RegimeObjectViolationCode.COEXISTENCE_MISSING_AMBIGUITY,
        message: decision.reason,
        details: {
          declared: decision.declaredClass,
          required: decision.requiredClass,
        },
      });
    } else if (decision.declaredClass ===
        L8RegimeCoexistenceClass.CLEAN_SINGLE &&
      input.secondary !== null) {
      issues.push({
        code: L8RegimeObjectViolationCode.COEXISTENCE_FAKE_CLEAN_SINGLE,
        message: decision.reason,
        details: {
          declared: decision.declaredClass,
          required: decision.requiredClass,
        },
      });
    } else {
      issues.push({
        code: L8RegimeObjectViolationCode.COEXISTENCE_FAKE_CLEAN_SINGLE,
        message: decision.reason,
        details: {
          declared: decision.declaredClass,
          required: decision.requiredClass,
        },
      });
    }
  }

  // §8.2.6.5 — Lifecycle integrity: if the family is lifecycle-aware and
  // primary + secondary have materially incompatible lifecycle postures,
  // we require TRANSITIONAL_OVERLAP or AMBIGUOUS_MULTI_CANDIDATE.
  if (
    familyRegistry.isLifecycleAware(input.family) &&
    input.secondary !== null
  ) {
    const p = getLifecyclePosture(input.primary);
    const s = getLifecyclePosture(input.secondary);
    const lifecycleConflict =
      (p === 'PRE_TREND' && (s === 'TREND_ESTABLISHED' || s === 'LATE_STAGE' || s === 'EXITING_TREND')) ||
      ((p === 'TREND_ESTABLISHED' || p === 'LATE_STAGE' || p === 'EXITING_TREND') && s === 'PRE_TREND') ||
      (p === 'TREND_EMERGING' && s === 'EXITING_TREND') ||
      (p === 'EXITING_TREND' && s === 'TREND_EMERGING') ||
      (p === 'LATE_STAGE' && s === 'TREND_EMERGING') ||
      (p === 'TREND_EMERGING' && s === 'LATE_STAGE');

    if (
      lifecycleConflict &&
      input.coexistence_class === L8RegimeCoexistenceClass.PRIMARY_PLUS_SECONDARY
    ) {
      issues.push({
        code: L8RegimeObjectViolationCode.COEXISTENCE_LIFECYCLE_VIOLATION,
        message:
          `Lifecycle postures ${p}/${s} conflict — must be declared TRANSITIONAL_OVERLAP or AMBIGUOUS_MULTI_CANDIDATE`,
        details: { primary_posture: p, secondary_posture: s },
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Cross-family coexistence — a set of (family, regime_class, scope_id)
 * rows at the same as_of. Enforces family-coexistence registry and
 * blocks duplicate family entries for the same scope/time.
 */
export interface L8CrossFamilyInput {
  readonly rows: readonly {
    readonly family: L8RegimeFamily;
    readonly primary: L8RegimeClass;
    readonly scope_id: string;
    readonly as_of: string;
  }[];
}

export function validateCrossFamilyCoexistence(
  input: L8CrossFamilyInput,
  familyRegistry:
    L8RegimeFamilyRegistry = getDefaultL8RegimeFamilyRegistry(),
): L8CoexistenceReport {
  const issues: L8CoexistenceIssue[] = [];
  const rows = input.rows;

  // Duplicate family for same (scope, time) is a structural bug.
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.family}|${r.scope_id}|${r.as_of}`;
    if (seen.has(key)) {
      issues.push({
        code: L8RegimeObjectViolationCode.COEXISTENCE_CROSS_FAMILY_DUPLICATE,
        message:
          `Duplicate family ${r.family} for scope=${r.scope_id} at ${r.as_of}`,
        details: { family: r.family, scope_id: r.scope_id, as_of: r.as_of },
      });
    }
    seen.add(key);
  }

  // Pairwise family-coexistence check at the same scope/time.
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (a.scope_id !== b.scope_id || a.as_of !== b.as_of) continue;
      if (a.family === b.family) continue;
      if (!familyRegistry.coexistsWith(a.family, b.family)) {
        issues.push({
          code: L8RegimeObjectViolationCode.COEXISTENCE_CROSS_FAMILY_ILLEGAL,
          message:
            `Families ${a.family} and ${b.family} may not coexist per registry`,
          details: { a: a.family, b: b.family },
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
