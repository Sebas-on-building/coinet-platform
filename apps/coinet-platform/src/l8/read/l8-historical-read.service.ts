/**
 * L8.8 — Historical Read Service
 *
 * §8.8.7.4 — Historical reads serve append-safe fact rows (regime,
 * transition, confidence, multiplier) within an explicit window.
 * Only `LIVE_HISTORICAL` and `REPLAY_HISTORICAL` modes are legal.
 */

import {
  L8ReadMode, L8ReadRequest, L8ReadSurfaceId,
} from '../contracts/l8-read-surface';
import {
  L8HistoricalRegimeFact, L8HistoricalTransitionFact,
  L8HistoricalConfidenceFact, L8HistoricalMultiplierFact,
} from '../contracts/l8-current-authority';
import { L8ReadSurfaceValidator } from './l8-read-surface.validator';
import {
  L8PersistenceViolation,
} from '../persistence/l8-persistence-violation-codes';

export type L8HistoricalFact =
  | L8HistoricalRegimeFact | L8HistoricalTransitionFact
  | L8HistoricalConfidenceFact | L8HistoricalMultiplierFact;

function scopeKey(
  family: string, scopeType: string, scopeId: string,
): string {
  return `${family}::${scopeType}::${scopeId}`;
}

export class L8HistoricalReadService {
  private regime = new Map<string, L8HistoricalRegimeFact[]>();
  private transition = new Map<string, L8HistoricalTransitionFact[]>();
  private confidence = new Map<string, L8HistoricalConfidenceFact[]>();
  private multiplier = new Map<string, L8HistoricalMultiplierFact[]>();

  constructor(
    private readonly validator: L8ReadSurfaceValidator = new L8ReadSurfaceValidator(),
  ) {}

  // ── write path ────────────────────────────────────────────────────
  appendRegime(f: L8HistoricalRegimeFact): void {
    const k = scopeKey(f.regime_family, f.scope_type, f.scope_id);
    const arr = this.regime.get(k) ?? [];
    arr.push(f); this.regime.set(k, arr);
  }
  appendTransition(f: L8HistoricalTransitionFact): void {
    const k = scopeKey(f.regime_family, f.scope_type, f.scope_id);
    const arr = this.transition.get(k) ?? [];
    arr.push(f); this.transition.set(k, arr);
  }
  appendConfidence(f: L8HistoricalConfidenceFact): void {
    const k = scopeKey(f.regime_family, f.scope_type, f.scope_id);
    const arr = this.confidence.get(k) ?? [];
    arr.push(f); this.confidence.set(k, arr);
  }
  appendMultiplier(f: L8HistoricalMultiplierFact): void {
    const k = scopeKey(f.regime_family, f.scope_type, f.scope_id);
    const arr = this.multiplier.get(k) ?? [];
    arr.push(f); this.multiplier.set(k, arr);
  }

  // ── read path (governed) ──────────────────────────────────────────
  read(req: L8ReadRequest): {
    readonly ok: boolean;
    readonly violations: readonly L8PersistenceViolation[];
    readonly rows: readonly L8HistoricalFact[];
  } {
    const res = this.validator.validate(req);
    if (!res.ok) return { ok: false, violations: res.violations, rows: [] };
    if (req.mode !== L8ReadMode.LIVE_HISTORICAL &&
        req.mode !== L8ReadMode.REPLAY_HISTORICAL) {
      return { ok: false, violations: res.violations, rows: [] };
    }
    const key = scopeKey(
      req.regime_family ?? '', req.scope_type ?? '', req.scope_id ?? '');
    const from = req.window_from_iso ?? '';
    const to = req.window_to_iso ?? '\uFFFF';

    function filterByWindow<T extends { as_of: string }>(
      arr: readonly T[],
    ): readonly T[] {
      return arr.filter(f => f.as_of >= from && f.as_of <= to);
    }

    let rows: readonly L8HistoricalFact[] = [];
    switch (req.surface_id) {
      case L8ReadSurfaceId.REGIME_HISTORY_BY_SCOPE:
        rows = filterByWindow(this.regime.get(key) ?? []); break;
      case L8ReadSurfaceId.TRANSITION_HISTORY_BY_SCOPE:
        rows = filterByWindow(this.transition.get(key) ?? []); break;
      case L8ReadSurfaceId.CONFIDENCE_HISTORY_BY_SCOPE:
        rows = filterByWindow(this.confidence.get(key) ?? []); break;
      case L8ReadSurfaceId.MULTIPLIER_HISTORY_BY_SCOPE:
        rows = filterByWindow(this.multiplier.get(key) ?? []); break;
      default:
        rows = [];
    }
    return { ok: true, violations: res.violations, rows };
  }
}
