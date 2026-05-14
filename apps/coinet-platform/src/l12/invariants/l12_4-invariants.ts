/**
 * L12.4 — Runtime invariants (§12.4.32).
 *
 *   INV-12.4-A : deterministic DAG law
 *   INV-12.4-B : assembly + input law
 *   INV-12.4-C : candidate / ranking separation law
 *   INV-12.4-D : trigger and invalidation law
 *   INV-12.4-E : confidence cap law
 *   INV-12.4-F : L11 score-context law
 *   INV-12.4-G : materialization law
 *   INV-12.4-H : replay / repair law
 */

import { L12ConditionMaterialityClass } from '../contracts/scenario-condition';
import { L12ScenarioFamily } from '../contracts/scenario-family';
import { L12ScenarioReadinessClass } from '../contracts/scenario-object-readiness';
import { L12ScenarioSubjectClass } from '../contracts/scenario-subject';
import { L12ScenarioSummaryCode } from '../contracts/scenario-summary-code';
import { L12ScenarioTimeHorizon } from '../contracts/scenario-time-horizon';
import { L12ScenarioType } from '../contracts/scenario-type';
import {
  L12ConditionOperator,
  L12ConditionRole,
  L12ConditionSourceLayer,
  L12ConditionStatus,
  L12ScenarioConditionType,
} from '../contracts/scenario-condition';
import {
  L12TriggerCheckFrequencyClass,
} from '../contracts/scenario-trigger.contract';
import {
  L12TriggerEffect,
  L12TriggerStatus,
  L12TriggerType,
} from '../contracts/scenario-trigger';
import {
  L12InvalidationEffect,
  L12InvalidationStatus,
  L12InvalidationType,
} from '../contracts/scenario-invalidation';

import { buildL12ScenarioId } from '../contracts/scenario-ids';

import {
  buildL12ResolvedInputSurfaces,
  resolveL12ScenarioInputs,
  type L12ResolvedInputSurfaces,
} from '../engine/scenario-input-resolver';
import { assembleL12ScenarioSubject } from '../engine/scenario-assembly-engine';
import {
  generateL12ScenarioCandidates,
  type L12ScenarioCandidateInput,
} from '../engine/scenario-candidate-engine';
import {
  resolveL12Conditions,
  type L12ConditionInput,
} from '../engine/scenario-condition-resolver';
import {
  buildL12Triggers,
  type L12TriggerInput,
} from '../engine/scenario-trigger-engine';
import {
  buildL12Invalidations,
  type L12InvalidationInput,
} from '../engine/scenario-invalidation-engine';
import {
  constructL12ScenarioPaths,
  type L12PathConstructionInput,
} from '../engine/scenario-path-construction-engine';
import {
  ALL_L12_PATH_CONFIDENCE_FACTORS,
  L12PathConfidenceFactor,
  computeL12PathConfidence,
} from '../engine/path-confidence-engine';
import { rankL12Scenarios } from '../engine/scenario-ranking-engine';
import { deriveL12ShiftConditions } from '../engine/scenario-shift-condition-engine';
import { deriveL12Restrictions } from '../engine/scenario-restriction-engine';
import { buildL12EvidencePack } from '../engine/scenario-evidence-pack-builder';

import {
  buildL12MaterializationIntent,
  L12ScenarioMaterializationMode,
} from '../materialization/scenario-materializer';

import {
  buildCanonicalL12ScenarioDag,
  L12_CANONICAL_DAG_EDGE_COUNT,
  L12_CANONICAL_DAG_NODE_COUNT,
} from '../runtime/scenario-dag-builder';
import { detectL12DagCycles } from '../runtime/scenario-cycle-detector';
import { l12ToposortDeterministic } from '../runtime/scenario-toposort';
import {
  buildL12ComputeRun,
  L12ScenarioRunMode,
} from '../runtime/scenario-compute-run';

import { checkL12RepairLaw } from '../repair/l12-repair-adapter';

const POLICY = 'l12.4.invariants.v1';
const SUBJECT_ID = 'l12.subject.runtime.canon';
const SCENARIO_SET_ID = 'l12.set.runtime.canon';

const FACTORS: Readonly<Record<L12PathConfidenceFactor, number>> = ALL_L12_PATH_CONFIDENCE_FACTORS
  .reduce((acc, f) => ({ ...acc, [f]: 0.5 }), {} as Record<L12PathConfidenceFactor, number>);

