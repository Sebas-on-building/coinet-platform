/**
 * L12.4 — Engine 10: ScenarioShiftConditionEngine (§12.4.22).
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import type {
  L12ShiftConditionContract,
  L12ShiftConditionRequirementPosture,
} from '../contracts/scenario-shift-condition.contract';
import { l12ShiftConditionsRequired } from '../contracts/scenario-shift-condition.contract';
import {
  L12MultiPathClass,
  L12ScenarioSpreadClass,
  isL12NarrowOrUnresolvedSpread,
} from '../contracts/scenario-set';

import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';
import type { L12ScenarioRankingResult } from './scenario-ranking-engine';

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])buy(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])sell(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])long(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])short(?:[^a-z0-9]|$)/i,
];

export interface L12ShiftConditionInputs {
  readonly conditions_that_strengthen_primary: readonly string[];
  readonly conditions_that_weaken_primary: readonly string[];
  readonly conditions_that_promote_secondary: readonly string[];
  readonly conditions_that_collapse_base_case: readonly string[];
  readonly conditions_that_raise_bullish_path: readonly string[];
  readonly conditions_that_raise_bearish_path: readonly string[];
  readonly spread_narrowing_conditions: readonly string[];
  readonly spread_widening_conditions: readonly string[];
}

export interface DeriveL12ShiftConditionsArgs {
  readonly ranking: L12ScenarioRankingResult;
  readonly path_confidence: L12PathConfidenceContract;
  readonly posture: L12ShiftConditionRequirementPosture;
  readonly inputs: L12ShiftConditionInputs;
  readonly policy_version: string;
}

export interface DeriveL12ShiftConditionsResult {
  readonly ok: boolean;
  readonly contract?: L12ShiftConditionContract;
  readonly issues: readonly string[];
}

export function deriveL12ShiftConditions(
  args: DeriveL12ShiftConditionsArgs,
): DeriveL12ShiftConditionsResult {
  const issues: string[] = [];
  const required = l12ShiftConditionsRequired(args.posture);
  const inputs = args.inputs;
  const allRefs = [
    ...inputs.conditions_that_strengthen_primary,
    ...inputs.conditions_that_weaken_primary,
    ...inputs.conditions_that_promote_secondary,
    ...inputs.conditions_that_collapse_base_case,
    ...inputs.conditions_that_raise_bullish_path,
    ...inputs.conditions_that_raise_bearish_path,
    ...inputs.spread_narrowing_conditions,
    ...inputs.spread_widening_conditions,
  ];
  for (const r of allRefs) {
    if (FORBIDDEN_PATTERNS.some(p => p.test(r))) {
      issues.push(`shift condition contains trade language: ${r}`);
      break;
    }
  }
  if (required) {
    const close =
      isL12NarrowOrUnresolvedSpread(args.ranking.scenario_spread_class) ||
      args.ranking.scenario_spread_class === L12ScenarioSpreadClass.MODERATE_PRIMARY;
    if (close && inputs.conditions_that_promote_secondary.length === 0 && args.ranking.secondary_scenario_ref) {
      issues.push('close competition with secondary but no promotion conditions');
    }
    if (
      args.ranking.multi_path_class === L12MultiPathClass.MULTI_PATH_UNRESOLVED &&
      inputs.conditions_that_strengthen_primary.length === 0
    ) {
      issues.push('multi-path unresolved without strengthening conditions');
    }
    if (
      args.posture.activeInvalidationMaterial &&
      inputs.conditions_that_collapse_base_case.length === 0
    ) {
      issues.push('active invalidation material without collapse conditions');
    }
  }
  if (issues.length > 0) return { ok: false, issues };

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.shift_condition.contract',
    policy_version: args.policy_version,
    material: {
      ranking_id: args.ranking.ranking_id,
      strengthen: [...inputs.conditions_that_strengthen_primary].sort(),
      weaken: [...inputs.conditions_that_weaken_primary].sort(),
      promote_secondary: [...inputs.conditions_that_promote_secondary].sort(),
      collapse_base: [...inputs.conditions_that_collapse_base_case].sort(),
      bullish: [...inputs.conditions_that_raise_bullish_path].sort(),
      bearish: [...inputs.conditions_that_raise_bearish_path].sort(),
      narrowing: [...inputs.spread_narrowing_conditions].sort(),
      widening: [...inputs.spread_widening_conditions].sort(),
    },
  });
  const contract: L12ShiftConditionContract = {
    shift_condition_contract_id: `l12.shift_condition.contract.${replay_hash}`,
    shift_condition_set_id: `l12.shift_condition_set.${replay_hash}`,
    scenario_set_id: args.ranking.scenario_set_id,
    current_primary_scenario_ref: args.ranking.primary_scenario_ref,
    current_secondary_scenario_ref: args.ranking.secondary_scenario_ref,
    conditions_that_strengthen_primary: [...inputs.conditions_that_strengthen_primary].sort(),
    conditions_that_weaken_primary: [...inputs.conditions_that_weaken_primary].sort(),
    conditions_that_promote_secondary: [...inputs.conditions_that_promote_secondary].sort(),
    conditions_that_collapse_base_case: [...inputs.conditions_that_collapse_base_case].sort(),
    conditions_that_raise_bullish_path: [...inputs.conditions_that_raise_bullish_path].sort(),
    conditions_that_raise_bearish_path: [...inputs.conditions_that_raise_bearish_path].sort(),
    spread_narrowing_conditions: [...inputs.spread_narrowing_conditions].sort(),
    spread_widening_conditions: [...inputs.spread_widening_conditions].sort(),
    required_under_close_competition:
      isL12NarrowOrUnresolvedSpread(args.ranking.scenario_spread_class),
    lineage_refs: [...args.ranking.lineage_refs].sort(),
    replay_hash,
    policy_version: args.policy_version,
  };
  return { ok: true, contract, issues: [] };
}
