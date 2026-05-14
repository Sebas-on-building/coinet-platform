/**
 * L11.1 — Constitutional Types
 *
 * §11.1.13 — Core enums for the entire Layer 11 constitution. Every
 * later L11 sublayer imports from here.
 *
 * Layer 11 is the Deterministic Scoring Engine. It converts governed
 * lower-layer truth from L3–L10 into deterministic, interpretable,
 * attributable, versioned scores. It does not invent new truth, does
 * not re-validate (L7), does not reclassify regime (L8), does not
 * rewrite sequence meaning (L9), does not rebuild hypotheses (L10),
 * and never emits final scenario, judgment, or recommendation
 * semantics.
 */

/**
 * §11.1.13.2 — The thing Layer 11 reasons about: deterministic score
 * subjects across families, formulas, components, attribution,
 * calibration, and drift.
 */
export enum L11SubjectClass {
  /** A concrete deterministic score subject (one numeric output). */
  SCORE_SUBJECT = 'SCORE_SUBJECT',
  /** A score family (opportunity, risk, timing, etc.). */
  SCORE_FAMILY_SUBJECT = 'SCORE_FAMILY_SUBJECT',
  /** A formula version producing scores within a family. */
  SCORE_FORMULA_SUBJECT = 'SCORE_FORMULA_SUBJECT',
  /** A score component / sub-score within a parent score. */
  SCORE_COMPONENT_SUBJECT = 'SCORE_COMPONENT_SUBJECT',
  /** Per-score attribution surface (what produced the value). */
  SCORE_ATTRIBUTION_SUBJECT = 'SCORE_ATTRIBUTION_SUBJECT',
  /** Calibration hook subject for empirical evaluation later. */
  SCORE_CALIBRATION_SUBJECT = 'SCORE_CALIBRATION_SUBJECT',
  /** Drift hook subject for monitoring score behaviour over time. */
  SCORE_DRIFT_SUBJECT = 'SCORE_DRIFT_SUBJECT',
}

export const ALL_L11_SUBJECT_CLASSES: readonly L11SubjectClass[] =
  Object.values(L11SubjectClass);

/**
 * §11.1.13.3 / §11.1.7 — Allowed capabilities for the Deterministic
 * Scoring Engine, grouped A–F. Enumerated so the policy map and
 * validators can reason about them without string literals.
 */
export enum L11AllowedCapability {
  /** A — ingest governed lower-layer (L3–L10) surfaces. */
  GOVERNED_INGESTION = 'GOVERNED_INGESTION',
  /** A — read historical governed surfaces. */
  HISTORICAL_GOVERNED_READ = 'HISTORICAL_GOVERNED_READ',
  /** A — read evidence-backed context surfaces. */
  EVIDENCE_CONTEXT_READ = 'EVIDENCE_CONTEXT_READ',

  /** B — declare a score's meaning claim (what it measures and not). */
  DECLARE_SCORE_MEANING = 'DECLARE_SCORE_MEANING',
  /** B — declare a score's direction semantics. */
  DECLARE_SCORE_DIRECTION = 'DECLARE_SCORE_DIRECTION',

  /** C — compute a deterministic score over governed inputs. */
  COMPUTE_DETERMINISTIC_SCORE = 'COMPUTE_DETERMINISTIC_SCORE',
  /** C — compute a deterministic component breakdown. */
  COMPUTE_COMPONENT_BREAKDOWN = 'COMPUTE_COMPONENT_BREAKDOWN',
  /** C — apply governed modifiers (regime/sequence/hypothesis). */
  APPLY_GOVERNED_MODIFIERS = 'APPLY_GOVERNED_MODIFIERS',
  /** C — apply explicit missing-data posture (penalty/cap/disclosure). */
  APPLY_MISSING_DATA_POSTURE = 'APPLY_MISSING_DATA_POSTURE',

