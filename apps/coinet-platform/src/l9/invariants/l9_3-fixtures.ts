/**
 * L9.3 — Canonical Test Fixtures for Invariants and Certification
 *
 * These fixtures are the canonical green baseline every L9.3 invariant
 * and certification band starts from. Individual offenders mutate one
 * field at a time to prove the rejection pathway is precise.
 */

import { L9SequenceFamily } from '../contracts/sequence-family';
import { L9SequenceState } from '../contracts/sequence-state';
import { L9SequenceSubjectContract } from '../contracts/sequence-subject.contract';
import { L9SequenceOutputContract } from '../contracts/sequence-output.contract';
import { L9LeadLagRelationContract } from '../contracts/lead-lag-relation.contract';
import { L9SequenceChainContract } from '../contracts/sequence-chain.contract';
import { L9PhaseStateContract } from '../contracts/phase-state.contract';
import { L9DecayProfileContract } from '../contracts/decay-profile.contract';
import { L9PostEventWindowContract } from '../contracts/post-event-window.contract';
import { L9SequenceRestrictionProfileContract } from '../contracts/sequence-restriction.contract';
import {
  L9LagClass,
  L9LagSupportStrength,
  L9LagContradictionPosture,
} from '../contracts/lead-lag-relation';
import {
  L9CausalConfidenceClass,
} from '../contracts/sequence-chain';
import {
  L9PhaseClass,
  L9PhaseProgressionClass,
} from '../contracts/phase-state';
import {
  L9DecayClass,
  L9DecayReasonCode,
} from '../contracts/decay-profile';
import {
  L9PostEventWindowClass,
  L9PostEventWindowState,
} from '../contracts/post-event-window';
import {
  L9SequenceRelianceBand,
  L9AllowedDownstreamUse,
  L9SequenceNarrowingReason,
} from '../contracts/sequence-restriction-profile';
import { L9SequenceConfidenceBand } from '../contracts/sequence-assessment';
import { L9SequenceCoexistenceClass } from '../contracts/sequence-coexistence';
import { L9_CURRENT_CONTRACT_VERSIONS } from '../contracts/sequence-contract-versioning';

const AS_OF = '2026-04-17T00:00:00.000Z';

export function cannedLineageRefs() {
  return {
    trace_id: 'trc_l9_3_fx',
    manifest_id: 'mfst_l9_3_fx',
    upstream_refs: ['l8_up_1', 'l7_up_1'],
  };
}

