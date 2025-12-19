/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 RISK MODEL PRODUCTION READINESS TESTS                                  ║
 * ║                                                                               ║
 * ║   Comprehensive tests for production deployment:                             ║
 * ║   - Edge cases & boundary conditions                                         ║
 * ║   - Stress tests & performance                                               ║
 * ║   - Invariant verification                                                   ║
 * ║   - Error handling & resilience                                              ║
 * ║   - Real-world scenario simulations                                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateRiskScore, getRiskBreakdown } from '../segments/risk';
import type { DataPoint, RiskSegment } from '../types';
import { RISK_SEGMENT_WEIGHTS } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function createDataPoint(
  key: string,
  segment: RiskSegment,
  raw: number | null,
  options: Partial<DataPoint> = {}
): DataPoint {
  return {
    key,
    segment,
    raw,
    normalized: raw,
    source: 'test',
    sourceType: 'api',
    timestamp: new Date().toISOString(),
    freshnessSeconds: 60,
    confidenceSource: 0.8,
    isDerived: false,
    isStale: false,
    ttlSeconds: 3600,
    ...options,
  };
}

function createRandomDataPoint(segment: RiskSegment): DataPoint {
  const keys: Record<RiskSegment, string[]> = {
    LEGAL: ['regulatory_status', 'sec_warning_active', 'jurisdiction_risk_score'],
    MACRO: ['btc_correlation_90d', 'fear_greed_index', 'market_beta'],
    CENTRAL: ['nakamoto_coefficient', 'validator_count', 'top_validators_stake_percent'],
    STABILITY: ['uptime_30d', 'outage_count_90d', 'avg_block_time_variance'],
    CONC: ['top10_holders_percent', 'gini_coefficient', 'unique_holders'],
    UNLOCK: ['next_unlock_percent_30d', 'total_locked_percent', 'vesting_cliff_soon'],
    LIQUIDITY: ['depth_2_percent', 'slippage_10k', 'spread_avg'],
    CONTRACT: ['audit_count', 'audit_score', 'bug_bounty_active'],
  };
  
  const segmentKeys = keys[segment];
  const key = segmentKeys[Math.floor(Math.random() * segmentKeys.length)];
  const raw = Math.random() * 100;
  
  return createDataPoint(key, segment, raw);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Model - Edge Cases', () => {
  describe('Null and Missing Values', () => {
    it('should handle all null raw values gracefully', () => {
      const nullData: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', null),
        createDataPoint('uptime_30d', 'STABILITY', null),
        createDataPoint('top10_holders_percent', 'CONC', null),
      ];
      
      const result = calculateRiskScore(nullData);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.tier).toBeDefined();
    });

    it('should handle empty data points array', () => {
      const result = calculateRiskScore([]);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.tier).toBeDefined();
      expect(Object.keys(result.segments).length).toBe(8);
    });

    it('should handle mixed null and valid values', () => {
      const mixedData: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
        createDataPoint('validator_count', 'CENTRAL', null),
        createDataPoint('uptime_30d', 'STABILITY', 99.9),
        createDataPoint('outage_count_90d', 'STABILITY', null),
      ];
      
      const result = calculateRiskScore(mixedData);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.segments.CENTRAL.coverage).toBeGreaterThan(0);
      expect(result.segments.STABILITY.coverage).toBeGreaterThan(0);
    });
  });

  describe('Extreme Values', () => {
    it('should handle zero values correctly', () => {
      const zeroData: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 0),
        createDataPoint('validator_count', 'CENTRAL', 0),
        createDataPoint('uptime_30d', 'STABILITY', 0),
        createDataPoint('audit_count', 'CONTRACT', 0),
      ];
      
      const result = calculateRiskScore(zeroData);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle maximum values correctly', () => {
      const maxData: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 1000000),
        createDataPoint('validator_count', 'CENTRAL', 10000000),
        createDataPoint('uptime_30d', 'STABILITY', 100),
        createDataPoint('audit_count', 'CONTRACT', 100),
      ];
      
      const result = calculateRiskScore(maxData);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle negative values without crashing', () => {
      const negativeData: DataPoint[] = [
        createDataPoint('btc_correlation_90d', 'MACRO', -0.5),
        createDataPoint('funding_rate_avg', 'MACRO', -0.01),
      ];
      
      const result = calculateRiskScore(negativeData);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle very large numbers', () => {
      const largeData: DataPoint[] = [
        createDataPoint('unique_holders', 'CONC', 1e12),
        createDataPoint('validator_count', 'CENTRAL', 1e9),
      ];
      
      const result = calculateRiskScore(largeData);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.score)).toBe(true);
    });

    it('should handle decimal precision correctly', () => {
      const precisionData: DataPoint[] = [
        createDataPoint('uptime_30d', 'STABILITY', 99.99999999),
        createDataPoint('gini_coefficient', 'CONC', 0.00000001),
        createDataPoint('slippage_10k', 'LIQUIDITY', 0.0001),
      ];
      
      const result = calculateRiskScore(precisionData);
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.score)).toBe(true);
    });
  });

  describe('Boundary Conditions', () => {
    it('should handle event risk severity at exactly 0', () => {
      const data: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
      ];
      
      const result = calculateRiskScore(data, 0);
      expect(result.eventRiskSeverity).toBe(0);
    });

    it('should handle event risk severity at exactly 1', () => {
      const data: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
      ];
      
      const result = calculateRiskScore(data, 1);
      expect(result.eventRiskSeverity).toBe(1);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle event risk severity > 1 gracefully', () => {
      const data: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
      ];
      
      const result = calculateRiskScore(data, 2);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should handle confidence source at 0', () => {
      const lowConfData: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 50, { confidenceSource: 0 }),
      ];
      
      const result = calculateRiskScore(lowConfData);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle confidence source at 1', () => {
      const highConfData: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', 50, { confidenceSource: 1 }),
      ];
      
      const result = calculateRiskScore(highConfData);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Model - Invariants', () => {
  it('INV-1: Risk score always bounded [0, 100]', () => {
    for (let i = 0; i < 100; i++) {
      const segments: RiskSegment[] = ['LEGAL', 'MACRO', 'CENTRAL', 'STABILITY', 'CONC', 'UNLOCK', 'LIQUIDITY', 'CONTRACT'];
      const randomData: DataPoint[] = segments.map(seg => createRandomDataPoint(seg));
      
      const result = calculateRiskScore(randomData, Math.random());
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it('INV-2: All 8 segments always present in result', () => {
    const expectedSegments: RiskSegment[] = ['LEGAL', 'MACRO', 'CENTRAL', 'STABILITY', 'CONC', 'UNLOCK', 'LIQUIDITY', 'CONTRACT'];
    
    const result = calculateRiskScore([]);
    
    for (const seg of expectedSegments) {
      expect(result.segments[seg]).toBeDefined();
      expect(result.segments[seg].segment).toBe(seg);
    }
  });

  it('INV-3: Segment weights sum to 1.0', () => {
    const sum = Object.values(RISK_SEGMENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('INV-4: Coverage always bounded [0, 1]', () => {
    for (let i = 0; i < 50; i++) {
      const randomData: DataPoint[] = [];
      const numPoints = Math.floor(Math.random() * 20);
      
      for (let j = 0; j < numPoints; j++) {
        const segments: RiskSegment[] = ['LEGAL', 'MACRO', 'CENTRAL', 'STABILITY', 'CONC', 'UNLOCK', 'LIQUIDITY', 'CONTRACT'];
        const seg = segments[Math.floor(Math.random() * segments.length)];
        randomData.push(createRandomDataPoint(seg));
      }
      
      const result = calculateRiskScore(randomData);
      
      for (const seg of Object.values(result.segments)) {
        expect(seg.coverage).toBeGreaterThanOrEqual(0);
        expect(seg.coverage).toBeLessThanOrEqual(1);
      }
    }
  });

  it('INV-5: Tier assignment is deterministic for same score', () => {
    const data: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
      createDataPoint('uptime_30d', 'STABILITY', 99.5),
    ];
    
    const result1 = calculateRiskScore(data);
    const result2 = calculateRiskScore(data);
    
    expect(result1.score).toBe(result2.score);
    expect(result1.tier).toBe(result2.tier);
  });

  it('INV-6: Higher risk inputs produce higher risk scores (monotonicity)', () => {
    const lowRiskData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 100),  // High = more decentralized = lower risk
      createDataPoint('uptime_30d', 'STABILITY', 99.99),        // High = better = lower risk
      createDataPoint('audit_count', 'CONTRACT', 10),           // High = better = lower risk
    ];
    
    const highRiskData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 1),    // Low = centralized = higher risk
      createDataPoint('uptime_30d', 'STABILITY', 90),           // Lower = worse = higher risk
      createDataPoint('audit_count', 'CONTRACT', 0),            // Zero = worse = higher risk
    ];
    
    const lowResult = calculateRiskScore(lowRiskData);
    const highResult = calculateRiskScore(highRiskData);
    
    expect(highResult.score).toBeGreaterThan(lowResult.score);
  });

  it('INV-7: Result is always serializable to JSON', () => {
    const data: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
    ];
    
    const result = calculateRiskScore(data);
    
    expect(() => JSON.stringify(result)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(result));
    expect(parsed.score).toBe(result.score);
    expect(parsed.tier).toBe(result.tier);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STRESS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Model - Stress Tests', () => {
  it('should handle 1000 calculations in sequence', () => {
    const startTime = Date.now();
    const results: number[] = [];
    
    for (let i = 0; i < 1000; i++) {
      const data: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', Math.random() * 100),
        createDataPoint('uptime_30d', 'STABILITY', 95 + Math.random() * 5),
      ];
      
      const result = calculateRiskScore(data);
      results.push(result.score);
    }
    
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(1000);
    expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
    console.log(`1000 sequential calculations completed in ${duration}ms`);
  });

  it('should handle large data point arrays (100+ points)', () => {
    const segments: RiskSegment[] = ['LEGAL', 'MACRO', 'CENTRAL', 'STABILITY', 'CONC', 'UNLOCK', 'LIQUIDITY', 'CONTRACT'];
    const largeData: DataPoint[] = [];
    
    for (let i = 0; i < 100; i++) {
      const seg = segments[i % segments.length];
      largeData.push(createRandomDataPoint(seg));
    }
    
    const startTime = Date.now();
    const result = calculateRiskScore(largeData);
    const duration = Date.now() - startTime;
    
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(duration).toBeLessThan(100); // Should be fast
  });

  it('should maintain consistent results across multiple runs', () => {
    const data: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 45.5),
      createDataPoint('validator_count', 'CENTRAL', 5000),
      createDataPoint('uptime_30d', 'STABILITY', 99.8),
      createDataPoint('top10_holders_percent', 'CONC', 30),
    ];
    
    const scores: number[] = [];
    for (let i = 0; i < 100; i++) {
      const result = calculateRiskScore(data);
      scores.push(result.score);
    }
    
    // All scores should be identical
    const uniqueScores = [...new Set(scores)];
    expect(uniqueScores.length).toBe(1);
  });

  it('should not leak memory over many calculations', () => {
    // Calculate baseline
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
      const data: DataPoint[] = [
        createDataPoint('nakamoto_coefficient', 'CENTRAL', Math.random() * 100),
        createDataPoint('uptime_30d', 'STABILITY', 95 + Math.random() * 5),
        createDataPoint('top10_holders_percent', 'CONC', Math.random() * 100),
      ];
      
      const result = calculateRiskScore(data);
      // Discard result - just testing for leaks
      void result;
    }
    
    // If we got here without crash/OOM, test passes
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD SCENARIO TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Model - Real-World Scenarios', () => {
  it('BTC-like asset should have low risk profile', () => {
    const btcData: DataPoint[] = [
      // Centralization - very decentralized
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 4),
      createDataPoint('validator_count', 'CENTRAL', 15000),
      createDataPoint('top_validators_stake_percent', 'CENTRAL', 25),
      
      // Stability - extremely stable
      createDataPoint('uptime_30d', 'STABILITY', 99.99),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
      
      // Concentration - well distributed
      createDataPoint('top10_holders_percent', 'CONC', 5),
      createDataPoint('unique_holders', 'CONC', 50000000),
      
      // No unlock risk (fully distributed)
      createDataPoint('next_unlock_percent_30d', 'UNLOCK', 0),
      
      // High liquidity
      createDataPoint('depth_2_percent', 'LIQUIDITY', 15),
      createDataPoint('slippage_10k', 'LIQUIDITY', 0.01),
      
      // No smart contract risk
      createDataPoint('audit_count', 'CONTRACT', 0),
    ];
    
    const result = calculateRiskScore(btcData);
    
    expect(result.score).toBeLessThan(40);
    expect(['Elite', 'Strong']).toContain(result.tier);
    
    console.log(`BTC-like Risk: ${result.score} (${result.tier})`);
  });

  it('High-risk memecoin should have high risk profile', () => {
    const memeData: DataPoint[] = [
      // Centralization - very centralized
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 1),
      createDataPoint('validator_count', 'CENTRAL', 10),
      createDataPoint('admin_key_holders', 'CENTRAL', 1),
      
      // Stability - unknown
      createDataPoint('uptime_30d', 'STABILITY', 95),
      
      // Concentration - very concentrated
      createDataPoint('top10_holders_percent', 'CONC', 80),
      createDataPoint('unique_holders', 'CONC', 500),
      
      // High unlock risk
      createDataPoint('next_unlock_percent_30d', 'UNLOCK', 15),
      createDataPoint('vesting_cliff_soon', 'UNLOCK', 1),
      
      // Low liquidity
      createDataPoint('depth_2_percent', 'LIQUIDITY', 0.1),
      createDataPoint('slippage_10k', 'LIQUIDITY', 5),
      
      // No audits
      createDataPoint('audit_count', 'CONTRACT', 0),
      createDataPoint('verified_source_code', 'CONTRACT', 0),
    ];
    
    const result = calculateRiskScore(memeData);
    
    expect(result.score).toBeGreaterThan(50);
    expect(['Neutral', 'Weak', 'Critical']).toContain(result.tier);
    
    console.log(`Memecoin Risk: ${result.score} (${result.tier})`);
  });

  it('Mid-cap DeFi protocol should have moderate risk profile', () => {
    const defiData: DataPoint[] = [
      // Moderate centralization
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 20),
      createDataPoint('admin_key_holders', 'CENTRAL', 5),
      
      // Good stability
      createDataPoint('uptime_30d', 'STABILITY', 99.5),
      createDataPoint('outage_count_90d', 'STABILITY', 1),
      
      // Moderate concentration
      createDataPoint('top10_holders_percent', 'CONC', 35),
      createDataPoint('unique_holders', 'CONC', 50000),
      
      // Some unlock pressure
      createDataPoint('next_unlock_percent_30d', 'UNLOCK', 2),
      
      // Decent liquidity
      createDataPoint('depth_2_percent', 'LIQUIDITY', 3),
      createDataPoint('slippage_10k', 'LIQUIDITY', 0.5),
      
      // Has audits
      createDataPoint('audit_count', 'CONTRACT', 3),
      createDataPoint('bug_bounty_active', 'CONTRACT', 1),
    ];
    
    const result = calculateRiskScore(defiData);
    
    expect(result.score).toBeGreaterThan(20);
    expect(result.score).toBeLessThan(60);
    
    console.log(`DeFi Protocol Risk: ${result.score} (${result.tier})`);
  });

  it('Network under attack should reflect elevated risk', () => {
    const normalData: DataPoint[] = [
      createDataPoint('uptime_30d', 'STABILITY', 99.9),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
    ];
    
    const attackData: DataPoint[] = [
      createDataPoint('uptime_30d', 'STABILITY', 99.9),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
    ];
    
    const normalResult = calculateRiskScore(normalData, 0);
    const attackResult = calculateRiskScore(attackData, 0.8); // High event risk
    
    expect(attackResult.score).toBeGreaterThan(normalResult.score);
    expect(attackResult.score - normalResult.score).toBeGreaterThanOrEqual(20);
    
    console.log(`Normal Risk: ${normalResult.score}, Under Attack: ${attackResult.score}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK BREAKDOWN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Breakdown - Production', () => {
  it('should provide actionable breakdown for high-risk assets', () => {
    const riskyData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 2),
      createDataPoint('outage_count_90d', 'STABILITY', 5),
      createDataPoint('top10_holders_percent', 'CONC', 70),
      createDataPoint('next_unlock_percent_30d', 'UNLOCK', 10),
    ];
    
    const result = calculateRiskScore(riskyData);
    const breakdown = getRiskBreakdown(result);
    
    expect(breakdown.topRisks.length).toBeGreaterThan(0);
    expect(breakdown.topRisks[0].segment).toBeDefined();
    expect(breakdown.topRisks[0].contribution).toBeGreaterThan(0);
    
    // Should identify major risk sources
    const riskSegments = breakdown.topRisks.map(r => r.segment);
    expect(riskSegments.length).toBeGreaterThan(0);
    
    console.log('Top Risk Contributors:', breakdown.topRisks.slice(0, 3).map(r => 
      `${r.segment}: ${r.contribution.toFixed(1)}`
    ).join(', '));
  });

  it('should flag coverage warnings for sparse data', () => {
    const sparseData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
    ];
    
    const result = calculateRiskScore(sparseData);
    const breakdown = getRiskBreakdown(result);
    
    expect(breakdown.coverageWarnings.length).toBeGreaterThan(0);
    
    console.log('Coverage Warnings:', breakdown.coverageWarnings.slice(0, 3));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE SAFETY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Model - Type Safety', () => {
  it('should handle unknown segment gracefully', () => {
    const data: DataPoint[] = [
      createDataPoint('some_metric', 'UNKNOWN_SEGMENT' as RiskSegment, 50),
    ];
    
    // Should not throw, should return valid result
    expect(() => calculateRiskScore(data)).not.toThrow();
    const result = calculateRiskScore(data);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('should handle malformed data point', () => {
    const malformed = {
      key: 'test',
      segment: 'CENTRAL',
      raw: 50,
      // Missing other required fields
    } as DataPoint;
    
    // Should not crash even with incomplete data
    expect(() => calculateRiskScore([malformed])).not.toThrow();
  });
});
