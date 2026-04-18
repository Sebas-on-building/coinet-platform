/**
 * L8.1 — Constitutional Types
 *
 * §8.1.7.2 — Core enums for the entire Layer 8 constitution. Every later
 * L8 sublayer imports from here.
 *
 * Layer 8 is the environment-classification layer. It takes governed
 * primitives, governed truth-tested validation surfaces, and governed
 * relational context, then classifies the current market environment
 * those truths belong to.
 */

/**
 * §8.1.1.2 — The thing that Layer 8 reasons about. At the constitutional
 * level we freeze the classes of regime subjects L8 is allowed to
 * construct.
 *
 * Regime subjects are not claims (that's L7), not scenarios (that's L9+),
 * not recommendations. They are environment classifications.
 */
export enum L8SubjectClass {
  /** Broad market environment (macro risk, volatility, liquidity). */
  MARKET_REGIME = 'MARKET_REGIME',
  /** Sector or ecosystem environment (rotation, expansion, contraction). */
  SECTOR_REGIME = 'SECTOR_REGIME',
  /** Asset-level environment (maturity, fragility, trend posture). */
  ASSET_REGIME = 'ASSET_REGIME',
  /** Funding/leverage environment (carry, unwind risk, deleveraging). */
  LEVERAGE_REGIME = 'LEVERAGE_REGIME',
  /** Liquidity environment (depth, fragility, stress). */
  LIQUIDITY_REGIME = 'LIQUIDITY_REGIME',
}

export const ALL_L8_SUBJECT_CLASSES: readonly L8SubjectClass[] =
  Object.values(L8SubjectClass);

/**
 * §8.1.4.1 — Allowed capability classes (A–D grouping in §8.1.4.2).
 * Explicitly enumerated so the capability policy map and validators can
 * reason about them without string literals.
 */
export enum L8AllowedCapability {
  /** A — ingest governed lower-layer surfaces. */
  GOVERNED_INGESTION = 'GOVERNED_INGESTION',
  /** A — read historical lower-layer windows. */
  HISTORICAL_WINDOW_READ = 'HISTORICAL_WINDOW_READ',
  /** A — read evidence-backed context surfaces. */
  EVIDENCE_CONTEXT_READ = 'EVIDENCE_CONTEXT_READ',
  /** B — primary regime determination. */
  PRIMARY_REGIME_CLASSIFICATION = 'PRIMARY_REGIME_CLASSIFICATION',
  /** B — secondary regime determination. */
  SECONDARY_REGIME_CLASSIFICATION = 'SECONDARY_REGIME_CLASSIFICATION',
  /** B — multi-family coexistence handling. */
  MULTI_FAMILY_COEXISTENCE = 'MULTI_FAMILY_COEXISTENCE',
  /** B — regime transition detection. */
  TRANSITION_DETECTION = 'TRANSITION_DETECTION',
  /** C — regime confidence. */
  REGIME_CONFIDENCE_DERIVATION = 'REGIME_CONFIDENCE_DERIVATION',
  /** C — transition risk. */
  TRANSITION_RISK_DERIVATION = 'TRANSITION_RISK_DERIVATION',
  /** C — interpretation multiplier derivation. */
  MULTIPLIER_DERIVATION = 'MULTIPLIER_DERIVATION',
  /** D — persist regime state through L5. */
  REGIME_PERSISTENCE = 'REGIME_PERSISTENCE',
  /** D — expose governed read surfaces. */
  REGIME_READ_SERVING = 'REGIME_READ_SERVING',
  /** D — replay/repair support. */
  REGIME_REPLAY_REPAIR = 'REGIME_REPLAY_REPAIR',
}

export const ALL_L8_ALLOWED_CAPABILITIES: readonly L8AllowedCapability[] =
  Object.values(L8AllowedCapability);

/**
 * §8.1.4.2 — Legal capability groupings.
 */
export enum L8CapabilityGroup {
  A_INPUT_CONSUMPTION = 'A_INPUT_CONSUMPTION',
  B_ENVIRONMENT_CLASSIFICATION = 'B_ENVIRONMENT_CLASSIFICATION',
  C_RELIANCE_AND_CONDITIONING = 'C_RELIANCE_AND_CONDITIONING',
  D_DURABILITY_AND_SERVING = 'D_DURABILITY_AND_SERVING',
}

export const ALL_L8_CAPABILITY_GROUPS: readonly L8CapabilityGroup[] =
  Object.values(L8CapabilityGroup);

/**
 * §8.1.5.6 — Forbidden actions with typed codes. Each must be rejected by
 * the forbidden-action registry.
 */
