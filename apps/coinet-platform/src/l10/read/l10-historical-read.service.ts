/**
 * L10.8 — Historical Read Service
 *
 * §10.8.7.1 / §10.8.8.3 — Serves historical hypothesis / ranking /
 * spread reads across a scope and window. Enforces replay-safe
 * serving: the underlying store returns rows that already carry
 * replay identity; this service only ensures the request itself is
 * governed.
 */

import {
  L10ReadMode,
  L10ReadRequest,
  L10ReadSurface,
} from '../contracts/l10-read-surface';
import { L10ReadSurfaceRegistry } from '../registry/l10-read-surface.registry';
import {
  L10PersistenceValidationError,
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
  l10PersistenceViolationTier,
} from '../persistence/l10-persistence-violation-codes';
import { validateL10ReadRequest } from './l10-read-surface.validator';

export interface L10HistoricalFactRow<T = unknown> {
  readonly fact_id: string;
  readonly hypothesis_subject_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly read_mode: L10ReadMode;
  readonly policy_version: string;
  readonly replay_hash: string | null;
  readonly payload: T;
}

export interface L10HistoricalReadBackend {
  readHistorical<T = unknown>(
    surface: L10ReadSurface,
    request: L10ReadRequest,
  ): Promise<readonly L10HistoricalFactRow<T>[]>;
}

export interface L10HistoricalReadResult<T = unknown> {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
  readonly rows: readonly L10HistoricalFactRow<T>[];
}

export class L10HistoricalReadService {
  constructor(
    private readonly backend: L10HistoricalReadBackend,
    private readonly registry: L10ReadSurfaceRegistry =
      L10ReadSurfaceRegistry.default(),
  ) {}

  async read<T = unknown>(
    request: L10ReadRequest,
  ): Promise<L10HistoricalReadResult<T>> {
    const validation = validateL10ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, rows: [] };
    }
    const surface = validation.surface;

    const isHistoricalCapable =
      surface.allowed_read_modes.includes(L10ReadMode.LIVE_HISTORICAL) ||
      surface.allowed_read_modes.includes(L10ReadMode.REPLAY_HISTORICAL) ||
      surface.allowed_read_modes.includes(L10ReadMode.REPAIR_VIEW);
    if (!isHistoricalCapable) {
      return {
        ok: false,
        violations: [v(
          L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
          `${surface.read_surface_id} is not a historical read surface.`,
        )],
        rows: [],
      };
    }

    // §10.8.8.5 — replay results must never be read as LIVE_CURRENT.
    if (request.read_mode === L10ReadMode.LIVE_CURRENT) {
      return {
        ok: false,
        violations: [v(
          L10PersistenceViolationCode.REPLAY_READ_AS_LIVE_CURRENT,
          `LIVE_CURRENT on historical surface ${surface.read_surface_id}.`,
        )],
        rows: [],
      };
    }

    const rows = await this.backend.readHistorical<T>(surface, request);

    // §10.8.8.3 — every replay/repair row must expose replay_hash.
    const violations: L10PersistenceViolation[] = [];
    for (const r of rows) {
      if (r.read_mode !== L10ReadMode.LIVE_HISTORICAL && !r.replay_hash) {
        violations.push(v(
          L10PersistenceViolationCode.REPLAY_HASH_MISSING,
          `Historical row ${r.fact_id} missing replay_hash under mode ` +
            `${r.read_mode}.`,
        ));
      }
    }
    return { ok: violations.length === 0, violations, rows };
  }

  async readOrThrow<T = unknown>(
    request: L10ReadRequest,
  ): Promise<readonly L10HistoricalFactRow<T>[]> {
    const r = await this.read<T>(request);
    if (!r.ok) throw new L10PersistenceValidationError(r.violations);
    return r.rows;
  }
}

function v(
  code: L10PersistenceViolationCode,
  detail: string,
): L10PersistenceViolation {
  return {
    code,
    tier: l10PersistenceViolationTier(code) as L10PersistenceViolationTier,
    detail,
  };
}
