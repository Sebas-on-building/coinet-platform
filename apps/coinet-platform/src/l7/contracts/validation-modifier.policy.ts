/**
 * L7.5 — Validation Modifier Policy
 *
 * §7.5.3 — Modifiers refine the primary class. They must remain
 * SEPARATE from the primary class and may never replace it, become
 * hidden primary classes, or contradict the class they modify.
 *
 * 7.5 modifiers are disjoint (in value space) from L7.2's runtime
 * `L7ValidationModifier` enum. The registry provides a mapping so
 * L7.4 materialization can emit the corresponding runtime modifier.
 */

import { L7ValidationModifier } from './validation-output-class';
import { L7PrimaryValidationClass } from './validation-class.policy';

export enum L7ValidationModifierCode {
  AMBIGUOUS = 'AMBIGUOUS',
  INCOMPLETE = 'INCOMPLETE',
  STALE_SUPPORT = 'STALE_SUPPORT',
  MISSING_CONFIRMATION_SURFACE = 'MISSING_CONFIRMATION_SURFACE',
  REGIME_MISMATCH = 'REGIME_MISMATCH',
  LOW_SAMPLE_QUALITY = 'LOW_SAMPLE_QUALITY',
  CHALLENGED_BY_RISK_OVERHANG = 'CHALLENGED_BY_RISK_OVERHANG',
}

export const ALL_L7_VALIDATION_MODIFIERS: readonly L7ValidationModifierCode[] =
  Object.values(L7ValidationModifierCode);

export type L7ConfidenceEffect = 'NONE' | 'SOFT_CAP' | 'HARD_CAP' | 'MATERIAL_CAP';
export type L7RestrictionEffect =
  | 'NONE'
  | 'TIGHTEN'
  | 'ESCALATE_TO_EVIDENCE_ONLY'
  | 'ESCALATE_TO_BLOCKED';
export type L7ExplanationVisibility = 'OPTIONAL' | 'RECOMMENDED' | 'REQUIRED';

export interface L7ValidationModifierDescriptor {
  readonly modifier: L7ValidationModifierCode;
  readonly description: string;
  readonly legalPrimaryClasses: readonly L7PrimaryValidationClass[];
  readonly illegalPrimaryClasses: readonly L7PrimaryValidationClass[];
  readonly confidenceEffect: L7ConfidenceEffect;
  readonly restrictionEffect: L7RestrictionEffect;
  readonly explanationVisibility: L7ExplanationVisibility;
}

export const L7_VALIDATION_MODIFIER_DESCRIPTORS: readonly L7ValidationModifierDescriptor[] = [
  {
    modifier: L7ValidationModifierCode.AMBIGUOUS,
    description: 'Materially more than one plausible interpretation remains',
    legalPrimaryClasses: [
      L7PrimaryValidationClass.CONFLICTING,
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
      L7PrimaryValidationClass.CONFIRMED,
    ],
    illegalPrimaryClasses: [],
    confidenceEffect: 'MATERIAL_CAP',
    restrictionEffect: 'TIGHTEN',
    explanationVisibility: 'REQUIRED',
  },
  {
    modifier: L7ValidationModifierCode.INCOMPLETE,
    description: 'Required support or required challenge coverage is not fully present',
    legalPrimaryClasses: [
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
      L7PrimaryValidationClass.CONFLICTING,
      L7PrimaryValidationClass.STALE,
      L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
    ],
    illegalPrimaryClasses: [L7PrimaryValidationClass.CONFIRMED],
    confidenceEffect: 'HARD_CAP',
    restrictionEffect: 'TIGHTEN',
    explanationVisibility: 'REQUIRED',
  },
  {
    modifier: L7ValidationModifierCode.STALE_SUPPORT,
    description: 'Support exists, but material pieces are temporally weak',
    legalPrimaryClasses: [
      L7PrimaryValidationClass.STALE,
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      L7PrimaryValidationClass.CONFLICTING,
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
      L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
    ],
    illegalPrimaryClasses: [L7PrimaryValidationClass.CONFIRMED],
    confidenceEffect: 'HARD_CAP',
    restrictionEffect: 'TIGHTEN',
    explanationVisibility: 'REQUIRED',
  },
  {
    modifier: L7ValidationModifierCode.MISSING_CONFIRMATION_SURFACE,
    description: 'A required confirmation surface is absent or legally unavailable',
    legalPrimaryClasses: [
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
      L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
      L7PrimaryValidationClass.CONFLICTING,
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
    ],
    illegalPrimaryClasses: [L7PrimaryValidationClass.CONFIRMED],
    confidenceEffect: 'MATERIAL_CAP',
    restrictionEffect: 'ESCALATE_TO_EVIDENCE_ONLY',
    explanationVisibility: 'REQUIRED',
  },
  {
    modifier: L7ValidationModifierCode.REGIME_MISMATCH,
    description:
      'Observed support exists, but the claim sits inside a regime posture that weakens transferability or confidence',
    legalPrimaryClasses: [
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      L7PrimaryValidationClass.CONFLICTING,
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
      L7PrimaryValidationClass.CONFIRMED,
    ],
    illegalPrimaryClasses: [],
    confidenceEffect: 'SOFT_CAP',
    restrictionEffect: 'TIGHTEN',
    explanationVisibility: 'RECOMMENDED',
  },
  {
    modifier: L7ValidationModifierCode.LOW_SAMPLE_QUALITY,
    description: 'Support exists, but sample depth, breadth, or quality is materially weak',
    legalPrimaryClasses: [
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      L7PrimaryValidationClass.CONFLICTING,
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
      L7PrimaryValidationClass.DEGRADED_DUE_TO_MISSING_SOURCE,
    ],
    illegalPrimaryClasses: [L7PrimaryValidationClass.CONFIRMED],
    confidenceEffect: 'HARD_CAP',
    restrictionEffect: 'TIGHTEN',
    explanationVisibility: 'REQUIRED',
  },
  {
    modifier: L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG,
    description: 'A separate overhang factor materially weakens otherwise positive support',
    legalPrimaryClasses: [
      L7PrimaryValidationClass.WEAKLY_CONFIRMED,
      L7PrimaryValidationClass.CONFLICTING,
      L7PrimaryValidationClass.CONFIRMED,
      L7PrimaryValidationClass.INSUFFICIENT_EVIDENCE,
    ],
    illegalPrimaryClasses: [],
    confidenceEffect: 'HARD_CAP',
    restrictionEffect: 'TIGHTEN',
    explanationVisibility: 'REQUIRED',
  },
];

