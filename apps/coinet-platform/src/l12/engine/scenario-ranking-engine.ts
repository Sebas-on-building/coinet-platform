/**
 * L12.4 — Engine 9: ScenarioRankingEngine (§12.4.21).
 *
 * Ranks scenario paths and is the *only* engine that may assign primary,
 * secondary, base case, scenario spread, coexistence class, multi-path class.
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import { L12ScenarioCoexistenceClass } from '../contracts/scenario-coexistence';
import {
  L12MultiPathClass,
  L12ScenarioSpreadClass,
  isL12NarrowOrUnresolvedSpread,
} from '../contracts/scenario-set';
import { L12ScenarioType } from '../contracts/scenario-type';

import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';
import type { L12ConstructedScenarioPaths } from './scenario-path-construction-engine';

const FORBIDDEN_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])scenario[\s_]*winner(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])final[\s_]*judgment(?:[^a-z0-9]|$)/i,
];

export interface L12ScenarioRankingResult {
  readonly ranking_id: string;
  readonly scenario_subject_id: string;
  readonly scenario_set_id: string;

  readonly ordered_scenario_refs: readonly string[];

  readonly base_case_ref: string;
  readonly primary_scenario_ref: string;
  readonly secondary_scenario_ref?: string;

  readonly scenario_spread_score: number;
  readonly scenario_spread_class: L12ScenarioSpreadClass;

  readonly coexistence_class: L12ScenarioCoexistenceClass;
  readonly multi_path_class: L12MultiPathClass;

  readonly ranking_reason_codes: readonly string[];

  readonly unresolved_competition: boolean;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface RankL12ScenariosArgs {
  readonly constructed: L12ConstructedScenarioPaths;
  readonly path_confidence: L12PathConfidenceContract;
  readonly insufficient_inputs_for_alternatives?: boolean;
  readonly policy_version: string;
}

export interface RankL12ScenariosResult {
  readonly ok: boolean;
  readonly ranking?: L12ScenarioRankingResult;
  readonly issues: readonly string[];
}

function classifySpread(score: number): L12ScenarioSpreadClass {
  if (score >= 0.4) return L12ScenarioSpreadClass.CLEAR_PRIMARY;
  if (score >= 0.2) return L12ScenarioSpreadClass.MODERATE_PRIMARY;
  if (score > 0.05) return L12ScenarioSpreadClass.NARROW_PRIMARY;
  return L12ScenarioSpreadClass.UNRESOLVED_COMPETITION;
}

export function rankL12Scenarios(args: RankL12ScenariosArgs): RankL12ScenariosResult {
  const issues: string[] = [];
  const paths = args.constructed.scenario_paths;
  if (paths.length === 0) {
    return { ok: false, issues: ['no constructed paths'] };
  }
  for (const p of paths) {
    if (FORBIDDEN_PATTERNS.some(rx => rx.test(p.scenario_name) || rx.test(p.path_claim))) {
      issues.push(`forbidden phrase in path "${p.scenario_name}"`);
    }
  }

  const baseCase = paths.find(p => p.scenario_type === L12ScenarioType.BASE_CASE);
  if (!baseCase) issues.push('no base-case path');

  const ordered = [...paths].sort((a, b) => {
    const ca = args.path_confidence.scenario_confidences[a.scenario_id] ?? 0;
    const cb = args.path_confidence.scenario_confidences[b.scenario_id] ?? 0;
    if (cb !== ca) return cb - ca;
    return a.scenario_id < b.scenario_id ? -1 : 1;
  });

  const primary = ordered[0]!;
  const secondary = ordered[1];
  const insufficient =
    Boolean(args.insufficient_inputs_for_alternatives) ||
    primary.scenario_type === L12ScenarioType.INSUFFICIENT_DATA_CASE;

  if (paths.length === 1 && !insufficient) {
    issues.push('single path without insufficient-competition');
  }

  const primaryConf = args.path_confidence.scenario_confidences[primary.scenario_id] ?? 0;
  const secondaryConf = secondary
    ? args.path_confidence.scenario_confidences[secondary.scenario_id] ?? 0
    : 0;
  const spread = Math.max(0, primaryConf - secondaryConf);
  const spread_class = insufficient
    ? L12ScenarioSpreadClass.INSUFFICIENT_SCENARIO_COMPETITION
    : classifySpread(spread);

  const narrow = isL12NarrowOrUnresolvedSpread(spread_class);
  if (narrow && !secondary && !insufficient) {
    issues.push('close/narrow spread without secondary scenario');
  }

  let multi_path_class: L12MultiPathClass;
  if (insufficient) {
    multi_path_class = paths.length === 1
      ? L12MultiPathClass.INSUFFICIENT_INPUTS_FOR_ALTERNATIVES
      : L12MultiPathClass.SINGLE_PATH_BLOCKED;
  } else if (spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION) {
    multi_path_class = L12MultiPathClass.MULTI_PATH_UNRESOLVED;
  } else if (spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY) {
    multi_path_class = L12MultiPathClass.BASE_WITH_CLOSE_SECONDARY;
  } else {
    multi_path_class = L12MultiPathClass.BASE_WITH_ALTERNATIVES;
  }

  let coexistence_class: L12ScenarioCoexistenceClass;
  if (insufficient && paths.length === 1) {
    coexistence_class = L12ScenarioCoexistenceClass.SINGLE_PATH_INSUFFICIENT;
  } else if (spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION) {
    coexistence_class = L12ScenarioCoexistenceClass.UNRESOLVED_MULTI_PATH;
  } else if (spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY) {
    coexistence_class = L12ScenarioCoexistenceClass.CLOSE_PRIMARY_SECONDARY;
  } else {
    coexistence_class = L12ScenarioCoexistenceClass.CLEAN_BASE_WITH_ALTERNATIVES;
  }

  const reason: string[] = [];
  if (narrow) reason.push('CLOSE_OR_NARROW_SPREAD');
  if (insufficient) reason.push('INSUFFICIENT_SCENARIO_COMPETITION');
  if (
    args.path_confidence.confidence_cap_refs.length > 0
  ) reason.push('CONFIDENCE_CAPS_PRESENT');

  if (issues.length > 0) return { ok: false, issues };

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.ranking',
    policy_version: args.policy_version,
    material: {
      scenario_set_id: args.constructed.scenario_set_id,
      ordered: ordered.map(p => p.scenario_id),
      primary: primary.scenario_id,
      secondary: secondary?.scenario_id ?? null,
      spread,
      spread_class,
      coexistence_class,
      multi_path_class,
    },
  });
  const ranking: L12ScenarioRankingResult = {
    ranking_id: `l12.ranking.${replay_hash}`,
    scenario_subject_id: args.constructed.scenario_subject_id,
    scenario_set_id: args.constructed.scenario_set_id,
    ordered_scenario_refs: ordered.map(p => p.scenario_id),
    base_case_ref: baseCase?.scenario_id ?? primary.scenario_id,
    primary_scenario_ref: primary.scenario_id,
    secondary_scenario_ref: secondary?.scenario_id,
    scenario_spread_score: spread,
    scenario_spread_class: spread_class,
    coexistence_class,
    multi_path_class,
    ranking_reason_codes: reason.sort(),
    unresolved_competition: spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION,
    lineage_refs: [...args.constructed.lineage_refs].sort(),
    replay_hash,
    policy_version: args.policy_version,
  };
  return { ok: true, ranking, issues: [] };
}