  /** D — attach explicit attribution to a score. */
  ATTACH_SCORE_ATTRIBUTION = 'ATTACH_SCORE_ATTRIBUTION',
  /** D — attach a calibration hook for later evaluation. */
  ATTACH_CALIBRATION_HOOK = 'ATTACH_CALIBRATION_HOOK',
  /** D — attach a drift hook for monitoring. */
  ATTACH_DRIFT_HOOK = 'ATTACH_DRIFT_HOOK',

  /** E — derive score-specific downstream restrictions. */
  DERIVE_SCORE_RESTRICTIONS = 'DERIVE_SCORE_RESTRICTIONS',

  /** F — materialize a score output through governed L5 paths. */
  MATERIALIZE_SCORE_OUTPUT = 'MATERIALIZE_SCORE_OUTPUT',
  /** F — expose governed score read surfaces to later layers. */
  READ_SCORE_SURFACE = 'READ_SCORE_SURFACE',
  /** F — replay a previously emitted score deterministically. */
  REPLAY_SCORE = 'REPLAY_SCORE',
  /** F — repair a degraded score under governed paths. */
  REPAIR_SCORE = 'REPAIR_SCORE',
}

export const ALL_L11_ALLOWED_CAPABILITIES: readonly L11AllowedCapability[] =
  Object.values(L11AllowedCapability);

/**
 * §11.1.13 / §11.1.7 — Legal capability groupings A–F.
 */
export enum L11CapabilityGroup {
  A_INPUT_CONSUMPTION = 'A_INPUT_CONSUMPTION',
  B_SCORE_DECLARATION = 'B_SCORE_DECLARATION',
  C_SCORE_COMPUTATION = 'C_SCORE_COMPUTATION',
  D_ATTRIBUTION_AND_CALIBRATION = 'D_ATTRIBUTION_AND_CALIBRATION',
  E_RESTRICTION_DERIVATION = 'E_RESTRICTION_DERIVATION',
  F_DURABILITY_AND_SERVING = 'F_DURABILITY_AND_SERVING',
}

export const ALL_L11_CAPABILITY_GROUPS: readonly L11CapabilityGroup[] =
  Object.values(L11CapabilityGroup);

/**
 * §11.1.5 / §11.1.8 / §11.1.13.4 — Forbidden actions at Layer 11. Each
 * must be rejected by the forbidden-action registry.
 */
