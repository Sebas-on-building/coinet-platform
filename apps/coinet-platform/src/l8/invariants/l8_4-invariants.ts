/**
 * L8.4 — Runtime Invariants
 *
 * §8.4.9.1 — INV-8.4-A through INV-8.4-G as executable functions. Each
 * returns a typed `L8_4InvariantResult` with an evidence string.
 */

import { L8RegimeFamily } from '../contracts/regime-family';
import {
  L8MacroRegimeClass,
} from '../contracts/regime-class';
import {
  L8RegimeCoexistenceClass,
  L8RegimeConfidenceBand,
  L8TransitionRiskClass,
} from '../contracts/regime-state';
import type { L8RegimeSubjectContract } from '../contracts/regime-subject.contract';
import type {
  L8RegimeCandidate,
  L8ClassificationOutput,
  L8QualityOutput,
  L8ResolvedRegimeInputSet,
  L8TransitionOutput,
} from '../runtime/regime-execution-context';
import {
  L8RegimeRunMode,
  validateL8RegimeRun,
  type L8RegimeRun,
} from '../runtime/regime-compute-run';
import {
  buildL8RegimeDag,
  type L8DagBuildResult,
} from '../runtime/regime-dag-builder';
import {
  assembleRegimeSubject,
  type L8SurfaceAvailability,
} from '../engine/regime-assembly-engine';
import {
  resolveValidationConsumption,
} from '../engine/validation-consumption-resolver';
import {
  resolveRegimeInputs,
  type L8InputSurfaceStatus,
} from '../engine/regime-input-resolver';
import {
  detectCandidates,
  resolveCandidateStrengthBand,
} from '../engine/regime-candidate-engine';
import {
  detectTransition,
} from '../engine/transition-detection-engine';
import {
  evaluateAmbiguity,
} from '../engine/regime-ambiguity-engine';
import {
  evaluateStaleness,
} from '../engine/regime-staleness-engine';
import {
  evaluateDegradation,
} from '../engine/regime-degradation-engine';
import {
  classifyRegime,
} from '../engine/regime-classification-engine';
import {
  deriveRegimeConfidence,
} from '../engine/regime-confidence-engine';
import {
  deriveRegimeMultiplier,
} from '../engine/regime-multiplier-engine';
import {
  buildRegimeEvidencePack,
} from '../engine/regime-evidence-pack-builder';
import {
  prepareRegimeMaterialization,
} from '../materialization/regime-materializer';
import {
  verifyRegimeReplay,
} from '../replay/l8-replay-adapter';
import {
  verifyRegimeRepair,
} from '../repair/l8-repair-adapter';
import {
  L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES,
} from '../contracts/regime-multiplier-profile.contract';
import {
  L8_REGIME_CONFIDENCE_FACTOR_NAMES,
} from '../contracts/regime-confidence.contract';
import type { L8RegimeOutputContract } from '../contracts/regime-output.contract';
import type { L8RegimeTransitionContract } from '../contracts/regime-transition.contract';

export interface L8_4InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

// ──────────────────────────────────────────────────────────────────
// Canonical green subject + run + pipeline walker used by invariants.
// ──────────────────────────────────────────────────────────────────

