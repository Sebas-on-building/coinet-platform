/**
 * L6.1 — Dependency Surface Contract
 *
 * §6.1.4 — Hard constitutional dependency law.
 * §6.1.4.5 — DependencySurfaceRegistry definition.
 */

import {
  L6DependencyLayer, L6DependencySurfaceClass,
  type L6DependencyUsability,
} from './l6-constitutional-types';

export interface DependencySurfaceDescriptor {
  readonly surfaceId: string;
  readonly layer: L6DependencyLayer;
  readonly surfaceClass: L6DependencySurfaceClass;
  readonly authorityClass: 'CANONICAL' | 'DERIVED' | 'PROJECTION' | 'CONTEXTUAL';
  readonly freshnessExpectation: 'REAL_TIME' | 'NEAR_REAL_TIME' | 'PERIODIC' | 'ON_DEMAND';
  readonly replayCompatible: boolean;
  readonly usableFor: readonly L6DependencyUsability[];
  readonly required: boolean;
  readonly description: string;
}

export const L6_DEPENDENCY_SURFACES: readonly DependencySurfaceDescriptor[] = [
  // L3 surfaces
  {
    surfaceId: 'l3:canonical_objects', layer: L6DependencyLayer.L3,
    surfaceClass: L6DependencySurfaceClass.CANONICAL_OBJECT,
    authorityClass: 'CANONICAL', freshnessExpectation: 'NEAR_REAL_TIME', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION', 'BASELINE_CONSTRUCTION'], required: true,
    description: 'L3 canonical objects — governed entities, metrics, and temporal facts',
  },
  {
    surfaceId: 'l3:identity_resolution', layer: L6DependencyLayer.L3,
    surfaceClass: L6DependencySurfaceClass.IDENTITY_RESOLUTION,
    authorityClass: 'CANONICAL', freshnessExpectation: 'PERIODIC', replayCompatible: true,
    usableFor: ['EVIDENCE_ONLY'], required: true,
    description: 'L3 identity resolution — canonical IDs and resolution history',
  },
  {
    surfaceId: 'l3:metric_contracts', layer: L6DependencyLayer.L3,
    surfaceClass: L6DependencySurfaceClass.METRIC_CONTRACT,
    authorityClass: 'CANONICAL', freshnessExpectation: 'ON_DEMAND', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION', 'BASELINE_CONSTRUCTION'], required: true,
    description: 'L3 metric contracts — field definitions, units, precision, valid ranges',
  },
  {
    surfaceId: 'l3:confidence_scores', layer: L6DependencyLayer.L3,
    surfaceClass: L6DependencySurfaceClass.CONFIDENCE_SCORE,
    authorityClass: 'DERIVED', freshnessExpectation: 'NEAR_REAL_TIME', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION', 'EVIDENCE_ONLY'], required: false,
    description: 'L3 confidence scores — source and field-level confidence',
  },
  // L4 surfaces
  {
    surfaceId: 'l4:graph_relations', layer: L6DependencyLayer.L4,
    surfaceClass: L6DependencySurfaceClass.GRAPH_RELATION,
    authorityClass: 'CANONICAL', freshnessExpectation: 'PERIODIC', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION', 'BASELINE_CONSTRUCTION'], required: false,
    description: 'L4 graph relations — edges, weights, temporal state',
  },
  {
    surfaceId: 'l4:context_packages', layer: L6DependencyLayer.L4,
    surfaceClass: L6DependencySurfaceClass.GRAPH_CONTEXT_PACKAGE,
    authorityClass: 'CONTEXTUAL', freshnessExpectation: 'ON_DEMAND', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION', 'EVIDENCE_ONLY'], required: false,
    description: 'L4 graph-derived context packages — assembled relational context',
  },
  {
    surfaceId: 'l4:graph_queries', layer: L6DependencyLayer.L4,
    surfaceClass: L6DependencySurfaceClass.GRAPH_QUERY,
    authorityClass: 'CONTEXTUAL', freshnessExpectation: 'ON_DEMAND', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION', 'EVIDENCE_ONLY'], required: false,
    description: 'L4 graph query surfaces — traversal, neighborhood, path queries',
  },
  // L5 surfaces
  {
    surfaceId: 'l5:write_coordination', layer: L6DependencyLayer.L5,
    surfaceClass: L6DependencySurfaceClass.STORAGE_WRITE_COORDINATION,
    authorityClass: 'CANONICAL', freshnessExpectation: 'REAL_TIME', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION'], required: true,
    description: 'L5 write coordination — governed write path via StorageEnvelope',
  },
  {
    surfaceId: 'l5:read_resolution', layer: L6DependencyLayer.L5,
    surfaceClass: L6DependencySurfaceClass.STORAGE_READ_RESOLUTION,
    authorityClass: 'CANONICAL', freshnessExpectation: 'REAL_TIME', replayCompatible: true,
    usableFor: ['FEATURE_COMPUTE', 'EVENT_DETECTION', 'BASELINE_CONSTRUCTION'], required: true,
    description: 'L5 read resolution — governed read path with authority preference',
  },
  {
    surfaceId: 'l5:replay', layer: L6DependencyLayer.L5,
    surfaceClass: L6DependencySurfaceClass.STORAGE_REPLAY,
    authorityClass: 'CANONICAL', freshnessExpectation: 'ON_DEMAND', replayCompatible: true,
    usableFor: ['EVIDENCE_ONLY'], required: false,
    description: 'L5 replay — historical trace reconstruction',
  },
  {
    surfaceId: 'l5:repair', layer: L6DependencyLayer.L5,
    surfaceClass: L6DependencySurfaceClass.STORAGE_REPAIR,
    authorityClass: 'CANONICAL', freshnessExpectation: 'ON_DEMAND', replayCompatible: true,
    usableFor: ['EVIDENCE_ONLY'], required: false,
    description: 'L5 repair — background repair path',
  },
];

export function getDependencySurface(surfaceId: string): DependencySurfaceDescriptor | undefined {
  return L6_DEPENDENCY_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isRegisteredDependency(surfaceId: string): boolean {
  return L6_DEPENDENCY_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function getSurfacesForLayer(layer: L6DependencyLayer): readonly DependencySurfaceDescriptor[] {
  return L6_DEPENDENCY_SURFACES.filter(s => s.layer === layer);
}

export function getSurfacesUsableFor(usage: L6DependencyUsability): readonly DependencySurfaceDescriptor[] {
  return L6_DEPENDENCY_SURFACES.filter(s => s.usableFor.includes(usage));
}

export function isUsableFor(surfaceId: string, usage: L6DependencyUsability): boolean {
  const surface = getDependencySurface(surfaceId);
  if (!surface) return false;
  return surface.usableFor.includes(usage);
}
