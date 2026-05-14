/**
 * L11.1 — Output Surface Contract
 *
 * §11.1.9 / §11.1.13 — First-class Layer 11 output surfaces. Every L11
 * output belongs to one of exactly eight classes, is evidence-backed,
 * versioned, attribution-aware, missing-data-aware, restriction-aware,
 * lineage-carrying, replay-safe, routed through L5, and explicitly not
 * a final judgment, recommendation, scenario winner, or trade action.
 */

import { L11OutputSurfaceClass } from './l11-constitutional-types';

export interface L11OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L11OutputSurfaceClass;
  readonly authorityMode:
    | 'SCORE_AUTHORITY'
    | 'COMPONENT_BREAKDOWN'
    | 'ATTRIBUTION_AUTHORITY'
    | 'MODIFIER_PROFILE'
    | 'MISSING_DATA_PROFILE'
    | 'CALIBRATION_HOOK'
    | 'DRIFT_HOOK'
    | 'EVIDENCE_READ_SURFACE';
  readonly replayRequired: boolean;
  readonly lineageRequired: boolean;
  readonly requiredLineageFields: readonly string[];
  readonly evidenceBound: boolean;
  readonly versionRequired: boolean;
  readonly meaningClaimRequired: boolean;
  readonly directionDeclarationRequired: boolean;
  readonly attributionRequired: boolean;
  readonly missingDataDisclosureRequired: boolean;
  readonly contradictionDisclosureRequired: boolean;
  readonly hypothesisPostureRequired: boolean;
  readonly regimePostureRequired: boolean;
  readonly sequencePostureRequired: boolean;
  readonly restrictionAware: boolean;
  readonly calibrationHookCapable: boolean;
  readonly driftHookCapable: boolean;
  readonly nonFinalJudgment: boolean;
  readonly nonRecommendation: boolean;
  readonly allowedDownstreamConsumers: readonly string[];
  readonly l5StorageRoute: string;
  readonly description: string;
}

export const L11_OUTPUT_SURFACES: readonly L11OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l11:score_output',
    outputClass: L11OutputSurfaceClass.SCORE_OUTPUT,
    authorityMode: 'SCORE_AUTHORITY',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'score_family_id',
      'formula_version',
      'computed_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: true,
    directionDeclarationRequired: true,
    attributionRequired: true,
    missingDataDisclosureRequired: true,
    contradictionDisclosureRequired: true,
    hypothesisPostureRequired: true,
    regimePostureRequired: true,
    sequencePostureRequired: true,
    restrictionAware: true,
    calibrationHookCapable: true,
    driftHookCapable: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l11.score_output',
    description: 'Deterministic score output — meaning-claim governed quantitative interpretation',
  },
  {
    surfaceId: 'l11:score_component_breakdown',
    outputClass: L11OutputSurfaceClass.SCORE_COMPONENT_BREAKDOWN,
    authorityMode: 'COMPONENT_BREAKDOWN',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'breakdown_id',
      'formula_version',
      'computed_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: true,
    directionDeclarationRequired: true,
    attributionRequired: true,
    missingDataDisclosureRequired: true,
    contradictionDisclosureRequired: true,
    hypothesisPostureRequired: true,
    regimePostureRequired: true,
    sequencePostureRequired: true,
    restrictionAware: true,
    calibrationHookCapable: true,
    driftHookCapable: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l11.score_component_breakdown',
    description: 'Score component breakdown — sub-scores with explicit attribution',
  },
  {
    surfaceId: 'l11:score_attribution',
    outputClass: L11OutputSurfaceClass.SCORE_ATTRIBUTION,
    authorityMode: 'ATTRIBUTION_AUTHORITY',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'attribution_id',
      'formula_version',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: true,
    directionDeclarationRequired: false,
    attributionRequired: true,
    missingDataDisclosureRequired: true,
    contradictionDisclosureRequired: true,
    hypothesisPostureRequired: true,
    regimePostureRequired: true,
    sequencePostureRequired: true,
    restrictionAware: true,
    calibrationHookCapable: false,
    driftHookCapable: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l11.score_attribution',
    description: 'Score attribution — what produced the value, what strengthened, what weakened',
  },
  {
    surfaceId: 'l11:score_modifier_profile',
    outputClass: L11OutputSurfaceClass.SCORE_MODIFIER_PROFILE,
    authorityMode: 'MODIFIER_PROFILE',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'modifier_profile_id',
      'formula_version',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: true,
    directionDeclarationRequired: false,
    attributionRequired: true,
    missingDataDisclosureRequired: false,
    contradictionDisclosureRequired: false,
    hypothesisPostureRequired: true,
    regimePostureRequired: true,
    sequencePostureRequired: true,
    restrictionAware: true,
    calibrationHookCapable: false,
    driftHookCapable: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l11.score_modifier_profile',
    description: 'Score modifier profile — regime/sequence/hypothesis modifiers applied',
  },
  {
    surfaceId: 'l11:score_missing_data_profile',
    outputClass: L11OutputSurfaceClass.SCORE_MISSING_DATA_PROFILE,
    authorityMode: 'MISSING_DATA_PROFILE',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'missing_data_profile_id',
      'formula_version',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: true,
    directionDeclarationRequired: false,
    attributionRequired: true,
    missingDataDisclosureRequired: true,
    contradictionDisclosureRequired: true,
    hypothesisPostureRequired: false,
    regimePostureRequired: false,
    sequencePostureRequired: false,
    restrictionAware: true,
    calibrationHookCapable: false,
    driftHookCapable: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l11.score_missing_data_profile',
    description: 'Score missing-data profile — penalty/cap/disclosure surface',
  },
  {
    surfaceId: 'l11:score_calibration_hook',
    outputClass: L11OutputSurfaceClass.SCORE_CALIBRATION_HOOK,
    authorityMode: 'CALIBRATION_HOOK',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'calibration_hook_id',
      'formula_version',
      'declared_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: true,
    directionDeclarationRequired: false,
    attributionRequired: false,
    missingDataDisclosureRequired: false,
    contradictionDisclosureRequired: false,
    hypothesisPostureRequired: false,
    regimePostureRequired: false,
    sequencePostureRequired: false,
    restrictionAware: true,
    calibrationHookCapable: true,
    driftHookCapable: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l11.score_calibration_hook',
    description: 'Score calibration hook — empirical evaluation contract for the score',
  },
  {
    surfaceId: 'l11:score_drift_hook',
    outputClass: L11OutputSurfaceClass.SCORE_DRIFT_HOOK,
    authorityMode: 'DRIFT_HOOK',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'drift_hook_id',
      'formula_version',
      'declared_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: true,
    directionDeclarationRequired: false,
    attributionRequired: false,
    missingDataDisclosureRequired: false,
    contradictionDisclosureRequired: false,
    hypothesisPostureRequired: false,
    regimePostureRequired: false,
    sequencePostureRequired: false,
    restrictionAware: true,
    calibrationHookCapable: false,
    driftHookCapable: true,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l11.score_drift_hook',
    description: 'Score drift hook — monitoring contract for score behaviour over time',
  },
  {
    surfaceId: 'l11:score_evidence_read_surface',
    outputClass: L11OutputSurfaceClass.SCORE_EVIDENCE_READ_SURFACE,
    authorityMode: 'EVIDENCE_READ_SURFACE',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'score_subject_id',
      'read_surface_id',
      'formula_version',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    versionRequired: true,
    meaningClaimRequired: false,
    directionDeclarationRequired: false,
    attributionRequired: true,
    missingDataDisclosureRequired: true,
    contradictionDisclosureRequired: true,
    hypothesisPostureRequired: true,
    regimePostureRequired: true,
    sequencePostureRequired: true,
    restrictionAware: true,
    calibrationHookCapable: false,
    driftHookCapable: false,
    nonFinalJudgment: true,
    nonRecommendation: true,
    allowedDownstreamConsumers: ['L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:read_resolution -> l11.score_evidence',
    description: 'Score evidence-backed read surface — lineage-bound evidence packs for later layers',
  },
];

