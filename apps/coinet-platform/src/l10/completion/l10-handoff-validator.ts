/**
 * L10.9 — Handoff Validator (Downstream Dependency Validator)
 *
 * §10.9.7 / §10.9.13 INV-10.9-C — Validates incoming downstream
 * dependency requests against the stable handoff law.
 *
 * - Stable handoff surfaces are ALLOWED under NORMAL_CONSUMPTION and
 *   GOVERNED_AUDIT, CONDITIONALLY_ALLOWED under governed
 *   replay/repair.
 * - AD_HOC_HYPOTHESIS_REPLAY / AD_HOC_HYPOTHESIS_REPAIR are only
 *   CONDITIONALLY_ALLOWED under GOVERNED_REPLAY / GOVERNED_REPAIR /
 *   GOVERNED_AUDIT modes.
 * - Forbidden kinds are DENIED.
 * - Unknown access kinds are DENIED.
 */

import {
  L10DependencyAllowance,
  L10DownstreamAccessKind,
  L10DownstreamConsumerMode,
  L10DownstreamDependencyDecision,
  L10DownstreamDependencyRequest,
  L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS,
  L10_GOVERNED_ONLY_ACCESS_KINDS,
  L10_STABLE_HANDOFF_SURFACES,
} from '../contracts/l10-downstream-dependency';

export class Layer10HandoffValidator {
  validate(
    req: L10DownstreamDependencyRequest,
  ): L10DownstreamDependencyDecision {
    if (L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(req.access_kind)) {
      return {
        request_id: req.request_id,
        allowance: L10DependencyAllowance.DENIED,
        rationale:
          `forbidden downstream access kind: ${req.access_kind}`,
      };
    }

    if (L10_GOVERNED_ONLY_ACCESS_KINDS.includes(req.access_kind)) {
      const governed =
        req.consumer_mode === L10DownstreamConsumerMode.GOVERNED_REPLAY ||
        req.consumer_mode === L10DownstreamConsumerMode.GOVERNED_REPAIR ||
        req.consumer_mode === L10DownstreamConsumerMode.GOVERNED_AUDIT;
      if (!governed) {
        return {
          request_id: req.request_id,
          allowance: L10DependencyAllowance.DENIED,
          rationale:
            `access kind ${req.access_kind} requires governed mode`,
        };
      }
      return {
        request_id: req.request_id,
        allowance: L10DependencyAllowance.CONDITIONALLY_ALLOWED,
        rationale:
          `governed-only access granted under ${req.consumer_mode}`,
      };
    }

    if (L10_STABLE_HANDOFF_SURFACES.includes(req.access_kind)) {
      if (req.consumer_mode ===
            L10DownstreamConsumerMode.NORMAL_CONSUMPTION ||
          req.consumer_mode ===
            L10DownstreamConsumerMode.GOVERNED_AUDIT) {
        return {
          request_id: req.request_id,
          allowance: L10DependencyAllowance.ALLOWED,
          rationale: `stable handoff surface: ${req.access_kind}`,
        };
      }
      return {
        request_id: req.request_id,
        allowance: L10DependencyAllowance.CONDITIONALLY_ALLOWED,
        rationale:
          `handoff surface under governed mode ${req.consumer_mode}`,
      };
    }

    return {
      request_id: req.request_id,
      allowance: L10DependencyAllowance.DENIED,
      rationale:
        `unknown access kind is not a declared handoff surface: ` +
        `${req.access_kind}`,
    };
  }

  isStableHandoff(k: L10DownstreamAccessKind): boolean {
    return L10_STABLE_HANDOFF_SURFACES.includes(k);
  }

  isForbidden(k: L10DownstreamAccessKind): boolean {
    return L10_FORBIDDEN_DOWNSTREAM_ACCESS_KINDS.includes(k);
  }
}
