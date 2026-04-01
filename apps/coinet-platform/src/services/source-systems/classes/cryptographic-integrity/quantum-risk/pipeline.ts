/**
 * V1 Loop Pipeline — full orchestrator with build checkpoints.
 *
 * Flow:
 *   Input → Classify → Features → Score → Scenarios → Judgment → Snapshot
 *
 * Checkpoints:
 *   1. key_exposure_rate computable
 *   2. dormant_vulnerable_supply computable
 *   3. QRS computable
 *   4. full judgment output
 *   5. snapshot stored + retrievable
 */

import type {
  QuantumRiskPipelineInput,
  QuantumRiskSnapshot,
  DegradationState,
  FeatureOutput,
  DormantSupplyFeature,
  QuantumRiskScore,
  Scenario,
  QuantumJudgment,
} from './types';
import { LOGIC_VERSION } from './types';
import { classifyBtcScripts } from './btc-script-classifier';
import { computeKeyExposureRate, computeDormantVulnerableSupply, computePqMigrationProgress } from './features';
import { computeQuantumRiskScore } from './scoring';
import { evaluateScenarios } from './scenarios';
import { produceQuantumJudgment } from './judgment';
import { storeSnapshot, getSnapshot } from './snapshot';

export interface PipelineResult {
  success: boolean;
  snapshot: QuantumRiskSnapshot;
  checkpoints: CheckpointReport;
  degradation: PipelineDegradation;
}

export interface CheckpointReport {
  cp1_exposure_rate: boolean;
  cp2_dormant_supply: boolean;
  cp3_qrs: boolean;
  cp4_judgment: boolean;
  cp5_snapshot_stored: boolean;
}

export interface PipelineDegradation {
  state: DegradationState;
  missing_inputs: string[];
  confidence_penalty: number;
}

export function runQuantumRiskPipeline(input: QuantumRiskPipelineInput): PipelineResult {
  const missing: string[] = [];
  let confidencePenalty = 0;

  if (!input.scriptDistribution) { missing.push('scriptDistribution'); confidencePenalty += 0.2; }
  if (!input.dormantCohorts) { missing.push('dormantCohorts'); confidencePenalty += 0.2; }
  if (!input.pqEvidence) { missing.push('pqEvidence'); confidencePenalty += 0.2; }

  const degradationState: DegradationState =
    missing.length === 0 ? 'healthy'
      : missing.length <= 1 ? 'partial'
        : 'degraded';

  // ── Section 2: Classify ────────────────────────────────────────────────
  const classification = classifyBtcScripts(input.scriptDistribution);

  // ── Section 3: Features ────────────────────────────────────────────────
  // Checkpoint 1: key_exposure_rate
  const keyExposure = computeKeyExposureRate(classification, input.totalSupply);
  keyExposure.confidence = Math.max(0, keyExposure.confidence - confidencePenalty);
  const cp1 = keyExposure.value > 0 || keyExposure.degradation_state !== 'degraded';

  // Checkpoint 2: dormant_vulnerable_supply
  const dormantSupply = computeDormantVulnerableSupply(classification, input.dormantCohorts);
  dormantSupply.confidence = Math.max(0, dormantSupply.confidence - confidencePenalty);
  const cp2 = dormantSupply.base > 0 || input.dormantCohorts !== null;

  // Feature 3: pq_migration_progress
  const pqMigration = computePqMigrationProgress(input.pqEvidence);
  pqMigration.confidence = Math.max(0, pqMigration.confidence - confidencePenalty);

  // ── Section 4: Score ───────────────────────────────────────────────────
  // Checkpoint 3: QRS
  const score = computeQuantumRiskScore(keyExposure, dormantSupply, pqMigration);
  const cp3 = score.value >= 0;

  // ── Section 5: Scenarios ───────────────────────────────────────────────
  const scenarios = evaluateScenarios(score, keyExposure, dormantSupply);

  // ── Section 6: Judgment ────────────────────────────────────────────────
  // Checkpoint 4: full judgment
  const judgment = produceQuantumJudgment(score, scenarios, keyExposure, dormantSupply, pqMigration, missing);
  const cp4 = judgment.state !== undefined && judgment.confidence >= 0;

  // ── Section 7: Snapshot ────────────────────────────────────────────────
  // Checkpoint 5: stored + retrievable
  const rawInputs = {
    scriptDistribution: input.scriptDistribution,
    dormantCohorts: input.dormantCohorts,
    pqEvidence: input.pqEvidence,
    totalSupply: input.totalSupply,
  };

  const snapshot = storeSnapshot(
    input.asset,
    rawInputs,
    { key_exposure_rate: keyExposure, dormant_vulnerable_supply: dormantSupply, pq_migration_progress: pqMigration },
    score,
    scenarios,
    judgment,
  );
  const retrieved = getSnapshot(snapshot.id);
  const cp5 = retrieved !== undefined && retrieved.id === snapshot.id;

  return {
    success: cp1 && cp3 && cp4 && cp5,
    snapshot,
    checkpoints: {
      cp1_exposure_rate: cp1,
      cp2_dormant_supply: cp2,
      cp3_qrs: cp3,
      cp4_judgment: cp4,
      cp5_snapshot_stored: cp5,
    },
    degradation: {
      state: degradationState,
      missing_inputs: missing,
      confidence_penalty: confidencePenalty,
    },
  };
}

/**
 * Run with BTC defaults — the canonical first execution target.
 */
export function runBtcQuantumRisk(): PipelineResult {
  return runQuantumRiskPipeline({
    asset: 'BTC',
    totalSupply: 19_700_000,
    scriptDistribution: {
      p2pk: 1_700_000,
      p2pkh: 8_500_000,
      p2wpkh: 5_200_000,
      p2tr: 1_500_000,
      p2sh: 1_800_000,
      unknown: 1_000_000,
      total: 19_700_000,
    },
    dormantCohorts: {
      gt_5y: 3_900_000,
      gt_7y: 2_800_000,
      gt_10y: 1_700_000,
    },
    pqEvidence: {
      hasProposal: true,
      hasImplementation: false,
      hasDeployment: false,
      lastUpdate: '2024-06-15T00:00:00Z',
    },
  });
}
