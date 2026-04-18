/**
 * L8.8 — Current Read Service
 *
 * §8.8.7.3 — Current reads serve the authoritative current registries
 * (regime / transition / confidence / multiplier). Every read must be
 * validated through `L8ReadSurfaceValidator` first; this service holds
 * the typed in-memory store used by tests and the real resolver that
 * the production read path will swap in (still consuming the same
 * validated envelope).
 *
 * The store is intentionally map-based and deterministic so tests can
 * assert replay fidelity.
 */

import {
  L8ReadMode,
  L8ReadRequest,
  L8ReadSurfaceId,
} from '../contracts/l8-read-surface';
import {
  L8CurrentRegimeRow,
  L8CurrentTransitionRow,
  L8CurrentConfidenceRow,
  L8CurrentMultiplierRow,
} from '../contracts/l8-current-authority';
import {
  L8ReadSurfaceValidator,
} from './l8-read-surface.validator';
import {
  L8PersistenceViolation,
} from '../persistence/l8-persistence-violation-codes';

export type L8CurrentRow =
  | L8CurrentRegimeRow
  | L8CurrentTransitionRow
  | L8CurrentConfidenceRow
  | L8CurrentMultiplierRow;

function scopeKey(
  family: string, scopeType: string, scopeId: string,
): string {
  return `${family}::${scopeType}::${scopeId}`;
}

export class L8CurrentReadService {
  private regime = new Map<string, L8CurrentRegimeRow>();
  private transition = new Map<string, L8CurrentTransitionRow>();
  private confidence = new Map<string, L8CurrentConfidenceRow>();
  private multiplier = new Map<string, L8CurrentMultiplierRow>();

  constructor(
    private readonly validator: L8ReadSurfaceValidator = new L8ReadSurfaceValidator(),
  ) {}

  // ── write path (test / fixture) ───────────────────────────────────
  upsertRegime(row: L8CurrentRegimeRow): void {
    this.regime.set(scopeKey(row.regime_family, row.scope_type, row.scope_id), row);
  }
  upsertTransition(row: L8CurrentTransitionRow): void {
    this.transition.set(scopeKey(row.regime_family, row.scope_type, row.scope_id), row);
  }
  upsertConfidence(row: L8CurrentConfidenceRow): void {
    this.confidence.set(scopeKey(row.regime_family, row.scope_type, row.scope_id), row);
  }
  upsertMultiplier(row: L8CurrentMultiplierRow): void {
    this.multiplier.set(scopeKey(row.regime_family, row.scope_type, row.scope_id), row);
  }

  // ── read path (governed) ──────────────────────────────────────────
  read(req: L8ReadRequest): {
    readonly ok: boolean;
    readonly violations: readonly L8PersistenceViolation[];
    readonly row: L8CurrentRow | null;
  } {
    const res = this.validator.validate(req);
    if (!res.ok) return { ok: false, violations: res.violations, row: null };
    if (req.mode !== L8ReadMode.LIVE_CURRENT) {
      // Defence-in-depth: surface already enforces it, but validator
      // flow stays uniform for callers that forget to pass mode.
      return { ok: false, violations: res.violations, row: null };
    }
    const key = scopeKey(
      req.regime_family ?? '', req.scope_type ?? '', req.scope_id ?? '');

    let row: L8CurrentRow | null = null;
    switch (req.surface_id) {
      case L8ReadSurfaceId.CURRENT_REGIME_BY_SCOPE:
      case L8ReadSurfaceId.CURRENT_REGIME_BY_FAMILY_SCOPE:
        row = this.regime.get(key) ?? null; break;
      case L8ReadSurfaceId.CURRENT_TRANSITION_BY_SCOPE:
        row = this.transition.get(key) ?? null; break;
      case L8ReadSurfaceId.CURRENT_CONFIDENCE_BY_SCOPE:
        row = this.confidence.get(key) ?? null; break;
      case L8ReadSurfaceId.CURRENT_MULTIPLIER_BY_SCOPE:
        row = this.multiplier.get(key) ?? null; break;
      default:
        row = null;
    }
    return { ok: true, violations: res.violations, row };
  }
}
