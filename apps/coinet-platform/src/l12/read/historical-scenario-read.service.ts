/**
 * L12.6 — Historical scenario read service.
 *
 * Backs:
 *   - SCENARIO_HISTORY_BY_SCOPE_WINDOW
 *   - SCENARIO_FAILURES_BY_SCOPE
 */

import { L12HistoricalScenarioFact } from '../contracts/l12-historical-surface';
import { L12DurableSurfaceId } from '../contracts/l12-persistence-surface';
import { L12ReadSurfaceId } from '../contracts/l12-read-surface';
import {
  L12ReadProviderResult,
  L12ReadServiceFn,
  makeL12ReadService,
} from './l12-read-service-base';

export type L12HistoricalScenarioProvider = (input: {
  readonly scope_type: string;
  readonly scope_id: string;
  readonly window_start?: string;
  readonly window_end?: string;
}) => readonly L12HistoricalScenarioFact[];

export interface L12HistoricalScenarioReadServices {
  readonly scenarioHistoryByScopeWindow: L12ReadServiceFn<readonly L12HistoricalScenarioFact[]>;
  readonly scenarioFailuresByScope: L12ReadServiceFn<readonly L12HistoricalScenarioFact[]>;
}

function provideHistory(
  facts: readonly L12HistoricalScenarioFact[],
  source: L12DurableSurfaceId,
): L12ReadProviderResult<readonly L12HistoricalScenarioFact[]> {
  const lineage = new Set<string>();
  const evidence = new Set<string>();
  const replayHashes = new Set<string>();
  for (const f of facts) {
    for (const lr of f.lineage_refs) lineage.add(lr);
    if (f.evidence_pack_ref) evidence.add(f.evidence_pack_ref);
    if (f.replay_hash) replayHashes.add(f.replay_hash);
  }
  return {
    payload: facts,
    source_durable_surface_refs: [source],
    evidence_refs: [...evidence].sort(),
    lineage_refs: [...lineage].sort(),
    replay_hash_refs: [...replayHashes].sort(),
  };
}

export function buildL12HistoricalScenarioReadServices(
  provider: L12HistoricalScenarioProvider,
  failuresProvider: L12HistoricalScenarioProvider = provider,
): L12HistoricalScenarioReadServices {
  const scenarioHistoryByScopeWindow = makeL12ReadService<readonly L12HistoricalScenarioFact[]>(
    L12ReadSurfaceId.SCENARIO_HISTORY_BY_SCOPE_WINDOW,
    req => {
      if (!req.scope_type || !req.scope_id) return undefined;
      const facts = provider({
        scope_type: req.scope_type,
        scope_id: req.scope_id,
        window_start: req.window_start,
        window_end: req.window_end,
      });
      return provideHistory(facts, L12DurableSurfaceId.SCENARIO_TRANSITIONS);
    },
  );

  const scenarioFailuresByScope = makeL12ReadService<readonly L12HistoricalScenarioFact[]>(
    L12ReadSurfaceId.SCENARIO_FAILURES_BY_SCOPE,
    req => {
      if (!req.scope_type || !req.scope_id) return undefined;
      const facts = failuresProvider({
        scope_type: req.scope_type,
        scope_id: req.scope_id,
        window_start: req.window_start,
        window_end: req.window_end,
      });
      return provideHistory(facts, L12DurableSurfaceId.SCENARIO_FAILURES);
    },
  );

  return { scenarioHistoryByScopeWindow, scenarioFailuresByScope };
}
