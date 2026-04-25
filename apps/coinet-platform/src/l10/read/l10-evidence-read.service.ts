/**
 * L10.8 — Evidence Read Service
 *
 * §10.8.7.1 / §10.8.6 — Serves validated evidence pointers keyed by
 * hypothesis subject id. The service always re-validates pointers
 * returned by the backend against `validateL10EvidencePointer` so an
 * orphaned or non-deterministic pointer can never escape into upward
 * engines (INV-10.8-D).
 */

import { L10EvidencePointer } from '../contracts/l10-evidence-storage';
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
import { validateL10EvidencePointer } from '../persistence/l10-evidence-storage.validator';
import { validateL10ReadRequest } from './l10-read-surface.validator';

export interface L10EvidenceReadBackend {
  readEvidenceBundle(
    surface: L10ReadSurface,
    request: L10ReadRequest,
  ): Promise<readonly L10EvidencePointer[]>;
}

export interface L10EvidenceReadResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
  readonly pointers: readonly L10EvidencePointer[];
}

export class L10EvidenceReadService {
  constructor(
    private readonly backend: L10EvidenceReadBackend,
    private readonly registry: L10ReadSurfaceRegistry =
      L10ReadSurfaceRegistry.default(),
  ) {}

  async read(request: L10ReadRequest): Promise<L10EvidenceReadResult> {
    const validation = validateL10ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, pointers: [] };
    }
    const surface = validation.surface;

    if (!surface.allowed_read_modes.includes(L10ReadMode.EVIDENCE_VIEW)) {
      return {
        ok: false,
        violations: [v(
          L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
          `${surface.read_surface_id} is not an EVIDENCE_VIEW surface.`,
        )],
        pointers: [],
      };
    }

    const pointers = await this.backend.readEvidenceBundle(surface, request);
    const violations: L10PersistenceViolation[] = [];

    for (const p of pointers) {
      const r = validateL10EvidencePointer(p);
      if (!r.ok) {
        violations.push(...r.violations);
      }
    }
    return { ok: violations.length === 0, violations, pointers };
  }

  async readOrThrow(
    request: L10ReadRequest,
  ): Promise<readonly L10EvidencePointer[]> {
    const r = await this.read(request);
    if (!r.ok) throw new L10PersistenceValidationError(r.violations);
    return r.pointers;
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
