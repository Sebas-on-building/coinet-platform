/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔗 CIS ↔ OMNISCORE V3 INTEGRATION BRIDGE                                  ║
 * ║                                                                               ║
 * ║   Transforms raw OmniScore data into CIS Canonical Datapoints and applies   ║
 * ║   semantic validation before scoring.                                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { 
  CanonicalDatapoint, 
  Direction, 
  Unit, 
  ScoreCategory,
  SourceType,
  QualityFlag,
  Sector 
} from '../index';
import { createDatapoint, validateEntityBundle } from '../index';
import { getFSS } from '../layer2/fss-registry';
import type { DataPoint } from '../../omniscore_v3/types';

// ═══════════════════════════════════════════════════════════════════════════════
// MAPPING: OmniScore Feature → CIS Metric
// ═══════════════════════════════════════════════════════════════════════════════

interface MetricMapping {
  metric_id: string;
  score_category: ScoreCategory;
  direction: Direction;
  unit: Unit;
  source_type: SourceType;
}

/**
 * Maps OmniScore feature IDs to CIS metric definitions
 */
const FEATURE_TO_CIS_MAPPING: Record<string, MetricMapping> = {
  // Quality Score Features
  'qs_security_posture': {
    metric_id: 'qs_security_posture_v1',
    score_category: 'QS',
    direction: 'higher_is_better',
    unit: 'SCORE_0_100',
    source_type: 'aggregator',
  },
  'qs_dev_delivery': {
    metric_id: 'qs_dev_delivery_v1',
    score_category: 'QS',
    direction: 'higher_is_better',
    unit: 'SCORE_0_100',
    source_type: 'github_api',
  },
  'qs_adoption': {
    metric_id: 'qs_adoption_v1',
    score_category: 'QS',
    direction: 'higher_is_better',
    unit: 'SCORE_0_100',
    source_type: 'blockchain_rpc',
  },
  'qs_ecosystem_depth': {
    metric_id: 'qs_ecosystem_depth_v1',
    score_category: 'QS',
    direction: 'higher_is_better',
    unit: 'SCORE_0_100',
    source_type: 'aggregator',
  },
  'qs_sustainability': {
    metric_id: 'qs_sustainability_v1',
    score_category: 'QS',
    direction: 'higher_is_better',
    unit: 'RATIO',
    source_type: 'aggregator',
  },
  'qs_decentralization': {
    metric_id: 'qs_decentralization_v1',
    score_category: 'QS',
    direction: 'higher_is_better',
    unit: 'SCORE_0_100',
    source_type: 'blockchain_rpc',
  },
  
  // Opportunity Score Features
  'os_liquidity_depth': {
    metric_id: 'os_liquidity_depth_v1',
    score_category: 'OS',
    direction: 'higher_is_better',
    unit: 'USD',
    source_type: 'exchange_api',
  },
  'os_volume_quality': {
    metric_id: 'os_volume_quality_v1',
    score_category: 'OS',
    direction: 'higher_is_better',
    unit: 'SCORE_0_100',
    source_type: 'aggregator',
  },
  'os_momentum': {
    metric_id: 'os_momentum_v1',
    score_category: 'OS',
    direction: 'neutral',
    unit: 'SCORE_0_100',
    source_type: 'aggregator',
  },
  'os_volatility_regime': {
    metric_id: 'os_volatility_regime_v1',
    score_category: 'OS',
    direction: 'neutral',
    unit: 'SCORE_0_100',
    source_type: 'aggregator',
  },
  'os_flow_signals': {
    metric_id: 'os_flow_signals_v1',
    score_category: 'OS',
    direction: 'higher_is_better',
    unit: 'SCORE_0_100',
    source_type: 'blockchain_rpc',
  },
  
  // Risk Features
  'risk_liquidity_fragility': {
    metric_id: 'risk_liquidity_fragility_v1',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    unit: 'SCORE_0_100',
    source_type: 'exchange_api',
  },
  'risk_concentration': {
    metric_id: 'risk_concentration_v1',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    unit: 'PERCENT',
    source_type: 'blockchain_rpc',
  },
  'risk_unlock': {
    metric_id: 'risk_unlock_v1',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    unit: 'PERCENT',
    source_type: 'aggregator',
  },
  'risk_admin_privilege': {
    metric_id: 'risk_admin_privilege_v1',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    unit: 'SCORE_0_100',
    source_type: 'derived',
  },
  'risk_incident': {
    metric_id: 'risk_incident_v1',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    unit: 'SCORE_0_100',
    source_type: 'aggregator',
  },
  'risk_data_integrity': {
    metric_id: 'risk_data_integrity_v1',
    score_category: 'RISK',
    direction: 'higher_is_worse',
    unit: 'SCORE_0_100',
    source_type: 'derived',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONVERSION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert OmniScore DataPoint to CIS CanonicalDatapoint
 */
export function convertToCanonicalDatapoint(
  featureId: string,
  dataPoint: DataPoint,
  entityId: string
): CanonicalDatapoint | null {
  const mapping = FEATURE_TO_CIS_MAPPING[featureId];
  if (!mapping) {
    console.warn(`[CIS] Unknown feature ID: ${featureId}. Skipping.`);
    return null;
  }
  
  // Determine quality flags
  const qualityFlags: QualityFlag[] = [];
  
  if (dataPoint.freshness !== undefined) {
    if (dataPoint.freshness >= 0.9) qualityFlags.push('fresh');
    else if (dataPoint.freshness < 0.5) qualityFlags.push('stale');
  } else {
    qualityFlags.push('fresh'); // Assume fresh if not specified
  }
  
  if (dataPoint.derivedFrom) {
    qualityFlags.push('derived');
  }
  
  if (dataPoint.warnings && dataPoint.warnings.length > 0) {
    qualityFlags.push('suspicious');
  }
  
  // Create canonical datapoint
  return createDatapoint({
    metric_id: mapping.metric_id,
    entity_id: entityId,
    raw_value: dataPoint.value ?? dataPoint.normalizedValue ?? 0,
    unit: mapping.unit,
    direction: mapping.direction,
    score_category: mapping.score_category,
    source: dataPoint.source ?? 'unknown',
    source_type: mapping.source_type,
    is_derived: mapping.source_type === 'derived',
    validation_status: 'pass', // Will be validated by CIS
    quality_flags: qualityFlags,
    time_window: dataPoint.timeWindow,
    metadata: {
      original_feature_id: featureId,
      original_timestamp: dataPoint.timestamp,
      reliability: dataPoint.reliability,
      source_confidence: dataPoint.sourceConfidence,
    },
  });
}

/**
 * Convert all OmniScore features to CIS datapoints
 */
export function convertFeaturesToCanonical(
  features: Record<string, DataPoint>,
  entityId: string
): CanonicalDatapoint[] {
  const datapoints: CanonicalDatapoint[] = [];
  
  for (const [featureId, dataPoint] of Object.entries(features)) {
    const canonical = convertToCanonicalDatapoint(featureId, dataPoint, entityId);
    if (canonical) {
      datapoints.push(canonical);
    }
  }
  
  return datapoints;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

export interface SemanticFilterResult {
  /** Datapoints that passed semantic validation */
  valid: CanonicalDatapoint[];
  
  /** Datapoints excluded due to sector mismatch */
  excluded: Array<{
    datapoint: CanonicalDatapoint;
    reason: string;
  }>;
  
  /** Summary */
  summary: {
    total: number;
    valid: number;
    excluded: number;
    exclusion_reasons: string[];
  };
}

/**
 * Filter datapoints based on sector applicability
 * 
 * This is the KEY function that prevents semantic errors like:
 * "XRP looks weak because it has no TVL" ← WRONG
 * 
 * TVL is simply not applicable to Payment tokens, so it should
 * be EXCLUDED, not penalized.
 */
export function filterBySectorApplicability(
  datapoints: CanonicalDatapoint[],
  sector: Sector
): SemanticFilterResult {
  const valid: CanonicalDatapoint[] = [];
  const excluded: SemanticFilterResult['excluded'] = [];
  const exclusionReasons: Set<string> = new Set();
  
  for (const dp of datapoints) {
    const fss = getFSS(dp.metric_id);
    
    if (!fss) {
      excluded.push({
        datapoint: dp,
        reason: `Unknown metric: ${dp.metric_id}`,
      });
      exclusionReasons.add('unknown_metric');
      continue;
    }
    
    // Check forbidden sectors
    if (fss.forbidden_sectors.includes(sector)) {
      const reason = `${dp.metric_id} is forbidden for sector ${sector}`;
      excluded.push({ datapoint: dp, reason });
      exclusionReasons.add('sector_forbidden');
      continue;
    }
    
    // Check allowed sectors
    if (!fss.allowed_sectors.includes(sector)) {
      const reason = `${dp.metric_id} is not applicable to sector ${sector} (allowed: ${fss.allowed_sectors.join(', ')})`;
      excluded.push({ datapoint: dp, reason });
      exclusionReasons.add('sector_not_applicable');
      continue;
    }
    
    valid.push(dp);
  }
  
  return {
    valid,
    excluded,
    summary: {
      total: datapoints.length,
      valid: valid.length,
      excluded: excluded.length,
      exclusion_reasons: Array.from(exclusionReasons),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL VALIDATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CISValidationResult {
  /** Entity ID */
  entity_id: string;
  
  /** Asset sector */
  sector: Sector;
  
  /** Validated datapoints ready for scoring */
  validated_datapoints: CanonicalDatapoint[];
  
  /** Excluded datapoints with reasons */
  excluded_datapoints: Array<{
    datapoint: CanonicalDatapoint;
    reason: string;
  }>;
  
  /** Can we produce a score? */
  can_score: boolean;
  
  /** Gating reason if cannot score */
  gating_reason?: string;
  
  /** Coverage metrics */
  coverage: {
    qs_coverage: number;
    os_coverage: number;
    risk_coverage: number;
    overall: number;
  };
  
  /** Warnings to surface */
  warnings: string[];
}

/**
 * Full CIS validation pipeline for OmniScore
 */
export function validateForOmniScore(
  features: Record<string, DataPoint>,
  entityId: string,
  sector: Sector
): CISValidationResult {
  const warnings: string[] = [];
  
  // Step 1: Convert to canonical format
  const canonicalDatapoints = convertFeaturesToCanonical(features, entityId);
  
  // Step 2: Filter by sector applicability
  const filterResult = filterBySectorApplicability(canonicalDatapoints, sector);
  
  if (filterResult.excluded.length > 0) {
    warnings.push(
      `${filterResult.excluded.length} metric(s) excluded due to sector mismatch (${sector})`
    );
  }
  
  // Step 3: Full validation
  const bundleResult = validateEntityBundle(
    filterResult.valid,
    entityId,
    sector
  );
  
  // Step 4: Calculate coverage
  const validatedDatapoints = bundleResult.datapoint_results
    .filter(r => r.usable_for_scoring && r.datapoint)
    .map(r => r.datapoint!);
  
  const qsCount = validatedDatapoints.filter(
    dp => dp.score_category === 'QS'
  ).length;
  const osCount = validatedDatapoints.filter(
    dp => dp.score_category === 'OS'
  ).length;
  const riskCount = validatedDatapoints.filter(
    dp => dp.score_category === 'RISK'
  ).length;
  
  // Expected counts (based on FSS applicable to sector)
  const expectedQs = 6; // Max QS features
  const expectedOs = 5; // Max OS features
  const expectedRisk = 6; // Max Risk features
  
  const qsCoverage = qsCount / expectedQs;
  const osCoverage = osCount / expectedOs;
  const riskCoverage = riskCount / expectedRisk;
  
  // Check gating conditions
  let canScore = bundleResult.can_score;
  let gatingReason = bundleResult.gating_reason;
  
  if (qsCoverage < 0.6) {
    canScore = false;
    gatingReason = `QS coverage too low: ${(qsCoverage * 100).toFixed(0)}% (minimum: 60%)`;
  }
  
  if (bundleResult.bundle_issues.some(i => i.severity === 'catastrophic')) {
    canScore = false;
    gatingReason = 'Catastrophic semantic errors detected';
  }
  
  return {
    entity_id: entityId,
    sector,
    validated_datapoints: validatedDatapoints,
    excluded_datapoints: filterResult.excluded,
    can_score: canScore,
    gating_reason: gatingReason,
    coverage: {
      qs_coverage: qsCoverage,
      os_coverage: osCoverage,
      risk_coverage: riskCoverage,
      overall: (qsCoverage + osCoverage + riskCoverage) / 3,
    },
    warnings,
  };
}
