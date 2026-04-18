/**
 * L5.1 Purpose — Master Constitutional Document
 *
 * This file is the machine-readable charter of Layer 5.
 * It encodes the mission, failure signatures, constitutional
 * position, dependency law, and the complete state doctrine
 * that every L5 module must inherit.
 *
 * Every enum, type, and constant exported from this module
 * is constitutional law, not documentation. Later L5 modules
 * that violate these definitions are incorrect by definition.
 */

import { L5StateClass, ALL_STATE_CLASSES } from './state-class';
import { AllowedL5Capability, ALL_CAPABILITIES } from './allowed-capability';
import { ForbiddenL5Action, ALL_FORBIDDEN_ACTIONS } from './forbidden-action';

// ═══════════════════════════════════════════════════════════════════════════════
// §5.1.1 — MISSION
// ═══════════════════════════════════════════════════════════════════════════════

export const L5_MISSION = {
  statement: 'Preserve the structure of truth across time, storage media, failure, replay, and system evolution.',
  qualities: ['durable', 'replayable', 'repairable', 'governable', 'traceable', 'non-collapsing'] as const,
  schemaVersion: 'v1',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// §5.1.2 — FAILURE SIGNATURES
// ═══════════════════════════════════════════════════════════════════════════════

export type FailureSignatureId =
  | 'FAILURE_A' | 'FAILURE_B' | 'FAILURE_C' | 'FAILURE_D'
  | 'FAILURE_E' | 'FAILURE_F' | 'FAILURE_G' | 'FAILURE_H';

export interface FailureSignature {
  readonly id: FailureSignatureId;
  readonly name: string;
  readonly description: string;
  /** State classes most endangered by this failure. */
  readonly endangeredClasses: readonly L5StateClass[];
}

export const FAILURE_SIGNATURES: readonly FailureSignature[] = [
  {
    id: 'FAILURE_A',
    name: 'Redis becomes fake truth',
    description: 'Cache outlives its purpose. Consumers read hot snapshots as authoritative state. Eviction or write race changes belief.',
    endangeredClasses: [L5StateClass.EPHEMERAL_HOT_STATE, L5StateClass.RELATIONAL_AUTHORITY],
  },
  {
    id: 'FAILURE_B',
    name: 'Postgres becomes telemetry landfill',
    description: 'Append-heavy time-series floods relational storage. Operational truth slows and tangles.',
    endangeredClasses: [L5StateClass.RELATIONAL_AUTHORITY, L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY],
  },
  {
    id: 'FAILURE_C',
    name: 'Object storage becomes unqueryable junk drawer',
    description: 'Files exist but nobody knows what they correspond to, which trace created them, or whether they are complete.',
    endangeredClasses: [L5StateClass.IMMUTABLE_ARCHIVE_STATE],
  },
  {
    id: 'FAILURE_D',
    name: 'Replay becomes performative',
    description: 'System claims replayability but cannot reconstruct raw payload, normalized form, authoritative refs, or time-of-belief state.',
    endangeredClasses: [L5StateClass.IMMUTABLE_ARCHIVE_STATE, L5StateClass.RELATIONAL_AUTHORITY],
  },
  {
    id: 'FAILURE_E',
    name: 'Projections become untraceable',
    description: 'ClickHouse rows, Redis windows, and report outputs exist without linkage to the write that produced them.',
    endangeredClasses: [L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY, L5StateClass.EPHEMERAL_HOT_STATE],
  },
  {
    id: 'FAILURE_F',
    name: 'Late data silently corrupts current state',
    description: 'Historical data arrives late and updates current reads without explicit late-data handling or scar.',
    endangeredClasses: [L5StateClass.RELATIONAL_AUTHORITY, L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY],
  },
  {
    id: 'FAILURE_G',
    name: 'Evidence disappears behind summaries',
    description: 'A score, package, or report exists, but underlying evidence path cannot be recovered.',
    endangeredClasses: [L5StateClass.IMMUTABLE_ARCHIVE_STATE],
  },
  {
    id: 'FAILURE_H',
    name: 'Dual authority emerges',
    description: 'The same class of fact becomes authoritatively stored in two places. Often looks fine until divergence.',
    endangeredClasses: [L5StateClass.RELATIONAL_AUTHORITY],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// §5.1.3 — CONSTITUTIONAL POSITION IN THE STACK
// ═══════════════════════════════════════════════════════════════════════════════

export interface LayerDependencyContract {
  readonly layerId: string;
  readonly owns: string;
  readonly l5Relation: 'DEPENDENCY' | 'SUBORDINATE' | 'PEER';
  readonly l5MayOverride: boolean;
}

export const LAYER_DEPENDENCIES: readonly LayerDependencyContract[] = [
  { layerId: 'L3', owns: 'canonical identity, confidence rights, metric validity, reconciliation, mutation control', l5Relation: 'DEPENDENCY', l5MayOverride: false },
  { layerId: 'L4', owns: 'graph legality, edge admissibility, temporal graph semantics, propagation, context packages', l5Relation: 'DEPENDENCY', l5MayOverride: false },
  { layerId: 'L5', owns: 'persistence, routing, materialization, replay, repair, evidence preservation', l5Relation: 'PEER', l5MayOverride: false },
];

/**
 * L5's constitutional boundary in one assertion:
 * L5 owns persistence mechanics. It does not own truth semantics.
 */
export const L5_BOUNDARY_ASSERTION = 'L5 stores, routes, replays, repairs, materializes, and preserves. It does not define canonical identity, confidence law, metric validity, or graph semantics.' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// §5.1.6 — CORE STATE DOCTRINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface StateDoctrineRule {
  readonly ruleId: string;
  readonly law: string;
}

export const STATE_DOCTRINE: readonly StateDoctrineRule[] = [
  { ruleId: 'DOCTRINE-1', law: 'One class of state, one legal home. Every class must have one authoritative home. It may be projected elsewhere. It may not have multiple authorities.' },
  { ruleId: 'DOCTRINE-2', law: 'Projection does not equal authority. Appearance in Redis, ClickHouse, materialized view, or report artifact does not make a datum authoritative.' },
  { ruleId: 'DOCTRINE-3', law: 'Loss semantics are class-specific. Redis loss degrades speed only. ClickHouse loss degrades history. Postgres loss blocks authority progress. Archive loss blocks evidence completeness.' },
  { ruleId: 'DOCTRINE-4', law: 'Evidence and state are not the same object. Reports, scores, and manifests may reference evidence. The evidence object itself remains immutable and separately governed.' },
  { ruleId: 'DOCTRINE-5', law: 'Historical state must remain reconstructable. L5 must support reconstruction of what was known, when, under what schema, from what evidence, with what projection status, and what later changed.' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATE CHARTER OBJECT
// ═══════════════════════════════════════════════════════════════════════════════

export const L5_PURPOSE_CHARTER = {
  mission: L5_MISSION,
  stateClasses: ALL_STATE_CLASSES,
  allowedCapabilities: ALL_CAPABILITIES,
  forbiddenActions: ALL_FORBIDDEN_ACTIONS,
  failureSignatures: FAILURE_SIGNATURES,
  layerDependencies: LAYER_DEPENDENCIES,
  boundaryAssertion: L5_BOUNDARY_ASSERTION,
  stateDoctrine: STATE_DOCTRINE,
  schemaVersion: 'v1',
} as const;
