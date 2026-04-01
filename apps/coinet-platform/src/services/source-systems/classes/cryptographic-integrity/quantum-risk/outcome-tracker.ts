/**
 * Section 8 — Outcome Tracking
 *
 * Track after: 24h, 7d
 * Metrics: price_change, volatility, event_flags
 * Link: snapshot_id → outcome
 */

import type { OutcomeData } from './types';

const outcomes: OutcomeData[] = [];
const MAX_OUTCOMES = 10_000;

export function recordOutcome(
  snapshotId: string,
  window: '24h' | '7d',
  priceChange: number,
  volatility: number,
  eventFlags: string[] = [],
): OutcomeData {
  const outcome: OutcomeData = {
    snapshot_id: snapshotId,
    window,
    price_change: priceChange,
    volatility,
    event_flags: eventFlags,
    recorded_at: new Date().toISOString(),
  };

  outcomes.push(outcome);
  if (outcomes.length > MAX_OUTCOMES) {
    outcomes.splice(0, outcomes.length - MAX_OUTCOMES);
  }

  return outcome;
}

export function getOutcomesForSnapshot(snapshotId: string): OutcomeData[] {
  return outcomes.filter(o => o.snapshot_id === snapshotId);
}

export function getOutcomesByWindow(window: '24h' | '7d', limit: number = 100): OutcomeData[] {
  return outcomes.filter(o => o.window === window).slice(-limit);
}

export function getOutcomeCount(): number {
  return outcomes.length;
}

export function getAllOutcomes(limit: number = 100): OutcomeData[] {
  return outcomes.slice(-limit);
}
