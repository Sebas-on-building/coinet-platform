/**
 * L10.1 — Constitutional Types
 *
 * §10.1.10 — Core enums for the entire Layer 10 constitution. Every later
 * L10 sublayer imports from here.
 *
 * Layer 10 is the Hypothesis Engine. It constructs and ranks competing
 * explanations over the governed L3–L9 substrate. It does not re-validate
 * truth (that is L7), does not reclassify regime (that is L8), does not
 * rewrite sequence meaning (that is L9), and does not emit final
 * scenario, judgment, scoring, or recommendation output (that is later).
 */

/**
 * §10.1.1.2 / §10.1.6 — The thing Layer 10 reasons about: competing
 * explanations for the current governed state. Each subject class is a
 * form of explanation construction, never a form of final verdict.
 */
export enum L10SubjectClass {
  /** Candidate explanation for a governed state. */
  HYPOTHESIS_CANDIDATE = 'HYPOTHESIS_CANDIDATE',
  /** Structured competition between primary and alternative candidates. */
  HYPOTHESIS_COMPETITION = 'HYPOTHESIS_COMPETITION',
  /** Ranking between candidates with explicit spread. */
  HYPOTHESIS_RANKING = 'HYPOTHESIS_RANKING',
  /** Support domain — the evidence substrate supporting a candidate. */
  SUPPORT_DOMAIN = 'SUPPORT_DOMAIN',
  /** Contradiction domain — the evidence substrate challenging a candidate. */
  CONTRADICTION_DOMAIN = 'CONTRADICTION_DOMAIN',
  /** Confirmation gap — missing confirmations required to strengthen. */
  CONFIRMATION_GAP = 'CONFIRMATION_GAP',
  /** Invalidation risk — conditions under which a candidate is falsified. */
  INVALIDATION_RISK = 'INVALIDATION_RISK',
  /** Shift condition set — what would change the ranking. */
  SHIFT_CONDITION = 'SHIFT_CONDITION',
}

export const ALL_L10_SUBJECT_CLASSES: readonly L10SubjectClass[] =
  Object.values(L10SubjectClass);

/**
 * §10.1.4 / §10.1.10.1 — Allowed capabilities for the Hypothesis Engine,
 * grouped A–G in §10.1.4.3. Enumerated so the policy map and validators
 * can reason about them without string literals.
 */
export enum L10AllowedCapability {
  /** A — ingest governed lower-layer (L3–L9) surfaces. */
  GOVERNED_INGESTION = 'GOVERNED_INGESTION',
  /** A — read historical governed windows. */
  HISTORICAL_WINDOW_READ = 'HISTORICAL_WINDOW_READ',
  /** A — read evidence-backed context surfaces (L6/L7/L8/L9). */
  EVIDENCE_CONTEXT_READ = 'EVIDENCE_CONTEXT_READ',

  /** B — construct hypothesis subjects. */
  HYPOTHESIS_SUBJECT_CONSTRUCTION = 'HYPOTHESIS_SUBJECT_CONSTRUCTION',
  /** B — generate competing hypothesis candidates. */
  CANDIDATE_GENERATION = 'CANDIDATE_GENERATION',

  /** C — bind support-domain evidence to a candidate. */
  SUPPORT_DOMAIN_BINDING = 'SUPPORT_DOMAIN_BINDING',
  /** C — bind contradiction-domain evidence to a candidate. */
  CONTRADICTION_DOMAIN_BINDING = 'CONTRADICTION_DOMAIN_BINDING',
  /** C — classify missing confirmations. */
  CONFIRMATION_GAP_CLASSIFICATION = 'CONFIRMATION_GAP_CLASSIFICATION',
  /** C — classify invalidation risk. */
  INVALIDATION_RISK_CLASSIFICATION = 'INVALIDATION_RISK_CLASSIFICATION',

  /** D — compute hypothesis confidence (not final judgment confidence). */
  HYPOTHESIS_CONFIDENCE_DERIVATION = 'HYPOTHESIS_CONFIDENCE_DERIVATION',
  /** D — rank candidates with an explicit spread. */
  CANDIDATE_RANKING = 'CANDIDATE_RANKING',
  /** D — classify ranking stability. */
  RANKING_STABILITY_CLASSIFICATION = 'RANKING_STABILITY_CLASSIFICATION',
  /** D — classify spread narrowing between primary/secondary. */
  SPREAD_NARROWING_CLASSIFICATION = 'SPREAD_NARROWING_CLASSIFICATION',

