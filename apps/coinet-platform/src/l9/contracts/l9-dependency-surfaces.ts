/**
 * L9.1 — Dependency Surface Contract
 *
 * §9.1.4 — Hard constitutional dependency law. §9.1.4.9 — Every
 * registered dependency surface declares its source layer, authority
 * class, usability, freshness, replay legality, and scope constraints.
 *
 * §9.1.4.8 — L7 and L8 dependency surfaces are stable-handoff only. L9
 * consumes public validation/contradiction/confidence/restriction
 * surfaces from L7 and regime-state/confidence/transition/multiplier/
 * evidence surfaces from L8 — never internals.
 */

import {
  L9DependencyLayer,
  L9DependencySurfaceClass,
  type L9DependencyUsability,
} from './l9-constitutional-types';

export interface L9DependencySurfaceDescriptor {
  readonly surfaceId: string;
  readonly layer: L9DependencyLayer;
  readonly surfaceClass: L9DependencySurfaceClass;
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
  readonly regimePostureAware: boolean;
  readonly usableFor: readonly L9DependencyUsability[];
  readonly required: boolean;
  readonly description: string;
}

export const L9_DEPENDENCY_SURFACES: readonly L9DependencySurfaceDescriptor[] = [
  // ── L3 dependency surfaces (§9.1.4.2) ──
  {
    surfaceId: 'l3:canonical_objects',
    layer: L9DependencyLayer.L3,
    surfaceClass: L9DependencySurfaceClass.L3_CANONICAL_OBJECT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 canonical identity surface — identity safety only',
  },
  {
    surfaceId: 'l3:metric_contracts',
    layer: L9DependencyLayer.L3,
    surfaceClass: L9DependencySurfaceClass.L3_METRIC_CONTRACT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 metric contracts — units, precision, valid ranges',
  },
  {
    surfaceId: 'l3:confidence_scores',
    layer: L9DependencyLayer.L3,
    surfaceClass: L9DependencySurfaceClass.L3_CONFIDENCE_SCORE,
    authorityClass: 'DERIVED',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['CONFIDENCE_INPUT', 'EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: true,
    description: 'L3 source- and field-level confidence scores',
  },
  {
    surfaceId: 'l3:reconciliation_outcomes',
    layer: L9DependencyLayer.L3,
    surfaceClass: L9DependencySurfaceClass.L3_RECONCILIATION_OUTCOME,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: false,
    description: 'L3 reconciliation outcomes across providers',
  },

  // ── L4 dependency surfaces (§9.1.4.3) ──
  {
    surfaceId: 'l4:graph_relations',
    layer: L9DependencyLayer.L4,
    surfaceClass: L9DependencySurfaceClass.L4_GRAPH_RELATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['ORDERING_SIGNAL', 'CONTEXT_ONLY', 'SEQUENCE_SIGNAL'],
    required: false,
    description: 'L4 graph relations — relational timing context',
  },
  {
    surfaceId: 'l4:context_packages',
    layer: L9DependencyLayer.L4,
    surfaceClass: L9DependencySurfaceClass.L4_GRAPH_CONTEXT_PACKAGE,
    authorityClass: 'CONTEXTUAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['ORDERING_SIGNAL', 'CONTEXT_ONLY', 'SEQUENCE_SIGNAL'],
    required: false,
    description: 'L4 graph-derived context packages',
  },
  {
    surfaceId: 'l4:temporal_graph_state',
    layer: L9DependencyLayer.L4,
    surfaceClass: L9DependencySurfaceClass.L4_TEMPORAL_GRAPH_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY', 'ORDERING_SIGNAL', 'SEQUENCE_SIGNAL'],
    required: false,
    description: 'L4 temporal graph state — time-indexed graph snapshots',
  },

  // ── L5 dependency surfaces (§9.1.4.4) ──
  {
    surfaceId: 'l5:write_coordination',
    layer: L9DependencyLayer.L5,
    surfaceClass: L9DependencySurfaceClass.L5_STORAGE_WRITE_COORDINATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['PERSISTENCE_PATH'],
    required: true,
    description: 'L5 governed write coordination — only persistence path',
  },
  {
    surfaceId: 'l5:read_resolution',
    layer: L9DependencyLayer.L5,
    surfaceClass: L9DependencySurfaceClass.L5_STORAGE_READ_RESOLUTION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['SEQUENCE_SIGNAL', 'ORDERING_SIGNAL', 'CONTEXT_ONLY'],
    required: true,
    description: 'L5 governed read resolution',
  },
  {
    surfaceId: 'l5:replay',
    layer: L9DependencyLayer.L5,
    surfaceClass: L9DependencySurfaceClass.L5_STORAGE_REPLAY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['REPLAY_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 replay path for historical reconstruction',
  },
  {
    surfaceId: 'l5:repair',
    layer: L9DependencyLayer.L5,
    surfaceClass: L9DependencySurfaceClass.L5_STORAGE_REPAIR,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['REPAIR_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 governed repair path',
  },

  // ── L6 dependency surfaces (§9.1.4.5) ──
  {
    surfaceId: 'l6:current_feature_state',
    layer: L9DependencyLayer.L6,
    surfaceClass: L9DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['SEQUENCE_SIGNAL', 'ORDERING_SIGNAL', 'PHASE_SIGNAL'],
    required: true,
    description: 'L6 current authoritative feature state — sequence signal input',
  },
  {
    surfaceId: 'l6:feature_history',
    layer: L9DependencyLayer.L6,
    surfaceClass: L9DependencySurfaceClass.L6_FEATURE_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: [
      'SEQUENCE_SIGNAL',
      'ORDERING_SIGNAL',
      'CHANGE_POINT_SIGNAL',
      'PHASE_SIGNAL',
      'DECAY_SIGNAL',
      'EVIDENCE_ONLY',
      'REPLAY_REFERENCE',
    ],
    required: true,
    description: 'L6 time-indexed feature history — sequence construction input',
  },
  {
    surfaceId: 'l6:event_instance',
    layer: L9DependencyLayer.L6,
    surfaceClass: L9DependencySurfaceClass.L6_EVENT_INSTANCE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['SEQUENCE_SIGNAL', 'ORDERING_SIGNAL', 'CHANGE_POINT_SIGNAL'],
    required: true,
    description: 'L6 event instance primitives — ordered-chain anchor input',
  },
  {
    surfaceId: 'l6:event_history',
    layer: L9DependencyLayer.L6,
    surfaceClass: L9DependencySurfaceClass.L6_EVENT_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: [
      'SEQUENCE_SIGNAL',
      'ORDERING_SIGNAL',
      'CHANGE_POINT_SIGNAL',
      'DECAY_SIGNAL',
      'EVIDENCE_ONLY',
      'REPLAY_REFERENCE',
    ],
    required: true,
    description: 'L6 time-indexed event history',
  },
  {
    surfaceId: 'l6:evidence_pack',
    layer: L9DependencyLayer.L6,
    surfaceClass: L9DependencySurfaceClass.L6_EVIDENCE_PACK,
    authorityClass: 'EVIDENCE',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    usableFor: ['EVIDENCE_ONLY'],
    required: false,
    description: 'L6 evidence packs for sequence primitives',
  },

  // ── L7 dependency surfaces (§9.1.4.6) — stable handoff only ──
  {
    surfaceId: 'l7:validation_assessment',
    layer: L9DependencyLayer.L7,
    surfaceClass: L9DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    usableFor: ['SEQUENCE_SIGNAL', 'ORDERING_SIGNAL', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 validation assessment — truth-tested subject state (stable handoff)',
  },
  {
    surfaceId: 'l7:contradiction_bundle',
    layer: L9DependencyLayer.L7,
    surfaceClass: L9DependencySurfaceClass.L7_CONTRADICTION_BUNDLE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    usableFor: ['CONFIDENCE_INPUT', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L7 contradiction bundle — posture attached to validated claims (stable handoff)',
  },
  {
    surfaceId: 'l7:confidence_assessment',
    layer: L9DependencyLayer.L7,
    surfaceClass: L9DependencySurfaceClass.L7_CONFIDENCE_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 confidence assessment — justified reliance (stable handoff)',
  },
  {
    surfaceId: 'l7:restriction_profile',
    layer: L9DependencyLayer.L7,
    surfaceClass: L9DependencySurfaceClass.L7_RESTRICTION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 restriction profile — downstream usage rights (stable handoff, binding)',
  },
  {
    surfaceId: 'l7:validation_evidence_read_surface',
    layer: L9DependencyLayer.L7,
    surfaceClass: L9DependencySurfaceClass.L7_VALIDATION_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE'],
    required: false,
    description: 'L7 evidence-backed validation read surface (stable handoff)',
  },

  // ── L8 dependency surfaces (§9.1.4.7) — stable handoff only ──
  {
    surfaceId: 'l8:regime_state',
    layer: L9DependencyLayer.L8,
    surfaceClass: L9DependencySurfaceClass.L8_REGIME_STATE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    usableFor: ['REGIME_CONDITIONING', 'PHASE_SIGNAL', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L8 regime state — environment posture for sequence conditioning (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_confidence_profile',
    layer: L9DependencyLayer.L8,
    surfaceClass: L9DependencySurfaceClass.L8_REGIME_CONFIDENCE_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L8 regime confidence profile (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_transition_profile',
    layer: L9DependencyLayer.L8,
    surfaceClass: L9DependencySurfaceClass.L8_REGIME_TRANSITION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    usableFor: ['REGIME_CONDITIONING', 'CHANGE_POINT_SIGNAL', 'PHASE_SIGNAL'],
    required: true,
    description: 'L8 regime transition profile — transition posture (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_multiplier_profile',
    layer: L9DependencyLayer.L8,
    surfaceClass: L9DependencySurfaceClass.L8_REGIME_MULTIPLIER_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: false,
    description: 'L8 regime multiplier profile — interpretive modifiers (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_evidence_read_surface',
    layer: L9DependencyLayer.L8,
    surfaceClass: L9DependencySurfaceClass.L8_REGIME_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE'],
    required: false,
    description: 'L8 regime evidence-backed read surface (stable handoff)',
  },
];

export function getL9DependencySurface(
  surfaceId: string,
): L9DependencySurfaceDescriptor | undefined {
  return L9_DEPENDENCY_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL9RegisteredDependency(surfaceId: string): boolean {
  return L9_DEPENDENCY_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function getL9SurfacesForLayer(
  layer: L9DependencyLayer,
): readonly L9DependencySurfaceDescriptor[] {
  return L9_DEPENDENCY_SURFACES.filter(s => s.layer === layer);
}

export function getL9SurfacesUsableFor(
  usage: L9DependencyUsability,
): readonly L9DependencySurfaceDescriptor[] {
  return L9_DEPENDENCY_SURFACES.filter(s => s.usableFor.includes(usage));
}

export function isL9UsableFor(surfaceId: string, usage: L9DependencyUsability): boolean {
  const s = getL9DependencySurface(surfaceId);
  if (!s) return false;
  return s.usableFor.includes(usage);
}

export function getL9RequiredDependencySurfaces(): readonly L9DependencySurfaceDescriptor[] {
  return L9_DEPENDENCY_SURFACES.filter(s => s.required);
}

export function getL9RestrictionAwareSurfaces(): readonly L9DependencySurfaceDescriptor[] {
  return L9_DEPENDENCY_SURFACES.filter(s => s.restrictionAware);
}

export function getL9RegimePostureAwareSurfaces(): readonly L9DependencySurfaceDescriptor[] {
  return L9_DEPENDENCY_SURFACES.filter(s => s.regimePostureAware);
}