export function cannedSubject(
  overrides: Partial<L9SequenceSubjectContract> = {},
): L9SequenceSubjectContract {
  return {
    sequence_subject_id: 'seq_sub_fx_1',
    sequence_family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    sequence_template_id: 'tmpl_acc_to_expansion_v1',
    sequence_version: '1.0.0',

    subject_contract_version: L9_CURRENT_CONTRACT_VERSIONS.subject_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,

    scope_type: 'ASSET',
    scope_id: 'asset_fx',
    scope_granularity: 'POINT',

    required_validation_inputs: [{
      ref: 'l7_val_1',
      family: 'L7_VALIDATION',
      required: true,
      staleness_critical: true,
      evidence_only: false,
      context_only: false,
    }],
    required_event_inputs: [{
      ref: 'l6_evt_1',
      family: 'L6_EVENT',
      required: true,
      staleness_critical: true,
      evidence_only: false,
      context_only: false,
    }],
    required_feature_inputs: [{
      ref: 'l6_feat_1',
      family: 'L6_FEATURE',
      required: true,
      staleness_critical: true,
      evidence_only: false,
      context_only: false,
    }],
    required_regime_inputs: [{
      ref: 'l8_reg_1',
      family: 'L8_REGIME',
      required: true,
      staleness_critical: true,
      evidence_only: false,
      context_only: false,
    }],
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],

    as_of: AS_OF,
    sequence_window: {
      window_id: 'win_seq_fx',
      as_of: AS_OF,
      lookback_seconds: 86_400,
      lookforward_seconds: 0,
      granularity: 'HOUR',
    },
    lead_lag_window: {
      window_id: 'win_ll_fx',
      as_of: AS_OF,
      lookback_seconds: 3600,
      max_lag_ms: 3_600_000,
    },
    post_event_window_spec: {
      required: false,
      max_anchor_age_seconds: 86_400,
      allowed_window_classes: [],
    },
    decay_window_spec: {
      required: true,
      lookback_seconds: 259_200,
      max_time_burden_ms: 259_200_000,
    },
    freshness_budget_seconds: 300,
    staleness_policy: 'STRICT',

    sequence_selection_rules: [{ rule_id: 'r_seq_fx', rule_version: '1.0.0' }],
    lead_lag_rules: [{ rule_id: 'r_ll_fx', rule_version: '1.0.0' }],
    phase_rules: [{ rule_id: 'r_ph_fx', rule_version: '1.0.0' }],
    change_point_rules: [{ rule_id: 'r_cp_fx', rule_version: '1.0.0' }],
    decay_rules: [{ rule_id: 'r_dec_fx', rule_version: '1.0.0' }],
    ambiguity_rules: [{ rule_id: 'r_am_fx', rule_version: '1.0.0' }],
    degradation_rules: [{ rule_id: 'r_deg_fx', rule_version: '1.0.0' }],

    confidence_derivation_spec: {
      policy_id: 'pol_conf_fx',
      policy_version: '1.0.0',
      required_factors: ['completeness', 'lead_lag_strength', 'decay'],
      factor_weights: { completeness: 0.4, lead_lag_strength: 0.3, decay: 0.3 },
      caps: ['chain_damaged', 'decay_high'],
      consumes_l7_confidence: true,
      consumes_l8_regime: false,
    },
    restriction_derivation_spec: {
      policy_id: 'pol_restr_fx',
      policy_version: '1.0.0',
      default_reliance_band: 'SUPPORTING',
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
      required: true,
      min_regime_refs: 1,
      block_on_unstable_regime: true,
    },
    validation_consumption_policy: {
      required: true,
      min_validation_refs: 1,
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
      minimum_completeness_score: 0.7,
      forbid_clean_when_chain_damaged: true,
      required_lead_lag_support: 'AT_LEAST_ONE',
    },
    allowed_sequence_state_set: [
      L9SequenceState.PRE_NARRATIVE_ACCUMULATION,
      L9SequenceState.EARLY_NARRATIVE_IGNITION,
      L9SequenceState.VALIDATED_EXPANSION,
      L9SequenceState.STRUCTURAL_CONFIRMATION_GAP,
    ],
    allowed_secondary_sequence_state_set: [
      L9SequenceState.STRUCTURAL_CONFIRMATION_GAP,
    ],

    lineage_policy: {
      requires_trace_id: true,
      requires_manifest_id: true,
      requires_upstream_refs: true,
    },
    lineage_refs: cannedLineageRefs(),

    created_by: 'l9.3-test-fixture',
    created_at: AS_OF,
    description: 'Canonical subject fixture for L9.3 certification.',

    ...overrides,
  };
}

