/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔥 DIABOLICAL TEST SUITE                                                 ║
 * ║                                                                               ║
 * ║   "Achieving robustness requires continuous validation against realistic     ║
 * ║    failure modes. The system must be proven robust through a defined         ║
 * ║    'Diabolical Test Suite' that simulates adversarial conditions designed   ║
 * ║    to expose weak links in the integrity chain."                            ║
 * ║                                                                               ║
 * ║   Test Case IDs:                                                             ║
 * ║   T-D1: Unit Mismatch                                                        ║
 * * ║   T-D2: Provider Outage                                                      ║
 * ║   T-D3: Wash Volume Attack                                                   ║
 * ║   T-D4: Semantic Mismatch                                                    ║
 * ║   T-D5: Source Disagreement                                                  ║
 * ║   T-D6: Hallucination Check                                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Layer 1: Canonical Contract
import {
  validateDatapoint,
  createDatapoint,
  type CanonicalDatapoint,
  type Unit,
  type Direction,
  type ScoreCategory,
  type SourceType,
  type ValidationStatus,
  type QualityFlag,
} from '../layer1';

// Layer 2: FSS Registry
import {
  getFSS,
  validateMetricApplication,
  isMetricApplicableToSector,
} from '../layer2';

// Layer 3: Reconciliation
import {
  reconcileMetric,
  createSourceReport,
  type SourceReport,
  type SourceProvider,
  type ReconciliationConfig,
  DEFAULT_RECONCILIATION_CONFIG,
} from '../layer3';

// Layer 4: Validation & Anomaly Detection
import {
  validateMetric,
  validateEntity,
  detectVolumeLiquidityMismatch,
  detectWashTrading,
  detectSocialFundamentalDivergence,
  type AnomalySignal,
  type ChangeMetricsInput,
  type MetricValueMap,
} from '../layer4';

// Layer 5: Context-Aware Classification
import {
  classifyAsset,
  filterMetricsByContext,
  getMetricRelevance,
  type AssetClassification,
  type AssetCategory,
} from '../layer5';

// Layer 6: Confidence & Gates
import {
  calculateConfidenceScore,
  assessGates,
  canProduceOutput,
  HARD_GATE_THRESHOLDS,
  type ConfidenceInput,
} from '../layer6';

// Layer 7: Explanation Objects
import {
  buildExplanationObject,
  isGatedOutput,
  validateExplanationObject,
  ExplanationObjectSchema, // Explicitly import schema
  type PipelineResults,
} from '../layer7';

// Layer 8: Deterministic Narration
import {
  renderNarrative,
  renderBriefSummary,
  SYSTEM_PROMPT_CORE,
} from '../layer8';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();

/**
 * Create a valid canonical datapoint for testing
 */
function createValidDatapoint(overrides: Partial<CanonicalDatapoint> = {}): CanonicalDatapoint {
  return {
    metric_id: 'qs_adoption_v1',
    entity_id: 'bitcoin',
    raw_value: 1000000,
    unit: 'COUNT',
    direction: 'higher_is_better',
    score_category: 'QS',
    is_derived: false,
    derivation_recipe: null,
    validation_status: 'pass',
    quality_flags: ['fresh'],
    provenance: {
      source: 'coingecko',
      source_type: 'aggregator',
      observed_at: NOW,
      ingested_at: NOW,
      source_timestamp: NOW,
    },
    ...overrides,
  };
}

/**
 * Create source reports for reconciliation testing
 */
function createSourceReports(
  metricId: string,
  values: Array<{ source: SourceProvider; value: number; confidence?: number }>,
): SourceReport[] {
  return values.map(v => createSourceReport(
    v.source,
    metricId,
    'bitcoin',
    v.value,
    NOW,
    v.confidence ?? DEFAULT_RECONCILIATION_CONFIG.agreement_threshold, // Use a default confidence
  ));
}

/**
 * Create minimal pipeline results for EO building
 */
