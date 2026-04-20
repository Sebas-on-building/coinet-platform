/**
 * L9.6 — Sequence Template Policy (shared enums)
 *
 * §9.6.1–§9.6.4 — Shared vocabularies every L9.6 artefact (families,
 * templates, registries, validators, audit, invariants) references.
 * These vocabularies are deliberately disjoint from the L9.2 object
 * vocabulary and the L9.5 temporal-semantics vocabulary so that family/
 * template law can be audited without collapsing into either.
 *
 * §9.6.13.2 — Required enums declared in this module:
 *   L9ProductionFamilyId, L9SequenceTemplateId, L9SequenceRolloutPhase,
 *   L9TemplateSupportDomain, L9TemplateChallengeDomain,
 *   L9TemplateLegalityClass.
 *
 * §9.6.11 — Registry law and §9.6.14 — invariants both import this file.
 */

/**
 * §9.6.3.1 — First production sequence families. These are the
 * *launch-facing* family identities; each one maps to at most one
 * underlying L9.2 `L9SequenceFamily` descriptor via the family
 * definition (see sequence-family-definition.ts). The mapping is
 * intentional: L9.2 froze the temporal-object taxonomy, L9.6 freezes
 * which concrete production families are enabled for rollout.
 */
export enum L9ProductionFamilyId {
  /** §9.6.3.1.A — constructive early-to-mid setups. */
  ACCUMULATION_TO_EXPANSION = 'ACCUMULATION_TO_EXPANSION',
  /** §9.6.3.1.B — narrative emergence, breadth, hype-vs-substance. */
  NARRATIVE_VALIDATION = 'NARRATIVE_VALIDATION',
  /** §9.6.3.1.C — leverage/crowding/late-stage reflexivity. */
  REFLEXIVITY = 'REFLEXIVITY',
  /** §9.6.3.1.D — post-event damage, digestion, stabilization. */
  SHOCK_DIGESTION = 'SHOCK_DIGESTION',
  /** §9.6.3.1.E — deceptive late-stage distribution beneath hype. */
  DISTRIBUTION_UNDER_HYPE = 'DISTRIBUTION_UNDER_HYPE',
}

export const ALL_L9_PRODUCTION_FAMILY_IDS: readonly L9ProductionFamilyId[] =
  Object.values(L9ProductionFamilyId);

/**
 * §9.6.4.3 — Sequence template identifiers. One entry per template
 * requested in §9.6.13.1. Template ids are versioned at the object
 * level (see `L9SequenceTemplateDefinition.template_version`); this
 * enum is the canonical logical id.
 */
export enum L9SequenceTemplateId {
  PRE_NARRATIVE_ACCUMULATION = 'PRE_NARRATIVE_ACCUMULATION',
  EARLY_NARRATIVE_IGNITION = 'EARLY_NARRATIVE_IGNITION',
  VALIDATED_EXPANSION = 'VALIDATED_EXPANSION',
  LEVERAGE_CROWDING_PHASE = 'LEVERAGE_CROWDING_PHASE',
  LATE_STAGE_REFLEXIVITY = 'LATE_STAGE_REFLEXIVITY',
  POST_SHOCK_DIGESTION = 'POST_SHOCK_DIGESTION',
  DISTRIBUTION_UNDER_HYPE = 'DISTRIBUTION_UNDER_HYPE',
}

export const ALL_L9_SEQUENCE_TEMPLATE_IDS: readonly L9SequenceTemplateId[] =
  Object.values(L9SequenceTemplateId);

/**
 * §9.6.10.3 — Rollout phase classes. Rollout is governed: a template
 * may not be production-enabled unless the gating law for its phase is
 * satisfied (§9.6.10.4).
 */
export enum L9SequenceRolloutPhase {
  P1_CORE = 'P1_CORE',
  P2_EARLY_EXPANSION = 'P2_EARLY_EXPANSION',
  P3_LATE_STAGE = 'P3_LATE_STAGE',
  P4_SHOCK_RECOVERY = 'P4_SHOCK_RECOVERY',
  P5_DECEPTIVE_PATTERN = 'P5_DECEPTIVE_PATTERN',
}

export const ALL_L9_SEQUENCE_ROLLOUT_PHASES:
  readonly L9SequenceRolloutPhase[] =
    Object.values(L9SequenceRolloutPhase);

/**
 * §9.6.10.1 — Canonical rollout ordering. Earlier entries must be
 * enabled before later entries per §9.6.10.4.
 */
export const L9_SEQUENCE_ROLLOUT_ORDER:
  readonly L9SequenceRolloutPhase[] = [
    L9SequenceRolloutPhase.P1_CORE,
    L9SequenceRolloutPhase.P2_EARLY_EXPANSION,
    L9SequenceRolloutPhase.P3_LATE_STAGE,
    L9SequenceRolloutPhase.P4_SHOCK_RECOVERY,
    L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
  ];

/**
 * §9.6.10.1 — Canonical mapping family → rollout phase.
 */
export const L9_PRODUCTION_FAMILY_ROLLOUT_PHASE:
  Readonly<Record<L9ProductionFamilyId, L9SequenceRolloutPhase>> = {
    [L9ProductionFamilyId.ACCUMULATION_TO_EXPANSION]:
      L9SequenceRolloutPhase.P1_CORE,
    [L9ProductionFamilyId.NARRATIVE_VALIDATION]:
      L9SequenceRolloutPhase.P2_EARLY_EXPANSION,
    [L9ProductionFamilyId.REFLEXIVITY]:
      L9SequenceRolloutPhase.P3_LATE_STAGE,
    [L9ProductionFamilyId.SHOCK_DIGESTION]:
      L9SequenceRolloutPhase.P4_SHOCK_RECOVERY,
    [L9ProductionFamilyId.DISTRIBUTION_UNDER_HYPE]:
      L9SequenceRolloutPhase.P5_DECEPTIVE_PATTERN,
  };

