/**
 * L12.4 — Engine 7: ScenarioPathConstructionEngine (§12.4.19).
 *
 * Constructs scenario path contracts from candidates + conditions + triggers
 * + invalidations. This stage is the *only* legal place where final
 * `L12ScenarioPathContract` objects are assembled. Ranking is NOT assigned
 * here — that is the ranking engine's exclusive job.
 */

import {
  buildL12ScenarioId,
  buildL12ScenarioReplayHash,
} from '../contracts/scenario-ids';
import {
  L12PathConfidenceBand,
  l12ConfidenceBandFor,
} from '../contracts/path-confidence-profile';
import { L12ScenarioReadinessClass } from '../contracts/scenario-object-readiness';
import {
  detectL12PathClaimCertainty,
  isL12PathClaimConditional,
} from '../contracts/scenario-path.contract';
import type { L12ScenarioPathContract } from '../contracts/scenario-path.contract';
import { L12ScenarioSummaryCode } from '../contracts/scenario-summary-code';
import { L12ScenarioTimeHorizon } from '../contracts/scenario-time-horizon';
import { L12ScenarioType } from '../contracts/scenario-type';

import type { L12ScenarioCandidate, L12ScenarioCandidateSet } from './scenario-candidate-engine';
import type { L12ResolvedConditionSet } from './scenario-condition-resolver';
import type { L12ResolvedInvalidationSet } from './scenario-invalidation-engine';
import type { L12ResolvedTriggerSet } from './scenario-trigger-engine';

export interface L12ConstructedScenarioPaths {
  readonly constructed_paths_id: string;
  readonly scenario_subject_id: string;
  readonly candidate_set_id: string;
  readonly scenario_set_id: string;

  readonly scenario_paths: readonly L12ScenarioPathContract[];

  readonly base_case_path_refs: readonly string[];
  readonly bullish_path_refs: readonly string[];
  readonly bearish_path_refs: readonly string[];
  readonly neutral_path_refs: readonly string[];
  readonly stress_path_refs: readonly string[];
  readonly recovery_path_refs: readonly string[];
  readonly insufficient_data_path_refs: readonly string[];

  readonly path_construction_warnings: readonly string[];

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface L12PathConstructionInput {
  readonly candidate_id: string;
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of: string;
  readonly scenario_name: string;
  readonly scenario_summary_code: L12ScenarioSummaryCode;
  readonly path_claim: string;
  readonly path_time_horizon: L12ScenarioTimeHorizon;
  readonly required_confirmation_refs: readonly string[];
  readonly unresolved_dependency_refs: readonly string[];
  readonly supporting_evidence_refs: readonly string[];
  readonly contradicting_evidence_refs: readonly string[];
  readonly readiness_class: L12ScenarioReadinessClass;
  readonly evidence_pack_ref: string;
  readonly input_snapshot_ref: string;
  readonly compute_run_id: string;
  readonly initial_path_confidence_score: number;
  readonly restriction_profile_ref: string;
}

export interface ConstructL12PathsArgs {
  readonly candidate_set: L12ScenarioCandidateSet;
  readonly condition_set: L12ResolvedConditionSet;
  readonly trigger_set: L12ResolvedTriggerSet;
  readonly invalidation_set: L12ResolvedInvalidationSet;
  readonly scenario_set_id: string;
  readonly inputs: readonly L12PathConstructionInput[];
  readonly insufficient_inputs_for_alternatives?: boolean;
  readonly policy_version: string;
}

export interface ConstructL12PathsResult {
  readonly ok: boolean;
  readonly constructed?: L12ConstructedScenarioPaths;
  readonly issues: readonly string[];
}

function findCandidate(
  set: L12ScenarioCandidateSet,
  candidate_id: string,
): L12ScenarioCandidate | undefined {
  return set.candidates.find(c => c.candidate_id === candidate_id);
}

export function constructL12ScenarioPaths(
  args: ConstructL12PathsArgs,
): ConstructL12PathsResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const built: L12ScenarioPathContract[] = [];

  const triggerByScenario = new Map<string, string[]>();
  for (const t of args.trigger_set.triggers) {
    if (!triggerByScenario.has(t.scenario_id)) triggerByScenario.set(t.scenario_id, []);
    triggerByScenario.get(t.scenario_id)!.push(t.trigger_id);
  }
  const invalidationByScenario = new Map<string, string[]>();
  for (const i of args.invalidation_set.invalidations) {
    if (!invalidationByScenario.has(i.scenario_id)) invalidationByScenario.set(i.scenario_id, []);
    invalidationByScenario.get(i.scenario_id)!.push(i.invalidation_id);
  }
  const conditionByScenario = new Map<string, string[]>();
  for (const c of args.condition_set.conditions) {
    if (!conditionByScenario.has(c.scenario_id)) conditionByScenario.set(c.scenario_id, []);
    conditionByScenario.get(c.scenario_id)!.push(c.condition_id);
  }

