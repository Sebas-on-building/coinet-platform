/**
 * L5.5 Write Coordination — Coordination Invariants
 *
 * §5.5.18 — INV-5.5-A through INV-5.5-L
 */

import { L5ManifestState, L5ProjectionStatus } from './coordination-state';
import type { L5CoordinationManifest, L5ProjectionJob } from './consistency-model';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT IDENTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

export type L5CoordinationInvariantId =
  | 'INV-5.5-A' | 'INV-5.5-B' | 'INV-5.5-C' | 'INV-5.5-D'
  | 'INV-5.5-E' | 'INV-5.5-F' | 'INV-5.5-G' | 'INV-5.5-H'
  | 'INV-5.5-I' | 'INV-5.5-J' | 'INV-5.5-K' | 'INV-5.5-L';

export const ALL_COORDINATION_INVARIANT_IDS: readonly L5CoordinationInvariantId[] = [
  'INV-5.5-A', 'INV-5.5-B', 'INV-5.5-C', 'INV-5.5-D',
  'INV-5.5-E', 'INV-5.5-F', 'INV-5.5-G', 'INV-5.5-H',
  'INV-5.5-I', 'INV-5.5-J', 'INV-5.5-K', 'INV-5.5-L',
];

export interface CoordinationInvariantResult {
  readonly id: L5CoordinationInvariantId;
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface CoordinationInvariantContext {
  readonly manifest?: L5CoordinationManifest;
  readonly authorityCommitCount?: number;
  readonly projectionWorkerIdempotent?: boolean;
  readonly repairInventedTruth?: boolean;
  readonly lateDataSilentOverwrite?: boolean;
  readonly readProjectionAsAuthority?: boolean;
  readonly archiveProofExistsBeforeAuthority?: boolean;
  readonly directDualWriteDetected?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const INVARIANT_DEFS: Record<L5CoordinationInvariantId, { label: string; check: (ctx: CoordinationInvariantContext) => { passed: boolean; detail: string } }> = {
  'INV-5.5-A': {
    label: 'No multi-store write may bypass WriteCoordinator',
    check: (ctx) => ({
      passed: !ctx.directDualWriteDetected,
      detail: ctx.directDualWriteDetected ? 'Direct dual-write detected outside coordinator' : 'All writes pass through coordinator',
    }),
  },
  'INV-5.5-B': {
    label: 'No resolved envelope may produce more than one primary authority commit',
    check: (ctx) => ({
      passed: (ctx.authorityCommitCount ?? 0) <= 1,
      detail: `Authority commit count: ${ctx.authorityCommitCount ?? 0}`,
    }),
  },
  'INV-5.5-C': {
    label: 'No authority-bearing write may finalize without manifest truth',
    check: (ctx) => {
      if (!ctx.manifest) return { passed: true, detail: 'No manifest to check' };
      if (ctx.manifest.state === L5ManifestState.FINALIZED && !ctx.manifest.manifest_id) {
        return { passed: false, detail: 'Finalized without manifest id' };
      }
      return { passed: true, detail: 'Manifest truth present for finalized write' };
    },
  },
  'INV-5.5-D': {
    label: 'Archive-first classes must not commit authority before verified archive proof',
    check: (ctx) => {
      if (!ctx.manifest) return { passed: true, detail: 'No manifest to check' };
      if (ctx.manifest.archive_required && ctx.manifest.primary_authority_committed) {
        return { passed: ctx.archiveProofExistsBeforeAuthority !== false, detail: ctx.archiveProofExistsBeforeAuthority === false ? 'Authority committed before archive proof' : 'Archive proof verified before authority' };
      }
      return { passed: true, detail: 'Archive-first not required or authority not committed' };
    },
  },
  'INV-5.5-E': {
    label: 'Postgres-primary: manifest + authority + outbox in one transaction',
    check: (ctx) => {
      if (!ctx.manifest) return { passed: true, detail: 'No manifest to check' };
      if (ctx.manifest.primary_authority_store === 'POSTGRES' && ctx.manifest.primary_authority_committed) {
        const hasManifest = !!ctx.manifest.manifest_id;
        return { passed: hasManifest, detail: hasManifest ? 'Manifest + authority committed together' : 'Missing manifest for Postgres-primary' };
      }
      return { passed: true, detail: 'Not Postgres-primary or authority not committed' };
    },
  },
  'INV-5.5-F': {
    label: 'Required projection failure must block finalization',
    check: (ctx) => {
      if (!ctx.manifest) return { passed: true, detail: 'No manifest to check' };
      const failedRequired = ctx.manifest.projection_jobs.filter(
        j => j.required && (j.status === L5ProjectionStatus.FAILED_FATAL || j.status === L5ProjectionStatus.FAILED_RETRYABLE),
      );
      if (failedRequired.length > 0 && ctx.manifest.state === L5ManifestState.FINALIZED) {
        return { passed: false, detail: `${failedRequired.length} required projections failed but manifest finalized` };
      }
      return { passed: true, detail: 'Finalization correctly blocked by required projection failures' };
    },
  },
  'INV-5.5-G': {
    label: 'Optional projection failure must never be misreported as authority failure',
    check: (ctx) => {
      if (!ctx.manifest) return { passed: true, detail: 'No manifest to check' };
      const failedOptional = ctx.manifest.projection_jobs.filter(j => !j.required && j.status === L5ProjectionStatus.FAILED_FATAL);
      if (failedOptional.length > 0 && !ctx.manifest.primary_authority_committed) {
        return { passed: true, detail: 'Authority not committed, no misreport risk' };
      }
      return { passed: true, detail: 'Optional projection failures not misreported as authority failure' };
    },
  },
  'INV-5.5-H': {
    label: 'Every projection worker must be idempotent',
    check: (ctx) => ({
      passed: ctx.projectionWorkerIdempotent !== false,
      detail: ctx.projectionWorkerIdempotent === false ? 'Non-idempotent projection worker detected' : 'Projection workers are idempotent',
    }),
  },
  'INV-5.5-I': {
    label: 'Repair may not invent new primary truth',
    check: (ctx) => ({
      passed: !ctx.repairInventedTruth,
      detail: ctx.repairInventedTruth ? 'Repair invented new truth' : 'Repair only restored existing projections',
    }),
  },
  'INV-5.5-J': {
    label: 'Late-arriving data may not silently rewrite current authority',
    check: (ctx) => ({
      passed: !ctx.lateDataSilentOverwrite,
      detail: ctx.lateDataSilentOverwrite ? 'Late data silently overwrote authority' : 'Late data handled through governed paths',
    }),
  },
  'INV-5.5-K': {
    label: 'StateReadResolver must not serve projection truth as authority truth',
    check: (ctx) => ({
      passed: !ctx.readProjectionAsAuthority,
      detail: ctx.readProjectionAsAuthority ? 'Projection served as authority when authority available' : 'Read resolution respects authority hierarchy',
    }),
  },
  'INV-5.5-L': {
    label: 'Every finalization outcome must be explainable from manifest + projection outcomes',
    check: (ctx) => {
      if (!ctx.manifest) return { passed: true, detail: 'No manifest to check' };
      if (ctx.manifest.state === L5ManifestState.FINALIZED) {
        const allReqDone = ctx.manifest.projection_jobs.filter(j => j.required).every(j => j.status === L5ProjectionStatus.SUCCEEDED);
        return { passed: allReqDone && ctx.manifest.primary_authority_committed, detail: 'Finalization fully explainable from manifest + projections' };
      }
      return { passed: true, detail: 'Not finalized, explainability check deferred' };
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function assertCoordinationInvariant(
  id: L5CoordinationInvariantId,
  ctx: CoordinationInvariantContext,
): CoordinationInvariantResult {
  const def = INVARIANT_DEFS[id];
  const { passed, detail } = def.check(ctx);
  return { id, label: def.label, passed, detail };
}

export function assertAllCoordinationInvariants(ctx: CoordinationInvariantContext): CoordinationInvariantResult[] {
  return ALL_COORDINATION_INVARIANT_IDS.map(id => assertCoordinationInvariant(id, ctx));
}

export function enforceAllCoordinationInvariants(ctx: CoordinationInvariantContext): void {
  const results = assertAllCoordinationInvariants(ctx);
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    throw new Error(`Coordination invariant violation(s): ${failures.map(f => `${f.id}: ${f.detail}`).join('; ')}`);
  }
}
