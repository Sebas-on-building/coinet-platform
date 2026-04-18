/**
 * L5.7 Assurance — Replay Bundle Builder
 *
 * §5.7.5.4 — Produces deterministic replay bundles.
 */

import { createHash } from 'crypto';
import type { ReplayLookupResult } from './replay-lookup.service';
import { L5ReplayFidelity } from './replay-fidelity';

export interface ReplayBundle {
  readonly bundle_id: string;
  readonly fidelity: L5ReplayFidelity;
  readonly trace_ids: readonly string[];
  readonly manifest_ids: readonly string[];
  readonly envelope_ids: readonly string[];
  readonly archive_ids: readonly string[];
  readonly evidence_manifest: readonly string[];
  readonly coverage_summary: ReplayCoverageSummary;
  readonly missing_warnings: readonly string[];
  readonly checksum_sha256: string;
  readonly built_at: string;
}

export interface ReplayCoverageSummary {
  readonly total_required_surfaces: number;
  readonly present_surfaces: number;
  readonly missing_surfaces: number;
  readonly coverage_ratio: number;
}

export function buildReplayBundle(lookup: ReplayLookupResult): ReplayBundle {
  const bundleId = createHash('sha256')
    .update([...lookup.resolved_trace_ids, ...lookup.resolved_manifest_ids, lookup.fidelity].join('|'))
    .digest('hex')
    .slice(0, 32);

  const evidence: string[] = [];
  for (const mid of lookup.resolved_manifest_ids) evidence.push(`manifest:${mid}`);
  for (const eid of lookup.resolved_envelope_ids) evidence.push(`envelope:${eid}`);
  for (const aid of lookup.resolved_archive_ids) evidence.push(`archive:${aid}`);

  const totalRequired = 5;
  const present = totalRequired - lookup.missing_surfaces.length;

  const coverage: ReplayCoverageSummary = {
    total_required_surfaces: totalRequired,
    present_surfaces: Math.max(0, present),
    missing_surfaces: lookup.missing_surfaces.length,
    coverage_ratio: Math.max(0, present) / totalRequired,
  };

  const checksumInput = [bundleId, ...evidence, ...lookup.missing_surfaces].join('|');
  const checksum = createHash('sha256').update(checksumInput).digest('hex');

  return {
    bundle_id: bundleId,
    fidelity: lookup.fidelity,
    trace_ids: lookup.resolved_trace_ids,
    manifest_ids: lookup.resolved_manifest_ids,
    envelope_ids: lookup.resolved_envelope_ids,
    archive_ids: lookup.resolved_archive_ids,
    evidence_manifest: evidence,
    coverage_summary: coverage,
    missing_warnings: lookup.missing_surfaces,
    checksum_sha256: checksum,
    built_at: new Date().toISOString(),
  };
}
