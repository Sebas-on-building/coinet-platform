/**
 * L12.2 — Scenario invalidation registry (§12.2.16).
 *
 * Enforces:
 *   - id uniqueness
 *   - invalidation type / status legality
 *   - invalidation type / effect legality
 */

import {
  L12InvalidationStatus,
  L12InvalidationType,
  L12ScenarioInvalidation,
  isL12LegalInvalidationEffect,
} from '../contracts/scenario-invalidation';

const INVALIDATIONS: Map<string, L12ScenarioInvalidation> = new Map();

const STATUS_LEGALITY: Readonly<Record<L12InvalidationType, readonly L12InvalidationStatus[]>> = {
  [L12InvalidationType.SUPPORT_FAILURE]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
  [L12InvalidationType.CONTRADICTION_ESCALATION]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
  [L12InvalidationType.REGIME_SHIFT]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
  [L12InvalidationType.SEQUENCE_BREAK]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
  [L12InvalidationType.HYPOTHESIS_RANK_FLIP]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
  [L12InvalidationType.SCORE_BREAKDOWN]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
  [L12InvalidationType.MISSING_DATA_BLOCKER]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
  [L12InvalidationType.DRIFT_BLOCKER]: [
    L12InvalidationStatus.NOT_ACTIVE,
    L12InvalidationStatus.WATCHING,
    L12InvalidationStatus.PARTIALLY_ACTIVE,
    L12InvalidationStatus.ACTIVE,
    L12InvalidationStatus.BLOCKING,
  ],
};

export interface L12InvalidationRegistrationResult {
  readonly registered: boolean;
  readonly reason?: string;
}

export function isL12LegalInvalidationStatus(
  type: L12InvalidationType,
  status: L12InvalidationStatus,
): boolean {
  return STATUS_LEGALITY[type].includes(status);
}

export function registerL12ScenarioInvalidation(
  inv: L12ScenarioInvalidation,
): L12InvalidationRegistrationResult {
  if (!inv.invalidation_id) {
    return { registered: false, reason: 'invalidation_id missing' };
  }
  if (INVALIDATIONS.has(inv.invalidation_id)) {
    return { registered: false, reason: 'duplicate invalidation_id' };
  }
  if (!isL12LegalInvalidationStatus(inv.invalidation_type, inv.invalidation_status)) {
    return {
      registered: false,
      reason: `illegal invalidation type/status: ${inv.invalidation_type}/${inv.invalidation_status}`,
    };
  }
  if (!isL12LegalInvalidationEffect(inv.invalidation_type, inv.expected_effect)) {
    return {
      registered: false,
      reason: `illegal invalidation type/effect: ${inv.invalidation_type}/${inv.expected_effect}`,
    };
  }
  INVALIDATIONS.set(inv.invalidation_id, inv);
  return { registered: true };
}

export function getRegisteredL12ScenarioInvalidation(
  id: string,
): L12ScenarioInvalidation | undefined {
  return INVALIDATIONS.get(id);
}

export function isL12ScenarioInvalidationRegistered(id: string): boolean {
  return INVALIDATIONS.has(id);
}

export function listRegisteredL12ScenarioInvalidations(): readonly L12ScenarioInvalidation[] {
  return [...INVALIDATIONS.values()];
}

export function listL12InvalidationsForScenario(
  scenarioId: string,
): readonly L12ScenarioInvalidation[] {
  return [...INVALIDATIONS.values()].filter(i => i.scenario_id === scenarioId);
}

export function clearL12ScenarioInvalidationRegistry(): void {
  INVALIDATIONS.clear();
}
