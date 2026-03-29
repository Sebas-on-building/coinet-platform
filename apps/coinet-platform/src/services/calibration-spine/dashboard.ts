/**
 * Calibration Dashboard API — internal trust surface queries.
 *
 * Makes calibration results visible and operational.
 * This is Gate 4 of the Calibration Spine.
 */

import type { OutcomeWindow, TrustSurface, CalibrationAggregateRecord } from './types';
import { OUTCOME_WINDOWS } from './types';
import { getAllRecentSnapshots } from './snapshot-writer';
import { getOutcomesByWindow } from './outcome-resolver';
import { buildTrustSurface, computeAggregates, getRecentAggregates } from './aggregator';
import { getSnapshotCount } from './snapshot-writer';
import { getResolvedOutcomeCount } from './outcome-resolver';

interface Pair {
  snapshot: any;
  outcome: any;
}

function buildPairs(window: OutcomeWindow): Pair[] {
  const outcomes = getOutcomesByWindow(window);
  const snapshotMap = new Map<string, any>();

  for (const s of getAllRecentSnapshots(90 * 24 * 60 * 60 * 1000)) {
    snapshotMap.set(s.id, s);
  }

  const pairs: Pair[] = [];
  for (const o of outcomes) {
    const snapshot = snapshotMap.get(o.snapshotId);
    if (snapshot) pairs.push({ snapshot, outcome: o });
  }
  return pairs;
}

export interface CalibrationDashboardSummary {
  snapshotCount: number;
  outcomeCount: number;
  trustSurfaces: Partial<Record<OutcomeWindow, TrustSurface>>;
  recentAggregates: CalibrationAggregateRecord[];
  status: 'healthy' | 'insufficient_data' | 'degraded';
  statusReason: string;
}

export function getCalibrationDashboard(windows?: OutcomeWindow[]): CalibrationDashboardSummary {
  const targetWindows = windows ?? ['24h', '7d'] as OutcomeWindow[];
  const snapshotCount = getSnapshotCount();
  const outcomeCount = getResolvedOutcomeCount();

  if (snapshotCount < 10) {
    return {
      snapshotCount, outcomeCount,
      trustSurfaces: {},
      recentAggregates: [],
      status: 'insufficient_data',
      statusReason: `Only ${snapshotCount} snapshots captured. Need at least 30 for meaningful calibration.`,
    };
  }

  const trustSurfaces: Partial<Record<OutcomeWindow, TrustSurface>> = {};

  for (const w of targetWindows) {
    const pairs = buildPairs(w);
    if (pairs.length >= 10) {
      trustSurfaces[w] = buildTrustSurface(pairs, w);
    }
  }

  const hasSurfaces = Object.keys(trustSurfaces).length > 0;
  let status: 'healthy' | 'insufficient_data' | 'degraded' = 'healthy';
  let statusReason = 'Calibration spine is operational.';

  if (!hasSurfaces) {
    status = 'insufficient_data';
    statusReason = `${outcomeCount} outcomes resolved but not enough paired data for trust surfaces yet.`;
  } else {
    for (const [w, surface] of Object.entries(trustSurfaces)) {
      if (surface && surface.sampleCount < 30) {
        status = 'degraded';
        statusReason = `${w} window has only ${surface.sampleCount} paired samples. Results are provisional.`;
        break;
      }
    }
  }

  return {
    snapshotCount,
    outcomeCount,
    trustSurfaces,
    recentAggregates: getRecentAggregates(undefined, 20),
    status,
    statusReason,
  };
}

export function recomputeAggregates(window: OutcomeWindow): CalibrationAggregateRecord[] {
  const pairs = buildPairs(window);
  if (pairs.length < 5) return [];
  return computeAggregates(pairs, window);
}
