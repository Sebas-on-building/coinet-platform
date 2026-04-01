/**
 * Section 6 — Judgment
 *
 * state = QRS > 70 ? "structurally_fragile" : QRS > 40 ? "watchlist" : "secure"
 *
 * Output: { state, cause, contradiction, timing, scenarios, confidence }
 */

import type { QuantumRiskScore, Scenario, QuantumJudgment, FeatureOutput, DormantSupplyFeature } from './types';

export function produceQuantumJudgment(
  score: QuantumRiskScore,
  scenarios: Scenario[],
  keyExposure: FeatureOutput,
  dormantSupply: DormantSupplyFeature,
  pqMigration: FeatureOutput,
  missingInputs: string[] = [],
): QuantumJudgment {
  const confidence = score.confidence;
  const prohibit = confidence < 0.2;

  if (confidence === 0) {
    return {
      state: 'insufficient_data',
      explanation: missingInputs.length > 0
        ? `Insufficient data for reliable assessment — missing: ${missingInputs.join(', ')}`
        : 'Insufficient data for reliable assessment',
      cause: 'Missing critical inputs — system cannot produce a reliable assessment',
      contradiction: 'Cannot assess — data insufficient',
      timing: 'Unknown — no migration evidence available',
      scenarios,
      confidence: 0,
      prohibit_directional_claims: true,
    };
  }

  const state: QuantumJudgment['state'] =
    prohibit ? 'insufficient_data'
      : score.value > 70 ? 'structurally_fragile'
        : score.value > 40 ? 'watchlist'
          : 'secure';

  let explanation: string;
  if (prohibit) {
    explanation = missingInputs.length > 0
      ? `Data quality too low for directional claims — missing: ${missingInputs.join(', ')}`
      : 'Data quality too low for directional claims';
  } else if (missingInputs.length > 0) {
    explanation = `Assessment limited — missing: ${missingInputs.join(', ')}. Confidence reduced.`;
  } else {
    explanation = `Full assessment with ${(confidence * 100).toFixed(0)}% confidence`;
  }

  const cause = prohibit
    ? 'Data quality too low for directional assessment'
    : buildCause(score, keyExposure, dormantSupply, pqMigration);
  const contradiction = buildContradiction(keyExposure, pqMigration, dormantSupply);
  const timing = buildTiming(pqMigration);

  return {
    state,
    explanation,
    cause,
    contradiction,
    timing,
    scenarios,
    confidence,
    prohibit_directional_claims: prohibit,
  };
}

function buildCause(
  score: QuantumRiskScore,
  exposure: FeatureOutput,
  dormant: DormantSupplyFeature,
  migration: FeatureOutput,
): string {
  const parts: string[] = [];

  if (score.components.exposure > 0.4) {
    parts.push(`high key exposure rate (${(exposure.value * 100).toFixed(1)}%)`);
  }
  if (score.components.dormant > 0.4) {
    parts.push(`significant dormant vulnerable supply (${dormant.base.toLocaleString()} BTC)`);
  }
  if (score.components.migration > 0.6) {
    parts.push(`weak PQC migration progress (${(migration.value * 100).toFixed(0)}%)`);
  }

  if (parts.length === 0) {
    return 'No dominant risk driver identified at current thresholds';
  }

  return `Driven by ${parts.join(', ')}`;
}

function buildContradiction(
  exposure: FeatureOutput,
  migration: FeatureOutput,
  dormant: DormantSupplyFeature,
): string {
  if (exposure.value > 0.5 && migration.value >= 0.5) {
    return 'High exposure exists but migration is progressing — structural risk may be declining faster than static metrics suggest';
  }
  if (exposure.value < 0.3 && dormant.normalized > 0.5) {
    return 'Low current exposure but high dormant vulnerable supply — historical exposure persists despite improved current practices';
  }
  if (exposure.degradation_state !== 'healthy') {
    return `Exposure data is ${exposure.degradation_state} — risk assessment carries elevated uncertainty`;
  }
  return 'No material contradiction detected between risk dimensions';
}

function buildTiming(migration: FeatureOutput): string {
  if (migration.value >= 0.8) return 'PQC deployment is active — timeline pressure reduced';
  if (migration.value >= 0.5) return 'PQC implementation in progress — medium-term mitigation expected';
  if (migration.value >= 0.2) return 'PQC at proposal stage only — no near-term mitigation';
  return 'No PQC migration activity detected — risk is purely structural with no timeline for resolution';
}
