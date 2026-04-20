/**
 * L10.2 — HypothesisRanking Contract
 *
 * §10.2.13 — Governed ordering of competing explanation candidates for
 * one subject. First-class — not a byproduct of assessments.
 */

import { fnv1aHexL10 } from './hypothesis-subject';

export enum L10RankingStabilityClass {
  STABLE = 'STABLE',
  FRAGILE = 'FRAGILE',
  VOLATILE = 'VOLATILE',
}

export const ALL_L10_RANKING_STABILITY_CLASSES:
  readonly L10RankingStabilityClass[] = Object.values(L10RankingStabilityClass);

export interface L10HypothesisRanking {
  readonly hypothesis_ranking_id: string;
  readonly hypothesis_subject_id: string;
  readonly as_of: string;

  readonly ordered_hypothesis_assessment_refs: readonly string[];
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  readonly competition_size: number;
  readonly ranking_stability_class: L10RankingStabilityClass;

  readonly spread_profile_ref: string;
  readonly shift_condition_set_ref: string | null;

  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly compute_run_id: string;
  readonly replay_hash: string;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export interface L10HypothesisRankingIdInputs {
  readonly hypothesis_subject_id: string;
  readonly as_of: string;
  readonly compute_run_id: string;
}

export function buildL10HypothesisRankingId(
  i: L10HypothesisRankingIdInputs,
): string {
  const key = `${i.hypothesis_subject_id}|${i.as_of}|${i.compute_run_id}`;
  return `hrank_${fnv1aHexL10(key)}_${fnv1aHexL10(i.hypothesis_subject_id)}`;
}

export function l10CompetitionSize(refs: readonly string[]): number {
  return refs.length;
}
