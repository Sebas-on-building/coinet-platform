/**
 * L11.1 — Score Meaning-Claim Law
 *
 * §11.1.4 / §11.1.10 / §11.1.11 — Every L11 score must declare its
 * meaning, direction, legal interpretation, illegal interpretation,
 * intended consumers, calibration target, required attribution
 * surfaces, and downstream-use restriction profile. Direction-mixing
 * is banned. A score without a meaning claim is illegal.
 */

import {
  ALL_L11_SCORE_DIRECTION_CLASSES,
  ALL_L11_SCORE_MEANING_CLAIM_CLASSES,
  L11ScoreDirectionClass,
  L11ScoreMeaningClaimClass,
  L11ScoreRestrictionFlag,
} from './l11-constitutional-types';

/**
 * §11.1.10.1 — Score meaning-claim declaration. Every score must
 * carry one of these declarations.
 */
export interface L11ScoreMeaningClaim {
  readonly meaning_class: L11ScoreMeaningClaimClass;
  readonly measures: string;
  readonly does_not_measure: string;
  readonly intended_consumers: readonly string[];
  readonly calibration_target_category: string;
  readonly required_attribution_surfaces: readonly string[];
  readonly legal_interpretation: string;
  readonly illegal_interpretation: string;
}

/**
 * §11.1.10.2 — Score direction declaration. Mixed direction in a
 * single score is illegal.
 */
export interface L11ScoreDirectionDeclaration {
  readonly direction_class: L11ScoreDirectionClass;
  readonly higher_means: string;
  readonly lower_means: string;
  readonly mixed_direction: false;
}

/**
 * §11.1.11 — Score downstream-use restriction profile. Usage rights
 * are derived from attribution, missing-data, lower-layer
 * restrictions, calibration maturity, and drift state.
 */
export interface L11ScoreRestrictionProfile {
  readonly flags: readonly L11ScoreRestrictionFlag[];
  readonly final_recommendation_blocked: boolean;
  readonly requires_attribution_disclosure: boolean;
  readonly requires_missing_data_disclosure: boolean;
  readonly bounded_by_lower_layer_restrictions: boolean;
}

/**
 * §11.1.10 — Default canonical meaning-claim catalogue used by tests
 * and the boundary validator. Each entry models one production score
 * meaning-claim.
 */
