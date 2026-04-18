/**
 * L6.9 — Handoff / Downstream Dependency Validator
 *
 * §6.9.7.3–§6.9.7.5 — Validates what later layers may legally depend on,
 * and under which `L6DownstreamConsumerMode`. Enforces §6.9.9.1 INV-6.9-E.
 */

import {
  L6DependencyAllowance,
  L6DownstreamAccessKind,
  L6DownstreamConsumerMode,
  L6DownstreamDependencyDecision,
  L6DownstreamDependencyRequest,
  L6_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L6_GOVERNED_ONLY_ACCESS_KINDS,
  L6_STABLE_HANDOFF_SURFACES,
} from '../contracts/l6-downstream-dependency';
import {
  L6FreezeStatus,
} from '../contracts/l6-freeze-policy';
import { L6RatificationViolationCode } from '../contracts/l6-completion-standard';

export interface L6HandoffContext {
  readonly freeze_status: L6FreezeStatus;
  readonly downstream_dependency_allowed: boolean;
}

export class Layer6DownstreamDependencyValidator {
  validate(
    req: L6DownstreamDependencyRequest,
    ctx: L6HandoffContext,
  ): L6DownstreamDependencyDecision {
    // Forbidden access kinds are always FORBIDDEN.
    if (L6_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(req.access_kind)) {
      return {
        request_id: req.request_id,
        allowance: L6DependencyAllowance.FORBIDDEN,
        rationale: `access kind ${req.access_kind} is constitutionally forbidden for later layers`,
      };
    }

    // Governed-only access kinds require REPLAY or REPAIR mode.
    if (L6_GOVERNED_ONLY_ACCESS_KINDS.includes(req.access_kind)) {
      if (req.consumer_mode === L6DownstreamConsumerMode.GOVERNED_REPLAY ||
          req.consumer_mode === L6DownstreamConsumerMode.GOVERNED_REPAIR) {
        return {
          request_id: req.request_id,
          allowance: L6DependencyAllowance.REQUIRES_GOVERNED_MODE,
          rationale: 'allowed only under governed replay/repair mode',
        };
      }
      return {
        request_id: req.request_id,
        allowance: L6DependencyAllowance.FORBIDDEN,
        rationale: 'ad hoc recompute requested outside governed replay/repair mode',
      };
    }

    // Stable surfaces: allowed when downstream dependency is enabled.
    if (L6_STABLE_HANDOFF_SURFACES.includes(req.access_kind)) {
      if (!ctx.downstream_dependency_allowed) {
        return {
          request_id: req.request_id,
          allowance: L6DependencyAllowance.FORBIDDEN,
          rationale: 'downstream dependency not yet allowed (layer not production-ready)',
        };
      }
      return {
        request_id: req.request_id,
        allowance: L6DependencyAllowance.ALLOWED,
        rationale: `stable handoff surface ${req.access_kind} is allowed`,
      };
    }

    // Unknown access kind
    return {
      request_id: req.request_id,
      allowance: L6DependencyAllowance.FORBIDDEN,
      rationale: `access kind ${req.access_kind} is not a recognized L6 handoff surface`,
    };
  }

  /**
   * Classify a validator decision into a ratification violation code, if
   * any. Used by the final audit log.
   */
  decisionToViolation(
    d: L6DownstreamDependencyDecision,
  ): L6RatificationViolationCode | null {
    if (d.allowance === L6DependencyAllowance.FORBIDDEN) {
      return L6RatificationViolationCode.ILLEGAL_DOWNSTREAM_DEPENDENCY;
    }
    return null;
  }
}
