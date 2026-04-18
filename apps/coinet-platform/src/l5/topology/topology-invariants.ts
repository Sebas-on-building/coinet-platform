/**
 * L5.3 Multi-store Architecture — Topology Invariants
 *
 * §5.3.17 — INV-5.3-A through INV-5.3-L
 */

import { L5DeploymentMode, isReferenceMode } from './deployment-mode';
import { L5StoreKind, L5StorePlane, ALL_STORE_KINDS, ALL_STORE_PLANES, getPlaneForStore, REFERENCE_STORE_PROFILES } from './store-profile';
import { hasNamespacePolicy } from './namespace-policy';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT IDS
// ═══════════════════════════════════════════════════════════════════════════════

export type L5TopologyInvariantId =
  | 'INV-5.3-A'  // reference mode contains exactly four store kinds
  | 'INV-5.3-B'  // each store kind assigned exactly one primary plane
  | 'INV-5.3-C'  // Postgres is authority plane in reference
  | 'INV-5.3-D'  // ClickHouse is analytical plane in reference
  | 'INV-5.3-E'  // Redis is speed plane in reference
  | 'INV-5.3-F'  // Object storage is evidence plane in reference
  | 'INV-5.3-G'  // no store owns data classes forbidden by its profile
  | 'INV-5.3-H'  // every mode preserves all four storage functions
  | 'INV-5.3-I'  // no unrestricted all-store service access
  | 'INV-5.3-J'  // every store has namespace policy
  | 'INV-5.3-K'  // reference mode may not silently downgrade
  | 'INV-5.3-L'; // topology changes may not alter constitutional storage law

