/**
 * L10.3 — Universal Contracts Certification Test Suite
 *
 * 5 Bands (§10.3.12):
 *   A — Contract surface enumeration, versioning, required-field law
 *   B — Subject / candidate contract law
 *   C — Output contract law + cleanliness / readiness
 *   D — Ranking, spread, shift-condition, restriction contracts
 *   E — Compatibility law + audit + INV-10.3-A..G invariants
 */

import {
  L10HypothesisSubjectClass,
  L10HypothesisFamilyClass,
} from '../l10/contracts/hypothesis-subject-class';
import { L10MaterialityClass } from '../l10/contracts/hypothesis-materiality';
import {
  L10HypothesisConfidenceBand,
  L10HypothesisReadinessClass,
} from '../l10/contracts/hypothesis-assessment';
import { L10RankingStabilityClass } from '../l10/contracts/hypothesis-ranking';
import { L10SpreadClass } from '../l10/contracts/hypothesis-spread-profile';
import {
  L10RelianceBand,
  L10RestrictionRight,
  L10BlockedUse,
  L10_MANDATORY_BLOCKED_USES,
} from '../l10/contracts/hypothesis-restriction-profile';

import type { L10HypothesisSubjectContract } from '../l10/contracts/hypothesis-subject.contract';
import { L10_SUBJECT_CONTRACT_REQUIRED_FIELDS } from '../l10/contracts/hypothesis-subject.contract';
import type { L10HypothesisCandidateContract } from '../l10/contracts/hypothesis-candidate.contract';
import { L10_CANDIDATE_CONTRACT_REQUIRED_FIELDS } from '../l10/contracts/hypothesis-candidate.contract';
import type { L10HypothesisOutputContract } from '../l10/contracts/hypothesis-output.contract';
import { L10_OUTPUT_CONTRACT_REQUIRED_FIELDS } from '../l10/contracts/hypothesis-output.contract';
import type { L10HypothesisRankingContract } from '../l10/contracts/hypothesis-ranking.contract';
import { L10_RANKING_CONTRACT_REQUIRED_FIELDS } from '../l10/contracts/hypothesis-ranking.contract';
import type { L10HypothesisSpreadProfileContract } from '../l10/contracts/hypothesis-spread.contract';
import { L10_SPREAD_CONTRACT_REQUIRED_FIELDS } from '../l10/contracts/hypothesis-spread.contract';
import type { L10HypothesisShiftConditionContract } from '../l10/contracts/hypothesis-shift-condition.contract';
import { L10_SHIFT_CONDITION_CONTRACT_REQUIRED_FIELDS } from '../l10/contracts/hypothesis-shift-condition.contract';
import type { L10HypothesisRestrictionProfileContract } from '../l10/contracts/hypothesis-restriction.contract';
import { L10_RESTRICTION_CONTRACT_REQUIRED_FIELDS } from '../l10/contracts/hypothesis-restriction.contract';

import {
  L10ContractCompatibilityClass,
  L10ContractSurface,
  ALL_L10_CONTRACT_SURFACES,
  ALL_L10_CONTRACT_COMPATIBILITY_CLASSES,
  L10_CURRENT_CONTRACT_VERSIONS,
  compareL10ContractVersions,
  classifyL10ContractDelta,
  isLegalL10ContractUpgrade,
  buildL10ContractReplayHash,
  l10ContractFnv1aHex,
} from '../l10/contracts/hypothesis-contract-versioning';
import {
  L10HypothesisEmissionReadinessClass,
  ALL_L10_HYPOTHESIS_EMISSION_READINESS_CLASSES,
  ALL_L10_HYPOTHESIS_MATERIALIZATION_POLICIES,
  ALL_L10_HYPOTHESIS_REPLAY_IDENTITY_MODES,
  ALL_L10_HYPOTHESIS_LATE_DATA_CLASSES,
  ALL_L10_HYPOTHESIS_EVIDENCE_PACK_POLICIES,
  ALL_L10_HYPOTHESIS_STALENESS_POLICIES,
  L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS,
} from '../l10/contracts/hypothesis-materialization-policy';

import {
  L10HypothesisContractViolationCode,
  ALL_L10_HYPOTHESIS_CONTRACT_VIOLATION_CODES,
  validateL10SubjectContract,
  validateL10CandidateContract,
  validateL10OutputContract,
  validateL10RankingContract,
  validateL10SpreadContract,
  validateL10ShiftConditionContract,
  validateL10RestrictionContract,
  validateL10ContractCompatibility,
  validateL10OutputReadiness,
  checkL10ContractLeak,
  L10_CONTRACT_LEAK_PATTERNS,
} from '../l10/validation';

import {
  emitL10ContractAudit,
  getL10ContractAuditLog,
  clearL10ContractAuditLog,
  filterL10ContractAuditBySeverity,
  filterL10ContractAuditByCode,
  l10ContractSeverityFor,
  L10ContractAuditSeverity,
} from '../l10/constitution';

import {
  checkAllL103Invariants,
  checkINV_103_A, checkINV_103_B, checkINV_103_C, checkINV_103_D,
  checkINV_103_E, checkINV_103_F, checkINV_103_G,
  checkRankingContractRejection,
} from '../l10/invariants/l10_3-invariants';

const V = L10HypothesisContractViolationCode;

// ═══════════════════════════════════════════════════════════════
// Harness
// ═══════════════════════════════════════════════════════════════
let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string): void {
  if (cond) { passed++; }
  else { failed++; failures.push(label); console.log(`  ✗ ${label}`); }
}

function resetAll(): void {
  clearL10ContractAuditLog();
}

// ═══════════════════════════════════════════════════════════════
// Fixture builders (clean / valid contracts)
// ═══════════════════════════════════════════════════════════════
function buildValidSubjectContract(
  overrides: Partial<L10HypothesisSubjectContract> = {},
): L10HypothesisSubjectContract {
  const base: L10HypothesisSubjectContract = {
    hypothesis_subject_id: 'hsub_c_ok',
    subject_class: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
    subject_version: 'v1',
    subject_contract_version: '10.3.0',
    schema_version: '10.3.0',
    policy_version: 'l10.3-policy-v1',
    scope_type: 'TOKEN',
    scope_id: 'tok_abc',
    scope_granularity: 'POINT',
    materiality: L10MaterialityClass.MATERIAL,
    as_of: '2026-01-01T12:00:00Z',
    hypothesis_window: {
      window_id: 'win_a',
      window_start: '2026-01-01T00:00:00Z',
      window_end: '2026-01-02T00:00:00Z',
      as_of: '2026-01-01T12:00:00Z',
      granularity: 'HOUR',
      freshness_budget_ms: 300000,
    },
    comparison_window: null,
    freshness_budget_ms: 300000,
    staleness_policy: 'STRICT',
    hypothesis_family_set: [
      L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
      L10HypothesisFamilyClass.NARRATIVE_ONLY_REFLEXIVE_PUMP,
    ],
    required_validation_inputs: [{
      ref: 'val_1', family: 'L7_VALIDATION', required: true,
      staleness_critical: true, evidence_only: false, context_only: false,
    }],
    required_regime_inputs: [{
      ref: 'reg_1', family: 'L8_REGIME', required: true,
      staleness_critical: true, evidence_only: false, context_only: false,
    }],
    required_sequence_inputs: [{
      ref: 'seq_1', family: 'L9_SEQUENCE', required: true,
      staleness_critical: true, evidence_only: false, context_only: false,
    }],
    required_feature_inputs: [{
      ref: 'feat_1', family: 'L6_FEATURE', required: true,
      staleness_critical: false, evidence_only: false, context_only: false,
    }],
    required_event_inputs: [{
      ref: 'evt_1', family: 'L6_EVENT', required: true,
      staleness_critical: true, evidence_only: false, context_only: false,
    }],
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],
    candidate_generation: {
      rules: [{ rule_id: 'r1', rule_version: 'v1' }],
      required_family_templates: ['tpl_accum', 'tpl_reflexive'],
      forbidden_family_templates: [],
      min_candidate_count: 2,
      forbid_single_story_collapse: true,
      forbid_preselected_primary: true,
    },
    competition_policy: {
      min_competition_size: 2,
      requires_secondary: true,
      single_story_collapse_forbidden: true,
      close_spread_threshold: 0.15,
      require_shift_conditions_when_close: true,
    },
    cleanliness_policy: {
      forbid_clean_single_when_contradiction_material: true,
      forbid_clean_when_confirmation_gap_material: true,
      forbid_clean_when_invalidation_material: true,
      forbid_clean_when_spread_narrow: true,
    },
    materialization_policy: 'EAGER',
    evidence_pack_policy: 'REQUIRED',
    restriction_consumption_policy: {
      required: true,
      expected_rights: ['HYPOTHESIS_INPUT'],
      block_on_missing_profile: true,
      narrow_on_restrictive_band: true,
    },
    regime_consumption_policy: {
      required: true, min_regime_refs: 1, block_on_unstable_regime: true,
    },
    sequence_consumption_policy: {
      required: true, min_sequence_refs: 1, block_on_damaged_chain: true,
    },
    validation_consumption_policy: {
      required: true, min_validation_refs: 1, block_on_restricted_outputs: true,
    },
    causal_restraint_policy: {
      forbid_causal_proof_semantics: true,
      treat_adjacency_as_temporal_only: true,
      require_causal_disclaimer_on_outputs: true,
      forbid_final_judgment_semantics: true,
      forbid_recommendation_semantics: true,
      forbid_scenario_finality_semantics: true,
    },
    input_snapshot_ref: 'snap_1',
    lineage_policy: {
      requires_trace_id: true, requires_manifest_id: true,
      requires_upstream_refs: true,
    },
    lineage_refs: {
      trace_id: 'trace_a', manifest_id: 'manifest_a', upstream_refs: ['up_a'],
    },
    created_by: 'system',
    created_at: '2026-01-01T12:00:00Z',
    description: 'Accumulation versus reflexive pump explanation',
  };
  return { ...base, ...overrides };
}

