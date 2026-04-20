/**
 * L10.3 — Universal-Contracts Invariants
 *
 * §10.3.12 — INV-10.3-A through INV-10.3-G, all executable and covered
 * by the certification suite. Each invariant exercises at least one
 * contract validator so the constitutional guarantees are backed by
 * running code, not prose.
 *
 *   INV-10.3-A : Every L10.3 surface (subject/candidate/output/ranking/
 *                spread/shift/restriction) is a first-class, versioned
 *                contract with a required-field manifest.
 *   INV-10.3-B : Subject contract rejects pre-selected primary,
 *                missing required input families, and unregistered
 *                subject classes / families.
 *   INV-10.3-C : Candidate contract requires support/challenge/
 *                confirmation/invalidation pattern posture, regime/
 *                sequence conditioning for conditioned families, and
 *                restriction defaults that forbid decisive-while-live.
 *   INV-10.3-D : Output contract rejects missing evidence objects,
 *                missing ranking / spread / restriction refs, missing
 *                lineage and replay hash, and description leakage.
 *   INV-10.3-E : Output requires explicit lower-layer posture
 *                consumption refs; missing the refs block is illegal.
 *   INV-10.3-F : Cleanliness / readiness law — CLEAN_EMISSION claimed
 *                while any material posture is bad is demoted to
 *                BLOCKED_EMISSION by the readiness validator.
 *   INV-10.3-G : Contract-compatibility classifier recognises
 *                PROHIBITED, BREAKING_SEMANTIC, MIGRATION_REQUIRED,
 *                BACKWARD_COMPATIBLE, and ADDITIVE_SAFE deltas
 *                correctly; breaking changes are rejected unless
 *                explicitly approved.
 */

import {
  L10HypothesisSubjectClass,
  L10HypothesisFamilyClass,
} from '../contracts/hypothesis-subject-class';
import { L10MaterialityClass } from '../contracts/hypothesis-materiality';
import type { L10HypothesisSubjectContract } from '../contracts/hypothesis-subject.contract';
import { L10_SUBJECT_CONTRACT_REQUIRED_FIELDS } from '../contracts/hypothesis-subject.contract';
import type { L10HypothesisCandidateContract } from '../contracts/hypothesis-candidate.contract';
import { L10_CANDIDATE_CONTRACT_REQUIRED_FIELDS } from '../contracts/hypothesis-candidate.contract';
import type { L10HypothesisOutputContract } from '../contracts/hypothesis-output.contract';
import { L10_OUTPUT_CONTRACT_REQUIRED_FIELDS } from '../contracts/hypothesis-output.contract';
import { L10_RANKING_CONTRACT_REQUIRED_FIELDS } from '../contracts/hypothesis-ranking.contract';
import { L10_SPREAD_CONTRACT_REQUIRED_FIELDS } from '../contracts/hypothesis-spread.contract';
import { L10_SHIFT_CONDITION_CONTRACT_REQUIRED_FIELDS } from '../contracts/hypothesis-shift-condition.contract';
import { L10_RESTRICTION_CONTRACT_REQUIRED_FIELDS } from '../contracts/hypothesis-restriction.contract';
import {
  L10ContractCompatibilityClass,
  L10ContractSurface,
  classifyL10ContractDelta,
  ALL_L10_CONTRACT_SURFACES,
} from '../contracts/hypothesis-contract-versioning';
import {
  L10HypothesisEmissionReadinessClass,
} from '../contracts/hypothesis-materialization-policy';
import {
  L10HypothesisConfidenceBand,
  L10HypothesisReadinessClass,
} from '../contracts/hypothesis-assessment';
import type { L10HypothesisOutputCausalRestraintFlags } from '../contracts/hypothesis-output.contract';
import { L10RankingStabilityClass } from '../contracts/hypothesis-ranking';
import { validateL10SubjectContract } from '../validation/l10-subject-contract.validator';
import { validateL10CandidateContract } from '../validation/l10-candidate-contract.validator';
import { validateL10OutputContract } from '../validation/l10-output-contract.validator';
import { validateL10RankingContract } from '../validation/l10-ranking-contract.validator';
import { validateL10OutputReadiness } from '../validation/l10-output-readiness.validator';
import { validateL10ContractCompatibility } from '../validation/l10-contract-compatibility.validator';
import {
  L10HypothesisContractViolationCode as V,
} from '../validation/l10-contract-violation-codes';

