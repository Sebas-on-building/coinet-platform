/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 LEGITIMACY GATE TESTS                                                  ║
 * ║                                                                               ║
 * ║   Tests for deterministic legitimacy decision tree                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect } from 'vitest';
import {
  determineLegitimacy,
  createDefaultFactors,
  canShowToAllocator,
  canShowToTrader,
  canAppearInRankings,
  getLegitimacySummary,
  LEGITIMACY_THRESHOLDS,
  type LegitimacyFactors,
  type LegitimacyLabel,
} from '../gates/legitimacy-v2';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Create test factors
// ═══════════════════════════════════════════════════════════════════════════════

function createFactors(overrides: Partial<LegitimacyFactors> = {}): LegitimacyFactors {
  return {
    ...createDefaultFactors(),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SEVERE (Critical Issues)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - SEVERE', () => {
  it('should return SEVERE for critical incident (severity 9+)', () => {
    const factors = createFactors({
      incidentCount12m: 1,
      maxIncidentSeverity: 9,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('SEVERE');
    expect(result.criticalIssues).toContain('Critical security incident detected');
    expect(result.allowAllocatorView).toBe(false);
    expect(result.allowTraderView).toBe(false);
    expect(result.allowRanking).toBe(false);
  });
  
  it('should return SEVERE for extreme wash trading (≥90%)', () => {
    const factors = createFactors({
      washTradingScore: 92,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('SEVERE');
    expect(result.criticalIssues).toContain('Extreme wash trading detected');
  });
  
  it('should return SEVERE for data manipulation (high disagreement + anomalies)', () => {
    const factors = createFactors({
      dataDisagreementScore: 75,
      anomalyCount: 18,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('SEVERE');
    expect(result.criticalIssues).toContain('Data manipulation suspected');
  });
  
  it('should block all views for SEVERE', () => {
    const factors = createFactors({ washTradingScore: 95 });
    const result = determineLegitimacy(factors);
    
    expect(canShowToAllocator(result)).toBe(false);
    expect(canShowToTrader(result)).toBe(false);
    expect(canAppearInRankings(result)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: INSUFFICIENT_DATA
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - INSUFFICIENT_DATA', () => {
  it('should return INSUFFICIENT_DATA for low identity confidence', () => {
    const factors = createFactors({
      identityConfidence: 55,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('INSUFFICIENT_DATA');
    expect(result.warnings).toContain('Cannot reliably identify this asset');
  });
  
  it('should return INSUFFICIENT_DATA for insufficient provider IDs', () => {
    const factors = createFactors({
      providerIdCount: 1,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('INSUFFICIENT_DATA');
    expect(result.warnings).toContain('Insufficient data sources for reliable scoring');
  });
  
  it('should return INSUFFICIENT_DATA for severe staleness (72h+)', () => {
    const factors = createFactors({
      staleness: 80,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('INSUFFICIENT_DATA');
    expect(result.warnings).toContain('Data too stale for reliable scoring');
  });
  
  it('should return INSUFFICIENT_DATA for low QS coverage', () => {
    const factors = createFactors({
      coverageQS: 0.35,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('INSUFFICIENT_DATA');
    expect(result.warnings).toContain('Insufficient data coverage for Quality Score');
  });
  
  it('should block all views for INSUFFICIENT_DATA', () => {
    const factors = createFactors({ identityConfidence: 50 });
    const result = determineLegitimacy(factors);
    
    expect(canShowToAllocator(result)).toBe(false);
    expect(canShowToTrader(result)).toBe(false);
    expect(canAppearInRankings(result)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: NOT_LEGIT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - NOT_LEGIT', () => {
  it('should return NOT_LEGIT for severe wash trading (75%+)', () => {
    const factors = createFactors({
      washTradingScore: 78,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('NOT_LEGIT');
    expect(result.warnings).toContain('Severe wash trading');
  });
  
  it('should return NOT_LEGIT for extreme spread (10%+)', () => {
    const factors = createFactors({
      bidAskSpreadPercent: 12,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('NOT_LEGIT');
    expect(result.warnings).toContain('Extreme market spread');
  });
  
  it('should return NOT_LEGIT for critical admin risk with active keys', () => {
    const factors = createFactors({
      adminRiskScore: 98,
      isContractRenounced: false,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('NOT_LEGIT');
    expect(result.warnings).toContain('Critical admin key risk');
  });
  
  it('should return NOT_LEGIT for unverified contract with mint', () => {
    const factors = createFactors({
      hasVerifiedContract: false,
      hasMintFunction: true,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('NOT_LEGIT');
    expect(result.warnings).toContain('Unverified contract can mint tokens');
  });
  
  it('should allow allocator but block trader for NOT_LEGIT', () => {
    const factors = createFactors({ washTradingScore: 80 });
    const result = determineLegitimacy(factors);
    
    expect(canShowToAllocator(result)).toBe(true);  // Can see with warnings
    expect(canShowToTrader(result)).toBe(false);    // Blocked
    expect(canAppearInRankings(result)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SUSPICIOUS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - SUSPICIOUS', () => {
  it('should return SUSPICIOUS for multiple issues', () => {
    const factors = createFactors({
      washTradingScore: 55,  // One issue
      liquidityScore: 15,     // Second issue
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('SUSPICIOUS');
    expect(result.warnings.length).toBeGreaterThanOrEqual(2);
  });
  
  it('should return SUSPICIOUS for high volume ratio + low liquidity', () => {
    const factors = createFactors({
      volumeToMcapRatio: 2.5,
      liquidityScore: 18,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('SUSPICIOUS');
  });
  
  it('should return SUSPICIOUS for severe admin risk + incidents', () => {
    const factors = createFactors({
      adminRiskScore: 82,
      incidentCount12m: 5,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('SUSPICIOUS');
  });
  
  it('should return SUSPICIOUS for many anomalies + data disagreement', () => {
    const factors = createFactors({
      anomalyCount: 12,
      dataDisagreementScore: 55,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('SUSPICIOUS');
  });
  
  it('should allow allocator but block trader for SUSPICIOUS', () => {
    const factors = createFactors({
      washTradingScore: 55,
      liquidityScore: 15,
    });
    const result = determineLegitimacy(factors);
    
    expect(canShowToAllocator(result)).toBe(true);
    expect(canShowToTrader(result)).toBe(false);
    expect(canAppearInRankings(result)).toBe(true); // Can appear with badge
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: WATCH
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - WATCH', () => {
  it('should return WATCH for low identity confidence (below optimal)', () => {
    const factors = createFactors({
      identityConfidence: 70,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('WATCH');
    expect(result.warnings).toContain('Identity confidence below optimal');
  });
  
  it('should return WATCH for elevated admin risk', () => {
    const factors = createFactors({
      adminRiskScore: 65,
      isContractRenounced: false,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('WATCH');
    expect(result.warnings).toContain('Elevated admin risk');
  });
  
  it('should return WATCH for mint function without audit', () => {
    const factors = createFactors({
      hasMintFunction: true,
      auditCount: 0,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('WATCH');
    expect(result.warnings).toContain('Mint function without audit');
  });
  
  it('should return WATCH for some incidents', () => {
    const factors = createFactors({
      incidentCount12m: 1,
      maxIncidentSeverity: 4,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('WATCH');
    expect(result.warnings).toContain('Recent security incidents');
  });
  
  it('should return WATCH for stale data (24h+)', () => {
    const factors = createFactors({
      staleness: 30,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('WATCH');
    expect(result.warnings).toContain('Data freshness concern');
  });
  
  it('should allow all views for WATCH (with caution)', () => {
    const factors = createFactors({ identityConfidence: 75 });
    const result = determineLegitimacy(factors);
    
    expect(canShowToAllocator(result)).toBe(true);
    expect(canShowToTrader(result)).toBe(true);  // Allowed with caution
    expect(canAppearInRankings(result)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: LEGIT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - LEGIT', () => {
  it('should return LEGIT for clean project', () => {
    const factors = createDefaultFactors();
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('LEGIT');
    expect(result.warnings).toHaveLength(0);
    expect(result.criticalIssues).toHaveLength(0);
    expect(result.score).toBe(100);
  });
  
  it('should return LEGIT for well-audited project', () => {
    const factors = createFactors({
      identityConfidence: 95,
      auditCount: 3,
      hasVerifiedContract: true,
      isContractRenounced: true,
      liquidityScore: 90,
      washTradingScore: 5,
    });
    
    const result = determineLegitimacy(factors);
    
    expect(result.label).toBe('LEGIT');
  });
  
  it('should allow all views for LEGIT', () => {
    const factors = createDefaultFactors();
    const result = determineLegitimacy(factors);
    
    expect(canShowToAllocator(result)).toBe(true);
    expect(canShowToTrader(result)).toBe(true);
    expect(canAppearInRankings(result)).toBe(true);
  });
  
  it('should have passing rules for LEGIT', () => {
    const factors = createDefaultFactors();
    const result = determineLegitimacy(factors);
    
    const passingRules = result.rules.filter(r => r.passed);
    expect(passingRules.length).toBeGreaterThan(0);
    
    // Should have identity, market, security, and data OK rules
    expect(result.rules.some(r => r.rule === 'IDENTITY_OK')).toBe(true);
    expect(result.rules.some(r => r.rule === 'MARKET_OK')).toBe(true);
    expect(result.rules.some(r => r.rule === 'SECURITY_OK')).toBe(true);
    expect(result.rules.some(r => r.rule === 'DATA_OK')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DECISION TREE ORDER
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - Decision Tree Order', () => {
  it('should prioritize SEVERE over INSUFFICIENT_DATA', () => {
    const factors = createFactors({
      washTradingScore: 95,    // SEVERE
      identityConfidence: 50,  // INSUFFICIENT_DATA
    });
    
    const result = determineLegitimacy(factors);
    expect(result.label).toBe('SEVERE');
  });
  
  it('should prioritize INSUFFICIENT_DATA over NOT_LEGIT', () => {
    const factors = createFactors({
      identityConfidence: 55,  // INSUFFICIENT_DATA
      washTradingScore: 78,    // NOT_LEGIT
    });
    
    const result = determineLegitimacy(factors);
    expect(result.label).toBe('INSUFFICIENT_DATA');
  });
  
  it('should prioritize NOT_LEGIT over SUSPICIOUS', () => {
    const factors = createFactors({
      washTradingScore: 78,    // NOT_LEGIT
      liquidityScore: 15,      // Would be SUSPICIOUS
      bidAskSpreadPercent: 6,  // Would be SUSPICIOUS
    });
    
    const result = determineLegitimacy(factors);
    expect(result.label).toBe('NOT_LEGIT');
  });
  
  it('should prioritize SUSPICIOUS over WATCH', () => {
    const factors = createFactors({
      washTradingScore: 55,     // SUSPICIOUS issue 1
      liquidityScore: 15,       // SUSPICIOUS issue 2
      identityConfidence: 75,   // Would be WATCH
    });
    
    const result = determineLegitimacy(factors);
    expect(result.label).toBe('SUSPICIOUS');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: MODE-SPECIFIC BEHAVIOR
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - Mode-Specific Behavior', () => {
  it('should block trading but allow allocator view for NOT_LEGIT', () => {
    const factors = createFactors({ washTradingScore: 78 });
    const result = determineLegitimacy(factors);
    
    // Allocator can see QS/risk with heavy warnings
    expect(result.allowAllocatorView).toBe(true);
    // Trader mode blocked
    expect(result.allowTraderView).toBe(false);
  });
  
  it('should allow both modes with caution for WATCH', () => {
    const factors = createFactors({ staleness: 30 });
    const result = determineLegitimacy(factors);
    
    expect(result.allowAllocatorView).toBe(true);
    expect(result.allowTraderView).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0); // Has warnings
  });
  
  it('should allow ranking with badge for SUSPICIOUS', () => {
    const factors = createFactors({
      washTradingScore: 55,
      liquidityScore: 15,
    });
    const result = determineLegitimacy(factors);
    
    expect(result.allowRanking).toBe(true);  // Can appear with badge
    expect(result.allowTraderView).toBe(false); // But no trading
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - Summary', () => {
  it('should provide appropriate summary for each label', () => {
    const legit = determineLegitimacy(createDefaultFactors());
    expect(getLegitimacySummary(legit)).toBe('All legitimacy checks passed');
    
    const watch = determineLegitimacy(createFactors({ staleness: 30 }));
    expect(getLegitimacySummary(watch)).toContain('Caution advised');
    
    const suspicious = determineLegitimacy(createFactors({
      washTradingScore: 55,
      liquidityScore: 15,
    }));
    expect(getLegitimacySummary(suspicious)).toContain('High risk');
    
    const notLegit = determineLegitimacy(createFactors({ washTradingScore: 78 }));
    expect(getLegitimacySummary(notLegit)).toContain('Blocked');
    
    const insufficient = determineLegitimacy(createFactors({ identityConfidence: 50 }));
    expect(getLegitimacySummary(insufficient)).toContain('insufficient data');
    
    const severe = determineLegitimacy(createFactors({ washTradingScore: 95 }));
    expect(getLegitimacySummary(severe)).toContain('Critical');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: DETERMINISM
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - Determinism', () => {
  it('should produce identical results for same inputs', () => {
    const factors = createFactors({
      identityConfidence: 70,
      washTradingScore: 40,
      adminRiskScore: 55,
    });
    
    const result1 = determineLegitimacy(factors);
    const result2 = determineLegitimacy(factors);
    
    expect(result1.label).toBe(result2.label);
    expect(result1.score).toBe(result2.score);
    expect(result1.warnings).toEqual(result2.warnings);
    expect(result1.rules.length).toBe(result2.rules.length);
  });
  
  it('should produce consistent results across multiple calls', () => {
    const factors = createDefaultFactors();
    const results = Array(10).fill(null).map(() => determineLegitimacy(factors));
    
    const labels = results.map(r => r.label);
    expect(new Set(labels).size).toBe(1); // All same label
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE: EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy - Edge Cases', () => {
  it('should handle boundary values correctly', () => {
    // Exactly at threshold
    const factors = createFactors({
      identityConfidence: 60, // Exactly at minimum
    });
    
    const result = determineLegitimacy(factors);
    // Should NOT be INSUFFICIENT_DATA (60 >= 60)
    expect(result.label).not.toBe('INSUFFICIENT_DATA');
  });
  
  it('should handle zero values', () => {
    const factors = createFactors({
      incidentCount12m: 0,
      maxIncidentSeverity: 0,
      anomalyCount: 0,
      dataDisagreementScore: 0,
      washTradingScore: 0,
    });
    
    const result = determineLegitimacy(factors);
    expect(result.label).toBe('LEGIT');
  });
  
  it('should handle renounced contract with admin risk', () => {
    // Renounced should mitigate admin risk for NOT_LEGIT check
    const factors = createFactors({
      adminRiskScore: 98,
      isContractRenounced: true, // Mitigating factor
    });
    
    const result = determineLegitimacy(factors);
    // Should NOT be NOT_LEGIT due to critical admin risk
    expect(result.label).not.toBe('NOT_LEGIT');
  });
});