export interface L12_4InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/* ────────────────────── Canonical surfaces ───────────────────────── */

export function buildCanonicalL12RuntimeSurfaces(): L12ResolvedInputSurfaces {
  return buildL12ResolvedInputSurfaces({
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    l3_scope_law_ref: 'l3.scope.canon',
    l4_graph_context_ref: 'l4.ctx.canon',
    l7_validation_refs: ['l7.val.canon'],
    l7_contradiction_refs: ['l7.contradiction.canon'],
    l7_restriction_profile_ref: 'l7.rp.canon',
    l8_regime_refs: ['l8.regime.canon'],
    l9_sequence_refs: ['l9.seq.canon'],
    l10_hypothesis_refs: ['l10.hyp.canon'],
    l11_score_context_bundle_refs: ['l11.score_ctx.canon'],
    l11_component_breakdown_refs: ['l11.cb.canon'],
    l11_attribution_refs: ['l11.attr.canon'],
    l11_missing_data_refs: ['l11.md.canon'],
    l11_modifier_refs: ['l11.mod.canon'],
    l11_calibration_hook_refs: ['l11.cal.canon'],
    l11_drift_refs: ['l11.drift.canon'],
    l11_restriction_profile_refs: ['l11.rp.canon'],
    contradictionUnresolved: false,
    transitionRiskHigh: false,
    decayDominant: false,
    hypothesisSpreadNarrow: false,
    missingVisibilityMaterial: false,
    driftMaterialOrCritical: false,
    raw_lower_layer_refs_attempted: [],
    lineage_refs: ['l12.lineage.canon'],
    policy_version: POLICY,
  });
}

interface CanonicalRuntimeBundle {
  readonly surfaces: ReturnType<typeof buildCanonicalL12RuntimeSurfaces>;
  readonly resolution: ReturnType<typeof resolveL12ScenarioInputs>;
  readonly subject: NonNullable<ReturnType<typeof assembleL12ScenarioSubject>['subject']>;
  readonly candidate_set: NonNullable<ReturnType<typeof generateL12ScenarioCandidates>['candidate_set']>;
  readonly condition_set: NonNullable<ReturnType<typeof resolveL12Conditions>['condition_set']>;
  readonly trigger_set: NonNullable<ReturnType<typeof buildL12Triggers>['trigger_set']>;
  readonly invalidation_set: NonNullable<ReturnType<typeof buildL12Invalidations>['invalidation_set']>;
  readonly constructed: NonNullable<ReturnType<typeof constructL12ScenarioPaths>['constructed']>;
  readonly path_confidence: NonNullable<ReturnType<typeof computeL12PathConfidence>['contract']>;
  readonly ranking: NonNullable<ReturnType<typeof rankL12Scenarios>['ranking']>;
  readonly shift_conditions: NonNullable<ReturnType<typeof deriveL12ShiftConditions>['contract']>;
  readonly restrictions: NonNullable<ReturnType<typeof deriveL12Restrictions>['contract']>;
  readonly evidence_pack: NonNullable<ReturnType<typeof buildL12EvidencePack>['contract']>;
  readonly materialization: NonNullable<ReturnType<typeof buildL12MaterializationIntent>['intent']>;
}

