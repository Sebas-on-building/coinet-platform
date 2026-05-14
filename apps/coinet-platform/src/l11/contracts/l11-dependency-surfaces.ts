/**
 * L11.1 — Dependency Surface Contract
 *
 * §11.1.6 / §11.1.14 — Hard constitutional dependency law. Every
 * registered dependency surface declares its source layer, authority
 * class, usability, freshness, replay legality, and posture awareness.
 *
 * §11.1.6.6 / §11.1.6.7 / §11.1.6.8 / §11.1.6.9 — L7, L8, L9, and L10
 * dependency surfaces are stable-handoff only. Internal runtime state
 * of those layers is forbidden.
 */

import {
  L11DependencyLayer,
  L11DependencySurfaceClass,
  type L11DependencyUsability,
} from './l11-constitutional-types';

export interface L11DependencySurfaceDescriptor {
  readonly surfaceId: string;
  readonly layer: L11DependencyLayer;
  readonly surfaceClass: L11DependencySurfaceClass;
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
  readonly hypothesisPostureAware: boolean;
  readonly usableFor: readonly L11DependencyUsability[];
  readonly required: boolean;
  readonly description: string;
}

export const L11_DEPENDENCY_SURFACES:
  readonly L11DependencySurfaceDescriptor[] = [
  // ── L3 dependency surfaces (§11.1.6.2) ──
  {
    surfaceId: 'l3:canonical_objects',
    layer: L11DependencyLayer.L3,
    surfaceClass: L11DependencySurfaceClass.L3_CANONICAL_OBJECT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 canonical identity surface — identity safety only',
  },
  {
    surfaceId: 'l3:metric_contracts',
    layer: L11DependencyLayer.L3,
    surfaceClass: L11DependencySurfaceClass.L3_METRIC_CONTRACT,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY'],
    required: true,
    description: 'L3 metric contracts — units, precision, valid ranges',
  },
  {
    surfaceId: 'l3:confidence_scores',
    layer: L11DependencyLayer.L3,
    surfaceClass: L11DependencySurfaceClass.L3_CONFIDENCE_SCORE,
    authorityClass: 'DERIVED',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONFIDENCE_INPUT', 'EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: true,
    description: 'L3 source- and field-level confidence scores',
  },
  {
    surfaceId: 'l3:reconciliation_outcomes',
    layer: L11DependencyLayer.L3,
    surfaceClass: L11DependencySurfaceClass.L3_RECONCILIATION_OUTCOME,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'CONTEXT_ONLY'],
    required: false,
    description: 'L3 reconciliation outcomes across providers',
  },

  // ── L4 dependency surfaces (§11.1.6.3) ──
  {
    surfaceId: 'l4:graph_relations',
    layer: L11DependencyLayer.L4,
    surfaceClass: L11DependencySurfaceClass.L4_GRAPH_RELATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'SUPPORT_INPUT'],
    required: false,
    description: 'L4 graph relations — relational context for score conditioning',
  },
  {
    surfaceId: 'l4:context_packages',
    layer: L11DependencyLayer.L4,
    surfaceClass: L11DependencySurfaceClass.L4_GRAPH_CONTEXT_PACKAGE,
    authorityClass: 'CONTEXTUAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'SUPPORT_INPUT'],
    required: false,
    description: 'L4 graph-derived context packages',
  },
  {
    surfaceId: 'l4:temporal_graph_state',
    layer: L11DependencyLayer.L4,
    surfaceClass: L11DependencySurfaceClass.L4_TEMPORAL_GRAPH_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'PERIODIC',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONTEXT_ONLY', 'EVIDENCE_ONLY', 'SUPPORT_INPUT'],
    required: false,
    description: 'L4 temporal graph state — time-indexed graph snapshots',
  },

  // ── L5 dependency surfaces (§11.1.6.4) ──
  {
    surfaceId: 'l5:write_coordination',
    layer: L11DependencyLayer.L5,
    surfaceClass: L11DependencySurfaceClass.L5_STORAGE_WRITE_COORDINATION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['PERSISTENCE_PATH'],
    required: true,
    description: 'L5 governed write coordination — only persistence path for scores',
  },
  {
    surfaceId: 'l5:read_resolution',
    layer: L11DependencyLayer.L5,
    surfaceClass: L11DependencySurfaceClass.L5_STORAGE_READ_RESOLUTION,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['SUPPORT_INPUT', 'CONTEXT_ONLY'],
    required: true,
    description: 'L5 governed read resolution',
  },
  {
    surfaceId: 'l5:replay',
    layer: L11DependencyLayer.L5,
    surfaceClass: L11DependencySurfaceClass.L5_STORAGE_REPLAY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['REPLAY_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 replay path for historical reconstruction',
  },
  {
    surfaceId: 'l5:repair',
    layer: L11DependencyLayer.L5,
    surfaceClass: L11DependencySurfaceClass.L5_STORAGE_REPAIR,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['REPAIR_REFERENCE', 'EVIDENCE_ONLY'],
    required: false,
    description: 'L5 governed repair path',
  },

  // ── L6 dependency surfaces (§11.1.6.5) ──
  {
    surfaceId: 'l6:current_feature_state',
    layer: L11DependencyLayer.L6,
    surfaceClass: L11DependencySurfaceClass.L6_CURRENT_FEATURE_STATE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['SUPPORT_INPUT', 'CONTEXT_ONLY'],
    required: true,
    description: 'L6 current authoritative feature state — score primitive input',
  },
  {
    surfaceId: 'l6:feature_history',
    layer: L11DependencyLayer.L6,
    surfaceClass: L11DependencySurfaceClass.L6_FEATURE_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['SUPPORT_INPUT', 'EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'CALIBRATION_INPUT'],
    required: true,
    description: 'L6 time-indexed feature history',
  },
  {
    surfaceId: 'l6:event_instance',
    layer: L11DependencyLayer.L6,
    surfaceClass: L11DependencySurfaceClass.L6_EVENT_INSTANCE,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['SUPPORT_INPUT'],
    required: true,
    description: 'L6 event instance primitives — score evidence anchors',
  },
  {
    surfaceId: 'l6:event_history',
    layer: L11DependencyLayer.L6,
    surfaceClass: L11DependencySurfaceClass.L6_EVENT_HISTORY,
    authorityClass: 'CANONICAL',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['SUPPORT_INPUT', 'EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'CALIBRATION_INPUT'],
    required: true,
    description: 'L6 time-indexed event history',
  },
  {
    surfaceId: 'l6:evidence_pack',
    layer: L11DependencyLayer.L6,
    surfaceClass: L11DependencySurfaceClass.L6_EVIDENCE_PACK,
    authorityClass: 'EVIDENCE',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: false,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L6 evidence packs for score primitives',
  },

  // ── L7 dependency surfaces (§11.1.6.6) — stable handoff only ──
  {
    surfaceId: 'l7:validation_assessment',
    layer: L11DependencyLayer.L7,
    surfaceClass: L11DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['SUPPORT_INPUT', 'CONFIDENCE_INPUT', 'ATTRIBUTION_INPUT'],
    required: true,
    description: 'L7 validation assessment (stable handoff)',
  },
  {
    surfaceId: 'l7:contradiction_bundle',
    layer: L11DependencyLayer.L7,
    surfaceClass: L11DependencySurfaceClass.L7_CONTRADICTION_BUNDLE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONFIDENCE_INPUT', 'EVIDENCE_ONLY', 'ATTRIBUTION_INPUT'],
    required: true,
    description: 'L7 contradiction bundle (stable handoff) — disclose, never launder',
  },
  {
    surfaceId: 'l7:confidence_assessment',
    layer: L11DependencyLayer.L7,
    surfaceClass: L11DependencySurfaceClass.L7_CONFIDENCE_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 confidence assessment (stable handoff)',
  },
  {
    surfaceId: 'l7:restriction_profile',
    layer: L11DependencyLayer.L7,
    surfaceClass: L11DependencySurfaceClass.L7_RESTRICTION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L7 restriction profile — downstream usage rights (stable handoff, binding)',
  },
  {
    surfaceId: 'l7:validation_evidence_read_surface',
    layer: L11DependencyLayer.L7,
    surfaceClass: L11DependencySurfaceClass.L7_VALIDATION_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L7 evidence-backed validation read surface (stable handoff)',
  },

  // ── L8 dependency surfaces (§11.1.6.7) — stable handoff only ──
  {
    surfaceId: 'l8:regime_state',
    layer: L11DependencyLayer.L8,
    surfaceClass: L11DependencySurfaceClass.L8_REGIME_STATE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L8 regime state — environment posture for score conditioning (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_confidence_profile',
    layer: L11DependencyLayer.L8,
    surfaceClass: L11DependencySurfaceClass.L8_REGIME_CONFIDENCE_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L8 regime confidence profile (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_transition_profile',
    layer: L11DependencyLayer.L8,
    surfaceClass: L11DependencySurfaceClass.L8_REGIME_TRANSITION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['REGIME_CONDITIONING'],
    required: true,
    description: 'L8 regime transition profile (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_multiplier_profile',
    layer: L11DependencyLayer.L8,
    surfaceClass: L11DependencySurfaceClass.L8_REGIME_MULTIPLIER_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['REGIME_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: false,
    description: 'L8 regime multiplier profile — interpretive modifiers (stable handoff)',
  },
  {
    surfaceId: 'l8:regime_evidence_read_surface',
    layer: L11DependencyLayer.L8,
    surfaceClass: L11DependencySurfaceClass.L8_REGIME_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: false,
    hypothesisPostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L8 regime evidence-backed read surface (stable handoff)',
  },

  // ── L9 dependency surfaces (§11.1.6.8) — stable handoff only ──
  {
    surfaceId: 'l9:sequence_assessment',
    layer: L11DependencyLayer.L9,
    surfaceClass: L11DependencySurfaceClass.L9_SEQUENCE_ASSESSMENT,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    hypothesisPostureAware: false,
    usableFor: ['SEQUENCE_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L9 sequence assessment (stable handoff)',
  },
  {
    surfaceId: 'l9:sequence_chain',
    layer: L11DependencyLayer.L9,
    surfaceClass: L11DependencySurfaceClass.L9_SEQUENCE_CHAIN,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    hypothesisPostureAware: false,
    usableFor: ['SEQUENCE_CONDITIONING', 'SUPPORT_INPUT'],
    required: true,
    description: 'L9 governed sequence chain (stable handoff)',
  },
  {
    surfaceId: 'l9:lead_lag_profile',
    layer: L11DependencyLayer.L9,
    surfaceClass: L11DependencySurfaceClass.L9_LEAD_LAG_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    hypothesisPostureAware: false,
    usableFor: ['SEQUENCE_CONDITIONING', 'SUPPORT_INPUT'],
    required: true,
    description: 'L9 lead-lag profile with causal-restraint tagging (stable handoff)',
  },
  {
    surfaceId: 'l9:phase_state',
    layer: L11DependencyLayer.L9,
    surfaceClass: L11DependencySurfaceClass.L9_PHASE_STATE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    hypothesisPostureAware: false,
    usableFor: ['SEQUENCE_CONDITIONING'],
    required: true,
    description: 'L9 phase state (stable handoff)',
  },
  {
    surfaceId: 'l9:decay_profile',
    layer: L11DependencyLayer.L9,
    surfaceClass: L11DependencySurfaceClass.L9_DECAY_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    hypothesisPostureAware: false,
    usableFor: ['SEQUENCE_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: false,
    description: 'L9 decay profile (stable handoff)',
  },
  {
    surfaceId: 'l9:sequence_restriction_profile',
    layer: L11DependencyLayer.L9,
    surfaceClass: L11DependencySurfaceClass.L9_SEQUENCE_RESTRICTION_PROFILE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    hypothesisPostureAware: false,
    usableFor: ['CONFIDENCE_INPUT'],
    required: true,
    description: 'L9 sequence restriction profile — downstream usage rights (binding, stable handoff)',
  },
  {
    surfaceId: 'l9:sequence_evidence_read_surface',
    layer: L11DependencyLayer.L9,
    surfaceClass: L11DependencySurfaceClass.L9_SEQUENCE_EVIDENCE_READ_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: true,
    hypothesisPostureAware: false,
    usableFor: ['EVIDENCE_ONLY', 'REPLAY_REFERENCE', 'REPAIR_REFERENCE', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L9 evidence-backed sequence read surface (stable handoff)',
  },

  // ── L10 dependency surfaces (§11.1.6.9) — stable handoff only ──
  {
    surfaceId: 'l10:hypothesis_ranking_surface',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_HYPOTHESIS_RANKING_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['HYPOTHESIS_CONDITIONING', 'RANKING_INPUT', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L10 hypothesis ranking surface (stable handoff)',
  },
  {
    surfaceId: 'l10:hypothesis_spread_surface',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_HYPOTHESIS_SPREAD_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['HYPOTHESIS_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L10 hypothesis spread surface (stable handoff) — narrow spread must be honoured',
  },
  {
    surfaceId: 'l10:hypothesis_reliance_surface',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_HYPOTHESIS_RELIANCE_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['HYPOTHESIS_CONDITIONING', 'CONFIDENCE_INPUT'],
    required: true,
    description: 'L10 hypothesis reliance surface — reliance posture caps how scores may use hypothesis',
  },
  {
    surfaceId: 'l10:confirmation_invalidation_surface',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_CONFIRMATION_INVALIDATION_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['HYPOTHESIS_CONDITIONING', 'CONFIDENCE_INPUT', 'ATTRIBUTION_INPUT'],
    required: true,
    description: 'L10 confirmation/invalidation posture (stable handoff)',
  },
  {
    surfaceId: 'l10:shift_condition_surface',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_SHIFT_CONDITION_SURFACE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'NEAR_REAL_TIME',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['HYPOTHESIS_CONDITIONING', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L10 shift-condition set surface (stable handoff)',
  },
  {
    surfaceId: 'l10:hypothesis_history_window',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_HYPOTHESIS_HISTORY_WINDOW,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['REPLAY_REFERENCE', 'CALIBRATION_INPUT', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L10 hypothesis history window (stable handoff) for calibration/replay',
  },
  {
    surfaceId: 'l10:hypothesis_evidence_bundle',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_HYPOTHESIS_EVIDENCE_BUNDLE,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['EVIDENCE_ONLY', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L10 hypothesis evidence bundle (stable handoff)',
  },
  {
    surfaceId: 'l10:hypothesis_lineage_view',
    layer: L11DependencyLayer.L10,
    surfaceClass: L11DependencySurfaceClass.L10_HYPOTHESIS_LINEAGE_VIEW,
    authorityClass: 'STABLE_HANDOFF',
    freshnessExpectation: 'ON_DEMAND',
    replayCompatible: true,
    restrictionAware: true,
    regimePostureAware: false,
    sequencePostureAware: false,
    hypothesisPostureAware: true,
    usableFor: ['REPLAY_REFERENCE', 'REPAIR_REFERENCE', 'ATTRIBUTION_INPUT'],
    required: false,
    description: 'L10 hypothesis lineage view (stable handoff)',
  },
];

export function getL11DependencySurface(
  surfaceId: string,
): L11DependencySurfaceDescriptor | undefined {
  return L11_DEPENDENCY_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL11RegisteredDependency(surfaceId: string): boolean {
  return L11_DEPENDENCY_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function getL11SurfacesForLayer(
  layer: L11DependencyLayer,
): readonly L11DependencySurfaceDescriptor[] {
  return L11_DEPENDENCY_SURFACES.filter(s => s.layer === layer);
}

export function getL11SurfacesUsableFor(
  usage: L11DependencyUsability,
): readonly L11DependencySurfaceDescriptor[] {
  return L11_DEPENDENCY_SURFACES.filter(s => s.usableFor.includes(usage));
}

export function isL11UsableFor(
  surfaceId: string,
  usage: L11DependencyUsability,
): boolean {
  const s = getL11DependencySurface(surfaceId);
  if (!s) return false;
  return s.usableFor.includes(usage);
}

export function getL11RequiredDependencySurfaces():
  readonly L11DependencySurfaceDescriptor[] {
  return L11_DEPENDENCY_SURFACES.filter(s => s.required);
}

export function getL11RestrictionAwareSurfaces():
  readonly L11DependencySurfaceDescriptor[] {
  return L11_DEPENDENCY_SURFACES.filter(s => s.restrictionAware);
}

export function getL11RegimePostureAwareSurfaces():
  readonly L11DependencySurfaceDescriptor[] {
  return L11_DEPENDENCY_SURFACES.filter(s => s.regimePostureAware);
}

export function getL11SequencePostureAwareSurfaces():
  readonly L11DependencySurfaceDescriptor[] {
  return L11_DEPENDENCY_SURFACES.filter(s => s.sequencePostureAware);
}

export function getL11HypothesisPostureAwareSurfaces():
  readonly L11DependencySurfaceDescriptor[] {
  return L11_DEPENDENCY_SURFACES.filter(s => s.hypothesisPostureAware);
}
