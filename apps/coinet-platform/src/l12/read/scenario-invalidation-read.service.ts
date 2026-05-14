/**
 * L12.6 — Scenario invalidation read service.
 *
 * Backs CURRENT_INVALIDATION_PROFILE_BY_SCENARIO_ID.
 */

import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';
import {
  L12ReadProviderResult,
  L12ReadServiceFn,
  makeL12ReadService,
} from './l12-read-service-base';

export interface L12CurrentInvalidationProfileView {
  readonly scenario_id: string;
  readonly invalidation_profile_refs: readonly string[];
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export type L12CurrentInvalidationProfileProvider = (input: {
  readonly scenario_id: string;
}) => L12CurrentInvalidationProfileView | undefined;

export function buildL12ScenarioInvalidationReadService(
  provider: L12CurrentInvalidationProfileProvider,
): L12ReadServiceFn<L12CurrentInvalidationProfileView> {
  return makeL12ReadService<L12CurrentInvalidationProfileView>(
    L12ReadSurfaceId.CURRENT_INVALIDATION_PROFILE_BY_SCENARIO_ID,
    req => {
      if (!req.scenario_id) return undefined;
      const v = provider({ scenario_id: req.scenario_id });
      if (!v) return undefined;
      const result: L12ReadProviderResult<L12CurrentInvalidationProfileView> = {
        payload: v,
        source_durable_surface_refs: [L12DurableSurfaceId.CURRENT_INVALIDATION_REGISTRY],
        evidence_refs: [...v.evidence_refs],
        lineage_refs: [...v.lineage_refs],
        replay_hash_refs: [v.replay_hash],
      };
      return result;
    },
  );
}
