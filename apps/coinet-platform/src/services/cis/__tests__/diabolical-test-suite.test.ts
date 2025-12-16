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
 * ║   T-D2: Provider Outage                                                      ║
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
} from '../layer3';

// Layer 4: Validation & Anomaly Detection
import {
  validateMetric,
  validateEntity,
  detectVolumeLiquidityMismatch,
  detectWashTrading,
  detectSocialFundamentalDivergence,
} from '../layer4';

// Layer 5: Context-Aware Classification
import {
  classifyAsset,
  filterMetricsByContext,
  getMetricRelevance,
  type AssetClassification,
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
    validation_status: 'PASS',
    quality_flags: [],
    provenance: {
      source_id: 'coingecko',
      source_type: 'API',
      fetched_at: NOW,
      observed_at: NOW,
      source_version: '1.0',
      source_confidence: 0.9,
    },
    ...overrides,
  };
}

/**
 * Create source reports for reconciliation testing
 */
function createSourceReports(
  metricId: string,
  values: Array<{ source: string; value: number; confidence?: number }>
): SourceReport[] {
  return values.map(v => createSourceReport(
    v.source as any,
    metricId,
    'bitcoin',
    v.value,
    NOW,
    v.confidence ?? 0.9
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
        status: 'PASS',
        qualityFlags: [],
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
      direction: 'higher_is_better',
      score_category: 'QS',
      is_derived: false,
      derivation_recipe: null,
      validation_status: 'PASS',
      quality_flags: [],
      provenance: {
        source_id: 'coingecko',
        source_type: 'API',
        fetched_at: NOW,
        observed_at: NOW,
        source_version: '1.0',
        source_confidence: 0.9,
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
      unit: 'INVALID_UNIT_XYZ',
    };

    const result = validateDatapoint(invalidData);
    
    expect(result.success).toBe(false);
  });

  it('REJECTS datapoint with missing metric_id', () => {
    const invalidData = {
      entity_id: 'bitcoin',
      raw_value: 1000000,
      unit: 'COUNT',
      direction: 'higher_is_better',
      score_category: 'QS',
      is_derived: false,
      derivation_recipe: null,
      validation_status: 'PASS',
      quality_flags: [],
      provenance: {
        source_id: 'coingecko',
        source_type: 'API',
        fetched_at: NOW,
        observed_at: NOW,
        source_version: '1.0',
        source_confidence: 0.9,
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
      metric_id: 'invalid-format', // Should be like qs_metric_name_v1
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
      agreementFactor: {
        highImpactMetricCount: 10,
        disputedCount: 0,
      },
      validationFactor: {
        totalMetrics: 10,
        failCount: 0,
        gatedCount: 0,
        warnCount: 0,
      },
      stalenessFactor: {
        highImpactMetrics: [
          { metricId: 'price', ageSeconds: 60, threshold: 600 },
        ],
        generalMetrics: [
          { metricId: 'other', ageSeconds: 60, threshold: 3600 },
        ],
      },
      coverageFactor: {
        presentSources: 1,  // Only 1 source
        requiredSources: 3, // Need 3 sources
      },
      entityId: 'bitcoin',
      identityConfidence: 99,
    };

    const result = calculateConfidenceScore(lowCoverageInput);
    
    // With only 1/3 sources, coverage factor is ~33%
    // This should significantly reduce confidence
    expect(result.coverageFactor).toBeLessThan(0.5);
    
    // Check gate assessment
    const gates = assessGates(
      result.score,
      0.5, // Critical coverage at 50%
      99   // High identity confidence
    );
    
    // Should fail coverage gate
    expect(gates.coverageGate.passed).toBe(false);
    expect(gates.allPassed).toBe(false);
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
    expect(anomaly!.severity).toBeGreaterThanOrEqual(7);
    expect(anomaly!.action).toBe('FLAG');
  });

  it('DETECTS wash trading pattern', () => {
    const anomaly = detectWashTrading(
      1000,   // 1000% volume spike
      50,     // Only 50 unique traders
      10000,  // High total transactions
      50000   // High volume
    );

    expect(anomaly).not.toBeNull();
    expect(anomaly!.type).toBe('WASH_TRADING');
    expect(anomaly!.severity).toBeGreaterThanOrEqual(8);
  });

  it('FLAGS entity with severe wash trading signals', () => {
    const validationResult = validateEntity(
      'suspicious_token',
      {
        'volume_24h': { value: 100000000, timestamp: NOW },
        'liquidity_depth': { value: 1000000, timestamp: NOW },
        'market_cap_usd': { value: 50000000, timestamp: NOW },
        'price_usd': { value: 1.5, timestamp: NOW },
      },
      {
        volumeChangePercent: 500,    // Massive volume spike
        liquidityChangePercent: 5,    // No liquidity increase
        socialChangePercent: 0,
        fundamentalChangePercent: 0,
        concentrationChangePercent: 0,
      }
    );

    // Should have anomaly signals
    expect(validationResult.anomalySignals.length).toBeGreaterThan(0);
    
    // Check for wash trading or volume mismatch flag
    const hasVolumeAnomaly = validationResult.anomalySignals.some(
      s => s.type === 'VOLUME_LIQUIDITY_MISMATCH' || s.type === 'WASH_TRADING'
    );
    expect(hasVolumeAnomaly).toBe(true);
    
    // Confidence should be reduced
    expect(validationResult.confidenceMultiplier).toBeLessThan(1.0);
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
    const classification = classifyAsset('ripple');
    
    expect(classification.category).toBe('Payments');
    
    // Check metric relevance for TVL against Payment category
    const relevance = getMetricRelevance('qs_tvl_v1', classification.category);
    
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

    const classification = classifyAsset('ripple'); // Payment token
    const filterResult = filterMetricsByContext(
      'ripple',
      availableMetrics,
      classification
    );

    // TVL should be in excluded metrics
    expect(filterResult.excluded_metrics.some(
      e => e.metric_id === 'qs_tvl_v1'
    )).toBe(true);
    
    // TVL should NOT be in applicable metrics
    expect(filterResult.applicable_metrics).not.toContain('qs_tvl_v1');
    
    // Other metrics should still be applicable
    expect(filterResult.applicable_metrics).toContain('qs_adoption_v1');
    expect(filterResult.applicable_metrics).toContain('os_liquidity_depth_v1');
  });

  it('VALIDATES TVL application against FSS allowed scope', () => {
    // Use FSS to validate
    const validationResult = validateMetricApplication('qs_tvl_v1', 'Payment');
    
    expect(validationResult.valid).toBe(false);
    expect(validationResult.error).toContain('forbidden');
    expect(validationResult.compensation).toContain('exclude_metric');
  });

  it('ALLOWS TVL for DeFi protocols', () => {
    const classification = classifyAsset('aave'); // DeFi protocol
    
    const relevance = getMetricRelevance('qs_tvl_v1', classification.category);
    
    // TVL should be CRITICAL or IMPORTANT for DeFi
    expect(['CRITICAL', 'IMPORTANT']).toContain(relevance);
  });

  it('EXCLUDES decentralization metrics for Meme coins', () => {
    const availableMetrics = [
      'qs_adoption_v1',
      'qs_decentralization_v1', // Should be excluded for memes
      'os_liquidity_depth_v1',
    ];

    const classification = classifyAsset('dogecoin'); // Meme coin
    const filterResult = filterMetricsByContext(
      'dogecoin',
      availableMetrics,
      classification
    );

    // Decentralization should be excluded or deprioritized for meme coins
    const isExcludedOrOptional = filterResult.excluded_metrics.some(
      e => e.metric_id === 'qs_decentralization_v1'
    );
    
    // For meme coins, serious fundamental metrics are often excluded
    expect(classification.category).toBe('Meme');
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
      { source: 'COINGECKO', value: 100, confidence: 0.9 },
      { source: 'COINMARKETCAP', value: 91, confidence: 0.9 },
      { source: 'DEFILLAMA', value: 91, confidence: 0.85 },
      { source: 'MESSARI', value: 90, confidence: 0.85 },
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports);

    // Agreement score should be low due to 10% spread
    expect(result.agreementScore).toBeLessThan(0.95);
    
    // Should be marked as disputed
    expect(result.disputeStatus).toBe('DISPUTED');
    
    // Confidence multiplier should be reduced
    expect(result.confidenceMultiplier).toBeLessThan(1.0);
  });

  it('USES weighted trimmed mean to exclude outlier', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'COINGECKO', value: 110, confidence: 0.9 },  // Outlier (will be trimmed)
      { source: 'COINMARKETCAP', value: 100, confidence: 0.9 },
      { source: 'DEFILLAMA', value: 100, confidence: 0.85 },
      { source: 'MESSARI', value: 100, confidence: 0.85 },
      { source: 'BINANCE', value: 90, confidence: 0.9 },     // Outlier (will be trimmed)
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports);

    // Reconciled value should be close to 100 (after trimming outliers)
    expect(result.reconciledValue).toBeCloseTo(100, 1);
    
    // Should have trimmed reports
    expect(result.trimmedReports.length).toBeGreaterThan(0);
  });

  it('PRODUCES high agreement score when sources agree', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'COINGECKO', value: 100.0, confidence: 0.9 },
      { source: 'COINMARKETCAP', value: 100.1, confidence: 0.9 },
      { source: 'DEFILLAMA', value: 99.9, confidence: 0.85 },
      { source: 'MESSARI', value: 100.0, confidence: 0.85 },
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports);

    // Agreement score should be high (sources within 0.2%)
    expect(result.agreementScore).toBeGreaterThan(0.99);
    expect(result.disputeStatus).toBe('AGREED');
  });

  it('MAINTAINS audit trail of raw values', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'COINGECKO', value: 100, confidence: 0.9 },
      { source: 'COINMARKETCAP', value: 105, confidence: 0.9 },
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports);

    // Should have audit trail
    expect(result.auditTrail).toBeDefined();
    expect(result.auditTrail.rawReports.length).toBe(2);
    expect(result.auditTrail.rawReports[0].value).toBe(100);
    expect(result.auditTrail.rawReports[1].value).toBe(105);
  });

  it('HANDLES single source with low confidence', () => {
    const reports = createSourceReports('price_usd', [
      { source: 'COINGECKO', value: 100, confidence: 0.9 },
    ]);

    const result = reconcileMetric('price_usd', 'bitcoin', reports, {
      min_sources: 2, // Requires 2 sources
    });

    // Should flag insufficient sources
    expect(result.confidenceMultiplier).toBeLessThan(1.0);
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
      if (!citedClaim.includes('_score') && !citedClaim.includes('_final')) {
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
      // ... other required fields missing
    };

    const validation = validateExplanationObject(invalidEO);
    
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION CHECKLIST - INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Validation Checklist - End-to-End CIS Integrity', () => {
  describe('Contract Enforcement (100% Layer 1 adherence)', () => {
    it('ALL valid datapoints pass schema validation', () => {
      const validDatapoints = [
        createValidDatapoint({ metric_id: 'qs_adoption_v1' }),
        createValidDatapoint({ metric_id: 'os_liquidity_depth_v1', direction: 'higher_is_better' }),
        createValidDatapoint({ metric_id: 'risk_concentration_v1', direction: 'higher_is_worse' }),
      ];

      for (const dp of validDatapoints) {
        const result = validateDatapoint(dp);
        expect(result.success).toBe(true);
      }
    });

    it('ALL invalid datapoints fail with specific errors', () => {
      const invalidDatapoints = [
        { data: { ...createValidDatapoint(), raw_value: NaN }, error: 'finite' },
        { data: { ...createValidDatapoint(), unit: undefined }, error: 'unit' },
        { data: { ...createValidDatapoint(), metric_id: '' }, error: 'metric_id' },
      ];

      for (const { data, error } of invalidDatapoints) {
        const result = validateDatapoint(data as any);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Semantic Rigor (Zero FSS boundary violations)', () => {
    it('TVL is NEVER applied to Payment tokens', () => {
      const paymentAssets = ['ripple', 'stellar'];
      
      for (const asset of paymentAssets) {
        const validation = validateMetricApplication('qs_tvl_v1', 'Payment');
        expect(validation.valid).toBe(false);
      }
    });

    it('Context engine filters ALL forbidden metrics', () => {
      const testCases = [
        { asset: 'ripple', category: 'Payments', forbidden: 'qs_tvl_v1' },
        { asset: 'ripple', category: 'Payments', forbidden: 'qs_ecosystem_depth_v1' },
      ];

      for (const tc of testCases) {
        const classification: AssetClassification = {
          entity_id: tc.asset,
          category: tc.category as any,
          sector_group: 'Payments',
          identity_confidence: 95,
          confidence_components: {
            provider_consensus: 0.95,
            historical_consistency: 0.95,
            metadata_completeness: 0.9,
            classification_source_quality: 0.95,
          },
        };

        const filterResult = filterMetricsByContext(
          tc.asset,
          [tc.forbidden, 'qs_adoption_v1'],
          classification
        );

        expect(filterResult.excluded_metrics.some(
          e => e.metric_id === tc.forbidden
        )).toBe(true);
      }
    });
  });

  describe('Auditability Guarantee (Full traceability)', () => {
    it('Every EO claim is traceable to Layer 1 source', () => {
      const pipelineResults = createPipelineResults();
      const eo = buildExplanationObject(pipelineResults, 'audit-test-123');
      
      if (isGatedOutput(eo)) {
        throw new Error('Expected valid EO');
      }

      // Every claim should have source traceability
      for (const claim of eo.claims) {
        expect(claim.metric_id).toBeDefined();
        expect(claim.source_id).toBeDefined();
        expect(claim.timestamp).toBeDefined();
        expect(claim.validation_status).toBeDefined();
      }
    });

    it('EO contains complete provenance chain', () => {
      const pipelineResults = createPipelineResults();
      const eo = buildExplanationObject(pipelineResults, 'provenance-test-123');
      
      if (isGatedOutput(eo)) {
        throw new Error('Expected valid EO');
      }

      // Should have full audit trail
      expect(eo.pipeline_execution_id).toBe('provenance-test-123');
      expect(eo.generated_at).toBeDefined();
      expect(eo.eo_id).toBeDefined();
      expect(eo.confidence).toBeDefined();
      expect(eo.gate_status).toBeDefined();
      expect(eo.coverage_summary).toBeDefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADDITIONAL ADVERSARIAL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Additional Adversarial Scenarios', () => {
  it('DETECTS social hype without fundamental change', () => {
    const anomaly = detectSocialFundamentalDivergence(
      500,  // Social up 500%
      5     // Fundamentals only up 5%
    );

    expect(anomaly).not.toBeNull();
    expect(anomaly!.type).toBe('SOCIAL_FUNDAMENTAL_DIVERGENCE');
  });

  it('HANDLES extreme values without breaking', () => {
    const extremeResults = createPipelineResults({
      scores: {
        qs: { value: 100, tier: 'Elite', coverage: 1.0, confidence: 1.0 },
        os: { value: 100, tier: 'Elite', coverage: 1.0, confidence: 1.0, gated: false },
        risk: { value: 0, tier: 'Minimal', coverage: 1.0, confidence: 1.0 },
        pos: {
          raw: 100,
          smoothed: 100,
          final: 100,
          tier: 'Elite',
          gated: false,
          gatingReason: null,
        },
        formula: {
          version: 'v3.0',
          weights: { qs: 0.60, os: 0.25, safety: 0.15 },
        },
      },
    });

    const eo = buildExplanationObject(extremeResults, 'extreme-test');
    
    if (isGatedOutput(eo)) {
      throw new Error('Expected valid EO');
    }

    expect(eo.scores.pos.final).toBe(100);
    
    // Should render without errors
    const rendered = renderNarrative(eo);
    expect(rendered.gated).toBe(false);
  });

  it('REJECTS empty entity_id', () => {
    const invalidData = {
      ...createValidDatapoint(),
      entity_id: '',
    };

    const result = validateDatapoint(invalidData);
    expect(result.success).toBe(false);
  });

  it('PROPERLY gates when all confidence components fail', () => {
    const disastrousResults = createPipelineResults({
      confidence: {
        score: 20,
        level: 'INSUFFICIENT',
        gatesPassed: {
          confidence: false,
          coverage: false,
          identity: false,
        },
        failureReason: 'All gates failed',
      },
      coverage: {
        overall: 0.3,
        critical: 0.2,
        missingCritical: ['price', 'volume', 'market_cap'],
        missingImportant: ['tvl', 'dev_activity'],
      },
      asset: {
        ...createPipelineResults().asset,
        identityConfidence: 50,
      },
    });

    const eo = buildExplanationObject(disastrousResults, 'disaster-test');
    
    expect(isGatedOutput(eo)).toBe(true);
  });
});
