/**
 * L12.2 — ScenarioRestrictionProfile (§12.2.15).
 *
 * Every scenario set must carry a restriction profile that mechanically
 * blocks: prediction output, recommendation output, trade action output,
 * final judgment without L13, score replacement, certainty claims, and
 * live output without disclosure.
 */

export enum L12ScenarioAllowedUse {
  SCENARIO_WEIGHTING = 'SCENARIO_WEIGHTING',
  JUDGMENT_SUPPORT_WITH_DISCLOSURE = 'JUDGMENT_SUPPORT_WITH_DISCLOSURE',
  DELIVERY_EXPLANATION = 'DELIVERY_EXPLANATION',
  MONITORING_TRIGGER_GENERATION = 'MONITORING_TRIGGER_GENERATION',
  EVIDENCE_ONLY_DISCLOSURE = 'EVIDENCE_ONLY_DISCLOSURE',
}

export const ALL_L12_SCENARIO_ALLOWED_USES: readonly L12ScenarioAllowedUse[] =
  Object.values(L12ScenarioAllowedUse);

export enum L12ScenarioBlockedUse {
  FINAL_JUDGMENT_WITHOUT_L13 = 'FINAL_JUDGMENT_WITHOUT_L13',
  RECOMMENDATION_OUTPUT = 'RECOMMENDATION_OUTPUT',
  TRADE_ACTION_OUTPUT = 'TRADE_ACTION_OUTPUT',
  SCORE_REPLACEMENT = 'SCORE_REPLACEMENT',
  PREDICTION_OUTPUT = 'PREDICTION_OUTPUT',
  CERTAINTY_CLAIM = 'CERTAINTY_CLAIM',
  LIVE_OUTPUT_WITHOUT_DISCLOSURE = 'LIVE_OUTPUT_WITHOUT_DISCLOSURE',
}

export const ALL_L12_SCENARIO_BLOCKED_USES: readonly L12ScenarioBlockedUse[] =
  Object.values(L12ScenarioBlockedUse);

/** Mandatory blocked uses for every restriction profile. */
export const L12_MANDATORY_BLOCKED_USES: readonly L12ScenarioBlockedUse[] = [
  L12ScenarioBlockedUse.FINAL_JUDGMENT_WITHOUT_L13,
  L12ScenarioBlockedUse.RECOMMENDATION_OUTPUT,
  L12ScenarioBlockedUse.TRADE_ACTION_OUTPUT,
  L12ScenarioBlockedUse.SCORE_REPLACEMENT,
  L12ScenarioBlockedUse.PREDICTION_OUTPUT,
  L12ScenarioBlockedUse.CERTAINTY_CLAIM,
];

export enum L12ScenarioDisclosureRequirement {
  CONDITIONALITY_DISCLOSURE = 'CONDITIONALITY_DISCLOSURE',
  INVALIDATION_DISCLOSURE = 'INVALIDATION_DISCLOSURE',
  ALTERNATIVES_DISCLOSURE = 'ALTERNATIVES_DISCLOSURE',
  CONTRADICTION_DISCLOSURE = 'CONTRADICTION_DISCLOSURE',
  MISSING_VISIBILITY_DISCLOSURE = 'MISSING_VISIBILITY_DISCLOSURE',
  DRIFT_DISCLOSURE = 'DRIFT_DISCLOSURE',
  RESTRICTION_DISCLOSURE = 'RESTRICTION_DISCLOSURE',
}

export const ALL_L12_SCENARIO_DISCLOSURE_REQUIREMENTS: readonly L12ScenarioDisclosureRequirement[] =
  Object.values(L12ScenarioDisclosureRequirement);

export interface L12ScenarioRestrictionProfile {
  readonly restriction_profile_id: string;

  readonly scenario_set_id: string;

  readonly allowed_uses: readonly L12ScenarioAllowedUse[];
  readonly blocked_uses: readonly L12ScenarioBlockedUse[];

  readonly required_disclosures: readonly L12ScenarioDisclosureRequirement[];

  readonly restriction_reason_codes: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
