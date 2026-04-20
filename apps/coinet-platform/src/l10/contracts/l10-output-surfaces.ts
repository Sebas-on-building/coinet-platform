/**
 * L10.1 — Output Surface Contract
 *
 * §10.1.6 / §10.1.10.2 — First-class Layer 10 output surfaces. Every L10
 * output belongs to one of exactly five classes, is evidence-bound,
 * replay-safe, lineage-carrying, restriction-aware, routed through L5,
 * and explicitly not a final judgment/scenario/scoring/recommendation
 * surface.
 */

import { L10OutputSurfaceClass } from './l10-constitutional-types';

export interface L10OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L10OutputSurfaceClass;
  readonly authorityMode:
    | 'HYPOTHESIS_AUTHORITY'
    | 'INTERPRETIVE_POSTURE'
    | 'SHIFT_CONDITION_PROFILE'
    | 'EVIDENCE_READ_SURFACE';
  readonly replayRequired: boolean;
  readonly lineageRequired: boolean;
  readonly requiredLineageFields: readonly string[];
  readonly evidenceBound: boolean;
  readonly restrictionAware: boolean;
  readonly regimePostureAware: boolean;
  readonly sequencePostureAware: boolean;
  readonly contradictionPostureAware: boolean;
  readonly competitionPreservationRequired: boolean;
  readonly spreadPreservationRequired: boolean;
  readonly alternativePreservationRequired: boolean;
  readonly shiftConditionPreservationRequired: boolean;
  readonly evidencePackRequired: boolean;
  readonly allowedDownstreamConsumers: readonly string[];
  readonly l5StorageRoute: string;
  readonly description: string;
}

export const L10_OUTPUT_SURFACES: readonly L10OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l10:hypothesis_assessment',
    outputClass: L10OutputSurfaceClass.HYPOTHESIS_ASSESSMENT,
    authorityMode: 'HYPOTHESIS_AUTHORITY',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'hypothesis_subject_id',
      'assessed_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: true,
    contradictionPostureAware: true,
    competitionPreservationRequired: true,
    spreadPreservationRequired: true,
    alternativePreservationRequired: true,
    shiftConditionPreservationRequired: true,
    evidencePackRequired: true,
    allowedDownstreamConsumers: ['L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l10.hypothesis_assessment',
    description:
      'Hypothesis assessment — primary and alternative candidates with evidence, posture, and spread',
  },
  {
    surfaceId: 'l10:hypothesis_ranking',
    outputClass: L10OutputSurfaceClass.HYPOTHESIS_RANKING,
    authorityMode: 'INTERPRETIVE_POSTURE',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'hypothesis_subject_id',
      'ranking_id',
      'ranked_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: true,
    contradictionPostureAware: true,
    competitionPreservationRequired: true,
    spreadPreservationRequired: true,
    alternativePreservationRequired: true,
    shiftConditionPreservationRequired: true,
    evidencePackRequired: true,
    allowedDownstreamConsumers: ['L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l10.hypothesis_ranking',
    description:
      'Hypothesis ranking — primary/alternative order with explicit spread and stability posture',
  },
  {
    surfaceId: 'l10:hypothesis_spread_profile',
    outputClass: L10OutputSurfaceClass.HYPOTHESIS_SPREAD_PROFILE,
    authorityMode: 'INTERPRETIVE_POSTURE',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'hypothesis_subject_id',
      'spread_profile_id',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: true,
    contradictionPostureAware: true,
    competitionPreservationRequired: true,
    spreadPreservationRequired: true,
    alternativePreservationRequired: true,
    shiftConditionPreservationRequired: false,
    evidencePackRequired: false,
    allowedDownstreamConsumers: ['L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l10.hypothesis_spread_profile',
    description:
      'Hypothesis spread profile — primary-vs-alternative distance, narrowing classification, evidence asymmetry',
  },
  {
    surfaceId: 'l10:shift_condition_set',
    outputClass: L10OutputSurfaceClass.SHIFT_CONDITION_SET,
    authorityMode: 'SHIFT_CONDITION_PROFILE',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'hypothesis_subject_id',
      'shift_condition_set_id',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: true,
    contradictionPostureAware: true,
    competitionPreservationRequired: true,
    spreadPreservationRequired: false,
    alternativePreservationRequired: true,
    shiftConditionPreservationRequired: true,
    evidencePackRequired: false,
    allowedDownstreamConsumers: ['L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:write_coordination -> l10.shift_condition_set',
    description:
      'Shift condition set — what would change the ranking or invalidate the primary',
  },
  {
    surfaceId: 'l10:hypothesis_evidence_read_surface',
    outputClass: L10OutputSurfaceClass.HYPOTHESIS_EVIDENCE_READ_SURFACE,
    authorityMode: 'EVIDENCE_READ_SURFACE',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'hypothesis_subject_id',
      'read_surface_id',
      'trace_id',
      'manifest_id',
    ],
    evidenceBound: true,
    restrictionAware: true,
    regimePostureAware: true,
    sequencePostureAware: true,
    contradictionPostureAware: true,
    competitionPreservationRequired: false,
    spreadPreservationRequired: false,
    alternativePreservationRequired: false,
    shiftConditionPreservationRequired: false,
    evidencePackRequired: true,
    allowedDownstreamConsumers: ['L11', 'L12', 'L13', 'L14', 'L15', 'L16'],
    l5StorageRoute: 'l5:read_resolution -> l10.hypothesis_evidence',
    description:
      'Hypothesis evidence-backed read surface — lineage-bound evidence packs for later layers',
  },
];

export function getL10OutputSurface(surfaceId: string): L10OutputSurfaceDescriptor | undefined {
  return L10_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL10RegisteredOutput(surfaceId: string): boolean {
  return L10_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isL10RegisteredOutputClass(cls: L10OutputSurfaceClass): boolean {
  return L10_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getAllL10RequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L10_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}

export function getL10AllowedConsumersForOutput(surfaceId: string): readonly string[] {
  const s = getL10OutputSurface(surfaceId);
  if (!s) return [];
  return s.allowedDownstreamConsumers;
}

export function getL10OutputsByClass(
  cls: L10OutputSurfaceClass,
): readonly L10OutputSurfaceDescriptor[] {
  return L10_OUTPUT_SURFACES.filter(s => s.outputClass === cls);
}

export function getL10OutputsRequiringLineage(): readonly L10OutputSurfaceDescriptor[] {
  return L10_OUTPUT_SURFACES.filter(s => s.lineageRequired);
}

export function getL10OutputsRequiringReplay(): readonly L10OutputSurfaceDescriptor[] {
  return L10_OUTPUT_SURFACES.filter(s => s.replayRequired);
}

export function getL10OutputsRequiringCompetitionPreservation(): readonly L10OutputSurfaceDescriptor[] {
  return L10_OUTPUT_SURFACES.filter(s => s.competitionPreservationRequired);
}

export function isL10AllowedDownstreamConsumer(surfaceId: string, consumer: string): boolean {
  const s = getL10OutputSurface(surfaceId);
  if (!s) return false;
  return s.allowedDownstreamConsumers.includes(consumer);
}
