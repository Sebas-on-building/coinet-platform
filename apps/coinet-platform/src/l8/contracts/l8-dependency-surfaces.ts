/**
 * L8.1 — Dependency Surface Contract
 *
 * §8.1.3 — Hard constitutional dependency law. §8.1.3.8 — Every
 * registered dependency surface declares its source layer, authority
 * class, usability, freshness, replay legality, and scope constraints.
 *
 * §8.1.3.6 — L7 dependency surfaces are always stable-handoff only. L8
 * consumes L7's public validation/contradiction/confidence/restriction
 * surfaces; L8 may NOT depend on L7 internals.
 */

import {
  L8DependencyLayer,
  L8DependencySurfaceClass,
  type L8DependencyUsability,
} from './l8-constitutional-types';

export interface L8DependencySurfaceDescriptor {
  readonly surfaceId: string;
  readonly layer: L8DependencyLayer;
  readonly surfaceClass: L8DependencySurfaceClass;
  readonly authorityClass:
    | 'CANONICAL'
    | 'DERIVED'
    | 'PROJECTION'
    | 'CONTEXTUAL'
    | 'EVIDENCE'
    | 'STABLE_HANDOFF';
  readonly freshnessExpectation:
    | 'REAL_TIME'
    | 'NEAR_REAL_TIME'
    | 'PERIODIC'
    | 'ON_DEMAND';
  readonly replayCompatible: boolean;
  readonly restrictionAware: boolean;
  readonly usableFor: readonly L8DependencyUsability[];
  readonly required: boolean;
  readonly description: string;
}

