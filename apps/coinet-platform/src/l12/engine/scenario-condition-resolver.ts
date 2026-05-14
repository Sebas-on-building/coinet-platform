/**
 * L12.4 — Engine 4: ScenarioConditionResolver (§12.4.16).
 */

import {
  buildL12ConditionId,
  buildL12ScenarioReplayHash,
} from '../contracts/scenario-ids';
import {
  L12ConditionMaterialityClass,
  L12ConditionOperator,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ConditionStatus,
  L12ScenarioConditionType,
  isL12LegalConditionTypeLayer,
} from '../contracts/scenario-condition';
import type { L12ConditionContract } from '../contracts/scenario-condition.contract';

import type { L12ScenarioCandidateSet } from './scenario-candidate-engine';

const RAW_REF = /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i;
const CAUSALITY_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])causes?(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])will\s+cause(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])guarantees?(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])certain(?:[^a-z0-9]|$)/i,
];

export interface L12ResolvedConditionSet {
  readonly condition_set_id: string;
  readonly scenario_subject_id: string;
  readonly candidate_set_id: string;

  readonly conditions: readonly L12ConditionContract[];

  readonly required_condition_refs: readonly string[];
  readonly supporting_condition_refs: readonly string[];
  readonly weakening_condition_refs: readonly string[];
  readonly confirmation_condition_refs: readonly string[];
  readonly invalidation_condition_refs: readonly string[];
  readonly shift_condition_refs: readonly string[];
  readonly disclosure_condition_refs: readonly string[];