export function buildCanonicalRuntimeBundle(
  options?: { readonly hasActiveInvalidation?: boolean },
): CanonicalRuntimeBundle {
  const surfaces = buildCanonicalL12RuntimeSurfaces();
  const resolution = resolveL12ScenarioInputs({
    scenario_subject_id: SUBJECT_ID,
    surfaces,
    policy_version: POLICY,
  });
  const subj = assembleL12ScenarioSubject({
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    allowed_scenario_families: [
      L12ScenarioFamily.SPOT_LED_CONTINUATION,
      L12ScenarioFamily.DISTRIBUTION_REVERSAL,
    ],
    forbidden_scenario_families: [],
    surfaces,
    subject_contract_version: '1.0.0',
    policy_version: POLICY,
  });

  const baseCandidate: L12ScenarioCandidateInput = {
    scenario_type: L12ScenarioType.BASE_CASE,
    scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
    candidate_reason_codes: ['L7_VALIDATION_SUPPORT', 'L11_SCORE_CONTEXT_SUPPORT'],
    supporting_input_refs: ['l7.val.canon', 'l11.score_ctx.canon'],
    required_condition_seed_refs: ['cond.base'],
    required_trigger_seed_refs: ['trig.base'],
    required_invalidation_seed_refs: ['inv.base'],
    candidate_strength_score: 0.7,
    eligible_for_base_case: true,
  };
  const altCandidate: L12ScenarioCandidateInput = {
    scenario_type: L12ScenarioType.BEARISH_FAILURE,
    scenario_family: L12ScenarioFamily.DISTRIBUTION_REVERSAL,
    candidate_reason_codes: ['L7_CONTRADICTION_PRESSURE'],
    supporting_input_refs: ['l7.contradiction.canon'],
    required_condition_seed_refs: ['cond.alt'],
    required_trigger_seed_refs: ['trig.alt'],
    required_invalidation_seed_refs: ['inv.alt'],
    candidate_strength_score: 0.4,
  };
  const candidates = generateL12ScenarioCandidates({
    scenario_subject_id: SUBJECT_ID,
    resolution: resolution.resolution,
    candidates: [baseCandidate, altCandidate],
    policy_version: POLICY,
  });

  // The path-construction engine derives scenario_ids deterministically from
  // (set, family, type, as_of, policy_version). We must use the same derivation
  // here so triggers/invalidations/conditions can be keyed by the same id.
  const baseScenarioId = buildL12ScenarioId({
    scenario_set_id: SCENARIO_SET_ID,
    scenario_family: L12ScenarioFamily.SPOT_LED_CONTINUATION,
    scenario_type: L12ScenarioType.BASE_CASE,
    as_of: '2026-05-08T00:00:00Z',
    policy_version: POLICY,
  });
  const altScenarioId = buildL12ScenarioId({
    scenario_set_id: SCENARIO_SET_ID,
    scenario_family: L12ScenarioFamily.DISTRIBUTION_REVERSAL,
    scenario_type: L12ScenarioType.BEARISH_FAILURE,
    as_of: '2026-05-08T00:00:00Z',
    policy_version: POLICY,
  });
  const conditionInputs: L12ConditionInput[] = [
    {
      scenario_id: baseScenarioId,
      scenario_set_id: SCENARIO_SET_ID,
      condition_type: L12ScenarioConditionType.SCORE_CONDITION,
      condition_role: L12ConditionRole.SUPPORTS_PATH,
      source_layer: L12ConditionSourceLayer.L11,
      required_surface_ref: 'l11.cb.canon',
      current_state_ref: 'l11.cb.canon.snap',
      operator: L12ConditionOperator.GREATER_OR_EQUAL,
      threshold_value: 0.5,
      condition_status: L12ConditionStatus.SATISFIED,
      materiality_class: L12ConditionMaterialityClass.MATERIAL,
      evidence_refs: ['l11.attr.canon'],
      lineage_refs: ['l12.lineage.canon'],
      monitorable: true,
      restriction_aware: true,
      contradiction_aware: true,
    },
    {
      scenario_id: altScenarioId,
      scenario_set_id: SCENARIO_SET_ID,
      condition_type: L12ScenarioConditionType.CONTRADICTION_CONDITION,
      condition_role: L12ConditionRole.WEAKENS_PATH,
      source_layer: L12ConditionSourceLayer.L7,
      required_surface_ref: 'l7.contradiction.canon',
      current_state_ref: 'l7.contradiction.canon.snap',
      operator: L12ConditionOperator.POSTURE_REQUIRED,
      condition_status: L12ConditionStatus.SATISFIED,
      materiality_class: L12ConditionMaterialityClass.MATERIAL,
      evidence_refs: ['l7.contradiction.canon'],
      lineage_refs: ['l12.lineage.canon'],
      monitorable: true,
      restriction_aware: true,
      contradiction_aware: true,
    },
  ];
  const condition_set = resolveL12Conditions({
    candidate_set: candidates.candidate_set!,
    conditions: conditionInputs,
    policy_version: POLICY,
  });

  const triggerMonitoring = {
    monitorable: true,
    required_surface_refs: ['l11.cb.canon'],
    check_frequency_class: L12TriggerCheckFrequencyClass.HOURLY,
    stale_after_ms: 3600_000,
    blocked_if_surface_missing: true,
    policy_version: POLICY,
  };
  const triggerInputs: L12TriggerInput[] = [
    {
      scenario_id: baseScenarioId,
      scenario_set_id: SCENARIO_SET_ID,
      trigger_type: L12TriggerType.BULLISH_CONFIRMATION_TRIGGER,
      trigger_name: 'spot_led_breakout_confirmation',
      trigger_condition_refs: condition_set.condition_set!.conditions
        .filter(c => c.scenario_id === baseScenarioId)
        .map(c => c.condition_id),
      trigger_status: L12TriggerStatus.WATCHING,
      trigger_strength_score: 0.6,
      trigger_materiality_class: L12ConditionMaterialityClass.MATERIAL,
      expected_effect_on_scenario: L12TriggerEffect.STRENGTHENS_PRIMARY,
      monitoring_requirement: triggerMonitoring,
      evidence_refs: ['l11.attr.canon'],
      lineage_refs: ['l12.lineage.canon'],
    },
    {
      scenario_id: altScenarioId,
      scenario_set_id: SCENARIO_SET_ID,
      trigger_type: L12TriggerType.FAILURE_TRIGGER,
      trigger_name: 'distribution_breakdown_signal',
      trigger_condition_refs: condition_set.condition_set!.conditions
        .filter(c => c.scenario_id === altScenarioId)
        .map(c => c.condition_id),
      trigger_status: L12TriggerStatus.WATCHING,
      trigger_strength_score: 0.5,
      trigger_materiality_class: L12ConditionMaterialityClass.MATERIAL,
      expected_effect_on_scenario: L12TriggerEffect.COLLAPSES_BASE_CASE,
      monitoring_requirement: triggerMonitoring,
      evidence_refs: ['l7.contradiction.canon'],
      lineage_refs: ['l12.lineage.canon'],
    },
  ];
  const trigger_set = buildL12Triggers({
    condition_set: condition_set.condition_set!,
    triggers: triggerInputs,
    policy_version: POLICY,
  });

  const invMonitoring = {
    monitorable: true,
    required_surface_refs: ['l7.contradiction.canon'],
    check_frequency_class: L12TriggerCheckFrequencyClass.HOURLY,
    stale_after_ms: 3600_000,
    blocks_clean_output_if_missing: true,
    policy_version: POLICY,
  };
  const invInputs: L12InvalidationInput[] = [
    {
      scenario_id: baseScenarioId,
      scenario_set_id: SCENARIO_SET_ID,
      invalidation_type: L12InvalidationType.SUPPORT_FAILURE,
      invalidation_name: 'support_zone_breakdown',
      invalidation_condition_refs: condition_set.condition_set!.conditions
        .filter(c => c.scenario_id === baseScenarioId)
        .map(c => c.condition_id),
      invalidation_strength_score: 0.6,
      invalidation_status: options?.hasActiveInvalidation
        ? L12InvalidationStatus.ACTIVE
        : L12InvalidationStatus.WATCHING,
      expected_effect: L12InvalidationEffect.PATH_INVALIDATED,
      monitoring_requirement: invMonitoring,
      evidence_refs: ['l7.val.canon'],
      lineage_refs: ['l12.lineage.canon'],
    },
    {
      scenario_id: altScenarioId,
      scenario_set_id: SCENARIO_SET_ID,
      invalidation_type: L12InvalidationType.CONTRADICTION_ESCALATION,
      invalidation_name: 'contradiction_resolution',
      invalidation_condition_refs: condition_set.condition_set!.conditions
        .filter(c => c.scenario_id === altScenarioId)
        .map(c => c.condition_id),
      invalidation_strength_score: 0.4,
      invalidation_status: L12InvalidationStatus.WATCHING,
      expected_effect: L12InvalidationEffect.PATH_NARROWED,
      monitoring_requirement: invMonitoring,
      evidence_refs: ['l7.contradiction.canon'],
      lineage_refs: ['l12.lineage.canon'],
    },
  ];
  const invalidation_set = buildL12Invalidations({
    condition_set: condition_set.condition_set!,
    invalidations: invInputs,
    policy_version: POLICY,
  });

  const pathInputs: L12PathConstructionInput[] = [
    {
      candidate_id: candidates.candidate_set!.candidates[0]!.candidate_id,
      scope_type: 'asset',
      scope_id: 'btc',
      as_of: '2026-05-08T00:00:00Z',
      scenario_name: 'base_case_spot_led',
      scenario_summary_code: L12ScenarioSummaryCode.BASE_CASE_SPOT_LED,
      path_claim:
        'If L7 validation remains supportive and L8 regime stays compatible, base path strengthens; risk rises if L7 contradiction escalates.',
      path_time_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
      required_confirmation_refs: [],
      unresolved_dependency_refs: [],
      supporting_evidence_refs: ['l7.val.canon', 'l11.attr.canon'],
      contradicting_evidence_refs: [],
      readiness_class: L12ScenarioReadinessClass.SCENARIO_READY,
      evidence_pack_ref: 'l12.evidence.canon',
      input_snapshot_ref: 'l12.snapshot.canon',
      compute_run_id: 'l12.run.canon',
      initial_path_confidence_score: 0.65,
      restriction_profile_ref: 'l12.restriction.canon',
    },
    {
      candidate_id: candidates.candidate_set!.candidates[1]!.candidate_id,
      scope_type: 'asset',
      scope_id: 'btc',
      as_of: '2026-05-08T00:00:00Z',
      scenario_name: 'bearish_distribution_failure',
      scenario_summary_code: L12ScenarioSummaryCode.BEARISH_FAILURE_DISTRIBUTION,
      path_claim:
        'While L7 contradiction unresolved, alternative path may strengthen unless L11 score support recovers.',
      path_time_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
      required_confirmation_refs: [],
      unresolved_dependency_refs: [],
      supporting_evidence_refs: ['l7.contradiction.canon'],
      contradicting_evidence_refs: ['l7.val.canon'],
      readiness_class: L12ScenarioReadinessClass.READY_WITH_DISCLOSURE,
      evidence_pack_ref: 'l12.evidence.canon',
      input_snapshot_ref: 'l12.snapshot.canon',
      compute_run_id: 'l12.run.canon',
      initial_path_confidence_score: 0.4,
      restriction_profile_ref: 'l12.restriction.canon',
    },
  ];
  const constructed = constructL12ScenarioPaths({
    candidate_set: candidates.candidate_set!,
    condition_set: condition_set.condition_set!,
    trigger_set: trigger_set.trigger_set!,
    invalidation_set: invalidation_set.invalidation_set!,
    scenario_set_id: SCENARIO_SET_ID,
    inputs: pathInputs,
    policy_version: POLICY,
  });

  const path_confidence = computeL12PathConfidence({
    constructed: constructed.constructed!,
    trigger_set: trigger_set.trigger_set!,
    invalidation_set: invalidation_set.invalidation_set!,
    posture: {
      hasActiveInvalidation: !!options?.hasActiveInvalidation,
      contradictionUnresolved: false,
      transitionRiskHigh: false,
      decayDominant: false,
      hypothesisSpreadNarrow: false,
      missingVisibilityMaterial: false,
      driftMaterialOrCritical: false,
      requiredTriggersUnresolved: false,
      scenarioSpreadNarrow: false,
    },
    readiness_class: L12ScenarioReadinessClass.SCENARIO_READY,
    factor_scores: FACTORS,
    policy_version: POLICY,
  });

  const ranking = rankL12Scenarios({
    constructed: constructed.constructed!,
    path_confidence: path_confidence.contract!,
    policy_version: POLICY,
  });

  const shift_conditions = deriveL12ShiftConditions({
    ranking: ranking.ranking!,
    path_confidence: path_confidence.contract!,
    posture: {
      scenarioSpreadNarrow: false,
      confidenceMediumOrLower: true,
      secondaryPathClose: true,
      activeInvalidationMaterial: !!options?.hasActiveInvalidation,
      unresolvedTriggerScoreMaterial: false,
      hypothesisSpreadNarrow: false,
      driftOrMissingDataMaterial: false,
    },
    inputs: {
      conditions_that_strengthen_primary: ['cond.strengthen.base'],
      conditions_that_weaken_primary: ['cond.weaken.base'],
      conditions_that_promote_secondary: ['cond.promote.alt'],
      conditions_that_collapse_base_case: options?.hasActiveInvalidation
        ? ['cond.collapse.base']
        : [],
      conditions_that_raise_bullish_path: [],
      conditions_that_raise_bearish_path: [],
      spread_narrowing_conditions: [],
      spread_widening_conditions: [],
    },
    policy_version: POLICY,
  });

  const restrictions = deriveL12Restrictions({
    ranking: ranking.ranking!,
    path_confidence: path_confidence.contract!,
    contradictionUnresolved: false,
    missingVisibilityMaterial: false,
    driftMaterialOrCritical: false,
    hasActiveInvalidation: !!options?.hasActiveInvalidation,
    closeScenarioCompetition: false,
    insufficientInputCompetition: false,
    l7RestrictionInherited: false,
    l11RestrictionInherited: false,
    policy_version: POLICY,
  });

  const evidence_pack = buildL12EvidencePack({
    subject_ref: subj.subject!.scenario_subject_contract_id,
    scenario_set_id: SCENARIO_SET_ID,
    surfaces,
    constructed: constructed.constructed!,
    condition_set: condition_set.condition_set!,
    trigger_set: trigger_set.trigger_set!,
    invalidation_set: invalidation_set.invalidation_set!,
    path_confidence: path_confidence.contract!,
    ranking: ranking.ranking!,
    shift_conditions: shift_conditions.contract!,
    restrictions: restrictions.contract!,
    archive_policy_ref: 'l12.archive.canon',
    input_snapshot_ref: 'l12.snapshot.canon',
    replay_safe_ref: 'l12.replay_safe.canon',
    policy_version: POLICY,
  });

  const materialization = buildL12MaterializationIntent({
    scenario_subject_id: SUBJECT_ID,
    ranking: ranking.ranking!,
    evidence_pack: evidence_pack.contract!,
    readiness_class_ref: 'l12.readiness.CLEAN_EMISSION',
    restriction_contract_ref: restrictions.contract!.restriction_contract_id,
    l5_route_ref: 'l5.route.canon',
    materialization_mode: L12ScenarioMaterializationMode.LIVE,
    direct_store_write_attempted: false,
    policy_version: POLICY,
  });

  return {
    surfaces,
    resolution,
    subject: subj.subject!,
    candidate_set: candidates.candidate_set!,
    condition_set: condition_set.condition_set!,
    trigger_set: trigger_set.trigger_set!,
    invalidation_set: invalidation_set.invalidation_set!,
    constructed: constructed.constructed!,
    path_confidence: path_confidence.contract!,
    ranking: ranking.ranking!,
    shift_conditions: shift_conditions.contract!,
    restrictions: restrictions.contract!,
    evidence_pack: evidence_pack.contract!,
    materialization: materialization.intent!,
  };
}

