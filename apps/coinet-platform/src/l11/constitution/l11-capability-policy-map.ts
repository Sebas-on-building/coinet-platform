/**
 * L11.1 — Capability Policy Map (Runtime)
 *
 * §11.1.7 / §11.1.13 — Machine-readable capability matrix evaluator.
 */

import {
  ALL_L11_ALLOWED_CAPABILITIES,
  ALL_L11_CAPABILITY_CONTEXTS,
  type L11AllowedCapability,
  type L11CapabilityContext,
} from '../contracts/l11-constitutional-types';
import {
  getL11CapabilityDecision,
  L11_CAPABILITY_POLICY,
} from '../contracts/l11-capability-policy';
import {
  L11ConstitutionalError,
  L11ConstitutionalViolationCode,
} from '../contracts/l11-violation-codes';

export interface L11CapabilityClaimRequest {
  readonly capability: L11AllowedCapability;
  readonly context: L11CapabilityContext;
  readonly claimant: string;
}

export interface L11CapabilityClaimResult {
  readonly capability: L11AllowedCapability;
  readonly context: L11CapabilityContext;
  readonly allowed: boolean;
  readonly decision: string;
  readonly reason: string;
}

export function evaluateL11CapabilityClaim(
  req: L11CapabilityClaimRequest,
): L11CapabilityClaimResult {
  const decision = getL11CapabilityDecision(req.capability, req.context);
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

export function assertL11CapabilityClaim(req: L11CapabilityClaimRequest): void {
  const result = evaluateL11CapabilityClaim(req);
  if (!result.allowed) {
    throw new L11ConstitutionalError(
      L11ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      result.reason,
      { capability: req.capability, context: req.context, claimant: req.claimant },
    );
  }
}

export function getFullL11CapabilityMatrix(): readonly {
  capability: L11AllowedCapability;
  context: L11CapabilityContext;
  decision: string;
}[] {
  const matrix: {
    capability: L11AllowedCapability;
    context: L11CapabilityContext;
    decision: string;
  }[] = [];
  for (const cap of ALL_L11_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_L11_CAPABILITY_CONTEXTS) {
      matrix.push({
        capability: cap,
        context: ctx,
        decision: getL11CapabilityDecision(cap, ctx),
      });
    }
  }
  return matrix;
}

export function getL11CapabilityPolicyCount(): number {
  return L11_CAPABILITY_POLICY.length;
}