  for (const inp of args.inputs) {
    const cand = findCandidate(args.candidate_set, inp.candidate_id);
    if (!cand) {
      issues.push(`unknown candidate_id: ${inp.candidate_id}`);
      continue;
    }
    if (!isL12PathClaimConditional(inp.path_claim)) {
      issues.push(`path "${inp.scenario_name}": path_claim not conditional`);
    }
    if (detectL12PathClaimCertainty(inp.path_claim)) {
      issues.push(`path "${inp.scenario_name}": certainty/recommendation wording`);
    }
    if (!inp.evidence_pack_ref) issues.push(`path "${inp.scenario_name}": missing evidence_pack_ref`);
    if (!inp.input_snapshot_ref) issues.push(`path "${inp.scenario_name}": missing input_snapshot_ref`);
    if (!inp.compute_run_id) issues.push(`path "${inp.scenario_name}": missing compute_run_id`);
    if (!inp.restriction_profile_ref) {
      issues.push(`path "${inp.scenario_name}": missing restriction_profile_ref placeholder`);
    }

    const scenario_id = buildL12ScenarioId({
      scenario_set_id: args.scenario_set_id,
      scenario_family: cand.scenario_family,
      scenario_type: cand.scenario_type,
      as_of: inp.as_of,
      policy_version: args.policy_version,
    });
    const trigger_refs = triggerByScenario.get(scenario_id) ?? [];
    const invalidation_refs = invalidationByScenario.get(scenario_id) ?? [];
    const required_condition_refs = conditionByScenario.get(scenario_id) ?? [];

    if (cand.scenario_type !== L12ScenarioType.INSUFFICIENT_DATA_CASE) {
      if (trigger_refs.length === 0) issues.push(`path "${inp.scenario_name}": no triggers`);
      if (invalidation_refs.length === 0)
        issues.push(`path "${inp.scenario_name}": no invalidations`);
    }

    if (
      inp.initial_path_confidence_score < 0 ||
      inp.initial_path_confidence_score > 1 ||
      Number.isNaN(inp.initial_path_confidence_score)
    ) {
      issues.push(`path "${inp.scenario_name}": confidence out of range`);
    }
    const band: L12PathConfidenceBand = l12ConfidenceBandFor(inp.initial_path_confidence_score);

    const replay_hash = buildL12ScenarioReplayHash({
      domain: 'l12.path.contract',
      policy_version: args.policy_version,
      material: {
        scenario_id,
        scenario_set_id: args.scenario_set_id,
        scenario_subject_id: args.candidate_set.scenario_subject_id,
        type: cand.scenario_type,
        family: cand.scenario_family,
        summary: inp.scenario_summary_code,
        triggers: [...trigger_refs].sort(),
        invalidations: [...invalidation_refs].sort(),
        conditions: [...required_condition_refs].sort(),
      },
    });

    built.push({
      scenario_contract_id: `l12.path.contract.${replay_hash}`,
      scenario_id,
      scenario_set_id: args.scenario_set_id,
      scenario_subject_id: args.candidate_set.scenario_subject_id,
      scenario_type: cand.scenario_type,
      scenario_family: cand.scenario_family,
      scenario_name: inp.scenario_name,
      scenario_summary_code: inp.scenario_summary_code,
      scope_type: inp.scope_type,
      scope_id: inp.scope_id,
      as_of: inp.as_of,
      path_claim: inp.path_claim,
      required_condition_refs: [...required_condition_refs].sort(),
      supporting_condition_refs: args.condition_set.supporting_condition_refs,
      weakening_condition_refs: args.condition_set.weakening_condition_refs,
      trigger_refs: [...trigger_refs].sort(),
      invalidation_refs: [...invalidation_refs].sort(),
      supporting_evidence_refs: [...inp.supporting_evidence_refs].sort(),
      contradicting_evidence_refs: [...inp.contradicting_evidence_refs].sort(),
      required_confirmation_refs: [...inp.required_confirmation_refs].sort(),
      unresolved_dependency_refs: [...inp.unresolved_dependency_refs].sort(),
      path_confidence_score: inp.initial_path_confidence_score,
      path_confidence_band: band,
      path_time_horizon: inp.path_time_horizon,
      readiness_class: inp.readiness_class,
      restriction_profile_ref: inp.restriction_profile_ref,
      evidence_pack_ref: inp.evidence_pack_ref,
      input_snapshot_ref: inp.input_snapshot_ref,
      compute_run_id: inp.compute_run_id,
      lineage_refs: [...args.condition_set.lineage_refs].sort(),
      replay_hash,
      policy_version: args.policy_version,
    });
  }

  // Multi-path competition: single path is illegal unless insufficient inputs.
  if (built.length === 1 && !args.insufficient_inputs_for_alternatives) {
    if (built[0]!.scenario_type !== L12ScenarioType.INSUFFICIENT_DATA_CASE) {
      issues.push('single-path scenario set without insufficient-competition disclosure');
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const refsByType = (t: L12ScenarioType) =>
    built.filter(p => p.scenario_type === t).map(p => p.scenario_id).sort();

  const constructed_replay = buildL12ScenarioReplayHash({
    domain: 'l12.constructed_paths',
    policy_version: args.policy_version,
    material: {
      scenario_set_id: args.scenario_set_id,
      path_ids: built.map(p => p.scenario_id).sort(),
    },
  });
  const constructed: L12ConstructedScenarioPaths = {
    constructed_paths_id: `l12.constructed_paths.${constructed_replay}`,
    scenario_subject_id: args.candidate_set.scenario_subject_id,
    candidate_set_id: args.candidate_set.candidate_set_id,
    scenario_set_id: args.scenario_set_id,
    scenario_paths: built,
    base_case_path_refs: refsByType(L12ScenarioType.BASE_CASE),
    bullish_path_refs: refsByType(L12ScenarioType.BULLISH_CONTINUATION),
    bearish_path_refs: refsByType(L12ScenarioType.BEARISH_FAILURE),
    neutral_path_refs: refsByType(L12ScenarioType.NEUTRAL_CHOP),
    stress_path_refs: refsByType(L12ScenarioType.STRESS_CASE),
    recovery_path_refs: refsByType(L12ScenarioType.RECOVERY_CASE),
    insufficient_data_path_refs: refsByType(L12ScenarioType.INSUFFICIENT_DATA_CASE),
    path_construction_warnings: warnings,
    lineage_refs: [...new Set(built.flatMap(p => p.lineage_refs))].sort(),
    replay_hash: constructed_replay,
    policy_version: args.policy_version,
  };
  return { ok: true, constructed, issues: [] };
}
