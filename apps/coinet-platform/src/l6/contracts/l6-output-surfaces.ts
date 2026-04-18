/**
 * L6.1 — Output Surface Contract
 *
 * §6.1.7 — Four first-class output surfaces, no more.
 * §6.1.7.6 — L6OutputSurfaceRegistry definition.
 */

import { L6OutputSurfaceClass, ALL_OUTPUT_SURFACE_CLASSES, L6PrimitiveClass } from './l6-constitutional-types';

export interface OutputSurfaceDescriptor {
  readonly surfaceId: string;
  readonly outputClass: L6OutputSurfaceClass;
  readonly primitiveClass: L6PrimitiveClass | 'CROSS_CUTTING';
  readonly authorityMode: 'HISTORICAL' | 'CURRENT' | 'IMMUTABLE_SNAPSHOT';
  readonly replayRequired: boolean;
  readonly requiredLineageFields: readonly string[];
  readonly allowedDownstreamConsumers: readonly string[];
  readonly l5StorageRoute: string;
  readonly description: string;
}

export const L6_OUTPUT_SURFACES: readonly OutputSurfaceDescriptor[] = [
  {
    surfaceId: 'l6:feature_history_fact',
    outputClass: L6OutputSurfaceClass.FEATURE_HISTORY_FACT,
    primitiveClass: L6PrimitiveClass.FEATURE,
    authorityMode: 'HISTORICAL',
    replayRequired: true,
    requiredLineageFields: ['feature_id', 'scope_type', 'scope_id', 'computed_at', 'trace_id', 'manifest_id'],
    allowedDownstreamConsumers: ['L7_SCORING', 'L7_BASELINE', 'L6_EVIDENCE', 'L6_EVENT_DETECTION'],
    l5StorageRoute: 'CLICKHOUSE_TS_FEATURE_FACT',
    description: 'Time-indexed feature values — historical primitive state',
  },
  {
    surfaceId: 'l6:current_feature_state',
    outputClass: L6OutputSurfaceClass.CURRENT_FEATURE_STATE,
    primitiveClass: L6PrimitiveClass.FEATURE,
    authorityMode: 'CURRENT',
    replayRequired: true,
    requiredLineageFields: ['feature_id', 'scope_type', 'scope_id', 'computed_at', 'trace_id', 'manifest_id'],
    allowedDownstreamConsumers: ['L7_SCORING', 'L7_SCENARIO', 'L6_EVENT_DETECTION'],
    l5StorageRoute: 'POSTGRES_FEATURE_REGISTRY + REDIS_HOT_FEATURE',
    description: 'Latest authoritative materialization of feature state per scope',
  },
  {
    surfaceId: 'l6:event_instance',
    outputClass: L6OutputSurfaceClass.EVENT_INSTANCE,
    primitiveClass: L6PrimitiveClass.EVENT,
    authorityMode: 'IMMUTABLE_SNAPSHOT',
    replayRequired: true,
    requiredLineageFields: ['event_id', 'event_type', 'scope_type', 'scope_id', 'detected_at', 'trace_id', 'manifest_id'],
    allowedDownstreamConsumers: ['L7_SCORING', 'L7_SCENARIO', 'L7_ALERTING', 'L6_EVIDENCE'],
    l5StorageRoute: 'POSTGRES_EVENT_REGISTRY + CLICKHOUSE_EVENT_HISTORY',
    description: 'Lifecycle-governed change objects — stateful, replayable event primitives',
  },
  {
    surfaceId: 'l6:evidence_pack',
    outputClass: L6OutputSurfaceClass.EVIDENCE_PACK,
    primitiveClass: 'CROSS_CUTTING',
    authorityMode: 'IMMUTABLE_SNAPSHOT',
    replayRequired: true,
    requiredLineageFields: ['evidence_pack_id', 'subject_type', 'subject_id', 'created_at', 'trace_id', 'manifest_id'],
    allowedDownstreamConsumers: ['L7_SCORING', 'L5_REPLAY', 'AUDIT'],
    l5StorageRoute: 'OBJECT_STORAGE_EVIDENCE',
    description: 'Replayable bundles proving why a feature or event exists',
  },
];

export function getOutputSurface(surfaceId: string): OutputSurfaceDescriptor | undefined {
  return L6_OUTPUT_SURFACES.find(s => s.surfaceId === surfaceId);
}

export function isRegisteredOutput(surfaceId: string): boolean {
  return L6_OUTPUT_SURFACES.some(s => s.surfaceId === surfaceId);
}

export function isRegisteredOutputClass(cls: L6OutputSurfaceClass): boolean {
  return L6_OUTPUT_SURFACES.some(s => s.outputClass === cls);
}

export function getOutputsForPrimitive(cls: L6PrimitiveClass): readonly OutputSurfaceDescriptor[] {
  return L6_OUTPUT_SURFACES.filter(s => s.primitiveClass === cls);
}

export function getAllRequiredLineageFields(): readonly string[] {
  const fields = new Set<string>();
  for (const s of L6_OUTPUT_SURFACES) {
    for (const f of s.requiredLineageFields) fields.add(f);
  }
  return [...fields];
}
