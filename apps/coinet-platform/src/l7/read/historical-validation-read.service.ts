/**
 * L7.7 — Historical Validation Read Service
 *
 * §7.7.6.6 — Historical validation reads resolve from append-safe
 * historical facts, never from current-state reconstruction guesses.
 */

import { L7HistoricalValidationFact } from '../contracts/l7-current-authority';
import { L7ReadRequest, L7ReadSurfaceId } from '../contracts/l7-read-surface';
import { L7ReadSurfaceValidator } from './l7-read-surface.validator';
import { L7ReadOutcome } from './current-validation-read.service';

export interface L7HistoricalValidationReadSurface {
  getValidationHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalValidationFact[]>>;
}

export class L7InMemoryHistoricalValidationReadService
  implements L7HistoricalValidationReadSurface
{
  private readonly history = new Map<string, L7HistoricalValidationFact[]>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  append(row: L7HistoricalValidationFact): void {
    const k = keyOf(row.validation_subject_id, row.scope_type, row.scope_id);
    const arr = this.history.get(k) ?? [];
    arr.push(row);
    this.history.set(k, arr);
  }

  async getValidationHistory(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<readonly L7HistoricalValidationFact[]>> {
    if (req.surface_id !== L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.VALIDATION_HISTORY_BY_SCOPE,
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
