/**
 * L12.5 — Scenario spread engine (§12.5.15).
 */

import { L12ScenarioSpreadClass } from '../contracts/scenario-set';
import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import {
  L12ScenarioSpreadProfile,
  l12IsClearPrimarySpread,
  l12ScenarioSpreadClassFor,
  l12SpreadRequiresShiftConditions,
} from '../contracts/scenario-spread-profile';

export interface L12ScenarioSpreadEngineInput {
  readonly scenario_set_id: string;

  readonly primary_scenario_ref: string;
  readonly secondary_scenario_ref?: string;

  readonly primary_confidence_score: number;
  readonly secondary_confidence_score: number;

  readonly active_invalidation_present: boolean;
  readonly contradiction_unresolved: boolean;

  readonly lineage_refs?: readonly string[];
  readonly policy_version: string;
}

export interface L12ScenarioSpreadEngineResult {
  readonly ok: boolean;
  readonly profile?: L12ScenarioSpreadProfile;
  readonly issues: readonly string[];
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export function computeL12ScenarioSpreadProfile(
  inp: L12ScenarioSpreadEngineInput,
): L12ScenarioSpreadEngineResult {
  const issues: string[] = [];
  const primary = clamp01(inp.primary_confidence_score);
  const secondary = clamp01(inp.secondary_confidence_score);
  const spread_score = Math.max(0, primary - secondary);
  let spread_class = l12ScenarioSpreadClassFor(spread_score);

  // Clear-primary blocked under active invalidation or unresolved contradiction
  if (l12IsClearPrimarySpread(spread_class) && inp.active_invalidation_present) {
    issues.push('clear primary illegal under active invalidation');
    spread_class = L12ScenarioSpreadClass.MODERATE_PRIMARY;
  }
  if (l12IsClearPrimarySpread(spread_class) && inp.contradiction_unresolved) {
    issues.push('clear primary illegal under unresolved contradiction');
    spread_class = L12ScenarioSpreadClass.MODERATE_PRIMARY;
  }

  const shift_required = l12SpreadRequiresShiftConditions(spread_class);

  // Narrow spread / unresolved competition with no secondary is illegal
  if (
    !inp.secondary_scenario_ref &&
    (spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY ||
      spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION)
  ) {
    issues.push('narrow/unresolved spread without secondary scenario ref');
  }

  const reason_codes: string[] = [];
  if (spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION) reason_codes.push('UNRESOLVED_COMPETITION');
  if (spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY) reason_codes.push('NARROW_PRIMARY');
  if (spread_class === L12ScenarioSpreadClass.MODERATE_PRIMARY) reason_codes.push('MODERATE_PRIMARY');
  if (spread_class === L12ScenarioSpreadClass.CLEAR_PRIMARY) reason_codes.push('CLEAR_PRIMARY');
  if (inp.active_invalidation_present) reason_codes.push('ACTIVE_INVALIDATION_NARROWS_SPREAD');
  if (inp.contradiction_unresolved) reason_codes.push('CONTRADICTION_NARROWS_SPREAD');
  reason_codes.sort();

  const lineage = [
    ...(inp.lineage_refs ?? []),
    `set:${inp.scenario_set_id}`,
    `primary:${inp.primary_scenario_ref}`,
    ...(inp.secondary_scenario_ref ? [`secondary:${inp.secondary_scenario_ref}`] : []),
  ].sort();

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.5.scenario_spread',
    policy_version: inp.policy_version,
    material: {
      set: inp.scenario_set_id,
      primary: inp.primary_scenario_ref,
      secondary: inp.secondary_scenario_ref ?? null,
      primary_score: primary,
      secondary_score: secondary,
      spread_score,
      spread_class,
      shift_required,
      active_invalidation_present: inp.active_invalidation_present,
      contradiction_unresolved: inp.contradiction_unresolved,
    },
  });

  const profile: L12ScenarioSpreadProfile = {
    spread_profile_id: `l12.spread.${inp.scenario_set_id}`,
    scenario_set_id: inp.scenario_set_id,
    primary_scenario_ref: inp.primary_scenario_ref,
    secondary_scenario_ref: inp.secondary_scenario_ref,
    primary_confidence_score: primary,
    secondary_confidence_score: secondary,
    spread_score,
    spread_class,
    spread_reason_codes: reason_codes,
    shift_conditions_required: shift_required,
    active_invalidation_present: inp.active_invalidation_present,
    contradiction_unresolved: inp.contradiction_unresolved,
    lineage_refs: lineage,
    replay_hash,
    policy_version: inp.policy_version,
  };

  return { ok: issues.length === 0, profile, issues };
}