export interface L10_3InvariantResult {
  readonly id: string;
  readonly name: string;
  readonly holds: boolean;
  readonly evidence: string;
}

/* ─────────── Fixtures (shared across invariants) ─────────── */

const CLEAN_CAUSAL_RESTRAINT: L10HypothesisOutputCausalRestraintFlags = {
  hypothesis_is_explanation_candidate: true,
  not_final_judgment_disclaimer: 'hypothesis is an explanation candidate',
  scenario_excluded: true,
  recommendation_excluded: true,
  judgment_excluded: true,
  score_is_not_probability_of_truth: true,
  adjacency_is_not_causality_disclaimer: 'adjacency is temporal, not causal',
};

function buildValidOutput(): L10HypothesisOutputContract {
  return {
    hypothesis_assessment_id: 'hassess_ok',
    hypothesis_subject_id: 'hsub_ok',
    hypothesis_candidate_id: 'hcand_ok',
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
    scope_id: 'tok_a',
    as_of: '2026-01-01T00:00:00Z',
    support_set_ref: 'hsup_ok',
    contradiction_set_ref: 'hcon_ok',
    confirmation_set_ref: 'hconf_ok',
    invalidation_set_ref: 'hinv_ok',
    supporting_evidence_refs: ['evref_a'],
    contradicting_evidence_refs: [],
    required_confirmation_refs: ['confref_a'],
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
    causal_restraint_flags: CLEAN_CAUSAL_RESTRAINT,
    materialization_mode: 'LIVE',
    materialization_policy: 'EAGER',
    replay_mode_flag: 'LIVE',
    repair_mode_flag: false,
    late_data_class: 'NONE',
    compute_run_id: 'run_ok',
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
      trace_id: 'trace_ok',
      manifest_id: 'manifest_ok',
      upstream_refs: ['up_a'],
    },
    description: 'hypothesis of constructive accumulation structure',
  };
}

/* ─────────── INV-10.3-A ─────────── */

/**
 * INV-10.3-A — Every L10.3 surface is first-class and versioned, with
 * its own required-field list.
 */
export function checkINV_103_A(): L10_3InvariantResult {
  const surfaceLists: Record<L10ContractSurface, readonly string[]> = {
    [L10ContractSurface.SUBJECT]: L10_SUBJECT_CONTRACT_REQUIRED_FIELDS,
    [L10ContractSurface.CANDIDATE]: L10_CANDIDATE_CONTRACT_REQUIRED_FIELDS,
    [L10ContractSurface.OUTPUT]: L10_OUTPUT_CONTRACT_REQUIRED_FIELDS,
    [L10ContractSurface.RANKING]: L10_RANKING_CONTRACT_REQUIRED_FIELDS,
    [L10ContractSurface.SPREAD]: L10_SPREAD_CONTRACT_REQUIRED_FIELDS,
    [L10ContractSurface.SHIFT_CONDITION]: L10_SHIFT_CONDITION_CONTRACT_REQUIRED_FIELDS,
    [L10ContractSurface.RESTRICTION]: L10_RESTRICTION_CONTRACT_REQUIRED_FIELDS,
  };
  const allSurfacesPresent = ALL_L10_CONTRACT_SURFACES.every(s =>
    Array.isArray(surfaceLists[s]) && surfaceLists[s].length > 0);
  const holds = allSurfacesPresent;
  return {
    id: 'INV-10.3-A',
    name: 'Every L10.3 surface is a first-class versioned contract with required-field manifest',
    holds,
    evidence: `surfaces=${ALL_L10_CONTRACT_SURFACES.length} allSurfacesPresent=${allSurfacesPresent}`,
  };
}

