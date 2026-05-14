/**
 * L12.7 — Freeze Policy (§12.7.9)
 *
 * Declares which Layer 12 surfaces are frozen after ratification, what
 * changes may be made post-freeze (only with classification), and what
 * changes are absolutely prohibited.
 */

import { L12SublayerId } from './l12-final-definition';

export const L12_FREEZE_POLICY_VERSION = 'l12.7.freeze.v1';

/** §12.7.9 — staged freeze classes. */
export enum L12FreezeClass {
  NOT_FROZEN = 'NOT_FROZEN',
  CONTRACT_FROZEN = 'CONTRACT_FROZEN',
  RUNTIME_FROZEN = 'RUNTIME_FROZEN',
  PERSISTENCE_FROZEN = 'PERSISTENCE_FROZEN',
  FULL_LAYER_FROZEN = 'FULL_LAYER_FROZEN',
}

export const ALL_L12_FREEZE_CLASSES:
  readonly L12FreezeClass[] = Object.values(L12FreezeClass);

export const L12_FREEZE_CLASS_RANK:
  Readonly<Record<L12FreezeClass, number>> = {
  [L12FreezeClass.NOT_FROZEN]: 0,
  [L12FreezeClass.CONTRACT_FROZEN]: 1,
  [L12FreezeClass.RUNTIME_FROZEN]: 2,
  [L12FreezeClass.PERSISTENCE_FROZEN]: 3,
  [L12FreezeClass.FULL_LAYER_FROZEN]: 4,
};

/** Surfaces that the freeze policy locks down post-ratification. */
export interface L12FrozenSurfaceRef {
  readonly surface_kind:
    | 'CONTRACT'
    | 'REGISTRY'
    | 'RUNTIME_DAG'
    | 'TEMPLATE'
    | 'PERSISTENCE_SURFACE'
    | 'READ_SURFACE'
    | 'INVARIANT';
  readonly ref: string;
}

/** Allowed post-FULL_LAYER_FROZEN changes (with classification). */
export enum L12AllowedPostFreezeChange {
  ADD_NEW_RESERVED_SCENARIO_TEMPLATE =
    'ADD_NEW_RESERVED_SCENARIO_TEMPLATE',
  ADD_NON_SERVING_DIAGNOSTIC_CODE = 'ADD_NON_SERVING_DIAGNOSTIC_CODE',
  ADD_AUDIT_REASON_CODE = 'ADD_AUDIT_REASON_CODE',
  ADD_NEW_READ_SURFACE_NO_RAW_LOWER_LAYER_TRUTH =
    'ADD_NEW_READ_SURFACE_NO_RAW_LOWER_LAYER_TRUTH',
  ADD_NEW_RESTRICTED_CONSUMER_CLASS = 'ADD_NEW_RESTRICTED_CONSUMER_CLASS',
  CLARIFY_METADATA_WITHOUT_SEMANTIC_CHANGE =
    'CLARIFY_METADATA_WITHOUT_SEMANTIC_CHANGE',
}

export const ALL_L12_ALLOWED_POST_FREEZE_CHANGES:
  readonly L12AllowedPostFreezeChange[] =
  Object.values(L12AllowedPostFreezeChange);

