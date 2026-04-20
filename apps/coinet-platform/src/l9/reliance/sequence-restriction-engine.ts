/**
 * L9.7 — Sequence Restriction Engine
 *
 * §9.7.6 — Deterministic builder for `L9SequenceRestrictionProfileL9_7`.
 * Takes the capped band, cap-chain posture, contradiction presence,
 * and causal-restraint class, then derives the rights set according
 * to canonical doctrine (§9.7.6.5). The output is consistent with
 * `validateL9SequenceRestrictionProfile` by construction — the engine
 * and validator both live under §9.7.6.
 */

import {
  L9RelianceConfidenceBand,
} from '../contracts/l9_7-sequence-confidence-policy';
import {
  L9SequenceCapChain,
} from '../contracts/l9_7-sequence-cap-chain';
import {
  L9SequenceCausalRestraintClass,
} from '../contracts/l9_7-sequence-causal-restraint';
import {
  L9SequenceRestrictionProfileL9_7,
  L9SequenceRestrictionRight,
  L9_SEQUENCE_DEFAULT_RIGHTS_BY_BAND,
  L9_SEQUENCE_SCORE_DRIVING_RIGHTS,
} from '../contracts/l9_7-sequence-restriction-rights';

export interface L9SequenceRestrictionEngineInput {
  readonly sequence_subject_id: string;
  readonly driving_band: L9RelianceConfidenceBand;
  readonly cap_chain: L9SequenceCapChain;
  readonly contradiction_present: boolean;
  readonly causal_restraint_class: L9SequenceCausalRestraintClass;
  readonly additional_confirmation_required: boolean;
  readonly narrowing_notes: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export function buildL9SequenceRestrictionProfile(
  input: L9SequenceRestrictionEngineInput,
): L9SequenceRestrictionProfileL9_7 {
  const start = new Set<L9SequenceRestrictionRight>(
    L9_SEQUENCE_DEFAULT_RIGHTS_BY_BAND[input.driving_band],
  );
  const blocked = new Set<L9SequenceRestrictionRight>();

  // §9.7.6.5 — contradiction-disclosure requirement
  if (input.contradiction_present) {
    start.add(L9SequenceRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED);
  }

  // §9.7.6.5 — additional-confirmation override
  if (input.additional_confirmation_required) {
    start.add(L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED);
  }

  // §9.7.7.5 — causal-restraint interaction
  switch (input.causal_restraint_class) {
    case L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE:
      start.add(L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED);
      start.add(L9SequenceRestrictionRight.EVIDENCE_ONLY);
      // score-driving rights become incompatible with EVIDENCE_ONLY;
      // drop them and record as blocked.
      for (const sd of L9_SEQUENCE_SCORE_DRIVING_RIGHTS) {
        if (start.has(sd)) {
          start.delete(sd);
          blocked.add(sd);
        }
      }
      break;
    case L9SequenceCausalRestraintClass.STRICT_RESTRAINT:
      if (start.has(L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED)) {
        start.add(L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED);
      }
      break;
    case L9SequenceCausalRestraintClass.NARROWED_RESTRAINT:
      start.add(L9SequenceRestrictionRight.CONTRADICTION_DISCLOSURE_REQUIRED);
      break;
    case L9SequenceCausalRestraintClass.PROVISIONAL_CAUSAL_HINT:
      // permitted to keep JUDGMENT_SUPPORT_ALLOWED; no extra narrowing.
      break;
  }

  // §9.7.5.5 — heavy cap narrowing forces additional-confirmation
  if (
    input.cap_chain.readiness_hint === 'HEAVILY_NARROWED' ||
    input.cap_chain.readiness_hint === 'BLOCKED'
  ) {
    start.add(L9SequenceRestrictionRight.ADDITIONAL_CONFIRMATION_REQUIRED);
    // strip JUDGMENT_SUPPORT_ALLOWED under heavy narrowing
    if (start.has(L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED)) {
      start.delete(L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
      blocked.add(L9SequenceRestrictionRight.JUDGMENT_SUPPORT_ALLOWED);
    }
  }

  // §9.7.6.5 — EVIDENCE_ONLY and score-driving are mutually exclusive
  if (start.has(L9SequenceRestrictionRight.EVIDENCE_ONLY)) {
    for (const sd of L9_SEQUENCE_SCORE_DRIVING_RIGHTS) {
      if (start.has(sd)) {
        start.delete(sd);
        blocked.add(sd);
      }
    }
  }

  const rights = [...start].sort();
  const blockedSorted = [...blocked].sort();

  return {
    sequence_subject_id: input.sequence_subject_id,
    driving_band: input.driving_band,
    rights,
    blocked_rights: blockedSorted,
    narrowing_notes: [...input.narrowing_notes].sort(),
    lineage_refs: [...input.lineage_refs].sort(),
    policy_version: input.policy_version,
    replay_hash:
      `h:srp7:${input.sequence_subject_id}:${input.driving_band}:` +
      `${input.causal_restraint_class}:${rights.join('+')}`,
  };
}
