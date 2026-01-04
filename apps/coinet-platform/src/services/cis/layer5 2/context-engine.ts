/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 5 - CONTEXTUAL RULES ENGINE                                 ║
 * ║                                                                               ║
 * ║   "The contextual rules engine acts as a pre-filtering mechanism based on    ║
 * ║    the Layer 2 FSS constraints. It ensures that only relevant, material      ║
 * ║    metrics are passed to the interpretation stage."                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  AssetCategory,
  AssetClassification,
  ContextualFilterResult,
  MetricRelevance,
} from './types';
import {
  classifyAsset,
  getMetricPriorities,
  getSectorFromCategory,
  CATEGORY_METRIC_PRIORITIES,
} from './taxonomy';
import { FSS_REGISTRY, isMetricApplicableToSector, validateMetricApplication } from '../layer2/fss-registry';
import type { Sector } from '../layer2/fss-types';

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC RELEVANCE DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine metric relevance for an asset category
 */
export function getMetricRelevance(
  metricId: string,
  category: AssetCategory,
): MetricRelevance {
  const priorities = getMetricPriorities(category);
  
  if (!priorities) {
    // Unknown category - check FSS sector applicability
    const sector = getSectorFromCategory(category);
    const isApplicable = isMetricApplicableToSector(metricId, sector as Sector);
    return isApplicable ? 'RELEVANT' : 'NOT_APPLICABLE';
  }
  
  // Check in priority order
  if (priorities.forbidden_metrics.includes(metricId)) {
    return 'FORBIDDEN';
  }
  
  if (priorities.not_applicable_metrics.includes(metricId)) {
    return 'NOT_APPLICABLE';
  }
  
  if (priorities.critical_metrics.includes(metricId)) {
    return 'CRITICAL';
  }
  
  if (priorities.important_metrics.includes(metricId)) {
    return 'IMPORTANT';
  }
  
  if (priorities.relevant_metrics.includes(metricId)) {
    return 'RELEVANT';
  }
  
  // Check FSS sector applicability as fallback
  const sector = getSectorFromCategory(category);
  const isApplicable = isMetricApplicableToSector(metricId, sector as Sector);
  
  return isApplicable ? 'OPTIONAL' : 'NOT_APPLICABLE';
}

/**
 * Get weight modifier based on relevance
 */
