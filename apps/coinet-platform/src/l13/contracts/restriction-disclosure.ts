/**
 * L13.3 — Restriction Disclosure Contract
 *
 * §13.3.7 — Every AI output carries a restriction disclosure that
 * mirrors the merged L13.2 restriction profile. Constitutional
 * must-avoid flags (recommendation, prediction, final judgment) are
 * fixed `true` literals.
 */

import type { L13BlockedAnswerMode } from './explanation-restriction-profile';

export interface L13RestrictionDisclosure {
  readonly restriction_disclosure_id: string;

  readonly lower_layer_restriction_refs: readonly string[];

  readonly applied_restriction_codes: readonly string[];

  readonly blocked_answer_modes: readonly L13BlockedAnswerMode[];

  readonly required_disclosures: readonly string[];

  readonly restriction_statement: string;

  readonly may_include_directional_language: boolean;
  readonly may_include_scenario_language: boolean;
  readonly may_include_score_language: boolean;

  readonly must_avoid_recommendation_language: true;
  readonly must_avoid_prediction_language: true;
  readonly must_avoid_final_judgment_language: true;

  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];

  readonly policy_version: string;
}
