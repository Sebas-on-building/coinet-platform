/**
 * Snapshot Writer — captures full judgment state for calibration.
 *
 * Wired into produceJudgment so every meaningful judgment persists
 * immediately. This is Gate 1 of the Calibration Spine.
 */

import type { JudgmentSnapshotRecord } from './types';
import { CALIBRATION_SPINE_VERSION } from './types';

const snapshotStore: JudgmentSnapshotRecord[] = [];
let nextId = 1;

export interface CaptureJudgmentSnapshotInput {
  assetCanonicalId: string;
  assetSymbol: string;
  chainId?: string;
  priceAtJudgment: number;

  regimePrimary?: string;
  regimeSecondary?: string;
  regimeConfidence?: number;
  sequenceState?: string;
  timingPhase?: string;

  primaryHypothesisId: string;
  primaryHypothesisScore: number;
  primaryHypothesisConfidence: number;
  secondaryHypothesisId?: string;
  secondaryHypothesisScore?: number;
  confidenceSpread?: number;
  ambiguityLevel: string;

  opportunityScore?: number;
  riskScore?: number;
  timingScore?: number;
  qualityScore?: number;
  signalConfidence: number;

  contradictionLoad: number;
  contradictionClasses: string[];
  coverageScore: number;
  degradedDomains: string[];
  decisiveMissingEvidence: string[];

  scoreConfigVersion?: string;
  hypothesisConfigVersion: string;
  regimeConfigVersion?: string;
  confidenceConfigVersion?: string;
}

export function captureJudgmentSnapshot(input: CaptureJudgmentSnapshotInput): JudgmentSnapshotRecord {
  const now = new Date().toISOString();
  const record: JudgmentSnapshotRecord = {
    id: `js-${nextId++}-${Date.now()}`,
    createdAt: now,
    judgmentTimestamp: now,
    calibrationSpineVersion: CALIBRATION_SPINE_VERSION,
    ...input,
  };

  snapshotStore.push(record);
  if (snapshotStore.length > 2000) snapshotStore.splice(0, snapshotStore.length - 2000);

  return record;
}

export function getSnapshotsForAsset(assetId: string, fromTs?: number): JudgmentSnapshotRecord[] {
  return snapshotStore.filter(s => {
    if (s.assetCanonicalId !== assetId) return false;
    if (fromTs && new Date(s.judgmentTimestamp).getTime() < fromTs) return false;
    return true;
  });
}

export function getAllRecentSnapshots(windowMs: number): JudgmentSnapshotRecord[] {
  const cutoff = Date.now() - windowMs;
  return snapshotStore.filter(s => new Date(s.judgmentTimestamp).getTime() >= cutoff);
}

export function getSnapshotById(id: string): JudgmentSnapshotRecord | undefined {
  return snapshotStore.find(s => s.id === id);
}

export function getSnapshotsAwaitingOutcome(
  window: string,
  maxAgeMs: number,
): JudgmentSnapshotRecord[] {
  const now = Date.now();
  return snapshotStore.filter(s => {
    const age = now - new Date(s.judgmentTimestamp).getTime();
    return age >= maxAgeMs && age < maxAgeMs * 2;
  });
}

export function getSnapshotCount(): number {
  return snapshotStore.length;
}
