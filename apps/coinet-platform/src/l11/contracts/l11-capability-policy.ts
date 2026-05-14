/**
 * L11.1 — Capability Policy Contract
 *
 * §11.1.7 / §11.1.13 — Machine-readable capability policy map for each
 * allowed capability against each internal L11 context.
 */

import {
  ALL_L11_ALLOWED_CAPABILITIES,
  ALL_L11_CAPABILITY_CONTEXTS,
  L11AllowedCapability,
  L11CapabilityContext,
  L11CapabilityDecision,
  L11CapabilityGroup,
} from './l11-constitutional-types';

export interface L11CapabilityPolicyEntry {
  readonly capability: L11AllowedCapability;
  readonly group: L11CapabilityGroup;
  readonly description: string;
  readonly decisions: Record<L11CapabilityContext, L11CapabilityDecision>;
}

function allDenied(): Record<L11CapabilityContext, L11CapabilityDecision> {
  const base = {} as Record<L11CapabilityContext, L11CapabilityDecision>;
  for (const ctx of ALL_L11_CAPABILITY_CONTEXTS) base[ctx] = 'DENIED';
  return base;
}

function decisions(
  partial: Partial<Record<L11CapabilityContext, L11CapabilityDecision>>,
): Record<L11CapabilityContext, L11CapabilityDecision> {
  return { ...allDenied(), ...partial };
}

