/**
 * L10.7 — Hypothesis Restriction Rights
 *
 * §10.7.5 — Restriction doctrine. Distinct from (and layered above)
 * the L10.2 `L10HypothesisRestrictionProfile`:
 *
 *   - L10.2 declared `L10RestrictionRight` / `L10BlockedUse` at the
 *     object level (explanatory-only rights, blocked uses).
 *   - L10.7 governs the finer grammar of *reliance rights* — whether
 *     the ranked explanation may drive scenario weighting,
 *     deterministic scoring, judgment support, etc., and what
 *     disclosure / additional-confirmation requirements apply — as a
 *     function of the capped band, cap chain, spread class, and
 *     contradiction posture (§10.7.5.4).
 *
 * Together they keep later layers from overusing a primary hypothesis
 * that should only be evidence-grade or scenario-grade (§10.7.1.1).
 *
 * Required rights (§10.7.5.3):
 *   SCENARIO_WEIGHTING_ALLOWED
 *   DETERMINISTIC_SCORING_ALLOWED
 *   JUDGMENT_SUPPORT_ALLOWED
 *   CONTRADICTION_DISCLOSURE_REQUIRED
 *   ADDITIONAL_CONFIRMATION_REQUIRED
 *   EVIDENCE_ONLY
 *   FINAL_JUDGMENT_BLOCKED
 */

import {
  L10HypothesisRelianceConfidenceBand,
} from './hypothesis-confidence.policy';

/**
 * §10.7.5.3 — Canonical reliance rights. Rights are either affirmative
 * (what later layers *may* do) or restrictive (what they *must* do or
 * are *blocked* from doing). The engine emits a set — never a scalar —
 * so downstream consumers can reason about each right independently.
 */
export enum L10HypothesisRestrictionRight {
  /** May weight downstream scenarios using this ranked hypothesis. */
  SCENARIO_WEIGHTING_ALLOWED = 'SCENARIO_WEIGHTING_ALLOWED',
  /** May feed deterministic scoring pipelines. */
  DETERMINISTIC_SCORING_ALLOWED = 'DETERMINISTIC_SCORING_ALLOWED',
  /** May feed judgment-support layers (§10.7.5.5). */
  JUDGMENT_SUPPORT_ALLOWED = 'JUDGMENT_SUPPORT_ALLOWED',
  /** Must disclose contradiction posture when used. */
  CONTRADICTION_DISCLOSURE_REQUIRED = 'CONTRADICTION_DISCLOSURE_REQUIRED',
  /** Must pair with additional confirmation downstream. */
  ADDITIONAL_CONFIRMATION_REQUIRED = 'ADDITIONAL_CONFIRMATION_REQUIRED',
  /** Evidence-grade only; may not drive score. */
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  /** Final-judgment path is blocked. */
  FINAL_JUDGMENT_BLOCKED = 'FINAL_JUDGMENT_BLOCKED',
}

export const ALL_L10_HYPOTHESIS_RESTRICTION_RIGHTS:
  readonly L10HypothesisRestrictionRight[] =
    Object.values(L10HypothesisRestrictionRight);

/**
 * §10.7.5.5 — Rights that directly grant score-driving downstream
 * use. The restriction validator uses this set to detect
 * broader-rights offenses (INV-10.7-D).
 */
export const L10_HYPOTHESIS_SCORE_DRIVING_RIGHTS:
  readonly L10HypothesisRestrictionRight[] = [
    L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  ];

/**
 * §10.7.5.5 — Rights that are *restrictive* (imply narrowing, not
 * granting). Pairing these with score-driving grants rejects
 * (INV-10.7-D / L10REL_RESTR_BROADER_THAN_STATE).
 */
export const L10_HYPOTHESIS_RESTRICTIVE_RIGHTS:
  readonly L10HypothesisRestrictionRight[] = [
    L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
    L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  ];

/**
 * §10.7.5.1 — Full L10.7 restriction profile. Surfaces rights,
 * blocked rights, and narrowing notes beside the band that drove the
 * derivation.
 */
export interface L10HypothesisRestrictionProfileL10_7 {
  readonly hypothesis_subject_id: string;
  /** §10.7.5.4 — band that fed the derivation. */
  readonly driving_band: L10HypothesisRelianceConfidenceBand;
  /** §10.7.5.3 — full rights set (granted). */
  readonly rights: readonly L10HypothesisRestrictionRight[];
  /** §10.7.5.3 — rights explicitly blocked. */
  readonly blocked_rights: readonly L10HypothesisRestrictionRight[];
  /** §10.7.5.4 — narrowing reasons (free-form; typed reasons live on
   *  the cap chain). */
  readonly narrowing_notes: readonly string[];
  /** §10.7.5.4 — lineage refs for replay. */
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  /** §10.7.9.2 — stable hash for replay identity. */
  readonly replay_hash: string;
}

/**
 * §10.7.5.5 — Canonical doctrine: band → default rights mapping.
 * Starting set before spread / contradiction / invalidation
 * narrowing applies (§10.7.5.4).
 */
export const L10_HYPOTHESIS_DEFAULT_RIGHTS_BY_BAND: Readonly<
  Record<
    L10HypothesisRelianceConfidenceBand,
    readonly L10HypothesisRestrictionRight[]
  >
> = {
  [L10HypothesisRelianceConfidenceBand.HIGH]: [
    L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED,
    L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    L10HypothesisRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  ],
  [L10HypothesisRelianceConfidenceBand.MEDIUM]: [
    L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED,
    L10HypothesisRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
  ],
  [L10HypothesisRelianceConfidenceBand.LOW]: [
    L10HypothesisRestrictionRight.SCENARIO_WEIGHTING_ALLOWED,
    L10HypothesisRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
    L10HypothesisRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
  ],
  [L10HypothesisRelianceConfidenceBand.UNRESOLVED]: [
    L10HypothesisRestrictionRight.EVIDENCE_ONLY,
    L10HypothesisRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  ],
};
