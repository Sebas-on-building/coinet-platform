/**
 * L10.1 — Dependency Surface Contract
 *
 * §10.1.3 — Hard constitutional dependency law. Every registered
 * dependency surface declares its source layer, authority class,
 * usability, freshness, replay legality, and scope constraints.
 *
 * §10.1.3.6 / §10.1.3.7 / §10.1.3.8 — L7, L8, and L9 dependency surfaces
 * are stable-handoff only. L10 consumes public validation/contradiction/
 * confidence/restriction surfaces from L7; regime state/confidence/
 * transition/multiplier/evidence surfaces from L8; and sequence-assessment
 * /chain/lead-lag/phase/decay/restriction/evidence surfaces from L9 — never
 * internals.
 */

import {
  L10DependencyLayer,
  L10DependencySurfaceClass,
  type L10DependencyUsability,
} from './l10-constitutional-types';

export interface L10DependencySurfaceDescriptor {
  readonly surfaceId: string;
  readonly layer: L10DependencyLayer;
  readonly surfaceClass: L10DependencySurfaceClass;
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
  readonly sequencePostureAware: boolean;
  readonly usableFor: readonly L10DependencyUsability[];
  readonly required: boolean;
  readonly description: string;
}

export const L10_DEPENDENCY_SURFACES: readonly L10DependencySurfaceDescriptor[] = [
  // ── L3 dependency surfaces (§10.1.3.2) ──
  {
    surfaceId: 'l3:canonical_objects',
    layer: L10DependencyLayer.L3,
    surfaceClass: L10DependencySurfaceClass.L3_CANONICAL_OBJECT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 canonical identity surface — identity safety only',
  },
  {
    surfaceId: 'l3:metric_contracts',
    layer: L10DependencyLayer.L3,
    surfaceClass: L10DependencySurfaceClass.L3_METRIC_CONTRACT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 metric contracts — units, precision, valid ranges',
  },
  {
    surfaceId: 'l3:confidence_scores',
    layer: L10DependencyLayer.L3,
    surfaceClass: L10DependencySurfaceClass.L3_CONFIDENCE_SCORE,
    authorityClass: 'DERIVED',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONFIDENCE_INPUT', 'EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: true,
    description: 'L3 source- and field-level confidence scores',
  },
  {
    surfaceId: 'l3:reconciliation_outcomes',
    layer: L10DependencyLayer.L3,
    surfaceClass: L10DependencySurfaceClass.L3_RECONCILIATION_OUTCOME,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: false,
    description: 'L3 reconciliation outcomes across providers',
  },

  // ── L4 dependency surfaces (§10.1.3.3) ──
  {
    surfaceId: 'l4:graph_relations',
    layer: L10DependencyLayer.L4,
    surfaceClass: L10DependencySurfaceClass.L4_GRAPH_RELATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'SUPPORT_EVIDENCE', 'CONTRADICTION_EVIDENCE'],
    required: false,
    description: 'L4 graph relations — relational context for hypothesis framing',
  },
  {
    surfaceId: 'l4:context_packages',
    layer: L10DependencyLayer.L4,
    surfaceClass: L10DependencySurfaceClass.L4_GRAPH_CONTEXT_PACKAGE,
    authorityClass: 'CONTEXTUAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'SUPPORT_EVIDENCE', 'CONTRADICTION_EVIDENCE'],
    required: false,
    description: 'L4 graph-derived context packages',
  },
  {
    surfaceId: 'l4:temporal_graph_state',
    layer: L10DependencyLayer.L4,
    surfaceClass: L10DependencySurfaceClass.L4_TEMPORAL_GRAPH_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY', 'SUPPORT_EVIDENCE'],
    required: false,
    description: 'L4 temporal graph state — time-indexed graph snapshots',
  },

  // ── L5 dependency surfaces (§10.1.3.4) ──
  {
    surfaceId: 'l5:write_coordination',
    layer: L10DependencyLayer.L5,
    surfaceClass: L10DependencySurfaceClass.L5_STORAGE_WRITE_COORDINATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['PERSISTENCE_PATH'],
    required: true,
    description: 'L5 governed write coordination — only persistence path',
  },
  {
    surfaceId: 'l5:read_resolution',
    layer: L10DependencyLayer.L5,
    surfaceClass: L10DependencySurfaceClass.L5_STORAGE_READ_RESOLUTION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['SUPPORT_EVIDENCE', 'CONTRADICTION_EVIDENCE', 'CONTEXT_ONLY'],
    required: true,
    description: 'L5 governed read resolution',
  },
  {
    surfaceId: 'l5:replay',
    layer: L10DependencyLayer.L5,
    surfaceClass: L10DependencySurfaceClass.L5_STORAGE_REPLAY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['REPLAY_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 replay path for historical reconstruction',
  },
  {
    surfaceId: 'l5:repair',
    layer: L10DependencyLayer.L5,
    surfaceClass: L10DependencySurfaceClass.L5_STORAGE_REPAIR,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['REPAIR_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 governed repair path',
  },

  // ── L6 dependency surfaces (§10.1.3.5) ──
  {
    surfaceId: 'l6:current_feature_state',
    layer: L10DependencyLayer.L6,
    surfaceClass: L10DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['SUPPORT_EVIDENCE', 'CONTRADICTION_EVIDENCE', 'CONTEXT_ONLY'],
    required: true,
    description: 'L6 current authoritative feature state — hypothesis evidence input',
  },
  {
    surfaceId: 'l6:feature_history',
    layer: L10DependencyLayer.L6,
    surfaceClass: L10DependencySurfaceClass.L6_FEATURE_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: [
      'SUPPORT_EVIDENCE',
      'CONTRADICTION_EVIDENCE',
      'EVIDENCE_ONLY',
      'REPLAY_REFERENCE',
    ],
    required: true,
    description: 'L6 time-indexed feature history',
  },
  {
    surfaceId: 'l6:event_instance',
    layer: L10DependencyLayer.L6,
    surfaceClass: L10DependencySurfaceClass.L6_EVENT_INSTANCE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['SUPPORT_EVIDENCE', 'CONTRADICTION_EVIDENCE'],
    required: true,
    description: 'L6 event instance primitives — hypothesis evidence anchors',
  },
  {
    surfaceId: 'l6:event_history',
    layer: L10DependencyLayer.L6,
    surfaceClass: L10DependencySurfaceClass.L6_EVENT_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: [
      'SUPPORT_EVIDENCE',
      'CONTRADICTION_EVIDENCE',
      'EVIDENCE_ONLY',
      'REPLAY_REFERENCE',
    ],
    required: true,
    description: 'L6 time-indexed event history',
  },
  {
    surfaceId: 'l6:evidence_pack',
    layer: L10DependencyLayer.L6,
    surfaceClass: L10DependencySurfaceClass.L6_EVIDENCE_PACK,
    authorityClass: 'EVIDENCE',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['EVIDENCE_ONLY'],
    required: false,
    description: 'L6 evidence packs for hypothesis primitives',
  },

  // ── L7 dependency surfaces (§10.1.3.6) — stable handoff only ──
  {
    surfaceId: 'l7:validation_assessment',
    layer: L10DependencyLayer.L7,
    surfaceClass: L10DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['SUPPORT_EVIDENCE', 'CONTRADICTION_EVIDENCE', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 validation assessment (stable handoff)',
  },
  {
    surfaceId: 'l7:contradiction_bundle',
    layer: L10DependencyLayer.L7,
    surfaceClass: L10DependencySurfaceClass.L7_CONTRADICTION_BUNDLE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONTRADICTION_EVIDENCE', 'CONFIDENCE_INPUT', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L7 contradiction bundle — posture attached to validated claims (stable handoff)',
  },
  {
    surfaceId: 'l7:confidence_assessment',
    layer: L10DependencyLayer.L7,
    surfaceClass: L10DependencySurfaceClass.L7_CONFIDENCE_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 confidence assessment (stable handoff)',
  },
  {
    surfaceId: 'l7:restriction_profile',
    layer: L10DependencyLayer.L7,
    surfaceClass: L10DependencySurfaceClass.L7_RESTRICTION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 restriction profile — downstream usage rights (stable handoff, binding)',
  },
  {
    surfaceId: 'l7:validation_evidence_read_surface',
    layer: L10DependencyLayer.L7,
    surfaceClass: L10DependencySurfaceClass.L7_VALIDATION_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE'],
    required: false,
    description: 'L7 evidence-backed validation read surface (stable handoff)',
  },

  // ── L8 dependency surfaces (§10.1.3.7) — stable handoff only ──
  {
    surfaceId: 'l8:regime_state',
    layer: L10DependencyLayer.L8,
    surfaceClass: L10DependencySurfaceClass.L8_REGIME_STATE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT', 'RANKING_INPUT'],
    required: true,
    description: 'L8 regime state — environment posture for hypothesis conditioning (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_confidence_profile',
    layer: L10DependencyLayer.L8,
    surfaceClass: L10DependencySurfaceClass.L8_REGIME_CONFIDENCE_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L8 regime confidence profile (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_transition_profile',
    layer: L10DependencyLayer.L8,
    surfaceClass: L10DependencySurfaceClass.L8_REGIME_TRANSITION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    usableFor: ['REGIME_CONDITIONING', 'RANKING_INPUT'],
    required: true,
    description: 'L8 regime transition profile (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_multiplier_profile',
    layer: L10DependencyLayer.L8,
    surfaceClass: L10DependencySurfaceClass.L8_REGIME_MULTIPLIER_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: false,
    description: 'L8 regime multiplier profile — interpretive modifiers (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_evidence_read_surface',
    layer: L10DependencyLayer.L8,
    surfaceClass: L10DependencySurfaceClass.L8_REGIME_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE'],
    required: false,
    description: 'L8 regime evidence-backed read surface (stable handoff)',
  },

  // ── L9 dependency surfaces (§10.1.3.8) — stable handoff only ──
  {
    surfaceId: 'l9:sequence_assessment',
    layer: L10DependencyLayer.L9,
    surfaceClass: L10DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    usableFor: ['SEQUENCE_CONDITIONING', 'RANKING_INPUT', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L9 sequence assessment (stable handoff)',
  },
  {
    surfaceId: 'l9:sequence_chain',
    layer: L10DependencyLayer.L9,
    surfaceClass: L10DependencySurfaceClass.L9_SEQUENCE_CHAIN,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    usableFor: ['SEQUENCE_CONDITIONING', 'SUPPORT_EVIDENCE', 'CONTRADICTION_EVIDENCE'],
    required: true,
    description: 'L9 governed sequence chain (stable handoff)',
  },
  {
    surfaceId: 'l9:lead_lag_profile',
    layer: L10DependencyLayer.L9,
    surfaceClass: L10DependencySurfaceClass.L9_LEAD_LAG_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    usableFor: ['SEQUENCE_CONDITIONING', 'SUPPORT_EVIDENCE'],
    required: true,
    description: 'L9 lead-lag profile with causal-restraint tagging (stable handoff)',
  },
  {
    surfaceId: 'l9:phase_state',
    layer: L10DependencyLayer.L9,
    surfaceClass: L10DependencySurfaceClass.L9_PHASE_STATE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    usableFor: ['SEQUENCE_CONDITIONING', 'RANKING_INPUT'],
    required: true,
    description: 'L9 phase state (stable handoff)',
  },
  {
    surfaceId: 'l9:decay_profile',
    layer: L10DependencyLayer.L9,
    surfaceClass: L10DependencySurfaceClass.L9_DECAY_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    usableFor: ['SEQUENCE_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: false,
    description: 'L9 decay profile (stable handoff)',
  },
  {
    surfaceId: 'l9:sequence_restriction_profile',
    layer: L10DependencyLayer.L9,
    surfaceClass: L10DependencySurfaceClass.L9_SEQUENCE_RESTRICTION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L9 sequence restriction profile — downstream usage rights (binding, stable handoff)',
  },
  {
    surfaceId: 'l9:sequence_evidence_read_surface',
    layer: L10DependencyLayer.L9,
    surfaceClass: L10DependencySurfaceClass.L9_SEQUENCE_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE'],
    required: false,
    description: 'L9 evidence-backed sequence read surface (stable handoff)',
  },
];

export function getL10DependencySurface(
  surfaceId: string,
): L10DependencySurfaceDescriptor | undefined {
  return L10_DEPENDENCY_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL10RegisteredDependency(surfaceId: string): boolean {
  return L10_DEPENDENCY_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function getL10SurfacesForLayer(
  layer: L10DependencyLayer,
): readonly L10DependencySurfaceDescriptor[] {
  return L10_DEPENDENCY_SURFACES.filter(s => s.layer === layer);
}

export function getL10SurfacesUsableFor(
  usage: L10DependencyUsability,
): readonly L10DependencySurfaceDescriptor[] {
  return L10_DEPENDENCY_SURFACES.filter(s => s.usableFor.includes(usage));
}

export function isL10UsableFor(surfaceId: string, usage: L10DependencyUsability): boolean {
  const s = getL10DependencySurface(surfaceId);
  if (!s) return false;
  return s.usableFor.includes(usage);
}

export function getL10RequiredDependencySurfaces(): readonly L10DependencySurfaceDescriptor[] {
  return L10_DEPENDENCY_SURFACES.filter(s => s.required);
}

export function getL10RestrictionAwareSurfaces(): readonly L10DependencySurfaceDescriptor[] {
  return L10_DEPENDENCY_SURFACES.filter(s => s.restrictionAware);
}

export function getL10RegimePostureAwareSurfaces(): readonly L10DependencySurfaceDescriptor[] {
  return L10_DEPENDENCY_SURFACES.filter(s => s.regimePostureAware);
}

export function getL10SequencePostureAwareSurfaces(): readonly L10DependencySurfaceDescriptor[] {
  return L10_DEPENDENCY_SURFACES.filter(s => s.sequencePostureAware);
}