export const L11_CAPABILITY_POLICY: readonly L11CapabilityPolicyEntry[] = [
  // ── A — Input consumption ──
  {
    capability: L11AllowedCapability.GOVERNED_INGESTION,
    group: L11CapabilityGroup.A_INPUT_CONSUMPTION,
    description:
      'Read governed lower-layer (L3–L10) primitive, context, validation, regime, sequence, hypothesis, and evidence surfaces',
    decisions: decisions({
      INGESTION_CTX: 'ALLOWED',
      COMPUTATION_CTX: 'CONDITIONALLY_ALLOWED',
      COMPONENT_BREAKDOWN_CTX: 'CONDITIONALLY_ALLOWED',
      MODIFIER_CTX: 'CONDITIONALLY_ALLOWED',
      MISSING_DATA_CTX: 'CONDITIONALLY_ALLOWED',
      ATTRIBUTION_CTX: 'CONDITIONALLY_ALLOWED',
      RESTRICTION_DERIVATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.HISTORICAL_GOVERNED_READ,
    group: L11CapabilityGroup.A_INPUT_CONSUMPTION,
    description:
      'Read historical governed surfaces for replay-safe scoring and calibration',
    decisions: decisions({
      INGESTION_CTX: 'ALLOWED',
      CALIBRATION_CTX: 'ALLOWED',
      DRIFT_CTX: 'ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.EVIDENCE_CONTEXT_READ,
    group: L11CapabilityGroup.A_INPUT_CONSUMPTION,
    description:
      'Read evidence-backed context surfaces from L6/L7/L8/L9/L10 — never as decisive primary support without governed inputs',
    decisions: decisions({
      INGESTION_CTX: 'ALLOWED',
      ATTRIBUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── B — Score declaration ──
  {
    capability: L11AllowedCapability.DECLARE_SCORE_MEANING,
    group: L11CapabilityGroup.B_SCORE_DECLARATION,
    description: 'Declare score meaning claim: what it measures and what it does not',
    decisions: decisions({
      MEANING_DECLARATION_CTX: 'ALLOWED',
      COMPUTATION_CTX: 'CONDITIONALLY_ALLOWED',
      ATTRIBUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.DECLARE_SCORE_DIRECTION,
    group: L11CapabilityGroup.B_SCORE_DECLARATION,
    description:
      'Declare score direction: higher is better/worse/more intense/more uncertain — direction-mixing forbidden',
    decisions: decisions({
      DIRECTION_DECLARATION_CTX: 'ALLOWED',
      MEANING_DECLARATION_CTX: 'CONDITIONALLY_ALLOWED',
      COMPUTATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── C — Score computation ──
  {
    capability: L11AllowedCapability.COMPUTE_DETERMINISTIC_SCORE,
    group: L11CapabilityGroup.C_SCORE_COMPUTATION,
    description: 'Compute a deterministic score over governed inputs',
    decisions: decisions({
      COMPUTATION_CTX: 'ALLOWED',
      COMPONENT_BREAKDOWN_CTX: 'CONDITIONALLY_ALLOWED',
      MATERIALIZATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.COMPUTE_COMPONENT_BREAKDOWN,
    group: L11CapabilityGroup.C_SCORE_COMPUTATION,
    description: 'Decompose a parent score into deterministic components',
    decisions: decisions({
      COMPONENT_BREAKDOWN_CTX: 'ALLOWED',
      COMPUTATION_CTX: 'CONDITIONALLY_ALLOWED',
      ATTRIBUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.APPLY_GOVERNED_MODIFIERS,
    group: L11CapabilityGroup.C_SCORE_COMPUTATION,
    description:
      'Apply governed regime/sequence/hypothesis/reliance modifiers — never override lower-layer truth',
    decisions: decisions({
      MODIFIER_CTX: 'ALLOWED',
      COMPUTATION_CTX: 'CONDITIONALLY_ALLOWED',
      COMPONENT_BREAKDOWN_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.APPLY_MISSING_DATA_POSTURE,
    group: L11CapabilityGroup.C_SCORE_COMPUTATION,
    description:
      'Apply explicit missing-data posture (penalty/cap/disclosure) — never launder missing data as neutral',
    decisions: decisions({
      MISSING_DATA_CTX: 'ALLOWED',
      COMPUTATION_CTX: 'CONDITIONALLY_ALLOWED',
      ATTRIBUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── D — Attribution and calibration ──
  {
    capability: L11AllowedCapability.ATTACH_SCORE_ATTRIBUTION,
    group: L11CapabilityGroup.D_ATTRIBUTION_AND_CALIBRATION,
    description:
      'Attach explicit attribution to a score (what produced the value, what weakened/strengthened it)',
    decisions: decisions({
      ATTRIBUTION_CTX: 'ALLOWED',
      COMPONENT_BREAKDOWN_CTX: 'CONDITIONALLY_ALLOWED',
      MATERIALIZATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.ATTACH_CALIBRATION_HOOK,
    group: L11CapabilityGroup.D_ATTRIBUTION_AND_CALIBRATION,
    description: 'Attach a calibration hook for later empirical evaluation',
    decisions: decisions({
      CALIBRATION_CTX: 'ALLOWED',
      ATTRIBUTION_CTX: 'CONDITIONALLY_ALLOWED',
      MATERIALIZATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.ATTACH_DRIFT_HOOK,
    group: L11CapabilityGroup.D_ATTRIBUTION_AND_CALIBRATION,
    description: 'Attach a drift hook for monitoring score behaviour over time',
    decisions: decisions({
      DRIFT_CTX: 'ALLOWED',
      CALIBRATION_CTX: 'CONDITIONALLY_ALLOWED',
      MATERIALIZATION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── E — Restriction derivation ──
  {
    capability: L11AllowedCapability.DERIVE_SCORE_RESTRICTIONS,
    group: L11CapabilityGroup.E_RESTRICTION_DERIVATION,
    description:
      'Derive score-specific downstream restriction profile — never widen lower-layer rights',
    decisions: decisions({
      RESTRICTION_DERIVATION_CTX: 'ALLOWED',
      COMPUTATION_CTX: 'CONDITIONALLY_ALLOWED',
      ATTRIBUTION_CTX: 'CONDITIONALLY_ALLOWED',
      REPLAY_PATH: 'ALLOWED',
      REPAIR_PATH: 'ALLOWED',
    }),
  },

  // ── F — Durability and serving ──
  {
    capability: L11AllowedCapability.MATERIALIZE_SCORE_OUTPUT,
    group: L11CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Materialize a score output through governed L5 paths',
    decisions: decisions({
      MATERIALIZATION_CTX: 'ALLOWED',
      REPLAY_PATH: 'DENIED',
      REPAIR_PATH: 'CONDITIONALLY_ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.READ_SCORE_SURFACE,
    group: L11CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Expose governed score read surfaces to later layers',
    decisions: decisions({
      DOWNSTREAM_READ_CTX: 'ALLOWED',
      REPLAY_PATH: 'CONDITIONALLY_ALLOWED',
      REPAIR_PATH: 'DENIED',
    }),
  },
  {
    capability: L11AllowedCapability.REPLAY_SCORE,
    group: L11CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Replay a previously emitted score deterministically',
    decisions: decisions({
      REPLAY_PATH: 'ALLOWED',
      MATERIALIZATION_CTX: 'CONDITIONALLY_ALLOWED',
    }),
  },
  {
    capability: L11AllowedCapability.REPAIR_SCORE,
    group: L11CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Repair a degraded score under governed L5 paths',
    decisions: decisions({
      REPAIR_PATH: 'ALLOWED',
      MATERIALIZATION_CTX: 'CONDITIONALLY_ALLOWED',
    }),
  },
];

export function getL11CapabilityDecision(
  capability: L11AllowedCapability,
  context: L11CapabilityContext,
): L11CapabilityDecision {
  const entry = L11_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return 'DENIED';
  return entry.decisions[context];
}

export function isL11CapabilityAllowed(
  capability: L11AllowedCapability,
  context: L11CapabilityContext,
): boolean {
  const d = getL11CapabilityDecision(capability, context);
  return d === 'ALLOWED' || d === 'CONDITIONALLY_ALLOWED';
}

export function getL11DeniedCapabilities(
  context: L11CapabilityContext,
): readonly L11AllowedCapability[] {
  return L11_CAPABILITY_POLICY
    .filter(e => e.decisions[context] === 'DENIED')
    .map(e => e.capability);
}

export function getL11CapabilitiesForGroup(
  group: L11CapabilityGroup,
): readonly L11AllowedCapability[] {
  return L11_CAPABILITY_POLICY.filter(e => e.group === group).map(e => e.capability);
}

export function getAllL11CapabilityGroups(): readonly L11CapabilityGroup[] {
  const set = new Set<L11CapabilityGroup>();
  for (const e of L11_CAPABILITY_POLICY) set.add(e.group);
  return [...set];
}

void ALL_L11_ALLOWED_CAPABILITIES;
