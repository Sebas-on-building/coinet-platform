/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS VALIDATION ENGINE                                                  ║
 * ║                                                                               ║
 * ║   FAIL-CLOSED POLICY                                                         ║
 * ║                                                                               ║
 * ║   "Any data that fails structural validation, semantic constraint checks,    ║
 * ║    or reconciliation thresholds must be rejected or gated. It is explicitly  ║
 * ║    FORBIDDEN to apply 'best effort' interpretation to low-quality or         ║
 * ║    incomplete data."                                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { CanonicalDatapoint, ValidationStatus, QualityFlag } from '../layer1/schema';
import { validateDatapoint } from '../layer1/schema';
import type { Sector, FeatureSpecificationSheet, Severity } from '../layer2/fss-types';
import { getFSS, validateMetricApplication } from '../layer2/fss-registry';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ValidationIssue {
  code: string;
  severity: Severity;
  message: string;
  field?: string;
  compensation?: string[];
}

export interface DatapointValidationResult {
  /** Original datapoint (if structurally valid) */
  datapoint: CanonicalDatapoint | null;
  
  /** Overall validation status */
  status: ValidationStatus;
  
  /** Detailed issues found */
  issues: ValidationIssue[];
  
  /** Quality flags to apply */
  quality_flags: QualityFlag[];
  
  /** Should this datapoint be used in scoring? */
  usable_for_scoring: boolean;
  
  /** Confidence multiplier (0-1) */
  confidence_multiplier: number;
  
  /** Recommended action */
  action: 'accept' | 'accept_with_warning' | 'exclude' | 'gate' | 'reject';
}

export interface BundleValidationResult {
  entity_id: string;
  
  /** Overall bundle status */
  status: 'healthy' | 'degraded' | 'gated' | 'rejected';
  
  /** Individual datapoint results */
  datapoint_results: DatapointValidationResult[];
  
  /** Summary statistics */
  summary: {
    total: number;
    accepted: number;
    warnings: number;
    excluded: number;
    rejected: number;
    coverage: number;
  };
  
  /** Bundle-level issues */
  bundle_issues: ValidationIssue[];
  
  /** Can we produce a score for this entity? */
  can_score: boolean;
  