function buildValidCandidateContract(
  overrides: Partial<L10HypothesisCandidateContract> = {},
): L10HypothesisCandidateContract {
  const base: L10HypothesisCandidateContract = {
    hypothesis_candidate_id: 'hcan_c_ok',
    hypothesis_subject_id: 'hsub_c_ok',
    hypothesis_family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
    hypothesis_template_id: 'tpl_accum',
    template_version: '1.0.0',
    hypothesis_name: 'genuine early accumulation candidate',
    candidate_class: 'PRIMARY_CANDIDATE',
    candidate_contract_version: '10.3.0',
    schema_version: '10.3.0',
    policy_version: 'l10.3-policy-v1',
    required_support_patterns: [
      { pattern_id: 'p_sup_1', pattern_version: 'v1', pattern_domain: 'onchain_supply' },
    ],
    required_challenge_patterns: [
      { pattern_id: 'p_chal_1', pattern_version: 'v1', pattern_domain: 'funding' },
    ],
    required_confirmation_patterns: [
      { pattern_id: 'p_conf_1', pattern_version: 'v1', pattern_domain: 'breadth' },
    ],
    invalidation_patterns: [
      { pattern_id: 'p_inv_1', pattern_version: 'v1', pattern_domain: 'shock' },
    ],
    regime_conditioning_requirements: ['regime_calm'],
    sequence_conditioning_requirements: ['seq_accum'],
    required_restriction_consumption: ['l7_restriction'],
    required_regime_consumption: ['l8_regime'],
    required_sequence_consumption: ['l9_sequence'],
    support_threshold_profile: {
      min_support_strength: 0.4, min_coverage: 0.5,
      max_contradiction_pressure: 0.6, max_invalidation_risk: 0.3,
      max_confirmation_gap: 0.5,
    },
    challenge_tolerance_profile: {
      max_blocking_contradictions: 0, max_narrowing_contradictions: 3,
      max_cumulative_pressure: 0.6,
    },
    confidence_derivation_spec: {
      policy_id: 'conf_1', policy_version: 'v1',
      required_factors: ['support', 'contradiction'],
      factor_weights: { support: 0.7, contradiction: 0.3 },
      caps: ['competition_live_cap'],
      consumes_l7_confidence: true,
      consumes_l8_regime: true,
      consumes_l9_sequence: true,
    },
    restriction_defaults: {
      default_reliance_band: 'STANDARD',
      required_narrowing_reasons: [],
      forbid_decisive_when_competition_live: true,
    },
    competition_group: 'cg_1',
    candidate_priority_seed: 1,
    lineage_refs: {
      trace_id: 'trace_a', manifest_id: 'manifest_a', upstream_refs: ['up_a'],
    },
    description: 'Accumulation candidate bound to governed lower-layer inputs',
  };
  return { ...base, ...overrides };
}

function buildValidOutputContract(
  overrides: Partial<L10HypothesisOutputContract> = {},
): L10HypothesisOutputContract {
  const base: L10HypothesisOutputContract = {
    hypothesis_assessment_id: 'hassess_c_ok',
    hypothesis_subject_id: 'hsub_c_ok',
    hypothesis_candidate_id: 'hcan_c_ok',
    subject_contract_ref: 'hsubc_ok',
    candidate_contract_ref: 'hcandc_ok',
    output_contract_version: '10.3.0',
    schema_version: '10.3.0',
    policy_version: 'l10.3-policy-v1',
    hypothesis_family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
    hypothesis_template_id: 'tpl_accum',
    template_version: '1.0.0',
    hypothesis_name: 'accumulation candidate',
    subject_class: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
    scope_type: 'TOKEN',
    scope_id: 'tok_abc',
    as_of: '2026-01-01T00:00:00Z',
    support_set_ref: 'hsup_ok',
    contradiction_set_ref: 'hcon_ok',
    confirmation_set_ref: 'hcnf_ok',
    invalidation_set_ref: 'hinv_ok',
    supporting_evidence_refs: ['ev_a'],
    contradicting_evidence_refs: [],
    required_confirmation_refs: ['cfref_a'],
    invalidation_signal_refs: [],
    support_strength_score: 0.8,
    contradiction_pressure_score: 0,
    confirmation_gap_score: 0.1,
    invalidation_risk_score: 0,
    hypothesis_confidence_score: 0.82,
    hypothesis_confidence_band: L10HypothesisConfidenceBand.HIGH,
    ranking_ref: 'hrank_ok',
    rank_position: 0,
    rank_spread_to_next: 0.4,
    competition_size: 2,
    restriction_profile_ref: 'hrest_ok',
    shift_condition_set_ref: 'hshift_ok',
    spread_profile_ref: 'hspread_ok',
    evidence_pack_ref: 'epk_ok',
    input_snapshot_ref: 'snap_ok',
    narrow_spread_flag: false,
    contradiction_material_flag: false,
    confirmation_gap_material_flag: false,
    invalidation_material_flag: false,
    staleness_score: 0.1,
    degradation_score: 0.1,
    readiness_class: L10HypothesisReadinessClass.READY,
    emission_readiness_class: L10HypothesisEmissionReadinessClass.CLEAN_EMISSION,
    causal_restraint_flags: {
      hypothesis_is_explanation_candidate: true,
      not_final_judgment_disclaimer: 'explanation candidate',
      scenario_excluded: true,
      recommendation_excluded: true,
      judgment_excluded: true,
      score_is_not_probability_of_truth: true,
      adjacency_is_not_causality_disclaimer: 'adjacency is temporal, not causal',
    },
    materialization_mode: 'LIVE',
    materialization_policy: 'EAGER',
    replay_mode_flag: 'LIVE',
    repair_mode_flag: false,
    late_data_class: 'NONE',
    compute_run_id: 'run_a',
    replay_hash: 'l10c_deadbeef',
    runtime_integrity_flags: {
      input_snapshot_hash_match: true,
      contract_version_match: true,
      replay_hash_stable: true,
      evidence_refs_resolvable: true,
      subject_contract_resolvable: true,
      support_set_resolvable: true,
      contradiction_set_resolvable: true,
      confirmation_set_resolvable: true,
      invalidation_set_resolvable: true,
      restriction_profile_resolvable: true,
      ranking_ref_resolvable: true,
    },
    lower_layer_posture_consumption_refs: {
      validation_refs: ['val_a'],
      contradiction_refs: [],
      confidence_refs: ['conf_a'],
      restriction_refs: ['rest_a'],
      regime_refs: ['reg_a'],
      sequence_refs: ['seq_a'],
      lead_lag_refs: [],
      phase_refs: [],
      decay_refs: [],
      sequence_restriction_refs: [],
    },
    lineage_refs: {
      trace_id: 'trace_a', manifest_id: 'manifest_a', upstream_refs: ['up_a'],
    },
    description: 'hypothesis of constructive accumulation structure',
  };
  return { ...base, ...overrides };
}

