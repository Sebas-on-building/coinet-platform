/**
 * Section 5 — Scenarios
 *
 * Scenario A (fast_quantum):
 *   Trigger: QRS > 60 AND exposure_rate > 0.5
 *   Output: transaction instability risk, mempool vulnerability narrative
 *
 * Scenario B (slow_quantum):
 *   Trigger: dormant_supply_normalized > 0.4
 *   Output: supply shock risk, redistribution narrative
 */

import type { QuantumRiskScore, FeatureOutput, DormantSupplyFeature, Scenario } from './types';

export function evaluateScenarios(
  score: QuantumRiskScore,
  keyExposure: FeatureOutput,
  dormantSupply: DormantSupplyFeature,
): Scenario[] {
  const scenarios: Scenario[] = [];

  const fastTriggered = score.value > 60 && keyExposure.value > 0.5;
  scenarios.push({
    id: 'fast_quantum',
    triggered: fastTriggered,
    trigger_reason: fastTriggered
      ? `QRS=${score.value.toFixed(1)} > 60 AND exposure_rate=${keyExposure.value.toFixed(3)} > 0.5`
      : `QRS=${score.value.toFixed(1)} or exposure_rate=${keyExposure.value.toFixed(3)} below threshold`,
    output: fastTriggered
      ? [
        'Transaction instability risk: exposed keys enable real-time signature forgery under CRQC',
        'Mempool vulnerability: pending transactions with exposed public keys become interceptable',
      ]
      : [],
  });

  const slowTriggered = dormantSupply.normalized > 0.4;
  scenarios.push({
    id: 'slow_quantum',
    triggered: slowTriggered,
    trigger_reason: slowTriggered
      ? `dormant_supply_normalized=${dormantSupply.normalized.toFixed(3)} > 0.4`
      : `dormant_supply_normalized=${dormantSupply.normalized.toFixed(3)} below threshold`,
    output: slowTriggered
      ? [
        'Supply shock risk: large dormant exposed balances become spendable by quantum-capable adversary',
        'Redistribution narrative: market must price in potential forced redistribution of dormant BTC',
      ]
      : [],
  });

  return scenarios;
}
