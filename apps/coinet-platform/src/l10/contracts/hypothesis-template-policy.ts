/**
 * L10.6 — Hypothesis Template Policy (shared enums)
 *
 * §10.6.1 / §10.6.14.2 — Shared vocabularies every L10.6 artefact
 * (families, templates, registries, validators, audit, invariants)
 * references. These vocabularies are deliberately disjoint from:
 *   - the L10.2 object vocabulary (`L10HypothesisFamilyClass`), which
 *     froze the candidate-archetype taxonomy;
 *   - the L10.5 evidence-semantics vocabulary, which froze what
 *     support/contradiction/confirmation/invalidation *mean* in general.
 *
 * L10.6 sits one level higher: it freezes which *production* families
 * and templates the Hypothesis Engine actually generates, ranks, and
 * rolls out. Every template is bound to exactly one production family
 * (§10.6.3.4 / §10.6.3.5).
 *
 * §10.6.14.2 — Required enums declared in this module:
 *   L10HypothesisFamilyId, L10HypothesisTemplateId,
 *   L10HypothesisRolloutPhase, L10TemplateSupportDomain,
 *   L10TemplateContradictionDomain, L10TemplateLegalityClass,
 *   L10FamilyViolationCode.
 */

// ──────────────────────────────────────────────────────────────────
// §10.6.2.1 — Canonical launch families (seven)
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.2.1 — First production hypothesis families. These are the
 * *launch-facing* family identities at the L10.6 tier. Each L10.2
 * `L10HypothesisFamilyClass` candidate-archetype belongs to exactly
 * one of these families (§10.6.3.4).
 *
 * The set is intentionally small — the point of L10.6 is that every
 * candidate Coinet ranks belongs to one of these seven explanatory
 * competitions, never to a freeform "bullish / bearish / mixed"
 * bucket (§10.6.2.2).
 */
export enum L10HypothesisFamilyId {
  /** §10.6.2.1.A — constructive demand-led explanations. */
  GENUINE_ACCUMULATION_DEMAND = 'GENUINE_ACCUMULATION_DEMAND',
  /** §10.6.2.1.B — leverage / crowding / squeeze mechanics. */
  LEVERAGE_SQUEEZE = 'LEVERAGE_SQUEEZE',
  /** §10.6.2.1.C — narrative / reflexive / attention-led. */
  NARRATIVE_REFLEXIVE = 'NARRATIVE_REFLEXIVE',
  /** §10.6.2.1.D — substance-backed fundamental rerating. */
  FUNDAMENTAL_RERATING = 'FUNDAMENTAL_RERATING',
  /** §10.6.2.1.E — unlock / treasury / distribution overhang. */
  SUPPLY_OVERHANG_DISTRIBUTION = 'SUPPLY_OVERHANG_DISTRIBUTION',
  /** §10.6.2.1.F — manipulation / low-quality structure. */
  MANIPULATION_LOW_QUALITY = 'MANIPULATION_LOW_QUALITY',
  /** §10.6.2.1.G — ecosystem / chain / sector spillover. */
  ECOSYSTEM_SPILLOVER_ROTATION = 'ECOSYSTEM_SPILLOVER_ROTATION',
}

export const ALL_L10_HYPOTHESIS_FAMILY_IDS:
  readonly L10HypothesisFamilyId[] =
    Object.values(L10HypothesisFamilyId);

export function isL10RegisteredProductionFamily(value: string): boolean {
  return ALL_L10_HYPOTHESIS_FAMILY_IDS.some(f => f === value);
}

// ──────────────────────────────────────────────────────────────────
// §10.6.2.1 — First production templates (twenty-one)
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.2 / §10.6.14.2 — Canonical production template identifiers.
 * Every entry must be attached to exactly one `L10HypothesisFamilyId`
 * via `L10_TEMPLATE_TO_FAMILY` below (§10.6.3.4).
 */
export enum L10HypothesisTemplateId {
  // Family A — Genuine accumulation / demand (§10.6.4.3)
  GENUINE_EARLY_ACCUMULATION = 'GENUINE_EARLY_ACCUMULATION',
  REAL_DEMAND_LED_EXPANSION = 'REAL_DEMAND_LED_EXPANSION',
  STRUCTURALLY_IMPROVING_ACCUMULATION = 'STRUCTURALLY_IMPROVING_ACCUMULATION',

  // Family B — Leverage / squeeze (§10.6.5.3)
  LEVERAGE_DRIVEN_SQUEEZE = 'LEVERAGE_DRIVEN_SQUEEZE',
  CROWDING_LED_CONTINUATION = 'CROWDING_LED_CONTINUATION',
  REFLEXIVE_LATE_STAGE_SQUEEZE = 'REFLEXIVE_LATE_STAGE_SQUEEZE',

  // Family C — Narrative / reflexive (§10.6.6.3)
  NARRATIVE_ONLY_REFLEXIVE_PUMP = 'NARRATIVE_ONLY_REFLEXIVE_PUMP',
  HYPE_LED_CONTINUATION = 'HYPE_LED_CONTINUATION',
  ATTENTION_DRIVEN_REPRICING = 'ATTENTION_DRIVEN_REPRICING',

