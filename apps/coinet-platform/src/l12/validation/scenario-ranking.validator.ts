/**
 * L12.4 — Ranking validator (§12.4.29).
 */

import { L12PathConfidenceBand } from '../contracts/path-confidence-profile';
import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';
import { L12ScenarioSpreadClass } from '../contracts/scenario-set';
import type { L12ScenarioRankingResult } from '../engine/scenario-ranking-engine';

import {
  L12RuntimeViolationCode,
  L12RuntimeViolationIssue,
  l12IssueOf,
} from './l12-runtime-violation-codes';

export interface ValidateL12RankingArgs {
  readonly ranking: L12ScenarioRankingResult;
  readonly path_confidence: L12PathConfidenceContract;
}

export interface ValidateL12RankingResult {
  readonly ok: boolean;
  readonly issues: readonly L12RuntimeViolationIssue[];
}

export function validateL12ScenarioRanking(
  args: ValidateL12RankingArgs,
): ValidateL12RankingResult {
  const issues: L12RuntimeViolationIssue[] = [];
  const r = args.ranking;
  if (!r.base_case_ref) {
    issues.push(l12IssueOf(L12RuntimeViolationCode.L12R_RANKING_NO_BASE_CASE, 'no base case ref', r.ranking_id));
  }
  if (!r.primary_scenario_ref) {
    issues.push(l12IssueOf(L12RuntimeViolationCode.L12R_RANKING_NO_PRIMARY, 'no primary ref', r.ranking_id));
  }
  if (
    r.scenario_spread_class === L12ScenarioSpreadClass.NARROW_PRIMARY ||
    r.scenario_spread_class === L12ScenarioSpreadClass.UNRESOLVED_COMPETITION
  ) {
    if (!r.secondary_scenario_ref && r.scenario_spread_class !== L12ScenarioSpreadClass.UNRESOLVED_COMPETITION) {
      issues.push(
        l12IssueOf(L12RuntimeViolationCode.L12R_RANKING_FAKE_CLEAN, 'narrow spread without secondary', r.ranking_id),
      );
    }
  }
  // Fake-clean: claims clean band but cap refs are present
  if (
    args.path_confidence.confidence_cap_refs.length > 0 &&
    (args.path_confidence.primary_path_confidence_band === L12PathConfidenceBand.HIGH ||
      args.path_confidence.primary_path_confidence_band === L12PathConfidenceBand.VERY_HIGH)
  ) {
    issues.push(
      l12IssueOf(
        L12RuntimeViolationCode.L12R_CONFIDENCE_HIGH_UNDER_INVALIDATION,
        'HIGH/VERY_HIGH band with cap refs present',
        r.ranking_id,
      ),
    );
  }
  return { ok: issues.length === 0, issues };
}
