/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 7 - EXPLANATION OBJECT BUILDER                              ║
 * ║                                                                               ║
 * ║   Constructs the mathematically verifiable EO from pipeline results         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { v4 as uuidv4 } from 'uuid';
import { ExplanationObjectSchema } from './types'; // Explicitly import schema
import type {
  ExplanationObject,
  GatedOutput,
  Claim,
  Driver,
  Warning,
  CoverageSummary,
  ScoreSummary,
  AssetContext,
  WarningSeverity,
} from './types';
import { EO_SCHEMA_VERSION } from './types';
import { HARD_GATE_THRESHOLDS } from '../layer6/types';

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES FROM OTHER LAYERS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineResults {
  /** Entity ID */
  entityId: string;
  
  /** Asset info */
  asset: {
    symbol: string;
    name: string;
    category: string;
    sector: string;
    identityConfidence: number;
    isWellKnown: boolean;
    interpretationContext: string;
    excludedMetrics: Array<{ metricId: string; reason: string }>;
  };
  
  /** Reconciliation results from Layer 3 */
  reconciliation: Array<{
    metricId: string;
    metricName: string;
    reconciledValue: number;
    normalizedValue: number;
    unit: 'SCORE_0_100' | 'USD' | 'PERCENT' | 'COUNT' | 'RATIO' | 'TX_PER_DAY' | 'TX_PER_SECOND' | 'USERS_PER_DAY' | 'SECONDS' | 'DAYS' | 'HOURS' | 'SCORE_0_1' | 'RAW_SCORE' | 'BOOLEAN' | 'ORDINAL' | 'HASH' | 'BTC' | 'ETH' | 'TOKENS' | 'BASIS_POINTS';
    sourceId: string;
    corroboratingSources: string[];
    timestamp: string;
    agreementScore: number;
    disputeStatus: string;
    reliability: number;
  }>;
  
  /** Validation results from Layer 4 */
  validation: Array<{
    metricId: string;
    status: 'pass' | 'warn' | 'fail' | 'gated';
    qualityFlags: string[];
    ageSeconds: number;
  }>;
  
  /** Anomaly signals from Layer 4 */
  anomalies: Array<{
    type: string;
    severity: number;
    description: string;
    evidence: Record<string, number>;
    action: string;
  }>;
  
  /** Confidence result from Layer 6 */
  confidence: {
    score: number;
    level: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
    gatesPassed: {
      confidence: boolean;
      coverage: boolean;
      identity: boolean;
    };
    failureReason: string | null;
  };
  
  /** Coverage from Layers 3, 6 */
  coverage: {
    overall: number;
    critical: number;
    missingCritical: string[];
    missingImportant: string[];
  };
  
  /** Feature metadata from Layer 2 */
  features: Record<string, {
    direction: 'higher_is_better' | 'higher_is_worse' | 'neutral';
    scoreCategory: 'QS' | 'OS' | 'RISK' | 'META';
    weight: number;
    relevance: string;
  }>;
  
  /** Scores from OmniScore */
  scores: {
    qs: { value: number; tier: string; coverage: number; confidence: number };
    os: { value: number | null; tier: string | null; coverage: number; confidence: number; gated: boolean };
    risk: { value: number; tier: string; coverage: number; confidence: number };
    pos: {
      raw: number | null;
      smoothed: number | null;
      final: number | null;
      tier: string | null;
      gated: boolean;
      gatingReason: string | null;
    };
    formula: {
      version: string;
      weights: { qs: number; os: number; safety: number };
      osGatedWeights?: { qs: number; safety: number };
    };
  };
  
  /** Legitimacy from Layer 5 */
  legitimacy: {
    status: 'LEGIT' | 'WATCH' | 'SUSPICIOUS' | 'NOT_LEGIT' | 'INSUFFICIENT_DATA';
    confidence: number;
    flags: string[];
  };
  
  /** Staleness stats */
  staleness: {
    avgAgeSeconds: number;
    maxAgeSeconds: number;
    staleCount: number;
    totalMetrics: number;
  };
  
  /** Source statistics */
  sourceStats: {
    totalSources: number;
    minPerMetric: number;
    maxPerMetric: number;
    avgPerMetric: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a claim from reconciliation and validation results
 */
function buildClaim(
  reconciliation: PipelineResults['reconciliation'][0],
  validation: PipelineResults['validation'][0] | undefined,
  feature: PipelineResults['features'][string] | undefined,
  index: number,
): Claim {
  const direction = feature?.direction ?? 'neutral';
  const scoreCategory = feature?.scoreCategory ?? 'META';
  
  // Build assertion template
  const directionText = direction === 'higher_is_better' 
    ? 'higher values indicate better performance'
    : direction === 'higher_is_worse'
    ? 'higher values indicate higher risk'
    : 'this metric is context-dependent';
  
  const assertion = `${reconciliation.metricName} is ${reconciliation.normalizedValue.toFixed(1)}/100 (${directionText}).`;
  
  return {
    claim_id: `claim_${index}_${reconciliation.metricId}`,
    metric_id: reconciliation.metricId,
    metric_name: reconciliation.metricName,
    raw_value: reconciliation.reconciledValue,
    normalized_value: reconciliation.normalizedValue,
    unit: reconciliation.unit,
    source_id: reconciliation.sourceId,
    corroborating_sources: reconciliation.corroboratingSources,
    timestamp: reconciliation.timestamp,
    data_age_seconds: validation?.ageSeconds ?? 0,
    direction,
    score_category: scoreCategory,
    validation_status: validation?.status === 'gated' ? 'FAIL' : (validation?.status === 'fail' ? 'FAIL' : (validation?.status === 'warn' ? 'WARN' : 'PASS')),
    quality_flags: validation?.qualityFlags ?? [],
    assertion_template: assertion,
    reliability: reconciliation.reliability,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRIVER BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build drivers from claims and feature metadata
 */
function buildDrivers(
  claims: Claim[],
  features: PipelineResults['features'],
): { positive: Driver[]; negative: Driver[] } {
  const positive: Driver[] = [];
  const negative: Driver[] = [];
  
  for (const claim of claims) {
    const feature = features[claim.metric_id];
    if (!feature || claim.score_category === 'META') continue;
    
    const normalizedScore = claim.normalized_value;
    const weight = feature.weight;
    const direction = feature.direction;
    
    // Calculate contribution
    let contribution: number;
    let impact: 'positive' | 'negative' | 'neutral';
    
    if (direction === 'higher_is_better') {
      contribution = (normalizedScore - 50) * weight;
      impact = normalizedScore >= 50 ? 'positive' : 'negative';
    } else if (direction === 'higher_is_worse') {
      contribution = (50 - normalizedScore) * weight;
      impact = normalizedScore <= 50 ? 'positive' : 'negative';
    } else {
      contribution = 0;
      impact = 'neutral';
    }
    
    const driver: Driver = {
      claim_id: claim.claim_id,
      metric_id: claim.metric_id,
      metric_name: claim.metric_name,
      contribution,
      contribution_percent: Math.abs(contribution),
      impact,
      explanation: impact === 'positive'
        ? `${claim.metric_name} (${normalizedScore.toFixed(0)}/100) contributes positively to the score.`
        : impact === 'negative'
        ? `${claim.metric_name} (${normalizedScore.toFixed(0)}/100) is dragging down the score.`
        : `${claim.metric_name} has a neutral impact.`,
      relevance: (feature.relevance as Driver['relevance']) ?? 'RELEVANT',
    };
    
    if (impact === 'positive') {
      positive.push(driver);
    } else if (impact === 'negative') {
      negative.push(driver);
    }
  }
  
  // Sort by absolute contribution
  positive.sort((a, b) => b.contribution - a.contribution);
  negative.sort((a, b) => a.contribution - b.contribution);
  
  // Take top 5 of each
  return {
    positive: positive.slice(0, 5),
    negative: negative.slice(0, 5),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WARNING BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build warnings from validation and anomaly results
 */
function buildWarnings(
  results: PipelineResults,
): Warning[] {
  const warnings: Warning[] = [];
  let warningIndex = 0;
  
  // Add validation warnings
  for (const val of results.validation) {
    if (val.status === 'warn' || val.status === 'fail' || val.status === 'gated') {
      warnings.push({
        warning_id: `warning_${warningIndex++}`,
        type: val.qualityFlags.includes('stale') ? 'STALE' : 'DATA_QUALITY',
        severity: val.status === 'fail' || val.status === 'gated' ? 'HIGH' : 'MEDIUM',
        message: `${val.metricId}: Validation ${val.status} - ${val.qualityFlags.join(', ')}`,
        affected_metrics: [val.metricId],
        narrative_treatment: val.status === 'fail' || val.status === 'gated' ? 'PROMINENT_CAUTION' : 'CONTEXTUAL_NOTE',
        source_layer: 'LAYER_4',
      });
    }
  }
  
  // Add anomaly warnings
  for (const anomaly of results.anomalies) {
    const severityMap: Record<string, WarningSeverity> = {
      'GATE': 'CRITICAL',
      'FLAG': 'HIGH',
      'MONITOR': 'MEDIUM',
    };
    
    const typeMap: Record<string, Warning['type']> = {
      'WASH_TRADING': 'WASH_TRADE_RISK',
      'VOLUME_LIQUIDITY_MISMATCH': 'WASH_TRADE_RISK',
      'SOCIAL_FUNDAMENTAL_DIVERGENCE': 'SOCIAL_DIVERGENCE',
      'CONCENTRATION_SPIKE': 'CONCENTRATION_RISK',
    };
    
    warnings.push({
      warning_id: `warning_${warningIndex++}`,
      type: typeMap[anomaly.type] ?? 'BEHAVIORAL_ANOMALY',
      severity: severityMap[anomaly.action] ?? 'MEDIUM',
      message: anomaly.description,
      affected_metrics: Object.keys(anomaly.evidence),
      evidence: anomaly.evidence,
      narrative_treatment: anomaly.action === 'GATE' ? 'PROMINENT_CAUTION' : 'NOTED_RISK',
      source_layer: 'LAYER_4',
    });
  }
  
  // Add reconciliation disputes
  for (const recon of results.reconciliation) {
    if (recon.disputeStatus === 'DISPUTED' || recon.disputeStatus === 'SEVERE_DISPUTE') {
      warnings.push({
        warning_id: `warning_${warningIndex++}`,
        type: 'DISPUTED',
        severity: recon.disputeStatus === 'SEVERE_DISPUTE' ? 'HIGH' : 'MEDIUM',
        message: `${recon.metricName}: Data sources disagree (agreement: ${(recon.agreementScore * 100).toFixed(0)}%)`,
        affected_metrics: [recon.metricId],
        narrative_treatment: 'NOTED_RISK',
        source_layer: 'LAYER_3',
      });
    }
  }
  
  // Add coverage gaps
  if (results.coverage.missingCritical.length > 0) {
    warnings.push({
      warning_id: `warning_${warningIndex++}`,
      type: 'COVERAGE_GAP',
      severity: 'HIGH',
      message: `Missing critical metrics: ${results.coverage.missingCritical.join(', ')}`,
      affected_metrics: results.coverage.missingCritical,
      narrative_treatment: 'PROMINENT_CAUTION',
      source_layer: 'LAYER_6',
    });
  }
  
  // Add identity uncertainty
  if (results.asset.identityConfidence < HARD_GATE_THRESHOLDS.IDENTITY_GATE) {
    warnings.push({
      warning_id: `warning_${warningIndex++}`,
      type: 'IDENTITY_UNCERTAIN',
      severity: 'CRITICAL',
      message: `Asset classification confidence (${results.asset.identityConfidence}%) is below threshold (${HARD_GATE_THRESHOLDS.IDENTITY_GATE}%)`,
      affected_metrics: [],
      narrative_treatment: 'PROMINENT_CAUTION',
      source_layer: 'LAYER_5',
    });
  }
  
  // Sort by severity
  const severityOrder: WarningSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  warnings.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
  
  return warnings;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NARRATIVE GUIDANCE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build narrative guidance based on scores and warnings
 */
function buildNarrativeGuidance(
  results: PipelineResults,
  warnings: Warning[],
): ExplanationObject['narrative_guidance'] {
  const requiredPoints: string[] = [];
  const recommendedPoints: string[] = [];
  const avoidTopics: string[] = [];
  
  // Required points based on warnings
  for (const warning of warnings) {
    if (warning.narrative_treatment === 'PROMINENT_CAUTION') {
      requiredPoints.push(`CAUTION: ${warning.message}`);
    }
  }
  
  // Required points based on scores
  if (results.scores.pos.final !== null) {
    requiredPoints.push(`Overall position score is ${results.scores.pos.final.toFixed(0)}/100 (${results.scores.pos.tier})`);
  }
  
  if (results.scores.os.gated) {
    requiredPoints.push('Opportunity Score is gated due to insufficient data');
    avoidTopics.push('Short-term trading opportunities');
  }
  
  // Recommended points
  recommendedPoints.push(`Quality Score: ${results.scores.qs.value.toFixed(0)}/100`);
  
  if (results.scores.os.value !== null) {
    recommendedPoints.push(`Opportunity Score: ${results.scores.os.value.toFixed(0)}/100`);
  }
  
  recommendedPoints.push(`Risk Score: ${results.scores.risk.value.toFixed(0)}/100`);
  
  // Avoid topics based on excluded metrics
  for (const excluded of results.asset.excludedMetrics) {
    avoidTopics.push(`Do not discuss ${excluded.metricId} - ${excluded.reason}`);
  }
  
  // Determine tone
  let tone: ExplanationObject['narrative_guidance']['recommended_tone'] = 'NEUTRAL';
  
  const hasCriticalWarnings = warnings.some(w => w.severity === 'CRITICAL');
  const posScore = results.scores.pos.final;
  
  if (hasCriticalWarnings || (posScore !== null && posScore < 40)) {
    tone = 'BEARISH_CAUTIOUS';
  } else if (posScore !== null && posScore >= 75) {
    tone = warnings.length > 0 ? 'BULLISH_CAUTIOUS' : 'BULLISH_CAUTIOUS';
  } else if (warnings.length > 2) {
    tone = 'CAUTIOUS';
  }
  
  return {
    focus: results.asset.interpretationContext,
    required_points: requiredPoints,
    recommended_points: recommendedPoints,
    avoid_topics: avoidTopics,
    recommended_tone: tone,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EO BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the complete Explanation Object from pipeline results
 */
export function buildExplanationObject(
  results: PipelineResults,
  pipelineExecutionId: string,
): ExplanationObject | GatedOutput {
  const now = new Date().toISOString();
  
  // Check if gates passed
  const allGatesPassed = 
    results.confidence.gatesPassed.confidence &&
    results.confidence.gatesPassed.coverage &&
    results.confidence.gatesPassed.identity;
  
  // If gates failed, return gated output
  if (!allGatesPassed) {
    return buildGatedOutput(results);
  }
  
  // Build claims from reconciliation results
  const claims: Claim[] = results.reconciliation.map((recon, index) => {
    const validation = results.validation.find(v => v.metricId === recon.metricId);
    const feature = results.features[recon.metricId];
    return buildClaim(recon, validation, feature, index);
  });
  
  // Build drivers
  const { positive: positiveDrivers, negative: negativeDrivers } = 
    buildDrivers(claims, results.features);
  
  // Build warnings
  const warnings = buildWarnings(results);
  
  // Build coverage summary
  const coverageSummary: CoverageSummary = {
    overall_coverage: results.coverage.overall,
    critical_coverage: results.coverage.critical,
    missing_critical_metrics: results.coverage.missingCritical,
    missing_important_metrics: results.coverage.missingImportant,
    disputed_metrics: results.reconciliation
      .filter(r => r.disputeStatus === 'DISPUTED' || r.disputeStatus === 'SEVERE_DISPUTE')
      .map(r => ({
        metric_id: r.metricId,
        agreement_score: r.agreementScore,
        dispute_description: `Agreement: ${(r.agreementScore * 100).toFixed(0)}%`,
      })),
    stale_metrics: results.validation
      .filter(v => v.qualityFlags.includes('stale'))
      .map(v => ({
        metric_id: v.metricId,
        age_seconds: v.ageSeconds,
        threshold_seconds: 3600, // Default threshold
      })),
    staleness_summary: {
      average_age_seconds: results.staleness.avgAgeSeconds,
      max_age_seconds: results.staleness.maxAgeSeconds,
      stale_count: results.staleness.staleCount,
      total_metrics: results.staleness.totalMetrics,
    },
    source_statistics: {
      total_sources: results.sourceStats.totalSources,
      min_sources_per_metric: results.sourceStats.minPerMetric,
      max_sources_per_metric: results.sourceStats.maxPerMetric,
      avg_sources_per_metric: results.sourceStats.avgPerMetric,
    },
  };
  
  // Build score summary
  const scoreSummary: ScoreSummary = {
    qs: results.scores.qs,
    os: results.scores.os,
    risk: results.scores.risk,
    pos: results.scores.pos,
    formula: {
      version: results.scores.formula.version,
      weights: results.scores.formula.weights,
      os_gated_weights: results.scores.formula.osGatedWeights,
    },
  };
  
  // Build asset context
  const assetContext: AssetContext = {
    entity_id: results.entityId,
    symbol: results.asset.symbol,
    name: results.asset.name,
    category: results.asset.category,
    sector: results.asset.sector,
    identity_confidence: results.asset.identityConfidence,
    is_well_known: results.asset.isWellKnown,
    interpretation_context: results.asset.interpretationContext,
    excluded_metrics: results.asset.excludedMetrics.map(e => ({
      metric_id: e.metricId,
      reason: e.reason,
    })),
  };
  
  // Build narrative guidance
  const narrativeGuidance = buildNarrativeGuidance(results, warnings);
  
  // Construct the complete EO
  const eo: ExplanationObject = {
    schema_version: EO_SCHEMA_VERSION,
    generated_at: now,
    eo_id: uuidv4(),
    pipeline_execution_id: pipelineExecutionId,
    asset: assetContext,
    confidence: results.confidence.score,
    confidence_level: results.confidence.level,
    gate_status: {
      passed: allGatesPassed,
      confidence_gate: results.confidence.gatesPassed.confidence,
      coverage_gate: results.confidence.gatesPassed.coverage,
      identity_gate: results.confidence.gatesPassed.identity,
      failure_reason: results.confidence.failureReason,
    },
    coverage_summary: coverageSummary,
    claims,
    scores: scoreSummary,
    positive_drivers: positiveDrivers,
    negative_drivers: negativeDrivers,
    warnings,
    legitimacy: results.legitimacy,
    narrative_guidance: narrativeGuidance,
  };
  
  return eo;
}

/**
 * Build gated output when confidence threshold not met
 */
function buildGatedOutput(results: PipelineResults): GatedOutput {
  const requirements: string[] = [];
  
  if (!results.confidence.gatesPassed.identity) {
    requirements.push(`Increase identity confidence from ${results.asset.identityConfidence}% to ${HARD_GATE_THRESHOLDS.IDENTITY_GATE}%`);
  }
  
  if (!results.confidence.gatesPassed.coverage) {
    requirements.push(`Increase critical coverage from ${(results.coverage.critical * 100).toFixed(0)}% to ${HARD_GATE_THRESHOLDS.COVERAGE_GATE * 100}%`);
  }
  
  if (!results.confidence.gatesPassed.confidence) {
    requirements.push(`Increase confidence score from ${results.confidence.score}% to ${HARD_GATE_THRESHOLDS.CONFIDENCE_GATE}%`);
  }
  
  return {
    gated: true,
    entity_id: results.entityId,
    reason: results.confidence.failureReason ?? 'Confidence threshold not met',
    confidence: results.confidence.score,
    threshold: HARD_GATE_THRESHOLDS.CONFIDENCE_GATE,
    requirements,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if output is gated
 */
export function isGatedOutput(output: ExplanationObject | GatedOutput): output is GatedOutput {
  return 'gated' in output && output.gated === true;
}

/**
 * Validate an Explanation Object
 */
export function validateExplanationObject(eo: unknown): {
  valid: boolean;
  errors: string[];
} {
  const result = ExplanationObjectSchema.safeParse(eo);
  
  if (result.success) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  };
}