  /** E — emit shift-condition sets for what would change the ranking. */
  SHIFT_CONDITION_DERIVATION = 'SHIFT_CONDITION_DERIVATION',
  /** E — derive hypothesis-specific downstream restriction profile. */
  HYPOTHESIS_RESTRICTION_DERIVATION = 'HYPOTHESIS_RESTRICTION_DERIVATION',
  /** E — assemble hypothesis evidence pack. */
  HYPOTHESIS_EVIDENCE_PACKING = 'HYPOTHESIS_EVIDENCE_PACKING',

  /** F — persist hypothesis state through governed L5 paths. */
  HYPOTHESIS_PERSISTENCE = 'HYPOTHESIS_PERSISTENCE',
  /** F — expose governed hypothesis read surfaces for later layers. */
  HYPOTHESIS_READ_SERVING = 'HYPOTHESIS_READ_SERVING',
  /** F — replay/repair support for hypothesis outputs. */
  HYPOTHESIS_REPLAY_REPAIR = 'HYPOTHESIS_REPLAY_REPAIR',
}

export const ALL_L10_ALLOWED_CAPABILITIES: readonly L10AllowedCapability[] =
  Object.values(L10AllowedCapability);

/**
 * §10.1.4.3 — Legal capability groupings.
 */
export enum L10CapabilityGroup {
  A_INPUT_CONSUMPTION = 'A_INPUT_CONSUMPTION',
  B_HYPOTHESIS_ASSEMBLY = 'B_HYPOTHESIS_ASSEMBLY',
  C_EVIDENCE_RESOLUTION = 'C_EVIDENCE_RESOLUTION',
  D_RANKING = 'D_RANKING',
  E_RESTRICTION_AND_SHIFT = 'E_RESTRICTION_AND_SHIFT',
  F_DURABILITY_AND_SERVING = 'F_DURABILITY_AND_SERVING',
}

export const ALL_L10_CAPABILITY_GROUPS: readonly L10CapabilityGroup[] =
  Object.values(L10CapabilityGroup);

/**
 * §10.1.5 / §10.1.10.3 — Forbidden actions at Layer 10. Each must be
 * rejected by the forbidden-action registry.
 */
