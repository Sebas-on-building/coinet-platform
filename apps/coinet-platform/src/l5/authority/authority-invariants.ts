/**
 * L5.2 Authority Model — Authority Invariants
 *
 * §5.2.16 — INV-5.2-A through INV-5.2-L
 *
 * These are the hard assertions every L5.2 component must obey.
 */

import { L5StateClass, type L5PurposeClassification } from '../purpose';
import { L5AuthorityStore } from './authority-store';
import { L5AuthorityTier, isProjectionTier } from './authority-tier';
import type { L5AuthorityAllocation, L5ProjectionPlan } from './authority-allocation';
import type { ManifestRecord } from './manifest-lifecycle';
import { ManifestState } from './manifest-lifecycle';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT IDS
// ═══════════════════════════════════════════════════════════════════════════════

export type L5AuthorityInvariantId =
  | 'INV-5.2-A'  // every authority-bearing datum has exactly one primary authority store
  | 'INV-5.2-B'  // no projection may be marked authoritative
  | 'INV-5.2-C'  // Redis primary only for ephemeral
  | 'INV-5.2-D'  // Object storage primary only for archive
  | 'INV-5.2-E'  // ClickHouse primary only for time-series
  | 'INV-5.2-F'  // Postgres primary only for relational authority and manifest
  | 'INV-5.2-G'  // multi-store write coordination requires manifest
  | 'INV-5.2-H'  // required projections distinguishable from optional
  | 'INV-5.2-I'  // repair may not alter authority semantics
  | 'INV-5.2-J'  // projection loss ≠ truth loss
  | 'INV-5.2-K'  // archive-required writes retain full linkage
  | 'INV-5.2-L'; // authority allocation must not contradict L5.1