function getWeightModifier(relevance: MetricRelevance): number {
  switch (relevance) {
    case 'CRITICAL':
      return 1.2; // Boost critical metrics
    case 'IMPORTANT':
      return 1.0;
    case 'RELEVANT':
      return 0.8;
    case 'OPTIONAL':
      return 0.5;
    case 'NOT_APPLICABLE':
    case 'FORBIDDEN':
      return 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXTUAL FILTERING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filter metrics based on asset classification context
 * 
 * This is the KEY function that prevents category mistakes like:
 * "XRP looks weak because it has no TVL" ← WRONG
 * 
 * For Payment tokens:
 * - TVL is NOT_APPLICABLE (excluded)
 * - Adoption, Liquidity are CRITICAL (boosted)
 */
export function filterMetricsByContext(
  entityId: string,
  availableMetricIds: string[],
  classification?: AssetClassification,
): ContextualFilterResult {
  const now = new Date().toISOString();
  
  // Classify asset if not provided
  const assetClassification = classification ?? classifyAsset(entityId);
  const category = assetClassification.primary_category;
  const sector = assetClassification.sector_group; // Get sector for FSS check

  const applicableMetrics: ContextualFilterResult['applicable_metrics'] = [];
  const excludedMetrics: ContextualFilterResult['excluded_metrics'] = [];
  const priorityMetrics: string[] = [];
  
  // Process each available metric
  for (const metricId of availableMetricIds) {
    // First, check against FSS directly using the asset's sector
    const fssValidation = validateMetricApplication(metricId, sector as Sector);
    console.log(`[filterMetricsByContext] Metric: ${metricId}, Sector: ${sector}, FSS Validation: ${JSON.stringify(fssValidation)}`);

    let relevance: MetricRelevance; // Initialize relevance
    let reason = '';

    if (!fssValidation.valid) {
      relevance = fssValidation.error.includes('FORBIDDEN') ? 'FORBIDDEN' : 'NOT_APPLICABLE';
      reason = fssValidation.error; // Use the detailed error message from FSS validation
    } else {
      // If FSS says it's valid for the sector, then check priorities
      relevance = getMetricRelevance(metricId, category);
    }
    console.log(`[filterMetricsByContext] Metric: ${metricId}, Category: ${category}, Relevance: ${relevance}`);

    const weightModifier = getWeightModifier(relevance);
    
    if (relevance === 'FORBIDDEN' || relevance === 'NOT_APPLICABLE') {
      excludedMetrics.push({
        metric_id: metricId,
        reason: reason || `${metricId} is ${relevance.toLowerCase()} for ${category} assets`,
        would_be_relevance: relevance,
      });
    } else {
      applicableMetrics.push({
        metric_id: metricId,
        relevance,
        weight_modifier: weightModifier,
      });
      
      // Track priority metrics
      if (relevance === 'CRITICAL' || relevance === 'IMPORTANT') {
        priorityMetrics.push(metricId);
      }
    }
  }
  
  // Calculate coverage
  const priorities = getMetricPriorities(category);
  let criticalCoverage = 1.0;
  let importantCoverage = 1.0;
  
  if (priorities) {
    const criticalPresent = priorities.critical_metrics.filter(
      m => applicableMetrics.some(am => am.metric_id === m)
    ).length;
    const importantPresent = priorities.important_metrics.filter(
      m => applicableMetrics.some(am => am.metric_id === m)
    ).length;
    
    criticalCoverage = priorities.critical_metrics.length > 0
      ? criticalPresent / priorities.critical_metrics.length
      : 1.0;
    importantCoverage = priorities.important_metrics.length > 0
      ? importantPresent / priorities.important_metrics.length
      : 1.0;
  }
  
  const overallCoverage = criticalCoverage * 0.6 + importantCoverage * 0.4;
  
  return {
    entity_id: entityId,
    classification: assetClassification,
    applicable_metrics: applicableMetrics,
    excluded_metrics: excludedMetrics,
    priority_metrics: priorityMetrics,
    coverage: {
      critical_coverage: criticalCoverage,
      important_coverage: importantCoverage,
      overall_coverage: overallCoverage,
    },
    filtered_at: now,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPECIALIZED FILTERS FOR ASSET TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get payment-specific metrics for a payments token
 * 
 * Example: XRP should be evaluated on:
 * - Settlement usage (tx count, velocity)
 * - Liquidity
 * - NOT TVL, NOT ecosystem depth
 */
export function getPaymentTokenMetrics(
  availableMetricIds: string[],
): {
  applicable: string[];
  excluded: string[];
  reason: string;
} {
  const paymentRelevant = [
    'qs_adoption_v1',           // Settlement usage
    'os_liquidity_depth_v1',    // Liquidity for payments
    'os_volume_quality_v1',     // Real volume
    'os_momentum_v1',
    'risk_concentration_v1',
    'risk_dat-integrity_v1',
  ];
  
  const paymentExcluded = [
    'qs_tvl_v1',                 // TVL is meaningless for payments
    'qs_ecosystem_depth_v1',    // No ecosystem
    'qs_sustainability_v1',     // Different model
    'qs_dev_delivery_v1',       // Often closed dev
    'qs_decentralization_v1',   // Not meaningful
  ];
  
  return {
    applicable: availableMetricIds.filter(
      m => paymentRelevant.includes(m) || !paymentExcluded.includes(m)
    ),
    excluded: availableMetricIds.filter(m => paymentExcluded.includes(m)),
    reason: 'Payment tokens: Focus on settlement usage and liquidity. TVL is not applicable.',
  };
}

/**
 * Get meme coin specific metrics
 */
export function getMemeCoinMetrics(
  availableMetricIds: string[],
): {
  applicable: string[];
  excluded: string[];
  reason: string;
} {
  const memeRelevant = [
    'qs_adoption_v1',           // Community size
    'os_liquidity_depth_v1',
    'os_volume_quality_v1',
    'os_momentum_v1',
    'os_volatility_regime_v1',
    'risk_concentration_v1',
    'risk_liquidity_fragility_v1',
  ];
  
  const memeExcluded = [
    'qs_security_posture_v1',   // No security infra
    'qs_dev_delivery_v1',       // No dev
    'qs_ecosystem_depth_v1',    // No ecosystem
    'qs_sustainability_v1',     // No revenue model
    'qs_tvl_v1',                // No TVL
    'qs_decentralization_v1',   // Not meaningful
    'risk_unlock_v1',           // Usually fully circulating
    'risk_admin_privilege_v1',  // Usually renounced
  ];
  
  return {
    applicable: availableMetricIds.filter(
      m => memeRelevant.includes(m)
    ),
    excluded: availableMetricIds.filter(m => memeExcluded.includes(m)),
    reason: 'Meme coins: Most QS metrics are not applicable. Focus on community and liquidity.',
  };
}

/**
 * Get stablecoin specific metrics
 */
export function getStablecoinMetrics(
  availableMetricIds: string[],
): {
  applicable: string[];
  excluded: string[];
  reason: string;
} {
  const stableRelevant = [
    'qs_security_posture_v1',   // Peg stability
    'qs_adoption_v1',           // Usage
    'os_liquidity_depth_v1',
    'risk_concentration_v1',
    'risk_dat-integrity_v1',
  ];
  
  const stableExcluded = [
    'qs_tvl_v1',
    'qs_dev_delivery_v1',
    'qs_ecosystem_depth_v1',
    'qs_sustainability_v1',
    'qs_decentralization_v1',
    'os_momentum_v1',            // No momentum for stables
    'os_volatility_regime_v1',   // Should be 0
    'os_flow_signals_v1',
    'risk_unlock_v1',
  ];
  
  return {
    applicable: availableMetricIds.filter(
      m => stableRelevant.includes(m)
    ),
    excluded: availableMetricIds.filter(m => stableExcluded.includes(m)),
    reason: 'Stablecoins: Peg stability is critical. Momentum/volatility are meaningless.',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT-AWARE INTERPRETATION PREPARATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prepare metrics for interpretation by filtering and annotating
 * 
 * This ensures the AI only sees metrics that are valid for this asset type,
 * preventing category mistakes.
 */
export function prepareForInterpretation(
  entityId: string,
  rawMetrics: Record<string, { value: number; timestamp: string }>,
  classification?: AssetClassification,
): {
  filteredMetrics: Record<string, {
    value: number;
    timestamp: string;
    relevance: MetricRelevance;
    weight_modifier: number;
  }>;
  excludedMetrics: string[];
  classification: AssetClassification;
  interpretationContext: string;
} {
  // Get classification
  const assetClassification = classification ?? classifyAsset(entityId);
  
  // Filter metrics by context
  const filterResult = filterMetricsByContext(
    entityId,
    Object.keys(rawMetrics),
    assetClassification
  );
  
  // Build filtered metrics with annotations
  const filteredMetrics: Record<string, {
    value: number;
    timestamp: string;
    relevance: MetricRelevance;
    weight_modifier: number;
  }> = {};
  
  for (const applicable of filterResult.applicable_metrics) {
    const raw = rawMetrics[applicable.metric_id];
    if (raw) {
      filteredMetrics[applicable.metric_id] = {
        ...raw,
        relevance: applicable.relevance,
        weight_modifier: applicable.weight_modifier,
      };
    }
  }
  
  // Build interpretation context
  const categoryPriorities = getMetricPriorities(assetClassification.primary_category);
  const interpretationContext = categoryPriorities?.notes ?? 
    `Asset classified as ${assetClassification.primary_category}. Use sector-appropriate analysis.`;
  
  return {
    filteredMetrics,
    excludedMetrics: filterResult.excluded_metrics.map(e => e.metric_id),
    classification: assetClassification,
    interpretationContext,
  };
}
