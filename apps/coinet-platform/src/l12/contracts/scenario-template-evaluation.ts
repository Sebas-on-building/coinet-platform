/**
 * L12.5 — Scenario template evaluation contract (§12.5.17).
 *
 * The evaluation contract holds the result of running a candidate scenario
 * subject + resolved inputs against the production template registry. It
 * carries which templates matched, which were narrowed, which were blocked,
 * the per-template match results, and the resulting readiness class.
 */

import { L12PathConfidenceCapReason } from './path-confidence-cap-chain';
import { L12ScenarioFamily } from './scenario-family';
import { L12ScenarioTemplateId } from './scenario-template';
import { L12TemplatePatternVerdict } from './scenario-template-patterns';
import { L12ScenarioTemplateReadinessClass } from './scenario-template-readiness';
import { L12ScenarioType } from './scenario-type';

/** Aggregate match band per template. */
export enum L12TemplateMatchBand {
  STRONG_MATCH = 'STRONG_MATCH',
  PARTIAL_MATCH = 'PARTIAL_MATCH',
  NARROWED_MATCH = 'NARROWED_MATCH',
  BLOCKED_MATCH = 'BLOCKED_MATCH',
  NO_MATCH = 'NO_MATCH',
}

export const ALL_L12_TEMPLATE_MATCH_BANDS: readonly L12TemplateMatchBand[] =
  Object.values(L12TemplateMatchBand);

export interface L12TemplatePatternEvaluation {
  readonly pattern_id: string;
  readonly pattern_name: string;
  readonly verdict: L12TemplatePatternVerdict;
  readonly notes: readonly string[];
}

export interface L12ScenarioTemplateMatchResult {
  readonly template_id: L12ScenarioTemplateId;

  readonly scenario_family: L12ScenarioFamily;
  readonly scenario_type: L12ScenarioType;

  readonly match_score: number;
  readonly match_band: L12TemplateMatchBand;

  readonly satisfied_pattern_refs: readonly string[];
  readonly partial_pattern_refs: readonly string[];
  readonly narrowed_pattern_refs: readonly string[];
  readonly missing_pattern_refs: readonly string[];
  readonly blocked_pattern_refs: readonly string[];

  readonly pattern_evaluations: readonly L12TemplatePatternEvaluation[];

  readonly trigger_pattern_refs: readonly string[];
  readonly invalidation_pattern_refs: readonly string[];

  readonly confidence_cap_reasons: readonly L12PathConfidenceCapReason[];

  readonly eligible_for_base_case: boolean;
  readonly eligible_for_primary: boolean;
  readonly eligible_for_secondary: boolean;

  readonly readiness_class: L12ScenarioTemplateReadinessClass;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

export interface L12ScenarioTemplateEvaluation {
  readonly template_evaluation_id: string;

  readonly scenario_subject_id: string;
  readonly scenario_set_id: string;

  readonly matched_template_refs: readonly L12ScenarioTemplateId[];
  readonly narrowed_template_refs: readonly L12ScenarioTemplateId[];
  readonly blocked_template_refs: readonly L12ScenarioTemplateId[];

  readonly template_match_results: readonly L12ScenarioTemplateMatchResult[];

  readonly readiness_class: L12ScenarioTemplateReadinessClass;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}
