/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 3 - RECONCILIATION ENGINE                                   ║
 * ║                                                                               ║
 * ║   WEIGHTED TRIMMED MEAN (WTM) AGGREGATION                                    ║
 * ║                                                                               ║
 * ║   "The policy strictly prohibits blind averaging. Instead, high-impact       ║
 * ║    metrics are computed using a Weighted Trimmed Mean approach,              ║
 * ║    incorporating dynamic source trust weights."                              ║
 * ║                                                                               ║
 * ║   This layer ensures the system will NOT confidently output an analysis      ║
 * ║   based on one compromised or outlier feed.                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  SourceReport,
  ReconciliationResult,
  ReconciliationConfig,
  DisputeStatus,
  ReconciliationMethod,
  SourceProvider,
} from './types';
import {
  RECONCILIATION_CONFIGS,
  DEFAULT_SOURCE_TRUST,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate basic statistics for a set of values
 */
function calculateStatistics(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  std_dev: number;
  spread: number;
  spread_percentage: number;
} {
  if (values.length === 0) {
    return {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      std_dev: 0,
      spread: 0,
      spread_percentage: 0,
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  
  // Median
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  
  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const std_dev = Math.sqrt(variance);
  
  // Spread
  const spread = max - min;
  const spread_percentage = mean !== 0 ? (spread / Math.abs(mean)) * 100 : 0;
  
  return { min, max, mean, median, std_dev, spread, spread_percentage };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTED TRIMMED MEAN (WTM) ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Weighted Trimmed Mean
 * 
 * Algorithm:
 * 1. Sort values by magnitude
 * 2. Trim α% from each tail (remove outliers)
 * 3. Calculate weighted mean using trust scores as weights
 * 
 * @param reports - Source reports with values and trust scores
 * @param alpha - Trim percentage (0-0.5, e.g., 0.05 = 5% from each tail)
 * @returns WTM value and trimming details
 */
function calculateWTM(
  reports: SourceReport[],
  alpha: number,
): {
  wtm: number;
  included: SourceReport[];
  trimmed: Array<{ report: SourceReport; reason: string }>;
} {
  if (reports.length === 0) {
    return { wtm: 0, included: [], trimmed: [] };
  }
  
  if (reports.length === 1) {
    return { wtm: reports[0].value, included: reports, trimmed: [] };
  }
  
  // Sort by value
  const sorted = [...reports].sort((a, b) => a.value - b.value);
  const n = sorted.length;
  
  // Calculate trim count from each tail
  const trimCount = Math.floor(n * alpha);
  
  // Identify trimmed and included reports
  const trimmed: Array<{ report: SourceReport; reason: string }> = [];
  const included: SourceReport[] = [];
  
  for (let i = 0; i < n; i++) {
    if (i < trimCount) {
      trimmed.push({ report: sorted[i], reason: `Lower ${alpha * 100}% tail` });
    } else if (i >= n - trimCount) {
      trimmed.push({ report: sorted[i], reason: `Upper ${alpha * 100}% tail` });
    } else {
      included.push(sorted[i]);
    }
  }
  
  // If all trimmed (shouldn't happen with reasonable alpha), use all
  if (included.length === 0) {
    // Fallback to median of original reports if all are trimmed
    const originalValues = reports.map(r => r.value).sort((a, b) => a - b);
    const median = originalValues.length > 0 ? originalValues[Math.floor(originalValues.length / 2)] : 0;
    return { wtm: median, included: reports, trimmed: [] };
  }
  
  // Calculate weighted mean using trust scores
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const report of included) {
    const weight = report.trust_score;
    weightedSum += report.value * weight;
    totalWeight += weight;
  }
  
  const wtm = totalWeight > 0 ? weightedSum / totalWeight : included[0].value; // Fallback to first included if totalWeight is 0
  
  return { wtm, included, trimmed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGREEMENT SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Agreement Score
 * 
 * Formula: Agreement Score = 1 - (Spread / WTM)
 * 
 * Where:
 *   Spread = Max - Min (among included sources)
 *   WTM = Weighted Trimmed Mean
 * 
 * @param spread - Max - Min of reported values
 * @param wtm - Weighted Trimmed Mean
 * @returns Agreement score (0-1, 1 = perfect agreement)
 */
function calculateAgreementScore(spread: number, wtm: number): number {
  if (wtm === 0) {
    // If WTM is 0, any spread means disagreement
    return spread === 0 ? 1 : 0;
  }
  
  const ratio = spread / Math.abs(wtm);
  const agreementScore = Math.max(0, Math.min(1, 1 - ratio));
  
  return agreementScore;
}

/**
 * Determine dispute status based on agreement score
 */
function determineDisputeStatus(
  agreementScore: number,
  threshold: number,
): DisputeStatus {
  if (agreementScore >= threshold) {
    return 'AGREED';
  } else if (agreementScore >= 0.95) {
    return 'MINOR_DISPUTE';
  } else if (agreementScore >= 0.90) {
    return 'DISPUTED';
  } else {
    return 'SEVERE_DISPUTE';
  }
}

/**
 * Calculate confidence multiplier based on reconciliation quality
 */
function calculateConfidenceMultiplier(
  agreementScore: number,
  sourceCount: number,
  disputeStatus: DisputeStatus,
): number {
  // Base confidence from agreement
  let confidence = agreementScore;
  
  // Penalty for low source count
  if (sourceCount === 1) {
    confidence *= 0.8; // 20% penalty for single source
  } else if (sourceCount === 2) {
    confidence *= 0.9; // 10% penalty for two sources
  }
  
  // Additional penalty for disputes
  switch (disputeStatus) {
    case 'MINOR_DISPUTE':
      confidence *= 0.95;
      break;
    case 'DISPUTED':
      confidence *= 0.80;
      break;
    case 'SEVERE_DISPUTE':
      confidence *= 0.50;
      break;
    case 'INSUFFICIENT_SOURCES':
      confidence *= 0.1; // Heavy penalty
      break;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RECONCILIATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reconcile multiple source reports into a single trusted value
 * 
 * @param metricId - Metric identifier
 * @param entityId - Entity identifier
 * @param reports - Array of source reports
 * @param config - Reconciliation configuration (optional, uses defaults)
 * @returns Full reconciliation result with audit trail
 */
export function reconcileMetric(
  metricId: string,
  entityId: string,
  reports: SourceReport[],
  config?: Partial<ReconciliationConfig>,
): ReconciliationResult {
  const now = new Date().toISOString();
  
  // Determine config based on metric category
  const category = metricId.includes('price') ? 'price'
    : metricId.includes('volume') ? 'volume'
    : metricId.includes('supply') ? 'supply'
    : metricId.includes('tvl') ? 'tvl'
    : 'general';
  
  const defaultConfig = RECONCILIATION_CONFIGS[category];
  const finalConfig: ReconciliationConfig = {
    ...defaultConfig,
    ...config,
  };

  // Handle insufficient sources - THIS MUST BE FIRST
  if (reports.length < finalConfig.min_sources) {
    return createEmptyResult(metricId, entityId, now, 'INSUFFICIENT_SOURCES'); // Pass dispute status
  }
  
  // Filter out stale reports
  const freshReports = filterStaleReports(reports, finalConfig.staleness_threshold_seconds);
  
  if (freshReports.length === 0) {
    return createStaleResult(metricId, entityId, reports, now);
  }
  
  // Determine method
  let method: ReconciliationMethod;
  if (freshReports.length === 1) {
    method = 'SINGLE_SOURCE';
  } else {
    method = 'WTM';
  }
  
  // Calculate WTM
  const { wtm, included, trimmed } = calculateWTM(freshReports, finalConfig.trim_alpha);
  
  // Calculate statistics on included values
  const includedValues = included.map(r => r.value);
  const statistics = calculateStatistics(includedValues);
  
  // Calculate agreement score
  const agreementScore = calculateAgreementScore(statistics.spread, wtm);
  
  // Determine dispute status
  const disputeStatus = determineDisputeStatus(agreementScore, finalConfig.agreement_threshold);
  
  // Calculate confidence multiplier
  const confidenceMultiplier = calculateConfidenceMultiplier(
    agreementScore,
    freshReports.length,
    disputeStatus,
  );
  
  // Determine if should be excluded from scoring
  const excludeFromScoring = 
    finalConfig.gate_on_dispute && 
    (disputeStatus === 'DISPUTED' || disputeStatus === 'SEVERE_DISPUTE');
  
  // Build audit trail
  const auditTrail = reports.map(report => {
    const trimEntry = trimmed.find(t => t.report === report);
    const isIncluded = included.includes(report);
    
    return {
      provider: report.provider,
      value: report.value,
      timestamp: report.timestamp,
      trust_score: report.trust_score,
      included_in_wtm: isIncluded,
      trim_reason: trimEntry?.reason ?? null,
    };
  });
  
  return {
    metric_id: metricId,
    entity_id: entityId,
    reconciled_value: wtm,
    method,
    source_count: freshReports.length,
    sources_after_trim: included.length,
    trim_percentage: finalConfig.trim_alpha,
    statistics,
    agreement_score: agreementScore,
    agreement_threshold: finalConfig.agreement_threshold,
    dispute_status: disputeStatus,
    confidence_multiplier: confidenceMultiplier,
    exclude_from_scoring: excludeFromScoring,
    reconciled_at: now,
    audit_trail: auditTrail,
    trimmed_reports: trimmed, // Ensure trimmed_reports is always populated
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filter out stale reports
 */
function filterStaleReports(
  reports: SourceReport[],
  thresholdSeconds: number,
): SourceReport[] {
  const now = Date.now();
  
  return reports.filter(report => {
    const reportTime = new Date(report.timestamp).getTime();
    const ageSeconds = (now - reportTime) / 1000;
    return ageSeconds <= thresholdSeconds;
  });
}

/**
 * Create empty result for no reports
 */
function createEmptyResult(
  metricId: string,
  entityId: string,
  timestamp: string,
  disputeStatus: DisputeStatus = 'INSUFFICIENT_SOURCES', // Added disputeStatus param
): ReconciliationResult {
  return {
    metric_id: metricId,
    entity_id: entityId,
    reconciled_value: 0,
    method: 'NONE',
    source_count: 0,
    sources_after_trim: 0,
    trim_percentage: 0,
    statistics: {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      std_dev: 0,
      spread: 0,
      spread_percentage: 0,
    },
    agreement_score: 0,
    agreement_threshold: 0.98,
    dispute_status: disputeStatus,
    confidence_multiplier: 0,
    exclude_from_scoring: true,
    reconciled_at: timestamp,
    audit_trail: [],
    trimmed_reports: [],
  };
}

/**
 * Create result when all reports are stale
 */
function createStaleResult(
  metricId: string,
  entityId: string,
  reports: SourceReport[],
  timestamp: string,
): ReconciliationResult {
  // Use median of stale values as fallback
  const values = reports.map(r => r.value).sort((a, b) => a - b);
  const median = values.length > 0 ? values[Math.floor(values.length / 2)] : 0; // Handle empty array
  
  return {
    metric_id: metricId,
    entity_id: entityId,
    reconciled_value: median,
    method: 'MEDIAN',
    source_count: reports.length,
    sources_after_trim: 0,
    trim_percentage: 0,
    statistics: calculateStatistics(values),
    agreement_score: 0.5, // Reduced confidence for stale
    agreement_threshold: 0.98,
    dispute_status: 'DISPUTED',
    confidence_multiplier: 0.3, // Heavy penalty for staleness
    exclude_from_scoring: false, // Don't gate, but warn
    reconciled_at: timestamp,
    audit_trail: reports.map(r => ({
      provider: r.provider,
      value: r.value,
      timestamp: r.timestamp,
      trust_score: r.trust_score,
      included_in_wtm: false,
      trim_reason: 'STALE',
    })),
    trimmed_reports: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH RECONCILIATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reconcile multiple metrics for an entity
 */
export function reconcileEntityMetrics(
  entityId: string,
  metricReports: Record<string, SourceReport[]>,
): Record<string, ReconciliationResult> {
  const results: Record<string, ReconciliationResult> = {};
  
  for (const [metricId, reports] of Object.entries(metricReports)) {
    results[metricId] = reconcileMetric(metricId, entityId, reports);
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE TRUST MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get trust score for a provider
 */
export function getSourceTrust(provider: SourceProvider): number {
  return DEFAULT_SOURCE_TRUST[provider] ?? 0.70;
}

/**
 * Create a source report
 */
export function createSourceReport(
  provider: SourceProvider,
  metricId: string, // Added metricId for full traceability
  entityId: string, // Added entityId for full traceability
  value: number,
  timestamp?: string,
  confidenceScore?: number, // Renamed to confidenceScore for clarity
  warnings?: string[],
): SourceReport {
  return {
    provider,
    metric_id: metricId, // Added metric_id
    entity_id: entityId, // Added entity_id
    value,
    timestamp: timestamp ?? new Date().toISOString(),
    trust_score: getSourceTrust(provider), // Dynamic trust score
    confidence_score: confidenceScore ?? DEFAULT_SOURCE_TRUST[provider] ?? 0.70, // Explicit confidence score
    latency_ms: 0,
    warnings: warnings ?? [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPUTE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Analyze disputes across multiple reconciliation results
 */
export function analyzeDisputes(
  results: ReconciliationResult[],
): {
  total: number;
  agreed: number;
  minor_disputes: number;
  disputed: number;
  severe_disputes: number;
  gated_metrics: string[];
  overall_confidence: number;
} {
  const gatedMetrics: string[] = [];
  let confidenceSum = 0;
  
  let agreed = 0, minor = 0, disputed = 0, severe = 0;
  
  for (const result of results) {
    switch (result.dispute_status) {
      case 'AGREED':
        agreed++;
        break;
      case 'MINOR_DISPUTE':
        minor++;
        break;
      case 'DISPUTED':
        disputed++;
        break;
      case 'SEVERE_DISPUTE':
        severe++;
        break;
      case 'INSUFFICIENT_SOURCES': // Handle this case for dispute analysis
        gatedMetrics.push(result.metric_id);
        break;
    }
    
    if (result.exclude_from_scoring) {
      gatedMetrics.push(result.metric_id);
    }
    
    confidenceSum += result.confidence_multiplier;
  }
  
  const overallConfidence = results.length > 0 
    ? confidenceSum / results.length 
    : 0;
  
  return {
    total: results.length,
    agreed,
    minor_disputes: minor,
    disputed,
    severe_disputes: severe,
    gated_metrics: gatedMetrics,
    overall_confidence: overallConfidence,
  };
}
