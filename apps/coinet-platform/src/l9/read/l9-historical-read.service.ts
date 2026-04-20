/**
 * L9.8 — Historical Read Service
 *
 * §9.8.7.1 / §9.8.8.3 — Serves historical sequence / lead-lag /
 * change-point / post-event window reads across a scope and window.
 * Enforces replay-safe serving: the underlying store returns rows
 * that already carry replay identity; this service only ensures the
 * request itself is governed.
 */

import {
  L9ReadMode,
  L9ReadRequest,
  L9ReadSurface,
} from '../contracts/l9-read-surface';
import { L9ReadSurfaceRegistry } from '../registry/l9-read-surface.registry';
import {
  L9PersistenceViolation,
  L9PersistenceValidationError,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from '../persistence/l9-persistence-violation-codes';
import { validateL9ReadRequest } from './l9-read-surface.validator';

export interface L9HistoricalFactRow<T = unknown> {
  readonly fact_id: string;
  readonly sequence_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly read_mode: L9ReadMode;
  readonly policy_version: string;
  readonly replay_hash: string | null;
  readonly payload: T;
}

export interface L9HistoricalReadBackend {
  readHistorical<T = unknown>(
    surface: L9ReadSurface,
    request: L9ReadRequest,
  ): Promise<readonly L9HistoricalFactRow<T>[]>;
}

export interface L9HistoricalReadResult<T = unknown> {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
  readonly rows: readonly L9HistoricalFactRow<T>[];
}

export class L9HistoricalReadService {
  constructor(
    private readonly backend: L9HistoricalReadBackend,
    private readonly registry: L9ReadSurfaceRegistry =
      L9ReadSurfaceRegistry.default(),
  ) {}

  async read<T = unknown>(
    request: L9ReadRequest,
  ): Promise<L9HistoricalReadResult<T>> {
    const validation = validateL9ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, rows: [] };
    }
    const surface = validation.surface;

    // §9.8.7.1 — historical service only serves historical-capable surfaces.
    const isHistoricalCapable =
      surface.allowed_read_modes.includes(L9ReadMode.LIVE_HISTORICAL) ||
      surface.allowed_read_modes.includes(L9ReadMode.REPLAY_HISTORICAL) ||
      surface.allowed_read_modes.includes(L9ReadMode.REPAIR_VIEW);
    if (!isHistoricalCapable) {
      return {
        ok: false,
        violations: [v(
          L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
          `${surface.read_surface_id} is not a historical read surface.`,
        )],
        rows: [],
      };
    }

    // §9.8.8.5 — replay results must never be read as LIVE_CURRENT;
    // the validator already rejects LIVE_CURRENT here, but we keep a
    // defensive cross-check for INV-9.8-G.
    if (request.read_mode === L9ReadMode.LIVE_CURRENT) {
      return {
        ok: false,
        violations: [v(
          L9PersistenceViolationCode.REPLAY_READ_AS_LIVE_CURRENT,
          `LIVE_CURRENT on historical surface ${surface.read_surface_id}.`,
        )],
        rows: [],
      };
    }

    const rows = await this.backend.readHistorical<T>(surface, request);

    // §9.8.8.3 — every historical/replay row must expose replay_hash.
    const violations: L9PersistenceViolation[] = [];
    for (const r of rows) {
      if (r.read_mode !== L9ReadMode.LIVE_HISTORICAL && !r.replay_hash) {
        violations.push(v(
          L9PersistenceViolationCode.REPLAY_HASH_MISSING,
          `Historical row ${r.fact_id} missing replay_hash under mode ` +
            `${r.read_mode}.`,
        ));
      }
    }
    return { ok: violations.length === 0, violations, rows };
  }

  async readOrThrow<T = unknown>(
    request: L9ReadRequest,
  ): Promise<readonly L9HistoricalFactRow<T>[]> {
    const r = await this.read<T>(request);
    if (!r.ok) throw new L9PersistenceValidationError(r.violations);
    return r.rows;
  }
}

function v(
  code: L9PersistenceViolationCode,
  detail: string,
): L9PersistenceViolation {
  return {
    code,
    tier: l9PersistenceViolationTier(code) as L9PersistenceViolationTier,
    detail,
  };
}
