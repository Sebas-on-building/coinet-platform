/**
 * L9.5 — Temporal Interaction Validator
 *
 * §9.5.10 — Enforces interaction law between the seven temporal
 * domains: time surfaces, windows, lead-lag, phase, change points,
 * decay, and post-event windows.
 *
 * These rules catch violations that are invisible to each individual
 * validator. Example: the lead-lag validator accepts a TOO_LATE lag
 * as `WEAK_BUT_USABLE`; the interaction validator rejects the *use*
 * of that lag as proof of a `VALIDATED` phase.
 */

import { L9PhaseClass } from '../contracts/phase-state';
import {
  L9LeadLagQualityClass,
  L9SemanticLagClass,
  l9LagSupportsOnlyLateness,
} from '../contracts/l9-lead-lag-policy';
import {
  L9DecayDominance,
} from '../contracts/l9-decay-policy';
import {
  L9PostEventLifecycle,
} from '../contracts/l9-post-event-window-policy';
import {
  L9PhaseTransitionLegality,
  getL9PhaseTransitionLegality,
} from '../contracts/l9-phase-progression-policy';
import { L9SemanticAmbiguityPosture, L9TemporalSemanticTier } from '../contracts/l9-temporal-semantics-types';
import {
  L9TemporalSemanticViolation,
  L9TemporalSemanticViolationCode,
  violation,
} from './l9-temporal-semantic-violation-codes';

export interface L9TemporalInteractionInput {
  readonly phase_from: L9PhaseClass | null;
  readonly phase_to: L9PhaseClass;
  readonly change_point_ref: string | null;
  readonly shock_anchor_ref: string | null;
  readonly recovery_posture_ref: string | null;

  /**
   * The best lead-lag posture the engine is leaning on for this phase.
   */
  readonly dominant_lag_class: L9SemanticLagClass | null;
  readonly dominant_lag_quality: L9LeadLagQualityClass | null;
  /** Did the lead signal have a decisive contradiction posture? */
  readonly lead_lag_decisive_contradiction?: boolean;
  /** Did the lead signal register a material contradiction? */
  readonly lead_lag_material_contradiction?: boolean;

  readonly decay_dominance: L9DecayDominance;

  /**
   * If the family requires a post-event anchor (OVERHANG_AND_DIGESTION,
   * SHOCK_AND_RECOVERY), pass the current lifecycle. Otherwise null.
   */
  readonly post_event_lifecycle: L9PostEventLifecycle | null;
  readonly post_event_anchor_present: boolean;

  /**
   * Whether the overall output was emitted as a single clean posture
   * despite semantic ambiguity being present elsewhere.
   */
  readonly declared_clean_output?: boolean;
  readonly ambiguity_posture?: L9SemanticAmbiguityPosture;

  /** Are we claiming "still early" anywhere in the chain? */
  readonly claims_still_early?: boolean;
  /** Are we claiming reaccumulation? */
  readonly claims_reaccumulation?: boolean;
  /** Are we claiming digestion? */
  readonly claims_digestion?: boolean;
}

export interface L9TemporalInteractionResult {
  readonly ok: boolean;
  readonly violations: readonly L9TemporalSemanticViolation[];
}

