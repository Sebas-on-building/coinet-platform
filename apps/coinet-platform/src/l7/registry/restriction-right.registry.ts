/**
 * L7.2 — Restriction Right Registry
 *
 * §7.2.7.5 — Registered downstream-usage rights. The restriction profile
 * validator rejects any right not present in this registry, which keeps
 * downstream legality typed and queryable.
 */

import {
  L7RestrictionRight,
  L7RestrictionReasonCode,
  ALL_RESTRICTION_RIGHTS,
  ALL_RESTRICTION_REASON_CODES,
} from '../contracts/claim-restriction-profile';

export interface RestrictionRightDescriptor {
  readonly right: L7RestrictionRight;
  readonly description: string;
  readonly grantsPositiveUse: boolean;
  readonly conflictsWith: readonly L7RestrictionRight[];
  readonly allowedReasonCodes: readonly L7RestrictionReasonCode[];
}

export const RESTRICTION_RIGHT_DESCRIPTORS: readonly RestrictionRightDescriptor[] = [
  {
    right: L7RestrictionRight.USABLE_FOR_REGIME_INPUT,
    description: 'Layer may use this claim as input to regime inference',
    grantsPositiveUse: true,
    conflictsWith: [L7RestrictionRight.NOT_USABLE],
    allowedReasonCodes: ALL_RESTRICTION_REASON_CODES,
  },
  {
    right: L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING,
    description: 'Layer may use this claim as input to scenario weighting',
    grantsPositiveUse: true,
    conflictsWith: [L7RestrictionRight.NOT_USABLE, L7RestrictionRight.EVIDENCE_ONLY],
    allowedReasonCodes: ALL_RESTRICTION_REASON_CODES,
  },
  {
    right: L7RestrictionRight.USABLE_FOR_DETERMINISTIC_SCORING,
    description: 'Layer may use this claim as input to deterministic scoring',
    grantsPositiveUse: true,
    conflictsWith: [L7RestrictionRight.NOT_USABLE, L7RestrictionRight.EVIDENCE_ONLY],
    allowedReasonCodes: ALL_RESTRICTION_REASON_CODES,
  },
  {
    right: L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT,
    description: 'Layer may use this claim as input to final judgment synthesis',
    grantsPositiveUse: true,
    conflictsWith: [
      L7RestrictionRight.NOT_USABLE,
      L7RestrictionRight.EVIDENCE_ONLY,
      L7RestrictionRight.REQUIRES_ADDITIONAL_CONFIRMATION,
    ],
    allowedReasonCodes: ALL_RESTRICTION_REASON_CODES,
  },
  {
    right: L7RestrictionRight.USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY,
    description: 'Claim may only be used if contradiction bundle is disclosed alongside',
    grantsPositiveUse: false,
    conflictsWith: [],
    allowedReasonCodes: [
      L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION,
      L7RestrictionReasonCode.AMBIGUOUS_DIRECTION,
      L7RestrictionReasonCode.REGIME_INCOMPATIBILITY,
      L7RestrictionReasonCode.MATERIAL_RISK_OVERHANG,
    ],
  },
  {
    right: L7RestrictionRight.REQUIRES_ADDITIONAL_CONFIRMATION,
    description: 'Claim requires additional confirmation before any downstream use',
    grantsPositiveUse: false,
    conflictsWith: [L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT],
    allowedReasonCodes: [
      L7RestrictionReasonCode.WEAK_SUPPORT,
      L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT,
      L7RestrictionReasonCode.STALE_SUPPORT,
      L7RestrictionReasonCode.DEGRADED_SOURCE,
    ],
  },
  {
    right: L7RestrictionRight.EVIDENCE_ONLY,
    description: 'Claim usable only as evidence; never as direct input to judgment/scoring',
    grantsPositiveUse: false,
    conflictsWith: [
      L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT,
      L7RestrictionRight.USABLE_FOR_DETERMINISTIC_SCORING,
      L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING,
    ],
    allowedReasonCodes: [
      L7RestrictionReasonCode.EVIDENCE_ONLY_REQUIRED,
      L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION,
      L7RestrictionReasonCode.STALE_SUPPORT,
      L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT,
      L7RestrictionReasonCode.AMBIGUOUS_DIRECTION,
      L7RestrictionReasonCode.DEGRADED_SOURCE,
    ],
  },
  {
    right: L7RestrictionRight.NOT_USABLE,
    description: 'Claim is not usable downstream at all',
    grantsPositiveUse: false,
    conflictsWith: ALL_RESTRICTION_RIGHTS.filter(r => r !== L7RestrictionRight.NOT_USABLE),
    allowedReasonCodes: [
      L7RestrictionReasonCode.MISSING_REQUIRED_SUPPORT,
      L7RestrictionReasonCode.UNRESOLVED_CONTRADICTION,
      L7RestrictionReasonCode.DEGRADED_SOURCE,
      L7RestrictionReasonCode.REGIME_INCOMPATIBILITY,
      L7RestrictionReasonCode.MATERIAL_RISK_OVERHANG,
    ],
  },
];

export class RestrictionRightRegistry {
  private readonly byRight: Map<L7RestrictionRight, RestrictionRightDescriptor>;

  constructor(descriptors: readonly RestrictionRightDescriptor[] = RESTRICTION_RIGHT_DESCRIPTORS) {
    this.byRight = new Map(descriptors.map(d => [d.right, d]));
  }

  list(): readonly RestrictionRightDescriptor[] {
    return Array.from(this.byRight.values());
  }

  get(right: L7RestrictionRight): RestrictionRightDescriptor | undefined {
    return this.byRight.get(right);
  }

  isRegistered(right: string): boolean {
    return ALL_RESTRICTION_RIGHTS.includes(right as L7RestrictionRight);
  }

  conflictsWith(right: L7RestrictionRight): readonly L7RestrictionRight[] {
    return this.byRight.get(right)?.conflictsWith ?? [];
  }

  grantsPositiveUse(right: L7RestrictionRight): boolean {
    return this.byRight.get(right)?.grantsPositiveUse ?? false;
  }

  allowedReasonCodesFor(right: L7RestrictionRight): readonly L7RestrictionReasonCode[] {
    return this.byRight.get(right)?.allowedReasonCodes ?? [];
  }
}

const defaultRestrictionRightRegistry = new RestrictionRightRegistry();

export function getDefaultRestrictionRightRegistry(): RestrictionRightRegistry {
  return defaultRestrictionRightRegistry;
}
