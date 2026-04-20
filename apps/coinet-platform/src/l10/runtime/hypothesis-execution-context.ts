/**
 * L10.4 — Hypothesis Execution Context
 *
 * §10.4.3 / §10.4.16 — The in-run state every Layer 10 engine reads
 * from and writes into. Holds:
 *   - the immutable `L10HypothesisRun` header
 *   - subject + candidate contracts currently in scope
 *   - intermediate artifacts produced by each engine
 *   - a sealed final-output bag once the run completes
 *
 * Engines never mutate state they do not own. Stage seals make it
 * possible for tests/invariants to assert the exact stage order
 * (INV-10.4-A / INV-10.4-C).
 */

import type { L10HypothesisRun } from './hypothesis-compute-run';
import type {
  L10HypothesisSubjectContract,
} from '../contracts/hypothesis-subject.contract';
import type {
  L10HypothesisCandidateContract,
} from '../contracts/hypothesis-candidate.contract';
import type {
  L10HypothesisOutputContract,
} from '../contracts/hypothesis-output.contract';
import type {
  L10HypothesisRankingContract,
} from '../contracts/hypothesis-ranking.contract';
import type {
  L10HypothesisSpreadProfileContract,
} from '../contracts/hypothesis-spread.contract';
import type {
  L10HypothesisShiftConditionContract,
} from '../contracts/hypothesis-shift-condition.contract';
import type {
  L10HypothesisRestrictionProfileContract,
} from '../contracts/hypothesis-restriction.contract';
import type {
  L10HypothesisFamilyClass,
  L10HypothesisSubjectClass,
  L10ScopeType,
} from '../contracts/hypothesis-subject-class';
import type {
  L10HypothesisConfidenceBand,
} from '../contracts/hypothesis-assessment';
import type {
  L10RankingStabilityClass,
} from '../contracts/hypothesis-ranking';
import type {
  L10SpreadClass,
} from '../contracts/hypothesis-spread-profile';

/**
 * §10.4.5.3 — Subject instance emitted by the assembly engine. Its id
 * is deterministic: `lhsi:<subject_id>:<contract_version>:<as_of>`.
 */
export interface L10HypothesisSubjectInstance {
  readonly subject_instance_id: string;
  readonly subject_contract_ref: string;
  readonly hypothesis_subject_id: string;
  readonly subject_class: L10HypothesisSubjectClass;
  readonly hypothesis_family_set: readonly L10HypothesisFamilyClass[];
  readonly scope_type: L10ScopeType;
  readonly scope_id: string;
  readonly as_of: string;
  readonly bound_validation_refs: readonly string[];
  readonly bound_regime_refs: readonly string[];
  readonly bound_sequence_refs: readonly string[];
  readonly bound_feature_refs: readonly string[];
  readonly bound_event_refs: readonly string[];
  readonly bound_context_refs: readonly string[];
  readonly bound_evidence_only_refs: readonly string[];
  readonly bound_restriction_refs: readonly string[];
  readonly admissible_family_templates: readonly string[];
  readonly admissible_families: readonly L10HypothesisFamilyClass[];
  readonly competition_space_size: number;
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
  readonly replay_identity_inputs: {
    readonly subject_contract_version: string;
    readonly schema_version: string;
    readonly policy_version: string;
    readonly as_of: string;
    readonly scope_type: string;
    readonly scope_id: string;
  };
}

/**
 * §10.4.6.3 — Candidate instance emitted by the candidate engine.
 */