/* ─────────── INV-10.3-B ─────────── */

/**
 * INV-10.3-B — Subject contract rejects pre-selected primary,
 * missing required inputs, and unregistered classes.
 */
export function checkINV_103_B(): L10_3InvariantResult {
  const broken: L10HypothesisSubjectContract = {
    hypothesis_subject_id: '',
    subject_class: null as unknown as L10HypothesisSubjectClass,
    subject_version: '',
    subject_contract_version: '',
    schema_version: '',
    policy_version: '',
    scope_type: null as unknown as never,
    scope_id: '',
    scope_granularity: 'POINT',
    materiality: null as unknown as L10MaterialityClass,
    as_of: '',
    hypothesis_window: null as unknown as never,
    comparison_window: null,
    freshness_budget_ms: 0,
    staleness_policy: null as unknown as never,
    hypothesis_family_set: [],
    required_validation_inputs: [],
    required_regime_inputs: [],
    required_sequence_inputs: [],
    required_feature_inputs: [],
    required_event_inputs: [],
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],
    candidate_generation: {
      rules: [],
      required_family_templates: ['only_one'],
      forbidden_family_templates: [],
      min_candidate_count: 1,
      forbid_single_story_collapse: true,
      forbid_preselected_primary: false as unknown as true,
    },
    competition_policy: null as unknown as never,
    cleanliness_policy: null as unknown as never,
    materialization_policy: null as unknown as never,
    evidence_pack_policy: null as unknown as never,
    restriction_consumption_policy: null as unknown as never,
    regime_consumption_policy: null as unknown as never,
    sequence_consumption_policy: null as unknown as never,
    validation_consumption_policy: null as unknown as never,
    causal_restraint_policy: null as unknown as never,
    input_snapshot_ref: '',
    lineage_policy: null as unknown as never,
    lineage_refs: null as unknown as never,
    created_by: '',
    created_at: '',
    description: 'final judgment of the market',
  };
  const report = validateL10SubjectContract(broken);
  const codes = new Set(report.issues.map(i => i.code));

  const required = [
    V.SUBJECT_MISSING_IDENTITY,
    V.SUBJECT_MISSING_CLASS,
    V.SUBJECT_MISSING_FAMILY_SET,
    V.SUBJECT_MISSING_VALIDATION_INPUTS,
    V.SUBJECT_CANDIDATE_GEN_PRESELECTED,
    V.SUBJECT_MISSING_INPUT_SNAPSHOT,
    V.SUBJECT_MISSING_LINEAGE_REFS,
    V.SUBJECT_JUDGMENT_LEAK,
  ];
  const holds = !report.valid && required.every(c => codes.has(c));
  return {
    id: 'INV-10.3-B',
    name: 'Subject contract rejects pre-selected primary, missing inputs, unregistered class, and description leaks',
    holds,
    evidence: `issueCount=${report.issues.length} hasAllRequired=${holds}`,
  };
}

/* ─────────── INV-10.3-C ─────────── */

/**
 * INV-10.3-C — Candidate contract requires support/challenge/
 * confirmation/invalidation pattern posture, regime/sequence
 * conditioning for conditioned families, and restriction defaults.
 */