/* ───────────────────────── Invariants ────────────────────────────── */

export function checkINV_124_A(): L12_4InvariantResult {
  const r = buildCanonicalL12ScenarioDag({
    scenario_subject_id: SUBJECT_ID,
    policy_version: POLICY,
  });
  if (!r.ok || !r.dag) {
    return {
      id: 'INV-12.4-A',
      name: 'deterministic DAG law',
      holds: false,
      evidence: `dag build failed: ${r.errors.join('; ')}`,
    };
  }
  const cycle = detectL12DagCycles(r.dag.nodes, r.dag.edges);
  const topo = l12ToposortDeterministic(r.dag.nodes, r.dag.edges);
  const r2 = buildCanonicalL12ScenarioDag({
    scenario_subject_id: SUBJECT_ID,
    policy_version: POLICY,
  });
  const stable = !!r2.dag && r.dag.replay_hash === r2.dag.replay_hash;
  const holds =
    r.dag.nodes.length === L12_CANONICAL_DAG_NODE_COUNT &&
    r.dag.edges.length === L12_CANONICAL_DAG_EDGE_COUNT &&
    cycle.ok &&
    topo.ok &&
    stable;
  return {
    id: 'INV-12.4-A',
    name: 'deterministic DAG law',
    holds,
    evidence: `nodes=${r.dag.nodes.length} edges=${r.dag.edges.length} cycle.ok=${cycle.ok} topo.ok=${topo.ok} stable=${stable}`,
  };
}

