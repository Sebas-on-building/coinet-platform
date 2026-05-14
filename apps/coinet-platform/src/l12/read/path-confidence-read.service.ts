/**
 * L12.6 — Path confidence read service.
 *
 * Backs CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID.
 */

import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';
import {
  L12ReadProviderResult,
  L12ReadServiceFn,
  makeL12ReadService,
} from './l12-read-service-base';

export interface L12CurrentPathConfidenceView {
  readonly scenario_set_id: string;
  readonly path_confidence_profile_ref: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
  readonly restriction_profile_ref: string;
}

export type L12CurrentPathConfidenceProvider = (input: {
  readonly scenario_set_id: string;
}) => L12CurrentPathConfidenceView | undefined;

export function buildL12PathConfidenceReadService(
  provider: L12CurrentPathConfidenceProvider,
): L12ReadServiceFn<L12CurrentPathConfidenceView> {
  return makeL12ReadService<L12CurrentPathConfidenceView>(
    L12ReadSurfaceId.CURRENT_PATH_CONFIDENCE_BY_SCENARIO_SET_ID,
    req => {
      if (!req.scenario_set_id) return undefined;
      const v = provider({ scenario_set_id: req.scenario_set_id });
      if (!v) return undefined;
      const result: L12ReadProviderResult<L12CurrentPathConfidenceView> = {
        payload: v,
        source_durable_surface_refs: [L12DurableSurfaceId.CURRENT_PATH_CONFIDENCE_REGISTRY],
        evidence_refs: [...v.evidence_refs],
        lineage_refs: [...v.lineage_refs],
        replay_hash_refs: [v.replay_hash],
        restriction_profile_ref: v.restriction_profile_ref,
      };
      return result;
    },
  );
}
