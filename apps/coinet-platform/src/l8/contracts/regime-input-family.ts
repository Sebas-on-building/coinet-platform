/**
 * L8.5 — Regime Input Family Taxonomy
 *
 * §8.5.3.3 / §8.5.4.3 — Canonical, frozen input families. Every regime
 * input binding must reference one of these families. The family
 * determines the family's source layer, the admissible usage kinds, and
 * whether the surface is a primitive measurement or a truth-tested
 * validation handoff.
 *
 * §8.5.3.6 — A regime computation is illegal if it classifies an
 * interpretive environment purely from L6 primitives when the subject
 * contract required L7 validation support. The family tier captures
 * that distinction (PRIMITIVE vs VALIDATION vs CONTEXT vs FOUNDATIONAL
 * vs PERSISTENCE).
 */

/**
 * §8.5.3.3 + §8.5.4.3 — Canonical regime input families.
 *
 * L6 primitive families (semantic):
 *   MOMENTUM_PARTICIPATION, VOLATILITY, BREADTH, LIQUIDITY_STRUCTURE,
 *   DERIVATIVES_STRUCTURE, SPOT_PERP_RELATION, PROTOCOL_SUBSTANCE,
 *   ONCHAIN_FLOW, NARRATIVE_STATE, SECURITY_OVERHANG, SEQUENCE_STATE.
 *
 * L7 stable handoff families:
 *   VALIDATION_ASSESSMENT, CONTRADICTION_BUNDLE, VALIDATION_CONFIDENCE,
 *   CLAIM_RESTRICTION, VALIDATION_HISTORY, VALIDATION_EVIDENCE_SURFACE.
 *
 * Lower-layer context families:
 *   L4_GRAPH_CONTEXT, L3_IDENTITY, L3_METRIC_CONTRACT, L5_STORAGE_READ.
 */
export enum L8RegimeInputFamily {
  // L6 primitive families (§8.5.3.3)
  MOMENTUM_PARTICIPATION_FAMILY = 'MOMENTUM_PARTICIPATION_FAMILY',
  VOLATILITY_FAMILY = 'VOLATILITY_FAMILY',
  BREADTH_FAMILY = 'BREADTH_FAMILY',
  LIQUIDITY_STRUCTURE_FAMILY = 'LIQUIDITY_STRUCTURE_FAMILY',
  DERIVATIVES_STRUCTURE_FAMILY = 'DERIVATIVES_STRUCTURE_FAMILY',
  SPOT_PERP_RELATION_FAMILY = 'SPOT_PERP_RELATION_FAMILY',
  PROTOCOL_SUBSTANCE_FAMILY = 'PROTOCOL_SUBSTANCE_FAMILY',
  ONCHAIN_FLOW_FAMILY = 'ONCHAIN_FLOW_FAMILY',
  NARRATIVE_STATE_FAMILY = 'NARRATIVE_STATE_FAMILY',
  SECURITY_OVERHANG_FAMILY = 'SECURITY_OVERHANG_FAMILY',
  SEQUENCE_STATE_FAMILY = 'SEQUENCE_STATE_FAMILY',

  // L7 stable handoff families (§8.5.4.3)
  VALIDATION_ASSESSMENT_FAMILY = 'VALIDATION_ASSESSMENT_FAMILY',
  CONTRADICTION_BUNDLE_FAMILY = 'CONTRADICTION_BUNDLE_FAMILY',
  VALIDATION_CONFIDENCE_FAMILY = 'VALIDATION_CONFIDENCE_FAMILY',
  CLAIM_RESTRICTION_FAMILY = 'CLAIM_RESTRICTION_FAMILY',
  VALIDATION_HISTORY_FAMILY = 'VALIDATION_HISTORY_FAMILY',
  VALIDATION_EVIDENCE_SURFACE_FAMILY = 'VALIDATION_EVIDENCE_SURFACE_FAMILY',

  // Lower-layer context (§8.5.5)
  L4_GRAPH_CONTEXT_FAMILY = 'L4_GRAPH_CONTEXT_FAMILY',
  L3_IDENTITY_FAMILY = 'L3_IDENTITY_FAMILY',
  L3_METRIC_CONTRACT_FAMILY = 'L3_METRIC_CONTRACT_FAMILY',
  L5_STORAGE_READ_FAMILY = 'L5_STORAGE_READ_FAMILY',
}

