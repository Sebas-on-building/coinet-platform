/**
 * L9.4 — Canonical Green Pipeline
 *
 * §9.4.17 — Deterministic fixture used by L9.4 invariants and
 * certification tests. Every structural property (DAG shape, stage
 * ordering, engine rejection) can be validated using this pipeline
 * as the known-green baseline.
 */

import { L9SequenceFamily } from '../contracts/sequence-family';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9SequenceCoexistenceClass } from '../contracts/sequence-coexistence';
import {
  L9PhaseClass,
} from '../contracts/phase-state';
import { L9DecayClass, L9DecayReasonCode } from '../contracts/decay-profile';
import {
  L9LagSupportStrength,
  L9LagContradictionPosture,
} from '../contracts/lead-lag-relation';
import {
  L9CausalConfidenceClass,
} from '../contracts/sequence-chain';
import type {
  L9SequenceSubjectContract,
} from '../contracts/sequence-subject.contract';
import type { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import {
  L9SequenceRun,
  L9SequenceRunMode,
} from '../runtime/sequence-compute-run';
import {
  assembleSequenceSubject,
  type L9SurfaceAvailability,
} from '../engine/sequence-assembly-engine';
import {
  resolveTemporalInputs,
  type L9InputSurfaceStatus,
} from '../engine/temporal-input-resolver';
import {
  resolveOrderedSignals,
  type L9OrderedSignalCandidate,
} from '../engine/ordered-signal-resolver';
import {
  computeLeadLagProfile,
} from '../engine/lead-lag-engine';
import {
  emitPhaseProgression,
} from '../engine/phase-progression-engine';
import {
  detectChangePoints,
} from '../engine/change-point-engine';
import {
  emitDecayProfile,
} from '../engine/decay-engine';
import {
  emitPostEventWindows,
} from '../engine/post-event-window-engine';
import {
  classifySequence,
} from '../engine/sequence-classification-engine';
import {
  buildConfidenceHandoff,
} from '../engine/sequence-confidence-engine';
import {
  buildRestrictionProfile,
} from '../engine/sequence-restriction-engine';
import {
  buildSequenceEvidencePack,
} from '../engine/sequence-evidence-pack-builder';
import {
  materializeSequenceOutput,
} from '../materializer/sequence-materializer';
import { L9SequenceConfidenceBand } from '../contracts/sequence-assessment';

const ENGINE_IDS = [
  'sequence-assembly-engine',
  'temporal-input-resolver',
  'ordered-signal-resolver',
  'lead-lag-engine',
  'phase-progression-engine',
  'change-point-engine',
  'decay-engine',
  'post-event-window-engine',
  'sequence-classification-engine',
  'sequence-confidence-engine',
  'sequence-restriction-engine',
  'sequence-evidence-pack-builder',
  'sequence-materializer',
] as const;

export function buildGreenL94Subject(): L9SequenceSubjectContract {
  return {
    sequence_subject_id: 'lss_accum_inv',
    sequence_family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    sequence_template_id: 'ltpl_accum_default_v1',
    sequence_version: '1.0.0',
    subject_contract_version: '9.3.0',
    schema_version: '9.3.0',
    policy_version: 'l9.3-policy-v1',
    scope_type: 'ASSET',
    scope_id: 'eth',
    scope_granularity: 'POINT',
    required_validation_inputs: [
      { ref: 'l7:validation/accum-eth', family: 'L7_VALIDATION',
        required: true, staleness_critical: true,
        evidence_only: false, context_only: false },
    ],
    required_event_inputs: [
      { ref: 'l6:event/accum-eth', family: 'L6_EVENT',
        required: true, staleness_critical: true,
        evidence_only: false, context_only: false },
    ],
    required_feature_inputs: [
      { ref: 'l6:feature/accum-eth', family: 'L6_FEATURE',
        required: true, staleness_critical: true,
        evidence_only: false, context_only: false },
    ],
    required_regime_inputs: [
      { ref: 'l8:regime/accum-eth', family: 'L8_REGIME',
        required: true, staleness_critical: false,
        evidence_only: false, context_only: false },
    ],
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],
    as_of: '2026-04-17T12:00:00Z',
    sequence_window: {
      window_id: 'win_seq_eth_24h',
      as_of: '2026-04-17T12:00:00Z',
      lookback_seconds: 86400,
      lookforward_seconds: 0,
      granularity: 'HOUR',
    },
    lead_lag_window: {
      window_id: 'win_ll_eth_4h',
      as_of: '2026-04-17T12:00:00Z',
      lookback_seconds: 14400,
      max_lag_ms: 3_600_000,
    },
    post_event_window_spec: {
      required: false, max_anchor_age_seconds: 0, allowed_window_classes: [],
    },
    decay_window_spec: {
      required: true, lookback_seconds: 86400, max_time_burden_ms: 172800000,
    },
    freshness_budget_seconds: 900,
    staleness_policy: 'STRICT',
    sequence_selection_rules:
      [{ rule_id: 'accum.select.v1', rule_version: '1.0.0' }],
    lead_lag_rules:
      [{ rule_id: 'accum.leadlag.v1', rule_version: '1.0.0' }],
    phase_rules:
      [{ rule_id: 'accum.phase.v1', rule_version: '1.0.0' }],
    change_point_rules:
      [{ rule_id: 'accum.cp.v1', rule_version: '1.0.0' }],
    decay_rules:
      [{ rule_id: 'accum.decay.v1', rule_version: '1.0.0' }],
    ambiguity_rules:
      [{ rule_id: 'accum.ambig.v1', rule_version: '1.0.0' }],
    degradation_rules:
      [{ rule_id: 'accum.degr.v1', rule_version: '1.0.0' }],
    confidence_derivation_spec: {
      policy_id: 'accum.conf.v1', policy_version: '1.0.0',
      required_factors: ['chain_completeness', 'decay_adjustment'],
      factor_weights: { chain_completeness: 0.6, decay_adjustment: 0.4 },
      caps: ['AMBIGUITY_MATERIAL'],
      consumes_l7_confidence: true, consumes_l8_regime: true,
    },
    restriction_derivation_spec: {
      policy_id: 'accum.restr.v1', policy_version: '1.0.0',
      default_reliance_band: 'PRIMARY',
      required_narrowing_reasons: [],
      forbid_decisive_when_ambiguous: true,
    },
    materialization_policy: 'ON_DEMAND',
    evidence_pack_policy: 'REQUIRED',
    restriction_consumption_policy: {
      required: true,
      expected_rights: ['TEMPORAL_CONDITIONING', 'SEQUENCE_INPUT'],
      block_on_missing_profile: true,
    },
    regime_consumption_policy: {
      required: true, min_regime_refs: 1, block_on_unstable_regime: true,
    },
    validation_consumption_policy: {
      required: true, min_validation_refs: 1,
      block_on_restricted_outputs: true,
    },
    ambiguity_cleanliness_policy: {
      forbid_clean_single_when_ambiguous: true,
      ambiguity_material_threshold: 0.3,
      require_secondary_when_transitional: true,
    },
    causal_restraint_policy: {
      treat_adjacency_as_temporal_only: true,
      require_causal_disclaimer_on_lead_lag: true,
      forbid_causal_certainty_semantics: true,
    },
    chain_integrity_requirements: {
      minimum_completeness_score: 0.6,
      forbid_clean_when_chain_damaged: true,
      required_lead_lag_support: 'AT_LEAST_ONE',
    },
    allowed_sequence_state_set: [
      L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
      L9SequenceState.EARLY_NARRATIVE_IGNITION,
      L9SequenceState.VALIDATED_EXPANSION,
    ],
    allowed_secondary_sequence_state_set: [
      L9SequenceState.EARLY_NARRATIVE_IGNITION,
    ],
    lineage_policy: {
      requires_trace_id: true, requires_manifest_id: true,
      requires_upstream_refs: false,
    },
    lineage_refs: {
      trace_id: 'trace-l94', manifest_id: 'manifest-l94', upstream_refs: [],
    },
    created_by: 'sequence-engine',
    created_at: '2026-04-17T12:00:01Z',
    description:
      'governed accumulation-to-expansion sequence invariant fixture',
  };
}

