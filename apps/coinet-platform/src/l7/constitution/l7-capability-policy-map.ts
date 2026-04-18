/**
 * L7.1 — Capability Policy Map (Runtime)
 *
 * §7.1.5.4 — Machine-readable capability matrix evaluator.
 */

import {
  ALL_ALLOWED_CAPABILITIES,
  ALL_CAPABILITY_CONTEXTS,
  type L7AllowedCapability,
  type L7CapabilityContext,
} from '../contracts/l7-constitutional-types';
import {
  getCapabilityDecision,
  L7_CAPABILITY_POLICY,
} from '../contracts/l7-capability-policy';
import { L7BoundaryViolationCode, L7ConstitutionalError } from '../contracts/l7-violation-codes';

export interface CapabilityClaimRequest {
  readonly capability: L7AllowedCapability;
  readonly context: L7CapabilityContext;
  readonly claimant: string;
}

export interface CapabilityClaimResult {
  readonly capability: L7AllowedCapability;
  readonly context: L7CapabilityContext;
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
    throw new L7ConstitutionalError(
      L7BoundaryViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      result.reason,
      { capability: req.capability, context: req.context, claimant: req.claimant },
    );
  }
}

export function getFullCapabilityMatrix(): readonly {
  capability: L7AllowedCapability;
  context: L7CapabilityContext;
  decision: string;
}[] {
  const matrix: {
    capability: L7AllowedCapability;
    context: L7CapabilityContext;
    decision: string;
  }[] = [];
  for (const cap of ALL_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_CAPABILITY_CONTEXTS) {
      matrix.push({ capability: cap, context: ctx, decision: getCapabilityDecision(cap, ctx) });
    }
  }
  return matrix;
}

export function getCapabilityPolicyCount(): number {
  return L7_CAPABILITY_POLICY.length;
}