export const ALL_L8_REGIME_INPUT_FAMILIES: readonly L8RegimeInputFamily[] =
  Object.values(L8RegimeInputFamily);

/**
 * The tier decides how strongly a family may contribute and how it
 * interacts with L7 superiority law (§8.5.4.5).
 *
 *   PRIMITIVE     — L6 primitive families; cannot override L7 meaning.
 *   VALIDATION    — L7 handoff families; carry truth-tested meaning.
 *   CONTEXT       — L4 / L3 conditioning context; cannot be truth.
 *   FOUNDATIONAL  — L3 identity and metric contracts; scope / unit law.
 *   PERSISTENCE   — L5 storage reads; substrate, not semantic source.
 */
export type L8RegimeInputFamilyTier =
  | 'PRIMITIVE'
  | 'VALIDATION'
  | 'CONTEXT'
  | 'FOUNDATIONAL'
  | 'PERSISTENCE';

export const ALL_L8_REGIME_INPUT_FAMILY_TIERS:
  readonly L8RegimeInputFamilyTier[] = [
    'PRIMITIVE', 'VALIDATION', 'CONTEXT', 'FOUNDATIONAL', 'PERSISTENCE',
  ];

/** §8.5.2.3 — Input source layer. Mirrors the L8.3 `L8InputFamily` vocab. */
export type L8RegimeInputSourceLayer =
  | 'L3' | 'L4' | 'L5' | 'L6' | 'L7';

export interface L8RegimeInputFamilyDescriptor {
  readonly family: L8RegimeInputFamily;
  readonly tier: L8RegimeInputFamilyTier;
  readonly source_layer: L8RegimeInputSourceLayer;
  readonly description: string;
  /** §8.5.3.5 — Surface-class sets that are legal sources per family. */
  readonly legal_source_surface_classes: readonly string[];
  /**
   * §8.5.4.6 — Whether the family may legally be bound as evidence-only.
   * For VALIDATION and PRIMITIVE, most families allow evidence-only when
   * restriction posture narrows them.
   */
  readonly evidence_only_eligible: boolean;
  /**
   * §8.5.4.6 — Whether the family requires L7 restriction posture to be
   * consumed alongside the surface.
   */
  readonly requires_restriction_consumption: boolean;
  /**
   * §8.5.7.7 — Whether the family requires L7 contradiction posture to
   * be consumed alongside the surface.
   */
  readonly requires_contradiction_consumption: boolean;
}

/**
 * §8.5.3.3 + §8.5.4.3 — Frozen descriptor table. Every runtime binding
 * is checked against this table.
 */
