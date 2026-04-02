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

export interface ConfidenceBandEvaluation {
  band: string;
  min_confidence: number;
  max_confidence: number;
  snapshot_count: number;
  outcome_count: number;
  avg_price_change_24h: number | null;
  avg_volatility_24h: number | null;
}

export interface EdgeSignal {
  dimension: string;
  comparison: string;
  value_a: number | null;
  value_b: number | null;
  delta: number | null;
  signal_strength: 'none' | 'weak' | 'moderate' | 'strong';
  interpretation: string;
}

export interface EdgeReport {
  timestamp: string;
  total_snapshots: number;
  total_outcomes: number;
  coverage_pct: number;
  signals: EdgeSignal[];
  verdict: 'NO_DATA' | 'NO_SIGNAL' | 'WEAK_SIGNAL' | 'POSSIBLE_EDGE' | 'EDGE_DETECTED';
  summary: string;
}

export function evaluateConfidenceBand(
  minConf: number,
  maxConf: number,
  asset?: string,
): ConfidenceBandEvaluation {
  const allSnapshots = asset ? getSnapshotsForAsset(asset, 10_000) : getAllSnapshots(10_000);
  const filtered = allSnapshots.filter(s =>
    s.judgment.confidence >= minConf && s.judgment.confidence < maxConf
  );
  const pairs = joinOutcomes(filtered, '24h');

  return {
    band: `conf ${(minConf * 100).toFixed(0)}–${(maxConf * 100).toFixed(0)}%`,
    min_confidence: minConf,
    max_confidence: maxConf,
    snapshot_count: filtered.length,
    outcome_count: pairs.length,
    avg_price_change_24h: avg(pairs.map(p => p.outcome.price_change)),
    avg_volatility_24h: avg(pairs.map(p => p.outcome.volatility)),
  };
}

