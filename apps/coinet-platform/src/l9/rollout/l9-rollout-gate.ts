/**
 * L9.9 — Rollout Gate
 *
 * §9.9.4.1 INV-9.9-F / §9.9.7.3 — The rollout gate is the single
 * enforcement point that allows Layer 9 (and individual sequence
 * templates/families) to transition forward through rollout phases.
 *
 * Forward transitions are only permitted when:
 *   - there is a valid, L9_PRODUCTION_READY ratification artifact,
 *   - the ratification artifact carries no blocking violations,
 *   - transitioning to a downstream-visible phase requires freeze
 *     status = FROZEN or HARD_PROTECTED,
 *   - transitions preserve the canonical forward order.
 *
 * Any violation of this gate raises
 * `ROLLOUT_WITHOUT_CERTIFICATION`.
 */

import {
  L9CompletionState,
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import {
  L9FreezeStatus,
} from '../contracts/l9-freeze-policy';
import {
  L9LayerRatificationArtifact,
} from '../contracts/l9-ratification-artifact';
import {
  L9RolloutPhase,
  L9_DOWNSTREAM_VISIBLE_PHASES,
  isL9ForwardPhaseTransitionLegal,
} from './l9-rollout-phase';

export interface L9RolloutTransitionRequest {
  readonly request_id: string;
  readonly from_phase: L9RolloutPhase;
  readonly to_phase: L9RolloutPhase;
  readonly ratification: L9LayerRatificationArtifact | null;
  readonly freeze_status: L9FreezeStatus;
}

export interface L9RolloutTransitionDecision {
  readonly request_id: string;
  readonly allowed: boolean;
  readonly activated_phase: L9RolloutPhase;
  readonly violations: readonly L9RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer9RolloutGate {
  decide(req: L9RolloutTransitionRequest): L9RolloutTransitionDecision {
    const violations: L9RatificationViolationCode[] = [];

    // PRE_ROLLOUT → SHADOW never requires ratification (shadow does
    // not expose any downstream surface).
    const shadowBootstrap =
      req.from_phase === L9RolloutPhase.PRE_ROLLOUT &&
      req.to_phase === L9RolloutPhase.SHADOW;

    // Forward transitions must follow the canonical order.
    if (!shadowBootstrap &&
        !isL9ForwardPhaseTransitionLegal(req.from_phase, req.to_phase)) {
      violations.push(
        L9RatificationViolationCode.EXECUTION_ORDER_VIOLATION);
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
      L9_DOWNSTREAM_VISIBLE_PHASES.includes(req.to_phase);
    if (targetIsDownstreamVisible) {
      if (!req.ratification) {
        violations.push(
          L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
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
          L9CompletionState.L9_PRODUCTION_READY) {
        violations.push(
          L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
        return {
          request_id: req.request_id,
          allowed: false,
          activated_phase: req.from_phase,
          violations,
          rationale:
            `rollout requires L9_PRODUCTION_READY; got ` +
            `${req.ratification.completion_result}`,
        };
      }
      if (req.ratification.blocking_violations.length > 0) {
        violations.push(
          L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
        return {
          request_id: req.request_id,
          allowed: false,
          activated_phase: req.from_phase,
          violations,
          rationale:
            `ratification carries ${req.ratification.blocking_violations.length
            } blocking violations`,
        };
      }
      if (req.freeze_status === L9FreezeStatus.OPEN) {
        violations.push(
          L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION);
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
