/**
 * L7.9 — Handoff / Downstream Dependency Validator
 *
 * §7.9.7 / §7.9.9.1 INV-7.9-E — Validates what later layers may
 * legally depend on, and under which `L7DownstreamConsumerMode`.
 * Enforces that downstream consumers depend only on frozen stable
 * handoff surfaces, never on internal engine state, raw persistence,
 * cache-only surfaces, or any forbidden access kind.
 */

import {
  L7DependencyAllowance,
  L7DownstreamAccessKind,
  L7DownstreamConsumerMode,
  L7DownstreamDependencyDecision,
  L7DownstreamDependencyRequest,
  L7_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L7_GOVERNED_ONLY_ACCESS_KINDS,
  L7_STABLE_HANDOFF_SURFACES,
} from '../contracts/l7-downstream-dependency';
import { L7FreezeStatus } from '../contracts/l7-freeze-policy';
import { L7RatificationViolationCode } from '../contracts/l7-completion-standard';

export interface L7HandoffContext {
  readonly freeze_status: L7FreezeStatus;
  readonly downstream_dependency_allowed: boolean;
}

export class Layer7DownstreamDependencyValidator {
  validate(
    req: L7DownstreamDependencyRequest,
    ctx: L7HandoffContext,
  ): L7DownstreamDependencyDecision {
    if (L7_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(req.access_kind)) {
      return {
        request_id: req.request_id,
        allowance: L7DependencyAllowance.DENIED,
        rationale:
          `access kind ${req.access_kind} is constitutionally forbidden ` +
          `for later layers`,
      };
    }

    if (L7_GOVERNED_ONLY_ACCESS_KINDS.includes(req.access_kind)) {
      if (req.consumer_mode === L7DownstreamConsumerMode.GOVERNED_REPLAY ||
          req.consumer_mode === L7DownstreamConsumerMode.GOVERNED_REPAIR) {
        return {
          request_id: req.request_id,
          allowance: L7DependencyAllowance.CONDITIONALLY_ALLOWED,
          rationale: 'allowed only under governed replay/repair mode',
        };
      }
      return {
        request_id: req.request_id,
        allowance: L7DependencyAllowance.DENIED,
        rationale: 'ad hoc revalidation requested outside replay/repair mode',
      };
    }

    if (L7_STABLE_HANDOFF_SURFACES.includes(req.access_kind)) {
      if (!ctx.downstream_dependency_allowed) {
        return {
          request_id: req.request_id,
          allowance: L7DependencyAllowance.DENIED,
          rationale:
            'downstream dependency not yet allowed (layer not production-ready)',
        };
      }
      return {
        request_id: req.request_id,
        allowance: L7DependencyAllowance.ALLOWED,
        rationale: `stable handoff surface ${req.access_kind} is allowed`,
      };
    }

    return {
      request_id: req.request_id,
      allowance: L7DependencyAllowance.DENIED,
      rationale:
        `access kind ${req.access_kind} is not a recognized L7 handoff surface`,
    };
  }

  /**
   * Classify a validator decision into a ratification violation code,
   * if any. Used by the final audit log.
   */
  decisionToViolation(
    d: L7DownstreamDependencyDecision,
  ): L7RatificationViolationCode | null {
    if (d.allowance === L7DependencyAllowance.DENIED) {
      return L7RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY;
    }
    return null;
  }
}
