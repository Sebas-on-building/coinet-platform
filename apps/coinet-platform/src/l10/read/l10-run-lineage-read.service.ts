/**
 * L10.8 — Run Lineage Read Service
 *
 * §10.8.7.1 / §10.8.8.4 — Serves run-lineage lookups by hypothesis
 * compute run id. Lineage rows preserve parent/corrected version
 * linkage, reason codes, and supersession links so replay and repair
 * never surface as untouched live current (INV-10.8-G).
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

export interface L10RunLineageRow {
  readonly lineage_id: string;
  readonly compute_run_id: string;
  readonly policy_version: string;
  readonly replay_hash: string | null;
  readonly parent_compute_run_id: string | null;
  readonly corrected_compute_run_id: string | null;
  readonly reason_codes: readonly string[];
  readonly mode_at_emission: string;
  readonly archive_uri: string | null;
  readonly manifest_refs: readonly string[];
}

export interface L10RunLineageReadBackend {
  readLineage(
    surface: L10ReadSurface,
    request: L10ReadRequest,
  ): Promise<readonly L10RunLineageRow[]>;
}

export interface L10RunLineageReadResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
  readonly rows: readonly L10RunLineageRow[];
}

export class L10RunLineageReadService {
  constructor(
    private readonly backend: L10RunLineageReadBackend,
    private readonly registry: L10ReadSurfaceRegistry =
      L10ReadSurfaceRegistry.default(),
  ) {}

  async read(request: L10ReadRequest): Promise<L10RunLineageReadResult> {
    const validation = validateL10ReadRequest(request, this.registry);
    if (!validation.ok || !validation.surface) {
      return { ok: false, violations: validation.violations, rows: [] };
    }
    const surface = validation.surface;

    if (!surface.allowed_read_modes.includes(L10ReadMode.LINEAGE_VIEW)) {
      return {
        ok: false,
        violations: [v(
          L10PersistenceViolationCode.READ_MODE_ILLEGAL_FOR_SURFACE,
          `${surface.read_surface_id} is not a LINEAGE_VIEW surface.`,
        )],
        rows: [],
      };
    }

    const rows = await this.backend.readLineage(surface, request);
    const violations: L10PersistenceViolation[] = [];

    for (const r of rows) {
      // §10.8.8.4 — repair-view rows must carry a corrected_run link
      // and reason codes, or the row is masquerading as clean live.
      if (r.corrected_compute_run_id !== null) {
        if (r.reason_codes.length === 0) {
          violations.push(v(
            L10PersistenceViolationCode.REPAIR_WITHOUT_REASON,
            `Lineage ${r.lineage_id} declares corrected_compute_run_id ` +
              `but has no reason_codes.`,
          ));
        }
        if (r.parent_compute_run_id === null) {
          violations.push(v(
            L10PersistenceViolationCode.REPAIR_WITHOUT_PARENT_LINEAGE,
            `Lineage ${r.lineage_id} declares correction without ` +
              `parent_compute_run_id.`,
          ));
        }
      }
      if (!r.replay_hash) {
        violations.push(v(
          L10PersistenceViolationCode.REPLAY_HASH_MISSING,
          `Lineage ${r.lineage_id} missing replay_hash.`,
        ));
      }
    }
    return { ok: violations.length === 0, violations, rows };
  }

  async readOrThrow(
    request: L10ReadRequest,
  ): Promise<readonly L10RunLineageRow[]> {
    const r = await this.read(request);
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
