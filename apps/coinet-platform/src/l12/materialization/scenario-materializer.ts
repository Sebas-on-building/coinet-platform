/**
 * L12.4 — Engine 13: ScenarioMaterializer (§12.4.25).
 *
 * Builds the L5-route materialization intent. Direct store writes are
 * forbidden — runtime must hand off through the L5 route.
 */

import { buildL12ScenarioReplayHash } from '../contracts/scenario-ids';
import type { L12ScenarioEvidencePackContract } from '../contracts/scenario-evidence-pack.contract';
import type { L12ScenarioRankingResult } from '../engine/scenario-ranking-engine';

export enum L12ScenarioMaterializationMode {
  LIVE = 'LIVE',
  REPLAY = 'REPLAY',
  REPAIR = 'REPAIR',
  BACKFILL = 'BACKFILL',
  SHADOW = 'SHADOW',
}

export const ALL_L12_SCENARIO_MATERIALIZATION_MODES: readonly L12ScenarioMaterializationMode[] =
  Object.values(L12ScenarioMaterializationMode);

export interface L12ScenarioMaterializationIntent {
  readonly materialization_intent_id: string;

  readonly scenario_subject_id: string;
  readonly scenario_set_ref: string;

  readonly materialization_mode: L12ScenarioMaterializationMode;

  readonly evidence_pack_ref: string;

  readonly l5_route_ref: string;

  readonly direct_store_write_attempted: false;

  readonly readiness_class_ref: string;
  readonly restriction_contract_ref: string;

  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly policy_version: string;
}

export interface BuildL12MaterializationIntentArgs {
  readonly scenario_subject_id: string;
  readonly ranking: L12ScenarioRankingResult;
  readonly evidence_pack: L12ScenarioEvidencePackContract;
  readonly readiness_class_ref: string;
  readonly restriction_contract_ref: string;
  readonly l5_route_ref: string;
  readonly materialization_mode: L12ScenarioMaterializationMode;
  readonly direct_store_write_attempted?: boolean;
  readonly policy_version: string;
}

export interface BuildL12MaterializationIntentResult {
  readonly ok: boolean;
  readonly intent?: L12ScenarioMaterializationIntent;
  readonly issues: readonly string[];
}

export function buildL12MaterializationIntent(
  args: BuildL12MaterializationIntentArgs,
): BuildL12MaterializationIntentResult {
  const issues: string[] = [];
  if (!args.evidence_pack.evidence_pack_ref) issues.push('missing evidence pack ref');
  if (!args.l5_route_ref) issues.push('missing L5 route ref');
  if (!args.readiness_class_ref) issues.push('missing readiness class ref');
  if (!args.restriction_contract_ref) issues.push('missing restriction contract ref');
  if (args.direct_store_write_attempted) issues.push('direct store write attempted');

  if (issues.length > 0) return { ok: false, issues };

  const replay_hash = buildL12ScenarioReplayHash({
    domain: 'l12.materialization.intent',
    policy_version: args.policy_version,
    material: {
      scenario_subject_id: args.scenario_subject_id,
      scenario_set_ref: args.ranking.scenario_set_id,
      evidence_pack_ref: args.evidence_pack.evidence_pack_ref,
      l5_route_ref: args.l5_route_ref,
      mode: args.materialization_mode,
    },
  });
  const intent: L12ScenarioMaterializationIntent = {
    materialization_intent_id: `l12.materialization.intent.${replay_hash}`,
    scenario_subject_id: args.scenario_subject_id,
    scenario_set_ref: args.ranking.scenario_set_id,
    materialization_mode: args.materialization_mode,
    evidence_pack_ref: args.evidence_pack.evidence_pack_ref,
    l5_route_ref: args.l5_route_ref,
    direct_store_write_attempted: false,
    readiness_class_ref: args.readiness_class_ref,
    restriction_contract_ref: args.restriction_contract_ref,
    lineage_refs: [...args.evidence_pack.lineage_refs].sort(),
    replay_hash,
    policy_version: args.policy_version,
  };
  return { ok: true, intent, issues: [] };
}
