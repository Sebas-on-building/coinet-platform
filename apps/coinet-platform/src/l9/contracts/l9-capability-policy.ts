/**
 * L9.1 — Capability Policy Contract
 *
 * §9.1.5.3 — Machine-readable capability policy map for each allowed
 * capability against each internal L9 context.
 */

import {
  ALL_L9_ALLOWED_CAPABILITIES,
  ALL_L9_CAPABILITY_CONTEXTS,
  L9AllowedCapability,
  L9CapabilityContext,
  L9CapabilityDecision,
  L9CapabilityGroup,
} from './l9-constitutional-types';

export interface L9CapabilityPolicyEntry {
  readonly capability: L9AllowedCapability;
  readonly group: L9CapabilityGroup;
  readonly description: string;
  readonly decisions: Record<L9CapabilityContext, L9CapabilityDecision>;
}

function allDenied(): Record<L9CapabilityContext, L9CapabilityDecision> {
  const base = {} as Record<L9CapabilityContext, L9CapabilityDecision>;
  for (const ctx of ALL_L9_CAPABILITY_CONTEXTS) base[ctx] = 'DENIED';
  return base;
}

function decisions(
  partial: Partial<Record<L9CapabilityContext, L9CapabilityDecision>>,
): Record<L9CapabilityContext, L9CapabilityDecision> {
  return { ...allDenied(), ...partial };
}

