/**
 * L10.3 — Ranking Contract Validator
 *
 * §10.3.6.5 — Rankings are illegal if they suppress the secondary when
 * competition is live, if the primary is not first, if spread is
 * missing, if spread/stability class is absent, or if the ranking
 * reduces to a single-story under conditions that require plurality.
 */

import type { L10HypothesisRankingContract } from '../contracts/hypothesis-ranking.contract';
import { ALL_L10_RANKING_STABILITY_CLASSES } from '../contracts/hypothesis-ranking';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';

export function validateL10RankingContract(
  r: L10HypothesisRankingContract,
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  if (!r.ranking_id)
    issues.push({ code: V.RANKING_MISSING_IDENTITY, message: 'ranking_id required' });
  if (!r.hypothesis_subject_id)
    issues.push({ code: V.RANKING_MISSING_SUBJECT, message: 'hypothesis_subject_id required' });
  if (!r.ranking_contract_version)
    issues.push({ code: V.RANKING_MISSING_CONTRACT_VERSION, message: 'ranking_contract_version required' });

  const ordered = r.ordered_hypothesis_refs ?? [];
  if (ordered.length === 0) {
    issues.push({ code: V.RANKING_MISSING_ORDERED_REFS,
      message: 'ordered_hypothesis_refs must be non-empty' });
  }
  if (!r.primary_hypothesis_ref) {
    issues.push({ code: V.RANKING_MISSING_PRIMARY, message: 'primary_hypothesis_ref required' });
  } else if (ordered.length > 0 && ordered[0] !== r.primary_hypothesis_ref) {
    issues.push({ code: V.RANKING_PRIMARY_NOT_FIRST,
      message: 'primary_hypothesis_ref must be ordered_hypothesis_refs[0]' });
  }

  // Competition-size coherence (§10.3.6.2)
  if (r.competition_size === undefined || r.competition_size === null) {
    issues.push({ code: V.RANKING_MISSING_COMPETITION_SIZE,
      message: 'competition_size required' });
  } else if (r.competition_size !== ordered.length) {
    issues.push({ code: V.RANKING_COMPETITION_SIZE_INCONSISTENT,
      message: `competition_size (${r.competition_size}) != ordered_hypothesis_refs.length (${ordered.length})` });
  }

  // Secondary preservation (§10.3.6.5)
  if ((r.competition_size ?? 0) > 1 && !r.secondary_hypothesis_ref) {
    issues.push({ code: V.RANKING_MISSING_SECONDARY_WHEN_COMPETITION,
      message: 'secondary_hypothesis_ref required when competition_size > 1' });
  }

  // Single-story collapse guard
  if (ordered.length === 1 && (r.competition_size ?? 0) > 1) {
    issues.push({ code: V.RANKING_SINGLE_STORY_COLLAPSE,
      message: 'ordered refs reduced to one while competition_size claims plurality' });
  }

  // Spread (§10.3.6.2)
  if (r.confidence_spread === undefined || r.confidence_spread === null) {
    issues.push({ code: V.RANKING_MISSING_SPREAD, message: 'confidence_spread required' });
  } else if (!Number.isFinite(r.confidence_spread)
    || r.confidence_spread < 0 || r.confidence_spread > 1) {
    issues.push({ code: V.RANKING_SPREAD_OUT_OF_RANGE,
      message: 'confidence_spread must be finite in [0,1]' });
  }
  if (!r.ranking_stability_class
    || !ALL_L10_RANKING_STABILITY_CLASSES.includes(r.ranking_stability_class)) {
    issues.push({ code: V.RANKING_MISSING_STABILITY_CLASS,
      message: 'ranking_stability_class must be registered' });
  }

  if (!r.spread_profile_ref) {
    issues.push({ code: V.RANKING_MISSING_SPREAD_PROFILE, message: 'spread_profile_ref required' });
  }

  if (!r.replay_hash)
    issues.push({ code: V.RANKING_MISSING_REPLAY_HASH, message: 'replay_hash required' });
  if (!r.lineage_refs
    || !r.lineage_refs.trace_id
    || !r.lineage_refs.manifest_id) {
    issues.push({ code: V.RANKING_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and .manifest_id required' });
  }

  return { valid: issues.length === 0, issues };
}
