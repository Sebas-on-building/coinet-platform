/**
 * L8.1 — Capability Policy Contract
 *
 * §8.1.4.6 — Machine-readable capability policy map for each allowed
 * capability against each internal L8 context.
 */

import {
  ALL_L8_ALLOWED_CAPABILITIES,
  ALL_L8_CAPABILITY_CONTEXTS,
  L8AllowedCapability,
  L8CapabilityContext,
  L8CapabilityDecision,
  L8CapabilityGroup,
} from './l8-constitutional-types';

export interface L8CapabilityPolicyEntry {
  readonly capability: L8AllowedCapability;
  readonly group: L8CapabilityGroup;
  readonly description: string;
  readonly decisions: Record<L8CapabilityContext, L8CapabilityDecision>;
}

function allDenied(): Record<L8CapabilityContext, L8CapabilityDecision> {
  const base = {} as Record<L8CapabilityContext, L8CapabilityDecision>;
  for (const ctx of ALL_L8_CAPABILITY_CONTEXTS) base[ctx] = 'DENIED';
  return base;
}

function decisions(
  partial: Partial<Record<L8CapabilityContext, L8CapabilityDecision>>,
): Record<L8CapabilityContext, L8CapabilityDecision> {
  return { ...allDenied(), ...partial };
}

export const L8_CAPABILITY_POLICY: readonly L8CapabilityPolicyEntry[] = [
  {
    capability: L8AllowedCapability.GOVERNED_INGESTION,
    group: L8CapabilityGroup.A_INPUT_CONSUMPTION,
    description: 'Read legal lower-layer primitive, context, validation, and evidence surfaces',
    decisions: decisions({
      REGIME_ASSEMBLY: 'ALLOWED',
      REGIME_CLASSIFICATION: 'ALLOWED',
      TRANSITION_DETECTION_CTX: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      MULTIPLIER_DERIVATION_CTX: 'ALLOWED',
      PERSISTENCE_CTX: 'CONDITIONALLY_ALLOWED',
      DOWNSTREAM_READ_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.HISTORICAL_WINDOW_READ,
    group: L8CapabilityGroup.A_INPUT_CONSUMPTION,
    description: 'Read historical lower-layer windows for regime trend conditioning',
    decisions: decisions({
      REGIME_ASSEMBLY: 'ALLOWED',
      REGIME_CLASSIFICATION: 'ALLOWED',
      TRANSITION_DETECTION_CTX: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.EVIDENCE_CONTEXT_READ,
    group: L8CapabilityGroup.A_INPUT_CONSUMPTION,
    description: 'Read evidence-backed context surfaces from L6/L7 only',
    decisions: decisions({
      REGIME_ASSEMBLY: 'ALLOWED',
      REGIME_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      TRANSITION_DETECTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.PRIMARY_REGIME_CLASSIFICATION,
    group: L8CapabilityGroup.B_ENVIRONMENT_CLASSIFICATION,
    description: 'Determine the primary regime across regime dimensions',
    decisions: decisions({
      REGIME_CLASSIFICATION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.SECONDARY_REGIME_CLASSIFICATION,
    group: L8CapabilityGroup.B_ENVIRONMENT_CLASSIFICATION,
    description: 'Determine secondary regimes when material',
    decisions: decisions({
      REGIME_CLASSIFICATION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.MULTI_FAMILY_COEXISTENCE,
    group: L8CapabilityGroup.B_ENVIRONMENT_CLASSIFICATION,
    description: 'Preserve multi-family coexistence without flattening it',
    decisions: decisions({
      REGIME_CLASSIFICATION: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.TRANSITION_DETECTION,
    group: L8CapabilityGroup.B_ENVIRONMENT_CLASSIFICATION,
    description: 'Detect regime transitions and transition candidates',
    decisions: decisions({
      TRANSITION_DETECTION_CTX: 'ALLOWED',
      REGIME_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.REGIME_CONFIDENCE_DERIVATION,
    group: L8CapabilityGroup.C_RELIANCE_AND_CONDITIONING,
    description: 'Compute confidence of the regime call — not final judgment confidence',
    decisions: decisions({
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      REGIME_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.TRANSITION_RISK_DERIVATION,
    group: L8CapabilityGroup.C_RELIANCE_AND_CONDITIONING,
    description: 'Compute transition risk as a posture, not a signal of future state finality',
    decisions: decisions({
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      TRANSITION_DETECTION_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.MULTIPLIER_DERIVATION,
    group: L8CapabilityGroup.C_RELIANCE_AND_CONDITIONING,
    description:
      'Derive interpretive multipliers for later layers — not scores, not recommendations',
    decisions: decisions({
      MULTIPLIER_DERIVATION_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.REGIME_PERSISTENCE,
    group: L8CapabilityGroup.D_DURABILITY_AND_SERVING,
    description: 'Persist regime state through governed L5 paths',
    decisions: decisions({
      PERSISTENCE_CTX: 'ALLOWED',
      REPLAY_PATH: 'DENIED',
      REPAIR_PATH: 'CONDITIONALLY_ALLOWED',
    }),
  },
  {
    capability: L8AllowedCapability.REGIME_READ_SERVING,
    group: L8CapabilityGroup.D_DURABILITY_AND_SERVING,
    description: 'Expose governed regime read surfaces for later layers',
    decisions: decisions({
      DOWNSTREAM_READ_CTX: 'ALLOWED',
      REPLAY_PATH: 'CONDITIONALLY_ALLOWED',
      REPAIR_PATH: 'DENIED',
    }),
  },
  {
    capability: L8AllowedCapability.REGIME_REPLAY_REPAIR,
    group: L8CapabilityGroup.D_DURABILITY_AND_SERVING,
    description: 'Replay and repair regime outputs through governed L5 paths',
    decisions: decisions({
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
      PERSISTENCE_CTX: 'CONDITIONALLY_ALLOWED',
    }),
  },
];

export function getL8CapabilityDecision(
  capability: L8AllowedCapability,
  context: L8CapabilityContext,
): L8CapabilityDecision {
  const entry = L8_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return 'DENIED';
  return entry.decisions[context];
}

export function isL8CapabilityAllowed(
  capability: L8AllowedCapability,
  context: L8CapabilityContext,
): boolean {
  const d = getL8CapabilityDecision(capability, context);
  return d === 'ALLOWED' || d === 'CONDITIONALLY_ALLOWED';
}

export function getL8DeniedCapabilities(
  context: L8CapabilityContext,
): readonly L8AllowedCapability[] {
  return L8_CAPABILITY_POLICY
    .filter(e => e.decisions[context] === 'DENIED')
    .map(e => e.capability);
}

export function getL8CapabilitiesForGroup(
  group: L8CapabilityGroup,
): readonly L8AllowedCapability[] {
  return L8_CAPABILITY_POLICY.filter(e => e.group === group).map(e => e.capability);
}

export function getAllL8CapabilityGroups(): readonly L8CapabilityGroup[] {
  const set = new Set<L8CapabilityGroup>();
  for (const e of L8_CAPABILITY_POLICY) set.add(e.group);
  return [...set];
}

// Stable reference to keep ALL_L8_ALLOWED_CAPABILITIES reachable from this module.
void ALL_L8_ALLOWED_CAPABILITIES;
