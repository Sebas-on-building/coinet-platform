/**
 * L9.8 — Evidence Read Service
 *
 * §9.8.7.1 / §9.8.6 — Serves validated evidence pointers keyed by
 * sequence subject id. The service always re-validates pointers
 * returned by the backend against `validateL9EvidencePointer` so an
 * orphaned or non-deterministic pointer can never escape into upward
 * engines (INV-9.8-D).
 */

import {
  L9EvidencePointer,
} from '../contracts/l9-evidence-storage';
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
import { validateL9EvidencePointer } from '../persistence/l9-evidence-storage.validator';
import { validateL9ReadRequest } from './l9-read-surface.validator';

export interface L9EvidenceReadBackend {
  readEvidenceBundle(
    surface: L9ReadSurface,
    request: L9ReadRequest,
  ): Promise<readonly L9EvidencePointer[]>;
}

export interface L9EvidenceReadResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
  readonly pointers: readonly L9EvidencePointer[];
}

export class L9EvidenceReadService {
  constructor(
    private readonly backend: L9EvidenceReadBackend,
    private readonly registry: L9ReadSurfaceRegistry =
      L9ReadSurfaceRegistry.default(),
  ) {}

  async read(request: L9ReadRequest): Promise<L9EvidenceReadResult> {
    const validation = validateL9ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, pointers: [] };
    }
    const surface = validation.surface;

    if (!surface.allowed_read_modes.includes(L9ReadMode.EVIDENCE_VIEW)) {
      return {
        ok: false,
        violations: [v(
          L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
          `${surface.read_surface_id} is not an EVIDENCE_VIEW surface.`,
        )],
        pointers: [],
      };
    }

    const pointers = await this.backend.readEvidenceBundle(surface, request);
    const violations: L9PersistenceViolation[] = [];

    for (const p of pointers) {
      const r = validateL9EvidencePointer(p);
      if (!r.ok) {
        violations.push(...r.violations);
      }
    }
    return { ok: violations.length === 0, violations, pointers };
  }

  async readOrThrow(
    request: L9ReadRequest,
  ): Promise<readonly L9EvidencePointer[]> {
    const r = await this.read(request);
    if (!r.ok) throw new L9PersistenceValidationError(r.violations);
    return r.pointers;
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