  // Family D — Fundamental rerating (§10.6.7.3)
  FUNDAMENTALLY_IMPROVING_RERATING = 'FUNDAMENTALLY_IMPROVING_RERATING',
  PROTOCOL_QUALITY_REPRICING = 'PROTOCOL_QUALITY_REPRICING',
  SUBSTANCE_BACKED_CONTINUATION = 'SUBSTANCE_BACKED_CONTINUATION',

  // Family E — Supply-overhang / distribution (§10.6.8.3)
  POST_UNLOCK_REDISTRIBUTION = 'POST_UNLOCK_REDISTRIBUTION',
  TREASURY_LED_DISTRIBUTION = 'TREASURY_LED_DISTRIBUTION',
  DISTRIBUTION_UNDER_HYPE = 'DISTRIBUTION_UNDER_HYPE',

  // Family F — Manipulation / low-quality (§10.6.9.3)
  LOW_QUALITY_MANIPULATED_LAUNCH = 'LOW_QUALITY_MANIPULATED_LAUNCH',
  STRUCTURALLY_WEAK_PUMP = 'STRUCTURALLY_WEAK_PUMP',
  FABRICATED_PARTICIPATION_PATTERN = 'FABRICATED_PARTICIPATION_PATTERN',

  // Family G — Ecosystem / spillover (§10.6.10.3)
  SECTOR_SPILLOVER_REPRICING = 'SECTOR_SPILLOVER_REPRICING',
  CHAIN_ATTENTION_TRANSFER = 'CHAIN_ATTENTION_TRANSFER',
  ECOSYSTEM_BETA_RERATING = 'ECOSYSTEM_BETA_RERATING',
}

export const ALL_L10_HYPOTHESIS_TEMPLATE_IDS:
  readonly L10HypothesisTemplateId[] =
    Object.values(L10HypothesisTemplateId);

export function isL10RegisteredProductionTemplate(value: string): boolean {
  return ALL_L10_HYPOTHESIS_TEMPLATE_IDS.some(t => t === value);
}

/**
 * §10.6.3.4 / §10.6.3.5 — Frozen template → production family mapping.
 * This is the single machine-enforced source of truth for INV-10.6-A
 * (every production template must belong to exactly one registered
 * family). Drift here is a constitutional breach.
 */
export const L10_TEMPLATE_TO_FAMILY:
  Readonly<Record<L10HypothesisTemplateId, L10HypothesisFamilyId>> = {
    [L10HypothesisTemplateId.GENUINE_EARLY_ACCUMULATION]:
      L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
    [L10HypothesisTemplateId.REAL_DEMAND_LED_EXPANSION]:
      L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,
    [L10HypothesisTemplateId.STRUCTURALLY_IMPROVING_ACCUMULATION]:
      L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND,

    [L10HypothesisTemplateId.LEVERAGE_DRIVEN_SQUEEZE]:
      L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
    [L10HypothesisTemplateId.CROWDING_LED_CONTINUATION]:
      L10HypothesisFamilyId.LEVERAGE_SQUEEZE,
    [L10HypothesisTemplateId.REFLEXIVE_LATE_STAGE_SQUEEZE]:
      L10HypothesisFamilyId.LEVERAGE_SQUEEZE,

    [L10HypothesisTemplateId.NARRATIVE_ONLY_REFLEXIVE_PUMP]:
      L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    [L10HypothesisTemplateId.HYPE_LED_CONTINUATION]:
      L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,
    [L10HypothesisTemplateId.ATTENTION_DRIVEN_REPRICING]:
      L10HypothesisFamilyId.NARRATIVE_REFLEXIVE,

    [L10HypothesisTemplateId.FUNDAMENTALLY_IMPROVING_RERATING]:
      L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
    [L10HypothesisTemplateId.PROTOCOL_QUALITY_REPRICING]:
      L10HypothesisFamilyId.FUNDAMENTAL_RERATING,
    [L10HypothesisTemplateId.SUBSTANCE_BACKED_CONTINUATION]:
      L10HypothesisFamilyId.FUNDAMENTAL_RERATING,

    [L10HypothesisTemplateId.POST_UNLOCK_REDISTRIBUTION]:
      L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
    [L10HypothesisTemplateId.TREASURY_LED_DISTRIBUTION]:
      L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,
    [L10HypothesisTemplateId.DISTRIBUTION_UNDER_HYPE]:
      L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION,

    [L10HypothesisTemplateId.LOW_QUALITY_MANIPULATED_LAUNCH]:
      L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
    [L10HypothesisTemplateId.STRUCTURALLY_WEAK_PUMP]:
      L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,
    [L10HypothesisTemplateId.FABRICATED_PARTICIPATION_PATTERN]:
      L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY,

    [L10HypothesisTemplateId.SECTOR_SPILLOVER_REPRICING]:
      L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
    [L10HypothesisTemplateId.CHAIN_ATTENTION_TRANSFER]:
      L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
    [L10HypothesisTemplateId.ECOSYSTEM_BETA_RERATING]:
      L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION,
  };

