/**
 * L7.6 — Claim Restriction Policy
 *
 * §7.6.5 — Translates a (primary class, modifiers, contradiction
 * posture, confidence band) tuple into a downstream-rights object.
 * Restriction rights are POLICY-level vocabulary; they map onto L7.2's
 * runtime `L7RestrictionRight` enum for wire/contract emission.
 *
 * The 7.6 vocabulary uses the eight canonical right classes defined in
 * §7.6.5.4 — including the policy-only `BLOCKED_FROM_SCORE_DRIVING`
 * class which translates to "no scoring/judgment but optionally
 * regime-input or evidence-only" at the runtime layer.
 */

import {
  L7RestrictionRight,
  L7RestrictionReasonCode,
} from './claim-restriction-profile';
import { L7PrimaryValidationClass } from './validation-class.policy';
import { L7ValidationModifierCode } from './validation-modifier.policy';
import { L7ContradictionSeverity } from './contradiction-bundle';
import { L7ReliabilityBand } from './confidence-band';

export enum L7ReliabilityRight {
  REGIME_INPUT_ONLY = 'REGIME_INPUT_ONLY',
  SCENARIO_WEIGHTING_ALLOWED = 'SCENARIO_WEIGHTING_ALLOWED',
  DETERMINISTIC_SCORING_ALLOWED = 'DETERMINISTIC_SCORING_ALLOWED',
  FINAL_JUDGMENT_ALLOWED = 'FINAL_JUDGMENT_ALLOWED',
  REQUIRES_CONTRADICTION_DISCLOSURE = 'REQUIRES_CONTRADICTION_DISCLOSURE',
  REQUIRES_ADDITIONAL_CONFIRMATION = 'REQUIRES_ADDITIONAL_CONFIRMATION',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  BLOCKED_FROM_SCORE_DRIVING = 'BLOCKED_FROM_SCORE_DRIVING',
}

export const ALL_L7_RELIABILITY_RIGHTS: readonly L7ReliabilityRight[] =
  Object.values(L7ReliabilityRight);

export interface L7ReliabilityRightDescriptor {
  readonly right: L7ReliabilityRight;
  readonly description: string;
  /** True when this right grants positive downstream use. */
  readonly grantsPositiveUse: boolean;
  /** Other rights that this right cannot legally coexist with. */
  readonly conflictsWith: readonly L7ReliabilityRight[];
  /** Reason codes acceptable for emitting this right. */
  readonly allowedReasonCodes: readonly L7RestrictionReasonCode[];
  /** Minimum reliability band required to emit this right. */
  readonly requiresMinBand: L7ReliabilityBand;
}

const ALL_REASONS: readonly L7RestrictionReasonCode[] = [
  L7RestrictionReasonCode.CONFIRMED_NO_RISK,
  L7RestrictionReasonCode.WEAK_SUPPORT,
  L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION,
  L7RestrictionReasonCode.STALE_SUPPORT,
  L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT,
  L7RestrictionReasonCode.AMBIGUOUS_DIRECTION,
  L7RestrictionReasonCode.DEGRADED_SOURCE,
  L7RestrictionReasonCode.MATERIAL_RISK_OVERHANG,
  L7RestrictionReasonCode.REGIME_INCOMPATIBILITY,
  L7RestrictionReasonCode.EVIDENCE_ONLY_REQUIRED,
];

