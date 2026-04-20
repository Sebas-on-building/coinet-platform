/**
 * L9.1 — Constitutional Types
 *
 * §9.1.8.3 — Core enums for the entire Layer 9 constitution. Every later
 * L9 sublayer imports from here.
 *
 * Layer 9 is the sequence-and-temporal-meaning layer. It takes governed
 * primitives (L6), governed truth-tested validation surfaces (L7), and
 * governed regime state (L8), and determines how market-relevant states
 * unfolded through time — in what order, with what lead-lag structure,
 * with what phase progression, with what temporal meaning.
 *
 * L9 does not reinterpret validation truth (that is L7), does not
 * reclassify environment (that is L8), and does not produce scenario,
 * scoring, judgment, or recommendation output (that is later layers).
 */

/**
 * §9.1.1.4 — The thing that Layer 9 reasons about. At the constitutional
 * level we freeze the classes of sequence subjects L9 is allowed to
 * construct.
 *
 * Sequence subjects are not validation claims (L7), not regime
 * classifications (L8), not scenarios or judgments (L10+). They are
 * governed temporal meaning: ordered chains, lead-lag, phase, change
 * points, and decay posture.
 */
export enum L9SubjectClass {
  /** Ordered sequence of governed signals for a given subject/time window. */
  ORDERED_SIGNAL_CHAIN = 'ORDERED_SIGNAL_CHAIN',
  /** Governed lead-lag structure across related signals. */
  LEAD_LAG_STRUCTURE = 'LEAD_LAG_STRUCTURE',
  /** Governed phase progression of a setup / ordered chain. */
  PHASE_PROGRESSION = 'PHASE_PROGRESSION',
  /** Governed change-point evidence within a time window. */
  CHANGE_POINT_EVIDENCE = 'CHANGE_POINT_EVIDENCE',
  /** Governed decay state of signal significance over time. */
  DECAY_STATE = 'DECAY_STATE',
  /** Governed post-event behaviour window after an anchor shock/event. */
  POST_EVENT_WINDOW = 'POST_EVENT_WINDOW',
}

export const ALL_L9_SUBJECT_CLASSES: readonly L9SubjectClass[] =
  Object.values(L9SubjectClass);

/**
 * §9.1.5.1 / §9.1.5.2 — Allowed capability classes, grouped into A–D in
 * §9.1.5.4. Explicitly enumerated so the capability policy map and
 * validators can reason about them without string literals.
 */
export enum L9AllowedCapability {
  /** A — ingest governed lower-layer surfaces (L3–L8). */
  GOVERNED_INGESTION = 'GOVERNED_INGESTION',
  /** A — read historical lower-layer windows. */
  HISTORICAL_WINDOW_READ = 'HISTORICAL_WINDOW_READ',
  /** A — read evidence-backed context surfaces (L6/L7/L8). */
  EVIDENCE_CONTEXT_READ = 'EVIDENCE_CONTEXT_READ',

  /** B — ordered signal-chain assembly. */
  ORDERED_CHAIN_ASSEMBLY = 'ORDERED_CHAIN_ASSEMBLY',
  /** B — lead-lag detection across related signals. */
  LEAD_LAG_DETECTION = 'LEAD_LAG_DETECTION',
  /** B — change-point detection within a sequence window. */
  CHANGE_POINT_DETECTION = 'CHANGE_POINT_DETECTION',
  /** B — phase-progression classification for a chain. */
  PHASE_PROGRESSION_CLASSIFICATION = 'PHASE_PROGRESSION_CLASSIFICATION',
  /** B — decay classification of signal significance. */
  DECAY_CLASSIFICATION = 'DECAY_CLASSIFICATION',
  /** B — post-event behavior-window modeling after an anchored shock/event. */
  POST_EVENT_WINDOW_MODELING = 'POST_EVENT_WINDOW_MODELING',