/**
 * §10.6.3.4 — All templates legally owned by a family.
 */
export function getL10ProductionTemplatesForFamily(
  family: L10HypothesisFamilyId,
): readonly L10HypothesisTemplateId[] {
  return ALL_L10_HYPOTHESIS_TEMPLATE_IDS.filter(
    t => L10_TEMPLATE_TO_FAMILY[t] === family,
  );
}

// ──────────────────────────────────────────────────────────────────
// §10.6.11 — Rollout phases
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.11.3 — Rollout phase classes. Rollout is governed: a family
 * may not be production-enabled unless the gating law for its phase is
 * satisfied (§10.6.11.4).
 *
 *   P1_CORE                     — genuine demand / constructive
 *   P2_STRUCTURAL_COMPETITION   — leverage + narrative competitions
 *   P3_COMPLEX_INTERPRETATION   — fundamentals + supply overhang
 *   P4_ADVERSARIAL_EXPLANATION  — manipulation / low-quality
 *   P5_RELATIONAL_EXPLANATION   — ecosystem / spillover / rotation
 */
export enum L10HypothesisRolloutPhase {
  P1_CORE = 'P1_CORE',
  P2_STRUCTURAL_COMPETITION = 'P2_STRUCTURAL_COMPETITION',
  P3_COMPLEX_INTERPRETATION = 'P3_COMPLEX_INTERPRETATION',
  P4_ADVERSARIAL_EXPLANATION = 'P4_ADVERSARIAL_EXPLANATION',
  P5_RELATIONAL_EXPLANATION = 'P5_RELATIONAL_EXPLANATION',
}

export const ALL_L10_HYPOTHESIS_ROLLOUT_PHASES:
  readonly L10HypothesisRolloutPhase[] =
    Object.values(L10HypothesisRolloutPhase);

/**
 * §10.6.11.1 — Canonical rollout ordering. Earlier entries must be
 * enabled before later entries per §10.6.11.4.
 */
export const L10_HYPOTHESIS_ROLLOUT_ORDER:
  readonly L10HypothesisRolloutPhase[] = [
    L10HypothesisRolloutPhase.P1_CORE,
    L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
    L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
    L10HypothesisRolloutPhase.P4_ADVERSARIAL_EXPLANATION,
    L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION,
  ];

/**
 * §10.6.11.1 — Canonical family → rollout phase mapping.
 */
export const L10_PRODUCTION_FAMILY_ROLLOUT_PHASE:
  Readonly<Record<L10HypothesisFamilyId, L10HypothesisRolloutPhase>> = {
    [L10HypothesisFamilyId.GENUINE_ACCUMULATION_DEMAND]:
      L10HypothesisRolloutPhase.P1_CORE,
    [L10HypothesisFamilyId.LEVERAGE_SQUEEZE]:
      L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
    [L10HypothesisFamilyId.NARRATIVE_REFLEXIVE]:
      L10HypothesisRolloutPhase.P2_STRUCTURAL_COMPETITION,
    [L10HypothesisFamilyId.FUNDAMENTAL_RERATING]:
      L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
    [L10HypothesisFamilyId.SUPPLY_OVERHANG_DISTRIBUTION]:
      L10HypothesisRolloutPhase.P3_COMPLEX_INTERPRETATION,
    [L10HypothesisFamilyId.MANIPULATION_LOW_QUALITY]:
      L10HypothesisRolloutPhase.P4_ADVERSARIAL_EXPLANATION,
    [L10HypothesisFamilyId.ECOSYSTEM_SPILLOVER_ROTATION]:
      L10HypothesisRolloutPhase.P5_RELATIONAL_EXPLANATION,
  };

export function compareL10RolloutPhase(
  a: L10HypothesisRolloutPhase,
  b: L10HypothesisRolloutPhase,
): number {
  const ai = L10_HYPOTHESIS_ROLLOUT_ORDER.indexOf(a);
  const bi = L10_HYPOTHESIS_ROLLOUT_ORDER.indexOf(b);
  return ai - bi;
}

// ──────────────────────────────────────────────────────────────────
// §10.6.3.2 / §10.6.14.2 — Template support / contradiction domains
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.2 — Support domains a template may declare. These are the
 * explanatory tracks a template leans on to claim legality. A template
 * that declares zero support domains is illegal (§10.6.3.4).
 *
 * This vocabulary is L10.6-specific and is intentionally distinct from
 * the L9.6 `L9TemplateSupportDomain` vocabulary (which is temporal
 * only) — these describe the *explanatory* tracks a hypothesis pulls
 * from, not the sequence-assembly tracks.
 */
