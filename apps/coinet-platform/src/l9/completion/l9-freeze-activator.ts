/**
 * L9.9 — Freeze Activator
 *
 * §9.9.1.4 / §9.9.4.1 INV-9.9-B — Freeze may activate only after a
 * valid ratification artifact exists; completion must be
 * L9_PRODUCTION_READY and no blocking violations may remain. The freeze
 * policy version must match the policy known to the code.
 */

import {
  L9FreezePolicy,
  L9FreezeStatus,
  L9_FREEZE_POLICY_V1,
} from '../contracts/l9-freeze-policy';
import {
  L9CompletionState,
  L9RatificationViolationCode,
} from '../contracts/l9-completion-standard';
import {
  L9LayerRatificationArtifact,
} from '../contracts/l9-ratification-artifact';

export interface L9FreezeActivationRequest {
  readonly request_id: string;
  readonly target_status: L9FreezeStatus;
  readonly ratification: L9LayerRatificationArtifact | null;
  readonly freeze_policy: L9FreezePolicy;
}

export interface L9FreezeActivationDecision {
  readonly request_id: string;
  readonly activated_status: L9FreezeStatus;
  readonly allowed: boolean;
  readonly violations: readonly L9RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer9FreezePolicyValidator {
  activate(req: L9FreezeActivationRequest): L9FreezeActivationDecision {
    const violations: L9RatificationViolationCode[] = [];

    const needsRatification =
      req.target_status === L9FreezeStatus.FROZEN ||
      req.target_status === L9FreezeStatus.HARD_PROTECTED;

    if (needsRatification) {
      if (!req.ratification) {
        violations.push(
          L9RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L9FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: 'freeze requested without ratification artifact',
        };
      }
      if (req.ratification.completion_result !==
          L9CompletionState.L9_PRODUCTION_READY) {
        violations.push(
          L9RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L9FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze requires L9_PRODUCTION_READY; got ` +
            `${req.ratification.completion_result}`,
        };
      }
      if (req.ratification.blocking_violations.length > 0) {
        violations.push(
          L9RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L9FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze blocked by ratification violations ` +
            `(${req.ratification.blocking_violations.length})`,
        };
      }
      if (req.freeze_policy.version !== L9_FREEZE_POLICY_V1.version) {
        violations.push(
          L9RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L9FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze policy version mismatch (got ` +
            `${req.freeze_policy.version})`,
        };
      }
    }

    return {
      request_id: req.request_id,
      activated_status: req.target_status,
      allowed: true,
      violations: [],
      rationale: 'freeze activation allowed',
    };
  }
}
