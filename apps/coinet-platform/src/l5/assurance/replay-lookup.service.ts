/**
 * L5.7 Assurance — Replay Lookup Service
 *
 * §5.7.5.2 — Accepts replay entry point, resolves lineage, detects gaps.
 */

import type { L5ReplayRequest, ReplayEntryPointType } from './replay-entry-point';
import { L5ReplayFidelity, getFidelityRequirements } from './replay-fidelity';

export interface ReplayLookupResult {
  readonly entry_point_type: ReplayEntryPointType;
  readonly resolved_trace_ids: readonly string[];
  readonly resolved_manifest_ids: readonly string[];
  readonly resolved_envelope_ids: readonly string[];
  readonly resolved_archive_ids: readonly string[];
  readonly fidelity: L5ReplayFidelity;
  readonly missing_surfaces: readonly string[];
  readonly completeness: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
}

const lookupStore = new Map<string, { trace_id: string; manifest_id: string; envelope_id: string; archive_id: string | null }>();

export function resetReplayLookupStore(): void { lookupStore.clear(); }

export function registerReplayableWrite(key: string, data: { trace_id: string; manifest_id: string; envelope_id: string; archive_id: string | null }): void {
  lookupStore.set(key, data);
}

export function lookupReplay(req: L5ReplayRequest): ReplayLookupResult {
  const key = typeof req.value === 'string' ? req.value : `${req.value.scope_type}:${req.value.scope_id}`;
  const entry = lookupStore.get(key);
  const reqs = getFidelityRequirements(req.fidelity);
  const missing: string[] = [];

  if (!entry) {
    return {
      entry_point_type: req.entry_point_type,
      resolved_trace_ids: [], resolved_manifest_ids: [], resolved_envelope_ids: [], resolved_archive_ids: [],
      fidelity: req.fidelity, missing_surfaces: ['No matching lineage found'], completeness: 'INSUFFICIENT',
    };
  }

  if (reqs.requiresManifest && !entry.manifest_id) missing.push('manifest');
  if (reqs.requiresEnvelope && !entry.envelope_id) missing.push('envelope');
  if (reqs.requiresArchivePointers && !entry.archive_id) missing.push('archive_pointer');
  if (reqs.requiresRawArchive && !entry.archive_id) missing.push('raw_archive');
  if (reqs.requiresNormalizedEnvelope && !entry.envelope_id) missing.push('normalized_envelope');

  const completeness = missing.length === 0 ? 'COMPLETE' : missing.length <= 2 ? 'PARTIAL' : 'INSUFFICIENT';

  return {
    entry_point_type: req.entry_point_type,
    resolved_trace_ids: [entry.trace_id],
    resolved_manifest_ids: [entry.manifest_id],
    resolved_envelope_ids: [entry.envelope_id],
    resolved_archive_ids: entry.archive_id ? [entry.archive_id] : [],
    fidelity: req.fidelity,
    missing_surfaces: missing,
    completeness,
  };
}