  readonly unresolved_condition_refs: readonly string[];
  readonly blocked_condition_refs: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L12ConditionInput {
  readonly scenario_id: string;
  readonly scenario_set_id: string;
  readonly condition_type: L12ScenarioConditionType;
  readonly condition_role: L12ConditionRole;
  readonly source_layer: L12ConditionSourceLayer;
  readonly required_surface_ref: string;
  readonly current_state_ref: string;
  readonly operator: L12ConditionOperator;
  readonly threshold_value?: number;
  readonly expected_state?: string;
  readonly condition_status: L12ConditionStatus;
  readonly materiality_class: L12ConditionMaterialityClass;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly monitorable: boolean;
  readonly restriction_aware: boolean;
  readonly contradiction_aware: boolean;
  readonly free_text?: string;
}

export interface ResolveL12ConditionsArgs {
  readonly candidate_set: L12ScenarioCandidateSet;
  readonly conditions: readonly L12ConditionInput[];
  readonly policy_version: string;
}

export interface ResolveL12ConditionsResult {
  readonly ok: boolean;
  readonly condition_set?: L12ResolvedConditionSet;
  readonly issues: readonly string[];
}

export function resolveL12Conditions(
  args: ResolveL12ConditionsArgs,
): ResolveL12ConditionsResult {
  const issues: string[] = [];
  const built: L12ConditionContract[] = [];

  for (const c of args.conditions) {
    if (!isL12LegalConditionTypeLayer(c.condition_type, c.source_layer)) {
      issues.push(`condition type/layer mismatch: ${c.condition_type}/${c.source_layer}`);
    }
    if (!c.required_surface_ref) issues.push('condition without required_surface_ref');
    if (!c.current_state_ref) issues.push('condition without current_state_ref');
    if (RAW_REF.test(c.required_surface_ref)) {
      issues.push(`condition uses raw lower-layer ref: ${c.required_surface_ref}`);
    }
    if (
      (c.materiality_class === L12ConditionMaterialityClass.MATERIAL ||
        c.materiality_class === L12ConditionMaterialityClass.CRITICAL) &&
      c.evidence_refs.length === 0
    ) {
      issues.push('material condition without evidence');
    }
    if (c.lineage_refs.length === 0) issues.push('condition without lineage');
    if (
      (c.condition_role === L12ConditionRole.CONFIRMS_PATH ||
        c.condition_role === L12ConditionRole.INVALIDATES_PATH) &&
      !c.monitorable
    ) {
      issues.push('confirmation/invalidation condition not monitorable');
    }
    if (c.free_text) {
      for (const p of CAUSALITY_PATTERNS) {
        if (p.test(c.free_text)) {
          issues.push('condition claims causality/certainty');
          break;
        }
      }
    }

    const condition_id = buildL12ConditionId({
      scenario_id: c.scenario_id,
      source_layer: c.source_layer,
      required_surface_ref: c.required_surface_ref,
      operator: c.operator,
    });
    const replay_hash = buildL12ScenarioReplayHash({
      domain: 'l12.condition.contract',
      policy_version: args.policy_version,
      material: {
        condition_id,
        condition_type: c.condition_type,
        condition_role: c.condition_role,
        operator: c.operator,
        threshold_value: c.threshold_value ?? null,
        expected_state: c.expected_state ?? null,
        condition_status: c.condition_status,
        materiality_class: c.materiality_class,
      },
    });
    built.push({
      condition_contract_id: `l12.condition.contract.${replay_hash}`,
      condition_id,
      scenario_id: c.scenario_id,
      scenario_set_id: c.scenario_set_id,
      condition_type: c.condition_type,
      condition_role: c.condition_role,
      source_layer: c.source_layer,
      required_surface_ref: c.required_surface_ref,
      current_state_ref: c.current_state_ref,
      operator: c.operator,
      threshold_value: c.threshold_value,
      expected_state: c.expected_state,
      condition_status: c.condition_status,
      materiality_class: c.materiality_class,
      evidence_refs: [...c.evidence_refs].sort(),
      lineage_refs: [...c.lineage_refs].sort(),
      monitorable: c.monitorable,
      restriction_aware: c.restriction_aware,
      contradiction_aware: c.contradiction_aware,
      policy_version: args.policy_version,
      replay_hash,
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  const refsByRole = (r: L12ConditionRole) =>
    built.filter(c => c.condition_role === r).map(c => c.condition_id).sort();

  const set_replay = buildL12ScenarioReplayHash({
    domain: 'l12.condition_set',
    policy_version: args.policy_version,
    material: {
      candidate_set_id: args.candidate_set.candidate_set_id,
      condition_ids: built.map(c => c.condition_id).sort(),
    },
  });
  const condition_set: L12ResolvedConditionSet = {
    condition_set_id: `l12.condition_set.${set_replay}`,
    scenario_subject_id: args.candidate_set.scenario_subject_id,
    candidate_set_id: args.candidate_set.candidate_set_id,
    conditions: built,
    required_condition_refs: refsByRole(L12ConditionRole.REQUIRED_FOR_PATH),
    supporting_condition_refs: refsByRole(L12ConditionRole.SUPPORTS_PATH),
    weakening_condition_refs: refsByRole(L12ConditionRole.WEAKENS_PATH),
    confirmation_condition_refs: refsByRole(L12ConditionRole.CONFIRMS_PATH),
    invalidation_condition_refs: refsByRole(L12ConditionRole.INVALIDATES_PATH),
    shift_condition_refs: refsByRole(L12ConditionRole.SHIFTS_RANKING),
    disclosure_condition_refs: refsByRole(L12ConditionRole.DISCLOSURE_ONLY),
    unresolved_condition_refs: built
      .filter(c =>
        c.condition_status === L12ConditionStatus.UNSATISFIED ||
        c.condition_status === L12ConditionStatus.UNKNOWN ||
        c.condition_status === L12ConditionStatus.PARTIALLY_SATISFIED,
      )
      .map(c => c.condition_id)
      .sort(),
    blocked_condition_refs: built
      .filter(c =>
        c.condition_status === L12ConditionStatus.BLOCKED_BY_RESTRICTION ||
        c.condition_status === L12ConditionStatus.BLOCKED_BY_MISSING_VISIBILITY ||
        c.condition_status === L12ConditionStatus.BLOCKED_BY_DRIFT,
      )
      .map(c => c.condition_id)
      .sort(),
    lineage_refs: [...new Set(built.flatMap(c => c.lineage_refs))].sort(),
    replay_hash: set_replay,
    policy_version: args.policy_version,
  };
  return { ok: true, condition_set, issues: [] };
}
