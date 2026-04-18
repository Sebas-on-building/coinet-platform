/**
 * L7.2 — Claim Restriction Profile Contract
 *
 * §7.2.6.4 + §7.2.7.5 — A ClaimRestrictionProfile declares how later
 * layers may use the result of a validation. Rights are typed, never
 * free-text, and every non-default right must have a reason code.
 */

export enum L7RestrictionRight {
  USABLE_FOR_REGIME_INPUT = 'USABLE_FOR_REGIME_INPUT',
  USABLE_FOR_SCENARIO_WEIGHTING = 'USABLE_FOR_SCENARIO_WEIGHTING',
  USABLE_FOR_DETERMINISTIC_SCORING = 'USABLE_FOR_DETERMINISTIC_SCORING',
  USABLE_FOR_FINAL_JUDGMENT = 'USABLE_FOR_FINAL_JUDGMENT',
  USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY = 'USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY',
  REQUIRES_ADDITIONAL_CONFIRMATION = 'REQUIRES_ADDITIONAL_CONFIRMATION',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  NOT_USABLE = 'NOT_USABLE',
}

export const ALL_RESTRICTION_RIGHTS: readonly L7RestrictionRight[] =
  Object.values(L7RestrictionRight);

export enum L7RestrictionReasonCode {
  CONFIRMED_NO_RISK = 'CONFIRMED_NO_RISK',
  WEAK_SUPPORT = 'WEAK_SUPPORT',
  UNRESOLVED_CONTRADICTION = 'UNRESOLVED_CONTRADICTION',
  STALE_SUPPORT = 'STALE_SUPPORT',
  MISSING_REQUIRED_SUPPORT = 'MISSING_REQUIRED_SUPPORT',
  AMBIGUOUS_DIRECTION = 'AMBIGUOUS_DIRECTION',
  DEGRADED_SOURCE = 'DEGRADED_SOURCE',
  MATERIAL_RISK_OVERHANG = 'MATERIAL_RISK_OVERHANG',
  REGIME_INCOMPATIBILITY = 'REGIME_INCOMPATIBILITY',
  EVIDENCE_ONLY_REQUIRED = 'EVIDENCE_ONLY_REQUIRED',
}

export const ALL_RESTRICTION_REASON_CODES: readonly L7RestrictionReasonCode[] =
  Object.values(L7RestrictionReasonCode);

export interface L7ClaimRestrictionProfile {
  readonly restriction_profile_id: string;
  readonly validation_subject_id: string;

  readonly downstream_use_rights: readonly L7RestrictionRight[];
  readonly requires_contradiction_disclosure: boolean;
  readonly requires_additional_confirmation: boolean;
  readonly allowed_for_regime_input: boolean;
  readonly allowed_for_scenario_weighting: boolean;
  readonly allowed_for_deterministic_scoring: boolean;
  readonly allowed_for_final_judgment: boolean;
  readonly evidence_only_mode: boolean;

  readonly restriction_reasons: readonly L7RestrictionReasonCode[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
  };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

function fnv1aHex(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function buildRestrictionProfileId(
  validation_subject_id: string,
  compute_run_id: string,
): string {
  return `rp_${fnv1aHex(`${validation_subject_id}|${compute_run_id}`)}`;
}

/**
 * Internal consistency between boolean flags and the typed right list.
 * If the right vocabulary and the boolean flags disagree, the profile is
 * inconsistent and must be rejected (§7.2.6.5 restriction validator).
 */
export function rightsAreInternallyConsistent(p: L7ClaimRestrictionProfile): boolean {
  const hasRight = (r: L7RestrictionRight) => p.downstream_use_rights.includes(r);

  if (hasRight(L7RestrictionRight.USABLE_FOR_REGIME_INPUT) !== p.allowed_for_regime_input) return false;
  if (hasRight(L7RestrictionRight.USABLE_FOR_SCENARIO_WEIGHTING) !== p.allowed_for_scenario_weighting) return false;
  if (hasRight(L7RestrictionRight.USABLE_FOR_DETERMINISTIC_SCORING) !== p.allowed_for_deterministic_scoring) return false;
  if (hasRight(L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT) !== p.allowed_for_final_judgment) return false;
  if (hasRight(L7RestrictionRight.EVIDENCE_ONLY) !== p.evidence_only_mode) return false;
  if (hasRight(L7RestrictionRight.REQUIRES_ADDITIONAL_CONFIRMATION) !== p.requires_additional_confirmation) return false;
  if (hasRight(L7RestrictionRight.USABLE_WITH_CONTRADICTION_DISCLOSURE_ONLY) !== p.requires_contradiction_disclosure) return false;

  if (p.evidence_only_mode && (p.allowed_for_final_judgment || p.allowed_for_deterministic_scoring)) return false;
  if (hasRight(L7RestrictionRight.NOT_USABLE) && p.downstream_use_rights.length > 1) return false;

  return true;
}
