/**
 * L9.9 — Handoff Validator (Downstream Dependency Validator)
 *
 * §9.9.1.5 / §9.9.4.1 INV-9.9-C,E — Validates incoming downstream
 * dependency requests against the stable handoff law.
 *
 * - Stable handoff surfaces are ALLOWED under NORMAL_CONSUMPTION and
 *   GOVERNED_AUDIT, CONDITIONALLY_ALLOWED under governed replay/repair.
 * - AD_HOC_SEQUENCE_RECLASSIFICATION is only CONDITIONALLY_ALLOWED
 *   under GOVERNED_REPLAY / GOVERNED_REPAIR / GOVERNED_AUDIT modes.
 * - Forbidden kinds are DENIED.
 * - Unknown access kinds are DENIED.
 */

import {
  L9DependencyAllowance,
  L9DownstreamAccessKind,
  L9DownstreamConsumerMode,
  L9DownstreamDependencyDecision,
  L9DownstreamDependencyRequest,
  L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L9_GOVERNED_ONLY_ACCESS_KINDS,
  L9_STABLE_HANDOFF_SURFACES,
} from '../contracts/l9-downstream-dependency';

export class Layer9HandoffValidator {
  validate(
    req: L9DownstreamDependencyRequest,
  ): L9DownstreamDependencyDecision {
    if (L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(req.access_kind)) {
      return {
        request_id: req.request_id,
        allowance: L9DependencyAllowance.DENIED,
        rationale:
          `forbidden downstream access kind: ${req.access_kind}`,
      };
    }

    if (L9_GOVERNED_ONLY_ACCESS_KINDS.includes(req.access_kind)) {
      const governed =
        req.consumer_mode === L9DownstreamConsumerMode.GOVERNED_REPLAY ||
        req.consumer_mode === L9DownstreamConsumerMode.GOVERNED_REPAIR ||
        req.consumer_mode === L9DownstreamConsumerMode.GOVERNED_AUDIT;
      if (!governed) {
        return {
          request_id: req.request_id,
          allowance: L9DependencyAllowance.DENIED,
          rationale:
            `access kind ${req.access_kind} requires governed mode`,
        };
      }
      return {
        request_id: req.request_id,
        allowance: L9DependencyAllowance.CONDITIONALLY_ALLOWED,
        rationale:
          `governed-only access granted under ${req.consumer_mode}`,
      };
    }

    if (L9_STABLE_HANDOFF_SURFACES.includes(req.access_kind)) {
      if (req.consumer_mode === L9DownstreamConsumerMode.NORMAL_CONSUMPTION ||
          req.consumer_mode === L9DownstreamConsumerMode.GOVERNED_AUDIT) {
        return {
          request_id: req.request_id,
          allowance: L9DependencyAllowance.ALLOWED,
          rationale: `stable handoff surface: ${req.access_kind}`,
        };
      }
      return {
        request_id: req.request_id,
        allowance: L9DependencyAllowance.CONDITIONALLY_ALLOWED,
        rationale:
          `handoff surface under governed mode ${req.consumer_mode}`,
      };
    }

    return {
      request_id: req.request_id,
      allowance: L9DependencyAllowance.DENIED,
      rationale:
        `unknown access kind is not a declared handoff surface: ` +
        `${req.access_kind}`,
    };
  }

  isStableHandoff(k: L9DownstreamAccessKind): boolean {
    return L9_STABLE_HANDOFF_SURFACES.includes(k);
  }

  isForbidden(k: L9DownstreamAccessKind): boolean {
    return L9_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(k);
  }
}
