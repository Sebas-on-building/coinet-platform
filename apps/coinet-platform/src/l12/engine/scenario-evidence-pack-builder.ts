/**
 * L12.4 — Engine 12: ScenarioEvidencePackBuilder (§12.4.24).
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import {
  L12ScenarioEvidencePackContract,
  isL12RawLowerLayerEvidenceRef,
} from '../contracts/scenario-evidence-pack.contract';
import type { L12PathConfidenceContract } from '../contracts/path-confidence.contract';
import type { L12RestrictionContract } from '../contracts/scenario-restriction.contract';
import type { L12ShiftConditionContract } from '../contracts/scenario-shift-condition.contract';

import type { L12ResolvedConditionSet } from './scenario-condition-resolver';
import type { L12ResolvedInputSurfaces } from './scenario-input-resolver';
import type { L12ResolvedInvalidationSet } from './scenario-invalidation-engine';
import type { L12ResolvedTriggerSet } from './scenario-trigger-engine';
import type { L12ConstructedScenarioPaths } from './scenario-path-construction-engine';
import type { L12ScenarioRankingResult } from './scenario-ranking-engine';

export interface BuildL12EvidencePackArgs {
  readonly subject_ref: string;
  readonly scenario_set_id: string;
  readonly surfaces: L12ResolvedInputSurfaces;
  readonly constructed: L12ConstructedScenarioPaths;
  readonly condition_set: L12ResolvedConditionSet;
  readonly trigger_set: L12ResolvedTriggerSet;
  readonly invalidation_set: L12ResolvedInvalidationSet;
  readonly path_confidence: L12PathConfidenceContract;
  readonly ranking: L12ScenarioRankingResult;
  readonly shift_conditions: L12ShiftConditionContract;
  readonly restrictions: L12RestrictionContract;
  readonly archive_policy_ref: string;
  readonly input_snapshot_ref: string;
  readonly replay_safe_ref: string;
  readonly policy_version: string;
}

export interface BuildL12EvidencePackResult {
  readonly ok: boolean;
  readonly contract?: L12ScenarioEvidencePackContract;
  readonly issues: readonly string[];
}

export function buildL12EvidencePack(
  args: BuildL12EvidencePackArgs,
): BuildL12EvidencePackResult {
  const issues: string[] = [];

  if (!args.subject_ref) issues.push('missing subject_ref');
  if (args.constructed.scenario_paths.length === 0) issues.push('no scenario refs');
  if (args.condition_set.conditions.length === 0) issues.push('no condition refs');
  if (args.trigger_set.triggers.length === 0) issues.push('no trigger refs');
  if (args.invalidation_set.invalidations.length === 0) issues.push('no invalidation refs');
  if (!args.input_snapshot_ref) issues.push('missing input snapshot ref');
  if (!args.replay_safe_ref) issues.push('missing replay-safe ref');
  if (args.surfaces.l11_score_context_bundle_refs.length === 0) {
    issues.push('missing L11 score evidence');
  }

  const lower_layer_refs = [
    ...args.surfaces.l7_validation_refs,
    ...args.surfaces.l7_contradiction_refs,
    ...args.surfaces.l8_regime_refs,
    ...args.surfaces.l9_sequence_refs,
    ...args.surfaces.l10_hypothesis_refs,
    ...args.surfaces.l11_score_context_bundle_refs,
  ];
  for (const r of lower_layer_refs) {
    if (isL12RawLowerLayerEvidenceRef(r)) {
      issues.push(`raw lower-layer ref forbidden as decisive proof: ${r}`);
    }
  }

  if (issues.length > 0) return { ok: false, issues };

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.evidence_pack.contract',
    policy_version: args.policy_version,
    material: {
      scenario_set_id: args.scenario_set_id,
      scenario_refs: args.constructed.scenario_paths.map(p => p.scenario_id).sort(),
      condition_refs: args.condition_set.conditions.map(c => c.condition_id).sort(),
      trigger_refs: args.trigger_set.triggers.map(t => t.trigger_id).sort(),
      invalidation_refs: args.invalidation_set.invalidations.map(i => i.invalidation_id).sort(),
      confidence_profile_refs: [args.path_confidence.path_confidence_profile_id],
      shift_refs: [args.shift_conditions.shift_condition_set_id],
      restriction_refs: [args.restrictions.restriction_profile_id],
    },
  });
  const contract: L12ScenarioEvidencePackContract = {
    evidence_pack_contract_id: `l12.evidence_pack.contract.${replay_hash}`,
    evidence_pack_ref: `l12.evidence_pack.${replay_hash}`,
    scenario_set_id: args.scenario_set_id,
    subject_ref: args.subject_ref,
    scenario_refs: args.constructed.scenario_paths.map(p => p.scenario_id).sort(),
    condition_refs: args.condition_set.conditions.map(c => c.condition_id).sort(),
    trigger_refs: args.trigger_set.triggers.map(t => t.trigger_id).sort(),
    invalidation_refs: args.invalidation_set.invalidations.map(i => i.invalidation_id).sort(),
    confidence_profile_refs: [args.path_confidence.path_confidence_profile_id],
    shift_condition_refs: [args.shift_conditions.shift_condition_set_id],
    restriction_profile_refs: [args.restrictions.restriction_profile_id],
    lower_layer_evidence_refs: [...new Set(lower_layer_refs)].sort(),
    validation_evidence_refs: [...args.surfaces.l7_validation_refs].sort(),
    regime_evidence_refs: [...args.surfaces.l8_regime_refs].sort(),
    sequence_evidence_refs: [...args.surfaces.l9_sequence_refs].sort(),
    hypothesis_evidence_refs: [...args.surfaces.l10_hypothesis_refs].sort(),
    score_evidence_refs: [...args.surfaces.l11_score_context_bundle_refs].sort(),
    input_snapshot_ref: args.input_snapshot_ref,
    lineage_refs: [
      ...new Set([
        ...args.constructed.lineage_refs,
        ...args.condition_set.lineage_refs,
        ...args.trigger_set.lineage_refs,
        ...args.invalidation_set.lineage_refs,
      ]),
    ].sort(),
    archive_policy_ref: args.archive_policy_ref,
    replay_safe_ref: args.replay_safe_ref,
    policy_version: args.policy_version,
    replay_hash,
  };
  return { ok: true, contract, issues: [] };
}