export enum L10TemplateSupportDomain {
  ACCUMULATION_EVIDENCE = 'ACCUMULATION_EVIDENCE',
  STRUCTURAL_PARTICIPATION = 'STRUCTURAL_PARTICIPATION',
  LIQUIDITY_IMPROVEMENT = 'LIQUIDITY_IMPROVEMENT',
  DEMAND_BREADTH = 'DEMAND_BREADTH',
  LEVERAGE_POSITIONING = 'LEVERAGE_POSITIONING',
  CROWDING_STRUCTURE = 'CROWDING_STRUCTURE',
  BASIS_FUNDING_STRESS = 'BASIS_FUNDING_STRESS',
  NARRATIVE_BREADTH = 'NARRATIVE_BREADTH',
  ATTENTION_FLOW = 'ATTENTION_FLOW',
  SPECULATIVE_PARTICIPATION = 'SPECULATIVE_PARTICIPATION',
  PROTOCOL_QUALITY = 'PROTOCOL_QUALITY',
  BUSINESS_SUBSTANCE = 'BUSINESS_SUBSTANCE',
  VALIDATED_FUNDAMENTALS = 'VALIDATED_FUNDAMENTALS',
  SUPPLY_OVERHANG_EVIDENCE = 'SUPPLY_OVERHANG_EVIDENCE',
  TREASURY_ENTITY_FLOW = 'TREASURY_ENTITY_FLOW',
  DISTRIBUTION_DIVERGENCE = 'DISTRIBUTION_DIVERGENCE',
  SUSPICIOUS_QUALITY_POSTURE = 'SUSPICIOUS_QUALITY_POSTURE',
  LOW_TRUST_STRUCTURE = 'LOW_TRUST_STRUCTURE',
  FABRICATED_PARTICIPATION_SIGNAL = 'FABRICATED_PARTICIPATION_SIGNAL',
  RELATION_CROSS_ASSET = 'RELATION_CROSS_ASSET',
  ECOSYSTEM_LEVEL_FLOW = 'ECOSYSTEM_LEVEL_FLOW',
  CHAIN_ATTENTION_TRANSFER = 'CHAIN_ATTENTION_TRANSFER',
  REGIME_COMPATIBLE_POSTURE = 'REGIME_COMPATIBLE_POSTURE',
}

export const ALL_L10_TEMPLATE_SUPPORT_DOMAINS:
  readonly L10TemplateSupportDomain[] =
    Object.values(L10TemplateSupportDomain);

/**
 * §10.6.3.2 — Contradiction domains a template must declare. These
 * are the explanatory tracks whose *presence* narrows or blocks the
 * template. A template that declares zero contradiction domains is
 * illegal (§10.6.3.4) — templates must always be narrowable.
 */
export enum L10TemplateContradictionDomain {
  DISTRIBUTION_DOMINANCE = 'DISTRIBUTION_DOMINANCE',
  OVERHANG_DOMINANCE = 'OVERHANG_DOMINANCE',
  LEVERAGE_DOMINANCE_UNDER_DEMAND_CLAIM = 'LEVERAGE_DOMINANCE_UNDER_DEMAND_CLAIM',
  LEVERAGE_UNWIND_ACTIVE = 'LEVERAGE_UNWIND_ACTIVE',
  STRUCTURAL_SUPPORT_GAP = 'STRUCTURAL_SUPPORT_GAP',
  NARRATIVE_COLLAPSE = 'NARRATIVE_COLLAPSE',
  ATTENTION_DECAY = 'ATTENTION_DECAY',
  FUNDAMENTAL_DEGRADATION = 'FUNDAMENTAL_DEGRADATION',
  PROTOCOL_QUALITY_DEGRADATION = 'PROTOCOL_QUALITY_DEGRADATION',
  CLEAN_DEMAND_EVIDENCE = 'CLEAN_DEMAND_EVIDENCE',
  QUALITY_IMPROVEMENT = 'QUALITY_IMPROVEMENT',
  MANIPULATION_ABSENCE = 'MANIPULATION_ABSENCE',
  SPILLOVER_ABSENCE = 'SPILLOVER_ABSENCE',
  ASSET_SPECIFIC_DOMINANCE = 'ASSET_SPECIFIC_DOMINANCE',
  REGIME_HOSTILITY = 'REGIME_HOSTILITY',
  SEQUENCE_POSTURE_INCOMPATIBLE = 'SEQUENCE_POSTURE_INCOMPATIBLE',
  VALIDATION_CONTRADICTION = 'VALIDATION_CONTRADICTION',
}

export const ALL_L10_TEMPLATE_CONTRADICTION_DOMAINS:
  readonly L10TemplateContradictionDomain[] =
    Object.values(L10TemplateContradictionDomain);

// ──────────────────────────────────────────────────────────────────
// §10.6.3.4 — Template legality class
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.4 / §10.6.15.1 — Final legality class a template evaluation
 * may return. Distinct from the L9.6 `L9TemplateLegalityClass` so
 * audits can tell whether a rejection came from temporal-family law
 * or from explanatory-family/template law.
 *
 *   CLEAN       — template passes and may emit as clean
 *   NARROWED    — template legal but must narrow (contradiction,
 *                 decay, or incomplete confirmations)
 *   BLOCKED     — template blocker condition matched (INV-10.6-D)
 *   UNSUPPORTED — template is not rolled out for this family yet
 *                 (§10.6.11.4 gating failed)
 *   INVALID     — template definition itself is malformed
 *                 (§10.6.3.4 doctrine failed)
 */
