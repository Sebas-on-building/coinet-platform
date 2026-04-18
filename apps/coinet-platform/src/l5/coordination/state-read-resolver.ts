/**
 * L5.5 Write Coordination — State Read Resolver
 *
 * §5.5.5.10 — StateReadResolver
 * §5.5.15 — StateReadResolver law
 */

import { L5ManifestState, L5ProjectionStatus } from './coordination-state';
import type { L5CoordinationManifest } from './consistency-model';

// ═══════════════════════════════════════════════════════════════════════════════
// READ SOURCE
// ═══════════════════════════════════════════════════════════════════════════════

export type ReadSource = 'AUTHORITY' | 'PROJECTION' | 'CACHE' | 'DEGRADED' | 'UNAVAILABLE';

export interface ReadResolution {
  readonly source: ReadSource;
  readonly storeUsed: string;
  readonly authorityAvailable: boolean;
  readonly projectionLagAcceptable: boolean;
  readonly incompletenessVisible: boolean;
  readonly caveats: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// READ POLICY
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReadPolicy {
  readonly allowProjectionFallback: boolean;
  readonly maxAcceptableLagMs: number;
  readonly requireCompleteness: boolean;
}

const DEFAULT_READ_POLICY: ReadPolicy = {
  allowProjectionFallback: true,
  maxAcceptableLagMs: 60_000,
  requireCompleteness: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

export function resolveRead(
  manifest: L5CoordinationManifest | undefined,
  policy: ReadPolicy = DEFAULT_READ_POLICY,
): ReadResolution {
  if (!manifest) {
    return {
      source: 'UNAVAILABLE',
      storeUsed: 'NONE',
      authorityAvailable: false,
      projectionLagAcceptable: false,
      incompletenessVisible: true,
      caveats: ['No manifest found for this datum'],
    };
  }

  if (manifest.primary_authority_committed) {
    return {
      source: 'AUTHORITY',
      storeUsed: manifest.primary_authority_store,
      authorityAvailable: true,
      projectionLagAcceptable: true,
      incompletenessVisible: manifest.state !== L5ManifestState.FINALIZED,
      caveats: manifest.state !== L5ManifestState.FINALIZED ? ['Write not yet finalized; projections may be pending'] : [],
    };
  }

  if (policy.allowProjectionFallback) {
    const anyProjectionDone = manifest.projection_jobs.some(j => j.status === L5ProjectionStatus.SUCCEEDED);
    if (anyProjectionDone) {
      return {
        source: 'PROJECTION',
        storeUsed: manifest.projection_jobs.find(j => j.status === L5ProjectionStatus.SUCCEEDED)?.target_store ?? 'UNKNOWN',
        authorityAvailable: false,
        projectionLagAcceptable: true,
        incompletenessVisible: true,
        caveats: ['Reading from projection; authority commit not yet confirmed'],
      };
    }
  }

  if (manifest.state === L5ManifestState.QUARANTINED || manifest.state === L5ManifestState.FAILED_FATAL) {
    return {
      source: 'UNAVAILABLE',
      storeUsed: 'NONE',
      authorityAvailable: false,
      projectionLagAcceptable: false,
      incompletenessVisible: true,
      caveats: [`Manifest is in terminal state '${manifest.state}'`],
    };
  }

  return {
    source: 'DEGRADED',
    storeUsed: 'NONE',
    authorityAvailable: false,
    projectionLagAcceptable: false,
    incompletenessVisible: true,
    caveats: ['Neither authority nor projections available yet'],
  };
}

export function isProjectionContradictingAuthority(
  authorityValue: unknown,
  projectionValue: unknown,
): boolean {
  if (authorityValue === undefined || projectionValue === undefined) return false;
  const authorityStr = typeof authorityValue === 'string' ? authorityValue : JSON.stringify(authorityValue);
  const projectionStr = typeof projectionValue === 'string' ? projectionValue : JSON.stringify(projectionValue);
  return authorityStr !== projectionStr;
}
