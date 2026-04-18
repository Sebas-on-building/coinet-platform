/**
 * L7.9 — Freeze Activator
 *
 * §7.9.5.6 / §7.9.9.1 INV-7.9-C — Freeze may activate only after a
 * valid ratification artifact exists; completion must be
 * PRODUCTION_READY and no blocking violations may remain. The freeze
 * policy version must match the policy known to the code.
 */

import {
  L7FreezePolicy,
  L7FreezeStatus,
  L7_FREEZE_POLICY_V1,
} from '../contracts/l7-freeze-policy';
import {
  L7CompletionState,
  L7RatificationViolationCode,
} from '../contracts/l7-completion-standard';
import { L7LayerRatificationArtifact } from '../contracts/l7-ratification-artifact';

export interface L7FreezeActivationRequest {
  readonly request_id: string;
  readonly target_status: L7FreezeStatus;
  readonly ratification: L7LayerRatificationArtifact | null;
  readonly freeze_policy: L7FreezePolicy;
}

export interface L7FreezeActivationDecision {
  readonly request_id: string;
  readonly activated_status: L7FreezeStatus;
  readonly allowed: boolean;
  readonly violations: readonly L7RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer7FreezePolicyValidator {
  activate(req: L7FreezeActivationRequest): L7FreezeActivationDecision {
    const violations: L7RatificationViolationCode[] = [];

    const needsRatification =
      req.target_status === L7FreezeStatus.FROZEN ||
      req.target_status === L7FreezeStatus.HARD_PROTECTED;

    if (needsRatification) {
      if (!req.ratification) {
        violations.push(L7RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L7FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: 'freeze requested without ratification artifact',
        };
      }
      if (req.ratification.completion_result !==
          L7CompletionState.L7_PRODUCTION_READY) {
        violations.push(L7RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L7FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze requires PRODUCTION_READY; got ${req.ratification.completion_result}`,
        };
      }
      if (req.ratification.blocking_violations.length > 0) {
        violations.push(L7RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L7FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze blocked by ratification violations ` +
            `(${req.ratification.blocking_violations.length})`,
        };
      }
      if (req.freeze_policy.version !== L7_FREEZE_POLICY_V1.version) {
        violations.push(L7RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L7FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze policy version mismatch (got ${req.freeze_policy.version})`,
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
