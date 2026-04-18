/**
 * L6.7 — Compute-Run Read Service
 *
 * §6.7.6.9 — Exposes `recompute_lineage_by_compute_run`. This is the
 * authoritative operational-debug surface: every later-layer consumer must
 * be able to trace a primitive back to the run that produced it.
 */

import {
  L6ComputeRunLineage,
  L6ComputeRunLineageRequest,
  L6ConsumerClass,
  L6ReadMode,
  L6ReadSurfaceId,
} from '../contracts/l6-read-surface';
import {
  L6ReadSurfaceValidationResult,
  ReadSurfaceValidator,
} from './read-surface.validator';

export interface L6ComputeRunReadBackend {
  fetchLineage(req: L6ComputeRunLineageRequest): Promise<L6ComputeRunLineage | null>;
}

export interface L6ComputeRunReadResponse {
  readonly ok: boolean;
  readonly surface: L6ReadSurfaceId;
  readonly mode: L6ReadMode;
  readonly lineage: L6ComputeRunLineage | null;
  readonly validation: L6ReadSurfaceValidationResult;
}

export class L6ComputeRunReadService {
  private readonly validator = new ReadSurfaceValidator();

  constructor(private readonly backend: L6ComputeRunReadBackend) {}

  async lineage(
    req: L6ComputeRunLineageRequest,
    consumer: L6ConsumerClass,
  ): Promise<L6ComputeRunReadResponse> {
    const validation = this.validator.validate({
      surface: L6ReadSurfaceId.RECOMPUTE_LINEAGE_BY_COMPUTE_RUN,
      mode: L6ReadMode.LINEAGE_LOOKUP,
      consumer_class: consumer,
      raw_storage_surface_hint: null,
      ad_hoc_recompute_requested: false,
    });
    if (!validation.ok) {
      return {
        ok: false, surface: L6ReadSurfaceId.RECOMPUTE_LINEAGE_BY_COMPUTE_RUN,
        mode: L6ReadMode.LINEAGE_LOOKUP, lineage: null, validation,
      };
    }
    const lineage = await this.backend.fetchLineage(req);
    return {
      ok: lineage !== null,
      surface: L6ReadSurfaceId.RECOMPUTE_LINEAGE_BY_COMPUTE_RUN,
      mode: L6ReadMode.LINEAGE_LOOKUP,
      lineage, validation,
    };
  }
}