/**
 * §7.5.3.5 — Class-modifier consistency matrix. The map encodes
 * compatibility that the simple legalPrimaryClasses gate does not
 * capture, e.g. soft gating of `CONFIRMED + AMBIGUOUS`.
 */
export type L7ClassModifierCompatibility = 'ALLOWED' | 'TIGHTLY_GATED' | 'ILLEGAL';

export function classifyClassModifierPair(
  primary: L7PrimaryValidationClass,
  modifier: L7ValidationModifierCode,
): L7ClassModifierCompatibility {
  if (
    primary === L7PrimaryValidationClass.CONFIRMED &&
    modifier === L7ValidationModifierCode.MISSING_CONFIRMATION_SURFACE
  ) {
    return 'ILLEGAL';
  }
  if (
    primary === L7PrimaryValidationClass.CONFIRMED &&
    modifier === L7ValidationModifierCode.INCOMPLETE
  ) {
    return 'ILLEGAL';
  }
  if (
    primary === L7PrimaryValidationClass.CONFIRMED &&
    modifier === L7ValidationModifierCode.STALE_SUPPORT
  ) {
    return 'ILLEGAL';
  }
  if (
    primary === L7PrimaryValidationClass.CONFIRMED &&
    modifier === L7ValidationModifierCode.LOW_SAMPLE_QUALITY
  ) {
    return 'ILLEGAL';
  }
  if (
    primary === L7PrimaryValidationClass.CONFIRMED &&
    modifier === L7ValidationModifierCode.AMBIGUOUS
  ) {
    return 'TIGHTLY_GATED';
  }
  if (
    primary === L7PrimaryValidationClass.CONFIRMED &&
    modifier === L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG
  ) {
    return 'TIGHTLY_GATED';
  }
  const d = L7_VALIDATION_MODIFIER_DESCRIPTORS.find(m => m.modifier === modifier);
  if (!d) return 'ILLEGAL';
  if (d.illegalPrimaryClasses.includes(primary)) return 'ILLEGAL';
  if (!d.legalPrimaryClasses.includes(primary)) return 'ILLEGAL';
  return 'ALLOWED';
}

/**
 * §7.5.3 — Mapping of 7.5 modifier codes onto L7.2 runtime modifiers.
 * `MISSING_CONFIRMATION_SURFACE` has no direct runtime peer and is
 * emitted as `INCOMPLETE_SUPPORT_PRESENT`. `LOW_SAMPLE_QUALITY` emits
 * `DEGRADED_SOURCE_PRESENT`. `CHALLENGED_BY_RISK_OVERHANG` emits
 * `UNRESOLVED_CONTRADICTION_PRESENT`.
 */
export const L7_MODIFIER_TO_RUNTIME_MODIFIER: Record<
  L7ValidationModifierCode,
  L7ValidationModifier
> = {
  [L7ValidationModifierCode.AMBIGUOUS]: L7ValidationModifier.AMBIGUOUS_DIRECTION_PRESENT,
  [L7ValidationModifierCode.INCOMPLETE]: L7ValidationModifier.INCOMPLETE_SUPPORT_PRESENT,
  [L7ValidationModifierCode.STALE_SUPPORT]: L7ValidationModifier.STALE_SUPPORT_PRESENT,
  [L7ValidationModifierCode.MISSING_CONFIRMATION_SURFACE]:
    L7ValidationModifier.INCOMPLETE_SUPPORT_PRESENT,
  [L7ValidationModifierCode.REGIME_MISMATCH]: L7ValidationModifier.PARTIAL_REGIME_COMPATIBILITY,
  [L7ValidationModifierCode.LOW_SAMPLE_QUALITY]: L7ValidationModifier.DEGRADED_SOURCE_PRESENT,
  [L7ValidationModifierCode.CHALLENGED_BY_RISK_OVERHANG]:
    L7ValidationModifier.UNRESOLVED_CONTRADICTION_PRESENT,
};

export function getL7ValidationModifierDescriptor(
  modifier: L7ValidationModifierCode,
): L7ValidationModifierDescriptor | undefined {
  return L7_VALIDATION_MODIFIER_DESCRIPTORS.find(m => m.modifier === modifier);
}

export function isL7ValidationModifierCode(
  code: string,
): code is L7ValidationModifierCode {
  return (ALL_L7_VALIDATION_MODIFIERS as readonly string[]).includes(code);
}
