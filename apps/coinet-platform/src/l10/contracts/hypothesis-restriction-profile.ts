/**
 * L10.2 — HypothesisRestrictionProfile Contract
 *
 * §10.2.16 — Defines how later layers may use the explanatory result.
 * L10 may never emit unrestricted explanatory truth by default.
 */

import { fnv1aHexL10 } from './hypothesis-subject';

export enum L10RestrictionRight {
  MAY_USE_FOR_MONITORING = 'MAY_USE_FOR_MONITORING',
  MAY_USE_FOR_EXPLANATORY_CONTEXT = 'MAY_USE_FOR_EXPLANATORY_CONTEXT',
  MAY_USE_FOR_SHIFT_DETECTION = 'MAY_USE_FOR_SHIFT_DETECTION',
  MAY_USE_FOR_EVIDENCE_DISPLAY = 'MAY_USE_FOR_EVIDENCE_DISPLAY',
  MAY_USE_FOR_RESEARCH = 'MAY_USE_FOR_RESEARCH',
  MAY_USE_FOR_ATTRIBUTION_ONLY = 'MAY_USE_FOR_ATTRIBUTION_ONLY',
}

export const ALL_L10_RESTRICTION_RIGHTS: readonly L10RestrictionRight[] =
  Object.values(L10RestrictionRight);

export enum L10BlockedUse {
  MAY_NOT_BE_USED_AS_JUDGMENT = 'MAY_NOT_BE_USED_AS_JUDGMENT',
  MAY_NOT_BE_USED_AS_RECOMMENDATION = 'MAY_NOT_BE_USED_AS_RECOMMENDATION',
  MAY_NOT_BE_USED_AS_FINAL_SCENARIO = 'MAY_NOT_BE_USED_AS_FINAL_SCENARIO',
  MAY_NOT_BE_USED_AS_CAUSAL_PROOF = 'MAY_NOT_BE_USED_AS_CAUSAL_PROOF',
  MAY_NOT_BE_SURFACED_WITHOUT_COMPETITION = 'MAY_NOT_BE_SURFACED_WITHOUT_COMPETITION',
  MAY_NOT_BE_SURFACED_WITHOUT_SPREAD = 'MAY_NOT_BE_SURFACED_WITHOUT_SPREAD',
  MAY_NOT_BE_SURFACED_WITHOUT_SHIFT_CONDITIONS = 'MAY_NOT_BE_SURFACED_WITHOUT_SHIFT_CONDITIONS',
}

export const ALL_L10_BLOCKED_USES: readonly L10BlockedUse[] =
  Object.values(L10BlockedUse);

export enum L10RelianceBand {
  NARROW = 'NARROW',
  STANDARD = 'STANDARD',
  BROADENED = 'BROADENED',
  RESTRICTED = 'RESTRICTED',
}

export const ALL_L10_RELIANCE_BANDS: readonly L10RelianceBand[] =
  Object.values(L10RelianceBand);

export interface L10HypothesisRestrictionProfile {
  readonly hypothesis_restriction_profile_id: string;
  readonly hypothesis_subject_id: string;
  readonly as_of: string;

  readonly reliance_band: L10RelianceBand;
  readonly allowed_downstream_uses: readonly L10RestrictionRight[];
  readonly blocked_uses: readonly L10BlockedUse[];
  readonly required_disclosures: readonly string[];
  readonly narrowing_reasons: readonly string[];

  readonly lineage_refs: readonly string[];
}

export function buildL10RestrictionProfileId(
  hypothesis_subject_id: string,
  as_of: string,
): string {
  return `hrest_${fnv1aHexL10(hypothesis_subject_id)}_${fnv1aHexL10(as_of)}`;
}

/**
 * §10.2.16.4 — Blocked uses are mandatory baseline: no L10 restriction
 * profile may be emitted without them.
 */
export const L10_MANDATORY_BLOCKED_USES: readonly L10BlockedUse[] = [
  L10BlockedUse.MAY_NOT_BE_USED_AS_JUDGMENT,
  L10BlockedUse.MAY_NOT_BE_USED_AS_RECOMMENDATION,
  L10BlockedUse.MAY_NOT_BE_USED_AS_FINAL_SCENARIO,
  L10BlockedUse.MAY_NOT_BE_USED_AS_CAUSAL_PROOF,
];
