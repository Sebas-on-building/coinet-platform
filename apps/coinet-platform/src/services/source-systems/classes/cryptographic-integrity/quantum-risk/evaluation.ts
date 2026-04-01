/**
 * Section — Calibration Evaluation
 *
 * Answers: "When QRS > threshold, what actually happens?"
 *
 * Links snapshots to outcomes and computes aggregate statistics
 * by score band, state, and confidence level.
 */

import type { QuantumRiskSnapshot, OutcomeData } from './types';
import { getAllSnapshots, getSnapshotsForAsset } from './snapshot';
import { getOutcomesForSnapshot, getAllOutcomes } from './outcome-tracker';

export interface BandEvaluation {
  band: string;
  threshold: number;
  snapshot_count: number;
  outcome_count: number;
  avg_price_change_24h: number | null;
  avg_price_change_7d: number | null;
  avg_volatility_24h: number | null;
  avg_volatility_7d: number | null;
  pct_with_events: number | null;
}

export interface CalibrationReport {
  total_snapshots: number;
  total_outcomes: number;
  bands: BandEvaluation[];
  by_state: Record<string, StateEvaluation>;
  coverage_pct: number;
}

export interface StateEvaluation {
  state: string;
  count: number;
  outcomes: number;
  avg_price_change_24h: number | null;
  avg_volatility_24h: number | null;
}

function avg(arr: number[]): number | null {
  if (arr.length === 0) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function joinOutcomes(
  snapshots: QuantumRiskSnapshot[],
  window: '24h' | '7d',
): { snapshot: QuantumRiskSnapshot; outcome: OutcomeData }[] {
  const pairs: { snapshot: QuantumRiskSnapshot; outcome: OutcomeData }[] = [];
  for (const s of snapshots) {
    const outcomes = getOutcomesForSnapshot(s.id);
    const match = outcomes.find(o => o.window === window);
    if (match) pairs.push({ snapshot: s, outcome: match });
  }
  return pairs;
}

export function evaluateQRSBand(threshold: number, asset?: string): BandEvaluation {
  const allSnapshots = asset ? getSnapshotsForAsset(asset, 10_000) : getAllSnapshots(10_000);
  const filtered = allSnapshots.filter(s => s.score.value > threshold);

  const pairs24h = joinOutcomes(filtered, '24h');
  const pairs7d = joinOutcomes(filtered, '7d');

  return {
    band: `QRS > ${threshold}`,
    threshold,
    snapshot_count: filtered.length,
    outcome_count: pairs24h.length + pairs7d.length,
    avg_price_change_24h: avg(pairs24h.map(p => p.outcome.price_change)),
    avg_price_change_7d: avg(pairs7d.map(p => p.outcome.price_change)),
    avg_volatility_24h: avg(pairs24h.map(p => p.outcome.volatility)),
    avg_volatility_7d: avg(pairs7d.map(p => p.outcome.volatility)),
    pct_with_events: pairs24h.length > 0
      ? pairs24h.filter(p => p.outcome.event_flags.length > 0).length / pairs24h.length
      : null,
  };
}

export function buildCalibrationReport(asset?: string): CalibrationReport {
  const allSnapshots = asset ? getSnapshotsForAsset(asset, 10_000) : getAllSnapshots(10_000);
  const allOutcomesList = getAllOutcomes(10_000);

  const bands = [70, 60, 50, 40, 30].map(t => evaluateQRSBand(t, asset));

  const stateMap: Record<string, { snapshots: QuantumRiskSnapshot[] }> = {};
  for (const s of allSnapshots) {
    const st = s.judgment.state;
    if (!stateMap[st]) stateMap[st] = { snapshots: [] };
    stateMap[st].snapshots.push(s);
  }

  const byState: Record<string, StateEvaluation> = {};
  for (const [state, group] of Object.entries(stateMap)) {
    const pairs = joinOutcomes(group.snapshots, '24h');
    byState[state] = {
      state,
      count: group.snapshots.length,
      outcomes: pairs.length,
      avg_price_change_24h: avg(pairs.map(p => p.outcome.price_change)),
      avg_volatility_24h: avg(pairs.map(p => p.outcome.volatility)),
    };
  }

  const snapshotsWithAnyOutcome = allSnapshots.filter(s => getOutcomesForSnapshot(s.id).length > 0).length;
  const coveragePct = allSnapshots.length > 0 ? snapshotsWithAnyOutcome / allSnapshots.length : 0;

  return {
    total_snapshots: allSnapshots.length,
    total_outcomes: allOutcomesList.length,
    bands,
    by_state: byState,
    coverage_pct: Math.round(coveragePct * 1000) / 1000,
  };
}
