/**
 * L7.6 — Current Restriction Read Service
 *
 * §7.6.7.7 — "Current restriction profile by subject/scope" surface.
 * Restriction profiles are the machine-usable downstream-rights
 * objects (§7.6.5.3). Persistence is L5's responsibility (§7.6.7.4).
 */

import { L7ReliabilityRightDerivationResult } from '../contracts/claim-restriction.policy';

export interface L7CurrentRestrictionReadSurface {
  getCurrentRestriction(args: {
    readonly subject_id: string;
    readonly scope_type: string;
    readonly scope_id: string;
  }): Promise<L7ReliabilityRightDerivationResult | null>;
}

export class L7InMemoryCurrentRestrictionReadService
  implements L7CurrentRestrictionReadSurface
{
  private readonly store = new Map<string, L7ReliabilityRightDerivationResult>();

  upsert(
    profile: L7ReliabilityRightDerivationResult,
    scope: { readonly scope_type: string; readonly scope_id: string },
  ): void {
    this.store.set(
      keyOf(profile.subject_id, scope.scope_type, scope.scope_id),
      profile,
    );
  }

  async getCurrentRestriction(args: {
    readonly subject_id: string;
    readonly scope_type: string;
    readonly scope_id: string;
  }): Promise<L7ReliabilityRightDerivationResult | null> {
    return this.store.get(keyOf(args.subject_id, args.scope_type, args.scope_id)) ?? null;
  }
}

function keyOf(subjectId: string, scopeType: string, scopeId: string): string {
  return `${scopeType}|${scopeId}|${subjectId}`;
}