export function checkINV_124_B(): L12_4InvariantResult {
  // Reject naked-score-only / missing L11 surfaces.
  const surfaces = buildCanonicalL12RuntimeSurfaces();
  const ok = assembleL12ScenarioSubject({
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    allowed_scenario_families: [L12ScenarioFamily.SPOT_LED_CONTINUATION],
    forbidden_scenario_families: [],
    surfaces,
    subject_contract_version: '1.0.0',
    policy_version: POLICY,
  });
  const naked = assembleL12ScenarioSubject({
    subject_class: L12ScenarioSubjectClass.ASSET_SCENARIO,
    scope_type: 'asset',
    scope_id: 'btc',
    scope_granularity: 'asset',
    as_of: '2026-05-08T00:00:00Z',
    scenario_window: {
      window_start: '2026-05-08T00:00:00Z',
      window_end: '2026-05-09T00:00:00Z',
      horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    },
    path_horizon: L12ScenarioTimeHorizon.SHORT_TERM,
    allowed_scenario_families: [L12ScenarioFamily.SPOT_LED_CONTINUATION],
    forbidden_scenario_families: [],
    surfaces: { ...surfaces, l11_score_context_bundle_refs: [] },
    subject_contract_version: '1.0.0',
    policy_version: POLICY,
  });
  const holds = ok.ok && !naked.ok;
  return {
    id: 'INV-12.4-B',
    name: 'assembly + input law',
    holds,
    evidence: `green=${ok.ok} naked_rejected=${!naked.ok}`,
  };
}

