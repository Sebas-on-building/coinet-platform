/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🌐 QS FEATURE: Ecosystem Depth                                            ║
 * ║                                                                               ║
 * ║   Measures: TVL, app count, integrations                                     ║
 * ║   Focus on ONE reliable metric (TVL from DefiLlama)                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { FeatureDefinition, FeatureFunction, FeatureResult, FeatureContext } from '../types';
import {
  getDataValue,
  checkRequiredInputs,
  calculateFreshnessHours,
  calculateConfidence,
  normalizeLog,
  createUnavailableResult,
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export const ECOSYSTEM_DEPTH_DEFINITION: FeatureDefinition = {
  id: 'qs_ecosystem_depth',
  name: 'Ecosystem Depth',
  category: 'qs',
  description: 'Measures ecosystem value and integrations through TVL and protocol count',
  segment: 'ECO',
  defaultWeight: 0.15,
  requiredInputs: [],
  optionalInputs: [
    'tvl_usd',
    'tvl_change_7d',
    'tvl_change_30d',
    'protocol_count',
    'dapp_count',
    'integration_count',
    'tvl_to_mcap_ratio',
  ],
  updateFrequencyHours: 24,
  higherIsBetter: true,
  normalization: {
    method: 'log',
    min: 1_000_000,      // $1M TVL
    max: 100_000_000_000, // $100B TVL
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

export const computeEcosystemDepth: FeatureFunction = (ctx: FeatureContext): FeatureResult => {
  const def = ECOSYSTEM_DEPTH_DEFINITION;
  const allInputs = [...def.requiredInputs, ...def.optionalInputs];
  const { present, missing } = checkRequiredInputs(ctx, allInputs);
  
  // TVL is critical for this feature
  const tvl = getDataValue(ctx, 'tvl_usd');
  if (tvl === null && present.length < 2) {
    return createUnavailableResult(def, missing, 'No TVL or ecosystem data available');
  }
  
  const warnings: string[] = [];
  const intermediates: Record<string, number> = {};
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TVL SCORE (0-60 points) - Primary metric
  // ─────────────────────────────────────────────────────────────────────────────
  let tvlScore = 0;
  
  if (tvl !== null) {
    // Log scale for TVL
    if (tvl >= 50_000_000_000) tvlScore = 60;        // $50B+
    else if (tvl >= 10_000_000_000) tvlScore = 52;   // $10B+
    else if (tvl >= 1_000_000_000) tvlScore = 44;    // $1B+
    else if (tvl >= 100_000_000) tvlScore = 36;      // $100M+
    else if (tvl >= 10_000_000) tvlScore = 28;       // $10M+
    else if (tvl >= 1_000_000) tvlScore = 20;        // $1M+
    else if (tvl >= 100_000) tvlScore = 10;          // $100K+
    else tvlScore = 5;
    
    intermediates['tvl_base_score'] = tvlScore;
    
    // TVL trend adjustment
    const tvlChange7d = getDataValue(ctx, 'tvl_change_7d');
    const tvlChange30d = getDataValue(ctx, 'tvl_change_30d');
    
    if (tvlChange7d !== null) {
      if (tvlChange7d > 10) {
        tvlScore += 5; // Strong growth
      } else if (tvlChange7d < -20) {
        tvlScore -= 10;
        warnings.push('TVL dropped >20% in 7 days');
      } else if (tvlChange7d < -10) {
        tvlScore -= 5;
      }
      intermediates['tvl_7d_adj'] = tvlChange7d > 10 ? 5 : (tvlChange7d < -10 ? -5 : 0);
    }
    
    if (tvlChange30d !== null && tvlChange30d < -50) {
      warnings.push('TVL dropped >50% in 30 days');
    }
  }
  
  tvlScore = Math.max(0, Math.min(60, tvlScore));
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PROTOCOL/APP COUNT (0-25 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let protocolScore = 0;
  const protocolCount = getDataValue(ctx, 'protocol_count');
  const dappCount = getDataValue(ctx, 'dapp_count');
  
  const appCount = protocolCount ?? dappCount ?? null;
  
  if (appCount !== null) {
    if (appCount >= 500) protocolScore = 25;
    else if (appCount >= 200) protocolScore = 20;
    else if (appCount >= 100) protocolScore = 15;
    else if (appCount >= 50) protocolScore = 10;
    else if (appCount >= 20) protocolScore = 5;
    else protocolScore = 2;
    
    intermediates['protocol_count_score'] = protocolScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // INTEGRATIONS (0-15 points)
  // ─────────────────────────────────────────────────────────────────────────────
  let integrationScore = 0;
  const integrations = getDataValue(ctx, 'integration_count');
  
  if (integrations !== null) {
    if (integrations >= 100) integrationScore = 15;
    else if (integrations >= 50) integrationScore = 12;
    else if (integrations >= 20) integrationScore = 8;
    else if (integrations >= 10) integrationScore = 5;
    else integrationScore = 2;
    
    intermediates['integration_score'] = integrationScore;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TVL/MCAP RATIO BONUS
  // ─────────────────────────────────────────────────────────────────────────────
  const tvlMcapRatio = getDataValue(ctx, 'tvl_to_mcap_ratio');
  let ratioBonus = 0;
  
  if (tvlMcapRatio !== null) {
    // Higher TVL relative to market cap = more "real" value
    if (tvlMcapRatio > 0.5) {
      ratioBonus = 5;
    } else if (tvlMcapRatio > 0.2) {
      ratioBonus = 3;
    }
    intermediates['tvl_mcap_ratio_bonus'] = ratioBonus;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // FINAL SCORE
  // ─────────────────────────────────────────────────────────────────────────────
  const rawScore = tvlScore + protocolScore + integrationScore + ratioBonus;
  const normalizedScore = Math.max(0, Math.min(100, rawScore));
  
  return {
    id: def.id,
    name: def.name,
    category: def.category,
    raw: rawScore,
    normalized: normalizedScore,
    weight: def.defaultWeight,
    contribution: normalizedScore * def.defaultWeight,
    available: true,
    quality: {
      coverage: present.length / allInputs.length,
      freshnessHours: calculateFreshnessHours(ctx, present),
      confidence: calculateConfidence(ctx, present),
    },
    inputs: present,
    missing,
    warnings,
    debug: {
      formula: 'tvl_score + protocol_score + integration_score + ratio_bonus',
      intermediates,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const ecosystemDepthFeature = {
  definition: ECOSYSTEM_DEPTH_DEFINITION,
  compute: computeEcosystemDepth,
};