export enum L10TemplateLegalityClass {
  CLEAN = 'CLEAN',
  NARROWED = 'NARROWED',
  BLOCKED = 'BLOCKED',
  UNSUPPORTED = 'UNSUPPORTED',
  INVALID = 'INVALID',
}

export const ALL_L10_TEMPLATE_LEGALITY_CLASSES:
  readonly L10TemplateLegalityClass[] =
    Object.values(L10TemplateLegalityClass);

// ──────────────────────────────────────────────────────────────────
// §10.6.3.4 — Regime / sequence conditioning requirement tiers
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.3.4 — How strongly a template requires regime conditioning.
 * The template validator enforces that templates which need regime
 * input actually name an L8 regime posture.
 */
export enum L10TemplateRegimeRequirement {
  NONE = 'NONE',
  REQUIRED_PRESENT = 'REQUIRED_PRESENT',
  REQUIRED_COMPATIBLE = 'REQUIRED_COMPATIBLE',
  MUST_NARROW_UNDER_HOSTILE = 'MUST_NARROW_UNDER_HOSTILE',
}

export const ALL_L10_TEMPLATE_REGIME_REQUIREMENTS:
  readonly L10TemplateRegimeRequirement[] =
    Object.values(L10TemplateRegimeRequirement);

/**
 * §10.6.3.4 — How strongly a template requires sequence conditioning.
 */
export enum L10TemplateSequenceRequirement {
  NONE = 'NONE',
  REQUIRED_PRESENT = 'REQUIRED_PRESENT',
  REQUIRED_COMPATIBLE_STATE = 'REQUIRED_COMPATIBLE_STATE',
  MUST_NARROW_UNDER_INCOMPATIBLE = 'MUST_NARROW_UNDER_INCOMPATIBLE',
}

export const ALL_L10_TEMPLATE_SEQUENCE_REQUIREMENTS:
  readonly L10TemplateSequenceRequirement[] =
    Object.values(L10TemplateSequenceRequirement);

// ──────────────────────────────────────────────────────────────────
// §10.6.12.4 / §10.6.15.1 — Violation codes
// ──────────────────────────────────────────────────────────────────

/**
 * §10.6.12.4 / §10.6.15 — Family / template doctrine violation codes.
 *
 * The `L10F_` prefix is chosen so that audit records can distinguish
 * L10.6 family/template law failures (`L10F_*`) from:
 *   - L10.1 boundary failures (`L10_BND_*`)
 *   - L10.2 object failures (`L10O_*` via `L10HypothesisObjectViolationCode`)
 *   - L10.3 contract failures (`L10C_*`)
 *   - L10.4 runtime failures (`L10R_*`)
 *   - L10.5 evidence-semantics failures (`L10E_*`)
 */
export enum L10FamilyViolationCode {
  // ── Family doctrine (§10.6.2 / §10.6.3.5) ──
  FAMILY_ID_UNREGISTERED = 'L10F_FAMILY_ID_UNREGISTERED',
  FAMILY_DUPLICATE_ID = 'L10F_FAMILY_DUPLICATE_ID',
  FAMILY_ILLEGAL_SCOPE_TYPE = 'L10F_FAMILY_ILLEGAL_SCOPE_TYPE',
  FAMILY_MISSING_LEGAL_SCOPE_TYPES = 'L10F_FAMILY_MISSING_LEGAL_SCOPE_TYPES',
  FAMILY_MISSING_SUPPORT_DOMAINS = 'L10F_FAMILY_MISSING_SUPPORT_DOMAINS',
  FAMILY_MISSING_CONTRADICTION_DOMAINS = 'L10F_FAMILY_MISSING_CONTRADICTION_DOMAINS',
  FAMILY_MISSING_ROLLOUT_PHASE = 'L10F_FAMILY_MISSING_ROLLOUT_PHASE',
  FAMILY_MISSING_RESTRICTION_DEFAULT = 'L10F_FAMILY_MISSING_RESTRICTION_DEFAULT',
  FAMILY_SEMANTIC_OVERLAP = 'L10F_FAMILY_SEMANTIC_OVERLAP',
  FAMILY_MISSING_REGIME_REQUIREMENT = 'L10F_FAMILY_MISSING_REGIME_REQUIREMENT',
  FAMILY_MISSING_SEQUENCE_REQUIREMENT = 'L10F_FAMILY_MISSING_SEQUENCE_REQUIREMENT',
  FAMILY_TEMPLATE_LIST_EMPTY = 'L10F_FAMILY_TEMPLATE_LIST_EMPTY',
  FAMILY_TEMPLATE_LIST_DRIFT = 'L10F_FAMILY_TEMPLATE_LIST_DRIFT',

