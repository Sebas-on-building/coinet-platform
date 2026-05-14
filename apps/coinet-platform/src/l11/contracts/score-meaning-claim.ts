/**
 * L11.2 — Score Meaning-Claim Contract (§11.2.5)
 *
 * Every score family must declare a complete, governed meaning-claim
 * object. A meaning claim that lacks any required field is illegal
 * (§11.2.5.2) and rejected at registration time.
 *
 * The doctrine-level meaning claim is richer than L11.1's abstract
 * meaning claim: it carries family identity, downstream-use
 * declarations (legal and forbidden), required disclosures,
 * calibration category, and a policy version for replay-safety.
 */

import { L11ScoreFamily } from './score-family';
import { L11ScoreFamilyDirectionClass } from './score-direction';
import { L11ScoreProductionStatus } from './score-production-status';

/**
 * §11.2.5 — What a score family is allowed to support downstream.
 * Doctrine-only enumeration; runtime enforcement happens in L11.3
 * formula law and L11.4+ persistence/serving law.
 */
export enum L11ScoreDownstreamUse {
  SCENARIO_WEIGHTING_INPUT = 'SCENARIO_WEIGHTING_INPUT',
  RANKING_SUPPORT = 'RANKING_SUPPORT',
  JUDGMENT_SUPPORT = 'JUDGMENT_SUPPORT',
  CALIBRATION_INPUT = 'CALIBRATION_INPUT',
  EVIDENCE_SUPPORT = 'EVIDENCE_SUPPORT',
  MONITORING_INPUT = 'MONITORING_INPUT',
  ALERT_PRIORITISATION_INPUT = 'ALERT_PRIORITISATION_INPUT',
}

export const ALL_L11_SCORE_DOWNSTREAM_USES: readonly L11ScoreDownstreamUse[] =
  Object.values(L11ScoreDownstreamUse);

/**
 * §11.2.5 / §11.2.17 — Forbidden downstream uses. Every meaning claim
 * must explicitly enumerate these so the interpretation validator
 * cannot be silently bypassed.
 */
export enum L11ForbiddenScoreUse {
  FINAL_RECOMMENDATION = 'FINAL_RECOMMENDATION',
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  TRADE_ACTION = 'TRADE_ACTION',
  SCENARIO_WINNER_SELECTION = 'SCENARIO_WINNER_SELECTION',
  PORTFOLIO_ALLOCATION = 'PORTFOLIO_ALLOCATION',
  GUARANTEED_OUTCOME_CLAIM = 'GUARANTEED_OUTCOME_CLAIM',
  CAUSAL_CERTAINTY_CLAIM = 'CAUSAL_CERTAINTY_CLAIM',
}

export const ALL_L11_FORBIDDEN_SCORE_USES: readonly L11ForbiddenScoreUse[] =
  Object.values(L11ForbiddenScoreUse);

/**
 * §11.2.5 / §11.2.17 — Required disclosure surfaces every production
 * score must be capable of carrying. Maps to attribution / modifier /
 * missing-data fields on the universal score output object.
 */
export enum L11ScoreDisclosureRequirement {
  POSITIVE_ATTRIBUTION = 'POSITIVE_ATTRIBUTION',
  NEGATIVE_ATTRIBUTION = 'NEGATIVE_ATTRIBUTION',
  MISSING_DATA_PROFILE = 'MISSING_DATA_PROFILE',
  CONTRADICTION_POSTURE = 'CONTRADICTION_POSTURE',
  REGIME_MODIFIER = 'REGIME_MODIFIER',
  SEQUENCE_MODIFIER = 'SEQUENCE_MODIFIER',
  HYPOTHESIS_MODIFIER = 'HYPOTHESIS_MODIFIER',
  HYPOTHESIS_RELIANCE_INFLUENCE = 'HYPOTHESIS_RELIANCE_INFLUENCE',
  INVALIDATION_POSTURE = 'INVALIDATION_POSTURE',
  RESTRICTION_POSTURE = 'RESTRICTION_POSTURE',
  CALIBRATION_TARGET = 'CALIBRATION_TARGET',
  EVIDENCE_PACK = 'EVIDENCE_PACK',
}

export const ALL_L11_SCORE_DISCLOSURE_REQUIREMENTS:
  readonly L11ScoreDisclosureRequirement[] =
  Object.values(L11ScoreDisclosureRequirement);

/**
 * §11.2.5 — Calibration category every meaning claim must declare.
 * Used by L11.4+ for empirical evaluation.
 */
export enum L11CalibrationCategory {
  GOVERNED_EMPIRICAL_EVALUATION = 'GOVERNED_EMPIRICAL_EVALUATION',
  GOVERNED_RANKING_EVALUATION = 'GOVERNED_RANKING_EVALUATION',
  GOVERNED_BAND_EVALUATION = 'GOVERNED_BAND_EVALUATION',
  GOVERNED_DRIFT_EVALUATION = 'GOVERNED_DRIFT_EVALUATION',
  CALIBRATION_RESERVED = 'CALIBRATION_RESERVED',
}

export const ALL_L11_CALIBRATION_CATEGORIES: readonly L11CalibrationCategory[] =
  Object.values(L11CalibrationCategory);

/**
 * §11.2.5.1 — Doctrine-level meaning-claim object. Every production
 * score family must register one of these.
 */
export interface L11ScoreFamilyMeaningClaim {
  readonly meaning_claim_id: string;
  readonly score_family: L11ScoreFamily;
  readonly score_name: string;

  readonly meaning_claim: string;
  readonly measures: readonly string[];
  readonly does_not_measure: readonly string[];

  readonly high_value_means: string;
  readonly low_value_means: string;

  readonly legal_interpretations: readonly string[];
  readonly illegal_interpretations: readonly string[];

  readonly direction_class: L11ScoreFamilyDirectionClass;

  readonly intended_downstream_uses: readonly L11ScoreDownstreamUse[];
  readonly forbidden_downstream_uses: readonly L11ForbiddenScoreUse[];

  readonly required_disclosures: readonly L11ScoreDisclosureRequirement[];

  readonly calibration_category: L11CalibrationCategory;
  readonly production_status: L11ScoreProductionStatus;

  readonly policy_version: string;
}

/**
 * §11.2.5.2 — Required forbidden uses every production meaning claim
 * must explicitly block, regardless of family. These four cannot be
 * silently dropped.
 */
export const L11_REQUIRED_FORBIDDEN_USES: readonly L11ForbiddenScoreUse[] = [
  L11ForbiddenScoreUse.FINAL_RECOMMENDATION,
  L11ForbiddenScoreUse.FINAL_JUDGMENT,
  L11ForbiddenScoreUse.TRADE_ACTION,
  L11ForbiddenScoreUse.SCENARIO_WINNER_SELECTION,
];