export enum L11ForbiddenAction {
  /** §11.1.5.1 — Final judgment may never be emitted at Layer 11. */
  FINAL_JUDGMENT_EMISSION = 'FINAL_JUDGMENT_EMISSION',
  /** §11.1.5.4 — Buy/sell/avoid recommendation may never be emitted. */
  RECOMMENDATION_EMISSION = 'RECOMMENDATION_EMISSION',
  /** §11.1.5.1 — Scenario winner selection is forbidden at L11. */
  SCENARIO_WINNER_EMISSION = 'SCENARIO_WINNER_EMISSION',
  /** §11.1.5.4 — Trade action emission is forbidden. */
  TRADE_ACTION_EMISSION = 'TRADE_ACTION_EMISSION',
  /** §11.1.4 / §11.1.10 — A score without a declared meaning claim. */
  VIBE_SCORE_CREATION = 'VIBE_SCORE_CREATION',
  /** §11.1.4.2 / §11.1.10 — Score must declare attribution. */
  UNATTRIBUTED_SCORE_EMISSION = 'UNATTRIBUTED_SCORE_EMISSION',
  /** §11.1.4.2 / §11.1.10 — Score must declare its formula version. */
  UNVERSIONED_SCORE_EMISSION = 'UNVERSIONED_SCORE_EMISSION',
  /** §11.1.10 — Score lacks a meaning claim entirely. */
  MEANING_CLAIM_ABSENT = 'MEANING_CLAIM_ABSENT',
  /** §11.1.10.2 — Score direction not declared. */
  DIRECTION_UNDECLARED = 'DIRECTION_UNDECLARED',
  /** §11.1.10.3 — Mixed direction semantics in a single score. */
  DIRECTION_MIXING = 'DIRECTION_MIXING',
  /** §11.1.8 / §11.1.10 — Missing data laundered as neutral truth. */
  MISSING_DATA_LAUNDERING = 'MISSING_DATA_LAUNDERING',
  /** §11.1.8 — Contradiction laundered as clean support. */
  CONTRADICTION_LAUNDERING = 'CONTRADICTION_LAUNDERING',
  /** §11.1.6 — Lower-layer truth rebuilt inside L11. */
  LOWER_LAYER_REBUILD = 'LOWER_LAYER_REBUILD',
  /** §11.1.6.9 — L10 hypotheses rebuilt live from L6–L9 inside L11. */
  L10_HYPOTHESIS_REBUILD = 'L10_HYPOTHESIS_REBUILD',
  /** §11.1.6.7 — L8 regime overridden / reclassified inside L11. */
  REGIME_OVERRIDE = 'REGIME_OVERRIDE',
  /** §11.1.6.8 — L9 sequence overridden / reinterpreted inside L11. */
  SEQUENCE_OVERRIDE = 'SEQUENCE_OVERRIDE',
  /** §11.1.6.6 — L7 validation re-run live from L6 inside L11. */
  L7_LIVE_REVALIDATION = 'L7_LIVE_REVALIDATION',
  /** §11.1.6.5 — Persistence/replay must remain L5-routed. */
  PERSISTENCE_BYPASS = 'PERSISTENCE_BYPASS',
  /** §11.1.6 — L11 may not consume later-layer (L12+) surfaces. */
  LATE_LAYER_CONSUMPTION = 'LATE_LAYER_CONSUMPTION',
  /** §11.1.11 — Score may not widen lower-layer restriction rights. */
  RESTRICTION_BYPASS = 'RESTRICTION_BYPASS',
  /** §11.1.6.6 — L7 restriction posture must be honoured. */
  RESTRICTION_POSTURE_IGNORED = 'RESTRICTION_POSTURE_IGNORED',
  /** §11.1.4 / §11.1.10 — Production scores must carry calibration. */
  CALIBRATION_HOOK_ABSENT = 'CALIBRATION_HOOK_ABSENT',
  /** §11.1.6.2 — L3 identity may not be re-resolved. */
  IDENTITY_REDEFINITION = 'IDENTITY_REDEFINITION',
  /** §11.1.6.2 — L3 metric meaning may not be redefined. */
  METRIC_REDEFINITION = 'METRIC_REDEFINITION',
  /** §11.1.6.3 — L4 graph/propagation semantics may not be redefined. */
  GRAPH_REDEFINITION = 'GRAPH_REDEFINITION',
  /** §11.1.6.5 — L6 primitive meaning may not be redefined. */
  PRIMITIVE_REDEFINITION = 'PRIMITIVE_REDEFINITION',
  /** §11.1.6.9 — L10 hypothesis spread/reliance may not be ignored. */
  HYPOTHESIS_POSTURE_IGNORED = 'HYPOTHESIS_POSTURE_IGNORED',
  /** §11.1.6.9 — Narrow hypothesis spread may not be hidden by score. */
  HYPOTHESIS_SPREAD_IGNORED = 'HYPOTHESIS_SPREAD_IGNORED',
  /** §11.1.5.4 — A score result treated as a trade action. */
  SCORE_AS_ACTION = 'SCORE_AS_ACTION',
}

export const ALL_L11_FORBIDDEN_ACTIONS: readonly L11ForbiddenAction[] =
  Object.values(L11ForbiddenAction);

/**
 * §11.1.6.1 — Hard dependency law. Layer 11 depends on L3–L10 only.
 */
export enum L11DependencyLayer {
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
  L6 = 'L6',
  L7 = 'L7',
  L8 = 'L8',
  L9 = 'L9',
  L10 = 'L10',
}

export const ALL_L11_DEPENDENCY_LAYERS: readonly L11DependencyLayer[] =
  Object.values(L11DependencyLayer);

