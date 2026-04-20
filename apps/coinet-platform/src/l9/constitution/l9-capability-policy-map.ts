/**
 * L9.1 — Capability Policy Map (Runtime)
 *
 * §9.1.5.3 — Machine-readable capability matrix evaluator.
 */

import {
  ALL_L9_ALLOWED_CAPABILITIES,
  ALL_L9_CAPABILITY_CONTEXTS,
  type L9AllowedCapability,
  type L9CapabilityContext,
} from '../contracts/l9-constitutional-types';
import {
  getL9CapabilityDecision,
  L9_CAPABILITY_POLICY,
} from '../contracts/l9-capability-policy';
import {
  L9ConstitutionalError,
  L9ConstitutionalViolationCode,
} from '../contracts/l9-violation-codes';

export interface L9CapabilityClaimRequest {
  readonly capability: L9AllowedCapability;
  readonly context: L9CapabilityContext;
  readonly claimant: string;
}

export interface L9CapabilityClaimResult {
  readonly capability: L9AllowedCapability;
  readonly context: L9CapabilityContext;
  readonly allowed: boolean;
  readonly decision: string;
  readonly reason: string;
}

export function evaluateL9CapabilityClaim(
  req: L9CapabilityClaimRequest,
): L9CapabilityClaimResult {
  const decision = getL9CapabilityDecision(req.capability, req.context);
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

export function assertL9CapabilityClaim(req: L9CapabilityClaimRequest): void {
  const result = evaluateL9CapabilityClaim(req);
  if (!result.allowed) {
    throw new L9ConstitutionalError(
      L9ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      result.reason,
      { capability: req.capability, context: req.context, claimant: req.claimant },
    );
  }
}

export function getFullL9CapabilityMatrix(): readonly {
  capability: L9AllowedCapability;
  context: L9CapabilityContext;
  decision: string;
}[] {
  const matrix: {
    capability: L9AllowedCapability;
    context: L9CapabilityContext;
    decision: string;
  }[] = [];
  for (const cap of ALL_L9_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_L9_CAPABILITY_CONTEXTS) {
      matrix.push({
        capability: cap,
        context: ctx,
        decision: getL9CapabilityDecision(cap, ctx),
      });
    }
  }
  return matrix;
}

export function getL9CapabilityPolicyCount(): number {
  return L9_CAPABILITY_POLICY.length;
}