  // ── Template doctrine (§10.6.3.4) ──
  TEMPLATE_ID_UNREGISTERED = 'L10F_TEMPLATE_ID_UNREGISTERED',
  TEMPLATE_DUPLICATE_ID = 'L10F_TEMPLATE_DUPLICATE_ID',
  TEMPLATE_FAMILY_MISMATCH = 'L10F_TEMPLATE_FAMILY_MISMATCH',
  TEMPLATE_MISSING_FAMILY = 'L10F_TEMPLATE_MISSING_FAMILY',
  TEMPLATE_MISSING_VERSION = 'L10F_TEMPLATE_MISSING_VERSION',
  TEMPLATE_MISSING_SCOPE_TYPES = 'L10F_TEMPLATE_MISSING_SCOPE_TYPES',
  TEMPLATE_ILLEGAL_SCOPE_FOR_FAMILY = 'L10F_TEMPLATE_ILLEGAL_SCOPE_FOR_FAMILY',
  TEMPLATE_MISSING_SUPPORT_DOMAINS = 'L10F_TEMPLATE_MISSING_SUPPORT_DOMAINS',
  TEMPLATE_SUPPORT_DOMAIN_NOT_IN_FAMILY = 'L10F_TEMPLATE_SUPPORT_DOMAIN_NOT_IN_FAMILY',
  TEMPLATE_MISSING_CONTRADICTION_DOMAINS = 'L10F_TEMPLATE_MISSING_CONTRADICTION_DOMAINS',
  TEMPLATE_CONTRADICTION_DOMAIN_NOT_IN_FAMILY = 'L10F_TEMPLATE_CONTRADICTION_DOMAIN_NOT_IN_FAMILY',
  TEMPLATE_MISSING_CONFIRMATIONS = 'L10F_TEMPLATE_MISSING_CONFIRMATIONS',
  TEMPLATE_MISSING_INVALIDATIONS = 'L10F_TEMPLATE_MISSING_INVALIDATIONS',
  TEMPLATE_MISSING_REGIME_POSTURE = 'L10F_TEMPLATE_MISSING_REGIME_POSTURE',
  TEMPLATE_MISSING_SEQUENCE_POSTURE = 'L10F_TEMPLATE_MISSING_SEQUENCE_POSTURE',
  TEMPLATE_MISSING_VALIDATION_PATTERNS = 'L10F_TEMPLATE_MISSING_VALIDATION_PATTERNS',
  TEMPLATE_MISSING_RESTRICTION_DEFAULTS = 'L10F_TEMPLATE_MISSING_RESTRICTION_DEFAULTS',
  TEMPLATE_MISSING_ROLLOUT_PRIORITY = 'L10F_TEMPLATE_MISSING_ROLLOUT_PRIORITY',
  TEMPLATE_ROLLOUT_DISAGREES_WITH_FAMILY = 'L10F_TEMPLATE_ROLLOUT_DISAGREES_WITH_FAMILY',
  TEMPLATE_MISSING_BLOCKER_LAW = 'L10F_TEMPLATE_MISSING_BLOCKER_LAW',
  TEMPLATE_MISSING_CANDIDATE_PRIORITY = 'L10F_TEMPLATE_MISSING_CANDIDATE_PRIORITY',

  // ── State legality (§10.6.3.5 / INV-10.6-D) ──
  STATE_BLOCKER_CONDITION_PRESENT = 'L10F_STATE_BLOCKER_CONDITION_PRESENT',
  STATE_SUPPORT_GAP_UNDER_CLEAN = 'L10F_STATE_SUPPORT_GAP_UNDER_CLEAN',
  STATE_CONTRADICTION_FORCES_NARROW = 'L10F_STATE_CONTRADICTION_FORCES_NARROW',
  STATE_REGIME_HOSTILE_FORCES_NARROW = 'L10F_STATE_REGIME_HOSTILE_FORCES_NARROW',
  STATE_SEQUENCE_INCOMPATIBLE_FORCES_NARROW = 'L10F_STATE_SEQUENCE_INCOMPATIBLE_FORCES_NARROW',
  STATE_MISSING_REQUIRED_CONFIRMATION = 'L10F_STATE_MISSING_REQUIRED_CONFIRMATION',
  STATE_ACTIVE_INVALIDATION = 'L10F_STATE_ACTIVE_INVALIDATION',

  // ── Rollout doctrine (§10.6.11.4 / INV-10.6-F) ──
  ROLLOUT_PHASE_UNREGISTERED = 'L10F_ROLLOUT_PHASE_UNREGISTERED',
  ROLLOUT_ENABLE_WITHOUT_BACKING = 'L10F_ROLLOUT_ENABLE_WITHOUT_BACKING',
  ROLLOUT_ENABLE_OUT_OF_ORDER = 'L10F_ROLLOUT_ENABLE_OUT_OF_ORDER',
  ROLLOUT_MISSING_CERTIFICATION = 'L10F_ROLLOUT_MISSING_CERTIFICATION',
  ROLLOUT_DUPLICATE_ENTRY = 'L10F_ROLLOUT_DUPLICATE_ENTRY',
  ROLLOUT_FAMILY_NOT_READY = 'L10F_ROLLOUT_FAMILY_NOT_READY',

