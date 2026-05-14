/**
 * L12.3 — Invalidation contract (§12.3.9) + monitoring requirement.
 */

import {
  L12InvalidationEffect,
  L12InvalidationStatus,
  L12InvalidationType,
} from './scenario-invalidation';
import { L12TriggerCheckFrequencyClass } from './scenario-trigger.contract';

export interface L12InvalidationMonitoringRequirement {
  readonly monitorable: boolean;
  readonly required_surface_refs: readonly string[];
  readonly check_frequency_class: L12TriggerCheckFrequencyClass;
  readonly stale_after_ms: number;
  readonly blocks_clean_output_if_missing: boolean;
  readonly policy_version: string;
}

export interface L12InvalidationContract {
  readonly invalidation_contract_id: string;

  readonly invalidation_id: string;
  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly invalidation_type: L12InvalidationType;
  readonly invalidation_name: string;

  readonly invalidation_condition_refs: readonly string[];

  readonly invalidation_strength_score: number;
  readonly invalidation_status: L12InvalidationStatus;

  readonly expected_effect: L12InvalidationEffect;

  readonly monitoring_requirement: L12InvalidationMonitoringRequirement;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}
