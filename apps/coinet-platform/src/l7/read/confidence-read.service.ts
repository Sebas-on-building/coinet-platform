/**
 * L7.7 — Confidence Read Services (governed)
 *
 * §7.7.6.1 — Current confidence profile + historical confidence window,
 * both gated by the L7.7 read-surface validator. Supersedes the
 * ungoverned L7.6 in-memory read helpers for callers that must respect
 * consumer/mode legality.
 */

import {
  L7CurrentConfidenceRow,
  L7HistoricalConfidenceFact,
} from '../contracts/l7-current-authority';
import { L7ReadRequest, L7ReadSurfaceId } from '../contracts/l7-read-surface';
import { L7ReadSurfaceValidator } from './l7-read-surface.validator';
import { L7ReadOutcome } from './current-validation-read.service';

export interface L7GovernedCurrentConfidenceReadSurface {
  getCurrentConfidence(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentConfidenceRow | null>>;
}

export interface L7GovernedHistoricalConfidenceReadSurface {
  getConfidenceHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalConfidenceFact[]>>;
}

export class L7InMemoryGovernedCurrentConfidenceReadService
  implements L7GovernedCurrentConfidenceReadSurface
{
  private readonly store = new Map<string, L7CurrentConfidenceRow>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  upsert(row: L7CurrentConfidenceRow): void {
    this.store.set(keyOf(row.validation_subject_id, row.scope_type, row.scope_id), row);
  }

  async getCurrentConfidence(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentConfidenceRow | null>> {
    if (req.surface_id !== L7ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE,
        }).violations,
      };
    }
    const r = this.validator.validate(req);
    if (!r.ok) return { ok: false, violations: r.violations };
    return { ok: true, value: this.store.get(keyOf(req.subject_id!, req.scope_type!, req.scope_id!)) ?? null };
  }
}

export class L7InMemoryGovernedHistoricalConfidenceReadService
  implements L7GovernedHistoricalConfidenceReadSurface
{
  private readonly history = new Map<string, L7HistoricalConfidenceFact[]>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  append(row: L7HistoricalConfidenceFact): void {
    const k = keyOf(row.validation_subject_id, row.scope_type, row.scope_id);
    const arr = this.history.get(k) ?? [];
    arr.push(row);
    this.history.set(k, arr);
  }

  async getConfidenceHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalConfidenceFact[]>> {
    if (req.surface_id !== L7ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE,
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
