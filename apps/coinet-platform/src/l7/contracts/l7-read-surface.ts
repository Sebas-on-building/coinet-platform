/**
 * L7.7 — Read Surface Contracts
 *
 * §7.7.6 — A read surface is not a raw table accessor. It is a governed
 * serving surface that validates consumer class, mode, scope legality,
 * and reference completeness, then resolves from the authoritative store.
 *
 * Raw ClickHouse, Redis cache, or object-store reads as "official current
 * state" are categorically forbidden (§7.7.6.8).
 */

import { L7DurableSurfaceId } from './l7-persistence-surface';

// ── Read surface IDs ────────────────────────────────────────────────────

/**
 * §7.7.6.1 — The frozen list of governed read surfaces Layer 7 exposes.
 * Every later-layer lookup against L7 truth must hit one of these.
 */
export enum L7ReadSurfaceId {
  CURRENT_VALIDATION_BY_SCOPE = 'l7.read.current_validation_by_scope',
  CURRENT_CONTRADICTION_BY_SCOPE = 'l7.read.current_contradiction_by_scope',
  CURRENT_CONFIDENCE_BY_SCOPE = 'l7.read.current_confidence_by_scope',
  CURRENT_RESTRICTION_BY_SCOPE = 'l7.read.current_restriction_by_scope',

  VALIDATION_HISTORY_BY_SCOPE = 'l7.read.validation_history_by_scope',
  CONTRADICTION_HISTORY_BY_SCOPE = 'l7.read.contradiction_history_by_scope',
  CONFIDENCE_HISTORY_BY_SCOPE = 'l7.read.confidence_history_by_scope',
  RESTRICTION_HISTORY_BY_SCOPE = 'l7.read.restriction_history_by_scope',

  VALIDATION_EVIDENCE_BY_SUBJECT = 'l7.read.validation_evidence_by_subject',
  CONTRADICTION_EVIDENCE_BY_BUNDLE = 'l7.read.contradiction_evidence_by_bundle',
  CONFIDENCE_RATIONALE_BY_ASSESSMENT = 'l7.read.confidence_rationale_by_assessment',
  RESTRICTION_RATIONALE_BY_PROFILE = 'l7.read.restriction_rationale_by_profile',

  VALIDATION_LINEAGE_BY_RUN = 'l7.read.validation_lineage_by_run',
}

export const ALL_L7_READ_SURFACE_IDS: readonly L7ReadSurfaceId[] =
  Object.values(L7ReadSurfaceId);

export function isL7ReadSurfaceId(x: unknown): x is L7ReadSurfaceId {
  return typeof x === 'string' && ALL_L7_READ_SURFACE_IDS.includes(x as L7ReadSurfaceId);
}

// ── Read modes ──────────────────────────────────────────────────────────

/**
 * §7.7.6.3 — Every read call must declare a mode. Current reads serve
 * from the authoritative current registries; historical reads serve
 * from append-safe historical facts; replay/repair expose reconstruction
 * and forensic paths; `FORENSIC_EVIDENCE_VIEW` is the only legal lane
 * for archive-payload access.
 */
export enum L7ReadMode {
  CURRENT_LIVE = 'CURRENT_LIVE',
  HISTORICAL_WINDOW = 'HISTORICAL_WINDOW',
  REPLAY_RECONSTRUCTION = 'REPLAY_RECONSTRUCTION',
  REPAIR_INSPECTION = 'REPAIR_INSPECTION',
  FORENSIC_EVIDENCE_VIEW = 'FORENSIC_EVIDENCE_VIEW',
}

export const ALL_L7_READ_MODES: readonly L7ReadMode[] = Object.values(L7ReadMode);

export function isL7ReadMode(x: unknown): x is L7ReadMode {
  return typeof x === 'string' && ALL_L7_READ_MODES.includes(x as L7ReadMode);
}

// ── Consumer classes ────────────────────────────────────────────────────

/**
 * §7.7.7 — Consumer class declares WHO is reading. Later-layer consumers
 * are not all equal: regime engines, scoring engines, judgment engines,
 * explanation surfaces, and forensic tools have different legality maps
 * that the read-surface validator enforces.
 */
export enum L7ConsumerClass {
  REGIME_ENGINE = 'REGIME_ENGINE',
  SCENARIO_WEIGHTER = 'SCENARIO_WEIGHTER',
  DETERMINISTIC_SCORER = 'DETERMINISTIC_SCORER',
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  EXPLANATION_SURFACE = 'EXPLANATION_SURFACE',
  FORENSIC_TOOL = 'FORENSIC_TOOL',
  REPLAY_ADAPTER = 'REPLAY_ADAPTER',
  REPAIR_ADAPTER = 'REPAIR_ADAPTER',
  INTERNAL_L7 = 'INTERNAL_L7',
}

export const ALL_L7_CONSUMER_CLASSES: readonly L7ConsumerClass[] =
  Object.values(L7ConsumerClass);

export function isL7ConsumerClass(x: unknown): x is L7ConsumerClass {
  return typeof x === 'string' && ALL_L7_CONSUMER_CLASSES.includes(x as L7ConsumerClass);
}

// ── Read surface descriptor ─────────────────────────────────────────────

/**
 * §7.7.6 — Frozen descriptor for every read surface. The read-surface
 * registry holds these; the read-surface validator consults them.
 */
export interface L7ReadSurfaceDescriptor {
  readonly surface_id: L7ReadSurfaceId;
  readonly backing_durable_surfaces: readonly L7DurableSurfaceId[];
  readonly allowed_modes: readonly L7ReadMode[];
  readonly allowed_consumers: readonly L7ConsumerClass[];
  readonly resolves_archive_payload: boolean;
  readonly requires_scope: boolean;
  readonly description: string;
}

// ── Read request envelope ──────────────────────────────────────────────

/**
 * §7.7.6.9 — Every governed read is described by this envelope. The
 * read-surface validator accepts/rejects envelopes; in-memory read
 * implementations use the same envelope so tests stay deterministic.
 */
export interface L7ReadRequest {
  readonly surface_id: L7ReadSurfaceId;
  readonly mode: L7ReadMode;
  readonly consumer_class: L7ConsumerClass;
  readonly consumer_service: string;
  readonly subject_id: string | null;
  readonly scope_type: string | null;
  readonly scope_id: string | null;
  readonly window_from_iso: string | null;
  readonly window_to_iso: string | null;
  readonly compute_run_id: string | null;
  readonly replay_generation_ref: string | null;
  readonly as_of_iso: string | null;
  readonly trace_id: string;
  readonly claims_revalidation_from_l6: boolean;
  readonly claims_raw_storage_access: boolean;
  readonly claims_redis_authoritative_read: boolean;
}
