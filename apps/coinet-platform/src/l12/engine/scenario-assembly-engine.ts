/**
 * L12.4 — Engine 1: ScenarioAssemblyEngine (§12.4.13).
 *
 * Builds a contract-complete `L12ScenarioSubjectContract` from governed
 * lower-layer surfaces and a requested family set. Strict policies are
 * stamped onto the contract; the validator (Phase B) enforces them.
 */

import { buildL12ScenarioReplayHash, buildL12ScenarioSubjectId } from '../contracts/scenario-ids';
import {
  L12_DEFAULT_SCORE_CONTEXT_POLICY,
  L12_STRICT_ALT_PATH_POLICY,
  L12_STRICT_BASE_CASE_POLICY,
  L12_STRICT_CONTRADICTION_POLICY,
  L12_STRICT_DRIFT_POLICY,
  L12_STRICT_EVIDENCE_POLICY,
  L12_STRICT_INVALIDATION_POLICY,
  L12_STRICT_LINEAGE_POLICY,
  L12_STRICT_MATERIALIZATION_POLICY,
  L12_STRICT_RESTRICTION_POLICY,
  L12_STRICT_SHIFT_POLICY,
  L12_STRICT_TRIGGER_POLICY,
} from '../contracts/scenario-contract-policies';
import {
  L12ScenarioInputPurpose,
  L12ScenarioInputRequirement,
  L12ScenarioInputRequirementClass,
} from '../contracts/scenario-input-requirement.contract';
import { L12ScenarioFamily } from '../contracts/scenario-family';
import {
  L12DependencyLayer,
  L12DependencySurfaceClass,
} from '../contracts/l12-constitutional-types';
import { L12ScenarioSubjectClass } from '../contracts/scenario-subject';
import type { L12ScenarioSubjectContract } from '../contracts/scenario-subject.contract';
import {
  L12ScenarioTimeHorizon,
  L12ScenarioWindow,
} from '../contracts/scenario-time-horizon';

import type { L12ResolvedInputSurfaces } from './scenario-input-resolver';

const TRADE_INTENT_PATTERNS: readonly RegExp[] = [
  /(?:^|[^a-z0-9])buy(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])sell(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])long(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])short(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])stop[\s_]*loss(?:[^a-z0-9]|$)/i,
  /(?:^|[^a-z0-9])take[\s_]*profit(?:[^a-z0-9]|$)/i,
];

function looksLikeRawRef(ref: string): boolean {
  return /^(l[12]|raw|primitive|ohlcv|tick|orderbook)[:.]/i.test(ref);
}

function buildInputRequirement(
  args: {
    layer: L12DependencyLayer;
    surface: L12DependencySurfaceClass;
    cls: L12ScenarioInputRequirementClass;
    purpose: readonly L12ScenarioInputPurpose[];
    policy_version: string;
  },
): L12ScenarioInputRequirement {
  const id = buildL12ScenarioReplayHash({
    domain: 'l12.input_req',
    policy_version: args.policy_version,
    material: {
      layer: args.layer,
      surface: args.surface,
      cls: args.cls,
      purpose: [...args.purpose].sort(),
    },
  });
  return {
    input_requirement_id: `l12.input_req.${id}`,
    source_layer: args.layer,
    surface_class: args.surface,
    requirement_class: args.cls,
    required_for: args.purpose,
    scope_match_required: true,
    freshness_required: true,
    restriction_consumption_required: true,
    contradiction_consumption_required: true,
    evidence_required: true,
    lineage_required: true,
    replay_hash_required: true,
    allow_evidence_only: false,
    allow_historical: false,
    policy_version: args.policy_version,
  };
}

export interface AssembleL12ScenarioSubjectArgs {
  readonly subject_class: L12ScenarioSubjectClass;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly scope_granularity: string;
  readonly as_of: string;
  readonly scenario_window: L12ScenarioWindow;
  readonly path_horizon: L12ScenarioTimeHorizon;
  readonly allowed_scenario_families: readonly L12ScenarioFamily[];
  readonly forbidden_scenario_families: readonly L12ScenarioFamily[];
  readonly surfaces: L12ResolvedInputSurfaces;
  readonly subject_contract_version: string;
  readonly trade_intent_text?: string;
  readonly policy_version: string;
}

export interface AssembleL12ScenarioSubjectResult {
  readonly ok: boolean;
  readonly subject?: L12ScenarioSubjectContract;
  readonly issues: readonly string[];
}

