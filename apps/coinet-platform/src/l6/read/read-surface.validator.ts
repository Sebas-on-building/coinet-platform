/**
 * L6.7 — Read-Surface Validator
 *
 * §6.7.6.11 — Read APIs must distinguish:
 *   - current authoritative state
 *   - historical state
 *   - replay-tagged state
 *   - repaired/rematerialized state
 *
 * §6.7.7.4 — Later layers may not consume raw historical tables directly
 * as their primary read path, may not treat Redis caches as truth, and may
 * not recompute primitives ad hoc except in replay or repair modes.
 */

import {
  L6PersistenceViolationCode,
} from '../contracts/l6-persistence-surface';
import {
  L6ConsumerClass,
  L6ReadMode,
  L6ReadSurfaceId,
  L6HistoricalSurfaceClass,
  PROHIBITED_RAW_STORAGE_SURFACES,
} from '../contracts/l6-read-surface';

export interface L6ReadSurfaceViolation {
  readonly code: L6PersistenceViolationCode;
  readonly field: string;
  readonly detail: string;
}

export interface L6ReadSurfaceValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L6ReadSurfaceViolation[];
}

export interface L6ReadSurfaceInvocation {
  readonly surface: L6ReadSurfaceId;
  readonly mode: L6ReadMode;
  readonly consumer_class: L6ConsumerClass;
  readonly raw_storage_surface_hint: string | null;
  readonly ad_hoc_recompute_requested: boolean;
}

/**
 * Legal consumer → read-mode pairs. Later layers may only consume
 * current/historical/evidence/lineage surfaces — never via raw storage.
 */
const LEGAL_MODES_BY_CONSUMER: Readonly<Record<L6ConsumerClass, readonly L6ReadMode[]>> = Object.freeze({
  [L6ConsumerClass.LATER_LAYER]: [
    L6ReadMode.CURRENT_AUTHORITATIVE,
    L6ReadMode.HISTORICAL,
    L6ReadMode.EVIDENCE_LOOKUP,
    L6ReadMode.LINEAGE_LOOKUP,
  ],
  [L6ConsumerClass.LAYER_6_INTERNAL]: [
    L6ReadMode.CURRENT_AUTHORITATIVE,
    L6ReadMode.HISTORICAL,
    L6ReadMode.REPLAY_TAGGED,
    L6ReadMode.REPAIRED_REMATERIALIZED,
    L6ReadMode.EVIDENCE_LOOKUP,
    L6ReadMode.LINEAGE_LOOKUP,
  ],
  [L6ConsumerClass.GOVERNED_AUDIT]: [
    L6ReadMode.CURRENT_AUTHORITATIVE,
    L6ReadMode.HISTORICAL,
    L6ReadMode.REPLAY_TAGGED,
    L6ReadMode.REPAIRED_REMATERIALIZED,
    L6ReadMode.EVIDENCE_LOOKUP,
    L6ReadMode.LINEAGE_LOOKUP,
  ],
  [L6ConsumerClass.REPLAY_RUNNER]: [
    L6ReadMode.HISTORICAL,
    L6ReadMode.REPLAY_TAGGED,
    L6ReadMode.EVIDENCE_LOOKUP,
    L6ReadMode.LINEAGE_LOOKUP,
  ],
  [L6ConsumerClass.REPAIR_RUNNER]: [
    L6ReadMode.HISTORICAL,
    L6ReadMode.REPAIRED_REMATERIALIZED,
    L6ReadMode.EVIDENCE_LOOKUP,
    L6ReadMode.LINEAGE_LOOKUP,
  ],
});

export class ReadSurfaceValidator {
  validate(inv: L6ReadSurfaceInvocation): L6ReadSurfaceValidationResult {
    const v: L6ReadSurfaceViolation[] = [];

    if (inv.raw_storage_surface_hint &&
        PROHIBITED_RAW_STORAGE_SURFACES.includes(inv.raw_storage_surface_hint)) {
      v.push({
        code: L6PersistenceViolationCode.RAW_STORAGE_CONSUMPTION,
        field: 'raw_storage_surface_hint',
        detail: `consumer read against raw storage ${inv.raw_storage_surface_hint} — must use governed L6 read surface`,
      });
    }

    if (inv.ad_hoc_recompute_requested &&
        inv.consumer_class !== L6ConsumerClass.REPLAY_RUNNER &&
        inv.consumer_class !== L6ConsumerClass.REPAIR_RUNNER) {
      v.push({
        code: L6PersistenceViolationCode.AD_HOC_RECOMPUTE,
        field: 'ad_hoc_recompute_requested',
        detail: `consumer ${inv.consumer_class} may not request ad-hoc primitive recompute`,
      });
    }

    const legalModes = LEGAL_MODES_BY_CONSUMER[inv.consumer_class];
    if (!legalModes.includes(inv.mode)) {
      v.push({
        code: L6PersistenceViolationCode.AMBIGUOUS_READ_MODE,
        field: 'mode',
        detail: `consumer ${inv.consumer_class} may not read in mode ${inv.mode}`,
      });
    }

    return { ok: v.length === 0, violations: v };
  }

  /**
   * §6.7.6.11 — Every historical row must carry an unambiguous surface class.
   */
  validateHistoricalRow(row: { surface_class?: L6HistoricalSurfaceClass }): L6ReadSurfaceValidationResult {
    const v: L6ReadSurfaceViolation[] = [];
    if (!row.surface_class) {
      v.push({
        code: L6PersistenceViolationCode.AMBIGUOUS_READ_MODE,
        field: 'surface_class',
        detail: 'historical row missing surface_class tag',
      });
    }
    return { ok: v.length === 0, violations: v };
  }
}