/**
 * §11.1.6 / §11.1.14 — Dependency surface classes.
 * L7/L8/L9/L10 surfaces are stable-handoff only.
 */
export enum L11DependencySurfaceClass {
  // L3
  L3_CANONICAL_OBJECT = 'L3_CANONICAL_OBJECT',
  L3_METRIC_CONTRACT = 'L3_METRIC_CONTRACT',
  L3_CONFIDENCE_SCORE = 'L3_CONFIDENCE_SCORE',
  L3_RECONCILIATION_OUTCOME = 'L3_RECONCILIATION_OUTCOME',
  // L4
  L4_GRAPH_RELATION = 'L4_GRAPH_RELATION',
  L4_GRAPH_CONTEXT_PACKAGE = 'L4_GRAPH_CONTEXT_PACKAGE',
  L4_TEMPORAL_GRAPH_STATE = 'L4_TEMPORAL_GRAPH_STATE',
  // L5
  L5_STORAGE_WRITE_COORDINATION = 'L5_STORAGE_WRITE_COORDINATION',
  L5_STORAGE_READ_RESOLUTION = 'L5_STORAGE_READ_RESOLUTION',
  L5_STORAGE_REPLAY = 'L5_STORAGE_REPLAY',
  L5_STORAGE_REPAIR = 'L5_STORAGE_REPAIR',
  // L6
  L6_CURRENT_FEATURE_STATE = 'L6_CURRENT_FEATURE_STATE',
  L6_FEATURE_HISTORY = 'L6_FEATURE_HISTORY',
  L6_EVENT_INSTANCE = 'L6_EVENT_INSTANCE',
  L6_EVENT_HISTORY = 'L6_EVENT_HISTORY',
  L6_EVIDENCE_PACK = 'L6_EVIDENCE_PACK',
  // L7 — stable handoff only
  L7_VALIDATION_ASSESSMENT = 'L7_VALIDATION_ASSESSMENT',
  L7_CONTRADICTION_BUNDLE = 'L7_CONTRADICTION_BUNDLE',
  L7_CONFIDENCE_ASSESSMENT = 'L7_CONFIDENCE_ASSESSMENT',
  L7_RESTRICTION_PROFILE = 'L7_RESTRICTION_PROFILE',
  L7_VALIDATION_EVIDENCE_READ_SURFACE = 'L7_VALIDATION_EVIDENCE_READ_SURFACE',
  // L8 — stable handoff only
  L8_REGIME_STATE = 'L8_REGIME_STATE',
  L8_REGIME_CONFIDENCE_PROFILE = 'L8_REGIME_CONFIDENCE_PROFILE',
  L8_REGIME_TRANSITION_PROFILE = 'L8_REGIME_TRANSITION_PROFILE',
  L8_REGIME_MULTIPLIER_PROFILE = 'L8_REGIME_MULTIPLIER_PROFILE',
  L8_REGIME_EVIDENCE_READ_SURFACE = 'L8_REGIME_EVIDENCE_READ_SURFACE',
  // L9 — stable handoff only
  L9_SEQUENCE_ASSESSMENT = 'L9_SEQUENCE_ASSESSMENT',
  L9_SEQUENCE_CHAIN = 'L9_SEQUENCE_CHAIN',
  L9_LEAD_LAG_PROFILE = 'L9_LEAD_LAG_PROFILE',
  L9_PHASE_STATE = 'L9_PHASE_STATE',
  L9_DECAY_PROFILE = 'L9_DECAY_PROFILE',
  L9_SEQUENCE_RESTRICTION_PROFILE = 'L9_SEQUENCE_RESTRICTION_PROFILE',
  L9_SEQUENCE_EVIDENCE_READ_SURFACE = 'L9_SEQUENCE_EVIDENCE_READ_SURFACE',
  // L10 — stable handoff only (per §10.9.7.3)
  L10_HYPOTHESIS_RANKING_SURFACE = 'L10_HYPOTHESIS_RANKING_SURFACE',
  L10_HYPOTHESIS_SPREAD_SURFACE = 'L10_HYPOTHESIS_SPREAD_SURFACE',
  L10_HYPOTHESIS_RELIANCE_SURFACE = 'L10_HYPOTHESIS_RELIANCE_SURFACE',
  L10_CONFIRMATION_INVALIDATION_SURFACE = 'L10_CONFIRMATION_INVALIDATION_SURFACE',
  L10_SHIFT_CONDITION_SURFACE = 'L10_SHIFT_CONDITION_SURFACE',
  L10_HYPOTHESIS_HISTORY_WINDOW = 'L10_HYPOTHESIS_HISTORY_WINDOW',
  L10_HYPOTHESIS_EVIDENCE_BUNDLE = 'L10_HYPOTHESIS_EVIDENCE_BUNDLE',
  L10_HYPOTHESIS_LINEAGE_VIEW = 'L10_HYPOTHESIS_LINEAGE_VIEW',
}