function buildGreenSubject(): L8RegimeSubjectContract {
  return {
    regime_subject_id: 'rsub_macro_inv',
    regime_family: L8RegimeFamily.MACRO,
    regime_template_id: 'rtpl_macro_default_v1',
    regime_version: '1.0.0',
    subject_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: 'l8.3-policy-v1',
    scope_type: 'MARKET',
    scope_id: 'global',
    scope_granularity: 'MARKET_WIDE',
    required_validation_inputs: [
      {
        ref: 'l7:validation_assessment/macro',
        family: 'L7_VALIDATION',
        required: true, staleness_critical: true,
        evidence_only: false, context_only: false,
      },
      {
        ref: 'l7:restriction_profile/macro',
        family: 'L7_RESTRICTION',
        required: true, staleness_critical: true,
        evidence_only: false, context_only: false,
      },
    ],
    required_feature_inputs: [
      {
        ref: 'l6:current_feature_state/macro_risk',
        family: 'L6_FEATURE',
        required: true, staleness_critical: true,
        evidence_only: false, context_only: false,
      },
    ],
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],
    as_of: '2026-04-17T12:00:00Z',
    regime_window: {
      window_id: 'win_regime_macro_24h',
      as_of: '2026-04-17T12:00:00Z',
      lookback_seconds: 86400,
      lookforward_seconds: 0,
      transition_lookback_seconds: 21600,
    },
    transition_window: {
      window_id: 'win_trans_macro_6h',
      as_of: '2026-04-17T12:00:00Z',
      lookback_seconds: 21600,
      lookforward_seconds: 0,
      transition_lookback_seconds: 21600,
    },
    freshness_budget_seconds: 900,
    staleness_policy: 'STRICT',
    regime_selection_rules:
      [{ rule_id: 'macro.select.v1', rule_version: '1.0.0' }],
    secondary_regime_rules:
      [{ rule_id: 'macro.secondary.v1', rule_version: '1.0.0' }],
    transition_rules:
      [{ rule_id: 'macro.transition.v1', rule_version: '1.0.0' }],
    ambiguity_rules:
      [{ rule_id: 'macro.ambiguity.v1', rule_version: '1.0.0' }],
    degradation_rules:
      [{ rule_id: 'macro.degradation.v1', rule_version: '1.0.0' }],
    confidence_derivation_spec: {
      policy_id: 'macro.confidence.v1',
      policy_version: '1.0.0',
      required_factors: [...L8_REGIME_CONFIDENCE_FACTOR_NAMES] as string[],
      factor_weights: {
        support_breadth: 0.15, freshness: 0.15,
        validation_quality_posture: 0.15, contradiction_pressure: 0.15,
        transition_instability: 0.1, cross_domain_agreement: 0.1,
        historical_reliability: 0.1, ambiguity_pressure: 0.1,
      },
      caps: ['TRANSITION_HIGH', 'AMBIGUITY_MATERIAL'],
      consumes_l7_confidence: true,
    },
    multiplier_derivation_spec: {
      policy_id: 'macro.multiplier.v1',
      policy_version: '1.0.0',
      required_dimensions: [...L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES] as string[],
      forbid_final_score_shape: true,
    },
    materialization_policy: 'ON_DEMAND',
    evidence_pack_policy: 'REQUIRED',
    restriction_consumption_policy: {
      required: true,
      expected_rights: ['REGIME_CONDITIONING', 'MULTIPLIER_INPUT'],
      block_on_missing_profile: true,
    },
    validation_consumption_policy: {
      required: true,
      min_validation_refs: 1,
      block_on_restricted_outputs: true,
    },
    allowed_regime_class_set: [
      L8MacroRegimeClass.RISK_ON,
      L8MacroRegimeClass.RISK_OFF,
      L8MacroRegimeClass.TRANSITION,
      L8MacroRegimeClass.CHOP,
    ],
    allowed_secondary_regime_set: [
      L8MacroRegimeClass.TRANSITION,
      L8MacroRegimeClass.CHOP,
    ],
    required_multiplier_dimensions:
      [...L8_REQUIRED_MULTIPLIER_DIMENSION_NAMES] as string[],
    lineage_policy: {
      requires_trace_id: true,
      requires_manifest_id: true,
      requires_upstream_refs: false,
    },
    lineage_refs: {
      trace_id: 'trace-l84',
      manifest_id: 'manifest-l84',
      upstream_refs: [],
    },
    created_by: 'regime-engine',
    created_at: '2026-04-17T12:00:01Z',
    description: 'governed macro regime classification environment',
  };
}