export function buildGreenL94Run(
  mode: L9SequenceRunMode = L9SequenceRunMode.LIVE,
  overrides: Partial<L9SequenceRun> = {},
): L9SequenceRun {
  const engine_version_set: Record<string, string> = {};
  for (const e of ENGINE_IDS) engine_version_set[e] = '9.4.0';
  return {
    sequence_run_id: overrides.sequence_run_id ?? 'run-l94-inv',
    sequence_engine_version: '9.4.0',
    dag_version: '9.4.0',
    template_version_set: { 'ltpl_accum_default_v1': '1.0.0' },
    engine_version_set,
    subject_contract_version_set: { 'lss_accum_inv': '9.3.0' },
    mode,
    trace_id: 'trace-l94',
    parent_run_id: overrides.parent_run_id ??
      (mode === L9SequenceRunMode.REPLAY || mode === L9SequenceRunMode.REPAIR
        ? 'run-l94-parent' : null),
    repair_reason: overrides.repair_reason ??
      (mode === L9SequenceRunMode.REPAIR
        ? 'late-critical-event' : null),
    scope_set: [{ scope_type: 'ASSET', scope_id: 'eth' }],
    input_snapshot_ref: 'l5:snapshot/accum_eth_inv',
    started_at: '2026-04-17T12:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

export interface L9_4GreenPipelineResult {
  readonly subject: L9SequenceSubjectContract;
  readonly run: L9SequenceRun;
  readonly instance: ReturnType<typeof assembleSequenceSubject>;
  readonly output: ReturnType<typeof materializeSequenceOutput>;
}

/**
 * §9.4.17 — Run the full pipeline and return the final output envelope.
 * The helper throws if any engine rejects the green fixture — callers
 * use that to guard canonical-green invariants.
 */
export function runGreenL94Pipeline(): {
  subject: L9SequenceSubjectContract;
  run: L9SequenceRun;
  output: NonNullable<ReturnType<typeof materializeSequenceOutput>['value']>;
  evidencePack:
    NonNullable<ReturnType<typeof buildSequenceEvidencePack>['value']>;
} {
  const subject = buildGreenL94Subject();
  const run = buildGreenL94Run();
  const engineVersions = run.engine_version_set;

  const availability: L9SurfaceAvailability[] = [
    { ref: 'l7:validation/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L7_VALIDATION' },
    { ref: 'l6:event/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L6_EVENT' },
    { ref: 'l6:feature/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L6_FEATURE' },
    { ref: 'l8:regime/accum-eth', available: true,
      scope_type: 'ASSET', scope_id: 'eth', family: 'L8_REGIME' },
  ];

  const assembly = assembleSequenceSubject({
    subject, surface_availability: availability,
    trace_id: 'trace-l94', manifest_id: 'manifest-l94',
  });
  if (!assembly.ok) throw new Error('assembly failed');
  const instance = assembly.value!;

  const statuses: L9InputSurfaceStatus[] = availability.map(a => ({
    ref: a.ref, available: true,
    stale: false, degraded: false, restricted: false,
    blocked: false, evidence_only: false, historical: false,
  }));
  const inputRes = resolveTemporalInputs({
    subject, instance, surface_statuses: statuses,
    restriction_profile_refs: ['l7:restriction/accum'],
  });
  if (!inputRes.ok) throw new Error('input resolver failed');
  const resolvedInputs = inputRes.value!;

  const candidates: L9OrderedSignalCandidate[] = [
    { signal_ref: 'sig_init', observed_at: '2026-04-17T10:00:00Z',
      ordering_evidence_refs: ['l6:event/accum-eth'],
      pre_event: true, post_event: false,
      late: false, stale: false, ambiguous: false, evidence_only: false,
      contradicts_prior: false, decayed_predecessor: false,
      role_confidence: 0.9 },
    { signal_ref: 'sig_conf', observed_at: '2026-04-17T11:30:00Z',
      ordering_evidence_refs: ['l6:event/accum-eth'],
      pre_event: true, post_event: false,
      late: false, stale: false, ambiguous: false, evidence_only: false,
      contradicts_prior: false, decayed_predecessor: false,
      role_confidence: 0.85 },
  ];
  const orderedRes = resolveOrderedSignals({
    subject, resolved_inputs: resolvedInputs, candidates,
  });
  if (!orderedRes.ok) throw new Error('ordered signals failed');
  const ordered = orderedRes.value!;

  const leadLagRes = computeLeadLagProfile({
    subject, ordered_signals: ordered,
    relations: [{
      leading_signal_ref: 'sig_init',
      lagging_signal_ref: 'sig_conf',
      lag_duration_ms: 90 * 60_000,
      support_strength: L9LagSupportStrength.STRONG_SUPPORT,
      contradiction_posture: L9LagContradictionPosture.NONE,
      decay_adjustment: 0.1, historical_reliability: 0.8,
      lag_window_ref: 'win_ll_eth_4h',
      ordering_evidence_refs: ['l6:event/accum-eth'],
      restriction_consumption_refs: [{
        restriction_profile_ref: 'l7:restriction/accum',
        consumed_rights: ['TEMPORAL_CONDITIONING'],
      }],
      regime_conditioning_refs: [{
        regime_result_ref: 'l8:regime/accum-eth',
        regime_family: 'MACRO', regime_confidence_band: 'HIGH',
      }],
      validation_conditioning_refs: [{
        validation_ref: 'l7:validation/accum-eth',
        validation_class: 'NORMAL',
      }],
    }],
    contract_versions: {
      lead_lag_contract_version: '9.3.0', schema_version: '9.3.0',
      policy_version: 'l9.3-policy-v1',
    },
    compute_run_id: run.sequence_run_id,
  });
  if (!leadLagRes.ok) throw new Error('lead-lag failed');
  const leadLag = leadLagRes.value!;

  const changePointRes = detectChangePoints({ subject, candidates: [] });
  if (!changePointRes.ok) throw new Error('change-point failed');
  const changePoints = changePointRes.value!;

  const decayRes = emitDecayProfile({
    subject, decay_required: true,
    decay_score: 0.05,
    decaying_signal_refs: [],
    surviving_signal_refs: ['sig_init', 'sig_conf'],
    decay_reason_codes: [L9DecayReasonCode.TIME_BURDEN],
    time_burden_ms: 3_600_000,
    contract_versions: {
      decay_contract_version: '9.3.0', schema_version: '9.3.0',
      policy_version: 'l9.3-policy-v1',
    },
    compute_run_id: run.sequence_run_id,
  });
  if (!decayRes.ok) throw new Error('decay failed');
  const decay = decayRes.value!;

  const postEventRes = emitPostEventWindows({
    subject, candidates: [],
    contract_versions: {
      post_event_contract_version: '9.3.0', schema_version: '9.3.0',
      policy_version: 'l9.3-policy-v1',
    },
    compute_run_id: run.sequence_run_id,
  });
  if (!postEventRes.ok) throw new Error('post-event failed');
  const postEvent = postEventRes.value!;

  const phaseRes = emitPhaseProgression({
    subject, ordered_signals: ordered, lead_lag: leadLag,
    chain_complete: true, chain_damaged: false,
    has_change_point_jump: false, has_post_event_digestion: false,
    is_decaying: false,
    phase_class: L9PhaseClass.EARLY, phase_progression_score: 0.3,
    phase_support_refs: ['l6:event/accum-eth'],
    phase_challenge_refs: [],
    phase_started_at: '2026-04-17T10:00:00Z',
    phase_last_confirmed_at: '2026-04-17T11:30:00Z',
    contract_versions: {
      phase_contract_version: '9.3.0', schema_version: '9.3.0',
      policy_version: 'l9.3-policy-v1',
    },
    compute_run_id: run.sequence_run_id,
  });
  if (!phaseRes.ok) throw new Error('phase failed');
  const phase = phaseRes.value!;

  const chain: L9SequenceChainContract = {
    sequence_chain_id: `sch:${subject.sequence_subject_id}:${subject.as_of}`,
    sequence_subject_id: subject.sequence_subject_id,
    chain_contract_version: '9.3.0', schema_version: '9.3.0',
    policy_version: 'l9.3-policy-v1',
    ordered_node_refs: ordered.ordered_signals.map(o => o.signal_ref),
    ordered_event_refs: ['l6:event/accum-eth'],
    ordered_link_refs: [leadLag.relations[0]!.lead_lag_id],
    chain_start_at: '2026-04-17T10:00:00Z',
    chain_end_at: '2026-04-17T11:30:00Z',
    sequence_completeness_score: 0.85,
    ambiguity_score: 0.05,
    causal_confidence_class: L9CausalConfidenceClass.TEMPORAL_ONLY,
    chain_integrity_flags: [],
    phase_refs: [phase.phase_state.phase_state_id],
    change_point_refs: [],
    decay_profile_ref: decay.decay_profile_id,
    post_event_window_refs: [],
    restriction_refs: ['l7:restriction/accum'],
    lineage_refs: {
      trace_id: 'trace-l94', manifest_id: 'manifest-l94',
      upstream_refs: [],
    },
    compute_run_id: run.sequence_run_id,
    replay_hash: 'h:chain:accum-eth',
  };

  const classRes = classifySequence({
    subject, resolved_inputs: resolvedInputs,
    ordered_signals: ordered, lead_lag: leadLag,
    phase_output: phase, change_points: changePoints,
    decay, post_event: postEvent, chain,
    primary_sequence_state: L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
    secondary_sequence_state: null,
    declared_coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
    proposed_ambiguity_score: 0.05,
    proposed_staleness_score: 0.05,
    proposed_degradation_score: 0.05,
    rationale_codes: ['ACCUMULATION_OBSERVED'],
  });
  if (!classRes.ok) throw new Error('classification failed');
  const classification = classRes.value!;

  const confidenceRes = buildConfidenceHandoff({
    subject, classification, lead_lag: leadLag,
    regime_refs: ['l8:regime/accum-eth'],
    evidence_refs: ['l6:event/accum-eth'],
    chain_completeness: chain.sequence_completeness_score,
  });
  if (!confidenceRes.ok) throw new Error('confidence failed');

  const sequenceResultId =
    `lsr:${subject.sequence_subject_id}:${run.sequence_run_id}`;

  const restrictionRes = buildRestrictionProfile({
    subject, classification,
    sequence_result_id: sequenceResultId,
    contradiction_refs: [],
    regime_refs: ['l8:regime/accum-eth'],
    evidence_refs: ['l6:event/accum-eth'],
    restriction_required_refs: ['l7:restriction/accum'],
    contract_versions: {
      restriction_contract_version: '9.3.0', schema_version: '9.3.0',
      policy_version: 'l9.3-policy-v1',
    },
    compute_run_id: run.sequence_run_id,
  });
  if (!restrictionRes.ok) throw new Error('restriction failed');
  const restriction = restrictionRes.value!;

  const packRes = buildSequenceEvidencePack({
    instance, ordered_signals: ordered, lead_lag: leadLag,
    phase_output: phase, change_points: changePoints,
    decay, post_event: postEvent, chain, classification,
    confidence_ref: `conf:${subject.sequence_subject_id}`,
    restriction_profile: restriction.profile,
    consumed_validation_refs: ['l7:validation/accum-eth'],
    consumed_regime_refs: ['l8:regime/accum-eth'],
    consumed_contradiction_refs: [],
    input_snapshot_ref: run.input_snapshot_ref,
    compute_run_lineage: [run.sequence_run_id],
  });
  if (!packRes.ok) throw new Error('evidence pack failed');
  const evidencePack = packRes.value!;

  const outputRes = materializeSequenceOutput({
    subject, instance, ordered_signals: ordered, lead_lag: leadLag,
    phase_output: phase, change_points: changePoints,
    decay, post_event: postEvent, chain, classification,
    restriction_profile: restriction.profile, evidence_pack: evidencePack,
    sequence_confidence_score: 0.75,
    sequence_confidence_band: L9SequenceConfidenceBand.HIGH,
    materialization_mode: 'LIVE',
    replay_mode_flag: 'LIVE',
    repair_mode_flag: false,
    late_data_class: 'NONE',
    materialization_policy: subject.materialization_policy,
    output_contract_versions: {
      output_contract_version: '9.3.0', schema_version: '9.3.0',
      policy_version: 'l9.3-policy-v1',
    },
    compute_run_id: run.sequence_run_id,
  });
  if (!outputRes.ok) throw new Error('materialization failed');

  return {
    subject, run, output: outputRes.value!, evidencePack,
  };
}