export const L11_DEFAULT_MEANING_CLAIM_CATALOGUE: readonly Readonly<{
  meaning_class: L11ScoreMeaningClaimClass;
  measures: string;
  does_not_measure: string;
  default_direction: L11ScoreDirectionClass;
  default_legal_interpretation: string;
  default_illegal_interpretation: string;
}>[] = [
  {
    meaning_class: L11ScoreMeaningClaimClass.OPPORTUNITY_QUALITY,
    measures:
      'quality of the current opportunity under governed evidence, validated demand, ' +
      'sequence posture, and hypothesis spread',
    does_not_measure: 'a buy signal, a final judgment, or a trade action',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_BETTER,
    default_legal_interpretation: 'governed quantitative interpretation of opportunity quality',
    default_illegal_interpretation: 'final buy recommendation or guaranteed setup',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.DOWNSIDE_RISK,
    measures: 'downside, fragility, invalidation, and structural danger',
    does_not_measure: 'guaranteed loss or a sell signal',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_WORSE,
    default_legal_interpretation: 'governed quantitative interpretation of downside risk',
    default_illegal_interpretation: 'final avoid signal or guaranteed loss prediction',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.TIMING_QUALITY,
    measures:
      'whether the setup is early, validated, crowded, late, decaying, or digesting under L9 sequence posture',
    does_not_measure: 'perfect entry timing or trade-ready confirmation',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_BETTER,
    default_legal_interpretation: 'governed quantitative interpretation of timing quality',
    default_illegal_interpretation: 'entry-ready confirmation or perfect timing claim',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.THESIS_COHERENCE,
    measures: 'coherence of the L10 hypothesis stack under governed evidence and posture',
    does_not_measure: 'thesis confirmation or winning thesis selection',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_BETTER,
    default_legal_interpretation: 'governed quantitative interpretation of thesis coherence',
    default_illegal_interpretation: 'final thesis selection or confirmation',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.SIGNAL_STACK_RELIABILITY,
    measures: 'reliability of the underlying signal stack',
    does_not_measure: 'bullishness, bearishness, or trade signal',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_BETTER,
    default_legal_interpretation: 'governed quantitative interpretation of signal stack reliability',
    default_illegal_interpretation: 'directional bullish/bearish signal',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.MARKET_STRUCTURE_QUALITY,
    measures: 'cleanliness of market microstructure under governed evidence',
    does_not_measure: 'a buy signal or trade action',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_BETTER,
    default_legal_interpretation: 'governed quantitative interpretation of market structure quality',
    default_illegal_interpretation: 'final action recommendation',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.WHALE_BEHAVIOR_INTERPRETATION,
    measures: 'how convincing whale behavior is under governed evidence',
    does_not_measure: 'a buy signal, sell signal, or a final judgment',
    default_direction: L11ScoreDirectionClass.HIGHER_MEANS_MORE_INTENSE,
    default_legal_interpretation: 'governed quantitative interpretation of whale behavior strength',
    default_illegal_interpretation: 'directional trade signal',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.SUPPLY_OVERHANG_RISK,
    measures: 'severity of supply overhang risk from unlocks and emissions',
    does_not_measure: 'a sell signal or guaranteed dilution loss',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_WORSE,
    default_legal_interpretation: 'governed quantitative interpretation of supply overhang risk',
    default_illegal_interpretation: 'sell signal or guaranteed loss prediction',
  },
  {
    meaning_class: L11ScoreMeaningClaimClass.TRUSTWORTHINESS_OF_SIGNAL,
    measures: 'trustworthiness of the aggregated signal under governed restrictions',
    does_not_measure: 'a final recommendation or guaranteed action',
    default_direction: L11ScoreDirectionClass.HIGHER_IS_BETTER,
    default_legal_interpretation: 'governed quantitative interpretation of signal trustworthiness',
    default_illegal_interpretation: 'final recommendation or guaranteed action',
  },
];

/**
 * §11.1.10.1 — Validate a meaning claim is fully populated.
 */
export function isValidL11MeaningClaim(
  claim: L11ScoreMeaningClaim | null | undefined,
): boolean {
  if (!claim) return false;
  if (!ALL_L11_SCORE_MEANING_CLAIM_CLASSES.includes(claim.meaning_class)) return false;
  if (!claim.measures || claim.measures.length === 0) return false;
  if (!claim.does_not_measure || claim.does_not_measure.length === 0) return false;
  if (!Array.isArray(claim.intended_consumers) || claim.intended_consumers.length === 0)
    return false;
  if (!claim.calibration_target_category || claim.calibration_target_category.length === 0)
    return false;
  if (
    !Array.isArray(claim.required_attribution_surfaces) ||
    claim.required_attribution_surfaces.length === 0
  )
    return false;
  if (!claim.legal_interpretation || claim.legal_interpretation.length === 0) return false;
  if (!claim.illegal_interpretation || claim.illegal_interpretation.length === 0)
    return false;
  return true;
}

/**
 * §11.1.10.2 / §11.1.10.3 — Validate a direction declaration. A score
 * with `mixed_direction === true` (or where the intended class is
 * indeterminate) is illegal.
 */
export function isValidL11DirectionDeclaration(
  decl: L11ScoreDirectionDeclaration | null | undefined,
): boolean {
  if (!decl) return false;
  if (decl.mixed_direction !== false) return false;
  if (!ALL_L11_SCORE_DIRECTION_CLASSES.includes(decl.direction_class)) return false;
  if (!decl.higher_means || decl.higher_means.length === 0) return false;
  if (!decl.lower_means || decl.lower_means.length === 0) return false;
  return true;
}

/**
 * §11.1.10.3 — Direction-mixing detection. A description that promises
 * "higher = better" and "higher = worse" simultaneously inside one
 * score is illegal.
 */
export function detectL11DirectionMixing(description: string): boolean {
  const lower = description.toLowerCase();
  const claimsBetter =
    lower.includes('higher is better') ||
    lower.includes('higher = better') ||
    lower.includes('higher means better');
  const claimsWorse =
    lower.includes('higher is worse') ||
    lower.includes('higher = worse') ||
    lower.includes('higher means worse');
  return claimsBetter && claimsWorse;
}

