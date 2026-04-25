/**
 * L10.8 — Historical Surface Validator
 *
 * §10.8.4 / INV-10.8-C — Checks that historical writes are append-
 * safe, correction-aware, replay-identity-bearing, and lineage-linked.
 * A historical write never mutates current truth, never silently
 * overwrites a prior row, and never emits without replay identity.
 */

import {
  L10MaterializationMode,
  L10PersistenceClass,
  L10PersistenceEnvelope,
} from '../contracts/l10-persistence-surface';
import { L10DurableSurfaceRegistry } from '../registry/l10-durable-surface.registry';
import {
  L10PersistenceViolation,
  L10PersistenceViolationCode,
  L10PersistenceViolationTier,
  l10PersistenceViolationTier,
} from './l10-persistence-violation-codes';

/**
 * §10.8.4.4 — Correction-semantics flags attached to a historical
 * correction/repair write. Distinct from a plain LIVE_HISTORICAL_APPEND
 * write, which requires none of these.
 */
export interface L10HistoricalCorrectionSemantics {
  readonly is_correction: boolean;
  readonly parent_fact_id: string | null;
  readonly reason: string | null;
  readonly supersedes_replay_hash: string | null;
}

export interface L10HistoricalWriteInput {
  readonly envelope: L10PersistenceEnvelope;
  readonly correction: L10HistoricalCorrectionSemantics | null;
  readonly append_safe: boolean;
  readonly destructive_overwrite_attempted: boolean;
}

export interface L10HistoricalValidationResult {
  readonly ok: boolean;
  readonly violations: readonly L10PersistenceViolation[];
}

export function validateL10HistoricalWrite(
  input: L10HistoricalWriteInput,
  registry: L10DurableSurfaceRegistry = L10DurableSurfaceRegistry.default(),
): L10HistoricalValidationResult {
  const violations: L10PersistenceViolation[] = [];
  const env = input.envelope;

  const surface = registry.get(env.durable_surface_id);
  if (!surface) {
    violations.push(v(
      L10PersistenceViolationCode.PERSIST_SURFACE_UNREGISTERED,
      `Historical write targets unknown surface ` +
        `${env.durable_surface_id}.`,
    ));
    return { ok: false, violations };
  }

  if (
    surface.persistence_class !== L10PersistenceClass.HISTORICAL_FACT_SURFACE
  ) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_MUTATES_CURRENT,
      `Historical validator invoked on non-historical surface ` +
        `${surface.durable_surface_id}.`,
    ));
  }

  // §10.8.4.3 — destructive overwrite is never allowed.
  if (input.destructive_overwrite_attempted) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
      `Destructive overwrite attempted on ${surface.durable_surface_id}.`,
    ));
  }

  // §10.8.4.3 / §10.8.4.5 — replay identity required on every
  // historical fact.
  if (!env.replay_hash) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_REPLAY_IDENTITY_MISSING,
      `Historical write to ${surface.durable_surface_id} missing ` +
        `replay_hash.`,
    ));
  }
  if (env.lineage_refs.length === 0) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_LINEAGE_LINK_MISSING,
      `Historical write to ${surface.durable_surface_id} missing ` +
        `lineage_refs.`,
    ));
  }

  // §10.8.4.3 — mode must be one of the append-safe modes.
  if (
    env.materialization_mode !==
      L10MaterializationMode.LIVE_HISTORICAL_APPEND &&
    env.materialization_mode !== L10MaterializationMode.REPLAY_HISTORICAL &&
    env.materialization_mode !== L10MaterializationMode.REPAIR_REBUILD &&
    env.materialization_mode !==
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION
  ) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_MODE_MISMATCH,
      `Historical write to ${surface.durable_surface_id} uses illegal ` +
        `mode ${env.materialization_mode}.`,
    ));
  }
  if (env.materialization_mode === L10MaterializationMode.LIVE_CURRENT) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_MUTATES_CURRENT,
      `Historical write to ${surface.durable_surface_id} used ` +
        `LIVE_CURRENT mode.`,
    ));
  }

  // §10.8.4.4 — correction-aware law.
  const isCorrectionMode =
    env.materialization_mode === L10MaterializationMode.REPAIR_REBUILD ||
    env.materialization_mode ===
      L10MaterializationMode.LATE_DATA_REMATERIALIZATION;
  if (isCorrectionMode) {
    if (
      input.correction === null ||
      !input.correction.is_correction ||
      !input.correction.parent_fact_id ||
      !input.correction.reason
    ) {
      violations.push(v(
        L10PersistenceViolationCode.HIST_CORRECTION_SEMANTICS_MISSING,
        `Correction mode ${env.materialization_mode} without ` +
          `correction semantics on ${surface.durable_surface_id}.`,
      ));
    }
  }

  if (!input.append_safe) {
    violations.push(v(
      L10PersistenceViolationCode.HIST_DESTRUCTIVE_OVERWRITE,
      `Historical write to ${surface.durable_surface_id} is not ` +
        `declared append_safe=true.`,
    ));
  }

  return { ok: violations.length === 0, violations };
}

function v(
  code: L10PersistenceViolationCode,
  detail: string,
  offending_refs?: readonly string[],
): L10PersistenceViolation {
  return {
    code,
    tier: l10PersistenceViolationTier(code) as L10PersistenceViolationTier,
    detail,
    offending_refs,
  };
}