  /** C — sequence-ambiguity classification, preserving ordering ambiguity. */
  SEQUENCE_AMBIGUITY_CLASSIFICATION = 'SEQUENCE_AMBIGUITY_CLASSIFICATION',
  /** C — causal-restraint tagging (temporal adjacency ≠ causality). */
  CAUSAL_RESTRAINT_TAGGING = 'CAUSAL_RESTRAINT_TAGGING',
  /** C — sequence-confidence derivation (not final judgment confidence). */
  SEQUENCE_CONFIDENCE_DERIVATION = 'SEQUENCE_CONFIDENCE_DERIVATION',
  /** C — sequence-restriction-profile derivation for downstream rights. */
  SEQUENCE_RESTRICTION_DERIVATION = 'SEQUENCE_RESTRICTION_DERIVATION',

  /** D — persist sequence state through governed L5 paths. */
  SEQUENCE_PERSISTENCE = 'SEQUENCE_PERSISTENCE',
  /** D — expose governed sequence read surfaces for later layers. */
  SEQUENCE_READ_SERVING = 'SEQUENCE_READ_SERVING',
  /** D — replay/repair support for sequence outputs. */
  SEQUENCE_REPLAY_REPAIR = 'SEQUENCE_REPLAY_REPAIR',
}

export const ALL_L9_ALLOWED_CAPABILITIES: readonly L9AllowedCapability[] =
  Object.values(L9AllowedCapability);

/**
 * §9.1.5.4 — Legal capability groupings.
 */
export enum L9CapabilityGroup {
  A_INPUT_CONSUMPTION = 'A_INPUT_CONSUMPTION',
  B_SEQUENCE_CONSTRUCTION = 'B_SEQUENCE_CONSTRUCTION',
  C_POSTURE_AND_CONDITIONING = 'C_POSTURE_AND_CONDITIONING',
  D_DURABILITY_AND_SERVING = 'D_DURABILITY_AND_SERVING',
}

export const ALL_L9_CAPABILITY_GROUPS: readonly L9CapabilityGroup[] =
  Object.values(L9CapabilityGroup);

/**
 * §9.1.6 — Forbidden actions with typed codes. Each must be rejected by
 * the forbidden-action registry.
 */
