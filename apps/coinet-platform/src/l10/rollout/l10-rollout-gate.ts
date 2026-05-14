/**
 * L10.9 — Rollout Gate
 *
 * §10.9.13 INV-10.9-F / §10.9.11.3 — The rollout gate is the single
 * enforcement point that allows Layer 10 (and individual hypothesis
 * templates/families) to transition forward through rollout phases.
 *
 * Forward transitions are only permitted when:
 *   - there is a valid, L10_PRODUCTION_READY ratification artifact,
 *   - the ratification artifact carries no blocking violations,
 *   - transitioning to a downstream-visible phase requires freeze
 *     status = FROZEN or HARD_PROTECTED,
 *   - transitions preserve the canonical forward order.
 *
 * Any violation of this gate raises
 * `ROLLOUT_WITHOUT_CERTIFICATION`.
 */

import {
  L10CompletionState,
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import {
  L10FreezeStatus,
} from '../contracts/l10-freeze-policy';
import {
  L10LayerRatificationArtifact,
} from '../contracts/l10-ratification-artifact';
import {
  L10RolloutPhase,
  L10_DOWNSTREAM_VISIBLE_PHASES,
  isL10ForwardPhaseTransitionLegal,
} from './l10-rollout-phase';

export interface L10RolloutTransitionRequest {
  readonly request_id: string;
  readonly from_phase: L10RolloutPhase;
  readonly to_phase: L10RolloutPhase;
  readonly ratification: L10LayerRatificationArtifact | null;
  readonly freeze_status: L10FreezeStatus;
}

export interface L10RolloutTransitionDecision {
  readonly request_id: string;
  readonly allowed: boolean;
  readonly activated_phase: L10RolloutPhase;
  readonly violations: readonly L10RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer10RolloutGate {
  decide(req: L10RolloutTransitionRequest): L10RolloutTransitionDecision {
    const violations: L10RatificationViolationCode[] = [];

    // PRE_ROLLOUT → SHADOW never requires ratification (shadow does
    // not expose any downstream surface).
    const shadowBootstrap =
      req.from_phase === L10RolloutPhase.PRE_ROLLOUT &&
      req.to_phase === L10RolloutPhase.SHADOW;

    // Forward transitions must follow the canonical order.
    if (!shadowBootstrap &&
        !isL10ForwardPhaseTransitionLegal(req.from_phase, req.to_phase)) {
      violations.push(
        L10RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
      return {
        request_id: req.request_id,
        allowed: false,
        activated_phase: req.from_phase,
        violations,
        rationale:
          `illegal forward transition ${req.from_phase} → ` +
          `${req.to_phase}`,
      };
    }

    // Transitions into a downstream-visible phase require a valid
    // production-ready ratification artifact with no blockers.
    const targetIsDownstreamVisible =
      L10_DOWNSTREAM_VISIBLE_PHASES.includes(req.to_phase);
    if (targetIsDownstreamVisible) {
      if (!req.ratification) {
        violations.push(
          L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
        return {
          request_id: req.request_id,
          allowed: false,
          activated_phase: req.from_phase,
          violations,
          rationale:
            'downstream-visible rollout requires ratification artifact',
        };
      }
      if (req.ratification.completion_result !==
          L10CompletionState.L10_PRODUCTION_READY) {
        violations.push(
          L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
        return {
          request_id: req.request_id,
          allowed: false,
          activated_phase: req.from_phase,
          violations,
          rationale:
            `rollout requires L10_PRODUCTION_READY; got ` +
            `${req.ratification.completion_result}`,
        };
      }
      if (req.ratification.blocking_violations.length > 0) {
        violations.push(
          L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
        return {
          request_id: req.request_id,
          allowed: false,
          activated_phase: req.from_phase,
          violations,
          rationale:
            `ratification carries ${
              req.ratification.blocking_violations.length
            } blocking violations`,
        };
      }
      if (req.freeze_status === L10FreezeStatus.OPEN) {
        violations.push(
          L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
        return {
          request_id: req.request_id,
          allowed: false,
          activated_phase: req.from_phase,
          violations,
          rationale:
            'downstream-visible rollout requires freeze status ≥ FROZEN',
        };
      }
    }

    return {
      request_id: req.request_id,
      allowed: true,
      activated_phase: req.to_phase,
      violations: [],
      rationale: `rollout ${req.from_phase} → ${req.to_phase} allowed`,
    };
  }
}