export const ALL_L11_DEPENDENCY_SURFACE_CLASSES:
  readonly L11DependencySurfaceClass[] =
  Object.values(L11DependencySurfaceClass);

/**
 * §11.1.9.2 / §11.1.13 — Legal Layer 11 output surface classes.
 * Exactly eight first-class score-domain surfaces.
 */
export enum L11OutputSurfaceClass {
  SCORE_OUTPUT = 'SCORE_OUTPUT',
  SCORE_COMPONENT_BREAKDOWN = 'SCORE_COMPONENT_BREAKDOWN',
  SCORE_ATTRIBUTION = 'SCORE_ATTRIBUTION',
  SCORE_MODIFIER_PROFILE = 'SCORE_MODIFIER_PROFILE',
  SCORE_MISSING_DATA_PROFILE = 'SCORE_MISSING_DATA_PROFILE',
  SCORE_CALIBRATION_HOOK = 'SCORE_CALIBRATION_HOOK',
  SCORE_DRIFT_HOOK = 'SCORE_DRIFT_HOOK',
  SCORE_EVIDENCE_READ_SURFACE = 'SCORE_EVIDENCE_READ_SURFACE',
}

export const ALL_L11_OUTPUT_SURFACE_CLASSES:
  readonly L11OutputSurfaceClass[] =
  Object.values(L11OutputSurfaceClass);

/**
 * §11.1.10.1 — Score meaning-claim classes. Every score must declare
 * which class of governed quantitative interpretation it expresses.
 */
export enum L11ScoreMeaningClaimClass {
  OPPORTUNITY_QUALITY = 'OPPORTUNITY_QUALITY',
  DOWNSIDE_RISK = 'DOWNSIDE_RISK',
  TIMING_QUALITY = 'TIMING_QUALITY',
  THESIS_COHERENCE = 'THESIS_COHERENCE',
  SIGNAL_STACK_RELIABILITY = 'SIGNAL_STACK_RELIABILITY',
  MARKET_STRUCTURE_QUALITY = 'MARKET_STRUCTURE_QUALITY',
  WHALE_BEHAVIOR_INTERPRETATION = 'WHALE_BEHAVIOR_INTERPRETATION',
  SUPPLY_OVERHANG_RISK = 'SUPPLY_OVERHANG_RISK',
  TRUSTWORTHINESS_OF_SIGNAL = 'TRUSTWORTHINESS_OF_SIGNAL',
}

export const ALL_L11_SCORE_MEANING_CLAIM_CLASSES:
  readonly L11ScoreMeaningClaimClass[] =
  Object.values(L11ScoreMeaningClaimClass);

/**
 * §11.1.10.2 — Score direction classes. Higher must mean exactly one
 * thing per score: better, worse, more intense, or more uncertain.
 */
export enum L11ScoreDirectionClass {
  HIGHER_IS_BETTER = 'HIGHER_IS_BETTER',
  HIGHER_IS_WORSE = 'HIGHER_IS_WORSE',
  HIGHER_MEANS_MORE_INTENSE = 'HIGHER_MEANS_MORE_INTENSE',
  HIGHER_MEANS_MORE_UNCERTAIN = 'HIGHER_MEANS_MORE_UNCERTAIN',
}

