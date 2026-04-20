/**
 * L10.2 — HypothesisCandidate Contract
 *
 * §10.2.7 — The single governed explanatory contender inside a
 * hypothesis competition. Not a string label; the unit of competition.
 */

import {
  L10HypothesisFamilyClass,
} from './hypothesis-subject-class';
import { fnv1aHexL10 } from './hypothesis-subject';

export interface L10HypothesisCandidate {
  readonly hypothesis_candidate_id: string;
  readonly hypothesis_subject_id: string;
  readonly hypothesis_family: L10HypothesisFamilyClass;
  readonly hypothesis_template_id: string;
  readonly template_version: string;
  readonly hypothesis_name: string;
  readonly candidate_class: 'PRIMARY_CANDIDATE' | 'ALTERNATIVE_CANDIDATE';

  readonly required_support_domains: readonly string[];
  readonly required_challenge_domains: readonly string[];
  readonly required_confirmation_domains: readonly string[];
  readonly invalidation_domains: readonly string[];

  readonly regime_conditioning_requirements: readonly string[];
  readonly sequence_conditioning_requirements: readonly string[];
  readonly required_restriction_consumption: readonly string[];
  readonly required_regime_consumption: readonly string[];
  readonly required_sequence_consumption: readonly string[];

  readonly candidate_priority_seed: number;
  readonly competition_group: string;
  readonly negative_evidence_tolerance: number;
  readonly evidence_threshold_profile: {
    readonly min_support_strength: number;
    readonly max_contradiction_pressure: number;
    readonly min_coverage: number;
  };

  readonly lineage_refs: readonly string[];
  readonly description: string;
}

export interface L10HypothesisCandidateIdInputs {
  readonly hypothesis_subject_id: string;
  readonly hypothesis_family: L10HypothesisFamilyClass;
  readonly hypothesis_template_id: string;
  readonly template_version: string;
  readonly candidate_priority_seed: number;
}

export function buildL10HypothesisCandidateId(
  i: L10HypothesisCandidateIdInputs,
): string {
  const key =
    `${i.hypothesis_subject_id}|${i.hypothesis_family}|${i.hypothesis_template_id}|${i.template_version}|${i.candidate_priority_seed}`;
  return `hcan_${fnv1aHexL10(key)}_${fnv1aHexL10(i.hypothesis_subject_id)}`;
}
