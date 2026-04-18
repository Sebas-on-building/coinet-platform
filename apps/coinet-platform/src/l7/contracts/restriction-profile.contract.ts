/**
 * L7.3 — Restriction Profile Contract
 *
 * §7.3.6 — The full executable, versioned restriction-profile contract.
 * Extends the L7.2 object-level `L7ClaimRestrictionProfile` with contract
 * versioning and consistency-with-validation-state requirements.
 */

import type { L7ConfidenceBand } from './confidence-assessment';
import type { L7ContradictionSeverity } from './contradiction-bundle';
import type { L7ValidationClass } from './validation-output-class';
import { L7RestrictionRight } from './claim-restriction-profile';
import type { L7RestrictionReasonCode } from './claim-restriction-profile';

// Note: L7RestrictionRight / L7RestrictionReasonCode are intentionally not
// re-exported here. Consumers import them directly from L7.2's
// `claim-restriction-profile` to keep the barrel free of duplicate
// `export *` collisions.

export interface L7ClaimRestrictionProfileContract {
  // Identity
  readonly restriction_profile_id: string;
  readonly validation_subject_id: string;

  // Contract versioning
  readonly restriction_contract_version: string;
  readonly schema_version: string;

  // Rights (§7.3.6.2)
  readonly downstream_use_rights: readonly L7RestrictionRight[];
  readonly requires_contradiction_disclosure: boolean;
  readonly requires_additional_confirmation: boolean;
  readonly allowed_for_regime_input: boolean;
  readonly allowed_for_scenario_weighting: boolean;
  readonly allowed_for_deterministic_scoring: boolean;
  readonly allowed_for_final_judgment: boolean;
  readonly evidence_only_mode: boolean;

  // Reasons (§7.3.6.2)
  readonly restriction_reasons: readonly L7RestrictionReasonCode[];

  // Lineage
  readonly lineage_refs: { readonly trace_id: string; readonly manifest_id: string };
  readonly compute_run_id: string;
  readonly replay_hash: string;
}

export const L7_RESTRICTION_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'restriction_profile_id', 'validation_subject_id',
  'restriction_contract_version', 'schema_version',
  'downstream_use_rights', 'restriction_reasons',
  'lineage_refs', 'compute_run_id', 'replay_hash',
];

/**
 * §7.3.6.4 — A restriction profile must be consistent with the validation
 * state it is paired with. This is what makes the profile *legal* in
 * combination with a verdict, not merely well-formed in isolation.
 */
export interface L7RestrictionConsistencyContext {
  readonly validation_class: L7ValidationClass;
  readonly confidence_band: L7ConfidenceBand;
  readonly highest_contradiction_severity: L7ContradictionSeverity | null;
  readonly staleness_material: boolean;
  readonly incompleteness_material: boolean;
}

const HIGH_RIGHTS = new Set<L7RestrictionRight>([
  L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT,
  L7RestrictionRight.USABLE_FOR_DETERMINISTIC_SCORING,
]);

const SEVERITY_ORDER_LOCAL: Record<string, number> = {
  INFO: 0, MINOR: 1, MATERIAL: 2, SEVERE: 3, BLOCKING: 4,
};

/**
 * §7.3.6.3 — A low-confidence or conflicting validation may not be granted
 * overly broad downstream rights without explicit law. This helper
 * implements the default consistency law.
 */
export function restrictionIsConsistentWithState(
  p: Pick<
    L7ClaimRestrictionProfileContract,
    | 'downstream_use_rights'
    | 'requires_contradiction_disclosure'
    | 'requires_additional_confirmation'
    | 'evidence_only_mode'
  >,
  ctx: L7RestrictionConsistencyContext,
): boolean {
  const grantsHigh = p.downstream_use_rights.some(r => HIGH_RIGHTS.has(r));

  // Conflicting verdict can never grant final-judgment without disclosure.
  if (ctx.validation_class === 'CONFLICTING') {
    if (grantsHigh && !p.requires_contradiction_disclosure) return false;
  }

  // Insufficient/Stale/Degraded/Ambiguous: must require additional confirmation
  // if granting high downstream rights.
  if (
    (ctx.validation_class === 'INSUFFICIENT' ||
      ctx.validation_class === 'STALE' ||
      ctx.validation_class === 'AMBIGUOUS' ||
      ctx.validation_class === 'DEGRADED') &&
    grantsHigh &&
    !p.requires_additional_confirmation
  ) {
    return false;
  }

  // Below MODERATE confidence may not grant USABLE_FOR_FINAL_JUDGMENT.
  if (
    p.downstream_use_rights.includes(L7RestrictionRight.USABLE_FOR_FINAL_JUDGMENT) &&
    (ctx.confidence_band === 'VERY_LOW' || ctx.confidence_band === 'LOW')
  ) {
    return false;
  }

  // SEVERE/BLOCKING contradiction must trigger contradiction-disclosure.
  if (ctx.highest_contradiction_severity) {
    const sevRank = SEVERITY_ORDER_LOCAL[ctx.highest_contradiction_severity] ?? 0;
    if (sevRank >= SEVERITY_ORDER_LOCAL.SEVERE && !p.requires_contradiction_disclosure) {
      return false;
    }
  }

  // Material staleness must downgrade to evidence-only OR set additional-confirmation.
  if (ctx.staleness_material && grantsHigh && !p.requires_additional_confirmation && !p.evidence_only_mode) {
    return false;
  }

  // Material incompleteness must require additional confirmation if any high right is granted.
  if (ctx.incompleteness_material && grantsHigh && !p.requires_additional_confirmation) {
    return false;
  }

  return true;
}
