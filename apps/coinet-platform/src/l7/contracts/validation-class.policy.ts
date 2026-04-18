/**
 * L7.5 — Primary Validation Class Policy
 *
 * §7.5.2 — Defines the only legal primary validation classes, their
 * semantic meaning, their precedence, and the baseline class behavior
 * that later engines must respect.
 *
 * These are disjoint from L7.2's runtime `L7ValidationClass` enum,
 * which is a lower-level execution representation. The registry provides
 * a canonical mapping so L7.4 materialization can translate a 7.5
 * primary class into the runtime contract value.
 *
 * Hierarchy anchor:
 *   L7.5 primary class  →  L7.2 L7ValidationClass  →  L7 runtime contract
 */

import { L7ValidationClass } from './validation-output-class';

export enum L7PrimaryValidationClass {
  CONFIRMED = 'CONFIRMED',
  WEAKLY_CONFIRMED = 'WEAKLY_CONFIRMED',
  CONFLICTING = 'CONFLICTING',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
  STALE = 'STALE',
  DEGRADED_DUE_TO_MISSING_SOURCE = 'DEGRADED_DUE_TO_MISSING_SOURCE',
}

export const ALL_L7_PRIMARY_VALIDATION_CLASSES: readonly L7PrimaryValidationClass[] =
  Object.values(L7PrimaryValidationClass);

/**
 * §7.5.2.4 — Class-precedence is a TRUTH-SAFETY hierarchy, not a value
 * hierarchy. A degraded or stale result must never masquerade as clean
 * confirmation. Precedence is applied when multiple class candidates
 * are eligible: the first in this list wins.
 */
export const L7_PRIMARY_CLASS_PRECEDENCE: readonly L7PrimaryValidationClass[] = [
  L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
  L7PrimaryValidationClass.STALE,
  L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
  L7PrimaryValidationClass.CONFLICTING,
  L7PrimaryValidationClass.WEAKLY_CONFIRMED,
  L7PrimaryValidationClass.CONFIRMED,
];

export interface L7PrimaryValidationClassDescriptor {
  readonly class: L7PrimaryValidationClass;
  readonly description: string;
  readonly minSupportPosture: 'NONE' | 'WEAK' | 'MODERATE' | 'STRONG';
  readonly maxContradictionPosture: 'NONE' | 'SOFT' | 'MATERIAL' | 'SEVERE' | 'BLOCKING';
  readonly stalenessBehavior: 'REJECT' | 'TOLERATE_WITH_MODIFIER' | 'DEFINING';
  readonly incompletenessBehavior: 'REJECT' | 'TOLERATE_WITH_MODIFIER' | 'DEFINING';
  readonly degradationBehavior: 'REJECT' | 'TOLERATE_WITH_MODIFIER' | 'DEFINING';
  /** Default downstream restriction baseline for this class (advisory). */
  readonly defaultRestrictionBaseline:
    | 'UNRESTRICTED'
    | 'SCORE_ONLY'
    | 'EVIDENCE_ONLY'
    | 'BLOCKED';
  readonly truthSafetyRank: number;
}

export const L7_PRIMARY_VALIDATION_CLASS_DESCRIPTORS: readonly L7PrimaryValidationClassDescriptor[] = [
  {
    class: L7PrimaryValidationClass.CONFIRMED,
    description:
      'Materially supported by required confirmation surfaces; no critical contradiction outstanding; safe to treat as positively supported',
    minSupportPosture: 'STRONG',
    maxContradictionPosture: 'SOFT',
    stalenessBehavior: 'REJECT',
    incompletenessBehavior: 'REJECT',
    degradationBehavior: 'REJECT',
    defaultRestrictionBaseline: 'UNRESTRICTED',
    truthSafetyRank: 6,
  },
  {
    class: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    description:
      'Directionally supported but material weakness remains (limited breadth, soft contradiction, moderate ambiguity, moderate freshness weakness, risk-overhang tension)',
    minSupportPosture: 'MODERATE',
    maxContradictionPosture: 'MATERIAL',
    stalenessBehavior: 'TOLERATE_WITH_MODIFIER',
    incompletenessBehavior: 'TOLERATE_WITH_MODIFIER',
    degradationBehavior: 'TOLERATE_WITH_MODIFIER',
    defaultRestrictionBaseline: 'SCORE_ONLY',
    truthSafetyRank: 5,
  },
  {
    class: L7PrimaryValidationClass.CONFLICTING,
    description:
      'Material support and material contradiction coexist, or one or more contradiction families materially weaken/block clean confirmation',
    minSupportPosture: 'WEAK',
    maxContradictionPosture: 'BLOCKING',
    stalenessBehavior: 'TOLERATE_WITH_MODIFIER',
    incompletenessBehavior: 'TOLERATE_WITH_MODIFIER',
    degradationBehavior: 'TOLERATE_WITH_MODIFIER',
    defaultRestrictionBaseline: 'EVIDENCE_ONLY',
    truthSafetyRank: 4,
  },
  {
    class: L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
    description:
      'Not enough governed support to confirm or meaningfully reject. This is a coverage problem, not a contradiction problem',
    minSupportPosture: 'NONE',
    maxContradictionPosture: 'MATERIAL',
    stalenessBehavior: 'TOLERATE_WITH_MODIFIER',
    incompletenessBehavior: 'DEFINING',
    degradationBehavior: 'TOLERATE_WITH_MODIFIER',
    defaultRestrictionBaseline: 'EVIDENCE_ONLY',
    truthSafetyRank: 3,
  },
  {
    class: L7PrimaryValidationClass.STALE,
    description:
      'Support/challenge posture too old relative to subject policy; present-time validation result unsafe as current truth',
    minSupportPosture: 'WEAK',
    maxContradictionPosture: 'MATERIAL',
    stalenessBehavior: 'DEFINING',
    incompletenessBehavior: 'TOLERATE_WITH_MODIFIER',
    degradationBehavior: 'TOLERATE_WITH_MODIFIER',
    defaultRestrictionBaseline: 'EVIDENCE_ONLY',
    truthSafetyRank: 2,
  },
  {
    class: L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
    description:
      'Claim attempted legally but a material governed source/support surface is missing or impaired; result must carry degraded status explicitly',
    minSupportPosture: 'NONE',
    maxContradictionPosture: 'MATERIAL',
    stalenessBehavior: 'TOLERATE_WITH_MODIFIER',
    incompletenessBehavior: 'TOLERATE_WITH_MODIFIER',
    degradationBehavior: 'DEFINING',
    defaultRestrictionBaseline: 'EVIDENCE_ONLY',
    truthSafetyRank: 1,
  },
];