function buildValidRankingContract(
  overrides: Partial<L10HypothesisRankingContract> = {},
): L10HypothesisRankingContract {
  const base: L10HypothesisRankingContract = {
    ranking_id: 'hrank_ok',
    hypothesis_subject_id: 'hsub_c_ok',
    subject_contract_ref: 'hsubc_ok',
    ranking_contract_version: '10.3.0',
    schema_version: '10.3.0',
    ranking_policy_version: 'rpv1',
    policy_version: 'l10.3-policy-v1',
    as_of: '2026-01-01T00:00:00Z',
    ordered_hypothesis_refs: ['hassess_a', 'hassess_b'],
    primary_hypothesis_ref: 'hassess_a',
    secondary_hypothesis_ref: 'hassess_b',
    competition_size: 2,
    confidence_spread: 0.4,
    narrow_spread_flag: false,
    ranking_stability_class: L10RankingStabilityClass.STABLE,
    spread_profile_ref: 'hspread_ok',
    shift_condition_set_ref: 'hshift_ok',
    evidence_pack_ref: 'epk_r',
    input_snapshot_ref: 'snap_ok',
    compute_run_id: 'run_a',
    replay_hash: 'l10c_rk',
    lineage_refs: {
      trace_id: 'trace_r', manifest_id: 'manifest_r', upstream_refs: ['up_r'],
    },
  };
  return { ...base, ...overrides };
}

function buildValidSpreadContract(
  overrides: Partial<L10HypothesisSpreadProfileContract> = {},
): L10HypothesisSpreadProfileContract {
  const base: L10HypothesisSpreadProfileContract = {
    spread_profile_id: 'hspread_ok',
    hypothesis_subject_id: 'hsub_c_ok',
    ranking_ref: 'hrank_ok',
    spread_contract_version: '10.3.0',
    schema_version: '10.3.0',
    policy_version: 'l10.3-policy-v1',
    as_of: '2026-01-01T00:00:00Z',
    primary_hypothesis_ref: 'hassess_a',
    secondary_hypothesis_ref: 'hassess_b',
    confidence_spread: 0.4,
    spread_class: L10SpreadClass.WIDE,
    ranking_stability_class: L10RankingStabilityClass.STABLE,
    narrow_spread_flag: false,
    competition_size: 2,
    evidence_pack_ref: 'epk_s',
    replay_hash: 'l10c_sp',
    lineage_refs: {
      trace_id: 'trace_s', manifest_id: 'manifest_s', upstream_refs: ['up_s'],
    },
  };
  return { ...base, ...overrides };
}

function buildValidShiftContract(
  overrides: Partial<L10HypothesisShiftConditionContract> = {},
): L10HypothesisShiftConditionContract {
  const base: L10HypothesisShiftConditionContract = {
    shift_condition_set_id: 'hshift_ok',
    hypothesis_subject_id: 'hsub_c_ok',
    ranking_ref: 'hrank_ok',
    shift_condition_contract_version: '10.3.0',
    schema_version: '10.3.0',
    policy_version: 'l10.3-policy-v1',
    as_of: '2026-01-01T00:00:00Z',
    current_primary_ref: 'hassess_a',
    current_secondary_ref: 'hassess_b',
    promotion_conditions_for_secondary: ['narrative_confirmed'],
    reinforcement_conditions_for_primary: ['breadth_continues'],
    collapse_conditions_for_primary: ['supply_shock'],
    spread_narrowing_conditions: ['funding_stress'],
    evidence_pack_ref: 'epk_sh',
    replay_hash: 'l10c_sh',
    lineage_refs: {
      trace_id: 'trace_sh', manifest_id: 'manifest_sh', upstream_refs: ['up_sh'],
    },
  };
  return { ...base, ...overrides };
}

function buildValidRestrictionContract(
  overrides: Partial<L10HypothesisRestrictionProfileContract> = {},
): L10HypothesisRestrictionProfileContract {
  const base: L10HypothesisRestrictionProfileContract = {
    hypothesis_restriction_profile_id: 'hrest_ok',
    hypothesis_subject_id: 'hsub_c_ok',
    hypothesis_assessment_ref: 'hassess_c_ok',
    restriction_contract_version: '10.3.0',
    schema_version: '10.3.0',
    policy_version: 'l10.3-policy-v1',
    as_of: '2026-01-01T00:00:00Z',
    reliance_band: L10RelianceBand.STANDARD,
    allowed_downstream_uses: [
      L10RestrictionRight.MAY_USE_FOR_MONITORING,
      L10RestrictionRight.MAY_USE_FOR_EXPLANATORY_CONTEXT,
    ],
    blocked_uses: [...L10_MANDATORY_BLOCKED_USES],
    required_disclosures: ['explanation_candidate_only'],
    narrowing_reasons: [],
    competition_live_flag: false,
    narrow_spread_flag: false,
    replay_hash: 'l10c_rest',
    lineage_refs: {
      trace_id: 'trace_r2', manifest_id: 'manifest_r2', upstream_refs: ['up_r2'],
    },
    description: 'governed restriction on explanatory use',
  };
  return { ...base, ...overrides };
}

// ═══════════════════════════════════════════════════════════════
// BAND A — Contract surfaces, versioning, required fields
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND A: Contract surfaces, versioning, required fields ═══');
resetAll();

assert(ALL_L10_CONTRACT_SURFACES.length === 7, 'A.01 seven contract surfaces');
assert(ALL_L10_CONTRACT_SURFACES.includes(L10ContractSurface.SUBJECT), 'A.02 SUBJECT surface');
assert(ALL_L10_CONTRACT_SURFACES.includes(L10ContractSurface.CANDIDATE), 'A.03 CANDIDATE surface');
assert(ALL_L10_CONTRACT_SURFACES.includes(L10ContractSurface.OUTPUT), 'A.04 OUTPUT surface');
assert(ALL_L10_CONTRACT_SURFACES.includes(L10ContractSurface.RANKING), 'A.05 RANKING surface');
assert(ALL_L10_CONTRACT_SURFACES.includes(L10ContractSurface.SPREAD), 'A.06 SPREAD surface');
assert(ALL_L10_CONTRACT_SURFACES.includes(L10ContractSurface.SHIFT_CONDITION), 'A.07 SHIFT_CONDITION surface');
assert(ALL_L10_CONTRACT_SURFACES.includes(L10ContractSurface.RESTRICTION), 'A.08 RESTRICTION surface');

assert(ALL_L10_CONTRACT_COMPATIBILITY_CLASSES.length === 5, 'A.09 five compatibility classes');
assert(ALL_L10_HYPOTHESIS_EMISSION_READINESS_CLASSES.length === 5, 'A.10 five emission readiness classes');
assert(ALL_L10_HYPOTHESIS_MATERIALIZATION_POLICIES.length === 4, 'A.11 four materialization policies');
assert(ALL_L10_HYPOTHESIS_REPLAY_IDENTITY_MODES.length === 4, 'A.12 four replay identity modes');
assert(ALL_L10_HYPOTHESIS_LATE_DATA_CLASSES.length === 4, 'A.13 four late-data classes');
assert(ALL_L10_HYPOTHESIS_EVIDENCE_PACK_POLICIES.length === 3, 'A.14 three evidence-pack policies');
assert(ALL_L10_HYPOTHESIS_STALENESS_POLICIES.length === 4, 'A.15 four staleness policies');

