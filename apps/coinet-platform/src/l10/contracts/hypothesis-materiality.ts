/**
 * L10.2 — Materiality Classes
 *
 * §10.2.6.3 — Materiality of a hypothesis subject decides how strict
 * completeness, spread, and shift-condition reporting must be. L10.2
 * freezes the taxonomy so later sublayers can gate behaviour.
 */

export enum L10MaterialityClass {
  ROUTINE = 'ROUTINE',
  ELEVATED = 'ELEVATED',
  MATERIAL = 'MATERIAL',
  CRITICAL = 'CRITICAL',
}

export const ALL_L10_MATERIALITY_CLASSES: readonly L10MaterialityClass[] =
  Object.values(L10MaterialityClass);

export interface L10MaterialityDescriptor {
  readonly materiality: L10MaterialityClass;
  readonly description: string;
  readonly requiresSpreadProfile: boolean;
  readonly requiresShiftConditionSet: boolean;
  readonly requiresRestrictionProfile: boolean;
  readonly requiresSecondaryCandidate: boolean;
}

export const L10_MATERIALITY_DESCRIPTORS: readonly L10MaterialityDescriptor[] = [
  {
    materiality: L10MaterialityClass.ROUTINE,
    description: 'Routine explanatory work; baseline reporting expected.',
    requiresSpreadProfile: true,
    requiresShiftConditionSet: false,
    requiresRestrictionProfile: true,
    requiresSecondaryCandidate: false,
  },
  {
    materiality: L10MaterialityClass.ELEVATED,
    description: 'Elevated explanatory stakes; spread and restriction required.',
    requiresSpreadProfile: true,
    requiresShiftConditionSet: true,
    requiresRestrictionProfile: true,
    requiresSecondaryCandidate: true,
  },
  {
    materiality: L10MaterialityClass.MATERIAL,
    description: 'Material explanatory stakes; full competition posture required.',
    requiresSpreadProfile: true,
    requiresShiftConditionSet: true,
    requiresRestrictionProfile: true,
    requiresSecondaryCandidate: true,
  },
  {
    materiality: L10MaterialityClass.CRITICAL,
    description: 'Critical explanatory stakes; full posture + stricter reliance.',
    requiresSpreadProfile: true,
    requiresShiftConditionSet: true,
    requiresRestrictionProfile: true,
    requiresSecondaryCandidate: true,
  },
];

export function getL10MaterialityDescriptor(
  m: L10MaterialityClass,
): L10MaterialityDescriptor | undefined {
  return L10_MATERIALITY_DESCRIPTORS.find(d => d.materiality === m);
}

export function isL10RegisteredMateriality(value: string): boolean {
  return L10_MATERIALITY_DESCRIPTORS.some(d => d.materiality === value);
}
