/**
 * L10.5 — Evidence-Interaction Validator §10.5.7 + §10.5.8
 *
 * The per-evidence validators police each surface in isolation. This
 * validator polices their *interaction*: semantic order, no-netting,
 * fragility posture coherence, confidence-cap linkage, and
 * spread / shift-condition coupling.
 */

import {
  L10ContradictionObservation,
} from '../contracts/hypothesis-contradiction-policy';
import {
  L10ConfirmationObservation,
} from '../contracts/hypothesis-confirmation-policy';
import {
  L10InvalidationObservation,
} from '../contracts/hypothesis-invalidation-policy';
import {
  L10ShiftConditionObservation,
} from '../contracts/hypothesis-shift-condition-policy';
import {
  L10SupportObservation,
} from '../contracts/hypothesis-support-policy';
import {
  L10CandidateStabilityClass,
  L10ConfirmationPresence,
  L10ContradictionEffectClass,
  L10ContradictionTemporalPosture,
  L10EvidenceSemanticStage,
  L10_EVIDENCE_SEMANTIC_STAGES,
  L10ShiftConditionClass,
} from '../contracts/hypothesis-evidence-semantics-types';
import {
  L10EvidenceSemanticValidationIssue,
  L10EvidenceSemanticValidationReport,
  L10EvidenceSemanticViolationCode,
} from './l10-evidence-semantics-violation-codes';

export interface L10EvidenceInteractionInput {
  readonly hypothesis_candidate_id: string;
  readonly support: readonly L10SupportObservation[];
  readonly contradiction: readonly L10ContradictionObservation[];
  readonly confirmation: readonly L10ConfirmationObservation[];
  readonly invalidation: readonly L10InvalidationObservation[];
  readonly shift_conditions: readonly L10ShiftConditionObservation[];

  /** §10.5.7.3 — the stages actually executed, in order. */
  readonly executed_stage_order: readonly L10EvidenceSemanticStage[];

  /** §10.5.7.5 — candidate stability/fragility posture emitted. */
  readonly stability_posture: L10CandidateStabilityClass;

  /** §10.5.7.4 — whether the engine emitted support and contradiction
   *  as independent first-class surfaces, not a single net score. */
  readonly explicit_surfaces_preserved: boolean;

  /** Whether invalidation posture caps candidate confidence. */
  readonly confidence_capped_under_active_invalidation: boolean;

  /** Whether ranking spread is narrow. */
  readonly ranking_spread_is_narrow: boolean;

  /** The emitted candidate-level confidence is reported by the caller
   *  for cross-check: confidence >= 0.7 with active invalidation must
   *  be capped. */
  readonly emitted_confidence: number;
}

export function validateL10EvidenceInteraction(
  input: L10EvidenceInteractionInput,
): L10EvidenceSemanticValidationReport {
  const issues: L10EvidenceSemanticValidationIssue[] = [];
  const push = (
    code: L10EvidenceSemanticViolationCode,
    message: string,
    subject?: string,
  ) => issues.push({ code, message, subject });

  // §10.5.7.3 — canonical stage order. Executed stages must appear in
  // the canonical order and (if present) must appear in sequence.
  const canonicalIndex = new Map<L10EvidenceSemanticStage, number>();
  L10_EVIDENCE_SEMANTIC_STAGES.forEach((s, i) => canonicalIndex.set(s, i));
  let lastIdx = -1;
  for (const s of input.executed_stage_order) {
    const idx = canonicalIndex.get(s);
    if (idx === undefined || idx <= lastIdx) {
      push(
        L10EvidenceSemanticViolationCode.INTERACTION_SEMANTIC_ORDER_VIOLATED,
        `stage '${s}' out of canonical order`,
        input.hypothesis_candidate_id,
      );
      break;
    }
    lastIdx = idx;
  }

  // §10.5.7.4 — no netting law.
  if (!input.explicit_surfaces_preserved) {
    push(
      L10EvidenceSemanticViolationCode.INTERACTION_NETTED_SUPPORT_MINUS_CONTRADICTION,
      'support and contradiction were folded into a single net score',
      input.hypothesis_candidate_id,
    );
    push(
      L10EvidenceSemanticViolationCode.INTERACTION_FLATTENED_INTO_SINGLE_STORY,
      'competition state flattened into one story',
      input.hypothesis_candidate_id,
    );
  }

  // §10.5.7.2 — fragile under active contradiction or active invalidation.
  const hasActiveContradiction = input.contradiction.some(
    c =>
      c.contradiction_temporal_posture ===
        L10ContradictionTemporalPosture.ACTIVE &&
      (c.contradiction_effect === L10ContradictionEffectClass.BLOCKING ||
        c.contradiction_effect === L10ContradictionEffectClass.NARROWING),
  );
  const hasActiveInvalidation = input.invalidation.some(
    i => i.is_currently_active,
  );
  const hasMissingCoreConfirmation = input.confirmation.some(
    c => c.confirmation_presence === L10ConfirmationPresence.MISSING,
  );

  const fragileFactors =
    (hasActiveContradiction ? 1 : 0) +
    (hasActiveInvalidation ? 1 : 0) +
    (hasMissingCoreConfirmation ? 1 : 0);

  if (
    fragileFactors >= 1 &&
    input.stability_posture === L10CandidateStabilityClass.STABLE
  ) {
    push(
      L10EvidenceSemanticViolationCode.INTERACTION_FRAGILE_CANDIDATE_MARKED_STABLE,
      'candidate marked STABLE despite active contradiction / invalidation / missing confirmations',
      input.hypothesis_candidate_id,
    );
  }

  // §10.5.7.2 — missing confirmations → candidate must not be stable.
  if (
    hasMissingCoreConfirmation &&
    input.stability_posture === L10CandidateStabilityClass.STABLE
  ) {
    push(
      L10EvidenceSemanticViolationCode.INTERACTION_MISSING_CONFIRMATION_NOT_FRAGILE,
      'candidate with missing confirmations reported STABLE',
      input.hypothesis_candidate_id,
    );
  }

  // §10.5.7.2 — confidence must be capped under active invalidation.
  if (
    hasActiveInvalidation &&
    input.emitted_confidence >= 0.7 &&
    !input.confidence_capped_under_active_invalidation
  ) {
    push(
      L10EvidenceSemanticViolationCode.INTERACTION_CONFIDENCE_UNCAPPED_UNDER_ACTIVE_INVALIDATION,
      `confidence=${input.emitted_confidence} uncapped under active invalidation`,
      input.hypothesis_candidate_id,
    );
  }

  // §10.5.7.2 / §10.5.6.8 — narrow spread without shift conditions.
  if (
    input.ranking_spread_is_narrow &&
    !input.shift_conditions.some(
      sc =>
        sc.condition_class ===
          L10ShiftConditionClass.SPREAD_NARROWING_CONDITION ||
        sc.condition_class ===
          L10ShiftConditionClass.SECONDARY_PROMOTION_CONDITION,
    )
  ) {
    push(
      L10EvidenceSemanticViolationCode.INTERACTION_SPREAD_NARROW_WITHOUT_SHIFT_CONDITIONS,
      'narrow spread without narrowing/promotion shift conditions',
      input.hypothesis_candidate_id,
    );
  }

  return { valid: issues.length === 0, issues };
}
