/**
 * L12.1 — Capability Policy Contract
 *
 * §12.1.6 / §12.1.11 — Machine-readable capability policy map for each
 * allowed L12 capability against each capability context.
 */

import {
  ALL_L12_ALLOWED_CAPABILITIES,
  ALL_L12_CAPABILITY_CONTEXTS,
  L12AllowedCapability,
  L12CapabilityContext,
  L12CapabilityDecision,
  L12CapabilityGroup,
} from './l12-constitutional-types';

export interface L12CapabilityPolicyEntry {
  readonly capability: L12AllowedCapability;
  readonly group: L12CapabilityGroup;
  readonly description: string;
  readonly decisions: Record<L12CapabilityContext, L12CapabilityDecision>;
}

function allDenied(): Record<L12CapabilityContext, L12CapabilityDecision> {
  const base = {} as Record<L12CapabilityContext, L12CapabilityDecision>;
  for (const ctx of ALL_L12_CAPABILITY_CONTEXTS) {
    base[ctx] = L12CapabilityDecision.DENIED;
  }
  return base;
}

function decisions(
  partial: Partial<Record<L12CapabilityContext, L12CapabilityDecision>>,
): Record<L12CapabilityContext, L12CapabilityDecision> {
  return { ...allDenied(), ...partial };
}

