/**
 * L10.8 — Current Read Service
 *
 * §10.8.7.1 / §10.8.7.2 — Serves current snapshots (hypothesis /
 * ranking / spread / confidence / restriction / readiness /
 * confirmation / invalidation / shift) for a scope. The service is a
 * thin *governed* adapter: it validates the request through
 * `validateL10ReadRequest`, confirms the surface is a current snapshot
 * surface, and delegates the actual fetch to an injected backend. Raw-
 * store access is never legal (§10.8.7.6 / INV-10.8-E).
 */

import {
  L10ReadMode,
  L10ReadRequest,
  L10ReadSurface,
  L10ReadSurfaceId,
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

export interface L10CurrentSnapshot<T = unknown> {
  readonly read_surface_id: L10ReadSurfaceId;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly compute_run_id: string;
  readonly policy_version: string;
  readonly replay_hash: string | null;
  readonly payload: T;
}

export interface L10CurrentReadBackend {
  readCurrent<T = unknown>(
    surface: L10ReadSurface,
    request: L10ReadRequest,
  ): Promise<L10CurrentSnapshot<T> | null>;
}

export interface L10CurrentReadResult<T = unknown> {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
  readonly snapshot: L10CurrentSnapshot<T> | null;
}

export class L10CurrentReadService {
  constructor(
    private readonly backend: L10CurrentReadBackend,
    private readonly registry: L10ReadSurfaceRegistry =
      L10ReadSurfaceRegistry.default(),
  ) {}

  async read<T = unknown>(
    request: L10ReadRequest,
  ): Promise<L10CurrentReadResult<T>> {
    const validation = validateL10ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, snapshot: null };
    }
    const surface = validation.surface;

    if (!surface.allowed_read_modes.includes(L10ReadMode.LIVE_CURRENT)) {
      return {
        ok: false,
        violations: [v(
          L10PersistenceViolationCode.READ_CURRENT_FROM_HISTORICAL_ONLY_SURFACE,
          `${surface.read_surface_id} is not a current-snapshot surface.`,
        )],
        snapshot: null,
      };
    }

    const snapshot = await this.backend.readCurrent<T>(surface, request);
    return { ok: true, violations: [], snapshot };
  }

  async readOrThrow<T = unknown>(
    request: L10ReadRequest,
  ): Promise<L10CurrentSnapshot<T> | null> {
    const r = await this.read<T>(request);
    if (!r.ok) throw new L10PersistenceValidationError(r.violations);
    return r.snapshot;
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
