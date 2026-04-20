/**
 * L9.7 — Sequence Restriction Rights
 *
 * §9.7.6 — Restriction doctrine. Distinct from (and layered above)
 * the L9.2 `L9SequenceRestrictionProfile`:
 *
 *   - L9.2 declared `L9AllowedDownstreamUse` (scenario/judgment/
 *     risk/audit) at the object level.
 *   - L9.7 governs *rights and requirements* on those uses with a
 *     finer grammar (disclosure-required, evidence-only, final-
 *     judgment-blocked, etc.) derived from band, cap chain, and
 *     causal-restraint posture.
 *
 * Together they keep later layers from overusing sequence outputs
 * that should only be evidence-grade or scenario-grade (§9.7.1.1).
 */

import {
  L9RelianceConfidenceBand,
} from './l9_7-sequence-confidence-policy';

/**
 * §9.7.6.3 — Canonical restriction rights. Rights are either
 * affirmative (what later layers *may* do) or restrictive (what they
 * *must* do or are *blocked* from doing). The engine emits a set —
 * never a scalar — so downstream consumers can reason about each
 * right independently.
 */
export enum L9SequenceRestrictionRight {
  /** May weight downstream scenarios using this sequence. */
  SCENARIO_WEIGHTING_ALLOWED = 'SCENARIO_WEIGHTING_ALLOWED',
  /** May feed deterministic scoring pipelines. */
  DETERMINISTIC_SCORING_ALLOWED = 'DETERMINISTIC_SCORING_ALLOWED',
  /** May feed judgment-support layers (§9.7.6.5). */
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

export const ALL_L9_SEQUENCE_RESTRICTION_RIGHTS:
  readonly L9SequenceRestrictionRight[] =
    Object.values(L9SequenceRestrictionRight);

/**
 * §9.7.6.5 — Rights that directly grant score-driving downstream use.
 * Used by the restriction validator to detect broader-rights offenses
 * (INV-9.7-D).
 */
export const L9_SEQUENCE_SCORE_DRIVING_RIGHTS:
  readonly L9SequenceRestrictionRight[] = [
    L9SequenceRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  ];

/**
 * §9.7.6.5 — Rights that are *restrictive* (imply narrowing, not
 * granting). Pairing these with score-driving grants rejects
 * (INV-9.7-D / L9REL_RESTR_BROADER_THAN_STATE).
 */
export const L9_SEQUENCE_RESTRICTIVE_RIGHTS:
  readonly L9SequenceRestrictionRight[] = [
    L9SequenceRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
    L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
    L9SequenceRestrictionRight.EVIDENCE_ONLY,
    L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  ];

/**
 * §9.7.6.1 — Full L9.7 restriction profile.
 */
export interface L9SequenceRestrictionProfileL9_7 {
  readonly sequence_subject_id: string;
  /** §9.7.6.4 — band that fed the derivation. */
  readonly driving_band: L9RelianceConfidenceBand;
  /** §9.7.6.3 — full rights set. */
  readonly rights: readonly L9SequenceRestrictionRight[];
  /** §9.7.6.3 — rights explicitly blocked (subset of requestable rights). */
  readonly blocked_rights: readonly L9SequenceRestrictionRight[];
  /** §9.7.6.4 — narrowing reasons (free-form strings; typed reasons
   *  live on the cap chain). */
  readonly narrowing_notes: readonly string[];
  /** §9.7.6.4 — lineage refs for replay. */
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
  /** §9.7.10.3 — stable hash for replay identity. */
  readonly replay_hash: string;
}

/**
 * §9.7.6.5 — Canonical doctrine band → default rights mapping used by
 * the restriction engine as the *starting* set before contradiction
 * disclosure and causal-restraint narrowing apply (§9.7.6.4).
 */
export const L9_SEQUENCE_DEFAULT_RIGHTS_BY_BAND: Readonly<
  Record<L9RelianceConfidenceBand, readonly L9SequenceRestrictionRight[]>
> = {
  [L9RelianceConfidenceBand.HIGH]: [
    L9SequenceRestrictionRight.SCENARIO_WEIGHTING_ALLOWED,
    L9SequenceRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED,
  ],
  [L9RelianceConfidenceBand.MEDIUM]: [
    L9SequenceRestrictionRight.SCENARIO_WEIGHTING_ALLOWED,
    L9SequenceRestrictionRight.DETERMINISTIC_SCORING_ALLOWED,
    L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
  ],
  [L9RelianceConfidenceBand.LOW]: [
    L9SequenceRestrictionRight.SCENARIO_WEIGHTING_ALLOWED,
    L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED,
    L9SequenceRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED,
  ],
  [L9RelianceConfidenceBand.UNRESOLVED]: [
    L9SequenceRestrictionRight.EVIDENCE_ONLY,
    L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED,
  ],
};
