/**
 * L12.1 — Capability Policy Map (Runtime)
 *
 * §12.1.11 — Machine-readable capability matrix evaluator for the
 * Scenario Engine.
 */

import {
  ALL_L12_ALLOWED_CAPABILITIES,
  ALL_L12_CAPABILITY_CONTEXTS,
  L12CapabilityDecision,
  type L12AllowedCapability,
  type L12CapabilityContext,
} from '../contracts/l12-constitutional-types';
import {
  getL12CapabilityDecision,
  L12_CAPABILITY_POLICY,
} from '../contracts/l12-capability-policy';
import {
  L12ConstitutionalError,
  L12ConstitutionalViolationCode,
} from '../contracts/l12-violation-codes';

export interface L12CapabilityClaimRequest {
  readonly capability: L12AllowedCapability;
  readonly context: L12CapabilityContext;
  readonly claimant: string;
}

export interface L12CapabilityClaimResult {
  readonly capability: L12AllowedCapability;
  readonly context: L12CapabilityContext;
  readonly allowed: boolean;
  readonly decision: L12CapabilityDecision;
  readonly reason: string;
}

export function evaluateL12CapabilityClaim(
  req: L12CapabilityClaimRequest,
): L12CapabilityClaimResult {
  const decision = getL12CapabilityDecision(req.capability, req.context);
  const allowed =
    decision === L12CapabilityDecision.ALLOWED ||
    decision === L12CapabilityDecision.CONDITIONALLY_ALLOWED;

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

export function assertL12CapabilityClaim(req: L12CapabilityClaimRequest): void {
  const result = evaluateL12CapabilityClaim(req);
  if (!result.allowed) {
    throw new L12ConstitutionalError(
      L12ConstitutionalViolationCode.L12C_ILLEGAL_CAPABILITY_CLAIM,
      result.reason,
      { capability: req.capability, context: req.context, claimant: req.claimant },
    );
  }
}

export function getFullL12CapabilityMatrix(): readonly {
  capability: L12AllowedCapability;
  context: L12CapabilityContext;
  decision: L12CapabilityDecision;
}[] {
  const matrix: {
    capability: L12AllowedCapability;
    context: L12CapabilityContext;
    decision: L12CapabilityDecision;
  }[] = [];
  for (const cap of ALL_L12_ALLOWED_CAPABILITIES) {
    for (const ctx of ALL_L12_CAPABILITY_CONTEXTS) {
      matrix.push({ capability: cap, context: ctx, decision: getL12CapabilityDecision(cap, ctx) });
    }
  }
  return matrix;
}

void L12_CAPABILITY_POLICY;
