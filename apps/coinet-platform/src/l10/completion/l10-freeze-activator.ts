/**
 * L10.9 — Freeze Activator
 *
 * §10.9.5 / §10.9.13 INV-10.9-B — Freeze may activate only after a
 * valid ratification artifact exists; completion must be
 * L10_PRODUCTION_READY and no blocking violations may remain. The
 * freeze policy version must match the policy known to the code.
 */

import {
  L10FreezePolicy,
  L10FreezeStatus,
  L10_FREEZE_POLICY_V1,
} from '../contracts/l10-freeze-policy';
import {
  L10CompletionState,
  L10RatificationViolationCode,
} from '../contracts/l10-completion-standard';
import {
  L10LayerRatificationArtifact,
} from '../contracts/l10-ratification-artifact';

export interface L10FreezeActivationRequest {
  readonly request_id: string;
  readonly target_status: L10FreezeStatus;
  readonly ratification: L10LayerRatificationArtifact | null;
  readonly freeze_policy: L10FreezePolicy;
}

export interface L10FreezeActivationDecision {
  readonly request_id: string;
  readonly activated_status: L10FreezeStatus;
  readonly allowed: boolean;
  readonly violations: readonly L10RatificationViolationCode[];
  readonly rationale: string;
}

export class Layer10FreezePolicyValidator {
  activate(req: L10FreezeActivationRequest): L10FreezeActivationDecision {
    const violations: L10RatificationViolationCode[] = [];

    const needsRatification =
      req.target_status === L10FreezeStatus.FROZEN ||
      req.target_status === L10FreezeStatus.HARD_PROTECTED;

    if (needsRatification) {
      if (!req.ratification) {
        violations.push(
          L10RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L10FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale: 'freeze requested without ratification artifact',
        };
      }
      if (req.ratification.completion_result !==
          L10CompletionState.L10_PRODUCTION_READY) {
        violations.push(
          L10RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L10FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze requires L10_PRODUCTION_READY; got ` +
            `${req.ratification.completion_result}`,
        };
      }
      if (req.ratification.blocking_violations.length > 0) {
        violations.push(
          L10RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L10FreezeStatus.OPEN,
          allowed: false,
          violations,
          rationale:
            `freeze blocked by ratification violations ` +
            `(${req.ratification.blocking_violations.length})`,
        };
      }
      if (req.freeze_policy.version !== L10_FREEZE_POLICY_V1.version) {
        violations.push(
          L10RatificationViolationCode.FREEZE_WITHOUT_RATIFICATION);
        return {
          request_id: req.request_id,
          activated_status: L10FreezeStatus.OPEN,
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