export const L12_CAPABILITY_POLICY: readonly L12CapabilityPolicyEntry[] = [
  // ── A — Input ingestion ──
  {
    capability: L12AllowedCapability.INGEST_GOVERNED_LOWER_LAYER_SURFACES,
    group: L12CapabilityGroup.A_INPUT_INGESTION,
    description:
      'Read governed L3–L11 stable handoff/read surfaces — never raw lower-layer state',
    decisions: decisions({
      INPUT_RESOLUTION: L12CapabilityDecision.ALLOWED,
      RUNTIME_EXECUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      SCENARIO_GENERATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      CONDITION_RESOLUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      TRIGGER_RESOLUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      INVALIDATION_RESOLUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },

  // ── B — Scenario assembly ──
  {
    capability: L12AllowedCapability.ASSEMBLE_SCENARIO_SUBJECT,
    group: L12CapabilityGroup.B_SCENARIO_ASSEMBLY,
    description:
      'Assemble a scenario subject from governed identity + scope + score-context-bundle',
    decisions: decisions({
      INPUT_RESOLUTION: L12CapabilityDecision.ALLOWED,
      SCENARIO_GENERATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.RESOLVE_SCENARIO_INPUTS,
    group: L12CapabilityGroup.B_SCENARIO_ASSEMBLY,
    description: 'Resolve required scenario inputs from registered governed surfaces',
    decisions: decisions({
      INPUT_RESOLUTION: L12CapabilityDecision.ALLOWED,
      SCENARIO_GENERATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.GENERATE_SCENARIO_CANDIDATES,
    group: L12CapabilityGroup.B_SCENARIO_ASSEMBLY,
    description:
      'Generate candidate scenario structures — never as predictions or recommendations',
    decisions: decisions({
      SCENARIO_GENERATION: L12CapabilityDecision.ALLOWED,
      CONDITION_RESOLUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },

  // ── C — Path construction ──
  {
    capability: L12AllowedCapability.RESOLVE_SCENARIO_CONDITIONS,
    group: L12CapabilityGroup.C_PATH_CONSTRUCTION,
    description: 'Resolve explicit scenario conditions; conditionality is mandatory',
    decisions: decisions({
      CONDITION_RESOLUTION: L12CapabilityDecision.ALLOWED,
      SCENARIO_GENERATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.RESOLVE_SCENARIO_TRIGGERS,
    group: L12CapabilityGroup.C_PATH_CONSTRUCTION,
    description: 'Resolve triggers that would strengthen a path',
    decisions: decisions({
      TRIGGER_RESOLUTION: L12CapabilityDecision.ALLOWED,
      SCENARIO_GENERATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.RESOLVE_SCENARIO_INVALIDATIONS,
    group: L12CapabilityGroup.C_PATH_CONSTRUCTION,
    description: 'Resolve invalidations that would weaken or collapse a path',
    decisions: decisions({
      INVALIDATION_RESOLUTION: L12CapabilityDecision.ALLOWED,
      SCENARIO_GENERATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.CONSTRUCT_CONDITIONAL_PATHS,
    group: L12CapabilityGroup.C_PATH_CONSTRUCTION,
    description:
      'Construct conditional paths — invalidations are mandatory before construction',
    decisions: decisions({
      SCENARIO_GENERATION: L12CapabilityDecision.ALLOWED,
      CONDITION_RESOLUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      INVALIDATION_RESOLUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },

  // ── D — Path confidence and ranking ──
  {
    capability: L12AllowedCapability.COMPUTE_PATH_CONFIDENCE,
    group: L12CapabilityGroup.D_PATH_CONFIDENCE_AND_RANKING,
    description:
      'Compute path confidence honouring contradiction, missingness, drift, regime, sequence, hypothesis posture',
    decisions: decisions({
      PATH_CONFIDENCE: L12CapabilityDecision.ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.RANK_SCENARIO_PATHS,
    group: L12CapabilityGroup.D_PATH_CONFIDENCE_AND_RANKING,
    description:
      'Rank scenario paths after conditions/triggers/invalidations exist — never select a winner',
    decisions: decisions({
      PATH_CONFIDENCE: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      OUTPUT_EMISSION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.DERIVE_SHIFT_CONDITIONS,
    group: L12CapabilityGroup.D_PATH_CONFIDENCE_AND_RANKING,
    description: 'Derive shift conditions describing what would change scenario ranking',
    decisions: decisions({
      SHIFT_CONDITION_DERIVATION: L12CapabilityDecision.ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },

  // ── E — Restriction and evidence ──
  {
    capability: L12AllowedCapability.DERIVE_SCENARIO_RESTRICTIONS,
    group: L12CapabilityGroup.E_RESTRICTION_AND_EVIDENCE,
    description: 'Derive scenario-specific restrictions; never widen lower-layer rights',
    decisions: decisions({
      OUTPUT_EMISSION: L12CapabilityDecision.ALLOWED,
      SCENARIO_GENERATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.BUILD_SCENARIO_EVIDENCE_PACK,
    group: L12CapabilityGroup.E_RESTRICTION_AND_EVIDENCE,
    description: 'Assemble evidence packs from governed L3–L11 evidence surfaces',
    decisions: decisions({
      OUTPUT_EMISSION: L12CapabilityDecision.ALLOWED,
      INPUT_RESOLUTION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.ALLOWED,
    }),
  },

  // ── F — Durability and serving ──
  {
    capability: L12AllowedCapability.MATERIALIZE_THROUGH_L5,
    group: L12CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Persist scenario surfaces only through governed L5 routes',
    decisions: decisions({
      MATERIALIZATION: L12CapabilityDecision.ALLOWED,
      REPAIR: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.SUPPORT_REPLAY,
    group: L12CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Replay scenarios deterministically through governed L5 replay context',
    decisions: decisions({
      REPLAY: L12CapabilityDecision.ALLOWED,
      MATERIALIZATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.SUPPORT_REPAIR,
    group: L12CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Repair scenarios under governed L5 repair routes only',
    decisions: decisions({
      REPAIR: L12CapabilityDecision.ALLOWED,
      MATERIALIZATION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
  {
    capability: L12AllowedCapability.EXPOSE_GOVERNED_READ_SURFACES,
    group: L12CapabilityGroup.F_DURABILITY_AND_SERVING,
    description: 'Expose governed scenario read surfaces to allowed downstream consumers',
    decisions: decisions({
      READ_SERVING: L12CapabilityDecision.ALLOWED,
      OUTPUT_EMISSION: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
      REPLAY: L12CapabilityDecision.CONDITIONALLY_ALLOWED,
    }),
  },
];

export function getL12CapabilityDecision(
  capability: L12AllowedCapability,
  context: L12CapabilityContext,
): L12CapabilityDecision {
  const entry = L12_CAPABILITY_POLICY.find(e => e.capability === capability);
  if (!entry) return L12CapabilityDecision.DENIED;
  return entry.decisions[context];
}

export function isL12CapabilityAllowed(
  capability: L12AllowedCapability,
  context: L12CapabilityContext,
): boolean {
  const d = getL12CapabilityDecision(capability, context);
  return (
    d === L12CapabilityDecision.ALLOWED ||
    d === L12CapabilityDecision.CONDITIONALLY_ALLOWED
  );
}

export function getL12DeniedCapabilities(
  context: L12CapabilityContext,
): readonly L12AllowedCapability[] {
  return L12_CAPABILITY_POLICY
    .filter(e => e.decisions[context] === L12CapabilityDecision.DENIED)
    .map(e => e.capability);
}

export function getL12CapabilitiesForGroup(
  group: L12CapabilityGroup,
): readonly L12AllowedCapability[] {
  return L12_CAPABILITY_POLICY
    .filter(e => e.group === group)
    .map(e => e.capability);
}

export function getAllL12CapabilityGroups(): readonly L12CapabilityGroup[] {
  const set = new Set<L12CapabilityGroup>();
  for (const e of L12_CAPABILITY_POLICY) set.add(e.group);
  return [...set];
}

void ALL_L12_ALLOWED_CAPABILITIES;
