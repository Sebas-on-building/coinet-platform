/**
 * L12.2 — Scenario condition registry (§12.2.16).
 *
 * Enforces:
 *   - id uniqueness
 *   - condition type / source layer legality
 */

import {
  L12ConditionSourceLayer,
  L12ScenarioCondition,
  L12ScenarioConditionType,
  isL12LegalConditionTypeLayer,
} from '../contracts/scenario-condition';

const CONDITIONS: Map<string, L12ScenarioCondition> = new Map();

export interface L12ConditionRegistrationResult {
  readonly registered: boolean;
  readonly reason?: string;
}

export function registerL12ScenarioCondition(
  cond: L12ScenarioCondition,
): L12ConditionRegistrationResult {
  if (!cond.condition_id) return { registered: false, reason: 'condition_id missing' };
  if (CONDITIONS.has(cond.condition_id)) {
    return { registered: false, reason: 'duplicate condition_id' };
  }
  if (!isL12LegalConditionTypeLayer(cond.condition_type, cond.source_layer)) {
    return {
      registered: false,
      reason: `illegal type/source-layer pair: ${cond.condition_type}/${cond.source_layer}`,
    };
  }
  CONDITIONS.set(cond.condition_id, cond);
  return { registered: true };
}

export function getRegisteredL12ScenarioCondition(
  id: string,
): L12ScenarioCondition | undefined {
  return CONDITIONS.get(id);
}

export function isL12ScenarioConditionRegistered(id: string): boolean {
  return CONDITIONS.has(id);
}

export function listRegisteredL12ScenarioConditions(): readonly L12ScenarioCondition[] {
  return [...CONDITIONS.values()];
}

export function listL12ScenarioConditionsByScenario(
  scenarioId: string,
): readonly L12ScenarioCondition[] {
  return [...CONDITIONS.values()].filter(c => c.scenario_id === scenarioId);
}

export function clearL12ScenarioConditionRegistry(): void {
  CONDITIONS.clear();
}

export function isL12LegalConditionTypeAndLayer(
  type: L12ScenarioConditionType,
  layer: L12ConditionSourceLayer,
): boolean {
  return isL12LegalConditionTypeLayer(type, layer);
}

export function getL12ScenarioConditionRegistryCount(): number {
  return CONDITIONS.size;
}
