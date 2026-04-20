/**
 * L9.9 — Enable / Disable Policy
 *
 * §9.9.7.3 — Rules governing whether Layer 9 (or an individual
 * sequence template / family) may be enabled or disabled in a given
 * rollout phase. Disable is the "soft kill switch"; rollback is the
 * reversal of a transition. These semantics are disjoint.
 *
 * Enabling a sequence template requires:
 *   - ratification artifact is PRODUCTION_READY and green, AND
 *   - rollout phase is downstream-visible, AND
 *   - template is declared in the family / rollout registry (out of
 *     scope here — the policy only records the rule).
 *
 * Disabling is always allowed when the request is explicit, as long
 * as the current rollout phase is not PRE_ROLLOUT (which is
 * no-op).
 */

import {
  L9CompletionState,
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import {
  L9LayerRatificationArtifact,
} from '../contracts/l9-ratification-artifact';
import {
  L9RolloutPhase,
  L9_DOWNSTREAM_VISIBLE_PHASES,
} from './l9-rollout-phase';

export type L9EnableDisableAction = 'ENABLE' | 'DISABLE';

export interface L9EnableDisableRequest {
  readonly request_id: string;
  readonly action: L9EnableDisableAction;
  readonly template_id: string | null;
  readonly current_phase: L9RolloutPhase;
  readonly ratification: L9LayerRatificationArtifact | null;
}

export interface L9EnableDisableDecision {
  readonly request_id: string;
  readonly action: L9EnableDisableAction;
  readonly allowed: boolean;
  readonly violations: readonly L9RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer9EnableDisablePolicy {
  decide(req: L9EnableDisableRequest): L9EnableDisableDecision {
    if (req.action === 'DISABLE') {
      if (req.current_phase === L9RolloutPhase.PRE_ROLLOUT) {
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
      L9_DOWNSTREAM_VISIBLE_PHASES.includes(req.current_phase);
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
        violations: [L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION],
        rationale: 'enable requires a ratification artifact',
      };
    }
    if (req.ratification.completion_result !==
        L9CompletionState.L9_PRODUCTION_READY) {
      return {
        request_id: req.request_id,
        action: req.action,
        allowed: false,
        violations: [L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION],
        rationale:
          `enable requires L9_PRODUCTION_READY; got ` +
          `${req.ratification.completion_result}`,
      };
    }
    if (req.ratification.blocking_violations.length > 0) {
      return {
        request_id: req.request_id,
        action: req.action,
        allowed: false,
        violations: [L9RatificationViolationCode.ROLLOUT_WITHOUT_CERTIFICATION],
        rationale:
          `ratification carries ${req.ratification.blocking_violations.length
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