// Required-field manifests (§10.3.2.10)
assert(L10_SUBJECT_CONTRACT_REQUIRED_FIELDS.length > 10, 'A.16 subject required fields');
assert(L10_CANDIDATE_CONTRACT_REQUIRED_FIELDS.length > 10, 'A.17 candidate required fields');
assert(L10_OUTPUT_CONTRACT_REQUIRED_FIELDS.length > 15, 'A.18 output required fields');
assert(L10_RANKING_CONTRACT_REQUIRED_FIELDS.length > 10, 'A.19 ranking required fields');
assert(L10_SPREAD_CONTRACT_REQUIRED_FIELDS.length > 5, 'A.20 spread required fields');
assert(L10_SHIFT_CONDITION_CONTRACT_REQUIRED_FIELDS.length > 5, 'A.21 shift required fields');
assert(L10_RESTRICTION_CONTRACT_REQUIRED_FIELDS.length > 5, 'A.22 restriction required fields');

// Current contract versions are populated (§10.3.8.1)
assert(L10_CURRENT_CONTRACT_VERSIONS.subject_contract_version === '10.3.0', 'A.23 subject 10.3.0');
assert(L10_CURRENT_CONTRACT_VERSIONS.candidate_contract_version === '10.3.0', 'A.24 candidate 10.3.0');
assert(L10_CURRENT_CONTRACT_VERSIONS.output_contract_version === '10.3.0', 'A.25 output 10.3.0');
assert(L10_CURRENT_CONTRACT_VERSIONS.ranking_contract_version === '10.3.0', 'A.26 ranking 10.3.0');
assert(L10_CURRENT_CONTRACT_VERSIONS.spread_contract_version === '10.3.0', 'A.27 spread 10.3.0');
assert(L10_CURRENT_CONTRACT_VERSIONS.shift_condition_contract_version === '10.3.0', 'A.28 shift 10.3.0');
assert(L10_CURRENT_CONTRACT_VERSIONS.restriction_contract_version === '10.3.0', 'A.29 restriction 10.3.0');
assert(L10_CURRENT_CONTRACT_VERSIONS.policy_version.length > 0, 'A.30 policy version populated');

// Semver compare (§10.3.8.4)
assert(compareL10ContractVersions('10.3.0', '10.4.0') === -1, 'A.31 10.3 < 10.4');
assert(compareL10ContractVersions('10.4.0', '10.3.0') === 1, 'A.32 10.4 > 10.3');
assert(compareL10ContractVersions('10.3.0', '10.3.0') === 0, 'A.33 10.3 == 10.3');
assert(compareL10ContractVersions('nonsense', '10.3.0') === 0, 'A.34 nonsense returns 0');

// Deterministic FNV + namespaced replay hash (§10.3.8.2)
const h1 = l10ContractFnv1aHex('abc');
const h2 = l10ContractFnv1aHex('abc');
const h3 = l10ContractFnv1aHex('abd');
assert(h1 === h2, 'A.35 FNV deterministic');
assert(h1 !== h3, 'A.36 FNV distinguishes inputs');
assert(buildL10ContractReplayHash('abc').startsWith('l10c_'), 'A.37 replay hash namespaced');

// Violation code set (§10.3.11)
assert(ALL_L10_HYPOTHESIS_CONTRACT_VIOLATION_CODES.length > 70, 'A.38 contract code set size');
assert(ALL_L10_HYPOTHESIS_CONTRACT_VIOLATION_CODES.every(c => c.startsWith('L10C_')),
  'A.39 codes prefixed L10C_');

// Cleanliness thresholds populated (§10.3.9.5)
assert(L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS.contradictionMaterial === 0.3,
  'A.40 contradictionMaterial=0.3');
assert(L10_HYPOTHESIS_OUTPUT_CLEANLINESS_THRESHOLDS.narrowSpread === 0.15,
  'A.41 narrowSpread=0.15');

// Leak patterns registered (§10.3.5.4)
assert(L10_CONTRACT_LEAK_PATTERNS.length >= 5, 'A.42 leak patterns registered');
assert(checkL10ContractLeak('the final judgment').leaks === true, 'A.43 judgment detected');
assert(checkL10ContractLeak('we recommend a buy here').leaks === true, 'A.44 recommendation detected');
assert(checkL10ContractLeak('scenario confirmed').leaks === true, 'A.45 scenario-finality detected');
assert(checkL10ContractLeak('proven and definitive').leaks === true, 'A.46 fake-certainty detected');
assert(checkL10ContractLeak('token rallied because of news').leaks === true, 'A.47 causal-proof detected');
assert(checkL10ContractLeak('accumulation candidate').leaks === false, 'A.48 clean passes');

// ═══════════════════════════════════════════════════════════════
// BAND B — Subject / candidate contract law
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND B: Subject / candidate contract law ═══');
resetAll();

// Valid subject passes
assert(validateL10SubjectContract(buildValidSubjectContract()).valid,
  'B.01 valid subject contract passes');

// Missing identity
assert(!validateL10SubjectContract(buildValidSubjectContract({ hypothesis_subject_id: '' })).valid,
  'B.02 missing subject id fails');
assert(validateL10SubjectContract(buildValidSubjectContract({ hypothesis_subject_id: '' }))
  .issues.some(i => i.code === V.SUBJECT_MISSING_IDENTITY),
  'B.03 missing id code');

// Missing family set
const mfs = validateL10SubjectContract(buildValidSubjectContract({ hypothesis_family_set: [] }));
assert(!mfs.valid, 'B.04 empty family set fails');
assert(mfs.issues.some(i => i.code === V.SUBJECT_MISSING_FAMILY_SET), 'B.05 missing family set code');

// Unregistered family
const badFam = validateL10SubjectContract(buildValidSubjectContract({
  hypothesis_family_set: ['UNKNOWN_FAMILY' as unknown as L10HypothesisFamilyClass],
}));
assert(badFam.issues.some(i => i.code === V.SUBJECT_FAMILY_UNREGISTERED),
  'B.06 unregistered family rejected');

// Missing validation inputs
const noVal = validateL10SubjectContract(buildValidSubjectContract({
  required_validation_inputs: [],
}));
assert(noVal.issues.some(i => i.code === V.SUBJECT_MISSING_VALIDATION_INPUTS),
  'B.07 validation inputs required');

// Regime required when family demands it
const noReg = validateL10SubjectContract(buildValidSubjectContract({
  required_regime_inputs: [],
}));
assert(noReg.issues.some(i => i.code === V.SUBJECT_MISSING_REGIME_INPUTS),
  'B.08 regime required for regime-conditioned family');

// Sequence required when family demands it
const noSeq = validateL10SubjectContract(buildValidSubjectContract({
  required_sequence_inputs: [],
}));
assert(noSeq.issues.some(i => i.code === V.SUBJECT_MISSING_SEQUENCE_INPUTS),
  'B.09 sequence required for sequence-conditioned family');

// Pre-selected primary rejection (min_candidate_count=1 + forbid_preselected_primary=false)
const presel = validateL10SubjectContract(buildValidSubjectContract({
  candidate_generation: {
    rules: [{ rule_id: 'r1', rule_version: 'v1' }],
    required_family_templates: ['only'],
    forbidden_family_templates: [],
    min_candidate_count: 1,
    forbid_single_story_collapse: true,
    forbid_preselected_primary: false as unknown as true,
  },
}));
assert(presel.issues.some(i => i.code === V.SUBJECT_CANDIDATE_GEN_PRESELECTED),
  'B.10 pre-selected primary rejected');

// Template overlap in required/forbidden
const overlap = validateL10SubjectContract(buildValidSubjectContract({
  candidate_generation: {
    rules: [{ rule_id: 'r1', rule_version: 'v1' }],
    required_family_templates: ['tpl_a'],
    forbidden_family_templates: ['tpl_a'],
    min_candidate_count: 2,
    forbid_single_story_collapse: true,
    forbid_preselected_primary: true,
  },
}));
assert(overlap.issues.some(i => i.code === V.SUBJECT_CANDIDATE_GEN_TEMPLATE_CONFLICT),
  'B.11 required/forbidden template overlap rejected');

// Missing causal restraint policy
const noCaus = validateL10SubjectContract(buildValidSubjectContract({
  causal_restraint_policy: null as unknown as never,
}));
assert(noCaus.issues.some(i => i.code === V.SUBJECT_MISSING_CAUSAL_RESTRAINT_POLICY),
  'B.12 causal restraint policy required');

// Missing lineage refs
const noLin = validateL10SubjectContract(buildValidSubjectContract({
  lineage_refs: null as unknown as never,
}));
assert(noLin.issues.some(i => i.code === V.SUBJECT_MISSING_LINEAGE_REFS),
  'B.13 lineage refs required');

