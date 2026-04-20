/**
 * L10.1 — Capability Policy Contract
 *
 * §10.1.4.3 — Machine-readable capability policy map for each allowed
 * capability against each internal L10 context.
 */

import {
  ALL_L10_ALLOWED_CAPABILITIES,
  ALL_L10_CAPABILITY_CONTEXTS,
  L10AllowedCapability,
  L10CapabilityContext,
  L10CapabilityDecision,
  L10CapabilityGroup,
} from './l10-constitutional-types';

export interface L10CapabilityPolicyEntry {
  readonly capability: L10AllowedCapability;
  readonly group: L10CapabilityGroup;
  readonly description: string;
  readonly decisions: Record<L10CapabilityContext, L10CapabilityDecision>;
}

function allDenied(): Record<L10CapabilityContext, L10CapabilityDecision> {
  const base = {} as Record<L10CapabilityContext, L10CapabilityDecision>;
  for (const ctx of ALL_L10_CAPABILITY_CONTEXTS) base[ctx] = 'DENIED';
  return base;
}

function decisions(
  partial: Partial<Record<L10CapabilityContext, L10CapabilityDecision>>,
): Record<L10CapabilityContext, L10CapabilityDecision> {
  return { ...allDenied(), ...partial };
}

export const L10_CAPABILITY_POLICY: readonly L10CapabilityPolicyEntry[] = [
  // ── A — Input consumption ──
  {
    capability: L10AllowedCapability.GOVERNED_INGESTION,
    group: L10CapabilityGroup.A_INPUT_CONSUMPTION,
    description:
      'Read governed lower-layer (L3–L9) primitive, context, validation, regime, sequence, and evidence surfaces',
    decisions: decisions({
      ASSEMBLY_CTX: 'ALLOWED',
      CANDIDATE_GENERATION_CTX: 'ALLOWED',
      EVIDENCE_RESOLUTION_CTX: 'ALLOWED',
      SUPPORT_DOMAIN_CTX: 'ALLOWED',
      CONTRADICTION_DOMAIN_CTX: 'ALLOWED',
      CONFIRMATION_GAP_CTX: 'ALLOWED',
      INVALIDATION_RISK_CTX: 'ALLOWED',
      RANKING_CTX: 'CONDITIONALLY_ALLOWED',
      SHIFT_CONDITION_CTX: 'CONDITIONALLY_ALLOWED',
      RESTRICTION_DERIVATION_CTX: 'CONDITIONALLY_ALLOWED',
      PERSISTENCE_CTX: 'CONDITIONALLY_ALLOWED',
      DOWNSTREAM_READ_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.HISTORICAL_WINDOW_READ,
    group: L10CapabilityGroup.A_INPUT_CONSUMPTION,
    description: 'Read historical governed windows for hypothesis evidence binding',
    decisions: decisions({
      ASSEMBLY_CTX: 'ALLOWED',
      EVIDENCE_RESOLUTION_CTX: 'ALLOWED',
      SUPPORT_DOMAIN_CTX: 'ALLOWED',
      CONTRADICTION_DOMAIN_CTX: 'ALLOWED',
      CONFIRMATION_GAP_CTX: 'ALLOWED',
      INVALIDATION_RISK_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.EVIDENCE_CONTEXT_READ,
    group: L10CapabilityGroup.A_INPUT_CONSUMPTION,
    description:
      'Read evidence-backed context surfaces from L6/L7/L8/L9 — never as decisive primary support',
    decisions: decisions({
      EVIDENCE_RESOLUTION_CTX: 'ALLOWED',
      SUPPORT_DOMAIN_CTX: 'CONDITIONALLY_ALLOWED',
      CONTRADICTION_DOMAIN_CTX: 'CONDITIONALLY_ALLOWED',
      CONFIRMATION_GAP_CTX: 'CONDITIONALLY_ALLOWED',
      INVALIDATION_RISK_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── B — Hypothesis assembly ──
  {
    capability: L10AllowedCapability.HYPOTHESIS_SUBJECT_CONSTRUCTION,
    group: L10CapabilityGroup.B_HYPOTHESIS_ASSEMBLY,
    description: 'Construct a hypothesis subject bound to governed identity and scope',
    decisions: decisions({
      ASSEMBLY_CTX: 'ALLOWED',
      CANDIDATE_GENERATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.CANDIDATE_GENERATION,
    group: L10CapabilityGroup.B_HYPOTHESIS_ASSEMBLY,
    description: 'Generate competing hypothesis candidates — always at least one alternative',
    decisions: decisions({
      CANDIDATE_GENERATION_CTX: 'ALLOWED',
      ASSEMBLY_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── C — Evidence resolution ──
  {
    capability: L10AllowedCapability.SUPPORT_DOMAIN_BINDING,
    group: L10CapabilityGroup.C_EVIDENCE_RESOLUTION,
    description: 'Bind support-domain evidence to a candidate — never invent evidence',
    decisions: decisions({
      SUPPORT_DOMAIN_CTX: 'ALLOWED',
      EVIDENCE_RESOLUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.CONTRADICTION_DOMAIN_BINDING,
    group: L10CapabilityGroup.C_EVIDENCE_RESOLUTION,
    description: 'Bind contradiction-domain evidence from L7 without overwriting posture',
    decisions: decisions({
      CONTRADICTION_DOMAIN_CTX: 'ALLOWED',
      EVIDENCE_RESOLUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.CONFIRMATION_GAP_CLASSIFICATION,
    group: L10CapabilityGroup.C_EVIDENCE_RESOLUTION,
    description: 'Classify missing confirmations — expose, never hide',
    decisions: decisions({
      CONFIRMATION_GAP_CTX: 'ALLOWED',
      EVIDENCE_RESOLUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.INVALIDATION_RISK_CLASSIFICATION,
    group: L10CapabilityGroup.C_EVIDENCE_RESOLUTION,
    description: 'Classify invalidation-risk posture — expose, never hide',
    decisions: decisions({
      INVALIDATION_RISK_CTX: 'ALLOWED',
      EVIDENCE_RESOLUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── D — Ranking ──
  {
    capability: L10AllowedCapability.HYPOTHESIS_CONFIDENCE_DERIVATION,
    group: L10CapabilityGroup.D_RANKING,
    description:
      'Compute hypothesis-specific confidence — interpretive posture, not final judgment confidence',
    decisions: decisions({
      RANKING_CTX: 'ALLOWED',
      RANKING_STABILITY_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.CANDIDATE_RANKING,
    group: L10CapabilityGroup.D_RANKING,
    description: 'Rank candidates with an explicit spread between primary and alternatives',
    decisions: decisions({
      RANKING_CTX: 'ALLOWED',
      SPREAD_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.RANKING_STABILITY_CLASSIFICATION,
    group: L10CapabilityGroup.D_RANKING,
    description: 'Classify ranking stability under posture perturbations',
    decisions: decisions({
      RANKING_STABILITY_CTX: 'ALLOWED',
      RANKING_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.SPREAD_NARROWING_CLASSIFICATION,
    group: L10CapabilityGroup.D_RANKING,
    description: 'Classify primary/secondary spread narrowing — expose close spreads',
    decisions: decisions({
      SPREAD_CTX: 'ALLOWED',
      RANKING_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── E — Restriction and shift ──
  {
    capability: L10AllowedCapability.SHIFT_CONDITION_DERIVATION,
    group: L10CapabilityGroup.E_RESTRICTION_AND_SHIFT,
    description: 'Derive shift-condition set describing what would change the ranking',
    decisions: decisions({
      SHIFT_CONDITION_CTX: 'ALLOWED',
      RANKING_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.HYPOTHESIS_RESTRICTION_DERIVATION,
    group: L10CapabilityGroup.E_RESTRICTION_AND_SHIFT,
    description:
      'Derive hypothesis-specific downstream restriction profile — never widen L7/L8/L9 restrictions',
    decisions: decisions({
      RESTRICTION_DERIVATION_CTX: 'ALLOWED',
      RANKING_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.HYPOTHESIS_EVIDENCE_PACKING,
    group: L10CapabilityGroup.E_RESTRICTION_AND_SHIFT,
    description: 'Assemble a hypothesis evidence pack (lineage-bound)',
    decisions: decisions({
      EVIDENCE_PACK_CTX: 'ALLOWED',
      EVIDENCE_RESOLUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── F — Durability and serving ──
  {
    capability: L10AllowedCapability.HYPOTHESIS_PERSISTENCE,
    group: L10CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Persist hypothesis state through governed L5 paths',
    decisions: decisions({
      PERSISTENCE_CTX: 'ALLOWED',
      REPLAY_PATH: 'DENIED',
      REPAIR_PATH: 'CONDITIONALLY_ALLOWED',
    }),
  },
  {
    capability: L10AllowedCapability.HYPOTHESIS_READ_SERVING,
    group: L10CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Expose governed hypothesis read surfaces to later layers',
    decisions: decisions({
      DOWNSTREAM_READ_CTX: 'ALLOWED',
      REPLAY_PATH: 'CONDITIONALLY_ALLOWED',
      REPAIR_PATH: 'DENIED',
    }),
  },
  {
    capability: L10AllowedCapability.HYPOTHESIS_REPLAY_REPAIR,
    group: L10CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Replay and repair hypothesis outputs through governed L5 paths',
    decisions: decisions({
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
      PERSISTENCE_CTX: 'CONDITIONALLY_ALLOWED',
    }),
  },
];

export function getL10CapabilityDecision(
  capability: L10AllowedCapability,
  context: L10CapabilityContext,
): L10CapabilityDecision {
  const entry = L10_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return 'DENIED';
  return entry.decisions[context];
}

export function isL10CapabilityAllowed(
  capability: L10AllowedCapability,
  context: L10CapabilityContext,
): boolean {
  const d = getL10CapabilityDecision(capability, context);
  return d === 'ALLOWED' || d === 'CONDITIONALLY_ALLOWED';
}

export function getL10DeniedCapabilities(
  context: L10CapabilityContext,
): readonly L10AllowedCapability[] {
  return L10_CAPABILITY_POLICY.filter(e => e.decisions[context] === 'DENIED').map(
    e => e.capability,
  );
}

export function getL10CapabilitiesForGroup(
  group: L10CapabilityGroup,
): readonly L10AllowedCapability[] {
  return L10_CAPABILITY_POLICY.filter(e => e.group === group).map(e => e.capability);
}

export function getAllL10CapabilityGroups(): readonly L10CapabilityGroup[] {
  const set = new Set<L10CapabilityGroup>();
  for (const e of L10_CAPABILITY_POLICY) set.add(e.group);
  return [...set];
}

void ALL_L10_ALLOWED_CAPABILITIES;