function buildGreenRun(
  mode: L8RegimeRunMode = L8RegimeRunMode.LIVE,
  overrides: Partial<L8RegimeRun> = {},
): L8RegimeRun {
  return {
    regime_run_id: overrides.regime_run_id ?? 'run-l84-inv',
    regime_engine_version: '8.4.0',
    dag_version: '8.4.0',
    template_version_set: { 'rtpl_macro_default_v1': '1.0.0' },
    engine_version_set: {
      'regime-assembly-engine': '8.4.0',
      'regime-input-resolver': '8.4.0',
      'regime-candidate-engine': '8.4.0',
      'transition-detection-engine': '8.4.0',
      'regime-ambiguity-engine': '8.4.0',
      'regime-staleness-engine': '8.4.0',
      'regime-degradation-engine': '8.4.0',
      'regime-classification-engine': '8.4.0',
      'regime-confidence-engine': '8.4.0',
      'regime-multiplier-engine': '8.4.0',
      'regime-evidence-pack-builder': '8.4.0',
      'regime-materializer': '8.4.0',
    },
    subject_contract_version_set: { 'rsub_macro_inv': '8.3.0' },
    mode,
    trace_id: 'trace-l84',
    parent_run_id: overrides.parent_run_id ??
      (mode === L8RegimeRunMode.REPLAY || mode === L8RegimeRunMode.REPAIR
        ? 'run-l84-parent' : null),
    repair_reason: overrides.repair_reason ??
      (mode === L8RegimeRunMode.REPAIR ? 'corrupted-historical-emission' : null),
    scope_set: [{ scope_type: 'MARKET', scope_id: 'global' }],
    input_snapshot_ref: 'l5:snapshot/macro_inv',
    started_at: '2026-04-17T12:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

interface GreenPipelineResult {
  readonly subject: L8RegimeSubjectContract;
  readonly run: L8RegimeRun;
  readonly resolvedInputs: L8ResolvedRegimeInputSet;
  readonly candidates: readonly L8RegimeCandidate[];
  readonly transition: L8TransitionOutput;
  readonly qualities: readonly L8QualityOutput[];
  readonly classification: L8ClassificationOutput;
  readonly transitionContract: L8RegimeTransitionContract;
  readonly confidence: import('../contracts/regime-confidence.contract').L8RegimeConfidenceContract;
  readonly multiplier: import('../contracts/regime-multiplier-profile.contract').L8RegimeMultiplierProfileContract;
  readonly output: L8RegimeOutputContract;
  readonly dagBuild: L8DagBuildResult;
  readonly usableValidationRefs: readonly string[];
}

/**
 * Execute the canonical green pipeline. Used by multiple invariants and
 * by the test suite. All random sources are avoided — produced artifacts
 * are deterministic.
 */
export function runGreenL84Pipeline(): GreenPipelineResult {
  const subject = buildGreenSubject();
  const run = buildGreenRun();

  const dagBuild = buildL8RegimeDag(run, [subject], run.engine_version_set);

  // Surface availability
  const availability: L8SurfaceAvailability[] = [
    { ref: 'l7:validation_assessment/macro', available: true,
      scope_type: 'MARKET', scope_id: 'global', family: 'L7_VALIDATION' },
    { ref: 'l7:restriction_profile/macro', available: true,
      scope_type: 'MARKET', scope_id: 'global', family: 'L7_RESTRICTION' },
    { ref: 'l6:current_feature_state/macro_risk', available: true,
      scope_type: 'MARKET', scope_id: 'global', family: 'L6_FEATURE' },
  ];

  const assemblyRes = assembleRegimeSubject({
    subject, surface_availability: availability,
    trace_id: 'trace-l84', manifest_id: 'manifest-l84',
  });
  if (!assemblyRes.ok) throw new Error('assembly failed');

  // Validation consumption
  const consumptionRes = resolveValidationConsumption({
    subject,
    surfaces: [
      {
        ref: 'l7:validation_assessment/macro',
        family: 'L7_VALIDATION',
        allows_regime_conditioning: true,
        allows_multiplier_input: true,
        allows_confidence_input: true,
        has_open_contradiction: false,
        emission_blocked: false,
      },
      {
        ref: 'l7:restriction_profile/macro',
        family: 'L7_RESTRICTION',
        allows_regime_conditioning: true,
        allows_multiplier_input: true,
        allows_confidence_input: true,
        has_open_contradiction: false,
        emission_blocked: false,
      },
    ],
  });
  if (!consumptionRes.ok) throw new Error('consumption failed');
  const consumption = consumptionRes.value!;

  // Input resolution
  const surfaceStatuses: L8InputSurfaceStatus[] = [
    {
      ref: 'l7:validation_assessment/macro',
      family: 'L7_VALIDATION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global',
    },
    {
      ref: 'l7:restriction_profile/macro',
      family: 'L7_RESTRICTION',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global',
    },
    {
      ref: 'l6:current_feature_state/macro_risk',
      family: 'L6_FEATURE',
      is_current: true, is_stale: false, is_degraded: false,
      evidence_only: false, context_only: false,
      scope_type: 'MARKET', scope_id: 'global',
    },
  ];

  const inputRes = resolveRegimeInputs({
    subject, surface_statuses: surfaceStatuses,
    usable_validation_refs: consumption.usable_refs,
    blocked_validation_refs: consumption.blocked_refs,
  });
  if (!inputRes.ok) throw new Error('input resolution failed');
  const resolvedInputs = inputRes.value!;

  // Candidates
  const candidateRes = detectCandidates({
    subject,
    resolved_input_set: resolvedInputs,
    proposals: [
      {
        regime_class: L8MacroRegimeClass.RISK_ON,
        raw_strength_score: 0.8,
        supporting_surface_refs: ['l6:current_feature_state/macro_risk'],
        contradicting_surface_refs: [],
        candidate_reason_codes: ['broad-participation'],
        template_ref: subject.regime_template_id,
      },
      {
        regime_class: L8MacroRegimeClass.TRANSITION,
        raw_strength_score: 0.4,
        supporting_surface_refs: [],
        contradicting_surface_refs: [],
        candidate_reason_codes: ['mild-instability'],
        template_ref: subject.regime_template_id,
      },
    ],
  });
  if (!candidateRes.ok) throw new Error('candidate failed');
  const candidates = candidateRes.value!;

  // Transition
  const transitionRes = detectTransition({
    subject,
    candidates,
    prior_primary_regime_class: null,
    fired_signature_refs: [],
  });
  if (!transitionRes.ok) throw new Error('transition failed');
  const transition = transitionRes.value!;

  // Qualities
  const ambRes = evaluateAmbiguity({ subject, candidates, transition });
  if (!ambRes.ok) throw new Error('ambiguity failed');
  const staleRes = evaluateStaleness({
    subject, resolved_input_set: resolvedInputs,
    surface_age_seconds: {
      'l7:validation_assessment/macro': 60,
      'l7:restriction_profile/macro': 60,
      'l6:current_feature_state/macro_risk': 60,
    },
  });
  if (!staleRes.ok) throw new Error('staleness failed');
  const degRes = evaluateDegradation({
    subject, resolved_input_set: resolvedInputs,
    total_required_refs: 3,
  });
  if (!degRes.ok) throw new Error('degradation failed');
  const qualities: readonly L8QualityOutput[] = [
    ambRes.value!, staleRes.value!, degRes.value!,
  ];

  // Classification
  const classRes = classifyRegime({
    subject, candidates, transition, qualities,
    readiness_class: resolvedInputs.readiness_class,
    had_narrowed_validation_consumption:
      consumption.narrowed_refs.length > 0,
  });
  if (!classRes.ok) throw new Error('classification failed');
  const classification = classRes.value!;

  const regimeResultId = `rstate:${subject.regime_subject_id}`;

  // Confidence
  const confidenceRes = deriveRegimeConfidence({
    subject,
    regime_result_id: regimeResultId,
    classification, transition, qualities,
    consumed_restriction_refs: ['l7:restriction_profile/macro'],
    consumed_contradiction_refs: [],
    had_narrowed_consumption: consumption.narrowed_refs.length > 0,
    historical_reliability_score: 0.8,
    cross_domain_agreement_score: 0.8,
    validation_quality_posture_score: 0.8,
    support_breadth_score: 0.75,
    freshness_score: 0.95,
    compute_run_id: run.regime_run_id,
    trace_id: 'trace-l84',
    manifest_id: 'manifest-l84',
  });
  if (!confidenceRes.ok) throw new Error('confidence failed');
  const confidence = confidenceRes.value!;

  // Multiplier
  const multiplierRes = deriveRegimeMultiplier({
    subject,
    regime_result_id: regimeResultId,
    classification, confidence, transition,
    consumed_restriction_refs: ['l7:restriction_profile/macro'],
    compute_run_id: run.regime_run_id,
    trace_id: 'trace-l84',
    manifest_id: 'manifest-l84',
  });
  if (!multiplierRes.ok) throw new Error('multiplier failed');
  const multiplier = multiplierRes.value!;

  // Transition contract (standalone) — derived from transition output
  const transitionContract: L8RegimeTransitionContract = {
    transition_profile_id: `rtrans:${regimeResultId}`,
    regime_subject_id: subject.regime_subject_id,
    regime_result_id: regimeResultId,
    transition_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: subject.policy_version,
    transition_risk_score: transition.transition_risk_score,
    transition_risk_class:
      L8TransitionRiskClass[classification.transition_risk_class],
    coexistence_class:
      L8RegimeCoexistenceClass[classification.coexistence_class],
    transition_signature_refs: [],
    candidate_flip_refs: [],
    instability_reasons: [],
    lineage_refs: { trace_id: 'trace-l84', manifest_id: 'manifest-l84' },
    compute_run_id: run.regime_run_id,
    replay_hash: `rhash:trans:${regimeResultId}`,
  };

  // Synthesise the output contract from the classification
  const output: L8RegimeOutputContract = {
    regime_result_id: regimeResultId,
    regime_subject_id: subject.regime_subject_id,
    subject_contract_ref: 'l8:subject_contract/macro_v1',
    output_contract_version: '8.3.0',
    schema_version: '8.3.0',
    policy_version: subject.policy_version,
    regime_family: subject.regime_family,
    primary_regime: classification.primary_regime,
    secondary_regime: classification.secondary_regime,
    scope_type: subject.scope_type,
    scope_id: subject.scope_id,
    as_of: subject.as_of,
    regime_confidence_score: confidence.confidence_score_capped,
    regime_confidence_band: confidence.confidence_band,
    secondary_regime_confidence: classification.secondary_regime ? 0.4 : null,
    confidence_profile_ref: confidence.confidence_assessment_id,
    transition_risk_score: transition.transition_risk_score,
    transition_risk_class:
      L8TransitionRiskClass[classification.transition_risk_class],
    transition_profile_ref: transitionContract.transition_profile_id,
    multiplier_profile_ref: multiplier.multiplier_profile_id,
    support_strength_score: 0.75,
    ambiguity_score: qualities[0].score,
    staleness_score: qualities[1].score,
    degradation_score: qualities[2].score,
    coexistence_class:
      L8RegimeCoexistenceClass[classification.coexistence_class],
    contradicting_surface_refs: [],
    supporting_surface_refs:
      ['l6:current_feature_state/macro_risk'],
    validation_refs: ['l7:validation_assessment/macro'],
    evidence_pack_ref: 'l6:evidence_pack/macro_risk',
    input_snapshot_ref: run.input_snapshot_ref,
    materialization_mode: 'LIVE',
    materialization_policy: subject.materialization_policy,
    replay_mode_flag: 'LIVE',
    repair_mode_flag: false,
    late_data_class: 'NONE',
    compute_run_id: run.regime_run_id,
    replay_hash: `rhash:${regimeResultId}`,
    runtime_integrity_flags: {
      input_snapshot_hash_match: true,
      contract_version_match: true,
      replay_hash_stable: true,
      evidence_refs_resolvable: true,
      subject_contract_resolvable: true,
      validation_refs_within_restriction: true,
    },
    lineage_refs: {
      trace_id: 'trace-l84',
      manifest_id: 'manifest-l84',
      upstream_refs: [],
    },
  };

  return {
    subject, run, resolvedInputs, candidates, transition, qualities,
    classification, transitionContract, confidence, multiplier, output,
    dagBuild, usableValidationRefs: consumption.usable_refs,
  };
}

// Stable reference to keep resolveCandidateStrengthBand reachable from this module.
void resolveCandidateStrengthBand;

// ──────────────────────────────────────────────────────────────────
// Invariants INV-8.4-A through G
// ──────────────────────────────────────────────────────────────────

export function checkINV_84_A(): L8_4InvariantResult {
  const pipeline = runGreenL84Pipeline();
  const dag = pipeline.dagBuild;

  const ok = dag.dag !== null && dag.violations.length === 0;
  if (!ok) {
    return {
      id: 'INV-8.4-A',
      name: 'Layer 8 runtime is a legal acyclic DAG with deterministic order',
      holds: false,
      evidence: `dag build failed: ${dag.violations.map(v => v.code).join(',')}`,
    };
  }

  // Re-run the build — the order must be identical
  const dag2 = buildL8RegimeDag(pipeline.run, [pipeline.subject],
    pipeline.run.engine_version_set);
  const orderStable =
    dag2.dag !== null &&
    dag.dag!.topological_order.length === dag2.dag.topological_order.length &&
    dag.dag!.topological_order.every(
      (id, i) => id === dag2.dag!.topological_order[i]);

  return {
    id: 'INV-8.4-A',
    name: 'Layer 8 runtime is a legal acyclic DAG with deterministic order',
    holds: ok && orderStable,
    evidence:
      `nodes=${dag.dag!.nodes.length}, edges=${dag.dag!.edges.length}, ` +
      `order_stable=${orderStable}`,
  };
}

export function checkINV_84_B(): L8_4InvariantResult {
  const subject = buildGreenSubject();
  const run = buildGreenRun();
  const runOk = validateL8RegimeRun(run).valid;

  // Missing subject identity blocks assembly
  const brokenAssembly = assembleRegimeSubject({
    subject: { ...subject, regime_subject_id: '' },
    surface_availability: [],
    trace_id: 't', manifest_id: 'm',
  });

  // Missing required validation input blocks input resolution
  const brokenInput = resolveRegimeInputs({
    subject,
    surface_statuses: [],
    usable_validation_refs: [],
    blocked_validation_refs: [],
  });

  return {
    id: 'INV-8.4-B',
    name: 'No classification starts without a contract-complete subject + input readiness',
    holds: runOk && !brokenAssembly.ok && !brokenInput.ok,
    evidence:
      `run_ok=${runOk}, broken_assembly=${!brokenAssembly.ok}, broken_input=${!brokenInput.ok}`,
  };
}

export function checkINV_84_C(): L8_4InvariantResult {
  const subject = buildGreenSubject();
  // Candidate engine never returns a classification-shaped object
  const resolvedInputs: L8ResolvedRegimeInputSet = {
    regime_subject_id: subject.regime_subject_id,
    legal_support_refs: [], legal_challenge_refs: [],
    missing_required_refs: [], stale_refs: [], degraded_refs: [],
    usable_validation_refs: ['l7:validation_assessment/macro'],
    blocked_validation_refs: [],
    readiness_class: 'COMPLETE_CURRENT',
    replay_hash_contribution: 'rinp:inv',
  };
  const candidates = detectCandidates({
    subject, resolved_input_set: resolvedInputs,
    proposals: [
      { regime_class: L8MacroRegimeClass.RISK_ON, raw_strength_score: 0.8,
        supporting_surface_refs: [], contradicting_surface_refs: [],
        candidate_reason_codes: ['x'],
        template_ref: subject.regime_template_id },
    ],
  });
  const result = candidates.value!;
  const noPrimary = result.every(c =>
    !Object.prototype.hasOwnProperty.call(c, 'primary_regime') &&
    !Object.prototype.hasOwnProperty.call(c, 'coexistence_class'));

  // Classification rejected when qualities not fully present
  const partialQualities = classifyRegime({
    subject, candidates: result,
    transition: {
      regime_subject_id: subject.regime_subject_id,
      transition_risk_score: 0.1,
      coexistence_hint: 'CLEAN_SINGLE',
      signature_refs: [], candidate_flip_refs: [], instability_reasons: [],
    },
    qualities: [],
    readiness_class: 'COMPLETE_CURRENT',
    had_narrowed_validation_consumption: false,
  });

  return {
    id: 'INV-8.4-C',
    name: 'Candidate detection may not assign primary/secondary; classification is exclusive',
    holds: noPrimary && !partialQualities.ok,
    evidence:
      `no_primary=${noPrimary}, classification_rejected=${!partialQualities.ok}`,
  };
}

export function checkINV_84_D(): L8_4InvariantResult {
  const subject = buildGreenSubject();

  // Fake clean-single with high ambiguity → classification rejects
  const candidates = detectCandidates({
    subject,
    resolved_input_set: {
      regime_subject_id: subject.regime_subject_id,
      legal_support_refs: [], legal_challenge_refs: [],
      missing_required_refs: [], stale_refs: [], degraded_refs: [],
      usable_validation_refs: [], blocked_validation_refs: [],
      readiness_class: 'COMPLETE_CURRENT',
      replay_hash_contribution: 'rinp:d',
    },
    proposals: [
      { regime_class: L8MacroRegimeClass.RISK_ON, raw_strength_score: 0.6,
        supporting_surface_refs: [], contradicting_surface_refs: [],
        candidate_reason_codes: ['x'],
        template_ref: subject.regime_template_id },
      { regime_class: L8MacroRegimeClass.CHOP, raw_strength_score: 0.55,
        supporting_surface_refs: [], contradicting_surface_refs: [],
        candidate_reason_codes: ['x'],
        template_ref: subject.regime_template_id },
    ],
  });

  const highAmbiguity: L8QualityOutput = {
    domain: 'AMBIGUITY', regime_subject_id: subject.regime_subject_id,
    score: 0.9, reasons: [], affected_surface_refs: [],
    blocks_classification: true,
  };
  const staleOk: L8QualityOutput = {
    domain: 'STALENESS', regime_subject_id: subject.regime_subject_id,
    score: 0.0, reasons: [], affected_surface_refs: [],
    blocks_classification: false,
  };
  const degOk: L8QualityOutput = {
    domain: 'DEGRADATION', regime_subject_id: subject.regime_subject_id,
    score: 0.0, reasons: [], affected_surface_refs: [],
    blocks_classification: false,
  };

  // Under high ambiguity, classification must NOT emit CLEAN_SINGLE.
  // The engine decides coexistence class itself, so we test positively:
  // result should carry AMBIGUOUS_MULTI_CANDIDATE.
  const ambRes = classifyRegime({
    subject, candidates: candidates.value!,
    transition: {
      regime_subject_id: subject.regime_subject_id,
      transition_risk_score: 0.1,
      coexistence_hint: 'CLEAN_SINGLE',
      signature_refs: [], candidate_flip_refs: [], instability_reasons: [],
    },
    qualities: [highAmbiguity, staleOk, degOk],
    readiness_class: 'COMPLETE_CURRENT',
    had_narrowed_validation_consumption: false,
  });
  const ambNotFlattened = ambRes.ok &&
    ambRes.value!.coexistence_class === 'AMBIGUOUS_MULTI_CANDIDATE';

  // High transition + CLEAN_SINGLE → rejected
  const highTransition = classifyRegime({
    subject, candidates: candidates.value!,
    transition: {
      regime_subject_id: subject.regime_subject_id,
      transition_risk_score: 0.9,
      coexistence_hint: 'CLEAN_SINGLE',
      signature_refs: [], candidate_flip_refs: [],
      instability_reasons: ['MOMENTUM_BREAKING'],
    },
    qualities: [
      { ...highAmbiguity, score: 0.1 },
      staleOk, degOk,
    ],
    readiness_class: 'COMPLETE_CURRENT',
    had_narrowed_validation_consumption: false,
  });

  return {
    id: 'INV-8.4-D',
    name: 'Ambiguity/staleness/degradation/transition remain explicit — no silent flattening',
    holds: ambNotFlattened && !highTransition.ok,
    evidence:
      `ambiguity_escalated=${ambNotFlattened}, high_transition_blocked=${!highTransition.ok}`,
  };
}

export function checkINV_84_E(): L8_4InvariantResult {
  const pipeline = runGreenL84Pipeline();
  const { subject, classification, transition, confidence, qualities } =
    pipeline;

  // Confidence with high transition but ignored → rejected
  const rogue = deriveRegimeConfidence({
    subject,
    regime_result_id: 'rogue-1',
    classification: {
      ...classification,
      transition_risk_class: 'HIGH' as const,
    },
    transition: { ...transition, transition_risk_score: 0.9,
      instability_reasons: ['MOMENTUM_BREAKING'] },
    qualities,
    consumed_restriction_refs: ['l7:restriction_profile/macro'],
    consumed_contradiction_refs: [],
    had_narrowed_consumption: false,
    historical_reliability_score: 1,
    cross_domain_agreement_score: 1,
    validation_quality_posture_score: 1,
    support_breadth_score: 1,
    freshness_score: 1,
    compute_run_id: 'run-rogue',
    trace_id: 't', manifest_id: 'm',
  });
  // The cap chain should cap capped below 0.6, so confidence should NOT
  // be rejected on the IGNORES_TRANSITION rule — we expect it to succeed
  // but produce a capped band.
  const cappedOk = rogue.ok &&
    rogue.value!.confidence_score_capped <= 0.5 + 1e-9 &&
    rogue.value!.confidence_band === 'MODERATE';

  // Multiplier engine rejects when restriction is required but no refs
  const multWithoutRestriction = deriveRegimeMultiplier({
    subject,
    regime_result_id: 'rogue-mul',
    classification, transition, confidence,
    consumed_restriction_refs: [],
    compute_run_id: 'run-rogue',
    trace_id: 't', manifest_id: 'm',
  });

  return {
    id: 'INV-8.4-E',
    name: 'Confidence and multiplier obey transition/ambiguity/staleness/degradation/restriction',
    holds: cappedOk && !multWithoutRestriction.ok,
    evidence:
      `confidence_capped=${cappedOk}, multiplier_without_restriction_blocked=${!multWithoutRestriction.ok}`,
  };
}

export function checkINV_84_F(): L8_4InvariantResult {
  const pipeline = runGreenL84Pipeline();

  // Replay: matching hash succeeds, diverged hash fails
  const replayRun = buildGreenRun(L8RegimeRunMode.REPLAY, {
    regime_run_id: 'run-l84-replay',
    parent_run_id: pipeline.run.regime_run_id,
  });

  const replayedOutput: L8RegimeOutputContract = {
    ...pipeline.output,
    replay_mode_flag: 'REPLAY',
    compute_run_id: replayRun.regime_run_id,
  };

  const okVerify = verifyRegimeReplay({
    replay_run: replayRun,
    original_output: pipeline.output,
    replayed_output: replayedOutput,
    original_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
    replayed_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
  });

  const divergedVerify = verifyRegimeReplay({
    replay_run: replayRun,
    original_output: pipeline.output,
    replayed_output: { ...replayedOutput, replay_hash: 'rhash:diverged' },
    original_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
    replayed_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
  });

  const erasedAmbiguity = verifyRegimeReplay({
    replay_run: replayRun,
    original_output: {
      ...pipeline.output,
      coexistence_class: L8RegimeCoexistenceClass.AMBIGUOUS_MULTI_CANDIDATE,
    },
    replayed_output: {
      ...replayedOutput,
      coexistence_class: L8RegimeCoexistenceClass.CLEAN_SINGLE,
    },
    original_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
    replayed_evidence_pack_ref: 'l6:evidence_pack/macro_risk',
  });

  // Repair: distinct run id + reason → ok, reused run id → rejected
  const repairRun = buildGreenRun(L8RegimeRunMode.REPAIR, {
    regime_run_id: 'run-l84-repair',
    parent_run_id: pipeline.run.regime_run_id,
    repair_reason: 'late-data-material',
  });

  const repairedOk = verifyRegimeRepair({
    repair_run: repairRun,
    original_output: pipeline.output,
    repaired_output: {
      ...pipeline.output,
      compute_run_id: repairRun.regime_run_id,
      replay_mode_flag: 'REPAIR',
      repair_mode_flag: true,
    },
  });

  const repairedBad = verifyRegimeRepair({
    repair_run: repairRun,
    original_output: pipeline.output,
    repaired_output: pipeline.output, // reuses original run id
  });

  return {
    id: 'INV-8.4-F',
    name: 'Replay and repair preserve regime meaning unless material inputs differ',
    holds:
      okVerify.ok && !divergedVerify.ok && !erasedAmbiguity.ok &&
      repairedOk.ok && !repairedBad.ok,
    evidence:
      `replay_ok=${okVerify.ok}, replay_diverged_blocked=${!divergedVerify.ok}, ` +
      `replay_ambiguity_erased_blocked=${!erasedAmbiguity.ok}, ` +
      `repair_ok=${repairedOk.ok}, repair_reuse_blocked=${!repairedBad.ok}`,
  };
}

export function checkINV_84_G(): L8_4InvariantResult {
  const pipeline = runGreenL84Pipeline();

  // Evidence pack
  const packRes = buildRegimeEvidencePack({
    subject: pipeline.subject,
    regime_result_id: pipeline.output.regime_result_id,
    candidates: pipeline.candidates,
    transition: pipeline.transition,
    qualities: pipeline.qualities,
    classification: pipeline.classification,
    confidence: pipeline.confidence,
    multiplier: pipeline.multiplier,
    consumed_validation_refs: pipeline.usableValidationRefs,
    input_snapshot_ref: pipeline.run.input_snapshot_ref,
    compute_run_lineage: [pipeline.run.regime_run_id],
  });

  // Materialization via L5
  const matOk = prepareRegimeMaterialization({
    subject: pipeline.subject,
    output: pipeline.output,
    confidence: pipeline.confidence,
    transition: pipeline.transitionContract,
    multiplier: pipeline.multiplier,
    l5_route:
      'l5:POSTGRES_REGIME_REGISTRY + l5:CLICKHOUSE_REGIME_HISTORY',
    direct_store_target: null,
  });

  // Direct-store bypass blocked
  const matDirect = prepareRegimeMaterialization({
    subject: pipeline.subject,
    output: pipeline.output,
    confidence: pipeline.confidence,
    transition: pipeline.transitionContract,
    multiplier: pipeline.multiplier,
    l5_route: 'l5:POSTGRES_REGIME_REGISTRY',
    direct_store_target: 'postgres://direct',
  });

  // Non-L5 route blocked
  const matNonL5 = prepareRegimeMaterialization({
    subject: pipeline.subject,
    output: pipeline.output,
    confidence: pipeline.confidence,
    transition: pipeline.transitionContract,
    multiplier: pipeline.multiplier,
    l5_route: 'redis:direct',
    direct_store_target: null,
  });

  return {
    id: 'INV-8.4-G',
    name: 'No runtime stage may bypass L5 materialization or emit direct-store writes',
    holds:
      packRes.ok && matOk.ok &&
      !matDirect.ok && !matNonL5.ok,
    evidence:
      `pack_ok=${packRes.ok}, mat_ok=${matOk.ok}, ` +
      `direct_blocked=${!matDirect.ok}, non_l5_blocked=${!matNonL5.ok}`,
  };
}

export function checkAllL84Invariants(): readonly L8_4InvariantResult[] {
  return [
    checkINV_84_A(), checkINV_84_B(), checkINV_84_C(), checkINV_84_D(),
    checkINV_84_E(), checkINV_84_F(), checkINV_84_G(),
  ];
}
