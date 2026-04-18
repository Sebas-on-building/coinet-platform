/**
 * L7.1 — Capability Policy Contract
 *
 * §7.1.5.4 — Machine-readable capability policy map for each allowed
 * capability against each internal L7 context.
 */

import {
  ALL_ALLOWED_CAPABILITIES,
  ALL_CAPABILITY_CONTEXTS,
  L7AllowedCapability,
  L7CapabilityContext,
  L7CapabilityDecision,
  L7CapabilityGroup,
} from './l7-constitutional-types';

export interface CapabilityPolicyEntry {
  readonly capability: L7AllowedCapability;
  readonly group: L7CapabilityGroup;
  readonly description: string;
  readonly decisions: Record<L7CapabilityContext, L7CapabilityDecision>;
}

function allDenied(): Record<L7CapabilityContext, L7CapabilityDecision> {
  const base = {} as Record<L7CapabilityContext, L7CapabilityDecision>;
  for (const ctx of ALL_CAPABILITY_CONTEXTS) base[ctx] = 'DENIED';
  return base;
}

function decisions(
  partial: Partial<Record<L7CapabilityContext, L7CapabilityDecision>>,
): Record<L7CapabilityContext, L7CapabilityDecision> {
  return { ...allDenied(), ...partial };
}

export const L7_CAPABILITY_POLICY: readonly CapabilityPolicyEntry[] = [
  {
    capability: L7AllowedCapability.GOVERNED_INGESTION,
    group: L7CapabilityGroup.A_GOVERNED_INGESTION,
    description: 'Read legal lower-layer primitive, context, and evidence surfaces',
    decisions: decisions({
      SUBJECT_ASSEMBLY: 'ALLOWED',
      CONTRADICTION_DETECTION: 'ALLOWED',
      VALIDATION_CLASSIFICATION: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      RESTRICTION_DERIVATION_CTX: 'ALLOWED',
      PERSISTENCE_CTX: 'CONDITIONALLY_ALLOWED',
      DOWNSTREAM_READ_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.CLAIM_ASSEMBLY,
    group: L7CapabilityGroup.B_VALIDATION_ASSEMBLY,
    description: 'Construct claim candidates and validation subjects from governed surfaces',
    decisions: decisions({
      SUBJECT_ASSEMBLY: 'ALLOWED',
      REPLAY_PATH: 'CONDITIONALLY_ALLOWED',
      REPAIR_PATH: 'CONDITIONALLY_ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.SUPPORT_TESTING,
    group: L7CapabilityGroup.C_TRUTH_TESTING,
    description: 'Evaluate whether governed primitives support a claim',
    decisions: decisions({
      VALIDATION_CLASSIFICATION: 'ALLOWED',
      CONTRADICTION_DETECTION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.CONTRADICTION_TESTING,
    group: L7CapabilityGroup.C_TRUTH_TESTING,
    description: 'Evaluate whether governed primitives contradict a claim',
    decisions: decisions({
      CONTRADICTION_DETECTION: 'ALLOWED',
      VALIDATION_CLASSIFICATION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.INCOMPLETENESS_CLASSIFICATION,
    group: L7CapabilityGroup.C_TRUTH_TESTING,
    description: 'Classify incompleteness without silently filling missing surfaces',
    decisions: decisions({
      VALIDATION_CLASSIFICATION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.STALENESS_CLASSIFICATION,
    group: L7CapabilityGroup.C_TRUTH_TESTING,
    description: 'Classify staleness of supporting surfaces',
    decisions: decisions({
      VALIDATION_CLASSIFICATION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.AMBIGUITY_CLASSIFICATION,
    group: L7CapabilityGroup.C_TRUTH_TESTING,
    description: 'Classify ambiguity without silent resolution',
    decisions: decisions({
      VALIDATION_CLASSIFICATION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.DEGRADATION_CLASSIFICATION,
    group: L7CapabilityGroup.C_TRUTH_TESTING,
    description: 'Classify degraded support without hiding underlying degradation',
    decisions: decisions({
      VALIDATION_CLASSIFICATION: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.CONFIDENCE_DERIVATION,
    group: L7CapabilityGroup.D_CONFIDENCE_AND_RESTRICTION,
    description: 'Compute justified reliance levels from validation outcome',
    decisions: decisions({
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      VALIDATION_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.RESTRICTION_DERIVATION,
    group: L7CapabilityGroup.D_CONFIDENCE_AND_RESTRICTION,
    description: 'Derive downstream usage restrictions from validation outcome',
    decisions: decisions({
      RESTRICTION_DERIVATION_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.VALIDATION_PERSISTENCE,
    group: L7CapabilityGroup.E_PERSISTENCE,
    description: 'Persist validation state through governed L5 paths',
    decisions: decisions({
      PERSISTENCE_CTX: 'ALLOWED',
      REPLAY_PATH: 'DENIED',
      REPAIR_PATH: 'CONDITIONALLY_ALLOWED',
    }),
  },
  {
    capability: L7AllowedCapability.VALIDATION_READ_SERVING,
    group: L7CapabilityGroup.F_DOWNSTREAM_SERVING,
    description: 'Expose governed validation read surfaces for later layers',
    decisions: decisions({
      DOWNSTREAM_READ_CTX: 'ALLOWED',
      REPLAY_PATH: 'CONDITIONALLY_ALLOWED',
      REPAIR_PATH: 'DENIED',
    }),
  },
];

export function getCapabilityDecision(
  capability: L7AllowedCapability,
  context: L7CapabilityContext,
): L7CapabilityDecision {
  const entry = L7_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return 'DENIED';
  return entry.decisions[context];
}

export function isCapabilityAllowed(
  capability: L7AllowedCapability,
  context: L7CapabilityContext,
): boolean {
  const d = getCapabilityDecision(capability, context);
  return d === 'ALLOWED' || d === 'CONDITIONALLY_ALLOWED';
}

export function getDeniedCapabilities(
  context: L7CapabilityContext,
): readonly L7AllowedCapability[] {
  return L7_CAPABILITY_POLICY
    .filter(e => e.decisions[context] === 'DENIED')
    .map(e => e.capability);
}

export function getCapabilitiesForGroup(
  group: L7CapabilityGroup,
): readonly L7AllowedCapability[] {
  return L7_CAPABILITY_POLICY.filter(e => e.group === group).map(e => e.capability);
}

export function getAllCapabilityGroups(): readonly L7CapabilityGroup[] {
  const set = new Set<L7CapabilityGroup>();
  for (const e of L7_CAPABILITY_POLICY) set.add(e.group);
  return [...set];
}

// Stable reference to keep ALL_ALLOWED_CAPABILITIES reachable from this module.
void ALL_ALLOWED_CAPABILITIES;
