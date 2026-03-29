/**
 * Outcome Resolver — resolves forward outcomes for matured judgment windows.
 *
 * Captures path metrics (excursion, drawdown, volatility), not only destination.
 * This is Gate 2 of the Calibration Spine.
 */

import type { ForwardOutcomeRecord, OutcomeWindow, JudgmentSnapshotRecord } from './types';
import { OUTCOME_WINDOWS, WINDOW_MS } from './types';
import { getAllRecentSnapshots } from './snapshot-writer';

export interface PricePathProvider {
  getCurrentPrice(assetId: string): Promise<number | null>;
  getPricePath(assetId: string, fromMs: number, toMs: number): Promise<PricePoint[]>;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

const outcomeStore: ForwardOutcomeRecord[] = [];
const resolvedKeys = new Set<string>();
let nextOutcomeId = 1;

function outcomeKey(snapshotId: string, window: OutcomeWindow): string {
  return `${snapshotId}:${window}`;
}

export function computePathMetrics(
  startPrice: number,
  path: PricePoint[],
): {
  endPrice: number;
  endReturn: number;
  maxUpsideExcursion: number;
  maxDownsideExcursion: number;
  maxDrawdown: number;
  realizedVolatility: number;
  pathReturn: number;
  continuationStrength: number;
  reversalSeverity: number;
} {
  if (path.length === 0 || startPrice <= 0) {
    return {
      endPrice: startPrice, endReturn: 0,
      maxUpsideExcursion: 0, maxDownsideExcursion: 0, maxDrawdown: 0,
      realizedVolatility: 0, pathReturn: 0,
      continuationStrength: 0, reversalSeverity: 0,
    };
  }

  const endPrice = path[path.length - 1].price;
  const endReturn = (endPrice - startPrice) / startPrice;

  let maxUp = 0;
  let maxDown = 0;
  let peak = startPrice;
  let worstDrawdown = 0;
  const returns: number[] = [];
  let prevPrice = startPrice;

  for (const p of path) {
    const ret = (p.price - startPrice) / startPrice;
    if (ret > maxUp) maxUp = ret;
    if (ret < maxDown) maxDown = ret;

    if (p.price > peak) peak = p.price;
    const dd = (peak - p.price) / peak;
    if (dd > worstDrawdown) worstDrawdown = dd;

    if (prevPrice > 0) {
      returns.push((p.price - prevPrice) / prevPrice);
    }
    prevPrice = p.price;
  }

  let realizedVol = 0;
  if (returns.length > 1) {
    const mean = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance = returns.reduce((s, v) => s + (v - mean) ** 2, 0) / (returns.length - 1);
    realizedVol = Math.sqrt(variance);
  }

  const direction = endReturn >= 0 ? 1 : -1;
  const continuationStrength = direction > 0
    ? Math.min(1, maxUp / Math.max(0.001, Math.abs(maxDown) + maxUp))
    : 0;
  const reversalSeverity = endReturn >= 0
    ? Math.min(1, Math.abs(maxDown))
    : Math.min(1, worstDrawdown);

  return {
    endPrice, endReturn,
    maxUpsideExcursion: maxUp,
    maxDownsideExcursion: maxDown,
    maxDrawdown: worstDrawdown,
    realizedVolatility: realizedVol,
    pathReturn: endReturn,
    continuationStrength,
    reversalSeverity,
  };
}

function determineDirectionCorrect(
  snapshot: JudgmentSnapshotRecord,
  endReturn: number,
): boolean | null {
  const os = snapshot.opportunityScore;
  if (os == null) return null;
  if (os > 60 && endReturn > 0.01) return true;
  if (os < 40 && endReturn < -0.01) return true;
  if (os > 60 && endReturn < -0.01) return false;
  if (os < 40 && endReturn > 0.01) return false;
  return null;
}

export async function resolveOutcomesForWindow(
  window: OutcomeWindow,
  priceProvider: PricePathProvider,
): Promise<number> {
  const windowMs = WINDOW_MS[window];
  const eligible = getAllRecentSnapshots(windowMs * 3).filter(s => {
    const age = Date.now() - new Date(s.judgmentTimestamp).getTime();
    return age >= windowMs && !resolvedKeys.has(outcomeKey(s.id, window));
  });

  let resolved = 0;

  for (const snapshot of eligible) {
    const key = outcomeKey(snapshot.id, window);
    if (resolvedKeys.has(key)) continue;

    try {
      const snapshotTs = new Date(snapshot.judgmentTimestamp).getTime();
      const path = await priceProvider.getPricePath(
        snapshot.assetCanonicalId,
        snapshotTs,
        snapshotTs + windowMs,
      );

      if (path.length === 0) continue;

      const metrics = computePathMetrics(snapshot.priceAtJudgment, path);
      const directionCorrect = determineDirectionCorrect(snapshot, metrics.endReturn);

      const record: ForwardOutcomeRecord = {
        id: `fo-${nextOutcomeId++}-${Date.now()}`,
        snapshotId: snapshot.id,
        window,
        resolvedAt: new Date().toISOString(),
        ...metrics,
        directionCorrect,
      };

      outcomeStore.push(record);
      resolvedKeys.add(key);
      resolved++;

      if (outcomeStore.length > 5000) outcomeStore.splice(0, outcomeStore.length - 5000);
    } catch {
      // non-blocking — will retry next cycle
    }
  }

  return resolved;
}

export async function resolveAllWindows(priceProvider: PricePathProvider): Promise<Record<OutcomeWindow, number>> {
  const results = {} as Record<OutcomeWindow, number>;
  for (const w of OUTCOME_WINDOWS) {
    results[w] = await resolveOutcomesForWindow(w, priceProvider);
  }
  return results;
}

export function getOutcomesForSnapshot(snapshotId: string): ForwardOutcomeRecord[] {
  return outcomeStore.filter(o => o.snapshotId === snapshotId);
}

export function getOutcomesByWindow(window: OutcomeWindow): ForwardOutcomeRecord[] {
  return outcomeStore.filter(o => o.window === window);
}

export function getResolvedOutcomeCount(): number {
  return outcomeStore.length;
}