export const ALL_L11_SCORE_DIRECTION_CLASSES:
  readonly L11ScoreDirectionClass[] =
  Object.values(L11ScoreDirectionClass);

/**
 * §11.1.11 — Score downstream-use restriction flags.
 */
export enum L11ScoreRestrictionFlag {
  SCENARIO_WEIGHTING_ALLOWED = 'SCENARIO_WEIGHTING_ALLOWED',
  RANKING_SUPPORT_ALLOWED = 'RANKING_SUPPORT_ALLOWED',
  JUDGMENT_SUPPORT_ALLOWED = 'JUDGMENT_SUPPORT_ALLOWED',
  CALIBRATION_ONLY = 'CALIBRATION_ONLY',
  EVIDENCE_ONLY = 'EVIDENCE_ONLY',
  FINAL_RECOMMENDATION_BLOCKED = 'FINAL_RECOMMENDATION_BLOCKED',
  REQUIRES_ATTRIBUTION_DISCLOSURE = 'REQUIRES_ATTRIBUTION_DISCLOSURE',
  REQUIRES_MISSING_DATA_DISCLOSURE = 'REQUIRES_MISSING_DATA_DISCLOSURE',
}

export const ALL_L11_SCORE_RESTRICTION_FLAGS:
  readonly L11ScoreRestrictionFlag[] =
  Object.values(L11ScoreRestrictionFlag);

/**
 * How L11 is allowed to consume each dependency surface. Enforced by
 * the dependency-surface registry.
 */
export type L11DependencyUsability =
  | 'SUPPORT_INPUT'
  | 'CONFIDENCE_INPUT'
  | 'REGIME_CONDITIONING'
  | 'SEQUENCE_CONDITIONING'
  | 'HYPOTHESIS_CONDITIONING'
  | 'RANKING_INPUT'
  | 'ATTRIBUTION_INPUT'
  | 'CALIBRATION_INPUT'
  | 'CONTEXT_ONLY'
  | 'EVIDENCE_ONLY'
  | 'PERSISTENCE_PATH'
  | 'REPLAY_REFERENCE'
  | 'REPAIR_REFERENCE';

export type L11CapabilityDecision =
  | 'ALLOWED'
  | 'CONDITIONALLY_ALLOWED'
  | 'DENIED';

/**
 * §11.1.7 — Capability contexts matching the engine surfaces. Enforced
 * by the capability policy map.
 */
export type L11CapabilityContext =
  | 'INGESTION_CTX'
  | 'MEANING_DECLARATION_CTX'
  | 'DIRECTION_DECLARATION_CTX'
  | 'COMPUTATION_CTX'
  | 'COMPONENT_BREAKDOWN_CTX'
  | 'MODIFIER_CTX'
  | 'MISSING_DATA_CTX'
  | 'ATTRIBUTION_CTX'
  | 'CALIBRATION_CTX'
  | 'DRIFT_CTX'
  | 'RESTRICTION_DERIVATION_CTX'
  | 'MATERIALIZATION_CTX'
  | 'DOWNSTREAM_READ_CTX'
  | 'REPLAY_PATH'
  | 'REPAIR_PATH';

export const ALL_L11_CAPABILITY_CONTEXTS: readonly L11CapabilityContext[] = [
  'INGESTION_CTX',
  'MEANING_DECLARATION_CTX',
  'DIRECTION_DECLARATION_CTX',
  'COMPUTATION_CTX',
  'COMPONENT_BREAKDOWN_CTX',
  'MODIFIER_CTX',
  'MISSING_DATA_CTX',
  'ATTRIBUTION_CTX',
  'CALIBRATION_CTX',
  'DRIFT_CTX',
  'RESTRICTION_DERIVATION_CTX',
  'MATERIALIZATION_CTX',
  'DOWNSTREAM_READ_CTX',
  'REPLAY_PATH',
  'REPAIR_PATH',
];
