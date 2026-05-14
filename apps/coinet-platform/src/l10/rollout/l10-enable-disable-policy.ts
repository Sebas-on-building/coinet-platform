/**
 * L10.9 — Enable / Disable Policy
 *
 * §10.9.11.3 — Rules governing whether Layer 10 (or an individual
 * hypothesis template / family) may be enabled or disabled in a
 * given rollout phase. Disable is the "soft kill switch"; rollback
 * is the reversal of a transition. These semantics are disjoint.
 *
 * Enabling a hypothesis template requires:
 *   - ratification artifact is PRODUCTION_READY and green, AND
 *   - rollout phase is downstream-visible, AND
 *   - template is declared in the family / rollout registry (out of
 *     scope here — the policy only records the rule).
 *
 * Disabling is always allowed when the request is explicit, as long
 * as the current rollout phase is not PRE_ROLLOUT (which is no-op).
 */

import {
  L10CompletionState,
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import {
  L10LayerRatificationArtifact,
} from '../contracts/l10-ratification-artifact';
import {
  L10RolloutPhase,
  L10_DOWNSTREAM_VISIBLE_PHASES,
} from './l10-rollout-phase';

export type L10EnableDisableAction = 'ENABLE' | 'DISABLE';

export interface L10EnableDisableRequest {
  readonly request_id: string;
  readonly action: L10EnableDisableAction;
  readonly template_id: string | null;
  readonly current_phase: L10RolloutPhase;
  readonly ratification: L10LayerRatificationArtifact | null;
}

export interface L10EnableDisableDecision {
  readonly request_id: string;
  readonly action: L10EnableDisableAction;
  readonly allowed: boolean;
  readonly violations: readonly L10RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer10EnableDisablePolicy {
  decide(req: L10EnableDisableRequest): L10EnableDisableDecision {
    if (req.action === 'DISABLE') {
      if (req.current_phase === L10RolloutPhase.PRE_ROLLOUT) {
        return {
          request_id: req.request_id,
          action: req.action,
          allowed: false,
          violations: [],
          rationale: 'cannot disable in PRE_ROLLOUT (no-op)',
        };
      }
      return {
        request_id: req.request_id,
        action: req.action,
        allowed: true,
        violations: [],
        rationale:
          `disable allowed in ${req.current_phase} (soft kill switch)`,
      };
    }

    // ENABLE
    const visible =
      L10_DOWNSTREAM_VISIBLE_PHASES.includes(req.current_phase);
    if (!visible) {
      return {
        request_id: req.request_id,
        action: req.action,
        allowed: false,
        violations: [],
        rationale:
          `enable requires a downstream-visible phase; phase=` +
          `${req.current_phase}`,
      };
    }
    if (!req.ratification) {
      return {
        request_id: req.request_id,
        action: req.action,
        allowed: false,
        violations: [
          L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION,
        ],
        rationale: 'enable requires a ratification artifact',
      };
    }
    if (req.ratification.completion_result !==
        L10CompletionState.L10_PRODUCTION_READY) {
      return {
        request_id: req.request_id,
        action: req.action,
        allowed: false,
        violations: [
          L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION,
        ],
        rationale:
          `enable requires L10_PRODUCTION_READY; got ` +
          `${req.ratification.completion_result}`,
      };
    }
    if (req.ratification.blocking_violations.length > 0) {
      return {
        request_id: req.request_id,
        action: req.action,
        allowed: false,
        violations: [
          L10RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION,
        ],
        rationale:
          `ratification carries ${
            req.ratification.blocking_violations.length
          } blocking violations`,
      };
    }
    return {
      request_id: req.request_id,
      action: req.action,
      allowed: true,
      violations: [],
      rationale:
        `enable allowed in ${req.current_phase} under ratified ` +
        `artifact ${req.ratification.ratification_run_id}`,
    };
  }
}
