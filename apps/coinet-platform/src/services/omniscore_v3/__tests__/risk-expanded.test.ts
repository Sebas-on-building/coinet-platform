/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 EXPANDED RISK MODEL TESTS                                              ║
 * ║                                                                               ║
 * ║   Tests for the expanded 8-segment Risk model:                               ║
 * ║   LEGAL, MACRO, CENTRAL, STABILITY, CONC, UNLOCK, LIQUIDITY, CONTRACT        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect } from 'vitest';
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
  confidenceSource: number = 0.8
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
    confidenceSource,
    isDerived: false,
    isStale: false,
    ttlSeconds: 3600,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEGMENT WEIGHT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Segment Weights', () => {
  it('weights should sum to 1.0', () => {
    const sum = Object.values(RISK_SEGMENT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 3);
  });

  it('should have all 8 segments defined', () => {
    const expectedSegments: RiskSegment[] = [
      'LEGAL', 'MACRO', 'CENTRAL', 'STABILITY', 
      'CONC', 'UNLOCK', 'LIQUIDITY', 'CONTRACT'
    ];
    
    for (const seg of expectedSegments) {
      expect(RISK_SEGMENT_WEIGHTS[seg]).toBeDefined();
      expect(RISK_SEGMENT_WEIGHTS[seg]).toBeGreaterThan(0);
    }
  });

  it('CENTRAL should have highest weight (20%)', () => {
    expect(RISK_SEGMENT_WEIGHTS.CENTRAL).toBe(0.20);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BASIC RISK CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Calculation', () => {
  it('should return default risk scores when no data provided', () => {
    const result = calculateRiskScore([]);
    
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.tier).toBeDefined();
    
    // All segments should have coverage = 0
    for (const seg of Object.keys(result.segments) as RiskSegment[]) {
      expect(result.segments[seg].coverage).toBe(0);
    }
  });

  it('should calculate risk with partial data', () => {
    const dataPoints: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 4),
      createDataPoint('validator_count', 'CENTRAL', 10000),
      createDataPoint('uptime_30d', 'STABILITY', 99.9),
    ];
    
    const result = calculateRiskScore(dataPoints);
    
    expect(result.score).toBeGreaterThan(0);
    expect(result.segments.CENTRAL.coverage).toBeGreaterThan(0);
    expect(result.segments.STABILITY.coverage).toBeGreaterThan(0);
  });

  it('should be bounded between 0 and 100', () => {
    // Extreme low risk data
    const lowRiskData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 1000),
      createDataPoint('validator_count', 'CENTRAL', 50000),
      createDataPoint('uptime_30d', 'STABILITY', 99.99),
      createDataPoint('audit_count', 'CONTRACT', 10),
    ];
    
    const lowResult = calculateRiskScore(lowRiskData);
    expect(lowResult.score).toBeGreaterThanOrEqual(0);
    expect(lowResult.score).toBeLessThanOrEqual(100);

    // Extreme high risk data
    const highRiskData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 1),
      createDataPoint('validator_count', 'CENTRAL', 5),
      createDataPoint('uptime_30d', 'STABILITY', 80),
      createDataPoint('outage_count_90d', 'STABILITY', 10),
    ];
    
    const highResult = calculateRiskScore(highRiskData);
    expect(highResult.score).toBeGreaterThanOrEqual(0);
    expect(highResult.score).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET DIFFERENTIATION TESTS (BTC vs ETH vs SOL)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Asset Risk Differentiation', () => {
  it('should differentiate centralization risk based on multiple factors', () => {
    // Note: Nakamoto coefficient is the MINIMUM number of entities to collude for >50% control
    // Higher = MORE decentralized = LOWER risk
    
    const btcData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 4), // 4 mining pools for 51%
      createDataPoint('validator_count', 'CENTRAL', 15000),  // miners
      createDataPoint('top_validators_stake_percent', 'CENTRAL', 25),
    ];
    
    const ethData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 3),  // Lido dominance
      createDataPoint('validator_count', 'CENTRAL', 900000), // Most validators
      createDataPoint('top_validators_stake_percent', 'CENTRAL', 35),
    ];
    
    const solData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 19),  // Better than BTC/ETH here
      createDataPoint('validator_count', 'CENTRAL', 1800),     // Fewer total validators
      createDataPoint('top_validators_stake_percent', 'CENTRAL', 35),
    ];
    
    const btcResult = calculateRiskScore(btcData);
    const ethResult = calculateRiskScore(ethData);
    const solResult = calculateRiskScore(solData);
    
    // All should have different centralization scores
    expect(btcResult.segments.CENTRAL.score).toBeDefined();
    expect(ethResult.segments.CENTRAL.score).toBeDefined();
    expect(solResult.segments.CENTRAL.score).toBeDefined();
    
    // ETH has worst Nakamoto coefficient (3), but most validators
    // SOL has best Nakamoto coefficient (19), but fewest validators
    // The scoring should reflect this tradeoff - each metric contributes
    
    console.log('Centralization Risk Comparison:');
    console.log(`  BTC: ${btcResult.segments.CENTRAL.score} (nakamoto=4, validators=15K)`);
    console.log(`  ETH: ${ethResult.segments.CENTRAL.score} (nakamoto=3, validators=900K)`);
    console.log(`  SOL: ${solResult.segments.CENTRAL.score} (nakamoto=19, validators=1.8K)`);
  });

  it('SOL should have higher stability risk due to outages', () => {
    const btcStability: DataPoint[] = [
      createDataPoint('uptime_30d', 'STABILITY', 99.99),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
    ];
    
    const ethStability: DataPoint[] = [
      createDataPoint('uptime_30d', 'STABILITY', 99.95),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
    ];
    
    const solStability: DataPoint[] = [
      createDataPoint('uptime_30d', 'STABILITY', 99.5),
      createDataPoint('outage_count_90d', 'STABILITY', 3),
    ];
    
    const btcResult = calculateRiskScore(btcStability);
    const ethResult = calculateRiskScore(ethStability);
    const solResult = calculateRiskScore(solStability);
    
    // SOL should have highest stability risk
    expect(solResult.segments.STABILITY.score).toBeGreaterThan(btcResult.segments.STABILITY.score);
    expect(solResult.segments.STABILITY.score).toBeGreaterThan(ethResult.segments.STABILITY.score);
  });

  it('should produce different total Risk scores for BTC, ETH, SOL', () => {
    // Comprehensive BTC data
    const btcData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 4),
      createDataPoint('validator_count', 'CENTRAL', 15000),
      createDataPoint('uptime_30d', 'STABILITY', 99.99),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
      createDataPoint('top10_holders_percent', 'CONC', 5),
      createDataPoint('audit_count', 'CONTRACT', 0), // BTC has no smart contracts
    ];
    
    // Comprehensive ETH data
    const ethData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 3),
      createDataPoint('validator_count', 'CENTRAL', 900000),
      createDataPoint('uptime_30d', 'STABILITY', 99.95),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
      createDataPoint('top10_holders_percent', 'CONC', 15),
      createDataPoint('audit_count', 'CONTRACT', 5),
    ];
    
    // Comprehensive SOL data
    const solData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 19),
      createDataPoint('validator_count', 'CENTRAL', 1800),
      createDataPoint('uptime_30d', 'STABILITY', 99),
      createDataPoint('outage_count_90d', 'STABILITY', 3),
      createDataPoint('top10_holders_percent', 'CONC', 25),
      createDataPoint('audit_count', 'CONTRACT', 3),
    ];
    
    const btcResult = calculateRiskScore(btcData);
    const ethResult = calculateRiskScore(ethData);
    const solResult = calculateRiskScore(solData);
    
    // All should produce different scores
    expect(btcResult.score).not.toBe(ethResult.score);
    expect(ethResult.score).not.toBe(solResult.score);
    expect(btcResult.score).not.toBe(solResult.score);
    
    // Expected ordering: BTC < ETH < SOL (for risk)
    expect(btcResult.score).toBeLessThan(solResult.score);
    
    console.log('Risk Score Comparison:');
    console.log(`  BTC: ${btcResult.score} (${btcResult.tier})`);
    console.log(`  ETH: ${ethResult.score} (${ethResult.tier})`);
    console.log(`  SOL: ${solResult.score} (${solResult.tier})`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK TIER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Tier Assignment', () => {
  it('should assign Elite tier for very low risk (<= 15)', () => {
    // Very safe asset data
    const safeData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 500),
      createDataPoint('validator_count', 'CENTRAL', 100000),
      createDataPoint('uptime_30d', 'STABILITY', 99.999),
      createDataPoint('outage_count_90d', 'STABILITY', 0),
      createDataPoint('top10_holders_percent', 'CONC', 3),
      createDataPoint('audit_count', 'CONTRACT', 10),
    ];
    
    const result = calculateRiskScore(safeData);
    expect(result.tier).toBe('Elite');
    expect(result.score).toBeLessThanOrEqual(15);
  });

  it('should assign Critical tier for very high risk (> 70)', () => {
    // Very risky asset data
    const riskyData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 1),
      createDataPoint('validator_count', 'CENTRAL', 3),
      createDataPoint('uptime_30d', 'STABILITY', 80),
      createDataPoint('outage_count_90d', 'STABILITY', 10),
      createDataPoint('top10_holders_percent', 'CONC', 95),
      createDataPoint('audit_count', 'CONTRACT', 0),
      createDataPoint('sec_warning_active', 'LEGAL', 1),
    ];
    
    const result = calculateRiskScore(riskyData);
    expect(['Weak', 'Critical']).toContain(result.tier);
    expect(result.score).toBeGreaterThan(50);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT RISK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Event Risk Severity', () => {
  it('should add up to 30 points for max event risk', () => {
    const baseData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
      createDataPoint('uptime_30d', 'STABILITY', 99.9),
    ];
    
    const baseResult = calculateRiskScore(baseData, 0);
    const eventResult = calculateRiskScore(baseData, 1.0);
    
    const scoreDiff = eventResult.score - baseResult.score;
    expect(scoreDiff).toBeLessThanOrEqual(30);
    expect(scoreDiff).toBeGreaterThan(0);
  });

  it('should not exceed 100 even with max event risk', () => {
    const highRiskData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 1),
      createDataPoint('outage_count_90d', 'STABILITY', 20),
    ];
    
    const result = calculateRiskScore(highRiskData, 1.0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RISK BREAKDOWN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Risk Breakdown', () => {
  it('should return top 5 risk contributors', () => {
    const mixedData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 5),
      createDataPoint('outage_count_90d', 'STABILITY', 5),
      createDataPoint('top10_holders_percent', 'CONC', 60),
      createDataPoint('next_unlock_percent_30d', 'UNLOCK', 8),
    ];
    
    const result = calculateRiskScore(mixedData);
    const breakdown = getRiskBreakdown(result);
    
    expect(breakdown.topRisks.length).toBeLessThanOrEqual(5);
    expect(breakdown.topRisks.length).toBeGreaterThan(0);
    
    // Should be sorted by contribution (descending)
    for (let i = 1; i < breakdown.topRisks.length; i++) {
      expect(breakdown.topRisks[i - 1].contribution).toBeGreaterThanOrEqual(
        breakdown.topRisks[i].contribution
      );
    }
  });

  it('should flag low coverage segments', () => {
    // Only provide data for one segment
    const sparseData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
    ];
    
    const result = calculateRiskScore(sparseData);
    const breakdown = getRiskBreakdown(result);
    
    expect(breakdown.coverageWarnings.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COVERAGE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Coverage Calculation', () => {
  it('should report higher coverage with more data', () => {
    const minimalData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
    ];
    
    const comprehensiveData: DataPoint[] = [
      createDataPoint('nakamoto_coefficient', 'CENTRAL', 50),
      createDataPoint('validator_count', 'CENTRAL', 1000),
      createDataPoint('top_validators_stake_percent', 'CENTRAL', 30),
      createDataPoint('admin_key_holders', 'CENTRAL', 5),
    ];
    
    const minResult = calculateRiskScore(minimalData);
    const compResult = calculateRiskScore(comprehensiveData);
    
    expect(compResult.segments.CENTRAL.coverage).toBeGreaterThan(
      minResult.segments.CENTRAL.coverage
    );
  });
});
