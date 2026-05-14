/**
 * L13.1 — Capability Policy Map (Runtime)
 *
 * §13.1.9 — Machine-readable capability matrix evaluator for the
 * AI Judgment & Explanation Layer.
 */

import {
  ALL_L13_ALLOWED_CAPABILITIES,
  ALL_L13_CAPABILITY_CONTEXTS,
  L13CapabilityDecision,
  type L13AllowedCapability,
  type L13CapabilityContext,
} from '../contracts/l13-constitutional-types';
import {
  getL13CapabilityDecision,
  L13_CAPABILITY_POLICY,
} from '../contracts/l13-capability-policy';
import {
  L13ConstitutionalError,
  L13ConstitutionalViolationCode,
} from '../contracts/l13-violation-codes';

export interface L13CapabilityClaimRequest {
  readonly capability: L13AllowedCapability;
  readonly context: L13CapabilityContext;
  readonly claimant: string;
}

export interface L13CapabilityClaimResult {
  readonly capability: L13AllowedCapability;
  readonly context: L13CapabilityContext;
  readonly allowed: boolean;
  readonly decision: L13CapabilityDecision;
  readonly reason: string;
}

export function evaluateL13CapabilityClaim(
  req: L13CapabilityClaimRequest,
): L13CapabilityClaimResult {
  const decision = getL13CapabilityDecision(req.capability, req.context);
  const allowed =
    decision === L13CapabilityDecision.ALLOWED ||
    decision === L13CapabilityDecision.CONDITIONALLY_ALLOWED;

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

export function assertL13CapabilityClaim(
  req: L13CapabilityClaimRequest,
): void {
  const result = evaluateL13CapabilityClaim(req);
  if (!result.allowed) {
    throw new L13ConstitutionalError(
      L13ConstitutionalViolationCode.L13C_CAPABILITY_DENIED,
      result.reason,
      {
        capability: req.capability,
        context: req.context,
        claimant: req.claimant,
      },
    );
  }
}

export function getFullL13CapabilityMatrix(): readonly {
  capability: L13AllowedCapability;
  context: L13CapabilityContext;
  decision: L13CapabilityDecision;
}[] {
  const matrix: {
    capability: L13AllowedCapability;
    context: L13CapabilityContext;
    decision: L13CapabilityDecision;
  }[] = [];
  for (const cap of ALL_L13_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_L13_CAPABILITY_CONTEXTS) {
      matrix.push({
        capability: cap,
        context: ctx,
        decision: getL13CapabilityDecision(cap, ctx),
      });
    }
  }
  return matrix;
}

void L13_CAPABILITY_POLICY;