export const L8_REGIME_INPUT_FAMILY_DESCRIPTORS:
  readonly L8RegimeInputFamilyDescriptor[] = [
    // ── L6 primitive families (§8.5.3.3) ──
    {
      family: L8RegimeInputFamily.MOMENTUM_PARTICIPATION_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Momentum and participation primitive surfaces',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.VOLATILITY_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Realised and implied volatility primitive surfaces',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.BREADTH_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Market breadth and participation breadth primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.LIQUIDITY_STRUCTURE_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Depth, spread, and liquidity-fragility primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.DERIVATIVES_STRUCTURE_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Funding, basis, OI, crowding primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.SPOT_PERP_RELATION_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Spot-to-perp price and flow relationship primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.PROTOCOL_SUBSTANCE_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Protocol TVL, revenue, usage substance primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.ONCHAIN_FLOW_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Wallet, exchange, bridge, unlock flow primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY', 'L6_EVENT_INSTANCE',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.NARRATIVE_STATE_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Narrative breadth, intensity, divergence primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.SECURITY_OVERHANG_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Security risk and unlock/overhang event primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_EVENT_INSTANCE', 'L6_EVENT_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.SEQUENCE_STATE_FAMILY,
      tier: 'PRIMITIVE', source_layer: 'L6',
      description: 'Token maturity and sequence-state primitives',
      legal_source_surface_classes: [
        'L6_CURRENT_FEATURE_STATE', 'L6_FEATURE_HISTORY',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },

    // ── L7 stable handoff families (§8.5.4.3) ──
    {
      family: L8RegimeInputFamily.VALIDATION_ASSESSMENT_FAMILY,
      tier: 'VALIDATION', source_layer: 'L7',
      description:
        'L7 validation assessments — truth-tested claim state',
      legal_source_surface_classes: ['L7_VALIDATION_ASSESSMENT'],
      evidence_only_eligible: true,
      requires_restriction_consumption: true,
      requires_contradiction_consumption: true,
    },
    {
      family: L8RegimeInputFamily.CONTRADICTION_BUNDLE_FAMILY,
      tier: 'VALIDATION', source_layer: 'L7',
      description: 'L7 contradiction bundles — conflict posture',
      legal_source_surface_classes: ['L7_CONTRADICTION_BUNDLE'],
      evidence_only_eligible: true,
      requires_restriction_consumption: true,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.VALIDATION_CONFIDENCE_FAMILY,
      tier: 'VALIDATION', source_layer: 'L7',
      description: 'L7 confidence profiles — reliance posture',
      legal_source_surface_classes: ['L7_CONFIDENCE_ASSESSMENT'],
      evidence_only_eligible: true,
      requires_restriction_consumption: true,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.CLAIM_RESTRICTION_FAMILY,
      tier: 'VALIDATION', source_layer: 'L7',
      description: 'L7 restriction profiles — binding usage rights',
      legal_source_surface_classes: ['L7_RESTRICTION_PROFILE'],
      evidence_only_eligible: false,
      requires_restriction_consumption: true,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.VALIDATION_HISTORY_FAMILY,
      tier: 'VALIDATION', source_layer: 'L7',
      description:
        'Historical validation windows — pattern continuity',
      legal_source_surface_classes: ['L7_VALIDATION_EVIDENCE_READ_SURFACE'],
      evidence_only_eligible: true,
      requires_restriction_consumption: true,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.VALIDATION_EVIDENCE_SURFACE_FAMILY,
      tier: 'VALIDATION', source_layer: 'L7',
      description: 'Evidence-backed read surface for replay and audit',
      legal_source_surface_classes: ['L7_VALIDATION_EVIDENCE_READ_SURFACE'],
      evidence_only_eligible: true,
      requires_restriction_consumption: true,
      requires_contradiction_consumption: false,
    },

    // ── Context families (§8.5.5) ──
    {
      family: L8RegimeInputFamily.L4_GRAPH_CONTEXT_FAMILY,
      tier: 'CONTEXT', source_layer: 'L4',
      description:
        'L4 graph / relation / propagation context for ecosystem regimes',
      legal_source_surface_classes: [
        'L4_GRAPH_CONTEXT_PACKAGE', 'L4_GRAPH_RELATION',
        'L4_TEMPORAL_GRAPH_STATE',
      ],
      evidence_only_eligible: true,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.L3_IDENTITY_FAMILY,
      tier: 'FOUNDATIONAL', source_layer: 'L3',
      description: 'L3 canonical identity — scope and join safety',
      legal_source_surface_classes: ['L3_CANONICAL_OBJECT'],
      evidence_only_eligible: false,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.L3_METRIC_CONTRACT_FAMILY,
      tier: 'FOUNDATIONAL', source_layer: 'L3',
      description: 'L3 metric contracts — units, precision, valid ranges',
      legal_source_surface_classes: ['L3_METRIC_CONTRACT'],
      evidence_only_eligible: false,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
    {
      family: L8RegimeInputFamily.L5_STORAGE_READ_FAMILY,
      tier: 'PERSISTENCE', source_layer: 'L5',
      description: 'L5 governed read resolution — substrate only',
      legal_source_surface_classes: ['L5_STORAGE_READ_RESOLUTION'],
      evidence_only_eligible: false,
      requires_restriction_consumption: false,
      requires_contradiction_consumption: false,
    },
  ];

export function getL8RegimeInputFamilyDescriptor(
  family: L8RegimeInputFamily,
): L8RegimeInputFamilyDescriptor | undefined {
  return L8_REGIME_INPUT_FAMILY_DESCRIPTORS.find(d => d.family === family);
}

export function isL8RegisteredInputFamily(value: string): boolean {
  return L8_REGIME_INPUT_FAMILY_DESCRIPTORS.some(d => d.family === value);
}

export function getInputFamilyTier(
  family: L8RegimeInputFamily,
): L8RegimeInputFamilyTier | undefined {
  return getL8RegimeInputFamilyDescriptor(family)?.tier;
}

export function getInputFamilySourceLayer(
  family: L8RegimeInputFamily,
): L8RegimeInputSourceLayer | undefined {
  return getL8RegimeInputFamilyDescriptor(family)?.source_layer;
}