// Description leak
const leaky = validateL10SubjectContract(buildValidSubjectContract({
  description: 'the final judgment on this asset',
}));
assert(leaky.issues.some(i => i.code === V.SUBJECT_JUDGMENT_LEAK),
  'B.14 subject description leak rejected');

// Candidate valid
assert(validateL10CandidateContract(buildValidCandidateContract()).valid,
  'B.15 valid candidate contract passes');

// Missing pattern posture — all four
const noPatterns = validateL10CandidateContract(buildValidCandidateContract({
  required_support_patterns: undefined as unknown as never,
  required_challenge_patterns: undefined as unknown as never,
  required_confirmation_patterns: undefined as unknown as never,
  invalidation_patterns: undefined as unknown as never,
}));
assert(noPatterns.issues.some(i => i.code === V.CANDIDATE_MISSING_SUPPORT_PATTERNS),
  'B.16 support patterns required');
assert(noPatterns.issues.some(i => i.code === V.CANDIDATE_MISSING_CHALLENGE_PATTERNS),
  'B.17 challenge patterns required');
assert(noPatterns.issues.some(i => i.code === V.CANDIDATE_MISSING_CONFIRMATION_PATTERNS),
  'B.18 confirmation patterns required');
assert(noPatterns.issues.some(i => i.code === V.CANDIDATE_MISSING_INVALIDATION_PATTERNS),
  'B.19 invalidation patterns required');

// Regime conditioning required when family demands
const noRegCond = validateL10CandidateContract(buildValidCandidateContract({
  regime_conditioning_requirements: [],
}));
assert(noRegCond.issues.some(i => i.code === V.CANDIDATE_MISSING_REGIME_CONDITIONING),
  'B.20 regime conditioning required');

// Sequence conditioning required when family demands
const noSeqCond = validateL10CandidateContract(buildValidCandidateContract({
  sequence_conditioning_requirements: [],
}));
assert(noSeqCond.issues.some(i => i.code === V.CANDIDATE_MISSING_SEQUENCE_CONDITIONING),
  'B.21 sequence conditioning required');

// Name leak
const nameLeak = validateL10CandidateContract(buildValidCandidateContract({
  hypothesis_name: 'BuyRecommendationCandidate',
}));
assert(nameLeak.issues.some(i => i.code === V.CANDIDATE_NAME_LEAKS_SEMANTICS),
  'B.22 candidate name leak rejected');

// Description finality leak
const descFin = validateL10CandidateContract(buildValidCandidateContract({
  description: 'scenario is confirmed and decided',
}));
assert(descFin.issues.some(i => i.code === V.CANDIDATE_CARRIES_FINALITY),
  'B.23 candidate description finality rejected');

// Missing restriction defaults (forbid_decisive_when_competition_live=false)
const badRestDef = validateL10CandidateContract(buildValidCandidateContract({
  restriction_defaults: {
    default_reliance_band: 'STANDARD',
    required_narrowing_reasons: [],
    forbid_decisive_when_competition_live: false as unknown as true,
  },
}));
assert(badRestDef.issues.some(i => i.code === V.CANDIDATE_MISSING_RESTRICTION_DEFAULTS),
  'B.24 restriction defaults must forbid decisive');

// Missing competition group
const noGroup = validateL10CandidateContract(buildValidCandidateContract({ competition_group: '' }));
assert(noGroup.issues.some(i => i.code === V.CANDIDATE_MISSING_COMPETITION_GROUP),
  'B.25 competition group required');

// Missing lineage
const noCandLin = validateL10CandidateContract(buildValidCandidateContract({
  lineage_refs: null as unknown as never,
}));
assert(noCandLin.issues.some(i => i.code === V.CANDIDATE_MISSING_LINEAGE),
  'B.26 candidate lineage required');

// Unregistered family
const unregCandFam = validateL10CandidateContract(buildValidCandidateContract({
  hypothesis_family: 'UNKNOWN' as unknown as L10HypothesisFamilyClass,
}));
assert(unregCandFam.issues.some(i => i.code === V.CANDIDATE_FAMILY_UNREGISTERED),
  'B.27 unregistered candidate family rejected');

// ═══════════════════════════════════════════════════════════════
// BAND C — Output contract law + cleanliness / readiness
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND C: Output contract law + cleanliness / readiness ═══');
resetAll();

// Valid output passes
assert(validateL10OutputContract(buildValidOutputContract()).valid,
  'C.01 valid output contract passes');

// Missing evidence objects
const noEvidence = validateL10OutputContract(buildValidOutputContract({
  support_set_ref: '', contradiction_set_ref: '',
  confirmation_set_ref: '', invalidation_set_ref: '',
}));
assert(noEvidence.issues.some(i => i.code === V.OUTPUT_MISSING_SUPPORT_SET), 'C.02 support set required');
assert(noEvidence.issues.some(i => i.code === V.OUTPUT_MISSING_CONTRADICTION_SET), 'C.03 contradiction set required');
assert(noEvidence.issues.some(i => i.code === V.OUTPUT_MISSING_CONFIRMATION_SET), 'C.04 confirmation set required');
assert(noEvidence.issues.some(i => i.code === V.OUTPUT_MISSING_INVALIDATION_SET), 'C.05 invalidation set required');

// Support score > 0 without refs
const supClaim = validateL10OutputContract(buildValidOutputContract({
  support_strength_score: 0.5, supporting_evidence_refs: [],
}));
assert(supClaim.issues.some(i => i.code === V.OUTPUT_SUPPORT_CLAIMED_WITHOUT_REFS),
  'C.06 support claim without refs');

// Contradiction claim without refs
const conClaim = validateL10OutputContract(buildValidOutputContract({
  contradiction_pressure_score: 0.5, contradicting_evidence_refs: [],
}));
assert(conClaim.issues.some(i => i.code === V.OUTPUT_CONTRADICTION_CLAIMED_WITHOUT_REFS),
  'C.07 contradiction claim without refs');

// Confirmation gap without required refs
const confGap = validateL10OutputContract(buildValidOutputContract({
  confirmation_gap_score: 0.5, required_confirmation_refs: [],
}));
assert(confGap.issues.some(i => i.code === V.OUTPUT_CONFIRMATION_REQUIRED_BUT_MISSING),
  'C.08 confirmation gap without refs');

// Invalidation risk without refs
const invRisk = validateL10OutputContract(buildValidOutputContract({
  invalidation_risk_score: 0.5, invalidation_signal_refs: [],
}));
assert(invRisk.issues.some(i => i.code === V.OUTPUT_INVALIDATION_CLAIMED_WITHOUT_REFS),
  'C.09 invalidation risk without refs');

// Score OOR
const oor = validateL10OutputContract(buildValidOutputContract({
  support_strength_score: 1.5,
}));
assert(oor.issues.some(i => i.code === V.OUTPUT_SCORE_OUT_OF_RANGE),
  'C.10 score OOR');

// Band inconsistent
const bandBad = validateL10OutputContract(buildValidOutputContract({
  hypothesis_confidence_score: 0.2,
  hypothesis_confidence_band: L10HypothesisConfidenceBand.HIGH,
}));
assert(bandBad.issues.some(i => i.code === V.OUTPUT_CONFIDENCE_BAND_INCONSISTENT),
  'C.11 confidence band inconsistent');

// Missing ranking ref
const noRank = validateL10OutputContract(buildValidOutputContract({ ranking_ref: '' }));
assert(noRank.issues.some(i => i.code === V.OUTPUT_MISSING_RANKING_REF),
  'C.12 ranking ref required');

// Missing restriction / spread / evidence pack / replay
const noMeta = validateL10OutputContract(buildValidOutputContract({
  restriction_profile_ref: '', spread_profile_ref: '',
  evidence_pack_ref: '', replay_hash: '',
}));
assert(noMeta.issues.some(i => i.code === V.OUTPUT_MISSING_RESTRICTION_PROFILE),
  'C.13 restriction required');
assert(noMeta.issues.some(i => i.code === V.OUTPUT_MISSING_SPREAD_PROFILE),
  'C.14 spread required');
assert(noMeta.issues.some(i => i.code === V.OUTPUT_MISSING_EVIDENCE_PACK),
  'C.15 evidence pack required');
