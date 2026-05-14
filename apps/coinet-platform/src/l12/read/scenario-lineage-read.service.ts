/**
 * L12.6 — Scenario lineage read service.
 *
 * Backs SCENARIO_LINEAGE_BY_RUN_ID.
 */

import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';
import { L12ScenarioRunRecord } from '../contracts/l12-scenario-run-record';
import {
  L12ReadProviderResult,
  L12ReadServiceFn,
  makeL12ReadService,
} from './l12-read-service-base';

export interface L12ScenarioLineageView {
  readonly run_record: L12ScenarioRunRecord;
  readonly supersession_chain: readonly string[];
  readonly correction_chain: readonly string[];
}

export type L12ScenarioLineageProvider = (input: {
  readonly compute_run_id: string;
}) => L12ScenarioLineageView | undefined;

export function buildL12ScenarioLineageReadService(
  provider: L12ScenarioLineageProvider,
): L12ReadServiceFn<L12ScenarioLineageView> {
  return makeL12ReadService<L12ScenarioLineageView>(
    L12ReadSurfaceId.SCENARIO_LINEAGE_BY_RUN_ID,
    req => {
      if (!req.compute_run_id) return undefined;
      const v = provider({ compute_run_id: req.compute_run_id });
      if (!v) return undefined;
      const lineage = new Set<string>([
        ...v.run_record.lineage_refs,
        ...v.supersession_chain,
        ...v.correction_chain,
      ]);
      const result: L12ReadProviderResult<L12ScenarioLineageView> = {
        payload: v,
        source_durable_surface_refs: [
          L12DurableSurfaceId.CURRENT_SCENARIO_LINEAGE_INDEX,
          L12DurableSurfaceId.SCENARIO_RUNS,
        ],
        evidence_refs: [...v.run_record.evidence_pack_refs].sort(),
        lineage_refs: [...lineage].sort(),
        replay_hash_refs: [v.run_record.replay_hash],
      };
      return result;
    },
  );
}
