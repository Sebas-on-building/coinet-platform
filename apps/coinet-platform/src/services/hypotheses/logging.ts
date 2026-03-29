/**
 * Hypothesis Judgment Persistence — logs every hypothesis ranking for calibration.
 */

import type { HypothesisOutput, CoverageState } from './types';
import type { HypothesisConfigVersions } from './versioning';

export interface PersistHypothesisJudgmentInput {
  assetCanonicalId: string;
  assetSymbol?: string;
  chainId?: string;
  judgmentTimestamp: Date;
  regimePrimary?: string;
  regimeSecondary?: string;
  sequenceState?: string;
  timingPhase?: string;
  hypothesisOutput: HypothesisOutput;
  coverage: CoverageState;
  configVersions: HypothesisConfigVersions;
  contradictionLoad?: number;
  sourceTraceIds?: string[];
}

export interface HypothesisSnapshotRecord {
  assetCanonicalId: string;
  assetSymbol?: string;
  chainId?: string;
  judgmentTimestamp: string;
  regimePrimary?: string;
  regimeSecondary?: string;
  sequenceState?: string;
  timingPhase?: string;
  primaryHypothesisId: string;
  primaryScore: number;
  primaryConfidence: number;
  secondaryHypothesisId?: string;
  secondaryScore?: number;
  secondaryConfidence?: number;
  confidenceSpread?: number;
  ambiguityLevel: string;
  outputVersion: string;
  hypothesisConfigVersion: string;
  regimeConfigVersion?: string;
  scoringConfigVersion?: string;
  contradictionLoad?: number;
  coverageScore: number;
  degradedDomains: string[];
  decisiveMissingEvidence: string[];
  rankingExplanation: string[];
  evidenceLinks: object;
  invalidationStatus: object;
  triggeredRules: object;
  sourceTraceIds?: string[];
}

export function buildHypothesisSnapshot(input: PersistHypothesisJudgmentInput): HypothesisSnapshotRecord {
  const { hypothesisOutput: h, coverage, configVersions } = input;
  const spread = h.secondary ? h.primary.score - h.secondary.score : undefined;

  return {
    assetCanonicalId: input.assetCanonicalId,
    assetSymbol: input.assetSymbol,
    chainId: input.chainId,
    judgmentTimestamp: input.judgmentTimestamp.toISOString(),
    regimePrimary: input.regimePrimary,
    regimeSecondary: input.regimeSecondary,
    sequenceState: input.sequenceState,
    timingPhase: input.timingPhase,
    primaryHypothesisId: h.primary.id,
    primaryScore: h.primary.score,
    primaryConfidence: h.primary.confidence,
    secondaryHypothesisId: h.secondary?.id,
    secondaryScore: h.secondary?.score,
    secondaryConfidence: h.secondary?.confidence,
    confidenceSpread: spread,
    ambiguityLevel: h.ambiguityLevel,
    outputVersion: h.outputVersion,
    hypothesisConfigVersion: configVersions.hypothesisRegistryVersion,
    regimeConfigVersion: configVersions.regimeConfigVersion,
    scoringConfigVersion: configVersions.hypothesisScoringVersion,
    contradictionLoad: input.contradictionLoad,
    coverageScore: coverage.overallCompleteness,
    degradedDomains: [...coverage.missingDomains, ...coverage.staleDomains],
    decisiveMissingEvidence: h.decisiveMissingEvidence,
    rankingExplanation: h.rankingExplanation,
    evidenceLinks: {
      primary_support: h.primary.supportLinks.map(l => ({ key: l.evidenceKey, weight: l.weight, stale: l.stale })),
      primary_contradictions: h.primary.contradictionLinks.map(l => ({ key: l.evidenceKey, weight: l.weight })),
      primary_missing: h.primary.missingLinks.map(l => ({ key: l.evidenceKey, reason: l.reason })),
    },
    invalidationStatus: {
      primary_invalidations: h.primary.triggeredInvalidationRules,
      primary_confirmations: h.primary.triggeredConfirmationRules,
      secondary_invalidations: h.secondary?.triggeredInvalidationRules ?? [],
    },
    triggeredRules: {
      confirmation_count: h.primary.triggeredConfirmationRules.length,
      invalidation_count: h.primary.triggeredInvalidationRules.length,
    },
    sourceTraceIds: input.sourceTraceIds,
  };
}

const snapshotLog: HypothesisSnapshotRecord[] = [];

export async function persistHypothesisJudgmentSnapshot(
  input: PersistHypothesisJudgmentInput,
): Promise<HypothesisSnapshotRecord> {
  const record = buildHypothesisSnapshot(input);
  snapshotLog.push(record);
  if (snapshotLog.length > 500) snapshotLog.splice(0, snapshotLog.length - 500);
  return record;
}

export function getRecentSnapshots(limit = 50): HypothesisSnapshotRecord[] {
  return snapshotLog.slice(-limit);
}
