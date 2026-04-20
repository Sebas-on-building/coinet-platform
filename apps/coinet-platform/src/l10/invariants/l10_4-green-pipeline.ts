/**
 * L10.4 — Green-Pipeline Fixtures for Invariants/Tests
 *
 * §10.4.19 — Deterministic fixtures the L10.4 invariants and the L10.4
 * certification suite build runs against. The pipeline is minimal but
 * legal: every surface the engines need is present, and every
 * cleanliness rule is respected.
 */

import {
  L10HypothesisFamilyClass,
  L10HypothesisSubjectClass,
} from '../contracts/hypothesis-subject-class';
import type {
  L10HypothesisSubjectContract,
} from '../contracts/hypothesis-subject.contract';
import type {
  L10HypothesisCandidateContract,
} from '../contracts/hypothesis-candidate.contract';
import type {
  L10HypothesisRestrictionProfileContract,
} from '../contracts/hypothesis-restriction.contract';
import { L10MaterialityClass } from '../contracts/hypothesis-materiality';
import {
  L10RelianceBand,
  L10RestrictionRight,
} from '../contracts/hypothesis-restriction-profile';
import {
  L10HypothesisRunMode,
  type L10HypothesisRun,
} from '../runtime/hypothesis-compute-run';
import type {
  L10LowerLayerPostureSnapshot,
} from '../engine/hypothesis-confidence-engine';
import type {
  L10SupportObservation,
} from '../engine/support-evidence-resolver';
import type {
  L10ContradictionObservation,
} from '../engine/contradiction-evidence-resolver';
import type {
  L10ConfirmationObservation,
} from '../engine/confirmation-requirement-engine';
import type {
  L10InvalidationObservation,
} from '../engine/invalidation-engine';

export function buildGreenL10_4Run(): L10HypothesisRun {
  return {
    hypothesis_run_id: 'L10R-RUN-0001',
    hypothesis_engine_version: '1.0.0',
    dag_version: '1.0.0',
    template_version_set: { 'TPL-ACC': '1.0.0', 'TPL-LEV': '1.0.0' },
    engine_version_set: { 'HypothesisAssemblyEngine': '1.0.0' },
    subject_contract_version_set: { 'SUBJ-01': '1.0.0' },
    candidate_contract_version_set: {
      'CAND-ACC': '1.0.0', 'CAND-LEV': '1.0.0',
    },
    mode: L10HypothesisRunMode.LIVE,
    trace_id: 'T-0001',
    parent_run_id: null,
    repair_reason: null,
    scope_set: [{ scope_type: 'TOKEN', scope_id: 'eth' }],
    input_snapshot_ref: 'snap:0001',
    started_at: '2026-01-01T00:00:00.000Z',
    completed_at: null,
  };
}