/** Absolutely prohibited post-freeze changes (regardless of class). */
export enum L12ProhibitedPostFreezeChange {
  SCENARIO_DOCTRINE_SILENT_EDIT = 'SCENARIO_DOCTRINE_SILENT_EDIT',
  SCENARIO_OBJECT_MODEL_SILENT_EDIT =
    'SCENARIO_OBJECT_MODEL_SILENT_EDIT',
  SCENARIO_CONTRACT_SILENT_EDIT = 'SCENARIO_CONTRACT_SILENT_EDIT',
  TRIGGER_LAW_WEAKENING = 'TRIGGER_LAW_WEAKENING',
  INVALIDATION_LAW_WEAKENING = 'INVALIDATION_LAW_WEAKENING',
  CONFIDENCE_CAP_LAW_WEAKENING = 'CONFIDENCE_CAP_LAW_WEAKENING',
  RUNTIME_DAG_SILENT_EDIT = 'RUNTIME_DAG_SILENT_EDIT',
  TEMPLATE_REGISTRY_SILENT_EDIT = 'TEMPLATE_REGISTRY_SILENT_EDIT',
  PERSISTENCE_SURFACE_SILENT_EDIT = 'PERSISTENCE_SURFACE_SILENT_EDIT',
  READ_SURFACE_SILENT_EDIT = 'READ_SURFACE_SILENT_EDIT',
  DOWNSTREAM_NO_REBUILD_LAW_WEAKENING =
    'DOWNSTREAM_NO_REBUILD_LAW_WEAKENING',
  PREDICTION_OUTPUT_ENABLEMENT = 'PREDICTION_OUTPUT_ENABLEMENT',
  RECOMMENDATION_OUTPUT_ENABLEMENT =
    'RECOMMENDATION_OUTPUT_ENABLEMENT',
  FINAL_JUDGMENT_OUTPUT_ENABLEMENT =
    'FINAL_JUDGMENT_OUTPUT_ENABLEMENT',
  L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT_REMOVAL =
    'L11_SCORE_CONTEXT_BUNDLE_REQUIREMENT_REMOVAL',
  L5_PERSISTENCE_BYPASS = 'L5_PERSISTENCE_BYPASS',
}

export const ALL_L12_PROHIBITED_POST_FREEZE_CHANGES:
  readonly L12ProhibitedPostFreezeChange[] =
  Object.values(L12ProhibitedPostFreezeChange);

export interface L12FreezePolicy {
  readonly freeze_policy_id: string;
  readonly layer_id: 'L12_SCENARIO_ENGINE';

  readonly freeze_class: L12FreezeClass;

  readonly frozen_sublayers: readonly L12SublayerId[];

  readonly frozen_surfaces: readonly L12FrozenSurfaceRef[];

  readonly allowed_post_freeze_changes:
    readonly L12AllowedPostFreezeChange[];
  readonly prohibited_post_freeze_changes:
    readonly L12ProhibitedPostFreezeChange[];

  readonly policy_version: string;
}

/**
 * Canonical L12 freeze policy. `freeze_class` starts at `NOT_FROZEN`
 * and is promoted to `FULL_LAYER_FROZEN` only by the freeze activator
 * after a production-green ratification artifact is emitted.
 */
