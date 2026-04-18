/**
 * L8.1 — Output Surface Contract
 *
 * §8.1.6 — Five first-class output classes, no more. §8.1.6.4 —
 * L8OutputSurfaceRegistry declares authority mode, replay and lineage
 * requirements, and the set of allowed downstream consumers per surface.
 *
 * §8.1.6.5 — These output classes must remain separate — regime state,
 * regime confidence, transition profile, multiplier profile, and
 * evidence read surface are distinct artifacts.
 */

import { L8OutputSurfaceClass } from './l8-constitutional-types';

export interface L8OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L8OutputSurfaceClass;
  readonly authorityMode: 'HISTORICAL' | 'CURRENT' | 'IMMUTABLE_SNAPSHOT';
  readonly replayRequired: boolean;
  readonly lineageRequired: boolean;
  readonly requiredLineageFields: readonly string[];
  readonly allowedDownstreamConsumers: readonly string[];
  readonly l5StorageRoute: string;
  readonly evidenceBound: boolean;
  readonly description: string;
}

export const L8_OUTPUT_SURFACES: readonly L8OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l8:regime_state',
    outputClass: L8OutputSurfaceClass.REGIME_STATE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'regime_subject_id',
      'regime_family',
      'classified_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L8_TRANSITION',
      'L8_CONFIDENCE',
      'L8_MULTIPLIER',
      'L9_SCENARIO',
      'L9_JUDGMENT',
      'AUDIT',
    ],
    l5StorageRoute: 'POSTGRES_REGIME_REGISTRY + CLICKHOUSE_REGIME_HISTORY',
    evidenceBound: true,
    description:
      'Regime state for a subject — primary regime, optional secondary, ' +
      'multi-family coexistence, and transition flag.',
  },
  {
    surfaceId: 'l8:regime_confidence_profile',
    outputClass: L8OutputSurfaceClass.REGIME_CONFIDENCE_PROFILE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'regime_subject_id',
      'assessed_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L8_MULTIPLIER',
      'L9_SCENARIO',
      'L9_JUDGMENT',
    ],
    l5StorageRoute: 'POSTGRES_REGIME_REGISTRY',
    evidenceBound: true,
    description:
      'Regime-call confidence profile — justified reliance on the regime call, ' +
      'distinct from L7 confidence and from final judgment confidence.',
  },
  {
    surfaceId: 'l8:regime_transition_profile',
    outputClass: L8OutputSurfaceClass.REGIME_TRANSITION_PROFILE,
    authorityMode: 'IMMUTABLE_SNAPSHOT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'transition_profile_id',
      'regime_subject_id',
      'detected_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L8_MULTIPLIER',
      'L9_SCENARIO',
      'L9_JUDGMENT',
      'AUDIT',
    ],
    l5StorageRoute: 'POSTGRES_REGIME_REGISTRY + CLICKHOUSE_REGIME_HISTORY',
    evidenceBound: true,
    description:
      'Transition profile — transition candidates, direction, maturity, and risk ' +
      'posture. Preserves coexistence rather than flattens it.',
  },
  {
    surfaceId: 'l8:regime_multiplier_profile',
    outputClass: L8OutputSurfaceClass.REGIME_MULTIPLIER_PROFILE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'regime_subject_id',
      'profile_generated_at',
      'regime_family',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_SCENARIO',
      'L9_JUDGMENT',
      'L9_RECOMMENDATION',
    ],
    l5StorageRoute: 'POSTGRES_REGIME_REGISTRY',
    evidenceBound: true,
    description:
      'Regime-specific interpretation multipliers. Interpretive modifiers only — ' +
      'never final scores, judgments, or recommendations.',
  },
  {
    surfaceId: 'l8:regime_evidence_read_surface',
    outputClass: L8OutputSurfaceClass.REGIME_EVIDENCE_READ_SURFACE,
    authorityMode: 'HISTORICAL',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'regime_subject_id',
      'read_surface_id',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_SCENARIO',
      'L9_JUDGMENT',
      'AUDIT',
      'L5_REPLAY',
    ],
    l5StorageRoute: 'OBJECT_STORAGE_EVIDENCE + POSTGRES_REGIME_REGISTRY',
    evidenceBound: true,
    description:
      'Governed evidence-backed read surface exposing historical regime state, ' +
      'transition profiles, and multiplier profiles to later layers.',
  },
];

export function getL8OutputSurface(
  surfaceId: string,
): L8OutputSurfaceDescriptor | undefined {
  return L8_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL8RegisteredOutput(surfaceId: string): boolean {
  return L8_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isL8RegisteredOutputClass(cls: L8OutputSurfaceClass): boolean {
  return L8_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getAllL8RequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L8_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}

export function getL8AllowedConsumersForOutput(surfaceId: string): readonly string[] {
  const s = getL8OutputSurface(surfaceId);
  if (!s) return [];
  return s.allowedDownstreamConsumers;
}
