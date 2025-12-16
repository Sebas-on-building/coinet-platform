/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 BEHAVIOR TESTS                                                         ║
 * ║                                                                               ║
 * ║   "Stop using golden cases as targets. Use them only to test behavior:       ║
 * ║    monotonicity, no NaNs, weight sums = 1, and 'majors don't drop to Weak    ║
 * ║    unless confidence is low.' Golden tests should detect regressions,        ║
 * ║    not dictate outputs."                                                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect } from 'vitest';
import { calculatePOS } from '../scoring/scoring';
import {
  POS_WEIGHTS,
  POS_WEIGHTS_OS_GATED,
  QS_FEATURE_WEIGHTS,
  OS_FEATURE_WEIGHTS,
  RISK_FEATURE_WEIGHTS,
} from '../scoring/weights';
import { TIER_THRESHOLDS, COVERAGE_GATES } from '../constants';

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT: Weight sums = 1
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Weight Invariants', () => {
  it('POS weights must sum to 1', () => {
    const sum = POS_WEIGHTS.QS + POS_WEIGHTS.OS + POS_WEIGHTS.SAFETY;
    expect(sum).toBeCloseTo(1.0, 5);
  });
  
  it('POS OS-gated weights must sum to 1', () => {
    const sum = POS_WEIGHTS_OS_GATED.QS + POS_WEIGHTS_OS_GATED.SAFETY;
    expect(sum).toBeCloseTo(1.0, 5);
  });
  
  it('QS feature weights must sum to 1', () => {
    const sum = Object.values(QS_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
  
  it('OS feature weights must sum to 1', () => {
    const sum = Object.values(OS_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
  
  it('Risk feature weights must sum to 1', () => {
    const sum = Object.values(RISK_FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT: No NaNs, no infinities
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Numeric Stability', () => {
  const testCases = [
    { qs: 0, os: 0, risk: 0 },
    { qs: 100, os: 100, risk: 100 },
    { qs: 50, os: 50, risk: 50 },
    { qs: 0, os: 100, risk: 50 },
    { qs: 100, os: 0, risk: 50 },
    { qs: 0.001, os: 0.001, risk: 99.999 },
    { qs: 99.999, os: 99.999, risk: 0.001 },
  ];
  
  for (const { qs, os, risk } of testCases) {
    it(`should produce valid number for QS=${qs}, OS=${os}, Risk=${risk}`, () => {
      const result = calculatePOS(qs, os, risk);
      
      expect(Number.isNaN(result.posRaw)).toBe(false);
      expect(Number.isFinite(result.posRaw)).toBe(true);
      expect(result.posRaw).toBeGreaterThanOrEqual(0);
      expect(result.posRaw).toBeLessThanOrEqual(100);
    });
  }
  
  it('should handle null OS gracefully', () => {
    const result = calculatePOS(80, null, 20);
    
    expect(Number.isNaN(result.posRaw)).toBe(false);
    expect(Number.isFinite(result.posRaw)).toBe(true);
    expect(result.os).toBeNull();
    expect(result.contributions.os).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT: Monotonicity
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Monotonicity', () => {
  it('higher QS should always increase POS (holding OS/Risk constant)', () => {
    const baseline = calculatePOS(50, 50, 50);
    const higher = calculatePOS(60, 50, 50);
    
    expect(higher.posRaw).toBeGreaterThan(baseline.posRaw);
  });
  
  it('higher OS should always increase POS (holding QS/Risk constant)', () => {
    const baseline = calculatePOS(50, 50, 50);
    const higher = calculatePOS(50, 60, 50);
    
    expect(higher.posRaw).toBeGreaterThan(baseline.posRaw);
  });
  
  it('higher Risk should always decrease POS (holding QS/OS constant)', () => {
    const baseline = calculatePOS(50, 50, 50);
    const higher = calculatePOS(50, 50, 60);
    
    expect(higher.posRaw).toBeLessThan(baseline.posRaw);
  });
  
  it('monotonicity should hold at extremes', () => {
    // Low scores
    const lowBaseline = calculatePOS(10, 10, 90);
    const lowHigherQS = calculatePOS(20, 10, 90);
    expect(lowHigherQS.posRaw).toBeGreaterThan(lowBaseline.posRaw);
    
    // High scores
    const highBaseline = calculatePOS(90, 90, 10);
    const highHigherRisk = calculatePOS(90, 90, 20);
    expect(highHigherRisk.posRaw).toBeLessThan(highBaseline.posRaw);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVARIANT: Score bounds
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Score Bounds', () => {
  it('POS should always be in [0, 100]', () => {
    // Test many random combinations
    for (let i = 0; i < 100; i++) {
      const qs = Math.random() * 100;
      const os = Math.random() * 100;
      const risk = Math.random() * 100;
      
      const result = calculatePOS(qs, os, risk);
      
      expect(result.posRaw).toBeGreaterThanOrEqual(0);
      expect(result.posRaw).toBeLessThanOrEqual(100);
    }
  });
  
  it('maximum possible POS should be 100', () => {
    const max = calculatePOS(100, 100, 0);
    expect(max.posRaw).toBe(100);
  });
  
  it('minimum possible POS should be 0', () => {
    const min = calculatePOS(0, 0, 100);
    expect(min.posRaw).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR: Formula correctness
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Formula Correctness', () => {
  it('should correctly apply 0.60/0.25/0.15 weights', () => {
    const result = calculatePOS(100, 100, 0);
    
    // 0.60*100 + 0.25*100 + 0.15*100 = 60 + 25 + 15 = 100
    expect(result.posRaw).toBe(100);
    expect(result.contributions.qs).toBe(60);
    expect(result.contributions.os).toBe(25);
    expect(result.contributions.safety).toBe(15);
  });
  
  it('should correctly apply OS-gated 0.80/0.20 weights', () => {
    const result = calculatePOS(100, null, 0);
    
    // 0.80*100 + 0.20*100 = 80 + 20 = 100
    expect(result.posRaw).toBe(100);
    expect(result.contributions.qs).toBe(80);
    expect(result.contributions.os).toBe(0);
    expect(result.contributions.safety).toBe(20);
  });
  
  it('contribution sum should equal POS', () => {
    const result = calculatePOS(80, 60, 30);
    const contributionSum = 
      result.contributions.qs + 
      result.contributions.os + 
      result.contributions.safety;
    
    expect(result.posRaw).toBeCloseTo(contributionSum, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR: Major assets don't drop to Weak unless confidence is low
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Major Asset Protection', () => {
  // Simulate "major asset" with good fundamentals
  const majorAssetScores = {
    btcLike: { qs: 95, os: 85, risk: 12 },
    ethLike: { qs: 94, os: 80, risk: 18 },
    solLike: { qs: 80, os: 75, risk: 32 },
  };
  
  it('BTC-like scores should always be Elite or Strong', () => {
    const { qs, os, risk } = majorAssetScores.btcLike;
    const result = calculatePOS(qs, os, risk);
    
    // Should be at least Strong (≥70)
    expect(result.posRaw).toBeGreaterThanOrEqual(TIER_THRESHOLDS.Strong);
  });
  
  it('ETH-like scores should always be Elite or Strong', () => {
    const { qs, os, risk } = majorAssetScores.ethLike;
    const result = calculatePOS(qs, os, risk);
    
    // Should be at least Strong (≥70)
    expect(result.posRaw).toBeGreaterThanOrEqual(TIER_THRESHOLDS.Strong);
  });
  
  it('SOL-like scores should always be at least Strong', () => {
    const { qs, os, risk } = majorAssetScores.solLike;
    const result = calculatePOS(qs, os, risk);
    
    // Should be at least Strong (≥70)
    expect(result.posRaw).toBeGreaterThanOrEqual(TIER_THRESHOLDS.Strong);
  });
  
  it('major asset should NOT drop to Weak with good scores', () => {
    // Even with slightly worse scores, majors shouldn't be Weak
    const degradedMajor = calculatePOS(75, 60, 40);
    
    // Should still be at least Neutral (≥50)
    expect(degradedMajor.posRaw).toBeGreaterThanOrEqual(TIER_THRESHOLDS.Neutral);
  });
  
  it('major asset CAN drop to Weak if scores are genuinely bad', () => {
    // If a "major" has terrible scores, it SHOULD be Weak
    const badMajor = calculatePOS(30, 20, 80);
    
    // This is legitimately Weak
    expect(badMajor.posRaw).toBeLessThan(TIER_THRESHOLDS.Neutral);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR: OS gating logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - OS Gating', () => {
  it('OS gated should use higher QS weight', () => {
    const withOs = calculatePOS(80, 50, 30);
    const withoutOs = calculatePOS(80, null, 30);
    
    // Without OS, QS contributes more
    expect(withoutOs.contributions.qs).toBeGreaterThan(withOs.contributions.qs);
  });
  
  it('OS gated should not penalize score excessively', () => {
    // If OS is neutral (50) and we gate it, score should be similar
    const withOs50 = calculatePOS(80, 50, 30);
    const withoutOs = calculatePOS(80, null, 30);
    
    // Difference should be small when OS would have been neutral
    const diff = Math.abs(withOs50.posRaw - withoutOs.posRaw);
    expect(diff).toBeLessThan(15);
  });
  
  it('OS gated formula should be documented', () => {
    const result = calculatePOS(80, null, 30);
    expect(result.formula).toContain('gated');
    expect(result.formula).toContain('0.8');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR: Coverage gates are meaningful
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Coverage Gates', () => {
  it('should have reasonable QS coverage gate', () => {
    // Gate should be high enough to ensure data quality
    expect(COVERAGE_GATES.minQsCoverage).toBeGreaterThanOrEqual(0.50);
    expect(COVERAGE_GATES.minQsCoverage).toBeLessThanOrEqual(0.80);
  });
  
  it('should have reasonable OS coverage gate', () => {
    // OS can be gated more leniently since it's optional
    expect(COVERAGE_GATES.minOsCoverage).toBeGreaterThanOrEqual(0.30);
    expect(COVERAGE_GATES.minOsCoverage).toBeLessThanOrEqual(0.60);
  });
  
  it('should have reasonable confidence gate', () => {
    // Confidence gate should prevent low-quality scores
    expect(COVERAGE_GATES.minConfidence).toBeGreaterThanOrEqual(50);
    expect(COVERAGE_GATES.minConfidence).toBeLessThanOrEqual(80);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR: Tier thresholds are sensible
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Tier Thresholds', () => {
  it('Elite should be achievable but selective', () => {
    expect(TIER_THRESHOLDS.Elite).toBeGreaterThanOrEqual(80);
    expect(TIER_THRESHOLDS.Elite).toBeLessThanOrEqual(95);
  });
  
  it('Strong should include solid projects', () => {
    expect(TIER_THRESHOLDS.Strong).toBeGreaterThanOrEqual(65);
    expect(TIER_THRESHOLDS.Strong).toBeLessThan(TIER_THRESHOLDS.Elite);
  });
  
  it('Neutral should be the middle ground', () => {
    expect(TIER_THRESHOLDS.Neutral).toBe(50);
  });
  
  it('tiers should be strictly ordered', () => {
    expect(TIER_THRESHOLDS.Elite).toBeGreaterThan(TIER_THRESHOLDS.Strong);
    expect(TIER_THRESHOLDS.Strong).toBeGreaterThan(TIER_THRESHOLDS.Neutral);
    expect(TIER_THRESHOLDS.Neutral).toBeGreaterThan(TIER_THRESHOLDS.Weak);
    expect(TIER_THRESHOLDS.Weak).toBeGreaterThan(TIER_THRESHOLDS.Critical);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESSION DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

describe('Behavior - Regression Detection', () => {
  it('formula should not change without version bump', () => {
    // This test documents the current formula
    // If it fails, it means the formula changed - ensure this was intentional
    expect(POS_WEIGHTS.QS).toBe(0.60);
    expect(POS_WEIGHTS.OS).toBe(0.25);
    expect(POS_WEIGHTS.SAFETY).toBe(0.15);
    
    expect(POS_WEIGHTS_OS_GATED.QS).toBe(0.80);
    expect(POS_WEIGHTS_OS_GATED.SAFETY).toBe(0.20);
  });
  
  it('tier thresholds should not change without version bump', () => {
    // Document current thresholds
    expect(TIER_THRESHOLDS.Elite).toBe(85);
    expect(TIER_THRESHOLDS.Strong).toBe(70);
    expect(TIER_THRESHOLDS.Neutral).toBe(50);
    expect(TIER_THRESHOLDS.Weak).toBe(30);
    expect(TIER_THRESHOLDS.Critical).toBe(0);
  });
});
