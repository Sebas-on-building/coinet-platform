/**
 * L7.6 — Reliability Right Registry
 *
 * §7.6.5.4 — Single source of truth for the eight policy-level
 * reliability rights. Disjoint from the L7.2 `RestrictionRightRegistry`
 * (which governs runtime-level rights). The L7.6 registry validates:
 *
 *   - the eight rights are the only legal rights at policy level
 *   - each right has a known minimum reliability band
 *   - cross-right conflicts are catalogued
 *   - allowed reason codes per right are catalogued
 */

import {
  L7ReliabilityRight,
  L7ReliabilityRightDescriptor,
  L7_RELIABILITY_RIGHT_DESCRIPTORS,
  ALL_L7_RELIABILITY_RIGHTS,
  isL7ReliabilityRight,
} from '../contracts/claim-restriction.policy';
import { L7RestrictionReasonCode } from '../contracts/claim-restriction-profile';
import { L7ReliabilityBand } from '../contracts/confidence-band';

export class L7ReliabilityRightRegistry {
  private readonly byRight: Map<L7ReliabilityRight, L7ReliabilityRightDescriptor>;

  constructor(
    descriptors: readonly L7ReliabilityRightDescriptor[] = L7_RELIABILITY_RIGHT_DESCRIPTORS,
  ) {
    this.byRight = new Map(descriptors.map(d => [d.right, d]));
  }

  list(): readonly L7ReliabilityRightDescriptor[] {
    return Array.from(this.byRight.values());
  }

  get(right: L7ReliabilityRight): L7ReliabilityRightDescriptor | undefined {
    return this.byRight.get(right);
  }

  isRegistered(raw: string): boolean {
    return isL7ReliabilityRight(raw) && this.byRight.has(raw);
  }

  conflictsWith(right: L7ReliabilityRight): readonly L7ReliabilityRight[] {
    return this.byRight.get(right)?.conflictsWith ?? [];
  }

  grantsPositiveUse(right: L7ReliabilityRight): boolean {
    return this.byRight.get(right)?.grantsPositiveUse ?? false;
  }

  allowedReasonCodesFor(right: L7ReliabilityRight): readonly L7RestrictionReasonCode[] {
    return this.byRight.get(right)?.allowedReasonCodes ?? [];
  }

  requiresMinBand(right: L7ReliabilityRight): L7ReliabilityBand {
    return this.byRight.get(right)?.requiresMinBand ?? L7ReliabilityBand.UNRESOLVED;
  }

  /** All rights that are conflict-free with each entry of the supplied set. */
  allowedAlongside(
    granted: readonly L7ReliabilityRight[],
  ): readonly L7ReliabilityRight[] {
    const grantedSet = new Set(granted);
    return ALL_L7_RELIABILITY_RIGHTS.filter(r => {
      if (grantedSet.has(r)) return false;
      const conflicts = this.conflictsWith(r);
      for (const g of granted) {
        if (conflicts.includes(g)) return false;
        if (this.conflictsWith(g).includes(r)) return false;
      }
      return true;
    });
  }
}

const defaultReliabilityRightRegistry = new L7ReliabilityRightRegistry();

export function getDefaultReliabilityRightRegistry(): L7ReliabilityRightRegistry {
  return defaultReliabilityRightRegistry;
}
