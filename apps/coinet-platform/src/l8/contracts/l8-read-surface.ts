/**
 * L8.8 — Read Surface Contracts
 *
 * §8.8.7 — A read surface is not a raw table accessor. It is a
 * governed serving surface that validates consumer class, read mode,
 * scope legality, and reference completeness, then resolves from the
 * authoritative store (or from a governed cache, where declared).
 *
 * Raw ClickHouse, Redis cache, or object-store reads treated as
 * "official current state" are categorically forbidden (§8.8.7.7).
 */

import { L8DurableSurfaceId } from './l8-persistence-surface';

// ── Read surface IDs ────────────────────────────────────────────────────

/**
 * §8.8.7.1 / §8.8.7.2 — The frozen list of governed read surfaces
 * Layer 8 exposes. Every later-layer lookup against L8 truth must
 * hit one of these.
 */
export enum L8ReadSurfaceId {
  // Current
  CURRENT_REGIME_BY_SCOPE = 'l8.read.current_regime_by_scope',
  CURRENT_TRANSITION_BY_SCOPE = 'l8.read.current_transition_by_scope',
  CURRENT_CONFIDENCE_BY_SCOPE = 'l8.read.current_confidence_by_scope',
  CURRENT_MULTIPLIER_BY_SCOPE = 'l8.read.current_multiplier_by_scope',
  CURRENT_REGIME_BY_FAMILY_SCOPE =
    'l8.read.current_regime_by_family_scope',

  // Historical
  REGIME_HISTORY_BY_SCOPE = 'l8.read.regime_history_by_scope',
  TRANSITION_HISTORY_BY_SCOPE = 'l8.read.transition_history_by_scope',
  CONFIDENCE_HISTORY_BY_SCOPE = 'l8.read.confidence_history_by_scope',
  MULTIPLIER_HISTORY_BY_SCOPE = 'l8.read.multiplier_history_by_scope',

  // Evidence
  REGIME_EVIDENCE_BY_SUBJECT = 'l8.read.regime_evidence_by_subject',
  TRANSITION_EVIDENCE_BY_PROFILE =
    'l8.read.transition_evidence_by_profile',
  CONFIDENCE_FACTORS_BY_ASSESSMENT =
    'l8.read.confidence_factors_by_assessment',
  MULTIPLIER_DERIVATION_BY_PROFILE =
    'l8.read.multiplier_derivation_by_profile',

  // Lineage + replay/repair
  REGIME_LINEAGE_BY_RUN = 'l8.read.regime_lineage_by_run',
  REPLAY_VS_LIVE_BY_SUBJECT = 'l8.read.replay_vs_live_by_subject',
  REPAIR_LINEAGE_BY_SUBJECT = 'l8.read.repair_lineage_by_subject',
}

export const ALL_L8_READ_SURFACE_IDS: readonly L8ReadSurfaceId[] =
  Object.values(L8ReadSurfaceId);

export function isL8ReadSurfaceId(x: unknown): x is L8ReadSurfaceId {
  return typeof x === 'string' &&
    ALL_L8_READ_SURFACE_IDS.includes(x as L8ReadSurfaceId);
}

// ── Read modes ──────────────────────────────────────────────────────────

/**
 * §8.8.7.6 — Every read call must declare a mode. Current reads serve
 * from the authoritative current registries; historical reads serve
 * from append-safe historical facts; replay/repair expose reconstruction
 * and forensic paths; `EVIDENCE_VIEW` is the only legal lane for
 * archive-payload access.
 */
export enum L8ReadMode {
  LIVE_CURRENT = 'LIVE_CURRENT',
  LIVE_HISTORICAL = 'LIVE_HISTORICAL',
  REPLAY_HISTORICAL = 'REPLAY_HISTORICAL',
  REPAIR_VIEW = 'REPAIR_VIEW',
  LINEAGE_VIEW = 'LINEAGE_VIEW',
  EVIDENCE_VIEW = 'EVIDENCE_VIEW',
}

export const ALL_L8_READ_MODES: readonly L8ReadMode[] =
  Object.values(L8ReadMode);

export function isL8ReadMode(x: unknown): x is L8ReadMode {
  return typeof x === 'string' &&
    ALL_L8_READ_MODES.includes(x as L8ReadMode);
}

// ── Consumer classes ────────────────────────────────────────────────────

/**
 * §8.8.8.5 — Consumer class declares WHO is reading. Later-layer
 * consumers are not all equal: scoring, scenario, judgment,
 * explanation, and forensic tools have different legality maps that
 * the read-surface validator enforces.
 *
 * `INTERNAL_L8` is the only class that may consume during DAG
 * execution — everyone else must wait for materialized L8 truth.
 */
export enum L8ConsumerClass {
  SCENARIO_WEIGHTER = 'SCENARIO_WEIGHTER',
  DETERMINISTIC_SCORER = 'DETERMINISTIC_SCORER',
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  EXPLANATION_SURFACE = 'EXPLANATION_SURFACE',
  FORENSIC_TOOL = 'FORENSIC_TOOL',
  REPLAY_ADAPTER = 'REPLAY_ADAPTER',
  REPAIR_ADAPTER = 'REPAIR_ADAPTER',
  INTERNAL_L8 = 'INTERNAL_L8',
}

export const ALL_L8_CONSUMER_CLASSES: readonly L8ConsumerClass[] =
  Object.values(L8ConsumerClass);

export function isL8ConsumerClass(x: unknown): x is L8ConsumerClass {
  return typeof x === 'string' &&
    ALL_L8_CONSUMER_CLASSES.includes(x as L8ConsumerClass);
}

// ── Read surface descriptor ─────────────────────────────────────────────

/**
 * §8.8.7 — Frozen descriptor for every read surface. The read-surface
 * registry holds these; the read-surface validator consults them.
 */
export interface L8ReadSurfaceDescriptor {
  readonly surface_id: L8ReadSurfaceId;
  readonly backing_durable_surfaces: readonly L8DurableSurfaceId[];
  readonly allowed_modes: readonly L8ReadMode[];
  readonly allowed_consumers: readonly L8ConsumerClass[];
  readonly resolves_archive_payload: boolean;
  readonly requires_scope: boolean;
  readonly requires_subject: boolean;
  readonly description: string;
}

// ── Read request envelope ───────────────────────────────────────────────

/**
 * §8.8.7.6 / §8.8.8.7 — Every governed read is described by this
 * envelope. The read-surface validator accepts/rejects envelopes;
 * in-memory read services use the same envelope so tests stay
 * deterministic.
 */
export interface L8ReadRequest {
  readonly surface_id: L8ReadSurfaceId;
  readonly mode: L8ReadMode;
  readonly consumer_class: L8ConsumerClass;
  readonly consumer_service: string;
  readonly regime_subject_id: string | null;
  readonly scope_type: string | null;
  readonly scope_id: string | null;
  readonly regime_family: string | null;
  readonly window_from_iso: string | null;
  readonly window_to_iso: string | null;
  readonly compute_run_id: string | null;
  readonly replay_generation_ref: string | null;
  readonly as_of_iso: string | null;
  readonly trace_id: string;

  /**
   * §8.8.8.7 — Declarative guard flags. Callers must declare their
   * intent; the read-surface validator and downstream-consumption
   * validator will reject illegal declarations.
   */
  readonly claims_live_rebuild_from_l6_l7: boolean;
  readonly claims_raw_storage_access: boolean;
  readonly claims_redis_authoritative_read: boolean;
}
