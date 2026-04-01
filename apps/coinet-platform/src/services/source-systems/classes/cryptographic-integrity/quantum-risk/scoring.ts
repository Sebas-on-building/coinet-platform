/**
 * Section 4 — Quantum Risk Score (QRS)
 *
 * Formula:
 *   QRS = 100 * (
 *     0.4 * key_exposure_rate +
 *     0.4 * dormant_vulnerable_supply.normalized +
 *     0.2 * (1 - pq_migration_progress)
 *   )
 *
 * Confidence:
 *   min(feature_confidences) * 0.7 + average(feature_confidences) * 0.3
 */

import type { FeatureOutput, DormantSupplyFeature, QuantumRiskScore } from './types';

export function computeQuantumRiskScore(
  keyExposure: FeatureOutput,
  dormantSupply: DormantSupplyFeature,
  pqMigration: FeatureOutput,
): QuantumRiskScore {
  const exposureComponent = keyExposure.value;
  const dormantComponent = dormantSupply.normalized;
  const migrationComponent = 1 - pqMigration.value;

  const value = 100 * (
    0.4 * exposureComponent +
    0.4 * dormantComponent +
    0.2 * migrationComponent
  );

  const confidences = [keyExposure.confidence, dormantSupply.confidence, pqMigration.confidence];
  const minConf = Math.min(...confidences);
  const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  const confidence = minConf * 0.7 + avgConf * 0.3;

  return {
    value: Math.round(value * 100) / 100,
    confidence: Math.round(confidence * 1000) / 1000,
    components: {
      exposure: Math.round(exposureComponent * 1000) / 1000,
      dormant: Math.round(dormantComponent * 1000) / 1000,
      migration: Math.round(migrationComponent * 1000) / 1000,
    },
  };
}