/**
 * §11.1.11.3 — Restriction-profile validity. A score may not grant
 * downstream usage rights broader than its attribution, missing-data,
 * lower-layer restrictions, calibration maturity, or drift state.
 */
export function isValidL11RestrictionProfile(
  profile: L11ScoreRestrictionProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (!profile.final_recommendation_blocked) return false;
  if (!profile.requires_attribution_disclosure) return false;
  if (!profile.requires_missing_data_disclosure) return false;
  if (!profile.bounded_by_lower_layer_restrictions) return false;
  if (!profile.flags.includes(L11ScoreRestrictionFlag.FINAL_RECOMMENDATION_BLOCKED))
    return false;
  if (!profile.flags.includes(L11ScoreRestrictionFlag.REQUIRES_ATTRIBUTION_DISCLOSURE))
    return false;
  if (!profile.flags.includes(L11ScoreRestrictionFlag.REQUIRES_MISSING_DATA_DISCLOSURE))
    return false;
  return true;
}

export function getL11DefaultMeaningClaimForClass(
  cls: L11ScoreMeaningClaimClass,
): L11ScoreMeaningClaim {
  const entry = L11_DEFAULT_MEANING_CLAIM_CATALOGUE.find(e => e.meaning_class === cls);
  if (!entry) {
    throw new Error(`No default meaning claim for ${cls}`);
  }
  return {
    meaning_class: entry.meaning_class,
    measures: entry.measures,
    does_not_measure: entry.does_not_measure,
    intended_consumers: ['L12_SCENARIO_WEIGHTING', 'L13_JUDGMENT_SUPPORT'],
    calibration_target_category: 'governed_empirical_evaluation',
    required_attribution_surfaces: ['l11:score_attribution'],
    legal_interpretation: entry.default_legal_interpretation,
    illegal_interpretation: entry.default_illegal_interpretation,
  };
}

export function getL11DefaultDirectionForClass(
  cls: L11ScoreMeaningClaimClass,
): L11ScoreDirectionDeclaration {
  const entry = L11_DEFAULT_MEANING_CLAIM_CATALOGUE.find(e => e.meaning_class === cls);
  if (!entry) {
    throw new Error(`No default direction for ${cls}`);
  }
  const dir = entry.default_direction;
  return {
    direction_class: dir,
    higher_means:
      dir === L11ScoreDirectionClass.HIGHER_IS_BETTER
        ? 'better'
        : dir === L11ScoreDirectionClass.HIGHER_IS_WORSE
          ? 'worse'
          : dir === L11ScoreDirectionClass.HIGHER_MEANS_MORE_INTENSE
            ? 'more intense'
            : 'more uncertain',
    lower_means:
      dir === L11ScoreDirectionClass.HIGHER_IS_BETTER
        ? 'less attractive'
        : dir === L11ScoreDirectionClass.HIGHER_IS_WORSE
          ? 'less dangerous'
          : dir === L11ScoreDirectionClass.HIGHER_MEANS_MORE_INTENSE
            ? 'less intense'
            : 'less uncertain',
    mixed_direction: false,
  };
}

export function getL11DefaultRestrictionProfile(): L11ScoreRestrictionProfile {
  return {
    flags: [
      L11ScoreRestrictionFlag.SCENARIO_WEIGHTING_ALLOWED,
      L11ScoreRestrictionFlag.RANKING_SUPPORT_ALLOWED,
      L11ScoreRestrictionFlag.JUDGMENT_SUPPORT_ALLOWED,
      L11ScoreRestrictionFlag.FINAL_RECOMMENDATION_BLOCKED,
      L11ScoreRestrictionFlag.REQUIRES_ATTRIBUTION_DISCLOSURE,
      L11ScoreRestrictionFlag.REQUIRES_MISSING_DATA_DISCLOSURE,
    ],
    final_recommendation_blocked: true,
    requires_attribution_disclosure: true,
    requires_missing_data_disclosure: true,
    bounded_by_lower_layer_restrictions: true,
  };
}
