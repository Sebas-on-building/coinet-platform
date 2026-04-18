/**
 * L7.1 — Dependency Surface Contract
 *
 * §7.1.4 — Hard constitutional dependency law. §7.1.4.6 — Every registered
 * dependency surface declares its source layer, authority class, usability,
 * freshness, replay legality, and scope constraints.
 */

import {
  L7DependencyLayer,
  L7DependencySurfaceClass,
  type L7DependencyUsability,
} from './l7-constitutional-types';

export interface DependencySurfaceDescriptor {
  readonly surfaceId: string;
  readonly layer: L7DependencyLayer;
  readonly surfaceClass: L7DependencySurfaceClass;
  readonly authorityClass: 'CANONICAL' | 'DERIVED' | 'PROJECTION' | 'CONTEXTUAL' | 'EVIDENCE';
  readonly freshnessExpectation: 'REAL_TIME' | 'NEAR_REAL_TIME' | 'PERIODIC' | 'ON_DEMAND';
  readonly replayCompatible: boolean;
  readonly usableFor: readonly L7DependencyUsability[];
  readonly required: boolean;
  readonly description: string;
}

export const L7_DEPENDENCY_SURFACES: readonly DependencySurfaceDescriptor[] = [
  // ── L3 dependency surfaces (§7.1.4.2) ──
  {
    surfaceId: 'l3:canonical_objects',
    layer: L7DependencyLayer.L3,
    surfaceClass: L7DependencySurfaceClass.L3_CANONICAL_OBJECT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'CONTEXT_ONLY'],
    required: true,
    description: 'L3 canonical identity and temporal fact surface',
  },
  {
    surfaceId: 'l3:identity_resolution',
    layer: L7DependencyLayer.L3,
    surfaceClass: L7DependencySurfaceClass.L3_IDENTITY_RESOLUTION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 identity resolution outputs',
  },
  {
    surfaceId: 'l3:metric_contracts',
    layer: L7DependencyLayer.L3,
    surfaceClass: L7DependencySurfaceClass.L3_METRIC_CONTRACT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 metric contracts — units, precision, valid ranges',
  },
  {
    surfaceId: 'l3:confidence_scores',
    layer: L7DependencyLayer.L3,
    surfaceClass: L7DependencySurfaceClass.L3_CONFIDENCE_SCORE,
    authorityClass: 'DERIVED',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 source- and field-level confidence scores',
  },
  {
    surfaceId: 'l3:reconciliation_outcomes',
    layer: L7DependencyLayer.L3,
    surfaceClass: L7DependencySurfaceClass.L3_RECONCILIATION_OUTCOME,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L3 reconciliation outcomes across providers',
  },
  {
    surfaceId: 'l3:mutation_version_lineage',
    layer: L7DependencyLayer.L3,
    surfaceClass: L7DependencySurfaceClass.L3_MUTATION_VERSION_LINEAGE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE'],
    required: false,
    description: 'L3 mutation and version lineage for replay fidelity',
  },

  // ── L4 dependency surfaces (§7.1.4.3) ──
  {
    surfaceId: 'l4:graph_relations',
    layer: L7DependencyLayer.L4,
    surfaceClass: L7DependencySurfaceClass.L4_GRAPH_RELATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'CONTEXT_ONLY'],
    required: false,
    description: 'L4 graph relations, weights, and temporal state',
  },
  {
    surfaceId: 'l4:context_packages',
    layer: L7DependencyLayer.L4,
    surfaceClass: L7DependencySurfaceClass.L4_GRAPH_CONTEXT_PACKAGE,
    authorityClass: 'CONTEXTUAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'CONTEXT_ONLY'],
    required: false,
    description: 'L4 graph-derived context packages',
  },
  {
    surfaceId: 'l4:temporal_graph_state',
    layer: L7DependencyLayer.L4,
    surfaceClass: L7DependencySurfaceClass.L4_TEMPORAL_GRAPH_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L4 temporal graph state — time-indexed graph snapshots',
  },

  // ── L5 dependency surfaces (§7.1.4.4) ──
  {
    surfaceId: 'l5:write_coordination',
    layer: L7DependencyLayer.L5,
    surfaceClass: L7DependencySurfaceClass.L5_STORAGE_WRITE_COORDINATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    usableFor: ['PERSISTENCE_PATH'],
    required: true,
    description: 'L5 governed write coordination — only persistence path',
  },
  {
    surfaceId: 'l5:read_resolution',
    layer: L7DependencyLayer.L5,
    surfaceClass: L7DependencySurfaceClass.L5_STORAGE_READ_RESOLUTION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'CONTEXT_ONLY'],
    required: true,
    description: 'L5 governed read resolution',
  },
  {
    surfaceId: 'l5:replay',
    layer: L7DependencyLayer.L5,
    surfaceClass: L7DependencySurfaceClass.L5_STORAGE_REPLAY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['REPLAY_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 replay path for historical reconstruction',
  },
  {
    surfaceId: 'l5:repair',
    layer: L7DependencyLayer.L5,
    surfaceClass: L7DependencySurfaceClass.L5_STORAGE_REPAIR,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['REPAIR_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 governed repair path',
  },

  // ── L6 dependency surfaces (§7.1.4.5) ──
  {
    surfaceId: 'l6:current_feature_state',
    layer: L7DependencyLayer.L6,
    surfaceClass: L7DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE'],
    required: true,
    description: 'L6 current authoritative feature state per scope',
  },
  {
    surfaceId: 'l6:feature_history',
    layer: L7DependencyLayer.L6,
    surfaceClass: L7DependencySurfaceClass.L6_FEATURE_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'EVIDENCE_ONLY', 'REPLAY_REFERENCE'],
    required: true,
    description: 'L6 time-indexed feature history',
  },
  {
    surfaceId: 'l6:event_instance',
    layer: L7DependencyLayer.L6,
    surfaceClass: L7DependencySurfaceClass.L6_EVENT_INSTANCE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE'],
    required: true,
    description: 'L6 event instance primitives',
  },
  {
    surfaceId: 'l6:event_history',
    layer: L7DependencyLayer.L6,
    surfaceClass: L7DependencySurfaceClass.L6_EVENT_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'EVIDENCE_ONLY', 'REPLAY_REFERENCE'],
    required: true,
    description: 'L6 time-indexed event history',
  },
  {
    surfaceId: 'l6:evidence_pack',
    layer: L7DependencyLayer.L6,
    surfaceClass: L7DependencySurfaceClass.L6_EVIDENCE_PACK,
    authorityClass: 'EVIDENCE',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    usableFor: ['EVIDENCE_ONLY', 'SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE'],
    required: false,
    description: 'L6 evidence packs for primitives',
  },
  {
    surfaceId: 'l6:quality_confidence_metadata',
    layer: L7DependencyLayer.L6,
    surfaceClass: L7DependencySurfaceClass.L6_QUALITY_CONFIDENCE_METADATA,
    authorityClass: 'DERIVED',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    usableFor: ['SUPPORT_EVIDENCE', 'CHALLENGE_EVIDENCE', 'EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: true,
    description: 'L6 quality, confidence, freshness, and null metadata',
  },
];

export function getDependencySurface(surfaceId: string): DependencySurfaceDescriptor | undefined {
  return L7_DEPENDENCY_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isRegisteredDependency(surfaceId: string): boolean {
  return L7_DEPENDENCY_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function getSurfacesForLayer(layer: L7DependencyLayer): readonly DependencySurfaceDescriptor[] {
  return L7_DEPENDENCY_SURFACES.filter(s => s.layer === layer);
}

export function getSurfacesUsableFor(
  usage: L7DependencyUsability,
): readonly DependencySurfaceDescriptor[] {
  return L7_DEPENDENCY_SURFACES.filter(s => s.usableFor.includes(usage));
}

export function isUsableFor(surfaceId: string, usage: L7DependencyUsability): boolean {
  const s = getDependencySurface(surfaceId);
  if (!s) return false;
  return s.usableFor.includes(usage);
}

export function getRequiredDependencySurfaces(): readonly DependencySurfaceDescriptor[] {
  return L7_DEPENDENCY_SURFACES.filter(s => s.required);
}
