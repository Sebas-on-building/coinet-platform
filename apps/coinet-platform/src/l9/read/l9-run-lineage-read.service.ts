/**
 * L9.8 — Run Lineage Read Service
 *
 * §9.8.7.1 / §9.8.8.4 — Serves run-lineage lookups by sequence run
 * id. Lineage rows preserve parent/corrected version linkage, reason
 * codes, and supersession links so replay and repair never surface
 * as untouched live current (INV-9.8-G).
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

/**
 * §9.8.8.4 — Lineage row. Deliberately narrow: this is what replay
 * and repair adapters need in order to reconstruct (not to overwrite)
 * historical truth.
 */
export interface L9RunLineageRow {
  readonly lineage_id: string;
  readonly compute_run_id: string;
  readonly policy_version: string;
  readonly replay_hash: string | null;
  readonly parent_compute_run_id: string | null;
  readonly corrected_compute_run_id: string | null;
  readonly reason_codes: readonly string[];
  readonly mode_at_emission: string;
  readonly archive_uri: string | null;
  readonly manifest_ids: readonly string[];
}

export interface L9RunLineageReadBackend {
  readLineage(
    surface: L9ReadSurface,
    request: L9ReadRequest,
  ): Promise<readonly L9RunLineageRow[]>;
}

export interface L9RunLineageReadResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
  readonly rows: readonly L9RunLineageRow[];
}

export class L9RunLineageReadService {
  constructor(
    private readonly backend: L9RunLineageReadBackend,
    private readonly registry: L9ReadSurfaceRegistry =
      L9ReadSurfaceRegistry.default(),
  ) {}

  async read(request: L9ReadRequest): Promise<L9RunLineageReadResult> {
    const validation = validateL9ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, rows: [] };
    }
    const surface = validation.surface;

    if (!surface.allowed_read_modes.includes(L9ReadMode.LINEAGE_VIEW)) {
      return {
        ok: false,
        violations: [v(
          L9PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
          `${surface.read_surface_id} is not a LINEAGE_VIEW surface.`,
        )],
        rows: [],
      };
    }

    const rows = await this.backend.readLineage(surface, request);
    const violations: L9PersistenceViolation[] = [];

    for (const r of rows) {
      // §9.8.8.4 — repair-view rows must carry a corrected_run link
      // and reason codes, or the row is masquerading as clean live.
      if (r.corrected_compute_run_id !== null) {
        if (r.reason_codes.length === 0) {
          violations.push(v(
            L9PersistenceViolationCode.REPAIR_WITHOUT_REASON,
            `Lineage ${r.lineage_id} declares corrected_compute_run_id ` +
              `but has no reason_codes.`,
          ));
        }
        if (r.parent_compute_run_id === null) {
          violations.push(v(
            L9PersistenceViolationCode.REPAIR_WITHOUT_PARENT_LINEAGE,
            `Lineage ${r.lineage_id} declares correction without ` +
              `parent_compute_run_id.`,
          ));
        }
      }
      if (!r.replay_hash) {
        violations.push(v(
          L9PersistenceViolationCode.REPLAY_HASH_MISSING,
          `Lineage ${r.lineage_id} missing replay_hash.`,
        ));
      }
    }
    return { ok: violations.length === 0, violations, rows };
  }

  async readOrThrow(
    request: L9ReadRequest,
  ): Promise<readonly L9RunLineageRow[]> {
    const r = await this.read(request);
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
