/**
 * L7.6 — Historical Restriction Read Service
 *
 * §7.6.7.7 — "Restriction history by subject/scope/window" surface.
 * Restriction transitions are append-only so consumers can audit how
 * downstream rights evolved. Persistence is L5's responsibility
 * (§7.6.7.4).
 */

import { L7ReliabilityRightDerivationResult } from '../contracts/claim-restriction.policy';

export interface L7RestrictionHistoryWindow {
  readonly subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly from_iso: string;
  readonly to_iso: string;
}

export interface L7HistoricalRestrictionReadSurface {
  getRestrictionHistory(
    window: L7RestrictionHistoryWindow,
  ): Promise<readonly L7ReliabilityRightDerivationResult[]>;
}

export class L7InMemoryHistoricalRestrictionReadService
  implements L7HistoricalRestrictionReadSurface
{
  private readonly transitions = new Map<string, L7ReliabilityRightDerivationResult[]>();

  append(
    profile: L7ReliabilityRightDerivationResult,
    scope: { readonly scope_type: string; readonly scope_id: string },
  ): void {
    const k = keyOf(profile.subject_id, scope.scope_type, scope.scope_id);
    const arr = this.transitions.get(k) ?? [];
    arr.push(profile);
    this.transitions.set(k, arr);
  }

  async getRestrictionHistory(
    window: L7RestrictionHistoryWindow,
  ): Promise<readonly L7ReliabilityRightDerivationResult[]> {
    const k = keyOf(window.subject_id, window.scope_type, window.scope_id);
    const arr = this.transitions.get(k) ?? [];
    return arr.slice();
  }
}

function keyOf(subjectId: string, scopeType: string, scopeId: string): string {
  return `${scopeType}|${scopeId}|${subjectId}`;
}
