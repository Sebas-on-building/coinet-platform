/**
 * L8.9 — Downstream Dependency Validator
 *
 * §8.9.8.5 / §8.9.9.1 INV-8.9-D,E — Validates incoming downstream
 * dependency requests against the stable handoff law.
 *
 * - Handoff surfaces are ALLOWED under NORMAL_CONSUMPTION.
 * - AD_HOC_REGIME_RECLASSIFICATION is only CONDITIONALLY_ALLOWED under
 *   GOVERNED_REPLAY / GOVERNED_REPAIR / GOVERNED_AUDIT modes.
 * - Forbidden kinds are DENIED.
 */

import {
  L8DependencyAllowance,
  L8DownstreamAccessKind,
  L8DownstreamConsumerMode,
  L8DownstreamDependencyDecision,
  L8DownstreamDependencyRequest,
  L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L8_GOVERNED_ONLY_ACCESS_KINDS,
  L8_STABLE_HANDOFF_SURFACES,
} from '../contracts/l8-downstream-dependency';

export class Layer8DownstreamDependencyValidator {
  validate(
    req: L8DownstreamDependencyRequest,
  ): L8DownstreamDependencyDecision {
    if (L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(req.access_kind)) {
      return {
        request_id: req.request_id,
        allowance: L8DependencyAllowance.DENIED,
        rationale:
          `forbidden downstream access kind: ${req.access_kind}`,
      };
    }

    if (L8_GOVERNED_ONLY_ACCESS_KINDS.includes(req.access_kind)) {
      const governed =
        req.consumer_mode === L8DownstreamConsumerMode.GOVERNED_REPLAY ||
        req.consumer_mode === L8DownstreamConsumerMode.GOVERNED_REPAIR ||
        req.consumer_mode === L8DownstreamConsumerMode.GOVERNED_AUDIT;
      if (!governed) {
        return {
          request_id: req.request_id,
          allowance: L8DependencyAllowance.DENIED,
          rationale:
            `access kind ${req.access_kind} requires governed mode`,
        };
      }
      return {
        request_id: req.request_id,
        allowance: L8DependencyAllowance.CONDITIONALLY_ALLOWED,
        rationale:
          `governed-only access granted under ${req.consumer_mode}`,
      };
    }

    if (L8_STABLE_HANDOFF_SURFACES.includes(req.access_kind)) {
      if (req.consumer_mode === L8DownstreamConsumerMode.NORMAL_CONSUMPTION ||
          req.consumer_mode === L8DownstreamConsumerMode.GOVERNED_AUDIT) {
        return {
          request_id: req.request_id,
          allowance: L8DependencyAllowance.ALLOWED,
          rationale: `stable handoff surface: ${req.access_kind}`,
        };
      }
      return {
        request_id: req.request_id,
        allowance: L8DependencyAllowance.CONDITIONALLY_ALLOWED,
        rationale:
          `handoff surface under governed mode ${req.consumer_mode}`,
      };
    }

    return {
      request_id: req.request_id,
      allowance: L8DependencyAllowance.DENIED,
      rationale:
        `unknown access kind is not a declared handoff surface: ` +
        `${req.access_kind}`,
    };
  }

  isStableHandoff(k: L8DownstreamAccessKind): boolean {
    return L8_STABLE_HANDOFF_SURFACES.includes(k);
  }

  isForbidden(k: L8DownstreamAccessKind): boolean {
    return L8_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(k);
  }
}
