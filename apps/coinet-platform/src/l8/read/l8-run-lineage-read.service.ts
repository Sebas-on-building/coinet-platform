/**
 * L8.8 — Run & Lineage Read Service
 *
 * §8.8.7 — Serves lineage chains and replay-vs-live / repair views.
 * Only `LINEAGE_VIEW`, `REPAIR_VIEW`, and `REPLAY_HISTORICAL` are
 * legal modes (per read-surface descriptors); the validator enforces
 * consumer class.
 */

import { L8ReadRequest, L8ReadSurfaceId }
  from '../contracts/l8-read-surface';
import {
  L8RegimeRunRecord,
} from '../contracts/l8-persistence-surface';
import { L8LineagePointer }
  from '../contracts/l8-evidence-storage';
import { L8ReadSurfaceValidator } from './l8-read-surface.validator';
import {
  L8PersistenceViolation,
} from '../persistence/l8-persistence-violation-codes';

export interface L8ReplayVsLiveDelta {
  readonly regime_subject_id: string;
  readonly live_run_id: string;
  readonly replay_run_id: string;
  readonly live_regime: string | null;
  readonly replay_regime: string | null;
  readonly drift: boolean;
}

export interface L8RepairLineageChain {
  readonly regime_subject_id: string;
  readonly run_chain: readonly L8RegimeRunRecord[];
  readonly lineage_pointers: readonly L8LineagePointer[];
}

export class L8RunLineageReadService {
  private runs = new Map<string, L8RegimeRunRecord>();
  private pointers = new Map<string, L8LineagePointer[]>();
  private deltas = new Map<string, L8ReplayVsLiveDelta[]>();

  constructor(
    private readonly validator: L8ReadSurfaceValidator = new L8ReadSurfaceValidator(),
  ) {}

  registerRun(run: L8RegimeRunRecord): void {
    this.runs.set(run.compute_run_id, run);
  }
  registerLineagePointer(p: L8LineagePointer): void {
    const arr = this.pointers.get(p.regime_subject_id) ?? [];
    arr.push(p);
    this.pointers.set(p.regime_subject_id, arr);
  }
  registerReplayVsLiveDelta(d: L8ReplayVsLiveDelta): void {
    const arr = this.deltas.get(d.regime_subject_id) ?? [];
    arr.push(d);
    this.deltas.set(d.regime_subject_id, arr);
  }

  readLineageByRun(req: L8ReadRequest): {
    readonly ok: boolean;
    readonly violations: readonly L8PersistenceViolation[];
    readonly run: L8RegimeRunRecord | null;
    readonly pointers: readonly L8LineagePointer[];
  } {
    const res = this.validator.validate(req);
    if (!res.ok) return {
      ok: false, violations: res.violations, run: null, pointers: [],
    };
    if (req.surface_id !== L8ReadSurfaceId.REGIME_LINEAGE_BY_RUN) {
      return {
        ok: false, violations: res.violations, run: null, pointers: [],
      };
    }
    const run = req.compute_run_id
      ? this.runs.get(req.compute_run_id) ?? null : null;
    let pointers: readonly L8LineagePointer[] = [];
    if (run) {
      const matched: L8LineagePointer[] = [];
      for (const arr of this.pointers.values()) {
        for (const p of arr) {
          if (p.compute_run_id === run.compute_run_id) matched.push(p);
        }
      }
      pointers = matched;
    }
    return { ok: true, violations: res.violations, run, pointers };
  }

  readReplayVsLive(req: L8ReadRequest): {
    readonly ok: boolean;
    readonly violations: readonly L8PersistenceViolation[];
    readonly deltas: readonly L8ReplayVsLiveDelta[];
  } {
    const res = this.validator.validate(req);
    if (!res.ok) return { ok: false, violations: res.violations, deltas: [] };
    if (req.surface_id !== L8ReadSurfaceId.REPLAY_VS_LIVE_BY_SUBJECT) {
      return { ok: false, violations: res.violations, deltas: [] };
    }
    const deltas = req.regime_subject_id
      ? this.deltas.get(req.regime_subject_id) ?? [] : [];
    return { ok: true, violations: res.violations, deltas };
  }

  readRepairChain(req: L8ReadRequest): {
    readonly ok: boolean;
    readonly violations: readonly L8PersistenceViolation[];
    readonly chain: L8RepairLineageChain | null;
  } {
    const res = this.validator.validate(req);
    if (!res.ok) return { ok: false, violations: res.violations, chain: null };
    if (req.surface_id !== L8ReadSurfaceId.REPAIR_LINEAGE_BY_SUBJECT) {
      return { ok: false, violations: res.violations, chain: null };
    }
    const subject = req.regime_subject_id;
    if (!subject) return { ok: true, violations: res.violations, chain: null };

    const pointers = this.pointers.get(subject) ?? [];
    const runIds = new Set(pointers.map(p => p.compute_run_id));
    const runs: L8RegimeRunRecord[] = [];
    for (const id of runIds) {
      const r = this.runs.get(id);
      if (r) runs.push(r);
    }
    return {
      ok: true, violations: res.violations,
      chain: {
        regime_subject_id: subject,
        run_chain: runs,
        lineage_pointers: pointers,
      },
    };
  }
}
