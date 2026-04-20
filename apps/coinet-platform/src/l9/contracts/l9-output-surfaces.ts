/**
 * L9.1 — Output Surface Contract
 *
 * §9.1.5.4 — Seven first-class L9 output classes, no more.
 *
 * Output surfaces declare authority mode, replay and lineage
 * requirements, allowed downstream consumers, and L5 storage route. The
 * seven surfaces cover: SEQUENCE_ASSESSMENT, SEQUENCE_CHAIN,
 * LEAD_LAG_PROFILE, PHASE_STATE, DECAY_PROFILE,
 * SEQUENCE_RESTRICTION_PROFILE, and SEQUENCE_EVIDENCE_READ_SURFACE.
 */

import { L9OutputSurfaceClass } from './l9-constitutional-types';

export interface L9OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L9OutputSurfaceClass;
  readonly authorityMode: 'HISTORICAL' | 'CURRENT' | 'IMMUTABLE_SNAPSHOT';
  readonly replayRequired: boolean;
  readonly lineageRequired: boolean;
  readonly requiredLineageFields: readonly string[];
  readonly allowedDownstreamConsumers: readonly string[];
  readonly l5StorageRoute: string;
  readonly evidenceBound: boolean;
  readonly description: string;
}

export const L9_OUTPUT_SURFACES: readonly L9OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l9:sequence_assessment',
    outputClass: L9OutputSurfaceClass.SEQUENCE_ASSESSMENT,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'sequence_subject_id',
      'assessed_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_CHAIN',
      'L9_PHASE',
      'L9_DECAY',
      'L10_SCENARIO',
      'L10_JUDGMENT',
      'AUDIT',
    ],
    l5StorageRoute: 'POSTGRES_SEQUENCE_REGISTRY + CLICKHOUSE_SEQUENCE_HISTORY',
    evidenceBound: true,
    description:
      'Top-level sequence assessment — rolls up chain, lead-lag, phase, and decay posture for a subject.',
  },
  {
    surfaceId: 'l9:sequence_chain',
    outputClass: L9OutputSurfaceClass.SEQUENCE_CHAIN,
    authorityMode: 'IMMUTABLE_SNAPSHOT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'sequence_subject_id',
      'chain_id',
      'assembled_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_ASSESSMENT',
      'L9_LEAD_LAG',
      'L9_PHASE',
      'L10_SCENARIO',
      'AUDIT',
    ],
    l5StorageRoute: 'POSTGRES_SEQUENCE_REGISTRY + CLICKHOUSE_SEQUENCE_HISTORY',
    evidenceBound: true,
    description:
      'Ordered signal chain — governed ordering with explicit ambiguity and causal-restraint posture.',
  },
  {
    surfaceId: 'l9:lead_lag_profile',
    outputClass: L9OutputSurfaceClass.LEAD_LAG_PROFILE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'sequence_subject_id',
      'lead_lag_profile_id',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_ASSESSMENT',
      'L9_PHASE',
      'L10_SCENARIO',
      'L10_JUDGMENT',
    ],
    l5StorageRoute: 'POSTGRES_SEQUENCE_REGISTRY',
    evidenceBound: true,
    description:
      'Governed lead-lag structure for related signals — with causal-restraint tag, never causal certainty.',
  },
  {
    surfaceId: 'l9:phase_state',
    outputClass: L9OutputSurfaceClass.PHASE_STATE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'sequence_subject_id',
      'phase_state_id',
      'classified_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_ASSESSMENT',
      'L9_DECAY',
      'L10_SCENARIO',
      'L10_JUDGMENT',
    ],
    l5StorageRoute: 'POSTGRES_SEQUENCE_REGISTRY + CLICKHOUSE_SEQUENCE_HISTORY',
    evidenceBound: true,
    description:
      'Phase state — early / validated / crowded / reflexive / decaying / post-shock, governed not rhetorical.',
  },
  {
    surfaceId: 'l9:decay_profile',
    outputClass: L9OutputSurfaceClass.DECAY_PROFILE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'sequence_subject_id',
      'decay_profile_id',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_ASSESSMENT',
      'L9_PHASE',
      'L10_SCENARIO',
      'L10_JUDGMENT',
    ],
    l5StorageRoute: 'POSTGRES_SEQUENCE_REGISTRY',
    evidenceBound: true,
    description: 'Governed decay posture of sequence signals over time.',
  },
  {
    surfaceId: 'l9:sequence_restriction_profile',
    outputClass: L9OutputSurfaceClass.SEQUENCE_RESTRICTION_PROFILE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'sequence_subject_id',
      'restriction_profile_id',
      'derived_at',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L9_ASSESSMENT',
      'L10_SCENARIO',
      'L10_JUDGMENT',
      'L10_RECOMMENDATION',
    ],
    l5StorageRoute: 'POSTGRES_SEQUENCE_REGISTRY',
    evidenceBound: true,
    description:
      'Sequence-specific downstream usage restrictions — interpretive posture only, never final scoring.',
  },
  {
    surfaceId: 'l9:sequence_evidence_read_surface',
    outputClass: L9OutputSurfaceClass.SEQUENCE_EVIDENCE_READ_SURFACE,
    authorityMode: 'HISTORICAL',
    replayRequired: true,
    lineageRequired: true,
    requiredLineageFields: [
      'sequence_subject_id',
      'read_surface_id',
      'trace_id',
      'manifest_id',
    ],
    allowedDownstreamConsumers: [
      'L10_SCENARIO',
      'L10_JUDGMENT',
      'AUDIT',
      'L5_REPLAY',
    ],
    l5StorageRoute: 'OBJECT_STORAGE_EVIDENCE + POSTGRES_SEQUENCE_REGISTRY',
    evidenceBound: true,
    description:
      'Governed evidence-backed read surface exposing historical sequence state to later layers.',
  },
];

export function getL9OutputSurface(
  surfaceId: string,
): L9OutputSurfaceDescriptor | undefined {
  return L9_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isL9RegisteredOutput(surfaceId: string): boolean {
  return L9_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isL9RegisteredOutputClass(cls: L9OutputSurfaceClass): boolean {
  return L9_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getAllL9RequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L9_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}

export function getL9AllowedConsumersForOutput(surfaceId: string): readonly string[] {
  const s = getL9OutputSurface(surfaceId);
  if (!s) return [];
  return s.allowedDownstreamConsumers;
}