  // ── Interaction / leakage (§10.6.13 / INV-10.6-E, INV-10.6-G) ──
  TEMPLATE_LEAKS_JUDGMENT = 'L10F_TEMPLATE_LEAKS_JUDGMENT',
  TEMPLATE_LEAKS_FINALITY = 'L10F_TEMPLATE_LEAKS_FINALITY',
  TEMPLATE_IGNORES_L7_POSTURE = 'L10F_TEMPLATE_IGNORES_L7_POSTURE',
  TEMPLATE_IGNORES_L8_POSTURE = 'L10F_TEMPLATE_IGNORES_L8_POSTURE',
  TEMPLATE_IGNORES_L9_POSTURE = 'L10F_TEMPLATE_IGNORES_L9_POSTURE',
  FAMILY_ILLEGAL_TEMPLATE_INTERACTION = 'L10F_FAMILY_ILLEGAL_TEMPLATE_INTERACTION',
}

export const ALL_L10_FAMILY_VIOLATION_CODES:
  readonly L10FamilyViolationCode[] =
    Object.values(L10FamilyViolationCode);

/**
 * §10.6.12.4 / §10.6.15 — Structured issue emitted by every L10.6
 * validator. Consumed by the L10.6 audit surface.
 */
export interface L10FamilyValidationIssue {
  readonly code: L10FamilyViolationCode;
  readonly message: string;
  readonly family_id?: L10HypothesisFamilyId;
  readonly template_id?: L10HypothesisTemplateId;
  readonly context?: Readonly<Record<string, unknown>>;
}

export interface L10FamilyValidationReport {
  readonly ok: boolean;
  readonly issues: readonly L10FamilyValidationIssue[];
  readonly legality: L10TemplateLegalityClass;
}

export function makeL10FamilyIssue(
  code: L10FamilyViolationCode,
  message: string,
  extras: Partial<L10FamilyValidationIssue> = {},
): L10FamilyValidationIssue {
  return { code, message, ...extras };
}

/**
 * §10.6.15.1 — Codes that must flip `legality` to BLOCKED whenever any
 * issue with this code is present. Consumed by §10.6.15.2 Band D.
 */
export const L10_FAMILY_BLOCKING_CODES:
  readonly L10FamilyViolationCode[] = [
    L10FamilyViolationCode.STATE_BLOCKER_CONDITION_PRESENT,
    L10FamilyViolationCode.STATE_ACTIVE_INVALIDATION,
    L10FamilyViolationCode.FAMILY_ILLEGAL_TEMPLATE_INTERACTION,
    L10FamilyViolationCode.ROLLOUT_FAMILY_NOT_READY,
    L10FamilyViolationCode.ROLLOUT_ENABLE_OUT_OF_ORDER,
    L10FamilyViolationCode.ROLLOUT_ENABLE_WITHOUT_BACKING,
  ];

/**
 * §10.6.15.1 — Codes that force NARROWED legality. Narrowed templates
 * are still legal but must surface narrowing posture downstream so
 * that L10.3 output law prevents them emitting as clean.
 */
export const L10_FAMILY_NARROWING_CODES:
  readonly L10FamilyViolationCode[] = [
    L10FamilyViolationCode.STATE_CONTRADICTION_FORCES_NARROW,
    L10FamilyViolationCode.STATE_REGIME_HOSTILE_FORCES_NARROW,
    L10FamilyViolationCode.STATE_SEQUENCE_INCOMPATIBLE_FORCES_NARROW,
    L10FamilyViolationCode.STATE_MISSING_REQUIRED_CONFIRMATION,
    L10FamilyViolationCode.STATE_SUPPORT_GAP_UNDER_CLEAN,
  ];

/**
 * §10.6.15.1 — Codes that mark the template definition itself as
 * malformed (INVALID). These are structural violations, not runtime.
 */
