/**
 * Section 3 — Feature Layer
 *
 * Feature 1: key_exposure_rate
 *   = (exposed * 1.0 + semi_exposed * 0.5 + unknown * 0.3) / total_supply
 *
 * Feature 2: dormant_vulnerable_supply
 *   base = exposed_dormant + semi_exposed_dormant
 *   lower = base * 0.85, upper = base * 1.15
 *   normalized = min(base / 2_500_000, 1.0)
 *
 * Feature 3: pq_migration_progress
 *   noProposal → 0.0
 *   proposalOnly → 0.2
 *   implementation → 0.5
 *   deployment → 0.8
 *   if stale → -0.1
 */

import type {
  ExposureClassification,
  DormantCohorts,
  PQEvidence,
  FeatureOutput,
  DormantSupplyFeature,
  DegradationState,
} from './types';
import { EXPOSURE_WEIGHTS } from './btc-script-classifier';

const DORMANT_SIGMOID_SCALE = 3_000_000;
const STALE_THRESHOLD_MS = 180 * 24 * 60 * 60 * 1000;

export function computeKeyExposureRate(
  classification: ExposureClassification | null,
  totalSupply: number,
  freshnessSeconds: number = 0,
): FeatureOutput {
  if (!classification || totalSupply <= 0) {
    return { value: 0, confidence: 0, freshness: 0, degradation_state: 'degraded' };
  }

  const weighted =
    classification.exposed * EXPOSURE_WEIGHTS.exposed +
    classification.semi_exposed * EXPOSURE_WEIGHTS.semi_exposed +
    classification.unknown * EXPOSURE_WEIGHTS.unknown +
    classification.safe * EXPOSURE_WEIGHTS.safe;

  const value = Math.min(weighted / totalSupply, 1.0);

  const total = classification.exposed + classification.semi_exposed + classification.safe + classification.unknown;
  const unknownRatio = total > 0 ? classification.unknown / total : 1;
  const confidence = Math.max(0.2, 1.0 - unknownRatio * 0.5);

  let degradation: DegradationState = 'healthy';
  if (unknownRatio > 0.3) degradation = 'partial';
  if (unknownRatio > 0.5) degradation = 'degraded';

  return { value, confidence, freshness: freshnessSeconds, degradation_state: degradation };
}

export function computeDormantVulnerableSupply(
  classification: ExposureClassification | null,
  dormant: DormantCohorts | null,
): DormantSupplyFeature {
  if (!classification || !dormant) {
    return { base: 0, lower: 0, upper: 0, normalized: 0, confidence: 0 };
  }

  const totalClassified = classification.exposed + classification.semi_exposed + classification.safe + classification.unknown;
  if (totalClassified <= 0) {
    return { base: 0, lower: 0, upper: 0, normalized: 0, confidence: 0 };
  }

  const exposedRatio = classification.exposed / totalClassified;
  const semiRatio = classification.semi_exposed / totalClassified;

  const dormantExposed = dormant.gt_5y * exposedRatio;
  const dormantSemi = dormant.gt_5y * semiRatio;

  const base = Math.round(dormantExposed + dormantSemi);
  const lower = Math.round(base * 0.85);
  const upper = Math.round(base * 1.15);
  const normalized = 1 - Math.exp(-base / DORMANT_SIGMOID_SCALE);

  const hasDormantData = dormant.gt_5y > 0;
  const confidence = hasDormantData ? 0.75 : 0.3;

  return { base, lower, upper, normalized, confidence };
}

export function computePqMigrationProgress(
  evidence: PQEvidence | null,
): FeatureOutput {
  if (!evidence) {
    return { value: 0, confidence: 0.2, freshness: 0, degradation_state: 'degraded' };
  }

  let value: number;
  if (evidence.hasDeployment) value = 0.8;
  else if (evidence.hasImplementation) value = 0.5;
  else if (evidence.hasProposal) value = 0.2;
  else value = 0.0;

  const now = Date.now();
  const lastUpdate = new Date(evidence.lastUpdate).getTime();
  const ageMs = Number.isNaN(lastUpdate) ? Infinity : now - lastUpdate;
  const isStale = ageMs > STALE_THRESHOLD_MS;

  if (isStale) value = Math.max(0, value - 0.1);

  const confidence = isStale ? 0.5 : 0.85;
  const freshness = Number.isFinite(ageMs) ? ageMs / 1000 : 0;
  const degradation: DegradationState = isStale ? 'partial' : evidence.hasProposal ? 'healthy' : 'partial';

  return { value: Math.max(0, Math.min(1, value)), confidence, freshness, degradation_state: degradation };
}
