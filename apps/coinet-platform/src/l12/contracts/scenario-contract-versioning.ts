/**
 * L12.3 — Contract versioning and compatibility (§12.3.17).
 */

export enum L12ScenarioContractSurface {
  SUBJECT_CONTRACT = 'SUBJECT_CONTRACT',
  SET_CONTRACT = 'SET_CONTRACT',
  SCENARIO_CONTRACT = 'SCENARIO_CONTRACT',
  CONDITION_CONTRACT = 'CONDITION_CONTRACT',
  TRIGGER_CONTRACT = 'TRIGGER_CONTRACT',
  INVALIDATION_CONTRACT = 'INVALIDATION_CONTRACT',
  CONFIDENCE_CONTRACT = 'CONFIDENCE_CONTRACT',
  SHIFT_CONDITION_CONTRACT = 'SHIFT_CONDITION_CONTRACT',
  RESTRICTION_CONTRACT = 'RESTRICTION_CONTRACT',
  EVIDENCE_PACK_CONTRACT = 'EVIDENCE_PACK_CONTRACT',
  REPLAY_IDENTITY_CONTRACT = 'REPLAY_IDENTITY_CONTRACT',
}

export const ALL_L12_SCENARIO_CONTRACT_SURFACES: readonly L12ScenarioContractSurface[] =
  Object.values(L12ScenarioContractSurface);

export enum L12ScenarioContractCompatibilityClass {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  BACKWARD_COMPATIBLE = 'BACKWARD_COMPATIBLE',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L12_SCENARIO_CONTRACT_COMPATIBILITY_CLASSES: readonly L12ScenarioContractCompatibilityClass[] =
  Object.values(L12ScenarioContractCompatibilityClass);

export interface L12ScenarioContractVersion {
  readonly contract_version_id: string;

  readonly surface: L12ScenarioContractSurface;

  readonly semantic_version: string;

  readonly required_fields: readonly string[];
  readonly optional_fields: readonly string[];

  readonly replay_material_fields: readonly string[];

  readonly breaking_change_surfaces: readonly string[];

  readonly migration_required_surfaces: readonly string[];

  readonly policy_version: string;
}

/**
 * Delta between two versions of the same contract surface (§12.3.17.4).
 *
 * Used by the compatibility validator to classify a proposed contract change.
 */
export interface L12ScenarioContractDelta {
  readonly surface: L12ScenarioContractSurface;
  readonly from_version: L12ScenarioContractVersion;
  readonly to_version: L12ScenarioContractVersion;
  /** True if a previously-required field is no longer required. */
  readonly weakens_required_fields: boolean;
  /** True if replay-material fields changed without a semantic version bump. */
  readonly replay_material_changed_without_version_bump: boolean;
  /** True if the invalidation requirement was weakened. */
  readonly weakens_invalidation_law: boolean;
  /** True if the trigger requirement was weakened. */
  readonly weakens_trigger_law: boolean;
  /** True if the L11 score-context requirement was weakened. */
  readonly weakens_score_context_law: boolean;
  /** True if the restriction profile was weakened. */
  readonly weakens_restriction_law: boolean;
  /** True if the prediction-theater scan was removed/weakened. */
  readonly removes_prediction_theater_scan: boolean;
  /** True if old outputs would be reinterpreted under new contract. */
  readonly reinterprets_old_outputs: boolean;
  /** True if only new optional fields were added. */
  readonly only_added_optional_fields: boolean;
}

/**
 * Classify a contract delta into a compatibility class.
 *
 * Priority (highest to lowest): PROHIBITED > BREAKING_SEMANTIC >
 * MIGRATION_REQUIRED > BACKWARD_COMPATIBLE > ADDITIVE_SAFE.
 */
export function classifyL12ContractDelta(
  d: L12ScenarioContractDelta,
): L12ScenarioContractCompatibilityClass {
  if (
    d.weakens_invalidation_law ||
    d.weakens_trigger_law ||
    d.weakens_score_context_law ||
    d.weakens_restriction_law ||
    d.removes_prediction_theater_scan ||
    d.reinterprets_old_outputs
  ) {
    return L12ScenarioContractCompatibilityClass.PROHIBITED;
  }
  if (d.replay_material_changed_without_version_bump) {
    return L12ScenarioContractCompatibilityClass.PROHIBITED;
  }
  if (d.weakens_required_fields) {
    return L12ScenarioContractCompatibilityClass.BREAKING_SEMANTIC;
  }
  if (d.only_added_optional_fields) {
    return L12ScenarioContractCompatibilityClass.ADDITIVE_SAFE;
  }
  return L12ScenarioContractCompatibilityClass.MIGRATION_REQUIRED;
}
