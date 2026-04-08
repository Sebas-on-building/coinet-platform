/**
 * Layer 2 — Field-Family SLOs
 *
 * Measure Layer 2 by truth surfaces, not providers. Competitors
 * measure uptime. Coinet measures field-family reliability of truth
 * ingress.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SLO DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FieldFamilySLO {
  fieldFamily: string;
  validEnvelopeRate: number;
  usableFreshnessRate: number;
  admissibleRouteSuccessRate: number;
  blindSpotFreeRequestRate: number;
  lineageCompletenessRate: number;
  replayReproducibilityRate: number;
  correctionHandlingCorrectness: number;
  traceabilityCompletionRate: number;
}

export const DEFAULT_SLOS: FieldFamilySLO[] = [
  {
    fieldFamily: 'price.spot.canonical',
    validEnvelopeRate: 0.9995, usableFreshnessRate: 0.995,
    admissibleRouteSuccessRate: 0.999, blindSpotFreeRequestRate: 0.99,
    lineageCompletenessRate: 0.9995, replayReproducibilityRate: 0.999,
    correctionHandlingCorrectness: 0.9999, traceabilityCompletionRate: 0.999,
  },
  {
    fieldFamily: 'derivatives.funding.aggregate',
    validEnvelopeRate: 0.999, usableFreshnessRate: 0.99,
    admissibleRouteSuccessRate: 0.99, blindSpotFreeRequestRate: 0.98,
    lineageCompletenessRate: 0.999, replayReproducibilityRate: 0.999,
    correctionHandlingCorrectness: 0.999, traceabilityCompletionRate: 0.999,
  },
  {
    fieldFamily: 'derivatives.liquidation.orderflow',
    validEnvelopeRate: 0.999, usableFreshnessRate: 0.99,
    admissibleRouteSuccessRate: 0.99, blindSpotFreeRequestRate: 0.97,
    lineageCompletenessRate: 0.999, replayReproducibilityRate: 0.999,
    correctionHandlingCorrectness: 0.9999, traceabilityCompletionRate: 0.9995,
  },
  {
    fieldFamily: 'protocol.tvl.usd',
    validEnvelopeRate: 0.999, usableFreshnessRate: 0.995,
    admissibleRouteSuccessRate: 0.999, blindSpotFreeRequestRate: 0.99,
    lineageCompletenessRate: 0.999, replayReproducibilityRate: 0.999,
    correctionHandlingCorrectness: 0.999, traceabilityCompletionRate: 0.999,
  },
  {
    fieldFamily: 'onchain.transfers.evm',
    validEnvelopeRate: 0.999, usableFreshnessRate: 0.99,
    admissibleRouteSuccessRate: 0.99, blindSpotFreeRequestRate: 0.97,
    lineageCompletenessRate: 0.9995, replayReproducibilityRate: 0.999,
    correctionHandlingCorrectness: 0.9999, traceabilityCompletionRate: 0.9995,
  },
  {
    fieldFamily: 'entity.wallet.labels',
    validEnvelopeRate: 0.999, usableFreshnessRate: 0.99,
    admissibleRouteSuccessRate: 0.999, blindSpotFreeRequestRate: 0.98,
    lineageCompletenessRate: 0.999, replayReproducibilityRate: 0.999,
    correctionHandlingCorrectness: 0.9999, traceabilityCompletionRate: 0.999,
  },
  {
    fieldFamily: 'security.token.flags',
    validEnvelopeRate: 0.999, usableFreshnessRate: 0.995,
    admissibleRouteSuccessRate: 0.995, blindSpotFreeRequestRate: 0.99,
    lineageCompletenessRate: 0.999, replayReproducibilityRate: 0.999,
    correctionHandlingCorrectness: 1.0, traceabilityCompletionRate: 0.999,
  },
  {
    fieldFamily: 'narrative.news.velocity',
    validEnvelopeRate: 0.995, usableFreshnessRate: 0.98,
    admissibleRouteSuccessRate: 0.99, blindSpotFreeRequestRate: 0.95,
    lineageCompletenessRate: 0.99, replayReproducibilityRate: 0.99,
    correctionHandlingCorrectness: 0.99, traceabilityCompletionRate: 0.99,
  },
  {
    fieldFamily: 'narrative.social.velocity',
    validEnvelopeRate: 0.995, usableFreshnessRate: 0.98,
    admissibleRouteSuccessRate: 0.99, blindSpotFreeRequestRate: 0.95,
    lineageCompletenessRate: 0.99, replayReproducibilityRate: 0.99,
    correctionHandlingCorrectness: 0.99, traceabilityCompletionRate: 0.99,
  },
];

export function getSLOForFieldFamily(ff: string): FieldFamilySLO | undefined {
  return DEFAULT_SLOS.find(s => s.fieldFamily === ff);
}

export function getAllSLOs(): FieldFamilySLO[] {
  return [...DEFAULT_SLOS];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLO MEASUREMENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface FieldFamilyMeasurement {
  fieldFamily: string;
  windowStart: string;
  windowEnd: string;
  totalRequests: number;
  validEnvelopes: number;
  totalEnvelopes: number;
  usableFreshness: number;
  totalFreshnessChecks: number;
  admissibleRoutes: number;
  totalRouteAttempts: number;
  blindSpotFreeRequests: number;
  lineageComplete: number;
  replayReproducible: number;
  totalReplayChecks: number;
  correctionsHandled: number;
  totalCorrections: number;
  tracesComplete: number;
}

export interface SLOEvaluationResult {
  fieldFamily: string;
  sloMet: boolean;
  violations: SLOViolation[];
  measured: Record<string, number>;
  required: Record<string, number>;
}

export interface SLOViolation {
  metric: string;
  measured: number;
  required: number;
  deficit: number;
}

export function evaluateSLO(
  slo: FieldFamilySLO,
  measurement: FieldFamilyMeasurement,
): SLOEvaluationResult {
  const violations: SLOViolation[] = [];
  const measured: Record<string, number> = {};
  const required: Record<string, number> = {};

  function check(metric: string, num: number, denom: number, threshold: number): void {
    const rate = denom > 0 ? num / denom : 1;
    measured[metric] = rate;
    required[metric] = threshold;
    if (rate < threshold) {
      violations.push({ metric, measured: rate, required: threshold, deficit: threshold - rate });
    }
  }

  check('validEnvelopeRate', measurement.validEnvelopes, measurement.totalEnvelopes, slo.validEnvelopeRate);
  check('usableFreshnessRate', measurement.usableFreshness, measurement.totalFreshnessChecks, slo.usableFreshnessRate);
  check('admissibleRouteSuccessRate', measurement.admissibleRoutes, measurement.totalRouteAttempts, slo.admissibleRouteSuccessRate);
  check('blindSpotFreeRequestRate', measurement.blindSpotFreeRequests, measurement.totalRequests, slo.blindSpotFreeRequestRate);
  check('lineageCompletenessRate', measurement.lineageComplete, measurement.totalRequests, slo.lineageCompletenessRate);
  check('replayReproducibilityRate', measurement.replayReproducible, measurement.totalReplayChecks, slo.replayReproducibilityRate);
  check('correctionHandlingCorrectness', measurement.correctionsHandled, measurement.totalCorrections, slo.correctionHandlingCorrectness);
  check('traceabilityCompletionRate', measurement.tracesComplete, measurement.totalRequests, slo.traceabilityCompletionRate);

  return {
    fieldFamily: slo.fieldFamily,
    sloMet: violations.length === 0,
    violations,
    measured,
    required,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEASUREMENT STORE
// ═══════════════════════════════════════════════════════════════════════════════

const evaluationStore: SLOEvaluationResult[] = [];

export function recordSLOEvaluation(result: SLOEvaluationResult): void {
  evaluationStore.push(result);
}

export function getSLOEvaluations(): SLOEvaluationResult[] {
  return [...evaluationStore];
}

export function getSLOViolations(): SLOEvaluationResult[] {
  return evaluationStore.filter(e => !e.sloMet);
}

export interface SLODashboard {
  totalEvaluations: number;
  metCount: number;
  violatedCount: number;
  complianceRate: number;
  worstFieldFamilies: Array<{ fieldFamily: string; violationCount: number }>;
  worstMetrics: Array<{ metric: string; violationCount: number }>;
}

export function buildSLODashboard(): SLODashboard {
  const total = evaluationStore.length;
  const met = evaluationStore.filter(e => e.sloMet).length;

  const ffViolations: Record<string, number> = {};
  const metricViolations: Record<string, number> = {};

  for (const e of evaluationStore) {
    for (const v of e.violations) {
      ffViolations[e.fieldFamily] = (ffViolations[e.fieldFamily] || 0) + 1;
      metricViolations[v.metric] = (metricViolations[v.metric] || 0) + 1;
    }
  }

  const sortDesc = (obj: Record<string, number>) =>
    Object.entries(obj).sort((a, b) => b[1] - a[1]);

  return {
    totalEvaluations: total,
    metCount: met,
    violatedCount: total - met,
    complianceRate: total > 0 ? met / total : 1,
    worstFieldFamilies: sortDesc(ffViolations).slice(0, 5)
      .map(([fieldFamily, violationCount]) => ({ fieldFamily, violationCount })),
    worstMetrics: sortDesc(metricViolations).slice(0, 5)
      .map(([metric, violationCount]) => ({ metric, violationCount })),
  };
}

export function resetSLOStore(): void {
  evaluationStore.length = 0;
}
