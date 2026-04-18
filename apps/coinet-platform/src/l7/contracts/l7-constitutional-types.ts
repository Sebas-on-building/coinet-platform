/**
 * L7.1 — Constitutional Types
 *
 * §7.1.8.2 — Core enums for the entire Layer 7 constitution. Every later
 * L7 sublayer imports from here.
 */

/**
 * §7.1.2.1 — Layer 7 tests whether governed primitives support a claim.
 * The thing being tested is a "validation subject." At the constitutional
 * level we freeze the classes of subject L7 is allowed to construct.
 */
export enum L7SubjectClass {
  CLAIM_CANDIDATE = 'CLAIM_CANDIDATE',
  MARKET_STORY = 'MARKET_STORY',
  COMPOSITE_SIGNAL_STATE = 'COMPOSITE_SIGNAL_STATE',
}

export const ALL_SUBJECT_CLASSES: readonly L7SubjectClass[] = Object.values(L7SubjectClass);

/**
 * §7.1.5.1 — Allowed capability classes (A–F grouping in §7.1.5.2).
 * Explicitly enumerated so the capability policy map and validators can
 * reason about them without string literals.
 */
export enum L7AllowedCapability {
  GOVERNED_INGESTION = 'GOVERNED_INGESTION',
  CLAIM_ASSEMBLY = 'CLAIM_ASSEMBLY',
  SUPPORT_TESTING = 'SUPPORT_TESTING',
  CONTRADICTION_TESTING = 'CONTRADICTION_TESTING',
  INCOMPLETENESS_CLASSIFICATION = 'INCOMPLETENESS_CLASSIFICATION',
  STALENESS_CLASSIFICATION = 'STALENESS_CLASSIFICATION',
  AMBIGUITY_CLASSIFICATION = 'AMBIGUITY_CLASSIFICATION',
  DEGRADATION_CLASSIFICATION = 'DEGRADATION_CLASSIFICATION',
  CONFIDENCE_DERIVATION = 'CONFIDENCE_DERIVATION',
  RESTRICTION_DERIVATION = 'RESTRICTION_DERIVATION',
  VALIDATION_PERSISTENCE = 'VALIDATION_PERSISTENCE',
  VALIDATION_READ_SERVING = 'VALIDATION_READ_SERVING',
}

export const ALL_ALLOWED_CAPABILITIES: readonly L7AllowedCapability[] =
  Object.values(L7AllowedCapability);

/**
 * §7.1.5.2 — Legal capability groupings.
 */
export enum L7CapabilityGroup {
  A_GOVERNED_INGESTION = 'A_GOVERNED_INGESTION',
  B_VALIDATION_ASSEMBLY = 'B_VALIDATION_ASSEMBLY',
  C_TRUTH_TESTING = 'C_TRUTH_TESTING',
  D_CONFIDENCE_AND_RESTRICTION = 'D_CONFIDENCE_AND_RESTRICTION',
  E_PERSISTENCE = 'E_PERSISTENCE',
  F_DOWNSTREAM_SERVING = 'F_DOWNSTREAM_SERVING',
}

export const ALL_CAPABILITY_GROUPS: readonly L7CapabilityGroup[] =
  Object.values(L7CapabilityGroup);

/**
 * §7.1.6.6 — Forbidden actions with typed codes. Each must be rejected by
 * the forbidden-action registry.
 */
export enum L7ForbiddenAction {
  ILLEGAL_PRIMITIVE_REINTERPRETATION = 'ILLEGAL_PRIMITIVE_REINTERPRETATION',
  CONTRADICTION_LAUNDERING = 'CONTRADICTION_LAUNDERING',
  AMBIGUITY_SILENT_RESOLUTION = 'AMBIGUITY_SILENT_RESOLUTION',
  STALE_SUPPORT_MASQUERADE = 'STALE_SUPPORT_MASQUERADE',
  INCOMPLETENESS_NEGLECT = 'INCOMPLETENESS_NEGLECT',
  FINAL_SCENARIO_LEAK = 'FINAL_SCENARIO_LEAK',
  FINAL_JUDGMENT_LEAK = 'FINAL_JUDGMENT_LEAK',
  RECOMMENDATION_LANGUAGE_LEAK = 'RECOMMENDATION_LANGUAGE_LEAK',
  ILLEGAL_L5_BYPASS = 'ILLEGAL_L5_BYPASS',
  LOWER_LAYER_CONFIDENCE_OVERRIDE = 'LOWER_LAYER_CONFIDENCE_OVERRIDE',
  LOWER_LAYER_IDENTITY_REDEFINITION = 'LOWER_LAYER_IDENTITY_REDEFINITION',
  LOWER_LAYER_GRAPH_REDEFINITION = 'LOWER_LAYER_GRAPH_REDEFINITION',
}

