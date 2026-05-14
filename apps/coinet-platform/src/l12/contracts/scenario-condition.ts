/**
 * L12.2 — ScenarioCondition (§12.2.10).
 *
 * Conditions are typed assertions on lower-layer surfaces that govern when a
 * scenario stays valid, strengthens, weakens, confirms, invalidates, or
 * shifts ranking.
 */

export enum L12ScenarioConditionType {
  VALIDATION_CONDITION = 'VALIDATION_CONDITION',
  CONTRADICTION_CONDITION = 'CONTRADICTION_CONDITION',
  REGIME_CONDITION = 'REGIME_CONDITION',
  SEQUENCE_CONDITION = 'SEQUENCE_CONDITION',
  HYPOTHESIS_CONDITION = 'HYPOTHESIS_CONDITION',
  SCORE_CONDITION = 'SCORE_CONDITION',
  ATTRIBUTION_CONDITION = 'ATTRIBUTION_CONDITION',
  MISSING_DATA_CONDITION = 'MISSING_DATA_CONDITION',
  DRIFT_CONDITION = 'DRIFT_CONDITION',
}

export const ALL_L12_CONDITION_TYPES: readonly L12ScenarioConditionType[] =
  Object.values(L12ScenarioConditionType);

export enum L12ConditionRole {
  REQUIRED_FOR_PATH = 'REQUIRED_FOR_PATH',
  SUPPORTS_PATH = 'SUPPORTS_PATH',
  WEAKENS_PATH = 'WEAKENS_PATH',
  CONFIRMS_PATH = 'CONFIRMS_PATH',
  INVALIDATES_PATH = 'INVALIDATES_PATH',
  SHIFTS_RANKING = 'SHIFTS_RANKING',
  DISCLOSURE_ONLY = 'DISCLOSURE_ONLY',
}

export const ALL_L12_CONDITION_ROLES: readonly L12ConditionRole[] =
  Object.values(L12ConditionRole);

export enum L12ConditionStatus {
  SATISFIED = 'SATISFIED',
  PARTIALLY_SATISFIED = 'PARTIALLY_SATISFIED',
  UNSATISFIED = 'UNSATISFIED',
  BLOCKED_BY_RESTRICTION = 'BLOCKED_BY_RESTRICTION',
  BLOCKED_BY_MISSING_VISIBILITY = 'BLOCKED_BY_MISSING_VISIBILITY',
  BLOCKED_BY_DRIFT = 'BLOCKED_BY_DRIFT',
  UNKNOWN = 'UNKNOWN',
}

export const ALL_L12_CONDITION_STATUSES: readonly L12ConditionStatus[] =
  Object.values(L12ConditionStatus);

export enum L12ConditionSourceLayer {
  L7 = 'L7',
  L8 = 'L8',
  L9 = 'L9',
  L10 = 'L10',
  L11 = 'L11',
}

export const ALL_L12_CONDITION_SOURCE_LAYERS: readonly L12ConditionSourceLayer[] =
  Object.values(L12ConditionSourceLayer);

export enum L12ConditionOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_THAN = 'LESS_THAN',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',
  IN_SET = 'IN_SET',
  NOT_IN_SET = 'NOT_IN_SET',
  POSTURE_REQUIRED = 'POSTURE_REQUIRED',
  POSTURE_FORBIDDEN = 'POSTURE_FORBIDDEN',
}

export const ALL_L12_CONDITION_OPERATORS: readonly L12ConditionOperator[] =
  Object.values(L12ConditionOperator);

export enum L12ConditionMaterialityClass {
  IMMATERIAL = 'IMMATERIAL',
  LOW = 'LOW',
  MATERIAL = 'MATERIAL',
  CRITICAL = 'CRITICAL',
}

export const ALL_L12_CONDITION_MATERIALITY_CLASSES: readonly L12ConditionMaterialityClass[] =
  Object.values(L12ConditionMaterialityClass);

export interface L12ScenarioCondition {
  readonly condition_id: string;

  readonly scenario_id: string;
  readonly scenario_set_id: string;

  readonly condition_type: L12ScenarioConditionType;
  readonly condition_role: L12ConditionRole;

  readonly source_layer: L12ConditionSourceLayer;
  readonly required_surface_ref: string;
  readonly current_state_ref: string;

  readonly operator: L12ConditionOperator;
  readonly threshold_value?: number;
  readonly expected_state?: string;

  readonly condition_status: L12ConditionStatus;
  readonly materiality_class: L12ConditionMaterialityClass;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
  readonly replay_hash: string;
}

/**
 * Source-layer × condition-type compatibility (§12.2.10.5):
 * a condition source must be consistent with its declared type.
 */
const TYPE_LAYER_MAP: Readonly<Record<L12ScenarioConditionType, readonly L12ConditionSourceLayer[]>> = {
  [L12ScenarioConditionType.VALIDATION_CONDITION]: [L12ConditionSourceLayer.L7],
  [L12ScenarioConditionType.CONTRADICTION_CONDITION]: [L12ConditionSourceLayer.L7],
  [L12ScenarioConditionType.REGIME_CONDITION]: [L12ConditionSourceLayer.L8],
  [L12ScenarioConditionType.SEQUENCE_CONDITION]: [L12ConditionSourceLayer.L9],
  [L12ScenarioConditionType.HYPOTHESIS_CONDITION]: [L12ConditionSourceLayer.L10],
  [L12ScenarioConditionType.SCORE_CONDITION]: [L12ConditionSourceLayer.L11],
  [L12ScenarioConditionType.ATTRIBUTION_CONDITION]: [L12ConditionSourceLayer.L11],
  [L12ScenarioConditionType.MISSING_DATA_CONDITION]: [L12ConditionSourceLayer.L11],
  [L12ScenarioConditionType.DRIFT_CONDITION]: [L12ConditionSourceLayer.L11],
};

export function isL12LegalConditionTypeLayer(
  type: L12ScenarioConditionType,
  layer: L12ConditionSourceLayer,
): boolean {
  return TYPE_LAYER_MAP[type].includes(layer);
}