export const L12_FREEZE_POLICY_V1: L12FreezePolicy = {
  freeze_policy_id: 'l12.freeze.v1',
  layer_id: 'L12_SCENARIO_ENGINE',
  freeze_class: L12FreezeClass.NOT_FROZEN,
  frozen_sublayers: [
    L12SublayerId.L12_1_CONSTITUTION,
    L12SublayerId.L12_2_OBJECTS,
    L12SublayerId.L12_3_CONTRACTS,
    L12SublayerId.L12_4_RUNTIME,
    L12SublayerId.L12_5_TEMPLATES,
    L12SublayerId.L12_6_PERSISTENCE,
  ],
  frozen_surfaces: [
    { surface_kind: 'CONTRACT', ref: 'l12-mission' },
    { surface_kind: 'CONTRACT', ref: 'l12-boundary' },
    { surface_kind: 'CONTRACT', ref: 'l12-capability-policy' },
    { surface_kind: 'CONTRACT', ref: 'l12-forbidden-actions' },
    { surface_kind: 'CONTRACT', ref: 'l12-output-surfaces' },
    { surface_kind: 'CONTRACT', ref: 'scenario-subject' },
    { surface_kind: 'CONTRACT', ref: 'scenario-set' },
    { surface_kind: 'CONTRACT', ref: 'scenario' },
    { surface_kind: 'CONTRACT', ref: 'scenario-condition' },
    { surface_kind: 'CONTRACT', ref: 'scenario-trigger' },
    { surface_kind: 'CONTRACT', ref: 'scenario-invalidation' },
    { surface_kind: 'CONTRACT', ref: 'scenario-shift-condition' },
    { surface_kind: 'CONTRACT', ref: 'scenario-restriction-profile' },
    { surface_kind: 'CONTRACT', ref: 'path-confidence-profile' },
    { surface_kind: 'CONTRACT', ref: 'scenario-template' },
    { surface_kind: 'CONTRACT', ref: 'trigger-strength-profile' },
    { surface_kind: 'CONTRACT', ref: 'invalidation-strength-profile' },
    { surface_kind: 'CONTRACT', ref: 'path-confidence-policy' },
    { surface_kind: 'CONTRACT', ref: 'path-confidence-cap-chain' },
    { surface_kind: 'CONTRACT', ref: 'scenario-spread-profile' },
    { surface_kind: 'CONTRACT', ref: 'l12-persistence-surface' },
    { surface_kind: 'CONTRACT', ref: 'l12-current-authority' },
    { surface_kind: 'CONTRACT', ref: 'l12-historical-surface' },
    { surface_kind: 'CONTRACT', ref: 'l12-evidence-storage' },
    { surface_kind: 'CONTRACT', ref: 'l12-read-surface' },
    { surface_kind: 'CONTRACT', ref: 'l12-downstream-consumption' },
    { surface_kind: 'REGISTRY', ref: 'l12-dependency-surface.registry' },
    { surface_kind: 'REGISTRY', ref: 'l12-output-surface.registry' },
    { surface_kind: 'REGISTRY', ref: 'l12-forbidden-action.registry' },
    { surface_kind: 'REGISTRY', ref: 'l12-durable-surface.registry' },
    { surface_kind: 'REGISTRY', ref: 'l12-read-surface.registry' },
    { surface_kind: 'RUNTIME_DAG', ref: 'l12.scenario-compute-run.v1' },
    { surface_kind: 'TEMPLATE', ref: 'l12.scenario-template-registry.v1' },
    {
      surface_kind: 'PERSISTENCE_SURFACE',
      ref: 'l12.persistence.l5-only.v1',
    },
    {
      surface_kind: 'READ_SURFACE',
      ref: 'l12.read-surface.governed.v1',
    },
    { surface_kind: 'INVARIANT', ref: 'l12_1-invariants' },
    { surface_kind: 'INVARIANT', ref: 'l12_2-invariants' },
    { surface_kind: 'INVARIANT', ref: 'l12_3-invariants' },
    { surface_kind: 'INVARIANT', ref: 'l12_4-invariants' },
    { surface_kind: 'INVARIANT', ref: 'l12_5-invariants' },
    { surface_kind: 'INVARIANT', ref: 'l12_6-invariants' },
    { surface_kind: 'INVARIANT', ref: 'l12_7-invariants' },
  ],
  allowed_post_freeze_changes: ALL_L12_ALLOWED_POST_FREEZE_CHANGES,
  prohibited_post_freeze_changes:
    ALL_L12_PROHIBITED_POST_FREEZE_CHANGES,
  policy_version: L12_FREEZE_POLICY_VERSION,
};

/** Helper: an extension touches a prohibited surface. */
export function isL12ChangeProhibitedAfterFreeze(
  change: L12ProhibitedPostFreezeChange | L12AllowedPostFreezeChange,
): boolean {
  return ALL_L12_PROHIBITED_POST_FREEZE_CHANGES.includes(
    change as L12ProhibitedPostFreezeChange);
}

/** Helper: split frozen surfaces by kind. */
export function partitionL12FrozenSurfacesByKind(
  surfaces: readonly L12FrozenSurfaceRef[],
): {
  contract_surfaces: readonly L12FrozenSurfaceRef[];
  runtime_surfaces: readonly L12FrozenSurfaceRef[];
  persistence_surfaces: readonly L12FrozenSurfaceRef[];
  read_surfaces: readonly L12FrozenSurfaceRef[];
} {
  const contract: L12FrozenSurfaceRef[] = [];
  const runtime: L12FrozenSurfaceRef[] = [];
  const persistence: L12FrozenSurfaceRef[] = [];
  const read: L12FrozenSurfaceRef[] = [];
  for (const s of surfaces) {
    switch (s.surface_kind) {
      case 'CONTRACT':
      case 'REGISTRY':
      case 'INVARIANT':
        contract.push(s);
        break;
      case 'RUNTIME_DAG':
      case 'TEMPLATE':
        runtime.push(s);
        break;
      case 'PERSISTENCE_SURFACE':
        persistence.push(s);
        break;
      case 'READ_SURFACE':
        read.push(s);
        break;
    }
  }
  return {
    contract_surfaces: contract,
    runtime_surfaces: runtime,
    persistence_surfaces: persistence,
    read_surfaces: read,
  };
}