export const L9_CAPABILITY_POLICY: readonly L9CapabilityPolicyEntry[] = [
  // ── A — Input consumption ──
  {
    capability: L9AllowedCapability.GOVERNED_INGESTION,
    group: L9CapabilityGroup.A_INPUT_CONSUMPTION,
    description:
      'Read governed lower-layer primitive, context, validation, regime, and evidence surfaces',
    decisions: decisions({
      SEQUENCE_ASSEMBLY: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'ALLOWED',
      LEAD_LAG_DETECTION_CTX: 'ALLOWED',
      CHANGE_POINT_DETECTION_CTX: 'ALLOWED',
      PHASE_CLASSIFICATION_CTX: 'ALLOWED',
      DECAY_CLASSIFICATION_CTX: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      RESTRICTION_DERIVATION_CTX: 'ALLOWED',
      PERSISTENCE_CTX: 'CONDITIONALLY_ALLOWED',
      DOWNSTREAM_READ_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.HISTORICAL_WINDOW_READ,
    group: L9CapabilityGroup.A_INPUT_CONSUMPTION,
    description: 'Read historical lower-layer windows for sequence construction and decay modeling',
    decisions: decisions({
      SEQUENCE_ASSEMBLY: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'ALLOWED',
      LEAD_LAG_DETECTION_CTX: 'ALLOWED',
      CHANGE_POINT_DETECTION_CTX: 'ALLOWED',
      PHASE_CLASSIFICATION_CTX: 'ALLOWED',
      DECAY_CLASSIFICATION_CTX: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.EVIDENCE_CONTEXT_READ,
    group: L9CapabilityGroup.A_INPUT_CONSUMPTION,
    description: 'Read evidence-backed context surfaces from L6/L7/L8 — never as decisive chain support',
    decisions: decisions({
      SEQUENCE_ASSEMBLY: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      LEAD_LAG_DETECTION_CTX: 'CONDITIONALLY_ALLOWED',
      CHANGE_POINT_DETECTION_CTX: 'CONDITIONALLY_ALLOWED',
      PHASE_CLASSIFICATION_CTX: 'CONDITIONALLY_ALLOWED',
      DECAY_CLASSIFICATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── B — Sequence construction ──
  {
    capability: L9AllowedCapability.ORDERED_CHAIN_ASSEMBLY,
    group: L9CapabilityGroup.B_SEQUENCE_CONSTRUCTION,
    description: 'Assemble an ordered signal chain from governed primitive and validation surfaces',
    decisions: decisions({
      SEQUENCE_ASSEMBLY: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.LEAD_LAG_DETECTION,
    group: L9CapabilityGroup.B_SEQUENCE_CONSTRUCTION,
    description: 'Detect governed lead-lag structure across related signals',
    decisions: decisions({
      LEAD_LAG_DETECTION_CTX: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.CHANGE_POINT_DETECTION,
    group: L9CapabilityGroup.B_SEQUENCE_CONSTRUCTION,
    description: 'Detect governed change points in an ordered chain',
    decisions: decisions({
      CHANGE_POINT_DETECTION_CTX: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.PHASE_PROGRESSION_CLASSIFICATION,
    group: L9CapabilityGroup.B_SEQUENCE_CONSTRUCTION,
    description: 'Classify phase progression of a chain — never as final alpha/actionable phase',
    decisions: decisions({
      PHASE_CLASSIFICATION_CTX: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.DECAY_CLASSIFICATION,
    group: L9CapabilityGroup.B_SEQUENCE_CONSTRUCTION,
    description: 'Classify time-decay of signal significance within a chain',
    decisions: decisions({
      DECAY_CLASSIFICATION_CTX: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.POST_EVENT_WINDOW_MODELING,
    group: L9CapabilityGroup.B_SEQUENCE_CONSTRUCTION,
    description:
      'Model governed post-event behaviour windows only when anchored on a valid shock/event',
    decisions: decisions({
      CHANGE_POINT_DETECTION_CTX: 'ALLOWED',
      PHASE_CLASSIFICATION_CTX: 'CONDITIONALLY_ALLOWED',
      DECAY_CLASSIFICATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── C — Posture and conditioning ──
  {
    capability: L9AllowedCapability.SEQUENCE_AMBIGUITY_CLASSIFICATION,
    group: L9CapabilityGroup.C_POSTURE_AND_CONDITIONING,
    description:
      'Classify ordering ambiguity explicitly — preserve it, never flatten into fake clean ordering',
    decisions: decisions({
      SEQUENCE_CLASSIFICATION: 'ALLOWED',
      LEAD_LAG_DETECTION_CTX: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.CAUSAL_RESTRAINT_TAGGING,
    group: L9CapabilityGroup.C_POSTURE_AND_CONDITIONING,
    description:
      'Tag sequences with causal restraint — temporal adjacency is not causal certainty',
    decisions: decisions({
      SEQUENCE_CLASSIFICATION: 'ALLOWED',
      LEAD_LAG_DETECTION_CTX: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.SEQUENCE_CONFIDENCE_DERIVATION,
    group: L9CapabilityGroup.C_POSTURE_AND_CONDITIONING,
    description:
      'Compute sequence-specific confidence — not L7 confidence, not final judgment confidence',
    decisions: decisions({
      CONFIDENCE_DERIVATION_CTX: 'ALLOWED',
      SEQUENCE_CLASSIFICATION: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.SEQUENCE_RESTRICTION_DERIVATION,
    group: L9CapabilityGroup.C_POSTURE_AND_CONDITIONING,
    description:
      'Derive sequence-specific downstream usage restrictions — never widen L7/L8 restrictions',
    decisions: decisions({
      RESTRICTION_DERIVATION_CTX: 'ALLOWED',
      CONFIDENCE_DERIVATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── D — Durability and serving ──
  {
    capability: L9AllowedCapability.SEQUENCE_PERSISTENCE,
    group: L9CapabilityGroup.D_DURABILITY_AND_SERVING,
    description: 'Persist sequence state through governed L5 paths',
    decisions: decisions({
      PERSISTENCE_CTX: 'ALLOWED',
      REPLAY_PATH: 'DENIED',
      REPAIR_PATH: 'CONDITIONALLY_ALLOWED',
    }),
  },
  {
    capability: L9AllowedCapability.SEQUENCE_READ_SERVING,
    group: L9CapabilityGroup.D_DURABILITY_AND_SERVING,
    description: 'Expose governed sequence read surfaces to later layers',
    decisions: decisions({
      DOWNSTREAM_READ_CTX: 'ALLOWED',
      REPLAY_PATH: 'CONDITIONALLY_ALLOWED',
      REPAIR_PATH: 'DENIED',
    }),
  },
  {
    capability: L9AllowedCapability.SEQUENCE_REPLAY_REPAIR,
    group: L9CapabilityGroup.D_DURABILITY_AND_SERVING,
    description: 'Replay and repair sequence outputs through governed L5 paths',
    decisions: decisions({
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
      PERSISTENCE_CTX: 'CONDITIONALLY_ALLOWED',
    }),
  },
];

export function getL9CapabilityDecision(
  capability: L9AllowedCapability,
  context: L9CapabilityContext,
): L9CapabilityDecision {
  const entry = L9_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return 'DENIED';
  return entry.decisions[context];
}

export function isL9CapabilityAllowed(
  capability: L9AllowedCapability,
  context: L9CapabilityContext,
): boolean {
  const d = getL9CapabilityDecision(capability, context);
  return d === 'ALLOWED' || d === 'CONDITIONALLY_ALLOWED';
}

export function getL9DeniedCapabilities(
  context: L9CapabilityContext,
): readonly L9AllowedCapability[] {
  return L9_CAPABILITY_POLICY
    .filter(e => e.decisions[context] === 'DENIED')
    .map(e => e.capability);
}

export function getL9CapabilitiesForGroup(
  group: L9CapabilityGroup,
): readonly L9AllowedCapability[] {
  return L9_CAPABILITY_POLICY.filter(e => e.group === group).map(e => e.capability);
}

export function getAllL9CapabilityGroups(): readonly L9CapabilityGroup[] {
  const set = new Set<L9CapabilityGroup>();
  for (const e of L9_CAPABILITY_POLICY) set.add(e.group);
  return [...set];
}

void ALL_L9_ALLOWED_CAPABILITIES;
