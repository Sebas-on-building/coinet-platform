/**
 * L13.12 — Freeze + Extension Policy Builders
 *
 * §13.12.12 / §13.12.13 — Builds the default freeze policy and
 * classifies post-freeze extensions.
 */

import {
  L13ExtensionClassification,
  L13FreezeClass,
  L13FrozenSurface,
  type L13ExtensionPolicy,
  type L13FreezePolicy,
} from '../contracts/l13-freeze-policy';
import { fnv1a } from '../context/_fnv1a';

const POLICY_V = 'l13.freeze.v1';

const FROZEN_SURFACES: readonly L13FrozenSurface[] = [
  L13FrozenSurface.MISSION_AND_BOUNDARY,
  L13FrozenSurface.INPUT_PACKAGE_CONTRACT,
  L13FrozenSurface.OUTPUT_CONTRACT,
  L13FrozenSurface.GROUNDING_LAW,
  L13FrozenSurface.UNCERTAINTY_RESTRICTION_LAW,
  L13FrozenSurface.RUNTIME_STAGE_LAW,
  L13FrozenSurface.PRODUCT_MODE_CONTRACTS,
  L13FrozenSurface.STYLE_SAFETY_ENVELOPES,
  L13FrozenSurface.PERSISTENCE_SURFACES,
  L13FrozenSurface.REPLAY_REPAIR_DEFINITIONS,
  L13FrozenSurface.FINAL_CERTIFICATION_BANDS,
  L13FrozenSurface.FINAL_INVARIANT_SET,
];

export interface L13FreezeBuilderInput {
  readonly freeze_class?: L13FreezeClass;
  readonly active_policy_versions: readonly string[];
}

export function buildL13FreezePolicy(
  input: L13FreezeBuilderInput,
): L13FreezePolicy {
  const cls = input.freeze_class ?? L13FreezeClass.FROZEN_LIVE;
  const replayHash = fnv1a(
    [
      'l13.freeze.policy',
      cls,
      FROZEN_SURFACES.join(','),
      input.active_policy_versions.slice().sort().join(','),
      POLICY_V,
    ].join('|'),
  );
  return {
    freeze_policy_id: `l13.freeze.policy.${replayHash}`,
    freeze_class: cls,
    frozen_surfaces: FROZEN_SURFACES,
    extension_gate_required:
      cls === L13FreezeClass.FROZEN_WITH_EXTENSION_GATE ||
      cls === L13FreezeClass.FROZEN_LIVE,
    active_policy_versions: input.active_policy_versions,
    policy_version: POLICY_V,
    lineage_refs: ['l13.freeze.lineage'],
    replay_hash: replayHash,
  };
}

const PROHIBITED_CHANGES = new Set<string>([
  'weaken_no_recommendation_law',
  'remove_contradiction_disclosure',
  'remove_uncertainty_disclosure',
  'remove_safety_gate',
  'remove_grounding_gate',
  'mutate_historical_facts',
]);

const BREAKING_CHANGES = new Set<string>([
  'change_output_contract_fields',
  'remove_input_package_field',
  'change_runtime_stage_law',
]);

const MIGRATION_CHANGES = new Set<string>([
  'change_input_package_optional_fields',
  'change_persistence_surface_schema',
]);

const RECERT_REQUIRED_CHANGES = new Set<string>([
  'add_new_product_mode',
  'add_new_language_scope',
  'change_safety_pattern_catalogue',
  'change_style_persona',
]);

const COMPATIBLE_REFRESH_CHANGES = new Set<string>([
  'add_advice_adjacent_rewrite_template',
  'add_feedback_reason_code',
  'add_quality_metric_class',
]);

const ADDITIVE_SAFE_CHANGES = new Set<string>([
  'add_report_render_field',
  'add_translation_for_existing_message',
]);

export function classifyL13Extension(
  change_key: string,
  change_summary: string,
): L13ExtensionPolicy {
  let classification: L13ExtensionClassification;
  if (PROHIBITED_CHANGES.has(change_key)) {
    classification = L13ExtensionClassification.PROHIBITED;
  } else if (BREAKING_CHANGES.has(change_key)) {
    classification = L13ExtensionClassification.BREAKING_SEMANTIC;
  } else if (MIGRATION_CHANGES.has(change_key)) {
    classification = L13ExtensionClassification.MIGRATION_REQUIRED;
  } else if (RECERT_REQUIRED_CHANGES.has(change_key)) {
    classification = L13ExtensionClassification.RECERTIFICATION_REQUIRED;
  } else if (COMPATIBLE_REFRESH_CHANGES.has(change_key)) {
    classification =
      L13ExtensionClassification.COMPATIBLE_WITH_CERTIFICATION_REFRESH;
  } else if (ADDITIVE_SAFE_CHANGES.has(change_key)) {
    classification = L13ExtensionClassification.ADDITIVE_SAFE;
  } else {
    classification = L13ExtensionClassification.RECERTIFICATION_REQUIRED;
  }
  const replayHash = fnv1a(
    ['l13.extension.policy', change_key, classification, POLICY_V].join('|'),
  );
  return {
    extension_policy_id: `l13.extension.${replayHash}`,
    classification,
    change_summary,
    affected_frozen_surfaces: [],
    recertification_required:
      classification === L13ExtensionClassification.RECERTIFICATION_REQUIRED ||
      classification === L13ExtensionClassification.BREAKING_SEMANTIC,
    rollout_blocking:
      classification === L13ExtensionClassification.PROHIBITED ||
      classification === L13ExtensionClassification.BREAKING_SEMANTIC,
    policy_version: POLICY_V,
    lineage_refs: ['l13.extension.lineage'],
    replay_hash: replayHash,
  };
}
