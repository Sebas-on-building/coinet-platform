/**
 * L13.12 — Freeze + Extension Policy Contracts
 *
 * §13.12.12 / §13.12.13 — Closed sets governing what is frozen
 * and how post-freeze changes are classified.
 */

export enum L13FreezeClass {
  NOT_FROZEN = 'NOT_FROZEN',
  RATIFIED_BUT_MUTABLE = 'RATIFIED_BUT_MUTABLE',
  FROZEN_LIVE = 'FROZEN_LIVE',
  FROZEN_WITH_EXTENSION_GATE = 'FROZEN_WITH_EXTENSION_GATE',
}

export const ALL_L13_FREEZE_CLASSES: readonly L13FreezeClass[] =
  Object.values(L13FreezeClass);

export enum L13FrozenSurface {
  MISSION_AND_BOUNDARY = 'MISSION_AND_BOUNDARY',
  INPUT_PACKAGE_CONTRACT = 'INPUT_PACKAGE_CONTRACT',
  OUTPUT_CONTRACT = 'OUTPUT_CONTRACT',
  GROUNDING_LAW = 'GROUNDING_LAW',
  UNCERTAINTY_RESTRICTION_LAW = 'UNCERTAINTY_RESTRICTION_LAW',
  RUNTIME_STAGE_LAW = 'RUNTIME_STAGE_LAW',
  PRODUCT_MODE_CONTRACTS = 'PRODUCT_MODE_CONTRACTS',
  STYLE_SAFETY_ENVELOPES = 'STYLE_SAFETY_ENVELOPES',
  PERSISTENCE_SURFACES = 'PERSISTENCE_SURFACES',
  REPLAY_REPAIR_DEFINITIONS = 'REPLAY_REPAIR_DEFINITIONS',
  FINAL_CERTIFICATION_BANDS = 'FINAL_CERTIFICATION_BANDS',
  FINAL_INVARIANT_SET = 'FINAL_INVARIANT_SET',
}

export interface L13FreezePolicy {
  readonly freeze_policy_id: string;
  readonly freeze_class: L13FreezeClass;
  readonly frozen_surfaces: readonly L13FrozenSurface[];
  readonly extension_gate_required: boolean;
  readonly active_policy_versions: readonly string[];
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export enum L13ExtensionClassification {
  ADDITIVE_SAFE = 'ADDITIVE_SAFE',
  COMPATIBLE_WITH_CERTIFICATION_REFRESH = 'COMPATIBLE_WITH_CERTIFICATION_REFRESH',
  RECERTIFICATION_REQUIRED = 'RECERTIFICATION_REQUIRED',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  BREAKING_SEMANTIC = 'BREAKING_SEMANTIC',
  PROHIBITED = 'PROHIBITED',
}

export const ALL_L13_EXTENSION_CLASSIFICATIONS:
  readonly L13ExtensionClassification[] =
  Object.values(L13ExtensionClassification);

export interface L13ExtensionPolicy {
  readonly extension_policy_id: string;
  readonly classification: L13ExtensionClassification;
  readonly change_summary: string;
  readonly affected_frozen_surfaces: readonly L13FrozenSurface[];
  readonly recertification_required: boolean;
  readonly rollout_blocking: boolean;
  readonly policy_version: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}
