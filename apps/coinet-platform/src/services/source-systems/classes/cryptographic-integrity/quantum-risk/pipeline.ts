/**
 * V1 Loop Pipeline — full orchestrator with build checkpoints.
 *
 * Flow:
 *   Input → L1.3 Resolve → Classify → Features → Score → Scenarios → Judgment → Snapshot
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
import type { RedundancyDiagnostics } from './redundancy-types';
import { resolveAllQuantumFields } from './redundancy-resolver';
import type { FieldSourceCandidate } from './redundancy-types';
import type { SourceHealthDiagnostics, TrustClass } from './source-health-types';
import { scoreAllQuantumSources, computeConfidencePenaltyFromHealth } from './source-health-scorer';
import type { QuantumFieldSource } from './source-health-scorer';
import type { ConflictDiagnostics, ConflictCandidate } from './conflict-types';
import { resolveAllConflicts, clearConflictState } from './conflict-resolver';
import type { DegradationDiagnostics } from './degradation-types';
import { evaluateAllDegradation, clearDegradationLedger } from './degradation-engine';
import type { DetectionInput } from './degradation-engine';

export interface PipelineResult {
  success: boolean;
  snapshot: QuantumRiskSnapshot;
  checkpoints: CheckpointReport;
  degradation: PipelineDegradation;
  redundancy?: RedundancyDiagnostics;
  sourceHealth?: SourceHealthDiagnostics;
  conflicts?: ConflictDiagnostics;
  semanticDegradation?: DegradationDiagnostics;
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

function buildCandidate(
  sourceId: string,
  data: unknown,
  observedAt?: string,
  healthScore?: number,
): FieldSourceCandidate | null {
  if (data === null || data === undefined) return null;
  return {
    sourceId,
    data,
    observedAt: observedAt ?? new Date().toISOString(),
    freshness: 'live',
    healthScore: healthScore ?? 1.0,
    schemaVersion: LOGIC_VERSION,
  };
}

function buildHealthInput(
  sourceId: string,
  trustClass: TrustClass,
  data: unknown,
  observedAt?: string,
  availabilityScore?: number,
): QuantumFieldSource | null {
  if (data === null || data === undefined) return null;
  return { sourceId, trustClass, data, observedAt, availabilityScore };
}

export function runQuantumRiskPipeline(input: QuantumRiskPipelineInput): PipelineResult {
  // ── L1.4: Score source health across all 5 dimensions ─────────────────
  const now = new Date().toISOString();
  const { records: healthRecords, diagnostics: healthDiag } = scoreAllQuantumSources({
    scriptDistribution: buildHealthInput('btc_chain_index', 'verified_chain_data', input.scriptDistribution, now, 1.0),
    dormantCohorts: buildHealthInput('btc_chain_index', 'verified_chain_data', input.dormantCohorts, now, 1.0),
    pqEvidence: buildHealthInput('btc_protocol_evidence', 'official_protocol_evidence', input.pqEvidence, input.pqEvidence?.lastUpdate, 1.0),
    totalSupply: buildHealthInput('btc_chain_index', 'verified_chain_data', input.totalSupply, now, 1.0),
    btcPriceContext: null,
    outcomeMetrics: null,
  });

  // ── L1.5: Conflict resolution when secondary sources exist ──────────────
  clearConflictState();
  let conflictDiag: ConflictDiagnostics | undefined;
  let conflictPenalty = 0;

  const sec = input.secondary;
  if (sec) {
    const conflictPairs: Record<string, { a: ConflictCandidate; b: ConflictCandidate } | null> = {};

    const primaryAuthority = 0.95;
    const secondaryAuthority = 0.75;

    if (sec.scriptDistribution && input.scriptDistribution) {
      conflictPairs.scriptDistribution = {
        a: { sourceId: 'btc_chain_index', data: input.scriptDistribution, observedAt: now,
             authorityLevel: primaryAuthority, healthScore: healthRecords.scriptDistribution?.sourceUsabilityScore ?? 1.0,
             trustClass: 'verified_chain_data' },
        b: { sourceId: sec.scriptDistribution.sourceId, data: sec.scriptDistribution.data,
             observedAt: sec.scriptDistribution.observedAt, authorityLevel: secondaryAuthority,
             healthScore: 0.85, trustClass: sec.scriptDistribution.trustClass ?? 'trusted_external_analytics' },
      };
    }
    if (sec.dormantCohorts && input.dormantCohorts) {
      conflictPairs.dormantCohorts = {
        a: { sourceId: 'btc_chain_index', data: input.dormantCohorts, observedAt: now,
             authorityLevel: primaryAuthority, healthScore: healthRecords.dormantCohorts?.sourceUsabilityScore ?? 1.0,
             trustClass: 'verified_chain_data' },
        b: { sourceId: sec.dormantCohorts.sourceId, data: sec.dormantCohorts.data,
             observedAt: sec.dormantCohorts.observedAt, authorityLevel: secondaryAuthority,
             healthScore: 0.85, trustClass: sec.dormantCohorts.trustClass ?? 'trusted_external_analytics' },
      };
    }
    if (sec.pqEvidence && input.pqEvidence) {
      conflictPairs.pqEvidence = {
        a: { sourceId: 'btc_protocol_evidence', data: input.pqEvidence, observedAt: input.pqEvidence.lastUpdate,
             authorityLevel: primaryAuthority, healthScore: healthRecords.pqEvidence?.sourceUsabilityScore ?? 1.0,
             trustClass: 'official_protocol_evidence' },
        b: { sourceId: sec.pqEvidence.sourceId, data: sec.pqEvidence.data,
             observedAt: sec.pqEvidence.observedAt, authorityLevel: secondaryAuthority,
             healthScore: 0.85, trustClass: sec.pqEvidence.trustClass ?? 'official_protocol_evidence' },
      };
    }
    if (sec.totalSupply && input.totalSupply) {
      conflictPairs.totalSupply = {
        a: { sourceId: 'btc_chain_index', data: input.totalSupply, observedAt: now,
             authorityLevel: primaryAuthority, healthScore: healthRecords.totalSupply?.sourceUsabilityScore ?? 1.0,
             trustClass: 'verified_chain_data' },
        b: { sourceId: sec.totalSupply.sourceId, data: sec.totalSupply.data,
             observedAt: sec.totalSupply.observedAt, authorityLevel: secondaryAuthority,
             healthScore: 0.85, trustClass: sec.totalSupply.trustClass ?? 'trusted_external_analytics' },
      };
    }

    if (Object.values(conflictPairs).some(p => p !== null)) {
      const conflictResult = resolveAllConflicts(conflictPairs);
      conflictDiag = conflictResult.diagnostics;
      conflictPenalty = conflictDiag.totalConfidencePenalty;
    }
  }

  // ── L1.3: Resolve sources through redundancy matrix (fed by L1.4 health) ──
  const { results: resolved, diagnostics: redundancyDiag } = resolveAllQuantumFields({
    scriptDistribution: {
      primary: buildCandidate('btc_chain_index', input.scriptDistribution, now, healthRecords.scriptDistribution?.sourceUsabilityScore),
      secondary: null,
    },
    dormantCohorts: {
      primary: buildCandidate('btc_chain_index', input.dormantCohorts, now, healthRecords.dormantCohorts?.sourceUsabilityScore),
      secondary: null,
    },
    pqEvidence: {
      primary: buildCandidate('btc_protocol_evidence', input.pqEvidence, input.pqEvidence?.lastUpdate, healthRecords.pqEvidence?.sourceUsabilityScore),
      secondary: null,
    },
    totalSupply: {
      primary: buildCandidate('btc_chain_index', { value: input.totalSupply }, now, healthRecords.totalSupply?.sourceUsabilityScore),
      secondary: null,
    },
  });

  const missing: string[] = [];
  let confidencePenalty = 0;

  // L1.3 resolution penalties
  for (const [field, result] of Object.entries(resolved)) {
    if (!result.usable) {
      missing.push(field);
      confidencePenalty += result.resolution.confidencePenalty;
    } else if (result.resolution.confidencePenalty > 0) {
      confidencePenalty += result.resolution.confidencePenalty;
    }
  }

  // L1.4 health-based penalties (additive to L1.3)
  for (const [field, record] of Object.entries(healthRecords)) {
    const healthPenalty = computeConfidencePenaltyFromHealth(record);
    if (healthPenalty > 0) {
      confidencePenalty += healthPenalty;
    }
  }

  // L1.5 conflict penalties (additive)
  confidencePenalty += conflictPenalty;

  if (!input.scriptDistribution) { if (!missing.includes('scriptDistribution')) { missing.push('scriptDistribution'); confidencePenalty += 0.2; } }
  if (!input.dormantCohorts) { if (!missing.includes('dormantCohorts')) { missing.push('dormantCohorts'); confidencePenalty += 0.2; } }
  if (!input.pqEvidence) { if (!missing.includes('pqEvidence')) { missing.push('pqEvidence'); confidencePenalty += 0.2; } }

  // ── L1.6: Evaluate semantic degradation across all fields ──────────────
  clearDegradationLedger();
  const coreFields = ['scriptDistribution', 'dormantCohorts', 'pqEvidence', 'totalSupply'];
  const degradationInputs: Record<string, DetectionInput> = {};

  for (const fieldName of coreFields) {
    const healthRec = healthDiag.records.find(r => r.fieldName === fieldName);
    const redundancyRec = redundancyDiag.resolutions.find(r => r.fieldName === fieldName);
    const conflictRec = conflictDiag?.records.find(r => r.fieldName === fieldName);

    degradationInputs[fieldName] = {
      fieldName,
      sourceId: healthRec?.sourceId,
      dataPresent: !missing.includes(fieldName),
      healthRecord: healthRec,
      redundancyRecord: redundancyRec,
      conflictRecord: conflictRec,
    };
  }

  const { diagnostics: semDegDiag } = evaluateAllDegradation({ fields: degradationInputs });

  // L1.6 adds its own penalty on top (from degradation rules, not double-counted with L1.3/L1.4/L1.5)
  confidencePenalty += semDegDiag.totalFieldPenalty;

  const degradationState: DegradationState =
    missing.length === 0 && semDegDiag.totalEvents === 0 ? 'healthy'
      : missing.length <= 1 && !semDegDiag.forceInsufficientData ? 'partial'
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
    redundancy: redundancyDiag,
    sourceHealth: healthDiag,
    conflicts: conflictDiag,
    semanticDegradation: semDegDiag,
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
