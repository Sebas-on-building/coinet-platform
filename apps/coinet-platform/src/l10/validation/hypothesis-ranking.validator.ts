/**
 * L10.2 — HypothesisRanking Validator
 *
 * §10.2.13.4 — A ranking is illegal if ordered refs absent, primary
 * absent, secondary absent when competition_size > 1, primary not first
 * in order, replay hash absent, or lineage absent. Single-story
 * collapse is illegal regardless of confidence.
 */

import { L10HypothesisRanking } from '../contracts/hypothesis-ranking';
import {
  L10ObjectValidationIssue,
  L10ObjectValidationReport,
  L10ObjectViolationCode,
} from './hypothesis-object-violation-codes';

export interface L10RankingValidationInput {
  readonly ranking: L10HypothesisRanking;
  /** §10.2.7.5 — Number of plausible competitors available for this subject. */
  readonly availablePlausibleCompetitors: number;
}

export function validateL10HypothesisRanking(
  input: L10RankingValidationInput,
): L10ObjectValidationReport {
  const issues: L10ObjectValidationIssue[] = [];
  const r = input.ranking;

  if (!r.hypothesis_ranking_id) {
    issues.push({ code: L10ObjectViolationCode.RANKING_MISSING_ID, message: 'hypothesis_ranking_id required' });
  }
  if (!r.hypothesis_subject_id) {
    issues.push({ code: L10ObjectViolationCode.RANKING_MISSING_SUBJECT, message: 'hypothesis_subject_id required' });
  }
  if (r.ordered_hypothesis_assessment_refs.length === 0) {
    issues.push({
      code: L10ObjectViolationCode.RANKING_MISSING_ORDERED_REFS,
      message: 'ordered_hypothesis_assessment_refs must not be empty',
    });
  }
  if (!r.primary_hypothesis_ref) {
    issues.push({ code: L10ObjectViolationCode.RANKING_MISSING_PRIMARY, message: 'primary_hypothesis_ref required' });
  }
  if (r.competition_size > 1 && !r.secondary_hypothesis_ref) {
    issues.push({
      code: L10ObjectViolationCode.RANKING_MISSING_SECONDARY_WHEN_COMPETITION,
      message: 'secondary_hypothesis_ref required when competition_size > 1',
    });
  }
  if (
    r.primary_hypothesis_ref &&
    r.ordered_hypothesis_assessment_refs.length > 0 &&
    r.ordered_hypothesis_assessment_refs[0] !== r.primary_hypothesis_ref
  ) {
    issues.push({
      code: L10ObjectViolationCode.RANKING_PRIMARY_NOT_FIRST,
      message: 'primary_hypothesis_ref must be first entry in ordered_hypothesis_assessment_refs',
    });
  }
  if (!r.spread_profile_ref) {
    issues.push({
      code: L10ObjectViolationCode.RANKING_MISSING_SPREAD_PROFILE,
      message: 'spread_profile_ref required',
    });
  }
  if (!r.replay_hash) {
    issues.push({ code: L10ObjectViolationCode.RANKING_MISSING_REPLAY_HASH, message: 'replay_hash required' });
  }
  if (!r.lineage_refs || r.lineage_refs.length === 0) {
    issues.push({ code: L10ObjectViolationCode.RANKING_MISSING_LINEAGE, message: 'lineage_refs required' });
  }

  // Single-story collapse: plausible competitors existed but ranking
  // emitted only one entry.
  if (
    r.competition_size === 1 &&
    input.availablePlausibleCompetitors >= 2
  ) {
    issues.push({
      code: L10ObjectViolationCode.RANKING_SINGLE_STORY_COLLAPSE,
      message:
        `${input.availablePlausibleCompetitors} plausible competitors existed but ranking carries only 1`,
    });
  }

  return { valid: issues.length === 0, issues };
}
