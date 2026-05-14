/**
 * L12.7 — Final Layer Definition (§12.7.3.1, §12.7.3.2, §12.7.3.3)
 *
 * Frozen, structured definition of Layer 12 (Scenario Engine) after
 * closure. This file does not introduce any new scenario semantics; it
 * only enumerates the closure-time identity, capability groups, output
 * classes, and forbidden semantics that the master certification
 * orchestrator and the ratification artifact emitter consume.
 *
 * Closure law (§12.7.0):
 *   "Layer 12 is not done because it can print 'bullish' or 'bearish'.
 *    Layer 12 is done only when it can produce governed conditional
 *    paths with triggers, invalidations, confidence, evidence,
 *    lineage, replay, repair, persistence, and restrictions."
 */

export const L12_FINAL_DEFINITION_POLICY_VERSION =
  'l12.7.final-definition.v1';

/** §12.7.3.2 — required sublayers for Layer 12 closure. */
export enum L12SublayerId {
  L12_1_CONSTITUTION = 'L12_1_CONSTITUTION',
  L12_2_OBJECTS = 'L12_2_OBJECTS',
  L12_3_CONTRACTS = 'L12_3_CONTRACTS',
  L12_4_RUNTIME = 'L12_4_RUNTIME',
  L12_5_TEMPLATES = 'L12_5_TEMPLATES',
  L12_6_PERSISTENCE = 'L12_6_PERSISTENCE',
  L12_7_RATIFICATION = 'L12_7_RATIFICATION',
}

export const ALL_L12_SUBLAYER_IDS:
  readonly L12SublayerId[] = Object.values(L12SublayerId);

/**
 * Sublayers that must be certified green for L12.7 to ratify L12.
 * Excludes L12.7 itself (the closure sublayer).
 */
export const L12_REQUIRED_SUBLAYERS_FOR_RATIFICATION:
  readonly L12SublayerId[] = [
  L12SublayerId.L12_1_CONSTITUTION,
  L12SublayerId.L12_2_OBJECTS,
  L12SublayerId.L12_3_CONTRACTS,
  L12SublayerId.L12_4_RUNTIME,
  L12SublayerId.L12_5_TEMPLATES,
  L12SublayerId.L12_6_PERSISTENCE,
];

/** §12.7.3.3 — final capability groups Layer 12 must demonstrate. */
export enum L12FinalCapabilityGroup {
  CONDITIONAL_PATH_GENERATION = 'CONDITIONAL_PATH_GENERATION',
  MULTI_PATH_PRESERVATION = 'MULTI_PATH_PRESERVATION',
  TRIGGER_SURFACING = 'TRIGGER_SURFACING',
  INVALIDATION_SURFACING = 'INVALIDATION_SURFACING',
  PATH_CONFIDENCE_DERIVATION = 'PATH_CONFIDENCE_DERIVATION',
  SHIFT_CONDITION_DERIVATION = 'SHIFT_CONDITION_DERIVATION',
  RESTRICTION_DERIVATION = 'RESTRICTION_DERIVATION',
  EVIDENCE_BINDING = 'EVIDENCE_BINDING',
  REPLAY_REPAIR_SAFETY = 'REPLAY_REPAIR_SAFETY',
  LATER_LAYER_SERVING = 'LATER_LAYER_SERVING',
}

export const ALL_L12_FINAL_CAPABILITY_GROUPS:
  readonly L12FinalCapabilityGroup[] =
  Object.values(L12FinalCapabilityGroup);

/** §12.7.3.1 — required output classes that Layer 12 produces. */
export enum L12FinalOutputClass {
  SCENARIO_SET = 'SCENARIO_SET',
  BASE_CASE_SCENARIO = 'BASE_CASE_SCENARIO',
  BULLISH_CONTINUATION_SCENARIO = 'BULLISH_CONTINUATION_SCENARIO',
  BEARISH_FAILURE_SCENARIO = 'BEARISH_FAILURE_SCENARIO',
  TRIGGER_PROFILE = 'TRIGGER_PROFILE',
  INVALIDATION_PROFILE = 'INVALIDATION_PROFILE',
  PATH_CONFIDENCE_PROFILE = 'PATH_CONFIDENCE_PROFILE',
  SCENARIO_SHIFT_CONDITION_SET = 'SCENARIO_SHIFT_CONDITION_SET',
  SCENARIO_RESTRICTION_PROFILE = 'SCENARIO_RESTRICTION_PROFILE',
  SCENARIO_EVIDENCE_READ_SURFACE = 'SCENARIO_EVIDENCE_READ_SURFACE',
  SCENARIO_LINEAGE_READ_SURFACE = 'SCENARIO_LINEAGE_READ_SURFACE',
}