assert(noMeta.issues.some(i => i.code === V.OUTPUT_MISSING_REPLAY_HASH),
  'C.16 replay hash required');

// Missing lower-layer posture consumption
const noPost = validateL10OutputContract(buildValidOutputContract({
  lower_layer_posture_consumption_refs: undefined as unknown as never,
}));
assert(noPost.issues.some(i => i.code === V.OUTPUT_MISSING_POSTURE_CONSUMPTION),
  'C.17 posture consumption required');

// Missing runtime integrity / causal restraint
const noIntegrity = validateL10OutputContract(buildValidOutputContract({
  runtime_integrity_flags: undefined as unknown as never,
}));
assert(noIntegrity.issues.some(i => i.code === V.OUTPUT_MISSING_INTEGRITY_FLAGS),
  'C.18 integrity flags required');

const noCR = validateL10OutputContract(buildValidOutputContract({
  causal_restraint_flags: {
    hypothesis_is_explanation_candidate: true,
    not_final_judgment_disclaimer: 'd',
    scenario_excluded: false as unknown as true,
    recommendation_excluded: true,
    judgment_excluded: true,
    score_is_not_probability_of_truth: true,
    adjacency_is_not_causality_disclaimer: 'd',
  },
}));
assert(noCR.issues.some(i => i.code === V.OUTPUT_MISSING_CAUSAL_RESTRAINT),
  'C.19 causal restraint must exclude scenario');

// Description leak (judgment / recommendation / causal)
const descLeak = validateL10OutputContract(buildValidOutputContract({
  description: 'we recommend buying this token',
}));
assert(descLeak.issues.some(i => i.code === V.OUTPUT_RECOMMENDATION_LEAK),
  'C.20 output description recommendation leak');

// Name leak on output
const outNameLeak = validateL10OutputContract(buildValidOutputContract({
  hypothesis_name: 'FinalJudgmentOutput',
}));
assert(outNameLeak.issues.some(i => i.code === V.OUTPUT_JUDGMENT_LEAK),
  'C.21 output name judgment leak');

// — Cleanliness / readiness —
const clean = validateL10OutputReadiness(buildValidOutputContract(), {});
assert(clean.valid, 'C.22 clean readiness valid');
assert(clean.readiness_class === L10HypothesisEmissionReadinessClass.CLEAN_EMISSION,
  'C.23 clean resolves to CLEAN_EMISSION');

// CLEAN claimed while contradiction material
const contMat = validateL10OutputReadiness(buildValidOutputContract({
  contradiction_pressure_score: 0.9,
  contradicting_evidence_refs: ['ce_a'],
}), {});
assert(!contMat.valid, 'C.24 CLEAN claimed with material contradiction invalid');
assert(contMat.readiness_class === L10HypothesisEmissionReadinessClass.BLOCKED_EMISSION,
  'C.25 CLEAN+contradiction → BLOCKED');
assert(contMat.issues.some(i => i.code === V.CLEAN_WHILE_CONTRADICTION_MATERIAL),
  'C.26 CLEAN_WHILE_CONTRADICTION_MATERIAL flagged');

// CLEAN claimed with narrow spread
const narrow = validateL10OutputReadiness(buildValidOutputContract({
  rank_spread_to_next: 0.05,
}), {});
assert(narrow.issues.some(i => i.code === V.CLEAN_WHILE_SPREAD_NARROW),
  'C.27 CLEAN_WHILE_SPREAD_NARROW flagged');

// Readiness computes DEGRADED when degraded posture with non-clean emission
const degraded = validateL10OutputReadiness(buildValidOutputContract({
  emission_readiness_class: L10HypothesisEmissionReadinessClass.DEGRADED_EMISSION,
  degradation_score: 0.9,
  staleness_score: 0.9,
}), {});
assert(degraded.readiness_class === L10HypothesisEmissionReadinessClass.DEGRADED_EMISSION,
  'C.28 degraded posture resolves to DEGRADED_EMISSION');

// Readiness computes CAPPED when material contradiction but not claiming CLEAN
const capped = validateL10OutputReadiness(buildValidOutputContract({
  emission_readiness_class: L10HypothesisEmissionReadinessClass.CAPPED_EMISSION,
  contradiction_pressure_score: 0.8,
  contradicting_evidence_refs: ['ce_a'],
}), {});
assert(capped.readiness_class === L10HypothesisEmissionReadinessClass.CAPPED_EMISSION,
  'C.29 material contradiction → CAPPED_EMISSION');

// Modifier required when competition live and shift conditions unresolvable
const modReq = validateL10OutputReadiness(buildValidOutputContract({
  emission_readiness_class: L10HypothesisEmissionReadinessClass.MODIFIER_REQUIRED,
  rank_spread_to_next: 0.05,
}), { competition_live: true, shift_conditions_resolvable: false });
assert(!modReq.valid, 'C.30 narrow + missing shift-conditions → invalid');
assert(modReq.issues.some(i => i.code === V.SHIFT_CONDITIONS_REQUIRED_WHEN_CLOSE),
  'C.31 SHIFT_CONDITIONS_REQUIRED_WHEN_CLOSE flagged');

// Structural failure → BLOCKED
const blocked = validateL10OutputReadiness(buildValidOutputContract({
  replay_hash: '',
}), {});
assert(blocked.readiness_class === L10HypothesisEmissionReadinessClass.BLOCKED_EMISSION,
  'C.32 structural failure → BLOCKED_EMISSION');

// ═══════════════════════════════════════════════════════════════
// BAND D — Ranking, spread, shift, restriction contracts
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND D: Ranking, spread, shift, restriction contracts ═══');
resetAll();

// Ranking valid
assert(validateL10RankingContract(buildValidRankingContract()).valid,
  'D.01 valid ranking contract passes');

// Missing ordered refs
const noOrd = validateL10RankingContract(buildValidRankingContract({
  ordered_hypothesis_refs: [],
}));
assert(noOrd.issues.some(i => i.code === V.RANKING_MISSING_ORDERED_REFS),
  'D.02 missing ordered refs');

// Primary not first
const pnf = validateL10RankingContract(buildValidRankingContract({
  ordered_hypothesis_refs: ['hassess_b', 'hassess_a'],
  primary_hypothesis_ref: 'hassess_a',
}));
assert(pnf.issues.some(i => i.code === V.RANKING_PRIMARY_NOT_FIRST),
  'D.03 primary not first rejected');

// Missing secondary when competition_size > 1
const secMiss = validateL10RankingContract(buildValidRankingContract({
  ordered_hypothesis_refs: ['hassess_a', 'hassess_b'],
  primary_hypothesis_ref: 'hassess_a',
  secondary_hypothesis_ref: null,
  competition_size: 2,
}));
assert(secMiss.issues.some(i => i.code === V.RANKING_MISSING_SECONDARY_WHEN_COMPETITION),
  'D.04 secondary required when competing');

// Competition size inconsistent
const sizeBad = validateL10RankingContract(buildValidRankingContract({
  ordered_hypothesis_refs: ['a', 'b'], competition_size: 5,
  primary_hypothesis_ref: 'a', secondary_hypothesis_ref: 'b',
}));
assert(sizeBad.issues.some(i => i.code === V.RANKING_COMPETITION_SIZE_INCONSISTENT),
  'D.05 competition_size inconsistent');

// Spread OOR
const spOOR = validateL10RankingContract(buildValidRankingContract({ confidence_spread: 2 }));
assert(spOOR.issues.some(i => i.code === V.RANKING_SPREAD_OUT_OF_RANGE),
  'D.06 ranking spread OOR');

// Missing spread profile
const noSP = validateL10RankingContract(buildValidRankingContract({ spread_profile_ref: '' }));
assert(noSP.issues.some(i => i.code === V.RANKING_MISSING_SPREAD_PROFILE),
  'D.07 ranking spread profile required');

// Single-story collapse
const ssc = validateL10RankingContract(buildValidRankingContract({
  ordered_hypothesis_refs: ['hassess_a'],
  primary_hypothesis_ref: 'hassess_a', secondary_hypothesis_ref: null,
  competition_size: 3,
}));
assert(ssc.issues.some(i => i.code === V.RANKING_SINGLE_STORY_COLLAPSE),
  'D.08 ranking single-story collapse');