export function assembleL12ScenarioSubject(
  args: AssembleL12ScenarioSubjectArgs,
): AssembleL12ScenarioSubjectResult {
  const issues: string[] = [];
  const s = args.surfaces;

  if (s.l11_score_context_bundle_refs.length === 0) issues.push('missing L11 score context bundle');
  if (s.l11_drift_refs.length === 0) issues.push('missing L11 drift refs');
  if (s.l11_missing_data_refs.length === 0) issues.push('missing L11 missing-data refs');
  if (!s.l7_restriction_profile_ref) issues.push('missing L7 restriction profile');
  if (s.l8_regime_refs.length === 0) issues.push('missing L8 regime posture');
  if (s.l9_sequence_refs.length === 0) issues.push('missing L9 sequence posture');
  if (s.l10_hypothesis_refs.length === 0) issues.push('missing L10 hypothesis posture');
  if (s.raw_lower_layer_refs_attempted.length > 0) issues.push('raw lower-layer refs forbidden');
  for (const ref of s.l11_score_context_bundle_refs) {
    if (looksLikeRawRef(ref)) issues.push(`naked/raw score ref: ${ref}`);
  }
  if (args.trade_intent_text) {
    const txt = args.trade_intent_text.trim();
    if (txt.length > 0 && TRADE_INTENT_PATTERNS.some(p => p.test(txt))) {
      issues.push('trade intent semantics in subject text');
    }
  }
  if (args.allowed_scenario_families.length === 0) {
    issues.push('no allowed scenario families');
  }
  for (const f of args.forbidden_scenario_families) {
    if (args.allowed_scenario_families.includes(f)) {
      issues.push(`family ${f} both allowed and forbidden`);
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const scenario_subject_id = buildL12ScenarioSubjectId({
    scope_type: args.scope_type,
    scope_id: args.scope_id,
    as_of: args.as_of,
    policy_version: args.policy_version,
  });

  const required_validation_inputs = [
    buildInputRequirement({
      layer: L12DependencyLayer.L7,
      surface: L12DependencySurfaceClass.L7_VALIDATION_ASSESSMENT,
      cls: L12ScenarioInputRequirementClass.REQUIRED_VALIDATION_INPUT,
      purpose: [L12ScenarioInputPurpose.PATH_SUPPORT, L12ScenarioInputPurpose.PATH_CONTRADICTION],
      policy_version: args.policy_version,
    }),
  ];
  const required_regime_inputs = [
    buildInputRequirement({
      layer: L12DependencyLayer.L8,
      surface: L12DependencySurfaceClass.L8_CURRENT_REGIME_STATE,
      cls: L12ScenarioInputRequirementClass.REQUIRED_REGIME_INPUT,
      purpose: [L12ScenarioInputPurpose.PATH_SUPPORT, L12ScenarioInputPurpose.SHIFT_CONDITION_INPUT],
      policy_version: args.policy_version,
    }),
  ];
  const required_sequence_inputs = [
    buildInputRequirement({
      layer: L12DependencyLayer.L9,
      surface: L12DependencySurfaceClass.L9_CURRENT_SEQUENCE_STATE,
      cls: L12ScenarioInputRequirementClass.REQUIRED_SEQUENCE_INPUT,
      purpose: [L12ScenarioInputPurpose.PATH_SUPPORT, L12ScenarioInputPurpose.TRIGGER_INPUT],
      policy_version: args.policy_version,
    }),
  ];
  const required_hypothesis_inputs = [
    buildInputRequirement({
      layer: L12DependencyLayer.L10,
      surface: L12DependencySurfaceClass.L10_CURRENT_HYPOTHESIS_RANKING,
      cls: L12ScenarioInputRequirementClass.REQUIRED_HYPOTHESIS_INPUT,
      purpose: [L12ScenarioInputPurpose.PATH_SUPPORT, L12ScenarioInputPurpose.SHIFT_CONDITION_INPUT],
      policy_version: args.policy_version,
    }),
  ];
  const required_score_context_inputs = [
    buildInputRequirement({
      layer: L12DependencyLayer.L11,
      surface: L12DependencySurfaceClass.L11_SCORE_COMPONENT_BREAKDOWN,
      cls: L12ScenarioInputRequirementClass.REQUIRED_SCORE_CONTEXT_INPUT,
      purpose: [
        L12ScenarioInputPurpose.PATH_SUPPORT,
        L12ScenarioInputPurpose.RESTRICTION_INPUT,
        L12ScenarioInputPurpose.EVIDENCE_DISCLOSURE,
      ],
      policy_version: args.policy_version,
    }),
  ];

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.subject.contract',
    policy_version: args.policy_version,
    material: {
      scenario_subject_id,
      subject_class: args.subject_class,
      scope_type: args.scope_type,
      scope_id: args.scope_id,
      as_of: args.as_of,
      allowed_scenario_families: [...args.allowed_scenario_families].sort(),
      forbidden_scenario_families: [...args.forbidden_scenario_families].sort(),
      path_horizon: args.path_horizon,
    },
  });

  const subject: L12ScenarioSubjectContract = {
    scenario_subject_contract_id: `l12.subject.contract.${replay_hash}`,
    scenario_subject_id,
    subject_contract_version: args.subject_contract_version,
    subject_class: args.subject_class,
    scope_type: args.scope_type,
    scope_id: args.scope_id,
    scope_granularity: args.scope_granularity,
    as_of: args.as_of,
    allowed_scenario_families: args.allowed_scenario_families,
    forbidden_scenario_families: args.forbidden_scenario_families,
    required_validation_inputs,
    required_regime_inputs,
    required_sequence_inputs,
    required_hypothesis_inputs,
    required_score_context_inputs,
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],
    scenario_window: args.scenario_window,
    path_horizon: args.path_horizon,
    base_case_requirement_policy: L12_STRICT_BASE_CASE_POLICY,
    alternative_path_requirement_policy: L12_STRICT_ALT_PATH_POLICY,
    trigger_requirement_policy: L12_STRICT_TRIGGER_POLICY,
    invalidation_requirement_policy: L12_STRICT_INVALIDATION_POLICY,
    shift_condition_requirement_policy: L12_STRICT_SHIFT_POLICY,
    l11_score_context_policy: L12_DEFAULT_SCORE_CONTEXT_POLICY,
    restriction_consumption_policy: L12_STRICT_RESTRICTION_POLICY,
    contradiction_consumption_policy: L12_STRICT_CONTRADICTION_POLICY,
    drift_consumption_policy: L12_STRICT_DRIFT_POLICY,
    evidence_pack_policy: L12_STRICT_EVIDENCE_POLICY,
    materialization_policy: L12_STRICT_MATERIALIZATION_POLICY,
    lineage_policy: L12_STRICT_LINEAGE_POLICY,
    policy_version: args.policy_version,
    replay_hash,
  };

  return { ok: true, subject, issues: [] };
}