export function getL11OutputSurface(
  surfaceId: string,
): L11OutputSurfaceDescriptor | undefined {
  return L11_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL11RegisteredOutput(surfaceId: string): boolean {
  return L11_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isL11RegisteredOutputClass(cls: L11OutputSurfaceClass): boolean {
  return L11_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getAllL11RequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L11_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}

export function getL11AllowedConsumersForOutput(
  surfaceId: string,
): readonly string[] {
  const s = getL11OutputSurface(surfaceId);
  if (!s) return [];
  return s.allowedDownstreamConsumers;
}

export function getL11OutputsByClass(
  cls: L11OutputSurfaceClass,
): readonly L11OutputSurfaceDescriptor[] {
  return L11_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
}

export function getL11OutputsRequiringLineage():
  readonly L11OutputSurfaceDescriptor[] {
  return L11_OUTPUT_SURFACES.filter(s => s.lineageRequired);
}

export function getL11OutputsRequiringReplay():
  readonly L11OutputSurfaceDescriptor[] {
  return L11_OUTPUT_SURFACES.filter(s => s.replayRequired);
}

export function getL11OutputsRequiringAttribution():
  readonly L11OutputSurfaceDescriptor[] {
  return L11_OUTPUT_SURFACES.filter(s => s.attributionRequired);
}

export function getL11OutputsRequiringMeaningClaim():
  readonly L11OutputSurfaceDescriptor[] {
  return L11_OUTPUT_SURFACES.filter(s => s.meaningClaimRequired);
}

export function getL11OutputsRequiringDirection():
  readonly L11OutputSurfaceDescriptor[] {
  return L11_OUTPUT_SURFACES.filter(s => s.directionDeclarationRequired);
}

export function isL11AllowedDownstreamConsumer(
  surfaceId: string,
  consumer: string,
): boolean {
  const s = getL11OutputSurface(surfaceId);
  if (!s) return false;
  return s.allowedDownstreamConsumers.includes(consumer);
}