export function buildCalibrationReport(asset?: string): CalibrationReport {
  const allSnapshots = asset ? getSnapshotsForAsset(asset, 10_000) : getAllSnapshots(10_000);
  const allOutcomesList = getAllOutcomes(10_000);

  const bands = [80, 70, 60, 40].map(t => evaluateQRSBand(t, asset));

  const stateMap: Record<string, { snapshots: QuantumRiskSnapshot[] }> = {};
  for (const s of allSnapshots) {
    const st = s.judgment.state;
    if (!stateMap[st]) stateMap[st] = { snapshots: [] };
    stateMap[st].snapshots.push(s);
  }

  const byState: Record<string, StateEvaluation> = {};
  for (const [state, group] of Object.entries(stateMap)) {
    const pairs24 = joinOutcomes(group.snapshots, '24h');
    const pairs7d = joinOutcomes(group.snapshots, '7d');
    byState[state] = {
      state,
      count: group.snapshots.length,
      outcomes: pairs24.length,
      avg_price_change_24h: avg(pairs24.map(p => p.outcome.price_change)),
      avg_volatility_24h: avg(pairs24.map(p => p.outcome.volatility)),
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

function classifySignal(delta: number | null, threshold: number): EdgeSignal['signal_strength'] {
  if (delta === null) return 'none';
  const abs = Math.abs(delta);
  if (abs < threshold * 0.5) return 'none';
  if (abs < threshold) return 'weak';
  if (abs < threshold * 2) return 'moderate';
  return 'strong';
}

export function buildEdgeReport(asset?: string): EdgeReport {
  const report = buildCalibrationReport(asset);
  const signals: EdgeSignal[] = [];

  if (report.total_outcomes === 0) {
    return {
      timestamp: new Date().toISOString(),
      total_snapshots: report.total_snapshots,
      total_outcomes: 0,
      coverage_pct: report.coverage_pct,
      signals: [],
      verdict: 'NO_DATA',
      summary: 'No outcomes recorded yet. Run daily pipeline and attach outcomes to build evaluation data.',
    };
  }

  // Signal 1: High QRS (>70) vs Low QRS (<40) — return separation
  const high = report.bands.find(b => b.threshold === 80);
  const low = report.bands.find(b => b.threshold === 40);
  if (high && low && high.avg_price_change_24h !== null && low.avg_price_change_24h !== null) {
    const delta = high.avg_price_change_24h - low.avg_price_change_24h;
    signals.push({
      dimension: 'score_return_separation',
      comparison: 'QRS>80 vs QRS>40 avg return 24h',
      value_a: high.avg_price_change_24h,
      value_b: low.avg_price_change_24h,
      delta,
      signal_strength: classifySignal(delta, 1.0),
      interpretation: delta < -0.5
        ? 'High QRS correlates with worse returns — potential predictive value'
        : delta > 0.5
          ? 'High QRS correlates with better returns — counter-intuitive, investigate'
          : 'No meaningful return separation between score bands',
    });
  }

  // Signal 2: High QRS volatility vs Low QRS volatility
  if (high && low && high.avg_volatility_24h !== null && low.avg_volatility_24h !== null) {
    const delta = high.avg_volatility_24h - low.avg_volatility_24h;
    signals.push({
      dimension: 'score_volatility_separation',
      comparison: 'QRS>80 vs QRS>40 avg volatility 24h',
      value_a: high.avg_volatility_24h,
      value_b: low.avg_volatility_24h,
      delta,
      signal_strength: classifySignal(delta, 0.01),
      interpretation: delta > 0.005
        ? 'High QRS correlates with higher volatility — system sees structural risk'
        : 'No volatility separation between score bands',
    });
  }

  // Signal 3: State-based return separation
  const fragile = report.by_state['structurally_fragile'];
  const secure = report.by_state['secure'];
  if (fragile?.avg_price_change_24h !== null && secure?.avg_price_change_24h !== null
    && fragile?.avg_price_change_24h !== undefined && secure?.avg_price_change_24h !== undefined) {
    const delta = fragile.avg_price_change_24h - secure.avg_price_change_24h;
    signals.push({
      dimension: 'state_return_separation',
      comparison: 'fragile vs secure avg return 24h',
      value_a: fragile.avg_price_change_24h,
      value_b: secure.avg_price_change_24h,
      delta,
      signal_strength: classifySignal(delta, 1.0),
      interpretation: delta < -0.5
        ? 'Fragile state predicts worse returns than secure — meaningful separation'
        : 'State labels do not yet separate returns meaningfully',
    });
  }

  // Signal 4: State-based volatility separation
  if (fragile?.avg_volatility_24h !== null && secure?.avg_volatility_24h !== null
    && fragile?.avg_volatility_24h !== undefined && secure?.avg_volatility_24h !== undefined) {
    const delta = fragile.avg_volatility_24h - secure.avg_volatility_24h;
    signals.push({
      dimension: 'state_volatility_separation',
      comparison: 'fragile vs secure avg volatility 24h',
      value_a: fragile.avg_volatility_24h,
      value_b: secure.avg_volatility_24h,
      delta,
      signal_strength: classifySignal(delta, 0.01),
      interpretation: delta > 0.005
        ? 'Fragile state has higher volatility — structural risk signal present'
        : 'No volatility difference between state labels',
    });
  }

  // Determine verdict
  const strongSignals = signals.filter(s => s.signal_strength === 'strong').length;
  const moderateSignals = signals.filter(s => s.signal_strength === 'moderate').length;

  let verdict: EdgeReport['verdict'];
  let summary: string;

  if (strongSignals >= 2) {
    verdict = 'EDGE_DETECTED';
    summary = `${strongSignals} strong signals found. System shows consistent separation between score/state bands. Ready for amplification.`;
  } else if (strongSignals >= 1 || moderateSignals >= 2) {
    verdict = 'POSSIBLE_EDGE';
    summary = `${strongSignals} strong + ${moderateSignals} moderate signals. Potential edge exists but needs more data to confirm.`;
  } else if (moderateSignals >= 1) {
    verdict = 'WEAK_SIGNAL';
    summary = `Only weak/moderate signals found. System may see something but not strong enough yet.`;
  } else {
    verdict = 'NO_SIGNAL';
    summary = 'No meaningful separation found between score bands or state labels. Features may not be market-relevant at current horizon.';
  }

  return {
    timestamp: new Date().toISOString(),
    total_snapshots: report.total_snapshots,
    total_outcomes: report.total_outcomes,
    coverage_pct: report.coverage_pct,
    signals,
    verdict,
    summary,
  };
}
