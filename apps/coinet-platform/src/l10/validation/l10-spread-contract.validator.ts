/**
 * L10.3 — Spread Profile Contract Validator
 *
 * §10.3.7.1 — Narrow / tied spreads must be explicit. A spread profile
 * is illegal if it hides narrowing (flag inconsistent with magnitude),
 * if class and magnitude disagree, or if secondary is missing while
 * competition is live.
 */

import type { L10HypothesisSpreadProfileContract } from '../contracts/hypothesis-spread.contract';
import {
  ALL_L10_SPREAD_CLASSES,
  l10SpreadClassForGap,
} from '../contracts/hypothesis-spread-profile';
import { ALL_L10_RANKING_STABILITY_CLASSES } from '../contracts/hypothesis-ranking';
import { L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS } from '../contracts/hypothesis-materialization-policy';
import {
  L10ContractIssue,
  L10ContractReport,
  L10HypothesisContractViolationCode as V,
} from './l10-contract-violation-codes';

export function validateL10SpreadContract(
  s: L10HypothesisSpreadProfileContract,
): L10ContractReport {
  const issues: L10ContractIssue[] = [];

  if (!s.spread_profile_id)
    issues.push({ code: V.SPREAD_MISSING_IDENTITY, message: 'spread_profile_id required' });
  if (!s.spread_contract_version)
    issues.push({ code: V.SPREAD_MISSING_CONTRACT_VERSION, message: 'spread_contract_version required' });
  if (!s.ranking_ref)
    issues.push({ code: V.SPREAD_MISSING_RANKING_REF, message: 'ranking_ref required' });
  if (!s.primary_hypothesis_ref)
    issues.push({ code: V.SPREAD_MISSING_PRIMARY, message: 'primary_hypothesis_ref required' });

  if ((s.competition_size ?? 0) > 1 && !s.secondary_hypothesis_ref) {
    issues.push({ code: V.SPREAD_MISSING_SECONDARY_WHEN_COMPETITION,
      message: 'secondary_hypothesis_ref required when competition_size > 1' });
  }

  if (s.confidence_spread === undefined || s.confidence_spread === null) {
    issues.push({ code: V.SPREAD_MISSING_MAGNITUDE, message: 'confidence_spread required' });
  } else if (!Number.isFinite(s.confidence_spread)
    || s.confidence_spread < 0 || s.confidence_spread > 1) {
    issues.push({ code: V.SPREAD_MAGNITUDE_OUT_OF_RANGE,
      message: 'confidence_spread must be finite in [0,1]' });
  } else {
    const expected = l10SpreadClassForGap(s.confidence_spread);
    if (!s.spread_class) {
      issues.push({ code: V.SPREAD_MISSING_CLASS, message: 'spread_class required' });
    } else if (!ALL_L10_SPREAD_CLASSES.includes(s.spread_class)) {
      issues.push({ code: V.SPREAD_MISSING_CLASS,
        message: `spread_class '${s.spread_class}' not registered` });
    } else if (s.spread_class !== expected) {
      issues.push({ code: V.SPREAD_CLASS_INCONSISTENT,
        message: `spread_class ${s.spread_class} inconsistent with magnitude (expected ${expected})` });
    }

    const narrowThresh = L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS.narrowSpread;
    const shouldBeNarrow = s.confidence_spread < narrowThresh;
    if (shouldBeNarrow && s.narrow_spread_flag !== true) {
      issues.push({ code: V.SPREAD_NARROW_FLAG_HIDDEN,
        message: `narrow_spread_flag must be true when confidence_spread < ${narrowThresh}` });
    }
  }

  if (!s.ranking_stability_class
    || !ALL_L10_RANKING_STABILITY_CLASSES.includes(s.ranking_stability_class)) {
    issues.push({ code: V.SPREAD_MISSING_STABILITY_CLASS,
      message: 'ranking_stability_class must be registered' });
  }

  if (!s.replay_hash)
    issues.push({ code: V.SPREAD_MISSING_REPLAY_HASH, message: 'replay_hash required' });
  if (!s.lineage_refs
    || !s.lineage_refs.trace_id
    || !s.lineage_refs.manifest_id) {
    issues.push({ code: V.SPREAD_MISSING_LINEAGE,
      message: 'lineage_refs.trace_id and .manifest_id required' });
  }

  return { valid: issues.length === 0, issues };
}
