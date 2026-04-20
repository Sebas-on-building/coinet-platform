/**
 * L9.7 — Sequence Causal-Restraint Engine
 *
 * §9.7.7 — Deterministic classifier. Derives the causal-restraint
 * class from the per-input posture (contradiction presence, decay,
 * ambiguity, temporal-only support) and scans the caller-provided
 * surfaces for forbidden causal language (§9.7.7.3). The output is
 * consistent with `validateL9SequenceCausalRestraint` by construction.
 */

import {
  L9SequenceCausalRestraintClass,
  L9SequenceCausalRestraintProfile,
  L9_FORBIDDEN_CAUSAL_LANGUAGE_PATTERN,
  l9RestraintPermitsFinalJudgment,
} from '../contracts/l9_7-sequence-causal-restraint';

export interface L9SequenceCausalRestraintEngineInput {
  readonly sequence_subject_id: string;
  /** §9.7.7.1 — strength of temporal support (lead-lag + chain). */
  readonly temporal_support_strength: number; // 0..1
  /** §9.7.7.5 — contradiction pressure. */
  readonly contradiction_pressure: number; // 0..1
  /** §9.7.7.5 — decay burden. */
  readonly decay_burden: number; // 0..1
  /** §9.7.7.5 — unresolved ordering ambiguity. */
  readonly ordering_ambiguity: number; // 0..1
  /** §9.7.7.1 — whether any later layer has *explicitly* granted
   *  causal hint rights via doctrine. */
  readonly provisional_causal_grant: boolean;
  /** §9.7.7.3 — surfaces that must be scanned for causal language. */
  readonly surfaces: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly policy_version: string;
}

export function classifyL9SequenceCausalRestraint(
  input: L9SequenceCausalRestraintEngineInput,
): L9SequenceCausalRestraintProfile {
  const flagged: string[] = [];
  for (const s of input.surfaces) {
    const match = s.match(L9_FORBIDDEN_CAUSAL_LANGUAGE_PATTERN);
    if (match) flagged.push(match[0]);
  }

  const rationale: string[] = [];

  let cls: L9SequenceCausalRestraintClass =
    L9SequenceCausalRestraintClass.STRICT_RESTRAINT;
  rationale.push(
    'default doctrine: temporal order may not be laundered into causality',
  );

  if (flagged.length > 0) {
    cls = L9SequenceCausalRestraintClass.BLOCKED_CAUSAL_LANGUAGE;
    rationale.push(`flagged tokens detected (${flagged.length})`);
  } else if (
    input.contradiction_pressure >= 0.5 ||
    input.decay_burden >= 0.6 ||
    input.ordering_ambiguity >= 0.5
  ) {
    cls = L9SequenceCausalRestraintClass.NARROWED_RESTRAINT;
    rationale.push(
      'narrowing posture from contradiction / decay / ambiguity',
    );
  } else if (
    input.provisional_causal_grant &&
    input.temporal_support_strength >= 0.7
  ) {
    cls = L9SequenceCausalRestraintClass.PROVISIONAL_CAUSAL_HINT;
    rationale.push('provisional causal hint explicitly granted downstream');
  }

  return {
    sequence_subject_id: input.sequence_subject_id,
    restraint_class: cls,
    rationale_notes: rationale,
    flagged_tokens: flagged,
    permits_final_judgment: l9RestraintPermitsFinalJudgment(cls),
    policy_version: input.policy_version,
    lineage_refs: [...input.lineage_refs].sort(),
  };
}
