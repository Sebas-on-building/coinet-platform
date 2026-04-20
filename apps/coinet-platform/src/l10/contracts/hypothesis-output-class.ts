/**
 * L10.2 — Hypothesis Output Classes
 *
 * §10.2.5 — Frozen first-class L10 output classes. Must align value-for-value
 * with L10.1's `L10OutputSurfaceClass` (§10.1) — checked by INV-10.2-C.
 */

import { L10OutputSurfaceClass } from './l10-constitutional-types';

/**
 * §10.2.5.1 — Five first-class hypothesis outputs. Mirrors
 * L10.1.L10OutputSurfaceClass but re-declared at the object tier so the
 * object model is self-contained.
 */
export enum L10HypothesisOutputClass {
  HYPOTHESIS_ASSESSMENT = 'HYPOTHESIS_ASSESSMENT',
  HYPOTHESIS_RANKING = 'HYPOTHESIS_RANKING',
  HYPOTHESIS_SPREAD_PROFILE = 'HYPOTHESIS_SPREAD_PROFILE',
  SHIFT_CONDITION_SET = 'SHIFT_CONDITION_SET',
  HYPOTHESIS_EVIDENCE_READ_SURFACE = 'HYPOTHESIS_EVIDENCE_READ_SURFACE',
}

export const ALL_L10_HYPOTHESIS_OUTPUT_CLASSES:
  readonly L10HypothesisOutputClass[] = Object.values(L10HypothesisOutputClass);

export interface L10HypothesisOutputClassDescriptor {
  readonly outputClass: L10HypothesisOutputClass;
  readonly description: string;
  readonly requiresEvidence: boolean;
  readonly requiresLineage: boolean;
  readonly requiresReplayHash: boolean;
  readonly requiresRestrictionProfile: boolean;
  readonly requiresRankingRef: boolean;
  readonly requiresSpreadProfile: boolean;
  readonly requiresShiftConditionSet: boolean;
  readonly preservesCompetition: boolean;
}

export const L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS:
  readonly L10HypothesisOutputClassDescriptor[] = [
  {
    outputClass: L10HypothesisOutputClass.HYPOTHESIS_ASSESSMENT,
    description: 'Per-candidate governed explanatory verdict.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: true,
    requiresRankingRef: false,
    requiresSpreadProfile: false,
    requiresShiftConditionSet: false,
    preservesCompetition: true,
  },
  {
    outputClass: L10HypothesisOutputClass.HYPOTHESIS_RANKING,
    description: 'Governed ordering of competing candidates for one subject.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
    requiresRankingRef: false,
    requiresSpreadProfile: true,
    requiresShiftConditionSet: false,
    preservesCompetition: true,
  },
  {
    outputClass: L10HypothesisOutputClass.HYPOTHESIS_SPREAD_PROFILE,
    description: 'Explicit separation / stability between leading candidates.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
    requiresRankingRef: true,
    requiresSpreadProfile: false,
    requiresShiftConditionSet: false,
    preservesCompetition: true,
  },
  {
    outputClass: L10HypothesisOutputClass.SHIFT_CONDITION_SET,
    description: 'Machine-usable conditions describing rank-shift potential.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
    requiresRankingRef: true,
    requiresSpreadProfile: false,
    requiresShiftConditionSet: false,
    preservesCompetition: true,
  },
  {
    outputClass: L10HypothesisOutputClass.HYPOTHESIS_EVIDENCE_READ_SURFACE,
    description: 'Governed evidence-backed read surface of hypothesis state.',
    requiresEvidence: true,
    requiresLineage: true,
    requiresReplayHash: true,
    requiresRestrictionProfile: false,
    requiresRankingRef: false,
    requiresSpreadProfile: false,
    requiresShiftConditionSet: false,
    preservesCompetition: true,
  },
];

export function getL10HypothesisOutputClassDescriptor(
  c: L10HypothesisOutputClass,
): L10HypothesisOutputClassDescriptor | undefined {
  return L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS.find(d => d.outputClass === c);
}

export function isL10RegisteredHypothesisOutputClass(value: string): boolean {
  return L10_HYPOTHESIS_OUTPUT_CLASS_DESCRIPTORS.some(d => d.outputClass === value);
}

/**
 * §10.2 / INV-10.2-C alignment — L10.1 and L10.2 must agree on the
 * output vocabulary value-for-value. Consumers use this to assert that
 * the two tiers never drift.
 */
export function l10ObjectOutputClassesAlignWithConstitution(): boolean {
  const l10_1: readonly string[] = Object.values(L10OutputSurfaceClass);
  const l10_2: readonly string[] = Object.values(L10HypothesisOutputClass);
  return (
    l10_1.length === l10_2.length &&
    l10_1.every(c => l10_2.includes(c)) &&
    l10_2.every(c => l10_1.includes(c))
  );
}
