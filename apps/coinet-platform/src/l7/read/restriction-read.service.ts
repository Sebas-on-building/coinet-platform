/**
 * L7.7 — Restriction Read Services (governed)
 *
 * §7.7.6.1 — Current restriction profile + historical restriction window,
 * both gated by the L7.7 read-surface validator.
 */

import {
  L7CurrentRestrictionRow,
  L7HistoricalRestrictionFact,
} from '../contracts/l7-current-authority';
import { L7ReadRequest, L7ReadSurfaceId } from '../contracts/l7-read-surface';
import { L7ReadSurfaceValidator } from './l7-read-surface.validator';
import { L7ReadOutcome } from './current-validation-read.service';

export interface L7GovernedCurrentRestrictionReadSurface {
  getCurrentRestriction(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentRestrictionRow | null>>;
}

export interface L7GovernedHistoricalRestrictionReadSurface {
  getRestrictionHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalRestrictionFact[]>>;
}

export class L7InMemoryGovernedCurrentRestrictionReadService
  implements L7GovernedCurrentRestrictionReadSurface
{
  private readonly store = new Map<string, L7CurrentRestrictionRow>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  upsert(row: L7CurrentRestrictionRow): void {
    this.store.set(keyOf(row.validation_subject_id, row.scope_type, row.scope_id), row);
  }

  async getCurrentRestriction(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentRestrictionRow | null>> {
    if (req.surface_id !== L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.CURRENT_RESTRICTION_BY_SCOPE,
        }).violations,
      };
    }
    const r = this.validator.validate(req);
    if (!r.ok) return { ok: false, violations: r.violations };
    return { ok: true, value: this.store.get(keyOf(req.subject_id!, req.scope_type!, req.scope_id!)) ?? null };
  }
}

export class L7InMemoryGovernedHistoricalRestrictionReadService
  implements L7GovernedHistoricalRestrictionReadSurface
{
  private readonly history = new Map<string, L7HistoricalRestrictionFact[]>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  append(row: L7HistoricalRestrictionFact): void {
    const k = keyOf(row.validation_subject_id, row.scope_type, row.scope_id);
    const arr = this.history.get(k) ?? [];
    arr.push(row);
    this.history.set(k, arr);
  }

  async getRestrictionHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalRestrictionFact[]>> {
    if (req.surface_id !== L7ReadSurfaceId.RESTRICTION_HISTORY_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.RESTRICTION_HISTORY_BY_SCOPE,
        }).violations,
      };
    }
    const r = this.validator.validate(req);
    if (!r.ok) return { ok: false, violations: r.violations };
    const arr = this.history.get(keyOf(req.subject_id!, req.scope_type!, req.scope_id!)) ?? [];
    const from = req.window_from_iso ? Date.parse(req.window_from_iso) : -Infinity;
    const to = req.window_to_iso ? Date.parse(req.window_to_iso) : Infinity;
    return {
      ok: true,
      value: arr.filter(a => {
        const t = Date.parse(a.as_of);
        return t >= from && t <= to;
      }),
    };
  }
}

function keyOf(subjectId: string, scopeType: string, scopeId: string): string {
  return `${scopeType}|${scopeId}|${subjectId}`;
}