export interface L10HypothesisCandidateInstance {
  readonly candidate_instance_id: string;
  readonly candidate_contract_ref: string;
  readonly hypothesis_candidate_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_family: L10HypothesisFamilyClass;
  readonly hypothesis_template_id: string;
  readonly template_version: string;
  readonly competition_group: string;
  readonly candidate_priority_seed: number;
  readonly required_support_pattern_refs: readonly string[];
  readonly required_challenge_pattern_refs: readonly string[];
  readonly required_confirmation_pattern_refs: readonly string[];
  readonly invalidation_pattern_refs: readonly string[];
  readonly regime_conditioning_requirements: readonly string[];
  readonly sequence_conditioning_requirements: readonly string[];
  readonly generation_reasons: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

/**
 * §10.4.6.3 — Record of a blocked candidate: the reason it was
 * rejected is first-class.
 */
export interface L10HypothesisBlockedCandidateRecord {
  readonly template_id: string;
  readonly family: L10HypothesisFamilyClass | null;
  readonly reason_code: string;
  readonly detail: string;
}

/**
 * §10.4.7.3 — HypothesisSupportSet (runtime view). Per-candidate.
 */
export interface L10HypothesisSupportSet {
  readonly support_set_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly supporting_refs: readonly string[];
  readonly support_domains: readonly string[];
  readonly support_strength_score: number;
  readonly support_coverage_score: number;
  readonly stale_support_refs: readonly string[];
  readonly degraded_support_refs: readonly string[];
  readonly missing_expected_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

/**
 * §10.4.8.3 — HypothesisContradictionSet (runtime view). Per-candidate.
 */
export interface L10HypothesisContradictionSet {
  readonly contradiction_set_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly contradiction_refs: readonly string[];
  readonly contradiction_domains: readonly string[];
  readonly contradiction_pressure_score: number;
  readonly blocking_contradiction_refs: readonly string[];
  readonly narrowing_contradiction_refs: readonly string[];
  readonly decayed_contradiction_refs: readonly string[];
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

/**
 * §10.4.9.3 — HypothesisConfirmationSet (runtime view). Per-candidate.
 */
export interface L10HypothesisConfirmationSet {
  readonly confirmation_set_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly required_confirmation_refs: readonly string[];
  readonly present_confirmation_refs: readonly string[];
  readonly missing_confirmation_refs: readonly string[];
  readonly confirmation_gap_score: number;
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

/**
 * §10.4.10.3 — HypothesisInvalidationSet (runtime view). Per-candidate.
 */
export interface L10HypothesisInvalidationSet {
  readonly invalidation_set_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly invalidation_signal_refs: readonly string[];
  readonly active_invalidation_refs: readonly string[];
  readonly potential_invalidation_refs: readonly string[];
  readonly invalidation_risk_score: number;
  readonly invalidation_risk_class:
    | 'LOW' | 'MEDIUM' | 'HIGH' | 'UNRESOLVED';
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

/**
 * §10.4.11.3 — Candidate-level confidence output.
 */
export interface L10HypothesisCandidateConfidence {
  readonly confidence_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_candidate_id: string;
  readonly hypothesis_confidence_score: number;
  readonly hypothesis_confidence_band: L10HypothesisConfidenceBand;
  readonly factor_breakdown: Readonly<Record<string, number>>;
  readonly cap_chain: readonly string[];
  readonly readiness_hint:
    | 'READY'
    | 'CAPPED'
    | 'DEGRADED'
    | 'BLOCKED'
    | 'MODIFIER_REQUIRED';
  readonly lineage_refs: {
    readonly trace_id: string;
    readonly manifest_id: string;
    readonly upstream_refs: readonly string[];
  };
}

/**
 * §10.4.12.4 — Runtime view of the ranking result. Equivalent to the
 * L10.3 `L10HypothesisRankingContract` but held as the in-memory
 * runtime artifact prior to contract emission.
 */
export interface L10HypothesisRankingOutput {
  readonly ranking_id: string;
  readonly hypothesis_subject_id: string;
  readonly ordered_hypothesis_refs: readonly string[];
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  readonly competition_size: number;
  readonly confidence_spread: number;
  readonly narrow_spread_flag: boolean;
  readonly ranking_stability_class: L10RankingStabilityClass;
}

/**
 * §10.4.13.3 — Runtime spread output.
 */
export interface L10HypothesisSpreadOutput {
  readonly spread_profile_id: string;
  readonly hypothesis_subject_id: string;
  readonly ranking_ref: string;
  readonly primary_hypothesis_ref: string;
  readonly secondary_hypothesis_ref: string | null;
  readonly confidence_spread: number;
  readonly spread_class: L10SpreadClass;
  readonly ranking_stability_class: L10RankingStabilityClass;
  readonly narrow_spread_flag: boolean;
  readonly competition_size: number;
}

/**
 * §10.4.14.3 — Runtime shift-condition output.
 */
export interface L10HypothesisShiftConditionOutput {
  readonly shift_condition_set_id: string;
  readonly hypothesis_subject_id: string;
  readonly ranking_ref: string;
  readonly current_primary_ref: string;
  readonly current_secondary_ref: string | null;
  readonly promotion_conditions_for_secondary: readonly string[];
  readonly reinforcement_conditions_for_primary: readonly string[];
  readonly collapse_conditions_for_primary: readonly string[];
  readonly spread_narrowing_conditions: readonly string[];
}

/**
 * §10.4.15.1 — Evidence pack produced by the evidence builder.
 * Contains the complete lineage the L5 materializer and the replay
 * adapter verify against.
 */
export interface L10HypothesisEvidencePack {
  readonly evidence_pack_id: string;
  readonly hypothesis_subject_id: string;
  readonly subject_instance_ref: string;
  readonly candidate_refs: readonly string[];
  readonly support_set_refs: readonly string[];
  readonly contradiction_set_refs: readonly string[];
  readonly confirmation_set_refs: readonly string[];
  readonly invalidation_set_refs: readonly string[];
  readonly ranking_ref: string;
  readonly spread_profile_ref: string;
  readonly shift_condition_set_ref: string | null;
  readonly restriction_profile_refs: readonly string[];
  readonly lower_layer_consumed_refs: {
    readonly validation_refs: readonly string[];
    readonly contradiction_refs: readonly string[];
    readonly confidence_refs: readonly string[];
    readonly restriction_refs: readonly string[];
    readonly regime_refs: readonly string[];
    readonly sequence_refs: readonly string[];
  };
  readonly input_snapshot_ref: string;
  readonly compute_run_lineage: readonly string[];
  readonly replay_hash: string;
}

/**
 * §10.4.3 — Layer 10 runtime execution context. Every engine lives
 * off this context; engines never share globals.
 */
export interface L10HypothesisExecutionContext {
  readonly run: L10HypothesisRun;
  readonly subjects: Map<string, L10HypothesisSubjectContract>;
  readonly subject_instances: Map<string, L10HypothesisSubjectInstance>;
  readonly candidate_contracts: Map<string, L10HypothesisCandidateContract>;
  readonly candidate_instances: Map<string, L10HypothesisCandidateInstance>;
  readonly blocked_candidates: Map<string, readonly L10HypothesisBlockedCandidateRecord[]>;
  readonly support_sets: Map<string, L10HypothesisSupportSet>;
  readonly contradiction_sets: Map<string, L10HypothesisContradictionSet>;
  readonly confirmation_sets: Map<string, L10HypothesisConfirmationSet>;
  readonly invalidation_sets: Map<string, L10HypothesisInvalidationSet>;
  readonly candidate_confidences: Map<string, L10HypothesisCandidateConfidence>;
  readonly rankings: Map<string, L10HypothesisRankingOutput>;
  readonly spread_profiles: Map<string, L10HypothesisSpreadOutput>;
  readonly shift_condition_sets: Map<string, L10HypothesisShiftConditionOutput>;
  readonly restriction_profiles: Map<string, L10HypothesisRestrictionProfileContract>;
  readonly evidence_packs: Map<string, L10HypothesisEvidencePack>;
  readonly ranking_contracts: Map<string, L10HypothesisRankingContract>;
  readonly spread_contracts: Map<string, L10HypothesisSpreadProfileContract>;
  readonly shift_contracts: Map<string, L10HypothesisShiftConditionContract>;
  readonly outputs: Map<string, L10HypothesisOutputContract>;
  readonly stage_seal: Set<string>;
}

export function createL10ExecutionContext(
  run: L10HypothesisRun,
): L10HypothesisExecutionContext {
  return {
    run,
    subjects: new Map(),
    subject_instances: new Map(),
    candidate_contracts: new Map(),
    candidate_instances: new Map(),
    blocked_candidates: new Map(),
    support_sets: new Map(),
    contradiction_sets: new Map(),
    confirmation_sets: new Map(),
    invalidation_sets: new Map(),
    candidate_confidences: new Map(),
    rankings: new Map(),
    spread_profiles: new Map(),
    shift_condition_sets: new Map(),
    restriction_profiles: new Map(),
    evidence_packs: new Map(),
    ranking_contracts: new Map(),
    spread_contracts: new Map(),
    shift_contracts: new Map(),
    outputs: new Map(),
    stage_seal: new Set(),
  };
}

export function sealL10Stage(
  ctx: L10HypothesisExecutionContext,
  stage: string,
): void {
  ctx.stage_seal.add(stage);
}

export function isL10StageSealed(
  ctx: L10HypothesisExecutionContext,
  stage: string,
): boolean {
  return ctx.stage_seal.has(stage);
}
