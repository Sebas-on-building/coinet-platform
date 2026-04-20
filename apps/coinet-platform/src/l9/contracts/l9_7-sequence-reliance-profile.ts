/**
 * L9.7 — Sequence Reliance Profile
 *
 * §9.7.9 — Final reliance bundle later layers consume. Summarizes the
 * confidence profile, cap chain, restriction profile, and causal-
 * restraint posture into a single governed reliance readiness class
 * *without* replacing any of them (INV-9.7-G).
 */

import { L9SequenceCapChain } from './l9_7-sequence-cap-chain';
import {
  L9SequenceCausalRestraintClass,
} from './l9_7-sequence-causal-restraint';
import {
  L9RelianceConfidenceBand,
  L9RelianceConfidenceProfile,
} from './l9_7-sequence-confidence-policy';
import {
  L9SequenceRestrictionProfileL9_7,
} from './l9_7-sequence-restriction-rights';

/**
 * §9.7.9.2 — Canonical reliance readiness classes. Summary only —
 * never a replacement for factor breakdown, cap chain, restriction
 * rights, or causal-restraint posture (INV-9.7-G).
 */
export enum L9SequenceRelianceReadinessClass {
  STRONG = 'STRONG',
  NARROWED = 'NARROWED',
  DEGRADED = 'DEGRADED',
  BLOCKED = 'BLOCKED',
}

export const ALL_L9_SEQUENCE_RELIANCE_READINESS_CLASSES:
  readonly L9SequenceRelianceReadinessClass[] =
    Object.values(L9SequenceRelianceReadinessClass);

/**
 * §9.7.9.3 — Deterministic readiness summarizer. Uses the capped
 * band, cap-chain tightness, causal-restraint class, and whether any
 * restrictive right is present to pick a single readiness class.
 *
 * This helper intentionally does NOT take confidence raw score; the
 * band (derived from the *capped* score) is the only confidence
 * surface allowed here (§9.7.4.6 / §9.7.9.3).
 */
export function summarizeL9SequenceRelianceReadiness(args: {
  band: L9RelianceConfidenceBand;
  capped_score: number;
  restraint_class: L9SequenceCausalRestraintClass;
  has_evidence_only_right: boolean;
  has_final_judgment_blocked_right: boolean;
}): L9SequenceRelianceReadinessClass {
  if (
    args.has_final_judgment_blocked_right ||
    args.has_evidence_only_right ||
    args.restraint_class ===
      L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE ||
    args.band === L9RelianceConfidenceBand.UNRESOLVED
  ) {
    return L9SequenceRelianceReadinessClass.BLOCKED;
  }
  if (args.band === L9RelianceConfidenceBand.LOW) {
    return L9SequenceRelianceReadinessClass.DEGRADED;
  }
  if (
    args.band === L9RelianceConfidenceBand.MEDIUM ||
    args.restraint_class ===
      L9SequenceCausalRestraintClass.NARROWED_RESTRAINT
  ) {
    return L9SequenceRelianceReadinessClass.NARROWED;
  }
  // HIGH band + STRICT or PROVISIONAL restraint
  return L9SequenceRelianceReadinessClass.STRONG;
}

/**
 * §9.7.9.1 — Full reliance profile delivered to later layers. Carries
 * every first-class surface alongside the summarized readiness.
 */
export interface L9SequenceRelianceProfile {
  readonly sequence_subject_id: string;
  readonly confidence: L9RelianceConfidenceProfile;
  readonly cap_chain: L9SequenceCapChain;
  readonly restriction: L9SequenceRestrictionProfileL9_7;
  readonly causal_restraint_class: L9SequenceCausalRestraintClass;
  readonly readiness: L9SequenceRelianceReadinessClass;
  readonly policy_version: string;
  readonly replay_hash: string;
}
