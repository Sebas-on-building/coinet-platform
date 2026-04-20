/**
 * L9.8 — Historical Surface Validator
 *
 * §9.8.4 / INV-9.8-C — Checks that historical writes are append-safe,
 * correction-aware, replay-identity-bearing, and lineage-linked.
 * A historical write never mutates current truth, never silently
 * overwrites a prior row, and never emits without replay identity.
 */

import {
  L9MaterializationMode,
  L9PersistenceClass,
  L9PersistenceEnvelope,
} from '../contracts/l9-persistence-surface';
import { L9DurableSurfaceRegistry } from '../registry/l9-durable-surface.registry';
import {
  L9PersistenceViolation,
  L9PersistenceViolationCode,
  L9PersistenceViolationTier,
  l9PersistenceViolationTier,
} from './l9-persistence-violation-codes';

/**
 * §9.8.4.4 — Correction-semantics flags attached to a historical
 * correction/repair write. Distinct from a plain LIVE_HISTORICAL_APPEND
 * write, which requires none of these.
 */
export interface L9HistoricalCorrectionSemantics {
  readonly is_correction: boolean;
  readonly parent_fact_id: string | null;
  readonly reason: string | null;
  readonly supersedes_replay_hash: string | null;
}

export interface L9HistoricalWriteInput {
  readonly envelope: L9PersistenceEnvelope;
  readonly correction: L9HistoricalCorrectionSemantics | null;
  /** §9.8.4.3 — true iff the writer claims this is an append-safe write. */
  readonly append_safe: boolean;
  /** §9.8.4.4 — true iff the write is a destructive overwrite attempt. */
  readonly destructive_overwrite_attempted: boolean;
}

export interface L9HistoricalValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L9PersistenceViolation[];
}

export function validateL9HistoricalWrite(
  input: L9HistoricalWriteInput,
  registry: L9DurableSurfaceRegistry = L9DurableSurfaceRegistry.default(),
): L9HistoricalValidationResult {
  const violations: L9PersistenceViolation[] = [];
  const env = input.envelope;

  const surface = registry.get(env.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L9PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Historical write targets unknown surface ` +
        `${env.durable_surface_id}.`,
    ));
    return { ok: false, violations };
  }

  if (surface.persistence_class !== L9PersistenceClass.HISTORICAL_FACT_SURFACE) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_MUTATES_CURRENT,
      `Historical validator invoked on non-historical surface ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  // §9.8.4.3 — destructive overwrite is never allowed.
  if (input.destructive_overwrite_attempted) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
      `Destructive overwrite attempted on ${surface.durable_surface_id}.`,
    ));
  }

  // §9.8.4.3 / §9.8.4.5 — replay identity required on every
  // historical fact.
  if (!env.replay_hash) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING,
      `Historical write to ${surface.durable_surface_id} missing ` +
        `replay_hash.`,
    ));
  }
  if (env.lineage_refs.length === 0) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_LINEAGE_LINK_MISSING,
      `Historical write to ${surface.durable_surface_id} missing ` +
        `lineage_refs.`,
    ));
  }

  // §9.8.4.3 — mode must be one of the append-safe modes.
  if (
    env.materialization_mode !== L9MaterializationMode.LIVE_HISTORICAL_APPEND &&
    env.materialization_mode !== L9MaterializationMode.REPLAY_HISTORICAL &&
    env.materialization_mode !== L9MaterializationMode.REPAIR_REBUILD &&
    env.materialization_mode !== L9MaterializationMode.LATE_DATA_REMATERIALIZATION
  ) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_MODE_MISMATCH,
      `Historical write to ${surface.durable_surface_id} uses illegal ` +
        `mode ${env.materialization_mode}.`,
    ));
  }
  if (env.materialization_mode === L9MaterializationMode.LIVE_CURRENT) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_MUTATES_CURRENT,
      `Historical write to ${surface.durable_surface_id} used ` +
        `LIVE_CURRENT mode.`,
    ));
  }

  // §9.8.4.4 — correction-aware law.
  const isCorrectionMode =
    env.materialization_mode === L9MaterializationMode.REPAIR_REBUILD ||
    env.materialization_mode === L9MaterializationMode.LATE_DATA_REMATERIALIZATION;
  if (isCorrectionMode) {
    if (
      input.correction === null ||
      !input.correction.is_correction ||
      !input.correction.parent_fact_id ||
      !input.correction.reason
    ) {
      violations.push(v(
        L9PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING,
        `Correction mode ${env.materialization_mode} without ` +
          `correction semantics on ${surface.durable_surface_id}.`,
      ));
    }
  }

  if (!input.append_safe) {
    violations.push(v(
      L9PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
      `Historical write to ${surface.durable_surface_id} is not ` +
        `declared append_safe=true.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L9PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L9PersistenceViolation {
  return {
    code,
    tier: l9PersistenceViolationTier(code) as L9PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
