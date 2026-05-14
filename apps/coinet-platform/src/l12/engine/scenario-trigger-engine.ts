/**
 * L12.4 — Engine 5: ScenarioTriggerEngine (§12.4.17).
 */

import {
  buildL12ScenarioReplayHash,
  buildL12TriggerId,
} from '../contracts/scenario-ids';
import { L12ConditionMaterialityClass } from '../contracts/scenario-condition';
import {
  L12TriggerEffect,
  L12TriggerStatus,
  L12TriggerType,
  isL12LegalTriggerEffect,
} from '../contracts/scenario-trigger';
import type {
  L12TriggerContract,
  L12TriggerMonitoringRequirement,
} from '../contracts/scenario-trigger.contract';

import type { L12ResolvedConditionSet } from './scenario-condition-resolver';

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])guaranteed(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])inevitable(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])will\s+(go|move|pump|dump|break|continue)(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])buy(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])sell(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])long(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])short(?:[^a-z0-9]|$)/i,
];

function detectForbidden(text: string): boolean {
  return FORBIDDEN_PATTERNS.some(p => p.test(text));
}

export interface L12ResolvedTriggerSet {
  readonly trigger_set_id: string;
  readonly scenario_subject_id: string;
  readonly candidate_set_id: string;

  readonly triggers: readonly L12TriggerContract[];

  readonly bullish_confirmation_trigger_refs: readonly string[];
  readonly bearish_confirmation_trigger_refs: readonly string[];
  readonly failure_trigger_refs: readonly string[];
  readonly recovery_trigger_refs: readonly string[];
  readonly ranking_shift_trigger_refs: readonly string[];
  readonly invalidation_trigger_refs: readonly string[];
  readonly watch_trigger_refs: readonly string[];

  readonly blocked_trigger_refs: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L12TriggerInput {
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
}

export interface BuildL12TriggersArgs {
  readonly condition_set: L12ResolvedConditionSet;
  readonly triggers: readonly L12TriggerInput[];
  readonly policy_version: string;
}

export interface BuildL12TriggersResult {
  readonly ok: boolean;
  readonly trigger_set?: L12ResolvedTriggerSet;
  readonly issues: readonly string[];
}

export function buildL12Triggers(args: BuildL12TriggersArgs): BuildL12TriggersResult {
  const issues: string[] = [];
  const built: L12TriggerContract[] = [];

  for (const t of args.triggers) {
    if (t.trigger_condition_refs.length === 0) {
      issues.push(`trigger ${t.trigger_name}: missing condition refs`);
    }
    if (!isL12LegalTriggerEffect(t.trigger_type, t.expected_effect_on_scenario)) {
      issues.push(
        `trigger ${t.trigger_name}: illegal effect ${t.expected_effect_on_scenario} for ${t.trigger_type}`,
      );
    }
    if (
      !t.monitoring_requirement.monitorable &&
      t.trigger_status === L12TriggerStatus.ACTIVE
    ) {
      issues.push(`trigger ${t.trigger_name}: ACTIVE but not monitorable`);
    }
    if (t.evidence_refs.length === 0) issues.push(`trigger ${t.trigger_name}: no evidence`);
    if (detectForbidden(t.trigger_name)) issues.push(`trigger ${t.trigger_name}: forbidden phrase`);

    const trigger_id = buildL12TriggerId({
      scenario_id: t.scenario_id,
      trigger_type: t.trigger_type,
      trigger_name: t.trigger_name,
    });
    const replay_hash = buildL12ScenarioReplayHash({
      domain: 'l12.trigger.contract',
      policy_version: args.policy_version,
      material: {
        trigger_id,
        trigger_type: t.trigger_type,
        trigger_status: t.trigger_status,
        materiality: t.trigger_materiality_class,
        effect: t.expected_effect_on_scenario,
      },
    });
    built.push({
      trigger_contract_id: `l12.trigger.contract.${replay_hash}`,
      trigger_id,
      scenario_id: t.scenario_id,
      scenario_set_id: t.scenario_set_id,
      trigger_type: t.trigger_type,
      trigger_name: t.trigger_name,
      trigger_condition_refs: [...t.trigger_condition_refs].sort(),
      trigger_status: t.trigger_status,
      trigger_strength_score: t.trigger_strength_score,
      trigger_materiality_class: t.trigger_materiality_class,
      expected_effect_on_scenario: t.expected_effect_on_scenario,
      monitoring_requirement: t.monitoring_requirement,
      evidence_refs: [...t.evidence_refs].sort(),
      lineage_refs: [...t.lineage_refs].sort(),
      policy_version: args.policy_version,
      replay_hash,
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  const refsByType = (tt: L12TriggerType) =>
    built.filter(t => t.trigger_type === tt).map(t => t.trigger_id).sort();

  const set_replay = buildL12ScenarioReplayHash({
    domain: 'l12.trigger_set',
    policy_version: args.policy_version,
    material: {
      condition_set_id: args.condition_set.condition_set_id,
      trigger_ids: built.map(t => t.trigger_id).sort(),
    },
  });
  const trigger_set: L12ResolvedTriggerSet = {
    trigger_set_id: `l12.trigger_set.${set_replay}`,
    scenario_subject_id: args.condition_set.scenario_subject_id,
    candidate_set_id: args.condition_set.candidate_set_id,
    triggers: built,
    bullish_confirmation_trigger_refs: refsByType(L12TriggerType.BULLISH_CONFIRMATION_TRIGGER),
    bearish_confirmation_trigger_refs: refsByType(L12TriggerType.BEARISH_CONFIRMATION_TRIGGER),
    failure_trigger_refs: refsByType(L12TriggerType.FAILURE_TRIGGER),
    recovery_trigger_refs: refsByType(L12TriggerType.RECOVERY_TRIGGER),
    ranking_shift_trigger_refs: refsByType(L12TriggerType.RANKING_SHIFT_TRIGGER),
    invalidation_trigger_refs: refsByType(L12TriggerType.INVALIDATION_TRIGGER),
    watch_trigger_refs: refsByType(L12TriggerType.WATCH_TRIGGER),
    blocked_trigger_refs: built
      .filter(
        t =>
          t.trigger_status === L12TriggerStatus.BLOCKED_BY_MISSING_VISIBILITY ||
          t.trigger_status === L12TriggerStatus.BLOCKED_BY_RESTRICTION,
      )
      .map(t => t.trigger_id)
      .sort(),
    lineage_refs: [...new Set(built.flatMap(t => t.lineage_refs))].sort(),
    replay_hash: set_replay,
    policy_version: args.policy_version,
  };
  return { ok: true, trigger_set, issues: [] };
}