export function checkINV_124_C(): L12_4InvariantResult {
  // Candidate engine cannot rank; ranking exclusive to ranking engine.
  const bundle = buildCanonicalRuntimeBundle();
  const candidatesHaveOnlyEligibility = bundle.candidate_set.candidates.every(c => {
    const proto = Object.getOwnPropertyNames(c);
    return !proto.includes('primary_scenario_ref') && !proto.includes('secondary_scenario_ref');
  });
  const rankingAssignsBoth =
    !!bundle.ranking.base_case_ref && !!bundle.ranking.primary_scenario_ref;
  const holds = candidatesHaveOnlyEligibility && rankingAssignsBoth;
  return {
    id: 'INV-12.4-C',
    name: 'candidate / ranking separation law',
    holds,
    evidence: `candidates_clean=${candidatesHaveOnlyEligibility} ranking_assigns=${rankingAssignsBoth}`,
  };
}

export function checkINV_124_D(): L12_4InvariantResult {
  const bundle = buildCanonicalRuntimeBundle();
  const allHaveTriggers = bundle.constructed.scenario_paths.every(p => p.trigger_refs.length > 0);
  const allHaveInvalidations = bundle.constructed.scenario_paths.every(
    p => p.invalidation_refs.length > 0,
  );
  const holds = allHaveTriggers && allHaveInvalidations;
  return {
    id: 'INV-12.4-D',
    name: 'trigger and invalidation law',
    holds,
    evidence: `triggers=${allHaveTriggers} invalidations=${allHaveInvalidations}`,
  };
}