export function cannedOutput(
  overrides: Partial<L9SequenceOutputContract> = {},
): L9SequenceOutputContract {
  return {
    sequence_result_id: 'seq_res_fx_1',
    sequence_subject_id: 'seq_sub_fx_1',
    subject_contract_ref: 'subctr_fx_1',

    output_contract_version: L9_CURRENT_CONTRACT_VERSIONS.output_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,

    sequence_family: L9SequenceFamily.ACCUMULATION_TO_EXPANSION,
    primary_sequence_state: L9SequenceState.VALIDATED_EXPANSION,
    secondary_sequence_state: null,

    scope_type: 'ASSET',
    scope_id: 'asset_fx',
    as_of: AS_OF,

    sequence_confidence_score: 0.7,
    sequence_confidence_band: L9SequenceConfidenceBand.HIGH,
    phase_progression_score: 0.55,
    phase_progression_class: L9PhaseProgressionClass.CONFIRMED,
    sequence_decay_score: 0.1,
    sequence_decay_class: L9DecayClass.FRESH,

    lead_lag_profile_ref: 'llprof_fx_1',
    ordered_signal_refs: ['sig_1', 'sig_2', 'sig_3'],
    sequence_chain_ref: 'chain_fx_1',
    phase_state_ref: 'phase_fx_1',
    phase_class: L9PhaseClass.CONFIRMING,
    change_point_refs: [],
    post_event_window_refs: [],
    decay_profile_ref: 'decay_fx_1',

    regime_refs: ['l8_reg_1'],
    validation_refs: ['l7_val_1'],
    contradiction_refs: [],
    restriction_profile_ref: 'srp_fx_1',

    evidence_pack_ref: 'epk_fx_1',
    input_snapshot_ref: 'isn_fx_1',

    coexistence_class: L9SequenceCoexistenceClass.CLEAN_SINGLE,
    ambiguity_score: 0.1,
    staleness_score: 0.1,
    degradation_score: 0.1,
    sequence_completeness_score: 0.9,
    chain_integrity_flags: [],

    causal_restraint_flags: {
      chain_is_temporal_only: true,
      adjacency_is_not_causality_disclaimer:
        'Sequence adjacency is temporal-only; no causal claim implied.',
      hypothesis_excluded: true,
      judgment_excluded: true,
      scenario_excluded: true,
      recommendation_excluded: true,
    },

    materialization_mode: 'LIVE',
    materialization_policy: 'ON_DEMAND',
    replay_mode_flag: 'LIVE',
    repair_mode_flag: false,
    late_data_class: 'NONE',

    compute_run_id: 'run_fx_1',
    replay_hash: 'srhash_fx_1',
    runtime_integrity_flags: {
      input_snapshot_hash_match: true,
      contract_version_match: true,
      replay_hash_stable: true,
      evidence_refs_resolvable: true,
      subject_contract_resolvable: true,
      chain_ref_resolvable: true,
      phase_ref_resolvable: true,
      decay_ref_resolvable: true,
      restriction_profile_resolvable: true,
      validation_refs_within_restriction: true,
    },

    lineage_refs: cannedLineageRefs(),

    ...overrides,
  };
}

export function cannedLeadLag(
  overrides: Partial<L9LeadLagRelationContract> = {},
): L9LeadLagRelationContract {
  return {
    lead_lag_id: 'll_fx_1',
    sequence_subject_id: 'seq_sub_fx_1',
    lead_lag_contract_version: L9_CURRENT_CONTRACT_VERSIONS.lead_lag_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,
    leading_signal_ref: 'sig_1',
    lagging_signal_ref: 'sig_2',
    lag_duration_ms: 600_000,
    lag_class: L9LagClass.NORMAL,
    support_strength: L9LagSupportStrength.MODERATE_SUPPORT,
    contradiction_posture: L9LagContradictionPosture.NONE,
    decay_adjustment: 0.1,
    historical_reliability: 0.6,
    lag_window_ref: 'win_ll_fx',
    scope_type: 'ASSET',
    scope_id: 'asset_fx',
    as_of: AS_OF,
    causal_restraint_flag: true,
    causal_restraint: {
      treated_as_temporal_only: true,
      causal_inference_disclaimer:
        'Lead-lag is temporal-only; no causal claim is implied.',
    },
    restriction_consumption_refs: [],
    regime_conditioning_refs: [],
    validation_conditioning_refs: [],
    lineage_refs: { trace_id: 'trc_ll', manifest_id: 'mfst_ll' },
    compute_run_id: 'run_fx_1',
    replay_hash: 'srhash_ll_1',
    replay_hash_component: 'rhc_ll_1',
    ...overrides,
  };
}

export function cannedChain(
  overrides: Partial<L9SequenceChainContract> = {},
): L9SequenceChainContract {
  return {
    sequence_chain_id: 'chain_fx_1',
    sequence_subject_id: 'seq_sub_fx_1',
    chain_contract_version: L9_CURRENT_CONTRACT_VERSIONS.chain_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,
    ordered_node_refs: ['n1', 'n2', 'n3'],
    ordered_event_refs: ['e1', 'e2', 'e3'],
    ordered_link_refs: ['l1', 'l2'],
    chain_start_at: '2026-04-16T00:00:00.000Z',
    chain_end_at: AS_OF,
    sequence_completeness_score: 0.9,
    ambiguity_score: 0.1,
    causal_confidence_class: L9CausalConfidenceClass.TEMPORAL_ONLY,
    chain_integrity_flags: [],
    phase_refs: ['phase_fx_1'],
    change_point_refs: [],
    decay_profile_ref: 'decay_fx_1',
    post_event_window_refs: [],
    restriction_refs: ['srp_fx_1'],
    lineage_refs: cannedLineageRefs(),
    compute_run_id: 'run_fx_1',
    replay_hash: 'srhash_chain_1',
    ...overrides,
  };
}