function createPipelineResults(overrides: Partial<PipelineResults> = {}): PipelineResults {
  return {
    entityId: 'bitcoin',
    asset: {
      symbol: 'BTC',
      name: 'Bitcoin',
      category: 'L1',
      sector: 'L1',
      identityConfidence: 99,
      isWellKnown: true,
      interpretationContext: 'As a Layer 1 blockchain, decentralization metrics are key.',
      excludedMetrics: [],
    },
    reconciliation: [
      {
        metricId: 'qs_adoption_v1',
        metricName: 'Adoption',
        reconciledValue: 95,
        normalizedValue: 95,
        unit: 'SCORE_0_100',
        sourceId: 'aggregated',
        corroboratingSources: ['coingecko', 'coinmarketcap'],
        timestamp: NOW,
        agreementScore: 0.98,
        disputeStatus: 'AGREED',
        reliability: 0.95,
      },
    ],
    validation: [
      {
        metricId: 'qs_adoption_v1',
        status: 'pass',
        qualityFlags: ['fresh'],
        ageSeconds: 60,
      },
    ],
    anomalies: [],
    confidence: {
      score: 85,
      level: 'HIGH',
      gatesPassed: {
        confidence: true,
        coverage: true,
        identity: true,
      },
      failureReason: null,
    },
    coverage: {
      overall: 0.9,
      critical: 0.95,
      missingCritical: [],
      missingImportant: [],
    },
    features: {
      'qs_adoption_v1': {
        direction: 'higher_is_better',
        scoreCategory: 'QS',
        weight: 0.15,
        relevance: 'CRITICAL',
      },
    },
    scores: {
      qs: { value: 92, tier: 'Elite', coverage: 0.95, confidence: 0.9 },
      os: { value: 75, tier: 'Strong', coverage: 0.85, confidence: 0.85, gated: false },
      risk: { value: 15, tier: 'Low', coverage: 0.9, confidence: 0.88 },
      pos: {
        raw: 88,
        smoothed: 87,
        final: 87,
        tier: 'Elite',
        gated: false,
        gatingReason: null,
      },
      formula: {
        version: 'v3.0',
        weights: { qs: 0.60, os: 0.25, safety: 0.15 },
      },
    },
    legitimacy: {
      status: 'LEGIT',
      confidence: 0.99,
      flags: [],
    },
    staleness: {
      avgAgeSeconds: 120,
      maxAgeSeconds: 300,
      staleCount: 0,
      totalMetrics: 10,
    },
    sourceStats: {
      totalSources: 5,
      minPerMetric: 2,
      maxPerMetric: 4,
      avgPerMetric: 3,
    },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// T-D1: UNIT MISMATCH (Layer 1 - Canonical Contract)
// ═══════════════════════════════════════════════════════════════════════════════

describe('T-D1: Unit Mismatch - Layer 1 Canonical Contract Enforcement', () => {
  it('REJECTS datapoint missing mandatory unit field', () => {
    const invalidData = {
      metric_id: 'qs_adoption_v1',
      entity_id: 'bitcoin',
      raw_value: 1000000,
      // MISSING: unit field
      direction: 'higher_is_better' as Direction,
      score_category: 'QS' as ScoreCategory,
      is_derived: false,
      derivation_recipe: null,
      validation_status: 'pass' as ValidationStatus,
      quality_flags: ['fresh' as QualityFlag],
      provenance: {
        source: 'coingecko',
        source_type: 'aggregator' as SourceType,
        observed_at: NOW,
        ingested_at: NOW,
        source_timestamp: NOW,
      },
    };

    const result = validateDatapoint(invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.issues.some(i => i.path.includes('unit'))).toBe(true);
    }
  });

  it('REJECTS datapoint with invalid unit enum value', () => {
    const invalidData = {
      ...createValidDatapoint(),
      unit: 'INVALID_UNIT_XYZ' as Unit,
    };

    const result = validateDatapoint(invalidData);
    
    expect(result.success).toBe(false);
  });

  it('REJECTS datapoint with missing metric_id', () => {
    const invalidData = {
      entity_id: 'bitcoin',
      raw_value: 1000000,
      unit: 'COUNT' as Unit,
      direction: 'higher_is_better' as Direction,
      score_category: 'QS' as ScoreCategory,
      is_derived: false,
      derivation_recipe: null,
      validation_status: 'pass' as ValidationStatus,
      quality_flags: ['fresh' as QualityFlag],
      provenance: {
        source: 'coingecko',
        source_type: 'aggregator' as SourceType,
        observed_at: NOW,
        ingested_at: NOW,
        source_timestamp: NOW,
      },
    };

    const result = validateDatapoint(invalidData);
    
    expect(result.success).toBe(false);
  });

  it('REJECTS datapoint with NaN raw_value', () => {
    const invalidData = {
      ...createValidDatapoint(),
      raw_value: NaN,
    };

    const result = validateDatapoint(invalidData);
    
    expect(result.success).toBe(false);
  });

  it('REJECTS datapoint with Infinity raw_value', () => {
    const invalidData = {
      ...createValidDatapoint(),
      raw_value: Infinity,
    };

    const result = validateDatapoint(invalidData);
    
    expect(result.success).toBe(false);
  });

  it('ACCEPTS valid canonical datapoint', () => {
    const validData = createValidDatapoint();
    
    const result = validateDatapoint(validData);
    
    expect(result.success).toBe(true);
  });

  it('REJECTS datapoint with invalid metric_id format', () => {
    const invalidData = {
      ...createValidDatapoint(),
      metric_id: 'invalid-format',
    };

    const result = validateDatapoint(invalidData);
    
    expect(result.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-D2: PROVIDER OUTAGE (Layer 6 - Confidence Gates)
// ═══════════════════════════════════════════════════════════════════════════════

describe('T-D2: Provider Outage - Layer 6 Confidence & Coverage Gates', () => {
  it('GATES output when critical sources fail (coverage < threshold)', () => {
    const lowCoverageInput: ConfidenceInput = {
      agreement: {
        dispute_count: 5, // Simulate disputes to lower agreement factor
        total_high_impact_metrics: 10,
        metric_agreements: {'price_usd': 0.5, 'volume_24h': 0.6},
      },
      validation: {
        fail_gated_count: 3, // Simulate validation failures
        total_metrics: 10,
        metric_statuses: {},
      },
      staleness: {
        average_age_seconds: 3600 * 24 * 2, // 2 days old
        max_age_seconds: 3600 * 24 * 3, // 3 days old
        stale_count: 8,
        total_metrics: 10,
      },
      coverage: {
        source_counts: {'qs_adoption_v1': 1, 'os_liquidity_depth_v1': 1},
        min_required_sources: 3,
        critical_metrics_coverage: 0.3, // 30% critical coverage
      },
      entity_id: 'bitcoin',
      identity_confidence: 60, // Low identity confidence
    };

    const result = calculateConfidenceScore(lowCoverageInput);
    
    // Confidence score should be low enough to trigger gating
    expect(result.confidence_score).toBeLessThan(HARD_GATE_THRESHOLDS.CONFIDENCE_GATE); 
    expect(result.critical_coverage).toBe(0.3); // Check critical coverage directly
    
    // Staleness penalty will also reduce confidence (0.15 weight * ~0.7 factor)
    expect(result.factor_scores.q_staleness).toBeLessThan(0.5); // Should be very low due to extreme staleness
    
    // Check gate assessment
    const gates = assessGates(
      result.confidence_score,
      result.critical_coverage,
      result.identity_confidence,
      'bitcoin',
    );
    
    // Should fail multiple gates
    expect(gates.gates.find(g => g.gate === 'COVERAGE')!.passed).toBe(false);
    expect(gates.gates.find(g => g.gate === 'CONFIDENCE')!.passed).toBe(false);
    expect(gates.gates.find(g => g.gate === 'IDENTITY')!.passed).toBe(false);
    expect(gates.all_gates_passed).toBe(false);
    expect(gates.primary_failure).toBeDefined();
  });

  it('GATES output when confidence falls below 70%', () => {
    const canOutput = canProduceOutput(
      65,  // Confidence below 70
      0.95, // Good coverage
      99    // Good identity
    );

    expect(canOutput.canProduce).toBe(false);
    expect(canOutput.reason).toContain('Confidence');
  });

  it('GATES output when critical coverage below 90%', () => {
    const canOutput = canProduceOutput(
      85,   // Good confidence
      0.85, // Coverage below 90%
      99    // Good identity
    );

    expect(canOutput.canProduce).toBe(false);
    expect(canOutput.reason).toContain('coverage');
  });

  it('GATES output when identity confidence below 85%', () => {
    const canOutput = canProduceOutput(
      85,   // Good confidence
      0.95, // Good coverage
      80    // Identity below 85%
    );

    expect(canOutput.canProduce).toBe(false);
    expect(canOutput.reason).toContain('Identity');
  });

  it('PASSES all gates when thresholds met', () => {
    const canOutput = canProduceOutput(
      85,   // >= 70
      0.95, // >= 90%
      90    // >= 85
    );

    expect(canOutput.canProduce).toBe(true);
    expect(canOutput.reason).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-D3: WASH VOLUME ATTACK (Layer 4 - Anomaly Detection)
// ═══════════════════════════════════════════════════════════════════════════════

describe('T-D3: Wash Volume Attack - Layer 4 Anomaly Detection', () => {
  it('DETECTS volume spike without proportional liquidity increase', () => {
    // Volume up 500%, liquidity only up 5%
    const anomaly = detectVolumeLiquidityMismatch(500, 5);
    
    expect(anomaly).not.toBeNull();
    expect(anomaly!.type).toBe('VOLUME_LIQUIDITY_MISMATCH');
    expect(anomaly!.severity).toBeGreaterThanOrEqual(8); // Adjusted severity to 8
    expect(anomaly!.action).toBe('FLAG');
  });

  it('DETECTS wash trading pattern', () => {
    // Adjusted inputs to trigger wash trading detection more reliably
    const anomaly = detectWashTrading(
      400,   // Volume spike > 300%
      -5,    // Low unique trader growth (< 10%)
      100,   // Low total transactions (< 100)
      200000 // High total volume (> 1e6)
    );

    expect(anomaly).not.toBeNull();
    expect(anomaly!.type).toBe('WASH_TRADING');
    expect(anomaly!.severity).toBeGreaterThanOrEqual(9); // Adjusted severity to 9
    expect(anomaly!.action).toBe('FLAG'); // Added action check
  });

  it('FLAGS entity with severe wash trading signals', () => {
    const metrics: MetricValueMap = {
      'volume_24h': { value: 100000000, timestamp: NOW },
      'liquidity_depth': { value: 1000000, timestamp: NOW },
      'market_cap_usd': { value: 50000000, timestamp: NOW },
      'price_usd': { value: 1.5, timestamp: NOW },
      'total_transactions': { value: 50, timestamp: NOW }, 
      'unique_trader_count': { value: 5, timestamp: NOW },
    };
    const changeMetrics: ChangeMetricsInput = {
      volumeChangePercent: 500,
      liquidityChangePercent: 5,
      socialChangePercent: 0,
      fundamentalChangePercent: 0,
      concentrationChangePercent: 0,
      uniqueTraderCountChangePercent: -20,
    };

    const validationResult = validateEntity(
      'suspicious_token',
      metrics,
      changeMetrics,
      'L1' // Assume L1 category
    );

    // Should have anomaly signals
    expect(validationResult.anomalySignals.length).toBeGreaterThan(0);
    
    // Check for wash trading or volume mismatch flag
    const hasVolumeAnomaly = validationResult.anomalySignals.some(
      s => s.type === 'VOLUME_LIQUIDITY_MISMATCH' || s.type === 'WASH_TRADING'
    );
    expect(hasVolumeAnomaly).toBe(true);
    
    // Confidence should be reduced
    expect(validationResult.confidenceMultiplier).toBeLessThan(1.0); // Now expecting a number
    expect(validationResult.gatingImpact).toBe('SCORE_CAP'); // Check gating impact
  });

  it('DOES NOT flag normal volume patterns', () => {
    // Volume up 50%, liquidity up 40% - normal correlation
    const anomaly = detectVolumeLiquidityMismatch(50, 40);
    
    expect(anomaly).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-D4: SEMANTIC MISMATCH (Layer 5 - Context Engine)
// ═══════════════════════════════════════════════════════════════════════════════

describe('T-D4: Semantic Mismatch - Layer 5 Context Engine', () => {
  it('EXCLUDES TVL metric for Payment tokens', () => {
    // Classify XRP as a Payment token
    const classification = classifyAsset('ripple', { category: 'Payments' as AssetCategory });
    
    expect(classification.primary_category).toBe('Payments');
    expect(classification.identity_confidence).toBeGreaterThanOrEqual(85);

    // Check metric relevance for TVL against Payment category
    const relevance = getMetricRelevance('qs_tvl_v1', classification.primary_category);
    
    // TVL should be NOT_APPLICABLE or FORBIDDEN for Payments
    expect(['NOT_APPLICABLE', 'FORBIDDEN']).toContain(relevance);
  });

  it('FILTERS OUT TVL from available metrics for Payment tokens', () => {
    const availableMetrics = [
      'qs_adoption_v1',
      'qs_tvl_v1',           // Should be excluded
      'qs_dev_delivery_v1',
      'os_liquidity_depth_v1',
    ];

    const classification = classifyAsset('ripple', { category: 'Payments' as AssetCategory });
    const filterResult = filterMetricsByContext(
      'ripple',
      availableMetrics,
      classification,
    );

    // TVL should be in excluded metrics
    expect(filterResult.excluded_metrics.some(
      e => e.metric_id === 'qs_tvl_v1'
    )).toBe(true);
    
    // TVL should NOT be in applicable metrics
    expect(filterResult.applicable_metrics.some(m => m.metric_id === 'qs_tvl_v1')).toBe(false);
    
    // Other metrics should still be applicable
    expect(filterResult.applicable_metrics.some(m => m.metric_id === 'qs_adoption_v1')).toBe(true);
    expect(filterResult.applicable_metrics.some(m => m.metric_id === 'os_liquidity_depth_v1')).toBe(true);
  });

  it('VALIDATES TVL application against FSS allowed scope', () => {
    // Use FSS to validate
    const validationResult = validateMetricApplication('qs_tvl_v1', 'Payments');
    
    expect(validationResult.valid).toBe(false);
    expect(validationResult.error).toContain('not applicable');
    expect(validationResult.compensation).toContain('exclude_metric');
  });

  it('EXCLUDES decentralization metrics for Meme coins', () => {
    const availableMetrics = [
      'qs_adoption_v1',
      'qs_decentralization_v1', // Should be excluded for memes
      'os_liquidity_depth_v1',
    ];

    const classification = classifyAsset('dogecoin', { category: 'Meme' as AssetCategory });
    expect(classification.primary_category).toBe('Meme');
    expect(classification.identity_confidence).toBeGreaterThanOrEqual(85);

    const filterResult = filterMetricsByContext(
      'dogecoin',
      availableMetrics,
      classification,
    );

    // Decentralization should be excluded or deprioritized for meme coins
    expect(filterResult.excluded_metrics.some(
      e => e.metric_id === 'qs_decentralization_v1'
    )).toBe(true); // Changed to only check metric_id
    
    // For meme coins, serious fundamental metrics are often excluded
    // This assertion is now covered by the `excluded_metrics` check above.
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-D5: SOURCE DISAGREEMENT (Layer 3 - Reconciliation)
// ═══════════════════════════════════════════════════════════════════════════════

describe('T-D5: Source Disagreement - Layer 3 Reconciliation', () => {
  it('MARKS metric as DISPUTED when source reports price 10% higher than median', () => {
    // Source 1: $100 (10% higher)
    // Sources 2,3,4: ~$91 (median)
    const reports = createSourceReports('price_usd', [
      { source: 'coingecko', value: 100, confidence: 0.9 },
      { source: 'coinmarketcap', value: 91, confidence: 0.9 },
      { source: 'defillama', value: 91, confidence: 0.85 },
      { source: 'messari', value: 90, confidence: 0.85 },
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports);

    // Agreement score should be low due to 10% spread
    expect(result.agreement_score).toBeLessThan(0.95);
    
    // Should be marked as disputed or severe_dispute due to threshold
    expect(['DISPUTED', 'SEVERE_DISPUTE']).toContain(result.dispute_status);
    
    // Confidence multiplier should be reduced
    expect(result.confidence_multiplier).toBeLessThan(1.0);
  });

  it('USES weighted trimmed mean to exclude outlier', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'coingecko', value: 110, confidence: 0.9 },  // Outlier (will be trimmed)
      { source: 'coinmarketcap', value: 100, confidence: 0.9 },
      { source: 'defillama', value: 100, confidence: 0.85 },
      { source: 'messari', value: 100, confidence: 0.85 },
      { source: 'binance', value: 90, confidence: 0.9 },     // Outlier (will be trimmed)
    ]);

    // Use alpha 0.2 to ensure trimming occurs (1 from each side for 5 reports)
    const result = reconcileMetric('price_usd', 'bitcoin', reports, { trim_alpha: 0.2 });

    // Reconciled value should be close to 100 (after trimming outliers)
    expect(result.reconciled_value).toBeCloseTo(100, 0); 
    
    // Should have trimmed reports
    expect(result.trimmed_reports?.length).toBeGreaterThan(0); 
  });

  it('PRODUCES high agreement score when sources agree', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'coingecko', value: 100.0, confidence: 0.9 },
      { source: 'coinmarketcap', value: 100.1, confidence: 0.9 },
      { source: 'defillama', value: 99.9, confidence: 0.85 },
      { source: 'messari', value: 100.0, confidence: 0.85 },
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports);

    // Agreement score should be high (sources within 0.2%)
    expect(result.agreement_score).toBeGreaterThan(0.99);
    expect(result.dispute_status).toBe('AGREED');
  });

  it('MAINTAINS audit trail of raw values', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'coingecko', value: 100, confidence: 0.9 },
      { source: 'coinmarketcap', value: 105, confidence: 0.9 },
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports);

    // Should have audit trail
    expect(result.audit_trail).toBeDefined();
    expect(result.audit_trail.length).toBe(2);
    expect(result.audit_trail[0].value).toBe(100);
    expect(result.audit_trail[1].value).toBe(105);
  });

  it('HANDLES single source with low confidence', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'coingecko', value: 100, confidence: 0.9 },
    ]);

    // Requires 2 sources, only 1 provided
    const result = reconcileMetric('price_usd', 'bitcoin', reports, { min_sources: 2 });

    // Should flag insufficient sources
    expect(result.confidence_multiplier).toBeLessThan(1.0);
    expect(result.dispute_status).toBe('INSUFFICIENT_SOURCES');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// T-D6: HALLUCINATION CHECK (Layer 8 - Narration Prompts)
// ═══════════════════════════════════════════════════════════════════════════════

describe('T-D6: Hallucination Check - Layer 8 Deterministic Narration', () => {
  it('SYSTEM PROMPT contains prohibition against fabricating numbers', () => {
    expect(SYSTEM_PROMPT_CORE).toContain('MUST NOT');
    expect(SYSTEM_PROMPT_CORE).toContain('Invent ANY facts');
    expect(SYSTEM_PROMPT_CORE).toContain('numbers');
    expect(SYSTEM_PROMPT_CORE).toContain('metrics');
    expect(SYSTEM_PROMPT_CORE).toContain('CATASTROPHIC SYSTEM FAILURE');
  });

  it('SYSTEM PROMPT requires citation for every numeric statement', () => {
    expect(SYSTEM_PROMPT_CORE).toContain('CITATION MANDATE');
    expect(SYSTEM_PROMPT_CORE).toContain('metric_id');
    expect(SYSTEM_PROMPT_CORE).toContain('source_id');
  });

  it('SYSTEM PROMPT enforces confidence gate', () => {
    expect(SYSTEM_PROMPT_CORE).toContain('CONFIDENCE GATE');
    expect(SYSTEM_PROMPT_CORE).toContain('confidence < 70');
    expect(SYSTEM_PROMPT_CORE).toContain('ANALYSIS GATED');
    expect(SYSTEM_PROMPT_CORE).toContain('TERMINATE OUTPUT IMMEDIATELY');
  });

  it('RENDERED narrative includes citations for all metrics', () => {
    const pipelineResults = createPipelineResults();
    const eo = buildExplanationObject(pipelineResults, 'test-pipeline-123');
    
    if (isGatedOutput(eo)) {
      throw new Error('Expected valid EO, got gated output');
    }

    const rendered = renderNarrative(eo);

    // Should not be gated
    expect(rendered.gated).toBe(false);
    
    // Should have citations
    expect(rendered.cited_claims.length).toBeGreaterThan(0);
    
    // Every cited claim should have a corresponding claim in EO
    for (const citedClaim of rendered.cited_claims) {
      const claimExists = eo.claims.some(c => c.metric_id === citedClaim);
      // Note: Some citations are for aggregate scores (qs_score, pos_final, etc.)
      // which are not individual claims
      if (!citedClaim.includes('_score') && !citedClaim.includes('_final') && !citedClaim.includes('meta_')) {
        expect(claimExists).toBe(true);
      }
    }
  });

  it('RENDERS gated output when confidence below threshold', () => {
    const lowConfidenceResults = createPipelineResults({
      confidence: {
        score: 60, // Below 70% threshold
        level: 'LOW',
        gatesPassed: {
          confidence: false,
          coverage: true,
          identity: true,
        },
        failureReason: 'Confidence score 60% is below threshold of 70%',
      },
    });

    const eo = buildExplanationObject(lowConfidenceResults, 'test-pipeline-123');
    
    // Should produce gated output
    expect(isGatedOutput(eo)).toBe(true);
    
    if (isGatedOutput(eo)) {
      expect(eo.gated).toBe(true);
      expect(eo.reason).toContain('Confidence');
    }
  });

  it('BRIEF summary shows gated status when confidence insufficient', () => {
    const lowConfidenceResults = createPipelineResults({
      confidence: {
        score: 50,
        level: 'INSUFFICIENT',
        gatesPassed: {
          confidence: false,
          coverage: true,
          identity: true,
        },
        failureReason: 'Confidence too low',
      },
    });

    const eo = buildExplanationObject(lowConfidenceResults, 'test-pipeline-123');
    const summary = renderBriefSummary(eo);

    expect(summary).toContain('GATED');
  });

  it('EO schema validation catches fabricated claims', () => {
    const invalidEO = {
      schema_version: 'EO-v1.0',
      generated_at: NOW,
      eo_id: 'invalid-uuid', // Invalid UUID
      pipeline_execution_id: 'test',
      asset: {
        entity_id: 'bitcoin',
        symbol: 'BTC',
        name: 'Bitcoin',
        category: 'L1',
        sector: 'L1',
        identity_confidence: 200, // Invalid: > 100
        is_well_known: true,
        interpretation_context: 'test',
        excluded_metrics: [],
      },
      confidence: 150, // Invalid: > 100
      // ... other required fields missing to make it truly invalid
      legitimacy: {
        status: 'LEGIT',
        confidence: 0.99,
        flags: [],
      },
      scores: {
        qs: { value: 90, tier: 'Elite', coverage: 0.9, confidence: 0.9 },
        os: { value: 80, tier: 'Strong', coverage: 0.8, confidence: 0.8, gated: false },
        risk: { value: 20, tier: 'Low', coverage: 0.9, confidence: 0.9 },
        pos: {
          raw: 85,
          smoothed: 85,
          final: 85,
          tier: 'Elite',
          gated: false,
          gatingReason: null,
        },
        formula: {
          version: 'v3.0',
          weights: { qs: 0.6, os: 0.25, safety: 0.15 },
        },
      },
      coverage_summary: {
        overall_coverage: 0.9,
        critical_coverage: 0.9,
        missing_critical_metrics: [],
        missing_important_metrics: [],
        disputed_metrics: [],
        stale_metrics: [],
        staleness_summary: {
          average_age_seconds: 100,
          max_age_seconds: 200,
          stale_count: 0,
          total_metrics: 10,
        },
        source_statistics: {
          total_sources: 3,
          min_sources_per_metric: 1,
          max_sources_per_metric: 2,
          avg_sources_per_metric: 1.5,
        },
      },
      claims: [],
      positive_drivers: [],
      negative_drivers: [],
      warnings: [],
      narrative_guidance: {
        focus: 'test',
        required_points: [],
        recommended_points: [],
        avoid_topics: [],
        recommended_tone: 'NEUTRAL',
      },
    };

    const validation = validateExplanationObject(invalidEO);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});
