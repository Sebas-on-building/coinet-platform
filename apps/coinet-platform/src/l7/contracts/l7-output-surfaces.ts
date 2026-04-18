/**
 * L7.1 — Output Surface Contract
 *
 * §7.1.7 — Five first-class output classes, no more. §7.1.7.4 —
 * L7OutputSurfaceRegistry declares authority mode, replay and lineage
 * requirements, and the set of allowed downstream consumers per surface.
 */

import { L7OutputSurfaceClass } from './l7-constitutional-types';

export interface OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L7OutputSurfaceClass;
  readonly authorityMode: 'HISTORICAL' | 'CURRENT' | 'IMMUTABLE_SNAPSHOT';
  readonly replayRequired: boolean;
  readonly lineageRequired: boolean;
  readonly requiredLineageFields: readonly string[];
  readonly allowedDownstreamConsumers: readonly string[];
  readonly l5StorageRoute: string;
  readonly evidenceBound: boolean;
  readonly description: string;
}

export const L7_OUTPUT_SURFACES: readonly OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l7:validation_assessment',
    outputClass: L7OutputSurfaceClass.VALIDATION_ASSESSMENT,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'subject_id',
      'subject_class',
      'assessed_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: ['L7_CONFIDENCE', 'L7_RESTRICTION', 'L8_SCENARIO'],
    l5StorageRoute: 'POSTGRES_VALIDATION_REGISTRY + CLICKHOUSE_VALIDATION_HISTORY',
    evidenceBound: true,
    description:
      'Validation assessment for a subject — confirmed, weakly confirmed, ' +
      'conflicting, insufficient, stale, ambiguous, or degraded.',
  },
  {
    surfaceId: 'l7:contradiction_bundle',
    outputClass: L7OutputSurfaceClass.CONTRADICTION_BUNDLE,
    authorityMode: 'IMMUTABLE_SNAPSHOT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'contradiction_bundle_id',
      'subject_id',
      'detected_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: ['L7_CONFIDENCE', 'L7_RESTRICTION', 'L8_SCENARIO', 'AUDIT'],
    l5StorageRoute: 'POSTGRES_CONTRADICTION_REGISTRY + OBJECT_STORAGE_EVIDENCE',
    evidenceBound: true,
    description:
      'Immutable bundle of contradictions detected during validation — ' +
      'must preserve each contradiction with its lineage.',
  },
  {
    surfaceId: 'l7:confidence_assessment',
    outputClass: L7OutputSurfaceClass.CONFIDENCE_ASSESSMENT,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'subject_id',
      'assessed_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: ['L7_RESTRICTION', 'L8_SCENARIO'],
    l5StorageRoute: 'POSTGRES_VALIDATION_REGISTRY',
    evidenceBound: true,
    description:
      'Justified confidence assessment derived from validation outcome — ' +
      'distinct from L3 confidence and from final judgment.',
  },
  {
    surfaceId: 'l7:restriction_profile',
    outputClass: L7OutputSurfaceClass.RESTRICTION_PROFILE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'subject_id',
      'profile_generated_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: ['L8_SCENARIO', 'L8_JUDGMENT', 'L9_RECOMMENDATION'],
    l5StorageRoute: 'POSTGRES_VALIDATION_REGISTRY',
    evidenceBound: true,
    description:
      'Restriction profile describing how downstream layers are allowed to ' +
      'use this validation outcome.',
  },
  {
    surfaceId: 'l7:validation_evidence_read_surface',
    outputClass: L7OutputSurfaceClass.VALIDATION_EVIDENCE_READ_SURFACE,
    authorityMode: 'HISTORICAL',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'subject_id',
      'read_surface_id',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: ['L8_SCENARIO', 'L8_JUDGMENT', 'AUDIT', 'L5_REPLAY'],
    l5StorageRoute: 'OBJECT_STORAGE_EVIDENCE + POSTGRES_VALIDATION_REGISTRY',
    evidenceBound: true,
    description:
      'Governed read surface exposing evidence-backed validation state to ' +
      'later layers.',
  },
];

export function getOutputSurface(surfaceId: string): OutputSurfaceDescriptor | undefined {
  return L7_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isRegisteredOutput(surfaceId: string): boolean {
  return L7_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isRegisteredOutputClass(cls: L7OutputSurfaceClass): boolean {
  return L7_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getAllRequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L7_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}

export function getAllowedConsumersForOutput(surfaceId: string): readonly string[] {
  const s = getOutputSurface(surfaceId);
  if (!s) return [];
  return s.allowedDownstreamConsumers;
}