/**
 * §9.6.4.3 / §9.6.13.2 — Support domains a template may declare. These
 * are upstream structural areas a template leans on for evidence. A
 * template that declares zero support domains is illegal (§9.6.4.4).
 *
 * Distinct from L7/L8 domain enums: these describe *temporal-semantic*
 * support, not lower-layer analytical tiles.
 */
export enum L9TemplateSupportDomain {
  ACCUMULATION_EVIDENCE = 'ACCUMULATION_EVIDENCE',
  LIQUIDITY_IMPROVEMENT = 'LIQUIDITY_IMPROVEMENT',
  STRUCTURAL_PARTICIPATION = 'STRUCTURAL_PARTICIPATION',
  NARRATIVE_BREADTH_GROWTH = 'NARRATIVE_BREADTH_GROWTH',
  VALIDATED_CONTINUATION = 'VALIDATED_CONTINUATION',
  DERIVATIVES_EXPANSION = 'DERIVATIVES_EXPANSION',
  LATE_ENTRANT_ORDERING = 'LATE_ENTRANT_ORDERING',
  POST_EVENT_STABILIZATION = 'POST_EVENT_STABILIZATION',
  EARLY_LEAD_SIGNAL_PRESENCE = 'EARLY_LEAD_SIGNAL_PRESENCE',
  REGIME_COMPATIBLE_POSTURE = 'REGIME_COMPATIBLE_POSTURE',
}

export const ALL_L9_TEMPLATE_SUPPORT_DOMAINS:
  readonly L9TemplateSupportDomain[] =
    Object.values(L9TemplateSupportDomain);

/**
 * §9.6.4.3 / §9.6.13.2 — Challenge domains a template must declare.
 * These are the structural areas whose *presence* narrows or blocks
 * the template. A template that declares zero challenge domains is
 * illegal (§9.6.4.4) — templates must always be narrowable.
 */
export enum L9TemplateChallengeDomain {
  LEVERAGE_CROWDING = 'LEVERAGE_CROWDING',
  NARRATIVE_SATURATION = 'NARRATIVE_SATURATION',
  DISTRIBUTION_DOMINANCE = 'DISTRIBUTION_DOMINANCE',
  EARLY_SUPPORT_DECAYED = 'EARLY_SUPPORT_DECAYED',
  POST_SHOCK_RELEVANCE = 'POST_SHOCK_RELEVANCE',
  CONTRADICTION_BUNDLE_PRESSURE = 'CONTRADICTION_BUNDLE_PRESSURE',
  HOSTILE_REGIME_POSTURE = 'HOSTILE_REGIME_POSTURE',
  STRUCTURAL_CONFIRMATION_GAP = 'STRUCTURAL_CONFIRMATION_GAP',
  REFLEXIVITY_DOMINANCE = 'REFLEXIVITY_DOMINANCE',
  POST_EVENT_ACTIVE_SHOCK = 'POST_EVENT_ACTIVE_SHOCK',
}

export const ALL_L9_TEMPLATE_CHALLENGE_DOMAINS:
  readonly L9TemplateChallengeDomain[] =
    Object.values(L9TemplateChallengeDomain);

/**
 * §9.6.4.4 — Final legality class a template evaluation may return.
 * Distinct from the L9.5 `L9TemporalSemanticLegality` so audits can
 * tell whether a rejection came from temporal-semantics law or from
 * family/template law.
 *
 *   CLEAN       — template passes and may emit as clean
 *   NARROWED    — template legal but must narrow (contradiction/decay)
 *   BLOCKED     — template blocker condition matched
 *   UNSUPPORTED — template is not rolled out for this family yet
 *   INVALID     — template definition itself is malformed
 */
export enum L9TemplateLegalityClass {
  CLEAN = 'CLEAN',
  NARROWED = 'NARROWED',
  BLOCKED = 'BLOCKED',
  UNSUPPORTED = 'UNSUPPORTED',
  INVALID = 'INVALID',
}

export const ALL_L9_TEMPLATE_LEGALITY_CLASSES:
  readonly L9TemplateLegalityClass[] =
    Object.values(L9TemplateLegalityClass);

/**
 * §9.6.4.3 — Regime-conditioning posture a template may declare it
 * requires. The template validator enforces that templates which need
 * regime input actually name an L8 regime posture reference.
 */
export enum L9TemplateRegimeRequirement {
  /** §9.6.12.2 — template is regime-insensitive (rare). */
  NONE = 'NONE',
  /** Template requires only that regime posture exists. */
  REQUIRED_PRESENT = 'REQUIRED_PRESENT',
  /** Template requires a specifically compatible regime posture. */
  REQUIRED_COMPATIBLE = 'REQUIRED_COMPATIBLE',
  /** Template must narrow or block under hostile regime posture. */
  MUST_NARROW_UNDER_HOSTILE = 'MUST_NARROW_UNDER_HOSTILE',
}

export const ALL_L9_TEMPLATE_REGIME_REQUIREMENTS:
  readonly L9TemplateRegimeRequirement[] =
    Object.values(L9TemplateRegimeRequirement);