// Spread valid
assert(validateL10SpreadContract(buildValidSpreadContract()).valid,
  'D.09 valid spread contract passes');

// Spread narrow flag hidden
const spNarrow = validateL10SpreadContract(buildValidSpreadContract({
  confidence_spread: 0.05,
  spread_class: L10SpreadClass.NARROW,
  narrow_spread_flag: false,
}));
assert(spNarrow.issues.some(i => i.code === V.SPREAD_NARROW_FLAG_HIDDEN),
  'D.10 narrow flag hidden rejected');

// Spread class inconsistent with magnitude
const spClassBad = validateL10SpreadContract(buildValidSpreadContract({
  confidence_spread: 0.4, spread_class: L10SpreadClass.NARROW, narrow_spread_flag: true,
}));
assert(spClassBad.issues.some(i => i.code === V.SPREAD_CLASS_INCONSISTENT),
  'D.11 spread class inconsistent');

// Spread missing secondary when competing
const spNoSec = validateL10SpreadContract(buildValidSpreadContract({
  secondary_hypothesis_ref: null, competition_size: 2,
}));
assert(spNoSec.issues.some(i => i.code === V.SPREAD_MISSING_SECONDARY_WHEN_COMPETITION),
  'D.12 spread secondary required when competing');

// Spread magnitude OOR
const spMagOOR = validateL10SpreadContract(buildValidSpreadContract({
  confidence_spread: 1.2,
}));
assert(spMagOOR.issues.some(i => i.code === V.SPREAD_MAGNITUDE_OUT_OF_RANGE),
  'D.13 spread magnitude OOR');

// Shift valid
assert(validateL10ShiftConditionContract(buildValidShiftContract()).valid,
  'D.14 valid shift contract passes');

// Shift missing promotion conditions list
const shNoPromo = validateL10ShiftConditionContract(buildValidShiftContract({
  promotion_conditions_for_secondary: undefined as unknown as never,
}));
assert(shNoPromo.issues.some(i => i.code === V.SHIFT_MISSING_PROMOTION_CONDITIONS),
  'D.15 shift promotion conditions required');

// Shift missing reinforcement list
const shNoRein = validateL10ShiftConditionContract(buildValidShiftContract({
  reinforcement_conditions_for_primary: undefined as unknown as never,
}));
assert(shNoRein.issues.some(i => i.code === V.SHIFT_MISSING_REINFORCEMENT_CONDITIONS),
  'D.16 shift reinforcement required');

// Shift missing collapse list
const shNoCol = validateL10ShiftConditionContract(buildValidShiftContract({
  collapse_conditions_for_primary: undefined as unknown as never,
}));
assert(shNoCol.issues.some(i => i.code === V.SHIFT_MISSING_COLLAPSE_CONDITIONS),
  'D.17 shift collapse required');

// Shift missing secondary when competition live
const shNoSec = validateL10ShiftConditionContract(buildValidShiftContract({
  current_secondary_ref: null,
}), { competition_live: true });
assert(shNoSec.issues.some(i => i.code === V.SHIFT_MISSING_SECONDARY_WHEN_COMPETITION),
  'D.18 shift secondary required when competing');

// Restriction valid
assert(validateL10RestrictionContract(buildValidRestrictionContract()).valid,
  'D.19 valid restriction contract passes');

// Restriction missing mandatory blocked uses
const resMissBlock = validateL10RestrictionContract(buildValidRestrictionContract({
  blocked_uses: [L10BlockedUse.MAY_NOT_BE_USED_AS_JUDGMENT],
}));
assert(resMissBlock.issues.some(i => i.code === V.RESTRICTION_MISSING_MANDATORY_BLOCKED_USES),
  'D.20 restriction mandatory blocked uses');

// Restriction decisive while competition live → BROADENED band rejected
const resBroad = validateL10RestrictionContract(buildValidRestrictionContract({
  reliance_band: L10RelianceBand.BROADENED,
  competition_live_flag: true,
  blocked_uses: [...L10_MANDATORY_BLOCKED_USES,
    L10BlockedUse.MAY_NOT_BE_SURFACED_WITHOUT_COMPETITION],
}));
assert(resBroad.issues.some(i => i.code === V.RESTRICTION_DECISIVE_WHILE_COMPETITION_LIVE),
  'D.21 decisive-while-competition-live rejected');

// Narrowing reasons required for NARROW band
const resNarrow = validateL10RestrictionContract(buildValidRestrictionContract({
  reliance_band: L10RelianceBand.NARROW,
  narrowing_reasons: [],
}));
assert(resNarrow.issues.some(i => i.code === V.RESTRICTION_MISSING_NARROWING_REASONS),
  'D.22 narrowing reasons required for NARROW');

// Restriction leak
const resLeak = validateL10RestrictionContract(buildValidRestrictionContract({
  description: 'recommendation for the token',
}));
assert(resLeak.issues.some(i => i.code === V.RESTRICTION_JUDGMENT_LEAK),
  'D.23 restriction description leak rejected');

// Missing reliance band
const noBand = validateL10RestrictionContract(buildValidRestrictionContract({
  reliance_band: 'UNKNOWN' as unknown as L10RelianceBand,
}));
assert(noBand.issues.some(i => i.code === V.RESTRICTION_MISSING_BAND),
  'D.24 reliance band must be registered');

// Competition-live needs MAY_NOT_BE_SURFACED_WITHOUT_COMPETITION
const resComp = validateL10RestrictionContract(buildValidRestrictionContract({
  competition_live_flag: true,
}));
assert(resComp.issues.some(i => i.code === V.RESTRICTION_DECISIVE_WHILE_COMPETITION_LIVE),
  'D.25 competition-live requires SURFACED_WITHOUT_COMPETITION block');

// Narrow-spread needs MAY_NOT_BE_SURFACED_WITHOUT_SPREAD
const resNarSp = validateL10RestrictionContract(buildValidRestrictionContract({
  narrow_spread_flag: true,
}));
assert(resNarSp.issues.some(i => i.code === V.RESTRICTION_DECISIVE_WHILE_COMPETITION_LIVE),
  'D.26 narrow-spread requires SURFACED_WITHOUT_SPREAD block');

// ═══════════════════════════════════════════════════════════════
// BAND E — Compatibility, audit, INV-10.3-A..G invariants
// ═══════════════════════════════════════════════════════════════
console.log('\n═══ BAND E: Compatibility, audit, invariants ═══');
resetAll();

const baseDelta = {
  surface: L10ContractSurface.OUTPUT,
  from: '10.3.0',
  to: '10.4.0',
  added_fields: [] as string[],
  removed_fields: [] as string[],
  semantically_changed_fields: [] as string[],
  changed_enum_vocabularies: [] as string[],
  changed_default_policies: [] as string[],
  prohibited_change: false,
};

// Classification matrix (§10.3.8.3)
assert(classifyL10ContractDelta({ ...baseDelta, added_fields: ['a'] })
  === L10ContractCompatibilityClass.ADDITIVE_SAFE, 'E.01 additive → ADDITIVE_SAFE');
assert(classifyL10ContractDelta({ ...baseDelta, changed_default_policies: ['p'] })
  === L10ContractCompatibilityClass.BACKWARD_COMPATIBLE, 'E.02 policy change → BACKWARD_COMPATIBLE');
assert(classifyL10ContractDelta({ ...baseDelta, removed_fields: ['f'] })
  === L10ContractCompatibilityClass.MIGRATION_REQUIRED, 'E.03 removal → MIGRATION_REQUIRED');
assert(classifyL10ContractDelta({ ...baseDelta, changed_enum_vocabularies: ['e'] })
  === L10ContractCompatibilityClass.MIGRATION_REQUIRED, 'E.04 enum change → MIGRATION_REQUIRED');
assert(classifyL10ContractDelta({ ...baseDelta, semantically_changed_fields: ['x'] })
  === L10ContractCompatibilityClass.BREAKING_SEMANTIC, 'E.05 semantic change → BREAKING_SEMANTIC');
assert(classifyL10ContractDelta({ ...baseDelta, prohibited_change: true })
  === L10ContractCompatibilityClass.PROHIBITED, 'E.06 prohibited → PROHIBITED');

