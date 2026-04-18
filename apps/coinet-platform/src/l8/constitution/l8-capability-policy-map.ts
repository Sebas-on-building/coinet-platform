/**
 * L8.1 — Capability Policy Map (Runtime)
 *
 * §8.1.4.6 — Machine-readable capability matrix evaluator.
 */

import {
  ALL_L8_ALLOWED_CAPABILITIES,
  ALL_L8_CAPABILITY_CONTEXTS,
  type L8AllowedCapability,
  type L8CapabilityContext,
} from '../contracts/l8-constitutional-types';
import {
  getL8CapabilityDecision,
  L8_CAPABILITY_POLICY,
} from '../contracts/l8-capability-policy';
import {
  L8ConstitutionalError,
  L8ConstitutionalViolationCode,
} from '../contracts/l8-violation-codes';

export interface L8CapabilityClaimRequest {
  readonly capability: L8AllowedCapability;
  readonly context: L8CapabilityContext;
  readonly claimant: string;
}

export interface L8CapabilityClaimResult {
  readonly capability: L8AllowedCapability;
  readonly context: L8CapabilityContext;
  readonly allowed: boolean;
  readonly decision: string;
  readonly reason: string;
}

export function evaluateL8CapabilityClaim(
  req: L8CapabilityClaimRequest,
): L8CapabilityClaimResult {
  const decision = getL8CapabilityDecision(req.capability, req.context);
  const allowed = decision === 'ALLOWED' || decision === 'CONDITIONALLY_ALLOWED';

  return {
    capability: req.capability,
    context: req.context,
    allowed,
    decision,
    reason: allowed
      ? `${req.capability} is ${decision} in ${req.context}`
      : `${req.capability} is DENIED in ${req.context}`,
  };
}

export function assertL8CapabilityClaim(req: L8CapabilityClaimRequest): void {
  const result = evaluateL8CapabilityClaim(req);
  if (!result.allowed) {
    throw new L8ConstitutionalError(
      L8ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      result.reason,
      { capability: req.capability, context: req.context, claimant: req.claimant },
    );
  }
}

export function getFullL8CapabilityMatrix(): readonly {
  capability: L8AllowedCapability;
  context: L8CapabilityContext;
  decision: string;
}[] {
  const matrix: {
    capability: L8AllowedCapability;
    context: L8CapabilityContext;
    decision: string;
  }[] = [];
  for (const cap of ALL_L8_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_L8_CAPABILITY_CONTEXTS) {
      matrix.push({
        capability: cap,
        context: ctx,
        decision: getL8CapabilityDecision(cap, ctx),
      });
    }
  }
  return matrix;
}

export function getL8CapabilityPolicyCount(): number {
  return L8_CAPABILITY_POLICY.length;
}