export const L10_FAMILY_INVALID_CODES: readonly L10FamilyViolationCode[] = [
  L10FamilyViolationCode.FAMILY_ID_UNREGISTERED,
  L10FamilyViolationCode.FAMILY_DUPLICATE_ID,
  L10FamilyViolationCode.FAMILY_ILLEGAL_SCOPE_TYPE,
  L10FamilyViolationCode.FAMILY_MISSING_LEGAL_SCOPE_TYPES,
  L10FamilyViolationCode.FAMILY_MISSING_SUPPORT_DOMAINS,
  L10FamilyViolationCode.FAMILY_MISSING_CONTRADICTION_DOMAINS,
  L10FamilyViolationCode.FAMILY_MISSING_ROLLOUT_PHASE,
  L10FamilyViolationCode.FAMILY_MISSING_RESTRICTION_DEFAULT,
  L10FamilyViolationCode.FAMILY_MISSING_REGIME_REQUIREMENT,
  L10FamilyViolationCode.FAMILY_MISSING_SEQUENCE_REQUIREMENT,
  L10FamilyViolationCode.FAMILY_TEMPLATE_LIST_EMPTY,
  L10FamilyViolationCode.FAMILY_TEMPLATE_LIST_DRIFT,
  L10FamilyViolationCode.FAMILY_SEMANTIC_OVERLAP,

  L10FamilyViolationCode.TEMPLATE_ID_UNREGISTERED,
  L10FamilyViolationCode.TEMPLATE_DUPLICATE_ID,
  L10FamilyViolationCode.TEMPLATE_FAMILY_MISMATCH,
  L10FamilyViolationCode.TEMPLATE_MISSING_FAMILY,
  L10FamilyViolationCode.TEMPLATE_MISSING_VERSION,
  L10FamilyViolationCode.TEMPLATE_MISSING_SCOPE_TYPES,
  L10FamilyViolationCode.TEMPLATE_ILLEGAL_SCOPE_FOR_FAMILY,
  L10FamilyViolationCode.TEMPLATE_MISSING_SUPPORT_DOMAINS,
  L10FamilyViolationCode.TEMPLATE_SUPPORT_DOMAIN_NOT_IN_FAMILY,
  L10FamilyViolationCode.TEMPLATE_MISSING_CONTRADICTION_DOMAINS,
  L10FamilyViolationCode.TEMPLATE_CONTRADICTION_DOMAIN_NOT_IN_FAMILY,
  L10FamilyViolationCode.TEMPLATE_MISSING_CONFIRMATIONS,
  L10FamilyViolationCode.TEMPLATE_MISSING_INVALIDATIONS,
  L10FamilyViolationCode.TEMPLATE_MISSING_REGIME_POSTURE,
  L10FamilyViolationCode.TEMPLATE_MISSING_SEQUENCE_POSTURE,
  L10FamilyViolationCode.TEMPLATE_MISSING_VALIDATION_PATTERNS,
  L10FamilyViolationCode.TEMPLATE_MISSING_RESTRICTION_DEFAULTS,
  L10FamilyViolationCode.TEMPLATE_MISSING_ROLLOUT_PRIORITY,
  L10FamilyViolationCode.TEMPLATE_ROLLOUT_DISAGREES_WITH_FAMILY,
  L10FamilyViolationCode.TEMPLATE_MISSING_BLOCKER_LAW,
  L10FamilyViolationCode.TEMPLATE_MISSING_CANDIDATE_PRIORITY,
  L10FamilyViolationCode.TEMPLATE_LEAKS_JUDGMENT,
  L10FamilyViolationCode.TEMPLATE_LEAKS_FINALITY,
  L10FamilyViolationCode.TEMPLATE_IGNORES_L7_POSTURE,
  L10FamilyViolationCode.TEMPLATE_IGNORES_L8_POSTURE,
  L10FamilyViolationCode.TEMPLATE_IGNORES_L9_POSTURE,

  L10FamilyViolationCode.ROLLOUT_PHASE_UNREGISTERED,
  L10FamilyViolationCode.ROLLOUT_MISSING_CERTIFICATION,
  L10FamilyViolationCode.ROLLOUT_DUPLICATE_ENTRY,
];

/**
 * §10.6.15.1 — Deterministic classification of a single code into
 * a `L10TemplateLegalityClass`. Consumed by validators when picking
 * the final legality value to report alongside the issue set.
 */
export function classifyL10FamilyCode(
  code: L10FamilyViolationCode,
): L10TemplateLegalityClass {
  if (L10_FAMILY_BLOCKING_CODES.includes(code)) {
    return L10TemplateLegalityClass.BLOCKED;
  }
  if (L10_FAMILY_NARROWING_CODES.includes(code)) {
    return L10TemplateLegalityClass.NARROWED;
  }
  if (L10_FAMILY_INVALID_CODES.includes(code)) {
    return L10TemplateLegalityClass.INVALID;
  }
  return L10TemplateLegalityClass.UNSUPPORTED;
}

/**
 * §10.6.15.1 — Fold a set of codes into a single legality class.
 * Ordering: BLOCKED > INVALID > NARROWED > UNSUPPORTED > CLEAN.
 */
export function foldL10FamilyLegality(
  codes: readonly L10FamilyViolationCode[],
): L10TemplateLegalityClass {
  if (codes.length === 0) return L10TemplateLegalityClass.CLEAN;
  const classes = codes.map(classifyL10FamilyCode);
  if (classes.includes(L10TemplateLegalityClass.BLOCKED)) {
    return L10TemplateLegalityClass.BLOCKED;
  }
  if (classes.includes(L10TemplateLegalityClass.INVALID)) {
    return L10TemplateLegalityClass.INVALID;
  }
  if (classes.includes(L10TemplateLegalityClass.NARROWED)) {
    return L10TemplateLegalityClass.NARROWED;
  }
  if (classes.includes(L10TemplateLegalityClass.UNSUPPORTED)) {
    return L10TemplateLegalityClass.UNSUPPORTED;
  }
  return L10TemplateLegalityClass.CLEAN;
}