  /** Reason if cannot score */
  gating_reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STALENESS THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

const STALENESS_THRESHOLDS = {
  fresh: 300,        // 5 minutes
  acceptable: 3600,  // 1 hour
  stale: 86400,      // 1 day
  expired: 604800,   // 1 week
};

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURAL VALIDATION (Layer 1)
// ═══════════════════════════════════════════════════════════════════════════════

function validateStructure(data: unknown): DatapointValidationResult {
  const result = validateDatapoint(data);
  
  if (!result.success) {
    return {
      datapoint: null,
      status: 'fail',
      issues: result.errors.issues.map(issue => ({
        code: 'STRUCT_001',
        severity: 'critical',
        message: `Schema violation: ${issue.message}`,
        field: issue.path.join('.'),
      })),
      quality_flags: [],
      usable_for_scoring: false,
      confidence_multiplier: 0,
      action: 'reject',
    };
  }
  
  return {
    datapoint: result.datapoint,
    status: 'pass',
    issues: [],
    quality_flags: ['fresh'],
    usable_for_scoring: true,
    confidence_multiplier: 1.0,
    action: 'accept',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC VALIDATION (Layer 2)
// ═══════════════════════════════════════════════════════════════════════════════

function validateSemantics(
  datapoint: CanonicalDatapoint,
  sector: Sector
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // 1. Check if metric exists in FSS
  const fss = getFSS(datapoint.metric_id);
  if (!fss) {
    issues.push({
      code: 'SEM_001',
      severity: 'critical',
      message: `Unknown metric_id: ${datapoint.metric_id}. Not registered in FSS.`,
      field: 'metric_id',
      compensation: ['reject'],
    });
    return issues;
  }
  
  // 2. Check sector applicability
  const sectorCheck = validateMetricApplication(datapoint.metric_id, sector);
  if (!sectorCheck.valid) {
    issues.push({
      code: 'SEM_002',
      severity: 'catastrophic',
      message: sectorCheck.error,
      field: 'entity_id',
      compensation: sectorCheck.compensation,
    });
  }
  
  // 3. Check unit matches FSS expectation
  if (fss.expected_unit !== datapoint.unit && fss.expected_unit !== 'RAW_SCORE') {
    issues.push({
      code: 'SEM_003',
      severity: 'critical',
      message: `Unit mismatch: expected ${fss.expected_unit}, got ${datapoint.unit}`,
      field: 'unit',
      compensation: ['reject'],
    });
  }
  
  // 4. Check direction matches FSS
  if (fss.direction !== datapoint.direction) {
    issues.push({
      code: 'SEM_004',
      severity: 'critical',
      message: `Direction mismatch: FSS says ${fss.direction}, datapoint says ${datapoint.direction}`,
      field: 'direction',
      compensation: ['reject'],
    });
  }
  
  // 5. Check score category matches FSS
  if (fss.score_category !== datapoint.score_category) {
    issues.push({
      code: 'SEM_005',
      severity: 'critical',
      message: `Category mismatch: FSS says ${fss.score_category}, datapoint says ${datapoint.score_category}`,
      field: 'score_category',
      compensation: ['reject'],
    });
  }
  
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SANITY BOUNDS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateSanityBounds(
  datapoint: CanonicalDatapoint,
  fss: FeatureSpecificationSheet
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const { raw_value } = datapoint;
  const { sanity_bounds } = fss;
  
  // Hard bounds (impossible values)
  if (sanity_bounds.hard_min !== null && raw_value < sanity_bounds.hard_min) {
    issues.push({
      code: 'BOUNDS_001',
      severity: 'catastrophic',
      message: `Value ${raw_value} is below hard minimum ${sanity_bounds.hard_min}. ${sanity_bounds.rationale}`,
      field: 'raw_value',
      compensation: ['reject'],
    });
  }
  
  if (sanity_bounds.hard_max !== null && raw_value > sanity_bounds.hard_max) {
    issues.push({
      code: 'BOUNDS_002',
      severity: 'catastrophic',
      message: `Value ${raw_value} exceeds hard maximum ${sanity_bounds.hard_max}. ${sanity_bounds.rationale}`,
      field: 'raw_value',
      compensation: ['reject'],
    });
  }
  
  // Warning bounds (suspicious but possible)
  if (sanity_bounds.warn_min !== null && raw_value < sanity_bounds.warn_min) {
    issues.push({
      code: 'BOUNDS_003',
      severity: 'marginal',
      message: `Value ${raw_value} is below warning threshold ${sanity_bounds.warn_min}`,
      field: 'raw_value',
      compensation: ['flag_for_review'],
    });
  }
  
  if (sanity_bounds.warn_max !== null && raw_value > sanity_bounds.warn_max) {
    issues.push({
      code: 'BOUNDS_004',
      severity: 'marginal',
      message: `Value ${raw_value} exceeds warning threshold ${sanity_bounds.warn_max}`,
      field: 'raw_value',
      compensation: ['flag_for_review'],
    });
  }
  
  return issues;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FRESHNESS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateFreshness(
  datapoint: CanonicalDatapoint,
  fss: FeatureSpecificationSheet,
  now: Date = new Date()
): { issues: ValidationIssue[]; flags: QualityFlag[]; confidence: number } {
  const issues: ValidationIssue[] = [];
  const flags: QualityFlag[] = [];
  let confidence = 1.0;
  
  const observedAt = new Date(datapoint.provenance.observed_at);
  const ageSeconds = (now.getTime() - observedAt.getTime()) / 1000;
  
  // Check against FSS staleness threshold
  if (ageSeconds > fss.staleness_threshold_seconds) {
    issues.push({
      code: 'FRESH_001',
      severity: 'marginal',
      message: `Data is ${Math.round(ageSeconds / 60)} minutes old (threshold: ${Math.round(fss.staleness_threshold_seconds / 60)} minutes)`,
      field: 'provenance.observed_at',
      compensation: ['reduce_confidence'],
    });
    flags.push('stale');
    confidence *= 0.8;
  } else if (ageSeconds > STALENESS_THRESHOLDS.acceptable) {
    flags.push('stale');
    confidence *= 0.9;
  } else {
    flags.push('fresh');
  }
  
  // Check for expired data
  if (ageSeconds > STALENESS_THRESHOLDS.expired) {
    issues.push({
      code: 'FRESH_002',
      severity: 'critical',
      message: `Data is ${Math.round(ageSeconds / 86400)} days old. Too stale to use.`,
      field: 'provenance.observed_at',
      compensation: ['exclude_metric'],
    });
    confidence = 0;
  }
  
  return { issues, flags, confidence };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single datapoint (FAIL-CLOSED policy)
 */
export function validateCanonicalDatapoint(
  data: unknown,
  sector: Sector
): DatapointValidationResult {
  // Step 1: Structural validation
  const structResult = validateStructure(data);
  if (!structResult.datapoint) {
    return structResult;
  }
  
  const datapoint = structResult.datapoint;
  const allIssues: ValidationIssue[] = [...structResult.issues];
  const allFlags: QualityFlag[] = [...structResult.quality_flags];
  let confidence = structResult.confidence_multiplier;
  
  // Step 2: Semantic validation
  const semanticIssues = validateSemantics(datapoint, sector);
  allIssues.push(...semanticIssues);
  
  // Step 3: FSS-specific validation
  const fss = getFSS(datapoint.metric_id);
  if (fss) {
    // Sanity bounds
    const boundsIssues = validateSanityBounds(datapoint, fss);
    allIssues.push(...boundsIssues);
    
    // Freshness
    const freshResult = validateFreshness(datapoint, fss);
    allIssues.push(...freshResult.issues);
    allFlags.push(...freshResult.flags.filter(f => !allFlags.includes(f)));
    confidence *= freshResult.confidence;
  }
  
  // Determine final status and action
  const hasCatastrophic = allIssues.some(i => i.severity === 'catastrophic');
  const hasCritical = allIssues.some(i => i.severity === 'critical');
  const hasMarginal = allIssues.some(i => i.severity === 'marginal');
  
  let status: ValidationStatus = 'pass';
  let action: DatapointValidationResult['action'] = 'accept';
  let usable = true;
  
  if (hasCatastrophic) {
    status = 'fail';
    action = 'reject';
    usable = false;
    confidence = 0;
  } else if (hasCritical) {
    status = 'fail';
    action = 'exclude';
    usable = false;
    confidence *= 0.5;
  } else if (hasMarginal) {
    status = 'warn';
    action = 'accept_with_warning';
    confidence *= 0.9;
  }
  
  // Add quality flags based on issues
  if (allIssues.some(i => i.code.startsWith('BOUNDS'))) {
    allFlags.push('outlier');
  }
  if (semanticIssues.length > 0) {
    allFlags.push('suspicious');
  }
  
  return {
    datapoint,
    status,
    issues: allIssues,
    quality_flags: [...new Set(allFlags)],
    usable_for_scoring: usable,
    confidence_multiplier: Math.max(0, Math.min(1, confidence)),
    action,
  };
}

/**
 * Validate a bundle of datapoints for an entity
 */
export function validateEntityBundle(
  datapoints: unknown[],
  entityId: string,
  sector: Sector,
  requiredMetrics: string[] = []
): BundleValidationResult {
  const results = datapoints.map(dp => validateCanonicalDatapoint(dp, sector));
  
  const accepted = results.filter(r => r.action === 'accept' || r.action === 'accept_with_warning');
  const warnings = results.filter(r => r.action === 'accept_with_warning');
  const excluded = results.filter(r => r.action === 'exclude');
  const rejected = results.filter(r => r.action === 'reject' || r.action === 'gate');
  
  const bundleIssues: ValidationIssue[] = [];
  
  // Check required metrics coverage
  const presentMetrics = new Set(
    accepted
      .filter(r => r.datapoint)
      .map(r => r.datapoint!.metric_id)
  );
  
  const missingRequired = requiredMetrics.filter(m => !presentMetrics.has(m));
  if (missingRequired.length > 0) {
    bundleIssues.push({
      code: 'BUNDLE_001',
      severity: 'critical',
      message: `Missing required metrics: ${missingRequired.join(', ')}`,
      compensation: ['gate'],
    });
  }
  
  // Check semantic errors (catastrophic issues)
  const catastrophicIssues = results.flatMap(r => 
    r.issues.filter(i => i.severity === 'catastrophic')
  );
  if (catastrophicIssues.length > 0) {
    bundleIssues.push({
      code: 'BUNDLE_002',
      severity: 'catastrophic',
      message: `${catastrophicIssues.length} catastrophic semantic error(s) detected. Cannot produce reliable score.`,
      compensation: ['gate'],
    });
  }
  
  const coverage = datapoints.length > 0 ? accepted.length / datapoints.length : 0;
  
  // Determine bundle status
  let status: BundleValidationResult['status'] = 'healthy';
  let canScore = true;
  let gatingReason: string | undefined;
  
  if (catastrophicIssues.length > 0) {
    status = 'rejected';
    canScore = false;
    gatingReason = 'Catastrophic semantic errors detected';
  } else if (missingRequired.length > 0) {
    status = 'gated';
    canScore = false;
    gatingReason = `Missing required metrics: ${missingRequired.join(', ')}`;
  } else if (coverage < 0.5) {
    status = 'degraded';
    // Can still score but with reduced confidence
  } else if (warnings.length > accepted.length * 0.3) {
    status = 'degraded';
  }
  
  return {
    entity_id: entityId,
    status,
    datapoint_results: results,
    summary: {
      total: datapoints.length,
      accepted: accepted.length,
      warnings: warnings.length,
      excluded: excluded.length,
      rejected: rejected.length,
      coverage,
    },
    bundle_issues: bundleIssues,
    can_score: canScore,
    gating_reason: gatingReason,
  };
}
