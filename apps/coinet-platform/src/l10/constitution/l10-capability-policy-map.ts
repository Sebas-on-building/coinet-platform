/**
 * L10.1 — Capability Policy Map (Runtime)
 *
 * §10.1.4.3 / §10.1.10.1 — Machine-readable capability matrix evaluator.
 */

import {
  ALL_L10_ALLOWED_CAPABILITIES,
  ALL_L10_CAPABILITY_CONTEXTS,
  type L10AllowedCapability,
  type L10CapabilityContext,
} from '../contracts/l10-constitutional-types';
import {
  getL10CapabilityDecision,
  L10_CAPABILITY_POLICY,
} from '../contracts/l10-capability-policy';
import {
  L10ConstitutionalError,
  L10ConstitutionalViolationCode,
} from '../contracts/l10-violation-codes';

export interface L10CapabilityClaimRequest {
  readonly capability: L10AllowedCapability;
  readonly context: L10CapabilityContext;
  readonly claimant: string;
}

export interface L10CapabilityClaimResult {
  readonly capability: L10AllowedCapability;
  readonly context: L10CapabilityContext;
  readonly allowed: boolean;
  readonly decision: string;
  readonly reason: string;
}

export function evaluateL10CapabilityClaim(
  req: L10CapabilityClaimRequest,
): L10CapabilityClaimResult {
  const decision = getL10CapabilityDecision(req.capability, req.context);
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

export function assertL10CapabilityClaim(req: L10CapabilityClaimRequest): void {
  const result = evaluateL10CapabilityClaim(req);
  if (!result.allowed) {
    throw new L10ConstitutionalError(
      L10ConstitutionalViolationCode.ILLEGAL_CAPABILITY_CLAIM,
      result.reason,
      { capability: req.capability, context: req.context, claimant: req.claimant },
    );
  }
}

export function getFullL10CapabilityMatrix(): readonly {
  capability: L10AllowedCapability;
  context: L10CapabilityContext;
  decision: string;
}[] {
  const matrix: {
    capability: L10AllowedCapability;
    context: L10CapabilityContext;
    decision: string;
  }[] = [];
  for (const cap of ALL_L10_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_L10_CAPABILITY_CONTEXTS) {
      matrix.push({
        capability: cap,
        context: ctx,
        decision: getL10CapabilityDecision(cap, ctx),
      });
    }
  }
  return matrix;
}

export function getL10CapabilityPolicyCount(): number {
  return L10_CAPABILITY_POLICY.length;
}
