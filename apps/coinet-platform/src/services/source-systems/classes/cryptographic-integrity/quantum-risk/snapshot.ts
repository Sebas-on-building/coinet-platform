/**
 * Section 7 — Storage
 *
 * Snapshot MUST contain: timestamp, asset, features, score, scenarios, judgment, logic_version
 * NEVER skip snapshot. Even if degraded.
 */

import type { QuantumRiskSnapshot, SnapshotRawInputs, FeatureOutput, DormantSupplyFeature, QuantumRiskScore, Scenario, QuantumJudgment } from './types';
import { LOGIC_VERSION } from './types';

const snapshots: QuantumRiskSnapshot[] = [];
const MAX_SNAPSHOTS = 10_000;

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `qrs_${Date.now()}_${idCounter}`;
}

export function storeSnapshot(
  asset: string,
  rawInputs: SnapshotRawInputs,
  features: {
    key_exposure_rate: FeatureOutput;
    dormant_vulnerable_supply: DormantSupplyFeature;
    pq_migration_progress: FeatureOutput;
  },
  score: QuantumRiskScore,
  scenarios: Scenario[],
  judgment: QuantumJudgment,
): QuantumRiskSnapshot {
  const snapshot: QuantumRiskSnapshot = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    asset,
    raw_inputs: rawInputs,
    features,
    score,
    scenarios,
    judgment,
    logic_version: LOGIC_VERSION,
  };

  snapshots.push(snapshot);
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS);
  }

  return snapshot;
}

export function getSnapshot(id: string): QuantumRiskSnapshot | undefined {
  return snapshots.find(s => s.id === id);
}

export function getLatestSnapshot(asset: string): QuantumRiskSnapshot | undefined {
  for (let i = snapshots.length - 1; i >= 0; i--) {
    if (snapshots[i].asset === asset) return snapshots[i];
  }
  return undefined;
}

export function getSnapshotsForAsset(asset: string, limit: number = 100): QuantumRiskSnapshot[] {
  return snapshots.filter(s => s.asset === asset).slice(-limit);
}

export function getAllSnapshots(limit: number = 100): QuantumRiskSnapshot[] {
  return snapshots.slice(-limit);
}

export function getSnapshotCount(): number {
  return snapshots.length;
}