export function cannedPhase(
  overrides: Partial<L9PhaseStateContract> = {},
): L9PhaseStateContract {
  return {
    phase_state_id: 'phase_fx_1',
    sequence_subject_id: 'seq_sub_fx_1',
    phase_contract_version: L9_CURRENT_CONTRACT_VERSIONS.phase_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,
    phase_class: L9PhaseClass.CONFIRMING,
    phase_progression_score: 0.55,
    phase_progression_class: L9PhaseProgressionClass.CONFIRMED,
    phase_support_refs: ['sup_1', 'sup_2'],
    phase_challenge_refs: [],
    phase_started_at: '2026-04-16T00:00:00.000Z',
    phase_last_confirmed_at: AS_OF,
    lineage_refs: { trace_id: 'trc_ph', manifest_id: 'mfst_ph' },
    compute_run_id: 'run_fx_1',
    replay_hash: 'srhash_phase_1',
    ...overrides,
  };
}

export function cannedDecay(
  overrides: Partial<L9DecayProfileContract> = {},
): L9DecayProfileContract {
  return {
    decay_profile_id: 'decay_fx_1',
    sequence_subject_id: 'seq_sub_fx_1',
    decay_contract_version: L9_CURRENT_CONTRACT_VERSIONS.decay_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,
    decay_score: 0.1,
    decay_class: L9DecayClass.FRESH,
    decaying_signal_refs: [],
    surviving_signal_refs: ['sig_1', 'sig_2'],
    decay_reason_codes: [L9DecayReasonCode.TIME_BURDEN],
    time_burden_ms: 3_600_000,
    lineage_refs: { trace_id: 'trc_dec', manifest_id: 'mfst_dec' },
    compute_run_id: 'run_fx_1',
    replay_hash: 'srhash_decay_1',
    ...overrides,
  };
}

export function cannedPostEvent(
  overrides: Partial<L9PostEventWindowContract> = {},
): L9PostEventWindowContract {
  return {
    post_event_window_id: 'pew_fx_1',
    sequence_subject_id: 'seq_sub_fx_1',
    post_event_contract_version: L9_CURRENT_CONTRACT_VERSIONS.post_event_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,
    anchor_event_ref: 'anchor_1',
    window_class: L9PostEventWindowClass.UNLOCK_DIGESTION,
    window_start: '2026-04-16T00:00:00.000Z',
    window_end: AS_OF,
    window_state: L9PostEventWindowState.STABILIZING,
    stabilization_refs: [],
    failure_refs: [],
    lineage_refs: { trace_id: 'trc_pew', manifest_id: 'mfst_pew' },
    compute_run_id: 'run_fx_1',
    replay_hash: 'srhash_pew_1',
    ...overrides,
  };
}

export function cannedRestriction(
  overrides: Partial<L9SequenceRestrictionProfileContract> = {},
): L9SequenceRestrictionProfileContract {
  return {
    sequence_restriction_profile_id: 'srp_fx_1',
    sequence_result_id: 'seq_res_fx_1',
    sequence_subject_id: 'seq_sub_fx_1',
    restriction_contract_version: L9_CURRENT_CONTRACT_VERSIONS.restriction_contract_version,
    schema_version: L9_CURRENT_CONTRACT_VERSIONS.schema_version,
    policy_version: L9_CURRENT_CONTRACT_VERSIONS.policy_version,
    reliance_band: L9SequenceRelianceBand.SUPPORTING,
    allowed_downstream_uses: [
      L9AllowedDownstreamUse.RISK_CONDITIONING,
      L9AllowedDownstreamUse.AUDIT_REFERENCE,
    ],
    blocked_uses: [
      L9AllowedDownstreamUse.RECOMMENDATION_CONTEXT,
      L9AllowedDownstreamUse.JUDGMENT_INPUT,
    ],
    required_disclosures: ['ADJACENCY_NOT_CAUSALITY'],
    narrowing_reasons: [
      L9SequenceNarrowingReason.HIGH_AMBIGUITY,
    ],
    lineage_refs: cannedLineageRefs(),
    compute_run_id: 'run_fx_1',
    replay_hash: 'srhash_srp_1',
    description:
      'Canonical restriction profile for L9.3 certification.',
    ...overrides,
  };
}
