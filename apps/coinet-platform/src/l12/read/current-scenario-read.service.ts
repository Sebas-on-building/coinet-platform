/**
 * L12.6 — Current scenario read service.
 *
 * Backs:
 *   - CURRENT_SCENARIO_SET_BY_SCOPE
 *   - CURRENT_BASE_CASE_BY_SCOPE
 *   - CURRENT_BULLISH_BEARISH_PATHS_BY_SCOPE
 */

import {
  L12CurrentScenarioRecord,
} from '../contracts/l12-current-authority';
import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';
import {
  L12ReadProviderResult,
  L12ReadServiceFn,
  makeL12ReadService,
} from './l12-read-service-base';

export type L12CurrentScenarioProvider = (input: {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly as_of?: string;
}) => L12CurrentScenarioRecord | undefined;

export interface L12CurrentScenarioReadServices {
  readonly currentScenarioSetByScope: L12ReadServiceFn<L12CurrentScenarioRecord>;
  readonly currentBaseCaseByScope: L12ReadServiceFn<{
    readonly base_case_ref: string;
    readonly scenario_set_id: string;
  }>;
  readonly currentBullishBearishPathsByScope: L12ReadServiceFn<{
    readonly primary_scenario_ref: string;
    readonly secondary_scenario_ref?: string;
    readonly scenario_set_id: string;
  }>;
}

function lift(
  rec: L12CurrentScenarioRecord,
): L12ReadProviderResult<L12CurrentScenarioRecord> {
  return {
    payload: rec,
    source_durable_surface_refs: [L12DurableSurfaceId.CURRENT_SCENARIO_REGISTRY],
    evidence_refs: [rec.evidence_pack_ref],
    lineage_refs: [...rec.lineage_refs],
    replay_hash_refs: [rec.replay_hash],
    restriction_profile_ref: rec.restriction_profile_ref,
  };
}

export function buildL12CurrentScenarioReadServices(
  provider: L12CurrentScenarioProvider,
): L12CurrentScenarioReadServices {
  const currentScenarioSetByScope = makeL12ReadService<L12CurrentScenarioRecord>(
    L12ReadSurfaceId.CURRENT_SCENARIO_SET_BY_SCOPE,
    req => {
      if (!req.scope_type || !req.scope_id) return undefined;
      const rec = provider({
        scope_type: req.scope_type,
        scope_id: req.scope_id,
        as_of: req.window_end ?? req.window_start,
      });
      if (!rec) return undefined;
      return lift(rec);
    },
  );

  const currentBaseCaseByScope = makeL12ReadService<{
    base_case_ref: string;
    scenario_set_id: string;
  }>(L12ReadSurfaceId.CURRENT_BASE_CASE_BY_SCOPE, req => {
    if (!req.scope_type || !req.scope_id) return undefined;
    const rec = provider({
      scope_type: req.scope_type,
      scope_id: req.scope_id,
      as_of: req.window_end ?? req.window_start,
    });
    if (!rec) return undefined;
    return {
      payload: {
        base_case_ref: rec.base_case_ref,
        scenario_set_id: rec.scenario_set_id,
      },
      source_durable_surface_refs: lift(rec).source_durable_surface_refs,
      evidence_refs: [rec.evidence_pack_ref],
      lineage_refs: [...rec.lineage_refs],
      replay_hash_refs: [rec.replay_hash],
      restriction_profile_ref: rec.restriction_profile_ref,
    };
  });

  const currentBullishBearishPathsByScope = makeL12ReadService<{
    primary_scenario_ref: string;
    secondary_scenario_ref?: string;
    scenario_set_id: string;
  }>(L12ReadSurfaceId.CURRENT_BULLISH_BEARISH_PATHS_BY_SCOPE, req => {
    if (!req.scope_type || !req.scope_id) return undefined;
    const rec = provider({
      scope_type: req.scope_type,
      scope_id: req.scope_id,
      as_of: req.window_end ?? req.window_start,
    });
    if (!rec) return undefined;
    return {
      payload: {
        primary_scenario_ref: rec.primary_scenario_ref,
        secondary_scenario_ref: rec.secondary_scenario_ref,
        scenario_set_id: rec.scenario_set_id,
      },
      source_durable_surface_refs: lift(rec).source_durable_surface_refs,
      evidence_refs: [rec.evidence_pack_ref],
      lineage_refs: [...rec.lineage_refs],
      replay_hash_refs: [rec.replay_hash],
      restriction_profile_ref: rec.restriction_profile_ref,
    };
  });

  return {
    currentScenarioSetByScope,
    currentBaseCaseByScope,
    currentBullishBearishPathsByScope,
  };
}
