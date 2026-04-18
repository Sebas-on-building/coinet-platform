/**
 * L5.2 Authority Model — Authority Allocation Engine
 *
 * §5.2.7  — Authority Allocation Matrix
 * §5.2.15 — Authority Allocation Engine
 *
 * Takes an L5.1 purpose classification and assigns exactly one
 * legal primary authority store plus bounded projection plans.
 */

import { L5StateClass, type L5PurposeClassification } from '../purpose';
import { L5AuthorityStore } from './authority-store';
import { L5AuthorityTier } from './authority-tier';
import { L5ProjectionCategory } from './projection-category';
import { L5AuthorityError, L5AuthorityErrorCode } from './authority-errors';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface L5ProjectionPlan {
  readonly store: L5AuthorityStore;
  readonly category: L5ProjectionCategory;
  readonly reason: string;
  readonly required: boolean;
  readonly idempotent: boolean;
  readonly lineageRequired: boolean;
}

export interface L5AuthorityAllocation {
  readonly primaryStateClass: L5StateClass;
  readonly primaryAuthorityStore: L5AuthorityStore;
  readonly authorityTier: L5AuthorityTier;
  readonly requiredProjections: readonly L5ProjectionPlan[];
  readonly optionalProjections: readonly L5ProjectionPlan[];
  readonly archiveRequired: boolean;
  readonly replayRequired: boolean;
  readonly manifestRequired: boolean;
  readonly lossSemanticsCode: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGAL PRIMARY STORE MAP
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_PRIMARY_STORE: Record<L5StateClass, L5AuthorityStore> = {
  [L5StateClass.RELATIONAL_AUTHORITY]:            L5AuthorityStore.POSTGRES,
  [L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY]:  L5AuthorityStore.CLICKHOUSE,
  [L5StateClass.EPHEMERAL_HOT_STATE]:             L5AuthorityStore.REDIS,
  [L5StateClass.IMMUTABLE_ARCHIVE_STATE]:         L5AuthorityStore.OBJECT_STORAGE,
};

const AUTHORITY_TIER_MAP: Record<L5StateClass, L5AuthorityTier> = {
  [L5StateClass.RELATIONAL_AUTHORITY]:            L5AuthorityTier.PRIMARY_AUTHORITY,
  [L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY]:  L5AuthorityTier.PRIMARY_AUTHORITY,
  [L5StateClass.EPHEMERAL_HOT_STATE]:             L5AuthorityTier.PRIMARY_AUTHORITY,
  [L5StateClass.IMMUTABLE_ARCHIVE_STATE]:         L5AuthorityTier.IMMUTABLE_EVIDENCE_AUTHORITY,
};

const LOSS_SEMANTICS_MAP: Record<L5StateClass, string> = {
  [L5StateClass.RELATIONAL_AUTHORITY]:            'LOSS_DURABLE_TRUTH',
  [L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY]:  'LOSS_ANALYTICAL_HISTORY',
  [L5StateClass.EPHEMERAL_HOT_STATE]:             'LOSS_SPEED_ONLY',
  [L5StateClass.IMMUTABLE_ARCHIVE_STATE]:         'LOSS_EVIDENCE_COMPLETENESS',
};

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT PROJECTION PLANS PER STATE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

function defaultProjections(sc: L5StateClass, classification: L5PurposeClassification): { required: L5ProjectionPlan[]; optional: L5ProjectionPlan[] } {
  const required: L5ProjectionPlan[] = [];
  const optional: L5ProjectionPlan[] = [];

  switch (sc) {
    case L5StateClass.RELATIONAL_AUTHORITY:
      optional.push({
        store: L5AuthorityStore.REDIS,
        category: L5ProjectionCategory.ACCELERATION,
        reason: 'Hot read cache for operational authority',
        required: false, idempotent: true, lineageRequired: false,
      });
      if (classification.projectionTargets.includes(L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY)) {
        required.push({
          store: L5AuthorityStore.CLICKHOUSE,
          category: L5ProjectionCategory.ANALYTICAL,
          reason: 'Historical analytical derivative',
          required: true, idempotent: true, lineageRequired: true,
        });
      }
      break;

    case L5StateClass.TIME_SERIES_ANALYTICAL_HISTORY:
      if (classification.projectionTargets.includes(L5StateClass.EPHEMERAL_HOT_STATE)) {
        optional.push({
          store: L5AuthorityStore.REDIS,
          category: L5ProjectionCategory.ACCELERATION,
          reason: 'Recent time-series hot slice',
          required: false, idempotent: true, lineageRequired: false,
        });
      }
      required.push({
        store: L5AuthorityStore.POSTGRES,
        category: L5ProjectionCategory.AUTHORITY_ADJACENT_REQUIRED,
        reason: 'Metadata/index pointer in relational store',
        required: true, idempotent: true, lineageRequired: true,
      });
      break;

    case L5StateClass.EPHEMERAL_HOT_STATE:
      break;

    case L5StateClass.IMMUTABLE_ARCHIVE_STATE:
      required.push({
        store: L5AuthorityStore.POSTGRES,
        category: L5ProjectionCategory.AUTHORITY_ADJACENT_REQUIRED,
        reason: 'Archive pointer and metadata in relational store',
        required: true, idempotent: true, lineageRequired: true,
      });
      break;
  }

  return { required, optional };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALLOCATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

export function allocateL5Authority(
  classification: L5PurposeClassification,
  writeDomain?: string,
): L5AuthorityAllocation {
  const sc = classification.primaryStateClass;
  const primaryStore = LEGAL_PRIMARY_STORE[sc];

  if (!primaryStore) {
    throw new L5AuthorityError(
      L5AuthorityErrorCode.NO_PRIMARY_AUTHORITY,
      `No legal primary store for state class '${sc}'`,
      { stateClass: sc, writeDomain },
    );
  }

  validateStoreClassLegality(sc, primaryStore);

  const tier = AUTHORITY_TIER_MAP[sc];
  const { required, optional } = defaultProjections(sc, classification);
  const manifestRequired = required.length > 0 || classification.archiveRequired;

  return {
    primaryStateClass: sc,
    primaryAuthorityStore: primaryStore,
    authorityTier: tier,
    requiredProjections: required,
    optionalProjections: optional,
    archiveRequired: classification.archiveRequired,
    replayRequired: classification.isReplayRequired,
    manifestRequired,
    lossSemanticsCode: LOSS_SEMANTICS_MAP[sc],
  };
}

/**
 * Validate that a store is constitutionally legal for a state class.
 * Throws on violation.
 */
export function validateStoreClassLegality(sc: L5StateClass, store: L5AuthorityStore): void {
  const legal = LEGAL_PRIMARY_STORE[sc];
  if (store !== legal) {
    throw new L5AuthorityError(
      L5AuthorityErrorCode.ILLEGAL_AUTHORITY_STORE,
      `Store '${store}' is illegal as primary authority for state class '${sc}'. Legal store: '${legal}'.`,
      { stateClass: sc, requestedStore: store, legalStore: legal },
    );
  }
}

export function getLegalPrimaryStore(sc: L5StateClass): L5AuthorityStore {
  return LEGAL_PRIMARY_STORE[sc];
}