export const ALL_TOPOLOGY_INVARIANT_IDS: readonly L5TopologyInvariantId[] = [
  'INV-5.3-A', 'INV-5.3-B', 'INV-5.3-C', 'INV-5.3-D', 'INV-5.3-E', 'INV-5.3-F',
  'INV-5.3-G', 'INV-5.3-H', 'INV-5.3-I', 'INV-5.3-J', 'INV-5.3-K', 'INV-5.3-L',
];

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface TopologyInvariantResult {
  readonly id: L5TopologyInvariantId;
  readonly passed: boolean;
  readonly reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

export interface TopologyInvariantContext {
  readonly mode: L5DeploymentMode;
  readonly activeStores?: readonly L5StoreKind[];
  readonly coveredPlanes?: readonly L5StorePlane[];
  readonly analyticalBackend?: string;
  readonly serviceBoundaryViolations?: readonly string[];
  readonly dataClassViolations?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

type InvCheck = (ctx: TopologyInvariantContext) => TopologyInvariantResult;

const CHECKS: Record<L5TopologyInvariantId, InvCheck> = {
  'INV-5.3-A': (ctx) => {
    if (!isReferenceMode(ctx.mode)) return { id: 'INV-5.3-A', passed: true, reason: 'Non-reference mode' };
    const stores = ctx.activeStores ?? ALL_STORE_KINDS;
    const ok = stores.length === 4
      && ALL_STORE_KINDS.every(k => stores.includes(k));
    return { id: 'INV-5.3-A', passed: ok, reason: ok ? 'All four store kinds present' : `Missing store kinds in reference mode` };
  },

  'INV-5.3-B': (ctx) => {
    const planes = new Set<L5StorePlane>();
    for (const kind of ALL_STORE_KINDS) {
      const plane = getPlaneForStore(kind);
      if (planes.has(plane)) {
        return { id: 'INV-5.3-B', passed: false, reason: `Plane '${plane}' assigned to multiple stores` };
      }
      planes.add(plane);
    }
    return { id: 'INV-5.3-B', passed: true, reason: 'Each store kind has a unique plane' };
  },

  'INV-5.3-C': (ctx) => {
    const plane = getPlaneForStore(L5StoreKind.POSTGRES);
    const ok = plane === L5StorePlane.AUTHORITY;
    return { id: 'INV-5.3-C', passed: ok, reason: ok ? 'Postgres is authority plane' : `Postgres assigned to '${plane}'` };
  },

  'INV-5.3-D': (ctx) => {
    const plane = getPlaneForStore(L5StoreKind.CLICKHOUSE);
    const ok = plane === L5StorePlane.ANALYTICAL;
    return { id: 'INV-5.3-D', passed: ok, reason: ok ? 'ClickHouse is analytical plane' : `ClickHouse assigned to '${plane}'` };
  },

  'INV-5.3-E': (ctx) => {
    const plane = getPlaneForStore(L5StoreKind.REDIS);
    const ok = plane === L5StorePlane.SPEED;
    return { id: 'INV-5.3-E', passed: ok, reason: ok ? 'Redis is speed plane' : `Redis assigned to '${plane}'` };
  },

  'INV-5.3-F': (ctx) => {
    const plane = getPlaneForStore(L5StoreKind.OBJECT_STORAGE);
    const ok = plane === L5StorePlane.EVIDENCE;
    return { id: 'INV-5.3-F', passed: ok, reason: ok ? 'Object storage is evidence plane' : `Object storage assigned to '${plane}'` };
  },

  'INV-5.3-G': (ctx) => {
    const violations = ctx.dataClassViolations ?? [];
    const ok = violations.length === 0;
    return { id: 'INV-5.3-G', passed: ok, reason: ok ? 'No forbidden data class violations' : `${violations.length} forbidden data class violation(s)` };
  },

  'INV-5.3-H': (ctx) => {
    const covered = ctx.coveredPlanes ?? ALL_STORE_PLANES;
    const ok = ALL_STORE_PLANES.every(p => covered.includes(p));
    return { id: 'INV-5.3-H', passed: ok, reason: ok ? 'All four storage functions covered' : 'Missing storage plane coverage' };
  },

  'INV-5.3-I': (ctx) => {
    const violations = ctx.serviceBoundaryViolations ?? [];
    const ok = violations.length === 0;
    return { id: 'INV-5.3-I', passed: ok, reason: ok ? 'No unrestricted all-store access' : `${violations.length} service boundary violation(s)` };
  },

  'INV-5.3-J': (ctx) => {
    for (const kind of ALL_STORE_KINDS) {
      if (!hasNamespacePolicy(kind)) {
        return { id: 'INV-5.3-J', passed: false, reason: `Missing namespace policy for '${kind}'` };
      }
    }
    return { id: 'INV-5.3-J', passed: true, reason: 'All stores have namespace policy' };
  },

  'INV-5.3-K': (ctx) => {
    if (!isReferenceMode(ctx.mode)) return { id: 'INV-5.3-K', passed: true, reason: 'Non-reference mode' };
    const backend = ctx.analyticalBackend ?? 'CLICKHOUSE';
    const ok = backend === 'CLICKHOUSE';
    return { id: 'INV-5.3-K', passed: ok, reason: ok ? 'Reference mode uses ClickHouse' : `Reference mode silently using '${backend}'` };
  },

  'INV-5.3-L': (ctx) => {
    const covered = ctx.coveredPlanes ?? ALL_STORE_PLANES;
    const allCovered = ALL_STORE_PLANES.every(p => covered.includes(p));
    return { id: 'INV-5.3-L', passed: allCovered, reason: allCovered ? 'Constitutional storage law preserved' : 'Topology change removed a required storage function' };
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function assertTopologyInvariant(
  id: L5TopologyInvariantId,
  ctx: TopologyInvariantContext,
): TopologyInvariantResult {
  return CHECKS[id](ctx);
}

export function assertAllTopologyInvariants(ctx: TopologyInvariantContext): TopologyInvariantResult[] {
  return ALL_TOPOLOGY_INVARIANT_IDS.map(id => CHECKS[id](ctx));
}

export function enforceAllTopologyInvariants(ctx: TopologyInvariantContext): void {
  const results = assertAllTopologyInvariants(ctx);
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    const msg = failures.map(f => `${f.id}: ${f.reason}`).join('; ');
    throw new Error(`L5.3 topology invariant failures: ${msg}`);
  }
}