export function checkINV_124_E(): L12_4InvariantResult {
  const bundle = buildCanonicalRuntimeBundle({ hasActiveInvalidation: true });
  const cap_present = bundle.path_confidence.confidence_cap_refs.includes('CAP_ACTIVE_INVALIDATION');
  const score_capped = bundle.path_confidence.primary_path_confidence_score <= 0.5 + 1e-9;
  const holds = cap_present && score_capped;
  return {
    id: 'INV-12.4-E',
    name: 'confidence cap law',
    holds,
    evidence: `cap_present=${cap_present} score=${bundle.path_confidence.primary_path_confidence_score}`,
  };
}

export function checkINV_124_F(): L12_4InvariantResult {
  // Naked score consumption rejected; full L11 bundle required.
  const surfaces = buildCanonicalL12RuntimeSurfaces();
  const ok = resolveL12ScenarioInputs({
    scenario_subject_id: SUBJECT_ID,
    surfaces,
    policy_version: POLICY,
  });
  const naked = resolveL12ScenarioInputs({
    scenario_subject_id: SUBJECT_ID,
    surfaces: {
      ...surfaces,
      l11_score_context_bundle_refs: ['l1:raw_price_score'],
    },
    policy_version: POLICY,
  });
  const missing = resolveL12ScenarioInputs({
    scenario_subject_id: SUBJECT_ID,
    surfaces: { ...surfaces, l11_score_context_bundle_refs: [] },
    policy_version: POLICY,
  });
  const holds = ok.ok && !naked.ok && !missing.ok;
  return {
    id: 'INV-12.4-F',
    name: 'L11 score-context law',
    holds,
    evidence: `green=${ok.ok} naked_rejected=${!naked.ok} missing_rejected=${!missing.ok}`,
  };
}

