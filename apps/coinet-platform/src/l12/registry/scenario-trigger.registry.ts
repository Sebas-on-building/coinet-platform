/**
 * L12.2 — Scenario trigger registry (§12.2.16).
 *
 * Enforces:
 *   - id uniqueness
 *   - trigger type / status legality
 *   - trigger type / effect legality
 */

import {
  L12ScenarioTrigger,
  L12TriggerEffect,
  L12TriggerStatus,
  L12TriggerType,
  isL12LegalTriggerEffect,
} from '../contracts/scenario-trigger';

const TRIGGERS: Map<string, L12ScenarioTrigger> = new Map();

const STATUS_LEGALITY: Readonly<Record<L12TriggerType, readonly L12TriggerStatus[]>> = {
  [L12TriggerType.WATCH_TRIGGER]: [
    L12TriggerStatus.WATCHING,
    L12TriggerStatus.NOT_ACTIVE,
    L12TriggerStatus.PARTIALLY_ACTIVE,
    L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY,
    L12TriggerStatus.BLOCKED_BY_RESTRICTION,
  ],
  [L12TriggerType.BULLISH_CONFIRMATION_TRIGGER]: [
    L12TriggerStatus.ACTIVE,
    L12TriggerStatus.PARTIALLY_ACTIVE,
    L12TriggerStatus.NOT_ACTIVE,
    L12TriggerStatus.WATCHING,
    L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY,
    L12TriggerStatus.BLOCKED_BY_RESTRICTION,
  ],
  [L12TriggerType.BEARISH_CONFIRMATION_TRIGGER]: [
    L12TriggerStatus.ACTIVE,
    L12TriggerStatus.PARTIALLY_ACTIVE,
    L12TriggerStatus.NOT_ACTIVE,
    L12TriggerStatus.WATCHING,
    L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY,
    L12TriggerStatus.BLOCKED_BY_RESTRICTION,
  ],
  [L12TriggerType.FAILURE_TRIGGER]: [
    L12TriggerStatus.ACTIVE,
    L12TriggerStatus.PARTIALLY_ACTIVE,
    L12TriggerStatus.NOT_ACTIVE,
    L12TriggerStatus.WATCHING,
    L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY,
    L12TriggerStatus.BLOCKED_BY_RESTRICTION,
  ],
  [L12TriggerType.RECOVERY_TRIGGER]: [
    L12TriggerStatus.ACTIVE,
    L12TriggerStatus.PARTIALLY_ACTIVE,
    L12TriggerStatus.NOT_ACTIVE,
    L12TriggerStatus.WATCHING,
    L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY,
    L12TriggerStatus.BLOCKED_BY_RESTRICTION,
  ],
  [L12TriggerType.RANKING_SHIFT_TRIGGER]: [
    L12TriggerStatus.ACTIVE,
    L12TriggerStatus.PARTIALLY_ACTIVE,
    L12TriggerStatus.NOT_ACTIVE,
    L12TriggerStatus.WATCHING,
    L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY,
    L12TriggerStatus.BLOCKED_BY_RESTRICTION,
  ],
  [L12TriggerType.INVALIDATION_TRIGGER]: [
    L12TriggerStatus.ACTIVE,
    L12TriggerStatus.PARTIALLY_ACTIVE,
    L12TriggerStatus.NOT_ACTIVE,
    L12TriggerStatus.WATCHING,
    L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY,
    L12TriggerStatus.BLOCKED_BY_RESTRICTION,
  ],
};

export interface L12TriggerRegistrationResult {
  readonly registered: boolean;
  readonly reason?: string;
}

export function isL12LegalTriggerStatus(
  type: L12TriggerType,
  status: L12TriggerStatus,
): boolean {
  return STATUS_LEGALITY[type].includes(status);
}

export function registerL12ScenarioTrigger(
  trig: L12ScenarioTrigger,
): L12TriggerRegistrationResult {
  if (!trig.trigger_id) return { registered: false, reason: 'trigger_id missing' };
  if (TRIGGERS.has(trig.trigger_id)) {
    return { registered: false, reason: 'duplicate trigger_id' };
  }
  if (!isL12LegalTriggerStatus(trig.trigger_type, trig.trigger_status)) {
    return {
      registered: false,
      reason: `illegal trigger type/status: ${trig.trigger_type}/${trig.trigger_status}`,
    };
  }
  if (!isL12LegalTriggerEffect(trig.trigger_type, trig.expected_effect_on_scenario)) {
    return {
      registered: false,
      reason: `illegal trigger type/effect: ${trig.trigger_type}/${trig.expected_effect_on_scenario}`,
    };
  }
  TRIGGERS.set(trig.trigger_id, trig);
  return { registered: true };
}

export function getRegisteredL12ScenarioTrigger(
  id: string,
): L12ScenarioTrigger | undefined {
  return TRIGGERS.get(id);
}

export function isL12ScenarioTriggerRegistered(id: string): boolean {
  return TRIGGERS.has(id);
}

export function listRegisteredL12ScenarioTriggers(): readonly L12ScenarioTrigger[] {
  return [...TRIGGERS.values()];
}

export function clearL12ScenarioTriggerRegistry(): void {
  TRIGGERS.clear();
}

export function isL12LegalTriggerTypeEffect(
  type: L12TriggerType,
  effect: L12TriggerEffect,
): boolean {
  return isL12LegalTriggerEffect(type, effect);
}
