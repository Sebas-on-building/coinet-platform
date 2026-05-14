/**
 * L12.4 — Engine 6: ScenarioInvalidationEngine (§12.4.18).
 */

import {
  buildL12InvalidationId,
  buildL12ScenarioReplayHash,
} from '../contracts/scenario-ids';
import {
  L12InvalidationEffect,
  L12InvalidationStatus,
  L12InvalidationType,
  isL12ActiveInvalidationStatus,
  isL12LegalInvalidationEffect,
} from '../contracts/scenario-invalidation';
import type {
  L12InvalidationContract,
  L12InvalidationMonitoringRequirement,
} from '../contracts/scenario-invalidation.contract';

import type { L12ResolvedConditionSet } from './scenario-condition-resolver';

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])guaranteed[\s_]*(failure|loss|breakdown)(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])will[\s_]*fail(?:[^a-z0-9]|$)/i,
];

export interface L12ResolvedInvalidationSet {
  readonly invalidation_set_id: string;
  readonly scenario_subject_id: string;
  readonly candidate_set_id: string;

  readonly invalidations: readonly L12InvalidationContract[];

  readonly support_failure_refs: readonly string[];
  readonly contradiction_escalation_refs: readonly string[];
  readonly regime_shift_refs: readonly string[];
  readonly sequence_break_refs: readonly string[];
  readonly hypothesis_rank_flip_refs: readonly string[];
  readonly score_breakdown_refs: readonly string[];
  readonly missing_data_blocker_refs: readonly string[];
  readonly drift_blocker_refs: readonly string[];

  readonly active_invalidation_refs: readonly string[];
  readonly blocking_invalidation_refs: readonly string[];
  readonly watch_invalidation_refs: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L12InvalidationInput {
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
}

export interface BuildL12InvalidationsArgs {
  readonly condition_set: L12ResolvedConditionSet;
  readonly invalidations: readonly L12InvalidationInput[];
  readonly policy_version: string;
}

export interface BuildL12InvalidationsResult {
  readonly ok: boolean;
  readonly invalidation_set?: L12ResolvedInvalidationSet;
  readonly issues: readonly string[];
}

export function buildL12Invalidations(
  args: BuildL12InvalidationsArgs,
): BuildL12InvalidationsResult {
  const issues: string[] = [];
  const built: L12InvalidationContract[] = [];

  for (const i of args.invalidations) {
    if (i.invalidation_condition_refs.length === 0) {
      issues.push(`invalidation ${i.invalidation_name}: no condition refs`);
    }
    if (!isL12LegalInvalidationEffect(i.invalidation_type, i.expected_effect)) {
      issues.push(
        `invalidation ${i.invalidation_name}: illegal effect ${i.expected_effect} for ${i.invalidation_type}`,
      );
    }
    if (i.evidence_refs.length === 0) {
      issues.push(`invalidation ${i.invalidation_name}: no evidence`);
    }
    if (
      isL12ActiveInvalidationStatus(i.invalidation_status) &&
      !i.monitoring_requirement.monitorable
    ) {
      issues.push(`invalidation ${i.invalidation_name}: active but not monitorable`);
    }
    if (FORBIDDEN_PATTERNS.some(p => p.test(i.invalidation_name))) {
      issues.push(`invalidation ${i.invalidation_name}: forbidden phrase`);
    }

    const invalidation_id = buildL12InvalidationId({
      scenario_id: i.scenario_id,
      invalidation_type: i.invalidation_type,
      invalidation_name: i.invalidation_name,
    });
    const replay_hash = buildL12ScenarioReplayHash({
      domain: 'l12.invalidation.contract',
      policy_version: args.policy_version,
      material: {
        invalidation_id,
        type: i.invalidation_type,
        status: i.invalidation_status,
        effect: i.expected_effect,
      },
    });
    built.push({
      invalidation_contract_id: `l12.invalidation.contract.${replay_hash}`,
      invalidation_id,
      scenario_id: i.scenario_id,
      scenario_set_id: i.scenario_set_id,
      invalidation_type: i.invalidation_type,
      invalidation_name: i.invalidation_name,
      invalidation_condition_refs: [...i.invalidation_condition_refs].sort(),
      invalidation_strength_score: i.invalidation_strength_score,
      invalidation_status: i.invalidation_status,
      expected_effect: i.expected_effect,
      monitoring_requirement: i.monitoring_requirement,
      evidence_refs: [...i.evidence_refs].sort(),
      lineage_refs: [...i.lineage_refs].sort(),
      policy_version: args.policy_version,
      replay_hash,
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  const refsByType = (t: L12InvalidationType) =>
    built.filter(i => i.invalidation_type === t).map(i => i.invalidation_id).sort();

  const set_replay = buildL12ScenarioReplayHash({
    domain: 'l12.invalidation_set',
    policy_version: args.policy_version,
    material: {
      condition_set_id: args.condition_set.condition_set_id,
      invalidation_ids: built.map(i => i.invalidation_id).sort(),
    },
  });
  const invalidation_set: L12ResolvedInvalidationSet = {
    invalidation_set_id: `l12.invalidation_set.${set_replay}`,
    scenario_subject_id: args.condition_set.scenario_subject_id,
    candidate_set_id: args.condition_set.candidate_set_id,
    invalidations: built,
    support_failure_refs: refsByType(L12InvalidationType.SUPPORT_FAILURE),
    contradiction_escalation_refs: refsByType(L12InvalidationType.CONTRADICTION_ESCALATION),
    regime_shift_refs: refsByType(L12InvalidationType.REGIME_SHIFT),
    sequence_break_refs: refsByType(L12InvalidationType.SEQUENCE_BREAK),
    hypothesis_rank_flip_refs: refsByType(L12InvalidationType.HYPOTHESIS_RANK_FLIP),
    score_breakdown_refs: refsByType(L12InvalidationType.SCORE_BREAKDOWN),
    missing_data_blocker_refs: refsByType(L12InvalidationType.MISSING_DATA_BLOCKER),
    drift_blocker_refs: refsByType(L12InvalidationType.DRIFT_BLOCKER),
    active_invalidation_refs: built
      .filter(i => isL12ActiveInvalidationStatus(i.invalidation_status))
      .map(i => i.invalidation_id)
      .sort(),
    blocking_invalidation_refs: built
      .filter(i => i.invalidation_status === L12InvalidationStatus.BLOCKING)
      .map(i => i.invalidation_id)
      .sort(),
    watch_invalidation_refs: built
      .filter(i => i.invalidation_status === L12InvalidationStatus.WATCHING)
      .map(i => i.invalidation_id)
      .sort(),
    lineage_refs: [...new Set(built.flatMap(i => i.lineage_refs))].sort(),
    replay_hash: set_replay,
    policy_version: args.policy_version,
  };
  return { ok: true, invalidation_set, issues: [] };
}