export enum L9ForbiddenAction {
  /** §9.1.6.1 — L7 validation truth may not be redefined inside L9. */
  VALIDATION_TRUTH_REDEFINITION = 'VALIDATION_TRUTH_REDEFINITION',
  /** §9.1.6.1 — L7 contradiction posture may not be ignored. */
  CONTRADICTION_POSTURE_IGNORE = 'CONTRADICTION_POSTURE_IGNORE',
  /** §9.1.6.1 — L7 restriction posture may not be ignored. */
  RESTRICTION_POSTURE_IGNORE = 'RESTRICTION_POSTURE_IGNORE',
  /** §9.1.6.1 — L7 restriction rights may not be widened. */
  RESTRICTION_BYPASS = 'RESTRICTION_BYPASS',
  /** §9.1.6.1 — L8 regime posture may not be ignored where sequence meaning depends on it. */
  REGIME_POSTURE_IGNORE = 'REGIME_POSTURE_IGNORE',
  /** §9.1.6.2 — L8 regime truth may not be locally reinterpreted. */
  REGIME_REINTERPRETATION = 'REGIME_REINTERPRETATION',
  /** §9.1.6.1 — Sequence labels must not be invented from raw ungated data. */
  RAW_DATA_SEQUENCE_INVENTION = 'RAW_DATA_SEQUENCE_INVENTION',
  /** §9.1.6.2 — Live L6 revalidation bypassing L7 is forbidden. */
  RAW_L6_REVALIDATION_BYPASS = 'RAW_L6_REVALIDATION_BYPASS',
  /** §9.1.6.1 — Ordering ambiguity may not be silently flattened. */
  AMBIGUITY_LAUNDERING = 'AMBIGUITY_LAUNDERING',
  /** §9.1.6.1 / §9.1.3.5 — Temporal adjacency may not be promoted into causal certainty. */
  CAUSAL_LAUNDERING = 'CAUSAL_LAUNDERING',
  /** §9.1.6.3 — Elegant temporal narratives not supported by governed evidence. */
  TEMPORAL_THEATRICS = 'TEMPORAL_THEATRICS',
  /** §9.1.6.1 — Final scenario selection is forbidden at L9. */
  FINAL_SCENARIO_LEAK = 'FINAL_SCENARIO_LEAK',
  /** §9.1.6.4 — Final judgment impersonation is forbidden. */
  FINAL_JUDGMENT_LEAK = 'FINAL_JUDGMENT_LEAK',
  /** §9.1.6.1 — Deterministic final scoring is forbidden. */
  FINAL_SCORE_LEAK = 'FINAL_SCORE_LEAK',
  /** §9.1.6.1 — Trade-recommendation language is forbidden. */
  RECOMMENDATION_LANGUAGE_LEAK = 'RECOMMENDATION_LANGUAGE_LEAK',
  /** §9.1.6.2 — Hypothesis/scenario engine semantics may not leak into L9. */
  HYPOTHESIS_LEAK = 'HYPOTHESIS_LEAK',
  /** §9.1.6.4 — Action bias inside sequence labels is forbidden. */
  ACTION_BIAS_IN_SEQUENCE_NAME = 'ACTION_BIAS_IN_SEQUENCE_NAME',
  /** §9.1.4.4 — Persistence/replay must not bypass L5. */
  ILLEGAL_L5_BYPASS = 'ILLEGAL_L5_BYPASS',
  /** §9.1.4.2 — Lower-layer identity (L3) may not be redefined. */
  LOWER_LAYER_IDENTITY_REDEFINITION = 'LOWER_LAYER_IDENTITY_REDEFINITION',
  /** §9.1.4.3 — Lower-layer graph (L4) semantics may not be redefined. */
  LOWER_LAYER_GRAPH_REDEFINITION = 'LOWER_LAYER_GRAPH_REDEFINITION',
  /** §9.1.4.5 — L6 primitive meaning/null/freshness law may not be redefined. */
  LOWER_LAYER_PRIMITIVE_REDEFINITION = 'LOWER_LAYER_PRIMITIVE_REDEFINITION',
  /** §9.1.6.2 — Stale sequence masquerading as fresh is forbidden. */
  STALE_SEQUENCE_MASQUERADE = 'STALE_SEQUENCE_MASQUERADE',
  /** §9.1.6.2 — Evidence-only surfaces may not be treated as decisive chain support. */
  EVIDENCE_ONLY_AS_DECISIVE = 'EVIDENCE_ONLY_AS_DECISIVE',
  /** §9.1.6.2 — L9 may not consume later-layer (L10+) scenario/judgment surfaces. */
  LATE_LAYER_CONSUMPTION = 'LATE_LAYER_CONSUMPTION',
}

export const ALL_L9_FORBIDDEN_ACTIONS: readonly L9ForbiddenAction[] =
  Object.values(L9ForbiddenAction);

/**
 * §9.1.4.1 — Hard dependency law. Layer 9 depends on L3, L4, L5, L6, L7,
 * and L8 only. Each dependency surface declares its source layer.
 */
export enum L9DependencyLayer {
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
  L6 = 'L6',
  L7 = 'L7',
  L8 = 'L8',
}

export const ALL_L9_DEPENDENCY_LAYERS: readonly L9DependencyLayer[] =
  Object.values(L9DependencyLayer);

/**
 * §9.1.4.9 — Dependency surface classes. The class describes what the
 * surface _is_ across its source layer. L7 and L8 surfaces are always
 * stable-handoff only (§9.1.4.8).
 */
export enum L9DependencySurfaceClass {
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
  // L7 — stable handoff surfaces only
  L7_VALIDATION_ASSESSMENT = 'L7_VALIDATION_ASSESSMENT',
  L7_CONTRADICTION_BUNDLE = 'L7_CONTRADICTION_BUNDLE',
  L7_CONFIDENCE_ASSESSMENT = 'L7_CONFIDENCE_ASSESSMENT',
  L7_RESTRICTION_PROFILE = 'L7_RESTRICTION_PROFILE',
  L7_VALIDATION_EVIDENCE_READ_SURFACE = 'L7_VALIDATION_EVIDENCE_READ_SURFACE',
  // L8 — stable handoff surfaces only
  L8_REGIME_STATE = 'L8_REGIME_STATE',
  L8_REGIME_CONFIDENCE_PROFILE = 'L8_REGIME_CONFIDENCE_PROFILE',
  L8_REGIME_TRANSITION_PROFILE = 'L8_REGIME_TRANSITION_PROFILE',
  L8_REGIME_MULTIPLIER_PROFILE = 'L8_REGIME_MULTIPLIER_PROFILE',
  L8_REGIME_EVIDENCE_READ_SURFACE = 'L8_REGIME_EVIDENCE_READ_SURFACE',
}