export function checkINV_103_C(): L10_3InvariantResult {
  const broken: L10HypothesisCandidateContract = {
    hypothesis_candidate_id: '',
    hypothesis_subject_id: '',
    hypothesis_family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
    hypothesis_template_id: '',
    template_version: '',
    hypothesis_name: 'buy recommendation for token',
    candidate_class: 'PRIMARY_CANDIDATE',
    candidate_contract_version: '',
    schema_version: '',
    policy_version: '',
    required_support_patterns: undefined as unknown as never,
    required_challenge_patterns: undefined as unknown as never,
    required_confirmation_patterns: undefined as unknown as never,
    invalidation_patterns: undefined as unknown as never,
    regime_conditioning_requirements: [],
    sequence_conditioning_requirements: [],
    required_restriction_consumption: [],
    required_regime_consumption: [],
    required_sequence_consumption: [],
    support_threshold_profile: null as unknown as never,
    challenge_tolerance_profile: null as unknown as never,
    confidence_derivation_spec: null as unknown as never,
    restriction_defaults: {
      default_reliance_band: 'NARROW',
      required_narrowing_reasons: [],
      forbid_decisive_when_competition_live: false as unknown as true,
    },
    competition_group: '',
    candidate_priority_seed: 0,
    lineage_refs: null as unknown as never,
    description: '',
  };
  const report = validateL10CandidateContract(broken);
  const codes = new Set(report.issues.map(i => i.code));

  const required = [
    V.CANDIDATE_MISSING_IDENTITY,
    V.CANDIDATE_MISSING_TEMPLATE,
    V.CANDIDATE_MISSING_SUPPORT_PATTERNS,
    V.CANDIDATE_MISSING_CHALLENGE_PATTERNS,
    V.CANDIDATE_MISSING_CONFIRMATION_PATTERNS,
    V.CANDIDATE_MISSING_INVALIDATION_PATTERNS,
    V.CANDIDATE_MISSING_REGIME_CONDITIONING,
    V.CANDIDATE_MISSING_SEQUENCE_CONDITIONING,
    V.CANDIDATE_MISSING_RESTRICTION_DEFAULTS,
    V.CANDIDATE_MISSING_COMPETITION_GROUP,
    V.CANDIDATE_MISSING_LINEAGE,
    V.CANDIDATE_NAME_LEAKS_SEMANTICS,
  ];
  const holds = !report.valid && required.every(c => codes.has(c));
  return {
    id: 'INV-10.3-C',
    name: 'Candidate contract requires pattern posture, conditioning, restriction defaults, and rejects name leaks',
    holds,
    evidence: `issueCount=${report.issues.length} hasAllRequired=${holds}`,
  };
}

/* ─────────── INV-10.3-D ─────────── */

/**
 * INV-10.3-D — Output contract rejects missing evidence objects,
 * ranking/spread/restriction refs, lineage, replay hash; and a valid
 * output passes.
 */
export function checkINV_103_D(): L10_3InvariantResult {
  const good = buildValidOutput();
  const goodReport = validateL10OutputContract(good);

  const bad = buildValidOutput() as unknown as Record<string, unknown>;
  bad.support_set_ref = '';
  bad.contradiction_set_ref = '';
  bad.confirmation_set_ref = '';
  bad.invalidation_set_ref = '';
  bad.ranking_ref = '';
  bad.restriction_profile_ref = '';
  bad.spread_profile_ref = '';
  bad.evidence_pack_ref = '';
  bad.replay_hash = '';
  (bad.lineage_refs as { trace_id: string }).trace_id = '';
  bad.description = 'recommendation: buy the token';
  bad.hypothesis_name = 'final judgment of market';

  const badReport = validateL10OutputContract(bad as unknown as L10HypothesisOutputContract);
  const codes = new Set(badReport.issues.map(i => i.code));
  const required = [
    V.OUTPUT_MISSING_SUPPORT_SET,
    V.OUTPUT_MISSING_CONTRADICTION_SET,
    V.OUTPUT_MISSING_CONFIRMATION_SET,
    V.OUTPUT_MISSING_INVALIDATION_SET,
    V.OUTPUT_MISSING_RANKING_REF,
    V.OUTPUT_MISSING_RESTRICTION_PROFILE,
    V.OUTPUT_MISSING_SPREAD_PROFILE,
    V.OUTPUT_MISSING_EVIDENCE_PACK,
    V.OUTPUT_MISSING_REPLAY_HASH,
    V.OUTPUT_MISSING_LINEAGE,
    V.OUTPUT_RECOMMENDATION_LEAK,
    V.OUTPUT_JUDGMENT_LEAK,
  ];
  const holds = goodReport.valid
    && !badReport.valid
    && required.every(c => codes.has(c));
  return {
    id: 'INV-10.3-D',
    name: 'Output contract requires evidence/ranking/spread/restriction/lineage/replay; rejects leaks',
    holds,
    evidence: `goodOk=${goodReport.valid} badIssues=${badReport.issues.length} hasAllRequired=${required.every(c => codes.has(c))}`,
  };
}