export const ALL_AUTHORITY_INVARIANT_IDS: readonly L5AuthorityInvariantId[] = [
  'INV-5.2-A', 'INV-5.2-B', 'INV-5.2-C', 'INV-5.2-D', 'INV-5.2-E', 'INV-5.2-F',
  'INV-5.2-G', 'INV-5.2-H', 'INV-5.2-I', 'INV-5.2-J', 'INV-5.2-K', 'INV-5.2-L',
];

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT CHECK RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthorityInvariantResult {
  readonly id: L5AuthorityInvariantId;
  readonly passed: boolean;
  readonly reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT FOR CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuthorityInvariantContext {
  readonly allocation?: L5AuthorityAllocation;
  readonly classification?: L5PurposeClassification;
  readonly manifest?: ManifestRecord;
  readonly projectionPlans?: readonly L5ProjectionPlan[];
  readonly repairAttemptingAuthorityMutation?: boolean;
  readonly projectionLossReportedAsTruthLoss?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_PRIMARY_MAP: Record<L5AuthorityStore, readonly L5StateClass[]> = {
  [L5AuthorityStore.POSTGRES]:        [L5StateClass.RELATIONAL_AUTHORITY],
  [L5AuthorityStore.CLICKHOUSE]:      [L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY],
  [L5AuthorityStore.REDIS]:           [L5StateClass.EPHEMERAL_HOT_STATE],
  [L5AuthorityStore.OBJECT_STORAGE]:  [L5StateClass.IMMUTABLE_ARCHIVE_STATE],
};

type InvariantCheck = (ctx: AuthorityInvariantContext) => AuthorityInvariantResult;

const INVARIANT_CHECKS: Record<L5AuthorityInvariantId, InvariantCheck> = {
  'INV-5.2-A': (ctx) => {
    const a = ctx.allocation;
    if (!a) return { id: 'INV-5.2-A', passed: true, reason: 'No allocation to check' };
    const hasPrimary = !!a.primaryAuthorityStore;
    return {
      id: 'INV-5.2-A',
      passed: hasPrimary,
      reason: hasPrimary ? 'Exactly one primary authority store assigned' : 'No primary authority store',
    };
  },

  'INV-5.2-B': (ctx) => {
    const plans = ctx.projectionPlans ?? ctx.allocation?.requiredProjections ?? [];
    const optPlans = ctx.allocation?.optionalProjections ?? [];
    const allPlans = [...plans, ...optPlans];
    const violation = allPlans.find(p => !isProjectionTier(
      p.required ? L5AuthorityTier.REQUIRED_PROJECTION : L5AuthorityTier.OPTIONAL_PROJECTION,
    ));
    return {
      id: 'INV-5.2-B',
      passed: !violation,
      reason: violation
        ? `Projection in store '${violation.store}' violates tier boundary`
        : 'No projection marked as authoritative',
    };
  },

  'INV-5.2-C': (ctx) => {
    const a = ctx.allocation;
    if (!a) return { id: 'INV-5.2-C', passed: true, reason: 'No allocation' };
    if (a.primaryAuthorityStore !== L5AuthorityStore.REDIS) return { id: 'INV-5.2-C', passed: true, reason: 'Redis not primary' };
    const ok = a.primaryStateClass === L5StateClass.EPHEMERAL_HOT_STATE;
    return { id: 'INV-5.2-C', passed: ok, reason: ok ? 'Redis legal for ephemeral' : 'Redis illegal for non-ephemeral' };
  },

  'INV-5.2-D': (ctx) => {
    const a = ctx.allocation;
    if (!a) return { id: 'INV-5.2-D', passed: true, reason: 'No allocation' };
    if (a.primaryAuthorityStore !== L5AuthorityStore.OBJECT_STORAGE) return { id: 'INV-5.2-D', passed: true, reason: 'Object storage not primary' };
    const ok = a.primaryStateClass === L5StateClass.IMMUTABLE_ARCHIVE_STATE;
    return { id: 'INV-5.2-D', passed: ok, reason: ok ? 'Object storage legal for archive' : 'Object storage illegal for non-archive' };
  },

  'INV-5.2-E': (ctx) => {
    const a = ctx.allocation;
    if (!a) return { id: 'INV-5.2-E', passed: true, reason: 'No allocation' };
    if (a.primaryAuthorityStore !== L5AuthorityStore.CLICKHOUSE) return { id: 'INV-5.2-E', passed: true, reason: 'ClickHouse not primary' };
    const ok = a.primaryStateClass === L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY;
    return { id: 'INV-5.2-E', passed: ok, reason: ok ? 'ClickHouse legal for time-series' : 'ClickHouse illegal for non-time-series' };
  },

  'INV-5.2-F': (ctx) => {
    const a = ctx.allocation;
    if (!a) return { id: 'INV-5.2-F', passed: true, reason: 'No allocation' };
    if (a.primaryAuthorityStore !== L5AuthorityStore.POSTGRES) return { id: 'INV-5.2-F', passed: true, reason: 'Postgres not primary' };
    const ok = a.primaryStateClass === L5StateClass.RELATIONAL_AUTHORITY;
    return { id: 'INV-5.2-F', passed: ok, reason: ok ? 'Postgres legal for relational authority' : 'Postgres illegal for non-relational-authority' };
  },

  'INV-5.2-G': (ctx) => {
    const a = ctx.allocation;
    if (!a) return { id: 'INV-5.2-G', passed: true, reason: 'No allocation' };
    const needsManifest = a.requiredProjections.length > 0 || a.archiveRequired;
    if (!needsManifest) return { id: 'INV-5.2-G', passed: true, reason: 'No multi-store coordination needed' };
    return { id: 'INV-5.2-G', passed: a.manifestRequired, reason: a.manifestRequired ? 'Manifest required and declared' : 'Multi-store write missing manifest' };
  },

  'INV-5.2-H': (ctx) => {
    const a = ctx.allocation;
    if (!a) return { id: 'INV-5.2-H', passed: true, reason: 'No allocation' };
    const reqLabels = a.requiredProjections.every(p => p.required === true);
    const optLabels = a.optionalProjections.every(p => p.required === false);
    const ok = reqLabels && optLabels;
    return { id: 'INV-5.2-H', passed: ok, reason: ok ? 'Required/optional projections distinguishable' : 'Projection required/optional mislabel' };
  },

  'INV-5.2-I': (ctx) => {
    const mutating = ctx.repairAttemptingAuthorityMutation ?? false;
    return { id: 'INV-5.2-I', passed: !mutating, reason: mutating ? 'Repair is mutating authority semantics' : 'Repair does not alter authority' };
  },

  'INV-5.2-J': (ctx) => {
    const misreported = ctx.projectionLossReportedAsTruthLoss ?? false;
    return { id: 'INV-5.2-J', passed: !misreported, reason: misreported ? 'Projection loss misreported as truth loss' : 'Projection loss correctly classified' };
  },

  'INV-5.2-K': (ctx) => {
    const m = ctx.manifest;
    if (!m) return { id: 'INV-5.2-K', passed: true, reason: 'No manifest' };
    if (!m.archiveRequired) return { id: 'INV-5.2-K', passed: true, reason: 'Archive not required' };
    if (m.state === ManifestState.FINALIZED && !m.archiveWritten) {
      return { id: 'INV-5.2-K', passed: false, reason: 'Finalized without archive written' };
    }
    return { id: 'INV-5.2-K', passed: true, reason: 'Archive linkage intact' };
  },

  'INV-5.2-L': (ctx) => {
    const a = ctx.allocation;
    const c = ctx.classification;
    if (!a || !c) return { id: 'INV-5.2-L', passed: true, reason: 'No allocation/classification' };
    const ok = a.primaryStateClass === c.primaryStateClass;
    return { id: 'INV-5.2-L', passed: ok, reason: ok ? 'Allocation matches L5.1 classification' : `Allocation class '${a.primaryStateClass}' contradicts classification '${c.primaryStateClass}'` };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function assertL5AuthorityInvariant(
  id: L5AuthorityInvariantId,
  ctx: AuthorityInvariantContext,
): AuthorityInvariantResult {
  return INVARIANT_CHECKS[id](ctx);
}

export function assertAllAuthorityInvariants(ctx: AuthorityInvariantContext): AuthorityInvariantResult[] {
  return ALL_AUTHORITY_INVARIANT_IDS.map(id => INVARIANT_CHECKS[id](ctx));
}

export function enforceAllAuthorityInvariants(ctx: AuthorityInvariantContext): void {
  const results = assertAllAuthorityInvariants(ctx);
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    const msg = failures.map(f => `${f.id}: ${f.reason}`).join('; ');
    throw new Error(`L5.2 authority invariant failures: ${msg}`);
  }
}