export const L8_DEPENDENCY_SURFACES: readonly L8DependencySurfaceDescriptor[] = [
  // ── L3 dependency surfaces (§8.1.3.2) ──
  {
    surfaceId: 'l3:canonical_objects',
    layer: L8DependencyLayer.L3,
    surfaceClass: L8DependencySurfaceClass.L3_CANONICAL_OBJECT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 canonical identity surface — identity safety only',
  },
  {
    surfaceId: 'l3:metric_contracts',
    layer: L8DependencyLayer.L3,
    surfaceClass: L8DependencySurfaceClass.L3_METRIC_CONTRACT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 metric contracts — units, precision, valid ranges',
  },
  {
    surfaceId: 'l3:confidence_scores',
    layer: L8DependencyLayer.L3,
    surfaceClass: L8DependencySurfaceClass.L3_CONFIDENCE_SCORE,
    authorityClass: 'DERIVED',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['CONFIDENCE_INPUT', 'EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: true,
    description: 'L3 source- and field-level confidence scores',
  },
  {
    surfaceId: 'l3:reconciliation_outcomes',
    layer: L8DependencyLayer.L3,
    surfaceClass: L8DependencySurfaceClass.L3_RECONCILIATION_OUTCOME,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: false,
    description: 'L3 reconciliation outcomes across providers',
  },

  // ── L4 dependency surfaces (§8.1.3.3) ──
  {
    surfaceId: 'l4:graph_relations',
    layer: L8DependencyLayer.L4,
    surfaceClass: L8DependencySurfaceClass.L4_GRAPH_RELATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REGIME_SIGNAL', 'CONTEXT_ONLY', 'TRANSITION_SIGNAL'],
    required: false,
    description: 'L4 graph relations, weights, and temporal state',
  },
  {
    surfaceId: 'l4:context_packages',
    layer: L8DependencyLayer.L4,
    surfaceClass: L8DependencySurfaceClass.L4_GRAPH_CONTEXT_PACKAGE,
    authorityClass: 'CONTEXTUAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REGIME_SIGNAL', 'CONTEXT_ONLY', 'TRANSITION_SIGNAL'],
    required: false,
    description: 'L4 graph-derived context packages',
  },
  {
    surfaceId: 'l4:temporal_graph_state',
    layer: L8DependencyLayer.L4,
    surfaceClass: L8DependencySurfaceClass.L4_TEMPORAL_GRAPH_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY', 'REGIME_SIGNAL'],
    required: false,
    description: 'L4 temporal graph state — time-indexed graph snapshots',
  },

  // ── L5 dependency surfaces (§8.1.3.4) ──
  {
    surfaceId: 'l5:write_coordination',
    layer: L8DependencyLayer.L5,
    surfaceClass: L8DependencySurfaceClass.L5_STORAGE_WRITE_COORDINATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['PERSISTENCE_PATH'],
    required: true,
    description: 'L5 governed write coordination — only persistence path',
  },
  {
    surfaceId: 'l5:read_resolution',
    layer: L8DependencyLayer.L5,
    surfaceClass: L8DependencySurfaceClass.L5_STORAGE_READ_RESOLUTION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REGIME_SIGNAL', 'TRANSITION_SIGNAL', 'CONTEXT_ONLY'],
    required: true,
    description: 'L5 governed read resolution',
  },
  {
    surfaceId: 'l5:replay',
    layer: L8DependencyLayer.L5,
    surfaceClass: L8DependencySurfaceClass.L5_STORAGE_REPLAY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REPLAY_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 replay path for historical reconstruction',
  },
  {
    surfaceId: 'l5:repair',
    layer: L8DependencyLayer.L5,
    surfaceClass: L8DependencySurfaceClass.L5_STORAGE_REPAIR,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REPAIR_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 governed repair path',
  },

  // ── L6 dependency surfaces (§8.1.3.5) ──
  {
    surfaceId: 'l6:current_feature_state',
    layer: L8DependencyLayer.L6,
    surfaceClass: L8DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REGIME_SIGNAL', 'TRANSITION_SIGNAL', 'MULTIPLIER_INPUT'],
    required: true,
    description: 'L6 current authoritative feature state — regime signal input',
  },
  {
    surfaceId: 'l6:feature_history',
    layer: L8DependencyLayer.L6,
    surfaceClass: L8DependencySurfaceClass.L6_FEATURE_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REGIME_SIGNAL', 'TRANSITION_SIGNAL', 'EVIDENCE_ONLY', 'REPLAY_REFERENCE'],
    required: true,
    description: 'L6 time-indexed feature history — regime trend input',
  },
  {
    surfaceId: 'l6:event_instance',
    layer: L8DependencyLayer.L6,
    surfaceClass: L8DependencySurfaceClass.L6_EVENT_INSTANCE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REGIME_SIGNAL', 'TRANSITION_SIGNAL'],
    required: true,
    description: 'L6 event instance primitives — regime transition input',
  },
  {
    surfaceId: 'l6:event_history',
    layer: L8DependencyLayer.L6,
    surfaceClass: L8DependencySurfaceClass.L6_EVENT_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['REGIME_SIGNAL', 'TRANSITION_SIGNAL', 'EVIDENCE_ONLY', 'REPLAY_REFERENCE'],
    required: true,
    description: 'L6 time-indexed event history',
  },
  {
    surfaceId: 'l6:evidence_pack',
    layer: L8DependencyLayer.L6,
    surfaceClass: L8DependencySurfaceClass.L6_EVIDENCE_PACK,
    authorityClass: 'EVIDENCE',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    usableFor: ['EVIDENCE_ONLY'],
    required: false,
    description: 'L6 evidence packs for regime signal primitives',
  },

  // ── L7 dependency surfaces (§8.1.3.6) — stable handoff surfaces only ──
  {
    surfaceId: 'l7:validation_assessment',
    layer: L8DependencyLayer.L7,
    surfaceClass: L8DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    usableFor: ['REGIME_SIGNAL', 'MULTIPLIER_INPUT', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 validation assessment — truth-tested subject state (stable handoff)',
  },
  {
    surfaceId: 'l7:contradiction_bundle',
    layer: L8DependencyLayer.L7,
    surfaceClass: L8DependencySurfaceClass.L7_CONTRADICTION_BUNDLE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    usableFor: ['MULTIPLIER_INPUT', 'CONFIDENCE_INPUT', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L7 contradiction bundle — posture attached to validated claims (stable handoff)',
  },
  {
    surfaceId: 'l7:confidence_assessment',
    layer: L8DependencyLayer.L7,
    surfaceClass: L8DependencySurfaceClass.L7_CONFIDENCE_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    usableFor: ['CONFIDENCE_INPUT', 'MULTIPLIER_INPUT'],
    required: true,
    description: 'L7 confidence assessment — justified reliance (stable handoff)',
  },
  {
    surfaceId: 'l7:restriction_profile',
    layer: L8DependencyLayer.L7,
    surfaceClass: L8DependencySurfaceClass.L7_RESTRICTION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    usableFor: ['MULTIPLIER_INPUT', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 restriction profile — downstream usage rights (stable handoff, binding)',
  },
  {
    surfaceId: 'l7:validation_evidence_read_surface',
    layer: L8DependencyLayer.L7,
    surfaceClass: L8DependencySurfaceClass.L7_VALIDATION_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE'],
    required: false,
    description: 'L7 evidence-backed validation read surface (stable handoff)',
  },
];

export function getL8DependencySurface(
  surfaceId: string,
): L8DependencySurfaceDescriptor | undefined {
  return L8_DEPENDENCY_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL8RegisteredDependency(surfaceId: string): boolean {
  return L8_DEPENDENCY_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function getL8SurfacesForLayer(
  layer: L8DependencyLayer,
): readonly L8DependencySurfaceDescriptor[] {
  return L8_DEPENDENCY_SURFACES.filter(s => s.layer === layer);
}

export function getL8SurfacesUsableFor(
  usage: L8DependencyUsability,
): readonly L8DependencySurfaceDescriptor[] {
  return L8_DEPENDENCY_SURFACES.filter(s => s.usableFor.includes(usage));
}

export function isL8UsableFor(surfaceId: string, usage: L8DependencyUsability): boolean {
  const s = getL8DependencySurface(surfaceId);
  if (!s) return false;
  return s.usableFor.includes(usage);
}

export function getL8RequiredDependencySurfaces(): readonly L8DependencySurfaceDescriptor[] {
  return L8_DEPENDENCY_SURFACES.filter(s => s.required);
}

export function getL8RestrictionAwareSurfaces(): readonly L8DependencySurfaceDescriptor[] {
  return L8_DEPENDENCY_SURFACES.filter(s => s.restrictionAware);
}
