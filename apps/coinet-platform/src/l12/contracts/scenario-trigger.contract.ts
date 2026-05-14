/**
 * L12.3 — Trigger contract (§12.3.8) + monitoring requirement.
 */

import { L12ConditionMaterialityClass } from './scenario-condition';
import {
  L12TriggerEffect,
  L12TriggerStatus,
  L12TriggerType,
} from './scenario-trigger';

export enum L12TriggerCheckFrequencyClass {
  TICK = 'TICK',
  REALTIME = 'REALTIME',
  MINUTE = 'MINUTE',
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  EVENT_DRIVEN = 'EVENT_DRIVEN',
}

export const ALL_L12_TRIGGER_CHECK_FREQUENCY_CLASSES: readonly L12TriggerCheckFrequencyClass[] =
  Object.values(L12TriggerCheckFrequencyClass);

export interface L12TriggerMonitoringRequirement {
  readonly monitorable: boolean;
  readonly required_surface_refs: readonly string[];
  readonly check_frequency_class: L12TriggerCheckFrequencyClass;
  readonly stale_after_ms: number;
  readonly blocked_if_surface_missing: boolean;
  readonly policy_version: string;
}

export interface L12TriggerContract {
  readonly trigger_contract_id: string;

  readonly trigger_id: string;
  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly trigger_type: L12TriggerType;
  readonly trigger_name: string;

  readonly trigger_condition_refs: readonly string[];

  readonly trigger_status: L12TriggerStatus;

  readonly trigger_strength_score: number;
  readonly trigger_materiality_class: L12ConditionMaterialityClass;

  readonly expected_effect_on_scenario: L12TriggerEffect;

  readonly monitoring_requirement: L12TriggerMonitoringRequirement;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