export function buildGreenL10_4Subject(): L10HypothesisSubjectContract {
  return {
    hypothesis_subject_id: 'SUBJ-01',
    subject_class: L10HypothesisSubjectClass.TOKEN_EXPLANATION,
    subject_version: '1.0.0',
    subject_contract_version: '1.0.0',
    schema_version: '1.0.0',
    policy_version: '1.0.0',
    scope_type: 'TOKEN',
    scope_id: 'eth',
    scope_granularity: 'POINT',
    materiality: L10MaterialityClass.MATERIAL,
    as_of: '2026-01-01T00:00:00.000Z',
    hypothesis_window: {
      window_id: 'w1',
      window_start: '2025-12-01T00:00:00.000Z',
      window_end: '2026-01-01T00:00:00.000Z',
      as_of: '2026-01-01T00:00:00.000Z',
      granularity: 'DAY',
      freshness_budget_ms: 3600000,
    },
    comparison_window: null,
    freshness_budget_ms: 3600000,
    staleness_policy: 'STRICT',
    hypothesis_family_set: [
      L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
      L10HypothesisFamilyClass.LEVERAGE_DRIVEN_SQUEEZE,
    ],
    required_validation_inputs: [
      { ref: 'v1', family: 'L7_VALIDATION', required: true,
        staleness_critical: true, evidence_only: false, context_only: false },
    ],
    required_regime_inputs: [
      { ref: 'r1', family: 'L8_REGIME', required: true,
        staleness_critical: true, evidence_only: false, context_only: false },
    ],
    required_sequence_inputs: [
      { ref: 's1', family: 'L9_SEQUENCE', required: true,
        staleness_critical: true, evidence_only: false, context_only: false },
    ],
    required_feature_inputs: [
      { ref: 'f1', family: 'L6_FEATURE', required: true,
        staleness_critical: false, evidence_only: false, context_only: false },
    ],
    required_event_inputs: [
      { ref: 'e1', family: 'L6_EVENT', required: true,
        staleness_critical: false, evidence_only: false, context_only: false },
    ],
    required_context_inputs: [],
    optional_context_inputs: [],
    historical_inputs: [],
    evidence_only_inputs: [],
    candidate_generation: {
      rules: [{ rule_id: 'rl1', rule_version: '1.0.0' }],
      required_family_templates: ['TPL-ACC', 'TPL-LEV'],
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
    input_snapshot_ref: 'snap:0001',
    lineage_policy: {
      requires_trace_id: true,
      requires_manifest_id: true,
      requires_upstream_refs: false,
    },
    lineage_refs: {
      trace_id: 'T-0001',
      manifest_id: 'M-0001',
      upstream_refs: [],
    },
    created_by: 'l10-fixture',
    created_at: '2026-01-01T00:00:00.000Z',
    description: 'Structured explanation subject for ETH token.',
  };
}

export function buildGreenL10_4Candidates(): readonly L10HypothesisCandidateContract[] {
  return [
    {
      hypothesis_candidate_id: 'CAND-ACC',
      hypothesis_subject_id: 'SUBJ-01',
      hypothesis_family: L10HypothesisFamilyClass.GENUINE_EARLY_ACCUMULATION,
      hypothesis_template_id: 'TPL-ACC',
      template_version: '1.0.0',
      hypothesis_name: 'accumulation-shape',
      candidate_class: 'ALTERNATIVE_CANDIDATE',
      candidate_contract_version: '1.0.0',
      schema_version: '1.0.0',
      policy_version: '1.0.0',
      required_support_patterns: [
        { pattern_id: 's-acc-1', pattern_version: '1.0.0',
          pattern_domain: 'structural' },
      ],
      required_challenge_patterns: [
        { pattern_id: 'ch-acc-1', pattern_version: '1.0.0',
          pattern_domain: 'structural' },
      ],
      required_confirmation_patterns: [
        { pattern_id: 'cn-acc-1', pattern_version: '1.0.0',
          pattern_domain: 'structural' },
      ],
      invalidation_patterns: [
        { pattern_id: 'inv-acc-1', pattern_version: '1.0.0',
          pattern_domain: 'structural' },
      ],
      regime_conditioning_requirements: ['stable-regime'],
      sequence_conditioning_requirements: ['intact-chain'],
      required_restriction_consumption: [],
      required_regime_consumption: ['r1'],
      required_sequence_consumption: ['s1'],
      support_threshold_profile: {
        min_support_strength: 0.6, min_coverage: 0.6,
        max_contradiction_pressure: 0.3,
        max_invalidation_risk: 0.3,
        max_confirmation_gap: 0.3,
      },
      challenge_tolerance_profile: {
        max_blocking_contradictions: 0,
        max_narrowing_contradictions: 2,
        max_cumulative_pressure: 0.3,
      },
      confidence_derivation_spec: {
        policy_id: 'pl-conf', policy_version: '1.0.0',
        required_factors: ['support_strength', 'confirmation_gap'],
        factor_weights: { support_strength: 0.5, confirmation_gap: 0.2 },
        caps: [], consumes_l7_confidence: true,
        consumes_l8_regime: true, consumes_l9_sequence: true,
      },
      restriction_defaults: {
        default_reliance_band: 'FULL',
        required_narrowing_reasons: [],
        forbid_decisive_when_competition_live: true,
      },
      competition_group: 'SUBJ-01:2026-01-01T00:00:00.000Z',
      candidate_priority_seed: 1,
      lineage_refs: {
        trace_id: 'T-0001', manifest_id: 'M-0001', upstream_refs: [],
      },
      description: 'accumulation alternative candidate',
    },
    {
      hypothesis_candidate_id: 'CAND-LEV',
      hypothesis_subject_id: 'SUBJ-01',
      hypothesis_family: L10HypothesisFamilyClass.LEVERAGE_DRIVEN_SQUEEZE,
      hypothesis_template_id: 'TPL-LEV',
      template_version: '1.0.0',
      hypothesis_name: 'leverage-shape',
      candidate_class: 'ALTERNATIVE_CANDIDATE',
      candidate_contract_version: '1.0.0',
      schema_version: '1.0.0',
      policy_version: '1.0.0',
      required_support_patterns: [
        { pattern_id: 's-lev-1', pattern_version: '1.0.0',
          pattern_domain: 'leverage' },
      ],
      required_challenge_patterns: [
        { pattern_id: 'ch-lev-1', pattern_version: '1.0.0',
          pattern_domain: 'leverage' },
      ],
      required_confirmation_patterns: [
        { pattern_id: 'cn-lev-1', pattern_version: '1.0.0',
          pattern_domain: 'leverage' },
      ],
      invalidation_patterns: [
        { pattern_id: 'inv-lev-1', pattern_version: '1.0.0',
          pattern_domain: 'leverage' },
      ],
      regime_conditioning_requirements: ['stable-regime'],
      sequence_conditioning_requirements: ['intact-chain'],
      required_restriction_consumption: [],
      required_regime_consumption: ['r1'],
      required_sequence_consumption: ['s1'],
      support_threshold_profile: {
        min_support_strength: 0.6, min_coverage: 0.6,
        max_contradiction_pressure: 0.3,
        max_invalidation_risk: 0.3,
        max_confirmation_gap: 0.3,
      },
      challenge_tolerance_profile: {
        max_blocking_contradictions: 0,
        max_narrowing_contradictions: 2,
        max_cumulative_pressure: 0.3,
      },
      confidence_derivation_spec: {
        policy_id: 'pl-conf', policy_version: '1.0.0',
        required_factors: ['support_strength', 'confirmation_gap'],
        factor_weights: { support_strength: 0.5, confirmation_gap: 0.2 },
        caps: [], consumes_l7_confidence: true,
        consumes_l8_regime: true, consumes_l9_sequence: true,
      },
      restriction_defaults: {
        default_reliance_band: 'NORMAL',
        required_narrowing_reasons: [],
        forbid_decisive_when_competition_live: true,
      },
      competition_group: 'SUBJ-01:2026-01-01T00:00:00.000Z',
      candidate_priority_seed: 2,
      lineage_refs: {
        trace_id: 'T-0001', manifest_id: 'M-0001', upstream_refs: [],
      },
      description: 'leverage alternative candidate',
    },
  ];
}

export function buildGreenL10_4Restrictions():
  ReadonlyMap<string, L10HypothesisRestrictionProfileContract> {
  const rp = (cid: string): L10HypothesisRestrictionProfileContract => ({
    hypothesis_restriction_profile_id: `lhrp:${cid}`,
    hypothesis_subject_id: 'SUBJ-01',
    hypothesis_assessment_ref: `lhoa:${cid}:L10R-RUN-0001`,
    restriction_contract_version: '1.0.0',
    schema_version: '1.0.0',
    policy_version: '1.0.0',
    as_of: '2026-01-01T00:00:00.000Z',
    reliance_band: L10RelianceBand.STANDARD,
    allowed_downstream_uses: [L10RestrictionRight.MAY_USE_FOR_EXPLANATORY_CONTEXT],
    blocked_uses: [],
    required_disclosures: [],
    narrowing_reasons: [],
    competition_live_flag: true,
    narrow_spread_flag: false,
    replay_hash: 'rh:0',
    lineage_refs: {
      trace_id: 'T-0001', manifest_id: 'M-0001', upstream_refs: [],
    },
    description: '',
  });
  return new Map([['CAND-ACC', rp('CAND-ACC')], ['CAND-LEV', rp('CAND-LEV')]]);
}

export function buildGreenL10_4Surfaces(): {
  readonly availability: readonly {
    readonly ref: string; readonly available: boolean; readonly family: string;
  }[];
  readonly support: ReadonlyMap<string, readonly L10SupportObservation[]>;
  readonly contradiction: ReadonlyMap<string, readonly L10ContradictionObservation[]>;
  readonly confirmation: ReadonlyMap<string, readonly L10ConfirmationObservation[]>;
  readonly invalidation: ReadonlyMap<string, readonly L10InvalidationObservation[]>;
  readonly lower_layer: L10LowerLayerPostureSnapshot;
} {
  return {
    availability: [
      { ref: 'v1', available: true, family: 'L7_VALIDATION' },
      { ref: 'r1', available: true, family: 'L8_REGIME' },
      { ref: 's1', available: true, family: 'L9_SEQUENCE' },
      { ref: 'f1', available: true, family: 'L6_FEATURE' },
      { ref: 'e1', available: true, family: 'L6_EVENT' },
    ],
    support: new Map([
      ['CAND-ACC', [
        { ref: 'sup-acc-1', domain: 'structural',
          is_stale: false, is_degraded: false },
        { ref: 'sup-acc-2', domain: 'structural',
          is_stale: false, is_degraded: false },
        { ref: 'sup-acc-d1', domain: 'structural',
          is_stale: false, is_degraded: true },
      ]],
      ['CAND-LEV', [
        { ref: 'sup-lev-1', domain: 'leverage',
          is_stale: false, is_degraded: false },
        { ref: 'sup-lev-d1', domain: 'leverage',
          is_stale: false, is_degraded: true },
      ]],
    ]),
    contradiction: new Map([
      ['CAND-ACC', [
        { ref: 'con-acc-1', domain: 'structural',
          severity: 'NARROWING', temporal_class: 'ACTIVE', direct: true },
      ]],
      ['CAND-LEV', [
        { ref: 'con-lev-1', domain: 'leverage',
          severity: 'NARROWING', temporal_class: 'ACTIVE', direct: true },
        { ref: 'con-lev-2', domain: 'leverage',
          severity: 'NARROWING', temporal_class: 'ACTIVE', direct: false },
      ]],
    ]),
    confirmation: new Map([
      ['CAND-ACC', [
        { required_pattern_id: 'cn-acc-1', present_ref: 'cn-acc-1-ref' },
      ]],
      ['CAND-LEV', [
        { required_pattern_id: 'cn-lev-1', present_ref: null },
      ]],
    ]),
    invalidation: new Map([
      ['CAND-ACC', [
        { ref: 'inv-acc-1', class: 'POTENTIAL' },
      ]],
      ['CAND-LEV', [
        { ref: 'inv-lev-1', class: 'POTENTIAL' },
      ]],
    ]),
    lower_layer: {
      l7_confidence_score: 0.9,
      l7_restriction_band: 'FULL',
      l8_regime_stable: true,
      l9_sequence_intact: true,
    },
  };
}