/* ─────────── INV-10.3-E ─────────── */

/**
 * INV-10.3-E — Output contract rejects missing posture-consumption
 * refs. A runtime emitting without the refs block is illegal.
 */
export function checkINV_103_E(): L10_3InvariantResult {
  const bad = buildValidOutput() as unknown as Record<string, unknown>;
  bad.lower_layer_posture_consumption_refs = undefined;
  const report = validateL10OutputContract(
    bad as unknown as L10HypothesisOutputContract);
  const has = report.issues.some(
    i => i.code === V.OUTPUT_MISSING_POSTURE_CONSUMPTION);
  const holds = !report.valid && has;
  return {
    id: 'INV-10.3-E',
    name: 'Output requires explicit lower-layer posture consumption refs',
    holds,
    evidence: `postureMissingCaught=${has} invalid=${!report.valid}`,
  };
}

/* ─────────── INV-10.3-F ─────────── */

/**
 * INV-10.3-F — Cleanliness / readiness law. CLEAN_EMISSION claimed
 * while contradiction is material is demoted to BLOCKED_EMISSION and
 * flagged.
 */
export function checkINV_103_F(): L10_3InvariantResult {
  const o = buildValidOutput() as unknown as Record<string, unknown>;
  o.contradiction_pressure_score = 0.9;
  o.contradicting_evidence_refs = ['ce_a'];
  // Claim CLEAN while material contradiction present
  const report = validateL10OutputReadiness(
    o as unknown as L10HypothesisOutputContract, {});
  const demoted = report.readiness_class
    === L10HypothesisEmissionReadinessClass.BLOCKED_EMISSION;
  const flagged = report.issues.some(
    i => i.code === V.CLEAN_WHILE_CONTRADICTION_MATERIAL);
  const holds = !report.valid && demoted && flagged;

  // Also verify valid clean output resolves to CLEAN_EMISSION
  const clean = validateL10OutputReadiness(buildValidOutput(), {});
  const cleanOk = clean.valid
    && clean.readiness_class
       === L10HypothesisEmissionReadinessClass.CLEAN_EMISSION;

  return {
    id: 'INV-10.3-F',
    name: 'Cleanliness law: CLEAN_EMISSION while material contradiction → BLOCKED; truly clean → CLEAN',
    holds: holds && cleanOk,
    evidence: `demoted=${demoted} flagged=${flagged} cleanOk=${cleanOk}`,
  };
}

/* ─────────── INV-10.3-G ─────────── */

/**
 * INV-10.3-G — Contract compatibility classifier: prohibited,
 * breaking, migration-required, backward-compatible, additive-safe
 * deltas classify correctly; unapproved breaking upgrade is rejected.
 */