export enum L10ForbiddenAction {
  /** §10.1.3 — L3-L9 truth may not be redefined inside L10. */
  LOWER_LAYER_TRUTH_REDEFINITION = 'LOWER_LAYER_TRUTH_REDEFINITION',
  /** §10.1.3.6 — L7 contradiction posture may not be overwritten. */
  CONTRADICTION_POSTURE_OVERWRITE = 'CONTRADICTION_POSTURE_OVERWRITE',
  /** §10.1.3.6 / §10.1.8 — L7 restriction posture may not be ignored. */
  RESTRICTION_POSTURE_IGNORED = 'RESTRICTION_POSTURE_IGNORED',
  /** §10.1.5.2 — Restriction rights from lower layers may not be widened. */
  RESTRICTION_BYPASS = 'RESTRICTION_BYPASS',
  /** §10.1.3.7 — L8 regime posture may not be ignored/overwritten. */
  REGIME_POSTURE_OVERWRITE = 'REGIME_POSTURE_OVERWRITE',
  /** §10.1.3.8 — L9 sequence posture may not be rewritten. */
  SEQUENCE_POSTURE_OVERWRITE = 'SEQUENCE_POSTURE_OVERWRITE',
  /** §10.1.5.2 — Live revalidation of L7 from L6 is forbidden. */
  L7_LIVE_REVALIDATION = 'L7_LIVE_REVALIDATION',
  /** §10.1.5.2 — Local regime reclassification is forbidden. */
  REGIME_RECLASSIFICATION = 'REGIME_RECLASSIFICATION',
  /** §10.1.5.2 — Local sequence reinterpretation is forbidden. */
  SEQUENCE_REINTERPRETATION = 'SEQUENCE_REINTERPRETATION',
  /** §10.1.5.5 / §10.1.7 — Silencing competing explanations is forbidden. */
  SINGLE_STORY_COLLAPSE = 'SINGLE_STORY_COLLAPSE',
  /** §10.1.7.4 — Emitting primary without preserving a present alternative. */
  ALTERNATIVE_SUPPRESSION = 'ALTERNATIVE_SUPPRESSION',
  /** §10.1.5.2 — Hiding a close spread between primary and secondary. */
  CLOSE_SPREAD_CONCEALMENT = 'CLOSE_SPREAD_CONCEALMENT',
  /** §10.1.5.2 — Hiding missing confirmations. */
  CONFIRMATION_GAP_CONCEALMENT = 'CONFIRMATION_GAP_CONCEALMENT',
  /** §10.1.5.2 — Hiding invalidation posture. */
  INVALIDATION_POSTURE_CONCEALMENT = 'INVALIDATION_POSTURE_CONCEALMENT',
  /** §10.1.5.2 — Explanation laundering through confidence rhetoric. */
  EXPLANATION_LAUNDERING = 'EXPLANATION_LAUNDERING',
  /** §10.1.5.1 / §10.1.5.3 — Final scenario selection is forbidden. */
  FINAL_SCENARIO_LEAK = 'FINAL_SCENARIO_LEAK',
  /** §10.1.5.1 / §10.1.5.3 — Final judgment leak. */
  FINAL_JUDGMENT_LEAK = 'FINAL_JUDGMENT_LEAK',
  /** §10.1.5.1 / §10.1.5.3 — Final-scoring leak. */
  FINAL_SCORE_LEAK = 'FINAL_SCORE_LEAK',
  /** §10.1.5.1 / §10.1.5.3 — Trade/recommendation leak. */
  RECOMMENDATION_LANGUAGE_LEAK = 'RECOMMENDATION_LANGUAGE_LEAK',
  /** §10.1.5.3 — Conviction/best-opportunity leak. */
  CONVICTION_LANGUAGE_LEAK = 'CONVICTION_LANGUAGE_LEAK',
  /** §10.1.5.4 — Causal laundering (adjacency promoted into causation). */
  CAUSAL_LAUNDERING = 'CAUSAL_LAUNDERING',
  /** §10.1.5.1 / §10.1.6.4 — Primary hypothesis disguised as final truth. */
  PRIMARY_AS_FINAL_TRUTH = 'PRIMARY_AS_FINAL_TRUTH',
  /** §10.1.3.4 — Persistence/replay must not bypass L5. */
  ILLEGAL_L5_BYPASS = 'ILLEGAL_L5_BYPASS',
  /** §10.1.3.2 — L3 identity may not be re-resolved. */
  LOWER_LAYER_IDENTITY_REDEFINITION = 'LOWER_LAYER_IDENTITY_REDEFINITION',
  /** §10.1.3.3 — L4 graph/propagation semantics may not be redefined. */
  LOWER_LAYER_GRAPH_REDEFINITION = 'LOWER_LAYER_GRAPH_REDEFINITION',
  /** §10.1.3.5 — L6 primitive meaning may not be redefined. */
  LOWER_LAYER_PRIMITIVE_REDEFINITION = 'LOWER_LAYER_PRIMITIVE_REDEFINITION',
  /** §10.1.3 — L10 may not consume later-layer (L11+) surfaces. */
  LATE_LAYER_CONSUMPTION = 'LATE_LAYER_CONSUMPTION',
  /** §10.1.5.2 — Raw ungated data used for hypothesis construction. */
  RAW_DATA_HYPOTHESIS_INVENTION = 'RAW_DATA_HYPOTHESIS_INVENTION',
}

export const ALL_L10_FORBIDDEN_ACTIONS: readonly L10ForbiddenAction[] =
  Object.values(L10ForbiddenAction);

/**
 * §10.1.3.1 — Hard dependency law. Layer 10 depends on L3–L9 only.
 */
export enum L10DependencyLayer {
  L3 = 'L3',
  L4 = 'L4',
  L5 = 'L5',
  L6 = 'L6',
  L7 = 'L7',
  L8 = 'L8',
  L9 = 'L9',
}

