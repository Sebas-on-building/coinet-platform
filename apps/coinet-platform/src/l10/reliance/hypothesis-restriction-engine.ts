/**
 * L10.7 — Hypothesis Restriction Engine
 *
 * §10.7.5 — Deterministic builder for the L10.7 restriction-rights
 * profile. Starts from the band-default rights (§10.7.5.5) and then
 * applies narrowing in the canonical order:
 *
 *   1. Spread narrowing (NARROW / TIED → require additional
 *      confirmation, tied → also block judgment support).
 *   2. Contradiction narrowing (active → require contradiction
 *      disclosure).
 *   3. Invalidation narrowing (active → evidence-only + final
 *      judgment blocked).
 *   4. Missing-confirmation narrowing (material → require additional
 *      confirmation).
 *   5. Cap-posture narrowing (cap-hint BLOCKED → evidence-only +
 *      final judgment blocked).
 *
 * All transforms narrow, never widen (INV-10.7-D).
 */

import {
  L10HypothesisCapChain,
  L10HypothesisCapReadinessHint,
} from '../contracts/hypothesis-cap-chain';
import {
  L10HypothesisRelianceConfidenceBand,
} from '../contracts/hypothesis-confidence.policy';
import {
  L10HypothesisRestrictionProfileL10_7,
  L10HypothesisRestrictionRight,
  L10_HYPOTHESIS_DEFAULT_RIGHTS_BY_BAND,
} from '../contracts/hypothesis-restriction-rights';
import {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';

export interface L10HypothesisRestrictionEngineInput {
  readonly hypothesis_subject_id: string;
  readonly band: L10HypothesisRelianceConfidenceBand;
  readonly cap_chain: L10HypothesisCapChain;
  readonly spread_class: L10SpreadClass;
  readonly active_contradiction: boolean;
  readonly active_invalidation: boolean;
  readonly material_missing_confirmations: boolean;
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

const GRANTABLE: readonly L10HypothesisRestrictionRight[] = [
  L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED,
  L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
  L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
  L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
  L10HypothesisRestrictionRight.EVIDENCE_ONLY,
  L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
];

function addNote(
  notes: string[],
  reason: string,
  count: { n: number },
): void {
  count.n += 1;
  notes.push(reason);
}

/**
 * §10.7.5 — Deterministic restriction derivation.
 */
export function buildL10HypothesisRestrictionProfile(
  input: L10HypothesisRestrictionEngineInput,
): L10HypothesisRestrictionProfileL10_7 {
  const grants = new Set<L10HypothesisRestrictionRight>(
    L10_HYPOTHESIS_DEFAULT_RIGHTS_BY_BAND[input.band],
  );
  const blocked = new Set<L10HypothesisRestrictionRight>();
  const notes: string[] = [];
  const noteCount = { n: 0 };

  // §10.7.5.5 — tied spread: block judgment support, require
  // additional confirmation, and disclose contradiction (competition
  // alive).
  if (input.spread_class === L10SpreadClass.TIED) {
    if (grants.has(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED)) {
      grants.delete(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
      blocked.add(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    }
    grants.add(L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED);
    grants.add(L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED);
    addNote(notes, 'tied spread narrows downstream use', noteCount);
  }

  // §10.7.5.5 — narrow spread: require additional confirmation, and
  // narrow judgment support.
  if (input.spread_class === L10SpreadClass.NARROW) {
    grants.add(L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED);
    if (grants.has(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED)) {
      grants.delete(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
      blocked.add(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    }
    addNote(notes, 'narrow spread narrows downstream use', noteCount);
  }

  // §10.7.5.5 — active contradiction → contradiction disclosure.
  if (input.active_contradiction) {
    grants.add(L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED);
    addNote(notes, 'active contradiction requires disclosure', noteCount);
  }

  // §10.7.5.5 — active invalidation → evidence-only + final-judgment
  // blocked. Remove all score-driving grants.
  if (input.active_invalidation) {
    grants.delete(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    grants.delete(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    grants.add(L10HypothesisRestrictionRight.EVIDENCE_ONLY);
    grants.add(L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED);
    addNote(notes, 'active invalidation narrows to evidence-only', noteCount);
  }

  // §10.7.5.5 — material missing confirmations → require additional
  // confirmation.
  if (input.material_missing_confirmations) {
    grants.add(L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED);
    addNote(notes, 'material missing confirmations require additional ' +
      'confirmation downstream', noteCount);
  }

  // §10.7.5.5 — BLOCKED cap-hint → evidence-only + final-judgment
  // blocked.
  if (input.cap_chain.readiness_hint === L10HypothesisCapReadinessHint.BLOCKED) {
    grants.delete(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    grants.delete(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    grants.add(L10HypothesisRestrictionRight.EVIDENCE_ONLY);
    grants.add(L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED);
    addNote(notes, 'cap chain reports BLOCKED readiness', noteCount);
  }

  // §10.7.5.5 — UNRESOLVED band: always add final-judgment blocked
  // even if default rights already mentioned it.
  if (input.band === L10HypothesisRelianceConfidenceBand.UNRESOLVED) {
    grants.delete(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    grants.delete(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    grants.delete(L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    grants.add(L10HypothesisRestrictionRight.EVIDENCE_ONLY);
    grants.add(L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED);
    addNote(notes, 'UNRESOLVED band narrows to evidence-only', noteCount);
  }

  // §10.7.5.5 — when final-judgment is blocked, judgment-support is
  // never granted.
  if (grants.has(L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED)) {
    if (grants.has(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED)) {
      grants.delete(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
      blocked.add(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    }
  }

  // §10.7.5.5 — when evidence-only is granted, strip score-driving
  // rights entirely.
  if (grants.has(L10HypothesisRestrictionRight.EVIDENCE_ONLY)) {
    grants.delete(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    grants.delete(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED);
    blocked.add(L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
  }

  const rights: L10HypothesisRestrictionRight[] = GRANTABLE.filter(r =>
    grants.has(r),
  );
  const blockedArr: L10HypothesisRestrictionRight[] = GRANTABLE.filter(r =>
    blocked.has(r) && !grants.has(r),
  );

  if (noteCount.n === 0) {
    notes.push('no narrowing applied');
  }

  const replayHash =
    `h:l10rr:${input.hypothesis_subject_id}:${input.band}:` +
    `${input.spread_class}:` +
    rights.slice().sort().join(',') + ':' +
    blockedArr.slice().sort().join(',');

  return {
    hypothesis_subject_id: input.hypothesis_subject_id,
    driving_band: input.band,
    rights,
    blocked_rights: blockedArr,
    narrowing_notes: notes,
    lineage_refs: [...input.lineage_refs].sort(),
    policy_version: input.policy_version,
    replay_hash: replayHash,
  };
}