export const ALL_FORBIDDEN_ACTIONS: readonly L7ForbiddenAction[] =
  Object.values(L7ForbiddenAction);

/**
 * §7.1.4 — Hard dependency law. Layer 7 depends on L3, L4, L5, and L6
 * only. Each dependency surface declares its source layer.
 */
export enum L7DependencyLayer {
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
  L6 = 'L6',
}

export const ALL_DEPENDENCY_LAYERS: readonly L7DependencyLayer[] =
  Object.values(L7DependencyLayer);

/**
 * §7.1.4.6 — Dependency surface classes. The class describes what the
 * surface _is_ across its source layer.
 */
export enum L7DependencySurfaceClass {
  // L3
  L3_CANONICAL_OBJECT = 'L3_CANONICAL_OBJECT',
  L3_IDENTITY_RESOLUTION = 'L3_IDENTITY_RESOLUTION',
  L3_METRIC_CONTRACT = 'L3_METRIC_CONTRACT',
  L3_CONFIDENCE_SCORE = 'L3_CONFIDENCE_SCORE',
  L3_RECONCILIATION_OUTCOME = 'L3_RECONCILIATION_OUTCOME',
  L3_MUTATION_VERSION_LINEAGE = 'L3_MUTATION_VERSION_LINEAGE',
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
  L6_QUALITY_CONFIDENCE_METADATA = 'L6_QUALITY_CONFIDENCE_METADATA',
}

export const ALL_DEPENDENCY_SURFACE_CLASSES: readonly L7DependencySurfaceClass[] =
  Object.values(L7DependencySurfaceClass);

/**
 * §7.1.7.2 — Legal Layer 7 output classes. Only these five.
 */
export enum L7OutputSurfaceClass {
  VALIDATION_ASSESSMENT = 'VALIDATION_ASSESSMENT',
  CONTRADICTION_BUNDLE = 'CONTRADICTION_BUNDLE',
  CONFIDENCE_ASSESSMENT = 'CONFIDENCE_ASSESSMENT',
  RESTRICTION_PROFILE = 'RESTRICTION_PROFILE',
  VALIDATION_EVIDENCE_READ_SURFACE = 'VALIDATION_EVIDENCE_READ_SURFACE',
}

export const ALL_OUTPUT_SURFACE_CLASSES: readonly L7OutputSurfaceClass[] =
  Object.values(L7OutputSurfaceClass);

/**
 * How L7 is allowed to consume each dependency surface. Enforced by the
 * dependency-surface registry (§7.1.4.7).
 */
export type L7DependencyUsability =
  | 'SUPPORT_EVIDENCE'
  | 'CHALLENGE_EVIDENCE'
  | 'CONTEXT_ONLY'
  | 'EVIDENCE_ONLY'
  | 'PERSISTENCE_PATH'
  | 'REPLAY_REFERENCE'
  | 'REPAIR_REFERENCE';

export type L7CapabilityDecision = 'ALLOWED' | 'CONDITIONALLY_ALLOWED' | 'DENIED';

/**
 * §7.1.5.4 — Capability contexts matching the engine surfaces defined in
 * the mission statement. The map decides capability legality per context.
 */
export type L7CapabilityContext =
  | 'SUBJECT_ASSEMBLY'
  | 'CONTRADICTION_DETECTION'
  | 'VALIDATION_CLASSIFICATION'
  | 'CONFIDENCE_DERIVATION_CTX'
  | 'RESTRICTION_DERIVATION_CTX'
  | 'PERSISTENCE_CTX'
  | 'DOWNSTREAM_READ_CTX'
  | 'REPLAY_PATH'
  | 'REPAIR_PATH';

export const ALL_CAPABILITY_CONTEXTS: readonly L7CapabilityContext[] = [
  'SUBJECT_ASSEMBLY',
  'CONTRADICTION_DETECTION',
  'VALIDATION_CLASSIFICATION',
  'CONFIDENCE_DERIVATION_CTX',
  'RESTRICTION_DERIVATION_CTX',
  'PERSISTENCE_CTX',
  'DOWNSTREAM_READ_CTX',
  'REPLAY_PATH',
  'REPAIR_PATH',
];