export const ALL_L9_DEPENDENCY_SURFACE_CLASSES: readonly L9DependencySurfaceClass[] =
  Object.values(L9DependencySurfaceClass);

/**
 * §9.1.5.4 — Legal Layer 9 output classes. Seven first-class sequence
 * outputs. Nothing else may be emitted by Layer 9.
 */
export enum L9OutputSurfaceClass {
  SEQUENCE_ASSESSMENT = 'SEQUENCE_ASSESSMENT',
  SEQUENCE_CHAIN = 'SEQUENCE_CHAIN',
  LEAD_LAG_PROFILE = 'LEAD_LAG_PROFILE',
  PHASE_STATE = 'PHASE_STATE',
  DECAY_PROFILE = 'DECAY_PROFILE',
  SEQUENCE_RESTRICTION_PROFILE = 'SEQUENCE_RESTRICTION_PROFILE',
  SEQUENCE_EVIDENCE_READ_SURFACE = 'SEQUENCE_EVIDENCE_READ_SURFACE',
}

export const ALL_L9_OUTPUT_SURFACE_CLASSES: readonly L9OutputSurfaceClass[] =
  Object.values(L9OutputSurfaceClass);

/**
 * How L9 is allowed to consume each dependency surface. Enforced by the
 * dependency-surface registry (§9.1.4.9).
 */
export type L9DependencyUsability =
  | 'SEQUENCE_SIGNAL'
  | 'ORDERING_SIGNAL'
  | 'CHANGE_POINT_SIGNAL'
  | 'PHASE_SIGNAL'
  | 'DECAY_SIGNAL'
  | 'REGIME_CONDITIONING'
  | 'CONFIDENCE_INPUT'
  | 'CONTEXT_ONLY'
  | 'EVIDENCE_ONLY'
  | 'PERSISTENCE_PATH'
  | 'REPLAY_REFERENCE'
  | 'REPAIR_REFERENCE';

export type L9CapabilityDecision = 'ALLOWED' | 'CONDITIONALLY_ALLOWED' | 'DENIED';

/**
 * §9.1.5.3 — Capability contexts matching the engine surfaces declared
 * in the mission statement. The capability policy map decides legality
 * per context.
 */
export type L9CapabilityContext =
  | 'SEQUENCE_ASSEMBLY'
  | 'SEQUENCE_CLASSIFICATION'
  | 'LEAD_LAG_DETECTION_CTX'
  | 'CHANGE_POINT_DETECTION_CTX'
  | 'PHASE_CLASSIFICATION_CTX'
  | 'DECAY_CLASSIFICATION_CTX'
  | 'CONFIDENCE_DERIVATION_CTX'
  | 'RESTRICTION_DERIVATION_CTX'
  | 'PERSISTENCE_CTX'
  | 'DOWNSTREAM_READ_CTX'
  | 'REPLAY_PATH'
  | 'REPAIR_PATH';

export const ALL_L9_CAPABILITY_CONTEXTS: readonly L9CapabilityContext[] = [
  'SEQUENCE_ASSEMBLY',
  'SEQUENCE_CLASSIFICATION',
  'LEAD_LAG_DETECTION_CTX',
  'CHANGE_POINT_DETECTION_CTX',
  'PHASE_CLASSIFICATION_CTX',
  'DECAY_CLASSIFICATION_CTX',
  'CONFIDENCE_DERIVATION_CTX',
  'RESTRICTION_DERIVATION_CTX',
  'PERSISTENCE_CTX',
  'DOWNSTREAM_READ_CTX',
  'REPLAY_PATH',
  'REPAIR_PATH',
];
