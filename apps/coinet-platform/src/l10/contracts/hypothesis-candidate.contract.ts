/**
 * L10.3 — Hypothesis Candidate Contract
 *
 * §10.3.3 — The executable, versioned, independently-evaluable
 * explanation contender. The L10.2 `L10HypothesisCandidate` is legal
 * for in-memory prototyping; the L10.3 contract is the shape every
 * candidate-producing engine must honour when emitting candidates into
 * a governed competition.
 *
 * §10.3.3.5 — Candidates may share lower-layer evidence refs but must
 * remain independently evaluable; contract validators enforce that
 * support/challenge/confirmation/invalidation pattern surfaces exist.
 */

import type { L10HypothesisFamilyClass } from './hypothesis-subject-class';

/**
 * §10.3.3.2 — Pattern refs. The subject declares *domains*; the
 * candidate must declare the explicit pattern refs for each of
 * support / challenge / confirmation / invalidation. This is what
 * makes candidates comparable across templates.
 */
export interface L10CandidatePatternRef {
  readonly pattern_id: string;
  readonly pattern_version: string;
  readonly pattern_domain: string;
}

export interface L10CandidateSupportThresholdProfile {
  readonly min_support_strength: number;
  readonly min_coverage: number;
  readonly max_contradiction_pressure: number;
  readonly max_invalidation_risk: number;
  readonly max_confirmation_gap: number;
}

export interface L10CandidateChallengeToleranceProfile {
  readonly max_blocking_contradictions: number;
  readonly max_narrowing_contradictions: number;
  readonly max_cumulative_pressure: number;
}

export interface L10CandidateConfidenceDerivationSpec {
  readonly policy_id: string;
  readonly policy_version: string;
  readonly required_factors: readonly string[];
  readonly factor_weights: Readonly<Record<string, number>>;
  readonly caps: readonly string[];
  readonly consumes_l7_confidence: boolean;
  readonly consumes_l8_regime: boolean;
  readonly consumes_l9_sequence: boolean;
}

export interface L10CandidateRestrictionDefaults {
  readonly default_reliance_band: string;
  readonly required_narrowing_reasons: readonly string[];
  readonly forbid_decisive_when_competition_live: true;
}

export interface L10CandidateLineageRefs {
  readonly trace_id: string;
  readonly manifest_id: string;
  readonly upstream_refs: readonly string[];
}

/**
 * §10.3.3.1 — The full executable hypothesis candidate contract. A
 * candidate declares how it will be judged, which is what makes the
 * competition fair.
 */
export interface L10HypothesisCandidateContract {
  // Identity (§10.3.3.2)
  readonly hypothesis_candidate_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_family: L10HypothesisFamilyClass;
  readonly hypothesis_template_id: string;
  readonly template_version: string;
  readonly hypothesis_name: string;
  readonly candidate_class: 'PRIMARY_CANDIDATE' | 'ALTERNATIVE_CANDIDATE';

  // Contract versioning (§10.3.8.1)
  readonly candidate_contract_version: string;
  readonly schema_version: string;
  readonly policy_version: string;

  // Pattern posture (§10.3.3.2)
  readonly required_support_patterns: readonly L10CandidatePatternRef[];
  readonly required_challenge_patterns: readonly L10CandidatePatternRef[];
  readonly required_confirmation_patterns: readonly L10CandidatePatternRef[];
  readonly invalidation_patterns: readonly L10CandidatePatternRef[];

  // Conditioning (§10.3.3.2)
  readonly regime_conditioning_requirements: readonly string[];
  readonly sequence_conditioning_requirements: readonly string[];
  readonly required_restriction_consumption: readonly string[];
  readonly required_regime_consumption: readonly string[];
  readonly required_sequence_consumption: readonly string[];

  // Evaluation + confidence (§10.3.3.3)
  readonly support_threshold_profile: L10CandidateSupportThresholdProfile;
  readonly challenge_tolerance_profile: L10CandidateChallengeToleranceProfile;
  readonly confidence_derivation_spec: L10CandidateConfidenceDerivationSpec;
  readonly restriction_defaults: L10CandidateRestrictionDefaults;

  // Competition (§10.3.3.5)
  readonly competition_group: string;
  readonly candidate_priority_seed: number;

  // Lineage (§10.3.3.3)
  readonly lineage_refs: L10CandidateLineageRefs;
  readonly description: string;
}

export const L10_CANDIDATE_CONTRACT_REQUIRED_FIELDS: readonly string[] = [
  'hypothesis_candidate_id', 'hypothesis_subject_id',
  'hypothesis_family', 'hypothesis_template_id', 'template_version',
  'hypothesis_name', 'candidate_class',
  'candidate_contract_version', 'schema_version', 'policy_version',
  'required_support_patterns', 'required_challenge_patterns',
  'required_confirmation_patterns', 'invalidation_patterns',
  'regime_conditioning_requirements', 'sequence_conditioning_requirements',
  'required_restriction_consumption', 'required_regime_consumption',
  'required_sequence_consumption',
  'support_threshold_profile', 'challenge_tolerance_profile',
  'confidence_derivation_spec', 'restriction_defaults',
  'competition_group', 'candidate_priority_seed',
  'lineage_refs',
];
