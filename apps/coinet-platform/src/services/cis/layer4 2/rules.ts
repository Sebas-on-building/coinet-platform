/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 4 - VALIDATION RULES TABLE                                  ║
 * ║                                                                               ║
 * ║   "Table: Layer 4 Validation Rule Specification"                             ║
 * ║                                                                               ║
 * ║   Every rule is documented with:                                             ║
 * ║   - Rule Type                                                                ║
 * ║   - Metric ID                                                                ║
 * ║   - Condition / Expression                                                   ║
 * ║   - Resulting Quality Flag                                                   ║
 * ║   - Gating Impact                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type { ValidationRule, CrossMetricCheck } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURAL VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const STRUCTURAL_RULES: ValidationRule[] = [
  {
    rule_id: 'STRUCT_001',
    name: 'Finite Value Check',
    type: 'STRUCTURAL',
    applies_to: [], // All metrics
    description: 'Raw value must be finite (no NaN, no Infinity)',
    condition: 'isFinite(raw_value) === true',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 10,
    enabled: true,
  },
  {
    rule_id: 'STRUCT_002',
    name: 'Null/Undefined Check',
    type: 'STRUCTURAL',
    applies_to: [],
    description: 'Raw value must not be null or undefined',
    condition: 'raw_value !== null && raw_value !== undefined',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 10,
    enabled: true,
  },
  {
    rule_id: 'STRUCT_003',
    name: 'Numeric Type Check',
    type: 'STRUCTURAL',
    applies_to: [],
    description: 'Raw value must be a valid number',
    condition: 'typeof raw_value === "number"',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 10,
    enabled: true,
  },
  {
    rule_id: 'STRUCT_004',
    name: 'Timestamp Recency',
    type: 'STRUCTURAL',
    applies_to: [],
    description: 'Observation timestamp must be in the past',
    condition: 'timestamp_observed <= now()',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 8,
    enabled: true,
  },
  {
    rule_id: 'STRUCT_005',
    name: 'Required Fields Present',
    type: 'STRUCTURAL',
    applies_to: [],
    description: 'All mandatory fields must be present (unit, direction, source)',
    condition: 'unit && direction && source',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 10,
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC BOUND RULES (Impossible/Sanity Bounds)
// ═══════════════════════════════════════════════════════════════════════════════

export const SEMANTIC_BOUND_RULES: ValidationRule[] = [
  {
    rule_id: 'SEM_001',
    name: 'Market Cap Minimum',
    type: 'SEMANTIC_BOUND',
    applies_to: ['market_cap_usd', 'market_cap'],
    description: 'Market capitalization must be positive and ≥ $1,000',
    condition: 'market_cap >= 1000',
    resulting_flag: 'FAIL',
    gating_impact: 'GATED',
    severity: 10,
    enabled: true,
  },
  {
    rule_id: 'SEM_002',
    name: 'Market Cap Maximum',
    type: 'SEMANTIC_BOUND',
    applies_to: ['market_cap_usd', 'market_cap'],
    description: 'Market cap cannot exceed $10^15 (reasonable upper bound)',
    condition: 'market_cap <= 1e15',
    resulting_flag: 'FAIL',
    gating_impact: 'GATED',
    severity: 10,
    enabled: true,
  },
  {
    rule_id: 'SEM_003',
    name: 'Price Positivity',
    type: 'SEMANTIC_BOUND',
    applies_to: ['price_usd', 'price'],
    description: 'Price must be strictly positive',
    condition: 'price > 0',
    resulting_flag: 'FAIL',
    gating_impact: 'GATED',
    severity: 10,
    enabled: true,
  },
  {
    rule_id: 'SEM_004',
    name: 'Supply Positivity',
    type: 'SEMANTIC_BOUND',
    applies_to: ['circulating_supply', 'total_supply'],
    description: 'Supply must be non-negative',
    condition: 'supply >= 0',
    resulting_flag: 'FAIL',
    gating_impact: 'GATED',
    severity: 10,
    enabled: true,
  },
  {
    rule_id: 'SEM_005',
    name: 'Daily Supply Increase Limit',
    type: 'SEMANTIC_BOUND',
    applies_to: ['supply_change_24h'],
    description: '24h supply increase cannot exceed 10% (PoW constraint)',
    condition: 'supply_change_24h_percent <= 10',
    resulting_flag: 'SUSPICIOUS',
    gating_impact: 'SCORE_CAP',
    severity: 8,
    enabled: true,
  },
  {
    rule_id: 'SEM_006',
    name: 'Volume Positivity',
    type: 'SEMANTIC_BOUND',
    applies_to: ['volume_24h', 'volume'],
    description: 'Volume must be non-negative',
    condition: 'volume >= 0',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 9,
    enabled: true,
  },
  {
    rule_id: 'SEM_007',
    name: 'TVL Positivity',
    type: 'SEMANTIC_BOUND',
    applies_to: ['tvl', 'tvl_usd'],
    description: 'TVL must be non-negative',
    condition: 'tvl >= 0',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 9,
    enabled: true,
  },
  {
    rule_id: 'SEM_008',
    name: 'Percentage Bounds',
    type: 'SEMANTIC_BOUND',
    applies_to: ['concentration_percent', 'holder_percent'],
    description: 'Percentage values must be 0-100',
    condition: 'value >= 0 && value <= 100',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 9,
    enabled: true,
  },
  {
    rule_id: 'SEM_009',
    name: 'Score Bounds',
    type: 'SEMANTIC_BOUND',
    applies_to: ['score', 'qs', 'os', 'risk_score'],
    description: 'Scores must be bounded [0, 100]',
    condition: 'score >= 0 && score <= 100',
    resulting_flag: 'FAIL',
    gating_impact: 'GATED',
    severity: 10,
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-METRIC CONSISTENCY CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

export const CROSS_METRIC_CHECKS: CrossMetricCheck[] = [
  {
    check_id: 'CROSS_001',
    description: 'Market Cap = Price × Circulating Supply (within 2% tolerance)',
    metrics: ['market_cap_usd', 'price_usd', 'circulating_supply'],
    relationship: 'ln(market_cap) ≈ ln(price × supply)',
    tolerance_percent: 2,
    failure_flag: 'WARN',
    failure_impact: 'CONFIDENCE_REDUCE',
  },
  {
    check_id: 'CROSS_002',
    description: 'Circulating Supply ≤ Total Supply',
    metrics: ['circulating_supply', 'total_supply'],
    relationship: 'circulating_supply <= total_supply',
    tolerance_percent: 0,
    failure_flag: 'FAIL',
    failure_impact: 'GATED',
  },
  {
    check_id: 'CROSS_003',
    description: 'Fully Diluted Valuation = Price × Total Supply',
    metrics: ['fdv_usd', 'price_usd', 'total_supply'],
    relationship: 'fdv ≈ price × total_supply',
    tolerance_percent: 2,
    failure_flag: 'WARN',
    failure_impact: 'CONFIDENCE_REDUCE',
  },
  {
    check_id: 'CROSS_004',
    description: 'Volume/Market Cap Ratio Sanity',
    metrics: ['volume_24h', 'market_cap_usd'],
    relationship: 'volume_24h / market_cap <= 10 (1000% daily turnover max)',
    tolerance_percent: 0,
    failure_flag: 'SUSPICIOUS',
    failure_impact: 'SCORE_CAP',
  },
  {
    check_id: 'CROSS_005',
    description: 'TVL ≤ Market Cap (for DeFi tokens)',
    metrics: ['tvl_usd', 'market_cap_usd'],
    relationship: 'tvl <= market_cap × 10 (TVL can exceed MC but with limit)',
    tolerance_percent: 0,
    failure_flag: 'WARN',
    failure_impact: 'CONFIDENCE_REDUCE',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIORAL ANOMALY RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const BEHAVIORAL_ANOMALY_RULES: ValidationRule[] = [
  {
    rule_id: 'BEHAV_001',
    name: 'Volume-Liquidity Mismatch',
    type: 'BEHAVIORAL_ANOMALY',
    applies_to: ['volume_24h', 'liquidity_depth'],
    description: 'Volume spike > 400% AND liquidity depth change < 10% indicates manipulation',
    condition: '!(volume_spike_percent > 400 && liquidity_depth_change_percent < 10)',
    resulting_flag: 'SUSPICIOUS',
    gating_impact: 'SCORE_CAP',
    severity: 8,
    enabled: true,
  },
  {
    rule_id: 'BEHAV_002',
    name: 'Wash Trading Signal',
    type: 'BEHAVIORAL_ANOMALY',
    applies_to: ['volume_24h', 'unique_traders'],
    description: 'High volume with low unique trader count suggests wash trading',
    condition: '!(volume_24h > 10M && unique_traders < 100)',
    resulting_flag: 'SUSPICIOUS',
    gating_impact: 'SCORE_CAP',
    severity: 9,
    enabled: true,
  },
  {
    rule_id: 'BEHAV_003',
    name: 'Social-Fundamental Divergence',
    type: 'BEHAVIORAL_ANOMALY',
    applies_to: ['social_score', 'tvl', 'active_users', 'fees_24h'],
    description: 'Social hype without fundamental improvement signals speculation',
    condition: '!(social_spike > 200% && fundamental_change < 5%)',
    resulting_flag: 'WARN',
    gating_impact: 'CONFIDENCE_REDUCE',
    severity: 6,
    enabled: true,
  },
  {
    rule_id: 'BEHAV_004',
    name: 'Concentration Spike',
    type: 'BEHAVIORAL_ANOMALY',
    applies_to: ['top_10_holder_percent'],
    description: 'Sudden concentration increase > 10% suggests accumulation/manipulation',
    condition: 'concentration_change_24h_percent <= 10',
    resulting_flag: 'SUSPICIOUS',
    gating_impact: 'CONFIDENCE_REDUCE',
    severity: 7,
    enabled: true,
  },
  {
    rule_id: 'BEHAV_005',
    name: 'Price-Volume Divergence',
    type: 'BEHAVIORAL_ANOMALY',
    applies_to: ['price_change_24h', 'volume_24h'],
    description: 'Large price move without corresponding volume is suspicious',
    condition: '!(abs(price_change_percent) > 20 && volume_change_percent < 50)',
    resulting_flag: 'WARN',
    gating_impact: 'CONFIDENCE_REDUCE',
    severity: 5,
    enabled: true,
  },
  {
    rule_id: 'BEHAV_006',
    name: 'Supply Manipulation Signal',
    type: 'BEHAVIORAL_ANOMALY',
    applies_to: ['circulating_supply', 'supply_change_24h'],
    description: 'Unusual supply changes (>5% in 24h) warrant investigation',
    condition: 'abs(supply_change_24h_percent) <= 5',
    resulting_flag: 'WARN',
    gating_impact: 'CONFIDENCE_REDUCE',
    severity: 6,
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STALENESS RULES
// ═══════════════════════════════════════════════════════════════════════════════

export const STALENESS_RULES: ValidationRule[] = [
  {
    rule_id: 'STALE_001',
    name: 'High-Impact Metric Staleness',
    type: 'STALENESS',
    applies_to: ['price_usd', 'market_cap_usd', 'volume_24h'],
    description: 'High-impact metrics must be fresher than 600 seconds (10 min)',
    condition: 'age_seconds <= 600',
    resulting_flag: 'STALE',
    gating_impact: 'WARN',
    severity: 7,
    enabled: true,
  },
  {
    rule_id: 'STALE_002',
    name: 'Critical Metric Staleness',
    type: 'STALENESS',
    applies_to: ['price_usd'],
    description: 'Price must be fresher than 60 seconds for trading context',
    condition: 'age_seconds <= 60',
    resulting_flag: 'STALE',
    gating_impact: 'CONFIDENCE_REDUCE',
    severity: 8,
    enabled: true,
  },
  {
    rule_id: 'STALE_003',
    name: 'General Metric Staleness',
    type: 'STALENESS',
    applies_to: [], // All other metrics
    description: 'General metrics must be fresher than 1 hour',
    condition: 'age_seconds <= 3600',
    resulting_flag: 'STALE',
    gating_impact: 'WARN',
    severity: 5,
    enabled: true,
  },
  {
    rule_id: 'STALE_004',
    name: 'Expired Data',
    type: 'STALENESS',
    applies_to: [],
    description: 'Data older than 24 hours is expired and must be excluded',
    condition: 'age_seconds <= 86400',
    resulting_flag: 'FAIL',
    gating_impact: 'METRIC_EXCLUDE',
    severity: 9,
    enabled: true,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ALL RULES COMBINED
// ═══════════════════════════════════════════════════════════════════════════════

export const ALL_VALIDATION_RULES: ValidationRule[] = [
  ...STRUCTURAL_RULES,
  ...SEMANTIC_BOUND_RULES,
  ...BEHAVIORAL_ANOMALY_RULES,
  ...STALENESS_RULES,
];

/**
 * Get rules applicable to a specific metric
 */
export function getRulesForMetric(metricId: string): ValidationRule[] {
  return ALL_VALIDATION_RULES.filter(rule => 
    rule.enabled && (
      rule.applies_to.length === 0 || // Universal rule
      rule.applies_to.some(pattern => metricId.includes(pattern))
    )
  );
}

/**
 * Get rules by type
 */
export function getRulesByType(type: ValidationRule['type']): ValidationRule[] {
  return ALL_VALIDATION_RULES.filter(rule => rule.enabled && rule.type === type);
}