export const ALL_L12_FINAL_OUTPUT_CLASSES:
  readonly L12FinalOutputClass[] = Object.values(L12FinalOutputClass);

/**
 * §12.7.3.1 / §12.7.0 — output semantics that Layer 12 must never
 * produce, regardless of capability extensions.
 */
export enum L12FinalForbiddenSemantic {
  PREDICTION_THEATER = 'PREDICTION_THEATER',
  CERTAINTY_CLAIM = 'CERTAINTY_CLAIM',
  FINAL_JUDGMENT = 'FINAL_JUDGMENT',
  RECOMMENDATION = 'RECOMMENDATION',
  TRADE_ACTION = 'TRADE_ACTION',
  SCENARIO_AS_GUARANTEE = 'SCENARIO_AS_GUARANTEE',
  SINGLE_PATH_FAKE_CERTAINTY = 'SINGLE_PATH_FAKE_CERTAINTY',
  LOWER_LAYER_REBUILD_BY_DOWNSTREAM = 'LOWER_LAYER_REBUILD_BY_DOWNSTREAM',
}

export const ALL_L12_FINAL_FORBIDDEN_SEMANTICS:
  readonly L12FinalForbiddenSemantic[] =
  Object.values(L12FinalForbiddenSemantic);

/**
 * §12.7.3.1 — final definition object. Concrete, frozen instance is
 * built lazily by the master certification orchestrator using the
 * downstream dependency contract from `l12-downstream-dependency`.
 */
export interface L12FinalDefinition {
  readonly layer_id: 'L12_SCENARIO_ENGINE';
  readonly layer_name: 'Scenario Engine';
  readonly final_purpose: string;
  readonly first_principle: string;
  readonly required_sublayers: readonly L12SublayerId[];
  readonly required_capability_groups:
    readonly L12FinalCapabilityGroup[];
  readonly required_output_classes: readonly L12FinalOutputClass[];
  readonly forbidden_output_semantics:
    readonly L12FinalForbiddenSemantic[];
  readonly downstream_contract_ref: string;
  readonly policy_version: string;
}

/** §12.7.1.1 — frozen mission statement for Layer 12. */
export const L12_FINAL_PURPOSE: string =
  'Layer 12 produces governed conditional scenario paths — base case ' +
  'and alternatives — with triggers, invalidations, path confidence, ' +
  'spread, shift conditions, restrictions, evidence, and lineage, ' +
  'durably persisted via L5 and safely served to L13+ without ' +
  'becoming prediction, recommendation, or final judgment.';

/** §12.7.1.2 — frozen first principle for Layer 12. */
export const L12_FIRST_PRINCIPLE: string =
  'A scenario engine is not complete when it generates paths. It is ' +
  'complete only when every path is governed, conditional, ' +
  'evidence-bound, replayable, repairable, restricted, and safe for ' +
  'later-layer consumption.';

/**
 * Build the canonical L12 final definition. The downstream contract
 * ref is a string identifier (the actual contract is built by
 * `buildL12DownstreamDependencyContract` and can be cross-referenced
 * via this id).
 */
export function buildL12FinalDefinition(
  downstream_contract_ref: string,
): L12FinalDefinition {
  return {
    layer_id: 'L12_SCENARIO_ENGINE',
    layer_name: 'Scenario Engine',
    final_purpose: L12_FINAL_PURPOSE,
    first_principle: L12_FIRST_PRINCIPLE,
    required_sublayers: ALL_L12_SUBLAYER_IDS,
    required_capability_groups: ALL_L12_FINAL_CAPABILITY_GROUPS,
    required_output_classes: ALL_L12_FINAL_OUTPUT_CLASSES,
    forbidden_output_semantics: ALL_L12_FINAL_FORBIDDEN_SEMANTICS,
    downstream_contract_ref,
    policy_version: L12_FINAL_DEFINITION_POLICY_VERSION,
  };
}
