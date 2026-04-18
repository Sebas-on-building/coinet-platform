/**
 * L5.2 Authority Model — Authority Stores
 *
 * §5.2.6 — Store Sovereignty Law
 *
 * Each store is a legal jurisdiction with explicit powers and boundaries.
 */

export enum L5AuthorityStore {
  /** Durable operational truth: registries, manifests, user state, metadata, pointers. */
  POSTGRES = 'POSTGRES',

  /** Analytical historical state: metrics, OHLCV, features, score history, temporal scans. */
  CLICKHOUSE = 'CLICKHOUSE',

  /** Ephemeral execution state only: cooldowns, dedupe, trigger windows, hot caches. */
  REDIS = 'REDIS',

  /** Immutable evidence: raw payloads, normalized snapshots, model I/O, replay bundles, renders. */
  OBJECT_STORAGE = 'OBJECT_STORAGE',
}

export const ALL_AUTHORITY_STORES: readonly L5AuthorityStore[] = [
  L5AuthorityStore.POSTGRES,
  L5AuthorityStore.CLICKHOUSE,
  L5AuthorityStore.REDIS,
  L5AuthorityStore.OBJECT_STORAGE,
];

export interface StoreSovereigntyProfile {
  readonly store: L5AuthorityStore;
  readonly governs: string;
  readonly isDurable: boolean;
  readonly supportsTransactions: boolean;
  readonly supportsPointLookup: boolean;
  readonly supportsRangeScan: boolean;
  readonly supportsImmutability: boolean;
  readonly lossConsequenceClass: StoreLossConsequenceClass;
}

export type StoreLossConsequenceClass =
  | 'DURABLE_TRUTH_LOSS'
  | 'ANALYTICAL_HISTORY_LOSS'
  | 'EPHEMERAL_SPEED_DEGRADATION'
  | 'EVIDENCE_COMPLETENESS_LOSS';

const STORE_PROFILES: Record<L5AuthorityStore, StoreSovereigntyProfile> = {
  [L5AuthorityStore.POSTGRES]: {
    store: L5AuthorityStore.POSTGRES,
    governs: 'durable operational truth',
    isDurable: true,
    supportsTransactions: true,
    supportsPointLookup: true,
    supportsRangeScan: true,
    supportsImmutability: false,
    lossConsequenceClass: 'DURABLE_TRUTH_LOSS',
  },
  [L5AuthorityStore.CLICKHOUSE]: {
    store: L5AuthorityStore.CLICKHOUSE,
    governs: 'analytical historical state',
    isDurable: true,
    supportsTransactions: false,
    supportsPointLookup: false,
    supportsRangeScan: true,
    supportsImmutability: false,
    lossConsequenceClass: 'ANALYTICAL_HISTORY_LOSS',
  },
  [L5AuthorityStore.REDIS]: {
    store: L5AuthorityStore.REDIS,
    governs: 'ephemeral execution state',
    isDurable: false,
    supportsTransactions: false,
    supportsPointLookup: true,
    supportsRangeScan: false,
    supportsImmutability: false,
    lossConsequenceClass: 'EPHEMERAL_SPEED_DEGRADATION',
  },
  [L5AuthorityStore.OBJECT_STORAGE]: {
    store: L5AuthorityStore.OBJECT_STORAGE,
    governs: 'immutable evidence',
    isDurable: true,
    supportsTransactions: false,
    supportsPointLookup: true,
    supportsRangeScan: false,
    supportsImmutability: true,
    lossConsequenceClass: 'EVIDENCE_COMPLETENESS_LOSS',
  },
};

export function getStoreSovereigntyProfile(store: L5AuthorityStore): StoreSovereigntyProfile {
  return STORE_PROFILES[store];
}