export const ALL_L10_DEPENDENCY_LAYERS: readonly L10DependencyLayer[] =
  Object.values(L10DependencyLayer);

/**
 * §10.1.3 / §10.1.10.1 — Dependency surface classes.
 * L7/L8/L9 surfaces are stable-handoff only.
 */
export enum L10DependencySurfaceClass {
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
}

export const ALL_L10_DEPENDENCY_SURFACE_CLASSES: readonly L10DependencySurfaceClass[] =
  Object.values(L10DependencySurfaceClass);

/**
 * §10.1.6.2 / §10.1.10.2 — Legal Layer 10 output classes. Exactly five
 * first-class hypothesis-domain surfaces.
 */
export enum L10OutputSurfaceClass {
  HYPOTHESIS_ASSESSMENT = 'HYPOTHESIS_ASSESSMENT',
  HYPOTHESIS_RANKING = 'HYPOTHESIS_RANKING',
  HYPOTHESIS_SPREAD_PROFILE = 'HYPOTHESIS_SPREAD_PROFILE',
  SHIFT_CONDITION_SET = 'SHIFT_CONDITION_SET',
  HYPOTHESIS_EVIDENCE_READ_SURFACE = 'HYPOTHESIS_EVIDENCE_READ_SURFACE',
}

export const ALL_L10_OUTPUT_SURFACE_CLASSES: readonly L10OutputSurfaceClass[] =
  Object.values(L10OutputSurfaceClass);

/**
 * How L10 is allowed to consume each dependency surface. Enforced by the
 * dependency-surface registry.
 */
export type L10DependencyUsability =
  | 'SUPPORT_EVIDENCE'
  | 'CONTRADICTION_EVIDENCE'
  | 'RANKING_INPUT'
  | 'CONFIDENCE_INPUT'
  | 'REGIME_CONDITIONING'
  | 'SEQUENCE_CONDITIONING'
  | 'CONTEXT_ONLY'
  | 'EVIDENCE_ONLY'
  | 'PERSISTENCE_PATH'
  | 'REPLAY_REFERENCE'
  | 'REPAIR_REFERENCE';

export type L10CapabilityDecision = 'ALLOWED' | 'CONDITIONALLY_ALLOWED' | 'DENIED';

/**
 * §10.1.4.3 — Capability contexts matching the engine surfaces in
 * §10.1.4. Enforced by the capability policy map.
 */
export type L10CapabilityContext =
  | 'ASSEMBLY_CTX'
  | 'CANDIDATE_GENERATION_CTX'
  | 'EVIDENCE_RESOLUTION_CTX'
  | 'SUPPORT_DOMAIN_CTX'
  | 'CONTRADICTION_DOMAIN_CTX'
  | 'CONFIRMATION_GAP_CTX'
  | 'INVALIDATION_RISK_CTX'
  | 'RANKING_CTX'
  | 'RANKING_STABILITY_CTX'
  | 'SPREAD_CTX'
  | 'SHIFT_CONDITION_CTX'
  | 'RESTRICTION_DERIVATION_CTX'
  | 'EVIDENCE_PACK_CTX'
  | 'PERSISTENCE_CTX'
  | 'DOWNSTREAM_READ_CTX'
  | 'REPLAY_PATH'
  | 'REPAIR_PATH';

export const ALL_L10_CAPABILITY_CONTEXTS: readonly L10CapabilityContext[] = [
  'ASSEMBLY_CTX',
  'CANDIDATE_GENERATION_CTX',
  'EVIDENCE_RESOLUTION_CTX',
  'SUPPORT_DOMAIN_CTX',
  'CONTRADICTION_DOMAIN_CTX',
  'CONFIRMATION_GAP_CTX',
  'INVALIDATION_RISK_CTX',
  'RANKING_CTX',
  'RANKING_STABILITY_CTX',
  'SPREAD_CTX',
  'SHIFT_CONDITION_CTX',
  'RESTRICTION_DERIVATION_CTX',
  'EVIDENCE_PACK_CTX',
  'PERSISTENCE_CTX',
  'DOWNSTREAM_READ_CTX',
  'REPLAY_PATH',
  'REPAIR_PATH',
];