export function checkINV_103_G(): L10_3InvariantResult {
  const base = {
    surface: L10ContractSurface.OUTPUT,
    from: '10.3.0',
    to: '10.4.0',
    added_fields: [],
    removed_fields: [],
    semantically_changed_fields: [],
    changed_enum_vocabularies: [],
    changed_default_policies: [],
    prohibited_change: false,
  } as const;

  const prohibited = classifyL10ContractDelta({ ...base, prohibited_change: true });
  const breaking = classifyL10ContractDelta({
    ...base, semantically_changed_fields: ['primary_hypothesis_ref'] });
  const migration = classifyL10ContractDelta({ ...base, removed_fields: ['x'] });
  const enumMigration = classifyL10ContractDelta({
    ...base, changed_enum_vocabularies: ['confidence_band'] });
  const backward = classifyL10ContractDelta({
    ...base, changed_default_policies: ['cleanliness_policy'] });
  const additive = classifyL10ContractDelta({ ...base, added_fields: ['y'] });

  const matrixOk =
    prohibited === L10ContractCompatibilityClass.PROHIBITED &&
    breaking === L10ContractCompatibilityClass.BREAKING_SEMANTIC &&
    migration === L10ContractCompatibilityClass.MIGRATION_REQUIRED &&
    enumMigration === L10ContractCompatibilityClass.MIGRATION_REQUIRED &&
    backward === L10ContractCompatibilityClass.BACKWARD_COMPATIBLE &&
    additive === L10ContractCompatibilityClass.ADDITIVE_SAFE;

  // Unapproved breaking upgrade is rejected
  const breakingReport = validateL10ContractCompatibility({
    ...base,
    semantically_changed_fields: ['primary_hypothesis_ref'],
  });
  const breakingRejected = !breakingReport.valid
    && breakingReport.issues.some(
      i => i.code === V.COMPATIBILITY_BREAKING_SEMANTIC_UNAPPROVED);

  // Non-monotonic version is rejected
  const nonMono = validateL10ContractCompatibility({
    ...base, from: '10.4.0', to: '10.3.0' });
  const nonMonoRejected = !nonMono.valid
    && nonMono.issues.some(
      i => i.code === V.COMPATIBILITY_NON_MONOTONIC_VERSION);

  const holds = matrixOk && breakingRejected && nonMonoRejected;
  return {
    id: 'INV-10.3-G',
    name: 'Contract compatibility classifier and validator handle every delta class',
    holds,
    evidence: `matrixOk=${matrixOk} breakingRejected=${breakingRejected} nonMonoRejected=${nonMonoRejected}`,
  };
}

export function checkAllL103Invariants(): readonly L10_3InvariantResult[] {
  return [
    checkINV_103_A(),
    checkINV_103_B(),
    checkINV_103_C(),
    checkINV_103_D(),
    checkINV_103_E(),
    checkINV_103_F(),
    checkINV_103_G(),
  ];
}

/* ─────────── Ranking-contract cross-check (bonus) ─────────── */

/**
 * Not numbered, but useful for certification bands: confirm that a
 * ranking with a primary not first, secondary missing when competition
 * is live, and spread out of range is rejected with the right codes.
 */
export function checkRankingContractRejection(): L10_3InvariantResult {
  const report = validateL10RankingContract({
    ranking_id: 'hrank_bad',
    hypothesis_subject_id: 'hsub_bad',
    subject_contract_ref: 'hsubc_bad',
    ranking_contract_version: '10.3.0',
    schema_version: '10.3.0',
    ranking_policy_version: 'rpv1',
    policy_version: 'l10.3-policy-v1',
    as_of: '2026-01-01T00:00:00Z',
    ordered_hypothesis_refs: ['hx', 'hy'],
    primary_hypothesis_ref: 'hy',
    secondary_hypothesis_ref: null,
    competition_size: 3,
    confidence_spread: 2,
    narrow_spread_flag: false,
    ranking_stability_class: L10RankingStabilityClass.STABLE,
    spread_profile_ref: '',
    shift_condition_set_ref: null,
    evidence_pack_ref: 'epk',
    input_snapshot_ref: 'snap',
    compute_run_id: 'run',
    replay_hash: 'h',
    lineage_refs: {
      trace_id: 'trace', manifest_id: 'manifest', upstream_refs: [],
    },
  });
  const codes = new Set(report.issues.map(i => i.code));
  const required = [
    V.RANKING_PRIMARY_NOT_FIRST,
    V.RANKING_MISSING_SECONDARY_WHEN_COMPETITION,
    V.RANKING_COMPETITION_SIZE_INCONSISTENT,
    V.RANKING_SPREAD_OUT_OF_RANGE,
    V.RANKING_MISSING_SPREAD_PROFILE,
  ];
  const holds = !report.valid && required.every(c => codes.has(c));
  return {
    id: 'INV-10.3-RANKING-CROSS',
    name: 'Ranking contract rejects primary-not-first, missing secondary, size mismatch, OOR spread, missing spread profile',
    holds,
    evidence: `issueCount=${report.issues.length} hasAllRequired=${holds}`,
  };
}
