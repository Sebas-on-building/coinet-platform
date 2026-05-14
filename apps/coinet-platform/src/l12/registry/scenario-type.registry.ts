/**
 * L12.2 — Scenario type registry (§12.2.16).
 *
 * Enforces:
 *   - all scenario types registered with descriptors
 *   - legal type/family pairing (delegates to family registry)
 */

import { L12ScenarioFamily } from '../contracts/scenario-family';
import {
  ALL_L12_SCENARIO_TYPES,
  L12ScenarioType,
  L12ScenarioTypePolarity,
  getL12ScenarioTypePolarity,
} from '../contracts/scenario-type';
import { isL12LegalTypeForFamily } from './scenario-family.registry';

export interface L12ScenarioTypeDescriptor {
  readonly scenario_type: L12ScenarioType;
  readonly polarity: L12ScenarioTypePolarity;
  readonly requires_invalidation_paths: boolean;
  readonly requires_recovery_alternative: boolean;
  readonly is_insufficient: boolean;
}

const TYPE_DESCRIPTORS: Readonly<Record<L12ScenarioType, L12ScenarioTypeDescriptor>> = {
  [L12ScenarioType.BASE_CASE]: {
    scenario_type: L12ScenarioType.BASE_CASE,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.BASE_CASE),
    requires_invalidation_paths: true,
    requires_recovery_alternative: false,
    is_insufficient: false,
  },
  [L12ScenarioType.BULLISH_CONTINUATION]: {
    scenario_type: L12ScenarioType.BULLISH_CONTINUATION,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.BULLISH_CONTINUATION),
    requires_invalidation_paths: true,
    requires_recovery_alternative: false,
    is_insufficient: false,
  },
  [L12ScenarioType.BEARISH_FAILURE]: {
    scenario_type: L12ScenarioType.BEARISH_FAILURE,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.BEARISH_FAILURE),
    requires_invalidation_paths: true,
    requires_recovery_alternative: true,
    is_insufficient: false,
  },
  [L12ScenarioType.NEUTRAL_CHOP]: {
    scenario_type: L12ScenarioType.NEUTRAL_CHOP,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.NEUTRAL_CHOP),
    requires_invalidation_paths: true,
    requires_recovery_alternative: false,
    is_insufficient: false,
  },
  [L12ScenarioType.STRESS_CASE]: {
    scenario_type: L12ScenarioType.STRESS_CASE,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.STRESS_CASE),
    requires_invalidation_paths: true,
    requires_recovery_alternative: true,
    is_insufficient: false,
  },
  [L12ScenarioType.RECOVERY_CASE]: {
    scenario_type: L12ScenarioType.RECOVERY_CASE,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.RECOVERY_CASE),
    requires_invalidation_paths: true,
    requires_recovery_alternative: false,
    is_insufficient: false,
  },
  [L12ScenarioType.INVALIDATION_CASE]: {
    scenario_type: L12ScenarioType.INVALIDATION_CASE,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.INVALIDATION_CASE),
    requires_invalidation_paths: true,
    requires_recovery_alternative: false,
    is_insufficient: false,
  },
  [L12ScenarioType.INSUFFICIENT_DATA_CASE]: {
    scenario_type: L12ScenarioType.INSUFFICIENT_DATA_CASE,
    polarity: getL12ScenarioTypePolarity(L12ScenarioType.INSUFFICIENT_DATA_CASE),
    requires_invalidation_paths: true,
    requires_recovery_alternative: false,
    is_insufficient: true,
  },
};

export function getL12ScenarioTypeDescriptor(
  type: L12ScenarioType,
): L12ScenarioTypeDescriptor {
  return TYPE_DESCRIPTORS[type];
}

export function listL12ScenarioTypeDescriptors(): readonly L12ScenarioTypeDescriptor[] {
  return ALL_L12_SCENARIO_TYPES.map(t => TYPE_DESCRIPTORS[t]);
}

export function isL12ScenarioTypeRegistered(type: L12ScenarioType): boolean {
  return Object.prototype.hasOwnProperty.call(TYPE_DESCRIPTORS, type);
}

export function isL12LegalTypeFamilyPairing(
  type: L12ScenarioType,
  family: L12ScenarioFamily,
): boolean {
  return isL12LegalTypeForFamily(type, family);
}

export function getL12ScenarioTypeRegistryCount(): number {
  return ALL_L12_SCENARIO_TYPES.length;
}
