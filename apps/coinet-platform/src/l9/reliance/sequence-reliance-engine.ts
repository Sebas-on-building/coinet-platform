/**
 * L9.7 — Sequence Reliance Engine (aggregator)
 *
 * §9.7.9 — Composes confidence, cap chain, restriction, and causal
 * restraint into one `L9SequenceRelianceProfile`. Deterministic. The
 * aggregator itself applies no additional policy — all policy lives
 * in the individual engines and validators — it only stitches the
 * surfaces together and runs the readiness summarizer (§9.7.9.3).
 */

import {
  L9SequenceRelianceProfile,
  summarizeL9SequenceRelianceReadiness,
} from '../contracts/l9_7-sequence-reliance-profile';
import {
  L9SequenceRestrictionRight,
} from '../contracts/l9_7-sequence-restriction-rights';
import {
  L9RelianceConfidenceInput,
  buildL9RelianceConfidenceProfile,
} from './sequence-confidence-engine';
import {
  L9SequenceCausalRestraintEngineInput,
  classifyL9SequenceCausalRestraint,
} from './sequence-causal-restraint-engine';
import {
  buildL9SequenceRestrictionProfile,
} from './sequence-restriction-engine';
import { L9SequenceCausalRestraintProfile } from '../contracts/l9_7-sequence-causal-restraint';

export interface L9SequenceRelianceEngineInput {
  readonly confidence_input: L9RelianceConfidenceInput;
  readonly causal_input: L9SequenceCausalRestraintEngineInput;
  readonly contradiction_present: boolean;
  readonly additional_confirmation_required: boolean;
  readonly narrowing_notes: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export interface L9SequenceRelianceEngineOutput {
  readonly reliance: L9SequenceRelianceProfile;
  readonly causal_profile: L9SequenceCausalRestraintProfile;
}

export function buildL9SequenceRelianceProfile(
  input: L9SequenceRelianceEngineInput,
): L9SequenceRelianceEngineOutput {
  const { profile: confidence, cap_chain } =
    buildL9RelianceConfidenceProfile(input.confidence_input);

  const causalProfile = classifyL9SequenceCausalRestraint(input.causal_input);

  const restriction = buildL9SequenceRestrictionProfile({
    sequence_subject_id: input.confidence_input.sequence_subject_id,
    driving_band: confidence.confidence_band,
    cap_chain,
    contradiction_present: input.contradiction_present,
    causal_restraint_class: causalProfile.restraint_class,
    additional_confirmation_required: input.additional_confirmation_required,
    narrowing_notes: input.narrowing_notes,
    lineage_refs: input.lineage_refs,
    policy_version: input.policy_version,
  });

  const readiness = summarizeL9SequenceRelianceReadiness({
    band: confidence.confidence_band,
    capped_score: confidence.capped_confidence_score,
    restraint_class: causalProfile.restraint_class,
    has_evidence_only_right: restriction.rights.includes(
      L9SequenceRestrictionRight.EVIDENCE_ONLY,
    ),
    has_final_judgment_blocked_right: restriction.rights.includes(
      L9SequenceRestrictionRight.FINAL_JUDGMENT_BLOCKED,
    ),
  });

  const reliance: L9SequenceRelianceProfile = {
    sequence_subject_id: input.confidence_input.sequence_subject_id,
    confidence,
    cap_chain,
    restriction,
    causal_restraint_class: causalProfile.restraint_class,
    readiness,
    policy_version: input.policy_version,
    replay_hash:
      `h:rel7:${input.confidence_input.sequence_subject_id}:` +
      `${readiness}:${confidence.replay_hash}:${restriction.replay_hash}`,
  };

  return { reliance, causal_profile: causalProfile };
}
