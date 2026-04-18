/**
 * L6.7 — Historical Read Service
 *
 * §6.7.6.4, §6.7.6.6 — Exposes the two historical read surfaces:
 *   - feature_history_by_scope_and_window
 *   - event_history_by_scope
 *
 * Each returned row carries an explicit `L6HistoricalSurfaceClass`
 * (§6.7.3.4, §6.7.6.11). The service validates that:
 *   - the caller/mode pairing is legal (§6.7.7.1)
 *   - every returned row has a non-null surface_class (ambiguous reads
 *     are rejected at the service boundary)
 */

import {
  L6ConsumerClass,
  L6EventHistoryRequest,
  L6FeatureHistoryRequest,
  L6HistoricalEventRow,
  L6HistoricalFeatureRow,
  L6HistoricalSurfaceClass,
  L6ReadMode,
  L6ReadSurfaceId,
} from '../contracts/l6-read-surface';
import { L6PersistenceViolationCode } from '../contracts/l6-persistence-surface';
import {
  L6ReadSurfaceValidationResult,
  ReadSurfaceValidator,
} from './read-surface.validator';

export interface L6HistoricalReadBackend {
  fetchFeatureHistory(
    req: L6FeatureHistoryRequest,
  ): Promise<readonly L6HistoricalFeatureRow[]>;
  fetchEventHistory(
    req: L6EventHistoryRequest,
  ): Promise<readonly L6HistoricalEventRow[]>;
}

export interface L6HistoricalReadResponse<T> {
  readonly ok: boolean;
  readonly surface: L6ReadSurfaceId;
  readonly mode: L6ReadMode;
  readonly rows: readonly T[];
  readonly validation: L6ReadSurfaceValidationResult;
}

function modeFromSurfaceClass(cls: L6HistoricalSurfaceClass | null): L6ReadMode {
  switch (cls) {
    case L6HistoricalSurfaceClass.REPLAY_TAGGED: return L6ReadMode.REPLAY_TAGGED;
    case L6HistoricalSurfaceClass.REPAIR_TAGGED:
    case L6HistoricalSurfaceClass.LATE_DATA_REMATERIALIZED:
      return L6ReadMode.REPAIRED_REMATERIALIZED;
    case L6HistoricalSurfaceClass.LIVE_PROJECTED:
    default:
      return L6ReadMode.HISTORICAL;
  }
}

export class L6HistoricalReadService {
  private readonly validator = new ReadSurfaceValidator();

  constructor(private readonly backend: L6HistoricalReadBackend) {}

  async featureHistory(
    req: L6FeatureHistoryRequest,
    consumer: L6ConsumerClass,
  ): Promise<L6HistoricalReadResponse<L6HistoricalFeatureRow>> {
    const mode = modeFromSurfaceClass(req.surface_class ?? null);
    const outer = this.validator.validate({
      surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
      mode, consumer_class: consumer,
      raw_storage_surface_hint: null, ad_hoc_recompute_requested: false,
    });
    if (!outer.ok) {
      return {
        ok: false, surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
        mode, rows: [], validation: outer,
      };
    }
    const rows = await this.backend.fetchFeatureHistory(req);

    const bad: { code: L6PersistenceViolationCode; field: string; detail: string }[] = [];
    for (const r of rows) {
      const rv = this.validator.validateHistoricalRow(r);
      if (!rv.ok) bad.push(...rv.violations);
    }
    if (bad.length > 0) {
      return {
        ok: false, surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
        mode, rows: [], validation: { ok: false, violations: bad },
      };
    }
    return {
      ok: true, surface: L6ReadSurfaceId.FEATURE_HISTORY_BY_SCOPE_AND_WINDOW,
      mode, rows, validation: outer,
    };
  }

  async eventHistory(
    req: L6EventHistoryRequest,
    consumer: L6ConsumerClass,
  ): Promise<L6HistoricalReadResponse<L6HistoricalEventRow>> {
    const mode = modeFromSurfaceClass(req.surface_class ?? null);
    const outer = this.validator.validate({
      surface: L6ReadSurfaceId.EVENT_HISTORY_BY_SCOPE,
      mode, consumer_class: consumer,
      raw_storage_surface_hint: null, ad_hoc_recompute_requested: false,
    });
    if (!outer.ok) {
      return {
        ok: false, surface: L6ReadSurfaceId.EVENT_HISTORY_BY_SCOPE,
        mode, rows: [], validation: outer,
      };
    }
    const rows = await this.backend.fetchEventHistory(req);
    const bad: { code: L6PersistenceViolationCode; field: string; detail: string }[] = [];
    for (const r of rows) {
      const rv = this.validator.validateHistoricalRow(r);
      if (!rv.ok) bad.push(...rv.violations);
    }
    if (bad.length > 0) {
      return {
        ok: false, surface: L6ReadSurfaceId.EVENT_HISTORY_BY_SCOPE,
        mode, rows: [], validation: { ok: false, violations: bad },
      };
    }
    return {
      ok: true, surface: L6ReadSurfaceId.EVENT_HISTORY_BY_SCOPE,
      mode, rows, validation: outer,
    };
  }
}
