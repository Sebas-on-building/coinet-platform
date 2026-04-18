/**
 * L6.1 — Capability Policy Map (Runtime)
 *
 * §6.1.5.3 — Machine-readable capability matrix.
 */

import {
  type L6AllowedCapability, type L6CapabilityContext,
  ALL_ALLOWED_CAPABILITIES, ALL_CAPABILITY_CONTEXTS,
} from '../contracts/l6-constitutional-types';
import {
  getCapabilityDecision, isCapabilityAllowed, getDeniedCapabilities,
  L6_CAPABILITY_POLICY,
} from '../contracts/l6-capability-policy';
import { L6BoundaryViolationCode, L6ConstitutionalError } from '../contracts/l6-violation-codes';

export interface CapabilityClaimRequest {
  readonly capability: L6AllowedCapability;
  readonly context: L6CapabilityContext;
  readonly claimant: string;
}

export interface CapabilityClaimResult {
  readonly capability: L6AllowedCapability;
  readonly context: L6CapabilityContext;
  readonly allowed: boolean;
  readonly decision: string;
  readonly reason: string;
}

export function evaluateCapabilityClaim(req: CapabilityClaimRequest): CapabilityClaimResult {
  const decision = getCapabilityDecision(req.capability, req.context);
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

export function assertCapabilityClaim(req: CapabilityClaimRequest): void {
  const result = evaluateCapabilityClaim(req);
  if (!result.allowed) {
    throw new L6ConstitutionalError(
      L6BoundaryViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      result.reason,
      { capability: req.capability, context: req.context, claimant: req.claimant },
    );
  }
}

export function getFullCapabilityMatrix(): readonly {
  capability: L6AllowedCapability;
  context: L6CapabilityContext;
  decision: string;
}[] {
  const matrix: { capability: L6AllowedCapability; context: L6CapabilityContext; decision: string }[] = [];
  for (const cap of ALL_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_CAPABILITY_CONTEXTS) {
      matrix.push({ capability: cap, context: ctx, decision: getCapabilityDecision(cap, ctx) });
    }
  }
  return matrix;
}

export function getCapabilityPolicyCount(): number {
  return L6_CAPABILITY_POLICY.length;
}
