/**
 * L12.3 — Scenario path contract (§12.3.6).
 *
 * Defines what a scenario path must carry to be legally emissible.
 */

import { L12PathConfidenceBand } from './path-confidence-profile';
import { L12ScenarioFamily } from './scenario-family';
import { L12ScenarioReadinessClass } from './scenario-object-readiness';
import { L12ScenarioSummaryCode } from './scenario-summary-code';
import { L12ScenarioTimeHorizon } from './scenario-time-horizon';
import { L12ScenarioType } from './scenario-type';

export interface L12ScenarioPathContract {
  readonly scenario_contract_id: string;

  readonly scenario_id: string;
  readonly scenario_set_id: string;
  readonly scenario_subject_id: string;

  readonly scenario_type: L12ScenarioType;
  readonly scenario_family: L12ScenarioFamily;

  readonly scenario_name: string;
  readonly scenario_summary_code: L12ScenarioSummaryCode;

  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;

  readonly path_claim: string;

  readonly required_condition_refs: readonly string[];
  readonly supporting_condition_refs: readonly string[];
  readonly weakening_condition_refs: readonly string[];

  readonly trigger_refs: readonly string[];
  readonly invalidation_refs: readonly string[];

  readonly supporting_evidence_refs: readonly string[];
  readonly contradicting_evidence_refs: readonly string[];

  readonly required_confirmation_refs: readonly string[];
  readonly unresolved_dependency_refs: readonly string[];

  readonly path_confidence_score: number;
  readonly path_confidence_band: L12PathConfidenceBand;

  readonly path_time_horizon: L12ScenarioTimeHorizon;

  readonly readiness_class: L12ScenarioReadinessClass;

  readonly restriction_profile_ref: string;

  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;

  readonly compute_run_id: string;
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;

  readonly policy_version: string;
}

/**
 * §12.3.6.2 — Path claim must be conditional. Detect non-conditional
 * (declarative / certainty / final-judgment / trade-action) language.
 */
const CONDITIONAL_INDICATORS: readonly RegExp[] = [
  /\bif\b/i,
  /\bwhile\b/i,
  /\buntil\b/i,
  /\bunless\b/i,
  /\bremains?\b/i,
  /\bwould\b/i,
  /\bmay\b/i,
  /\bmight\b/i,
  /\bsubject to\b/i,
  /\bconditional\b/i,
  /\bcontingent\b/i,
  /\bpath\s+strengthens?\b/i,
  /\brisk\s+rises?\b/i,
];

const CERTAINTY_INDICATORS: readonly RegExp[] = [
  /\bwill\s+(go|move|pump|dump|break|continue)\b/i,
  /\bguaranteed\b/i,
  /\binevitable\b/i,
  /\bcertain\s+(to|outcome|breakout|continuation)\b/i,
  /\bcannot\s+fail\b/i,
  /\bmust\s+happen\b/i,
];

export function isL12PathClaimConditional(claim: string): boolean {
  if (!claim) return false;
  return CONDITIONAL_INDICATORS.some(p => p.test(claim));
}

export function detectL12PathClaimCertainty(claim: string): boolean {
  if (!claim) return false;
  return CERTAINTY_INDICATORS.some(p => p.test(claim));
}
