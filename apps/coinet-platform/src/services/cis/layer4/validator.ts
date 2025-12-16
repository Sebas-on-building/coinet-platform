/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🏛️ CIS LAYER 4 - VALIDATION ENGINE                                       ║
 * ║                                                                               ║
 * ║   THE FAIL-CLOSED MECHANISM                                                   ║
 * ║                                                                               ║
 * ║   "Poor data quality must never be interpreted as genuine financial          ║
 * ║    strength, but instead must reduce the confidence or gate the final        ║
 * ║    output."                                                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import type {
  ValidationRule,
  RuleCheckResult,
  MetricValidationResult,
  EntityValidationSummary,
  ValidationFlag,
  GatingImpact,
  AnomalySignal,
  AnomalyType,
  CrossMetricCheckResult,
} from './types';
import {
  ALL_VALIDATION_RULES,
  CROSS_METRIC_CHECKS,
  getRulesForMetric,
} from './rules';

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURAL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Perform structural validation on a raw value
 */
export function validateStructural(
  metricId: string,
  value: unknown,
  timestamp: string | null
): RuleCheckResult[] {
  const results: RuleCheckResult[] = [];
  const now = Date.now();
  
  // STRUCT_001: Finite value check
  if (typeof value === 'number') {
    const isFiniteValue = Number.isFinite(value);
    results.push({
      rule_id: 'STRUCT_001',
      passed: isFiniteValue,
      flag: isFiniteValue ? 'PASS' : 'FAIL',
      impact: isFiniteValue ? 'NONE' : 'METRIC_EXCLUDE',
      message: isFiniteValue 
        ? 'Value is finite' 
        : `Value is not finite: ${value}`,
      actual_values: { value },
      expected: { finite: true },
    });
  }
  
  // STRUCT_002: Null/Undefined check
  const isNotNull = value !== null && value !== undefined;
  results.push({
    rule_id: 'STRUCT_002',
    passed: isNotNull,
    flag: isNotNull ? 'PASS' : 'FAIL',
    impact: isNotNull ? 'NONE' : 'METRIC_EXCLUDE',
    message: isNotNull 
      ? 'Value is not null/undefined' 
      : 'Value is null or undefined',
    actual_values: { value: value ?? null },
    expected: { not_null: true },
  });
  
  // STRUCT_003: Numeric type check
  const isNumeric = typeof value === 'number';
  results.push({
    rule_id: 'STRUCT_003',
    passed: isNumeric,
    flag: isNumeric ? 'PASS' : 'FAIL',
    impact: isNumeric ? 'NONE' : 'METRIC_EXCLUDE',
    message: isNumeric 
      ? 'Value is numeric' 
      : `Value is not numeric: ${typeof value}`,
    actual_values: { type: typeof value },
    expected: { type: 'number' },
  });
  
  // STRUCT_004: Timestamp recency
  if (timestamp) {
    const observedTime = new Date(timestamp).getTime();
    const isFuture = observedTime > now;
    results.push({
      rule_id: 'STRUCT_004',
      passed: !isFuture,
      flag: isFuture ? 'FAIL' : 'PASS',
      impact: isFuture ? 'METRIC_EXCLUDE' : 'NONE',
      message: isFuture 
        ? `Timestamp is in the future: ${timestamp}` 
        : 'Timestamp is valid',
      actual_values: { timestamp },
      expected: { in_past: true },
    });
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC BOUND VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

interface SemanticBoundCheck {
  metricPattern: string;
  min?: number | null;
  max?: number | null;
  ruleId: string;
  failFlag: ValidationFlag;
  failImpact: GatingImpact;
}

const SEMANTIC_BOUNDS: SemanticBoundCheck[] = [
  { metricPattern: 'market_cap', min: 1000, max: 1e15, ruleId: 'SEM_001', failFlag: 'FAIL', failImpact: 'GATED' },
  { metricPattern: 'price', min: 0.000000001, max: null, ruleId: 'SEM_003', failFlag: 'FAIL', failImpact: 'GATED' },
  { metricPattern: 'supply', min: 0, max: null, ruleId: 'SEM_004', failFlag: 'FAIL', failImpact: 'GATED' },
  { metricPattern: 'volume', min: 0, max: null, ruleId: 'SEM_006', failFlag: 'FAIL', failImpact: 'METRIC_EXCLUDE' },
  { metricPattern: 'tvl', min: 0, max: null, ruleId: 'SEM_007', failFlag: 'FAIL', failImpact: 'METRIC_EXCLUDE' },
  { metricPattern: 'percent', min: 0, max: 100, ruleId: 'SEM_008', failFlag: 'FAIL', failImpact: 'METRIC_EXCLUDE' },
  { metricPattern: 'score', min: 0, max: 100, ruleId: 'SEM_009', failFlag: 'FAIL', failImpact: 'GATED' },
];

/**
 * Validate semantic bounds for a metric
 */
export function validateSemanticBounds(
  metricId: string,
  value: number
): RuleCheckResult[] {
  const results: RuleCheckResult[] = [];
  
  for (const bound of SEMANTIC_BOUNDS) {
    if (!metricId.toLowerCase().includes(bound.metricPattern)) continue;
    
    let passed = true;
    let message = 'Value within bounds';
    
    if (bound.min !== null && bound.min !== undefined && value < bound.min) {
      passed = false;
      message = `Value ${value} is below minimum ${bound.min}`;
    }
    
    if (bound.max !== null && bound.max !== undefined && value > bound.max) {
      passed = false;
      message = `Value ${value} exceeds maximum ${bound.max}`;
    }
    
    results.push({
      rule_id: bound.ruleId,
      passed,
      flag: passed ? 'PASS' : bound.failFlag,
      impact: passed ? 'NONE' : bound.failImpact,
      message,
      actual_values: { value },
      expected: { min: bound.min, max: bound.max },
    });
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-METRIC CONSISTENCY CHECKS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check market cap = price × supply consistency
 */
export function checkMarketCapConsistency(
  marketCap: number,
  price: number,
  supply: number,
  tolerancePercent: number = 2
): CrossMetricCheckResult {
  const expectedMC = price * supply;
  const actualMC = marketCap;
  
  // Use log comparison for percentage deviation
  const logActual = Math.log(actualMC);
  const logExpected = Math.log(expectedMC);
  const deviation = Math.abs(logActual - logExpected);
  const deviationPercent = (Math.exp(deviation) - 1) * 100;
  
  const passed = deviationPercent <= tolerancePercent;
  
  return {
    check_id: 'CROSS_001',
    passed,
    values: { market_cap: marketCap, price, supply },
    computed_value: actualMC,
    expected_value: expectedMC,
    deviation_percent: deviationPercent,
    tolerance_percent: tolerancePercent,
    message: passed 
      ? `Market cap consistent: ${deviationPercent.toFixed(2)}% deviation` 
      : `Market cap inconsistent: ${deviationPercent.toFixed(2)}% deviation (max ${tolerancePercent}%)`,
  };
}

/**
 * Check circulating supply ≤ total supply
 */
export function checkSupplyConsistency(
  circulatingSupply: number,
  totalSupply: number
): CrossMetricCheckResult {
  const passed = circulatingSupply <= totalSupply;
  
  return {
    check_id: 'CROSS_002',
    passed,
    values: { circulating_supply: circulatingSupply, total_supply: totalSupply },
    computed_value: circulatingSupply,
    expected_value: totalSupply,
    deviation_percent: passed ? 0 : ((circulatingSupply - totalSupply) / totalSupply) * 100,
    tolerance_percent: 0,
    message: passed 
      ? 'Circulating supply ≤ total supply' 
      : `Circulating supply (${circulatingSupply}) exceeds total supply (${totalSupply})`,
  };
}

/**
 * Check volume/market cap ratio sanity
 */
export function checkVolumeMCRatio(
  volume24h: number,
  marketCap: number,
  maxRatio: number = 10
): CrossMetricCheckResult {
  const ratio = marketCap > 0 ? volume24h / marketCap : 0;
  const passed = ratio <= maxRatio;
  
  return {
    check_id: 'CROSS_004',
    passed,
    values: { volume_24h: volume24h, market_cap: marketCap },
    computed_value: ratio,
    expected_value: maxRatio,
    deviation_percent: passed ? 0 : ((ratio - maxRatio) / maxRatio) * 100,
    tolerance_percent: 0,
    message: passed 
      ? `Volume/MC ratio ${ratio.toFixed(2)} is reasonable` 
      : `Volume/MC ratio ${ratio.toFixed(2)} exceeds maximum ${maxRatio} (${ratio * 100}% daily turnover)`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIORAL ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect volume-liquidity mismatch (wash trading signal)
 * 
 * "Volume spike > 400% AND liquidity depth change < 10% indicates manipulation"
 */
export function detectVolumeLiquidityMismatch(
  volumeChangePercent: number,
  liquidityChangePercent: number
): AnomalySignal | null {
  const volumeThreshold = 400;
  const liquidityThreshold = 10;
  
  if (volumeChangePercent > volumeThreshold && liquidityChangePercent < liquidityThreshold) {
    const severity = Math.min(1, volumeChangePercent / 1000); // Scale by volume spike
    
    return {
      type: 'VOLUME_LIQUIDITY_MISMATCH',
      severity,
      confidence: 0.85,
      description: `Volume spiked ${volumeChangePercent.toFixed(0)}% but liquidity only changed ${liquidityChangePercent.toFixed(1)}%. This pattern suggests artificial volume inflation.`,
      evidence: {
        volume_change_percent: volumeChangePercent,
        liquidity_change_percent: liquidityChangePercent,
        threshold_volume: volumeThreshold,
        threshold_liquidity: liquidityThreshold,
      },
      action: severity > 0.7 ? 'GATE' : 'FLAG',
      detected_at: new Date().toISOString(),
    };
  }
  
  return null;
}

/**
 * Detect wash trading based on volume vs unique traders
 * 
 * "High volume with low unique trader count suggests wash trading"
 */
export function detectWashTrading(
  volume24h: number,
  uniqueTraders: number
): AnomalySignal | null {
  const volumeThreshold = 10_000_000; // $10M
  const traderThreshold = 100;
  
  if (volume24h > volumeThreshold && uniqueTraders < traderThreshold) {
    const volumePerTrader = volume24h / Math.max(1, uniqueTraders);
    const severity = Math.min(1, Math.log10(volumePerTrader / 10000) / 3);
    
    return {
      type: 'WASH_TRADING',
      severity,
      confidence: 0.75,
      description: `$${(volume24h / 1e6).toFixed(1)}M volume with only ${uniqueTraders} unique traders. Average volume per trader: $${(volumePerTrader / 1000).toFixed(0)}K`,
      evidence: {
        volume_24h: volume24h,
        unique_traders: uniqueTraders,
        volume_per_trader: volumePerTrader,
      },
      action: severity > 0.6 ? 'FLAG' : 'MONITOR',
      detected_at: new Date().toISOString(),
    };
  }
  
  return null;
}

/**
 * Detect social-fundamental divergence
 * 
 * "Social hype without fundamental improvement signals speculation"
 */
export function detectSocialFundamentalDivergence(
  socialChangePercent: number,
  fundamentalChangePercent: number
): AnomalySignal | null {
  const socialThreshold = 200; // 200% social spike
  const fundamentalThreshold = 5; // <5% fundamental change
  
  if (socialChangePercent > socialThreshold && fundamentalChangePercent < fundamentalThreshold) {
    const severity = Math.min(1, socialChangePercent / 500);
    
    return {
      type: 'SOCIAL_FUNDAMENTAL_DIVERGENCE',
      severity,
      confidence: 0.65,
      description: `Social metrics spiked ${socialChangePercent.toFixed(0)}% while fundamentals changed only ${fundamentalChangePercent.toFixed(1)}%. This divergence suggests speculative reflexivity.`,
      evidence: {
        social_change_percent: socialChangePercent,
        fundamental_change_percent: fundamentalChangePercent,
      },
      action: 'MONITOR',
      detected_at: new Date().toISOString(),
    };
  }
  
  return null;
}

/**
 * Detect concentration spike
 * 
 * "Sudden concentration increase > 10% suggests accumulation/manipulation"
 */
export function detectConcentrationSpike(
  concentrationChangePercent: number
): AnomalySignal | null {
  const threshold = 10;
  
  if (Math.abs(concentrationChangePercent) > threshold) {
    const severity = Math.min(1, Math.abs(concentrationChangePercent) / 30);
    
    return {
      type: 'CONCENTRATION_SPIKE',
      severity,
      confidence: 0.70,
      description: `Top holder concentration changed by ${concentrationChangePercent.toFixed(1)}% in 24h. ${concentrationChangePercent > 0 ? 'Potential accumulation.' : 'Potential distribution.'}`,
      evidence: {
        concentration_change_percent: concentrationChangePercent,
        threshold,
      },
      action: severity > 0.5 ? 'FLAG' : 'MONITOR',
      detected_at: new Date().toISOString(),
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STALENESS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate data freshness
 */
export function validateStaleness(
  metricId: string,
  timestamp: string,
  now: Date = new Date()
): RuleCheckResult {
  const observedTime = new Date(timestamp).getTime();
  const ageSeconds = (now.getTime() - observedTime) / 1000;
  
  // Determine threshold based on metric importance
  const isHighImpact = ['price', 'market_cap', 'volume'].some(p => metricId.includes(p));
  const isCritical = metricId.includes('price');
  
  let threshold: number;
  let ruleId: string;
  let failFlag: ValidationFlag;
  let failImpact: GatingImpact;
  
  if (isCritical) {
    threshold = 60; // 1 minute
    ruleId = 'STALE_002';
    failFlag = 'STALE';
    failImpact = 'CONFIDENCE_REDUCE';
  } else if (isHighImpact) {
    threshold = 600; // 10 minutes
    ruleId = 'STALE_001';
    failFlag = 'STALE';
    failImpact = 'WARN';
  } else {
    threshold = 3600; // 1 hour
    ruleId = 'STALE_003';
    failFlag = 'STALE';
    failImpact = 'WARN';
  }
  
  // Expired data (>24h) is always excluded
  if (ageSeconds > 86400) {
    return {
      rule_id: 'STALE_004',
      passed: false,
      flag: 'FAIL',
      impact: 'METRIC_EXCLUDE',
      message: `Data expired: ${(ageSeconds / 3600).toFixed(1)} hours old (max 24h)`,
      actual_values: { age_seconds: ageSeconds },
      expected: { max_age_seconds: 86400 },
    };
  }
  
  const passed = ageSeconds <= threshold;
  
  return {
    rule_id: ruleId,
    passed,
    flag: passed ? 'PASS' : failFlag,
    impact: passed ? 'NONE' : failImpact,
    message: passed 
      ? `Data is fresh: ${ageSeconds.toFixed(0)}s old` 
      : `Data is stale: ${ageSeconds.toFixed(0)}s old (threshold: ${threshold}s)`,
    actual_values: { age_seconds: ageSeconds },
    expected: { max_age_seconds: threshold },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single metric
 */
export function validateMetric(
  metricId: string,
  value: unknown,
  timestamp: string | null,
  entityId: string
): MetricValidationResult {
  const now = new Date();
  const ruleChecks: RuleCheckResult[] = [];
  
  // 1. Structural validation
  const structuralResults = validateStructural(metricId, value, timestamp);
  ruleChecks.push(...structuralResults);
  
  // If structural fails, don't proceed with semantic checks
  const structuralFailed = structuralResults.some(r => r.flag === 'FAIL');
  
  if (!structuralFailed && typeof value === 'number') {
    // 2. Semantic bounds validation
    const boundsResults = validateSemanticBounds(metricId, value);
    ruleChecks.push(...boundsResults);
    
    // 3. Staleness validation
    if (timestamp) {
      const stalenessResult = validateStaleness(metricId, timestamp, now);
      ruleChecks.push(stalenessResult);
    }
  }
  
  // Aggregate results
  const failedRules = ruleChecks.filter(r => !r.passed && r.flag === 'FAIL').map(r => r.rule_id);
  const warningRules = ruleChecks.filter(r => !r.passed && (r.flag === 'WARN' || r.flag === 'STALE')).map(r => r.rule_id);
  const suspiciousRules = ruleChecks.filter(r => r.flag === 'SUSPICIOUS').map(r => r.rule_id);
  
  // Determine worst flag
  let worstFlag: ValidationFlag = 'PASS';
  if (ruleChecks.some(r => r.flag === 'FAIL')) worstFlag = 'FAIL';
  else if (ruleChecks.some(r => r.flag === 'SUSPICIOUS')) worstFlag = 'SUSPICIOUS';
  else if (ruleChecks.some(r => r.flag === 'STALE')) worstFlag = 'STALE';
  else if (ruleChecks.some(r => r.flag === 'WARN')) worstFlag = 'WARN';
  
  // Determine worst impact
  const impactPriority: GatingImpact[] = [
    'GATED', 'CATEGORY_GATE', 'METRIC_EXCLUDE', 'SCORE_CAP', 
    'CONFIDENCE_REDUCE', 'WARN', 'NONE'
  ];
  let worstImpact: GatingImpact = 'NONE';
  for (const impact of impactPriority) {
    if (ruleChecks.some(r => r.impact === impact)) {
      worstImpact = impact;
      break;
    }
  }
  
  // Calculate confidence multiplier
  let confidenceMultiplier = 1.0;
  for (const check of ruleChecks) {
    if (check.impact === 'CONFIDENCE_REDUCE') confidenceMultiplier *= 0.9;
    if (check.flag === 'STALE') confidenceMultiplier *= 0.95;
    if (check.flag === 'WARN') confidenceMultiplier *= 0.98;
    if (check.flag === 'SUSPICIOUS') confidenceMultiplier *= 0.8;
  }
  
  // Determine status
  let status: MetricValidationResult['status'] = 'VALID';
  if (worstFlag === 'FAIL' || worstImpact === 'GATED') status = 'GATED';
  else if (worstFlag === 'SUSPICIOUS') status = 'SUSPICIOUS';
  else if (worstImpact === 'METRIC_EXCLUDE') status = 'INVALID';
  else if (worstFlag === 'WARN' || worstFlag === 'STALE') status = 'WARNING';
  
  // Determine score cap
  let scoreCap: number | null = null;
  if (worstImpact === 'SCORE_CAP' || worstFlag === 'SUSPICIOUS') {
    scoreCap = 70; // Cap suspicious metrics
  }
  
  return {
    metric_id: metricId,
    entity_id: entityId,
    status,
    rule_checks: ruleChecks,
    failed_rules: failedRules,
    warning_rules: warningRules,
    worst_flag: worstFlag,
    worst_impact: worstImpact,
    confidence_multiplier: Math.max(0, Math.min(1, confidenceMultiplier)),
    score_cap: scoreCap,
    exclude_from_scoring: status === 'INVALID' || status === 'GATED',
    gate_final_score: worstImpact === 'GATED',
    validated_at: now.toISOString(),
  };
}

/**
 * Validate all metrics for an entity and produce summary
 */
export function validateEntity(
  entityId: string,
  metrics: Record<string, { value: unknown; timestamp: string | null }>,
  changeMetrics?: {
    volumeChangePercent?: number;
    liquidityChangePercent?: number;
    uniqueTraders?: number;
    socialChangePercent?: number;
    fundamentalChangePercent?: number;
    concentrationChangePercent?: number;
  }
): EntityValidationSummary {
  const metricResults: MetricValidationResult[] = [];
  const anomalySignals: AnomalySignal[] = [];
  
  // Validate each metric
  for (const [metricId, data] of Object.entries(metrics)) {
    const result = validateMetric(metricId, data.value, data.timestamp, entityId);
    metricResults.push(result);
  }
  
  // Run anomaly detection if change metrics provided
  if (changeMetrics) {
    const { 
      volumeChangePercent, 
      liquidityChangePercent, 
      uniqueTraders,
      socialChangePercent,
      fundamentalChangePercent,
      concentrationChangePercent,
    } = changeMetrics;
    
    // Volume-liquidity mismatch
    if (volumeChangePercent !== undefined && liquidityChangePercent !== undefined) {
      const signal = detectVolumeLiquidityMismatch(volumeChangePercent, liquidityChangePercent);
      if (signal) anomalySignals.push(signal);
    }
    
    // Wash trading
    if (metrics['volume_24h'] && uniqueTraders !== undefined) {
      const volume = metrics['volume_24h'].value as number;
      const signal = detectWashTrading(volume, uniqueTraders);
      if (signal) anomalySignals.push(signal);
    }
    
    // Social-fundamental divergence
    if (socialChangePercent !== undefined && fundamentalChangePercent !== undefined) {
      const signal = detectSocialFundamentalDivergence(socialChangePercent, fundamentalChangePercent);
      if (signal) anomalySignals.push(signal);
    }
    
    // Concentration spike
    if (concentrationChangePercent !== undefined) {
      const signal = detectConcentrationSpike(concentrationChangePercent);
      if (signal) anomalySignals.push(signal);
    }
  }
  
  // Aggregate results
  const validCount = metricResults.filter(r => r.status === 'VALID').length;
  const warningCount = metricResults.filter(r => r.status === 'WARNING').length;
  const suspiciousCount = metricResults.filter(r => r.status === 'SUSPICIOUS').length;
  const invalidCount = metricResults.filter(r => r.status === 'INVALID').length;
  const gatedCount = metricResults.filter(r => r.status === 'GATED').length;
  
  // Overall confidence
  const confidenceMultiplier = metricResults.reduce(
    (acc, r) => acc * r.confidence_multiplier, 
    1.0
  );
  
  // Apply anomaly penalties
  let anomalyPenalty = 1.0;
  for (const signal of anomalySignals) {
    if (signal.action === 'GATE') anomalyPenalty *= 0.5;
    else if (signal.action === 'FLAG') anomalyPenalty *= 0.8;
    else anomalyPenalty *= 0.95;
  }
  
  // Score cap (minimum of all caps)
  const caps = metricResults
    .filter(r => r.score_cap !== null)
    .map(r => r.score_cap!);
  const scoreCap = caps.length > 0 ? Math.min(...caps) : null;
  
  // Can score?
  const hasGatingFailure = metricResults.some(r => r.gate_final_score);
  const hasAnomalyGate = anomalySignals.some(s => s.action === 'GATE');
  const canScore = !hasGatingFailure && !hasAnomalyGate;
  
  // Determine status
  let status: EntityValidationSummary['status'] = 'HEALTHY';
  if (!canScore) status = 'GATED';
  else if (suspiciousCount > 0 || anomalySignals.some(s => s.action === 'FLAG')) status = 'SUSPICIOUS';
  else if (warningCount > validCount || invalidCount > 0) status = 'DEGRADED';
  
  // Gating reason
  let gatingReason: string | null = null;
  if (!canScore) {
    if (hasGatingFailure) {
      const gatingRule = metricResults.find(r => r.gate_final_score);
      gatingReason = `Metric ${gatingRule?.metric_id} failed validation: ${gatingRule?.failed_rules.join(', ')}`;
    } else if (hasAnomalyGate) {
      const gatingAnomaly = anomalySignals.find(s => s.action === 'GATE');
      gatingReason = `Anomaly detected: ${gatingAnomaly?.type} - ${gatingAnomaly?.description}`;
    }
  }
  
  return {
    entity_id: entityId,
    status,
    total_metrics: metricResults.length,
    metrics_by_status: {
      valid: validCount,
      warning: warningCount,
      suspicious: suspiciousCount,
      invalid: invalidCount,
      gated: gatedCount,
    },
    metric_results: metricResults,
    confidence_multiplier: Math.max(0, Math.min(1, confidenceMultiplier * anomalyPenalty)),
    score_cap: scoreCap,
    excluded_metrics: metricResults
      .filter(r => r.exclude_from_scoring)
      .map(r => r.metric_id),
    can_score: canScore,
    gating_reason: gatingReason,
    anomaly_signals: anomalySignals,
  };
}
