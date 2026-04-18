/**
 * L6.1 — Capability Policy Contract
 *
 * §6.1.5 — What Layer 6 may do. 9 allowed capabilities (A–I).
 * §6.1.5.3 — Machine-readable capability policy map.
 */

import {
  L6AllowedCapability, ALL_ALLOWED_CAPABILITIES,
  type L6CapabilityDecision, type L6CapabilityContext, ALL_CAPABILITY_CONTEXTS,
} from './l6-constitutional-types';

export interface CapabilityPolicyEntry {
  readonly capability: L6AllowedCapability;
  readonly description: string;
  readonly decisions: Record<L6CapabilityContext, L6CapabilityDecision>;
}

export const L6_CAPABILITY_POLICY: readonly CapabilityPolicyEntry[] = [
  {
    capability: L6AllowedCapability.GOVERNED_READ,
    description: 'Read governed inputs from L3, L4, L5',
    decisions: { FEATURE_DEFINITION: 'ALLOWED', FEATURE_RUNTIME: 'ALLOWED', EVENT_DEFINITION: 'ALLOWED', EVENT_RUNTIME: 'ALLOWED', EVIDENCE_BUILDER: 'ALLOWED', REPLAY_PATH: 'ALLOWED', REPAIR_PATH: 'ALLOWED' },
  },
  {
    capability: L6AllowedCapability.PRIMITIVE_CONSTRUCTION,
    description: 'Compute deterministic features',
    decisions: { FEATURE_DEFINITION: 'ALLOWED', FEATURE_RUNTIME: 'ALLOWED', EVENT_DEFINITION: 'DENIED', EVENT_RUNTIME: 'DENIED', EVIDENCE_BUILDER: 'DENIED', REPLAY_PATH: 'CONDITIONALLY_ALLOWED', REPAIR_PATH: 'CONDITIONALLY_ALLOWED' },
  },
  {
    capability: L6AllowedCapability.CHANGE_DETECTION,
    description: 'Detect deterministic and policy-governed events',
    decisions: { FEATURE_DEFINITION: 'DENIED', FEATURE_RUNTIME: 'DENIED', EVENT_DEFINITION: 'ALLOWED', EVENT_RUNTIME: 'ALLOWED', EVIDENCE_BUILDER: 'DENIED', REPLAY_PATH: 'CONDITIONALLY_ALLOWED', REPAIR_PATH: 'CONDITIONALLY_ALLOWED' },
  },
  {
    capability: L6AllowedCapability.PRIMITIVE_QUALIFICATION,
    description: 'Attach quality, confidence, freshness, lineage',
    decisions: { FEATURE_DEFINITION: 'ALLOWED', FEATURE_RUNTIME: 'ALLOWED', EVENT_DEFINITION: 'ALLOWED', EVENT_RUNTIME: 'ALLOWED', EVIDENCE_BUILDER: 'ALLOWED', REPLAY_PATH: 'ALLOWED', REPAIR_PATH: 'ALLOWED' },
  },
  {
    capability: L6AllowedCapability.PRIMITIVE_MATERIALIZATION,
    description: 'Materialize current feature/event state',
    decisions: { FEATURE_DEFINITION: 'DENIED', FEATURE_RUNTIME: 'ALLOWED', EVENT_DEFINITION: 'DENIED', EVENT_RUNTIME: 'ALLOWED', EVIDENCE_BUILDER: 'DENIED', REPLAY_PATH: 'DENIED', REPAIR_PATH: 'CONDITIONALLY_ALLOWED' },
  },
  {
    capability: L6AllowedCapability.HISTORICAL_PERSISTENCE,
    description: 'Persist feature/event history through L5',
    decisions: { FEATURE_DEFINITION: 'DENIED', FEATURE_RUNTIME: 'ALLOWED', EVENT_DEFINITION: 'DENIED', EVENT_RUNTIME: 'ALLOWED', EVIDENCE_BUILDER: 'DENIED', REPLAY_PATH: 'DENIED', REPAIR_PATH: 'CONDITIONALLY_ALLOWED' },
  },
  {
    capability: L6AllowedCapability.EVIDENCE_FORMATION,
    description: 'Build evidence packs for materially important outputs',
    decisions: { FEATURE_DEFINITION: 'DENIED', FEATURE_RUNTIME: 'CONDITIONALLY_ALLOWED', EVENT_DEFINITION: 'DENIED', EVENT_RUNTIME: 'CONDITIONALLY_ALLOWED', EVIDENCE_BUILDER: 'ALLOWED', REPLAY_PATH: 'ALLOWED', REPAIR_PATH: 'ALLOWED' },
  },
  {
    capability: L6AllowedCapability.REPLAY_SAFE_RECOMPUTATION,
    description: 'Recompute history or state under replay law',
    decisions: { FEATURE_DEFINITION: 'DENIED', FEATURE_RUNTIME: 'DENIED', EVENT_DEFINITION: 'DENIED', EVENT_RUNTIME: 'DENIED', EVIDENCE_BUILDER: 'DENIED', REPLAY_PATH: 'ALLOWED', REPAIR_PATH: 'DENIED' },
  },
  {
    capability: L6AllowedCapability.REPAIR_SAFE_RECOMPUTATION,
    description: 'Repair incomplete outputs without semantic drift',
    decisions: { FEATURE_DEFINITION: 'DENIED', FEATURE_RUNTIME: 'DENIED', EVENT_DEFINITION: 'DENIED', EVENT_RUNTIME: 'DENIED', EVIDENCE_BUILDER: 'DENIED', REPLAY_PATH: 'DENIED', REPAIR_PATH: 'ALLOWED' },
  },
];

export function getCapabilityDecision(
  capability: L6AllowedCapability,
  context: L6CapabilityContext,
): L6CapabilityDecision {
  const entry = L6_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return 'DENIED';
  return entry.decisions[context];
}

export function isCapabilityAllowed(
  capability: L6AllowedCapability,
  context: L6CapabilityContext,
): boolean {
  const d = getCapabilityDecision(capability, context);
  return d === 'ALLOWED' || d === 'CONDITIONALLY_ALLOWED';
}

export function getDeniedCapabilities(context: L6CapabilityContext): readonly L6AllowedCapability[] {
  return L6_CAPABILITY_POLICY.filter(e => e.decisions[context] === 'DENIED').map(e => e.capability);
}
