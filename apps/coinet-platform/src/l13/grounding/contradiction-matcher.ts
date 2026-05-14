/**
 * L13.4 — Contradiction Matcher
 *
 * §13.4.10 — Checks each claim against the input package's
 * contradiction summary, hypothesis contradictions, score drift
 * / missing-data, scenario invalidations, confidence caps, and
 * unresolved triggers. Contradiction dominates evidence match.
 */

import type { L13AIInputPackage } from '../contracts/ai-input-package';
import type { L13ExtractedClaim } from '../contracts/claim-extraction';
import {
  L13ClaimContradictionEffect,
  L13ContradictionMatchReasonCode,
  type L13ContradictionMatch,
} from '../contracts/contradiction-match';
import { L13ClaimType } from '../contracts/grounded-claim';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.grounding.v1';

const CONTRADICTION_PRESSURE_BLOCK_THRESHOLD = 0.8;

/**
 * §13.4.10 — Evaluate contradiction effect for one claim.
 */
export function matchL13Contradiction(
  claim: L13ExtractedClaim,
  pkg: L13AIInputPackage,
): L13ContradictionMatch {
  const matchedRefs = new Set<string>();
  const reasons = new Set<L13ContradictionMatchReasonCode>();
  let blocks = false;
  let narrows = false;
  let disclose = false;
  let requiresRewrite = false;

  const contra = pkg.contradiction_summary;
  const scenario = pkg.scenario_summary;
  const hypothesis = pkg.hypothesis_summary;
  const score = pkg.score_summary;
  const uncertainty = pkg.uncertainty_profile;

  // L13.2 doctrine: rely on `uncertainty_profile` active flags as the
  // source of truth for whether a lower-layer adverse condition is
  // actually engaging the AI output (§13.2 INV-A fix history).
  // Mere presence of refs in summaries means the *availability* of
  // the surface, not its activation.

  // §13.4.10 — Active contradictions from L7.
  if (
    uncertainty?.active_contradiction_present === true &&
    contra &&
    contra.active_contradiction_refs.length > 0
  ) {
    for (const r of contra.active_contradiction_refs) matchedRefs.add(r);
    reasons.add(
      L13ContradictionMatchReasonCode.ACTIVE_CONTRADICTION_PRESENT,
    );
    disclose = true;
    if (
      contra.contradiction_pressure_score >=
      CONTRADICTION_PRESSURE_BLOCK_THRESHOLD
    ) {
      reasons.add(
        L13ContradictionMatchReasonCode.CLAIM_REJECTED_BY_CONTRADICTION_PRESSURE,
      );
      if (
        claim.detected_claim_type === L13ClaimType.OBSERVATION ||
        claim.detected_claim_type === L13ClaimType.INFERENCE ||
        claim.detected_claim_type === L13ClaimType.SCENARIO_STATEMENT ||
        claim.detected_claim_type === L13ClaimType.SCORE_STATEMENT
      ) {
        blocks = true;
      }
    } else {
      narrows = true;
    }
  }

  // §13.4.10 — Scenario invalidations (only when active).
  if (
    uncertainty?.active_invalidation_present === true &&
    scenario &&
    scenario.invalidation_refs.length > 0
  ) {
    for (const r of scenario.invalidation_refs) matchedRefs.add(r);
    reasons.add(
      L13ContradictionMatchReasonCode.ACTIVE_INVALIDATION_PRESENT,
    );
    narrows = true;
    disclose = true;
    if (claim.detected_claim_type === L13ClaimType.SCENARIO_STATEMENT) {
      requiresRewrite = true;
    }
  }

  // §13.4.10 — Hypothesis contradictions only narrow when the
  // uncertainty profile reports active contradiction OR narrow
  // spread.
  if (
    (uncertainty?.active_contradiction_present === true ||
      uncertainty?.narrow_spread_present === true) &&
    hypothesis &&
    hypothesis.contradiction_refs.length > 0
  ) {
    for (const r of hypothesis.contradiction_refs) matchedRefs.add(r);
    reasons.add(
      L13ContradictionMatchReasonCode.HYPOTHESIS_CONTRADICTION_PRESENT,
    );
    if (claim.detected_claim_type === L13ClaimType.HYPOTHESIS_STATEMENT) {
      narrows = true;
      disclose = true;
    }
  }

  // §13.4.10 — Score drift only narrows when material drift is
  // present.
  if (
    uncertainty?.material_drift_present === true &&
    score &&
    score.score_drift_refs.length > 0
  ) {
    for (const r of score.score_drift_refs) matchedRefs.add(r);
    reasons.add(L13ContradictionMatchReasonCode.SCORE_DRIFT_PRESENT);
    if (claim.detected_claim_type === L13ClaimType.SCORE_STATEMENT) {
      narrows = true;
      disclose = true;
    }
  }

  // §13.4.10 — Missing data only narrows when uncertainty profile
  // signals material missing data.
  if (
    uncertainty?.material_missing_data_present === true &&
    score &&
    score.score_missing_data_profile_refs.length > 0
  ) {
    reasons.add(L13ContradictionMatchReasonCode.MISSING_DATA_PRESENT);
    if (
      claim.detected_claim_type === L13ClaimType.SCORE_STATEMENT ||
      claim.detected_claim_type === L13ClaimType.SCENARIO_STATEMENT
    ) {
      narrows = true;
      disclose = true;
    }
  }

  // §13.4.10 — Unresolved trigger.
  if (uncertainty?.unresolved_trigger_present === true) {
    reasons.add(L13ContradictionMatchReasonCode.UNRESOLVED_TRIGGER_PRESENT);
    if (claim.detected_claim_type === L13ClaimType.SCENARIO_STATEMENT) {
      narrows = true;
      disclose = true;
    }
  }

  // Default.
  if (matchedRefs.size === 0 && reasons.size === 0) {
    reasons.add(L13ContradictionMatchReasonCode.NO_CONTRADICTION_PRESENT);
  }

  let effect: L13ClaimContradictionEffect;
  if (blocks) {
    effect = L13ClaimContradictionEffect.BLOCKS_CLAIM;
  } else if (narrows) {
    effect = L13ClaimContradictionEffect.NARROWS_CLAIM;
  } else if (disclose) {
    effect = L13ClaimContradictionEffect.DISCLOSURE_REQUIRED;
  } else {
    effect = L13ClaimContradictionEffect.NO_CONTRADICTION;
  }

  return {
    contradiction_match_id: `l13.cmatch.${fnv1a(
      [
        claim.extracted_claim_id,
        effect,
        [...matchedRefs].sort().join(','),
        POLICY_V,
      ].join('|'),
    )}`,
    claim_ref: claim.extracted_claim_id,
    matched_contradiction_refs: [...matchedRefs].sort(),
    contradiction_effect: effect,
    contradiction_reason_codes: [...reasons].sort(),
    blocks_claim: blocks,
    requires_uncertainty: narrows || disclose,
    requires_rewrite: requiresRewrite,
    policy_version: POLICY_V,
  };
}

export function matchL13ContradictionForClaims(
  claims: readonly L13ExtractedClaim[],
  pkg: L13AIInputPackage,
): readonly L13ContradictionMatch[] {
  return claims.map(c => matchL13Contradiction(c, pkg));
}