export function checkINV_124_G(): L12_4InvariantResult {
  const bundle = buildCanonicalRuntimeBundle();
  const direct = buildL12MaterializationIntent({
    scenario_subject_id: SUBJECT_ID,
    ranking: bundle.ranking,
    evidence_pack: bundle.evidence_pack,
    readiness_class_ref: 'l12.readiness.CLEAN_EMISSION',
    restriction_contract_ref: bundle.restrictions.restriction_contract_id,
    l5_route_ref: '',
    materialization_mode: L12ScenarioMaterializationMode.LIVE,
    direct_store_write_attempted: true,
    policy_version: POLICY,
  });
  const noRoute = buildL12MaterializationIntent({
    scenario_subject_id: SUBJECT_ID,
    ranking: bundle.ranking,
    evidence_pack: bundle.evidence_pack,
    readiness_class_ref: 'l12.readiness.CLEAN_EMISSION',
    restriction_contract_ref: bundle.restrictions.restriction_contract_id,
    l5_route_ref: '',
    materialization_mode: L12ScenarioMaterializationMode.LIVE,
    policy_version: POLICY,
  });
  const holds =
    bundle.materialization.direct_store_write_attempted === false &&
    !!bundle.materialization.l5_route_ref &&
    !direct.ok &&
    !noRoute.ok;
  return {
    id: 'INV-12.4-G',
    name: 'materialization law',
    holds,
    evidence: `intent_ok=true direct_rejected=${!direct.ok} no_route_rejected=${!noRoute.ok}`,
  };
}

export function checkINV_124_H(): L12_4InvariantResult {
  const parent = buildL12ComputeRun({
    scenario_subject_id: SUBJECT_ID,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    run_mode: L12ScenarioRunMode.LIVE,
    scenario_engine_version: '1.0.0',
    scenario_contract_version: '1.0.0',
    started_at: '2026-05-08T00:00:00Z',
    policy_version: POLICY,
  });
  const goodRepair = buildL12ComputeRun({
    scenario_subject_id: SUBJECT_ID,
    scope_type: 'asset',
    scope_id: 'btc',
    as_of: '2026-05-08T00:00:00Z',
    run_mode: L12ScenarioRunMode.REPAIR,
    scenario_engine_version: '1.0.1',
    scenario_contract_version: '1.0.0',
    parent_run_id: parent.compute_run_id,
    repair_reason: 'L7_VALIDATION_RESTATED',
    started_at: '2026-05-08T01:00:00Z',
    policy_version: POLICY,
  });
  const goodRepairCheck = checkL12RepairLaw({
    parent_run: parent,
    repair_run: goodRepair,
    changed_input_refs: ['l7.val.canon'],
    parent_primary_confidence: 0.6,
    repair_primary_confidence: 0.6,
  });
  const removedTrigger = checkL12RepairLaw({
    parent_run: parent,
    repair_run: goodRepair,
    changed_input_refs: ['l7.val.canon'],
    removed_trigger_refs: ['l12.trigger.removed'],
    parent_primary_confidence: 0.6,
    repair_primary_confidence: 0.6,
  });
  const upgradedNoEvidence = checkL12RepairLaw({
    parent_run: parent,
    repair_run: goodRepair,
    changed_input_refs: ['l7.val.canon'],
    parent_primary_confidence: 0.5,
    repair_primary_confidence: 0.7,
  });
  const holds = goodRepairCheck.ok && !removedTrigger.ok && !upgradedNoEvidence.ok;
  return {
    id: 'INV-12.4-H',
    name: 'replay / repair law',
    holds,
    evidence: `good=${goodRepairCheck.ok} removed_trigger_rejected=${!removedTrigger.ok} upgrade_rejected=${!upgradedNoEvidence.ok}`,
  };
}

export function checkAllL12_4Invariants(): readonly L12_4InvariantResult[] {
  return [
    checkINV_124_A(),
    checkINV_124_B(),
    checkINV_124_C(),
    checkINV_124_D(),
    checkINV_124_E(),
    checkINV_124_F(),
    checkINV_124_G(),
    checkINV_124_H(),
  ];
}