// isLegal guard
assert(isLegalL10ContractUpgrade({ ...baseDelta, added_fields: ['a'] }) === true,
  'E.07 additive legal');
assert(isLegalL10ContractUpgrade({ ...baseDelta, removed_fields: ['f'] }) === false,
  'E.08 removal illegal without approval');
assert(isLegalL10ContractUpgrade({ ...baseDelta, removed_fields: ['f'] },
  { allowMigrationRequired: true }) === true,
  'E.09 removal legal with migration approval');
assert(isLegalL10ContractUpgrade({ ...baseDelta, semantically_changed_fields: ['x'] }) === false,
  'E.10 breaking illegal without approval');
assert(isLegalL10ContractUpgrade({ ...baseDelta, semantically_changed_fields: ['x'] },
  { allowBreaking: true }) === true,
  'E.11 breaking legal with approval');
assert(isLegalL10ContractUpgrade({ ...baseDelta, prohibited_change: true },
  { allowBreaking: true, allowMigrationRequired: true }) === false,
  'E.12 prohibited always illegal');

// Validator rejects unapproved breaking
const breakReport = validateL10ContractCompatibility({
  ...baseDelta, semantically_changed_fields: ['primary_hypothesis_ref'],
});
assert(!breakReport.valid, 'E.13 unapproved breaking rejected');
assert(breakReport.issues.some(i => i.code === V.COMPATIBILITY_BREAKING_SEMANTIC_UNAPPROVED),
  'E.14 BREAKING_SEMANTIC_UNAPPROVED code');

// Non-monotonic rejected
const nonMono = validateL10ContractCompatibility({
  ...baseDelta, from: '10.4.0', to: '10.3.0',
});
assert(nonMono.issues.some(i => i.code === V.COMPATIBILITY_NON_MONOTONIC_VERSION),
  'E.15 non-monotonic version rejected');

// Prohibited rejected
const proh = validateL10ContractCompatibility({ ...baseDelta, prohibited_change: true });
assert(proh.issues.some(i => i.code === V.COMPATIBILITY_PROHIBITED),
  'E.16 prohibited change rejected');

// Expected-class mismatch
const classMismatch = validateL10ContractCompatibility({
  ...baseDelta, added_fields: ['a'],
}, { expectedClass: L10ContractCompatibilityClass.BREAKING_SEMANTIC });
assert(classMismatch.issues.some(i => i.code === V.COMPATIBILITY_CLASSIFICATION_MISMATCH),
  'E.17 expected class mismatch flagged');

// — Audit —
clearL10ContractAuditLog();
const badSub = buildValidSubjectContract({ hypothesis_family_set: [] });
const subjReport = validateL10SubjectContract(badSub);
emitL10ContractAudit('HypothesisSubjectContract', badSub.hypothesis_subject_id, subjReport);
assert(getL10ContractAuditLog().length === subjReport.issues.length,
  'E.18 audit log records issues');

// Severity mapping
assert(l10ContractSeverityFor(V.OUTPUT_JUDGMENT_LEAK) === L10ContractAuditSeverity.CRITICAL,
  'E.19 judgment leak = CRITICAL');
assert(l10ContractSeverityFor(V.SUBJECT_MISSING_IDENTITY) === L10ContractAuditSeverity.HIGH,
  'E.20 missing = HIGH');
assert(l10ContractSeverityFor(V.OUTPUT_SCORE_OUT_OF_RANGE) === L10ContractAuditSeverity.WARNING,
  'E.21 OOR = WARNING');
assert(l10ContractSeverityFor(V.CLEAN_WHILE_CONTRADICTION_MATERIAL) === L10ContractAuditSeverity.CRITICAL,
  'E.22 cleanliness violation = CRITICAL');
assert(l10ContractSeverityFor(V.COMPATIBILITY_PROHIBITED) === L10ContractAuditSeverity.CRITICAL,
  'E.23 prohibited compatibility = CRITICAL');
assert(l10ContractSeverityFor(V.RANKING_SINGLE_STORY_COLLAPSE) === L10ContractAuditSeverity.CRITICAL,
  'E.24 single-story collapse = CRITICAL');

// Filters
clearL10ContractAuditLog();
emitL10ContractAudit('HypothesisCandidateContract', 'hcan_bad',
  validateL10CandidateContract(buildValidCandidateContract({
    hypothesis_name: 'FinalJudgmentCandidate',
  })));
assert(filterL10ContractAuditBySeverity(L10ContractAuditSeverity.CRITICAL).length >= 1,
  'E.25 severity filter works');

clearL10ContractAuditLog();
emitL10ContractAudit('HypothesisRankingContract', 'hrank_bad',
  validateL10RankingContract(buildValidRankingContract({
    ordered_hypothesis_refs: ['a'], primary_hypothesis_ref: 'a',
    secondary_hypothesis_ref: null, competition_size: 3,
  })));
assert(filterL10ContractAuditByCode(V.RANKING_SINGLE_STORY_COLLAPSE).length === 1,
  'E.26 code filter works');

// Clean contract → zero audit records
clearL10ContractAuditLog();
emitL10ContractAudit('HypothesisOutputContract', 'hassess_clean',
  validateL10OutputContract(buildValidOutputContract()));
assert(getL10ContractAuditLog().length === 0, 'E.27 clean output contract no audits');

// — Invariants —
const all = checkAllL103Invariants();
assert(all.length === 7, 'E.28 7 L10.3 invariants');
assert(all.every(r => r.holds),
  `E.29 all invariants hold: ${all.filter(r => !r.holds).map(r => `${r.id}=${r.evidence}`).join('; ')}`);

assert(checkINV_103_A().holds, `E.A ${checkINV_103_A().evidence}`);
assert(checkINV_103_B().holds, `E.B ${checkINV_103_B().evidence}`);
assert(checkINV_103_C().holds, `E.C ${checkINV_103_C().evidence}`);
assert(checkINV_103_D().holds, `E.D ${checkINV_103_D().evidence}`);
assert(checkINV_103_E().holds, `E.E ${checkINV_103_E().evidence}`);
assert(checkINV_103_F().holds, `E.F ${checkINV_103_F().evidence}`);
assert(checkINV_103_G().holds, `E.G ${checkINV_103_G().evidence}`);
assert(checkRankingContractRejection().holds,
  `E.RANK ${checkRankingContractRejection().evidence}`);

// Crafted offender — every first-class object surface missing + name leak
const offender = validateL10OutputContract(buildValidOutputContract({
  hypothesis_name: 'BuyRecommendationVerdict',
  support_set_ref: '', contradiction_set_ref: '',
  confirmation_set_ref: '', invalidation_set_ref: '',
  ranking_ref: '', restriction_profile_ref: '', spread_profile_ref: '',
  evidence_pack_ref: '', replay_hash: '',
  lineage_refs: { trace_id: '', manifest_id: '', upstream_refs: [] },
}));
assert(!offender.valid, 'E.30 crafted offender fails');
const codes = new Set(offender.issues.map(i => i.code));
assert(codes.has(V.OUTPUT_MISSING_SUPPORT_SET), 'E.31 offender missing support');
assert(codes.has(V.OUTPUT_MISSING_CONTRADICTION_SET), 'E.32 offender missing contradiction');
assert(codes.has(V.OUTPUT_MISSING_CONFIRMATION_SET), 'E.33 offender missing confirmation');
assert(codes.has(V.OUTPUT_MISSING_INVALIDATION_SET), 'E.34 offender missing invalidation');
assert(codes.has(V.OUTPUT_MISSING_RANKING_REF), 'E.35 offender missing ranking');
assert(codes.has(V.OUTPUT_MISSING_RESTRICTION_PROFILE), 'E.36 offender missing restriction');
assert(codes.has(V.OUTPUT_MISSING_SPREAD_PROFILE), 'E.37 offender missing spread');
assert(codes.has(V.OUTPUT_MISSING_REPLAY_HASH), 'E.38 offender missing replay');
assert(codes.has(V.OUTPUT_MISSING_LINEAGE), 'E.39 offender missing lineage');
assert(codes.has(V.OUTPUT_JUDGMENT_LEAK) || codes.has(V.OUTPUT_RECOMMENDATION_LEAK),
  'E.40 offender carries leak');

// ═══════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`L10.3 certification: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
