/**
 * L10.2 — HypothesisRestrictionRight Registry
 *
 * §10.2.17 — Canonical restriction-right registry. Responsible for
 * recognizing legal reliance bands, allowed downstream uses, and
 * mandatory blocked uses on every emitted restriction profile.
 */

import {
  L10RestrictionRight,
  ALL_L10_RESTRICTION_RIGHTS,
  L10BlockedUse,
  ALL_L10_BLOCKED_USES,
  L10RelianceBand,
  ALL_L10_RELIANCE_BANDS,
  L10_MANDATORY_BLOCKED_USES,
} from '../contracts/hypothesis-restriction-profile';

export class L10HypothesisRestrictionRightRegistry {
  private readonly rights = new Set<L10RestrictionRight>();
  private readonly blocked = new Set<L10BlockedUse>();
  private readonly bands = new Set<L10RelianceBand>();

  register(
    right: L10RestrictionRight | null,
    blockedUse: L10BlockedUse | null,
    band: L10RelianceBand | null,
  ): void {
    if (right !== null) {
      if (!ALL_L10_RESTRICTION_RIGHTS.includes(right)) {
        throw new Error(`L10.2 restriction registry: unknown right '${right}'`);
      }
      if (this.rights.has(right)) {
        throw new Error(`L10.2 restriction registry: duplicate right '${right}'`);
      }
      this.rights.add(right);
    }
    if (blockedUse !== null) {
      if (!ALL_L10_BLOCKED_USES.includes(blockedUse)) {
        throw new Error(`L10.2 restriction registry: unknown blocked use '${blockedUse}'`);
      }
      if (this.blocked.has(blockedUse)) {
        throw new Error(`L10.2 restriction registry: duplicate blocked use '${blockedUse}'`);
      }
      this.blocked.add(blockedUse);
    }
    if (band !== null) {
      if (!ALL_L10_RELIANCE_BANDS.includes(band)) {
        throw new Error(`L10.2 restriction registry: unknown band '${band}'`);
      }
      if (this.bands.has(band)) {
        throw new Error(`L10.2 restriction registry: duplicate band '${band}'`);
      }
      this.bands.add(band);
    }
  }

  hasRight(r: L10RestrictionRight): boolean { return this.rights.has(r); }
  hasBlockedUse(b: L10BlockedUse): boolean { return this.blocked.has(b); }
  hasBand(b: L10RelianceBand): boolean { return this.bands.has(b); }

  mandatoryBlockedUses(): readonly L10BlockedUse[] {
    return L10_MANDATORY_BLOCKED_USES;
  }

  allRights(): readonly L10RestrictionRight[] { return Array.from(this.rights); }
  allBlockedUses(): readonly L10BlockedUse[] { return Array.from(this.blocked); }
  allBands(): readonly L10RelianceBand[] { return Array.from(this.bands); }
}

let _defaultReg: L10HypothesisRestrictionRightRegistry | null = null;
export function getDefaultL10HypothesisRestrictionRightRegistry():
  L10HypothesisRestrictionRightRegistry {
  if (!_defaultReg) {
    _defaultReg = new L10HypothesisRestrictionRightRegistry();
    for (const r of ALL_L10_RESTRICTION_RIGHTS) _defaultReg.register(r, null, null);
    for (const b of ALL_L10_BLOCKED_USES) _defaultReg.register(null, b, null);
    for (const b of ALL_L10_RELIANCE_BANDS) _defaultReg.register(null, null, b);
  }
  return _defaultReg;
}
