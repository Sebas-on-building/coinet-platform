/**
 * L7.7 — Contradiction Read Services
 *
 * §7.7.6.1 — Current contradiction bundle per scope + historical
 * contradiction window per scope, both gated by the read-surface
 * validator.
 */

import {
  L7CurrentContradictionRow,
  L7HistoricalContradictionFact,
} from '../contracts/l7-current-authority';
import { L7ReadRequest, L7ReadSurfaceId } from '../contracts/l7-read-surface';
import { L7ReadSurfaceValidator } from './l7-read-surface.validator';
import { L7ReadOutcome } from './current-validation-read.service';

export interface L7CurrentContradictionReadSurface {
  getCurrentContradiction(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentContradictionRow | null>>;
}

export interface L7HistoricalContradictionReadSurface {
  getContradictionHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalContradictionFact[]>>;
}

export class L7InMemoryCurrentContradictionReadService
  implements L7CurrentContradictionReadSurface
{
  private readonly store = new Map<string, L7CurrentContradictionRow>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  upsert(row: L7CurrentContradictionRow): void {
    this.store.set(keyOf(row.validation_subject_id, row.scope_type, row.scope_id), row);
  }

  async getCurrentContradiction(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentContradictionRow | null>> {
    if (req.surface_id !== L7ReadSurfaceId.CURRENT_CONTRADICTION_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.CURRENT_CONTRADICTION_BY_SCOPE,
        }).violations,
      };
    }
    const r = this.validator.validate(req);
    if (!r.ok) return { ok: false, violations: r.violations };
    return { ok: true, value: this.store.get(keyOf(req.subject_id!, req.scope_type!, req.scope_id!)) ?? null };
  }
}

export class L7InMemoryHistoricalContradictionReadService
  implements L7HistoricalContradictionReadSurface
{
  private readonly history = new Map<string, L7HistoricalContradictionFact[]>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  append(row: L7HistoricalContradictionFact): void {
    const k = keyOf(row.validation_subject_id, row.scope_type, row.scope_id);
    const arr = this.history.get(k) ?? [];
    arr.push(row);
    this.history.set(k, arr);
  }

  async getContradictionHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalContradictionFact[]>> {
    if (req.surface_id !== L7ReadSurfaceId.CONTRADICTION_HISTORY_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.CONTRADICTION_HISTORY_BY_SCOPE,
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
