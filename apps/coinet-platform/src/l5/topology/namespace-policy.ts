/**
 * L5.3 Multi-store Architecture — Namespace Policy
 *
 * §5.3.9 — Storage Namespace Architecture
 *
 * All stores must have namespace policy defined before production boot.
 */

import { L5StoreKind } from './store-profile';

// ═══════════════════════════════════════════════════════════════════════════════
// NAMESPACE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface NamespacePolicy {
  readonly storeKind: L5StoreKind;
  readonly envPrefix: string;
  readonly namespaces: readonly string[];
  readonly keyPattern?: string;
  readonly pathRoots?: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFERENCE NAMESPACE POLICIES
// ═══════════════════════════════════════════════════════════════════════════════

const POSTGRES_NAMESPACES: NamespacePolicy = {
  storeKind: L5StoreKind.POSTGRES,
  envPrefix: '{env}',
  namespaces: ['l3', 'l4', 'l5', 'user_state', 'scoring', 'reports', 'audit', 'ops'],
};

const CLICKHOUSE_NAMESPACES: NamespacePolicy = {
  storeKind: L5StoreKind.CLICKHOUSE,
  envPrefix: '{env}',
  namespaces: [
    'ts_numeric_fact', 'ts_ohlcv', 'ts_feature_fact',
    'ts_score_history', 'mv_latest', 'rollup',
  ],
};

const REDIS_NAMESPACES: NamespacePolicy = {
  storeKind: L5StoreKind.REDIS,
  envPrefix: '{env}',
  namespaces: ['l5:hot', 'l5:cooldown', 'l5:dedupe', 'l5:trigger', 'l5:cache', 'l5:throttle'],
  keyPattern: '{env}:{domain}:{class}:{identifier}',
};

const OBJECT_STORAGE_NAMESPACES: NamespacePolicy = {
  storeKind: L5StoreKind.OBJECT_STORAGE,
  envPrefix: '{env}',
  namespaces: [],
  pathRoots: [
    'raw/', 'normalized/', 'backfill/', 'snapshots/',
    'reports/', 'replay/', 'forensics/', 'model_io/',
  ],
};

const NAMESPACE_MAP: Record<L5StoreKind, NamespacePolicy> = {
  [L5StoreKind.POSTGRES]: POSTGRES_NAMESPACES,
  [L5StoreKind.CLICKHOUSE]: CLICKHOUSE_NAMESPACES,
  [L5StoreKind.REDIS]: REDIS_NAMESPACES,
  [L5StoreKind.OBJECT_STORAGE]: OBJECT_STORAGE_NAMESPACES,
};

export function getNamespacePolicy(kind: L5StoreKind): NamespacePolicy {
  return NAMESPACE_MAP[kind];
}

export function hasNamespacePolicy(kind: L5StoreKind): boolean {
  const p = NAMESPACE_MAP[kind];
  return p.namespaces.length > 0 || (p.pathRoots?.length ?? 0) > 0 || !!p.keyPattern;
}

export function resolveNamespace(kind: L5StoreKind, env: string): NamespacePolicy {
  const base = NAMESPACE_MAP[kind];
  return {
    ...base,
    envPrefix: env,
    namespaces: base.namespaces.map(ns => `${env}_${ns}`),
    keyPattern: base.keyPattern?.replace('{env}', env),
    pathRoots: base.pathRoots?.map(r => `${env}/${r}`),
  };
}

export function validateNamespaceIsolation(env1: string, env2: string, kind: L5StoreKind): boolean {
  if (env1 === env2) return true;
  const ns1 = resolveNamespace(kind, env1);
  const ns2 = resolveNamespace(kind, env2);

  for (const n of ns1.namespaces) {
    if (ns2.namespaces.includes(n)) return false;
  }
  return true;
}