/**
 * §7.5.2 — L7.5 primary class → L7.2 runtime `L7ValidationClass` mapping.
 * L7.5 deliberately DOES NOT promote `AMBIGUOUS` to a primary class: in
 * 7.5 semantics, ambiguity is strictly a modifier on top of a truth-safe
 * primary class (typically WEAKLY_CONFIRMED or INSUFFICIENT_EVIDENCE).
 */
export const L7_PRIMARY_CLASS_TO_RUNTIME_CLASS: Record<
  L7PrimaryValidationClass,
  L7ValidationClass
> = {
  [L7PrimaryValidationClass.CONFIRMED]: L7ValidationClass.CONFIRMED,
  [L7PrimaryValidationClass.WEAKLY_CONFIRMED]: L7ValidationClass.WEAKLY_CONFIRMED,
  [L7PrimaryValidationClass.CONFLICTING]: L7ValidationClass.CONFLICTING,
  [L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE]: L7ValidationClass.INSUFFICIENT,
  [L7PrimaryValidationClass.STALE]: L7ValidationClass.STALE,
  [L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE]: L7ValidationClass.DEGRADED,
};

/**
 * Reverse mapping for consumers that start from the runtime enum. Note:
 * L7ValidationClass.AMBIGUOUS has no 7.5 primary-class peer on purpose.
 */
export const L7_RUNTIME_CLASS_TO_PRIMARY_CLASS: Partial<
  Record<L7ValidationClass, L7PrimaryValidationClass>
> = {
  [L7ValidationClass.CONFIRMED]: L7PrimaryValidationClass.CONFIRMED,
  [L7ValidationClass.WEAKLY_CONFIRMED]: L7PrimaryValidationClass.WEAKLY_CONFIRMED,
  [L7ValidationClass.CONFLICTING]: L7PrimaryValidationClass.CONFLICTING,
  [L7ValidationClass.INSUFFICIENT]: L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
  [L7ValidationClass.STALE]: L7PrimaryValidationClass.STALE,
  [L7ValidationClass.DEGRADED]: L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
};

export function getL7PrimaryClassDescriptor(
  cls: L7PrimaryValidationClass,
): L7PrimaryValidationClassDescriptor | undefined {
  return L7_PRIMARY_VALIDATION_CLASS_DESCRIPTORS.find(d => d.class === cls);
}

export function isL7PrimaryValidationClass(cls: string): cls is L7PrimaryValidationClass {
  return (ALL_L7_PRIMARY_VALIDATION_CLASSES as readonly string[]).includes(cls);
}

/**
 * §7.5.2.4 — Resolve a primary class given a set of eligible candidate
 * classes. The winner is whichever candidate appears earliest in the
 * truth-safety precedence list.
 *
 * Returns `undefined` if no candidates supplied.
 */
export function resolvePrimaryClassByPrecedence(
  candidates: readonly L7PrimaryValidationClass[],
): L7PrimaryValidationClass | undefined {
  if (candidates.length === 0) return undefined;
  const set = new Set(candidates);
  for (const cls of L7_PRIMARY_CLASS_PRECEDENCE) {
    if (set.has(cls)) return cls;
  }
  return undefined;
}

/**
 * Strict comparator: `a` is TRUTH-SAFER than `b` if it appears earlier in
 * the precedence list. Returns negative if `a` wins, positive if `b`
 * wins, 0 if equal.
 */
export function compareTruthSafety(
  a: L7PrimaryValidationClass,
  b: L7PrimaryValidationClass,
): number {
  return (
    L7_PRIMARY_CLASS_PRECEDENCE.indexOf(a) - L7_PRIMARY_CLASS_PRECEDENCE.indexOf(b)
  );
}
