/**
 * L7.7 — Current Validation Read Service
 *
 * §7.7.6.5 — Current validation reads resolve from the authoritative
 * Postgres current-registry row (`L7CurrentValidationRow`), gated by
 * `L7ReadSurfaceValidator`. Production implementations must wire a
 * Postgres-backed store; the in-memory class is for tests + invariants.
 */

import { L7CurrentValidationRow } from '../contracts/l7-current-authority';
import { L7ReadRequest, L7ReadSurfaceId } from '../contracts/l7-read-surface';
import { L7ReadSurfaceValidator } from './l7-read-surface.validator';
import { L7PersistenceViolation } from '../persistence/l7-persistence-violation-codes';

export type L7ReadOutcome<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly violations: readonly L7PersistenceViolation[] };

export interface L7CurrentValidationReadSurface {
  getCurrentValidation(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentValidationRow | null>>;
}

export class L7InMemoryCurrentValidationReadService
  implements L7CurrentValidationReadSurface
{
  private readonly store = new Map<string, L7CurrentValidationRow>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  upsert(row: L7CurrentValidationRow): void {
    this.store.set(keyOf(row.validation_subject_id, row.scope_type, row.scope_id), row);
  }

  async getCurrentValidation(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7CurrentValidationRow | null>> {
    if (req.surface_id !== L7ReadSurfaceId.CURRENT_VALIDATION_BY_SCOPE) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.CURRENT_VALIDATION_BY_SCOPE,
        }).violations,
      };
    }
    const r = this.validator.validate(req);
    if (!r.ok) return { ok: false, violations: r.violations };

    const row = this.store.get(keyOf(req.subject_id!, req.scope_type!, req.scope_id!)) ?? null;
    return { ok: true, value: row };
  }
}

function keyOf(subjectId: string, scopeType: string, scopeId: string): string {
  return `${scopeType}|${scopeId}|${subjectId}`;
}
