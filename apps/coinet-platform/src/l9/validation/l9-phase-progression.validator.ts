/**
 * L9.5 — Phase Progression Validator
 *
 * §9.5.6 — Enforces the phase-transition lawbook, anchor requirements
 * for non-direct transitions, and explicit ambiguity handling.
 */

import { L9PhaseClass } from '../contracts/phase-state';
import {
  L9PhaseTransitionLegality,
  areL9PhasesAdjacent,
  getL9PhaseTransitionLegality,
} from '../contracts/l9-phase-progression-policy';
import { L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9PhaseTransitionValidationInput {
  readonly from_phase: L9PhaseClass;
  readonly to_phase: L9PhaseClass;
  readonly change_point_ref: string | null;
  readonly shock_anchor_ref: string | null;
  readonly recovery_posture_ref: string | null;
  /**
   * The plausible secondary phase, if ambiguity was detected. Used to
   * catch silent collapses under §9.5.6.7.
   */
  readonly ambiguity_secondary_phase?: L9PhaseClass | null;
  /**
   * Whether the engine claimed the chain is "clean single phase" when
   * in fact `ambiguity_secondary_phase` is populated.
   */
  readonly declared_clean_single_phase?: boolean;
}

export interface L9PhaseTransitionValidationResult {
  readonly ok: boolean;
  readonly legality: L9PhaseTransitionLegality;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

export function validateL9PhaseTransition(
  input: L9PhaseTransitionValidationInput,
): L9PhaseTransitionValidationResult {
  const violations: L9TemporalSemanticViolation[] = [];
  const legality = getL9PhaseTransitionLegality(
    input.from_phase, input.to_phase,
  );

  switch (legality) {
    case L9PhaseTransitionLegality.ILLEGAL:
      violations.push(violation(
        L9TemporalSemanticViolationCode.PHASE_TRANSITION_ILLEGAL,
        L9TemporalSemanticTier.PHASE_PROGRESSION,
        `phase transition ${input.from_phase}→${input.to_phase} is illegal`,
      ));
      break;
    case L9PhaseTransitionLegality.LEGAL_WITH_CHANGE_POINT:
      if (!input.change_point_ref) {
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .PHASE_TRANSITION_MISSING_CHANGE_POINT,
          L9TemporalSemanticTier.PHASE_PROGRESSION,
          `transition ${input.from_phase}→${input.to_phase} requires a change point`,
        ));
      }
      break;
    case L9PhaseTransitionLegality.LEGAL_WITH_SHOCK_ANCHOR:
      if (!input.shock_anchor_ref) {
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .PHASE_TRANSITION_MISSING_SHOCK_ANCHOR,
          L9TemporalSemanticTier.PHASE_PROGRESSION,
          `transition ${input.from_phase}→${input.to_phase} requires a shock anchor`,
        ));
      }
      break;
    case L9PhaseTransitionLegality.LEGAL_WITH_RECOVERY_POSTURE:
      if (!input.recovery_posture_ref) {
        violations.push(violation(
          L9TemporalSemanticViolationCode
            .PHASE_TRANSITION_MISSING_RECOVERY_POSTURE,
          L9TemporalSemanticTier.PHASE_PROGRESSION,
          `transition ${input.from_phase}→${input.to_phase} requires recovery posture`,
        ));
      }
      break;
    case L9PhaseTransitionLegality.LEGAL_DIRECT:
      break;
  }

  // §9.5.6.7 — ambiguity must not be hidden under a clean single-phase claim
  if (input.declared_clean_single_phase === true &&
      input.ambiguity_secondary_phase &&
      input.ambiguity_secondary_phase !== input.to_phase) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.PHASE_AMBIGUITY_COLLAPSED,
      L9TemporalSemanticTier.PHASE_PROGRESSION,
      `clean-single-phase claimed but ambiguity with ${input.ambiguity_secondary_phase} was detected`,
    ));
  }

  // §9.5.6.7 — if ambiguity is declared, the secondary must be adjacent
  if (input.ambiguity_secondary_phase &&
      !areL9PhasesAdjacent(input.to_phase, input.ambiguity_secondary_phase)) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.PHASE_NON_ADJACENT_CLAIM,
      L9TemporalSemanticTier.PHASE_PROGRESSION,
      `secondary phase ${input.ambiguity_secondary_phase} is not adjacent to ${input.to_phase}`,
    ));
  }

  return { ok: violations.length === 0, legality, violations };
}