export enum L8ForbiddenAction {
  /** §8.1.5.1 — L7 validation truth must not be redefined. */
  VALIDATION_TRUTH_REDEFINITION = 'VALIDATION_TRUTH_REDEFINITION',
  /** §8.1.5.1 — Contradiction posture from L7 may not be ignored. */
  CONTRADICTION_POSTURE_IGNORE = 'CONTRADICTION_POSTURE_IGNORE',
  /** §8.1.5.1 — Restriction posture from L7 may not be ignored. */
  RESTRICTION_POSTURE_IGNORE = 'RESTRICTION_POSTURE_IGNORE',
  /** §8.1.5.4 — Restriction rights may not be widened locally. */
  RESTRICTION_BYPASS = 'RESTRICTION_BYPASS',
  /** §8.1.5.1 — Regime labels must not be invented from raw ungated data. */
  RAW_DATA_REGIME_INVENTION = 'RAW_DATA_REGIME_INVENTION',
  /** §8.1.5.1 — L6 raw live recomputation that bypasses L7 is banned. */
  RAW_L6_REVALIDATION_BYPASS = 'RAW_L6_REVALIDATION_BYPASS',
  /** §8.1.5.3 — Multi-regime ambiguity may not be silently flattened. */
  AMBIGUITY_LAUNDERING = 'AMBIGUITY_LAUNDERING',
  /** §8.1.5.1 — Final scenario selection is forbidden. */
  FINAL_SCENARIO_LEAK = 'FINAL_SCENARIO_LEAK',
  /** §8.1.5.5 — Final judgment impersonation is forbidden. */
  FINAL_JUDGMENT_LEAK = 'FINAL_JUDGMENT_LEAK',
  /** §8.1.5.1 — Recommendations are forbidden. */
  RECOMMENDATION_LANGUAGE_LEAK = 'RECOMMENDATION_LANGUAGE_LEAK',
  /** §8.1.5.2 — Hidden score overrides as multipliers are forbidden. */
  SCORE_OVERRIDE_AS_MULTIPLIER = 'SCORE_OVERRIDE_AS_MULTIPLIER',
  /** §8.1.5.2 — Action bias in regime labels is forbidden. */
  ACTION_BIAS_IN_REGIME_NAME = 'ACTION_BIAS_IN_REGIME_NAME',
  /** §8.1.5.1 — Persistence/replay must not bypass L5. */
  ILLEGAL_L5_BYPASS = 'ILLEGAL_L5_BYPASS',
  /** §8.1.3.6 — Lower-layer identity may not be redefined. */
  LOWER_LAYER_IDENTITY_REDEFINITION = 'LOWER_LAYER_IDENTITY_REDEFINITION',
  /** §8.1.3.5 — Lower-layer graph semantics may not be redefined. */
  LOWER_LAYER_GRAPH_REDEFINITION = 'LOWER_LAYER_GRAPH_REDEFINITION',
  /** §8.1.3.6 — Lower-layer primitive semantics may not be redefined. */
  LOWER_LAYER_PRIMITIVE_REDEFINITION = 'LOWER_LAYER_PRIMITIVE_REDEFINITION',
  /** §8.1.5.2 — Hidden fallback to stale environment without classification. */
  STALE_REGIME_MASQUERADE = 'STALE_REGIME_MASQUERADE',
}

export const ALL_L8_FORBIDDEN_ACTIONS: readonly L8ForbiddenAction[] =
  Object.values(L8ForbiddenAction);

/**
 * §8.1.3.1 — Hard dependency law. Layer 8 depends on L3, L4, L5, L6, and
 * L7 only. Each dependency surface declares its source layer.
 */
export enum L8DependencyLayer {
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
  L6 = 'L6',
  L7 = 'L7',
}

export const ALL_L8_DEPENDENCY_LAYERS: readonly L8DependencyLayer[] =
  Object.values(L8DependencyLayer);

/**
 * §8.1.3.8 — Dependency surface classes. The class describes what the
 * surface _is_ across its source layer.
 */
export enum L8DependencySurfaceClass {
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
}

export const ALL_L8_DEPENDENCY_SURFACE_CLASSES: readonly L8DependencySurfaceClass[] =
  Object.values(L8DependencySurfaceClass);

/**
 * §8.1.6.1 — Legal Layer 8 output classes. Only these five.
 */
export enum L8OutputSurfaceClass {
  REGIME_STATE = 'REGIME_STATE',
  REGIME_CONFIDENCE_PROFILE = 'REGIME_CONFIDENCE_PROFILE',
  REGIME_TRANSITION_PROFILE = 'REGIME_TRANSITION_PROFILE',
  REGIME_MULTIPLIER_PROFILE = 'REGIME_MULTIPLIER_PROFILE',
  REGIME_EVIDENCE_READ_SURFACE = 'REGIME_EVIDENCE_READ_SURFACE',
}

export const ALL_L8_OUTPUT_SURFACE_CLASSES: readonly L8OutputSurfaceClass[] =
  Object.values(L8OutputSurfaceClass);

/**
 * How L8 is allowed to consume each dependency surface. Enforced by the
 * dependency-surface registry (§8.1.3.8).
 */
export type L8DependencyUsability =
  | 'REGIME_SIGNAL'
  | 'TRANSITION_SIGNAL'
  | 'CONFIDENCE_INPUT'
  | 'MULTIPLIER_INPUT'
  | 'CONTEXT_ONLY'
  | 'EVIDENCE_ONLY'
  | 'PERSISTENCE_PATH'
  | 'REPLAY_REFERENCE'
  | 'REPAIR_REFERENCE';

export type L8CapabilityDecision = 'ALLOWED' | 'CONDITIONALLY_ALLOWED' | 'DENIED';

/**
 * §8.1.4.5 — Capability contexts matching the engine surfaces defined in
 * the mission statement. The map decides capability legality per context.
 */
export type L8CapabilityContext =
  | 'REGIME_ASSEMBLY'
  | 'REGIME_CLASSIFICATION'
  | 'TRANSITION_DETECTION_CTX'
  | 'CONFIDENCE_DERIVATION_CTX'
  | 'MULTIPLIER_DERIVATION_CTX'
  | 'PERSISTENCE_CTX'
  | 'DOWNSTREAM_READ_CTX'
  | 'REPLAY_PATH'
  | 'REPAIR_PATH';

export const ALL_L8_CAPABILITY_CONTEXTS: readonly L8CapabilityContext[] = [
  'REGIME_ASSEMBLY',
  'REGIME_CLASSIFICATION',
  'TRANSITION_DETECTION_CTX',
  'CONFIDENCE_DERIVATION_CTX',
  'MULTIPLIER_DERIVATION_CTX',
  'PERSISTENCE_CTX',
  'DOWNSTREAM_READ_CTX',
  'REPLAY_PATH',
  'REPAIR_PATH',
];
