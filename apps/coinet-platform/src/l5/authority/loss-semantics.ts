/**
 * L5.2 Authority Model — Loss Semantics
 *
 * §5.2.13 — Loss Semantics
 *
 * Storage design becomes fake when it does not distinguish loss correctly.
 * This module defines exactly what losing each store means for each
 * state class, and whether that loss constitutes truth damage.
 */

import { L5StateClass } from '../purpose';
import { L5AuthorityStore } from './authority-store';

// ═══════════════════════════════════════════════════════════════════════════════
// LOSS CONSEQUENCE MODEL
// ═══════════════════════════════════════════════════════════════════════════════

export type LossSeverity = 'CRITICAL' | 'SEVERE' | 'MODERATE' | 'MINOR' | 'NONE';

export interface StoreLossConsequence {
  readonly store: L5AuthorityStore;
  readonly severity: LossSeverity;
  readonly isDurableTruthLoss: boolean;
  readonly isAnalyticalHistoryLoss: boolean;
  readonly isEvidenceLoss: boolean;
  readonly isSpeedDegradation: boolean;
  readonly description: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PER-STORE LOSS CONSEQUENCES
// ═══════════════════════════════════════════════════════════════════════════════

const POSTGRES_LOSS: StoreLossConsequence = {
  store: L5AuthorityStore.POSTGRES,
  severity: 'CRITICAL',
  isDurableTruthLoss: true,
  isAnalyticalHistoryLoss: false,
  isEvidenceLoss: false,
  isSpeedDegradation: true,
  description: 'Durable operational truth affected. Manifests, authority-bearing reads, and write coordination impacted.',
};

const CLICKHOUSE_LOSS: StoreLossConsequence = {
  store: L5AuthorityStore.CLICKHOUSE,
  severity: 'SEVERE',
  isDurableTruthLoss: false,
  isAnalyticalHistoryLoss: true,
  isEvidenceLoss: false,
  isSpeedDegradation: true,
  description: 'Historical access and analytical scans degraded. Time-series authority classes affected.',
};

const REDIS_LOSS: StoreLossConsequence = {
  store: L5AuthorityStore.REDIS,
  severity: 'MINOR',
  isDurableTruthLoss: false,
  isAnalyticalHistoryLoss: false,
  isEvidenceLoss: false,
  isSpeedDegradation: true,
  description: 'Hot access degraded. Windows rebuilt. Cooldowns reset. Latency worsens. Not durable truth loss.',
};

const OBJECT_STORAGE_LOSS: StoreLossConsequence = {
  store: L5AuthorityStore.OBJECT_STORAGE,
  severity: 'SEVERE',
  isDurableTruthLoss: false,
  isAnalyticalHistoryLoss: false,
  isEvidenceLoss: true,
  isSpeedDegradation: false,
  description: 'Evidence completeness damaged. Replay, reproducibility, and artifact traceability impacted.',
};

const LOSS_BY_STORE: Record<L5AuthorityStore, StoreLossConsequence> = {
  [L5AuthorityStore.POSTGRES]: POSTGRES_LOSS,
  [L5AuthorityStore.CLICKHOUSE]: CLICKHOUSE_LOSS,
  [L5AuthorityStore.REDIS]: REDIS_LOSS,
  [L5AuthorityStore.OBJECT_STORAGE]: OBJECT_STORAGE_LOSS,
};

export function getStoreLossConsequence(store: L5AuthorityStore): StoreLossConsequence {
  return LOSS_BY_STORE[store];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOSS IMPACT PER STATE CLASS × STORE
// ═══════════════════════════════════════════════════════════════════════════════

export interface LossImpactAssessment {
  readonly stateClass: L5StateClass;
  readonly lostStore: L5AuthorityStore;
  readonly isPrimaryAuthorityLoss: boolean;
  readonly severity: LossSeverity;
  readonly description: string;
}

export function assessLossImpact(stateClass: L5StateClass, lostStore: L5AuthorityStore): LossImpactAssessment {
  const isPrimary = isPrimaryAuthorityStoreForClass(stateClass, lostStore);

  if (isPrimary) {
    return {
      stateClass, lostStore, isPrimaryAuthorityLoss: true,
      severity: 'CRITICAL',
      description: `Primary authority store '${lostStore}' lost for state class '${stateClass}'. Truth damaged.`,
    };
  }

  if (stateClass === L5StateClass.RELATIONAL_AUTHORITY && lostStore === L5AuthorityStore.REDIS) {
    return {
      stateClass, lostStore, isPrimaryAuthorityLoss: false,
      severity: 'MINOR',
      description: 'Acceleration projection lost. Speed degraded. Authority intact.',
    };
  }

  if (stateClass === L5StateClass.RELATIONAL_AUTHORITY && lostStore === L5AuthorityStore.CLICKHOUSE) {
    return {
      stateClass, lostStore, isPrimaryAuthorityLoss: false,
      severity: 'MODERATE',
      description: 'Historical analytical projection lost. Authority and operational reads intact.',
    };
  }

  if (stateClass === L5StateClass.IMMUTABLE_ARCHIVE_STATE && lostStore === L5AuthorityStore.POSTGRES) {
    return {
      stateClass, lostStore, isPrimaryAuthorityLoss: false,
      severity: 'MODERATE',
      description: 'Archive metadata/pointer projection lost. Evidence artifacts still exist but index broken.',
    };
  }

  return {
    stateClass, lostStore, isPrimaryAuthorityLoss: false,
    severity: 'MINOR',
    description: `Non-primary store '${lostStore}' lost for class '${stateClass}'. Projection degraded.`,
  };
}

function isPrimaryAuthorityStoreForClass(sc: L5StateClass, store: L5AuthorityStore): boolean {
  switch (sc) {
    case L5StateClass.RELATIONAL_AUTHORITY: return store === L5AuthorityStore.POSTGRES;
    case L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY: return store === L5AuthorityStore.CLICKHOUSE;
    case L5StateClass.EPHEMERAL_HOT_STATE: return store === L5AuthorityStore.REDIS;
    case L5StateClass.IMMUTABLE_ARCHIVE_STATE: return store === L5AuthorityStore.OBJECT_STORAGE;
  }
}

/**
 * Redis loss is never durable truth loss for non-ephemeral classes.
 * This is one of the most important assertions in L5.2.
 */
export function isRedisLossTruthLoss(stateClass: L5StateClass): boolean {
  return stateClass === L5StateClass.EPHEMERAL_HOT_STATE;
}
