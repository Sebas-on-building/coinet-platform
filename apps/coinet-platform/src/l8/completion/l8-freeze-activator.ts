/**
 * L8.9 — Freeze Activator
 *
 * §8.9.7 / §8.9.9.1 INV-8.9-B — Freeze may activate only after a valid
 * ratification artifact exists; completion must be PRODUCTION_READY
 * and no blocking violations may remain. The freeze policy version
 * must match the policy known to the code.
 */

import {
  L8FreezePolicy,
  L8FreezeStatus,
  L8_FREEZE_POLICY_V1,
} from '../contracts/l8-freeze-policy';
import {
  L8CompletionState,
  L8RatificationViolationCode,
} from '../contracts/l8-completion-standard';
import {
  L8LayerRatificationArtifact,
} from '../contracts/l8-ratification-artifact';

export interface L8FreezeActivationRequest {
  readonly request_id: string;
  readonly target_status: L8FreezeStatus;
  readonly ratification: L8LayerRatificationArtifact | null;
  readonly freeze_policy: L8FreezePolicy;
}

export interface L8FreezeActivationDecision {
  readonly request_id: string;
  readonly activated_status: L8FreezeStatus;
  readonly allowed: boolean;
  readonly violations: readonly L8RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer8FreezePolicyValidator {
  activate(req: L8FreezeActivationRequest): L8FreezeActivationDecision {
    const violations: L8RatificationViolationCode[] = [];

    const needsRatification =
      req.target_status === L8FreezeStatus.FROZEN ||
      req.target_status === L8FreezeStatus.HARD_PROTECTED;

    if (needsRatification) {
      if (!req.ratification) {
        violations.push(
          L8RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L8FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: 'freeze requested without ratification artifact',
        };
      }
      if (req.ratification.completion_result !==
          L8CompletionState.L8_PRODUCTION_READY) {
        violations.push(
          L8RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L8FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze requires PRODUCTION_READY; got ` +
            `${req.ratification.completion_result}`,
        };
      }
      if (req.ratification.blocking_violations.length > 0) {
        violations.push(
          L8RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L8FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze blocked by ratification violations ` +
            `(${req.ratification.blocking_violations.length})`,
        };
      }
      if (req.freeze_policy.version !== L8_FREEZE_POLICY_V1.version) {
        violations.push(
          L8RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L8FreezeStatus.OPEN,
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
