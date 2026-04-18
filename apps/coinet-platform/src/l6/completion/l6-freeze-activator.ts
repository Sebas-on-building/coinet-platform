/**
 * L6.9 — Freeze Activator
 *
 * §6.9.5.1 — Freeze may activate only after a valid ratification artifact
 * exists (§6.9.9.1 INV-6.9-C). Also enforces that the freeze policy
 * version used matches the policy known to the code.
 */

import {
  L6FreezePolicy,
  L6FreezeStatus,
  L6_FREEZE_POLICY_V1,
} from '../contracts/l6-freeze-policy';
import { L6CompletionState, L6RatificationViolationCode } from '../contracts/l6-completion-standard';
import { L6LayerRatificationArtifact } from '../contracts/l6-ratification-artifact';

export interface L6FreezeActivationRequest {
  readonly request_id: string;
  readonly target_status: L6FreezeStatus;
  readonly ratification: L6LayerRatificationArtifact | null;
  readonly freeze_policy: L6FreezePolicy;
}

export interface L6FreezeActivationDecision {
  readonly request_id: string;
  readonly activated_status: L6FreezeStatus;
  readonly allowed: boolean;
  readonly violations: readonly L6RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer6FreezePolicyValidator {
  activate(req: L6FreezeActivationRequest): L6FreezeActivationDecision {
    const violations: L6RatificationViolationCode[] = [];

    if (req.target_status === L6FreezeStatus.FROZEN) {
      if (!req.ratification) {
        violations.push(L6RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L6FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: 'freeze requested without ratification artifact',
        };
      }
      if (req.ratification.completion_result !== L6CompletionState.L6_PRODUCTION_READY) {
        violations.push(L6RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L6FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: `freeze requires PRODUCTION_READY; got ${req.ratification.completion_result}`,
        };
      }
      if (req.ratification.blocking_violations.length > 0) {
        violations.push(L6RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L6FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: `freeze blocked by ratification violations (${req.ratification.blocking_violations.length})`,
        };
      }
      if (req.freeze_policy.version !== L6_FREEZE_POLICY_V1.version) {
        violations.push(L6RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L6FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: `freeze policy version mismatch (got ${req.freeze_policy.version})`,
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
