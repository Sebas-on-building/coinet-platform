/**
 * L12.6 — Scenario shift-condition read service.
 *
 * Backs:
 *   - CURRENT_SHIFT_CONDITIONS_BY_SCENARIO_SET_ID
 *   - CURRENT_RESTRICTIONS_BY_SCENARIO_SET_ID
 */

import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';
import {
  L12ReadProviderResult,
  L12ReadServiceFn,
  makeL12ReadService,
} from './l12-read-service-base';

export interface L12CurrentShiftConditionView {
  readonly scenario_set_id: string;
  readonly shift_condition_set_ref: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export interface L12CurrentRestrictionsView {
  readonly scenario_set_id: string;
  readonly restriction_profile_ref: string;
  readonly evidence_refs: readonly string[];
  readonly lineage_refs: readonly string[];
  readonly replay_hash: string;
}

export type L12CurrentShiftConditionProvider = (input: {
  readonly scenario_set_id: string;
}) => L12CurrentShiftConditionView | undefined;

export type L12CurrentRestrictionsProvider = (input: {
  readonly scenario_set_id: string;
}) => L12CurrentRestrictionsView | undefined;

export interface L12ShiftConditionReadServices {
  readonly currentShiftConditionsByScenarioSetId: L12ReadServiceFn<L12CurrentShiftConditionView>;
  readonly currentRestrictionsByScenarioSetId: L12ReadServiceFn<L12CurrentRestrictionsView>;
}

export function buildL12ShiftConditionReadServices(
  shiftProvider: L12CurrentShiftConditionProvider,
  restrictionsProvider: L12CurrentRestrictionsProvider,
): L12ShiftConditionReadServices {
  const currentShiftConditionsByScenarioSetId = makeL12ReadService<L12CurrentShiftConditionView>(
    L12ReadSurfaceId.CURRENT_SHIFT_CONDITIONS_BY_SCENARIO_SET_ID,
    req => {
      if (!req.scenario_set_id) return undefined;
      const v = shiftProvider({ scenario_set_id: req.scenario_set_id });
      if (!v) return undefined;
      const result: L12ReadProviderResult<L12CurrentShiftConditionView> = {
        payload: v,
        source_durable_surface_refs: [L12DurableSurfaceId.CURRENT_SHIFT_CONDITION_REGISTRY],
        evidence_refs: [...v.evidence_refs],
        lineage_refs: [...v.lineage_refs],
        replay_hash_refs: [v.replay_hash],
      };
      return result;
    },
  );

  const currentRestrictionsByScenarioSetId = makeL12ReadService<L12CurrentRestrictionsView>(
    L12ReadSurfaceId.CURRENT_RESTRICTIONS_BY_SCENARIO_SET_ID,
    req => {
      if (!req.scenario_set_id) return undefined;
      const v = restrictionsProvider({ scenario_set_id: req.scenario_set_id });
      if (!v) return undefined;
      const result: L12ReadProviderResult<L12CurrentRestrictionsView> = {
        payload: v,
        source_durable_surface_refs: [
          L12DurableSurfaceId.CURRENT_SCENARIO_RESTRICTION_REGISTRY,
        ],
        evidence_refs: [...v.evidence_refs],
        lineage_refs: [...v.lineage_refs],
        replay_hash_refs: [v.replay_hash],
        restriction_profile_ref: v.restriction_profile_ref,
      };
      return result;
    },
  );

  return {
    currentShiftConditionsByScenarioSetId,
    currentRestrictionsByScenarioSetId,
  };
}