export function validateL9TemporalInteraction(
  input: L9TemporalInteractionInput,
): L9TemporalInteractionResult {
  const violations: L9TemporalSemanticViolation[] = [];

  // §9.5.10.2 — phase jumps may require change points or shock anchors
  if (input.phase_from !== null) {
    const legality = getL9PhaseTransitionLegality(
      input.phase_from, input.phase_to,
    );
    if (legality === L9PhaseTransitionLegality.LEGAL_WITH_CHANGE_POINT &&
        !input.change_point_ref) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.IX_PHASE_JUMP_WITHOUT_CHANGE_POINT,
        L9TemporalSemanticTier.INTERACTION,
        `phase jump ${input.phase_from}→${input.phase_to} requires a change point`,
      ));
    }
  }

  // §9.5.10.3 — VALIDATION may not be clean with TOO_LATE leads
  if ((input.phase_to === L9PhaseClass.VALIDATED ||
       input.phase_to === L9PhaseClass.CONFIRMING) &&
      input.dominant_lag_class &&
      l9LagSupportsOnlyLateness(input.dominant_lag_class) &&
      input.declared_clean_output === true) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.IX_VALIDATION_WITH_TOO_LATE_LEADS,
      L9TemporalSemanticTier.INTERACTION,
      `clean ${input.phase_to} declared while dominant lag is ${input.dominant_lag_class}`,
    ));
  }

  // §9.5.10.3 — early-phase claims under dominant decay
  if (input.claims_still_early === true &&
      (input.decay_dominance === L9DecayDominance.HIGH_DECAY ||
       input.decay_dominance === L9DecayDominance.DOMINANT_DECAY)) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.IX_EARLY_CLAIM_UNDER_DOMINANT_DECAY,
      L9TemporalSemanticTier.INTERACTION,
      `"still early" claim under ${input.decay_dominance}`,
    ));
  }

  // §9.5.10.3 — reaccumulation under active shock is illegal
  if (input.claims_reaccumulation === true &&
      input.post_event_lifecycle === L9PostEventLifecycle.ACTIVE_SHOCK) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.IX_REACCUMULATION_WHILE_SHOCK_ACTIVE,
      L9TemporalSemanticTier.INTERACTION,
      'reaccumulation claimed while post-event window is ACTIVE_SHOCK',
    ));
  }

  // §9.5.10.3 — digestion requires a post-event anchor (for families
  // that require it, post_event_lifecycle will be non-null).
  if (input.claims_digestion === true &&
      input.post_event_lifecycle !== null &&
      !input.post_event_anchor_present) {
    violations.push(violation(
      L9TemporalSemanticViolationCode
        .IX_DIGESTION_WITHOUT_POST_EVENT_ANCHOR,
      L9TemporalSemanticTier.INTERACTION,
      'digestion phase declared without post-event anchor',
    ));
  }

  // §9.5.10.3 — a decisive/material contradiction must void or narrow
  // the lead-lag; if the dominant quality is still STRUCTURALLY_MEANINGFUL
  // the interaction is inconsistent.
  if ((input.lead_lag_decisive_contradiction === true ||
       input.lead_lag_material_contradiction === true) &&
      input.dominant_lag_quality ===
        L9LeadLagQualityClass.STRUCTURALLY_MEANINGFUL) {
    violations.push(violation(
      L9TemporalSemanticViolationCode.IX_CONTRADICTION_DOES_NOT_VOID_LAG,
      L9TemporalSemanticTier.INTERACTION,
      'contradiction present but lead-lag still marked STRUCTURALLY_MEANINGFUL',
    ));
  }

  // §9.5.10.2 — ambiguity may not be hidden under a clean output
  if (input.declared_clean_output === true &&
      input.ambiguity_posture &&
      input.ambiguity_posture !== L9SemanticAmbiguityPosture.NONE) {
    violations.push(violation(
      L9TemporalSemanticViolationCode
        .IX_AMBIGUITY_HIDDEN_UNDER_CLEAN_OUTPUT,
      L9TemporalSemanticTier.INTERACTION,
      `clean output declared while ambiguity posture is ${input.ambiguity_posture}`,
    ));
  }

  // §9.5.10.2 — a shock-anchor transition without anchor is illegal
  if (input.phase_from !== null) {
    const legality = getL9PhaseTransitionLegality(
      input.phase_from, input.phase_to,
    );
    if (legality === L9PhaseTransitionLegality.LEGAL_WITH_SHOCK_ANCHOR &&
        !input.shock_anchor_ref) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.IX_PHASE_JUMP_WITHOUT_CHANGE_POINT,
        L9TemporalSemanticTier.INTERACTION,
        `shock-anchored phase jump ${input.phase_from}→${input.phase_to} missing shock anchor`,
      ));
    }
    if (legality === L9PhaseTransitionLegality.LEGAL_WITH_RECOVERY_POSTURE &&
        !input.recovery_posture_ref) {
      violations.push(violation(
        L9TemporalSemanticViolationCode.IX_PHASE_JUMP_WITHOUT_CHANGE_POINT,
        L9TemporalSemanticTier.INTERACTION,
        `recovery-path phase jump ${input.phase_from}→${input.phase_to} missing recovery posture`,
      ));
    }
  }

  return { ok: violations.length === 0, violations };
}
