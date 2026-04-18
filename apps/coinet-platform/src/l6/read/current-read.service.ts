/**
 * L6.7 — Current Read Service
 *
 * §6.7.6.3, §6.7.6.5 — Exposes the two current-state read surfaces:
 *   - current_feature_snapshot_by_scope
 *   - active_events_by_scope
 *
 * This service is a thin, governed facade. It does not perform queries
 * itself; it accepts a backend implementation and applies the read-surface
 * validator (§6.7.6.11) so that ambiguous/illegal reads are rejected.
 * Redis acceleration is permitted only as a derivative of Postgres
 * authority (§6.7.4.7).
 */

import {
  L6ActiveEventRow,
  L6ActiveEventsRequest,
  L6ConsumerClass,
  L6CurrentFeatureSnapshotRequest,
  L6CurrentFeatureSnapshotRow,
  L6ReadMode,
  L6ReadSurfaceId,
} from '../contracts/l6-read-surface';
import {
  ReadSurfaceValidator,
  L6ReadSurfaceValidationResult,
} from './read-surface.validator';

export interface L6CurrentReadBackend {
  fetchCurrentFeatureSnapshot(
    req: L6CurrentFeatureSnapshotRequest,
  ): Promise<readonly L6CurrentFeatureSnapshotRow[]>;
  fetchActiveEvents(
    req: L6ActiveEventsRequest,
  ): Promise<readonly L6ActiveEventRow[]>;
}

export interface L6CurrentReadResponse<T> {
  readonly ok: boolean;
  readonly surface: L6ReadSurfaceId;
  readonly mode: L6ReadMode;
  readonly rows: readonly T[];
  readonly validation: L6ReadSurfaceValidationResult;
}

export class L6CurrentReadService {
  private readonly validator = new ReadSurfaceValidator();

  constructor(private readonly backend: L6CurrentReadBackend) {}

  async currentFeatureSnapshot(
    req: L6CurrentFeatureSnapshotRequest,
    consumer: L6ConsumerClass,
  ): Promise<L6CurrentReadResponse<L6CurrentFeatureSnapshotRow>> {
    const validation = this.validator.validate({
      surface: L6ReadSurfaceId.CURRENT_FEATURE_SNAPSHOT_BY_SCOPE,
      mode: L6ReadMode.CURRENT_AUTHORITATIVE,
      consumer_class: consumer,
      raw_storage_surface_hint: null,
      ad_hoc_recompute_requested: false,
    });
    if (!validation.ok) {
      return {
        ok: false, surface: L6ReadSurfaceId.CURRENT_FEATURE_SNAPSHOT_BY_SCOPE,
        mode: L6ReadMode.CURRENT_AUTHORITATIVE, rows: [], validation,
      };
    }
    const rows = await this.backend.fetchCurrentFeatureSnapshot(req);
    return {
      ok: true, surface: L6ReadSurfaceId.CURRENT_FEATURE_SNAPSHOT_BY_SCOPE,
      mode: L6ReadMode.CURRENT_AUTHORITATIVE, rows, validation,
    };
  }

  async activeEvents(
    req: L6ActiveEventsRequest,
    consumer: L6ConsumerClass,
  ): Promise<L6CurrentReadResponse<L6ActiveEventRow>> {
    const validation = this.validator.validate({
      surface: L6ReadSurfaceId.ACTIVE_EVENTS_BY_SCOPE,
      mode: L6ReadMode.CURRENT_AUTHORITATIVE,
      consumer_class: consumer,
      raw_storage_surface_hint: null,
      ad_hoc_recompute_requested: false,
    });
    if (!validation.ok) {
      return {
        ok: false, surface: L6ReadSurfaceId.ACTIVE_EVENTS_BY_SCOPE,
        mode: L6ReadMode.CURRENT_AUTHORITATIVE, rows: [], validation,
      };
    }
    const rows = await this.backend.fetchActiveEvents(req);
    return {
      ok: true, surface: L6ReadSurfaceId.ACTIVE_EVENTS_BY_SCOPE,
      mode: L6ReadMode.CURRENT_AUTHORITATIVE, rows, validation,
    };
  }
}
