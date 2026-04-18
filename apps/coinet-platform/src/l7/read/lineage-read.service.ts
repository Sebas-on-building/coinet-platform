/**
 * L7.7 — Lineage Read Service
 *
 * §7.7.6.1 — Validation lineage by compute-run id. Serves from
 * `l7.lineage_pointers` + `l7.validation_runs` via the governed
 * read-surface validator.
 */

import { L7LineagePointer } from '../contracts/l7-evidence-storage';
import { L7ValidationRunRecord } from '../contracts/l7-persistence-surface';
import { L7ReadRequest, L7ReadSurfaceId } from '../contracts/l7-read-surface';
import { L7ReadSurfaceValidator } from './l7-read-surface.validator';
import { L7ReadOutcome } from './current-validation-read.service';

export interface L7LineageReadResult {
  readonly run: L7ValidationRunRecord;
  readonly lineage: readonly L7LineagePointer[];
}

export interface L7LineageReadSurface {
  getLineage(req: L7ReadRequest): Promise<L7ReadOutcome<L7LineageReadResult | null>>;
}

export class L7InMemoryLineageReadService implements L7LineageReadSurface {
  private readonly runs = new Map<string, L7ValidationRunRecord>();
  private readonly lineageByRun = new Map<string, L7LineagePointer[]>();

  constructor(private readonly validator: L7ReadSurfaceValidator) {}

  putRun(run: L7ValidationRunRecord): void {
    this.runs.set(run.compute_run_id, run);
  }
  appendLineage(p: L7LineagePointer): void {
    const arr = this.lineageByRun.get(p.compute_run_id) ?? [];
    arr.push(p);
    this.lineageByRun.set(p.compute_run_id, arr);
  }

  async getLineage(
    req: L7ReadRequest,
  ): Promise<L7ReadOutcome<L7LineageReadResult | null>> {
    if (req.surface_id !== L7ReadSurfaceId.VALIDATION_LINEAGE_BY_RUN) {
      return {
        ok: false,
        violations: this.validator.validate({
          ...req,
          surface_id: L7ReadSurfaceId.VALIDATION_LINEAGE_BY_RUN,
        }).violations,
      };
    }
    const r = this.validator.validate(req);
    if (!r.ok) return { ok: false, violations: r.violations };
    if (!req.compute_run_id) return { ok: true, value: null };
    const run = this.runs.get(req.compute_run_id);
    if (!run) return { ok: true, value: null };
    const lineage = this.lineageByRun.get(req.compute_run_id) ?? [];
    return { ok: true, value: { run, lineage } };
  }
}