export const L7_RELIABILITY_RIGHT_DESCRIPTORS: readonly L7ReliabilityRightDescriptor[] = [
  {
    right: L7ReliabilityRight.REGIME_INPUT_ONLY,
    description: 'Usable as input for the regime engine; not score-driving',
    grantsPositiveUse: true,
    conflictsWith: [
      L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED,
      L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED,
    ],
    allowedReasonCodes: ALL_REASONS,
    requiresMinBand: L7ReliabilityBand.LOW,
  },
  {
    right: L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED,
    description: 'Usable for scenario weighting',
    grantsPositiveUse: true,
    conflictsWith: [L7ReliabilityRight.BLOCKED_FROM_SCORE_DRIVING, L7ReliabilityRight.EVIDENCE_ONLY],
    allowedReasonCodes: ALL_REASONS,
    requiresMinBand: L7ReliabilityBand.LOW,
  },
  {
    right: L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED,
    description: 'Usable as deterministic scoring input',
    grantsPositiveUse: true,
    conflictsWith: [
      L7ReliabilityRight.BLOCKED_FROM_SCORE_DRIVING,
      L7ReliabilityRight.EVIDENCE_ONLY,
      L7ReliabilityRight.REGIME_INPUT_ONLY,
    ],
    allowedReasonCodes: ALL_REASONS,
    requiresMinBand: L7ReliabilityBand.MEDIUM,
  },
  {
    right: L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED,
    description: 'Usable as input to final judgment synthesis',
    grantsPositiveUse: true,
    conflictsWith: [
      L7ReliabilityRight.BLOCKED_FROM_SCORE_DRIVING,
      L7ReliabilityRight.EVIDENCE_ONLY,
      L7ReliabilityRight.REGIME_INPUT_ONLY,
      L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION,
    ],
    allowedReasonCodes: ALL_REASONS,
    requiresMinBand: L7ReliabilityBand.HIGH,
  },
  {
    right: L7ReliabilityRight.REQUIRES_CONTRADICTION_DISCLOSURE,
    description: 'Disclosure of the contradiction bundle is required at consumption',
    grantsPositiveUse: false,
    conflictsWith: [],
    allowedReasonCodes: [
      L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION,
      L7RestrictionReasonCode.MATERIAL_RISK_OVERHANG,
      L7RestrictionReasonCode.AMBIGUOUS_DIRECTION,
      L7RestrictionReasonCode.REGIME_INCOMPATIBILITY,
    ],
    requiresMinBand: L7ReliabilityBand.UNRESOLVED,
  },
  {
    right: L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION,
    description: 'Additional confirmation required before downstream use',
    grantsPositiveUse: false,
    conflictsWith: [L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED],
    allowedReasonCodes: [
      L7RestrictionReasonCode.WEAK_SUPPORT,
      L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT,
      L7RestrictionReasonCode.STALE_SUPPORT,
      L7RestrictionReasonCode.DEGRADED_SOURCE,
    ],
    requiresMinBand: L7ReliabilityBand.UNRESOLVED,
  },
  {
    right: L7ReliabilityRight.EVIDENCE_ONLY,
    description: 'Usable only as evidence; never as deterministic scoring or final judgment input',
    grantsPositiveUse: false,
    conflictsWith: [
      L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED,
      L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED,
      L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED,
    ],
    allowedReasonCodes: ALL_REASONS,
    requiresMinBand: L7ReliabilityBand.UNRESOLVED,
  },
  {
    right: L7ReliabilityRight.BLOCKED_FROM_SCORE_DRIVING,
    description: 'Forbidden from any score-driving downstream use',
    grantsPositiveUse: false,
    conflictsWith: [
      L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED,
      L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED,
      L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED,
    ],
    allowedReasonCodes: [
      L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION,
      L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT,
      L7RestrictionReasonCode.STALE_SUPPORT,
      L7RestrictionReasonCode.DEGRADED_SOURCE,
      L7RestrictionReasonCode.MATERIAL_RISK_OVERHANG,
    ],
    requiresMinBand: L7ReliabilityBand.UNRESOLVED,
  },
];

/**
 * §7.6 — L7.6 reliability right ↔ L7.2 runtime restriction right.
 * `BLOCKED_FROM_SCORE_DRIVING` has no L7.2 peer with identical
 * semantics; it maps to `NOT_USABLE` plus, when relevant, additional
 * positive rights at the policy level (regime input, evidence only).
 */
export const L7_RELIABILITY_RIGHT_TO_RUNTIME_RIGHT: Record<
  L7ReliabilityRight,
  L7RestrictionRight
> = {
  [L7ReliabilityRight.REGIME_INPUT_ONLY]: L7RestrictionRight.USABLE_FOR_REGIME_INPUT,
  [L7ReliabilityRight.SCENARIO_WEIGHTING_ALLOWED]:
    L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING,
  [L7ReliabilityRight.DETERMINISTIC_SCORING_ALLOWED]:
    L7RestrictionRight.USABLE_FOR_DETERMINISTIC_SCORING,
  [L7ReliabilityRight.FINAL_JUDGMENT_ALLOWED]: L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT,
  [L7ReliabilityRight.REQUIRES_CONTRADICTION_DISCLOSURE]:
    L7RestrictionRight.USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY,
  [L7ReliabilityRight.REQUIRES_ADDITIONAL_CONFIRMATION]:
    L7RestrictionRight.REQUIRES_ADDITIONAL_CONFIRMATION,
  [L7ReliabilityRight.EVIDENCE_ONLY]: L7RestrictionRight.EVIDENCE_ONLY,
  [L7ReliabilityRight.BLOCKED_FROM_SCORE_DRIVING]: L7RestrictionRight.NOT_USABLE,
};

/** Inputs to the L7.6 restriction-derivation engine. */
export interface L7ReliabilityRightDerivationInput {
  readonly subject_id: string;
  readonly primary_class: L7PrimaryValidationClass;
  readonly modifiers: readonly L7ValidationModifierCode[];
  readonly contradiction_severity: L7ContradictionSeverity;
  readonly contradiction_count: number;
  readonly unresolved_overhang: boolean;
  readonly reliability_band: L7ReliabilityBand;
  readonly score_100: number;
  readonly staleness_material: boolean;
  readonly incompleteness_material: boolean;
  readonly ambiguity_material: boolean;
  readonly degradation_material: boolean;
  /** Materiality class hint, used to tighten posture when set to HIGH. */
  readonly materiality_class: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}

/** Output of the L7.6 restriction-derivation engine. */
export interface L7ReliabilityRightDerivationResult {
  readonly subject_id: string;
  readonly rights: readonly L7ReliabilityRight[];
  readonly reasons: readonly L7RestrictionReasonCode[];
  readonly requires_contradiction_disclosure: boolean;
  readonly requires_additional_confirmation: boolean;
  readonly evidence_only_mode: boolean;
  readonly blocked_from_score_driving: boolean;
}

export function isL7ReliabilityRight(raw: string): raw is L7ReliabilityRight {
  return (ALL_L7_RELIABILITY_RIGHTS as readonly string[]).includes(raw);
}

export function getL7ReliabilityRightDescriptor(
  right: L7ReliabilityRight,
): L7ReliabilityRightDescriptor | undefined {
  return L7_RELIABILITY_RIGHT_DESCRIPTORS.find(d => d.right === right);
}
