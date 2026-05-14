/**
 * L13.2 — Confidence Breakdown Validator
 *
 * §13.2.7 — Confidence may only narrow from lower layers. The L13
 * overall band may not be HIGHER than the highest lower-layer band
 * (this is a "no raising" rule, not a clamp to lowest). Active
 * invalidation forces uncertainty language.
 */

import {
  ALL_L13_EXPLANATION_CONFIDENCE_BANDS,
  L13ConfidenceNarrowingReason,
  L13ExplanationConfidenceBand,
  rankL13ExplanationConfidenceBand,
  type L13ConfidenceBreakdown,
} from '../contracts/confidence-breakdown';
import { L13ViolationSeverity } from '../contracts/l13-constitutional-types';
import { L13InputPackageViolationCode } from './l13-input-package-violation-codes';
import {
  l13PackageResult,
  type L13InputPackageIssue,
  type L13InputPackageValidationResult,
} from './_l13-issue';

function rankByName(name: string): number {
  const normalized = name.toUpperCase();
  if (
    !ALL_L13_EXPLANATION_CONFIDENCE_BANDS.includes(
      normalized as L13ExplanationConfidenceBand,
    )
  ) {
    return rankL13ExplanationConfidenceBand(L13ExplanationConfidenceBand.LOW);
  }
  return rankL13ExplanationConfidenceBand(
    normalized as L13ExplanationConfidenceBand,
  );
}

export function validateL13ConfidenceBreakdown(
  breakdown: L13ConfidenceBreakdown,
): L13InputPackageValidationResult {
  const issues: L13InputPackageIssue[] = [];

  const overallRank = rankL13ExplanationConfidenceBand(
    breakdown.overall_explanation_confidence_band,
  );

  const lowerRanks = [
    rankByName(breakdown.validation_confidence_band),
    rankByName(breakdown.regime_confidence_band),
    rankByName(breakdown.sequence_confidence_band),
    rankByName(breakdown.hypothesis_confidence_band),
    rankByName(breakdown.score_confidence_band),
    rankByName(breakdown.scenario_confidence_band),
  ];
  const minLowerRank = Math.min(...lowerRanks);

  if (
    breakdown.overall_explanation_confidence_band !==
      L13ExplanationConfidenceBand.BLOCKED &&
    overallRank > minLowerRank
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_INVALID,
      severity: L13ViolationSeverity.CRITICAL,
      subject_ref: breakdown.confidence_breakdown_id,
      message: `L13 overall band rank ${overallRank} exceeds narrowest lower-layer rank ${minLowerRank}`,
    });
  }

  if (
    breakdown.confidence_narrowing_reasons.includes(
      L13ConfidenceNarrowingReason.ACTIVE_INVALIDATION,
    ) &&
    !breakdown.must_use_uncertainty_language
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_INVALID,
      severity: L13ViolationSeverity.CRITICAL,
      message:
        'active invalidation must force must_use_uncertainty_language=true',
    });
  }
  if (
    breakdown.confidence_narrowing_reasons.length > 0 &&
    breakdown.may_use_confident_language &&
    overallRank <
      rankL13ExplanationConfidenceBand(
        L13ExplanationConfidenceBand.HIGH,
      )
  ) {
    issues.push({
      code: L13InputPackageViolationCode.L13P_CONFIDENCE_BREAKDOWN_INVALID,
      severity: L13ViolationSeverity.ERROR,
      message:
        'may_use_confident_language=true while narrowing reasons present and band below HIGH',
    });
  }

  return l13PackageResult(issues);
}
