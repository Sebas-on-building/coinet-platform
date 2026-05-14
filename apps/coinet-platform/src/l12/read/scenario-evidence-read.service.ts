/**
 * L12.6 — Scenario evidence bundle read service.
 *
 * Backs SCENARIO_EVIDENCE_BUNDLE.
 */

import { L12EvidencePointer } from '../contracts/l12-evidence-storage';
import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';
import {
  L12ReadProviderResult,
  L12ReadServiceFn,
  makeL12ReadService,
} from './l12-read-service-base';

export type L12ScenarioEvidenceProvider = (input: {
  readonly scenario_set_id: string;
}) => readonly L12EvidencePointer[];

export function buildL12ScenarioEvidenceReadService(
  provider: L12ScenarioEvidenceProvider,
): L12ReadServiceFn<readonly L12EvidencePointer[]> {
  return makeL12ReadService<readonly L12EvidencePointer[]>(
    L12ReadSurfaceId.SCENARIO_EVIDENCE_BUNDLE,
    req => {
      if (!req.scenario_set_id) return undefined;
      const pointers = provider({ scenario_set_id: req.scenario_set_id });
      const lineage = new Set<string>();
      const evidence = new Set<string>();
      const replayHashes = new Set<string>();
      for (const p of pointers) {
        for (const lr of p.lineage_refs) lineage.add(lr);
        evidence.add(p.evidence_pointer_id);
        if (p.replay_hash) replayHashes.add(p.replay_hash);
      }
      const result: L12ReadProviderResult<readonly L12EvidencePointer[]> = {
        payload: pointers,
        source_durable_surface_refs: [
          L12DurableSurfaceId.CURRENT_SCENARIO_EVIDENCE_INDEX,
        ],
        evidence_refs: [...evidence].sort(),
        lineage_refs: [...lineage].sort(),
        replay_hash_refs: [...replayHashes].sort(),
      };
      return result;
    },
  );
}
