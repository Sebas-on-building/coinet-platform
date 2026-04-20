/**
 * L9.8 — Current Read Service
 *
 * §9.8.7.1 / §9.8.7.2 — Serves current snapshots (sequence / phase /
 * decay / confidence / restriction / causal-restraint) for a scope.
 * The service is a thin *governed* adapter: it validates the request
 * through `validateL9ReadRequest`, confirms the surface is a current
 * snapshot surface, and delegates the actual fetch to an injected
 * backend. Raw-store access is never legal (§9.8.7.6 / INV-9.8-E).
 */

import {
  L9ConsumerClass,
  L9ReadMode,
  L9ReadRequest,
  L9ReadSurface,
  L9ReadSurfaceId,
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

/**
 * §9.8.7.5 — Opaque snapshot payload returned by the backend. L9.8
 * does not describe the shape; each current-authority surface carries
 * its own payload type through L9.3 / L9.7.
 */
export interface L9CurrentSnapshot<T = unknown> {
  readonly read_surface_id: L9ReadSurfaceId;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly compute_run_id: string;
  readonly policy_version: string;
  readonly replay_hash: string | null;
  readonly payload: T;
}

export interface L9CurrentReadBackend {
  readCurrent<T = unknown>(
    surface: L9ReadSurface,
    request: L9ReadRequest,
  ): Promise<L9CurrentSnapshot<T> | null>;
}

export interface L9CurrentReadResult<T = unknown> {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
  readonly snapshot: L9CurrentSnapshot<T> | null;
}

export class L9CurrentReadService {
  constructor(
    private readonly backend: L9CurrentReadBackend,
    private readonly registry: L9ReadSurfaceRegistry =
      L9ReadSurfaceRegistry.default(),
  ) {}

  async read<T = unknown>(
    request: L9ReadRequest,
  ): Promise<L9CurrentReadResult<T>> {
    const validation = validateL9ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, snapshot: null };
    }
    const surface = validation.surface;

    // §9.8.7.1 / §9.8.7.2 — this service only handles current snapshots.
    if (!surface.allowed_read_modes.includes(L9ReadMode.LIVE_CURRENT)) {
      return {
        ok: false,
        violations: [v(
          L9PersistenceViolationCode.READ_CURRENT_FROM_HISTORICAL_ONLY_SURFACE,
          `${surface.read_surface_id} is not a current-snapshot surface.`,
        )],
        snapshot: null,
      };
    }

    // §9.8.7.6 — upward engines + adapters may read current snapshots.
    if (request.consumer_class === L9ConsumerClass.REPLAY_ADAPTER ||
        request.consumer_class === L9ConsumerClass.REPAIR_ADAPTER) {
      // adapters *may* read current but must be in governed flow; the
      // downstream-consumption validator enforces that at the call site.
    }

    const snapshot = await this.backend.readCurrent<T>(surface, request);
    return { ok: true, violations: [], snapshot };
  }

  /**
   * §9.8.12 — Convenience assert-mode used by tests and audit.
   */
  async readOrThrow<T = unknown>(
    request: L9ReadRequest,
  ): Promise<L9CurrentSnapshot<T> | null> {
    const r = await this.read<T>(request);
    if (!r.ok) throw new L9PersistenceValidationError(r.violations);
    return r.snapshot;
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
